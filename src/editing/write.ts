import { App, Editor, MarkdownView, TFile } from "obsidian";
import {
  applyEditPlanToString,
  buildEditPlan,
  EditPlan,
  EmbedsToMarkdown,
  toMinimalChange,
} from "./plan";
import { warnSkipped } from "../utils/logging";

/** Every OCR result was either inserted or permanently skipped */
interface DoneResult {
  done: true;
  /** Embed markup (`original`) for results that were permanently skipped */
  skippedResults: string[];
}

/** The attempt deferred, it will be retried when the note settles */
interface DeferredResult {
  done: false;
}

export type AttemptResult = DoneResult | DeferredResult;

/**
 * Attempt to insert OCR results into the given file, via the editor if open
 * in a source-mode editor, or via disk otherwise.
 */
export async function attemptInsert(
  app: App,
  file: TFile,
  embedsToMarkdown: EmbedsToMarkdown,
  signal: AbortSignal,
): Promise<AttemptResult> {
  if (signal.aborted) return { done: false };

  const editor = findSourceModeEditor(app, file);
  if (editor) {
    return applyViaEditor(app, file, editor, embedsToMarkdown);
  }
  return applyViaDisk(app, file, embedsToMarkdown, signal);
}

function findSourceModeEditor(app: App, file: TFile) {
  for (const leaf of app.workspace.getLeavesOfType("markdown")) {
    const view = leaf.view;
    // Deferred views fail this check and use the disk path
    if (
      view instanceof MarkdownView &&
      view.file?.path === file.path &&
      view.getMode() === "source"
    ) {
      return view.editor;
    }
  }

  return null;
}

/**
 * Apply edits to the live editor as a single transaction.
 *
 * Must stay synchronous between the read and the write to ensure that edits
 * are applied based on the editor's current state.
 */
function applyViaEditor(
  app: App,
  file: TFile,
  editor: Editor,
  embedsToMarkdown: EmbedsToMarkdown,
): AttemptResult {
  const data = editor.getValue();
  const cache = app.metadataCache.getFileCache(file);
  const plan = buildEditPlan(data, cache?.embeds ?? [], embedsToMarkdown);

  if (plan.edits.length > 0) {
    editor.transaction({
      changes: plan.edits.map((edit) => {
        const change = toMinimalChange(edit);
        return {
          from: editor.offsetToPos(change.from),
          to: editor.offsetToPos(change.to),
          text: change.text,
        };
      }),
    });
  }

  return resultFromPlan(plan);
}

/**
 * Apply edits directly to disk using an atomic read-modify-write.
 */
async function applyViaDisk(
  app: App,
  file: TFile,
  embedsToMarkdown: EmbedsToMarkdown,
  signal: AbortSignal,
) {
  let attemptResult: AttemptResult = { done: false };

  await app.vault.process(file, (data) => {
    if (signal.aborted) return data;

    const cache = app.metadataCache.getFileCache(file);
    const plan = buildEditPlan(data, cache?.embeds ?? [], embedsToMarkdown);
    attemptResult = resultFromPlan(plan);

    if (plan.edits.length === 0) return data;

    return applyEditPlanToString(data, plan.edits);
  });

  return attemptResult;
}

function resultFromPlan(plan: EditPlan): AttemptResult {
  if (plan.staleEmbeds.length > 0) return { done: false };

  if (plan.orphanedResults.length > 0) {
    for (const embedMarkup of plan.orphanedResults) {
      warnSkipped(embedMarkup, "embed changed or removed during extraction");
    }
    return { done: true, skippedResults: plan.orphanedResults };
  }

  return { done: true, skippedResults: [] };
}

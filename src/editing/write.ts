import { App, Editor, EmbedCache, TFile } from "obsidian";
import { getEmbeds } from "../utils/file";
import { getMarkdownViews } from "../utils/workspace";
import {
  applyEditPlanToString,
  assertEditsSortedAndDisjoint,
  buildEditPlan,
  EditPlan,
  EmbedsToMarkdown,
  toMinimalChange,
} from "./plan";

/** Every OCR result was either inserted or permanently skipped */
interface DoneResult {
  done: true;
  /** Embed markup (`original`) for results that were inserted */
  insertedResults: string[];
  /** Embed markup (`original`) for results that were permanently skipped */
  skippedResults: string[];
}

/** The attempt did not complete (some inserts are still pending) */
interface PendingResult {
  done: false;
  /** Embed markup (`original`) for results that were inserted */
  insertedResults: string[];
}

export type AttemptResult = DoneResult | PendingResult;

/**
 * Attempt to insert OCR results into the given file. When the note is open in a
 * source-mode editor, we use it to edit (so it's a normal undoable edit and
 * doesn't trigger a "modified externally" merge notice). Otherwise, we write
 * directly to disk.
 */
export async function attemptInsert(
  app: App,
  file: TFile,
  embedsToMarkdown: EmbedsToMarkdown,
  signal: AbortSignal,
): Promise<AttemptResult> {
  if (signal.aborted) return { done: false, insertedResults: [] };

  const editor = findSourceModeEditor(app, file);
  if (editor) {
    return applyViaEditor(app, file, editor, embedsToMarkdown);
  }
  return applyViaDisk(app, file, embedsToMarkdown, signal);
}

function findSourceModeEditor(app: App, file: TFile) {
  const sourceView = getMarkdownViews(app, file).find(
    (view) => view.getMode() === "source",
  );
  return sourceView?.editor ?? null;
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
  const embeds = getEmbeds(app, file).map((embed) =>
    withEditorOffsets(embed, editor),
  );
  const plan = buildEditPlan(data, embeds, embedsToMarkdown);

  if (plan.edits.length > 0) {
    assertEditsSortedAndDisjoint(plan.edits);
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
 * Apply edits directly to disk using an atomic read-modify-write (safe even
 * in race conditions with an open editor, since Obsidian auto-merges).
 */
async function applyViaDisk(
  app: App,
  file: TFile,
  embedsToMarkdown: EmbedsToMarkdown,
  signal: AbortSignal,
) {
  let attemptResult: AttemptResult = { done: false, insertedResults: [] };

  await app.vault.process(file, (data) => {
    if (signal.aborted) return data;

    const plan = buildEditPlan(data, getEmbeds(app, file), embedsToMarkdown);
    attemptResult = resultFromPlan(plan);

    if (plan.edits.length > 0) {
      return applyEditPlanToString(data, plan.edits);
    }

    return data;
  });

  return attemptResult;
}

/**
 * Convert embed cache offsets to editor offsets, which differ for a note with
 * \r\n line endings (since the cache offsets are based on the raw file content,
 * and the editor normalizes its buffer to use \n). Re-resolve from the cache's
 * line and column, which are line-ending-agnostic.
 */
function withEditorOffsets(embed: EmbedCache, editor: Editor): EmbedCache {
  const { start, end } = embed.position;
  const startOffset = editor.posToOffset({ line: start.line, ch: start.col });
  const endOffset = editor.posToOffset({ line: end.line, ch: end.col });

  return {
    ...embed,
    position: {
      start: { ...start, offset: startOffset },
      end: { ...end, offset: endOffset },
    },
  };
}

function resultFromPlan(plan: EditPlan): AttemptResult {
  if (plan.staleEmbeds.length > 0) {
    return { done: false, insertedResults: plan.resultsToInsert };
  }
  return {
    done: true,
    insertedResults: plan.resultsToInsert,
    skippedResults: plan.orphanedResults,
  };
}

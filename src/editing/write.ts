import { isPlainObject } from "es-toolkit";
import {
  App,
  Editor,
  getFrontMatterInfo,
  parseYaml,
  Pos,
  TFile,
} from "obsidian";
import { resolveLinkedFile } from "../utils/file";
import {
  getNoteCache,
  NoteCache,
  ReferenceMarkup,
} from "../utils/metadata-cache";
import { getMarkdownViews } from "../utils/workspace";
import {
  applyEditPlanToString,
  assertEditsSortedAndDisjoint,
  toMinimalChange,
} from "./edit";
import { buildEditPlan, EditPlan, PendingResults } from "./plan";

/** Every OCR result was either inserted or orphaned */
interface FinishedAttempt {
  done: true;
  insertedResults: ReferenceMarkup[];
  orphanedResults: ReferenceMarkup[];
}

/** The attempt did not complete (some inserts are still pending) */
interface UnfinishedAttempt {
  done: false;
  insertedResults: ReferenceMarkup[];
}

export type AttemptResult = FinishedAttempt | UnfinishedAttempt;

/**
 * Attempt to insert OCR results into the given file. When the note is open in a
 * source-mode editor, we use it to edit (so it's a normal undoable edit and
 * doesn't trigger a "modified externally" merge notice). Otherwise, we write
 * directly to disk.
 */
export async function attemptInsert(
  app: App,
  file: TFile,
  propertiesToExtractFrom: readonly string[],
  results: PendingResults,
  signal: AbortSignal,
): Promise<AttemptResult> {
  if (signal.aborted) return { done: false, insertedResults: [] };

  const editor = findSourceModeEditor(app, file);
  if (editor) {
    return applyViaEditor(app, file, editor, propertiesToExtractFrom, results);
  }
  return applyViaDisk(app, file, propertiesToExtractFrom, results, signal);
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
  propertiesToExtractFrom: readonly string[],
  results: PendingResults,
): AttemptResult {
  const data = editor.getValue();
  const cache = withEditorOffsets(getNoteCache(app, file), editor);
  const plan = buildEditPlan(
    data,
    planContext(app, file, data, cache, propertiesToExtractFrom),
    results,
  );

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
  propertiesToExtractFrom: readonly string[],
  results: PendingResults,
  signal: AbortSignal,
) {
  let attemptResult: AttemptResult = { done: false, insertedResults: [] };

  await app.vault.process(file, (data) => {
    if (signal.aborted) return data;

    const plan = buildEditPlan(
      data,
      planContext(
        app,
        file,
        data,
        getNoteCache(app, file),
        propertiesToExtractFrom,
      ),
      results,
    );
    attemptResult = resultFromPlan(plan);

    if (plan.edits.length > 0) {
      return applyEditPlanToString(data, plan.edits);
    }

    return data;
  });

  return attemptResult;
}

function planContext(
  app: App,
  file: TFile,
  content: string,
  cache: NoteCache,
  propertiesToExtractFrom: readonly string[],
) {
  const linkPaths = new Map<string, string>();
  for (const { link } of cache.links) {
    const linkedFile = resolveLinkedFile(app, link, file.path);
    if (linkedFile) linkPaths.set(link, linkedFile.path);
  }
  return {
    ...cache,
    propertiesToExtractFrom,
    linkPaths,
    frontmatterStrings: readFrontmatterStrings(content),
  };
}

/**
 * Convert cache offsets to editor offsets, which differ for a note with \r\n
 * line endings (since the cache offsets are based on the raw file content, and
 * the editor normalizes its buffer to use \n). Re-resolve from the cache's
 * line and column, which are line-ending-agnostic.
 */
function withEditorOffsets(cache: NoteCache, editor: Editor) {
  return {
    embeds: cache.embeds.map((embed) => ({
      ...embed,
      position: toEditorPos(embed.position, editor),
    })),
    links: cache.links.map((link) => ({
      ...link,
      position: toEditorPos(link.position, editor),
    })),
    frontmatterLinks: cache.frontmatterLinks,
  };
}

function toEditorPos({ start, end }: Pos, editor: Editor) {
  return {
    start: {
      ...start,
      offset: editor.posToOffset({ line: start.line, ch: start.col }),
    },
    end: {
      ...end,
      offset: editor.posToOffset({ line: end.line, ch: end.col }),
    },
  };
}

/**
 * Parse the current frontmatter rather than searching its raw text, since YAML
 * quoting and escapes mean a cached link's `original` may not appear verbatim.
 */
function readFrontmatterStrings(content: string) {
  const { exists, frontmatter } = getFrontMatterInfo(content);
  if (!exists) return new Map<string, string>();

  let parsed: unknown;
  try {
    parsed = parseYaml(frontmatter);
  } catch {
    return null;
  }
  return new Map(collectStrings(parsed, ""));
}

/** Strings paired with their key path (`attachments.0` for a list item) */
function collectStrings(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];

  let entries: [string, unknown][] = [];
  if (Array.isArray(value)) {
    entries = value.map((item, i) => [String(i), item]);
  } else if (isPlainObject(value)) {
    entries = Object.entries(value);
  }
  return entries.flatMap(([key, item]) =>
    collectStrings(item, path ? `${path}.${key}` : key),
  );
}

function resultFromPlan(plan: EditPlan): AttemptResult {
  if (plan.staleEmbeds.length > 0 || plan.staleLinks.length > 0) {
    return { done: false, insertedResults: plan.resultsToInsert };
  }
  return {
    done: true,
    insertedResults: plan.resultsToInsert,
    orphanedResults: plan.orphanedResults,
  };
}

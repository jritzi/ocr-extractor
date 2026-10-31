import { App, TFile } from "obsidian";
import { isDeleted } from "../utils/file";
import { getNoteCache, NoteCache } from "../utils/metadata-cache";
import { getMarkdownViews } from "../utils/workspace";
import { StaleCache } from "./stale-cache";

export interface NoteSnapshot {
  content: string;
  cache: NoteCache;
}

/**
 * Return a note's content paired with its cached metadata (first saving
 * unsaved edits and letting the metadata cache catch up), or null if the note
 * was deleted or the run was canceled.
 */
export async function readNoteSnapshot(
  app: App,
  staleCache: StaleCache,
  file: TFile,
  signal: AbortSignal,
): Promise<NoteSnapshot | null> {
  const content = await app.vault.cachedRead(file);

  // The editor normalizes line endings, so compare normalized text to avoid
  // saving (and converting) a clean note with \r\n line endings
  const dirtyViews = getMarkdownViews(app, file).filter(
    (view) =>
      normalizeLineEndings(view.getViewData()) !==
      normalizeLineEndings(content),
  );

  for (const view of dirtyViews) {
    await view.save();
  }

  if (dirtyViews.length > 0 || staleCache.has(file)) {
    await staleCache.waitForIndexing(file, signal);
    if (signal.aborted || isDeleted(app, file)) return null;
  }

  return {
    content: await app.vault.cachedRead(file),
    cache: getNoteCache(app, file),
  };
}

function normalizeLineEndings(text: string) {
  return text.replace(/\r\n?/g, "\n");
}

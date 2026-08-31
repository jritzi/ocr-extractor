import { App, Keymap, MarkdownView, TFile } from "obsidian";
import { noteName } from "./path";
import { showNotice } from "./notice";
import { t } from "../i18n";

export function getMarkdownViews(app: App, file: TFile) {
  return app.workspace
    .getLeavesOfType("markdown")
    .map((leaf) => leaf.view)
    .filter(
      (view): view is MarkdownView =>
        view instanceof MarkdownView && view.file?.path === file.path,
    );
}

export async function openNoteFromClick(
  app: App,
  notePath: string,
  event: MouseEvent,
  line?: number,
) {
  // Ignore right clicks (which just open the context menu)
  if (event.button === 2) return;

  const file = app.vault.getFileByPath(notePath);
  if (!file) {
    // Note was renamed, deleted, etc. since last run
    showNotice(t("notices.noteNotFound", { name: noteName(notePath) }));
    return;
  }

  await app.workspace
    .getLeaf(Keymap.isModEvent(event))
    // `line` to highlight the embed
    .openFile(file, line === undefined ? undefined : { eState: { line } });
}

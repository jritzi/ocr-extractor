import { App, MarkdownView, TFile } from "obsidian";

export function getMarkdownViews(app: App, file: TFile) {
  return app.workspace
    .getLeavesOfType("markdown")
    .map((leaf) => leaf.view)
    .filter(
      (view): view is MarkdownView =>
        view instanceof MarkdownView && view.file?.path === file.path,
    );
}

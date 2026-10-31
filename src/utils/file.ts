import { App, getLinkpath, TFile, TFolder } from "obsidian";
import type { AttachmentPath } from "./path";

// Obsidian-native file types that should not have text extracted if embedded
const OBSIDIAN_EXTENSIONS = new Set(["md", "canvas", "base"]);

export function isObsidianNative(file: TFile) {
  return OBSIDIAN_EXTENSIONS.has(file.extension);
}

export function isMarkdown(file: TFile) {
  return file.extension === "md";
}

export function isDeleted(app: App, file: TFile) {
  // Renaming/moving updates the path in place, so this only implies deleted
  return !app.vault.getFileByPath(file.path);
}

export function markdownFilesInFolder(folder: TFolder) {
  const files: TFile[] = [];

  for (const child of folder.children) {
    if (child instanceof TFile && isMarkdown(child)) {
      files.push(child);
    } else if (child instanceof TFolder) {
      files.push(...markdownFilesInFolder(child));
    }
  }

  return files;
}

export function resolveLinkedFile(app: App, link: string, notePath: string) {
  return app.metadataCache.getFirstLinkpathDest(getLinkpath(link), notePath);
}

export function attachmentPath(
  file: TFile | null,
  link: string,
): AttachmentPath {
  return file?.path ?? getLinkpath(link);
}

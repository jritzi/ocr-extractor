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

export function getEmbeds(app: App, file: TFile) {
  return app.metadataCache.getFileCache(file)?.embeds ?? [];
}

export function resolveEmbedFile(
  app: App,
  embedLink: string,
  sourcePath: string,
) {
  const linkpath = getLinkpath(embedLink);
  return app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
}

export function embedPath(
  embedFile: TFile | null,
  embedLink: string,
): AttachmentPath {
  return embedFile?.path ?? getLinkpath(embedLink);
}

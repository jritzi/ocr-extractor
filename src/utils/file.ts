import { App, getLinkpath, TFile, TFolder } from "obsidian";
import type { AttachmentPath } from "./path";

/** Embed text exactly as written in the note (`original`) */
export type EmbedMarkup = string;

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

export function attachmentPath(
  embedFile: TFile | null,
  embedLink: string,
): AttachmentPath {
  return embedFile?.path ?? getLinkpath(embedLink);
}

export function findEmbedLine(
  app: App,
  notePath: string,
  embed: { markup: EmbedMarkup; path: AttachmentPath },
) {
  const embeds = app.metadataCache.getCache(notePath)?.embeds ?? [];

  // Match the full markup (e.g. `![[a.pdf#page=2]]`), fall back to the path
  let match = embeds.find((candidate) => candidate.original === embed.markup);
  if (!match) {
    match = embeds.find(
      (candidate) =>
        attachmentPath(
          resolveEmbedFile(app, candidate.link, notePath),
          candidate.link,
        ) === embed.path,
    );
  }

  return match?.position.start.line;
}

import { getLinkpath, MetadataCache, TFile } from "obsidian";

// Obsidian-native file types that should not have text extracted if embedded
const OBSIDIAN_EXTENSIONS = new Set(["md", "canvas", "base"]);

export function isObsidianNative(file: TFile) {
  return OBSIDIAN_EXTENSIONS.has(file.extension);
}

export function isMarkdown(file: TFile) {
  return file.extension === "md";
}

export function resolveEmbedPath(
  metadataCache: MetadataCache,
  embedLink: string,
  sourcePath: string,
) {
  const linkpath = getLinkpath(embedLink);
  const resolvedFile = metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
  return resolvedFile?.path;
}

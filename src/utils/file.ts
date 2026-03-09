import { getLinkpath, MetadataCache, TFile } from "obsidian";

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

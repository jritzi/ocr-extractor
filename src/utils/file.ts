import { App, getLinkpath, TFile, TFolder } from "obsidian";

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

/** The final segment of a vault path (e.g. "scan.pdf" for "dir/scan.pdf") */
export function basename(path: string) {
  return path.split("/").pop() ?? path;
}

/** The note's display name (e.g. "Scan" for "dir/Scan.pdf") */
export function noteName(path: string) {
  return basename(path).replace(/\.md$/, "");
}

/** The containing folder of a vault path, or "" if at the vault root */
export function parentFolder(path: string) {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? "" : path.slice(0, lastSlash);
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

/**
 * The path that identifies a file in reports (its vault path if it exists, or
 * its link path otherwise)
 */
export function embedPath(embedFile: TFile | null, embedLink: string) {
  return embedFile?.path ?? getLinkpath(embedLink);
}

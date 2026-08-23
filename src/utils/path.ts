import { assert } from "./assert";

/**
 * The path that identifies an attachment (its vault path if the file exists,
 * or the embed's link text for a broken embed)
 */
export type AttachmentPath = string;

/** The final segment of a vault path (e.g. "scan.pdf" for "dir/scan.pdf") */
export function basename(path: string) {
  const segments = path.split("/");
  return segments[segments.length - 1];
}

/** The containing folder of a vault path, or "" if at the vault root */
export function parentFolder(path: string) {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? "" : path.slice(0, lastSlash);
}

/** The note path without the .md extension */
export function withoutNoteExtension(path: string) {
  assert(path.endsWith(".md"), "Only called on Markdown files");
  return path.replace(/\.md$/, "");
}

/** The note's display name (e.g. "Scan" for "dir/Scan.md") */
export function noteName(path: string) {
  return withoutNoteExtension(basename(path));
}

/**
 * How an attachment is identified: its vault path when the file exists, or the
 * embed's link text when the embed resolves to nothing
 */
export type AttachmentPath = string;

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

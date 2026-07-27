import { t } from "./i18n";

/**
 * The reason an attachment was skipped or failed (a typed code that also
 * requires a matching translation under `reasons` in the locale files).
 */
export type ResultReason =
  | "unsupportedFileType"
  | "noTextFound"
  | "unsupportedByEngine"
  | "fileNotFound"
  | "passwordProtectedPdf"
  | "pdfUnreadable"
  | "imageUnreadable"
  | "rejectedByEngine"
  | "commandFailed"
  | "commandTimeout"
  | "requestTimeout"
  | "responseTruncated"
  | "noteChanged"
  | "unexpected";

/** The translated, user-facing text for a reason */
export function describeReason(reason: ResultReason) {
  return t(`reasons.${reason}`);
}

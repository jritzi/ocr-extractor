import { t } from "./i18n";

export type SkipReason =
  | "unsupportedFileType"
  | "noTextFound"
  | "unsupportedByEngine"
  | "passwordProtectedPdf";

export type FailureReason =
  | "fileNotFound"
  | "pdfUnreadable"
  | "imageUnreadable"
  | "rejectedByEngine"
  | "commandFailed"
  | "commandTimeout"
  | "requestTimeout"
  | "responseTruncated"
  | "noteChanged"
  | "unexpected";

export type ResultReason = SkipReason | FailureReason;

export function describeReason(reason: ResultReason) {
  return t(`reasons.${reason}`);
}

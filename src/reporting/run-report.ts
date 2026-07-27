/**
 * The run report data model. Properties are deeply readonly to ensure the
 * store can never mutate a report (breaking React's assumptions).
 */

import { ResultReason } from "../result-reason";

export type AttachmentResult =
  | { readonly status: "extracted" }
  | {
      readonly status: "skipped";
      readonly reason: ResultReason;
      readonly detail?: string;
    }
  | {
      readonly status: "failed";
      readonly reason: ResultReason;
      readonly detail?: string;
    };

export interface AttachmentEntry {
  /** Resolved vault path, or the embed's link text for a broken embed */
  readonly path: string;
  readonly result: AttachmentResult;
}

export interface NoteEntry {
  /** Resolved vault path */
  readonly path: string;
  /** One per embed (so a file embedded twice appears twice) */
  readonly attachments: readonly AttachmentEntry[];
}

export type RunScope =
  | { readonly type: "note"; readonly path: string }
  | { readonly type: "folder"; readonly path: string }
  | { readonly type: "vault" }
  | { readonly type: "selection" };

export type RunStatus =
  | "running"
  | "canceling"
  | "complete"
  | "fatal"
  | "canceled";

export interface RunReport {
  readonly startedAt: number;
  readonly finishedAt?: number;
  readonly scope: RunScope;
  readonly totalNotes: number;
  readonly status: RunStatus;
  readonly fatalMessage?: string;
  readonly notesProcessed: number;
  readonly notes: readonly NoteEntry[];
}

export type ResultStatus = AttachmentResult["status"];

/** Every result status, in the order they are shown to users */
export const RESULT_STATUSES: readonly ResultStatus[] = [
  "extracted",
  "skipped",
  "failed",
];

export type ResultCounts = Readonly<Record<ResultStatus, number>>;

export function isMultiNote(report: RunReport) {
  return report.scope.type !== "note";
}

export function countResults(report: RunReport): ResultCounts {
  const counts = { extracted: 0, skipped: 0, failed: 0 };
  for (const note of report.notes) {
    for (const attachment of note.attachments) {
      counts[attachment.result.status]++;
    }
  }
  return counts;
}

export function firstFailure(report: RunReport) {
  for (const note of report.notes) {
    for (const attachment of note.attachments) {
      if (attachment.result.status === "failed") {
        return { path: attachment.path, reason: attachment.result.reason };
      }
    }
  }
  return null;
}

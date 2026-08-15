/**
 * The run report data model. Properties are deeply readonly to ensure the
 * store can never mutate a report (breaking React's assumptions).
 */

import type { EmbedMarkup } from "../editing/plan";
import { FailureReason, SkipReason } from "../result-reason";
import type { AttachmentPath } from "../utils/path";

export type AttachmentResult =
  | { readonly status: "extracted" }
  | {
      readonly status: "skipped";
      readonly reason: SkipReason;
      readonly detail?: string;
    }
  | {
      readonly status: "failed";
      readonly reason: FailureReason;
      readonly detail?: string;
    };

export interface AttachmentEntry {
  readonly path: AttachmentPath;
  readonly markup: EmbedMarkup;
  readonly order: number;
  readonly result: AttachmentResult;
}

export interface NoteEntry {
  /** Resolved vault path */
  readonly path: string;
  /** One per unique markup processed, in the order they appear in the note */
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
  readonly notesStarted: number;
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

export function isMultiNote(scope: RunScope) {
  return scope.type !== "note";
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

export function totalResults(counts: ResultCounts) {
  return Object.values(counts).reduce((total, count) => total + count, 0);
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

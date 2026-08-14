import type { EngineResult } from "./engines/ocr-engine";
import type { EmbedMarkup } from "./editing/plan";
import type { InsertResult } from "./editing/settle";
import type { ReportStore } from "./reporting/report-store";
import type { AttachmentEntry } from "./reporting/run-report";
import type { AttachmentPath } from "./utils/path";

export type EmbedResult = {
  path: AttachmentPath;
  result: Exclude<EngineResult, { status: "canceled" }>;
};
export type EmbedResults = Map<EmbedMarkup, EmbedResult & { order: number }>;

type PendingEntries = Omit<AttachmentEntry, "result">[];

/**
 * Records skipped/failed results and returns entries for extracted results
 * (to record later after their callouts are written)
 */
export function recordResultsBeforeInsert(
  store: ReportStore,
  notePath: string,
  results: EmbedResults,
) {
  const pendingEntries: PendingEntries = [];

  for (const [markup, { path, result, order }] of results) {
    const entry = { path, markup, order };
    if (result.status === "extracted") {
      pendingEntries.push(entry);
    } else {
      store.recordResult(notePath, { ...entry, result });
    }
  }

  return pendingEntries;
}

export function recordResultsAfterInsert(
  store: ReportStore,
  notePath: string,
  pendingEntries: PendingEntries,
  insertResult: InsertResult,
) {
  if (insertResult.status === "done") {
    const orphaned = new Set(insertResult.orphanedResults);

    for (const entry of pendingEntries) {
      store.recordResult(notePath, {
        ...entry,
        result: orphaned.has(entry.markup)
          ? { status: "failed", reason: "noteChanged" }
          : { status: "extracted" },
      });
    }

    return;
  }

  const inserted = new Set(insertResult.insertedResults);

  for (const entry of pendingEntries) {
    if (inserted.has(entry.markup)) {
      store.recordResult(notePath, {
        ...entry,
        result: { status: "extracted" },
      });
    } else if (insertResult.status === "timeout") {
      store.recordResult(notePath, {
        ...entry,
        result: { status: "failed", reason: "noteChanged" },
      });
    } else {
      // Canceled results are not recorded
    }
  }
}

import type { EngineResult } from "../engines/ocr-engine";
import type { InsertResult } from "../editing/settle";
import type { ReportStore } from "../reporting/report-store";
import type { AttachmentEntry } from "../reporting/run-report";
import type { EmbedMarkup } from "../utils/file";
import type { AttachmentPath } from "../utils/path";

export type EmbedResult = {
  path: AttachmentPath;
  markup: EmbedMarkup;
  order: number;
  engineResult: Exclude<EngineResult, { status: "canceled" }>;
};

type PendingEntries = Omit<AttachmentEntry, "result">[];

/**
 * Records skipped/failed results and returns entries for extracted results
 * (to record later after their callouts are written)
 */
export function recordResultsBeforeInsert(
  store: ReportStore,
  notePath: string,
  results: readonly EmbedResult[],
) {
  const pendingEntries: PendingEntries = [];

  for (const { engineResult, ...entry } of results) {
    if (engineResult.status === "extracted") {
      pendingEntries.push(entry);
    } else {
      store.recordResult(notePath, { ...entry, result: engineResult });
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

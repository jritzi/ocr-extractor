import type { EngineResult } from "./engines/ocr-engine";
import type { EmbedMarkup } from "./editing/plan";
import type { InsertResult } from "./editing/settle";
import type { ReportStore } from "./reporting/report-store";
import type { AttachmentPath } from "./utils/path";

export type EmbedResult = {
  path: AttachmentPath;
  result: Exclude<EngineResult, { status: "canceled" }>;
};
export type EmbedResults = Map<EmbedMarkup, EmbedResult>;

type ExtractedPaths = Map<EmbedMarkup, AttachmentPath>;

/**
 * Records skipped/failed results and returns the extracted results to record
 * later after their callouts are written
 */
export function recordResultsBeforeInsert(
  store: ReportStore,
  notePath: string,
  results: EmbedResults,
) {
  const extractedPaths: ExtractedPaths = new Map();

  for (const [markup, { path, result }] of results) {
    if (result.status === "extracted") {
      extractedPaths.set(markup, path);
    } else {
      store.recordResult(notePath, path, result);
    }
  }

  return extractedPaths;
}

export function recordResultsAfterInsert(
  store: ReportStore,
  notePath: string,
  extractedPaths: ExtractedPaths,
  insertResult: InsertResult,
) {
  if (insertResult.status === "done") {
    const orphaned = new Set(insertResult.orphanedResults);

    for (const [markup, path] of extractedPaths) {
      store.recordResult(
        notePath,
        path,
        orphaned.has(markup)
          ? { status: "failed", reason: "noteChanged" }
          : { status: "extracted" },
      );
    }

    return;
  }

  const inserted = new Set(insertResult.insertedResults);

  for (const [markup, path] of extractedPaths) {
    if (inserted.has(markup)) {
      store.recordResult(notePath, path, { status: "extracted" });
    } else if (insertResult.status === "timeout") {
      store.recordResult(notePath, path, {
        status: "failed",
        reason: "noteChanged",
      });
    } else {
      // Canceled results are not recorded
    }
  }
}

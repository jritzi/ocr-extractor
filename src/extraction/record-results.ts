import type { EngineResult } from "../engines/ocr-engine";
import { type InsertResult, wasInserted } from "../editing/insert-result";
import type { ReportStore } from "../reporting/report-store";
import type { ReferenceMarkup } from "../utils/metadata-cache";
import type { AttachmentPath } from "../utils/path";

export type ReferenceResult = {
  path: AttachmentPath;
  markup: ReferenceMarkup;
  order: number;
  engineResult: Exclude<EngineResult, { status: "canceled" }>;
};

export function recordResults(
  store: ReportStore,
  notePath: string,
  referenceResults: readonly ReferenceResult[],
  insertResult: InsertResult,
) {
  for (const { engineResult, ...entry } of referenceResults) {
    if (engineResult.status !== "extracted") {
      store.recordResult(notePath, { ...entry, result: engineResult });
    } else if (wasInserted(entry.markup, insertResult)) {
      store.recordResult(notePath, {
        ...entry,
        result: { status: "extracted" },
      });
    } else if (insertResult.status === "canceled") {
      // Canceled results are not recorded
    } else {
      store.recordResult(notePath, {
        ...entry,
        result: { status: "failed", reason: "noteChanged" },
      });
    }
  }
}

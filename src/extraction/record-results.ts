import type { EngineResult } from "../engines/ocr-engine";
import { type InsertResult, wasInserted } from "../editing/insert-result";
import type { ReportStore } from "../reporting/report-store";
import type { EmbedMarkup } from "../utils/file";
import type { AttachmentPath } from "../utils/path";

export type EmbedResult = {
  path: AttachmentPath;
  markup: EmbedMarkup;
  order: number;
  engineResult: Exclude<EngineResult, { status: "canceled" }>;
};

export function recordResults(
  store: ReportStore,
  notePath: string,
  embedResults: readonly EmbedResult[],
  insertResult: InsertResult,
) {
  for (const { engineResult, ...entry } of embedResults) {
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

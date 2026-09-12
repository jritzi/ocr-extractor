import type { ReferenceMarkup } from "../utils/file";

export type InsertResult =
  | { status: "done"; orphanedResults: ReferenceMarkup[] }
  | { status: "timeout"; insertedResults: ReferenceMarkup[] }
  | { status: "canceled"; insertedResults: ReferenceMarkup[] };

export function wasInserted(
  markup: ReferenceMarkup,
  insertResult: InsertResult,
) {
  return insertResult.status === "done"
    ? !insertResult.orphanedResults.includes(markup)
    : insertResult.insertedResults.includes(markup);
}

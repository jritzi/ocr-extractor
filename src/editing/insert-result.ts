import type { EmbedMarkup } from "../utils/file";

export type InsertResult =
  | { status: "done"; orphanedResults: EmbedMarkup[] }
  | { status: "timeout"; insertedResults: EmbedMarkup[] }
  | { status: "canceled"; insertedResults: EmbedMarkup[] };

export function wasInserted(markup: EmbedMarkup, insertResult: InsertResult) {
  return insertResult.status === "done"
    ? !insertResult.orphanedResults.includes(markup)
    : insertResult.insertedResults.includes(markup);
}

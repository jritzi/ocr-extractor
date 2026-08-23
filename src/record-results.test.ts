import { describe, expect, it } from "vitest";
import { ReportStore } from "./reporting/report-store";
import {
  EmbedResult,
  recordResultsAfterInsert,
  recordResultsBeforeInsert,
} from "./record-results";

const NOTE = "notes/receipts.md";

function startedStore() {
  const store = new ReportStore();
  store.startRun({ type: "vault" }, 1);
  return store;
}

function recordedAttachments(store: ReportStore) {
  return store.getReport()?.notes.find((note) => note.path === NOTE)
    ?.attachments;
}

describe("record-results.ts", () => {
  describe("recordResultsBeforeInsert", () => {
    it("records skipped and failed results", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          order: 0,
          engineResult: { status: "skipped", reason: "noTextFound" },
        },
        {
          path: "attachments/corrupt.pdf",
          markup: "![[corrupt.pdf]]",
          order: 1,
          engineResult: { status: "failed", reason: "pdfUnreadable" },
        },
      ];

      recordResultsBeforeInsert(store, NOTE, results);

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          result: { status: "skipped", reason: "noTextFound" },
          order: 0,
        },
        {
          path: "attachments/corrupt.pdf",
          markup: "![[corrupt.pdf]]",
          result: { status: "failed", reason: "pdfUnreadable" },
          order: 1,
        },
      ]);
    });

    it("keeps the order each result arrived with", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          order: 0,
          engineResult: { status: "skipped", reason: "noTextFound" },
        },
        {
          path: "attachments/receipt.pdf",
          markup: "![[receipt.pdf]]",
          order: 1,
          engineResult: { status: "extracted", markdown: "Total: $12" },
        },
        {
          path: "attachments/corrupt.pdf",
          markup: "![[corrupt.pdf]]",
          order: 2,
          engineResult: { status: "failed", reason: "pdfUnreadable" },
        },
      ];

      const pendingEntries = recordResultsBeforeInsert(store, NOTE, results);

      expect(recordedAttachments(store)?.map((entry) => entry.order)).toEqual([
        0, 2,
      ]);
      expect(pendingEntries.map((entry) => entry.order)).toEqual([1]);
    });

    it("returns extracted results without recording them", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/receipt.pdf",
          markup: "![[receipt.pdf]]",
          order: 0,
          engineResult: { status: "extracted", markdown: "Total: $12" },
        },
      ];

      const pendingEntries = recordResultsBeforeInsert(store, NOTE, results);

      expect(pendingEntries).toEqual([
        {
          path: "attachments/receipt.pdf",
          markup: "![[receipt.pdf]]",
          order: 0,
        },
      ]);
      expect(recordedAttachments(store)).toBeUndefined();
    });
  });

  describe("recordResultsAfterInsert", () => {
    const twoPendingEntries = () => [
      { path: "attachments/one.png", markup: "![[one.png]]", order: 0 },
      { path: "attachments/two.png", markup: "![[two.png]]", order: 1 },
    ];

    it("records an orphaned result as failed", () => {
      const store = startedStore();

      recordResultsAfterInsert(store, NOTE, twoPendingEntries(), {
        status: "done",
        orphanedResults: ["![[two.png]]"],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/one.png",
          markup: "![[one.png]]",
          result: { status: "extracted" },
          order: 0,
        },
        {
          path: "attachments/two.png",
          markup: "![[two.png]]",
          result: { status: "failed", reason: "noteChanged" },
          order: 1,
        },
      ]);
    });

    it("records every result as extracted when none were orphaned", () => {
      const store = startedStore();

      recordResultsAfterInsert(store, NOTE, twoPendingEntries(), {
        status: "done",
        orphanedResults: [],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/one.png",
          markup: "![[one.png]]",
          result: { status: "extracted" },
          order: 0,
        },
        {
          path: "attachments/two.png",
          markup: "![[two.png]]",
          result: { status: "extracted" },
          order: 1,
        },
      ]);
    });

    it("records results a timed-out insert never wrote as failed", () => {
      const store = startedStore();

      recordResultsAfterInsert(store, NOTE, twoPendingEntries(), {
        status: "timeout",
        insertedResults: ["![[one.png]]"],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/one.png",
          markup: "![[one.png]]",
          result: { status: "extracted" },
          order: 0,
        },
        {
          path: "attachments/two.png",
          markup: "![[two.png]]",
          result: { status: "failed", reason: "noteChanged" },
          order: 1,
        },
      ]);
    });

    it("discards results a canceled insert never wrote", () => {
      const store = startedStore();

      recordResultsAfterInsert(store, NOTE, twoPendingEntries(), {
        status: "canceled",
        insertedResults: ["![[one.png]]"],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/one.png",
          markup: "![[one.png]]",
          result: { status: "extracted" },
          order: 0,
        },
      ]);
    });
  });

  describe("using both functions together", () => {
    it("puts an earlier embed first even when the insert recorded it last", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/receipt.pdf",
          markup: "![[receipt.pdf]]",
          order: 0,
          engineResult: { status: "extracted", markdown: "Total: $12" },
        },
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          order: 1,
          engineResult: { status: "skipped", reason: "noTextFound" },
        },
      ];

      const pendingEntries = recordResultsBeforeInsert(store, NOTE, results);
      recordResultsAfterInsert(store, NOTE, pendingEntries, {
        status: "done",
        orphanedResults: [],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/receipt.pdf",
          markup: "![[receipt.pdf]]",
          result: { status: "extracted" },
          order: 0,
        },
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          result: { status: "skipped", reason: "noTextFound" },
          order: 1,
        },
      ]);
    });
  });
});

import { describe, expect, it } from "vitest";
import { ReportStore } from "../reporting/report-store";
import { EmbedResult, recordResults } from "./record-results";

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
  describe("recordResults", () => {
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

      recordResults(store, NOTE, results, {
        status: "done",
        orphanedResults: [],
      });

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

    it("records a skipped result even when the insert was canceled", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          order: 0,
          engineResult: { status: "skipped", reason: "noTextFound" },
        },
      ];

      recordResults(store, NOTE, results, {
        status: "canceled",
        insertedResults: [],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          result: { status: "skipped", reason: "noTextFound" },
          order: 0,
        },
      ]);
    });

    it("records a result as extracted when none were orphaned", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/menu.png",
          markup: "![[menu.png]]",
          order: 0,
          engineResult: { status: "extracted", markdown: "Menu" },
        },
      ];

      recordResults(store, NOTE, results, {
        status: "done",
        orphanedResults: [],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/menu.png",
          markup: "![[menu.png]]",
          result: { status: "extracted" },
          order: 0,
        },
      ]);
    });

    it("discards results a canceled insert never wrote", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/photo.png",
          markup: "![[photo.png]]",
          order: 0,
          engineResult: { status: "extracted", markdown: "Photo" },
        },
        {
          path: "attachments/scan.png",
          markup: "![[scan.png]]",
          order: 1,
          engineResult: { status: "extracted", markdown: "Scan" },
        },
      ];

      recordResults(store, NOTE, results, {
        status: "canceled",
        insertedResults: ["![[photo.png]]"],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/photo.png",
          markup: "![[photo.png]]",
          result: { status: "extracted" },
          order: 0,
        },
      ]);
    });

    it("records an orphaned result as failed", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/receipt.png",
          markup: "![[receipt.png]]",
          order: 0,
          engineResult: { status: "extracted", markdown: "Total: $12" },
        },
        {
          path: "attachments/invoice.png",
          markup: "![[invoice.png]]",
          order: 1,
          engineResult: { status: "extracted", markdown: "Invoice 41" },
        },
      ];

      recordResults(store, NOTE, results, {
        status: "done",
        orphanedResults: ["![[invoice.png]]"],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/receipt.png",
          markup: "![[receipt.png]]",
          result: { status: "extracted" },
          order: 0,
        },
        {
          path: "attachments/invoice.png",
          markup: "![[invoice.png]]",
          result: { status: "failed", reason: "noteChanged" },
          order: 1,
        },
      ]);
    });

    it("records as failed results a timed-out insert never wrote", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/page-one.png",
          markup: "![[page-one.png]]",
          order: 0,
          engineResult: { status: "extracted", markdown: "Page one" },
        },
        {
          path: "attachments/page-two.png",
          markup: "![[page-two.png]]",
          order: 1,
          engineResult: { status: "extracted", markdown: "Page two" },
        },
      ];

      recordResults(store, NOTE, results, {
        status: "timeout",
        insertedResults: ["![[page-one.png]]"],
      });

      expect(recordedAttachments(store)).toEqual([
        {
          path: "attachments/page-one.png",
          markup: "![[page-one.png]]",
          result: { status: "extracted" },
          order: 0,
        },
        {
          path: "attachments/page-two.png",
          markup: "![[page-two.png]]",
          result: { status: "failed", reason: "noteChanged" },
          order: 1,
        },
      ]);
    });

    it("records embeds in note order even when results arrive out of order", () => {
      const store = startedStore();
      const results: EmbedResult[] = [
        {
          path: "attachments/blank.png",
          markup: "![[blank.png]]",
          order: 1,
          engineResult: { status: "skipped", reason: "noTextFound" },
        },
        {
          path: "attachments/receipt.pdf",
          markup: "![[receipt.pdf]]",
          order: 0,
          engineResult: { status: "extracted", markdown: "Total: $12" },
        },
      ];

      recordResults(store, NOTE, results, {
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

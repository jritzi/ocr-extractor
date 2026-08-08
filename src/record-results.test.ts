import { describe, expect, it } from "vitest";
import { ReportStore } from "./reporting/report-store";
import {
  EmbedResults,
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

describe("recordResultsBeforeInsert", () => {
  it("records skipped and failed results", () => {
    const store = startedStore();
    const results: EmbedResults = new Map([
      [
        "![[blank.png]]",
        {
          path: "attachments/blank.png",
          result: { status: "skipped", reason: "noTextFound" },
        },
      ],
      [
        "![[locked.pdf]]",
        {
          path: "attachments/locked.pdf",
          result: { status: "failed", reason: "passwordProtectedPdf" },
        },
      ],
    ]);

    recordResultsBeforeInsert(store, NOTE, results);

    expect(recordedAttachments(store)).toEqual([
      {
        path: "attachments/blank.png",
        result: { status: "skipped", reason: "noTextFound" },
      },
      {
        path: "attachments/locked.pdf",
        result: { status: "failed", reason: "passwordProtectedPdf" },
      },
    ]);
  });

  it("returns extracted results without recording them", () => {
    const store = startedStore();
    const results: EmbedResults = new Map([
      [
        "![[receipt.pdf]]",
        {
          path: "attachments/receipt.pdf",
          result: { status: "extracted", markdown: "Total: $12" },
        },
      ],
    ]);

    const extractedPaths = recordResultsBeforeInsert(store, NOTE, results);

    expect(extractedPaths).toEqual(
      new Map([["![[receipt.pdf]]", "attachments/receipt.pdf"]]),
    );
    expect(recordedAttachments(store)).toBeUndefined();
  });
});

describe("recordResultsAfterInsert", () => {
  const twoExtractedPaths = () =>
    new Map([
      ["![[one.png]]", "attachments/one.png"],
      ["![[two.png]]", "attachments/two.png"],
    ]);

  it("records an orphaned result as failed", () => {
    const store = startedStore();

    recordResultsAfterInsert(store, NOTE, twoExtractedPaths(), {
      status: "done",
      orphanedResults: ["![[two.png]]"],
    });

    expect(recordedAttachments(store)).toEqual([
      { path: "attachments/one.png", result: { status: "extracted" } },
      {
        path: "attachments/two.png",
        result: { status: "failed", reason: "noteChanged" },
      },
    ]);
  });

  it("records every result as extracted when none were orphaned", () => {
    const store = startedStore();

    recordResultsAfterInsert(store, NOTE, twoExtractedPaths(), {
      status: "done",
      orphanedResults: [],
    });

    expect(recordedAttachments(store)).toEqual([
      { path: "attachments/one.png", result: { status: "extracted" } },
      { path: "attachments/two.png", result: { status: "extracted" } },
    ]);
  });

  it("records results a timed-out insert never wrote as failed", () => {
    const store = startedStore();

    recordResultsAfterInsert(store, NOTE, twoExtractedPaths(), {
      status: "timeout",
      insertedResults: ["![[one.png]]"],
    });

    expect(recordedAttachments(store)).toEqual([
      { path: "attachments/one.png", result: { status: "extracted" } },
      {
        path: "attachments/two.png",
        result: { status: "failed", reason: "noteChanged" },
      },
    ]);
  });

  it("discards results a canceled insert never wrote", () => {
    const store = startedStore();

    recordResultsAfterInsert(store, NOTE, twoExtractedPaths(), {
      status: "canceled",
      insertedResults: ["![[one.png]]"],
    });

    expect(recordedAttachments(store)).toEqual([
      { path: "attachments/one.png", result: { status: "extracted" } },
    ]);
  });
});

describe("using both functions together", () => {
  it("records a skipped result before the insert and an extracted one after", () => {
    const store = startedStore();
    const results: EmbedResults = new Map([
      [
        "![[receipt.pdf]]",
        {
          path: "attachments/receipt.pdf",
          result: { status: "extracted", markdown: "Total: $12" },
        },
      ],
      [
        "![[blank.png]]",
        {
          path: "attachments/blank.png",
          result: { status: "skipped", reason: "noTextFound" },
        },
      ],
    ]);

    const extractedPaths = recordResultsBeforeInsert(store, NOTE, results);
    recordResultsAfterInsert(store, NOTE, extractedPaths, {
      status: "done",
      orphanedResults: [],
    });

    expect(recordedAttachments(store)).toEqual([
      {
        path: "attachments/blank.png",
        result: { status: "skipped", reason: "noTextFound" },
      },
      { path: "attachments/receipt.pdf", result: { status: "extracted" } },
    ]);
  });
});

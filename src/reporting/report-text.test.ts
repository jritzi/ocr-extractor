import { describe, expect, it } from "vitest";
import {
  buildCopyText,
  describeCompletion,
  describeCount,
  describeEarlyStop,
  describeEmpty,
  describeResult,
  describeResultStatus,
  describeRunStatus,
  describeScope,
  describeStart,
} from "./report-text";
import { AttachmentResult } from "./run-report";
import {
  buildNoteEntry,
  buildRunReport,
  RunReportOverrides,
} from "./run-report.test-utils";

describe("report-text.ts", () => {
  describe("describeScope", () => {
    it("describes every type of run scope", () => {
      expect(describeScope({ type: "note", path: "Folder/A note.md" })).toBe(
        "Note: Folder/A note",
      );
      expect(describeScope({ type: "folder", path: "Attachments/Scans" })).toBe(
        "Folder: Attachments/Scans",
      );
      expect(describeScope({ type: "vault" })).toBe("All notes");
      expect(describeScope({ type: "selection" })).toBe("Selected notes");
    });
  });

  describe("describeStart", () => {
    const start = (overrides: RunReportOverrides) =>
      describeStart(buildRunReport(overrides));

    it("reports when a run started and the number of notes", () => {
      const startedAt = Date.parse("2026-03-04T15:30:00Z");

      expect(start({ startedAt, totalNotes: 1 })).toBe(
        "Started: Mar 4, 2026, 3:30 PM · 1 note",
      );
      expect(start({ startedAt, totalNotes: 2 })).toBe(
        "Started: Mar 4, 2026, 3:30 PM · 2 notes",
      );
    });
  });

  describe("describeRunStatus", () => {
    it("describes the run's status", () => {
      expect(describeRunStatus("running")).toBe("In progress");
      expect(describeRunStatus("canceling")).toBe("Canceling");
      expect(describeRunStatus("complete")).toBe("Completed");
      expect(describeRunStatus("fatal")).toBe("Error");
      expect(describeRunStatus("canceled")).toBe("Canceled");
    });
  });

  describe("describeEarlyStop", () => {
    const earlyStop = (overrides: RunReportOverrides) =>
      describeEarlyStop(buildRunReport(overrides));

    it("reports progress for a run ended early", () => {
      expect(
        earlyStop({ status: "canceled", totalNotes: 2, notesProcessed: 1 }),
      ).toBe("Stopped after 1 of 2 notes");
      expect(
        earlyStop({
          status: "fatal",
          fatalMessage: "Unauthorized",
          totalNotes: 2,
          notesProcessed: 0,
        }),
      ).toBe("Stopped after 0 of 2 notes");
    });

    it("returns null for a completed run", () => {
      expect(
        earlyStop({ status: "complete", totalNotes: 2, notesProcessed: 2 }),
      ).toBeNull();
    });

    it("returns null for a single-note run", () => {
      expect(
        earlyStop({
          status: "canceled",
          scope: { type: "note", path: "A note.md" },
          totalNotes: 1,
        }),
      ).toBeNull();
    });

    it("uses the singular when the run covered one note", () => {
      expect(
        earlyStop({ status: "canceled", totalNotes: 1, notesProcessed: 0 }),
      ).toBe("Stopped after 0 of 1 note");
    });
  });

  describe("describeCount", () => {
    it("counts every result status", () => {
      expect(describeCount("extracted", 12, { nameAttachments: false })).toBe(
        "12 extracted",
      );
      expect(describeCount("skipped", 3, { nameAttachments: false })).toBe(
        "3 skipped",
      );
      expect(describeCount("failed", 0, { nameAttachments: false })).toBe(
        "0 failed",
      );
    });

    it("includes 'attachments' when specified", () => {
      expect(describeCount("extracted", 12, { nameAttachments: true })).toBe(
        "12 attachments extracted",
      );
      expect(describeCount("skipped", 1, { nameAttachments: true })).toBe(
        "1 attachment skipped",
      );
      expect(describeCount("failed", 0, { nameAttachments: true })).toBe(
        "0 attachments failed",
      );
    });
  });

  describe("describeResultStatus", () => {
    it("describes every result status", () => {
      expect(describeResultStatus("extracted")).toBe("Extracted");
      expect(describeResultStatus("skipped")).toBe("Skipped");
      expect(describeResultStatus("failed")).toBe("Failed");
    });
  });

  describe("describeResult", () => {
    it("describes an extracted result without a reason", () => {
      expect(
        describeResult({ status: "extracted" }, { style: "compact" }),
      ).toBe("Extracted");
      expect(describeResult({ status: "extracted" }, { style: "full" })).toBe(
        "Extracted",
      );
    });

    it("describes skipped and failed results with their reason", () => {
      expect(
        describeResult(
          { status: "skipped", reason: "noTextFound" },
          { style: "full" },
        ),
      ).toBe("Skipped (no text found)");
      expect(
        describeResult(
          { status: "failed", reason: "rejectedByEngine" },
          { style: "full" },
        ),
      ).toBe("Failed (rejected by the OCR engine)");
    });

    it("separates the status from the reason with a bullet when compact", () => {
      expect(
        describeResult(
          { status: "failed", reason: "rejectedByEngine" },
          { style: "compact" },
        ),
      ).toBe("Failed · rejected by the OCR engine");
    });

    it("includes detail when full but not when compact", () => {
      const result: AttachmentResult = {
        status: "failed",
        reason: "commandFailed",
        detail: "exit code 3",
      };

      expect(describeResult(result, { style: "full" })).toBe(
        "Failed (custom command failed; exit code 3)",
      );
      expect(describeResult(result, { style: "compact" })).toBe(
        "Failed · custom command failed",
      );
    });
  });

  describe("describeEmpty", () => {
    it("describes when there is nothing to extract", () => {
      expect(describeEmpty("complete", { filtering: false })).toBe(
        "Nothing to extract",
      );
    });

    it("describes when nothing matches the filter", () => {
      expect(describeEmpty("complete", { filtering: true })).toBe(
        "No attachments match the filter",
      );
    });

    it("returns null while running", () => {
      expect(describeEmpty("running", { filtering: false })).toBeNull();
    });
  });

  describe("describeCompletion", () => {
    const completion = (overrides: RunReportOverrides) =>
      describeCompletion(buildRunReport(overrides));

    const notes = (results: AttachmentResult[]) => [
      buildNoteEntry({
        attachments: results.map((result, index) => ({
          path: `attachments/scan-${index}.pdf`,
          result,
        })),
      }),
    ];

    const repeat = (result: AttachmentResult, count: number) =>
      Array.from({ length: count }, () => result);

    it("includes the word 'attachments' on the first count line only", () => {
      expect(
        completion({
          totalNotes: 3,
          notes: notes([
            ...repeat({ status: "extracted" }, 12),
            ...repeat({ status: "skipped", reason: "noTextFound" }, 3),
            ...repeat({ status: "failed", reason: "rejectedByEngine" }, 2),
          ]),
        }),
      ).toEqual([
        "Text extraction complete",
        "12 attachments extracted",
        "3 skipped",
        "2 failed",
      ]);

      expect(
        completion({
          totalNotes: 3,
          notes: notes(repeat({ status: "skipped", reason: "noTextFound" }, 3)),
        }),
      ).toEqual(["Text extraction complete", "3 attachments skipped"]);
    });

    it("includes the filename for a single failure in a single-note run", () => {
      expect(
        completion({
          totalNotes: 1,
          notes: notes([
            { status: "extracted" },
            { status: "failed", reason: "pdfUnreadable" },
          ]),
        }),
      ).toEqual([
        "Text extraction complete",
        "1 attachment extracted",
        "Failed: scan-1.pdf (could not read PDF)",
      ]);
    });

    it("doesn't include the filename for a single failure in a multi-note run", () => {
      expect(
        completion({
          totalNotes: 2,
          notes: notes([{ status: "failed", reason: "pdfUnreadable" }]),
        }),
      ).toEqual(["Text extraction complete", "1 attachment failed"]);
    });

    it("doesn't include the filename for multiple failures in a single-note run", () => {
      expect(
        completion({
          totalNotes: 1,
          notes: notes(
            repeat({ status: "failed", reason: "pdfUnreadable" }, 2),
          ),
        }),
      ).toEqual(["Text extraction complete", "2 attachments failed"]);
    });

    it("shows 'Nothing to extract' when the run produced no results", () => {
      expect(completion({ totalNotes: 4, notes: [] })).toEqual([
        "Nothing to extract",
      ]);
    });
  });

  describe("buildCopyText", () => {
    const copyText = (overrides: RunReportOverrides = {}) =>
      buildCopyText(buildRunReport(overrides));

    it("formats the provided report data", () => {
      const text = copyText({
        startedAt: Date.parse("2026-03-04T15:30:00Z"),
        finishedAt: Date.parse("2026-03-04T15:32:03Z"),
        totalNotes: 2,
        notes: [
          buildNoteEntry({
            path: "Folder/First note.md",
            attachments: [
              {
                path: "attachments/image.png",
                result: { status: "extracted" },
              },
              {
                path: "attachments/scan.pdf",
                result: { status: "failed", reason: "pdfUnreadable" },
              },
            ],
          }),
          buildNoteEntry({
            path: "Second note.md",
            attachments: [
              {
                path: "attachments/data.xml",
                result: {
                  status: "skipped",
                  reason: "unsupportedFileType",
                  detail: "MIME type application/xml",
                },
              },
            ],
          }),
        ],
      });

      expect(text).toBe(
        [
          "OCR Extractor report",
          "All notes",
          "Started: Mar 4, 2026, 3:30 PM · 2 notes",
          "Finished: Mar 4, 2026, 3:32 PM · 2m 3s",
          "Completed",
          "Attachments: 1 extracted · 1 skipped · 1 failed",
          "",
          "Folder/First note.md",
          "  attachments/image.png: Extracted",
          "  attachments/scan.pdf: Failed (could not read PDF)",
          "",
          "Second note.md",
          "  attachments/data.xml: Skipped (unsupported file type; MIME type application/xml)",
        ].join("\n"),
      );
    });

    it("reports a fatal message with progress details", () => {
      const text = copyText({
        status: "fatal",
        fatalMessage: "Unauthorized. Check your API key.",
        scope: { type: "folder", path: "Scans" },
        startedAt: Date.parse("2026-03-04T15:30:00Z"),
        totalNotes: 2,
        notesProcessed: 1,
      });

      expect(text).toBe(
        [
          "OCR Extractor report",
          "Folder: Scans",
          "Started: Mar 4, 2026, 3:30 PM · 2 notes",
          "Error",
          "Unauthorized. Check your API key.",
          "Stopped after 1 of 2 notes",
          "Attachments: 0 extracted · 0 skipped · 0 failed",
        ].join("\n"),
      );
    });

    it("omits the finish line while a run is still in progress", () => {
      expect(
        copyText({ status: "running", finishedAt: undefined }),
      ).not.toContain("Finished:");
    });
  });
});

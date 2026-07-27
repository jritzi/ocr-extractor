import { describe, expect, it } from "vitest";
import {
  buildReportText,
  describeCount,
  describeEarlyStop,
  describeResult,
  describeResultStatus,
  describeRunStatus,
  describeScope,
} from "./report-text";
import { AttachmentResult, RunReport, RunStatus } from "./run-report";
import { buildReport } from "./run-report.factory";

describe("report-text.ts", () => {
  describe("describeScope", () => {
    it("describes every type of run scope", () => {
      expect(describeScope({ type: "note", path: "Folder/A note.md" })).toBe(
        "Note: Folder/A note.md",
      );
      expect(describeScope({ type: "folder", path: "Attachments/Scans" })).toBe(
        "Folder: Attachments/Scans",
      );
      expect(describeScope({ type: "vault" })).toBe("Whole vault");
      expect(describeScope({ type: "selection" })).toBe("Selected notes");
    });
  });

  describe("describeRunStatus", () => {
    it("describes the run's status", () => {
      const runStatus = (status: RunStatus) =>
        describeRunStatus(buildReport({ status }));

      expect(runStatus("running")).toBe("In progress");
      expect(runStatus("canceling")).toBe("Canceling");
      expect(runStatus("complete")).toBe("Completed");
      expect(runStatus("fatal")).toBe("Stopped");
      expect(runStatus("canceled")).toBe("Canceled");
    });
  });

  describe("describeEarlyStop", () => {
    const earlyStop = (overrides: Partial<RunReport>) =>
      describeEarlyStop(buildReport(overrides));

    it("reports progress for a run ended early", () => {
      expect(
        earlyStop({ status: "canceled", totalNotes: 2, notesProcessed: 1 }),
      ).toBe("Stopped after 1 of 2 notes");
      expect(
        earlyStop({ status: "fatal", totalNotes: 2, notesProcessed: 0 }),
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

  describe("buildReportText", () => {
    const reportText = (overrides: Partial<RunReport> = {}) =>
      buildReportText(buildReport(overrides));

    it("formats the provided report data", () => {
      const text = reportText({
        startedAt: Date.parse("2025-07-18T18:00:00Z"),
        finishedAt: Date.parse("2025-07-18T18:02:03Z"),
        totalNotes: 2,
        notes: [
          {
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
          },
          {
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
          },
        ],
      });

      expect(text).toBe(
        [
          "Extraction report",
          "Whole vault",
          "Started: Jul 18, 2025, 6:00 PM · 2 notes",
          "Finished: Jul 18, 2025, 6:02 PM · 2m 3s",
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
      const text = reportText({
        status: "fatal",
        fatalMessage: "Unauthorized. Check your API key.",
        scope: { type: "folder", path: "Scans" },
        totalNotes: 2,
        notesProcessed: 1,
      });

      expect(text).toBe(
        [
          "Extraction report",
          "Folder: Scans",
          "Started: Jul 18, 2025, 6:00 PM · 2 notes",
          "Stopped",
          "Unauthorized. Check your API key.",
          "Stopped after 1 of 2 notes",
          "Attachments: 0 extracted · 0 skipped · 0 failed",
        ].join("\n"),
      );
    });

    it("omits the finish line while a run is still in progress", () => {
      expect(
        reportText({ status: "running", finishedAt: undefined }),
      ).not.toContain("Finished:");
    });
  });
});

import { describe, expect, it } from "vitest";
import { countResults, firstFailure, isMultiNote } from "./run-report";
import { buildNoteEntry, buildRunReport } from "./run-report.test-utils";

describe("run-report.ts", () => {
  describe("isMultiNote", () => {
    it("counts every scope type except a single note as multi-note", () => {
      expect(isMultiNote({ type: "note", path: "a.md" })).toBe(false);
      expect(isMultiNote({ type: "folder", path: "Scans" })).toBe(true);
      expect(isMultiNote({ type: "vault" })).toBe(true);
      expect(isMultiNote({ type: "selection" })).toBe(true);
    });
  });

  describe("countResults", () => {
    it("counts results across notes", () => {
      const report = buildRunReport({
        notes: [
          buildNoteEntry({
            path: "a.md",
            attachments: [
              { path: "img.png", result: { status: "extracted" } },
              {
                path: "scan.pdf",
                result: { status: "failed", reason: "pdfUnreadable" },
              },
            ],
          }),
          buildNoteEntry({
            path: "b.md",
            attachments: [
              {
                path: "data.xml",
                result: { status: "skipped", reason: "unsupportedFileType" },
              },
            ],
          }),
        ],
      });

      expect(countResults(report)).toEqual({
        extracted: 1,
        skipped: 1,
        failed: 1,
      });
    });

    it("returns zero counts before any result is recorded", () => {
      expect(countResults(buildRunReport({ notes: [] }))).toEqual({
        extracted: 0,
        skipped: 0,
        failed: 0,
      });
    });
  });

  describe("firstFailure", () => {
    it("returns the failure when one attachment failed", () => {
      const report = buildRunReport({
        notes: [
          buildNoteEntry({
            attachments: [
              { path: "img.png", result: { status: "extracted" } },
              {
                path: "scan.pdf",
                result: { status: "failed", reason: "pdfUnreadable" },
              },
            ],
          }),
        ],
      });

      expect(firstFailure(report)?.path).toBe("scan.pdf");
    });

    it("returns the first failure in the note when several failed", () => {
      const report = buildRunReport({
        notes: [
          buildNoteEntry({
            attachments: [
              {
                path: "one.pdf",
                result: { status: "failed", reason: "pdfUnreadable" },
              },
              {
                path: "two.pdf",
                result: { status: "failed", reason: "pdfUnreadable" },
              },
            ],
          }),
        ],
      });

      expect(firstFailure(report)?.path).toBe("one.pdf");
    });

    it("returns null when nothing failed", () => {
      const report = buildRunReport({
        notes: [
          buildNoteEntry({
            attachments: [
              { path: "img.png", result: { status: "extracted" } },
              {
                path: "data.xml",
                result: { status: "skipped", reason: "unsupportedFileType" },
              },
            ],
          }),
        ],
      });

      expect(firstFailure(report)).toBeNull();
    });
  });
});

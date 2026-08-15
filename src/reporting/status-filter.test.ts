import { describe, expect, it } from "vitest";
import { filterNotes, isFiltering } from "./status-filter";
import { AttachmentResult, ResultStatus } from "./run-report";
import { buildNoteEntry } from "./run-report.test-utils";

function buildNoteWithStatuses(
  path: string,
  statuses: readonly ResultStatus[],
) {
  return buildNoteEntry({
    path,
    attachments: statuses.map((status, index) => ({
      path: `${status}-${index}.png`,
      result: buildResult(status),
    })),
  });
}

function buildResult(status: ResultStatus): AttachmentResult {
  switch (status) {
    case "extracted":
      return { status };
    case "skipped":
      return { status, reason: "unsupportedFileType" };
    case "failed":
      return { status, reason: "fileNotFound" };
  }
}

describe("isFiltering", () => {
  it("returns false when nothing is filtered", () => {
    expect(isFiltering({ extracted: true, skipped: true, failed: true })).toBe(
      false,
    );
  });

  it("returns true when filtering to hide a status", () => {
    expect(isFiltering({ extracted: true, skipped: false, failed: true })).toBe(
      true,
    );
  });
});

describe("filterNotes", () => {
  it("excludes attachments with a non-filtered status", () => {
    const notes = [buildNoteWithStatuses("a.md", ["extracted", "failed"])];

    const filtered = filterNotes(notes, {
      extracted: false,
      skipped: true,
      failed: true,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].attachments.map((one) => one.result.status)).toEqual([
      "failed",
    ]);
  });

  it("excludes notes with no attachments after filtering", () => {
    const notes = [
      buildNoteWithStatuses("a.md", ["extracted"]),
      buildNoteWithStatuses("b.md", ["extracted", "skipped"]),
    ];

    const filtered = filterNotes(notes, {
      extracted: false,
      skipped: true,
      failed: true,
    });

    expect(filtered.map((one) => one.path)).toEqual(["b.md"]);
  });

  it("includes every note when nothing is filtered", () => {
    const notes = [
      buildNoteWithStatuses("a.md", ["extracted"]),
      buildNoteWithStatuses("b.md", ["failed"]),
    ];

    const filtered = filterNotes(notes, {
      extracted: true,
      skipped: true,
      failed: true,
    });

    expect(filtered).toEqual(notes);
  });
});

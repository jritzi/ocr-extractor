import {
  AttachmentEntry,
  NoteEntry,
  RunReport,
  RunReportBase,
  RunStatus,
} from "./run-report";

export type RunReportOverrides = Partial<RunReportBase> &
  (
    | { status?: Exclude<RunStatus, "fatal"> }
    | { status: "fatal"; fatalMessage: string }
  );

export function buildRunReport(overrides: RunReportOverrides = {}): RunReport {
  return {
    startedAt: Date.parse("2025-07-18T18:00:00Z"),
    scope: { type: "vault" },
    status: "complete",
    totalNotes: 0,
    notesStarted: 0,
    notesProcessed: 0,
    notes: [],
    ...overrides,
  };
}

export function buildNoteEntry({
  path = "Note.md",
  attachments,
}: {
  path?: string;
  /** Attachments in the order they appear in the note */
  attachments: readonly Omit<AttachmentEntry, "order" | "markup">[];
}): NoteEntry {
  return {
    path,
    attachments: attachments.map((attachment, index) => ({
      ...attachment,
      markup: `![[${attachment.path}]]`,
      order: index,
    })),
  };
}

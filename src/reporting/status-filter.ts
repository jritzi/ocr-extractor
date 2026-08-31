import { NoteEntry, ResultStatus } from "./run-report";

export type StatusFilter = Record<ResultStatus, boolean>;

export const NO_FILTER: StatusFilter = {
  extracted: true,
  skipped: true,
  failed: true,
};

export function isFiltering(statusFilter: StatusFilter) {
  return Object.values(statusFilter).includes(false);
}

export function filterNotes(
  notes: readonly NoteEntry[],
  statusFilter: StatusFilter,
) {
  return notes
    .map((note) => ({
      ...note,
      attachments: note.attachments.filter(
        (attachment) => statusFilter[attachment.result.status],
      ),
    }))
    .filter((note) => note.attachments.length > 0);
}

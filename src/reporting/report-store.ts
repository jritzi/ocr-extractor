import { t } from "../i18n";
import { assert } from "../utils/assert";
import { warnFailed, warnSkipped } from "../utils/logging";
import { AttachmentEntry, NoteEntry, RunReport, RunScope } from "./run-report";

// Match what Obsidian uses internally, but over whole paths
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

/** Record of the current (or most recent) extraction run */
export class ReportStore {
  private report: RunReport | null = null;
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getReport() {
    return this.report;
  }

  startRun(scope: RunScope, totalNotes: number) {
    this.setReport({
      startedAt: Date.now(),
      scope,
      totalNotes,
      status: "running",
      notesStarted: 0,
      notesProcessed: 0,
      notes: [],
    });
  }

  recordResult(notePath: string, entry: AttachmentEntry) {
    const report = this.currentReport();
    const { result } = entry;

    if (result.status !== "extracted") {
      // Console messages use English regardless of the user's language
      const reasonText = t(`reasons.${result.reason}`, { lng: "en" });
      const consoleText = result.detail
        ? `${reasonText} (${result.detail})`
        : reasonText;
      if (result.status === "skipped") {
        warnSkipped(entry.path, consoleText);
      } else {
        warnFailed(entry.path, consoleText);
      }
    }

    const existingNote = report.notes.find((note) => note.path === notePath);

    const notes = existingNote
      ? report.notes.map((note) =>
          note === existingNote ? withAttachment(note, entry) : note,
        )
      : insertSorted(
          report.notes,
          { path: notePath, attachments: [entry] },
          comparePaths,
        );

    this.setReport({ ...report, notes });
  }

  noteStarted() {
    const report = this.currentReport();
    this.setReport({
      ...report,
      notesStarted: report.notesStarted + 1,
    });
  }

  noteProcessed() {
    const report = this.currentReport();
    this.setReport({
      ...report,
      notesProcessed: report.notesProcessed + 1,
    });
  }

  startCanceling() {
    this.setReport({ ...this.currentReport(), status: "canceling" });
  }

  completeRun() {
    this.finishRun({ status: "complete" });
  }

  fatalRun(message: string) {
    this.finishRun({ status: "fatal", fatalMessage: message });
  }

  cancelRun() {
    this.finishRun({ status: "canceled" });
  }

  private finishRun(
    finish:
      | { status: "complete" | "canceled" }
      | { status: "fatal"; fatalMessage: string },
  ) {
    this.setReport({
      ...this.currentReport(),
      ...finish,
      finishedAt: Date.now(),
    });
  }

  /** Get the current report after a run has started */
  private currentReport() {
    const report = this.report;
    assert(report, "report always exists once a run has started");
    return report;
  }

  private setReport(report: RunReport) {
    this.report = report;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function withAttachment(note: NoteEntry, entry: AttachmentEntry): NoteEntry {
  return {
    ...note,
    attachments: insertSorted(
      note.attachments,
      entry,
      (a, b) => a.order - b.order,
    ),
  };
}

function insertSorted<T>(
  items: readonly T[],
  item: T,
  compare: (a: T, b: T) => number,
) {
  const index = items.findIndex((existing) => compare(item, existing) < 0);
  return index === -1
    ? [...items, item]
    : [...items.slice(0, index), item, ...items.slice(index)];
}

function comparePaths(a: { path: string }, b: { path: string }) {
  return collator.compare(a.path, b.path);
}

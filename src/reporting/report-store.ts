import { t } from "../i18n";
import { assert } from "../utils/assert";
import { warnFailed, warnSkipped } from "../utils/logging";
import {
  AttachmentEntry,
  AttachmentResult,
  RunReport,
  RunScope,
} from "./run-report";

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

  recordResult(
    notePath: string,
    attachmentPath: string,
    result: AttachmentResult,
  ) {
    const report = this.currentReport();

    if (result.status !== "extracted") {
      // Console messages use English regardless of the user's language
      const reasonText = t(`reasons.${result.reason}`, { lng: "en" });
      const consoleText = result.detail
        ? `${reasonText} (${result.detail})`
        : reasonText;
      if (result.status === "skipped") {
        warnSkipped(attachmentPath, consoleText);
      } else {
        warnFailed(attachmentPath, consoleText);
      }
    }

    const newEntry: AttachmentEntry = { path: attachmentPath, result };
    const existingNote = report.notes.find((note) => note.path === notePath);

    // Consumers compare notes by reference, so don't rebuild the other notes
    const notes = existingNote
      ? report.notes.map((note) =>
          note.path === notePath
            ? { ...note, attachments: [...note.attachments, newEntry] }
            : note,
        )
      : [...report.notes, { path: notePath, attachments: [newEntry] }];

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

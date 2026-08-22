import { beforeEach, describe, expect, it, vi } from "vitest";
import { setLanguage } from "../i18n";
import { assert } from "../utils/assert";
import { ReportStore } from "./report-store";

function currentReport(store: ReportStore) {
  const report = store.getReport();
  assert(report, "The test starts a run before reading the report");
  return report;
}

describe("ReportStore", () => {
  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));

  it("has no report before the first run", () => {
    expect(new ReportStore().getReport()).toBeNull();
  });

  it("throws when a result is recorded outside a run", () => {
    const store = new ReportStore();
    expect(() =>
      store.recordResult("a.md", {
        path: "img.png",
        markup: "![[img.png]]",
        order: 0,
        result: { status: "extracted" },
      }),
    ).toThrow();
  });

  it("records the scope and note count a run starts with", () => {
    const store = new ReportStore();
    store.startRun({ type: "folder", path: "Scans" }, 3);

    const report = currentReport(store);
    expect(report.scope).toEqual({ type: "folder", path: "Scans" });
    expect(report.totalNotes).toBe(3);
  });

  it("clears the previous run's results when a second run starts", () => {
    const store = new ReportStore();
    store.startRun({ type: "vault" }, 2);
    store.noteStarted();
    store.recordResult("a.md", {
      path: "img.png",
      markup: "![[img.png]]",
      order: 0,
      result: { status: "extracted" },
    });

    store.noteProcessed();
    store.completeRun();

    store.startRun({ type: "note", path: "b.md" }, 1);

    const report = currentReport(store);
    expect(report.notes).toEqual([]);
    expect(report.notesStarted).toBe(0);
    expect(report.notesProcessed).toBe(0);
    expect(report.totalNotes).toBe(1);
    expect(report.scope).toEqual({ type: "note", path: "b.md" });
    expect(report.status).toBe("running");
    expect(report.finishedAt).toBeUndefined();
  });

  it("keeps the start time as the run progresses", () => {
    const store = new ReportStore();
    store.startRun({ type: "vault" }, 2);
    const { startedAt } = currentReport(store);
    expect(startedAt).toBeTypeOf("number");

    store.noteStarted();
    store.recordResult("a.md", {
      path: "img.png",
      markup: "![[img.png]]",
      order: 0,
      result: { status: "extracted" },
    });

    store.noteProcessed();
    store.completeRun();
    expect(currentReport(store).startedAt).toBe(startedAt);
  });

  it("counts started and processed notes separately", () => {
    const store = new ReportStore();
    store.startRun({ type: "vault" }, 2);

    store.noteStarted();
    store.noteProcessed();
    store.noteStarted();

    const report = currentReport(store);
    expect(report.notesStarted).toBe(2);
    expect(report.notesProcessed).toBe(1);
  });

  it("replaces the report reference on every change", () => {
    const store = new ReportStore();
    store.startRun({ type: "vault" }, 2);
    const first = currentReport(store);

    store.noteStarted();
    const second = currentReport(store);
    expect(second).not.toBe(first);

    store.recordResult("a.md", {
      path: "img.png",
      markup: "![[img.png]]",
      order: 0,
      result: { status: "extracted" },
    });

    const third = currentReport(store);
    expect(third).not.toBe(second);

    store.noteProcessed();
    expect(currentReport(store)).not.toBe(third);
  });

  it("sets finishedAt only once the run ends", () => {
    const store = new ReportStore();
    store.startRun({ type: "note", path: "a.md" }, 1);
    expect(currentReport(store).finishedAt).toBeUndefined();

    store.completeRun();
    expect(currentReport(store).finishedAt).toBeTypeOf("number");
  });

  it("leaves a canceling run unfinished until it ends", () => {
    const store = new ReportStore();
    store.startRun({ type: "note", path: "a.md" }, 1);

    store.startCanceling();
    expect(currentReport(store).status).toBe("canceling");
    expect(currentReport(store).finishedAt).toBeUndefined();

    store.cancelRun();
    expect(currentReport(store).status).toBe("canceled");
    expect(currentReport(store).finishedAt).toBeTypeOf("number");
  });

  it("records the correct details for each way a run ends", () => {
    const endRun = (end: (store: ReportStore) => void) => {
      const store = new ReportStore();
      store.startRun({ type: "note", path: "a.md" }, 1);
      end(store);
      return currentReport(store);
    };

    const complete = endRun((store) => store.completeRun());
    expect(complete.status).toBe("complete");

    const fatal = endRun((store) => store.fatalRun("Unauthorized"));
    expect(fatal).toMatchObject({
      status: "fatal",
      fatalMessage: "Unauthorized",
    });

    const canceled = endRun((store) => store.cancelRun());
    expect(canceled.status).toBe("canceled");

    for (const report of [complete, fatal, canceled]) {
      expect(report.finishedAt).toBeTypeOf("number");
    }
  });

  it("logs skips and failures in English, with their details", async () => {
    await setLanguage("es");

    const store = new ReportStore();
    store.startRun({ type: "vault" }, 2);

    store.recordResult("a.md", {
      path: "scan.pdf",
      markup: "![[scan.pdf]]",
      order: 0,
      result: { status: "skipped", reason: "passwordProtectedPdf" },
    });
    expect(console.warn).toHaveBeenCalledWith(
      "[OCR Extractor] Skipping scan.pdf: password-protected PDF",
    );

    store.recordResult("a.md", {
      path: "photo.png",
      markup: "![[photo.png]]",
      order: 1,
      result: {
        status: "failed",
        reason: "unexpected",
        detail: "Out of memory",
      },
    });
    expect(console.warn).toHaveBeenCalledWith(
      "[OCR Extractor] Failed to extract text from photo.png: unexpected error (Out of memory)",
    );

    store.recordResult("b.md", {
      path: "note.png",
      markup: "![[note.png]]",
      order: 0,
      result: { status: "extracted" },
    });
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("reuses the entry for a note that did not change", () => {
    const store = new ReportStore();
    store.startRun({ type: "vault" }, 2);
    store.recordResult("a.md", {
      path: "img.png",
      markup: "![[img.png]]",
      order: 0,
      result: { status: "extracted" },
    });

    const findNote = () => {
      const note = currentReport(store).notes.find(
        (entry) => entry.path === "a.md",
      );
      assert(note, "The run recorded a result for the note");
      return note;
    };
    const note = findNote();

    store.recordResult("b.md", {
      path: "scan.pdf",
      markup: "![[scan.pdf]]",
      order: 0,
      result: { status: "failed", reason: "pdfUnreadable" },
    });

    expect(findNote()).toBe(note);
  });

  it("replaces the entry and attachments of a note with a new result", () => {
    const store = new ReportStore();
    store.startRun({ type: "note", path: "a.md" }, 1);
    store.recordResult("a.md", {
      path: "one.png",
      markup: "![[one.png]]",
      order: 0,
      result: { status: "extracted" },
    });
    const noteBefore = currentReport(store).notes[0];

    store.recordResult("a.md", {
      path: "two.png",
      markup: "![[two.png]]",
      order: 1,
      result: { status: "extracted" },
    });
    const noteAfter = currentReport(store).notes[0];

    expect(noteAfter).not.toBe(noteBefore);
    expect(noteAfter.attachments).not.toBe(noteBefore.attachments);
    expect(noteAfter.attachments).toHaveLength(2);
  });

  it("keeps both results when two embeds of the same file complete with different statuses", () => {
    const store = new ReportStore();
    store.startRun({ type: "note", path: "a.md" }, 1);
    store.recordResult("a.md", {
      path: "img.png",
      markup: "![[img.png]]",
      order: 0,
      result: { status: "extracted" },
    });

    store.recordResult("a.md", {
      path: "img.png",
      markup: "![[img.png|300]]",
      order: 1,
      result: { status: "failed", reason: "noteChanged" },
    });

    const attachments = currentReport(store).notes[0].attachments;
    expect(attachments).toHaveLength(2);
    expect(attachments.map((entry) => entry.result.status)).toEqual([
      "extracted",
      "failed",
    ]);
  });

  it("orders notes by path (not when their results arrive)", () => {
    const store = new ReportStore();
    store.startRun({ type: "vault" }, 3);
    store.recordResult("Notes/b.md", {
      path: "one.png",
      markup: "![[one.png]]",
      order: 0,
      result: { status: "extracted" },
    });
    store.recordResult("a.md", {
      path: "two.png",
      markup: "![[two.png]]",
      order: 0,
      result: { status: "extracted" },
    });
    store.recordResult("Notes/a.md", {
      path: "three.png",
      markup: "![[three.png]]",
      order: 0,
      result: { status: "extracted" },
    });

    expect(currentReport(store).notes.map((note) => note.path)).toEqual([
      "a.md",
      "Notes/a.md",
      "Notes/b.md",
    ]);
  });

  it("orders numbered notes by their value (not digit by digit)", () => {
    const store = new ReportStore();
    store.startRun({ type: "vault" }, 2);
    store.recordResult("Chapter 10.md", {
      path: "one.png",
      markup: "![[one.png]]",
      order: 0,
      result: { status: "extracted" },
    });
    store.recordResult("Chapter 2.md", {
      path: "two.png",
      markup: "![[two.png]]",
      order: 0,
      result: { status: "extracted" },
    });

    expect(currentReport(store).notes.map((note) => note.path)).toEqual([
      "Chapter 2.md",
      "Chapter 10.md",
    ]);
  });

  it("orders notes' attachments by their order in the note", () => {
    const store = new ReportStore();
    store.startRun({ type: "note", path: "a.md" }, 1);
    store.recordResult("a.md", {
      path: "last.png",
      markup: "![[last.png]]",
      order: 2,
      result: { status: "skipped", reason: "noTextFound" },
    });
    store.recordResult("a.md", {
      path: "first.png",
      markup: "![[first.png]]",
      order: 0,
      result: { status: "extracted" },
    });
    store.recordResult("a.md", {
      path: "middle.png",
      markup: "![[middle.png]]",
      order: 1,
      result: { status: "extracted" },
    });

    const attachments = currentReport(store).notes[0].attachments;
    expect(attachments.map((entry) => entry.path)).toEqual([
      "first.png",
      "middle.png",
      "last.png",
    ]);
  });

  it("returns the stored report rather than a copy", () => {
    const store = new ReportStore();
    store.startRun({ type: "note", path: "a.md" }, 1);
    expect(currentReport(store)).toBe(currentReport(store));
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const store = new ReportStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.startRun({ type: "note", path: "a.md" }, 1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.noteStarted();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

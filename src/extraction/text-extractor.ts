import OcrExtractorPlugin from "../../main";
import { App, MarkdownView, Platform, TFile, TFolder } from "obsidian";
import { FatalError } from "../engines/ocr-engine";
import { OcrEngineManager } from "../engines/ocr-engine-manager";
import { StatusManager } from "../ui/status-manager";
import { ReportStore } from "../reporting/report-store";
import { assert } from "es-toolkit";
import { debugLog, logError, logWarning } from "../utils/logging";
import { showNotice } from "../utils/notice";
import { markdownFilesInFolder } from "../utils/file";
import { RunScope } from "../reporting/run-report";
import { NoteExtractor } from "./note-extractor";
import { ConfirmExtractAllModal } from "../ui/confirm-extract-all-modal";
import { SelectFolderModal } from "../ui/select-folder-modal";
import { t } from "../i18n";

export class TextExtractor {
  private readonly app: App;
  private readonly store: ReportStore;
  private readonly statusManager: StatusManager;
  private readonly engineManager: OcrEngineManager;

  constructor(private readonly plugin: OcrExtractorPlugin) {
    this.app = plugin.app;
    this.store = plugin.reportStore;
    this.statusManager = plugin.statusManager;
    this.engineManager = plugin.engineManager;
  }

  canProcessActiveNote() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return !!view?.file && this.canProcessSingleNote();
  }

  processActiveNote() {
    assert(this.canProcessActiveNote(), "Callers check before processing");

    const view = this.app.workspace.getActiveViewOfType(MarkdownView)!;
    this.processSingleNote(view.file!);
  }

  canProcessSingleNote() {
    return this.statusManager.isIdle();
  }

  processSingleNote(note: TFile) {
    assert(this.canProcessSingleNote(), "Callers check before processing");
    this.startExtractingFiles([note], { type: "note", path: note.path });
  }

  canProcessMultipleNotes() {
    // Desktop-only until progress feedback added for mobile (status bar is desktop-only)
    return Platform.isDesktop && this.statusManager.isIdle();
  }

  processFolder(folder?: TFolder) {
    assert(this.canProcessMultipleNotes(), "Callers check before processing");

    if (folder) {
      this.startExtractingFolder(folder);
    } else {
      new SelectFolderModal(this.app, (selected) =>
        this.startExtractingFolder(selected),
      ).open();
    }
  }

  processAllNotes() {
    assert(this.canProcessMultipleNotes(), "Callers check before processing");

    new ConfirmExtractAllModal(this.app, () => {
      this.startExtractingFiles(this.app.vault.getMarkdownFiles(), {
        type: "vault",
      });
    }).open();
  }

  processSelection(notes: TFile[]) {
    assert(this.canProcessMultipleNotes(), "Callers check before processing");
    this.startExtractingFiles(notes, { type: "selection" });
  }

  private startExtractingFolder(folder: TFolder) {
    this.startExtractingFiles(markdownFilesInFolder(folder), {
      type: "folder",
      path: folder.path,
    });
  }

  private startExtractingFiles(files: TFile[], scope: RunScope) {
    this.statusManager.setProcessing(scope, files.length);

    if (files.length === 0) {
      this.statusManager.setComplete();
      return;
    }

    void this.runExtraction(files);
  }

  private async runExtraction(files: TFile[]) {
    try {
      await this.engineManager.rebuildIfNeeded();

      if (this.engineManager.usingMobileFallback) {
        showNotice(
          t("notices.mobileEngineFallback", { pluginName: t("pluginName") }),
        );
      }

      const noteExtractor = new NoteExtractor(this.plugin);

      for (const noteFile of files) {
        if (this.statusManager.getSignal().aborted) break;

        debugLog(`Processing file ${noteFile.path}`);
        this.store.noteStarted();
        await noteExtractor.process(noteFile);

        if (this.statusManager.getSignal().aborted) break;

        this.store.noteProcessed();
      }

      if (this.statusManager.isUnloading()) return;

      if (this.statusManager.isCanceling()) {
        this.statusManager.setCanceled();
      } else {
        this.statusManager.setComplete();
      }
    } catch (error) {
      if (this.statusManager.isUnloading()) return;

      if (this.statusManager.isCanceling()) {
        this.statusManager.setCanceled();
      } else if (error instanceof FatalError) {
        logWarning(`Extraction stopped: ${error.message}`, error.cause);
        this.statusManager.setFatal(error.message);
      } else {
        logError("Extraction stopped by an unexpected error", error);
        this.statusManager.setFatal(t("errors.extractionFailed"));
      }
    }
  }
}

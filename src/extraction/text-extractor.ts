import OcrExtractorPlugin from "../../main";
import {
  App,
  EmbedCache,
  MarkdownView,
  Platform,
  TFile,
  TFolder,
} from "obsidian";
import { FatalError } from "../engines/ocr-engine";
import { OcrEngineManager } from "../engines/ocr-engine-manager";
import { StatusManager } from "../ui/status-manager";
import { ReportStore } from "../reporting/report-store";
import { EmbedsToMarkdown, selectEmbedsToProcess } from "../editing/plan";
import { insertWhenSettled } from "../editing/settle";
import type { InsertResult } from "../editing/insert-result";
import pLimit from "p-limit";
import { assert } from "../utils/assert";
import { debugLog, logError, logWarning } from "../utils/logging";
import { showNotice } from "../utils/notice";
import {
  attachmentPath,
  getEmbeds,
  isObsidianNative,
  markdownFilesInFolder,
  resolveEmbedFile,
} from "../utils/file";
import { RunScope } from "../reporting/run-report";
import { EmbedResult, recordResults } from "./record-results";
import { ConfirmExtractAllModal } from "../ui/confirm-extract-all-modal";
import { SelectFolderModal } from "../ui/select-folder-modal";
import { t } from "../i18n";

export class TextExtractor {
  private app: App;
  private store: ReportStore;
  private statusManager: StatusManager;
  private engineManager: OcrEngineManager;

  constructor(plugin: OcrExtractorPlugin) {
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

      for (const noteFile of files) {
        if (this.statusManager.getSignal().aborted) break;

        debugLog(`Processing file ${noteFile.path}`);
        this.store.noteStarted();
        await this.processNote(noteFile);

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

  private async processNote(noteFile: TFile) {
    if (this.isNoteDeleted(noteFile)) return;

    let content: string;
    try {
      content = await this.app.vault.cachedRead(noteFile);
    } catch (error) {
      if (this.isNoteDeleted(noteFile)) return;
      throw error;
    }

    const embeds = getEmbeds(this.app, noteFile);
    const { embedResults, embedsToMarkdown } = await this.extractTextFromEmbeds(
      noteFile,
      content,
      embeds,
    );

    let insertResult: InsertResult;
    try {
      insertResult = await insertWhenSettled(
        this.app,
        noteFile,
        embedsToMarkdown,
        this.statusManager.getSignal(),
      );
    } catch (error) {
      if (this.isNoteDeleted(noteFile)) return;
      throw error;
    }

    recordResults(this.store, noteFile.path, embedResults, insertResult);
  }

  private async extractTextFromEmbeds(
    noteFile: TFile,
    fileContent: string,
    embeds: EmbedCache[],
  ) {
    const embedsToProcess = selectEmbedsToProcess(fileContent, embeds);

    // Limit concurrency
    const limit = pLimit(5);

    const processed = await Promise.all(
      embedsToProcess.map((embed) =>
        limit(() => this.processEmbed(noteFile, embed)),
      ),
    );

    // Embeds finish in arbitrary order, so get order from the note, not the
    // results
    const embedResults: EmbedResult[] = [];
    processed.forEach((result, index) => {
      if (result) {
        embedResults.push({ ...result, order: index });
      }
    });

    const embedsToMarkdown: EmbedsToMarkdown = new Map();
    for (const { markup, engineResult } of embedResults) {
      if (engineResult.status === "extracted") {
        embedsToMarkdown.set(markup, engineResult.markdown);
      }
    }

    return { embedResults, embedsToMarkdown };
  }

  private async processEmbed(
    noteFile: TFile,
    embed: EmbedCache,
  ): Promise<Omit<EmbedResult, "order"> | null> {
    const signal = this.statusManager.getSignal();
    if (signal.aborted) return null;

    let embedFile: TFile | null = null;

    try {
      embedFile = resolveEmbedFile(this.app, embed.link, noteFile.path);
      if (!embedFile) {
        return {
          path: attachmentPath(null, embed.link),
          markup: embed.original,
          engineResult: { status: "failed", reason: "fileNotFound" },
        };
      }

      if (isObsidianNative(embedFile)) {
        return null;
      }

      const engineResult = await this.engineManager.extract(embedFile, signal);
      if (engineResult.status === "canceled" || signal.aborted) {
        return null;
      }

      return { path: embedFile.path, markup: embed.original, engineResult };
    } catch (error) {
      if (error instanceof FatalError || signal.aborted) {
        throw error;
      }

      logError("Unexpected error extracting an attachment:", error);
      return {
        path: attachmentPath(embedFile, embed.link),
        markup: embed.original,
        engineResult: { status: "failed", reason: "unexpected" },
      };
    }
  }

  private isNoteDeleted(noteFile: TFile) {
    // Renaming/moving updates the path in place, so this only implies deleted
    return !this.app.vault.getFileByPath(noteFile.path);
  }
}

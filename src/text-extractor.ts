import OcrExtractorPlugin, { OCR_ENGINES } from "../main";
import {
  EmbedCache,
  getLinkpath,
  MarkdownView,
  Platform,
  TFile,
  TFolder,
} from "obsidian";
import { OcrEngine, UserFacingError } from "./engines/ocr-engine";
import { EmbedsToMarkdown, selectEmbedsToProcess } from "./editing/plan";
import { InsertResult, insertWhenSettled } from "./editing/settle";
import pLimit from "p-limit";
import { assert } from "./utils/assert";
import { debugLog, warnSkipped } from "./utils/logging";
import { showErrorNotice, showNotice } from "./utils/notice";
import { shouldUseMobileEngineFallback } from "./settings";
import {
  getEmbeds,
  isObsidianNative,
  markdownFilesInFolder,
  resolveEmbedFile,
} from "./utils/file";
import { ConfirmExtractAllModal } from "./ui/confirm-extract-all-modal";
import { SelectFolderModal } from "./ui/select-folder-modal";
import { t } from "./i18n";

export class TextExtractor {
  // Initialized in buildEngine()
  private engine!: OcrEngine;

  private app = this.plugin.app;
  private settingsChanged = false;
  private usingMobileEngineFallback = false;

  constructor(private plugin: OcrExtractorPlugin) {
    this.buildEngine();
  }

  canProcessActiveFile() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return !!view?.file && this.canProcessSingleFile();
  }

  processActiveFile() {
    assert(this.canProcessActiveFile(), "Command disabled when can't process");

    const view = this.app.workspace.getActiveViewOfType(MarkdownView)!;
    this.processSingleFile(view.file!);
  }

  canProcessSingleFile() {
    return this.plugin.statusManager.isIdle();
  }

  processSingleFile(file: TFile) {
    assert(this.canProcessSingleFile(), "Callers check before processing");
    this.startExtractingFile(file);
  }

  canProcessMultipleFiles() {
    // Desktop-only until progress feedback added for mobile (status bar is desktop-only)
    return Platform.isDesktop && this.plugin.statusManager.isIdle();
  }

  processFolder(folder?: TFolder) {
    assert(
      this.canProcessMultipleFiles(),
      "Command disabled when can't process",
    );

    if (folder) {
      this.startExtractingFiles(markdownFilesInFolder(folder));
    } else {
      new SelectFolderModal(this.app, (selected) => {
        this.startExtractingFiles(markdownFilesInFolder(selected));
      }).open();
    }
  }

  processAllFiles() {
    assert(
      this.canProcessMultipleFiles(),
      "Command disabled when can't process",
    );

    new ConfirmExtractAllModal(this.app, () => {
      this.startExtractingFiles(this.app.vault.getMarkdownFiles());
    }).open();
  }

  processSelection(files: TFile[]) {
    assert(
      this.canProcessMultipleFiles(),
      "Command disabled when can't process",
    );
    this.startExtractingFiles(files);
  }

  markSettingsChanged() {
    this.settingsChanged = true;
  }

  cleanup() {
    return this.engine.terminate();
  }

  async processOcr(file: TFile, signal: AbortSignal) {
    const binary = await this.app.vault.readBinary(file);
    return this.engine.processOcr(new Uint8Array(binary), file.name, signal);
  }

  private buildEngine() {
    let engineName = this.plugin.settings.ocrEngine;
    this.usingMobileEngineFallback = false;
    if (shouldUseMobileEngineFallback(this.plugin.settings)) {
      this.usingMobileEngineFallback = true;
      engineName = "tesseract";
    }

    const EngineClass = OCR_ENGINES[engineName];
    this.engine = new EngineClass(
      // Clone to isolate engine from live settings changes
      structuredClone(this.plugin.settings),
      this.plugin.app.secretStorage,
    );
  }

  private async rebuildEngine() {
    const previousEngine = this.engine;
    this.buildEngine();
    this.settingsChanged = false;
    await previousEngine.terminate();
  }

  private startExtractingFile(file: TFile) {
    this.plugin.statusManager.setProcessingSingleNote();
    void this.runExtraction([file], { multiNote: false });
  }

  private startExtractingFiles(files: TFile[]) {
    if (files.length === 0) return;
    this.plugin.statusManager.setProcessingMultipleNotes(files.length);
    void this.runExtraction(files, { multiNote: true });
  }

  private async runExtraction(
    files: TFile[],
    { multiNote }: { multiNote: boolean },
  ) {
    let totalExtracted = 0;
    let totalSkipped = 0;

    const reclassifyAsSkipped = (count: number) => {
      totalExtracted -= count;
      totalSkipped += count;
    };

    try {
      if (this.settingsChanged) {
        await this.rebuildEngine();
      }

      if (this.usingMobileEngineFallback) {
        showNotice(
          t("notices.mobileEngineFallback", { pluginName: t("pluginName") }),
        );
      }

      for (const [index, file] of files.entries()) {
        if (this.plugin.statusManager.isCanceling()) {
          break;
        }

        debugLog(`Processing file ${file.path}`);
        if (multiNote) {
          this.plugin.statusManager.updateProgress(index + 1, files.length);
        }

        if (this.isNoteMissing(file)) {
          warnSkipped(file.path, "note deleted during extraction");
          continue;
        }

        const content = await this.app.vault.cachedRead(file);
        const embeds = getEmbeds(this.app, file);
        const { embedsToMarkdown, skippedEmbeds, extractedCount } =
          await this.extractTextFromEmbeds(file, content, embeds);
        totalSkipped += skippedEmbeds.length;
        totalExtracted += extractedCount;

        let result: InsertResult;
        try {
          result = await insertWhenSettled(
            this.app,
            file,
            embedsToMarkdown,
            this.plugin.statusManager.getSignal(),
          );
        } catch (error) {
          if (this.isNoteMissing(file)) {
            warnSkipped(file.path, "note deleted during extraction");
            reclassifyAsSkipped(extractedCount);
            continue;
          }
          throw error;
        }

        if (result.status === "done") {
          for (const markup of result.skippedResults) {
            const embed = embeds.find((embed) => embed.original === markup);
            warnSkipped(
              embed ? getLinkpath(embed.link) : markup,
              "embed changed or removed during extraction",
            );
          }

          reclassifyAsSkipped(result.skippedResults.length);
        } else if (result.status === "timeout") {
          // Treat the whole note as skipped, will be improved in OCR-49
          showErrorNotice(t("notices.fileChanged", { path: file.path }));
          reclassifyAsSkipped(extractedCount);
        } else {
          // Nothing needed for "canceled"
        }
      }

      if (this.plugin.statusManager.isCanceling()) {
        this.plugin.statusManager.setCanceled();
      } else if (!this.plugin.statusManager.getSignal().aborted) {
        this.plugin.statusManager.setComplete(totalExtracted, totalSkipped);
      } else {
        // Aborted without canceling means unloading the plugin, so don't
        // show a completion notice
      }
    } catch (e: unknown) {
      let message: string;
      if (e instanceof UserFacingError) {
        message = e.message;
      } else {
        console.error(e);
        message = t("errors.extractionFailed");
      }
      this.plugin.statusManager.setError(message);
    }
  }

  private async extractTextFromEmbeds(
    noteFile: TFile,
    fileContent: string,
    embeds: EmbedCache[],
  ) {
    const embedsToProcess = selectEmbedsToProcess(fileContent, embeds);
    const skippedEmbeds: EmbedCache[] = [];
    let extractedCount = 0;

    // Limit concurrency
    const limit = pLimit(5);

    const entries = await Promise.all(
      embedsToProcess.map((embed) =>
        limit(async () => {
          let markdown: string | null = null;
          const embedFile = resolveEmbedFile(
            this.app,
            embed.link,
            noteFile.path,
          );

          if (!embedFile) {
            warnSkipped(getLinkpath(embed.link), "file not found");
            skippedEmbeds.push(embed);
          } else if (isObsidianNative(embedFile)) {
            // Skip without warning
          } else {
            markdown = await this.processOcr(
              embedFile,
              this.plugin.statusManager.getSignal(),
            );

            // Skip on "" (ran, no text) as well as null (couldn't process)
            if (!markdown) {
              warnSkipped(getLinkpath(embed.link), "no text extracted");
              skippedEmbeds.push(embed);
            } else {
              extractedCount++;
            }
          }

          return [embed.original, markdown] as const;
        }),
      ),
    );

    const embedsToMarkdown: EmbedsToMarkdown = new Map(entries);
    return { embedsToMarkdown, skippedEmbeds, extractedCount };
  }

  private isNoteMissing(file: TFile) {
    return !this.app.vault.getFileByPath(file.path);
  }
}

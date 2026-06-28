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
import {
  formatCalloutToInsert,
  insertWithBlankLines,
  isManagedCallout,
  migrateCallouts,
} from "./utils/callout";
import { batchPromises } from "./utils/async";
import { assert } from "./utils/assert";
import { debugLog, warnSkipped } from "./utils/logging";
import { showErrorNotice, showNotice } from "./utils/notice";
import { shouldUseMobileEngineFallback } from "./settings";
import {
  isObsidianNative,
  markdownFilesInFolder,
  resolveEmbedPath,
} from "./utils/file";
import { ConfirmExtractAllModal } from "./ui/confirm-extract-all-modal";
import { SelectFolderModal } from "./ui/select-folder-modal";
import { t } from "./i18n";

export class TextExtractor {
  private app = this.plugin.app;
  private engine: OcrEngine;
  private readonly usingMobileEngineFallback: boolean = false;

  constructor(private plugin: OcrExtractorPlugin) {
    let engineName = plugin.settings.ocrEngine;
    if (shouldUseMobileEngineFallback(plugin.settings)) {
      this.usingMobileEngineFallback = true;
      engineName = "tesseract";
    }

    const EngineClass = OCR_ENGINES[engineName];
    this.engine = new EngineClass(plugin.settings, plugin.app.secretStorage);
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

  cleanup() {
    return this.engine.terminate();
  }

  async processOcr(file: TFile, signal: AbortSignal) {
    const binary = await this.app.vault.readBinary(file);
    return this.engine.processOcr(new Uint8Array(binary), file.name, signal);
  }

  private startExtractingFile(file: TFile) {
    this.plugin.statusManager.setProcessingSingleNote();
    void this.runExtraction([file]);
  }

  private startExtractingFiles(files: TFile[]) {
    if (files.length === 0) return;
    this.plugin.statusManager.setProcessingMultipleNotes(files.length);
    void this.runExtraction(files);
  }

  private async runExtraction(files: TFile[]) {
    if (this.usingMobileEngineFallback) {
      showNotice(
        t("notices.mobileEngineFallback", { pluginName: t("pluginName") }),
      );
    }

    const allSkippedEmbeds: EmbedCache[] = [];
    let totalExtracted = 0;

    try {
      for (const [index, file] of files.entries()) {
        if (this.plugin.statusManager.isCanceling()) {
          break;
        }

        debugLog(`Processing file ${file.path}`);
        this.plugin.statusManager.updateProgress(index + 1, files.length);

        const content = await this.app.vault.cachedRead(file);
        const embeds = this.getEmbeds(file);
        const { embedsToMarkdown, skippedEmbeds, extractedCount } =
          await this.extractTextFromEmbeds(file, content, embeds);
        allSkippedEmbeds.push(...skippedEmbeds);
        totalExtracted += extractedCount;
        await this.insertCallouts(embedsToMarkdown, content, file, embeds);
      }

      if (this.plugin.statusManager.isCanceling()) {
        this.plugin.statusManager.setCanceled();
      } else {
        this.plugin.statusManager.setComplete(totalExtracted, allSkippedEmbeds);
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
    const embedsToProcess = embeds.filter(
      (embed) => !this.alreadyProcessed(embed, fileContent),
    );
    const seen = new Set<string>();
    const uniqueEmbeds = embedsToProcess.filter((embed) => {
      if (seen.has(embed.original)) return false;
      seen.add(embed.original);
      return true;
    });
    const skippedEmbeds: EmbedCache[] = [];
    let extractedCount = 0;

    const tasks = uniqueEmbeds.map((embed) => async () => {
      let markdown: string | null = null;
      const embedFile = this.getEmbedFile(embed, noteFile);

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
          skippedEmbeds.push(embed);
        } else {
          extractedCount++;
        }
      }

      return [embed.original, markdown] as const;
    });

    // Batch to avoid rate limiting
    const embedsToMarkdown = new Map(await batchPromises(tasks, 5));
    return { embedsToMarkdown, skippedEmbeds, extractedCount };
  }

  private async insertCallouts(
    embedsToMarkdown: Map<string, string | null>,
    originalFileContent: string,
    file: TFile,
    embeds: EmbedCache[],
  ) {
    await this.app.vault.process(file, (data) => {
      if (this.plugin.statusManager.isCanceling()) {
        return data;
      }

      let newContent = data;
      if (data !== originalFileContent) {
        const warning = t("notices.fileChanged", { path: file.path });
        console.warn(warning);
        showErrorNotice(warning);
        return data;
      }

      // Insert in reverse order to avoid position changes during edits
      for (const embed of [...embeds].reverse()) {
        const markdown = embedsToMarkdown.get(embed.original);

        if (!markdown) {
          continue;
        }

        if (this.alreadyProcessed(embed, originalFileContent)) {
          continue;
        }

        if (this.embedMoved(embed, newContent)) {
          console.warn(
            `Embed ${embed.original} moved during processing, skipping`,
          );
          continue;
        }

        const { text, linePrefix } = formatCalloutToInsert(
          markdown,
          newContent,
          embed.position.start.offset,
        );

        newContent = insertWithBlankLines(
          newContent,
          text,
          embed.position.end.offset,
          linePrefix,
        );
      }

      newContent = migrateCallouts(newContent);

      return newContent;
    });
  }

  private getEmbeds(file: TFile) {
    const cache = this.app.metadataCache.getCache(file.path);
    return cache?.embeds ?? [];
  }

  private getEmbedFile(embed: EmbedCache, file: TFile) {
    const path = resolveEmbedPath(
      this.app.metadataCache,
      embed.link,
      file.path,
    );
    return path ? this.app.vault.getFileByPath(path) : null;
  }

  private alreadyProcessed(embed: EmbedCache, content: string) {
    const remainder = content.slice(embed.position.end.offset);
    return isManagedCallout(remainder.replace(/^[\s>]*/, ""));
  }

  private embedMoved(embed: EmbedCache, content: string) {
    const { start, end } = embed.position;
    return content.slice(start.offset, end.offset) !== embed.original;
  }
}

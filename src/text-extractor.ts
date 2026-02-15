import OcrExtractorPlugin, { OCR_SERVICES } from "../main";
import {
  EmbedCache,
  getLinkpath,
  MarkdownView,
  Platform,
  TFile,
} from "obsidian";
import { uniqBy } from "lodash-es";
import { OcrService, UserFacingError } from "./services/ocr-service";
import {
  CALLOUT_HEADER,
  formatCalloutToInsert,
  insertWithBlankLines,
} from "./utils/callout";
import { batchPromises, withCancellation } from "./utils/async";
import { assert } from "./utils/assert";
import { debugLog, warnSkipped } from "./utils/logging";
import { showErrorNotice, showNotice } from "./utils/notice";
import { shouldUseMobileServiceFallback } from "./settings";
import { ConfirmExtractAllModal } from "./ui/confirm-extract-all-modal";

export class TextExtractor {
  private app = this.plugin.app;
  private service: OcrService;
  private readonly usingMobileServiceFallback: boolean = false;

  constructor(private plugin: OcrExtractorPlugin) {
    let serviceName = plugin.settings.ocrService;
    if (shouldUseMobileServiceFallback(plugin.settings)) {
      this.usingMobileServiceFallback = true;
      serviceName = "tesseract";
    }

    const ServiceClass = OCR_SERVICES[serviceName];
    this.service = new ServiceClass(plugin.settings);
  }

  canProcessActiveFile() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.file && this.plugin.statusManager.isIdle();
  }

  processActiveFile() {
    assert(this.canProcessActiveFile(), "Command disabled when can't process");

    const view = this.app.workspace.getActiveViewOfType(MarkdownView)!;
    const file = view.file!;
    this.plugin.statusManager.setProcessingSingleNote();
    void this.processFiles([file]);
  }

  canProcessAllFiles() {
    return Platform.isDesktop && this.plugin.statusManager.isIdle();
  }

  processAllFiles() {
    assert(this.canProcessAllFiles(), "Command disabled when can't process");

    new ConfirmExtractAllModal(this.app, () => {
      const markdownFiles = this.app.vault.getMarkdownFiles();
      this.plugin.statusManager.setProcessingAllNotes(markdownFiles.length);
      void this.processFiles(markdownFiles);
    }).open();
  }

  cleanup() {
    return this.service.terminate();
  }

  private async processFiles(files: TFile[]) {
    if (this.usingMobileServiceFallback) {
      showNotice(
        "Custom commands are not available on mobile, using Tesseract",
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
        this.plugin.statusManager.setCancelled();
      } else {
        this.plugin.statusManager.setComplete(totalExtracted, allSkippedEmbeds);
      }
    } catch (e: unknown) {
      let message: string;
      if (e instanceof UserFacingError) {
        message = e.message;
      } else {
        console.error(e);
        message = "Failed to extract text";
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
    const uniqueEmbeds = uniqBy(embedsToProcess, (embed) => embed.original);
    const skippedEmbeds: EmbedCache[] = [];
    let extractedCount = 0;

    const tasks = uniqueEmbeds.map((embed) => async () => {
      let markdown: string | null = null;
      const embedFile = this.getEmbedFile(embed, noteFile);

      if (embedFile) {
        const binary = await this.app.vault.readBinary(embedFile);
        const data = new Uint8Array(binary);
        markdown = await withCancellation(
          this.service.processOcr(data, embedFile.name),
          () => this.plugin.statusManager.isCanceling(),
        );
        if (markdown === null) {
          skippedEmbeds.push(embed);
        } else {
          extractedCount++;
        }
      } else {
        warnSkipped(getLinkpath(embed.link), "file not found");
        skippedEmbeds.push(embed);
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
        const warning = `File changed during processing, skipping (${file.path})`;
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

      return newContent;
    });
  }

  private getEmbeds(file: TFile) {
    const cache = this.app.metadataCache.getCache(file.path);
    return cache?.embeds ?? [];
  }

  private getEmbedFile(embed: EmbedCache, file: TFile) {
    const path = this.app.metadataCache.getFirstLinkpathDest(
      getLinkpath(embed.link),
      file.path,
    )?.path;

    return path ? this.app.vault.getFileByPath(path) : null;
  }

  private alreadyProcessed(embed: EmbedCache, content: string) {
    const remainder = content.slice(embed.position.end.offset);
    return remainder.replace(/^[\s>]*/, "").startsWith(CALLOUT_HEADER);
  }

  private embedMoved(embed: EmbedCache, content: string) {
    const startOffset = embed.position.start.offset;
    const endOffset = embed.position.end.offset;

    const startMatches = content.slice(startOffset, startOffset + 3) === "![[";
    const endMatches = content.slice(endOffset - 2, endOffset) === "]]";

    return !startMatches || !endMatches;
  }
}

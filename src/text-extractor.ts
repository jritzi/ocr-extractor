import OcrExtractorPlugin, { OcrExtractorError } from "../main";
import {
  EmbedCache,
  getLinkpath,
  MarkdownView,
  Notice,
  Platform,
  TFile,
} from "obsidian";
import { uniqBy } from "lodash-es";
import { MistralApi } from "./mistral-api";
import {
  CALLOUT_HEADER,
  formatCalloutToInsert,
  insertWithBlankLines,
} from "./callout-utils";
import { batchPromises, debugLog, withCancellation } from "./utils";
import { showErrorNotice } from "./ui";
import { ConfirmExtractAllModal } from "./confirm-extract-all-modal";

const SUPPORTED_FILETYPE_REGEX = /\.(pdf|jpg|jpeg|png|avif|pptx|docx)(#.*)?$/i;

export class TextExtractor {
  private app = this.plugin.app;
  private api = new MistralApi(this.plugin.settings.mistralApiKey);

  constructor(private plugin: OcrExtractorPlugin) {}

  canProcessActiveFile() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.file && this.plugin.statusManager.isIdle();
  }

  processActiveFile() {
    if (!this.canProcessActiveFile()) {
      // This should be impossible, since the command/option will be disabled
      showErrorNotice("Can't process active note");
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView)!;
    const file = view.file!;
    this.plugin.statusManager.setProcessingSingleNote(file.basename);
    void this.processFiles([file]);
  }

  canProcessAllFiles() {
    return Platform.isDesktop && this.plugin.statusManager.isIdle();
  }

  processAllFiles() {
    if (!this.canProcessAllFiles()) {
      // This should be impossible, since the command/option will be disabled
      showErrorNotice("Can't process all notes");
      return;
    }

    new ConfirmExtractAllModal(this.app, () => {
      const markdownFiles = this.app.vault.getMarkdownFiles();
      this.plugin.statusManager.setProcessingAllNotes(markdownFiles.length);
      void this.processFiles(markdownFiles);
    }).open();
  }

  private async processFiles(files: TFile[]) {
    try {
      for (const [index, file] of files.entries()) {
        if (this.plugin.statusManager.isCanceling()) {
          break;
        }

        debugLog(`Processing file ${file.path}`);
        this.plugin.statusManager.updateProgress(index + 1, files.length);

        const content = await this.app.vault.cachedRead(file);
        const embeds = this.getSupportedEmbeds(file);
        const embedsToMarkdown = await this.extractTextFromEmbeds(
          file,
          content,
          embeds,
        );
        await this.insertCallouts(embedsToMarkdown, content, file, embeds);
      }
    } catch (e: unknown) {
      console.error(e);
      showErrorNotice(
        e instanceof OcrExtractorError ? e.message : "Failed to extract text",
      );
    } finally {
      this.plugin.statusManager.setIdle();
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

    const tasks = uniqueEmbeds.map((embed) => async () => {
      let markdown: string | null = null;
      const embedFile = this.getEmbedFile(embed, noteFile);

      if (embedFile) {
        const binary = await this.app.vault.readBinary(embedFile);
        const data = new Uint8Array(binary);
        markdown = await withCancellation(this.api.processOcr(data), () =>
          this.plugin.statusManager.isCanceling(),
        );
      } else {
        console.warn(`Couldn't find file for attachment ${embed.original}`);
      }

      return [embed.original, markdown] as const;
    });

    // Batch to avoid rate limiting
    return new Map(await batchPromises(tasks, 5));
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
        new Notice(warning);
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

  private getSupportedEmbeds(file: TFile) {
    const cache = this.app.metadataCache.getCache(file.path);
    const embeds = cache?.embeds ?? [];

    return embeds.filter((embed) => SUPPORTED_FILETYPE_REGEX.test(embed.link));
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

import OcrExtractorPlugin, { OcrExtractorError } from "../main";
import { EmbedCache, getLinkpath, MarkdownView, Notice, TFile } from "obsidian";
import { MistralApi } from "./mistral-api";
import { EOL } from "os";
import {
  batchPromises,
  debugLog,
  insertAtPosition,
  withCancellation,
} from "./utils";
import { ConfirmExtractAllModal } from "./confirm-extract-all-modal";

const CALLOUT_HEADER = "[!summary]- Extracted text";

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
      new Notice("Error: Can't process active note");
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView)!;
    void this.processFiles([view.file!]);
  }

  canProcessAllFiles() {
    return this.plugin.statusManager.isIdle();
  }

  processAllFiles() {
    if (!this.canProcessAllFiles()) {
      // This should be impossible, since the command/option will be disabled
      new Notice("Error: Can't process all notes");
      return;
    }

    new ConfirmExtractAllModal(this.app, () => {
      const markdownFiles = this.app.vault.getMarkdownFiles();
      void this.processFiles(markdownFiles);
    }).open();
  }

  private async processFiles(files: TFile[]) {
    this.plugin.statusManager.setProcessing();

    try {
      for (const [index, file] of files.entries()) {
        if (this.plugin.statusManager.isCanceling()) {
          break;
        }

        debugLog(`Processing file ${file.path}`);
        this.plugin.statusManager.updateMessage(
          files.length === 1
            ? "Extracting text for note"
            : `Extracting text for note ${index + 1}/${files.length}`,
        );

        const content = await this.app.vault.cachedRead(file);
        const embedsToMarkdown = await this.extractTextFromEmbeds(
          file,
          content,
        );
        await this.insertCallouts(embedsToMarkdown, content, file);
      }
    } catch (e: unknown) {
      console.error(e);
      new Notice(
        e instanceof OcrExtractorError ? e.message : "Failed to extract text",
      );
    } finally {
      this.plugin.statusManager.setIdle();
    }
  }

  private async extractTextFromEmbeds(noteFile: TFile, fileContent: string) {
    const tasks = this.getSupportedEmbeds(noteFile).map((embed) => async () => {
      const embedFile = this.getEmbedFile(embed, noteFile);
      let markdown = null;

      if (embedFile) {
        if (!this.alreadyProcessed(embed, fileContent)) {
          const binary = await this.app.vault.readBinary(embedFile);
          const buffer = Buffer.from(new Uint8Array(binary));
          markdown = await withCancellation(this.api.processOcr(buffer), () =>
            this.plugin.statusManager.isCanceling(),
          );
        }
      } else {
        console.warn(`Couldn't find file for attachment ${embed.original}`);
      }

      return [embed.original, markdown] as const;
    });

    // Batch to avoid rate limiting
    const results = await batchPromises(tasks, 5);

    return new Map(await Promise.all(results));
  }

  private async insertCallouts(
    embedsToMarkdown: Map<string, string | null>,
    originalFileContent: string,
    file: TFile,
  ) {
    const embeds = this.getSupportedEmbeds(file);

    await this.app.vault.process(file, (data) => {
      let newContent = data;
      if (data !== originalFileContent) {
        const warning = `File changed during processing, skipping (${file.path})`;
        console.warn(warning);
        new Notice(warning);
        return data;
      }

      // Insert in reverse order to avoid position changes during edits
      for (const embed of embeds.reverse()) {
        const markdown = embedsToMarkdown.get(embed.original);

        if (!markdown) {
          continue;
        }

        if (this.embedMoved(embed, newContent)) {
          console.warn(
            `Embed ${embed.original} moved during processing, skipping`,
          );
          continue;
        }

        if (markdown) {
          const newCallback = this.formatToInsert(markdown, embed, newContent);
          newContent = insertAtPosition(
            newContent,
            newCallback,
            embed.position.end.offset,
          );
        }
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

  private formatToInsert(
    markdown: string,
    embed: EmbedCache,
    fileContent: string,
  ) {
    const embedStart = embed.position.start.offset;

    // Get contents of line before embed
    const lastNewline = fileContent.lastIndexOf("\n", embedStart);
    const startOfLine = lastNewline === -1 ? 0 : lastNewline + 1;
    const lineBeforeEmbed = fileContent.slice(startOfLine, embedStart);

    // Find initial whitespace and `>` characters
    const quotePrefix = lineBeforeEmbed.match(/^[\s>]*/)?.[0] ?? "";

    const withoutPrefix = [
      "",
      `> ${CALLOUT_HEADER}`,
      markdown.replace(/^/gm, `> `),
    ].join(EOL);

    // Add existing prefix to all lines. This will properly format the new
    // Markdown, even when used within nested callouts.
    return `${EOL}${withoutPrefix.replace(/^/gm, quotePrefix)}`;
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

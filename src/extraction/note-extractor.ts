import OcrExtractorPlugin from "../../main";
import type { EmbedCache, FrontmatterLinkCache } from "obsidian";
import { App, TFile } from "obsidian";
import { limitAsync } from "es-toolkit";
import { FatalError } from "../engines/ocr-engine";
import { OcrEngineManager } from "../engines/ocr-engine-manager";
import { StatusManager } from "../ui/status-manager";
import { ReportStore } from "../reporting/report-store";
import { PendingResult, PendingResults } from "../editing/plan";
import { insertWhenSettled } from "../editing/settle";
import type { InsertResult } from "../editing/insert-result";
import type { NoteSnapshot } from "../reading/note-snapshot";
import { readNoteSnapshot } from "../reading/note-snapshot";
import { StaleCache } from "../reading/stale-cache";
import { logError } from "../utils/logging";
import {
  attachmentPath,
  isDeleted,
  isObsidianNative,
  resolveLinkedFile,
} from "../utils/file";
import { recordResults, ReferenceResult } from "./record-results";
import { embedsToExtract } from "./embeds";
import { propertyLinksToExtract } from "./property-links";

type EmbedOrPropertyLink = EmbedCache | FrontmatterLinkCache;

export class NoteExtractor {
  private readonly app: App;
  private readonly store: ReportStore;
  private readonly statusManager: StatusManager;
  private readonly engineManager: OcrEngineManager;
  private readonly staleCache: StaleCache;
  private readonly propertiesToExtractFrom: readonly string[];

  constructor(plugin: OcrExtractorPlugin) {
    this.app = plugin.app;
    this.store = plugin.reportStore;
    this.statusManager = plugin.statusManager;
    this.engineManager = plugin.engineManager;
    this.staleCache = plugin.staleCache;
    this.propertiesToExtractFrom = plugin.settings.propertiesToExtractFrom;
  }

  async process(noteFile: TFile) {
    if (isDeleted(this.app, noteFile)) return;

    let snapshot: NoteSnapshot | null;
    try {
      snapshot = await readNoteSnapshot(
        this.app,
        this.staleCache,
        noteFile,
        this.statusManager.getSignal(),
      );
    } catch (error) {
      if (isDeleted(this.app, noteFile)) return;
      throw error;
    }
    if (!snapshot) return;

    const { referenceResults, pendingResults } =
      await this.extractTextFromReferences(noteFile, snapshot);

    let insertResult: InsertResult;
    try {
      insertResult = await insertWhenSettled(
        this.app,
        noteFile,
        this.propertiesToExtractFrom,
        pendingResults,
        this.statusManager.getSignal(),
      );
    } catch (error) {
      if (isDeleted(this.app, noteFile)) return;
      throw error;
    }

    recordResults(this.store, noteFile.path, referenceResults, insertResult);
  }

  private async extractTextFromReferences(
    noteFile: TFile,
    snapshot: NoteSnapshot,
  ) {
    // In the order they appear in the note (properties before embeds)
    const referencesToExtract: EmbedOrPropertyLink[] = [
      ...propertyLinksToExtract(
        this.app,
        noteFile.path,
        snapshot,
        this.propertiesToExtractFrom,
      ),
      ...embedsToExtract(
        snapshot.content,
        snapshot.cache.embeds,
        snapshot.cache.links,
      ),
    ];

    // Limit concurrency
    const processReference = limitAsync(
      (reference: EmbedOrPropertyLink) =>
        this.processReference(noteFile, reference),
      5,
    );

    const processed = await Promise.all(
      referencesToExtract.map((reference) => processReference(reference)),
    );

    // References finish in arbitrary order, so get order from the note, not the
    // results
    const referenceResults: ReferenceResult[] = [];
    const pendingResults: PendingResults = new Map();
    processed.forEach((processedReference, index) => {
      if (!processedReference) return;
      const { result, pendingResult } = processedReference;
      referenceResults.push({ ...result, order: index });
      if (pendingResult) pendingResults.set(result.markup, pendingResult);
    });

    return { referenceResults, pendingResults };
  }

  private async processReference(
    noteFile: TFile,
    reference: EmbedOrPropertyLink,
  ): Promise<{
    result: Omit<ReferenceResult, "order">;
    pendingResult?: PendingResult;
  } | null> {
    const signal = this.statusManager.getSignal();
    if (signal.aborted) return null;

    const { link, original: markup } = reference;
    let file: TFile | null = null;

    try {
      file = resolveLinkedFile(this.app, link, noteFile.path);
      if (!file) {
        return {
          result: {
            path: attachmentPath(file, link),
            markup,
            engineResult: { status: "failed", reason: "fileNotFound" },
          },
        };
      }

      if (isObsidianNative(file)) {
        return null;
      }

      const engineResult = await this.engineManager.extract(file, signal);
      if (engineResult.status === "canceled" || signal.aborted) {
        return null;
      }

      const result = { path: file.path, markup, engineResult };
      if (engineResult.status !== "extracted") return { result };

      const pendingResult: PendingResult =
        "key" in reference
          ? {
              kind: "propertyLink",
              markdown: engineResult.markdown,
              path: file.path,
              attachmentLink: this.app.fileManager.generateMarkdownLink(
                file,
                noteFile.path,
              ),
            }
          : { kind: "embed", markdown: engineResult.markdown };
      return { result, pendingResult };
    } catch (error) {
      if (error instanceof FatalError || signal.aborted) {
        throw error;
      }

      logError("Unexpected error extracting an attachment:", error);
      return {
        result: {
          path: attachmentPath(file, link),
          markup,
          engineResult: { status: "failed", reason: "unexpected" },
        },
      };
    }
  }
}

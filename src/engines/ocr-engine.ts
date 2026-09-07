import { fileTypeFromBuffer } from "file-type";
import type { SecretStorage } from "obsidian";
import { PluginSettings } from "../settings";
import {
  getPdfTextContent,
  isPdf,
  PasswordProtectedPdfError,
  PdfReadError,
} from "../utils/pdf";
import { raceAbort } from "../utils/async";
import { normalizeNewlines } from "../utils/markdown";
import type OcrExtractorPlugin from "../../main";
import type { OcrEngineSettings } from "./ocr-engine-settings";
import type { FailureReason, ResultReason, SkipReason } from "../result-reason";

export type OcrEngineClass = (new (
  ...args: ConstructorParameters<typeof OcrEngine>
) => OcrEngine) & {
  /** The label shown on the setting tab */
  getLabel(): string;
  getSettings(plugin: OcrExtractorPlugin): OcrEngineSettings | null;
};

/**
 * An error that stops the whole run, because it's a problem that would fail
 * every remaining attachment with the same error. Its `message` is shown
 * directly to the user.
 */
export class FatalError extends Error {}

/** Errors raised in the engine layer and converted into result values */
abstract class AttachmentError<Reason extends ResultReason> extends Error {
  constructor(
    readonly reason: Reason,
    /** Extra detail for the console and copied report (not translated) */
    readonly detail?: string,
  ) {
    super(detail ? `${reason}: ${detail}` : reason);
  }
}

/** There is nothing wrong with the file, but there is nothing to extract */
export class AttachmentSkippedError extends AttachmentError<SkipReason> {}

/** Extraction failed on a file that likely has text to extract */
export class AttachmentFailedError extends AttachmentError<FailureReason> {}

export interface ExtractPagesOptions {
  /** Detected from the file's contents, not its extension */
  mimeType: string;
  filename: string;
  signal: AbortSignal;
}

/** The result of processing one attachment */
export type EngineResult =
  | { status: "extracted"; markdown: string }
  | { status: "skipped"; reason: SkipReason; detail?: string }
  | { status: "failed"; reason: FailureReason; detail?: string }
  | { status: "canceled" };

const PAGE_SEPARATOR = "\n\n---\n\n";

export abstract class OcrEngine {
  constructor(
    protected settings: PluginSettings,
    protected secretStorage: SecretStorage,
  ) {}

  /**
   * Main entry point called by the plugin to extract text. Subclasses should
   * not override this (they should implement `extractPages()` instead).
   */
  async extract(
    data: Uint8Array,
    filename: string,
    signal: AbortSignal,
  ): Promise<EngineResult> {
    const fileType = await fileTypeFromBuffer(data);
    const mimeType = fileType?.mime;

    if (!mimeType || !this.isMimeTypeSupported(mimeType)) {
      return {
        status: "skipped",
        reason: "unsupportedFileType",
        detail: `MIME type ${mimeType ?? "unknown"}`,
      };
    }

    try {
      if (isPdf(mimeType) && this.settings.preferEmbeddedText) {
        const pages = await raceAbort(getPdfTextContent(data, signal), signal);
        if (pages === null) return { status: "canceled" };
        const markdown = this.joinPages(pages);
        if (markdown) return { status: "extracted", markdown };
      }

      const pages = await raceAbort(
        this.extractPages(data, { mimeType, filename, signal }),
        signal,
      );
      if (pages === null) return { status: "canceled" };

      const markdown = this.joinPages(pages);
      if (!markdown) return { status: "skipped", reason: "noTextFound" };
      return { status: "extracted", markdown };
    } catch (error) {
      if (signal.aborted) return { status: "canceled" };

      if (error instanceof PasswordProtectedPdfError) {
        return { status: "skipped", reason: "passwordProtectedPdf" };
      }
      if (error instanceof PdfReadError) {
        return {
          status: "failed",
          reason: "pdfUnreadable",
          detail: error.message,
        };
      }
      if (error instanceof AttachmentSkippedError) {
        return {
          status: "skipped",
          reason: error.reason,
          detail: error.detail,
        };
      }
      if (error instanceof AttachmentFailedError) {
        return { status: "failed", reason: error.reason, detail: error.detail };
      }

      // Only `FatalError` and unexpected exceptions re-throw
      throw error;
    }
  }

  /** Clean up any resources held by this engine. */
  async terminate() {}

  private joinPages(pages: string[]) {
    // Normalize here so all extracted text uses \n internally
    const nonEmpty = pages
      .map((page) => normalizeNewlines(page).trim())
      .filter((page) => page.length > 0);
    return nonEmpty.length > 0 ? nonEmpty.join(PAGE_SEPARATOR) : null;
  }

  /**
   * Whether this engine can handle the given MIME type. If false, the file
   * is skipped.
   */
  protected abstract isMimeTypeSupported(mimeType: string): boolean;

  /**
   * Extract text from the document and return it as an array of strings
   * (one per page). Throw `AttachmentSkippedError` or `AttachmentFailedError`
   * for a problem with this attachment, or `FatalError` to stop the run.
   */
  protected abstract extractPages(
    data: Uint8Array,
    options: ExtractPagesOptions,
  ): Promise<string[]>;
}

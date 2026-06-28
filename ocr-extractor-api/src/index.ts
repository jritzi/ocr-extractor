/**
 * Public API for the OCR Extractor Obsidian plugin
 *
 * Access it with {@link getOcrExtractorApi}.
 *
 * @packageDocumentation
 */

import type { App, TFile } from "obsidian";

export {
  type OcrError,
  type OcrErrorCode,
  isOcrError,
  ocrError,
} from "./errors.js";

/** The API version, independent of the plugin's release version */
// Auto-synced with package.json `version` by `pnpm version` (don't edit by hand)
export const OCR_EXTRACTOR_API_VERSION = "1.0.0";

/**
 * The result of a successful extraction
 *
 * @since 1.0.0
 */
export interface OcrExtractionResult {
  /** Extracted text (or `""` if the file was processed but contained no text) */
  text: string;
}

/** The Obsidian `App` with plugin registry (not present in public types) */
type AppWithPlugins = App & {
  plugins?: { plugins?: Record<string, { api?: OcrExtractorApi }> };
};

export interface OcrExtractorApi {
  /**
   * The API version (i.e. {@link OCR_EXTRACTOR_API_VERSION})
   *
   * @since 1.0.0
   */
  readonly version: string;

  /**
   * Run the user's configured OCR engine on an attachment and return the
   * extracted text. Does not modify any note.
   *
   * @param file - The attachment's `TFile`
   * @param options - Optional settings
   * @param options.signal - An optional `AbortSignal` to cancel the extraction
   * @returns An {@link OcrExtractionResult} with the extracted `text` (`""` if none found)
   * @throws An {@link OcrError} with an error `code` ({@link OcrErrorCode}), or
   *         an `AbortError` if canceled via `options.signal`
   * @since 1.0.0
   * @example
   * ```ts
   * const { text } = await api.extractText(file);
   * ```
   */
  extractText(
    file: TFile,
    options?: { signal?: AbortSignal },
  ): Promise<OcrExtractionResult>;
}

/**
 * Get the OCR Extractor API from the Obsidian `app`.
 *
 * @param app - The Obsidian app instance
 * @returns The API, or `undefined` if the plugin isn't installed or enabled
 * @since 1.0.0
 * @example
 * ```ts
 * const api = getOcrExtractorApi(app);
 * if (!api) return;
 * ```
 */
export function getOcrExtractorApi(app: App): OcrExtractorApi | undefined {
  const plugins = (app as AppWithPlugins).plugins?.plugins;
  return plugins?.["ocr-extractor"]?.api;
}

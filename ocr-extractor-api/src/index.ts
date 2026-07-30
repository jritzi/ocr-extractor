/**
 * Public API for the OCR Extractor Obsidian plugin
 *
 * Access it with {@link getOcrExtractorApi}.
 *
 * @packageDocumentation
 */

import type { App, TFile } from "obsidian";

/**
 * The API version
 *
 * @since 1.0.0
 */
export const OCR_EXTRACTOR_API_VERSION = "1.1.0";

/**
 * The result of an {@link OcrExtractorApi.extract} call:
 *
 * - `"extracted"`: text was extracted from the file
 * - `"no-text"`: the file was processed but contained no text
 * - `"unsupported"`: the OCR engine can't process this file
 *
 * @since 1.1.0
 */
export type OcrResult =
  | { status: "extracted"; text: string }
  | { status: "no-text" }
  | { status: "unsupported" };

/**
 * The result of an {@link OcrExtractorApi.extractText} call
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

/**
 * The OCR Extractor plugin's public API, obtained via {@link getOcrExtractorApi}
 *
 * @since 1.0.0
 */
export interface OcrExtractorApi {
  /**
   * The API version (i.e. {@link OCR_EXTRACTOR_API_VERSION})
   *
   * @since 1.0.0
   */
  readonly version: string;

  /**
   * Run the user's configured OCR engine on an attachment. Does not modify
   * any note.
   *
   * Returns an {@link OcrResult} (extraction failures throw an
   * {@link OcrError} instead).
   *
   * @param file - The attachment's `TFile`
   * @param options - Optional settings
   * @param options.signal - An optional `AbortSignal` to cancel the extraction
   * @returns An {@link OcrResult} describing the result
   * @throws An {@link OcrError} with an error `code` ({@link OcrErrorCode}),
   *         or an `AbortError` if canceled via `options.signal`
   * @since 1.1.0
   * @example
   * ```ts
   * const result = await api.extract(file);
   * if (result.status === "extracted") {
   *   console.log(result.text);
   * }
   * ```
   */
  extract?(file: TFile, options?: { signal?: AbortSignal }): Promise<OcrResult>;

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
   * @deprecated Use {@link OcrExtractorApi.extract} instead
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

export {
  type OcrError,
  type OcrErrorCode,
  isOcrError,
  ocrError,
} from "./errors.js";

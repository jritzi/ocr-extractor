import { TFile } from "obsidian";
import {
  OCR_EXTRACTOR_API_VERSION,
  ocrError,
  type OcrExtractorApi,
} from "ocr-extractor-api";
import type OcrExtractorPlugin from "../main";

export function createApi(plugin: OcrExtractorPlugin): OcrExtractorApi {
  return {
    version: OCR_EXTRACTOR_API_VERSION,

    async extractText(file: TFile, options?: { signal?: AbortSignal }) {
      const signal = options?.signal ?? new AbortController().signal;
      signal.throwIfAborted();

      let text: string | null;
      try {
        text = await plugin.extractor.processOcr(file, signal);
      } catch (error) {
        // Avoid mislabeling an abort as `extraction-failed`
        signal.throwIfAborted();

        const message = error instanceof Error ? error.message : String(error);
        throw ocrError("extraction-failed", message, { cause: error });
      }

      signal.throwIfAborted();
      if (text === null) {
        throw ocrError("unsupported-file");
      }
      return { text };
    },
  };
}

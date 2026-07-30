import { TFile } from "obsidian";
import {
  OCR_EXTRACTOR_API_VERSION,
  ocrError,
  type OcrExtractorApi,
  type OcrResult,
} from "ocr-extractor-api";
import type OcrExtractorPlugin from "../main";
import { EngineResult } from "./engines/ocr-engine";
import { describeReason } from "./result-reason";
import { assert } from "./utils/assert";

export function createApi(plugin: OcrExtractorPlugin): OcrExtractorApi {
  async function extract(
    file: TFile,
    options?: { signal?: AbortSignal },
  ): Promise<OcrResult> {
    const signal = options?.signal ?? new AbortController().signal;
    signal.throwIfAborted();

    let result: EngineResult;
    try {
      result = await plugin.extractor.processOcr(file, signal);
    } catch (error) {
      // Avoid mislabeling an abort as `extraction-failed`
      signal.throwIfAborted();

      throw ocrError("extraction-failed", String(error), { cause: error });
    }

    signal.throwIfAborted();
    assert(result.status !== "canceled", "Already threw if signal aborted");

    switch (result.status) {
      case "extracted":
        return { status: "extracted", text: result.markdown };
      case "skipped":
        return result.reason === "noTextFound"
          ? { status: "no-text" }
          : { status: "unsupported" };
      case "failed": {
        const reasonText = describeReason(result.reason);
        const message = result.detail
          ? `${reasonText} (${result.detail})`
          : reasonText;
        throw ocrError("extraction-failed", message);
      }
    }
  }

  async function extractText(file: TFile, options?: { signal?: AbortSignal }) {
    const result = await extract(file, options);

    switch (result.status) {
      case "extracted":
        return { text: result.text };
      case "no-text":
        return { text: "" };
      case "unsupported":
        throw ocrError("unsupported-file");
    }
  }

  return {
    version: OCR_EXTRACTOR_API_VERSION,
    extract,
    extractText,
  };
}

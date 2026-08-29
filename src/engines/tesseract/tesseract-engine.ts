import { createWorker, Worker } from "tesseract.js";
import pLimit from "p-limit";
import {
  AttachmentFailedError,
  type ExtractPagesOptions,
  FatalError,
  OcrEngine,
} from "../ocr-engine";
import { toDataUrl } from "../../utils/encoding";
import { resizeImage } from "../../utils/image";
import { convertPdfToImages, isPdf } from "../../utils/pdf";
import { t } from "../../i18n";
import { raceAbort } from "../../utils/async";

// Upscale small images so text is legible, for optimal OCR
const TESSERACT_MIN_DIMENSION = 2000;

// Higher doesn't improve accuracy (and larger canvases can fail on iOS)
const TESSERACT_MAX_DIMENSION = 3000;

export class TesseractEngine extends OcrEngine {
  // A shared promise so concurrent callers create at most one worker
  private workerPromise: Promise<Worker> | null = null;

  // Workers can't safely run multiple recognize calls in parallel, so
  // serialize them
  private limit = pLimit(1);

  static getLabel() {
    return t("engines.tesseract");
  }

  static getSettingsSection() {
    return null;
  }

  async terminate() {
    // Serialize with recognize calls to avoid terminating a worker mid-run
    await this.limit(async () => {
      const worker = await this.workerPromise?.catch(() => null);
      this.workerPromise = null;
      await worker?.terminate();
    });
  }

  protected isMimeTypeSupported(mimeType: string) {
    return isPdf(mimeType) || mimeType.startsWith("image/");
  }

  protected async extractPages(
    data: Uint8Array,
    { mimeType, signal }: ExtractPagesOptions,
  ) {
    if (isPdf(mimeType)) {
      return this.extractPdfPages(data, signal);
    }

    let dataUrl: string;
    try {
      dataUrl = await resizeImage(data, mimeType, {
        minDimension: TESSERACT_MIN_DIMENSION,
        maxDimension: TESSERACT_MAX_DIMENSION,
      });
    } catch (error) {
      throw new AttachmentFailedError("imageUnreadable", String(error));
    }
    const text = await this.recognize(dataUrl);
    return [text];
  }

  private async getWorker() {
    if (this.workerPromise) return this.workerPromise;

    try {
      this.workerPromise = createWorker("eng");
      return await this.workerPromise;
    } catch (error) {
      // Don't cache a failed attempt, so the next call can retry
      this.workerPromise = null;
      throw new FatalError(t("errors.tesseractLoadFailed"), { cause: error });
    }
  }

  private recognize(dataUrl: string) {
    return this.limit(async () => {
      const worker = await this.getWorker();
      try {
        const result = await worker.recognize(dataUrl);
        return result.data.text;
      } catch (error) {
        throw new AttachmentFailedError("imageUnreadable", String(error));
      }
    });
  }

  private async extractPdfPages(data: Uint8Array, signal: AbortSignal) {
    const images = await convertPdfToImages(data, TESSERACT_MAX_DIMENSION);
    const pages: string[] = [];

    for (const image of images) {
      if (signal.aborted) break;

      const text = await raceAbort(
        this.recognize(toDataUrl(image, "image/png")),
        signal,
      );
      if (text === null) break;

      pages.push(text);
    }

    return pages;
  }
}

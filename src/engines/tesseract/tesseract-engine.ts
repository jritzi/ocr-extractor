import { createWorker, Worker } from "tesseract.js";
import { OcrEngine } from "../ocr-engine";
import { toDataUrl } from "../../utils/encoding";
import { resizeImage } from "../../utils/image";
import { convertPdfToImages, isPdf } from "../../utils/pdf";
import { warnSkipped } from "../../utils/logging";
import { t } from "../../i18n";
import { raceAbort } from "../../utils/async";

// Upscale small images so text is legible, for optimal OCR
const TESSERACT_MIN_DIMENSION = 2000;

// Higher doesn't improve accuracy (and larger canvases can fail on iOS)
const TESSERACT_MAX_DIMENSION = 3000;

export class TesseractEngine extends OcrEngine {
  private worker: Worker | null = null;

  static getLabel() {
    return t("engines.tesseract");
  }

  static getSettingsSection() {
    return null;
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  protected isMimeTypeSupported(mimeType: string) {
    return isPdf(mimeType) || mimeType.startsWith("image/");
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
    signal: AbortSignal,
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
    } catch {
      warnSkipped(filename, "could not resize image");
      return null;
    }
    const text = await this.recognize(dataUrl);
    return [text];
  }

  private async recognize(dataUrl: string) {
    if (!this.worker) {
      this.worker = await createWorker("eng");
    }
    const result = await this.worker.recognize(dataUrl);
    return result.data.text;
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

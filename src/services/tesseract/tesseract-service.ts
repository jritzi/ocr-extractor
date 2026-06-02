import { createWorker, Worker } from "tesseract.js";
import { OcrService } from "../ocr-service";
import { toDataUrl } from "../../utils/encoding";
import { resizeImage } from "../../utils/image";
import { convertPdfToImages, isPdf } from "../../utils/pdf";
import { t } from "../../i18n";
import { raceAbort } from "../../utils/async";

// Upscale small images so text is legible, for optimal OCR
const TESSERACT_MIN_DIMENSION = 2000;

// Higher doesn't improve accuracy (and larger canvases can fail on iOS)
const TESSERACT_MAX_DIMENSION = 3000;

export class TesseractService extends OcrService {
  private worker: Worker | null = null;

  static getLabel() {
    return t("services.tesseract");
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
    _filename: string,
    signal: AbortSignal,
  ) {
    if (isPdf(mimeType)) {
      return this.extractPdfPages(data, signal);
    }

    const dataUrl = await resizeImage(data, mimeType, {
      minDimension: TESSERACT_MIN_DIMENSION,
      maxDimension: TESSERACT_MAX_DIMENSION,
    });
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

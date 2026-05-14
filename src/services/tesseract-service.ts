import { createWorker, Worker } from "tesseract.js";
import { OcrService } from "./ocr-service";
import { toDataUrl } from "../utils/encoding";
import { convertPdfToImages, isPdf } from "../utils/pdf";
import { t } from "../i18n";
import { raceAbort } from "../utils/async";

export class TesseractService extends OcrService {
  private worker: Worker | null = null;

  static getLabel() {
    return t("services.tesseract");
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

    const text = await this.recognize(toDataUrl(data, mimeType));
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
    const images = await convertPdfToImages(data);
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

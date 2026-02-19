import { createWorker, Worker } from "tesseract.js";
import { OcrService } from "./ocr-service";
import { toDataUrl } from "../utils/encoding";
import { convertPdfToImages, isPdf } from "../utils/pdf";
import { t } from "../i18n";

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
  ) {
    if (isPdf(mimeType)) {
      return this.extractPdfPages(data);
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

  private async extractPdfPages(data: Uint8Array) {
    const images = await convertPdfToImages(data);
    const pages: string[] = [];

    for (const image of images) {
      pages.push(await this.recognize(toDataUrl(image, "image/png")));
    }

    return pages;
  }
}

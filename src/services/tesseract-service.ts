import { createWorker, Worker } from "tesseract.js";
import { OcrService } from "./ocr-service";
import { toDataUrl } from "../utils/encoding";
import { convertPdfToImages } from "../utils/pdf";

export class TesseractService extends OcrService {
  static readonly label = "Tesseract";

  private worker: Worker | null = null;

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  protected isMimeTypeSupported(mimeType: string) {
    return mimeType === "application/pdf" || mimeType.startsWith("image/");
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    _filename: string,
  ) {
    if (mimeType === "application/pdf") {
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

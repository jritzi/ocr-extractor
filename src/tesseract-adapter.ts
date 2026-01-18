import { createWorker, Worker } from "tesseract.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs";
import { OcrAdapter } from "./ocr-adapter";

const workerBlob = new Blob([pdfjsWorker], { type: "application/javascript" });
GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);

export class TesseractAdapter extends OcrAdapter {
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

    const text = await this.recognize(this.toDataUrl(data, mimeType));
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
    const pdf = await getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableAutoFetch: true,
    }).promise;

    try {
      const pages: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const pdfPage = await pdf.getPage(pageNum);

        try {
          // Set higher scale for better OCR
          const viewport = pdfPage.getViewport({ scale: 2.0 });

          const canvas = document.createElement("canvas");
          const canvasContext = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await pdfPage.render({ canvasContext, viewport, canvas }).promise;

          const dataUrl = canvas.toDataURL("image/png");
          pages.push(await this.recognize(dataUrl));
        } finally {
          pdfPage.cleanup();
        }
      }

      return pages;
    } finally {
      await pdf.destroy();
    }
  }
}

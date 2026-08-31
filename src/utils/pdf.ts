// Use legacy build to support older Chrome/Electron versions
import {
  getDocument,
  GlobalWorkerOptions,
  PasswordException,
  type PDFPageProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs";
import { canvasToPng } from "./image";

GlobalWorkerOptions.workerSrc = URL.createObjectURL(
  new Blob([pdfjsWorker], { type: "application/javascript" }),
);

export class PdfReadError extends Error {}
export class PasswordProtectedPdfError extends PdfReadError {}

export function isPdf(mimeType: string) {
  return mimeType === "application/pdf";
}

/**
 * Returns text from a PDF's text layer as an array of one string per page.
 */
export async function getPdfTextContent(data: Uint8Array, signal: AbortSignal) {
  return mapPdfPages(data, signal, async (page) => {
    const textContent = await page.getTextContent();
    return textContent.items
      .filter((item): item is TextItem => "str" in item)
      .map((item) => item.str + (item.hasEOL ? "\n" : ""))
      .join("");
  });
}

/**
 * Renders each PDF page to a PNG, scaling so the longest side fits within
 * `maxDimension`.
 */
export async function convertPdfToImages(
  data: Uint8Array,
  maxDimension: number,
  signal: AbortSignal,
) {
  return mapPdfPages(data, signal, async (pdfPage) => {
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const longestBaseSide = Math.max(baseViewport.width, baseViewport.height);
    const scale = maxDimension / longestBaseSide;
    const viewport = pdfPage.getViewport({ scale });

    const canvas = createEl("canvas");
    try {
      const canvasContext = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext, viewport, canvas }).promise;
      return await canvasToPng(canvas);
    } finally {
      canvas.width = 0; // free the pixel buffer
    }
  });
}

/**
 * Runs `callback` on each page and returns the collected results (stopping
 * early if `signal` is aborted). Any failure is wrapped in a `PdfReadError`.
 */
async function mapPdfPages<T>(
  data: Uint8Array,
  signal: AbortSignal,
  callback: (page: PDFPageProxy) => Promise<T>,
) {
  try {
    const loadingTask = getDocument({
      // Copy data before passing to pdfjs (it detaches the original, preventing
      // the caller from using `data` later)
      data: new Uint8Array(data),
      useWorkerFetch: false,
      disableAutoFetch: true,
    });

    try {
      const pdf = await loadingTask.promise;
      const results: T[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (signal.aborted) break;

        const pdfPage = await pdf.getPage(pageNum);

        try {
          results.push(await callback(pdfPage));
        } finally {
          pdfPage.cleanup();
        }
      }

      return results;
    } finally {
      await loadingTask.destroy();
    }
  } catch (error) {
    const message = String(error);
    if (error instanceof PasswordException) {
      throw new PasswordProtectedPdfError(message, { cause: error });
    }
    throw new PdfReadError(message, { cause: error });
  }
}

import type { PDFPageProxy } from "pdfjs-dist";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs";

const workerBlob = new Blob([pdfjsWorker], { type: "application/javascript" });
GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);

export function isPdf(mimeType: string) {
  return mimeType === "application/pdf";
}

/**
 * Returns text from a PDF's text layer as an array of one string per page.
 */
export async function getPdfTextContent(data: Uint8Array): Promise<string[]> {
  return mapPdfPages(data, async (page) => {
    const textContent = await page.getTextContent();
    return textContent.items
      .filter((item): item is TextItem => "str" in item)
      .map((item) => item.str + (item.hasEOL ? "\n" : ""))
      .join("");
  });
}

export async function convertPdfToImages(data: Uint8Array) {
  return mapPdfPages(data, async (pdfPage) => {
    const viewport = pdfPage.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    const canvasContext = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pdfPage.render({ canvasContext, viewport, canvas }).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );
    return new Uint8Array(await blob.arrayBuffer());
  });
}

async function mapPdfPages<T>(
  data: Uint8Array,
  callback: (page: PDFPageProxy) => Promise<T>,
) {
  const pdf = await getDocument({
    // Copy data before passing to pdfjs (it detaches the original, preventing
    // the caller from using `data` later)
    data: new Uint8Array(data),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableAutoFetch: true,
  }).promise;

  try {
    const results: T[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const pdfPage = await pdf.getPage(pageNum);

      try {
        results.push(await callback(pdfPage));
      } finally {
        pdfPage.cleanup();
      }
    }

    return results;
  } finally {
    await pdf.destroy();
  }
}

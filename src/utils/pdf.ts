import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs";

const workerBlob = new Blob([pdfjsWorker], { type: "application/javascript" });
GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);

export async function convertPdfToImages(data: Uint8Array) {
  const pdf = await getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableAutoFetch: true,
  }).promise;

  try {
    const images: Uint8Array[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const pdfPage = await pdf.getPage(pageNum);

      try {
        const viewport = pdfPage.getViewport({ scale: 2.0 });

        const canvas = document.createElement("canvas");
        const canvasContext = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({ canvasContext, viewport, canvas }).promise;

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png"),
        );
        images.push(new Uint8Array(await blob.arrayBuffer()));
      } finally {
        pdfPage.cleanup();
      }
    }

    return images;
  } finally {
    await pdf.destroy();
  }
}

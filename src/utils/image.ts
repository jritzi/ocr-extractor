import { toDataUrl } from "./encoding";

export const TEST_IMAGE_TEXT = "OCR test";

/**
 * Resizes an image so its longest side falls within the given dimensions,
 * preserving aspect ratio, and returns it as a data URL. Images already in
 * range are returned as-is. Resized images are re-encoded as lossless PNG.
 */
export async function resizeImage(
  data: Uint8Array,
  mimeType: string,
  {
    minDimension,
    maxDimension,
  }: { minDimension?: number; maxDimension?: number },
) {
  const bitmap = await createImageBitmap(
    new Blob([data as BlobPart], { type: mimeType }),
    // Apply EXIF orientation
    { imageOrientation: "from-image" },
  );

  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);

    let scale = 1;
    if (maxDimension && longestSide > maxDimension) {
      scale = maxDimension / longestSide;
    } else if (minDimension && longestSide < minDimension) {
      scale = minDimension / longestSide;
    }

    if (scale === 1) return toDataUrl(data, mimeType);

    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    let source: HTMLCanvasElement | undefined;
    let width = bitmap.width;
    let height = bitmap.height;

    // Halve repeatedly to avoid aliasing on large reductions
    while (width > targetWidth * 2 && height > targetHeight * 2) {
      const previous = source;
      width = Math.round(width / 2);
      height = Math.round(height / 2);
      source = drawScaled(previous ?? bitmap, width, height);
      if (previous) previous.width = 0; // free the pixel buffer
    }

    const canvas = drawScaled(source ?? bitmap, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL("image/png");
    canvas.width = 0; // free the pixel buffer
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

export async function canvasToPng(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
      "image/png",
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

function drawScaled(
  source: ImageBitmap | HTMLCanvasElement,
  width: number,
  height: number,
) {
  const canvas = createEl("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);

  return canvas;
}

export async function createTestImage() {
  const canvas = createEl("canvas");
  canvas.width = 200;
  canvas.height = 50;

  const context = canvas.getContext("2d")!;
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "black";
  context.font = "24px sans-serif";
  context.fillText(TEST_IMAGE_TEXT, 10, 34);

  return canvasToPng(canvas);
}

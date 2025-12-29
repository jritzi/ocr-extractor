import { Mistral } from "@mistralai/mistralai";
import { fileTypeFromBuffer } from "file-type";
import { OCRRequest } from "@mistralai/mistralai/models/components";
import { SDKError } from "@mistralai/mistralai/models/errors";
import { OcrExtractorError } from "../main";
import { uint8ArrayToBase64, withRetries } from "./utils";

const UNSUPPORTED_MIME_TYPES = ["application/xml"];

export class MistralApi {
  private mistral: Mistral;

  constructor(apiKey: string) {
    this.mistral = new Mistral({ apiKey });
  }

  async processOcr(data: Uint8Array) {
    const fileType = await fileTypeFromBuffer(data);
    const mimeType = fileType?.mime;

    if (!mimeType || UNSUPPORTED_MIME_TYPES.includes(mimeType)) {
      console.warn("Skipping OCR for file with unsupported MIME type");
      return null;
    }

    const isImage = mimeType && mimeType.startsWith("image/");
    const url = `data:${mimeType};base64,` + uint8ArrayToBase64(data);

    let document: OCRRequest["document"];
    if (isImage) {
      document = { type: "image_url", imageUrl: url };
    } else {
      document = { type: "document_url", documentUrl: url };
    }

    try {
      const ocrResponse = await withRetries(() =>
        this.mistral.ocr.process({
          model: "mistral-ocr-latest",
          document,
          // Do not extract images
          imageLimit: 0,
          imageMinSize: 0,
          includeImageBase64: false,
        }),
      );

      return ocrResponse.pages
        .map((page) => page.markdown)
        .join("\n\n---\n\n");
    } catch (error: unknown) {
      if (error instanceof SDKError && error.statusCode === 401) {
        throw new OcrExtractorError("Unauthorized, check your API key", {
          cause: error,
        });
      }

      throw error;
    }
  }
}

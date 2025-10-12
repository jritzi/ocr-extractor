import { Mistral } from "@mistralai/mistralai";
import { EOL } from "os";
import { fileTypeFromBuffer } from "file-type";
import { OCRRequest } from "@mistralai/mistralai/models/components";
import { SDKError } from "@mistralai/mistralai/models/errors";
import { OcrExtractorError } from "../main";

const UNSUPPORTED_MIME_TYPES = ["application/xml"];

export class MistralApi {
  private mistral: Mistral;

  constructor(apiKey: string) {
    this.mistral = new Mistral({ apiKey });
  }

  async processOcr(buffer: Buffer) {
    const fileType = await fileTypeFromBuffer(buffer);
    const mimeType = fileType?.mime;

    if (!mimeType || UNSUPPORTED_MIME_TYPES.includes(mimeType)) {
      console.warn("Skipping OCR for file with unsupported MIME type");
      return null;
    }

    const isImage = mimeType && mimeType.startsWith("image/");
    const url = `data:${mimeType};base64,` + buffer.toString("base64");

    let document: OCRRequest["document"];
    if (isImage) {
      document = { type: "image_url", imageUrl: url };
    } else {
      document = { type: "document_url", documentUrl: url };
    }

    try {
      const ocrResponse = await this.mistral.ocr.process({
        model: "mistral-ocr-latest",
        document,
        // Do not extract images
        imageLimit: 0,
        imageMinSize: 0,
        includeImageBase64: false,
      });

      return ocrResponse.pages
        .map((page) => page.markdown)
        .join(`${EOL}${EOL}---${EOL}${EOL}`);
    } catch (e: unknown) {
      if (e instanceof SDKError && e.statusCode === 401) {
        throw new OcrExtractorError("Error: Unauthorized, check your API key", {
          cause: e,
        });
      }

      throw e;
    }
  }
}

import { Mistral } from "@mistralai/mistralai";
import { OCRRequest } from "@mistralai/mistralai/models/components";
import { MistralError } from "@mistralai/mistralai/models/errors/mistralerror";
import { OcrExtractorError } from "../main";
import { warnSkipped, withRetries } from "./utils";
import { OcrAdapter } from "./ocr-adapter";
import { OcrExtractorPluginSettings } from "./setting-tab";

export class MistralAdapter extends OcrAdapter {
  static readonly label = "Mistral OCR";

  private mistral: Mistral;

  constructor(settings: OcrExtractorPluginSettings) {
    super(settings);
    this.mistral = new Mistral({ apiKey: settings.mistralApiKey });
  }

  protected isMimeTypeSupported(mimeType: string) {
    return mimeType !== "application/xml";
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
  ) {
    const isImage = mimeType.startsWith("image/");
    const url = this.toDataUrl(data, mimeType);

    let document: OCRRequest["document"];
    if (isImage) {
      document = { type: "image_url", imageUrl: url };
    } else {
      document = { type: "document_url", documentUrl: url };
    }

    try {
      const ocrResponse = await withRetries(
        () =>
          this.mistral.ocr.process({
            model: "mistral-ocr-latest",
            document,
            // Do not extract images
            imageLimit: 0,
            imageMinSize: 0,
            includeImageBase64: false,
          }),
        // Retry on 5xx server errors, not 4xx client errors
        (error) => !(error instanceof MistralError) || error.statusCode >= 500,
      );

      return ocrResponse.pages.map((page) => page.markdown);
    } catch (error: unknown) {
      if (error instanceof MistralError) {
        if (error.statusCode === 401) {
          throw new OcrExtractorError("Unauthorized, check your API key", {
            cause: error,
          });
        }

        if (error.statusCode === 400 || error.statusCode === 422) {
          warnSkipped(filename, "file type not supported by Mistral OCR");
          return null;
        }
      }

      throw error;
    }
  }
}

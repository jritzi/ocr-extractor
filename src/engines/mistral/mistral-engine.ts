import { Mistral } from "@mistralai/mistralai";
import {
  ConnectionError,
  RequestTimeoutError,
} from "@mistralai/mistralai/models/errors/httpclienterrors";
import { MistralError } from "@mistralai/mistralai/models/errors/mistralerror";
import {
  AttachmentFailedError,
  AttachmentSkippedError,
  type ExtractPagesOptions,
  FatalError,
  OcrEngine,
} from "../ocr-engine";
import { throwIfFatalHttpStatus } from "../http-error";
import { MistralSettingsSection } from "./mistral-settings";
import { toDataUrl } from "../../utils/encoding";
import { t } from "../../i18n";

const BACKOFF = {
  initialInterval: 500,
  maxInterval: 10000,
  exponent: 1.5,
  maxElapsedTime: 10000,
};

export class MistralEngine extends OcrEngine {
  static getLabel() {
    return t("engines.mistralOcr");
  }

  static getSettingsSection() {
    return MistralSettingsSection;
  }

  protected isMimeTypeSupported(mimeType: string) {
    return mimeType !== "application/xml";
  }

  protected async extractPages(
    data: Uint8Array,
    { mimeType, signal }: ExtractPagesOptions,
  ) {
    const apiKey =
      this.secretStorage.getSecret(this.settings.mistralSecret) ?? "";
    const mistral = new Mistral({ apiKey });

    const isImage = mimeType.startsWith("image/");
    const url = toDataUrl(data, mimeType);

    const document = isImage
      ? ({ type: "image_url", imageUrl: url } as const)
      : ({ type: "document_url", documentUrl: url } as const);

    try {
      const ocrResponse = await mistral.ocr.process(
        {
          model: "mistral-ocr-latest",
          document,
          // Do not extract images
          imageLimit: 0,
          imageMinSize: 0,
          includeImageBase64: false,
        },
        {
          signal,
          retries: { strategy: "backoff", backoff: BACKOFF },
        },
      );

      return ocrResponse.pages.map((page) => page.markdown);
    } catch (error) {
      if (error instanceof MistralError) {
        if (error.statusCode === 400 || error.statusCode === 422) {
          // These could be one of several skip or fail reasons, but since
          // Mistral doesn't easily distinguish between them, choose skip
          throw new AttachmentSkippedError(
            "unsupportedByEngine",
            `HTTP ${error.statusCode}: ${error.message}`,
          );
        }

        throwIfFatalHttpStatus(error.statusCode, error);
      }

      if (error instanceof RequestTimeoutError) {
        throw new AttachmentFailedError("requestTimeout");
      }

      if (error instanceof ConnectionError) {
        throw new FatalError(t("errors.connectionFailed"));
      }

      throw error;
    }
  }
}

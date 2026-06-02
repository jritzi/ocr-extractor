import { Mistral } from "@mistralai/mistralai";
import { MistralError } from "@mistralai/mistralai/models/errors/mistralerror";
import { OcrService, UserFacingError } from "../ocr-service";
import { MistralSettingsSection } from "./mistral-settings";
import { toDataUrl } from "../../utils/encoding";
import { warnSkipped } from "../../utils/logging";
import { t } from "../../i18n";

const BACKOFF = {
  initialInterval: 500,
  maxInterval: 10000,
  exponent: 1.5,
  maxElapsedTime: 10000,
};

export class MistralService extends OcrService {
  static getLabel() {
    return t("services.mistralOcr");
  }

  static getSettingsSection() {
    return MistralSettingsSection;
  }

  protected isMimeTypeSupported(mimeType: string) {
    return mimeType !== "application/xml";
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
    signal: AbortSignal,
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
    } catch (error: unknown) {
      if (error instanceof MistralError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new UserFacingError(t("errors.unauthorized"));
        }

        if (error.statusCode === 400 || error.statusCode === 422) {
          warnSkipped(filename, "file type not supported by Mistral OCR");
          return null;
        }

        if (error.statusCode === 429) {
          throw new UserFacingError(t("errors.rateLimited"));
        }

        if (error.statusCode >= 500) {
          console.error(
            `Mistral server error (HTTP ${error.statusCode}):`,
            error.message,
          );
          throw new UserFacingError(
            t("errors.serverError", { status: error.statusCode }),
          );
        }
      }

      throw error;
    }
  }
}

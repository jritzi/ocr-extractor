import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from "openai";
import { OcrService, UserFacingError } from "../ocr-service";
import { OpenAiCompatibleClient } from "./openai-compatible-client";
import { OpenAiCompatibleSettingsSection } from "./openai-compatible-settings";
import { convertPdfToImages, isPdf } from "../../utils/pdf";
import { warnSkipped } from "../../utils/logging";
import { resizeImage } from "../../utils/image";
import { toDataUrl } from "../../utils/encoding";
import { t } from "../../i18n";

// Max of common local OCR models (larger is slower without improving accuracy)
const MAX_IMAGE_DIMENSION = 1536;

export class OpenAiCompatibleService extends OcrService {
  static getLabel() {
    return t("services.openAiCompatibleApi");
  }

  static getSettingsSection() {
    return OpenAiCompatibleSettingsSection;
  }

  protected isMimeTypeSupported(mimeType: string) {
    return mimeType.startsWith("image/") || isPdf(mimeType);
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
    signal: AbortSignal,
  ) {
    const client = new OpenAiCompatibleClient({
      baseUrl: this.settings.openAiCompatibleBaseUrl,
      model: this.settings.openAiCompatibleModel,
      apiKey:
        this.secretStorage.getSecret(this.settings.openAiCompatibleSecret) ??
        "",
      prompt: this.settings.openAiCompatiblePrompt,
    });

    if (isPdf(mimeType)) {
      const images = await convertPdfToImages(data, MAX_IMAGE_DIMENSION);
      const pages: string[] = [];

      for (const imageData of images) {
        if (signal.aborted) break;

        const text = await this.extractImage(
          client,
          toDataUrl(imageData, "image/png"),
          filename,
          signal,
        );
        if (text) pages.push(text);
      }

      return pages.length > 0 ? pages : null;
    } else {
      let dataUrl: string;
      try {
        dataUrl = await resizeImage(data, mimeType, {
          maxDimension: MAX_IMAGE_DIMENSION,
        });
      } catch {
        warnSkipped(filename, `could not resize image (${mimeType})`);
        return null;
      }
      const text = await this.extractImage(client, dataUrl, filename, signal);
      return text ? [text] : null;
    }
  }

  private async extractImage(
    client: OpenAiCompatibleClient,
    dataUrl: string,
    filename: string,
    signal: AbortSignal,
  ) {
    try {
      return await client.extractText(dataUrl, signal);
    } catch (error) {
      if (signal.aborted) throw error;

      if (
        error instanceof APIConnectionTimeoutError ||
        error instanceof APIConnectionError
      ) {
        throw new UserFacingError(t("errors.openAiCompatibleConnectionFailed"));
      }

      if (error instanceof APIError) {
        if (error.status === 400 || error.status === 422) {
          warnSkipped(
            filename,
            `request rejected by model (HTTP ${error.status}): ${error.message}`,
          );
          return null;
        } else if (error.status === 401 || error.status === 403) {
          throw new UserFacingError(t("errors.unauthorized"));
        } else if (error.status === 404) {
          throw new UserFacingError(t("errors.openAiCompatibleNotFound"));
        } else if (error.status === 429) {
          throw new UserFacingError(t("errors.rateLimited"));
        } else if (error.status >= 500) {
          console.error(
            `OpenAI-compatible server error (HTTP ${error.status}):`,
            error.message,
          );
          throw new UserFacingError(
            t("errors.serverError", { status: error.status }),
          );
        } else {
          console.error(
            `OpenAI-compatible request failed (HTTP ${error.status}):`,
            error.message,
          );
          throw new UserFacingError(
            t("errors.openAiCompatibleRequestFailed", { status: error.status }),
          );
        }
      }

      throw error;
    }
  }
}

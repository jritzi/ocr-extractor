import { OcrService } from "../ocr-service";
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

        const text = await client.extractText(
          toDataUrl(imageData, "image/png"),
          signal,
        );
        if (text) pages.push(text);
      }

      return pages;
    } else {
      let dataUrl: string;
      try {
        dataUrl = await resizeImage(data, mimeType, {
          maxDimension: MAX_IMAGE_DIMENSION,
        });
      } catch {
        warnSkipped(filename, "could not resize image");
        return null;
      }
      const text = await client.extractText(dataUrl, signal);
      return text ? [text] : [];
    }
  }
}

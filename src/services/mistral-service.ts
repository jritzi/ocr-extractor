import type { SettingGroup } from "obsidian";
import { Mistral } from "@mistralai/mistralai";
import { OCRRequest } from "@mistralai/mistralai/models/components";
import { MistralError } from "@mistralai/mistralai/models/errors/mistralerror";
import { UserFacingError, OcrService } from "./ocr-service";
import { withRetries } from "../utils/async";
import { toDataUrl } from "../utils/encoding";
import { warnSkipped } from "../utils/logging";
import type OcrExtractorPlugin from "../../main";
import { PluginSettings } from "../settings";
import { t } from "../i18n";

export class MistralService extends OcrService {
  private mistral: Mistral;

  constructor(settings: PluginSettings) {
    super(settings);
    this.mistral = new Mistral({ apiKey: settings.mistralApiKey });
  }

  static getLabel() {
    return t("services.mistralOcr");
  }

  static addSettings(
    group: SettingGroup,
    settings: PluginSettings,
    saveSetting: OcrExtractorPlugin["saveSetting"],
  ) {
    group.addSetting((setting) => {
      setting
        .setName(t("settings.mistralApiKey"))
        .addText((text) =>
          text
            .setValue(settings.mistralApiKey)
            .onChange((value) => void saveSetting("mistralApiKey", value)),
        );
    });
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
    const url = toDataUrl(data, mimeType);

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
          throw new UserFacingError(t("errors.unauthorized"), {
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

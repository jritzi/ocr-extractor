import type { SecretStorage } from "obsidian";
import { OcrService, UserFacingError } from "../ocr-service";
import { CustomCommandRunner } from "./custom-command-runner";
import { CustomCommandSettingsSection } from "./custom-command-settings";
import { convertPdfToImages, isPdf } from "../../utils/pdf";
import { PluginSettings } from "../../settings";
import { t } from "../../i18n";

// Downscale large images (original size is likely unnecessary for OCR purposes)
const PDF_MAX_DIMENSION = 4000;

export class CustomCommandService extends OcrService {
  private readonly runner: CustomCommandRunner;

  constructor(settings: PluginSettings, secretStorage: SecretStorage) {
    super(settings, secretStorage);
    this.runner = new CustomCommandRunner();
  }

  static getLabel() {
    return t("services.customCommand");
  }

  static getSettingsSection() {
    return CustomCommandSettingsSection;
  }

  protected isMimeTypeSupported(_mimeType: string) {
    // The command will be run on all file types (it can skip attachments by
    // not creating the output file).
    return true;
  }

  protected async extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
    signal: AbortSignal,
  ) {
    const command = this.getCommand();

    if (isPdf(mimeType) && this.settings.customCommandConvertPdfs) {
      const images = await convertPdfToImages(data, PDF_MAX_DIMENSION);
      const pages: string[] = [];

      for (const imageData of images) {
        if (signal.aborted) break;

        const text = await this.runner.run(imageData, command, "png", signal);
        if (text) pages.push(text);
      }

      return pages;
    }

    const dotIndex = filename.lastIndexOf(".");
    const extension = dotIndex !== -1 ? filename.slice(dotIndex) : "";
    const text = await this.runner.run(data, command, extension, signal);
    return text ? [text] : [];
  }

  private getCommand() {
    const command = this.settings.customCommand.trim();
    if (!command) {
      throw new UserFacingError(t("errors.noCustomCommand"));
    }
    return command;
  }
}

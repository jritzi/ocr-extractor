import type { SecretStorage } from "obsidian";
import {
  AttachmentSkippedError,
  type ExtractPagesOptions,
  FatalError,
  OcrEngine,
} from "../ocr-engine";
import { CustomCommandRunner } from "./custom-command-runner";
import type OcrExtractorPlugin from "../../../main";
import { CustomCommandSettings } from "./custom-command-settings";
import { convertPdfToImages, isPdf } from "../../utils/pdf";
import { PluginSettings } from "../../settings";
import { t } from "../../i18n";

// Downscale large images (original size is likely unnecessary for OCR purposes)
const PDF_MAX_DIMENSION = 4000;

export class CustomCommandEngine extends OcrEngine {
  private readonly runner: CustomCommandRunner;

  constructor(settings: PluginSettings, secretStorage: SecretStorage) {
    super(settings, secretStorage);
    this.runner = new CustomCommandRunner();
  }

  static getLabel() {
    return t("engines.customCommand");
  }

  static getSettings(plugin: OcrExtractorPlugin) {
    return new CustomCommandSettings(plugin);
  }

  protected isMimeTypeSupported(_mimeType: string) {
    // The command will be run on all file types (it can skip attachments by
    // not creating the output file).
    return true;
  }

  protected async extractPages(
    data: Uint8Array,
    { mimeType, filename, signal }: ExtractPagesOptions,
  ) {
    const command = this.getCommand();

    if (isPdf(mimeType) && this.settings.customCommandConvertPdfs) {
      const images = await convertPdfToImages(data, PDF_MAX_DIMENSION, signal);
      const pages: string[] = [];

      for (const imageData of images) {
        if (signal.aborted) break;

        const text = await this.runner.run(imageData, command, "png", signal);
        if (text === null) {
          throw new AttachmentSkippedError(
            "unsupportedByEngine",
            "command produced no output file",
          );
        }

        if (text) pages.push(text);
      }

      return pages;
    }

    const dotIndex = filename.lastIndexOf(".");
    const extension = dotIndex !== -1 ? filename.slice(dotIndex) : "";
    const text = await this.runner.run(data, command, extension, signal);
    if (text === null) {
      throw new AttachmentSkippedError(
        "unsupportedByEngine",
        "command produced no output file",
      );
    }

    return text ? [text] : [];
  }

  private getCommand() {
    const command = this.settings.customCommand.trim();
    if (!command) {
      throw new FatalError(t("errors.noCustomCommand"));
    }
    return command;
  }
}

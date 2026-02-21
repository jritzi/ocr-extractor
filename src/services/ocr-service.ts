import { fileTypeFromBuffer } from "file-type";
import type { SecretStorage, SettingGroup } from "obsidian";
import type OcrExtractorPlugin from "../../main";
import { PluginSettings } from "../settings";
import { warnSkipped } from "../utils/logging";
import { getPdfTextContent, isPdf } from "../utils/pdf";

/**
 * Errors with a message intended to be shown directly to the user (as opposed
 * to other exceptions which will show a generic error message).
 */
export class UserFacingError extends Error {}

const PAGE_SEPARATOR = "\n\n---\n\n";

export abstract class OcrService {
  constructor(
    protected settings: PluginSettings,
    protected secretStorage: SecretStorage,
  ) {}

  /** The label shown on the setting tab */
  static getLabel(): string {
    throw new Error("getLabel() not implemented");
  }

  /** Add service-specific settings to the settings tab */
  static addSettings(_group: SettingGroup, _plugin: OcrExtractorPlugin) {}

  /**
   * Main entry point called by the plugin to extract text. Subclasses should
   * not override this (they should implement `extractPages()` instead).
   */
  async processOcr(data: Uint8Array, filename: string): Promise<string | null> {
    const fileType = await fileTypeFromBuffer(data);
    const mimeType = fileType?.mime;

    if (!mimeType || !this.isMimeTypeSupported(mimeType)) {
      warnSkipped(filename, `unsupported MIME type (${mimeType ?? "unknown"})`);
      return null;
    }

    if (isPdf(mimeType) && this.settings.useEmbeddedPdfText) {
      const result = this.joinPages(await getPdfTextContent(data));
      if (result) {
        return result;
      }
    }

    const pages = await this.extractPages(data, mimeType, filename);
    if (pages === null) {
      return null;
    }
    const result = this.joinPages(pages);
    if (!result) {
      warnSkipped(filename, "no text to extract");
      return null;
    }
    return result;
  }

  /** Clean up any resources held by this service. */
  async terminate() {}

  private joinPages(pages: string[]) {
    const nonEmpty = pages
      .map((page) => page.trim())
      .filter((page) => page.length > 0);
    return nonEmpty.length > 0 ? nonEmpty.join(PAGE_SEPARATOR) : null;
  }

  /**
   * Whether this service can handle the given MIME type. If false, the file
   * is skipped.
   */
  protected abstract isMimeTypeSupported(mimeType: string): boolean;

  /**
   * Extract text from the document and return it as an array of strings
   * (one per page), or null to skip the file.
   */
  protected abstract extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
  ): Promise<string[] | null>;
}

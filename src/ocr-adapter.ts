import { fileTypeFromBuffer } from "file-type";
import { uint8ArrayToBase64, warnSkipped } from "./utils";
import { OcrExtractorPluginSettings } from "./setting-tab";

const PAGE_SEPARATOR = "\n\n---\n\n";

export abstract class OcrAdapter {
  /** The label shown on the setting tab */
  static readonly label: string;

  constructor(protected settings: OcrExtractorPluginSettings) {}

  async processOcr(data: Uint8Array, filename: string): Promise<string | null> {
    const fileType = await fileTypeFromBuffer(data);
    const mimeType = fileType?.mime;

    if (!mimeType || !this.isMimeTypeSupported(mimeType)) {
      warnSkipped(filename, `unsupported MIME type (${mimeType ?? "unknown"})`);
      return null;
    }

    const pages = await this.extractPages(data, mimeType, filename);
    if (pages === null) {
      return null;
    }
    const nonEmptyPages = pages
      .map((page) => page.trim())
      .filter((page) => page.length > 0);
    if (nonEmptyPages.length === 0) {
      warnSkipped(filename, "no text to extract");
      return null;
    }
    return nonEmptyPages.join(PAGE_SEPARATOR);
  }

  /**
   * Clean up any resources held by this adapter.
   */
  async terminate() {}

  protected abstract isMimeTypeSupported(mimeType: string): boolean;

  /**
   * Extract text from the document and return it as an array of strings
   * (one per page).
   */
  protected abstract extractPages(
    data: Uint8Array,
    mimeType: string,
    filename: string,
  ): Promise<string[] | null>;

  protected toDataUrl(data: Uint8Array, mimeType: string) {
    return `data:${mimeType};base64,${uint8ArrayToBase64(data)}`;
  }
}

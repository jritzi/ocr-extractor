import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import type { Page } from "@playwright/test";
import type {
  OcrError,
  OcrExtractionResult,
  OcrExtractorApi,
  OcrResult,
} from "ocr-extractor-api";

type ApiError = Pick<OcrError, "name" | "code">;
type ExtractResult =
  | { success: true; result: OcrResult }
  | { success: false; error: ApiError };
type ExtractTextResult =
  | { success: true; result: OcrExtractionResult }
  | { success: false; error: ApiError };

/**
 * Calls `api.extract()` and returns the result or error in serializable form (a
 * thrown error can't propagate across `page.evaluate()`).
 */
async function extract(page: Page, path: string): Promise<ExtractResult> {
  return page.evaluate(async (filePath) => {
    const file = app.vault.getFileByPath(filePath)!;
    const api = (
      app as unknown as {
        plugins: { plugins: Record<string, { api?: OcrExtractorApi }> };
      }
    ).plugins.plugins["ocr-extractor"].api!;

    try {
      return { success: true, result: await api.extract!(file) };
    } catch (error) {
      const { name, code } = error as ApiError;
      return { success: false, error: { name, code } };
    }
  }, path);
}

/**
 * Calls `api.extractText()` and returns the result or error in serializable
 * form (a thrown error can't propagate across `page.evaluate()`).
 */
async function extractText(
  page: Page,
  path: string,
): Promise<ExtractTextResult> {
  return page.evaluate(async (filePath) => {
    const file = app.vault.getFileByPath(filePath)!;
    const api = (
      app as unknown as {
        plugins: { plugins: Record<string, { api?: OcrExtractorApi }> };
      }
    ).plugins.plugins["ocr-extractor"].api!;

    try {
      return { success: true, result: await api.extractText(file) };
    } catch (error) {
      const { name, code } = error as ApiError;
      return { success: false, error: { name, code } };
    }
  }, path);
}

test.describe("supported attachment", () => {
  test("extract: extracted result", async ({ page }) => {
    expect(await extract(page, "attachments/sample.png")).toEqual({
      success: true,
      result: { status: "extracted", text: MOCK_OCR_OUTPUT },
    });
  });

  test("extractText: extracted text", async ({ page }) => {
    expect(await extractText(page, "attachments/sample.png")).toEqual({
      success: true,
      result: { text: MOCK_OCR_OUTPUT },
    });
  });
});

test.describe("no extracted text", () => {
  test.use({ mockOcrOutput: "" });

  test("extract: no-text result", async ({ page }) => {
    expect(await extract(page, "attachments/sample.png")).toEqual({
      success: true,
      result: { status: "no-text" },
    });
  });

  test("extractText: empty string", async ({ page }) => {
    expect(await extractText(page, "attachments/sample.png")).toEqual({
      success: true,
      result: { text: "" },
    });
  });
});

test.describe("unsupported file type", () => {
  test.use({ settings: { ocrEngine: "openAiCompatible" } });

  test("extract: unsupported result", async ({ page }) => {
    expect(await extract(page, "attachments/sample.xml")).toEqual({
      success: true,
      result: { status: "unsupported" },
    });
  });

  test("extractText: unsupported-file error", async ({ page }) => {
    expect(await extractText(page, "attachments/sample.xml")).toEqual({
      success: false,
      error: { name: "OcrError", code: "unsupported-file" },
    });
  });
});

test.describe("engine error", () => {
  test.use({
    settings: { customCommand: MOCK_OCR_COMMANDS.error },
  });

  test("extract: extraction-failed error", async ({ page }) => {
    expect(await extract(page, "attachments/sample.png")).toEqual({
      success: false,
      error: { name: "OcrError", code: "extraction-failed" },
    });
  });

  test("extractText: extraction-failed error", async ({ page }) => {
    expect(await extractText(page, "attachments/sample.png")).toEqual({
      success: false,
      error: { name: "OcrError", code: "extraction-failed" },
    });
  });
});

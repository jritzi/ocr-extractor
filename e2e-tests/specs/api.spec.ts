import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import type { Page } from "@playwright/test";
import type { OcrExtractionResult, OcrExtractorApi } from "ocr-extractor-api";

type ApiError = { name: string; code: string };
type ApiResult =
  | { success: true; result: OcrExtractionResult }
  | { success: false; error: ApiError };

/**
 * Calls `api.extractText()` and returns the result or error in serializable
 * form (a thrown error can't propagate across `page.evaluate()`).
 */
async function extractViaApi(page: Page, path: string): Promise<ApiResult> {
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

test("extracted text from a supported attachment", async ({ page }) => {
  expect(await extractViaApi(page, "attachments/sample.png")).toEqual({
    success: true,
    result: { text: MOCK_OCR_OUTPUT },
  });
});

test.describe("no extracted text", () => {
  test.use({ mockOcrOutput: "" });

  test("empty string when no text is found", async ({ page }) => {
    expect(await extractViaApi(page, "attachments/sample.png")).toEqual({
      success: true,
      result: { text: "" },
    });
  });
});

test.describe("unsupported file type", () => {
  test.use({ settings: { ocrEngine: "openAiCompatible" } });

  test("unsupported-file error", async ({ page }) => {
    expect(await extractViaApi(page, "attachments/sample.xml")).toEqual({
      success: false,
      error: { name: "OcrError", code: "unsupported-file" },
    });
  });
});

test.describe("engine error", () => {
  test.use({
    settings: { customCommand: MOCK_OCR_COMMANDS.error },
    allowErrors: true,
  });

  test("extraction-failed error", async ({ page }) => {
    expect(await extractViaApi(page, "attachments/sample.png")).toEqual({
      success: false,
      error: { name: "OcrError", code: "extraction-failed" },
    });
  });
});

import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "./fixtures";
import {
  cancelExtraction,
  seedNote,
  expectCallout,
  expectNoCallout,
  extractAllNotes,
  openNote,
} from "./helpers";

test("successful extraction", async ({ page }) => {
  await seedNote(page, "Note 1", "![[attachments/sample.pdf]]");
  await seedNote(page, "Note 2", "![[attachments/sample.pdf]]");
  await extractAllNotes(page);

  await expect(
    page.getByText("Text extraction complete. Extracted: 2"),
  ).toBeVisible();

  await openNote(page, "Note 1");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note 2");
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("warning about skipped attachments", async ({ page }) => {
  await seedNote(
    page,
    "Note 1",
    "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  );
  await seedNote(page, "Note 2", "![[attachments/sample.pdf]]");
  await extractAllNotes(page);

  await expect(
    page.getByText("Text extraction complete. Extracted: 2, skipped: 1"),
  ).toBeVisible();

  await openNote(page, "Note 1");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note 2");
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe("loading and cancellation", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.slow } });

  test("loading message and cancellation", async ({ page }) => {
    await seedNote(page, "Note 1", "![[attachments/sample.pdf]]");
    await seedNote(page, "Note 2", "![[attachments/sample.pdf]]");
    await extractAllNotes(page);

    await expect(
      page
        .locator(".ocr-extractor-status-bar")
        .getByText("Extracting text in note 1/2"),
    ).toBeVisible();

    await cancelExtraction(page);

    await expect(page.getByText("Cancelled text extraction")).toBeVisible();

    await openNote(page, "Note 1");
    await expectNoCallout(page);

    await openNote(page, "Note 2");
    await expectNoCallout(page);
  });
});

test.describe("error handling", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.error } });

  test("error message", async ({ page }) => {
    await seedNote(page, "Note 1", "![[attachments/sample.pdf]]");
    await seedNote(page, "Note 2", "![[attachments/sample.pdf]]");
    await extractAllNotes(page);

    await expect(
      page.getByText(
        "Custom command failed with exit code 1 (see console for details)",
      ),
    ).toBeVisible();

    await openNote(page, "Note 1");
    await expectNoCallout(page);

    await openNote(page, "Note 2");
    await expectNoCallout(page);
  });
});

import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "./fixtures";
import {
  closeModal,
  createNote,
  expectCallout,
  expectNoCallout,
  extractAllNotes,
  openNote,
  openPluginSettings,
  seedNote,
  toggleSetting,
  typeAtEndOfNote,
} from "./helpers";

test("auto-extract setting", async ({ page }) => {
  await seedNote(page, "Note 1");
  await seedNote(page, "Note 2");

  // Off by default
  await openNote(page, "Note 1");
  await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");

  // Extracts when on
  await openNote(page, "Note 2");
  await openPluginSettings(page);
  await toggleSetting(page, "Auto-extract attachments");
  await closeModal(page);
  await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  // Note 1 would have extracted by now
  await openNote(page, "Note 1");
  await expectNoCallout(page);
});

test.describe("busy notice", () => {
  test.use({
    settings: {
      autoExtractAttachments: true,
      customCommand: MOCK_OCR_COMMANDS.slow,
    },
  });

  test("notice if extraction is already in progress", async ({ page }) => {
    await seedNote(page, "Note 1", "![[attachments/sample.pdf]]");

    await extractAllNotes(page);

    await expect(
      page
        .locator(".ocr-extractor-status-bar")
        .getByText("Extracting text in note 1/1"),
    ).toBeVisible();

    await createNote(page, "Auto-extraction test");
    await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");

    await expect(
      page.getByText(
        "OCR Extractor: Extraction already in progress, new attachment skipped",
      ),
    ).toBeVisible();
  });
});

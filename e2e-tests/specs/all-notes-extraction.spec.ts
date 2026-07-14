import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, seedNote } from "../helpers/obsidian";
import {
  cancelExtraction,
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractAllNotes,
  extractionStatusBar,
} from "../helpers/plugin";

test("successful extraction", async ({ page }) => {
  await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });
  await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
  await extractAllNotes(page);

  await expectNotice(page, "Text extraction complete. Extracted: 2");

  await openNote(page, "Note 1");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note 2");
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("warning about skipped attachments", async ({ page }) => {
  await seedNote(page, "Note 1", {
    content: "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  });
  await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
  await extractAllNotes(page);

  await expectNotice(
    page,
    "Text extraction complete. Extracted: 2, skipped: 1",
  );

  await openNote(page, "Note 1");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note 2");
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe("loading and cancellation", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.gated } });

  test("loading message and cancellation", async ({ page }) => {
    await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });
    await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
    await extractAllNotes(page);

    await expect(
      extractionStatusBar(page).getByText("Extracting text in note 1/2"),
    ).toBeVisible();

    await cancelExtraction(page);

    await expect(page.getByText("Canceled text extraction")).toBeVisible();

    await openNote(page, "Note 1");
    await expectNoCallout(page);

    await openNote(page, "Note 2");
    await expectNoCallout(page);
  });
});

test.describe("error handling", () => {
  test.use({
    settings: { customCommand: MOCK_OCR_COMMANDS.error },
    allowErrors: true,
  });

  test("error message", async ({ page }) => {
    await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });
    await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
    await extractAllNotes(page);

    await expectNotice(
      page,
      "Custom command failed (exit code 1). Check the developer console for details.",
    );

    await openNote(page, "Note 1");
    await expectNoCallout(page);

    await openNote(page, "Note 2");
    await expectNoCallout(page);
  });
});

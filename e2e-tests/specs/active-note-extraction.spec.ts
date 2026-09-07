import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, runCommand, seedNote } from "../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractActiveNote,
  extractionStatusBar,
  notice,
} from "../helpers/plugin";

test("successful extraction of active note", async ({ page }) => {
  await seedNote(page, "Extraction test", {
    content: "![[attachments/sample.pdf]]",
  });
  await seedNote(page, "Inactive note", {
    content: "![[attachments/sample.pdf]]",
  });
  await openNote(page, "Extraction test");
  await extractActiveNote(page);

  await expectNotice(page, [
    "Text extraction complete",
    "1 attachment extracted",
  ]);
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Inactive note");
  await expectNoCallout(page);
});

test("skips and failures", async ({ page }) => {
  await seedNote(page, "Skips and failures test", {
    content:
      "![[attachments/sample.pdf]]\n![[attachments/unsupported.xml]]\n![[attachments/missing.pdf]]",
  });
  await openNote(page, "Skips and failures test");
  await extractActiveNote(page);

  await expectNotice(page, [
    "Text extraction complete",
    "1 attachment extracted",
    "1 skipped",
    "Failed: missing.pdf (file not found)",
  ]);
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("extraction from the command palette", async ({ page }) => {
  await seedNote(page, "Command test", {
    content: "![[attachments/sample.pdf]]",
  });
  await openNote(page, "Command test");

  // Run via command, not the hotkey used in other tests
  await runCommand(page, "OCR Extractor: Extract text in active note");

  await expectNotice(page, [
    "Text extraction complete",
    "1 attachment extracted",
  ]);
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe(() => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.gated } });

  test("loading message and cancellation", async ({ page }) => {
    await seedNote(page, "Extraction test", {
      content: "![[attachments/sample.pdf]]",
    });
    await openNote(page, "Extraction test");
    await extractActiveNote(page);

    await expectNotice(page, "Extracting text…");

    await expect(
      extractionStatusBar(page).getByText("Extracting text"),
    ).toBeVisible();

    await notice(page).getByText("Cancel").click();

    await expectNotice(page, "Canceled text extraction");
    await expect(extractionStatusBar(page)).not.toBeVisible();
    await expectNoCallout(page);
  });
});

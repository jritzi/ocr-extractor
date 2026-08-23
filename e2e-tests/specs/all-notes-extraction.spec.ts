import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, seedFolder, seedNote } from "../helpers/obsidian";
import {
  cancelExtraction,
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractAllNotes,
  extractionStatusBar,
} from "../helpers/plugin";

test("successful extraction of all notes", async ({ page }) => {
  await seedFolder(page, "projects");
  await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });
  await seedNote(page, "Note in folder", {
    folder: "projects",
    content: "![[attachments/sample.pdf]]",
  });
  await extractAllNotes(page);

  await expectNotice(page, [
    "Text extraction complete",
    "2 attachments extracted",
  ]);

  await openNote(page, "Note 1");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note in folder");
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("skips and failures", async ({ page }) => {
  await seedNote(page, "Note 1", {
    content:
      "![[attachments/sample.pdf]]\n![[attachments/unsupported.xml]]\n![[attachments/missing.pdf]]",
  });
  await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
  await extractAllNotes(page);

  await expectNotice(page, [
    "Text extraction complete",
    "2 attachments extracted",
    "1 skipped",
    "1 failed",
  ]);

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

    await expectNotice(page, "Canceled text extraction");

    await openNote(page, "Note 1");
    await expectNoCallout(page);

    await openNote(page, "Note 2");
    await expectNoCallout(page);
  });
});

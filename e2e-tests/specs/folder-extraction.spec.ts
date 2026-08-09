import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { createFolder, openNote, seedNote } from "../helpers/obsidian";
import {
  cancelExtraction,
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractFolder,
  extractionStatusBar,
} from "../helpers/plugin";

test("successful extraction of folder notes", async ({ page }) => {
  await createFolder(page, "projects/sub");
  await seedNote(page, "Note in folder 1", {
    folder: "projects",
    content: "![[attachments/sample.pdf]]",
  });
  await seedNote(page, "Note in folder 2", {
    folder: "projects",
    content: "![[attachments/sample.pdf]]",
  });
  await seedNote(page, "Note in subfolder", {
    folder: "projects/sub",
    content: "![[attachments/sample.pdf]]",
  });
  await seedNote(page, "Note outside folder", {
    content: "![[attachments/sample.pdf]]",
  });

  await extractFolder(page, "projects");

  await expectNotice(page, [
    "Text extraction complete",
    "3 attachments extracted",
  ]);

  await openNote(page, "Note in folder 1");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note in folder 2");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note in subfolder");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note outside folder");
  await expectNoCallout(page);
});

test("skips and failures", async ({ page }) => {
  await createFolder(page, "projects");
  await seedNote(page, "Note 1", {
    folder: "projects",
    content:
      "![[attachments/sample.pdf]]\n![[attachments/unsupported.xml]]\n![[attachments/missing.pdf]]",
  });
  await seedNote(page, "Note 2", {
    folder: "projects",
    content: "![[attachments/sample.pdf]]",
  });

  await extractFolder(page, "projects");

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
    await createFolder(page, "projects");
    await seedNote(page, "Note 1", {
      folder: "projects",
      content: "![[attachments/sample.pdf]]",
    });
    await seedNote(page, "Note 2", {
      folder: "projects",
      content: "![[attachments/sample.pdf]]",
    });

    await extractFolder(page, "projects");

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

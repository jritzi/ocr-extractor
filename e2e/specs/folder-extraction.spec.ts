import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { createFolder, openNote, seedNote } from "../helpers/obsidian";
import {
  cancelExtraction,
  expectCallout,
  expectNoCallout,
  extractFolder,
} from "../helpers/plugin";

test("successful extraction", async ({ page }) => {
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

  await expect(
    page.getByText("Text extraction complete. Extracted: 3"),
  ).toBeVisible();

  await openNote(page, "Note in folder 1");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note in folder 2");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note in subfolder");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  await openNote(page, "Note outside folder");
  await expectNoCallout(page);
});

test("warning about skipped attachments", async ({ page }) => {
  await createFolder(page, "projects");
  await seedNote(page, "Note 1", {
    folder: "projects",
    content: "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  });
  await seedNote(page, "Note 2", {
    folder: "projects",
    content: "![[attachments/sample.pdf]]",
  });

  await extractFolder(page, "projects");

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
      page
        .locator(".ocr-extractor-status-bar")
        .getByText("Extracting text in note 1/2"),
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

import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { clickModalButton, openNote, seedNote } from "../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  extractActiveNote,
} from "../helpers/plugin";

test("successful extraction", async ({ page }) => {
  await seedNote(page, "Extraction test", "![[attachments/sample.pdf]]");
  await openNote(page, "Extraction test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("warning about skipped attachments", async ({ page }) => {
  await seedNote(
    page,
    "Warning test",
    "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  );
  await openNote(page, "Warning test");
  await extractActiveNote(page);

  const modal = page.locator(".modal");
  await expect(
    modal.getByText(
      "Text extracted from 1 attachment. The following were skipped:",
    ),
  ).toBeVisible();
  await expect(modal.getByText("attachments/missing.pdf")).toBeVisible();
  await expect(modal.getByText("attachments/sample.pdf")).not.toBeVisible();

  await clickModalButton(page, "OK");
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe("loading and cancellation", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.slow } });

  test("loading message and cancellation", async ({ page }) => {
    await seedNote(page, "Extraction test", "![[attachments/sample.pdf]]");
    await openNote(page, "Extraction test");
    await extractActiveNote(page);

    const modal = page.locator(".modal");
    await expect(
      modal.getByText("Extracting text from attachments..."),
    ).toBeVisible();

    await clickModalButton(page, "Cancel");

    await expect(page.getByText("Canceled text extraction")).toBeVisible();
    await expectNoCallout(page);
  });
});

test.describe("error handling", () => {
  test.use({
    settings: { customCommand: MOCK_OCR_COMMANDS.error },
    allowErrors: true,
  });

  test("error message", async ({ page }) => {
    await seedNote(page, "Extraction test", "![[attachments/sample.pdf]]");
    await openNote(page, "Extraction test");
    await extractActiveNote(page);

    const modal = page.locator(".modal");
    await expect(
      modal.getByText(
        "Error: Custom command failed with exit code 1 (see console for details)",
      ),
    ).toBeVisible();

    await clickModalButton(page, "OK");
    await expectNoCallout(page);
  });
});

test("Markdown link embed syntax (issue #51)", async ({ page }) => {
  await seedNote(
    page,
    "Markdown link embed test",
    "![sample](attachments/sample.pdf)",
  );
  await openNote(page, "Markdown link embed test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

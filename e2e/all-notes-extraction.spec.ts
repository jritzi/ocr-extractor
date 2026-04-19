import { expect, test } from "./fixtures";
import {
  cancelExtraction,
  createNote,
  expectCallout,
  expectNoCallout,
  extractAllNotes,
  openNote,
} from "./helpers";

test.use({ mockOcrOutput: "Mock extracted text" });

test("successful extraction", async ({ page }) => {
  await createNote(page, "Note 1", "![[attachments/sample.pdf]]");
  await createNote(page, "Note 2", "![[attachments/sample.pdf]]");
  await extractAllNotes(page);

  await expect(
    page.getByText("Text extraction complete. Extracted: 2"),
  ).toBeVisible();

  await openNote(page, "Note 1");
  await expectCallout(page, "Mock extracted text");

  await openNote(page, "Note 2");
  await expectCallout(page, "Mock extracted text");
});

test("warning about skipped attachments", async ({ page }) => {
  await createNote(
    page,
    "Note 1",
    "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  );
  await createNote(page, "Note 2", "![[attachments/sample.pdf]]");
  await extractAllNotes(page);

  await expect(
    page.getByText("Text extraction complete. Extracted: 2, skipped: 1"),
  ).toBeVisible();

  await openNote(page, "Note 1");
  await expectCallout(page, "Mock extracted text");

  await openNote(page, "Note 2");
  await expectCallout(page, "Mock extracted text");
});

test.describe("loading and cancellation", () => {
  test.use({ ocrScript: "slow" });

  test("loading message and cancellation", async ({ page }) => {
    await createNote(page, "Note 1", "![[attachments/sample.pdf]]");
    await createNote(page, "Note 2", "![[attachments/sample.pdf]]");
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
  test.use({ ocrScript: "error" });

  test("error message", async ({ page }) => {
    await createNote(page, "Note 1", "![[attachments/sample.pdf]]");
    await createNote(page, "Note 2", "![[attachments/sample.pdf]]");
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

import { expect, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, seedNote } from "../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  extractActiveNote,
  extractAllNotes,
} from "../helpers/plugin";

test("Markdown link embed syntax (issue #51)", async ({ page }) => {
  await seedNote(page, "Markdown link embed test", {
    content: "![sample](attachments/sample.pdf)",
  });
  await openNote(page, "Markdown link embed test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe("password-protected PDFs", () => {
  // Have plugin attempt to open/process PDF
  test.use({ settings: { preferEmbeddedText: true } });

  test("skipping password-protected PDFs (issue #109)", async ({ page }) => {
    await seedNote(page, "Note", {
      content: "![[attachments/password-protected.pdf]]",
    });
    await extractAllNotes(page);

    await expect(
      page.getByText("Text extraction complete. Extracted: 0, skipped: 1"),
    ).toBeVisible();

    await openNote(page, "Note");
    await expectNoCallout(page);
  });
});

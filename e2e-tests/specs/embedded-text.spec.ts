import { MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, seedNote } from "../helpers/obsidian";
import {
  expectCallout,
  expectCalloutContains,
  extractActiveNote,
} from "../helpers/plugin";

test("setting off by default (OCR used even when PDF has embedded text)", async ({
  page,
}) => {
  await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe("setting on", () => {
  test.use({ settings: { preferEmbeddedText: true } });

  test("using embedded text from PDF when available", async ({ page }) => {
    await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
    await openNote(page, "Note");
    await extractActiveNote(page);

    await expectCalloutContains(page, "Sample PDF");
  });

  test("falling back to OCR when PDF has no embedded text", async ({
    page,
  }) => {
    await seedNote(page, "Note", { content: "![[attachments/no_text.pdf]]" });
    await openNote(page, "Note");
    await extractActiveNote(page);

    await expectCallout(page, MOCK_OCR_OUTPUT);
  });
});

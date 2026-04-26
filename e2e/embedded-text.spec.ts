import { MOCK_OCR_OUTPUT, test } from "./fixtures";
import { expectCallout, extractCurrentNote, openNote, seedNote } from "./helpers";

test("setting off by default (OCR used even when PDF has embedded text)", async ({
  page,
}) => {
  await seedNote(page, "Note", "![[attachments/sample.pdf]]");
  await openNote(page, "Note");
  await extractCurrentNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe("setting on", () => {
  test.use({ settings: { useEmbeddedText: true } });

  test("using embedded text from OCR when available", async ({ page }) => {
    await seedNote(page, "Note", "![[attachments/sample.pdf]]");
    await openNote(page, "Note");
    await extractCurrentNote(page);

    await expectCallout(page, "Sample PDF");
  });

  test("falling back to OCR when PDF has no embedded text", async ({
    page,
  }) => {
    await seedNote(page, "Note", "![[attachments/no_text.pdf]]");
    await openNote(page, "Note");
    await extractCurrentNote(page);

    await expectCallout(page, MOCK_OCR_OUTPUT);
  });
});

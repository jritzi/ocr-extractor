import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { getActiveNoteContent, openNote, seedNote } from "../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractActiveNote,
  extractionNotice,
  extractionStatusBar,
} from "../helpers/plugin";

test("successful extraction", async ({ page }) => {
  await seedNote(page, "Extraction test", {
    content: "![[attachments/sample.pdf]]",
  });
  await openNote(page, "Extraction test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("multiple embeds", async ({ page }) => {
  const callout = `> [!ocr-extractor]- Extracted text\n> ${MOCK_OCR_OUTPUT}`;
  await seedNote(page, "Multiple embeds test", {
    content: "![[attachments/sample.pdf]]\n\n![[attachments/sample.png]]",
  });
  await openNote(page, "Multiple embeds test");
  await extractActiveNote(page);

  await expectNotice(page, "Text extraction complete. Extracted: 2");
  await expect(page.locator(".callout")).toHaveCount(2);

  const content = await getActiveNoteContent(page);
  expect(content).toContain(`![[attachments/sample.pdf]]\n\n${callout}`);
  expect(content).toContain(`![[attachments/sample.png]]\n\n${callout}`);
});

test("notice with skipped attachments", async ({ page }) => {
  await seedNote(page, "Warning test", {
    content: "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  });
  await openNote(page, "Warning test");
  await extractActiveNote(page);

  await expectNotice(
    page,
    "Text extraction complete. Extracted: 1, skipped: 1",
  );
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test.describe("loading notice", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.gated } });

  test("loading notice with cancel", async ({ page }) => {
    await seedNote(page, "Extraction test", {
      content: "![[attachments/sample.pdf]]",
    });
    await openNote(page, "Extraction test");
    await extractActiveNote(page);

    const notice = extractionNotice(page);
    await expect(notice.getByText("Extracting text…")).toBeVisible();

    await expect(
      extractionStatusBar(page).getByText("Extracting text"),
    ).toBeVisible();

    await notice.getByText("Cancel").click();

    await expectNotice(page, "Canceled text extraction");
    await expect(extractionStatusBar(page)).not.toBeVisible();
    await expectNoCallout(page);
  });

  test("dismissing the loading notice", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Dismiss notice test", {
      content: "![[attachments/sample.pdf]]",
    });
    await openNote(page, "Dismiss notice test");
    await extractActiveNote(page);

    const notice = extractionNotice(page);
    await notice.getByText("Extracting text").click();
    await expect(notice).not.toBeVisible();
    await expect(
      extractionStatusBar(page).getByText("Extracting text"),
    ).toBeVisible();

    releaseGatedOcr();
    await expectCallout(page, MOCK_OCR_OUTPUT);
  });
});

test.describe("error handling", () => {
  test.use({
    settings: { customCommand: MOCK_OCR_COMMANDS.error },
    allowErrors: true,
  });

  test("error notice", async ({ page }) => {
    await seedNote(page, "Extraction test", {
      content: "![[attachments/sample.pdf]]",
    });
    await openNote(page, "Extraction test");
    await extractActiveNote(page);

    await expectNotice(
      page,
      "Custom command failed (exit code 1). Check the developer console for details.",
    );
    await expectNoCallout(page);
  });
});

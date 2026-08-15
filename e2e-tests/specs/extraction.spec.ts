import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import {
  createFolder,
  getActiveNoteContent,
  openNote,
  seedNote,
} from "../helpers/obsidian";
import {
  callout,
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractActiveNote,
  extractAllNotes,
  extractFolder,
  extractionStatusBar,
  notice,
} from "../helpers/plugin";

test("Markdown link embed syntax (issue #51)", async ({ page }) => {
  await seedNote(page, "Markdown link embed test", {
    content: "![sample](attachments/sample.pdf)",
  });
  await openNote(page, "Markdown link embed test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("multiple embeds in one note", async ({ page }) => {
  const calloutMarkdown = `> [!ocr-extractor]- Extracted text\n> ${MOCK_OCR_OUTPUT}`;
  await seedNote(page, "Multiple embeds test", {
    content: "![[attachments/sample.pdf]]\n\n![[attachments/sample.png]]",
  });
  await openNote(page, "Multiple embeds test");
  await extractActiveNote(page);

  await expectNotice(page, [
    "Text extraction complete",
    "2 attachments extracted",
  ]);
  await expect(callout(page)).toHaveCount(2);

  const content = await getActiveNoteContent(page);
  expect(content).toContain(
    `![[attachments/sample.pdf]]\n\n${calloutMarkdown}`,
  );
  expect(content).toContain(
    `![[attachments/sample.png]]\n\n${calloutMarkdown}`,
  );
});

test("already extracted embed", async ({ page }) => {
  await seedNote(page, "Already extracted test", {
    content: "![[attachments/sample.pdf]]",
  });
  await openNote(page, "Already extracted test");
  await extractActiveNote(page);
  await expectNotice(page, "Text extraction complete");

  await extractActiveNote(page);
  await expectNotice(page, "Nothing to extract");
});

test("empty folder", async ({ page }) => {
  await createFolder(page, "Empty folder");
  await extractFolder(page, "Empty folder");
  await expectNotice(page, "Nothing to extract");
});

test.describe("password-protected PDFs", () => {
  // Open PDF so password protection is detected
  test.use({ settings: { preferEmbeddedText: true } });

  test("skipping password-protected PDFs (issue #109)", async ({ page }) => {
    await seedNote(page, "Password-protected note", {
      content: "![[attachments/password-protected.pdf]]",
    });
    await seedNote(page, "Readable note", {
      content: "![[attachments/sample.png]]",
    });
    await extractAllNotes(page);

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
      "1 skipped",
    ]);

    await openNote(page, "Readable note");
    await expectCallout(page, MOCK_OCR_OUTPUT);

    await openNote(page, "Password-protected note");
    await expectNoCallout(page);
  });
});

test.describe("corrupt PDFs", () => {
  // Open PDF so corrupt file is detected
  test.use({ settings: { preferEmbeddedText: true } });

  test("failing corrupt PDFs", async ({ page }) => {
    await seedNote(page, "Corrupt note", {
      content: "![[attachments/corrupt.pdf]]",
    });
    await seedNote(page, "Readable note", {
      content: "![[attachments/sample.png]]",
    });
    await extractAllNotes(page);

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
      "1 failed",
    ]);

    await openNote(page, "Readable note");
    await expectCallout(page, MOCK_OCR_OUTPUT);

    await openNote(page, "Corrupt note");
    await expectNoCallout(page);
  });
});

test.describe("errors", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.error } });

  test("failed attachments on error", async ({ page }) => {
    await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });
    await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
    await extractAllNotes(page);

    await expectNotice(page, [
      "Text extraction complete",
      "2 attachments failed",
    ]);

    await openNote(page, "Note 1");
    await expectNoCallout(page);

    await openNote(page, "Note 2");
    await expectNoCallout(page);
  });
});

test.describe("loading notice", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.gated } });

  test("dismissing the loading notice without canceling", async ({
    page,
    releaseGatedOcr,
  }) => {
    await seedNote(page, "Dismiss notice test", {
      content: "![[attachments/sample.pdf]]",
    });
    await openNote(page, "Dismiss notice test");
    await extractActiveNote(page);

    await notice(page).getByText("Extracting text…").click();
    await expect(notice(page)).toHaveCount(0);
    await expect(
      extractionStatusBar(page).getByText("Extracting text"),
    ).toBeVisible();

    releaseGatedOcr();
    await expectCallout(page, MOCK_OCR_OUTPUT);
  });
});

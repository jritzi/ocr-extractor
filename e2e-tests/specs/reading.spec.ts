import { expect, MOCK_OCR_OUTPUT, test } from "../fixtures";
import {
  clearNoteText,
  getActiveNoteContent,
  getNoteContentOnDisk,
  openNote,
  seedNote,
  typeAtEndOfNote,
} from "../helpers/obsidian";
import {
  expectCallout,
  expectNotice,
  extractActiveNote,
} from "../helpers/plugin";

const EMBED = "![[attachments/sample.pdf]]";
const CALLOUT = `> [!ocr-extractor]- Extracted text\n> ${MOCK_OCR_OUTPUT}`;

test.describe("unsaved edits", () => {
  test("an embed added right before extraction", async ({ page }) => {
    await seedNote(page, "Added embed test");
    await openNote(page, "Added embed test");

    await typeAtEndOfNote(page, EMBED);
    await extractActiveNote(page);

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(`${EMBED}\n\n${CALLOUT}\n\n`);
  });

  test("a callout deleted right before extraction", async ({ page }) => {
    await seedNote(page, "Deleted callout test", { content: EMBED });
    await openNote(page, "Deleted callout test");
    await extractActiveNote(page);
    await expectCallout(page, MOCK_OCR_OUTPUT);

    await clearNoteText(page);
    await typeAtEndOfNote(page, EMBED);
    await extractActiveNote(page);

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(`${EMBED}\n\n${CALLOUT}\n\n`);
  });
});

test.describe("no unsaved edits", () => {
  test("a note with \\r\\n line endings", async ({ page }) => {
    const original = "first line\r\nsecond line\r\n";
    await seedNote(page, "Line ending test", { content: original });
    await openNote(page, "Line ending test");

    await extractActiveNote(page);
    await expectNotice(page, "Nothing to extract");

    // Extraction must not save the note, which would convert its line endings
    const content = await getNoteContentOnDisk(page, "Line ending test.md");
    expect(content).toBe(original);
  });

  test("extraction before the cache indexes a write", async ({ page }) => {
    await seedNote(page, "Cache lag test");
    await openNote(page, "Cache lag test");

    // Write the file directly (to avoid unsaved edits) and trigger extraction
    // with a raw KeyboardEvent (to ensure it runs before the cache indexes it).
    await page.evaluate(
      async ({ path, content, metaKey }) => {
        const file = app.vault.getFileByPath(path);
        if (!file) throw new Error(`Note not found: ${path}`);
        await app.vault.modify(file, content);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "E",
            code: "KeyE",
            metaKey,
            ctrlKey: !metaKey,
            altKey: true,
            shiftKey: true,
            bubbles: true,
          }),
        );
      },
      {
        path: "Cache lag test.md",
        content: EMBED,
        metaKey: process.platform === "darwin",
      },
    );

    await expectCallout(page, MOCK_OCR_OUTPUT);
  });
});

import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import {
  addFrontmatter,
  clearNoteText,
  closeActiveTab,
  createFolder,
  deleteNote,
  getActiveNoteContent,
  openNewTab,
  openNote,
  replaceRangeInNote,
  seedNote,
  switchToTab,
  typeAtEndOfNote,
  typeAtStartOfNote,
} from "../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractActiveNote,
  extractFolder,
} from "../helpers/plugin";

const EMBED = "![[attachments/sample.pdf]]";
const CALLOUT = `> [!ocr-extractor]- Extracted text\n> ${MOCK_OCR_OUTPUT}`;

test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.gated } });

test.describe("editing during extraction", () => {
  test("typing above the embed", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Above test", { content: EMBED });
    await openNote(page, "Above test");
    await extractActiveNote(page);

    await typeAtStartOfNote(page, "Text typed above\n");
    releaseGatedOcr();

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content).toContain(`Text typed above\n${EMBED}\n\n${CALLOUT}`);
  });

  test("typing below the embed", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Below test", { content: EMBED });
    await openNote(page, "Below test");
    await extractActiveNote(page);

    await typeAtEndOfNote(page, "\nText typed below");
    releaseGatedOcr();

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content).toContain(`${EMBED}\n\n${CALLOUT}\n\nText typed below`);
  });

  test("editing the embed itself", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Edited embed test", { content: EMBED });
    await openNote(page, "Edited embed test");
    await extractActiveNote(page);

    await clearNoteText(page);
    await typeAtEndOfNote(page, "![[attachments/different.pdf]]");
    releaseGatedOcr();

    await expectNotice(page, [
      "Text extraction complete",
      "Failed: sample.pdf (note changed during extraction)",
    ]);
    await expectNoCallout(page);
  });

  test("continuous typing", async ({ page, releaseGatedOcr }) => {
    const typed = "The quick brown fox jumps ";
    await seedNote(page, "Continuous typing test", { content: EMBED });
    await openNote(page, "Continuous typing test");
    await extractActiveNote(page);

    releaseGatedOcr();
    // Type slowly to overlap the insert
    await typeAtStartOfNote(page, typed, 120);

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content.startsWith(`${typed}${EMBED}\n\n${CALLOUT}`)).toBe(true);
  });

  test("typing in one of multiple notes", async ({ page, releaseGatedOcr }) => {
    await createFolder(page, "Docs");
    await seedNote(page, "Edited note", { folder: "Docs", content: EMBED });
    await seedNote(page, "Untouched note", { folder: "Docs", content: EMBED });
    await openNote(page, "Edited note");

    await extractFolder(page, "Docs");
    await typeAtEndOfNote(page, "\nMeeting notes");
    releaseGatedOcr();

    await expectNotice(page, [
      "Text extraction complete",
      "2 attachments extracted",
    ]);

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content).toContain("Meeting notes");

    await openNote(page, "Untouched note");
    await expectCallout(page, MOCK_OCR_OUTPUT);
  });

  test("adding frontmatter", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Frontmatter test", { content: EMBED });
    await openNote(page, "Frontmatter test");
    await extractActiveNote(page);

    await addFrontmatter(page, { tags: ["scanned"] });
    releaseGatedOcr();

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content).toContain("scanned");
    expect(content).toContain(`${EMBED}\n\n${CALLOUT}`);
  });

  test("deleting text above duplicate embeds", async ({
    page,
    releaseGatedOcr,
  }) => {
    // With a stale cache, deleting exactly this prefix collapses both embeds
    // onto the same range, which must retry (not crash)
    const prefix = "x".repeat(EMBED.length + 1);
    await seedNote(page, "Duplicate embeds test", {
      content: `${prefix}${EMBED}\n${EMBED}`,
    });
    await openNote(page, "Duplicate embeds test");
    await extractActiveNote(page);

    await replaceRangeInNote(
      page,
      "",
      { line: 0, ch: 0 },
      { line: 0, ch: prefix.length },
    );
    releaseGatedOcr();

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(
      `${EMBED}\n\n${CALLOUT}\n\n${EMBED}\n\n${CALLOUT}\n\n`,
    );
  });
});

test.describe("tab changes", () => {
  test("closing the tab mid-extraction", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Closed tab test", { content: EMBED });
    await openNote(page, "Closed tab test");
    await extractActiveNote(page);

    await closeActiveTab(page);
    releaseGatedOcr();

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);

    await openNote(page, "Closed tab test");
    await expectCallout(page, MOCK_OCR_OUTPUT);
  });

  test("switching to another tab mid-extraction", async ({
    page,
    releaseGatedOcr,
  }) => {
    await seedNote(page, "Background test", { content: EMBED });
    await seedNote(page, "Other note");
    await openNote(page, "Background test");
    await extractActiveNote(page);

    await openNewTab(page);
    await openNote(page, "Other note");
    releaseGatedOcr();

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);

    await switchToTab(page, "Background test");
    await expectCallout(page, MOCK_OCR_OUTPUT);
  });

  test("typing then closing the tab mid-extraction", async ({
    page,
    releaseGatedOcr,
  }) => {
    await seedNote(page, "Dirty close test", { content: EMBED });
    await openNote(page, "Dirty close test");
    await extractActiveNote(page);

    await typeAtEndOfNote(page, "\nUser text");
    await closeActiveTab(page);
    releaseGatedOcr();

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);

    await openNote(page, "Dirty close test");
    const content = await getActiveNoteContent(page);
    expect(content).toBe(`${EMBED}\n\n${CALLOUT}\n\nUser text`);
  });
});

test.describe("note deletion", () => {
  test("deleting note mid-extraction", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Deleted note", { content: EMBED });
    await openNote(page, "Deleted note");
    await extractActiveNote(page);

    await deleteNote(page, "Deleted note.md");
    releaseGatedOcr();

    await expectNotice(page, "Nothing to extract");
  });

  test("deleting a note before reached in multi-note extraction", async ({
    page,
    releaseGatedOcr,
  }) => {
    await createFolder(page, "docs");
    await seedNote(page, "Kept note", { folder: "docs", content: EMBED });
    await seedNote(page, "Deleted note", { folder: "docs", content: EMBED });

    await extractFolder(page, "docs");
    await deleteNote(page, "docs/Deleted note.md");
    releaseGatedOcr();

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);
  });

  test("deleting the note while an insert is waiting to retry", async ({
    page,
    releaseGatedOcr,
  }) => {
    await seedNote(page, "Retry delete test", { content: EMBED });
    await openNote(page, "Retry delete test");
    await extractActiveNote(page);

    await typeAtStartOfNote(page, "Typed above\n");
    releaseGatedOcr();
    await page.waitForTimeout(500);

    await deleteNote(page, "Retry delete test.md");

    await expectNotice(page, "Nothing to extract");
  });
});

test.describe("line endings", () => {
  test("a note with \\r\\n line endings", async ({ page, releaseGatedOcr }) => {
    await seedNote(page, "Line ending test", {
      content: `first line\r\n\r\n${EMBED}\r\n`,
    });
    await openNote(page, "Line ending test");
    await extractActiveNote(page);
    releaseGatedOcr();

    await expectCallout(page, MOCK_OCR_OUTPUT);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(`first line\n\n${EMBED}\n\n${CALLOUT}\n\n`);
  });
});

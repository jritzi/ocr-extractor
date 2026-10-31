import { expect, MOCK_OCR_COMMANDS, MOCK_OCR_OUTPUT, test } from "../fixtures";
import {
  copyFile,
  createNote,
  getActiveNoteContent,
  openNote,
  renameLinkedFile,
  seedNote,
  typeAtEndOfNote,
} from "../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  extractAllNotes,
  extractionStatusBar,
} from "../helpers/plugin";
import {
  closeSettings,
  openPluginSettings,
  toggleSetting,
} from "../helpers/settings";

test("auto-extract setting", async ({ page }) => {
  await seedNote(page, "Note 1");
  await seedNote(page, "Note 2");

  // Off by default
  await openNote(page, "Note 1");
  await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");

  // Extracts when on
  await openNote(page, "Note 2");
  await openPluginSettings(page);
  await toggleSetting(page, "Auto-extract attachments");
  await closeSettings(page);
  await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");
  await expectCallout(page, MOCK_OCR_OUTPUT);

  // Note 1 would have extracted by now
  await openNote(page, "Note 1");
  await expectNoCallout(page);
});

test.describe("attachment renames", () => {
  test.use({ settings: { autoExtractAttachments: true } });

  test("no auto-extraction after renaming an attachment", async ({ page }) => {
    await copyFile(page, "attachments/sample.pdf", "attachments/old.pdf");
    await seedNote(page, "Renamed attachment note", {
      content: "![[attachments/old.pdf]]",
    });
    await seedNote(page, "New embed note");
    await openNote(page, "Renamed attachment note");

    await renameLinkedFile(page, "attachments/old.pdf", "attachments/new.pdf");

    await openNote(page, "New embed note");
    await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");
    await expectCallout(page, MOCK_OCR_OUTPUT);

    // The renamed attachment note would have extracted by now
    await openNote(page, "Renamed attachment note");
    expect(await getActiveNoteContent(page)).toBe("![[new.pdf]]");
  });
});

test.describe("busy notice", () => {
  test.use({
    settings: {
      autoExtractAttachments: true,
      customCommand: MOCK_OCR_COMMANDS.gated,
    },
  });

  test("notice if extraction is already in progress", async ({ page }) => {
    await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });

    await extractAllNotes(page);

    await expect(
      extractionStatusBar(page).getByText("Extracting text in note 1/1"),
    ).toBeVisible();

    await createNote(page, "Auto-extraction test");
    await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");

    await expect(
      page.getByText(
        "OCR Extractor: Extraction already in progress, new attachment skipped",
      ),
    ).toBeVisible();
  });
});

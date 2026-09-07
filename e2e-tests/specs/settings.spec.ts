import { expect, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, seedNote } from "../helpers/obsidian";
import {
  closeSettings,
  expectCallout,
  extractActiveNote,
  openPluginSettings,
  settingDropdown,
  settingItem,
  toggleSetting,
} from "../helpers/plugin";

test.describe(() => {
  test.use({ settings: { ocrEngine: "customCommand" } });

  test("engine settings when switching engines", async ({ page }) => {
    await openPluginSettings(page);
    const engineDropdown = settingDropdown(page, "OCR engine");

    await expect(settingItem(page, "Convert PDFs to images")).toBeVisible();

    await engineDropdown.selectOption({ label: "Tesseract" });
    await expect(settingItem(page, "Convert PDFs to images")).not.toBeVisible();
    // Still renders general settings even with no engine-specific settings
    await expect(settingItem(page, "Auto-extract attachments")).toBeVisible();

    await engineDropdown.selectOption({ label: "Mistral OCR" });
    await expect(settingItem(page, "API key")).toBeVisible();

    await engineDropdown.selectOption({ label: "OpenAI-compatible API" });
    await expect(settingItem(page, "Base URL")).toBeVisible();
  });
});

test.describe(() => {
  test.use({ settings: { preferEmbeddedText: false } });

  test("extraction after a setting is changed", async ({ page }) => {
    await seedNote(page, "Before change", {
      content: "![[attachments/sample.pdf]]",
    });
    await seedNote(page, "After change", {
      content: "![[attachments/sample.pdf]]",
    });

    await openNote(page, "Before change");
    await extractActiveNote(page);
    await expectCallout(page, MOCK_OCR_OUTPUT);

    await openPluginSettings(page);
    await toggleSetting(page, "Prefer embedded PDF text");
    await closeSettings(page);

    await openNote(page, "After change");
    await extractActiveNote(page);
    await expectCallout(page, /Sample PDF/);
  });
});

import { expect, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, seedNote } from "../helpers/obsidian";
import {
  expectCallout,
  expectNotice,
  extractActiveNote,
} from "../helpers/plugin";
import {
  addProperty,
  addPropertyFromSuggestion,
  closeSettings,
  deleteProperty,
  openPluginSettings,
  openPropertyList,
  settingDropdown,
  settingItem,
  toggleSetting,
} from "../helpers/settings";

const FRONTMATTER = '---\nscans: "[[attachments/sample.pdf]]"\n---\n';

test.describe("custom command engine", () => {
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

test.describe("with 'Prefer embedded PDF text' disabled", () => {
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

test.describe("'Properties to extract from' setting", () => {
  test("adding a property", async ({ page }) => {
    await openPluginSettings(page);
    await openPropertyList(page);
    await addProperty(page, "scans");
    await expect(settingItem(page, "scans")).toBeVisible();
    await closeSettings(page);

    // Seeded now, so no suggestion dropdown above
    await seedNote(page, "Added property note", { content: FRONTMATTER });
    await openNote(page, "Added property note");
    await extractActiveNote(page);
    await expectCallout(page, MOCK_OCR_OUTPUT);
  });

  test("adding a property from a suggestion", async ({ page }) => {
    await seedNote(page, "Suggestion source", { content: FRONTMATTER });

    await openPluginSettings(page);
    await openPropertyList(page);
    await addPropertyFromSuggestion(page, "scans");
    await expect(settingItem(page, "scans")).toBeVisible();
  });

  test.describe("with 'scans' already added", () => {
    test.use({ settings: { propertiesToExtractFrom: ["scans"] } });

    test("deleting a property", async ({ page }) => {
      await seedNote(page, "Deleted property note", { content: FRONTMATTER });

      await openPluginSettings(page);
      await openPropertyList(page);
      await expect(settingItem(page, "scans")).toBeVisible();
      await deleteProperty(page, "scans");
      await expect(settingItem(page, "scans")).not.toBeVisible();
      await closeSettings(page);

      await openNote(page, "Deleted property note");
      await extractActiveNote(page);
      await expectNotice(page, "Nothing to extract");
    });

    test("choosing an already added property", async ({ page }) => {
      await openPluginSettings(page);
      await openPropertyList(page);

      const modal = await addProperty(page, "scans");
      await expect(modal.getByText("Property already added")).toBeVisible();
      await expect(settingItem(page, "scans")).toHaveCount(1);
    });
  });
});

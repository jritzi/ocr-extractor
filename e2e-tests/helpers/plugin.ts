import { expect, Page } from "@playwright/test";
import { callout, clickModalButton } from "./obsidian";

export async function extractActiveNote(page: Page) {
  await page.keyboard.press("ControlOrMeta+Alt+Shift+E");
}

export async function extractFolder(page: Page, folderName: string) {
  await page.keyboard.press("ControlOrMeta+Alt+Shift+F");
  await page.getByPlaceholder("Select a folder…").fill(folderName);
  await page.keyboard.press("Enter");
}

export async function extractAllNotes(page: Page) {
  await page.keyboard.press("ControlOrMeta+Alt+Shift+A");
  await clickModalButton(page, "Extract");
}

export async function cancelExtraction(page: Page) {
  await page.keyboard.press("ControlOrMeta+Alt+Shift+C");
}

export function notice(page: Page) {
  return page.locator(".notice");
}

export async function expectNotice(page: Page, text: string | string[]) {
  if (!Array.isArray(text)) {
    await expect(notice(page).getByText(text)).toBeVisible();
    return;
  }

  await expect(noticeLines(page)).toHaveText(text);
}

export function extractionStatusBar(page: Page) {
  return page.locator(".ocr-extractor-status-bar");
}

export async function openPluginSettings(page: Page) {
  await page.locator(".clickable-icon:has(.lucide-settings)").click();
  await page
    .locator(".vertical-tab-nav-item")
    .getByText("OCR Extractor")
    .click();
}

export async function closeSettings(page: Page) {
  const settings = page.locator(".modal.mod-settings");
  await settings.locator(".modal-header-button").click();
  await expect(settings).not.toBeVisible();
}

export function settingItem(page: Page, label: string) {
  return page.locator(".setting-item").filter({ hasText: label });
}

export function settingDropdown(page: Page, label: string) {
  return settingItem(page, label).getByRole("combobox");
}

export async function toggleSetting(page: Page, label: string) {
  await settingItem(page, label).getByRole("checkbox").click();
}

export async function expectCallout(page: Page, expectedText: string | RegExp) {
  const pluginCallout = callout(page, "ocr-extractor");
  await pluginCallout.click();
  await expect(pluginCallout.locator(".callout-content")).toHaveText(
    expectedText,
  );
}

/**
 * Confirm that a callout has not been added. Only call after another
 * expectation confirms that extraction has been attempted (otherwise this may
 * pass before it has actually finished running).
 */
export async function expectNoCallout(page: Page) {
  await expect(callout(page, "ocr-extractor")).not.toBeVisible();
}

function noticeLines(page: Page) {
  return notice(page)
    .locator(".ocr-extractor-notice-lines")
    .last()
    .locator(":scope > div");
}

import { expect, Page } from "@playwright/test";
import { callout, clickModalButton, runCommand } from "./obsidian";

export async function extractActiveNote(page: Page) {
  await runCommand(page, "OCR Extractor: Extract text in active note");
}

export async function extractFolder(page: Page, folderName: string) {
  await runCommand(page, "OCR Extractor: Extract text in folder");
  await page.getByPlaceholder("Select a folder…").fill(folderName);
  await page.keyboard.press("Enter");
}

export async function extractAllNotes(page: Page) {
  await runCommand(page, "OCR Extractor: Extract text in all notes");
  await clickModalButton(page, "Extract");
}

export async function cancelExtraction(page: Page) {
  await runCommand(page, "OCR Extractor: Cancel extraction");
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

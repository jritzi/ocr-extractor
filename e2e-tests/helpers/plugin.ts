import { expect, Page } from "@playwright/test";
import { clickModalButton, runCommand } from "./obsidian";

export async function extractActiveNote(page: Page) {
  await runCommand(page, "OCR Extractor: Extract text in active note");
}

export async function extractFolder(page: Page, folderName: string) {
  await runCommand(page, "OCR Extractor: Extract text in folder");
  await page.getByPlaceholder("Select a folder...").fill(folderName);
  await page.keyboard.press("Enter");
}

export async function extractAllNotes(page: Page) {
  await runCommand(page, "OCR Extractor: Extract text in all notes");
  await clickModalButton(page, "Extract");
}

export async function cancelExtraction(page: Page) {
  await runCommand(page, "OCR Extractor: Cancel extraction");
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

export async function toggleSetting(page: Page, label: string) {
  await settingItem(page, label).getByRole("checkbox").click();
}

export async function expectCallout(page: Page, expectedText: string) {
  await page.locator(".callout").click();
  await expect(page.locator(".callout-content")).toHaveText(expectedText);
}

export async function expectCalloutContains(page: Page, expectedText: string) {
  await page.locator(".callout").click();
  await expect(page.locator(".callout-content")).toContainText(expectedText);
}

/**
 * Confirm that a callout has not been added. Only call after another
 * expectation confirms that extraction has been attempted (otherwise this may
 * pass before it has actually finished running).
 */
export async function expectNoCallout(page: Page) {
  await expect(page.locator(".callout")).not.toBeVisible();
}

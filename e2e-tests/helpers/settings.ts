import { expect, Page } from "@playwright/test";

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
  return page.locator(".setting-item").filter({
    has: page.locator(".setting-item-name").getByText(label, { exact: true }),
  });
}

export function settingDropdown(page: Page, label: string) {
  return settingItem(page, label).getByRole("combobox");
}

export async function toggleSetting(page: Page, label: string) {
  await settingItem(page, label).getByRole("checkbox").click();
}

export async function openPropertyList(page: Page) {
  await settingItem(page, "Properties to extract from").click();
}

export async function addProperty(page: Page, name: string) {
  await page.getByLabel("Add property").click();
  const modal = addPropertyModal(page);
  await modal.getByRole("textbox").fill(name);
  await modal.getByRole("button", { name: "Add" }).click();
  return modal;
}

export async function addPropertyFromSuggestion(page: Page, name: string) {
  await page.getByLabel("Add property").click();
  const modal = addPropertyModal(page);
  await modal.getByRole("textbox").click();
  await page
    .locator(".suggestion-item")
    .getByText(name, { exact: true })
    .click();
  await modal.getByRole("button", { name: "Add" }).click();
  await expect(modal).not.toBeVisible();
}

export async function deleteProperty(page: Page, name: string) {
  await settingItem(page, name).getByLabel("Delete").click();
}

function addPropertyModal(page: Page) {
  return page.locator(".modal").filter({ hasText: "Add property" });
}

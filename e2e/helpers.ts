import { expect, Page } from "@playwright/test";

export async function seedNote(page: Page, name: string, content = "") {
  await page.evaluate(
    async ({ name, content }) => {
      // eslint-disable-next-line no-restricted-globals -- non-global app not available in this context
      await app.vault.create(`${name}.md`, content);
    },
    { name, content },
  );
}

export async function createNote(page: Page, name: string) {
  await page.getByLabel("New note").click();
  await page.locator(".inline-title").fill(name);
}

export async function openNote(page: Page, name: string) {
  await page.getByLabel("Open quick switcher").click();
  await page.getByPlaceholder("Find or create a note").fill(name);
  await page.keyboard.press("Enter");
  await expect(page.locator(".inline-title").getByText(name)).toBeVisible();
}

export async function typeAtEndOfNote(page: Page, text: string) {
  await page
    .locator(".cm-editor")
    .getByRole("textbox")
    .press(withModifier("End"));
  await page.keyboard.type(text);
}

export async function runCommand(page: Page, command: string) {
  await page.getByLabel("Open command palette").click();
  await page.getByPlaceholder("Select a command to add...").fill(command);
  await page.keyboard.press("Enter");
}

export async function extractCurrentNote(page: Page) {
  await runCommand(page, "OCR Extractor: Extract text in current note");
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

export async function toggleSetting(page: Page, label: string) {
  await page
    .locator(".setting-item")
    .filter({ hasText: label })
    .locator(".checkbox-container")
    .click();
}

export async function closeModal(page: Page) {
  const modal = page.locator(".modal");
  await modal.locator(".modal-close-button").click();
  await expect(modal).not.toBeVisible();
}

export async function clickModalButton(page: Page, buttonName: string) {
  const modal = page.locator(".modal");
  await modal.getByRole("button", { name: buttonName }).click();
  await expect(modal).not.toBeVisible();
}

export async function expectCallout(page: Page, expectedText: string) {
  await page.locator(".callout").click();
  await expect(
    page.locator(".callout-content").getByText(expectedText),
  ).toBeVisible();
}

/**
 * Confirm that a callout has not been added. Only call after another
 * expectation confirms that extraction has been attempted (otherwise this may
 * pass before it has actually finished running).
 */
export async function expectNoCallout(page: Page) {
  await expect(page.locator(".callout")).not.toBeVisible();
}

function withModifier(key: string) {
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  return `${modifier}+${key}`;
}

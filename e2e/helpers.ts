import { expect, Page } from "@playwright/test";

export async function createNote(page: Page, name: string, content: string) {
  await page.evaluate(
    async ({ name, content }) => {
      // eslint-disable-next-line no-restricted-globals -- non-global app not available in this context
      await app.vault.create(`${name}.md`, content);
    },
    { name, content },
  );
}

export async function openNote(page: Page, name: string) {
  await page.getByLabel("Open quick switcher").click();
  await page.getByPlaceholder("Find or create a note").fill(name);
  await page.keyboard.press("Enter");
  await expect(page.locator(".inline-title").getByText(name)).toBeVisible();
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
}

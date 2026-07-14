import { expect, Page } from "@playwright/test";

export async function createFolder(page: Page, folder: string) {
  await page.evaluate(
    async ({ folder }) => {
      await app.vault.createFolder(folder);
    },
    { folder },
  );
}

export async function seedNote(
  page: Page,
  name: string,
  { folder, content = "" }: { folder?: string; content?: string } = {},
) {
  await page.evaluate(
    async ({ folder, name, content }) => {
      const path = folder ? `${folder}/${name}.md` : `${name}.md`;
      await app.vault.create(path, content);
    },
    { folder, name, content },
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

export async function typeAtStartOfNote(
  page: Page,
  text: string,
  delay?: number,
) {
  await editorTextbox(page).press(withModifier("Home"));
  await page.keyboard.type(text, { delay });
}

export async function typeAtEndOfNote(page: Page, text: string) {
  await editorTextbox(page).press(withModifier("End"));
  await page.keyboard.type(text);
}

export async function clearNoteText(page: Page) {
  await editorTextbox(page).press(withModifier("a"));
  await page.keyboard.press("Delete");
}

export async function openNewTab(page: Page) {
  await page.keyboard.press(withModifier("t"));
}

export async function closeActiveTab(page: Page) {
  await page.keyboard.press(withModifier("w"));
}

export async function switchToTab(page: Page, name: string) {
  await page
    .locator(".workspace-tab-header-container")
    .getByLabel(name, { exact: true })
    .click();
}

export async function getActiveNoteContent(page: Page) {
  const content = await page.evaluate(() =>
    app.workspace.activeEditor?.editor?.getValue(),
  );
  if (content === undefined) {
    throw new Error("No active editor found");
  }
  return content;
}

export async function addFrontmatter(
  page: Page,
  properties: Record<string, unknown>,
) {
  await page.evaluate(async (properties) => {
    const file = app.workspace.getActiveFile();
    if (!file) throw new Error("No active file");
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      Object.assign(frontmatter, properties);
    });
  }, properties);
}

export async function runCommand(page: Page, command: string) {
  await page.getByLabel("Open command palette").click();
  await page.getByPlaceholder("Select a command to add...").fill(command);
  await page.keyboard.press("Enter");
}

export function getModal(page: Page) {
  return page.locator(".modal");
}

export async function closeModal(page: Page) {
  const modal = getModal(page);
  await modal.locator(".modal-close-button").click();
  await expect(modal).not.toBeVisible();
}

export async function clickModalButton(page: Page, buttonName: string) {
  const modal = getModal(page);
  await modal.getByRole("button", { name: buttonName }).click();
  await expect(modal).not.toBeVisible();
}

function editorTextbox(page: Page) {
  return page.locator(".cm-editor").getByRole("textbox");
}

function withModifier(key: string) {
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  return `${modifier}+${key}`;
}

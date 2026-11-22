import { readFileSync, statSync, watch, writeFileSync } from "fs";
import { join } from "path";
import type { Page } from "@playwright/test";
import { expect, MOCK_OCR_OUTPUT, test } from "../fixtures";
import {
  getActiveNoteContent,
  openExternalNote,
  openNote,
  searchCommands,
  seedNote,
  typeAtEndOfNote,
} from "../helpers/obsidian";
import { expectCallout } from "../helpers/plugin";

test("extraction in a note outside the vault", async ({
  electronApp,
  page,
  externalDir,
}) => {
  const notePath = join(externalDir, "External note.md");
  writeFileSync(notePath, "![[external.pdf]]\n");
  await openExternalNote(electronApp, page, notePath);

  const commands = await searchCommands(page, "OCR Extractor: Extract text in");
  await expect(
    commands.filter({ hasText: "Extract text in folder" }),
  ).toBeVisible();
  await expect(
    commands.filter({ hasText: "Extract text in active note" }),
  ).not.toBeVisible();
});

test.describe(() => {
  test.use({ settings: { autoExtractAttachments: true } });

  test("auto-extraction in a note outside the vault", async ({
    electronApp,
    page,
    externalDir,
  }) => {
    const notePath = join(externalDir, "External note.md");
    writeFileSync(notePath, "");

    // DEBUG (revert): everything marked debug below is temporary CI logging
    const debug = await startDebugLog(page, externalDir, notePath);

    await openExternalNote(electronApp, page, notePath);
    await debug("opened external note");

    await typeAtEndOfNote(page, "![[external.pdf]]");
    await debug("typed into external note");

    await seedNote(page, "Vault note");
    await openNote(page, "Vault note");
    await debug("opened vault note");
    await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");
    await expectCallout(page, MOCK_OCR_OUTPUT);
    await debug("vault note extracted");

    // The external note would have extracted by now
    await openExternalNote(electronApp, page, notePath);
    await debug("reopened external note");
    await page.waitForTimeout(2000);
    await debug("2s after reopening");
    expect(await getActiveNoteContent(page)).toBe("![[external.pdf]]");
  });
});

// DEBUG (revert): logs disk state, Obsidian's view of the workspace, vault
// events, file system events and every console message, with timestamps
async function startDebugLog(page: Page, directory: string, notePath: string) {
  const start = Date.now();
  const log = (line: string) =>
    console.log(`[debug +${Date.now() - start}ms] ${line}`);

  page.on("console", (message) => {
    log(`console.${message.type()}: ${message.text().slice(0, 500)}`);
  });
  page.on("pageerror", (error) => {
    log(`pageerror: ${(error.stack ?? error.message).slice(0, 800)}`);
  });

  const watcher = watch(directory, (event, name) => {
    let size = "missing";
    try {
      size = String(statSync(join(directory, name ?? "")).size);
    } catch {
      // Logged as missing
    }
    log(`fs.watch ${event} ${name} (size ${size})`);
  });
  page.once("close", () => watcher.close());

  await page.evaluate(() => {
    const events: string[] = [];
    const record = (line: string) =>
      events.push(`${performance.now().toFixed(0)}ms ${line}`);
    const { vault, workspace, metadataCache } = app;
    for (const name of ["create", "modify", "delete", "rename"] as const) {
      vault.on(name as "create", (file, oldPath?: string) =>
        record(
          `vault ${name} ${file.path}${oldPath ? ` from ${oldPath}` : ""}`,
        ),
      );
    }
    metadataCache.on("changed", (file) => record(`cache changed ${file.path}`));
    metadataCache.on("deleted", (file) => record(`cache deleted ${file.path}`));
    workspace.on("file-open", (file) =>
      record(`file-open ${file?.path ?? "null"}`),
    );
    (globalThis as unknown as { __debugEvents: string[] }).__debugEvents =
      events;
  });

  return async (label: string) => {
    let disk = "missing";
    try {
      disk = JSON.stringify(readFileSync(notePath, "utf8"));
    } catch (error) {
      disk = `unreadable: ${String(error)}`;
    }
    const state = await page.evaluate((path) => {
      const leaves: string[] = [];
      app.workspace.iterateRootLeaves((leaf) => {
        const view = leaf.view as { file?: { path: string } };
        leaves.push(
          `${leaf.view.getViewType()}:${view.file?.path ?? "no file"}${
            leaf === app.workspace.getMostRecentLeaf() ? " (active)" : ""
          }`,
        );
      });
      const events = (globalThis as unknown as { __debugEvents: string[] })
        .__debugEvents;
      return {
        leaves,
        activeFile: app.workspace.getActiveFile()?.path ?? null,
        editor: app.workspace.activeEditor?.editor?.getValue() ?? null,
        externalFile: app.vault.getFileByPath(`file:${path}`) !== null,
        events: events.splice(0),
      };
    }, notePath);
    log(`== ${label}`);
    log(`   disk: ${disk}`);
    log(`   leaves: ${state.leaves.join(" | ")}`);
    log(`   active file: ${state.activeFile}`);
    log(`   editor: ${JSON.stringify(state.editor)}`);
    log(`   getFileByPath(file:…) found: ${state.externalFile}`);
    for (const event of state.events) log(`   event ${event}`);
  };
}

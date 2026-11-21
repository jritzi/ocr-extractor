import { writeFileSync } from "fs";
import { join } from "path";
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
    await openExternalNote(electronApp, page, notePath);

    await typeAtEndOfNote(page, "![[external.pdf]]");

    await seedNote(page, "Vault note");
    await openNote(page, "Vault note");
    await typeAtEndOfNote(page, "![[attachments/sample.pdf]]");
    await expectCallout(page, MOCK_OCR_OUTPUT);

    // The external note would have extracted by now
    await openExternalNote(electronApp, page, notePath);
    expect(await getActiveNoteContent(page)).toBe("![[external.pdf]]");
  });
});

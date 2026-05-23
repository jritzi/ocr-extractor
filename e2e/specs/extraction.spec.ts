import { expect, MOCK_OCR_OUTPUT, test } from "../fixtures";
import { clickModalButton, openNote, seedNote } from "../helpers/obsidian";
import { expectCallout, extractActiveNote } from "../helpers/plugin";

test("successful extraction", async ({ page }) => {
  await seedNote(page, "Extraction test", {
    content: "![[attachments/sample.pdf]]",
  });
  await openNote(page, "Extraction test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("warning about skipped attachments", async ({ page }) => {
  await seedNote(page, "Warning test", {
    content: "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  });
  await openNote(page, "Warning test");
  await extractActiveNote(page);

  const modal = page.locator(".modal");
  await expect(
    modal.getByText(
      "Text extracted from 1 attachment. The following were skipped:",
    ),
  ).toBeVisible();
  await expect(modal.getByText("attachments/missing.pdf")).toBeVisible();
  await expect(modal.getByText("attachments/sample.pdf")).not.toBeVisible();

  await clickModalButton(page, "OK");
  await expectCallout(page, MOCK_OCR_OUTPUT);
});

test("Markdown link embed syntax (issue #51)", async ({ page }) => {
  await seedNote(page, "Markdown link embed test", {
    content: "![sample](attachments/sample.pdf)",
  });
  await openNote(page, "Markdown link embed test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

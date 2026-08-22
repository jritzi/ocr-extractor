import { expect, MOCK_OCR_COMMANDS, test } from "../fixtures";
import { mockHttp } from "../helpers/http";
import { MISTRAL_URL } from "../helpers/mistral";
import {
  activeNoteTitle,
  closeActiveTab,
  createFolder,
  openNote,
  seedNote,
} from "../helpers/obsidian";
import {
  cancelExtraction,
  expectNotice,
  extractActiveNote,
  extractAllNotes,
  extractFolder,
  notice,
} from "../helpers/plugin";
import {
  expectAttachmentFailed,
  expectAttachmentNotFailed,
  expectCountFailed,
  expectCountNotFailed,
  expectFatalMessage,
  expectStatusError,
  reportAttachmentRow,
  reportAttachmentRows,
  reportNoteRow,
  reportSummaryLines,
  reportView,
  showReportView,
} from "../helpers/report-view";

test("empty state before any run", async ({ page }) => {
  await showReportView(page);

  await expect(
    reportView(page).getByText("No extraction has run yet."),
  ).toBeVisible();
});

test("run with nothing to extract", async ({ page }) => {
  await seedNote(page, "No embeds note", { content: "Only text" });
  await openNote(page, "No embeds note");
  await extractActiveNote(page);

  await showReportView(page);

  await expect(reportView(page).getByText("Nothing to extract")).toBeVisible();
});

test("full run with note and attachment results", async ({ page }) => {
  await createFolder(page, "Receipts");
  await seedNote(page, "First note", {
    folder: "Receipts",
    content:
      "![[attachments/sample.pdf]]\n![[attachments/unsupported.xml]]\n![[attachments/missing.pdf]]",
  });
  await seedNote(page, "Second note", {
    folder: "Receipts",
    content: "![[attachments/sample.png]]",
  });
  await seedNote(page, "Third note");

  await extractFolder(page, "Receipts");
  await notice(page).getByText("Show details").click();

  await expect(reportSummaryLines(page)).toHaveText([
    "Completed",
    "Folder: Receipts",
    /^Started:/,
    /^Finished:/,
    "Attachments: 2 extracted · 1 skipped · 1 failed",
  ]);
  await expectCountFailed(page, "1 failed");

  const firstNote = reportNoteRow(page, "First note");
  const secondNote = reportNoteRow(page, "Second note");
  await expect(firstNote).toContainText("Receipts");
  await expect(firstNote).toContainText("3");
  await expect(secondNote).toContainText("Receipts");
  await expect(secondNote).toContainText("1");

  await expect(reportAttachmentRows(page, "First note")).toHaveText([
    /^sample\.pdf$/,
    /^unsupported\.xml.*Skipped · not supported by the OCR engine$/,
    /^missing\.pdf.*Failed · file not found$/,
  ]);

  await expectAttachmentFailed(page, "First note", "missing.pdf");
  await expectAttachmentNotFailed(page, "First note", "unsupported.xml");

  await closeActiveTab(page);
  await expect(reportView(page)).toHaveCount(0);
  await showReportView(page);

  await openNote(page, "Third note");
  await firstNote.click();
  await expect(activeNoteTitle(page)).toHaveText("First note");

  await reportAttachmentRow(page, "Second note", "sample.png").click();
  await expect(activeNoteTitle(page)).toHaveText("Second note");
});

test("copied report text", async ({ page }) => {
  await seedNote(page, "Copy note", {
    content: "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  });
  await openNote(page, "Copy note");
  await extractActiveNote(page);
  await expectNotice(page, "Text extraction complete");

  await showReportView(page);
  await reportView(page).getByRole("button", { name: "Copy report" }).click();
  await expectNotice(page, "Report copied to clipboard");

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("OCR Extractor report");
  expect(copied).toContain("Attachments: 1 extracted · 0 skipped · 1 failed");
  expect(copied).toContain("Copy note.md");
  expect(copied).toContain(
    "  attachments/missing.pdf: Failed (file not found)",
  );
});

test.describe("fatal errors", () => {
  test.use({
    settings: { ocrEngine: "mistral", mistralSecret: "mistral-key" },
  });

  test("run stopped by a fatal error", async ({ page }) => {
    await mockHttp(page, "POST", MISTRAL_URL, 401, {});

    await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });
    await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
    await extractAllNotes(page);

    await expectNotice(page, [
      "Unauthorized. Check your API key.",
      "Stopped after 0 of 2 notes",
    ]);

    await showReportView(page);
    await expect(reportSummaryLines(page)).toHaveText([
      "Error",
      "All notes",
      /^Started:/,
      /^Finished:/,
      "Unauthorized. Check your API key.",
      "Stopped after 0 of 2 notes",
      "Attachments: 0 extracted · 0 skipped · 0 failed",
    ]);

    await expectStatusError(page, "Error");
    await expectFatalMessage(page, "Unauthorized. Check your API key.");
  });
});

test.describe("cancellation", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.gated } });

  test("in progress and canceled states", async ({ page }) => {
    await seedNote(page, "Note 1", { content: "![[attachments/sample.pdf]]" });
    await seedNote(page, "Note 2", { content: "![[attachments/sample.pdf]]" });
    await extractAllNotes(page);

    await showReportView(page);
    await expect(reportSummaryLines(page)).toHaveText([
      "In progress",
      "All notes",
      /^Started:/,
      "Attachments: 0 extracted · 0 skipped · 0 failed",
    ]);

    await cancelExtraction(page);

    await expect(reportSummaryLines(page)).toHaveText([
      "Canceled",
      "All notes",
      /^Started:/,
      /^Finished:/,
      "Stopped after 0 of 2 notes",
      "Attachments: 0 extracted · 0 skipped · 0 failed",
    ]);
    await expectCountNotFailed(page, "0 failed");
  });
});

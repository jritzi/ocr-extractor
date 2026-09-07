import { expect, Page } from "@playwright/test";

const ERROR_STATUS_CLASS = /ocr-extractor-report-status-error/;
const FATAL_MESSAGE_CLASS = /ocr-extractor-report-fatal/;
const FAILED_COUNT_CLASS = /ocr-extractor-report-count-failed/;
const FAILED_ATTACHMENT_CLASS = /ocr-extractor-report-result-failed/;

export async function showReportView(page: Page) {
  await page.keyboard.press("ControlOrMeta+Alt+Shift+R");
}

export function reportView(page: Page) {
  return page.locator(
    '.workspace-leaf-content[data-type="ocr-extractor-report"]',
  );
}

export function reportSummaryLines(page: Page) {
  return summary(page).locator(":scope > div");
}

export async function expectStatusError(page: Page, status: string) {
  await expect(summaryText(page, status)).toHaveClass(ERROR_STATUS_CLASS);
}

export async function expectFatalMessage(page: Page, message: string) {
  await expect(summaryText(page, message)).toHaveClass(FATAL_MESSAGE_CLASS);
}

export async function expectCountFailed(page: Page, count: string) {
  await expect(summaryText(page, count)).toHaveClass(FAILED_COUNT_CLASS);
}

export async function expectCountNotFailed(page: Page, count: string) {
  await expect(summaryText(page, count)).not.toHaveClass(FAILED_COUNT_CLASS);
}

export function reportNoteRow(page: Page, noteName: string) {
  return noteGroup(page, noteName).locator(":scope > .tree-item-self");
}

export function reportNoteCollapseIcon(page: Page, noteName: string) {
  return reportNoteRow(page, noteName).locator(".collapse-icon");
}

export async function expectNoteCollapsed(page: Page, noteName: string) {
  await expect(noteAttachments(page, noteName)).toBeHidden();
}

export async function expectNoteExpanded(page: Page, noteName: string) {
  await expect(noteAttachments(page, noteName)).toBeVisible();
}

export function reportAttachmentRows(page: Page, noteName: string) {
  return noteGroup(page, noteName).locator(
    ".tree-item-children .tree-item-self",
  );
}

export function reportAttachmentRow(
  page: Page,
  noteName: string,
  attachmentName: string,
) {
  return reportAttachmentRows(page, noteName).filter({
    hasText: attachmentName,
  });
}

export async function expectAttachmentFailed(
  page: Page,
  noteName: string,
  attachmentName: string,
) {
  await expect(reportAttachmentRow(page, noteName, attachmentName)).toHaveClass(
    FAILED_ATTACHMENT_CLASS,
  );
}

export async function expectAttachmentNotFailed(
  page: Page,
  noteName: string,
  attachmentName: string,
) {
  await expect(
    reportAttachmentRow(page, noteName, attachmentName),
  ).not.toHaveClass(FAILED_ATTACHMENT_CLASS);
}

function summary(page: Page) {
  return reportView(page).locator(".ocr-extractor-report-summary");
}

function summaryText(page: Page, text: string) {
  return summary(page).getByText(text, { exact: true });
}

function noteGroup(page: Page, noteName: string) {
  return reportView(page)
    .locator(".ocr-extractor-report-note-item")
    .filter({
      has: page.locator(".ocr-extractor-report-note-name", {
        hasText: noteName,
      }),
    });
}

function noteAttachments(page: Page, noteName: string) {
  return noteGroup(page, noteName).locator(":scope > .tree-item-children");
}

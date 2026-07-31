import { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { openNote, seedNote } from "../helpers/obsidian";

const PLUGIN_CALLOUT = "> [!ocr-extractor]- Extracted text\n> Extracted";
const SUMMARY_CALLOUT = "> [!summary] Summary\n> Summary";

// Text before callouts to prevent a cursor in the callout causing it to
// show source instead of the rendered callout
const NOTE = `Text\n\n${PLUGIN_CALLOUT}\n\n${SUMMARY_CALLOUT}`;

function calloutByType(page: Page, type: string) {
  return page.locator(`.callout[data-callout="${type}"]`);
}

function calloutIcon(page: Page, type: string) {
  return calloutByType(page, type).locator(".callout-icon svg");
}

test("background color and icon", async ({ page }) => {
  await seedNote(page, "Callout style", { content: NOTE });
  await openNote(page, "Callout style");

  const cyan = await calloutByType(page, "summary").evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  await expect(calloutByType(page, "ocr-extractor")).toHaveCSS(
    "background-color",
    cyan,
  );
  await expect(calloutIcon(page, "ocr-extractor")).toHaveClass(
    /lucide-scan-text/,
  );
});

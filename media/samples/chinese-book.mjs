// Renders chinese-book.html to chinese-book.pdf.
// Usage: node media/samples/chinese-book.mjs
// Uses the system Google Chrome (channel: "chrome") and the macOS "Songti SC"
// serif font to approximate a printed Simplified-Chinese book page. Page size,
// margins, and folios (page numbers) are all defined in the HTML/CSS, so we
// just let Chrome honor the CSS @page size.
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(here, "chinese-book.html")).href, {
    waitUntil: "networkidle",
  });

  await page.pdf({
    path: join(here, "chinese-book.pdf"),
    preferCSSPageSize: true,
    printBackground: true,
  });
} finally {
  await browser.close();
}
console.log("Rendered chinese-book.pdf");

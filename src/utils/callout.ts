import { t } from "../i18n";

/** Stable marker used for callouts managed by this plugin */
export const CALLOUT_MARKER = "[!ocr-extractor]-";

/** Header before the custom callout type was added */
export const LEGACY_CALLOUT_HEADER = "[!summary]- Extracted text";

/**
 * Matches the full callout header line, capturing everything up to and
 * including the marker
 */
export const CALLOUT_HEADER_REGEX = /^([\s>]*\[!ocr-extractor\]-) .*$/gm;

export function hasManagedCalloutAfter(content: string, offset: number) {
  const header = content.slice(offset).replace(/^[\s>]*/, "");
  return (
    header.startsWith(CALLOUT_MARKER) ||
    header.startsWith(LEGACY_CALLOUT_HEADER)
  );
}

/**
 * Pad the text to insert before the given index, ensuring there are blank
 * lines before and after (prefixed with an optional string).
 *
 * This properly positions a callout added after an embed, with space above and
 * below, and avoids it accidentally joining with another callout. The prefix
 * is used to correctly handle nested callouts.
 */
export function padWithBlankLines(
  original: string,
  toInsert: string,
  index: number,
  blankLinePrefix = "",
) {
  const beforePosition = original.slice(0, index);
  const afterPosition = original.slice(index);
  const prefix = blankLinePrefix.trimEnd();

  let newlinesBefore: string;
  if (beforePosition.endsWith(`\n${prefix}\n`)) {
    newlinesBefore = "";
  } else if (beforePosition.endsWith("\n")) {
    newlinesBefore = `${prefix}\n`;
  } else if (prefix && beforePosition.endsWith(`\n${prefix}`)) {
    newlinesBefore = "\n";
  } else {
    newlinesBefore = `\n${prefix}\n`;
  }

  let newlinesAfter: string;
  if (afterPosition.startsWith(`\n${prefix}\n`)) {
    newlinesAfter = "";
  } else if (afterPosition.startsWith("\n")) {
    newlinesAfter = `\n${prefix}`;
  } else if (prefix && afterPosition.startsWith(`${prefix}\n`)) {
    newlinesAfter = "\n";
  } else {
    newlinesAfter = `\n${prefix}\n`;
  }

  return newlinesBefore + toInsert + newlinesAfter;
}

/**
 * Format extracted Markdown as a callout (with relevant prefix and padding)
 */
export function formatCalloutToInsert(
  markdown: string,
  content: string,
  embedStart: number,
  embedEnd: number,
) {
  // Get contents of line before embed
  const lastNewline = content.lastIndexOf("\n", embedStart);
  const startOfLine = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineBeforeEmbed = content.slice(startOfLine, embedStart);

  // Find initial whitespace and `>` characters
  const linePrefix = lineBeforeEmbed.match(/^[\s>]*/)?.[0] ?? "";

  let text = [
    `> ${CALLOUT_MARKER} ${t("callouts.title")}`,
    markdown.replace(/^/gm, `> `),
  ].join("\n");

  // Add existing prefix to all lines. This will properly format the new
  // Markdown, even when used within nested callouts.
  text = text.replace(/^/gm, linePrefix);

  // Remove trailing whitespace
  text = text.replace(/\s+$/gm, "");

  return padWithBlankLines(content, text, embedEnd, linePrefix);
}

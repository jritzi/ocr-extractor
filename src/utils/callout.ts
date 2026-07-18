import { resources, t } from "../i18n";
import { assert } from "./assert";

/** Stable marker used for callouts managed by this plugin */
export const CALLOUT_MARKER = "[!ocr-extractor]-";

/** Matches a full callout header line */
export const CALLOUT_HEADER_REGEX = /^([ \t>]*\[!ocr-extractor]-) (.*)$/gm;

/** Callout titles in all supported languages */
export const CALLOUT_TITLES: ReadonlySet<string> = new Set(
  Object.values(resources).map((locale) => locale.translation.callouts.title),
);

/** Header before the custom callout type was added */
export const LEGACY_CALLOUT_HEADER = "[!summary]- Extracted text";

/** Matches a full legacy callout header (used by old plugin versions) */
export const LEGACY_CALLOUT_HEADER_REGEX =
  /^([ \t>]*)\[!summary]- Extracted text$/gm;

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
  newline = "\n",
) {
  const beforePosition = original.slice(0, index);
  const afterPosition = original.slice(index);
  const prefix = blankLinePrefix.trimEnd();

  let newlinesBefore: string;
  if (beforePosition.endsWith(`${newline}${prefix}${newline}`)) {
    newlinesBefore = "";
  } else if (beforePosition.endsWith(newline)) {
    newlinesBefore = `${prefix}${newline}`;
  } else if (prefix && beforePosition.endsWith(`${newline}${prefix}`)) {
    newlinesBefore = newline;
  } else {
    newlinesBefore = `${newline}${prefix}${newline}`;
  }

  let newlinesAfter: string;
  if (afterPosition.startsWith(`${newline}${prefix}${newline}`)) {
    newlinesAfter = "";
  } else if (afterPosition.startsWith(newline)) {
    newlinesAfter = `${newline}${prefix}`;
  } else if (prefix && afterPosition.startsWith(`${prefix}${newline}`)) {
    newlinesAfter = newline;
  } else {
    newlinesAfter = `${newline}${prefix}${newline}`;
  }

  return newlinesBefore + toInsert + newlinesAfter;
}

/**
 * Format extracted Markdown as a callout (with relevant prefix and padding).
 * `markdown` must use \n line endings (the formatted callout's line endings
 * will be normalized to match the line endings of `content`).
 */
export function formatCalloutToInsert(
  markdown: string,
  content: string,
  embedStart: number,
  embedEnd: number,
) {
  assert(!markdown.includes("\r"), "Markdown must use \n line endings");

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

  // Remove trailing spaces and tabs from each line
  text = text.replace(/[ \t]+$/gm, "");

  // Match the note's existing line endings
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  if (newline !== "\n") {
    text = text.replaceAll("\n", newline);
  }

  return padWithBlankLines(content, text, embedEnd, linePrefix, newline);
}

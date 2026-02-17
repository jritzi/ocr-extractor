import { t } from "../i18n";

/** Stable marker used for callouts managed by this plugin */
const CALLOUT_MARKER = "[!ocr-extractor]-";

/** Header before the custom callout type was added */
const LEGACY_CALLOUT_HEADER = "[!summary]- Extracted text";

export function isManagedCallout(text: string) {
  return (
    text.startsWith(CALLOUT_MARKER) || text.startsWith(LEGACY_CALLOUT_HEADER)
  );
}

export function migrateLegacyCallouts(content: string) {
  return content.replaceAll(
    LEGACY_CALLOUT_HEADER,
    `${CALLOUT_MARKER} ${t("callouts.title")}`,
  );
}

/**
 * Insert text in a string before the given index, ensuring there are blank lines
 * before and after the new text (prefixed with an optional string).
 *
 * This will properly position a callout added after an embed, with space above
 * and below, and avoiding it accidentally joining with another callout. The
 * prefix can be used to correctly handle nested callouts.
 */
export function insertWithBlankLines(
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

  return (
    beforePosition + newlinesBefore + toInsert + newlinesAfter + afterPosition
  );
}

/**
 * Format extracted Markdown as a callout, including relevant line prefix.
 */
export function formatCalloutToInsert(
  markdown: string,
  fileContent: string,
  embedStartPosition: number,
) {
  // Get contents of line before embed
  const lastNewline = fileContent.lastIndexOf("\n", embedStartPosition);
  const startOfLine = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineBeforeEmbed = fileContent.slice(startOfLine, embedStartPosition);

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

  return { text, linePrefix };
}

import type { LinkCache } from "obsidian";
import { resources, t } from "../i18n";
import { assert } from "./assert";

/** Stable marker used for callouts managed by this plugin */
export const CALLOUT_MARKER = "[!ocr-extractor]-";

/** Matches a full callout header line */
export const CALLOUT_HEADER_REGEX = /^([ \t>]*\[!ocr-extractor]-) (.*)$/gm;

/** Matches a full legacy callout header (used by old plugin versions) */
export const LEGACY_CALLOUT_HEADER_REGEX =
  /^([ \t>]*)\[!summary]- Extracted text$/gm;

/** Header before the custom callout type was added */
const LEGACY_CALLOUT_HEADER = "[!summary]- Extracted text";

/** Callout titles in all supported languages */
export const CALLOUT_TITLES: ReadonlySet<string> = new Set(
  Object.values(resources).map((locale) => locale.translation.callouts.title),
);

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
  const trailingWhitespace = /^[ \t]*/.exec(afterPosition)?.[0] ?? "";

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
  if (
    trailingWhitespace &&
    afterPosition.startsWith(newline, trailingWhitespace.length)
  ) {
    newlinesAfter = `${newline}${prefix}`;
  } else if (afterPosition.startsWith(`${newline}${prefix}${newline}`)) {
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

export function formatCalloutToInsert(
  markdown: string,
  content: string,
  embedStart: number,
  embedEnd: number,
) {
  // Get contents of line before embed
  const startOfLine = content.lastIndexOf("\n", embedStart - 1) + 1;
  const lineBeforeEmbed = content.slice(startOfLine, embedStart);

  // Find initial whitespace and `>` characters
  const linePrefix = lineBeforeEmbed.match(/^[\s>]*/)?.[0] ?? "";

  const newline = detectNewline(content);
  const text = formatCallout(
    markdown,
    t("callouts.title"),
    linePrefix,
  ).replaceAll("\n", newline);

  return padWithBlankLines(content, text, embedEnd, linePrefix, newline);
}

export function formatCalloutsToAppend(
  callouts: readonly { markdown: string; title: string }[],
  content: string,
) {
  const newline = detectNewline(content);
  const text = callouts
    .map(({ markdown, title }) => formatCallout(markdown, title))
    .join("\n\n")
    .replaceAll("\n", newline);

  return padWithBlankLines(content, text, content.length, "", newline);
}

export function formatTitleWithLink(link: string) {
  return t("callouts.titleWithLink", { link });
}

export function titlesWithLinkInAllLanguages(link: string) {
  return new Set(
    Object.keys(resources).map((lng) =>
      t("callouts.titleWithLink", { link, lng }),
    ),
  );
}

export function findCalloutHeaderLinks(
  content: string,
  links: readonly LinkCache[],
) {
  return links.filter((link) => {
    const { start } = link.position;
    const lineStart = content.lastIndexOf("\n", start.offset - 1) + 1;
    const lineBeforeLink = content.slice(lineStart, start.offset);
    return lineBeforeLink
      .replace(/^[ \t>]*/, "")
      .startsWith(`${CALLOUT_MARKER} `);
  });
}

export function hasManagedEmbedCalloutAfter(
  content: string,
  offset: number,
  links: readonly LinkCache[],
) {
  const headerOffset = content.slice(offset).search(/[^\s>]/);
  if (headerOffset === -1) return false;

  const headerStart = offset + headerOffset;
  const header = content.slice(headerStart);
  if (
    !header.startsWith(CALLOUT_MARKER) &&
    !header.startsWith(LEGACY_CALLOUT_HEADER)
  ) {
    return false;
  }

  // A callout with a header link belongs to the link, not an embed above it
  const lineEnd = content.indexOf("\n", headerStart);
  const headerEnd = lineEnd === -1 ? content.length : lineEnd;
  return !links.some(({ position }) => {
    const { offset: linkStart } = position.start;
    return linkStart > headerStart && linkStart < headerEnd;
  });
}

function formatCallout(markdown: string, title: string, linePrefix = "") {
  assert(!markdown.includes("\r"), "Markdown must use \\n line endings");

  const text = [
    `> ${CALLOUT_MARKER} ${title}`,
    markdown.replace(/^/gm, `> `),
  ].join("\n");

  // Add existing prefix to all lines. This will properly format the new
  // Markdown, even when used within nested callouts.
  const prefixed = text.replace(/^/gm, linePrefix);

  // Remove trailing spaces and tabs from each line
  return prefixed.replace(/[ \t]+$/gm, "");
}

function detectNewline(content: string) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

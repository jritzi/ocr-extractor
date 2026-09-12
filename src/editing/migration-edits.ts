import type { ReferenceCache } from "obsidian";
import { t } from "../i18n";
import { assert } from "../utils/assert";
import {
  CALLOUT_HEADER_REGEX,
  CALLOUT_MARKER,
  CALLOUT_TITLES,
  findCalloutHeaderLinks,
  formatTitleWithLink,
  LEGACY_CALLOUT_HEADER_REGEX,
  parseLinkFromTitle,
} from "../callouts";
import type { PlannedEdit } from "./edit";

/**
 * Build edits updating callout headers written by an old plugin version or in
 * another language.
 */
export function buildMigrationEdits(content: string, links: ReferenceCache[]) {
  const edits: PlannedEdit[] = [];
  const currentTitle = t("callouts.title");
  const headerLinks = findCalloutHeaderLinks(content, links);
  const headerLinkMarkups = new Set(headerLinks.map((link) => link.original));

  for (const match of content.matchAll(LEGACY_CALLOUT_HEADER_REGEX)) {
    const [line, prefix] = match;
    assert(match.index !== undefined, "matchAll matches always have an index");
    edits.push({
      from: match.index,
      to: match.index + line.length,
      expectedText: line,
      replacement: `${prefix}${CALLOUT_MARKER} ${currentTitle}`,
    });
  }

  for (const match of content.matchAll(CALLOUT_HEADER_REGEX)) {
    const [line, beforeTitle, title] = match;
    const migratedTitle = buildMigratedTitle(
      title,
      currentTitle,
      headerLinkMarkups,
    );
    if (migratedTitle === null) continue;
    assert(match.index !== undefined, "matchAll matches always have an index");
    edits.push({
      from: match.index,
      to: match.index + line.length,
      expectedText: line,
      replacement: `${beforeTitle} ${migratedTitle}`,
    });
  }

  return edits;
}

function buildMigratedTitle(
  title: string,
  currentTitle: string,
  headerLinkMarkups: ReadonlySet<string>,
) {
  if (title === currentTitle) return null;
  if (CALLOUT_TITLES.has(title)) return currentTitle;

  const link = parseLinkFromTitle(title, headerLinkMarkups);
  if (link === null) return null;
  const titleWithLink = formatTitleWithLink(link);
  return titleWithLink === title ? null : titleWithLink;
}

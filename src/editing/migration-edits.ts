import type { LinkCache } from "obsidian";
import { t } from "../i18n";
import { assert } from "es-toolkit";
import {
  CALLOUT_HEADER_REGEX,
  CALLOUT_MARKER,
  CALLOUT_TITLES,
  findCalloutHeaderLinks,
  formatTitleWithLink,
  LEGACY_CALLOUT_HEADER_REGEX,
  titlesWithLinkInAllLanguages,
} from "../utils/callout";
import type { PlannedEdit } from "./edit";

/**
 * Build edits updating callout headers written by an old plugin version or in
 * another language.
 */
export function buildMigrationEdits(content: string, links: LinkCache[]) {
  const edits: PlannedEdit[] = [];
  const currentTitle = t("callouts.title");
  const headerLinks = findCalloutHeaderLinks(content, links);
  const headerLinkMarkups = headerLinks.map((link) => link.original);

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
  headerLinkMarkups: readonly string[],
) {
  if (title === currentTitle) return null;
  if (CALLOUT_TITLES.has(title)) return currentTitle;

  const link = headerLinkMarkups.find((markup) =>
    titlesWithLinkInAllLanguages(markup).has(title),
  );
  if (link === undefined) return null;
  const titleWithLink = formatTitleWithLink(link);
  return titleWithLink === title ? null : titleWithLink;
}

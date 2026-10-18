import { partition } from "es-toolkit";
import type { LinkCache, Reference } from "obsidian";
import { filterLinksByProperties } from "../utils/property";
import {
  findCalloutHeaderLinks,
  formatPropertyCallouts,
  formatTitleWithLink,
} from "../utils/callout";
import type { PlannedEdit } from "./edit";
import type { PendingResults, PlanContext } from "./plan";

export function buildPropertyCallouts(
  content: string,
  contentAfterEdits: string,
  context: Omit<PlanContext, "links">,
  currentBodyLinks: readonly LinkCache[],
  staleBodyLinks: readonly LinkCache[],
  results: PendingResults,
) {
  const propertyLinks = new Map(
    filterLinksByProperties(
      context.frontmatterLinks,
      context.propertiesToExtractFrom,
    ).map((link) => [link.original, link]),
  );
  const staleLinks: Reference[] = [];

  const pending = [...results].flatMap(([markup, result]) => {
    const link = propertyLinks.get(markup);
    return result.kind === "propertyLink" && link ? [{ link, result }] : [];
  });
  if (pending.length === 0) {
    return { edit: null, resultsToInsert: [], staleLinks, propertyLinks };
  }

  const headerLinks = findCalloutHeaderLinks(content, currentBodyLinks);
  // A callout may have a header link the cache hasn't caught up with
  staleLinks.push(...staleBodyLinks);

  const extractedPaths = new Set<string>();
  for (const headerLink of headerLinks) {
    const path = context.linkPaths.get(headerLink.link);
    if (path !== undefined) extractedPaths.add(path);
  }

  const { frontmatterPosition } = context;
  const frontmatterText = frontmatterPosition
    ? content.slice(
        frontmatterPosition.start.offset,
        frontmatterPosition.end.offset,
      )
    : "";

  const [inFrontmatter, missing] = partition(pending, ({ link }) =>
    frontmatterText.includes(link.original),
  );
  staleLinks.push(...missing.map(({ link }) => link));
  const toInsert = inFrontmatter.filter(
    ({ result }) => !extractedPaths.has(result.path),
  );

  if (staleLinks.length > 0 || toInsert.length === 0) {
    return { edit: null, resultsToInsert: [], staleLinks, propertyLinks };
  }

  const callouts = toInsert.map(({ result }) => ({
    markdown: result.markdown,
    title: formatTitleWithLink(result.attachmentLink),
  }));
  const edit: PlannedEdit = {
    from: content.length,
    to: content.length,
    expectedText: "",
    replacement: formatPropertyCallouts(callouts, contentAfterEdits),
  };

  return {
    edit,
    resultsToInsert: toInsert.map(({ link }) => link.original),
    staleLinks,
    propertyLinks,
  };
}

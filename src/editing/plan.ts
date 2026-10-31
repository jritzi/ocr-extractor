import { partition } from "es-toolkit";
import { EmbedCache, Reference } from "obsidian";
import {
  isAtCachedPosition,
  type NoteCache,
  type ReferenceMarkup,
} from "../utils/metadata-cache";
import {
  applyEditPlanToString,
  assertEditsSortedAndDisjoint,
  PlannedEdit,
} from "./edit";
import { buildEmbedCallouts } from "./embed-callouts";
import { buildPropertyCallouts } from "./property-callouts";
import { buildMigrationEdits } from "./migration-edits";

export type PendingResult =
  | { kind: "embed"; markdown: string }
  | {
      kind: "propertyLink";
      markdown: string;
      /** Resolved path of the linked attachment */
      path: string;
      /** Link to the attachment for the callout header */
      attachmentLink: string;
    };

/** Extracted Markdown per reference, keyed by its markup (`original`) */
export type PendingResults = Map<ReferenceMarkup, PendingResult>;

export interface PlanContext extends NoteCache {
  propertiesToExtractFrom: readonly string[];
  /** Path of the file each resolved body link points to, keyed by link text */
  linkPaths: ReadonlyMap<string, string>;
  /**
   * Every string inside the note's current property values, keyed the same way
   * as a property link's `key` (null if the frontmatter doesn't parse)
   */
  frontmatterStrings: ReadonlyMap<string, string> | null;
}

export interface EditPlan {
  edits: PlannedEdit[];

  /** References with a callout insertion in `edits` */
  resultsToInsert: ReferenceMarkup[];

  /**
   * Embeds where the cache hasn't caught up yet with the current content, so we
   * should retry once the note settles.
   */
  staleEmbeds: EmbedCache[];

  /**
   * Links where the cache hasn't caught up yet with the current content, so we
   * should retry once the note settles.
   */
  staleLinks: Reference[];

  /**
   * References with no match found in the note (edited or removed by the user).
   * Empty while anything is still stale.
   */
  orphanedResults: ReferenceMarkup[];
}

/**
 * Build a plan with all the edits required for a note (callout insertions
 * plus migrations, sorted by offset).
 */
export function buildEditPlan(
  content: string,
  context: PlanContext,
  results: PendingResults,
) {
  const [currentBodyLinks, staleBodyLinks] = partition(context.links, (link) =>
    isAtCachedPosition(link, content),
  );

  const { edits, resultsToInsert, staleEmbeds } = buildEmbedCallouts(
    content,
    context.embeds,
    currentBodyLinks,
    staleBodyLinks,
    results,
  );

  edits.push(...buildMigrationEdits(content, currentBodyLinks));
  edits.sort((a, b) => a.from - b.from);

  const propertyCallouts = buildPropertyCallouts(
    content,
    applyEditPlanToString(content, edits),
    context,
    currentBodyLinks,
    staleBodyLinks,
    results,
  );
  // Append only in an attempt that finishes, since a retry can't recognize a
  // header link the cache hasn't indexed yet
  if (propertyCallouts.edit && staleEmbeds.length === 0) {
    edits.push(propertyCallouts.edit);
    resultsToInsert.push(...propertyCallouts.resultsToInsert);
  }

  const orphanedResults: ReferenceMarkup[] = [];

  // A missing reference is only trustworthy once nothing is stale, since cache
  // lag can briefly hide a reference that is not actually gone
  if (staleEmbeds.length === 0 && propertyCallouts.staleLinks.length === 0) {
    const cachedEmbedMarkup = new Set(
      context.embeds.map((embed) => embed.original),
    );
    for (const [markup, result] of results) {
      const cached =
        result.kind === "embed"
          ? cachedEmbedMarkup.has(markup)
          : propertyCallouts.propertyLinks.has(markup);
      if (!cached) orphanedResults.push(markup);
    }
  }

  assertEditsSortedAndDisjoint(edits);

  return {
    edits,
    resultsToInsert,
    staleEmbeds,
    staleLinks: propertyCallouts.staleLinks,
    orphanedResults,
  };
}

import { EmbedCache } from "obsidian";
import {
  CALLOUT_HEADER_REGEX,
  CALLOUT_MARKER,
  formatCalloutToInsert,
  hasManagedCalloutAfter,
  LEGACY_CALLOUT_HEADER,
} from "../utils/callout";
import { assert } from "../utils/assert";
import { t } from "../i18n";

/** Extracted Markdown per embed, keyed by embed markup (`original`) */
export type EmbedsToMarkdown = Map<string, string | null>;

export interface PlannedEdit {
  from: number;
  to: number;
  replacement: string;

  /** Text expected at `[from, to)`, to validate before replacing */
  expectedText: string;
}

export interface EditPlan {
  edits: PlannedEdit[];

  /**
   * Embeds where the cache hasn't caught up yet with the current content, so we
   * should retry once the note settles.
   */
  staleEmbeds: EmbedCache[];

  /**
   * Markup (`original`) of embeds with no match found in the note content
   * (edited or removed by the user). Empty while any embed is still stale.
   */
  orphanedResults: string[];
}

export function selectEmbedsToProcess(content: string, embeds: EmbedCache[]) {
  const seen = new Set<string>();
  return embeds.filter((embed) => {
    if (hasManagedCalloutAfter(content, embed.position.end.offset)) {
      return false;
    }
    if (seen.has(embed.original)) return false;
    seen.add(embed.original);
    return true;
  });
}

/**
 * Build a plan with all the edits required for a note (callout insertions
 * plus migrations).
 */
export function buildEditPlan(
  content: string,
  embeds: EmbedCache[],
  embedsToMarkdown: EmbedsToMarkdown,
) {
  const edits: PlannedEdit[] = [];
  const staleEmbeds: EmbedCache[] = [];

  for (const embed of embeds) {
    const markdown = embedsToMarkdown.get(embed.original);
    if (!markdown) continue;

    const start = embed.position.start.offset;
    const end = embed.position.end.offset;

    if (content.slice(start, end) !== embed.original) {
      staleEmbeds.push(embed);
      continue;
    }

    if (hasManagedCalloutAfter(content, end)) continue;

    const insertText = formatCalloutToInsert(markdown, content, start, end);
    edits.push({
      from: start,
      to: end,
      expectedText: embed.original,
      replacement: embed.original + insertText,
    });
  }

  const cachedEmbedTexts = new Set(embeds.map((embed) => embed.original));
  const orphanedResults: string[] = [];

  // A missing embed is only trustworthy once nothing is stale, since cache lag
  // can briefly hide an embed that is not actually gone
  if (staleEmbeds.length === 0) {
    for (const [text, markdown] of embedsToMarkdown) {
      if (markdown && !cachedEmbedTexts.has(text)) {
        orphanedResults.push(text);
      }
    }
  }

  edits.push(...buildMigrationEdits(content));

  return { edits, staleEmbeds, orphanedResults };
}

/**
 * Build edits updating callout headers from old plugin versions or not in the
 * current language.
 */
export function buildMigrationEdits(content: string) {
  const edits: PlannedEdit[] = [];
  const currentTitle = t("callouts.title");

  let index = content.indexOf(LEGACY_CALLOUT_HEADER);
  while (index !== -1) {
    edits.push({
      from: index,
      to: index + LEGACY_CALLOUT_HEADER.length,
      expectedText: LEGACY_CALLOUT_HEADER,
      replacement: `${CALLOUT_MARKER} ${currentTitle}`,
    });
    index = content.indexOf(
      LEGACY_CALLOUT_HEADER,
      index + LEGACY_CALLOUT_HEADER.length,
    );
  }

  for (const match of content.matchAll(CALLOUT_HEADER_REGEX)) {
    const [line, beforeTitle] = match;
    const replacement = `${beforeTitle} ${currentTitle}`;
    if (line === replacement) continue;
    assert(match.index !== undefined, "matchAll matches always have an index");
    edits.push({
      from: match.index,
      to: match.index + line.length,
      expectedText: line,
      replacement,
    });
  }

  return edits;
}

/**
 * Apply a plan's edits to a string in descending offset order, so earlier
 * offsets stay valid as later ones are applied.
 */
export function applyEditPlanToString(content: string, edits: PlannedEdit[]) {
  const descending = [...edits].sort((a, b) => b.from - a.from);
  let newContent = content;

  for (const edit of descending) {
    assert(
      newContent.slice(edit.from, edit.to) === edit.expectedText,
      "Built from this content and applied in reverse, so text must match",
    );
    newContent =
      newContent.slice(0, edit.from) +
      edit.replacement +
      newContent.slice(edit.to);
  }

  return newContent;
}

/**
 * Shrink an edit to the smallest part that actually changes by trimming the
 * prefix and suffix shared by its expected and replacement text (so an editor
 * transaction leaves the surrounding text untouched). Only apply it to content
 * already confirmed to match the edit plan.
 */
export function toMinimalChange(edit: PlannedEdit) {
  const { expectedText, replacement } = edit;
  const maxTrim = Math.min(expectedText.length, replacement.length);

  let prefixLength = 0;
  while (
    prefixLength < maxTrim &&
    expectedText[prefixLength] === replacement[prefixLength]
  ) {
    prefixLength++;
  }

  let suffixLength = 0;
  while (
    suffixLength < maxTrim - prefixLength &&
    expectedText[expectedText.length - 1 - suffixLength] ===
      replacement[replacement.length - 1 - suffixLength]
  ) {
    suffixLength++;
  }

  return {
    from: edit.from + prefixLength,
    to: edit.to - suffixLength,
    text: replacement.slice(prefixLength, replacement.length - suffixLength),
  };
}

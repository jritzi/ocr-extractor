import type { EmbedCache, LinkCache } from "obsidian";
import { isAtCachedPosition } from "../utils/metadata-cache";
import {
  formatEmbedCallout,
  hasManagedEmbedCalloutAfter,
} from "../utils/callout";
import type { PlannedEdit } from "./edit";
import type { PendingResults } from "./plan";

interface EmbedEdit {
  embed: EmbedCache;
  edit: PlannedEdit;
}

export function buildEmbedCallouts(
  content: string,
  embeds: readonly EmbedCache[],
  currentBodyLinks: readonly LinkCache[],
  staleBodyLinks: readonly LinkCache[],
  results: PendingResults,
) {
  const candidates: EmbedEdit[] = [];
  const staleEmbeds: EmbedCache[] = [];

  for (const embed of embeds) {
    const result = results.get(embed.original);
    if (result?.kind !== "embed") continue;

    if (!isAtCachedPosition(embed, content)) {
      staleEmbeds.push(embed);
      continue;
    }

    const start = embed.position.start.offset;
    const end = embed.position.end.offset;

    if (hasManagedEmbedCalloutAfter(content, end, currentBodyLinks)) {
      // The callout may have a header link the cache hasn't caught up with
      if (staleBodyLinks.length > 0) staleEmbeds.push(embed);
      continue;
    }

    const insertText = formatEmbedCallout(result.markdown, content, start, end);
    candidates.push({
      embed,
      edit: {
        from: start,
        to: end,
        expectedText: embed.original,
        replacement: embed.original + insertText,
      },
    });
  }

  const { edits, resultsToInsert, collidingEmbeds } =
    splitCollidingEdits(candidates);
  staleEmbeds.push(...collidingEmbeds);

  return { edits, resultsToInsert, staleEmbeds };
}

/**
 * Split candidate edits into disjoint edits to plan and colliding embeds to
 * report as stale. Validated edits can only collide when stale cache positions
 * collapse onto the same occurrence of a duplicated embed, so a collision is
 * treated like any other stale embed and retried once the note settles.
 */
function splitCollidingEdits(candidates: EmbedEdit[]) {
  const sorted = [...candidates].sort((a, b) => a.edit.from - b.edit.from);
  const colliding = new Set<EmbedEdit>();

  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index - 1].edit.to > sorted[index].edit.from) {
      colliding.add(sorted[index - 1]);
      colliding.add(sorted[index]);
    }
  }

  const planned = sorted.filter((candidate) => !colliding.has(candidate));

  return {
    edits: planned.map((candidate) => candidate.edit),
    resultsToInsert: planned.map((candidate) => candidate.embed.original),
    collidingEmbeds: [...colliding].map((candidate) => candidate.embed),
  };
}

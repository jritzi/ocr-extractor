import { uniqBy } from "es-toolkit";
import type { EmbedCache, LinkCache } from "obsidian";
import { hasManagedEmbedCalloutAfter } from "../utils/callout";

export function embedsToExtract(
  content: string,
  embeds: readonly EmbedCache[],
  links: readonly LinkCache[],
) {
  return uniqBy(
    embeds.filter(
      (embed) =>
        !hasManagedEmbedCalloutAfter(content, embed.position.end.offset, links),
    ),
    (embed) => embed.original,
  );
}

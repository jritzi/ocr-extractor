import type { EmbedCache, LinkCache } from "obsidian";
import { hasManagedEmbedCalloutAfter } from "../utils/callout";

export function embedsToExtract(
  content: string,
  embeds: readonly EmbedCache[],
  links: readonly LinkCache[],
) {
  const seen = new Set<string>();
  return embeds.filter((embed) => {
    if (
      hasManagedEmbedCalloutAfter(content, embed.position.end.offset, links)
    ) {
      return false;
    }
    if (seen.has(embed.original)) return false;
    seen.add(embed.original);
    return true;
  });
}

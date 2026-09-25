import type { EmbedCache } from "obsidian";
import { hasManagedCalloutAfter } from "../callouts";

export function embedsToExtract(
  content: string,
  embeds: readonly EmbedCache[],
) {
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

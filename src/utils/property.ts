import type { FrontmatterLinkCache } from "obsidian";

/**
 * Normalize a property name in the same way Obsidian does (case-insensitive
 * but without trimming whitespace).
 */
export function normalizePropertyName(name: string) {
  return name.toLowerCase();
}

export function filterLinksByProperties(
  links: readonly FrontmatterLinkCache[],
  properties: readonly string[],
) {
  const normalizedProperties = properties.map(normalizePropertyName);
  return links.filter((link) => {
    const key = normalizePropertyName(link.key);
    return normalizedProperties.some(
      (property) =>
        key === property ||
        // Match `attachment.0` (list) or `attachment.scan` (nested)
        key.startsWith(`${property}.`),
    );
  });
}

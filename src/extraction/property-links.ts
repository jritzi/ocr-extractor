import type { App, FrontmatterLinkCache } from "obsidian";
import type { NoteSnapshot } from "../reading/note-snapshot";
import { findCalloutHeaderLinks } from "../callouts";
import {
  attachmentPath,
  isObsidianNative,
  resolveLinkedFile,
} from "../utils/file";
import { filterLinksByProperties } from "../utils/property";

export function propertyLinksToExtract(
  app: App,
  notePath: string,
  { content, cache }: NoteSnapshot,
  propertiesToExtractFrom: readonly string[],
) {
  const propertyLinks = filterLinksByProperties(
    cache.frontmatterLinks,
    propertiesToExtractFrom,
  );
  if (propertyLinks.length === 0) return [];

  const pathsExtractedElsewhere = new Set<string>();
  for (const reference of [
    ...cache.embeds,
    ...findCalloutHeaderLinks(content, cache.links),
  ]) {
    const file = resolveLinkedFile(app, reference.link, notePath);
    if (file) pathsExtractedElsewhere.add(file.path);
  }

  const seen = new Set<string>();
  const linksToExtract: FrontmatterLinkCache[] = [];

  for (const propertyLink of propertyLinks) {
    const file = resolveLinkedFile(app, propertyLink.link, notePath);
    const path = attachmentPath(file, propertyLink.link);
    if (seen.has(path)) continue;
    seen.add(path);

    if (
      file &&
      (isObsidianNative(file) || pathsExtractedElsewhere.has(file.path))
    ) {
      continue;
    }

    linksToExtract.push(propertyLink);
  }

  return linksToExtract;
}

import { App, TFile } from "obsidian";
import type {
  EmbedCache,
  FrontmatterLinkCache,
  LinkCache,
  Pos,
  ReferenceCache,
} from "obsidian";

/** An embed or link exactly as written in the note (`original`) */
export type ReferenceMarkup = string;

export interface NoteCache {
  embeds: EmbedCache[];
  links: LinkCache[];
  frontmatterLinks: FrontmatterLinkCache[];
  frontmatterPosition: Pos | undefined;
}

export function getNoteCache(app: App, file: TFile): NoteCache {
  const cache = app.metadataCache.getFileCache(file);
  return {
    embeds: cache?.embeds ?? [],
    links: cache?.links ?? [],
    frontmatterLinks: cache?.frontmatterLinks ?? [],
    frontmatterPosition: cache?.frontmatterPosition,
  };
}

/**
 * Check whether a reference still matches the note content (if not, the cache
 * hasn't caught up yet).
 */
export function isAtCachedPosition(reference: ReferenceCache, content: string) {
  const { start, end } = reference.position;
  return reference.original === content.slice(start.offset, end.offset);
}

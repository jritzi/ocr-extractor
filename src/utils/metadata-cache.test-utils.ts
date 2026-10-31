import type {
  EmbedCache,
  FrontmatterLinkCache,
  LinkCache,
  Loc,
  Pos,
} from "obsidian";

/** Wikilink markup, capturing the link and the alias */
const WIKILINK_REGEX = /^!?\[\[(.*?)(?:\|(.*))?]]$/;

export function positionOf(content: string, text: string, occurrence = 0): Pos {
  let offset = -1;
  for (let i = 0; i <= occurrence; i++) {
    offset = content.indexOf(text, offset + 1);
    if (offset === -1) throw new Error(`String not found: ${text}`);
  }

  return {
    start: locationOf(content, offset),
    end: locationOf(content, offset + text.length),
  };
}

export function buildEmbed(
  content: string,
  original: string,
  occurrence = 0,
): EmbedCache {
  return {
    ...parseWikilink(original),
    original,
    position: positionOf(content, original, occurrence),
  };
}

export function buildLink(
  content: string,
  original: string,
  occurrence = 0,
): LinkCache {
  return {
    ...parseWikilink(original),
    original,
    position: positionOf(content, original, occurrence),
  };
}

export function buildPropertyLink(
  original: string,
  key: string,
): FrontmatterLinkCache {
  return { key, ...parseWikilink(original), original };
}

function parseWikilink(markup: string) {
  const match = WIKILINK_REGEX.exec(markup);
  if (!match) {
    throw new Error(`Only wikilink markup is supported: ${markup}`);
  }

  const [, link, displayText] = match;
  return displayText === undefined ? { link } : { link, displayText };
}

function locationOf(content: string, offset: number): Loc {
  const lines = content.slice(0, offset).split("\n");
  return {
    line: lines.length - 1,
    col: lines[lines.length - 1].length,
    offset,
  };
}

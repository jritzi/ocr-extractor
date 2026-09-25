import { describe, expect, it } from "vitest";
import { buildEmbed } from "../utils/metadata-cache.test-utils";
import { embedsToExtract } from "./embeds";

const EMBED = "![[file.pdf]]";
const CALLOUT = "> [!ocr-extractor]- Extracted text\n> Extracted";

describe("embeds.ts", () => {
  describe("embedsToExtract", () => {
    it("returns embeds in document order", () => {
      const content = `${EMBED}\n\n![[other.png]]`;
      const embeds = [
        buildEmbed(content, EMBED),
        buildEmbed(content, "![[other.png]]"),
      ];

      expect(embedsToExtract(content, embeds)).toEqual(embeds);
    });

    it("skips embeds already followed by a managed callout", () => {
      const content = `${EMBED}\n\n${CALLOUT}\n\n![[other.png]]`;
      const embeds = [
        buildEmbed(content, EMBED),
        buildEmbed(content, "![[other.png]]"),
      ];

      expect(embedsToExtract(content, embeds)).toEqual([embeds[1]]);
    });

    it("deduplicates repeated embeds, keeping the first occurrence", () => {
      const content = `${EMBED}\n\ntext\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];

      expect(embedsToExtract(content, embeds)).toEqual([embeds[0]]);
    });

    it("keeps a later occurrence when the first already has a callout", () => {
      const content = `${EMBED}\n\n${CALLOUT}\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];

      expect(embedsToExtract(content, embeds)).toEqual([embeds[1]]);
    });

    it("keeps an embed with a size separate from a plain embed of the same file", () => {
      const sized = "![[file.pdf|300]]";
      const content = `${EMBED}\n\n${sized}`;
      const embeds = [buildEmbed(content, EMBED), buildEmbed(content, sized)];

      expect(embedsToExtract(content, embeds)).toEqual(embeds);
    });
  });
});

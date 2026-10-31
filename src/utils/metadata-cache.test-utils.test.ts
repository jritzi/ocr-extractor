import { describe, expect, it } from "vitest";
import {
  buildEmbed,
  buildLink,
  buildPropertyLink,
  positionOf,
} from "./metadata-cache.test-utils";

describe("metadata-cache.test-utils.ts", () => {
  describe("positionOf", () => {
    it("returns the position details for the given text", () => {
      const content = "# Heading\n\nSee ![[a.pdf]] here";
      expect(positionOf(content, "![[a.pdf]]")).toEqual({
        start: { line: 2, col: 4, offset: 15 },
        end: { line: 2, col: 14, offset: 25 },
      });
    });

    it("returns the right position for a second occurrence", () => {
      const content = "![[a.pdf]]\n![[a.pdf]]";
      expect(positionOf(content, "![[a.pdf]]", 1).start).toEqual({
        line: 1,
        col: 0,
        offset: 11,
      });
    });

    it("throws when the text is not in the content", () => {
      expect(() => positionOf("nothing here", "![[a.pdf]]")).toThrow();
    });
  });

  describe("buildEmbed", () => {
    it("strips the embed markup from the link", () => {
      const content = "![[dir/a.pdf]]";
      expect(buildEmbed(content, content).link).toBe("dir/a.pdf");
    });

    it("keeps a subpath in the link", () => {
      const content = "![[a.pdf#page=2]]";
      expect(buildEmbed(content, content).link).toBe("a.pdf#page=2");
    });

    it("splits an alias into the display text", () => {
      const content = "![[a.pdf|Scan]]";
      const embed = buildEmbed(content, content);
      expect(embed.link).toBe("a.pdf");
      expect(embed.displayText).toBe("Scan");
    });

    it("omits the display text without an alias", () => {
      const content = "![[a.pdf]]";
      expect(buildEmbed(content, content)).not.toHaveProperty("displayText");
    });

    it("throws on Markdown link syntax", () => {
      const content = "![sample](attachments/sample.pdf)";
      expect(() => buildEmbed(content, content)).toThrow();
    });

    it("returns the embed's position at the requested occurrence", () => {
      const content = "![[a.pdf]]\n![[a.pdf]]";
      expect(buildEmbed(content, "![[a.pdf]]", 1).position).toEqual(
        positionOf(content, "![[a.pdf]]", 1),
      );
    });
  });

  describe("buildLink", () => {
    it("returns a link at its position in the content", () => {
      const content = "See [[a.pdf]]";
      expect(buildLink(content, "[[a.pdf]]")).toEqual({
        link: "a.pdf",
        original: "[[a.pdf]]",
        position: positionOf(content, "[[a.pdf]]"),
      });
    });
  });

  describe("buildPropertyLink", () => {
    it("returns a property link under the given key", () => {
      expect(buildPropertyLink("[[a.pdf]]", "cover")).toEqual({
        key: "cover",
        link: "a.pdf",
        original: "[[a.pdf]]",
      });
    });
  });
});

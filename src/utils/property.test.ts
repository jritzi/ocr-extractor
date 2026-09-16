import { describe, expect, it } from "vitest";
import { FrontmatterLinkCache } from "obsidian";
import { filterLinksByProperties, normalizePropertyName } from "./property";

function buildLink(key: string, link = "file.pdf"): FrontmatterLinkCache {
  return { key, link, original: `[[${link}]]` };
}

describe("property.ts", () => {
  describe("normalizePropertyName", () => {
    it("converts the name to lowercase", () => {
      expect(normalizePropertyName("Attachment")).toBe("attachment");
    });

    it("keeps surrounding whitespace", () => {
      expect(normalizePropertyName(" Attachment ")).toBe(" attachment ");
    });
  });

  describe("filterLinksByProperties", () => {
    it("returns links under the given properties, in order", () => {
      const links = [
        buildLink("attachment", "a.pdf"),
        buildLink("cover", "cover.png"),
        buildLink("sources.0", "b.pdf"),
        buildLink("sources.1", "c.pdf"),
      ];

      expect(filterLinksByProperties(links, ["attachment", "sources"])).toEqual(
        [links[0], links[2], links[3]],
      );
    });

    it("uses case-insensitive matching", () => {
      const links = [buildLink("Attachment")];
      expect(filterLinksByProperties(links, ["ATTACHMENT"])).toEqual(links);
    });

    it("does not match a property name with surrounding whitespace", () => {
      const links = [buildLink("attachment")];
      expect(filterLinksByProperties(links, [" attachment "])).toEqual([]);
    });

    it("matches a property name containing a dot", () => {
      const links = [buildLink("my.file", "a.pdf"), buildLink("my.file.0")];
      expect(filterLinksByProperties(links, ["my.file"])).toEqual(links);
    });

    it("does not match a key by its last segment", () => {
      const links = [buildLink("meta.attachment")];
      expect(filterLinksByProperties(links, ["attachment"])).toEqual([]);
    });
  });
});

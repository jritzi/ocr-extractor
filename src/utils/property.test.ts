import { describe, expect, it } from "vitest";
import { filterLinksByProperties, normalizePropertyName } from "./property";
import { buildPropertyLink } from "./metadata-cache.test-utils";

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
        buildPropertyLink("[[a.pdf]]", "attachment"),
        buildPropertyLink("[[cover.png]]", "cover"),
        buildPropertyLink("[[b.pdf]]", "sources.0"),
        buildPropertyLink("[[c.pdf]]", "sources.1"),
      ];

      expect(filterLinksByProperties(links, ["attachment", "sources"])).toEqual(
        [links[0], links[2], links[3]],
      );
    });

    it("uses case-insensitive matching", () => {
      const links = [buildPropertyLink("[[file.pdf]]", "Attachment")];
      expect(filterLinksByProperties(links, ["ATTACHMENT"])).toEqual(links);
    });

    it("does not match a property name with surrounding whitespace", () => {
      const links = [buildPropertyLink("[[file.pdf]]", "attachment")];
      expect(filterLinksByProperties(links, [" attachment "])).toEqual([]);
    });

    it("matches a property name containing a dot", () => {
      const links = [
        buildPropertyLink("[[a.pdf]]", "my.file"),
        buildPropertyLink("[[file.pdf]]", "my.file.0"),
      ];
      expect(filterLinksByProperties(links, ["my.file"])).toEqual(links);
    });

    it("does not match a key by its last segment", () => {
      const links = [buildPropertyLink("[[file.pdf]]", "meta.attachment")];
      expect(filterLinksByProperties(links, ["attachment"])).toEqual([]);
    });
  });
});

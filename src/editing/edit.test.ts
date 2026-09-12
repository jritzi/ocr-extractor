import { describe, expect, it } from "vitest";
import {
  applyEditPlanToString,
  assertEditsSortedAndDisjoint,
  toMinimalChange,
} from "./edit";

const EMBED = "![[file.pdf]]";

describe("edit.ts", () => {
  describe("assertEditsSortedAndDisjoint", () => {
    it("accepts sorted, non-overlapping edits", () => {
      expect(() =>
        assertEditsSortedAndDisjoint([
          { from: 0, to: 2, expectedText: "aa", replacement: "x" },
          { from: 2, to: 4, expectedText: "bb", replacement: "y" },
        ]),
      ).not.toThrow();
    });

    it("throws for overlapping edits", () => {
      expect(() =>
        assertEditsSortedAndDisjoint([
          { from: 0, to: 5, expectedText: "aaaa ", replacement: "x" },
          { from: 3, to: 8, expectedText: "a bbb", replacement: "y" },
        ]),
      ).toThrow();
    });

    it("throws for unsorted edits", () => {
      expect(() =>
        assertEditsSortedAndDisjoint([
          { from: 6, to: 8, expectedText: "cc", replacement: "x" },
          { from: 0, to: 2, expectedText: "aa", replacement: "y" },
        ]),
      ).toThrow();
    });
  });

  describe("applyEditPlanToString", () => {
    it("applies multiple edits without invalidating earlier offsets", () => {
      const content = "aa bb cc";
      const newContent = applyEditPlanToString(content, [
        { from: 0, to: 2, expectedText: "aa", replacement: "aaaa" },
        { from: 6, to: 8, expectedText: "cc", replacement: "cccc" },
      ]);

      expect(newContent).toBe("aaaa bb cccc");
    });

    it("throws when an edit's expected text no longer matches", () => {
      const content = "aa bb";
      expect(() =>
        applyEditPlanToString(content, [
          { from: 0, to: 2, expectedText: "zz", replacement: "yy" },
        ]),
      ).toThrow();
    });

    it("throws when two edits overlap", () => {
      const content = "aaaa bbbb";
      expect(() =>
        applyEditPlanToString(content, [
          { from: 0, to: 5, expectedText: "aaaa ", replacement: "x" },
          { from: 3, to: 8, expectedText: "a bbb", replacement: "y" },
        ]),
      ).toThrow();
    });
  });

  describe("toMinimalChange", () => {
    it("reduces a callout edit to a simple insertion after the embed", () => {
      const change = toMinimalChange({
        from: 0,
        to: EMBED.length,
        expectedText: EMBED,
        replacement: `${EMBED}\n\ncallout`,
      });

      expect(change).toEqual({
        from: EMBED.length,
        to: EMBED.length,
        text: "\n\ncallout",
      });
    });

    it("trims the shared prefix of a header migration", () => {
      const change = toMinimalChange({
        from: 10,
        to: 45,
        expectedText: "> [!ocr-extractor]- Texto extraído",
        replacement: "> [!ocr-extractor]- Extracted text",
      });

      expect(change.from).toBe(10 + "> [!ocr-extractor]- ".length);
      expect(change.to).toBe(45);
      expect(change.text).toBe("Extracted text");
    });

    it("trims a shared prefix and suffix around a changed callout type", () => {
      const legacyHeader = "[!summary]- Extracted text";
      const change = toMinimalChange({
        from: 0,
        to: legacyHeader.length,
        expectedText: legacyHeader,
        replacement: "[!ocr-extractor]- Extracted text",
      });

      expect(change).toEqual({
        from: "[!".length,
        to: "[!summary".length,
        text: "ocr-extractor",
      });
    });
  });
});

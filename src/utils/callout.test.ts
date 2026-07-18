import { describe, expect, it } from "vitest";
import { formatCalloutToInsert, padWithBlankLines } from "./callout";

function insertAt(original: string, index: number, inserted: string) {
  return original.slice(0, index) + inserted + original.slice(index);
}

describe("callout.ts", () => {
  describe("padWithBlankLines", () => {
    it("inserts text with blank lines before and after", () => {
      const original = "beforeafter";
      const inserted = padWithBlankLines(original, "text", 6);
      expect(insertAt(original, 6, inserted)).toBe("before\n\ntext\n\nafter");
    });

    it("doesn't add an additional blank line before if it already has one", () => {
      const original = "before\n\nafter";
      const inserted = padWithBlankLines(original, "text", 8);
      expect(insertAt(original, 8, inserted)).toBe("before\n\ntext\n\nafter");
    });

    it("doesn't add an additional blank line after if it already has one", () => {
      const original = "before\n\nafter";
      const inserted = padWithBlankLines(original, "text", 6);
      expect(insertAt(original, 6, inserted)).toBe("before\n\ntext\n\nafter");
    });

    it("completes blank lines when single newline exists", () => {
      const original = "before\n\nafter";
      const inserted = padWithBlankLines(original, "text", 7);
      expect(insertAt(original, 7, inserted)).toBe("before\n\ntext\n\nafter");
    });

    it("preserves extra blank lines", () => {
      const original = "before\n\n\n\n\n\nafter";
      const inserted = padWithBlankLines(original, "text", 8);
      expect(insertAt(original, 8, inserted)).toBe(
        "before\n\ntext\n\n\n\nafter",
      );
    });

    it("adds prefix to new lines", () => {
      const original = ">before\n>after";
      const inserted = padWithBlankLines(original, ">text", 8, ">");
      expect(insertAt(original, 8, inserted)).toBe(
        ">before\n>\n>text\n>\n>after",
      );
    });

    it("correctly handles prefixed new lines that already exist", () => {
      const original = ">before\n>\n>\n>after";
      const inserted = padWithBlankLines(original, ">text", 9, ">");
      expect(insertAt(original, 9, inserted)).toBe(
        ">before\n>\n>text\n>\n>after",
      );
    });

    it("doesn't add an additional prefixed blank line before if it already has one", () => {
      const original = ">before\n>\n>after";
      const inserted = padWithBlankLines(original, ">text", 10, ">");
      expect(insertAt(original, 10, inserted)).toBe(
        ">before\n>\n>text\n>\n>after",
      );
    });

    it("doesn't add an additional prefixed blank line after if it already has one", () => {
      const original = ">before\n>\n>\n>after";
      const inserted = padWithBlankLines(original, ">text", 10, ">");
      expect(insertAt(original, 10, inserted)).toBe(
        ">before\n>\n>text\n>\n>after",
      );
    });

    it("correctly handles a prefix if inserting before a newline", () => {
      const original = ">before\n>after";
      const inserted = padWithBlankLines(original, ">text", 7, ">");
      expect(insertAt(original, 7, inserted)).toBe(
        ">before\n>\n>text\n>\n>after",
      );
    });

    it("trims trailing prefix whitespace for new lines", () => {
      const original = "> before\n> after";
      const inserted = padWithBlankLines(original, "> text", 9, "> ");
      expect(insertAt(original, 9, inserted)).toBe(
        "> before\n>\n> text\n>\n> after",
      );
    });

    it("uses \r\n newlines when specified", () => {
      const original = "before\r\nafter";
      const inserted = padWithBlankLines(original, "text", 8, "", "\r\n");
      expect(insertAt(original, 8, inserted)).toBe(
        "before\r\n\r\ntext\r\n\r\nafter",
      );
    });
  });

  describe("formatCalloutToInsert", () => {
    it("formats a callout and trims trailing whitespace", () => {
      const content = "![[file.pdf]]";
      const inserted = formatCalloutToInsert(
        "Line 1\n\nLine 2",
        content,
        0,
        content.length,
      );

      expect(inserted).toContain(
        "> [!ocr-extractor]- Extracted text\n> Line 1\n>\n> Line 2",
      );
    });

    it("prefixes every line for a callout nested inside another callout", () => {
      const content = "> [!info]\n> Text\n> ![[file.pdf]]";
      const embedStart = content.indexOf("![[");
      const inserted = formatCalloutToInsert(
        "Line 1\n\nLine 2",
        content,
        embedStart,
        content.length,
      );

      expect(inserted).toContain(
        "> > [!ocr-extractor]- Extracted text\n> > Line 1\n> >\n> > Line 2",
      );
    });

    it("matches \r\n line endings in the note", () => {
      const content = "![[file.pdf]]\r\n";
      const inserted = formatCalloutToInsert(
        "Line 1\n\nLine 2",
        content,
        0,
        13,
      );

      expect(inserted).toBe(
        "\r\n\r\n> [!ocr-extractor]- Extracted text\r\n> Line 1\r\n>\r\n> Line 2\r\n",
      );
    });

    it("throws when the markdown is not normalized to \n", () => {
      const content = "![[file.pdf]]";
      expect(() =>
        formatCalloutToInsert("Line 1\r\nLine 2", content, 0, content.length),
      ).toThrow();
    });
  });
});

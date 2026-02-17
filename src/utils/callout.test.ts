import { describe, expect, it } from "vitest";
import { formatCalloutToInsert, insertWithBlankLines } from "./callout";

describe("callout utils", () => {
  describe("insertWithBlankLines", () => {
    it("inserts text with blank lines before and after", () => {
      const result = insertWithBlankLines("beforeafter", "text", 6);
      expect(result).toBe("before\n\ntext\n\nafter");
    });

    it("doesn't add an additional blank line before if it already has one", () => {
      const result = insertWithBlankLines("before\n\nafter", "text", 8);
      expect(result).toBe("before\n\ntext\n\nafter");
    });

    it("doesn't add an additional blank line after if it already has one", () => {
      const result = insertWithBlankLines("before\n\nafter", "text", 6);
      expect(result).toBe("before\n\ntext\n\nafter");
    });

    it("completes blank lines when single newline exists", () => {
      const result = insertWithBlankLines("before\n\nafter", "text", 7);
      expect(result).toBe("before\n\ntext\n\nafter");
    });

    it("preserves extra blank lines", () => {
      const result = insertWithBlankLines("before\n\n\n\n\n\nafter", "text", 8);
      expect(result).toBe("before\n\ntext\n\n\n\nafter");
    });

    it("adds prefix to new lines", () => {
      const result = insertWithBlankLines(">before\n>after", ">text", 8, ">");
      expect(result).toBe(">before\n>\n>text\n>\n>after");
    });

    it("correctly handles prefixed new lines that already exist", () => {
      const result = insertWithBlankLines(
        ">before\n>\n>\n>after",
        ">text",
        9,
        ">",
      );
      expect(result).toBe(">before\n>\n>text\n>\n>after");
    });

    it("doesn't add an additional prefixed blank line before if it already has one", () => {
      const result = insertWithBlankLines(
        ">before\n>\n>after",
        ">text",
        10,
        ">",
      );
      expect(result).toBe(">before\n>\n>text\n>\n>after");
    });

    it("doesn't add an additional prefixed blank line after if it already has one", () => {
      const result = insertWithBlankLines(
        ">before\n>\n>\n>after",
        ">text",
        10,
        ">",
      );
      expect(result).toBe(">before\n>\n>text\n>\n>after");
    });

    it("correctly handles a prefix if inserting before a newline", () => {
      const result = insertWithBlankLines(">before\n>after", ">text", 7, ">");
      expect(result).toBe(">before\n>\n>text\n>\n>after");
    });

    it("trims trailing prefix whitespace for new lines", () => {
      const result = insertWithBlankLines(
        "> before\n> after",
        "> text",
        9,
        "> ",
      );
      expect(result).toBe("> before\n>\n> text\n>\n> after");
    });
  });

  describe("formatCalloutToInsert", () => {
    it("correctly formats a callout (trimming trailing whitespace)", () => {
      const fileContent = "![[file.pdf]]";
      const result = formatCalloutToInsert("Line 1\n\nLine 2", fileContent, 0);

      expect(result.text).toBe(
        "> [!ocr-extractor]- Extracted text\n> Line 1\n>\n> Line 2",
      );
      expect(result.linePrefix).toBe("");
    });

    it("formats nested callout with the correct prefix", () => {
      const fileContent = "> [!info]\n> Text\n> ![[file.pdf]]";
      const embedStart = 19;
      const result = formatCalloutToInsert(
        "Line 1\n\nLine 2",
        fileContent,
        embedStart,
      );

      expect(result.text).toBe(
        "> > [!ocr-extractor]- Extracted text\n> > Line 1\n> >\n> > Line 2",
      );
      expect(result.linePrefix).toBe("> ");
    });
  });
});

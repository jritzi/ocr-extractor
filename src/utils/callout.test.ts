import { describe, expect, it } from "vitest";
import { buildLink } from "./metadata-cache.test-utils";
import {
  findCalloutHeaderLinks,
  formatCalloutsToAppend,
  formatCalloutToInsert,
  formatTitleWithLink,
  hasManagedEmbedCalloutAfter,
  padWithBlankLines,
  titlesWithLinkInAllLanguages,
} from "./callout";

const LINK = "[[file.pdf]]";
const HEADER_WITH_LINK = `> [!ocr-extractor]- Extracted text from ${LINK}`;

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

    it("adds only the missing newlines when a single newline exists", () => {
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

    it("turns spaces at the end of the line into a blank line after", () => {
      const original = "before  \nafter";
      const inserted = padWithBlankLines(original, "text", 6);
      expect(insertAt(original, 6, inserted)).toBe("before\n\ntext\n  \nafter");
    });

    it("turns spaces at the end of the line into a blank line after when using a prefix", () => {
      const original = ">before \n>after";
      const inserted = padWithBlankLines(original, ">text", 7, ">");
      expect(insertAt(original, 7, inserted)).toBe(
        ">before\n>\n>text\n> \n>after",
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

    it("uses \\r\\n newlines when specified", () => {
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

    it("matches \\r\\n line endings in the note", () => {
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

    it("throws when the markdown is not normalized to \\n", () => {
      const content = "![[file.pdf]]";
      expect(() =>
        formatCalloutToInsert("Line 1\r\nLine 2", content, 0, content.length),
      ).toThrow();
    });
  });

  describe("formatCalloutsToAppend", () => {
    const buildCallouts = () => [
      { markdown: "Line 1\n\nLine 2", title: "Title" },
    ];
    const callout = "> [!ocr-extractor]- Title\n> Line 1\n>\n> Line 2";

    it("adds a blank line before and after", () => {
      expect(formatCalloutsToAppend(buildCallouts(), "text")).toBe(
        `\n\n${callout}\n\n`,
      );
    });

    it("adds only one newline before when the content ends with a newline", () => {
      expect(formatCalloutsToAppend(buildCallouts(), "text\n")).toBe(
        `\n${callout}\n\n`,
      );
    });

    it("adds no blank line before when the content already ends with one", () => {
      expect(formatCalloutsToAppend(buildCallouts(), "text\n\n")).toBe(
        `${callout}\n\n`,
      );
    });

    it("adds a blank line below the frontmatter of a note with no body", () => {
      const frontmatter = "---\nimage: 1\n---\n";
      expect(formatCalloutsToAppend(buildCallouts(), frontmatter)).toBe(
        `\n${callout}\n\n`,
      );
    });

    it("separates callouts with a blank line", () => {
      const second = { markdown: "More", title: "Second" };
      expect(
        formatCalloutsToAppend([...buildCallouts(), second], "text\n\n"),
      ).toBe(`${callout}\n\n> [!ocr-extractor]- Second\n> More\n\n`);
    });

    it("matches \\r\\n line endings in the note", () => {
      expect(formatCalloutsToAppend(buildCallouts(), "text\r\n")).toBe(
        "\r\n> [!ocr-extractor]- Title\r\n> Line 1\r\n>\r\n> Line 2\r\n\r\n",
      );
    });
  });

  describe("formatTitleWithLink", () => {
    it("returns the title with the link filled in", () => {
      expect(formatTitleWithLink(LINK)).toBe(`Extracted text from ${LINK}`);
    });
  });

  describe("titlesWithLinkInAllLanguages", () => {
    it("returns the title with the link in each supported language", () => {
      const titles = titlesWithLinkInAllLanguages(LINK);
      expect(titles).toContain(`Extracted text from ${LINK}`);
      expect(titles).toContain(`Texto extraído de ${LINK}`);
    });
  });

  describe("findCalloutHeaderLinks", () => {
    it("returns links on managed callout headers", () => {
      const content = `${HEADER_WITH_LINK}\n> body`;
      const link = buildLink(content, LINK);
      expect(findCalloutHeaderLinks(content, [link])).toEqual([link]);
    });

    it("returns links on nested callout headers", () => {
      const content = `> [!info]\n> ${HEADER_WITH_LINK}\n> > body`;
      const link = buildLink(content, LINK);
      expect(findCalloutHeaderLinks(content, [link])).toEqual([link]);
    });

    it("ignores links elsewhere in the note", () => {
      const content = `See ${LINK}\n\n> [!note] ${LINK}\n> ${LINK}`;
      const links = [0, 1, 2].map((occurrence) =>
        buildLink(content, LINK, occurrence),
      );
      expect(findCalloutHeaderLinks(content, links)).toEqual([]);
    });
  });

  describe("hasManagedEmbedCalloutAfter", () => {
    const embed = "![[file.pdf]]";

    it("returns true for a managed callout below the offset", () => {
      const content = `${embed}\n\n> [!ocr-extractor]- Extracted text\n> Text`;
      expect(hasManagedEmbedCalloutAfter(content, embed.length, [])).toBe(true);
    });

    it("returns true for a managed callout nested inside another callout", () => {
      const content = `> ${embed}\n>\n> > [!ocr-extractor]- Extracted text\n> > Text`;
      expect(
        hasManagedEmbedCalloutAfter(content, `> ${embed}`.length, []),
      ).toBe(true);
    });

    it("returns true for a legacy callout", () => {
      const content = `${embed}\n\n> [!summary]- Extracted text\n> Text`;
      expect(hasManagedEmbedCalloutAfter(content, embed.length, [])).toBe(true);
    });

    it("returns true when a link comes after the callout header", () => {
      const content = `${embed}\n\n> [!ocr-extractor]- Extracted text\n> ${LINK}`;
      const link = buildLink(content, LINK, 1);
      expect(hasManagedEmbedCalloutAfter(content, embed.length, [link])).toBe(
        true,
      );
    });

    it("returns false for a managed callout with a header link", () => {
      const content = `${embed}\n\n${HEADER_WITH_LINK}\n> Text`;
      const link = buildLink(content, LINK, 1);
      expect(hasManagedEmbedCalloutAfter(content, embed.length, [link])).toBe(
        false,
      );
    });

    it("returns false for another callout type", () => {
      const content = `${embed}\n\n> [!note]- Extracted text\n> Text`;
      expect(hasManagedEmbedCalloutAfter(content, embed.length, [])).toBe(
        false,
      );
    });

    it("returns false when text comes before the callout", () => {
      const content = `${embed}\nText\n\n> [!ocr-extractor]- Extracted text`;
      expect(hasManagedEmbedCalloutAfter(content, embed.length, [])).toBe(
        false,
      );
    });
  });
});

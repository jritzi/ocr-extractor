import { describe, expect, it } from "vitest";
import { EmbedCache } from "obsidian";
import {
  applyEditPlanToString,
  assertEditsSortedAndDisjoint,
  buildEditPlan,
  buildMigrationEdits,
  selectEmbedsToProcess,
  toMinimalChange,
} from "./plan";

/**
 * Build an EmbedCache for the given occurrence of the embed markup (`original`)
 * in the content. Dummy values are used for `link`, `line`, and `col`, which
 * aren't necessary to test edit plans.
 */
function buildEmbed(
  content: string,
  original: string,
  occurrence = 0,
): EmbedCache {
  let offset = -1;
  for (let i = 0; i <= occurrence; i++) {
    offset = content.indexOf(original, offset + 1);
    if (offset === -1) throw new Error(`String not found: ${original}`);
  }

  return {
    link: original,
    original,
    position: {
      start: { line: 0, col: 0, offset },
      end: { line: 0, col: 0, offset: offset + original.length },
    },
  };
}

const EMBED = "![[file.pdf]]";
const CALLOUT = "> [!ocr-extractor]- Extracted text\n> Extracted";
const buildEmbedsToMarkdown = () => new Map([[EMBED, "Extracted"]]);

describe("plan.ts", () => {
  describe("selectEmbedsToProcess", () => {
    it("keeps embeds in document order", () => {
      const content = `${EMBED}\n\n![[other.png]]`;
      const embeds = [
        buildEmbed(content, EMBED),
        buildEmbed(content, "![[other.png]]"),
      ];

      expect(selectEmbedsToProcess(content, embeds)).toEqual(embeds);
    });

    it("skips embeds already followed by a managed callout", () => {
      const content = `${EMBED}\n\n${CALLOUT}\n\n![[other.png]]`;
      const embeds = [
        buildEmbed(content, EMBED),
        buildEmbed(content, "![[other.png]]"),
      ];

      expect(selectEmbedsToProcess(content, embeds)).toEqual([embeds[1]]);
    });

    it("deduplicates repeated embeds, keeping the first occurrence", () => {
      const content = `${EMBED}\n\ntext\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];

      expect(selectEmbedsToProcess(content, embeds)).toEqual([embeds[0]]);
    });

    it("keeps a later occurrence when the first already has a callout", () => {
      const content = `${EMBED}\n\n${CALLOUT}\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];

      expect(selectEmbedsToProcess(content, embeds)).toEqual([embeds[1]]);
    });
  });

  describe("buildEditPlan", () => {
    it("plans a callout insert after an embed with an OCR result", () => {
      const content = `before\n\n${EMBED}\n\nafter`;
      const plan = buildEditPlan(
        content,
        [buildEmbed(content, EMBED)],
        buildEmbedsToMarkdown(),
      );

      expect(plan.edits).toHaveLength(1);
      expect(plan.staleEmbeds).toEqual([]);
      expect(plan.orphanedResults).toEqual([]);

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`before\n\n${EMBED}\n\n${CALLOUT}\n\nafter`);
    });

    it("stays valid when text was added below the embed", () => {
      const content = `${EMBED}\nnew text below`;
      const plan = buildEditPlan(
        content,
        [buildEmbed(content, EMBED)],
        buildEmbedsToMarkdown(),
      );

      expect(plan.staleEmbeds).toEqual([]);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`${EMBED}\n\n${CALLOUT}\n\nnew text below`);
    });

    it("reports a stale embed when cached offsets no longer match", () => {
      const cachedContent = EMBED;
      const content = `new text above\n${EMBED}`;
      const stale = buildEmbed(cachedContent, EMBED);
      const plan = buildEditPlan(content, [stale], buildEmbedsToMarkdown());

      expect(plan.edits).toEqual([]);
      expect(plan.staleEmbeds).toEqual([stale]);
    });

    it("reports an orphaned result when the embed is not found in the content", () => {
      const content = "no embeds";
      const plan = buildEditPlan(content, [], buildEmbedsToMarkdown());

      expect(plan.edits).toEqual([]);
      expect(plan.staleEmbeds).toEqual([]);
      expect(plan.orphanedResults).toEqual([EMBED]);
    });

    it("does not report an orphaned result while an embed is stale", () => {
      const cachedContent = `above\n${EMBED}\nafter`;
      const content = `${EMBED}\nafter`;
      const stale = buildEmbed(cachedContent, EMBED);
      const plan = buildEditPlan(
        content,
        [stale],
        new Map([
          [EMBED, "Extracted"],
          ["![[missing.png]]", "Extracted"],
        ]),
      );

      expect(plan.staleEmbeds).toHaveLength(1);
      expect(plan.orphanedResults).toEqual([]);
    });

    it("does not report a skipped (null) result as orphaned", () => {
      const content = "no embeds";
      const plan = buildEditPlan(content, [], new Map([[EMBED, null]]));

      expect(plan.orphanedResults).toEqual([]);
    });

    it("plans one insert per occurrence of a duplicated embed", () => {
      const content = `${EMBED}\n\nmiddle\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];
      const plan = buildEditPlan(content, embeds, buildEmbedsToMarkdown());

      expect(plan.edits).toHaveLength(2);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${EMBED}\n\n${CALLOUT}\n\nmiddle\n\n${EMBED}\n\n${CALLOUT}\n\n`,
      );
    });

    it("skips occurrences of a duplicated embed that already have a callout", () => {
      const content = `${EMBED}\n\n${CALLOUT}\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];
      const plan = buildEditPlan(content, embeds, buildEmbedsToMarkdown());

      expect(plan.edits).toHaveLength(1);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${EMBED}\n\n${CALLOUT}\n\n${EMBED}\n\n${CALLOUT}\n\n`,
      );
    });

    it("ignores embeds without an OCR result", () => {
      const content = `${EMBED}\n![[added-later.png]]`;
      const embeds = [
        buildEmbed(content, EMBED),
        buildEmbed(content, "![[added-later.png]]"),
      ];
      const plan = buildEditPlan(content, embeds, buildEmbedsToMarkdown());

      expect(plan.edits).toHaveLength(1);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`${EMBED}\n\n${CALLOUT}\n\n![[added-later.png]]`);
    });

    it("ignores null and empty OCR results", () => {
      const unsupportedFile = "![[archive.exe]]";
      const blankImage = "![[blank.png]]";
      const content = `${unsupportedFile}\n\n${blankImage}`;
      const plan = buildEditPlan(
        content,
        [buildEmbed(content, unsupportedFile), buildEmbed(content, blankImage)],
        new Map([
          [unsupportedFile, null],
          [blankImage, ""],
        ]),
      );

      expect(plan.edits).toEqual([]);
    });

    it("prefixes callouts for embeds nested inside another callout", () => {
      const content = `> [!info]\n> ${EMBED}`;
      const plan = buildEditPlan(
        content,
        [buildEmbed(content, EMBED)],
        buildEmbedsToMarkdown(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `> [!info]\n> ${EMBED}\n>\n> > [!ocr-extractor]- Extracted text\n> > Extracted\n>\n`,
      );
    });

    it("includes migrations alongside inserts", () => {
      const legacy = "> [!summary]- Extracted text\n> old";
      const content = `${legacy}\n\n${EMBED}`;
      const plan = buildEditPlan(
        content,
        [buildEmbed(content, EMBED)],
        buildEmbedsToMarkdown(),
      );

      expect(plan.edits).toHaveLength(2);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `> [!ocr-extractor]- Extracted text\n> old\n\n${EMBED}\n\n${CALLOUT}\n\n`,
      );
    });

    it("reports colliding duplicate embeds as stale and keeps other edits", () => {
      // Stale cache positions can collapse two duplicate embeds onto the same
      // occurrence after the user deletes text above them, producing edits that
      // collide even though each passed the staleness check on its own.
      const other = "![[other.png]]";
      const content = `${EMBED}\n${EMBED}\n${other}`;
      const collidingEmbeds = [
        buildEmbed(content, EMBED, 1),
        buildEmbed(content, EMBED, 1),
      ];
      const embeds = [...collidingEmbeds, buildEmbed(content, other)];
      const plan = buildEditPlan(
        content,
        embeds,
        new Map([
          [EMBED, "Extracted"],
          [other, "Extracted"],
        ]),
      );

      expect(plan.staleEmbeds).toEqual(collidingEmbeds);
      expect(plan.edits.map((edit) => edit.expectedText)).toEqual([other]);
    });

    it("uses the note's line endings for inserted callouts", () => {
      const content = `${EMBED}\r\ntext below`;
      const plan = buildEditPlan(
        content,
        [buildEmbed(content, EMBED)],
        buildEmbedsToMarkdown(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${EMBED}\r\n\r\n> [!ocr-extractor]- Extracted text\r\n> Extracted\r\n\r\ntext below`,
      );
    });
  });

  describe("buildMigrationEdits", () => {
    it("migrates all legacy headers", () => {
      const content =
        "intro\n\n> [!summary]- Extracted text\n> one\n\n> [!summary]- Extracted text\n> two";
      const migrated = applyEditPlanToString(
        content,
        buildMigrationEdits(content),
      );
      expect(migrated).toBe(
        "intro\n\n> [!ocr-extractor]- Extracted text\n> one\n\n> [!ocr-extractor]- Extracted text\n> two",
      );
    });

    it("updates callout headers to the current language", () => {
      const content = "> [!ocr-extractor]- Texto extraído\n> content";
      const migrated = applyEditPlanToString(
        content,
        buildMigrationEdits(content),
      );
      expect(migrated).toBe("> [!ocr-extractor]- Extracted text\n> content");
    });

    it("correctly updates headers for nested callouts", () => {
      const content = "> > [!ocr-extractor]- Texto extraído\n> > content";
      const migrated = applyEditPlanToString(
        content,
        buildMigrationEdits(content),
      );
      expect(migrated).toBe(
        "> > [!ocr-extractor]- Extracted text\n> > content",
      );
    });

    it("produces no edits when headers are already current", () => {
      const content = "> [!ocr-extractor]- Extracted text\n> content";
      expect(buildMigrationEdits(content)).toEqual([]);
    });

    it("preserves a user-customized title", () => {
      const content = "> [!ocr-extractor]- Receipt text\n> content";
      expect(buildMigrationEdits(content)).toEqual([]);
    });

    it("preserves user text after a plugin-written title", () => {
      const content = "> [!ocr-extractor]- Extracted text (checked)\n> content";
      expect(buildMigrationEdits(content)).toEqual([]);
    });

    it("ignores legacy header text that is not a whole line", () => {
      const content = "text before [!summary]- Extracted text text after";
      expect(buildMigrationEdits(content)).toEqual([]);
    });
  });

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

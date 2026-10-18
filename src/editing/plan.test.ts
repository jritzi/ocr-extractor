import { describe, expect, it } from "vitest";
import {
  buildEmbed,
  buildLink,
  buildPropertyLink,
  positionOf,
} from "../utils/metadata-cache.test-utils";
import { applyEditPlanToString } from "./edit";
import { buildEditPlan, PendingResult, PlanContext } from "./plan";

const EMBED = "![[file.pdf]]";
const CALLOUT = "> [!ocr-extractor]- Extracted text\n> Extracted";
const LINK = "[[file.pdf]]";
const FRONTMATTER = `---\nattachment: "${LINK}"\n---`;
const CALLOUT_WITH_LINK = `> [!ocr-extractor]- Extracted text from ${LINK}\n> Extracted`;

function frontmatterPosition(content: string) {
  const end = content.indexOf("\n---", 3);
  if (!content.startsWith("---\n") || end === -1) {
    throw new Error("Content has no frontmatter");
  }
  return positionOf(content, content.slice(0, end + "\n---".length));
}

function buildContext(overrides: Partial<PlanContext> = {}) {
  return {
    embeds: [],
    links: [],
    frontmatterLinks: [],
    frontmatterPosition: undefined,
    propertiesToExtractFrom: [],
    linkPaths: new Map(),
    ...overrides,
  };
}

function buildPropertyContext(
  content: string,
  overrides: Partial<PlanContext> = {},
) {
  return buildContext({
    frontmatterLinks: [buildPropertyLink(LINK, "attachment")],
    frontmatterPosition: frontmatterPosition(content),
    propertiesToExtractFrom: ["attachment"],
    ...overrides,
  });
}

function buildEmbedResults() {
  return new Map<string, PendingResult>([
    [EMBED, { kind: "embed", markdown: "Extracted" }],
  ]);
}

function buildPropertyResults(link = LINK, path = "file.pdf") {
  return new Map<string, PendingResult>([
    [
      link,
      {
        kind: "propertyLink",
        markdown: "Extracted",
        path,
        attachmentLink: link,
      },
    ],
  ]);
}

describe("plan.ts", () => {
  describe("buildEditPlan with embed results", () => {
    it("plans a callout insert after an embed with an OCR result", () => {
      const content = `before\n\n${EMBED}\n\nafter`;
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [buildEmbed(content, EMBED)] }),
        buildEmbedResults(),
      );

      expect(plan.edits).toHaveLength(1);
      expect(plan.resultsToInsert).toEqual([EMBED]);
      expect(plan.staleEmbeds).toEqual([]);
      expect(plan.orphanedResults).toEqual([]);

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`before\n\n${EMBED}\n\n${CALLOUT}\n\nafter`);
    });

    it("plans a callout insert after the full markup of an embed with a size", () => {
      const sized = "![[file.pdf|300]]";
      const content = `${sized}\nafter`;
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [buildEmbed(content, sized)] }),
        new Map([[sized, { kind: "embed", markdown: "Extracted" }]]),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`${sized}\n\n${CALLOUT}\n\nafter`);
    });

    it("stays valid when text was added below the embed", () => {
      const content = `${EMBED}\nnew text below`;
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [buildEmbed(content, EMBED)] }),
        buildEmbedResults(),
      );

      expect(plan.staleEmbeds).toEqual([]);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`${EMBED}\n\n${CALLOUT}\n\nnew text below`);
    });

    it("plans one insert per occurrence of a duplicated embed", () => {
      const content = `${EMBED}\n\nmiddle\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];
      const plan = buildEditPlan(
        content,
        buildContext({ embeds }),
        buildEmbedResults(),
      );

      expect(plan.edits).toHaveLength(2);
      expect(plan.resultsToInsert).toEqual([EMBED, EMBED]);

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${EMBED}\n\n${CALLOUT}\n\nmiddle\n\n${EMBED}\n\n${CALLOUT}\n\n`,
      );
    });

    it("prefixes callouts for embeds nested inside another callout", () => {
      const content = `> [!info]\n> ${EMBED}`;
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [buildEmbed(content, EMBED)] }),
        buildEmbedResults(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `> [!info]\n> ${EMBED}\n>\n> > [!ocr-extractor]- Extracted text\n> > Extracted\n>\n`,
      );
    });

    it("keeps the outer callout intact when spaces follow a nested embed", () => {
      const content = `> [!info]\n> ${EMBED} \n> after`;
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [buildEmbed(content, EMBED)] }),
        buildEmbedResults(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `> [!info]\n> ${EMBED}\n>\n> > [!ocr-extractor]- Extracted text\n> > Extracted\n> \n> after`,
      );
    });

    it("uses the note's line endings for inserted callouts", () => {
      const content = `${EMBED}\r\ntext below`;
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [buildEmbed(content, EMBED)] }),
        buildEmbedResults(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${EMBED}\r\n\r\n> [!ocr-extractor]- Extracted text\r\n> Extracted\r\n\r\ntext below`,
      );
    });

    it("ignores embeds without an OCR result", () => {
      const content = `${EMBED}\n![[added-later.png]]`;
      const embeds = [
        buildEmbed(content, EMBED),
        buildEmbed(content, "![[added-later.png]]"),
      ];
      const plan = buildEditPlan(
        content,
        buildContext({ embeds }),
        buildEmbedResults(),
      );

      expect(plan.edits).toHaveLength(1);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`${EMBED}\n\n${CALLOUT}\n\n![[added-later.png]]`);
    });

    it("skips occurrences of a duplicated embed that already have a callout", () => {
      const content = `${EMBED}\n\n${CALLOUT}\n\n${EMBED}`;
      const embeds = [
        buildEmbed(content, EMBED, 0),
        buildEmbed(content, EMBED, 1),
      ];
      const plan = buildEditPlan(
        content,
        buildContext({ embeds }),
        buildEmbedResults(),
      );

      expect(plan.edits).toHaveLength(1);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${EMBED}\n\n${CALLOUT}\n\n${EMBED}\n\n${CALLOUT}\n\n`,
      );
    });

    it("inserts a callout after an embed followed by a callout with a header link", () => {
      const content = `${EMBED}\n\n${CALLOUT_WITH_LINK}`;
      const plan = buildEditPlan(
        content,
        buildContext({
          embeds: [buildEmbed(content, EMBED)],
          links: [buildLink(content, LINK, 1)],
        }),
        buildEmbedResults(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`${EMBED}\n\n${CALLOUT}\n\n${CALLOUT_WITH_LINK}`);
    });

    it("reports a stale embed when cached offsets no longer match", () => {
      const cachedContent = EMBED;
      const content = `new text above\n${EMBED}`;
      const stale = buildEmbed(cachedContent, EMBED);
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [stale] }),
        buildEmbedResults(),
      );

      expect(plan.edits).toEqual([]);
      expect(plan.staleEmbeds).toEqual([stale]);
    });

    it("reports a stale embed when a callout below it has a stale link", () => {
      const content = `${EMBED}\n\n${CALLOUT_WITH_LINK}`;
      const embed = buildEmbed(content, EMBED);
      const plan = buildEditPlan(
        content,
        buildContext({
          embeds: [embed],
          links: [buildLink(`moved ${content}`, LINK, 1)],
        }),
        buildEmbedResults(),
      );

      expect(plan.edits).toEqual([]);
      expect(plan.staleEmbeds).toEqual([embed]);
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
        buildContext({ embeds }),
        new Map([
          [EMBED, { kind: "embed", markdown: "Extracted" }],
          [other, { kind: "embed", markdown: "Extracted" }],
        ]),
      );

      expect(plan.staleEmbeds).toEqual(collidingEmbeds);
      expect(plan.edits.map((edit) => edit.expectedText)).toEqual([other]);
      expect(plan.resultsToInsert).toEqual([other]);
    });

    it("reports an orphaned result when the embed is not found in the content", () => {
      const content = "no embeds";
      const plan = buildEditPlan(content, buildContext(), buildEmbedResults());

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
        buildContext({ embeds: [stale] }),
        new Map([
          [EMBED, { kind: "embed", markdown: "Extracted" }],
          ["![[missing.png]]", { kind: "embed", markdown: "Extracted" }],
        ]),
      );

      expect(plan.staleEmbeds).toHaveLength(1);
      expect(plan.orphanedResults).toEqual([]);
    });

    it("reports nothing as orphaned when there are no results", () => {
      const content = "no embeds";
      const plan = buildEditPlan(content, buildContext(), new Map());

      expect(plan.orphanedResults).toEqual([]);
    });
  });

  describe("buildEditPlan with property link results", () => {
    it("appends a callout with a header link at the end of the note", () => {
      const content = `${FRONTMATTER}\n\nNotes\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content),
        buildPropertyResults(),
      );

      expect(plan.edits).toHaveLength(1);
      expect(plan.resultsToInsert).toEqual([LINK]);
      expect(plan.staleLinks).toEqual([]);
      expect(plan.orphanedResults).toEqual([]);

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${FRONTMATTER}\n\nNotes\n\n${CALLOUT_WITH_LINK}\n\n`,
      );
    });

    it("appends below the frontmatter of a note with no body", () => {
      const content = `${FRONTMATTER}\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content),
        buildPropertyResults(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(`${FRONTMATTER}\n\n${CALLOUT_WITH_LINK}\n\n`);
    });

    it("appends all callouts in one edit, in result order", () => {
      const other = "[[other.png]]";
      const content = `---\nattachment:\n  - "${LINK}"\n  - "${other}"\n---\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, {
          frontmatterLinks: [
            buildPropertyLink(LINK, "attachment.0"),
            buildPropertyLink(other, "attachment.1"),
          ],
        }),
        new Map([
          ...buildPropertyResults(),
          ...buildPropertyResults(other, "other.png"),
        ]),
      );

      expect(plan.edits).toHaveLength(1);
      expect(plan.resultsToInsert).toEqual([LINK, other]);

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${content}\n${CALLOUT_WITH_LINK}\n\n> [!ocr-extractor]- Extracted text from ${other}\n> Extracted\n\n`,
      );
    });

    it("pads the append after a callout inserted at the end of the note", () => {
      const other = "![[other.png]]";
      const content = `${FRONTMATTER}\n\n${other}\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, {
          embeds: [buildEmbed(content, other)],
        }),
        new Map([
          ...buildPropertyResults(),
          [other, { kind: "embed", markdown: "Extracted" }],
        ]),
      );

      expect(plan.resultsToInsert).toEqual([other, LINK]);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${FRONTMATTER}\n\n${other}\n\n${CALLOUT}\n\n${CALLOUT_WITH_LINK}\n\n`,
      );
    });

    it("uses the note's line endings for appended callouts", () => {
      const content = `---\r\nattachment: "${LINK}"\r\n---\r\n`;
      const plan = buildEditPlan(
        content,
        buildContext({
          frontmatterLinks: [buildPropertyLink(LINK, "attachment")],
          frontmatterPosition: positionOf(
            content,
            `---\r\nattachment: "${LINK}"\r\n---`,
          ),
          propertiesToExtractFrom: ["attachment"],
        }),
        buildPropertyResults(),
      );

      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `${content}\r\n> [!ocr-extractor]- Extracted text from ${LINK}\r\n> Extracted\r\n\r\n`,
      );
    });

    it("skips a result when a callout header already links to its file", () => {
      const content = `${FRONTMATTER}\n\n${CALLOUT_WITH_LINK}\n`;
      const path = "attachments/file.pdf";
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, {
          // The first occurrence is the property link
          links: [buildLink(content, LINK, 1)],
          linkPaths: new Map([["file.pdf", path]]),
        }),
        buildPropertyResults(LINK, path),
      );

      expect(plan.edits).toEqual([]);
      expect(plan.resultsToInsert).toEqual([]);
      expect(plan.orphanedResults).toEqual([]);
    });

    it("matches header links by resolved file, not link text", () => {
      const headerLink = "[[docs/file.pdf]]";
      const content = `${FRONTMATTER}\n\n> [!ocr-extractor]- Extracted text from ${headerLink}\n> Extracted\n`;
      const path = "attachments/file.pdf";
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, {
          links: [buildLink(content, headerLink)],
          linkPaths: new Map([["docs/file.pdf", path]]),
        }),
        buildPropertyResults(LINK, path),
      );

      expect(plan.edits).toEqual([]);
    });

    it("skips a result when the header link to its file has an alias", () => {
      const headerLink = "[[file.pdf|Scan]]";
      const content = `${FRONTMATTER}\n\n> [!ocr-extractor]- Extracted text from ${headerLink}\n> Extracted\n`;
      const path = "attachments/file.pdf";
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, {
          links: [buildLink(content, headerLink)],
          linkPaths: new Map([["file.pdf", path]]),
        }),
        buildPropertyResults(LINK, path),
      );

      expect(plan.edits).toEqual([]);
    });

    it("ignores a link in the body that is not on a callout header", () => {
      const content = `${FRONTMATTER}\n\nSee ${LINK}\n`;
      const path = "attachments/file.pdf";
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, {
          links: [buildLink(content, LINK, 1)],
          linkPaths: new Map([["file.pdf", path]]),
        }),
        buildPropertyResults(LINK, path),
      );

      expect(plan.edits).toHaveLength(1);
      expect(plan.resultsToInsert).toEqual([LINK]);
    });

    it("reports a stale link when the frontmatter no longer contains it", () => {
      const cachedContent = `${FRONTMATTER}\n`;
      const content = `---\nattachment: "[[renamed.pdf]]"\n---\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(cachedContent),
        buildPropertyResults(),
      );

      expect(plan.edits).toEqual([]);
      expect(plan.staleLinks).toEqual([buildPropertyLink(LINK, "attachment")]);
      expect(plan.orphanedResults).toEqual([]);
    });

    it("reports a stale link when a cached body link no longer matches the content", () => {
      const cachedContent = `${FRONTMATTER}\n\n${CALLOUT_WITH_LINK}\n`;
      const content = `${FRONTMATTER}\n\nnew text above\n\n${CALLOUT_WITH_LINK}\n`;
      const staleLink = buildLink(cachedContent, LINK, 1);
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, { links: [staleLink] }),
        buildPropertyResults(),
      );

      expect(plan.edits).toEqual([]);
      expect(plan.staleLinks).toEqual([staleLink]);
    });

    it("appends nothing while another property link is stale", () => {
      const other = "[[other.png]]";
      const cachedContent = `---\nattachment:\n  - "${LINK}"\n  - "${other}"\n---\n`;
      const content = `---\nattachment:\n  - "${LINK}"\n  - "[[renamed.png]]"\n---\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(cachedContent, {
          frontmatterLinks: [
            buildPropertyLink(LINK, "attachment.0"),
            buildPropertyLink(other, "attachment.1"),
          ],
        }),
        new Map([
          ...buildPropertyResults(),
          ...buildPropertyResults(other, "other.png"),
        ]),
      );

      expect(plan.edits).toEqual([]);
      expect(plan.resultsToInsert).toEqual([]);
      expect(plan.staleLinks).toEqual([
        buildPropertyLink(other, "attachment.1"),
      ]);
    });

    it("ignores stale body links when there are no property link results", () => {
      const cachedContent = `${LINK}\n${EMBED}`;
      const content = `above\n${LINK}\n${EMBED}`;
      const plan = buildEditPlan(
        content,
        buildContext({
          embeds: [buildEmbed(content, EMBED)],
          links: [buildLink(cachedContent, LINK)],
        }),
        buildEmbedResults(),
      );

      expect(plan.staleLinks).toEqual([]);
      expect(plan.edits).toHaveLength(1);
    });

    it("reports an orphaned result when the link left the configured properties", () => {
      const content = `---\ncover: "${LINK}"\n---\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(content, {
          frontmatterLinks: [buildPropertyLink(LINK, "cover")],
        }),
        buildPropertyResults(),
      );

      expect(plan.edits).toEqual([]);
      expect(plan.orphanedResults).toEqual([LINK]);
    });

    it("reports an orphaned result when the note has no frontmatter anymore", () => {
      const content = "Body only\n";
      const plan = buildEditPlan(
        content,
        buildContext(),
        buildPropertyResults(),
      );

      expect(plan.orphanedResults).toEqual([LINK]);
    });

    it("does not report an orphaned result while a link is stale", () => {
      const cachedContent = `${FRONTMATTER}\n`;
      const content = `---\nattachment: "[[renamed.pdf]]"\n---\n`;
      const plan = buildEditPlan(
        content,
        buildPropertyContext(cachedContent),
        new Map([
          ...buildPropertyResults(),
          ...buildPropertyResults("[[missing.png]]", "missing.png"),
        ]),
      );

      expect(plan.staleLinks).toHaveLength(1);
      expect(plan.orphanedResults).toEqual([]);
    });
  });

  describe("buildEditPlan with callout headers to migrate", () => {
    it("includes migrations alongside inserts", () => {
      const legacy = "> [!summary]- Extracted text\n> old";
      const content = `${legacy}\n\n${EMBED}`;
      const plan = buildEditPlan(
        content,
        buildContext({ embeds: [buildEmbed(content, EMBED)] }),
        buildEmbedResults(),
      );

      expect(plan.edits).toHaveLength(2);
      const newContent = applyEditPlanToString(content, plan.edits);
      expect(newContent).toBe(
        `> [!ocr-extractor]- Extracted text\n> old\n\n${EMBED}\n\n${CALLOUT}\n\n`,
      );
    });

    it("excludes migration edits from the results to insert", () => {
      const content = "> [!summary]- Extracted text\n> old";
      const plan = buildEditPlan(content, buildContext(), new Map());

      expect(plan.edits).toHaveLength(1);
      expect(plan.resultsToInsert).toEqual([]);
    });

    it("doesn't migrate a header with a link the cache hasn't caught up with", () => {
      const header = `> [!ocr-extractor]- Texto extraído de ${LINK}\n> content`;
      const content = `new text above\n\n${header}`;
      const plan = buildEditPlan(
        content,
        buildContext({ links: [buildLink(header, LINK)] }),
        new Map(),
      );

      expect(plan.edits).toEqual([]);
    });
  });
});

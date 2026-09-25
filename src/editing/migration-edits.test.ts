import { describe, expect, it } from "vitest";
import { buildLink } from "../utils/metadata-cache.test-utils";
import { applyEditPlanToString } from "./edit";
import { buildMigrationEdits } from "./migration-edits";

const LINK = "[[file.pdf]]";
const CALLOUT_WITH_LINK = `> [!ocr-extractor]- Extracted text from ${LINK}\n> Extracted`;

describe("migration-edits.ts", () => {
  describe("buildMigrationEdits", () => {
    it("migrates all legacy headers", () => {
      const content =
        "intro\n\n> [!summary]- Extracted text\n> one\n\n> [!summary]- Extracted text\n> two";
      const migrated = applyEditPlanToString(
        content,
        buildMigrationEdits(content, []),
      );
      expect(migrated).toBe(
        "intro\n\n> [!ocr-extractor]- Extracted text\n> one\n\n> [!ocr-extractor]- Extracted text\n> two",
      );
    });

    it("updates callout headers to the current language", () => {
      const content = "> [!ocr-extractor]- Texto extraído\n> content";
      const migrated = applyEditPlanToString(
        content,
        buildMigrationEdits(content, []),
      );
      expect(migrated).toBe("> [!ocr-extractor]- Extracted text\n> content");
    });

    it("correctly updates headers for nested callouts", () => {
      const content = "> > [!ocr-extractor]- Texto extraído\n> > content";
      const migrated = applyEditPlanToString(
        content,
        buildMigrationEdits(content, []),
      );
      expect(migrated).toBe(
        "> > [!ocr-extractor]- Extracted text\n> > content",
      );
    });

    it("doesn't update a header that is already current", () => {
      const content = "> [!ocr-extractor]- Extracted text\n> content";
      expect(buildMigrationEdits(content, [])).toEqual([]);
    });

    it("doesn't update a header with an attachment link in the current language", () => {
      const content = `${CALLOUT_WITH_LINK}\n`;
      expect(buildMigrationEdits(content, [buildLink(content, LINK)])).toEqual(
        [],
      );
    });

    it("updates a header with an attachment link to the current language", () => {
      const content = `> [!ocr-extractor]- Texto extraído de ${LINK}\n> content`;
      const migrated = applyEditPlanToString(
        content,
        buildMigrationEdits(content, [buildLink(content, LINK)]),
      );
      expect(migrated).toBe(
        `> [!ocr-extractor]- Extracted text from ${LINK}\n> content`,
      );
    });

    it("doesn't update a title with a link the user added text to", () => {
      const content = `> [!ocr-extractor]- Texto extraído de ${LINK} (revisado)\n> content`;
      expect(buildMigrationEdits(content, [buildLink(content, LINK)])).toEqual(
        [],
      );
    });

    it("doesn't update a title with a link the cache hasn't caught up with", () => {
      const content = `> [!ocr-extractor]- Texto extraído de ${LINK}\n> content`;
      expect(buildMigrationEdits(content, [])).toEqual([]);
    });

    it("doesn't update a user-customized title", () => {
      const content = "> [!ocr-extractor]- Receipt text\n> content";
      expect(buildMigrationEdits(content, [])).toEqual([]);
    });

    it("doesn't update a plugin-written title the user added text to", () => {
      const content = "> [!ocr-extractor]- Extracted text (checked)\n> content";
      expect(buildMigrationEdits(content, [])).toEqual([]);
    });

    it("ignores legacy header text that is not a whole line", () => {
      const content = "text before [!summary]- Extracted text text after";
      expect(buildMigrationEdits(content, [])).toEqual([]);
    });
  });
});

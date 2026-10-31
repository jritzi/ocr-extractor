import { expect, MOCK_OCR_OUTPUT, test } from "../fixtures";
import {
  addFrontmatter,
  callout,
  copyFile,
  getActiveNoteContent,
  openNote,
  seedFolder,
  seedNote,
  typeAtEndOfNote,
} from "../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  expectNotice,
  extractActiveNote,
} from "../helpers/plugin";
import {
  addPropertyFromSuggestion,
  closeSettings,
  openPluginSettings,
  openPropertyList,
} from "../helpers/settings";

const LINK = "[[attachments/sample.pdf]]";
const FRONTMATTER = `---\nattachments: "${LINK}"\n---`;
const EMBED = "![[attachments/sample.pdf]]";
const CALLOUT = `> [!ocr-extractor]- Extracted text\n> ${MOCK_OCR_OUTPUT}`;

function calloutWithLink(linktext: string) {
  return `> [!ocr-extractor]- Extracted text from [[${linktext}]]\n> ${MOCK_OCR_OUTPUT}`;
}

test("extraction with no configured properties to extract from", async ({
  page,
}) => {
  await seedNote(page, "Default settings note", {
    content: `${FRONTMATTER}\n`,
  });
  await openNote(page, "Default settings note");
  await extractActiveNote(page);

  await expectNotice(page, "Nothing to extract");
  await expectNoCallout(page);
});

test.describe("with configured properties to extract from", () => {
  test.use({ settings: { propertiesToExtractFrom: ["scans", "attachments"] } });

  test("extraction with property and embed callouts", async ({ page }) => {
    const frontmatter =
      '---\nattachments: "[[attachments/sample.pdf]]"\nscans:\n  - "[[attachments/sample.png]]"\n  - "[[attachments/sample.webp]]"\n---';
    const embed = "![[attachments/no_text.pdf]]";
    await seedNote(page, "Linked note", {
      content: `${frontmatter}\n\nNotes about the scan\n\n${embed}`,
    });
    await openNote(page, "Linked note");
    await extractActiveNote(page);

    await expectNotice(page, [
      "Text extraction complete",
      "4 attachments extracted",
    ]);
    const content = await getActiveNoteContent(page);
    const blocks = [
      frontmatter,
      "Notes about the scan",
      embed,
      CALLOUT,
      calloutWithLink("sample.pdf"),
      calloutWithLink("sample.png"),
      calloutWithLink("sample.webp"),
    ];
    expect(content).toBe(`${blocks.join("\n\n")}\n\n`);
  });

  test("a distinct callout link for each attachment with the same name", async ({
    page,
  }) => {
    await seedFolder(page, "scans");
    await copyFile(page, "attachments/sample.pdf", "scans/sample.pdf");
    const frontmatter =
      '---\nattachments:\n  - "[[attachments/sample.pdf]]"\n  - "[[scans/sample.pdf]]"\n---';
    await seedNote(page, "Same name note", { content: `${frontmatter}\n` });
    await openNote(page, "Same name note");
    await extractActiveNote(page);

    await expectNotice(page, [
      "Text extraction complete",
      "2 attachments extracted",
    ]);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(
      `${frontmatter}\n\n${calloutWithLink("attachments/sample.pdf")}\n\n${calloutWithLink("scans/sample.pdf")}\n\n`,
    );
  });

  test("orphaned callout kept when adding a property callout", async ({
    page,
  }) => {
    await seedNote(page, "Orphan note", {
      content: `${FRONTMATTER}\n\n${CALLOUT}\n`,
    });
    await openNote(page, "Orphan note");
    await extractActiveNote(page);

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(
      `${FRONTMATTER}\n\n${CALLOUT}\n\n${calloutWithLink("sample.pdf")}\n\n`,
    );
  });

  test("extraction from handwritten YAML with quoting and escapes", async ({
    page,
  }) => {
    await copyFile(
      page,
      "attachments/sample.pdf",
      "attachments/Bob's scan.pdf",
    );
    const frontmatter =
      "---\nattachments:\n  - '[[attachments/Bob''s scan.pdf]]'\n  - \"[[attachments/sampl\\u0065.pdf]]\"\n---";
    await seedNote(page, "Handwritten note", { content: `${frontmatter}\n` });
    await openNote(page, "Handwritten note");
    await extractActiveNote(page);

    await expectNotice(page, [
      "Text extraction complete",
      "2 attachments extracted",
    ]);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(
      `${frontmatter}\n\n${calloutWithLink("Bob's scan.pdf")}\n\n${calloutWithLink("sample.pdf")}\n\n`,
    );
  });

  test("no extraction from a bare path or a link to a note", async ({
    page,
  }) => {
    await seedNote(page, "Project");
    await seedNote(page, "Not extracted note", {
      content:
        '---\nattachments:\n  - attachments/sample.pdf\n  - "[[Project]]"\n---\n',
    });
    await openNote(page, "Not extracted note");
    await extractActiveNote(page);

    await expectNotice(page, "Nothing to extract");
    await expectNoCallout(page);
  });

  test("one callout for a subpath link and a plain link to the same file", async ({
    page,
  }) => {
    await seedNote(page, "Subpath note", {
      content:
        '---\nattachments:\n  - "[[attachments/sample.pdf]]"\n  - "[[attachments/sample.pdf#page=2]]"\n---\n',
    });
    await openNote(page, "Subpath note");
    await extractActiveNote(page);

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);
    await expect(callout(page, "ocr-extractor")).toHaveCount(1);
  });

  test("only the embed callout for a file both embedded and linked", async ({
    page,
  }) => {
    await seedNote(page, "Embedded and linked note", {
      content: `${FRONTMATTER}\n\n${EMBED}\n`,
    });
    await openNote(page, "Embedded and linked note");
    await extractActiveNote(page);

    await expectNotice(page, [
      "Text extraction complete",
      "1 attachment extracted",
    ]);
    const content = await getActiveNoteContent(page);
    expect(content).toBe(`${FRONTMATTER}\n\n${EMBED}\n\n${CALLOUT}\n\n`);
  });

  test("no new callout after the user moves one above the body", async ({
    page,
  }) => {
    await seedNote(page, "Moved callout note", {
      content: `${FRONTMATTER}\n\n${calloutWithLink("sample.pdf")}\n\nNotes about the scan\n`,
    });
    await openNote(page, "Moved callout note");
    await extractActiveNote(page);

    await expectNotice(page, "Nothing to extract");
  });

  test("no new callout for an existing callout with a Markdown link", async ({
    page,
  }) => {
    await copyFile(page, "attachments/sample.pdf", "attachments/my scan.pdf");
    await seedNote(page, "Markdown header note", {
      content: `---\nattachments: "[[attachments/my scan.pdf]]"\n---\n\n> [!ocr-extractor]- Extracted text from [my scan.pdf](attachments/my%20scan.pdf)\n> ${MOCK_OCR_OUTPUT}\n`,
    });
    await openNote(page, "Markdown header note");
    await extractActiveNote(page);

    await expectNotice(page, "Nothing to extract");
  });
});

test.describe("auto-extract", () => {
  test.use({
    settings: {
      propertiesToExtractFrom: ["attachments"],
      autoExtractAttachments: true,
    },
  });

  test("auto-extraction of a link added to a property to extract from", async ({
    page,
  }) => {
    await seedNote(page, "Unconfigured property note");
    await seedNote(page, "Configured property note");

    await openNote(page, "Unconfigured property note");
    await addFrontmatter(page, { cover: LINK });

    await openNote(page, "Configured property note");
    await addFrontmatter(page, { attachments: LINK });
    await expectCallout(page, MOCK_OCR_OUTPUT);

    // The unconfigured note would have extracted by now
    await openNote(page, "Unconfigured property note");
    await expectNoCallout(page);
  });

  test("edits after a property is added to the list", async ({ page }) => {
    await seedNote(page, "Existing link note", {
      content: `---\ncover: "${LINK}"\n---\n`,
    });
    await seedNote(page, "New embed note");
    await openNote(page, "Existing link note");
    await openNote(page, "New embed note");

    await openPluginSettings(page);
    await openPropertyList(page);
    await addPropertyFromSuggestion(page, "cover");
    await closeSettings(page);

    await openNote(page, "Existing link note");
    await typeAtEndOfNote(page, "Notes about the cover");

    await openNote(page, "New embed note");
    await typeAtEndOfNote(page, EMBED);
    await expectCallout(page, MOCK_OCR_OUTPUT);

    // The existing link note would have extracted by now
    await openNote(page, "Existing link note");
    await expectNoCallout(page);
  });
});

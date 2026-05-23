import { MOCK_OCR_OUTPUT, test } from "../fixtures";
import { openNote, seedNote } from "../helpers/obsidian";
import { expectCallout, extractActiveNote } from "../helpers/plugin";

test("Markdown link embed syntax (issue #51)", async ({ page }) => {
  await seedNote(page, "Markdown link embed test", {
    content: "![sample](attachments/sample.pdf)",
  });
  await openNote(page, "Markdown link embed test");
  await extractActiveNote(page);

  await expectCallout(page, MOCK_OCR_OUTPUT);
});

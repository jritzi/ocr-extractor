import { expect, MOCK_OCR_COMMANDS, test } from "../fixtures";
import { clickModalButton, openNote, seedNote } from "../helpers/obsidian";
import { expectNoCallout, extractActiveNote } from "../helpers/plugin";

test.describe("loading and cancellation", () => {
  test.use({ settings: { customCommand: MOCK_OCR_COMMANDS.slow } });

  test("loading message and cancellation", async ({ page }) => {
    await seedNote(page, "Extraction test", {
      content: "![[attachments/sample.pdf]]",
    });
    await openNote(page, "Extraction test");
    await extractActiveNote(page);

    const modal = page.locator(".modal");
    await expect(
      modal.getByText("Extracting text from attachments..."),
    ).toBeVisible();

    await clickModalButton(page, "Cancel");

    await expect(page.getByText("Canceled text extraction")).toBeVisible();
    await expectNoCallout(page);
  });
});

test.describe("error handling", () => {
  test.use({
    settings: { customCommand: MOCK_OCR_COMMANDS.error },
    allowErrors: true,
  });

  test("error message", async ({ page }) => {
    await seedNote(page, "Extraction test", {
      content: "![[attachments/sample.pdf]]",
    });
    await openNote(page, "Extraction test");
    await extractActiveNote(page);

    const modal = page.locator(".modal");
    await expect(
      modal.getByText(
        "Error: Custom command failed with exit code 1 (see console for details)",
      ),
    ).toBeVisible();

    await clickModalButton(page, "OK");
    await expectNoCallout(page);
  });
});

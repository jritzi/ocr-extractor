import { expect, test } from "./fixtures";
import {
  createNote,
  expectCallout,
  expectNoCallout,
  extractCurrentNote,
  openNote,
} from "./helpers";

test.use({ mockOcrOutput: "Mock extracted text" });

test("successful extraction", async ({ page }) => {
  await createNote(page, "Extraction test", "![[attachments/sample.pdf]]");
  await openNote(page, "Extraction test");
  await extractCurrentNote(page);

  await expectCallout(page, "Mock extracted text");
});

test("warning about skipped attachments", async ({ page }) => {
  await createNote(
    page,
    "Warning test",
    "![[attachments/sample.pdf]]\n![[attachments/missing.pdf]]",
  );
  await openNote(page, "Warning test");
  await extractCurrentNote(page);

  const modal = page.locator(".modal");
  await expect(
    modal.getByText(
      "Text extracted from 1 attachment. The following were skipped:",
    ),
  ).toBeVisible();
  await expect(modal.getByText("attachments/missing.pdf")).toBeVisible();
  await expect(modal.getByText("attachments/sample.pdf")).not.toBeVisible();

  await modal.getByRole("button", { name: "OK" }).click();
  await expectCallout(page, "Mock extracted text");
});

test.describe("loading and cancellation", () => {
  test.use({ ocrScript: "slow" });

  test("loading message and cancellation", async ({ page }) => {
    await createNote(page, "Extraction test", "![[attachments/sample.pdf]]");
    await openNote(page, "Extraction test");
    await extractCurrentNote(page);

    const modal = page.locator(".modal");
    await expect(
      modal.getByText("Extracting text from attachments..."),
    ).toBeVisible();

    await modal.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("Cancelled text extraction")).toBeVisible();
    await expectNoCallout(page);
  });
});

test.describe("error handling", () => {
  test.use({ ocrScript: "error" });

  test("error message", async ({ page }) => {
    await createNote(page, "Extraction test", "![[attachments/sample.pdf]]");
    await openNote(page, "Extraction test");
    await extractCurrentNote(page);

    const modal = page.locator(".modal");
    await expect(
      modal.getByText(
        "Error: Custom command failed with exit code 1 (see console for details)",
      ),
    ).toBeVisible();

    await modal.getByRole("button", { name: "OK" }).click();
    await expectNoCallout(page);
  });
});

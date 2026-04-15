import { expect, test } from "./fixtures";
import { createNote, extractCurrentNote, openNote } from "./helpers";

test.use({ mockOcrOutput: "Mock extracted text" });

test("successful extraction", async ({ page }) => {
  await createNote(page, "Extraction test", "![[attachments/sample.pdf]]");
  await openNote(page, "Extraction test");
  await extractCurrentNote(page);

  await page.locator(".callout-fold").click();
  await expect(page.getByText("Mock extracted text")).toBeVisible();
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
});

test.describe("loading and cancellation", () => {
  test.use({ ocrScript: "slow" });

  test("loading indicator", async ({ page }) => {
    await createNote(page, "Extraction test", "![[attachments/sample.pdf]]");
    await openNote(page, "Extraction test");
    await extractCurrentNote(page);

    const modal = page.locator(".modal");
    await expect(
      modal.getByText("Extracting text from attachments..."),
    ).toBeVisible();
  });

  test("cancelling extraction", async ({ page }) => {
    await createNote(page, "Extraction test", "![[attachments/sample.pdf]]");
    await openNote(page, "Extraction test");
    await extractCurrentNote(page);

    await page
      .locator(".modal")
      .getByRole("button", { name: "Cancel" })
      .click();

    await expect(page.locator(".modal")).not.toBeVisible();
    await expect(page.locator(".callout-fold")).not.toBeVisible();
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
  });
});

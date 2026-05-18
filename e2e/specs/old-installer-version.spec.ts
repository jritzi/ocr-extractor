import { expect } from "@playwright/test";
import { test } from "../fixtures";

const MODAL_TITLE = "Installer update required";

test("installer update modal when Electron version is below minimum", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "old-installer");

  const modal = page.locator(".modal");
  await expect(modal).toContainText(MODAL_TITLE);
  await expect(modal).toContainText(
    /requires a newer Obsidian installer version/,
  );

  await modal.getByRole("button", { name: "Dismiss" }).click();
  await expect(modal).not.toBeVisible();
});

test("no installer update modal for current Obsidian", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "old-installer");

  await expect(
    page.locator(".modal", { hasText: MODAL_TITLE }),
  ).not.toBeVisible();
});

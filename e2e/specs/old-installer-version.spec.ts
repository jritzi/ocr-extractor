import { expect } from "@playwright/test";
import { test } from "../fixtures";

test("installer update modal when Electron version is below minimum", async ({
  page,
}) => {
  const modal = page.locator(".modal");
  await expect(modal).toContainText("Installer update required");
  await expect(modal).toContainText(
    /requires a newer Obsidian installer version/,
  );

  await modal.getByRole("button", { name: "Dismiss" }).click();
  await expect(modal).not.toBeVisible();
});

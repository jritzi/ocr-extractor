import { expect, test } from "../../fixtures";
import { mockHttp } from "../../helpers/http";
import {
  OPENAI_COMPATIBLE_URL,
  openAiCompatibleSuccessResponse,
} from "../../helpers/openai-compatible";
import { openPluginSettings, settingItem } from "../../helpers/plugin";

const MODELS_URL = "http://localhost:11434/v1/models";

function modelsResponse(ids: string[]) {
  return { object: "list", data: ids.map((id) => ({ id, object: "model" })) };
}

test.use({
  settings: {
    ocrEngine: "openAiCompatible",
    openAiCompatibleBaseUrl: "http://localhost:11434/v1",
    openAiCompatibleModel: "model-2",
  },
});

test("model dropdown", async ({ page }) => {
  await mockHttp(
    page,
    "GET",
    MODELS_URL,
    200,
    modelsResponse(["model-1", "model-2"]),
  );

  await openPluginSettings(page);

  const dropdown = settingItem(page, "Model").locator("select");
  await expect(dropdown.locator("option")).toHaveText([
    "None",
    "model-1",
    "model-2",
  ]);
  await expect(dropdown).toHaveValue("model-2");
});

test("test button", async ({ page }) => {
  await mockHttp(page, "GET", MODELS_URL, 200, modelsResponse(["model-2"]));
  await mockHttp(
    page,
    "POST",
    OPENAI_COMPATIBLE_URL,
    200,
    openAiCompatibleSuccessResponse("OCR test"),
  );

  await openPluginSettings(page);

  await settingItem(page, "Model")
    .getByRole("button", { name: "Test" })
    .click();

  await expect(
    page.locator(".notice").getByText("Test succeeded"),
  ).toBeVisible();
});

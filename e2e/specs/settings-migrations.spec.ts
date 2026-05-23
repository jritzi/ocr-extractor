import { test } from "../fixtures";
import { mockHttp } from "../helpers/http";
import { MISTRAL_URL, mistralSuccessResponse } from "../helpers/mistral";
import { openNote, seedNote } from "../helpers/obsidian";
import { expectCallout, extractCurrentNote } from "../helpers/plugin";

const MOCK_RESPONSE = "Extracted text after migration";

test.describe("<1.2.0: Add ocrService", () => {
  test.use({
    settings: { ocrService: undefined, mistralApiKey: "fake-api-key" },
  });

  test("extraction after migration to mistral ocrService", async ({ page }) => {
    await mockHttp(
      page,
      "POST",
      MISTRAL_URL,
      200,
      mistralSuccessResponse(MOCK_RESPONSE),
    );
    await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
    await openNote(page, "Note");
    await extractCurrentNote(page);
    await expectCallout(page, MOCK_RESPONSE);
  });
});

test.describe("<2.0.0: Migrate mistralApiKey to mistralSecret (SecretStorage)", () => {
  test.use({
    settings: { ocrService: "mistral", mistralApiKey: "fake-api-key" },
  });

  test("extraction after migrating to SecretStorage", async ({ page }) => {
    await mockHttp(
      page,
      "POST",
      MISTRAL_URL,
      200,
      mistralSuccessResponse(MOCK_RESPONSE),
    );
    await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
    await openNote(page, "Note");
    await extractCurrentNote(page);
    await expectCallout(page, MOCK_RESPONSE);
  });
});

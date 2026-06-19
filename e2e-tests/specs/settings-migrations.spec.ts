import { test } from "../fixtures";
import { mockHttp } from "../helpers/http";
import { MISTRAL_URL, mistralSuccessResponse } from "../helpers/mistral";
import { openNote, seedNote } from "../helpers/obsidian";
import { expectCallout, extractActiveNote } from "../helpers/plugin";

const MOCK_RESPONSE = "Extracted text after migration";

test.describe("<1.2.0: Add ocrService", () => {
  test.use({
    settings: {
      ocrEngine: undefined,
      ocrService: undefined,
      mistralApiKey: "fake-api-key",
    },
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
    await extractActiveNote(page);
    await expectCallout(page, MOCK_RESPONSE);
  });
});

test.describe("<2.0.0: Migrate mistralApiKey to mistralSecret (SecretStorage)", () => {
  test.use({
    settings: {
      ocrEngine: undefined,
      ocrService: "mistral",
      mistralApiKey: "fake-api-key",
    },
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
    await extractActiveNote(page);
    await expectCallout(page, MOCK_RESPONSE);
  });
});

test.describe("<2.3.2: Rename ocrService to ocrEngine", () => {
  test.use({
    settings: {
      ocrEngine: undefined,
      ocrService: "mistral",
      mistralSecret: "mistral-key",
    },
  });

  test("extraction using the migrated engine", async ({ page }) => {
    await mockHttp(
      page,
      "POST",
      MISTRAL_URL,
      200,
      mistralSuccessResponse(MOCK_RESPONSE),
    );
    await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
    await openNote(page, "Note");
    await extractActiveNote(page);
    await expectCallout(page, MOCK_RESPONSE);
  });
});

test.describe("<2.3.2: Rename useEmbeddedText to preferEmbeddedText", () => {
  test.use({
    settings: { useEmbeddedText: true },
  });

  test("embedded text preferred over OCR after migration", async ({ page }) => {
    await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
    await openNote(page, "Note");
    await extractActiveNote(page);

    await expectCallout(page, /Sample PDF/);
  });
});

import { expect, test } from "../../fixtures";
import { expectHttpRequest, mockHttp } from "../../helpers/http";
import { MISTRAL_URL, mistralSuccessResponse } from "../../helpers/mistral";
import {
  clickModalButton,
  getModal,
  openNote,
  seedNote,
} from "../../helpers/obsidian";
import {
  expectCallout,
  expectNoCallout,
  extractActiveNote,
} from "../../helpers/plugin";

const MOCK_RESPONSE = "Mistral extracted text";

test.use({ settings: { ocrService: "mistral", mistralSecret: "mistral-key" } });

test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    app.secretStorage.setSecret("mistral-key", "fake-api-key");
  });
});

test("PDF extraction (document_url)", async ({ page }) => {
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

  await expectHttpRequest(page, "POST", MISTRAL_URL, {
    model: "mistral-ocr-latest",
    image_limit: 0,
    include_image_base64: false,
    document: {
      type: "document_url",
      document_url: expect.stringMatching(/^data:application\/pdf;base64,/),
    },
  });

  await expectCallout(page, MOCK_RESPONSE);
});

test("image extraction (image_url)", async ({ page }) => {
  await mockHttp(
    page,
    "POST",
    MISTRAL_URL,
    200,
    mistralSuccessResponse(MOCK_RESPONSE),
  );

  await seedNote(page, "Note", { content: "![[attachments/sample.png]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  await expectHttpRequest(page, "POST", MISTRAL_URL, {
    model: "mistral-ocr-latest",
    image_limit: 0,
    include_image_base64: false,
    document: {
      type: "image_url",
      image_url: expect.stringMatching(/^data:image\/png;base64,/),
    },
  });

  await expectCallout(page, MOCK_RESPONSE);
});

for (const status of [400, 422]) {
  test(`skipped attachment on ${status}`, async ({ page }) => {
    await mockHttp(page, "POST", MISTRAL_URL, status, {});

    await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
    await openNote(page, "Note");
    await extractActiveNote(page);

    const modal = getModal(page);
    await expect(
      modal.getByText(
        "Text extracted from 0 attachments. The following were skipped:",
      ),
    ).toBeVisible();
    await expect(modal.getByText("sample.pdf")).toBeVisible();
    await clickModalButton(page, "OK");
    await expectNoCallout(page);
  });
}

test("skipped attachment on unsupported file type", async ({ page }) => {
  await seedNote(page, "Note", { content: "![[attachments/sample.xml]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  const modal = getModal(page);
  await expect(
    modal.getByText(
      "Text extracted from 0 attachments. The following were skipped:",
    ),
  ).toBeVisible();
  await expect(modal.getByText("sample.xml")).toBeVisible();
  await clickModalButton(page, "OK");
  await expectNoCallout(page);
});

test("unauthorized error on 401", async ({ page }) => {
  await mockHttp(page, "POST", MISTRAL_URL, 401, {});

  await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  const modal = getModal(page);
  await expect(
    modal.getByText("Unauthorized. Check your API key."),
  ).toBeVisible();
  await clickModalButton(page, "OK");
  await expectNoCallout(page);
});

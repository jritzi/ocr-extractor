import { expect, test } from "../../fixtures";
import { expectHttpRequest, mockHttp } from "../../helpers/http";
import {
  OPENAI_COMPATIBLE_URL,
  openAiCompatibleSuccessResponse,
} from "../../helpers/openai-compatible";
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

const CUSTOM_PROMPT = "Return plain text only, no markdown.";

test.use({
  settings: {
    ocrEngine: "openAiCompatible",
    openAiCompatibleBaseUrl: "http://localhost:11434/v1",
    openAiCompatibleModel: "test-model",
    openAiCompatiblePrompt: CUSTOM_PROMPT,
  },
});

test("PDF extraction (sent as PNG images)", async ({ page }) => {
  await mockHttp(
    page,
    "POST",
    OPENAI_COMPATIBLE_URL,
    200,
    openAiCompatibleSuccessResponse("Extracted text"),
  );

  await seedNote(page, "Note", { content: "![[attachments/sample.pdf]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  await expectHttpRequest(page, "POST", OPENAI_COMPATIBLE_URL, {
    model: "test-model",
    temperature: 0,
    max_tokens: 16384,
    max_completion_tokens: 16384,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: CUSTOM_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: expect.stringMatching(/^data:image\/png;base64,/),
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  await expectCallout(page, "Extracted text");
});

test("WebP attachment re-encoded as PNG", async ({ page }) => {
  await mockHttp(
    page,
    "POST",
    OPENAI_COMPATIBLE_URL,
    200,
    openAiCompatibleSuccessResponse("Extracted text"),
  );

  await seedNote(page, "Note", { content: "![[attachments/sample.webp]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  await expectHttpRequest(page, "POST", OPENAI_COMPATIBLE_URL, {
    messages: [
      expect.objectContaining({
        content: expect.arrayContaining([
          expect.objectContaining({
            type: "image_url",
            image_url: expect.objectContaining({
              url: expect.stringMatching(/^data:image\/png;base64,/),
            }),
          }),
        ]),
      }),
    ],
  });

  await expectCallout(page, "Extracted text");
});

test("skipped attachment on 400", async ({ page }) => {
  await mockHttp(page, "POST", OPENAI_COMPATIBLE_URL, 400, {});

  await seedNote(page, "Note", { content: "![[attachments/sample.png]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  const modal = getModal(page);
  await expect(
    modal.getByText(
      "Text extracted from 0 attachments. The following were skipped:",
    ),
  ).toBeVisible();
  await expect(modal.getByText("sample.png")).toBeVisible();
  await clickModalButton(page, "OK");
  await expectNoCallout(page);
});

test("unauthorized error on 401", async ({ page }) => {
  await mockHttp(page, "POST", OPENAI_COMPATIBLE_URL, 401, {});

  await seedNote(page, "Note", { content: "![[attachments/sample.png]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  const modal = getModal(page);
  await expect(
    modal.getByText("Unauthorized. Check your API key."),
  ).toBeVisible();
  await clickModalButton(page, "OK");
  await expectNoCallout(page);
});

test("code fence wrapping the whole response", async ({ page }) => {
  await mockHttp(
    page,
    "POST",
    OPENAI_COMPATIBLE_URL,
    200,
    openAiCompatibleSuccessResponse("```markdown\n# Heading\n\nBody\n```"),
  );

  await seedNote(page, "Note", { content: "![[attachments/sample.png]]" });
  await openNote(page, "Note");
  await extractActiveNote(page);

  // No literal "# Heading" in code block
  await expectCallout(page, "Heading\nBody");
});

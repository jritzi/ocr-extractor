import OpenAI from "openai";
import { UserFacingError } from "../ocr-service";
import { stripCodeFence } from "../../utils/markdown";
import { t } from "../../i18n";

export const DEFAULT_PROMPT =
  "Convert this image to Markdown. Transcribe all text exactly as it appears, following the natural reading order and preserving structure such as headings, lists, and tables. Do not translate, summarize, or add any text that is not present in the image. Return only the Markdown, with no commentary.";

// Larger than any realistic OCR output from a single image (specified to avoid
// models with a small default limit truncating the response)
const MAX_TOKENS = 16384;

// Local servers don't need a key, but the SDK requires a non-empty value
const PLACEHOLDER_API_KEY = "no-key";

interface OpenAiCompatibleClientConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  prompt: string;
}

export class OpenAiCompatibleClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly prompt: string;

  constructor({
    baseUrl,
    model,
    apiKey,
    prompt,
  }: OpenAiCompatibleClientConfig) {
    const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
    if (!trimmedBaseUrl) throw new UserFacingError(t("errors.noBaseUrl"));

    this.model = model.trim();
    if (!this.model) throw new UserFacingError(t("errors.noModel"));

    this.prompt = prompt.trim() || DEFAULT_PROMPT;

    this.client = new OpenAI({
      baseURL: trimmedBaseUrl,
      apiKey: apiKey || PLACEHOLDER_API_KEY,
      timeout: 120_000, // 2 minutes
      // This isn't dangerous because Obsidian runs in Electron (not a
      // regular browser), so the key stays local.
      dangerouslyAllowBrowser: true,
    });
  }

  /**
   * Lists the model ids the server advertises or null if it can't be fetched
   */
  async listModels() {
    const response = await this.client.models.list({
      // Fail fast
      timeout: 10_000,
      maxRetries: 0,
    });
    return response.data.map((model) => model.id).sort();
  }

  async extractText(dataUrl: string, signal: AbortSignal) {
    const completion = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: this.prompt },
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "high" },
              },
            ],
          },
        ],
        temperature: 0,
        // Include old and new max tokens fields for maximum compatibility
        max_tokens: MAX_TOKENS,
        max_completion_tokens: MAX_TOKENS,
      },
      { signal },
    );

    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") {
      throw new UserFacingError(t("errors.openAiCompatibleResponseTruncated"));
    }

    return stripCodeFence(choice?.message?.content ?? "");
  }
}

import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  OpenAI,
} from "openai";
import { AttachmentFailedError, FatalError } from "../ocr-engine";
import { throwIfFatalHttpStatus } from "../http-error";
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
    if (!trimmedBaseUrl) throw new FatalError(t("errors.noBaseUrl"));

    this.model = model.trim();

    this.prompt = prompt.trim() || DEFAULT_PROMPT;

    this.client = new OpenAI({
      baseURL: trimmedBaseUrl,
      apiKey: apiKey || PLACEHOLDER_API_KEY,
      timeout: 120_000, // 2 minutes
      // Required to run outside Node. Obsidian is a local Electron/mobile app,
      // not a public web app in a browser, so the threat model is different.
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
    return response.data
      .map((model) => model.id)
      .sort((first, second) => first.localeCompare(second));
  }

  async extractText(dataUrl: string, signal: AbortSignal) {
    if (!this.model) throw new FatalError(t("errors.noModel"));

    const completion = await this.requestCompletion(dataUrl, signal);

    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") {
      throw new AttachmentFailedError("responseTruncated");
    }

    return stripCodeFence(choice?.message?.content ?? "");
  }

  private async requestCompletion(dataUrl: string, signal: AbortSignal) {
    try {
      return await this.client.chat.completions.create(
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
    } catch (error) {
      if (signal.aborted) throw error;

      if (error instanceof APIConnectionTimeoutError) {
        throw new AttachmentFailedError("requestTimeout");
      }

      if (error instanceof APIConnectionError) {
        throw new FatalError(t("errors.openAiCompatibleConnectionFailed"), {
          cause: error,
        });
      }

      if (error instanceof APIError) {
        const status =
          typeof error.status === "number" ? error.status : undefined;

        throwIfFatalHttpStatus(status, error);

        if (status === 404) {
          throw new FatalError(t("errors.openAiCompatibleNotFound"), {
            cause: error,
          });
        }

        throw new AttachmentFailedError(
          "rejectedByEngine",
          `HTTP ${status}: ${error.message}`,
        );
      }

      throw error;
    }
  }
}

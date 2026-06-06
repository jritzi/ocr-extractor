import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  OpenAI,
} from "openai";
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

  /**
   * Extracts text from an image data URL. Returns null if the model rejects
   * the request.
   */
  async extractText(dataUrl: string, signal: AbortSignal) {
    if (!this.model) throw new UserFacingError(t("errors.noModel"));

    try {
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
        throw new UserFacingError(
          t("errors.openAiCompatibleResponseTruncated"),
        );
      }

      return stripCodeFence(choice?.message?.content ?? "");
    } catch (error) {
      if (signal.aborted) throw error;

      if (
        error instanceof APIConnectionTimeoutError ||
        error instanceof APIConnectionError
      ) {
        throw new UserFacingError(t("errors.openAiCompatibleConnectionFailed"));
      }

      if (error instanceof APIError) {
        if (error.status === 400 || error.status === 422) {
          console.warn(
            `Request rejected by model (HTTP ${error.status}):`,
            error.message,
          );
          return null;
        } else if (error.status === 401 || error.status === 403) {
          throw new UserFacingError(t("errors.unauthorized"));
        } else if (error.status === 404) {
          throw new UserFacingError(t("errors.openAiCompatibleNotFound"));
        } else if (error.status === 429) {
          throw new UserFacingError(t("errors.rateLimited"));
        } else if (error.status >= 500) {
          console.error(
            `OpenAI-compatible server error (HTTP ${error.status}):`,
            error.message,
          );
          throw new UserFacingError(
            t("errors.serverError", { status: error.status }),
          );
        } else {
          console.error(
            `OpenAI-compatible request failed (HTTP ${error.status}):`,
            error.message,
          );
          throw new UserFacingError(
            t("errors.openAiCompatibleRequestFailed", { status: error.status }),
          );
        }
      }

      throw error;
    }
  }
}

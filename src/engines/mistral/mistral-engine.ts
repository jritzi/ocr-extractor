import { Mistral } from "@mistralai/mistralai";
import {
  ConnectionError,
  RequestTimeoutError,
  UnexpectedClientError,
} from "@mistralai/mistralai/models/errors/httpclienterrors";
import { MistralError } from "@mistralai/mistralai/models/errors/mistralerror";
import {
  AttachmentFailedError,
  AttachmentSkippedError,
  type ExtractPagesOptions,
  FatalError,
  OcrEngine,
} from "../ocr-engine";
import { throwIfFatalHttpStatus } from "../http-error";
import type OcrExtractorPlugin from "../../../main";
import { MistralSettings } from "./mistral-settings";
import { toDataUrl } from "../../utils/encoding";
import { t } from "../../i18n";

const REQUEST_TIMEOUT = 60_000; // 1 minute

const BACKOFF = {
  initialInterval: 500,
  maxInterval: 10000,
  exponent: 1.5,
  maxElapsedTime: 10000,
};

export class MistralEngine extends OcrEngine {
  static getLabel() {
    return t("engines.mistralOcr");
  }

  static getSettings(plugin: OcrExtractorPlugin) {
    return new MistralSettings(plugin);
  }

  protected isMimeTypeSupported(mimeType: string) {
    return mimeType !== "application/xml";
  }

  protected async extractPages(
    data: Uint8Array,
    { mimeType, signal }: ExtractPagesOptions,
  ) {
    const apiKey =
      this.secretStorage.getSecret(this.settings.mistralSecret) ?? "";
    const mistral = new Mistral({ apiKey });

    const isImage = mimeType.startsWith("image/");
    const url = toDataUrl(data, mimeType);

    const document = isImage
      ? ({ type: "image_url", imageUrl: url } as const)
      : ({ type: "document_url", documentUrl: url } as const);

    const controller = new AbortController();
    const abortRequest = () => controller.abort(signal.reason);
    signal.addEventListener("abort", abortRequest, { once: true });
    if (signal.aborted) abortRequest();
    const timeout = window.setTimeout(() => {
      // Matches the `AbortSignal.timeout()` exception
      controller.abort(new DOMException("Timed out", "TimeoutError"));
    }, REQUEST_TIMEOUT);

    try {
      const ocrResponse = await mistral.ocr.process(
        {
          model: "mistral-ocr-latest",
          document,
          // Do not extract images
          imageLimit: 0,
          imageMinSize: 0,
          includeImageBase64: false,
        },
        {
          signal: controller.signal,
          retries: { strategy: "backoff", backoff: BACKOFF },
        },
      );

      return ocrResponse.pages.map((page) => page.markdown);
    } catch (error) {
      if (signal.aborted) throw error;

      if (error instanceof MistralError) {
        if (error.statusCode === 400 || error.statusCode === 422) {
          // These could be one of several skip or fail reasons, but since
          // Mistral doesn't easily distinguish between them, choose skip
          throw new AttachmentSkippedError(
            "unsupportedByEngine",
            `HTTP ${error.statusCode}: ${error.message}`,
          );
        }

        throwIfFatalHttpStatus(error.statusCode, error);

        throw new AttachmentFailedError(
          "rejectedByEngine",
          `HTTP ${error.statusCode}: ${error.message}`,
        );
      }

      if (error instanceof RequestTimeoutError) {
        throw new AttachmentFailedError("requestTimeout");
      }

      if (
        error instanceof ConnectionError ||
        error instanceof UnexpectedClientError
      ) {
        throw new FatalError(t("errors.connectionFailed"), { cause: error });
      }

      throw error;
    } finally {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", abortRequest);
    }
  }
}

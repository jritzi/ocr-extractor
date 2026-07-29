import type { SettingGroup } from "obsidian";
import type OcrExtractorPlugin from "../../main";
import {
  AttachmentFailedError,
  AttachmentSkippedError,
  FatalError,
} from "./ocr-engine";
import { describeReason } from "../result-reason";
import { logError, logWarning } from "../utils/logging";
import { showNotice } from "../utils/notice";
import { t } from "../i18n";

export abstract class OcrEngineSettings {
  constructor(
    protected readonly group: SettingGroup,
    protected readonly plugin: OcrExtractorPlugin,
  ) {}

  protected showTestError(error: unknown) {
    if (error instanceof FatalError) {
      logWarning(`Engine test failed: ${error.message}`, error.cause);
      showNotice(t("notices.testFailed", { message: error.message }), {
        variant: "error",
      });
    } else if (
      error instanceof AttachmentSkippedError ||
      error instanceof AttachmentFailedError
    ) {
      // A skip is a failed test too, since the test image has text
      logWarning(`Engine test failed: ${error.message}`);
      showNotice(
        t("notices.testFailed", { message: describeReason(error.reason) }),
        { variant: "error" },
      );
    } else {
      logError("Engine test failed with an unexpected error", error);
      showNotice(t("notices.testFailedUnexpected"), { variant: "error" });
    }
  }

  abstract display(): void;
}

export type OcrEngineSettingsClass = new (
  ...args: ConstructorParameters<typeof OcrEngineSettings>
) => OcrEngineSettings;

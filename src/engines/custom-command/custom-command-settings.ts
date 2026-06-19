import { Platform } from "obsidian";
import { OcrEngineSettings } from "../ocr-engine-settings";
import { UserFacingError } from "../ocr-engine";
import { CustomCommandRunner } from "./custom-command-runner";
import { createTestImage, TEST_IMAGE_TEXT } from "../../utils/image";
import {
  showErrorNotice,
  showLoadingNotice,
  showNotice,
  showSuccessNotice,
} from "../../utils/notice";
import { t } from "../../i18n";

export class CustomCommandSettingsSection extends OcrEngineSettings {
  display() {
    this.group.addSetting((setting) => {
      setting
        .setName(t("settings.command"))
        .setDesc(t("settings.commandDesc"))
        .addTextArea((text) =>
          text
            .setPlaceholder(t("settings.commandPlaceholder"))
            .setValue(this.plugin.settings.customCommand)
            .onChange(
              (value) => void this.plugin.saveSetting("customCommand", value),
            ),
        )
        .addButton((button) =>
          button
            .setButtonText(t("settings.test"))
            .setTooltip(t("settings.testTooltip"))
            .setDisabled(!Platform.isDesktop)
            .onClick(() => void this.testCommand()),
        );
    });

    this.group.addSetting((setting) => {
      setting
        .setName(t("settings.convertPdfs"))
        .setDesc(t("settings.convertPdfsDesc"))
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.customCommandConvertPdfs)
            .onChange(
              (value) =>
                void this.plugin.saveSetting("customCommandConvertPdfs", value),
            ),
        );
    });
  }

  private async testCommand() {
    const command = this.plugin.settings.customCommand.trim();
    if (!command) {
      showErrorNotice(
        t("notices.testFailed", { message: t("errors.noCustomCommand") }),
      );
      return;
    }

    const runner = new CustomCommandRunner();
    const loadingNotice = showLoadingNotice(t("notices.testingCommand"));

    try {
      const testPng = await createTestImage();
      const result = await runner.run(
        testPng,
        command,
        "png",
        new AbortController().signal,
      );
      if (!result) {
        showErrorNotice(t("notices.testNoOutput"));
      } else if (result.trim() === TEST_IMAGE_TEXT) {
        showSuccessNotice(t("notices.testSucceeded"));
      } else {
        showNotice(
          t("notices.testMismatch", {
            expected: TEST_IMAGE_TEXT,
            actual: result.trim(),
          }),
        );
      }
    } catch (error) {
      if (error instanceof UserFacingError) {
        showErrorNotice(t("notices.testFailed", { message: error.message }));
      } else {
        console.error("Custom command test failed:", error);
        showErrorNotice(t("notices.testFailedUnexpected"));
      }
    } finally {
      loadingNotice.hide();
    }
  }
}

import { Platform } from "obsidian";
import { OcrEngineSettings } from "../ocr-engine-settings";
import { CustomCommandRunner } from "./custom-command-runner";
import { createTestImage, TEST_IMAGE_TEXT } from "../../utils/image";
import { showLoadingNotice, showNotice } from "../../utils/notice";
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
      showNotice(
        t("notices.testFailed", { message: t("errors.noCustomCommand") }),
        { variant: "error" },
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
        showNotice(t("notices.testNoOutput"), { variant: "error" });
      } else if (result.trim() === TEST_IMAGE_TEXT) {
        showNotice(t("notices.testSucceeded"), { variant: "success" });
      } else {
        showNotice(
          t("notices.testMismatch", {
            expected: TEST_IMAGE_TEXT,
            actual: result.trim(),
          }),
        );
      }
    } catch (error) {
      this.showTestError(error);
    } finally {
      loadingNotice.hide();
    }
  }
}

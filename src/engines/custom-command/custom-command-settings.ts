import { Platform } from "obsidian";
import { EngineSettingItem, OcrEngineSettings } from "../ocr-engine-settings";
import { CustomCommandRunner } from "./custom-command-runner";
import { createTestImage, TEST_IMAGE_TEXT } from "../../utils/image";
import { showLoadingNotice, showNotice } from "../../utils/notice";
import { t } from "../../i18n";

export class CustomCommandSettings extends OcrEngineSettings {
  getSettingItems(): EngineSettingItem[] {
    return [
      {
        name: t("settings.command"),
        desc: t("settings.commandDesc"),
        render: (setting) => {
          setting
            .addTextArea((text) =>
              text
                .setPlaceholder(t("settings.commandPlaceholder"))
                .setValue(this.plugin.settings.customCommand)
                .onChange(
                  (value) =>
                    void this.plugin.saveSetting("customCommand", value),
                ),
            )
            .addButton((button) =>
              button
                .setButtonText(t("settings.test"))
                .setTooltip(t("settings.testTooltip"))
                .setDisabled(!Platform.isDesktop)
                .onClick(() => void this.testCommand()),
            );
        },
      },
      {
        name: t("settings.convertPdfs"),
        desc: t("settings.convertPdfsDesc"),
        control: { type: "toggle", key: "customCommandConvertPdfs" },
      },
    ];
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

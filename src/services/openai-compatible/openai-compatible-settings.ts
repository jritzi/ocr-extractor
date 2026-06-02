import type { DropdownComponent } from "obsidian";
import { debounce, SecretComponent } from "obsidian";
import { OcrServiceSettings } from "../ocr-service-settings";
import { UserFacingError } from "../ocr-service";
import {
  DEFAULT_PROMPT,
  OpenAiCompatibleClient,
} from "./openai-compatible-client";
import { createTestImage, TEST_IMAGE_TEXT } from "../../utils/image";
import { toDataUrl } from "../../utils/encoding";
import {
  showErrorNotice,
  showLoadingNotice,
  showNotice,
  showSuccessNotice,
} from "../../utils/notice";
import { assert } from "../../utils/assert";
import { t } from "../../i18n";

export class OpenAiCompatibleSettingsSection extends OcrServiceSettings {
  private modelDropdown?: DropdownComponent;
  private readonly refreshModelsDebounced = debounce(
    () => void this.refreshModels(),
    300,
    true,
  );

  display() {
    const { settings } = this.plugin;

    this.group.addSetting((setting) => {
      setting
        .setName(t("settings.openAiCompatibleBaseUrl"))
        .setDesc(t("settings.openAiCompatibleBaseUrlDesc"))
        .addText((text) =>
          text.setValue(settings.openAiCompatibleBaseUrl).onChange((value) => {
            void this.plugin.saveSetting("openAiCompatibleBaseUrl", value);
            this.refreshModelsDebounced();
          }),
        );
    });

    this.group.addSetting((setting) => {
      setting
        .setName(t("settings.openAiCompatibleModel"))
        .addDropdown((dropdown) => {
          this.modelDropdown = dropdown;
          dropdown.onChange(
            (value) =>
              void this.plugin.saveSetting("openAiCompatibleModel", value),
          );
        })
        .addButton((button) =>
          button
            .setIcon("refresh-cw")
            .setTooltip(t("settings.refreshModels"))
            .onClick(() => void this.refreshModels(true)),
        )
        .addButton((button) =>
          button
            .setButtonText(t("settings.test"))
            .setTooltip(t("settings.testTooltip"))
            .onClick(() => void this.testConnection()),
        );

      void this.refreshModels();
    });

    this.group.addSetting((setting) => {
      setting
        .setName(t("settings.apiKey"))
        .setDesc(t("settings.openAiCompatibleApiKeyDesc"))
        .addComponent((el) =>
          new SecretComponent(this.plugin.app, el)
            .setValue(settings.openAiCompatibleSecret)
            .onChange(
              (value) =>
                void this.plugin.saveSetting("openAiCompatibleSecret", value),
            ),
        );
    });

    this.group.addSetting((setting) => {
      setting
        .setName(t("settings.openAiCompatiblePrompt"))
        .setDesc(t("settings.openAiCompatiblePromptDesc"))
        .addTextArea((text) =>
          text
            .setPlaceholder(DEFAULT_PROMPT)
            .setValue(settings.openAiCompatiblePrompt)
            .onChange(
              (value) =>
                void this.plugin.saveSetting("openAiCompatiblePrompt", value),
            ),
        );
    });
  }

  private async refreshModels(notifyOnError = false) {
    assert(this.modelDropdown, "Always set before this function is called");
    this.modelDropdown.selectEl.empty();
    this.modelDropdown.addOption("", t("settings.modelsLoading"));
    this.modelDropdown.setDisabled(true);

    const models = await this.fetchModels();
    const savedModel = this.plugin.settings.openAiCompatibleModel;

    this.modelDropdown.selectEl.empty();
    this.modelDropdown.addOption("", t("settings.modelNone"));

    if (!models) {
      if (savedModel) this.modelDropdown.addOption(savedModel, savedModel);
      if (notifyOnError) showErrorNotice(t("notices.modelsLoadFailed"));
    } else {
      if (savedModel && !models.includes(savedModel)) {
        this.modelDropdown.addOption(
          savedModel,
          t("settings.modelNotFound", { model: savedModel }),
        );
      }

      for (const modelId of models) {
        this.modelDropdown.addOption(modelId, modelId);
      }
    }

    this.modelDropdown.setDisabled(false);
    this.modelDropdown.setValue(savedModel || "");
  }

  private async fetchModels() {
    if (!this.plugin.settings.openAiCompatibleBaseUrl.trim()) return null;

    try {
      return await this.createClient().listModels();
    } catch (error) {
      console.error("Failed to list OpenAI-compatible models:", error);
      return null;
    }
  }

  private async testConnection() {
    const loadingNotice = showLoadingNotice(t("notices.testingConnection"));

    try {
      const client = this.createClient();
      const testImageDataUrl = toDataUrl(await createTestImage(), "image/png");
      const result = await client.extractText(
        testImageDataUrl,
        new AbortController().signal,
      );

      if (result.toLowerCase().includes(TEST_IMAGE_TEXT.toLowerCase())) {
        showSuccessNotice(t("notices.testSucceeded"));
      } else {
        showNotice(
          t("notices.testMismatch", {
            expected: TEST_IMAGE_TEXT,
            actual: result,
          }),
        );
      }
    } catch (error) {
      if (error instanceof UserFacingError) {
        showErrorNotice(t("notices.testFailed", { message: error.message }));
      } else {
        console.error("OpenAI-compatible connection test failed:", error);
        showErrorNotice(t("notices.testFailedUnexpected"));
      }
    } finally {
      loadingNotice.hide();
    }
  }

  private createClient() {
    const { settings } = this.plugin;

    return new OpenAiCompatibleClient({
      baseUrl: settings.openAiCompatibleBaseUrl,
      model: settings.openAiCompatibleModel,
      apiKey:
        this.plugin.app.secretStorage.getSecret(
          settings.openAiCompatibleSecret,
        ) ?? "",
      prompt: settings.openAiCompatiblePrompt,
    });
  }
}

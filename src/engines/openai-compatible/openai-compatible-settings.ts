import type { ButtonComponent, DropdownComponent } from "obsidian";
import { debounce, SecretComponent } from "obsidian";
import { OcrEngineSettings } from "../ocr-engine-settings";
import { UserFacingError } from "../ocr-engine";
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

export class OpenAiCompatibleSettingsSection extends OcrEngineSettings {
  private modelDropdown?: DropdownComponent;
  private refreshButton?: ButtonComponent;
  private testButton?: ButtonComponent;
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
        .addButton((button) => {
          this.refreshButton = button;
          button
            .setIcon("refresh-cw")
            .setTooltip(t("settings.refreshModels"))
            .onClick(() => void this.refreshModels(true));
        })
        .addButton((button) => {
          this.testButton = button;
          button
            .setButtonText(t("settings.test"))
            .setTooltip(t("settings.testTooltip"))
            .onClick(() => void this.testConnection());
        });

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

  private setLoading(isLoading: boolean) {
    this.modelDropdown?.setDisabled(isLoading);
    this.refreshButton?.setDisabled(isLoading);
    this.testButton?.setDisabled(isLoading);
  }

  private async refreshModels(notifyOnError = false) {
    assert(this.modelDropdown, "Always set before this function is called");
    this.setLoading(true);
    this.refreshButton?.buttonEl.addClass("ocr-extractor-spinning");

    try {
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

      this.modelDropdown.setValue(savedModel || "");
    } finally {
      this.setLoading(false);
      this.refreshButton?.buttonEl.removeClass("ocr-extractor-spinning");
    }
  }

  private async fetchModels() {
    if (!this.plugin.settings.openAiCompatibleBaseUrl.trim()) return null;

    try {
      return await this.createClient().listModels();
    } catch {
      return null;
    }
  }

  private async testConnection() {
    this.setLoading(true);
    const loadingNotice = showLoadingNotice(t("notices.testingConnection"));

    try {
      const client = this.createClient();
      const testImageDataUrl = toDataUrl(await createTestImage(), "image/png");
      const result = await client.extractText(
        testImageDataUrl,
        new AbortController().signal,
      );

      if (
        result === null ||
        !result.toLowerCase().includes(TEST_IMAGE_TEXT.toLowerCase())
      ) {
        showNotice(
          t("notices.testMismatch", {
            expected: TEST_IMAGE_TEXT,
            actual: result ?? "",
          }),
        );
      } else {
        showSuccessNotice(t("notices.testSucceeded"));
      }
    } catch (error) {
      if (error instanceof UserFacingError) {
        showErrorNotice(t("notices.testFailed", { message: error.message }));
      } else {
        console.error("OpenAI-compatible connection test failed:", error);
        showErrorNotice(t("notices.testFailedUnexpected"));
      }
    } finally {
      this.setLoading(false);
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

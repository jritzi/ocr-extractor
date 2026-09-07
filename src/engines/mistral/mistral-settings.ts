import { SecretComponent } from "obsidian";
import { EngineSettingItem, OcrEngineSettings } from "../ocr-engine-settings";
import { t } from "../../i18n";

export class MistralSettings extends OcrEngineSettings {
  getSettingItems(): EngineSettingItem[] {
    return [
      {
        name: t("settings.apiKey"),
        render: (setting) => {
          setting.addComponent((el) =>
            new SecretComponent(this.plugin.app, el)
              .setValue(this.plugin.settings.mistralSecret)
              .onChange(
                (value) => void this.plugin.saveSetting("mistralSecret", value),
              ),
          );
        },
      },
    ];
  }
}

import { SecretComponent } from "obsidian";
import { OcrServiceSettings } from "../ocr-service-settings";
import { t } from "../../i18n";

export class MistralSettingsSection extends OcrServiceSettings {
  display() {
    this.group.addSetting((setting) => {
      setting
        .setName(t("settings.apiKey"))
        .addComponent((el) =>
          new SecretComponent(this.plugin.app, el)
            .setValue(this.plugin.settings.mistralSecret)
            .onChange(
              (value) => void this.plugin.saveSetting("mistralSecret", value),
            ),
        );
    });
  }
}

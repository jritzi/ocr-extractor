import { EngineSettingItem, OcrEngineSettings } from "../ocr-engine-settings";
import { t } from "../../i18n";

export class MistralSettings extends OcrEngineSettings {
  getSettingItems(): EngineSettingItem[] {
    return [
      {
        name: t("settings.apiKey"),
        control: { type: "secret", key: "mistralSecret" },
      },
    ];
  }
}

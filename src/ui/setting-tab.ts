import type { SettingDefinitionItem } from "obsidian";
import { App, PluginSettingTab } from "obsidian";
import OcrExtractorPlugin, { OCR_ENGINES } from "../../main";
import {
  DEFAULT_SETTINGS,
  PluginSettings,
  shouldUseMobileEngineFallback,
} from "../settings";
import type { OcrEngineSettings } from "../engines/ocr-engine-settings";
import { showNotice } from "../utils/notice";
import { assert } from "../utils/assert";
import { t } from "../i18n";

export class SettingTab extends PluginSettingTab {
  plugin: OcrExtractorPlugin;
  private readonly settingsByEngine = new Map<string, OcrEngineSettings>();

  constructor(app: App, plugin: OcrExtractorPlugin) {
    super(app, plugin);
    this.plugin = plugin;

    for (const [name, Engine] of Object.entries(OCR_ENGINES)) {
      const settings = Engine.getSettings(plugin);
      if (settings) this.settingsByEngine.set(name, settings);
    }
  }

  getSettingDefinitions() {
    const { ocrEngine } = this.plugin.settings;
    const engineOptions = Object.fromEntries(
      Object.entries(OCR_ENGINES).map(([name, Engine]) => [
        name,
        Engine.getLabel(),
      ]),
    );

    const description = createFragment();
    description.appendText(t("settings.ocrEngineDesc") + " ");
    description.createEl("a", {
      text: t("settings.ocrEngineDocLink"),
      href: "https://github.com/jritzi/ocr-extractor#ocr-engines",
    });

    const items: SettingDefinitionItem<keyof PluginSettings>[] = [
      {
        name: t("settings.ocrEngine"),
        desc: description,
        control: { type: "dropdown", key: "ocrEngine", options: engineOptions },
      },
    ];

    const engineSettings = this.settingsByEngine.get(ocrEngine);
    if (engineSettings) {
      items.push({
        type: "group",
        heading: OCR_ENGINES[ocrEngine].getLabel(),
        items: engineSettings.getSettingItems(),
      });
    }

    items.push({
      type: "group",
      heading: t("settings.extraction"),
      items: [
        {
          name: t("settings.preferEmbeddedText"),
          desc: t("settings.preferEmbeddedTextDesc"),
          control: { type: "toggle", key: "preferEmbeddedText" },
        },
        {
          name: t("settings.autoExtractAttachments"),
          desc: t("settings.autoExtractAttachmentsDesc"),
          control: { type: "toggle", key: "autoExtractAttachments" },
        },
      ],
    });

    return items;
  }

  // Override default (which mutates settings) to keep settings immutable
  async setControlValue(key: string, value: unknown) {
    assertSettingKey(key);
    await this.plugin.saveSetting(key, value as PluginSettings[typeof key]);

    if (key === "ocrEngine") {
      if (shouldUseMobileEngineFallback(this.plugin.settings)) {
        showNotice(
          t("notices.mobileEngineFallbackSetting", {
            pluginName: t("pluginName"),
          }),
        );
      }

      // Update to show only the selected engine's settings
      this.update();
    }
  }
}

function assertSettingKey(key: string): asserts key is keyof PluginSettings {
  assert(
    key in DEFAULT_SETTINGS,
    "Only PluginSettings keys reach setControlValue()",
  );
}

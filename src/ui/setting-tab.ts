import type { SettingDefinitionItem } from "obsidian";
import { App, PluginSettingTab } from "obsidian";
import OcrExtractorPlugin, { OCR_ENGINES } from "../../main";
import {
  DEFAULT_SETTINGS,
  PluginSettings,
  shouldUseMobileEngineFallback,
} from "../settings";
import type { OcrEngineSettings } from "../engines/ocr-engine-settings";
import { AddPropertyModal } from "./add-property-modal";
import { showNotice } from "../utils/notice";
import { assert } from "../utils/assert";
import { t } from "../i18n";

const RERENDER_ON_CHANGE = new Set<keyof PluginSettings>([
  "ocrEngine",
  "propertiesToExtractFrom",
]);

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
    const { ocrEngine, propertiesToExtractFrom } = this.plugin.settings;
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
        {
          type: "page",
          name: t("settings.propertiesToExtractFrom"),
          desc: t("settings.propertiesToExtractFromDesc"),
          displayValue: () => {
            const { propertiesToExtractFrom } = this.plugin.settings;
            return propertiesToExtractFrom.length > 0
              ? t("settings.propertiesToExtractFromCount", {
                  count: propertiesToExtractFrom.length,
                })
              : "";
          },
          items: [
            {
              type: "list",
              emptyState: t("settings.propertiesToExtractFromEmpty"),
              addItem: {
                name: t("settings.addProperty"),
                action: () => {
                  new AddPropertyModal(
                    this.app,
                    propertiesToExtractFrom,
                    (name) => void this.addPropertyToExtractFrom(name),
                  ).open();
                },
              },
              onDelete: (index) => void this.deletePropertyToExtractFrom(index),
              items: propertiesToExtractFrom.map((name) => ({
                name: formatPropertyName(name),
                searchable: false,
              })),
            },
          ],
        },
      ],
    });

    return items;
  }

  // Override default (which mutates settings) to keep settings immutable
  async setControlValue(key: string, value: unknown) {
    assertSettingKey(key);
    await this.plugin.saveSetting(key, value as PluginSettings[typeof key]);

    if (
      key === "ocrEngine" &&
      shouldUseMobileEngineFallback(this.plugin.settings)
    ) {
      showNotice(
        t("notices.mobileEngineFallbackSetting", {
          pluginName: t("pluginName"),
        }),
      );
    }

    if (RERENDER_ON_CHANGE.has(key)) this.update();
  }

  private async addPropertyToExtractFrom(name: string) {
    const { propertiesToExtractFrom } = this.plugin.settings;
    await this.setControlValue("propertiesToExtractFrom", [
      ...propertiesToExtractFrom,
      name,
    ]);
  }

  private async deletePropertyToExtractFrom(index: number) {
    const { propertiesToExtractFrom } = this.plugin.settings;
    await this.setControlValue(
      "propertiesToExtractFrom",
      propertiesToExtractFrom.filter((_, other) => other !== index),
    );
  }
}

/**
 * Show a name with leading and/or trailing spaces in quotes with non-breaking
 * spaces, to clearly distinguish it from the version without spaces.
 */
function formatPropertyName(name: string) {
  if (name === name.trim()) return name;
  return `"${name.replaceAll(" ", "\u00a0")}"`;
}

function assertSettingKey(key: string): asserts key is keyof PluginSettings {
  assert(
    Object.hasOwn(DEFAULT_SETTINGS, key),
    "Only PluginSettings keys reach setControlValue()",
  );
}

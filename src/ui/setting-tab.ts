import { App, PluginSettingTab, SettingGroup } from "obsidian";
import OcrExtractorPlugin, { OCR_ENGINES } from "../../main";
import { PluginSettings, shouldUseMobileEngineFallback } from "../settings";
import { showNotice } from "../utils/notice";
import { t } from "../i18n";

export class SettingTab extends PluginSettingTab {
  plugin: OcrExtractorPlugin;

  constructor(app: App, plugin: OcrExtractorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const generalGroup = new SettingGroup(containerEl);
    this.addEngineDropdown(generalGroup);
    this.addGeneralSettings(generalGroup);

    const EngineClass = OCR_ENGINES[this.plugin.settings.ocrService];
    const EngineSettingsClass = EngineClass.getSettingsSection();

    if (EngineSettingsClass) {
      const engineGroup = new SettingGroup(containerEl).setHeading(
        EngineClass.getLabel(),
      );
      new EngineSettingsClass(engineGroup, this.plugin).display();
    }
  }

  private addEngineDropdown(group: SettingGroup) {
    const description = createFragment();
    description.appendText(t("settings.ocrEngineDesc") + " ");
    description.createEl("a", {
      text: t("settings.ocrEngineDocLink"),
      href: "https://github.com/jritzi/ocr-extractor#ocr-engines",
    });

    group.addSetting((setting) => {
      setting
        .setName(t("settings.ocrEngine"))
        .setDesc(description)
        .addDropdown((dropdown) => {
          for (const [name, Engine] of Object.entries(OCR_ENGINES)) {
            dropdown.addOption(name, Engine.getLabel());
          }

          dropdown
            .setValue(this.plugin.settings.ocrService)
            .onChange((value) => {
              const newOcrEngine = value as PluginSettings["ocrService"];
              if (
                shouldUseMobileEngineFallback({
                  ...this.plugin.settings,
                  ocrService: newOcrEngine,
                })
              ) {
                showNotice(
                  t("notices.mobileEngineFallbackSetting", {
                    pluginName: t("pluginName"),
                  }),
                );
              }

              void this.plugin.saveSetting("ocrService", newOcrEngine);
              this.display(); // Re-render settings with new engine
            });
        });
    });
  }

  private addGeneralSettings(group: SettingGroup) {
    group.addSetting((setting) => {
      setting
        .setName(t("settings.preferEmbeddedText"))
        .setDesc(t("settings.preferEmbeddedTextDesc"))
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.useEmbeddedText)
            .onChange(
              (value) => void this.plugin.saveSetting("useEmbeddedText", value),
            ),
        );
    });

    group.addSetting((setting) => {
      setting
        .setName(t("settings.autoExtractAttachments"))
        .setDesc(t("settings.autoExtractAttachmentsDesc"))
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.autoExtractAttachments)
            .onChange(
              (value) =>
                void this.plugin.saveSetting("autoExtractAttachments", value),
            ),
        );
    });
  }
}

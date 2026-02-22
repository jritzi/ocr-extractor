import { App, PluginSettingTab, SettingGroup } from "obsidian";
import OcrExtractorPlugin, { OCR_SERVICES } from "../../main";
import { PluginSettings, shouldUseMobileServiceFallback } from "../settings";
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

    const group = new SettingGroup(containerEl);

    this.addServiceDropdown(group);

    const ServiceClass = OCR_SERVICES[this.plugin.settings.ocrService];
    ServiceClass.addSettings(group, this.plugin);

    this.addGeneralSettings(group);
  }

  private addServiceDropdown(group: SettingGroup) {
    const description = document.createDocumentFragment();
    description.appendText(t("settings.ocrServiceDesc") + " ");
    description.createEl("a", {
      text: t("settings.ocrServiceDocLink"),
      href: "https://github.com/jritzi/ocr-extractor#ocr-services",
    });

    group.addSetting((setting) => {
      setting
        .setName(t("settings.ocrService"))
        .setDesc(description)
        .addDropdown((dropdown) => {
          for (const [name, Service] of Object.entries(OCR_SERVICES)) {
            dropdown.addOption(name, Service.getLabel());
          }

          dropdown
            .setValue(this.plugin.settings.ocrService)
            .onChange((value) => {
              const newOcrService = value as PluginSettings["ocrService"];
              if (
                shouldUseMobileServiceFallback({
                  ...this.plugin.settings,
                  ocrService: newOcrService,
                })
              ) {
                showNotice(t("notices.mobileServiceFallbackSetting"));
              }

              void this.plugin.saveSetting("ocrService", newOcrService);
              this.display(); // Re-render settings with new service
            });
        });
    });
  }

  private addGeneralSettings(group: SettingGroup) {
    group.addSetting((setting) => {
      setting
        .setName(t("settings.useEmbeddedText"))
        .setDesc(t("settings.useEmbeddedTextDesc"))
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.useEmbeddedText)
            .onChange(
              (value) => void this.plugin.saveSetting("useEmbeddedText", value),
            ),
        );
    });
  }
}

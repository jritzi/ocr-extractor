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

    const generalGroup = new SettingGroup(containerEl);
    this.addServiceDropdown(generalGroup);
    this.addGeneralSettings(generalGroup);

    const ServiceClass = OCR_SERVICES[this.plugin.settings.ocrService];
    const ServiceSettingsClass = ServiceClass.getSettingsSection();

    if (ServiceSettingsClass) {
      const serviceGroup = new SettingGroup(containerEl).setHeading(
        ServiceClass.getLabel(),
      );
      new ServiceSettingsClass(serviceGroup, this.plugin).display();
    }
  }

  private addServiceDropdown(group: SettingGroup) {
    const description = createFragment();
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
                showNotice(
                  t("notices.mobileServiceFallbackSetting", {
                    pluginName: t("pluginName"),
                  }),
                );
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

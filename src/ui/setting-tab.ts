import { App, PluginSettingTab, SettingGroup } from "obsidian";
import OcrExtractorPlugin, { OCR_SERVICES } from "../../main";
import { PluginSettings, shouldUseMobileServiceFallback } from "../settings";
import { showNotice } from "../utils/notice";

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
    ServiceClass.addSettings(
      group,
      this.plugin.settings,
      this.plugin.saveSetting.bind(this.plugin),
    );
  }

  private addServiceDropdown(group: SettingGroup) {
    const description = document.createDocumentFragment();
    description.appendText("See the ");
    description.createEl("a", {
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- mid-sentence text
      text: "documentation",
      href: "https://github.com/jritzi/ocr-extractor#ocr-services",
    });
    description.appendText(" for more details");

    group.addSetting((setting) => {
      setting
        .setName("OCR service")
        .setDesc(description)
        .addDropdown((dropdown) => {
          for (const [name, Service] of Object.entries(OCR_SERVICES)) {
            dropdown.addOption(name, Service.label);
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
                  "Custom commands are not available on mobile, Tesseract will be used instead",
                );
              }

              void this.plugin.saveSetting("ocrService", newOcrService);
              this.display(); // Re-render settings with new service
            });
        });
    });
  }
}

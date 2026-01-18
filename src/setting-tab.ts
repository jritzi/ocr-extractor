import { App, PluginSettingTab, Setting } from "obsidian";
import { TesseractAdapter } from "./tesseract-adapter";
import { MistralAdapter } from "./mistral-adapter";
import OcrExtractorPlugin from "../main";

export const OCR_SERVICES = {
  tesseract: TesseractAdapter,
  mistral: MistralAdapter,
} as const;

export interface OcrExtractorPluginSettings {
  ocrService: keyof typeof OCR_SERVICES;
  mistralApiKey: string;
}

export const DEFAULT_SETTINGS: OcrExtractorPluginSettings = {
  ocrService: "tesseract",
  mistralApiKey: "",
};

export class SettingTab extends PluginSettingTab {
  plugin: OcrExtractorPlugin;

  constructor(app: App, plugin: OcrExtractorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const serviceDescription = document.createDocumentFragment();
    serviceDescription.appendText("See the ");
    serviceDescription.createEl("a", {
      text: "documentation",
      href: "https://github.com/jritzi/ocr-extractor#ocr-services",
    });
    serviceDescription.appendText(" for setup details");

    new Setting(containerEl)
      .setName("OCR service")
      .setDesc(serviceDescription)
      .addDropdown((dropdown) => {
        for (const [name, Adapter] of Object.entries(OCR_SERVICES)) {
          dropdown.addOption(name, Adapter.label);
        }
        return dropdown
          .setValue(this.plugin.settings.ocrService)
          .onChange((value) =>
            this.plugin.saveSetting(
              "ocrService",
              value as OcrExtractorPluginSettings["ocrService"],
            ),
          );
      });

    new Setting(containerEl)
      .setName("Mistral API key")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.mistralApiKey)
          .onChange((value) => this.plugin.saveSetting("mistralApiKey", value)),
      );
  }
}

import { App, PluginSettingTab, Setting } from "obsidian";
import OcrExtractorPlugin from "../main";

export class SettingTab extends PluginSettingTab {
  plugin: OcrExtractorPlugin;

  constructor(app: App, plugin: OcrExtractorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const description = document.createDocumentFragment();
    description.appendText("See the ");
    description.createEl("a", {
      text: "Mistral AI documentation",
      href: "https://docs.mistral.ai/getting-started/quickstart/",
    });
    description.appendText(" for instructions");

    new Setting(containerEl)
      .setName("Mistral API key")
      .setDesc(description)
      .addText((text) =>
        text
          .setValue(this.plugin.settings.mistralApiKey)
          .onChange((value) => this.plugin.saveSetting("mistralApiKey", value)),
      );
  }
}

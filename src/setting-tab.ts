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

    const description = this.createFragmentFromHtml(
      `See the <a href="https://docs.mistral.ai/getting-started/quickstart/">Mistral AI documentation</a> for instructions`,
    );

    new Setting(containerEl)
      .setName("Mistral API key")
      .setDesc(description)
      .addText((text) =>
        text
          .setValue(this.plugin.settings.mistralApiKey)
          .onChange((value) => this.plugin.saveSetting("mistralApiKey", value)),
      );
  }

  private createFragmentFromHtml(html: string) {
    const fragment = new DocumentFragment();
    fragment.createSpan({}, (span) => {
      span.innerHTML = html;
    });

    return fragment;
  }
}

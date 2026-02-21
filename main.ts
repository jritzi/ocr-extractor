import { getLanguage, Plugin } from "obsidian";
import { SettingTab } from "./src/ui/setting-tab";
import {
  DEFAULT_SETTINGS,
  migrateSettings,
  PluginSettings,
  StoredSettings,
} from "./src/settings";
import { setLanguage } from "./src/i18n";
import { TesseractService } from "./src/services/tesseract-service";
import { MistralService } from "./src/services/mistral-service";
import { CustomCommandService } from "./src/services/custom-command-service";
import { TextExtractor } from "./src/text-extractor";
import { addCommands } from "./src/commands";
import { StatusManager } from "./src/status-manager";

export const OCR_SERVICES = {
  tesseract: TesseractService,
  mistral: MistralService,
  customCommand: CustomCommandService,
} as const;

export default class OcrExtractorPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  // Initialized in onload()
  extractor!: TextExtractor;
  statusManager!: StatusManager;

  async onload() {
    await setLanguage(getLanguage());
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));

    this.statusManager = new StatusManager(this);
    this.extractor = new TextExtractor(this);

    addCommands(this);
  }

  onunload() {
    void this.extractor?.cleanup();
    this.statusManager?.cleanup();
  }

  async saveSetting<K extends keyof PluginSettings>(
    name: K,
    value: PluginSettings[K],
  ) {
    this.settings[name] = value;
    await this.saveData(this.settings);

    // Cleanup old extractor and reload with new settings
    await this.extractor.cleanup();
    this.extractor = new TextExtractor(this);
  }

  private async loadSettings() {
    const data = (await this.loadData()) as StoredSettings | null;
    const oldSettings = data ?? {};
    const newSettings = migrateSettings(oldSettings, this.app.secretStorage);

    if (newSettings !== oldSettings) {
      await this.saveData(newSettings);
    }

    // Apply defaults last to avoid interfering with migrations
    this.settings = { ...DEFAULT_SETTINGS, ...newSettings };
  }
}

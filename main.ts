import { Plugin } from "obsidian";
import { SettingTab } from "./src/ui/setting-tab";
import { DEFAULT_SETTINGS, PluginSettings } from "./src/settings";
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

export const EXTRACT_ALL_TEXT = "Extract text from attachments in all notes";
export const EXTRACT_NOTE_TEXT =
  "Extract text from attachments in current note";

export default class OcrExtractorPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  // Initialized in onload()
  extractor!: TextExtractor;
  statusManager!: StatusManager;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));

    this.statusManager = new StatusManager(this);
    this.extractor = new TextExtractor(this);

    addCommands(this);
  }

  async onunload() {
    await this.extractor?.cleanup();
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
    const settingsData = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...settingsData };

    // Upgrade logic for users before ocrService was added
    if (settingsData?.mistralApiKey && !settingsData.ocrService) {
      this.settings.ocrService = "mistral";
      await this.saveData(this.settings);
    }
  }
}

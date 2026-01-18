import { Plugin } from "obsidian";
import {
  DEFAULT_SETTINGS,
  OcrExtractorPluginSettings,
  SettingTab,
} from "./src/setting-tab";
import { TextExtractor } from "./src/text-extractor";
import {
  addExtractAllNotesCommand,
  addExtractCurrentNoteCommand,
} from "./src/commands";
import { addRibbonIcon } from "./src/ui";
import { StatusManager } from "./src/status-manager";

export class OcrExtractorError extends Error {}

export const EXTRACT_ALL_TEXT = "Extract text from attachments in all notes";
export const EXTRACT_NOTE_TEXT =
  "Extract text from attachments in current note";

export default class OcrExtractorPlugin extends Plugin {
  settings: OcrExtractorPluginSettings = DEFAULT_SETTINGS;

  // Initialized in onload()
  extractor!: TextExtractor;
  statusManager!: StatusManager;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));

    this.statusManager = new StatusManager(this);
    this.extractor = new TextExtractor(this);

    addRibbonIcon(this);

    addExtractCurrentNoteCommand(this);
    addExtractAllNotesCommand(this);
  }

  async onunload() {
    await this.extractor?.cleanup();
    this.statusManager?.cleanup();
  }

  async saveSetting<K extends keyof OcrExtractorPluginSettings>(
    name: K,
    value: OcrExtractorPluginSettings[K],
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

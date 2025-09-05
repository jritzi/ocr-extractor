import { Plugin } from "obsidian";
import { SettingTab } from "./src/setting-tab";
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

export interface OcrExtractorPluginSettings {
  mistralApiKey: string;
}

export const DEFAULT_SETTINGS: OcrExtractorPluginSettings = {
  mistralApiKey: "",
};

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

  onunload() {}

  async saveSetting(name: keyof OcrExtractorPluginSettings, value: string) {
    this.settings[name] = value;
    await this.saveData(this.settings);

    // Reload with new settings
    this.extractor = new TextExtractor(this);
  }

  private async loadSettings() {
    const settingsData = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...settingsData };
  }
}

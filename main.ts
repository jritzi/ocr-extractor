import { getLanguage, Platform, Plugin } from "obsidian";
import { isElectronBelowMinimum } from "./src/min-electron-version";
import { InstallerUpdateModal } from "./src/ui/installer-update-modal";
import { SettingTab } from "./src/ui/setting-tab";
import {
  DEFAULT_SETTINGS,
  migrateSettings,
  PluginSettings,
  StoredSettings,
} from "./src/settings";
import { setLanguage } from "./src/i18n";
import { TesseractEngine } from "./src/engines/tesseract/tesseract-engine";
import { MistralEngine } from "./src/engines/mistral/mistral-engine";
import { OpenAiCompatibleEngine } from "./src/engines/openai-compatible/openai-compatible-engine";
import { CustomCommandEngine } from "./src/engines/custom-command/custom-command-engine";
import { TextExtractor } from "./src/text-extractor";
import { registerActions } from "./src/actions";
import { registerAutoExtractEvents } from "./src/auto-extract";
import { StatusManager } from "./src/status-manager";
import { assert } from "./src/utils/assert";

export const OCR_ENGINES = {
  tesseract: TesseractEngine,
  mistral: MistralEngine,
  openAiCompatible: OpenAiCompatibleEngine,
  customCommand: CustomCommandEngine,
} as const;

export default class OcrExtractorPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  // Initialized in onload()
  extractor!: TextExtractor;
  statusManager!: StatusManager;

  async onload() {
    await setLanguage(getLanguage());
    await this.loadSettings();
    this.statusManager = new StatusManager(this);
    this.extractor = new TextExtractor(this);
    this.addSettingTab(new SettingTab(this.app, this));
    registerActions(this);

    this.app.workspace.onLayoutReady(() => {
      this.checkInstallerVersion();
      registerAutoExtractEvents(this);
    });
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

  private checkInstallerVersion() {
    if (!Platform.isDesktop) return;
    const electronVersion = process.versions.electron;
    assert(electronVersion !== undefined, "Always defined on desktop");

    if (isElectronBelowMinimum(electronVersion)) {
      new InstallerUpdateModal(this.app).open();
    }
  }
}

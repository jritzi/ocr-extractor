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
import type { OcrEngineClass } from "./src/engines/ocr-engine";
import { TextExtractor } from "./src/extraction/text-extractor";
import { createApi } from "./src/api";
import { registerActions } from "./src/ui/actions";
import { registerAutoExtractEvents } from "./src/extraction/auto-extract";
import { StatusManager } from "./src/ui/status-manager";
import { OcrEngineManager } from "./src/engines/ocr-engine-manager";
import { ReportStore } from "./src/reporting/report-store";
import { registerReportView } from "./src/ui/report/report-view";
import { assert } from "./src/utils/assert";
import type { OcrExtractorApi } from "ocr-extractor-api";

import "./src/styles/index.css";

export const OCR_ENGINES = {
  tesseract: TesseractEngine,
  mistral: MistralEngine,
  openAiCompatible: OpenAiCompatibleEngine,
  customCommand: CustomCommandEngine,
} satisfies Record<string, OcrEngineClass>;

export default class OcrExtractorPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  reportStore = new ReportStore();

  // Initialized in onload()
  statusManager!: StatusManager;
  engineManager!: OcrEngineManager;
  extractor!: TextExtractor;
  api!: OcrExtractorApi;

  async onload() {
    await setLanguage(getLanguage());
    await this.loadSettings();

    this.statusManager = new StatusManager(this);
    this.engineManager = new OcrEngineManager(this);
    this.extractor = new TextExtractor(this);
    this.api = createApi(this);

    registerActions(this);
    registerReportView(this);
    this.addSettingTab(new SettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.checkInstallerVersion();
      registerAutoExtractEvents(this);
    });
  }

  onunload() {
    // Abort the run before terminating the engine so in-flight OCR resolves
    // as canceled instead of rejecting
    this.statusManager?.cleanup();
    void this.engineManager?.terminate();
  }

  async saveSetting<K extends keyof PluginSettings>(
    name: K,
    value: PluginSettings[K],
  ) {
    this.settings[name] = value;
    this.engineManager.markSettingsChanged();
    await this.saveData(this.settings);
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

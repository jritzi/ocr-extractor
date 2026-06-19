import type { SecretStorage } from "obsidian";
import { Platform } from "obsidian";
import type { OCR_ENGINES } from "../main";

export interface PluginSettings {
  ocrEngine: keyof typeof OCR_ENGINES;

  mistralSecret: string;

  openAiCompatibleBaseUrl: string;
  openAiCompatibleModel: string;
  openAiCompatibleSecret: string;
  openAiCompatiblePrompt: string;

  customCommand: string;
  customCommandConvertPdfs: boolean;

  preferEmbeddedText: boolean;
  autoExtractAttachments: boolean;
}

/** Old settings from previous versions */
interface DeprecatedSettings {
  /** Migrated to mistralSecret */
  mistralApiKey?: string;
  /** Renamed to ocrEngine */
  ocrService?: keyof typeof OCR_ENGINES;
  /** Renamed to preferEmbeddedText */
  useEmbeddedText?: boolean;
}

export type StoredSettings = Partial<PluginSettings> & DeprecatedSettings;

export const DEFAULT_SETTINGS: PluginSettings = {
  ocrEngine: "tesseract",
  mistralSecret: "",
  openAiCompatibleBaseUrl: "",
  openAiCompatibleModel: "",
  openAiCompatibleSecret: "",
  openAiCompatiblePrompt: "",
  customCommand: "",
  customCommandConvertPdfs: false,
  preferEmbeddedText: false,
  autoExtractAttachments: false,
};

/**
 * Check if we need to use a fallback engine, because the selected engine
 * is not supported on mobile.
 */
export function shouldUseMobileEngineFallback(settings: PluginSettings) {
  return settings.ocrEngine === "customCommand" && !Platform.isDesktop;
}

export function migrateSettings(
  oldSettings: StoredSettings,
  secretStorage: SecretStorage,
) {
  let settings = oldSettings;

  // <1.2.0: Add ocrService
  if (settings.mistralApiKey && !settings.ocrService) {
    settings = { ...settings, ocrService: "mistral" };
  }

  // <2.0.0: Migrate mistralApiKey to mistralSecret (SecretStorage)
  if (settings.mistralApiKey && !settings.mistralSecret) {
    let mistralSecret = "mistral-api";
    let counter = 2;
    while (secretStorage.getSecret(mistralSecret) !== null) {
      mistralSecret = `mistral-api-${counter}`;
      counter++;
    }

    secretStorage.setSecret(mistralSecret, settings.mistralApiKey);
    const migratedSettings = { ...settings };
    delete migratedSettings.mistralApiKey;
    settings = { ...migratedSettings, mistralSecret };
  }

  // <2.3.2: Rename ocrService to ocrEngine
  const oldOcrEngine = settings.ocrService;
  if (oldOcrEngine !== undefined && settings.ocrEngine === undefined) {
    const migratedSettings = { ...settings, ocrEngine: oldOcrEngine };
    delete migratedSettings.ocrService;
    settings = migratedSettings;
  }

  // <2.3.2: Rename useEmbeddedText to preferEmbeddedText
  const oldPreferEmbeddedText = settings.useEmbeddedText;
  if (
    oldPreferEmbeddedText !== undefined &&
    settings.preferEmbeddedText === undefined
  ) {
    const migratedSettings = {
      ...settings,
      preferEmbeddedText: oldPreferEmbeddedText,
    };
    delete migratedSettings.useEmbeddedText;
    settings = migratedSettings;
  }

  return settings;
}

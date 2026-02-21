import type { SecretStorage } from "obsidian";
import { Platform } from "obsidian";
import type { OCR_SERVICES } from "../main";

export interface PluginSettings {
  ocrService: keyof typeof OCR_SERVICES;
  mistralSecret: string;
  customCommand: string;
  customCommandConvertPdfs: boolean;
  useEmbeddedPdfText: boolean;
}

/** Old settings from previous versions */
interface DeprecatedSettings {
  /** Migrated to mistralSecret */
  mistralApiKey?: string;
}

export type StoredSettings = Partial<PluginSettings> & DeprecatedSettings;

export const DEFAULT_SETTINGS: PluginSettings = {
  ocrService: "tesseract",
  mistralSecret: "",
  customCommand: "",
  customCommandConvertPdfs: false,
  useEmbeddedPdfText: false,
};

/**
 * Check if we need to use a fallback service, because the selected service
 * is not supported on mobile.
 */
export function shouldUseMobileServiceFallback(settings: PluginSettings) {
  return settings.ocrService === "customCommand" && !Platform.isDesktop;
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
    const { mistralApiKey, ...rest } = settings;
    settings = { ...rest, mistralSecret };
  }

  return settings;
}

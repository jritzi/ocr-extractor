import { Platform } from "obsidian";
import type { OCR_SERVICES } from "../main";

export interface PluginSettings {
  ocrService: keyof typeof OCR_SERVICES;
  mistralApiKey: string;
  customCommand: string;
  customCommandConvertPdfs: boolean;
  useEmbeddedPdfText: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  ocrService: "tesseract",
  mistralApiKey: "",
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

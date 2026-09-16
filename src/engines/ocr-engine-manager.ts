import OcrExtractorPlugin, { OCR_ENGINES } from "../../main";
import { TFile } from "obsidian";
import { OcrEngine } from "./ocr-engine";
import {
  type PluginSettings,
  shouldUseMobileEngineFallback,
} from "../settings";

export class OcrEngineManager {
  usingMobileFallback = false;

  private engine: OcrEngine;
  private engineSettings: PluginSettings;

  private extractionsInFlight = 0;

  constructor(private plugin: OcrExtractorPlugin) {
    this.engine = this.buildEngine(plugin.settings);
    this.engineSettings = plugin.settings;
  }

  async rebuildIfNeeded() {
    const settings = this.plugin.settings;
    const settingsChanged = settings !== this.engineSettings;
    if (!settingsChanged || this.extractionsInFlight > 0) return;

    const previousEngine = this.engine;
    this.engine = this.buildEngine(settings);
    this.engineSettings = settings;
    await previousEngine.terminate();
  }

  async extract(attachment: TFile, signal: AbortSignal) {
    this.extractionsInFlight++;
    try {
      const binary = await this.plugin.app.vault.readBinary(attachment);
      return await this.engine.extract(
        new Uint8Array(binary),
        attachment.name,
        signal,
      );
    } finally {
      this.extractionsInFlight--;
    }
  }

  terminate() {
    return this.engine.terminate();
  }

  private buildEngine(settings: PluginSettings) {
    this.usingMobileFallback = shouldUseMobileEngineFallback(settings);
    const engineName = this.usingMobileFallback
      ? "tesseract"
      : settings.ocrEngine;

    const EngineClass = OCR_ENGINES[engineName];
    return new EngineClass(settings, this.plugin.app.secretStorage);
  }
}

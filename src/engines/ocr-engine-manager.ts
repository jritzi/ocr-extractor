import OcrExtractorPlugin, { OCR_ENGINES } from "../../main";
import { TFile } from "obsidian";
import { OcrEngine } from "./ocr-engine";
import {
  type PluginSettings,
  shouldUseMobileEngineFallback,
} from "../settings";

export class OcrEngineManager {
  usingMobileFallback = false;

  // Initialized in buildEngine()
  private engine!: OcrEngine;
  private engineSettings!: PluginSettings;

  private extractionsInFlight = 0;

  constructor(private plugin: OcrExtractorPlugin) {
    this.buildEngine();
  }

  async rebuildIfNeeded() {
    const settingsChanged = this.plugin.settings !== this.engineSettings;
    if (!settingsChanged || this.extractionsInFlight > 0) return;

    const previousEngine = this.engine;
    this.buildEngine();
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

  private buildEngine() {
    const settings = this.plugin.settings;
    this.usingMobileFallback = shouldUseMobileEngineFallback(settings);
    const engineName = this.usingMobileFallback
      ? "tesseract"
      : settings.ocrEngine;

    const EngineClass = OCR_ENGINES[engineName];
    this.engine = new EngineClass(settings, this.plugin.app.secretStorage);
    this.engineSettings = settings;
  }
}

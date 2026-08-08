import OcrExtractorPlugin, { OCR_ENGINES } from "../../main";
import { TFile } from "obsidian";
import { OcrEngine } from "./ocr-engine";
import { shouldUseMobileEngineFallback } from "../settings";

export class OcrEngineManager {
  usingMobileFallback = false;

  // Initialized in buildEngine()
  private engine!: OcrEngine;

  private settingsChanged = false;

  constructor(private plugin: OcrExtractorPlugin) {
    this.buildEngine();
  }

  markSettingsChanged() {
    this.settingsChanged = true;
  }

  async rebuildIfNeeded() {
    if (!this.settingsChanged) return;

    const previousEngine = this.engine;
    this.buildEngine();
    this.settingsChanged = false;
    await previousEngine.terminate();
  }

  async processOcr(attachment: TFile, signal: AbortSignal) {
    const binary = await this.plugin.app.vault.readBinary(attachment);
    return this.engine.processOcr(
      new Uint8Array(binary),
      attachment.name,
      signal,
    );
  }

  terminate() {
    return this.engine.terminate();
  }

  private buildEngine() {
    this.usingMobileFallback = shouldUseMobileEngineFallback(
      this.plugin.settings,
    );
    const engineName = this.usingMobileFallback
      ? "tesseract"
      : this.plugin.settings.ocrEngine;

    const EngineClass = OCR_ENGINES[engineName];
    this.engine = new EngineClass(
      // Clone to isolate engine from live settings changes
      structuredClone(this.plugin.settings),
      this.plugin.app.secretStorage,
    );
  }
}

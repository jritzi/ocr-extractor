import type { SettingGroup } from "obsidian";
import type OcrExtractorPlugin from "../../main";

export abstract class OcrServiceSettings {
  constructor(
    protected readonly group: SettingGroup,
    protected readonly plugin: OcrExtractorPlugin,
  ) {}

  abstract display(): void;
}

export type OcrServiceSettingsClass = new (
  ...args: ConstructorParameters<typeof OcrServiceSettings>
) => OcrServiceSettings;

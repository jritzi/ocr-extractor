import type { SettingGroup } from "obsidian";
import type OcrExtractorPlugin from "../../main";

export abstract class OcrEngineSettings {
  constructor(
    protected readonly group: SettingGroup,
    protected readonly plugin: OcrExtractorPlugin,
  ) {}

  abstract display(): void;
}

export type OcrEngineSettingsClass = new (
  ...args: ConstructorParameters<typeof OcrEngineSettings>
) => OcrEngineSettings;

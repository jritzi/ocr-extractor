import { Menu } from "obsidian";
import OcrExtractorPlugin from "../main";
import { t } from "./i18n";

export function addCommands(plugin: OcrExtractorPlugin) {
  addExtractCurrentNoteCommand(plugin);
  addExtractAllNotesCommand(plugin);
  addRibbonIcon(plugin);
}

function addExtractCurrentNoteCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "extract-current-note",
    name: t("commands.extractCurrentNote"),
    checkCallback: (checking: boolean) => {
      if (plugin.extractor.canProcessActiveFile()) {
        if (!checking) {
          plugin.extractor.processActiveFile();
        }

        return true;
      }
    },
  });
}

function addExtractAllNotesCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "extract-all-notes",
    name: t("commands.extractAllNotes"),
    checkCallback: (checking: boolean) => {
      if (plugin.extractor.canProcessAllFiles()) {
        if (!checking) {
          plugin.extractor.processAllFiles();
        }

        return true;
      }
    },
  });
}

function addRibbonIcon(plugin: OcrExtractorPlugin) {
  plugin.addRibbonIcon("scan-text", t("commands.extractText"), (event) => {
    const menu = new Menu();

    if (!(event.currentTarget instanceof Element)) {
      throw new Error("Unexpected ribbon click currentTarget");
    }

    menu.addItem((item) =>
      item
        .setTitle(t("commands.extractCurrentNote"))
        .setDisabled(!plugin.extractor.canProcessActiveFile())
        .onClick(() => plugin.extractor.processActiveFile()),
    );

    menu.addItem((item) =>
      item
        .setTitle(t("commands.extractAllNotes"))
        .setDisabled(!plugin.extractor.canProcessAllFiles())
        .onClick(() => plugin.extractor.processAllFiles()),
    );

    const rect = event.currentTarget.getBoundingClientRect();
    menu.showAtPosition({ x: rect.right + 2, y: rect.top + 7 });
  });
}

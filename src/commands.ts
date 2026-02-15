import { Menu } from "obsidian";
import OcrExtractorPlugin, {
  EXTRACT_ALL_TEXT,
  EXTRACT_NOTE_TEXT,
} from "../main";

export function addCommands(plugin: OcrExtractorPlugin) {
  addExtractCurrentNoteCommand(plugin);
  addExtractAllNotesCommand(plugin);
  addRibbonIcon(plugin);
}

function addExtractCurrentNoteCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "extract-current-note",
    name: EXTRACT_NOTE_TEXT,
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
    name: EXTRACT_ALL_TEXT,
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
  plugin.addRibbonIcon("scan-text", "Extract text", (event) => {
    const menu = new Menu();

    if (!(event.currentTarget instanceof Element)) {
      throw new Error("Unexpected ribbon click currentTarget");
    }

    menu.addItem((item) =>
      item
        .setTitle(EXTRACT_NOTE_TEXT)
        .setDisabled(!plugin.extractor.canProcessActiveFile())
        .onClick(() => plugin.extractor.processActiveFile()),
    );

    menu.addItem((item) =>
      item
        .setTitle(EXTRACT_ALL_TEXT)
        .setDisabled(!plugin.extractor.canProcessAllFiles())
        .onClick(() => plugin.extractor.processAllFiles()),
    );

    const rect = event.currentTarget.getBoundingClientRect();
    menu.showAtPosition({ x: rect.right + 2, y: rect.top + 7 });
  });
}

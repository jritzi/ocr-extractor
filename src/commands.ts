import OcrExtractorPlugin, {
  EXTRACT_ALL_TEXT,
  EXTRACT_NOTE_TEXT,
} from "../main";

export function addExtractCurrentNoteCommand(plugin: OcrExtractorPlugin) {
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

export function addExtractAllNotesCommand(plugin: OcrExtractorPlugin) {
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

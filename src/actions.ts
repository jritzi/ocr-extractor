import { Menu, Platform, TFolder } from "obsidian";
import OcrExtractorPlugin from "../main";
import { t } from "./i18n";

const PLUGIN_ICON = "scan-text";

export function registerActions(plugin: OcrExtractorPlugin) {
  addExtractCurrentNoteCommand(plugin);
  addExtractFolderCommand(plugin);
  addExtractAllNotesCommand(plugin);
  addCancelExtractionCommand(plugin);

  addExtractFolderMenuItem(plugin);

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

      return false;
    },
  });
}

function addExtractFolderCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "extract-folder",
    name: t("commands.extractFolder"),
    checkCallback: (checking: boolean) => {
      if (plugin.extractor.canProcessMultipleFiles()) {
        if (!checking) {
          plugin.extractor.processFolder();
        }

        return true;
      }

      return false;
    },
  });
}

function addExtractAllNotesCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "extract-all-notes",
    name: t("commands.extractAllNotes"),
    checkCallback: (checking: boolean) => {
      if (plugin.extractor.canProcessMultipleFiles()) {
        if (!checking) {
          plugin.extractor.processAllFiles();
        }

        return true;
      }

      return false;
    },
  });
}

function addCancelExtractionCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "cancel-extraction",
    name: t("commands.cancelExtraction"),
    checkCallback: (checking: boolean) => {
      if (plugin.statusManager.isProcessing()) {
        if (!checking) {
          plugin.statusManager.setCanceling();
        }

        return true;
      }

      return false;
    },
  });
}

function addExtractFolderMenuItem(plugin: OcrExtractorPlugin) {
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFolder)) return;
      if (!plugin.extractor.canProcessMultipleFiles()) return;

      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractFolder"))
          .setIcon(PLUGIN_ICON)
          .onClick(() => plugin.extractor.processFolder(file)),
      );
    }),
  );
}

function addRibbonIcon(plugin: OcrExtractorPlugin) {
  plugin.addRibbonIcon(PLUGIN_ICON, t("pluginName"), (event) => {
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

    if (Platform.isDesktop) {
      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractFolder"))
          .setDisabled(!plugin.extractor.canProcessMultipleFiles())
          .onClick(() => plugin.extractor.processFolder()),
      );

      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractAllNotes"))
          .setDisabled(!plugin.extractor.canProcessMultipleFiles())
          .onClick(() => plugin.extractor.processAllFiles()),
      );
    }

    const rect = event.currentTarget.getBoundingClientRect();
    menu.showAtPosition({ x: rect.right + 2, y: rect.top + 7 });
  });
}

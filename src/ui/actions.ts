import { Menu, Platform, TFile, TFolder } from "obsidian";
import { isMarkdown } from "../utils/file";
import OcrExtractorPlugin from "../../main";
import { t } from "../i18n";
import { showReportView } from "./report/report-view";

export const PLUGIN_ICON = "scan-text";

export function registerActions(plugin: OcrExtractorPlugin) {
  addExtractActiveNoteCommand(plugin);
  addExtractFolderCommand(plugin);
  addExtractAllNotesCommand(plugin);
  addCancelExtractionCommand(plugin);
  addShowReportCommand(plugin);

  addExtractNoteMenuItem(plugin);
  addExtractEditorMenuItem(plugin);
  addExtractFolderMenuItem(plugin);
  addExtractSelectionMenuItem(plugin);

  addRibbonIcon(plugin);
}

function addExtractActiveNoteCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "extract-current-note", // uses old name, but must be stable across versions
    name: t("commands.extractActiveNote"),
    checkCallback: (checking: boolean) => {
      if (plugin.extractor.canProcessActiveNote()) {
        if (!checking) {
          plugin.extractor.processActiveNote();
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
      if (plugin.extractor.canProcessMultipleNotes()) {
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
      if (plugin.extractor.canProcessMultipleNotes()) {
        if (!checking) {
          plugin.extractor.processAllNotes();
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

function addShowReportCommand(plugin: OcrExtractorPlugin) {
  plugin.addCommand({
    id: "show-report",
    name: t("commands.showReport"),
    callback: () => void showReportView(plugin.app),
  });
}

function addExtractNoteMenuItem(plugin: OcrExtractorPlugin) {
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFile) || !isMarkdown(file)) return;
      if (!plugin.extractor.canProcessSingleNote()) return;

      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractNote"))
          .setIcon(PLUGIN_ICON)
          .onClick(() => plugin.extractor.processSingleNote(file)),
      );
    }),
  );
}

function addExtractEditorMenuItem(plugin: OcrExtractorPlugin) {
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, _editor, { file }) => {
      if (!file || !isMarkdown(file)) return;
      if (!plugin.extractor.canProcessSingleNote()) return;

      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractNote"))
          .setIcon(PLUGIN_ICON)
          .onClick(() => plugin.extractor.processSingleNote(file)),
      );
    }),
  );
}

function addExtractFolderMenuItem(plugin: OcrExtractorPlugin) {
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFolder)) return;
      if (!plugin.extractor.canProcessMultipleNotes()) return;

      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractFolder"))
          .setIcon(PLUGIN_ICON)
          .onClick(() => plugin.extractor.processFolder(file)),
      );
    }),
  );
}

function addExtractSelectionMenuItem(plugin: OcrExtractorPlugin) {
  plugin.registerEvent(
    plugin.app.workspace.on("files-menu", (menu, files) => {
      const markdownFiles = files.filter(
        (file): file is TFile => file instanceof TFile && isMarkdown(file),
      );
      if (markdownFiles.length === 0) return;
      if (!plugin.extractor.canProcessMultipleNotes()) return;

      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractSelection"))
          .setIcon(PLUGIN_ICON)
          .onClick(() => plugin.extractor.processSelection(markdownFiles)),
      );
    }),
  );
}

function addRibbonIcon(plugin: OcrExtractorPlugin) {
  let activeMenu: Menu | null = null;
  let dismissingMenu = false;

  const button = plugin.addRibbonIcon(PLUGIN_ICON, t("pluginName"), () => {
    if (dismissingMenu) {
      dismissingMenu = false;
      return;
    }

    const menu = new Menu();
    menu.onHide(() => (activeMenu = null));
    activeMenu = menu;

    menu.addItem((item) =>
      item
        .setTitle(t("commands.extractActiveNote"))
        .setDisabled(!plugin.extractor.canProcessActiveNote())
        .onClick(() => plugin.extractor.processActiveNote()),
    );

    if (Platform.isDesktop) {
      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractFolder"))
          .setDisabled(!plugin.extractor.canProcessMultipleNotes())
          .onClick(() => plugin.extractor.processFolder()),
      );

      menu.addItem((item) =>
        item
          .setTitle(t("commands.extractAllNotes"))
          .setDisabled(!plugin.extractor.canProcessMultipleNotes())
          .onClick(() => plugin.extractor.processAllNotes()),
      );
    }

    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle(t("commands.showReport"))
        .onClick(() => void showReportView(plugin.app)),
    );

    // Show to the right of the button rather than where the mouse clicked
    const rect = button.getBoundingClientRect();
    menu.showAtPosition({ x: rect.right, y: rect.top });
  });

  // Prevent reopening a (non-native) menu with a click while open
  plugin.registerDomEvent(button, "mousedown", () => {
    dismissingMenu = activeMenu !== null;
  });
}

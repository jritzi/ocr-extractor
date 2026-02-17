import OcrExtractorPlugin from "../main";
import { App, EmbedCache, Menu, MenuItem, setIcon } from "obsidian";
import { debugLog } from "./utils/logging";
import { showErrorNotice, showNotice } from "./utils/notice";
import { StatusModal } from "./ui/status-modal";
import { t } from "./i18n";

export type Status = "idle" | "processing" | "canceling";

export class StatusManager {
  private status: Status = "idle";

  private readonly app: App;
  private readonly statusBarItem: HTMLElement;
  private readonly statusBarTextSpan: HTMLElement;
  private statusModal: StatusModal | null = null;

  constructor(plugin: OcrExtractorPlugin) {
    this.app = plugin.app;
    this.statusBarItem = plugin.addStatusBarItem();
    this.statusBarItem.addClass("ocr-extractor-status-bar");
    setIcon(this.statusBarItem, "loader-circle");
    this.statusBarTextSpan = this.statusBarItem.createSpan();
    this.statusBarItem.hide();

    this.statusBarItem.onclick = (event: MouseEvent) => {
      const menu = new Menu();

      menu.addItem((item: MenuItem) =>
        item.setTitle(t("status.cancel")).onClick(() => this.setCanceling()),
      );

      menu.showAtMouseEvent(event);
    };
  }

  isIdle() {
    return this.status === "idle";
  }

  isCanceling() {
    return this.status === "canceling";
  }

  setProcessingSingleNote() {
    this.status = "processing";
    this.statusModal = new StatusModal(this.app, () => {
      this.statusModal = null;
      this.setCanceling();
    });
    this.statusModal.open();
    debugLog("Status set to processing (single note)");
  }

  setProcessingAllNotes(totalNotes: number) {
    this.status = "processing";
    this.statusBarTextSpan.setText(
      t("status.extractingNote", { current: 1, total: totalNotes }),
    );
    this.statusBarItem.show();
    debugLog("Status set to processing (all notes)");
  }

  updateProgress(notesProcessed: number, totalNotes: number) {
    this.statusBarTextSpan.setText(
      t("status.extractingNote", {
        current: notesProcessed,
        total: totalNotes,
      }),
    );
  }

  setCanceling() {
    if (this.status !== "processing") {
      return;
    }

    this.status = "canceling";
    this.statusBarTextSpan.setText(t("status.canceling"));
    this.statusBarItem.show();
    debugLog("Status set to canceling");
  }

  setCancelled() {
    this.status = "idle";
    this.statusBarTextSpan.setText("");
    this.statusBarItem.hide();

    if (this.statusModal) {
      this.statusModal.close();
      this.statusModal = null;
    }

    showNotice(t("notices.cancelled"));
    debugLog("Status set to idle (cancelled)");
  }

  setComplete(extractedCount: number, skippedEmbeds: EmbedCache[]) {
    this.status = "idle";
    this.statusBarTextSpan.setText("");
    this.statusBarItem.hide();

    if (this.statusModal) {
      if (skippedEmbeds.length > 0) {
        this.statusModal.showWarning(extractedCount, skippedEmbeds);
      } else {
        this.statusModal.close();
      }
      this.statusModal = null;
    } else {
      const skippedCount = skippedEmbeds.length;
      if (skippedCount > 0) {
        showNotice(
          t("notices.completeExtractedSkipped", {
            extracted: extractedCount,
            skipped: skippedCount,
          }),
        );
      } else if (extractedCount > 0) {
        showNotice(t("notices.completeExtracted", { count: extractedCount }));
      }
    }

    debugLog("Status set to idle (complete)");
  }

  setError(message: string) {
    this.status = "idle";
    this.statusBarTextSpan.setText("");
    this.statusBarItem.hide();

    if (this.statusModal) {
      this.statusModal.showError(message);
      this.statusModal = null;
    } else {
      showErrorNotice(message);
    }

    debugLog("Status set to idle (error)");
  }

  cleanup() {
    this.statusModal?.close();
  }
}

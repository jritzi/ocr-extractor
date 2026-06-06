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
  private abortController = new AbortController();

  constructor(plugin: OcrExtractorPlugin) {
    this.app = plugin.app;
    this.statusBarItem = plugin.addStatusBarItem();
    this.statusBarItem.addClass(
      "ocr-extractor-status-bar",
      "ocr-extractor-spinning",
    );
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

  getSignal() {
    return this.abortController.signal;
  }

  isIdle() {
    return this.status === "idle";
  }

  isProcessing() {
    return this.status === "processing";
  }

  isCanceling() {
    return this.status === "canceling";
  }

  setProcessingSingleNote() {
    this.abortController = new AbortController();
    this.status = "processing";
    this.statusModal = new StatusModal(this.app, () => {
      this.statusModal = null;
      this.setCanceling();
    });
    this.statusModal.open();
    debugLog("Status set to processing (single note)");
  }

  setProcessingMultipleNotes(totalNotes: number) {
    this.abortController = new AbortController();
    this.status = "processing";
    this.statusBarTextSpan.setText(
      t("status.extractingNote", { current: 0, total: totalNotes }),
    );
    this.statusBarItem.show();
    debugLog("Status set to processing (multiple notes)");
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
    this.abortController.abort();
    this.statusBarTextSpan.setText(t("status.canceling"));
    this.statusBarItem.show();
    debugLog("Status set to canceling");
  }

  setCanceled() {
    this.status = "idle";
    this.statusBarTextSpan.setText("");
    this.statusBarItem.hide();

    if (this.statusModal) {
      this.statusModal.close();
      this.statusModal = null;
    }

    showNotice(t("notices.canceled"));
    debugLog("Status set to idle (canceled)");
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

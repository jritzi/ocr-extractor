import OcrExtractorPlugin from "../main";
import { App, EmbedCache, Menu, MenuItem, Notice, setIcon } from "obsidian";
import { debugLog } from "./utils";
import { StatusModal } from "./status-modal";

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
        item.setTitle("Cancel").onClick(() => this.setCanceling()),
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

  setProcessingSingleNote(noteName: string) {
    this.status = "processing";
    this.statusModal = new StatusModal(this.app, noteName, () => {
      this.statusModal = null;
      this.setCanceling();
    });
    this.statusModal.open();
    debugLog("Status set to processing (single note)");
  }

  setProcessingAllNotes(totalNotes: number) {
    this.status = "processing";
    this.statusBarTextSpan.setText(`Extracting text for note 1/${totalNotes}`);
    this.statusBarItem.show();
    debugLog("Status set to processing (all notes)");
  }

  updateProgress(notesProcessed: number, totalNotes: number) {
    this.statusBarTextSpan.setText(
      `Extracting text for note ${notesProcessed}/${totalNotes}`,
    );
  }

  setCanceling() {
    if (this.status !== "processing") {
      return;
    }

    this.status = "canceling";
    this.statusBarTextSpan.setText("Canceling");
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

    new Notice("Cancelled text extraction");
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
        new Notice(
          `Text extraction complete. Extracted: ${extractedCount}, skipped: ${skippedCount}`,
        );
      } else if (extractedCount > 0) {
        new Notice(`Text extraction complete. Extracted: ${extractedCount}`);
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
      new Notice(message);
    }

    debugLog("Status set to idle (error)");
  }

  cleanup() {
    this.statusModal?.close();
  }
}

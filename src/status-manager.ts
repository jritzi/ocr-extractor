import OcrExtractorPlugin from "../main";
import { Menu, MenuItem, setIcon } from "obsidian";

export type Status = "idle" | "processing" | "canceling";

export class StatusManager {
  private status: Status = "idle";
  private readonly statusBarItem: HTMLElement;
  private readonly statusBarTextSpan: HTMLElement;

  constructor(plugin: OcrExtractorPlugin) {
    this.statusBarItem = plugin.addStatusBarItem();
    this.statusBarItem.addClass("ocr-extractor-status-bar");
    setIcon(this.statusBarItem, "loader-circle");
    this.statusBarTextSpan = this.statusBarItem.createEl("span");
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

  setIdle() {
    this.status = "idle";
    this.statusBarTextSpan.setText("");
    this.statusBarItem.hide();
  }

  setProcessing() {
    this.status = "processing";
    this.statusBarTextSpan.setText("Extracting text");
    this.statusBarItem.show();
  }

  updateMessage(message: string) {
    this.statusBarTextSpan.setText(message);
  }

  setCanceling() {
    this.status = "canceling";
    this.statusBarTextSpan.setText("Canceling");
    this.statusBarItem.show();
  }
}

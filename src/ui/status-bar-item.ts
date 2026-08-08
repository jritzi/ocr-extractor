import { Menu, MenuItem, Plugin, setIcon } from "obsidian";
import { t } from "../i18n";
import "./status-bar-item.css";

export class StatusBarItem {
  private readonly item: HTMLElement;
  private readonly textSpan: HTMLElement;

  constructor(plugin: Plugin, { onCancel }: { onCancel: () => void }) {
    this.item = plugin.addStatusBarItem();
    this.item.addClass("ocr-extractor-status-bar", "ocr-extractor-spinning");
    setIcon(this.item, "loader-circle");
    this.textSpan = this.item.createSpan();
    this.item.hide();

    this.item.onclick = (event: MouseEvent) => {
      const menu = new Menu();

      menu.addItem((menuItem: MenuItem) =>
        menuItem.setTitle(t("status.cancel")).onClick(onCancel),
      );

      menu.showAtMouseEvent(event);
    };
  }

  show(text: string) {
    this.textSpan.setText(text);
    this.item.show();
  }

  hide() {
    this.textSpan.setText("");
    this.item.hide();
  }
}

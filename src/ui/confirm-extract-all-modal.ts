import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";

export class ConfirmExtractAllModal extends Modal {
  constructor(app: App, onSubmit: () => void) {
    super(app);
    this.setTitle(t("modals.extractAllTitle"));

    new Setting(this.contentEl).setName(t("modals.extractAllWarning"));

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText(t("modals.cancel")).onClick(() => this.close()),
      )
      .addButton((btn) =>
        btn
          .setButtonText(t("modals.extract"))
          .setCta()
          .onClick(() => {
            this.close();
            onSubmit();
          }),
      );
  }
}

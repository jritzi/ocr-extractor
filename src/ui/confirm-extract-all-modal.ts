import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";

export class ConfirmExtractAllModal extends Modal {
  constructor(app: App, onSubmit: () => void) {
    super(app);
    this.setTitle(t("modals.extractAll.title"));

    this.contentEl.createEl("p", { text: t("modals.extractAll.warning") });

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText(t("modals.cancel")).onClick(() => this.close()),
      )
      .addButton((btn) =>
        btn
          .setButtonText(t("modals.extractAll.extract"))
          .setCta()
          .onClick(() => {
            this.close();
            onSubmit();
          }),
      );
  }
}

import { App, ConfirmationModal } from "obsidian";
import { t } from "../i18n";

export class ConfirmExtractAllModal extends ConfirmationModal {
  constructor(app: App, onSubmit: () => void) {
    super(app);
    this.setTitle(t("modals.extractAll.title"));

    this.contentEl.createEl("p", { text: t("modals.extractAll.warning") });

    this.addButton((button) =>
      button
        .setButtonText(t("modals.extractAll.extract"))
        .setCta()
        .onClick(onSubmit),
    );
    this.addCancelButton(t("common.cancel"));
  }
}

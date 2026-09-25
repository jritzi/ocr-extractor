import { App, ConfirmationModal } from "obsidian";
import { t } from "../i18n";

const KEEP_OPEN = true;

export class InstallerUpdateModal extends ConfirmationModal {
  constructor(app: App) {
    super(app);
    this.setTitle(t("modals.installerUpdate.title"));

    this.contentEl.createEl("p", { text: t("modals.installerUpdate.body") });

    this.addButton((button) =>
      button
        .setButtonText(t("modals.installerUpdate.learnMore"))
        .setSecondary()
        .onClick(() => {
          window.open("https://obsidian.md/help/updates#Installer+updates");
          return KEEP_OPEN;
        }),
    );
    this.addButton((button) =>
      button
        .setButtonText(t("modals.installerUpdate.download"))
        .setCta()
        .onClick(() => {
          window.open("https://obsidian.md/download");
          return KEEP_OPEN;
        }),
    );
    this.addCancelButton(t("common.dismiss"));
  }
}

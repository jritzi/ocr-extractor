import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";

export class InstallerUpdateModal extends Modal {
  constructor(app: App) {
    super(app);
    this.setTitle(t("modals.installerUpdate.title"));
  }

  onOpen() {
    this.contentEl.createEl("p", { text: t("modals.installerUpdate.body") });

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText(t("modals.dismiss")).onClick(() => this.close()),
      )
      .addButton((btn) =>
        btn
          .setButtonText(t("modals.installerUpdate.learnMore"))
          .onClick(() =>
            window.open("https://obsidian.md/help/updates#Installer+updates"),
          ),
      )
      .addButton((btn) =>
        btn
          .setButtonText(t("modals.installerUpdate.download"))
          .setCta()
          .onClick(() => window.open("https://obsidian.md/download")),
      );
  }
}

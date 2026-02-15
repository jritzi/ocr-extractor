import { App, Modal, Setting } from "obsidian";

export class ConfirmExtractAllModal extends Modal {
  constructor(app: App, onSubmit: () => void) {
    super(app);
    this.setTitle("Extract text from all notes?");

    new Setting(this.contentEl).setName(
      "Make sure you have a backup of your vault before extracting text from attachments in all notes.",
    );

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText("Cancel").onClick(() => this.close()),
      )
      .addButton((btn) =>
        btn
          .setButtonText("Extract")
          .setCta()
          .onClick(() => {
            this.close();
            onSubmit();
          }),
      );
  }
}

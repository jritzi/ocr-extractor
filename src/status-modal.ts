import { App, Modal, setIcon, Setting } from "obsidian";

export class StatusModal extends Modal {
  constructor(
    app: App,
    noteName: string,
    private onCancel: () => void,
  ) {
    super(app);
    this.setTitle("Extracting text");

    const container = this.contentEl.createDiv({
      cls: "ocr-extractor-modal-content",
    });

    setIcon(container, "loader-circle");
    container.createDiv({
      cls: "ocr-extractor-modal-message",
      text: `Extracting text from attachments in note: ${noteName}`,
    });

    new Setting(this.contentEl).addButton((button) =>
      button.setButtonText("Cancel").onClick(() => onCancel()),
    );
  }

  onClose() {
    super.onClose();
    this.onCancel();
  }
}

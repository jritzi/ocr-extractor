import {
  App,
  ButtonComponent,
  EmbedCache,
  getLinkpath,
  Modal,
  Setting,
} from "obsidian";

export class StatusModal extends Modal {
  private readonly messageEl: HTMLElement;
  private button!: ButtonComponent;

  constructor(
    app: App,
    noteName: string,
    private onModalClose: () => void,
  ) {
    super(app);
    this.setTitle("Extracting text");
    this.modalEl.addClass("is-loading");

    this.messageEl = this.contentEl.createEl("p", {
      text: `Extracting text from attachments in note: ${noteName}`,
    });

    new Setting(this.contentEl).addButton((button) => {
      this.button = button;
      button.setButtonText("Cancel").onClick(() => this.close());
    });
  }

  showWarning(extractedCount: number, skippedEmbeds: EmbedCache[]) {
    this.setTitle("Extraction complete");
    this.modalEl.removeClass("is-loading");

    this.messageEl.empty();
    this.messageEl.createDiv({
      text: `Text extracted from ${extractedCount} attachment${extractedCount === 1 ? "" : "s"}. The following were skipped:`,
    });
    const list = this.messageEl.createEl("ul");
    for (const embed of skippedEmbeds) {
      list.createEl("li", { text: getLinkpath(embed.link) });
    }

    this.button.setButtonText("OK");
  }

  showError(message: string) {
    this.setTitle("Error");
    this.modalEl.removeClass("is-loading");
    this.messageEl.setText(message);
    this.button.setButtonText("OK");
  }

  onClose() {
    super.onClose();
    this.onModalClose();
  }
}

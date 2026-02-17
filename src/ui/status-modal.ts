import {
  App,
  ButtonComponent,
  EmbedCache,
  getLinkpath,
  Modal,
  Setting,
} from "obsidian";
import { t } from "../i18n";

export class StatusModal extends Modal {
  private readonly messageEl: HTMLElement;
  private button!: ButtonComponent;

  constructor(
    app: App,
    private onModalClose: () => void,
  ) {
    super(app);
    this.setTitle(t("modals.ocrExtractor"));
    this.modalEl.addClass("is-loading");

    this.messageEl = this.contentEl.createEl("p", {
      text: t("modals.extractingText"),
    });

    new Setting(this.contentEl).addButton((button) => {
      this.button = button;
      button.setButtonText(t("modals.cancel")).onClick(() => this.close());
    });
  }

  showWarning(extractedCount: number, skippedEmbeds: EmbedCache[]) {
    this.modalEl.removeClass("is-loading");

    this.messageEl.empty();
    this.messageEl.createDiv({
      text: t("modals.extractedWarning", { count: extractedCount }),
    });
    const list = this.messageEl.createEl("ul");
    for (const embed of skippedEmbeds) {
      list.createEl("li", { text: getLinkpath(embed.link) });
    }

    this.button.setButtonText(t("modals.ok"));
  }

  showError(message: string) {
    this.modalEl.removeClass("is-loading");
    this.messageEl.setText(t("errors.error", { message }));
    this.button.setButtonText(t("modals.ok"));
  }

  onClose() {
    super.onClose();
    this.onModalClose();
  }
}

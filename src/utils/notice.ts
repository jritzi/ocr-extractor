import { Notice } from "obsidian";
import { t } from "../i18n";

export function showNotice(message: string) {
  new Notice(message);
}

/**
 * Show a persistent loading Notice, displayed until `.hide()` is called.
 */
export function showLoadingNotice(message: string | DocumentFragment) {
  const notice = new Notice(message, 0);
  notice.containerEl.addClass("is-loading");
  return notice;
}

/**
 * Show a persistent loading Notice with a cancel link (that runs `onCancel()`),
 * displayed until `.hide()` is called.
 */
export function showCancelableLoadingNotice(
  message: string | DocumentFragment,
  onCancel: () => void,
) {
  const fragment = createFragment((el) => {
    const row = el.createDiv({ cls: "ocr-extractor-notice" });
    row.createSpan().append(message);

    const cancel = row.createEl("a", {
      text: t("status.cancel"),
      cls: "ocr-extractor-notice-cancel",
    });
    cancel.addEventListener("click", (event) => {
      event.stopPropagation();
      onCancel();
    });
  });

  return showLoadingNotice(fragment);
}

export function showSuccessNotice(message: string) {
  new Notice(message).containerEl.addClass("mod-success");
}

export function showErrorNotice(message: string) {
  new Notice(message).containerEl.addClass("mod-warning");
}

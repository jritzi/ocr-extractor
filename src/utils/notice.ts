import { Notice } from "obsidian";

export function showNotice(message: string) {
  new Notice(message);
}

/**
 * Show a loading Notice that will display until `.hide()` is called on it.
 */
export function showLoadingNotice(message: string) {
  const notice = new Notice(message, 0);
  notice.containerEl.addClass("is-loading");
  return notice;
}

export function showSuccessNotice(message: string) {
  new Notice(message).containerEl.addClass("mod-success");
}

export function showErrorNotice(message: string) {
  new Notice(message).containerEl.addClass("mod-warning");
}

import { Notice } from "obsidian";
import { t } from "../i18n";

export interface NoticeAction {
  label: string;
  onClick: () => void;
}

/**
 * Show a notice with one or more lines and an optional action, rendered as a
 * link below them. Set `persistent` to prevent it from auto-dismissing.
 */
export function showNotice(
  message: string | string[],
  {
    action,
    persistent,
    variant,
  }: {
    action?: NoticeAction;
    persistent?: boolean;
    variant?: "success" | "error";
  } = {},
) {
  const fragment = createFragment((el) => {
    const container = el.createDiv({ cls: "ocr-extractor-notice-lines" });
    for (const line of Array.isArray(message) ? message : [message]) {
      container.createDiv({ text: line });
    }

    if (action) {
      const link = container.createEl("a", {
        text: action.label,
        cls: "ocr-extractor-notice-link",
      });
      link.addEventListener("click", () => {
        action.onClick();
        notice.hide();
      });
    }
  });

  const notice = new Notice(fragment, persistent ? 0 : undefined);
  if (variant) {
    notice.containerEl.addClass(
      variant === "success" ? "mod-success" : "mod-warning",
    );
  }
  return notice;
}

/**
 * Show a loading notice that persists until the caller calls `hide()`. If
 * `onCancel` is provided, a "Cancel" link is shown at the end of the line.
 */
export function showLoadingNotice(
  message: string,
  { onCancel }: { onCancel?: () => void } = {},
) {
  const fragment = createFragment((el) => {
    const row = el.createDiv({ cls: "ocr-extractor-notice-row" });
    row.createSpan({ text: message });

    if (onCancel) {
      const cancel = row.createEl("a", {
        text: t("status.cancel"),
        cls: "ocr-extractor-notice-link",
      });
      cancel.addEventListener("click", (event) => {
        // Don't dismiss the notice, wait until `hide()` is called
        event.stopPropagation();
        onCancel();
      });
    }
  });

  const notice = new Notice(fragment, 0);
  notice.containerEl.addClass("is-loading");
  return notice;
}

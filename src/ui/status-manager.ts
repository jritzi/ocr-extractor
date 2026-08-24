import OcrExtractorPlugin from "../../main";
import { Notice } from "obsidian";
import { debugLog } from "../utils/logging";
import { StatusBarItem } from "./status-bar-item";
import { showReportView } from "./report/report-view";
import { showLoadingNotice, showNotice } from "../utils/notice";
import { ReportStore } from "../reporting/report-store";
import {
  countResults,
  isMultiNote,
  RunScope,
  totalResults,
} from "../reporting/run-report";
import { assert } from "../utils/assert";
import {
  describeCompletion,
  describeCount,
  describeEarlyStop,
} from "../reporting/report-text";
import { t } from "../i18n";

export type Status = "idle" | "processing" | "canceling";

export class StatusManager {
  private readonly store: ReportStore;
  private readonly statusBarItem: StatusBarItem;

  private status: Status = "idle";
  private abortController = new AbortController();
  private loadingNotice: Notice | null = null;

  constructor(private plugin: OcrExtractorPlugin) {
    this.store = plugin.reportStore;
    this.statusBarItem = new StatusBarItem(plugin, {
      onCancel: () => this.setCanceling(),
    });

    plugin.register(this.store.subscribe(() => this.renderProgress()));
  }

  getSignal() {
    return this.abortController.signal;
  }

  isIdle() {
    return this.status === "idle";
  }

  isProcessing() {
    return this.status === "processing";
  }

  isCanceling() {
    return this.status === "canceling";
  }

  isUnloading() {
    return this.getSignal().aborted && !this.isCanceling();
  }

  setProcessing(scope: RunScope, totalNotes: number) {
    this.abortController = new AbortController();
    this.status = "processing";
    this.statusBarItem.show(t("status.extracting"));
    this.store.startRun(scope, totalNotes);

    if (!isMultiNote(scope)) {
      this.loadingNotice = showLoadingNotice(t("notices.extracting"), {
        onCancel: () => this.setCanceling(),
      });
    }

    debugLog(`Status set to processing (${scope.type})`);
  }

  setCanceling() {
    if (this.status !== "processing") {
      return;
    }

    this.status = "canceling";
    this.abortController.abort();
    this.store.startCanceling();
    this.statusBarItem.show(t("status.canceling"));
    this.loadingNotice?.setMessage(t("status.canceling"));
    debugLog("Status set to canceling");
  }

  setCanceled() {
    this.store.cancelRun();
    this.setIdle();

    showNotice(t("notices.canceled"), {
      action: this.hasReportEntries() ? this.showDetailsAction() : undefined,
    });

    debugLog("Status set to idle (canceled)");
  }

  setComplete() {
    this.store.completeRun();
    this.setIdle();

    const report = this.currentReport();
    const counts = countResults(report);
    showNotice(describeCompletion(report), {
      action:
        counts.skipped + counts.failed > 0
          ? this.showDetailsAction()
          : undefined,
    });

    debugLog("Status set to idle (complete)");
  }

  setFatal(message: string) {
    this.store.fatalRun(message);
    this.setIdle();

    const lines = [message];
    const earlyStop = describeEarlyStop(this.currentReport());
    if (earlyStop) {
      lines.push(earlyStop);
    }

    showNotice(lines, {
      action: this.showDetailsAction(),
      persistent: true,
      variant: "error",
    });

    debugLog("Status set to idle (fatal)");
  }

  cleanup() {
    this.abortController.abort();
    this.hideLoadingNotice();
  }

  private renderProgress() {
    const report = this.currentReport();
    if (
      report.status !== "running" ||
      !isMultiNote(report.scope) ||
      report.notesStarted === 0
    ) {
      return;
    }

    const failed = countResults(report).failed;
    let text = t("status.extractingNote", {
      current: report.notesStarted,
      total: report.totalNotes,
    });
    if (failed > 0) {
      text += ` · ${describeCount("failed", failed, { nameAttachments: true })}`;
    }
    this.statusBarItem.show(text);
  }

  private hasReportEntries() {
    return totalResults(countResults(this.currentReport())) > 0;
  }

  private currentReport() {
    const report = this.store.getReport();
    assert(report, "Only called after a run has started");
    return report;
  }

  private showDetailsAction() {
    return {
      label: t("notices.showDetails"),
      onClick: () => void showReportView(this.plugin.app),
    };
  }

  private setIdle() {
    this.status = "idle";
    this.statusBarItem.hide();
    this.hideLoadingNotice();
  }

  private hideLoadingNotice() {
    this.loadingNotice?.hide();
    this.loadingNotice = null;
  }
}

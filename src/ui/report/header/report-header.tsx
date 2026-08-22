import { Menu } from "obsidian";
import { MouseEvent } from "react";
import {
  countResults,
  RESULT_STATUSES,
  ResultStatus,
  RunReport,
} from "../../../reporting/run-report";
import {
  buildCopyText,
  describeResultStatus,
} from "../../../reporting/report-text";
import { isFiltering, StatusFilter } from "../../../reporting/status-filter";
import { assert } from "../../../utils/assert";
import { logWarning } from "../../../utils/logging";
import { showNotice } from "../../../utils/notice";
import { t } from "../../../i18n";
import { ActionButton } from "./action-button";
import { ReportSummary } from "./report-summary";
import "./report-header.css";

interface ReportHeaderProps {
  report: RunReport | null;
  allCollapsed: boolean;
  onToggleAll: () => void;
  statusFilter: StatusFilter;
  onToggleStatus: (status: ResultStatus) => void;
}

export function ReportHeader({
  report,
  allCollapsed,
  onToggleAll,
  statusFilter,
  onToggleStatus,
}: ReportHeaderProps) {
  const hasNotes = (report?.notes.length ?? 0) > 0;

  return (
    <div className="ocr-extractor-report-header">
      <div className="nav-header">
        <div className="nav-buttons-container">
          <ActionButton
            icon="copy"
            label={t("report.copyReport")}
            onClick={() => {
              assert(report, "Disabled until a run starts");
              void copyReport(report);
            }}
            disabled={!report}
          />
          <ActionButton
            icon="filter"
            label={t("report.filter")}
            onClick={(event) => {
              assert(report, "Disabled until a report is available");
              showFilterMenu(report, statusFilter, onToggleStatus, event);
            }}
            disabled={!hasNotes}
            active={isFiltering(statusFilter)}
          />
          <ActionButton
            icon={allCollapsed ? "chevrons-up-down" : "chevrons-down-up"}
            label={
              allCollapsed ? t("report.expandAll") : t("report.collapseAll")
            }
            onClick={onToggleAll}
            disabled={!hasNotes}
          />
        </div>
      </div>

      {report && <ReportSummary report={report} />}
    </div>
  );
}

function showFilterMenu(
  report: RunReport,
  statusFilter: StatusFilter,
  onToggleStatus: (status: ResultStatus) => void,
  event: MouseEvent,
) {
  const counts = countResults(report);
  const menu = new Menu();

  for (const status of RESULT_STATUSES) {
    menu.addItem((item) =>
      item
        .setTitle(`${describeResultStatus(status)} (${counts[status]})`)
        .setChecked(statusFilter[status])
        .onClick(() => onToggleStatus(status)),
    );
  }

  menu.showAtMouseEvent(event.nativeEvent);
}

async function copyReport(report: RunReport) {
  try {
    await navigator.clipboard.writeText(buildCopyText(report));
  } catch (error) {
    logWarning("Couldn't copy report", error);
    return;
  }

  showNotice(t("notices.reportCopied"));
}

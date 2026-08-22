import clsx from "clsx";
import { Fragment } from "react";
import {
  countResults,
  RESULT_STATUSES,
  RunReport,
} from "../../../reporting/run-report";
import {
  describeCount,
  describeEarlyStop,
  describeFinish,
  describeRunStatus,
  describeScope,
  describeStart,
} from "../../../reporting/report-text";
import { t } from "../../../i18n";
import { StatusIcon } from "./status-icon";
import "./report-summary.css";

interface ReportSummaryProps {
  report: RunReport;
}

export function ReportSummary({ report }: ReportSummaryProps) {
  const counts = countResults(report);
  const finishMessage = describeFinish(report);
  const earlyStopMessage = describeEarlyStop(report);

  return (
    <div className="ocr-extractor-report-summary">
      <div
        className={clsx(
          "ocr-extractor-report-status",
          report.status === "fatal" && "ocr-extractor-report-status-error",
        )}
      >
        <StatusIcon status={report.status} />
        {describeRunStatus(report.status)}
      </div>

      <div>{describeScope(report.scope)}</div>

      <div>{describeStart(report)}</div>
      {finishMessage && <div>{finishMessage}</div>}

      {report.status === "fatal" && (
        <div className="ocr-extractor-report-fatal">{report.fatalMessage}</div>
      )}
      {earlyStopMessage && <div>{earlyStopMessage}</div>}

      <div>
        {t("counts.label")}{" "}
        {RESULT_STATUSES.map((status, index) => (
          <Fragment key={status}>
            {index > 0 && " · "}
            <span
              className={
                status === "failed" && counts.failed > 0
                  ? "ocr-extractor-report-count-failed"
                  : undefined
              }
            >
              {describeCount(status, counts[status], {
                nameAttachments: false,
              })}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

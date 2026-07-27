import { t } from "../i18n";
import { describeReason } from "../result-reason";
import { formatDateTime, formatDuration } from "../utils/datetime";
import {
  AttachmentResult,
  countResults,
  isMultiNote,
  RESULT_STATUSES,
  ResultStatus,
  RunReport,
  RunScope,
} from "./run-report";

export function describeScope(scope: RunScope) {
  switch (scope.type) {
    case "note":
      return t("report.scope.note", { name: scope.path });
    case "folder":
      return t("report.scope.folder", { path: scope.path });
    case "vault":
      return t("report.scope.vault");
    case "selection":
      return t("report.scope.selection");
  }
}

export function describeRunStatus(report: RunReport) {
  return t(`report.runStatus.${report.status}`);
}

export function describeEarlyStop(report: RunReport) {
  if (
    (report.status !== "fatal" && report.status !== "canceled") ||
    !isMultiNote(report)
  ) {
    return null;
  }

  return t("notices.stoppedAfterNotes", {
    processed: report.notesProcessed,
    count: report.totalNotes,
  });
}

export function describeCount(
  status: ResultStatus,
  count: number,
  { nameAttachments }: { nameAttachments: boolean },
) {
  return nameAttachments
    ? t(`counts.attachments.${status}`, { count })
    : t(`counts.${status}`, { count });
}

export function describeResultStatus(status: ResultStatus) {
  return t(`report.resultStatus.${status}`);
}

export function describeResult(
  result: AttachmentResult,
  { style }: { style: "compact" | "full" },
) {
  const status = describeResultStatus(result.status);
  if (result.status === "extracted") {
    return status;
  }

  const reason = describeReason(result.reason);
  if (style === "compact") {
    return `${status} · ${reason}`;
  }

  return result.detail
    ? t("report.resultLine.withDetail", {
        status,
        reason,
        detail: result.detail,
      })
    : t("report.resultLine.withReason", { status, reason });
}

/** Plain-text version of the run report for the copy button */
export function buildReportText(report: RunReport) {
  const counts = countResults(report);
  const lines = [
    t("report.title"),
    describeScope(report.scope),
    `${t("report.startedAt", { time: formatDateTime(report.startedAt) })} · ${t("report.noteCount", { count: report.totalNotes })}`,
  ];

  if (report.finishedAt !== undefined) {
    lines.push(
      `${t("report.finishedAt", { time: formatDateTime(report.finishedAt) })} · ${formatDuration(report.finishedAt - report.startedAt)}`,
    );
  }

  lines.push(describeRunStatus(report));

  if (report.status === "fatal" && report.fatalMessage) {
    lines.push(report.fatalMessage);
  }
  const earlyStop = describeEarlyStop(report);
  if (earlyStop) {
    lines.push(earlyStop);
  }

  lines.push(
    `${t("counts.label")}: ${RESULT_STATUSES.map((status) =>
      describeCount(status, counts[status], { nameAttachments: false }),
    ).join(" · ")}`,
  );

  for (const note of report.notes) {
    lines.push("", note.path);
    for (const attachment of note.attachments) {
      lines.push(
        `  ${attachment.path}: ${describeResult(attachment.result, { style: "full" })}`,
      );
    }
  }

  return lines.join("\n");
}

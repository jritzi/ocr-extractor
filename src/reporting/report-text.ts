import { t } from "../i18n";
import { describeReason } from "../result-reason";
import { formatDateTime, formatDuration } from "../utils/datetime";
import { basename } from "../utils/path";
import {
  AttachmentResult,
  countResults,
  firstFailure,
  isMultiNote,
  RESULT_STATUSES,
  ResultCounts,
  ResultStatus,
  RunReport,
  RunScope,
  totalResults,
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
    !isMultiNote(report.scope)
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

export function describeCompletion(report: RunReport) {
  const counts = countResults(report);
  if (totalResults(counts) === 0) {
    return [t("notices.nothingToExtract")];
  }

  // For a single note run with one failure, show the failure in the message
  const namedFailure =
    counts.failed === 1 && report.totalNotes === 1
      ? firstFailure(report)
      : null;

  const lines = [t("notices.complete")];

  if (namedFailure) {
    // The named line below already covers the one failure, so it isn't counted
    const counted = RESULT_STATUSES.filter((status) => status !== "failed");
    lines.push(
      ...describeCounts(counts, counted),
      t("notices.failedSingle", {
        name: basename(namedFailure.path),
        reason: describeReason(namedFailure.reason),
      }),
    );
  } else {
    lines.push(...describeCounts(counts, RESULT_STATUSES));
  }

  return lines;
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
export function buildCopyText(report: RunReport) {
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

function describeCounts(
  counts: ResultCounts,
  statuses: readonly ResultStatus[],
) {
  return statuses
    .filter((status) => counts[status] > 0)
    .map((status, index) =>
      describeCount(status, counts[status], { nameAttachments: index === 0 }),
    );
}

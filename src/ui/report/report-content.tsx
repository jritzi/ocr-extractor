import { App } from "obsidian";
import { useState } from "react";
import { RunReport } from "../../reporting/run-report";
import { describeEmpty } from "../../reporting/report-text";
import {
  filterNotes,
  isFiltering,
  NO_FILTER,
  StatusFilter,
} from "../../reporting/status-filter";
import { t } from "../../i18n";
import { ReportHeader } from "./header/report-header";
import { NoteGroup } from "./tree/note-group";
import "./report-content.css";

interface ReportContentProps {
  report: RunReport | null;
  app: App;
}

export function ReportContent({ report, app }: ReportContentProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(NO_FILTER);

  const filtering = isFiltering(statusFilter);
  const notes = report?.notes ?? [];
  const visibleNotes = filtering ? filterNotes(notes, statusFilter) : notes;

  const allCollapsed =
    visibleNotes.length > 0 &&
    visibleNotes.every((note) => collapsedPaths.has(note.path));

  function toggleCollapsed(path: string) {
    setCollapsedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function toggleAllCollapsed() {
    setCollapsedPaths(
      allCollapsed ? new Set() : new Set(visibleNotes.map((note) => note.path)),
    );
  }

  let body;
  if (!report) {
    body = <div className="pane-empty">{t("report.noRun")}</div>;
  } else if (visibleNotes.length > 0) {
    body = (
      <div className="ocr-extractor-report-notes">
        {visibleNotes.map((note) => (
          <NoteGroup
            key={note.path}
            note={note}
            collapsed={collapsedPaths.has(note.path)}
            onToggle={() => toggleCollapsed(note.path)}
            app={app}
          />
        ))}
      </div>
    );
  } else {
    const emptyMessage = describeEmpty(report.status, { filtering });
    if (emptyMessage) {
      body = <div className="pane-empty">{emptyMessage}</div>;
    }
  }

  return (
    <>
      <ReportHeader
        report={report}
        allCollapsed={allCollapsed}
        onToggleAll={toggleAllCollapsed}
        statusFilter={statusFilter}
        onToggleStatus={(status) =>
          setStatusFilter((current) => ({
            ...current,
            [status]: !current[status],
          }))
        }
      />
      {body}
    </>
  );
}

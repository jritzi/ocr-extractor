import { App } from "obsidian";
import { useState, useSyncExternalStore } from "react";
import { ReportStore } from "../../reporting/report-store";
import { describeEmpty } from "../../reporting/report-text";
import {
  filterNotes,
  isFiltering,
  StatusFilter,
} from "../../reporting/status-filter";
import { t } from "../../i18n";
import { ReportHeader } from "./header/report-header";
import { NoteGroup } from "./tree/note-group";
import "./report-app.css";

interface ReportAppProps {
  store: ReportStore;
  app: App;
}

export function ReportApp({ store, app }: ReportAppProps) {
  const report = useSyncExternalStore(store.subscribe, () => store.getReport());

  const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>({
    extracted: true,
    skipped: true,
    failed: true,
  });

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

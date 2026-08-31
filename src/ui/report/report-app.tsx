import { App } from "obsidian";
import { useSyncExternalStore } from "react";
import { ReportStore } from "../../reporting/report-store";
import { ReportContent } from "./report-content";

interface ReportAppProps {
  store: ReportStore;
  app: App;
}

export function ReportApp({ store, app }: ReportAppProps) {
  const report = useSyncExternalStore(store.subscribe, () => store.getReport());

  // Keyed by run time, so each run resets filter, collapse, etc. state
  return <ReportContent key={report?.startedAt} report={report} app={app} />;
}

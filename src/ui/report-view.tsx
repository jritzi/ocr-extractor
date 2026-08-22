import { App, ItemView, WorkspaceLeaf } from "obsidian";
import { StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import OcrExtractorPlugin from "../../main";
import { PLUGIN_ICON } from "../actions";
import { ReportStore } from "../reporting/report-store";
import { t } from "../i18n";
import { ReportApp } from "./report/report-app";
import "./report-view.css";

export const REPORT_VIEW_TYPE = "ocr-extractor-report";

export class ReportView extends ItemView {
  override navigation = false;
  private root: Root | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private store: ReportStore,
  ) {
    super(leaf);
  }

  getViewType() {
    return REPORT_VIEW_TYPE;
  }

  getDisplayText() {
    return t("report.title", { pluginName: t("pluginName") });
  }

  override getIcon() {
    return PLUGIN_ICON;
  }

  override async onOpen() {
    this.contentEl.addClass("ocr-extractor-report-view");
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <ReportApp store={this.store} app={this.app} />
      </StrictMode>,
    );
  }

  override async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}

export function registerReportView(plugin: OcrExtractorPlugin) {
  plugin.registerView(
    REPORT_VIEW_TYPE,
    (leaf) => new ReportView(leaf, plugin.reportStore),
  );
}

export async function showReportView(app: App) {
  const { workspace } = app;

  let leaf: WorkspaceLeaf | null =
    workspace.getLeavesOfType(REPORT_VIEW_TYPE)[0] ?? null;
  if (!leaf) {
    leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
    await leaf.setViewState({ type: REPORT_VIEW_TYPE, active: true });
  }

  await workspace.revealLeaf(leaf);
}

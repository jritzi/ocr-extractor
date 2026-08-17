import type { MouseEvent } from "react";
import { App } from "obsidian";
import { AttachmentEntry } from "../../reporting/run-report";
import { describeResult } from "../../reporting/report-text";
import { basename } from "../../utils/path";
import { useOverflowTooltip } from "./use-tooltip";
import { openNoteFromClick } from "../../utils/workspace";
import { findEmbedLine } from "../../utils/file";
import "./attachment-row.css";

interface AttachmentRowProps {
  attachment: AttachmentEntry;
  notePath: string;
  app: App;
}

export function AttachmentRow({
  attachment,
  notePath,
  app,
}: AttachmentRowProps) {
  const { path, result } = attachment;
  const nameRef = useOverflowTooltip<HTMLDivElement>(path);

  const resultText =
    result.status === "extracted"
      ? ""
      : describeResult(result, { style: "compact" });
  const resultRef = useOverflowTooltip<HTMLDivElement>(resultText);

  function open(event: MouseEvent) {
    void openNoteFromClick(
      app,
      notePath,
      event.nativeEvent,
      findEmbedLine(app, notePath, attachment),
    );
  }

  return (
    <div className="tree-item ocr-extractor-report-attachment-item">
      <div
        className={`tree-item-self is-clickable ocr-extractor-report-result-${result.status}`}
        onClick={open}
        onAuxClick={open}
      >
        <div className="tree-item-inner">
          <div ref={nameRef} className="ocr-extractor-report-attachment-name">
            {basename(path)}
          </div>
          {resultText && (
            <div
              ref={resultRef}
              className="ocr-extractor-report-attachment-result"
            >
              {resultText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

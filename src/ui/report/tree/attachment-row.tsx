import type { MouseEvent } from "react";
import { App } from "obsidian";
import clsx from "clsx";
import { AttachmentEntry } from "../../../reporting/run-report";
import { describeResult } from "../../../reporting/report-text";
import { basename } from "../../../utils/path";
import { useTruncationTooltip } from "../../hooks/use-truncation-tooltip";
import { openNoteFromClick } from "../../../utils/workspace";
import { findAttachmentLine } from "./find-attachment-line";
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
  const name = basename(path);
  const nameRef = useTruncationTooltip<HTMLDivElement>(name);

  const resultText =
    result.status === "extracted"
      ? ""
      : describeResult(result, { style: "compact" });
  const resultRef = useTruncationTooltip<HTMLDivElement>(resultText);

  async function open(event: MouseEvent) {
    const line = await findAttachmentLine(app, notePath, attachment);
    await openNoteFromClick(app, notePath, event.nativeEvent, line);
  }

  return (
    <div className="tree-item">
      <div
        className={clsx(
          "tree-item-self is-clickable",
          result.status === "failed" && "ocr-extractor-report-result-failed",
        )}
        onClick={(event) => void open(event)}
        onAuxClick={(event) => void open(event)}
      >
        <div className="tree-item-inner">
          <div ref={nameRef} className="ocr-extractor-report-attachment-name">
            {name}
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

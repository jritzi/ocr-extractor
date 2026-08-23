import type { MouseEvent } from "react";
import { App } from "obsidian";
import { motion } from "motion/react";
import clsx from "clsx";
import { NoteEntry } from "../../../reporting/run-report";
import { AttachmentRow } from "./attachment-row";
import { openNoteFromClick } from "../../../utils/workspace";
import { useIcon } from "../../hooks/use-icon";
import { useTruncationTooltip } from "../../hooks/use-truncation-tooltip";
import { noteName, parentFolder } from "../../../utils/path";
import "./note-group.css";

interface NoteGroupProps {
  note: NoteEntry;
  collapsed: boolean;
  onToggle: () => void;
  app: App;
}

export function NoteGroup({ note, collapsed, onToggle, app }: NoteGroupProps) {
  const name = noteName(note.path);
  const folder = parentFolder(note.path);
  const nameRef = useTruncationTooltip<HTMLDivElement>(name);
  const folderRef = useTruncationTooltip<HTMLDivElement>(folder);
  const chevronRef = useIcon<HTMLSpanElement>("right-triangle");

  function open(event: MouseEvent) {
    void openNoteFromClick(app, note.path, event.nativeEvent);
  }

  return (
    <div className="tree-item ocr-extractor-report-note-item">
      <div
        className="tree-item-self is-clickable mod-collapsible"
        onClick={open}
        onAuxClick={open}
      >
        <span
          ref={chevronRef}
          className={clsx(
            "tree-item-icon collapse-icon",
            collapsed && "is-collapsed",
          )}
          onClick={(event) => {
            // Don't open the note when toggling collapse
            event.stopPropagation();
            onToggle();
          }}
        />
        <div className="tree-item-inner">
          <div ref={nameRef} className="ocr-extractor-report-note-name">
            {name}
          </div>
          {folder && (
            <div
              ref={folderRef}
              className="tree-item-inner-subtext ocr-extractor-report-note-folder"
            >
              {folder}
            </div>
          )}
        </div>
        <div className="tree-item-flair-outer">
          <span className="tree-item-flair">{note.attachments.length}</span>
        </div>
      </div>

      {/* Match native tree view transition */}
      <motion.div
        className="tree-item-children"
        initial={false}
        animate={{ height: collapsed ? 0 : "auto" }}
        transition={{ duration: 0.1, ease: [0.02, 0.01, 0.47, 1] }}
      >
        {note.attachments.map((attachment) => (
          <AttachmentRow
            key={attachment.markup}
            attachment={attachment}
            notePath={note.path}
            app={app}
          />
        ))}
      </motion.div>
    </div>
  );
}

import type { Reference } from "obsidian";
import { App, Keymap } from "obsidian";
import { findCalloutHeaderLinks } from "../../../callouts";
import type { AttachmentEntry } from "../../../reporting/run-report";
import { attachmentPath, resolveLinkedFile } from "../../../utils/file";
import { getNoteCache } from "../../../utils/metadata-cache";
import { noteName } from "../../../utils/path";
import { showNotice } from "../../../utils/notice";
import { t } from "../../../i18n";

/**
 * Find the line in a note representing an attachment (the first time it's
 * embedded or, for property links, the callout linking to it).
 */
export async function findAttachmentLine(
  app: App,
  notePath: string,
  attachment: AttachmentEntry,
) {
  const note = app.vault.getFileByPath(notePath);
  if (!note) return undefined;
  const { embeds, links } = getNoteCache(app, note);

  const referencesAttachment = (candidate: Reference) =>
    attachmentPath(
      resolveLinkedFile(app, candidate.link, notePath),
      candidate.link,
    ) === attachment.path;

  // Match the full markup (e.g. `![[a.pdf#page=2]]`), fall back to the path
  const embed =
    embeds.find((candidate) => candidate.original === attachment.markup) ??
    embeds.find(referencesAttachment);
  if (embed) return embed.position.start.line;

  const content = await app.vault.cachedRead(note);
  const headerLinks = findCalloutHeaderLinks(content, links);
  return headerLinks.find(referencesAttachment)?.position.start.line;
}

export async function openNoteFromClick(
  app: App,
  notePath: string,
  event: MouseEvent,
  line?: number,
) {
  // Ignore right clicks (which just open the context menu)
  if (event.button === 2) return;

  const file = app.vault.getFileByPath(notePath);
  if (!file) {
    // Note was renamed, deleted, etc. since last run
    showNotice(t("notices.noteNotFound", { name: noteName(notePath) }));
    return;
  }

  await app.workspace
    .getLeaf(Keymap.isModEvent(event))
    // `line` to highlight the embed
    .openFile(file, line === undefined ? undefined : { eState: { line } });
}

import { TFile } from "obsidian";
import OcrExtractorPlugin from "../../main";
import { showNotice } from "../utils/notice";
import { isMarkdown, isObsidianNative, resolveLinkedFile } from "../utils/file";
import { getNoteCache, type NoteCache } from "../utils/metadata-cache";
import { filterLinksByProperties } from "../utils/property";
import { t } from "../i18n";

export function registerAutoExtractEvents(plugin: OcrExtractorPlugin) {
  /**
   * Map of note paths to the references in that file. Set when the note is
   * opened and updated on note change (if the count of references to extract
   * from increases, auto-extract if configured).
   */
  const trackedNotes = new Map<string, NoteCache>();

  /**
   * Count the references in a note to extract text from. Only counts valid
   * (resolving to a real file) ones, to prevent triggering extraction on an
   * incomplete link while the user is typing.
   */
  function countReferencesToExtract(file: TFile, cache: NoteCache) {
    const propertyLinks = filterLinksByProperties(
      cache.frontmatterLinks,
      plugin.settings.propertiesToExtractFrom,
    );

    return [...cache.embeds, ...propertyLinks].filter((reference) => {
      const referencedFile = resolveLinkedFile(
        plugin.app,
        reference.link,
        file.path,
      );
      return referencedFile && !isObsidianNative(referencedFile);
    }).length;
  }

  plugin.registerEvent(
    plugin.app.workspace.on("file-open", (file) => {
      if (!file || !isMarkdown(file) || trackedNotes.has(file.path)) return;
      trackedNotes.set(file.path, getNoteCache(plugin.app, file));
    }),
  );

  plugin.registerEvent(
    plugin.app.vault.on("rename", (file, oldPath) => {
      const tracked = trackedNotes.get(oldPath);
      if (tracked === undefined) return;
      trackedNotes.set(file.path, tracked);
      trackedNotes.delete(oldPath);
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("deleted", (file) => {
      trackedNotes.delete(file.path);
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("changed", (file) => {
      if (!isMarkdown(file)) return;

      const previous = trackedNotes.get(file.path);

      // Ignore if note has never been opened
      if (previous === undefined) return;

      const current = getNoteCache(plugin.app, file);
      trackedNotes.set(file.path, current);

      // Check only at the last minute to ensure we keep tracking (but not
      // extracting) even if the setting is off
      if (!plugin.settings.autoExtractAttachments) return;

      // Count both with the current properties, so editing the list doesn't
      // read as the user adding an attachment
      if (
        countReferencesToExtract(file, current) >
        countReferencesToExtract(file, previous)
      ) {
        if (!plugin.extractor.canProcessSingleNote()) {
          showNotice(
            t("notices.autoExtractSkippedWhileBusy", {
              pluginName: t("pluginName"),
            }),
          );
          return;
        }
        plugin.extractor.processSingleNote(file);
      }
    }),
  );
}

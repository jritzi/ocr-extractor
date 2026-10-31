import { type FrontmatterLinkCache, type Reference, TFile } from "obsidian";
import OcrExtractorPlugin from "../../main";
import { showNotice } from "../utils/notice";
import { isMarkdown, isObsidianNative, resolveLinkedFile } from "../utils/file";
import { getNoteCache } from "../utils/metadata-cache";
import { filterLinksByProperties } from "../utils/property";
import { t } from "../i18n";

interface TrackedNote {
  embedCount: number;
  propertyLinks: FrontmatterLinkCache[];
}

export function registerAutoExtractEvents(plugin: OcrExtractorPlugin) {
  /**
   * Map of note paths to the references in that file. Set when the note is
   * opened and updated on note change (if the count of references to extract
   * from increases, auto-extract if configured).
   */
  const trackedNotes = new Map<string, TrackedNote>();

  /**
   * Resolve references now, so a later rename can't change a tracked note.
   * Unresolved ones (often a link still being typed) don't count.
   */
  function track(file: TFile) {
    const cache = getNoteCache(plugin.app, file);
    const isValid = (reference: Reference) => {
      const referencedFile = resolveLinkedFile(
        plugin.app,
        reference.link,
        file.path,
      );
      return referencedFile !== null && !isObsidianNative(referencedFile);
    };

    return {
      embedCount: cache.embeds.filter(isValid).length,
      propertyLinks: cache.frontmatterLinks.filter(isValid),
    };
  }

  function countReferencesToExtract(note: TrackedNote) {
    const propertyLinks = filterLinksByProperties(
      note.propertyLinks,
      plugin.settings.propertiesToExtractFrom,
    );
    return note.embedCount + propertyLinks.length;
  }

  plugin.registerEvent(
    plugin.app.workspace.on("file-open", (file) => {
      if (!file || !isMarkdown(file) || trackedNotes.has(file.path)) return;
      trackedNotes.set(file.path, track(file));
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

      const current = track(file);
      trackedNotes.set(file.path, current);

      // Check only at the last minute to ensure we keep tracking (but not
      // extracting) even if the setting is off
      if (!plugin.settings.autoExtractAttachments) return;

      // Count both with the current properties, so editing the list doesn't
      // read as the user adding an attachment
      if (
        countReferencesToExtract(current) > countReferencesToExtract(previous)
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

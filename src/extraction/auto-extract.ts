import { TFile } from "obsidian";
import OcrExtractorPlugin from "../../main";
import { showNotice } from "../utils/notice";
import { isMarkdown, isObsidianNative, resolveLinkedFile } from "../utils/file";
import { getNoteCache } from "../utils/metadata-cache";
import { filterLinksByProperties } from "../utils/property";
import { t } from "../i18n";

interface TrackedNote {
  count: number;

  /** The setting's value when the references were counted */
  propertiesToExtractFrom: readonly string[];
}

export function registerAutoExtractEvents(plugin: OcrExtractorPlugin) {
  /**
   * Map of note paths to the number of valid references in that file. Set when
   * the note is opened and updated on note change (if the count increases,
   * auto-extract if configured).
   */
  const trackedNotes = new Map<string, TrackedNote>();

  /**
   * Count the references in a note to extract text from. Only counts valid
   * (resolving to a real file) ones, to prevent triggering extraction on an
   * incomplete link while the user is typing.
   */
  function countReferencesToExtract(
    file: TFile,
    properties: readonly string[],
  ) {
    const cache = getNoteCache(plugin.app, file);
    const propertyLinks = filterLinksByProperties(
      cache.frontmatterLinks,
      properties,
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

  function track(file: TFile) {
    const { propertiesToExtractFrom } = plugin.settings;
    return {
      count: countReferencesToExtract(file, propertiesToExtractFrom),
      propertiesToExtractFrom,
    };
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

      trackedNotes.set(file.path, track(file));

      // Check only at the last minute to ensure we keep tracking (but not
      // extracting) even if the setting is off
      if (!plugin.settings.autoExtractAttachments) return;

      // Count with the same properties as the previous count, so editing the
      // list doesn't read as the user adding an attachment
      const count = countReferencesToExtract(
        file,
        previous.propertiesToExtractFrom,
      );
      if (count > previous.count) {
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

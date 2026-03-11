import OcrExtractorPlugin from "../main";
import { showNotice } from "./utils/notice";
import { isMarkdown, isObsidianNative, resolveEmbedPath } from "./utils/file";
import { t } from "./i18n";

export function registerAutoExtractEvents(plugin: OcrExtractorPlugin) {
  /**
   * Map of note paths to number of valid embeds in that file. Set when note
   * opened and updated on note change (if the count increases, auto-extract
   * if configured).
   */
  const embedCounts = new Map<string, number>();

  /**
   * Gets the embed count for a file. Only counts valid (resolving to a real
   * file) embeds to prevent triggering extraction on invalid embeds while the
   * user is typing.
   */
  function getEmbedCount(filePath: string) {
    const cache = plugin.app.metadataCache.getCache(filePath);
    return (cache?.embeds ?? []).filter((e) => {
      const path = resolveEmbedPath(plugin.app.metadataCache, e.link, filePath);
      if (!path) return false;
      const file = plugin.app.vault.getFileByPath(path);
      return file && !isObsidianNative(file);
    }).length;
  }

  plugin.registerEvent(
    plugin.app.workspace.on("file-open", (file) => {
      if (!file || !isMarkdown(file) || embedCounts.has(file.path)) return;
      embedCounts.set(file.path, getEmbedCount(file.path));
    }),
  );

  plugin.registerEvent(
    plugin.app.vault.on("rename", (file, oldPath) => {
      const count = embedCounts.get(oldPath);
      if (count === undefined) return;
      embedCounts.set(file.path, count);
      embedCounts.delete(oldPath);
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("deleted", (file) => {
      embedCounts.delete(file.path);
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("changed", (file) => {
      if (!isMarkdown(file)) return;

      const prevCount = embedCounts.get(file.path);

      // Ignore if note has never been opened
      if (prevCount === undefined) return;

      const newCount = getEmbedCount(file.path);
      embedCounts.set(file.path, newCount);

      // Check only at the last minute to ensure we keep tracking (but not
      // extracting) even if the setting is off
      if (!plugin.settings.autoExtractAttachments) return;

      if (newCount > prevCount) {
        if (!plugin.extractor.canProcessSingleFile()) {
          showNotice(t("notices.autoExtractSkippedWhileBusy"));
          return;
        }
        plugin.extractor.processSingleFile(file);
      }
    }),
  );
}

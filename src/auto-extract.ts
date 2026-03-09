import OcrExtractorPlugin from "../main";
import { showNotice } from "./utils/notice";
import { isMarkdown, resolveEmbedPath } from "./utils/file";
import { t } from "./i18n";

export function registerAutoExtractEvents(plugin: OcrExtractorPlugin) {
  /**
   * Map of note paths to number of valid embeds in that file. Set when note
   * opened, deleted when note deleted, and updated when note changed (if the
   * count increases, auto-extract if configured).
   */
  const embedCounts = new Map<string, number>();

  /**
   * Gets the embed count for a file. Only counts valid (resolving to a real
   * file) embeds to prevent triggering extraction on invalid embeds while the
   * user is typing.
   */
  function getEmbedCount(filePath: string) {
    const cache = plugin.app.metadataCache.getCache(filePath);
    return (cache?.embeds ?? []).filter(
      (e) =>
        resolveEmbedPath(plugin.app.metadataCache, e.link, filePath) !==
        undefined,
    ).length;
  }

  plugin.registerEvent(
    plugin.app.workspace.on("file-open", (file) => {
      if (!file || !isMarkdown(file) || embedCounts.has(file.path)) return;
      embedCounts.set(file.path, getEmbedCount(file.path));
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("deleted", (file) => {
      embedCounts.delete(file.path);
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("changed", (file) => {
      if (!plugin.settings.autoExtractAttachments || !isMarkdown(file)) return;

      const prevCount = embedCounts.get(file.path);
      const newCount = getEmbedCount(file.path);
      embedCounts.set(file.path, newCount);

      // If file changed without an open event, add to embed map but don't extract
      if (prevCount === undefined) return;

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

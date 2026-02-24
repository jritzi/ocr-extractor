import OcrExtractorPlugin from "../main";
import { showNotice } from "./utils/notice";
import { t } from "./i18n";

export function registerEvents(plugin: OcrExtractorPlugin) {
  /**
   * Map of note path to number of embeds in that note (for notes that have
   * been opened)
   */
  const embedCounts = new Map<string, number>();

  plugin.registerEvent(
    plugin.app.workspace.on("file-open", (file) => {
      if (!file || embedCounts.has(file.path)) return;

      const cache = plugin.app.metadataCache.getCache(file.path);
      embedCounts.set(file.path, cache?.embeds?.length ?? 0);
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("deleted", (file) => {
      embedCounts.delete(file.path);
    }),
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on("changed", (file, _data, cache) => {
      if (!plugin.settings.autoExtractAttachments) return;

      const newCount = cache.embeds?.length ?? 0;
      const prevCount = embedCounts.get(file.path);
      if (prevCount === undefined) {
        showNotice(t("notices.autoExtractSkipped"));
        return;
      }
      embedCounts.set(file.path, newCount);

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

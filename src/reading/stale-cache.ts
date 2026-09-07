import { App, Plugin, TAbstractFile, TFile } from "obsidian";
import { isMarkdown } from "../utils/file";
import { logWarning } from "../utils/logging";

// Matches Obsidian's "indexing taking a long time" message
const CACHE_UPDATE_TIMEOUT_MS = 10_000;

/**
 * Notes the vault has reported as written but the metadata cache hasn't
 * indexed yet (it reads and parses the file asynchronously)
 */
export class StaleCache {
  private readonly files = new WeakSet<TFile>();
  private readonly app: App;

  constructor(plugin: Plugin) {
    this.app = plugin.app;
    const { vault, metadataCache, workspace } = plugin.app;

    // Register after layout is ready, since the vault triggers
    // "create" for every existing file during startup
    // https://docs.obsidian.md/Reference/TypeScript+API/Vault/on('create')
    workspace.onLayoutReady(() => {
      plugin.registerEvent(vault.on("create", (file) => this.markStale(file)));
      plugin.registerEvent(vault.on("modify", (file) => this.markStale(file)));
      plugin.registerEvent(
        metadataCache.on("changed", (file) => this.files.delete(file)),
      );
      plugin.registerEvent(
        metadataCache.on("deleted", (file) => this.files.delete(file)),
      );
    });
  }

  has(file: TFile) {
    return this.files.has(file);
  }

  waitForIndexing(file: TFile, signal: AbortSignal) {
    return new Promise<void>((resolve) => {
      let timeoutId: number;

      const finish = () => {
        this.app.metadataCache.offref(changedRef);
        this.app.metadataCache.offref(deletedRef);
        window.clearTimeout(timeoutId);
        signal.removeEventListener("abort", finish);
        resolve();
      };

      const changedRef = this.app.metadataCache.on("changed", (changedFile) => {
        if (changedFile === file) finish();
      });
      const deletedRef = this.app.metadataCache.on("deleted", (deletedFile) => {
        if (deletedFile === file) finish();
      });

      timeoutId = window.setTimeout(() => {
        logWarning(
          `Metadata cache did not update for ${file.path}, reading as is`,
        );
        this.files.delete(file);
        finish();
      }, CACHE_UPDATE_TIMEOUT_MS);

      signal.addEventListener("abort", finish);
      if (signal.aborted) finish();
    });
  }

  private markStale(file: TAbstractFile) {
    // The metadata cache only triggers "changed" for Markdown files
    if (file instanceof TFile && isMarkdown(file)) {
      this.files.add(file);
    }
  }
}

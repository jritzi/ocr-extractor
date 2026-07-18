import { App, debounce, EventRef, TFile } from "obsidian";
import { attemptInsert } from "./write";
import { EmbedsToMarkdown } from "./plan";
import { debugLog } from "../utils/logging";

const SETTLE_TIMEOUT_MS = 60_000;
const EDITOR_CHANGE_DEBOUNCE_MS = 2_000;

export type InsertResult =
  | { status: "done"; skippedResults: string[] }
  | { status: "timeout" }
  | { status: "canceled" };

/**
 * Insert the extracted text into the note. If the note is being actively
 * edited, retry until it settles.
 */
export function insertWhenSettled(
  app: App,
  file: TFile,
  embedsToMarkdown: EmbedsToMarkdown,
  signal: AbortSignal,
): Promise<InsertResult> {
  return new SettleController(app, file, embedsToMarkdown, signal).run();
}

class SettleController {
  private finished = false;
  private attemptInFlight = false;
  private attemptQueued = false;

  // Initialized in run()
  private resolve!: (result: InsertResult) => void;
  private reject!: (error: unknown) => void;
  private changedRef!: EventRef;
  private editorChangeRef!: EventRef;
  private settleTimeoutId!: number;

  private readonly abortListener = this.handleAbort.bind(this);

  private readonly debouncedAttempt = debounce(
    () => void this.attempt(),
    EDITOR_CHANGE_DEBOUNCE_MS,
    true,
  );

  constructor(
    private app: App,
    private file: TFile,
    private embedsToMarkdown: EmbedsToMarkdown,
    private signal: AbortSignal,
  ) {}

  run() {
    const done = new Promise<InsertResult>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    this.signal.addEventListener("abort", this.abortListener);

    // Retry when the cache updates after a file write
    this.changedRef = this.app.metadataCache.on("changed", (changedFile) => {
      if (changedFile.path === this.file.path) {
        void this.attempt();
      }
    });

    // Retry on editor-change, to cover cases without a file write (e.g. a
    // change plus immediate undo back to the original state)
    this.editorChangeRef = this.app.workspace.on(
      "editor-change",
      (_editor, info) => {
        if (info.file?.path === this.file.path) {
          this.debouncedAttempt();
        }
      },
    );

    // Give up if the note never settles, either because no retry fires (e.g.
    // it's deleted mid-run) or there are constant edits without pause
    this.settleTimeoutId = window.setTimeout(
      () => this.finish({ status: "timeout" }),
      SETTLE_TIMEOUT_MS,
    );

    // Initial attempt
    void this.attempt().then(() => {
      if (!this.finished) {
        debugLog(`Inserting into ${this.file.path} deferred until settled`);
      }
    });

    return done;
  }

  private handleAbort() {
    this.finish({ status: "canceled" });
  }

  private async attempt() {
    if (this.finished) return;

    // Don't run two attempts at once to avoid duplicate inserts, but queue a
    // retry so one triggered mid-attempt isn't lost
    if (this.attemptInFlight) {
      this.attemptQueued = true;
      return;
    }

    this.attemptInFlight = true;
    try {
      const attemptResult = await attemptInsert(
        this.app,
        this.file,
        this.embedsToMarkdown,
        this.signal,
      );
      if (this.signal.aborted) {
        this.finish({ status: "canceled" });
      } else if (attemptResult.done) {
        this.finish({
          status: "done",
          skippedResults: attemptResult.skippedResults,
        });
      }
    } catch (error) {
      // Fail fast (e.g. if the note was deleted mid-run) instead of leaving an
      // unhandled rejection and waiting for the settle timeout
      this.fail(error);
    } finally {
      this.attemptInFlight = false;
    }

    if (this.attemptQueued) {
      this.attemptQueued = false;
      await this.attempt();
    }
  }

  private finish(result: InsertResult) {
    if (this.finished) return;
    this.finished = true;
    this.cleanup();
    this.resolve(result);
  }

  private fail(error: unknown) {
    if (this.finished) return;
    this.finished = true;
    this.cleanup();
    this.reject(error);
  }

  private cleanup() {
    this.app.metadataCache.offref(this.changedRef);
    this.app.workspace.offref(this.editorChangeRef);
    this.debouncedAttempt.cancel();
    this.signal.removeEventListener("abort", this.abortListener);
    window.clearTimeout(this.settleTimeoutId);
  }
}

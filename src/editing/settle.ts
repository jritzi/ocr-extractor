import { App, debounce, Debouncer, EventRef, TFile } from "obsidian";
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
  private settled = false;
  private attemptInFlight = false;

  // Initialized in run()
  private resolve!: (result: InsertResult) => void;
  private changedRef!: EventRef;
  private editorChangeRef!: EventRef;
  private debouncedAttempt!: Debouncer<[], void>;
  private timeoutId!: number;

  private readonly abortListener = this.handleAbort.bind(this);

  constructor(
    private app: App,
    private file: TFile,
    private embedsToMarkdown: EmbedsToMarkdown,
    private signal: AbortSignal,
  ) {}

  run() {
    const done = new Promise<InsertResult>((resolve) => {
      this.resolve = resolve;
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
    this.debouncedAttempt = debounce(
      () => void this.attempt(),
      EDITOR_CHANGE_DEBOUNCE_MS,
      true,
    );
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
    this.timeoutId = window.setTimeout(
      () => this.finish({ status: "timeout" }),
      SETTLE_TIMEOUT_MS,
    );

    // Initial attempt
    void this.attempt().then(() => {
      if (!this.settled) {
        debugLog(`Inserting into ${this.file.path} deferred until settled`);
      }
    });

    return done;
  }

  private handleAbort() {
    this.finish({ status: "canceled" });
  }

  private async attempt() {
    // Don't attempt again if already running to avoid duplicate inserts
    if (this.attemptInFlight || this.settled) return;

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
    } finally {
      this.attemptInFlight = false;
    }
  }

  private finish(result: InsertResult) {
    if (this.settled) return;
    this.settled = true;
    this.cleanup();
    this.resolve(result);
  }

  private cleanup() {
    this.app.metadataCache.offref(this.changedRef);
    this.app.workspace.offref(this.editorChangeRef);
    this.debouncedAttempt.cancel();
    this.signal.removeEventListener("abort", this.abortListener);
    window.clearTimeout(this.timeoutId);
  }
}

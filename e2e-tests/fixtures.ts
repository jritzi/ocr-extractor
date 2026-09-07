import {
  _electron as electron,
  ElectronApplication,
  expect,
  Page,
  test as base,
} from "@playwright/test";
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { StoredSettings } from "../src/settings";
import {
  E2E,
  getCachedElectronVersion,
  getElectronExecutable,
  getObsidianCacheDir,
} from "./setup/utils";
import {
  copyTestVault,
  createUserData,
  injectHttpInterceptor,
  setupPlugin,
} from "./setup/vault";
import { expectNoUnexpectedRequests } from "./helpers/http";
import { closeSettings } from "./helpers/plugin";
import { LATEST_VERSION } from "./versions";

export const MOCK_OCR_OUTPUT = "Mock extracted text";

export const MOCK_OCR_COMMANDS = {
  fast: `node "${join(E2E, "mock-ocr", "fast.mjs")}" {input} {output}`,
  error: `node "${join(E2E, "mock-ocr", "error.mjs")}" {input} {output}`,
  gated: `node "${join(E2E, "mock-ocr", "gated.mjs")}" {input} {output}`,
};

// Minimal typing for the Electron app object inside Playwright's evaluate context
interface ElectronApp {
  removeAsDefaultProtocolClient: (protocol: string) => boolean;
}

function truncate(text: string) {
  return text.length > 500 ? `${text.slice(0, 500)}... (truncated)` : text;
}

/** Let in-flight MOCK_OCR_COMMANDS.gated runs finish */
function writeGatedOcrRelease(releasePath: string) {
  writeFileSync(releasePath, "");
}

export interface ObsidianFixtures {
  obsidianVersion: string;
  electronVersion: string | undefined;
  mockOcrOutput: string;
  settings: StoredSettings;
  gatedOcrReleaseFile: string;
  releaseGatedOcr: () => void;
  electronApp: ElectronApplication;
  page: Page;
}

export const test = base.extend<ObsidianFixtures>({
  obsidianVersion: [LATEST_VERSION.obsidian, { option: true }],
  electronVersion: [undefined, { option: true }],
  mockOcrOutput: [MOCK_OCR_OUTPUT, { option: true }],
  settings: [{}, { option: true }],

  // eslint-disable-next-line no-empty-pattern -- Required by Playwright
  gatedOcrReleaseFile: async ({}, use) => {
    const path = join(tmpdir(), `gated-ocr-release-${randomUUID()}`);
    await use(path);
    rmSync(path, { force: true });
  },

  releaseGatedOcr: async ({ gatedOcrReleaseFile }, use) => {
    await use(() => writeGatedOcrRelease(gatedOcrReleaseFile));
  },

  electronApp: async (
    {
      obsidianVersion,
      electronVersion,
      mockOcrOutput,
      settings,
      gatedOcrReleaseFile,
    },
    use,
  ) => {
    const tmpBase = mkdtempSync(join(tmpdir(), "obsidian-e2e-"));
    const tmpVault = join(tmpBase, "vault");
    const tmpUserData = join(tmpBase, "user-data");

    let app: ElectronApplication | undefined;
    try {
      copyTestVault(tmpVault);
      createUserData(tmpUserData, tmpVault);
      setupPlugin(tmpVault, {
        ocrEngine: "customCommand",
        customCommand: MOCK_OCR_COMMANDS.fast,
        ...settings,
      });

      app = await electron.launch({
        executablePath: getElectronExecutable(
          electronVersion ?? getCachedElectronVersion(obsidianVersion),
        ),
        args: [
          join(getObsidianCacheDir(obsidianVersion), "main.js"),
          `--user-data-dir=${tmpUserData}`,
          "--no-sandbox",
          "--use-mock-keychain",
        ],
        env: {
          ...process.env,
          MOCK_OCR_OUTPUT: mockOcrOutput,
          MOCK_OCR_RELEASE_FILE: gatedOcrReleaseFile,
        },
      });

      // Stop E2E Electron from stealing obsidian:// handlers from the real app
      await app.evaluate(({ app: electronApp }) => {
        (electronApp as ElectronApp).removeAsDefaultProtocolClient("obsidian");
      });

      await use(app);
    } finally {
      writeGatedOcrRelease(gatedOcrReleaseFile);

      if (app) {
        const pid = app.process().pid;
        const timedOut = await Promise.race([
          app
            .close()
            .then(() => false)
            .catch(() => false),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(true), 5000),
          ),
        ]);
        // If graceful shutdown timed out, force kill the process group to
        // clean up any child processes (e.g. a slow OCR command) that are
        // blocking teardown
        if (timedOut && pid) {
          try {
            if (process.platform === "win32") {
              execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
                stdio: "ignore",
              });
            } else {
              // Negative PID to kill the process group
              process.kill(-pid, "SIGKILL");
            }
          } catch {
            // Process already exited
          }
        }
      }
      // Remove tmp directory, retrying if the app is still flushing files
      rmSync(tmpBase, { recursive: true, force: true, maxRetries: 5 });
    }
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    let hasConsoleErrors = false;

    // Closing with unsaved editor changes triggers a native beforeunload
    // dialog, accept it to avoid conflicting with teardown's app.close()
    page.on("dialog", (dialog) => void dialog.accept().catch(() => {}));

    page.on("console", (message) => {
      if (message.type() === "error") {
        hasConsoleErrors = true;
        console.error(truncate(message.text()));
      }
    });
    page.on("pageerror", (error) => {
      hasConsoleErrors = true;
      console.error(truncate(error.stack ?? error.message));
    });

    // Always shown when opening a fresh vault with community plugins
    await page
      .getByRole("button", { name: "Trust author and enable plugins" })
      .click();
    await closeSettings(page);

    await injectHttpInterceptor(page);
    await use(page);

    await expectNoUnexpectedRequests(page);
    expect(hasConsoleErrors, "Unexpected console errors (see above)").toBe(
      false,
    );
  },
});

export { expect };

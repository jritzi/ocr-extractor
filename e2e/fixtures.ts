import {
  _electron as electron,
  ElectronApplication,
  expect,
  Page,
  test as base,
} from "@playwright/test";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { PluginSettings } from "../src/settings";
import { E2E, EXTRACTED } from "./setup/utils";
import {
  copyTestVault,
  createUserData,
  injectHttpInterceptor,
  setupPlugin,
} from "./setup/vault";
import { expectNoUnexpectedRequests } from "./helpers/http";
import { closeModal } from "./helpers/obsidian";

export const MOCK_OCR_OUTPUT = "Mock extracted text";

export const MOCK_OCR_COMMANDS = {
  fast: `node "${join(E2E, "mock-ocr", "fast.js")}" {input} {output}`,
  slow: `node "${join(E2E, "mock-ocr", "slow.js")}" {input} {output}`,
  error: `node "${join(E2E, "mock-ocr", "error.js")}" {input} {output}`,
};

// Obsidian app extracted during globalSetup (run via the local electron binary
// because Obsidian's bundled electron has the Node inspector disabled,
// preventing Playwright from connecting)
const OBSIDIAN_EXTRACTED = join(EXTRACTED, "main.js");

interface ObsidianFixtures {
  mockOcrOutput: string;
  settings: Partial<PluginSettings>;
  electronApp: ElectronApplication;
  page: Page;
}

export const test = base.extend<ObsidianFixtures>({
  mockOcrOutput: [MOCK_OCR_OUTPUT, { option: true }],
  settings: [{}, { option: true }],

  electronApp: async ({ mockOcrOutput, settings }, use) => {
    const tmpBase = mkdtempSync(join(tmpdir(), "obsidian-e2e-"));
    const tmpVault = join(tmpBase, "vault");
    const tmpUserData = join(tmpBase, "user-data");

    let app: ElectronApplication | undefined;
    try {
      copyTestVault(tmpVault);
      createUserData(tmpUserData, tmpVault);
      setupPlugin(tmpVault, {
        ocrService: "customCommand",
        customCommand: MOCK_OCR_COMMANDS.fast,
        ...settings,
      });

      app = await electron.launch({
        args: [
          OBSIDIAN_EXTRACTED,
          `--user-data-dir=${tmpUserData}`,
          "--no-sandbox",
        ],
        env: { ...process.env, MOCK_OCR_OUTPUT: mockOcrOutput },
      });

      await use(app);
    } finally {
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
      rmSync(tmpBase, { recursive: true, force: true });
    }
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();

    // Always shown when opening a fresh vault with community plugins
    await page
      .getByRole("button", { name: "Trust author and enable plugins" })
      .click();

    // Close "Community plugins" settings
    await closeModal(page);

    await injectHttpInterceptor(page);

    await use(page);

    await expectNoUnexpectedRequests(page);
  },
});

export { expect };

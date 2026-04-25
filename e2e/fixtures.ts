import {
  _electron as electron,
  ElectronApplication,
  expect,
  Page,
  test as base,
} from "@playwright/test";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { PluginSettings } from "../src/settings";
import { E2E, EXTRACTED, ROOT } from "./setup/utils";
import { closeModal } from "./helpers";

const TEST_VAULT = join(E2E, "test-vault");

export const MOCK_OCR_OUTPUT = "Mock extracted text";

export const MOCK_OCR_COMMANDS = {
  fast: `"${join(E2E, "mock-ocr", "fast.sh")}" {input} {output}`,
  slow: `"${join(E2E, "mock-ocr", "slow.sh")}" {input} {output}`,
  error: `"${join(E2E, "mock-ocr", "error.sh")}" {input} {output}`,
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
      installPlugin(tmpVault, settings);
      createUserData(tmpUserData, tmpVault);

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
            // Negative PID to kill the process group
            process.kill(-pid, "SIGKILL");
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

    // Ensure all network requests are explicitly mocked
    await page.route(/^https?:\/\//, (route) => {
      throw new Error(`Unexpected network request: ${route.request().url()}`);
    });

    await use(page);
  },
});

export { expect };

function copyTestVault(tmpVault: string) {
  mkdirSync(tmpVault, { recursive: true });
  cpSync(TEST_VAULT, tmpVault, { recursive: true });
}

function installPlugin(tmpVault: string, settings: Partial<PluginSettings>) {
  const pluginDir = join(tmpVault, ".obsidian", "plugins", "ocr-extractor");
  mkdirSync(pluginDir, { recursive: true });
  copyFileSync(join(ROOT, "main.js"), join(pluginDir, "main.js"));
  copyFileSync(join(ROOT, "manifest.json"), join(pluginDir, "manifest.json"));
  writeFileSync(
    join(pluginDir, "data.json"),
    JSON.stringify(
      {
        ocrService: "customCommand",
        customCommand: MOCK_OCR_COMMANDS.fast,
        ...settings,
      },
      null,
      2,
    ),
  );
}

function createUserData(tmpUserData: string, tmpVault: string) {
  const vaultId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  mkdirSync(tmpUserData, { recursive: true });
  writeFileSync(
    join(tmpUserData, "obsidian.json"),
    JSON.stringify({
      vaults: { [vaultId]: { path: tmpVault, ts: Date.now(), open: true } },
    }),
  );
}

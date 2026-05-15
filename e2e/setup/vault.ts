import {
  copyFileSync,
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import type { Page } from "@playwright/test";
import type { StoredSettings } from "../../src/settings";
import { E2E, ROOT } from "./utils";

const TEST_VAULT = join(E2E, "test-vault");

export function copyTestVault(tmpVault: string) {
  mkdirSync(tmpVault, { recursive: true });
  cpSync(TEST_VAULT, tmpVault, { recursive: true });
}

export function createUserData(tmpUserData: string, tmpVault: string) {
  const vaultId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  mkdirSync(tmpUserData, { recursive: true });
  writeFileSync(
    join(tmpUserData, "obsidian.json"),
    JSON.stringify({
      vaults: { [vaultId]: { path: tmpVault, ts: Date.now(), open: true } },
    }),
  );
}

export function setupPlugin(tmpVault: string, settings: StoredSettings) {
  const pluginDir = join(tmpVault, ".obsidian", "plugins", "ocr-extractor");
  mkdirSync(pluginDir, { recursive: true });
  copyFileSync(join(ROOT, "main.js"), join(pluginDir, "main.js"));
  copyFileSync(join(ROOT, "manifest.json"), join(pluginDir, "manifest.json"));
  writeFileSync(
    join(pluginDir, "data.json"),
    JSON.stringify(settings, null, 2),
  );
}

export async function injectHttpInterceptor(page: Page) {
  const code = readFileSync(join(E2E, "setup", "http-interceptor.js"), "utf-8");
  await page.evaluate(code);
}

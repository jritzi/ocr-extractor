import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { setupLinux } from "./setup/linux";
import { setupMac } from "./setup/mac";
import { EXTRACTED, ROOT } from "./setup/utils";

// The pinned Obsidian release to test against
const OBSIDIAN_VERSION = "1.12.7";

const VERSION_FILE = join(EXTRACTED, ".obsidian-version");

export default function globalSetup() {
  ensurePluginBuilt();

  if (isUpToDate()) return;

  console.log(`Setting up Obsidian ${OBSIDIAN_VERSION}...`);

  switch (process.platform) {
    case "darwin":
      setupMac(OBSIDIAN_VERSION);
      break;
    case "linux":
      setupLinux(OBSIDIAN_VERSION);
      break;
    default:
      // When adding Windows support, ensure the electronApp fixture
      // cleanup logic is updated
      throw new Error(`${process.platform} not supported for E2E tests`);
  }

  writeFileSync(VERSION_FILE, OBSIDIAN_VERSION);
}

function ensurePluginBuilt() {
  const missing = ["main.js", "manifest.json"].filter(
    (file) => !existsSync(join(ROOT, file)),
  );

  if (missing.length > 0) {
    console.log("Building plugin...");
    execFileSync("pnpm", ["build"], { stdio: "inherit", cwd: ROOT });
  }
}

function isUpToDate() {
  if (!existsSync(VERSION_FILE)) return false;
  return readFileSync(VERSION_FILE, "utf-8").trim() === OBSIDIAN_VERSION;
}

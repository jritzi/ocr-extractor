import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import esbuild from "esbuild";
import { setupLinux } from "./setup/linux";
import { setupMac } from "./setup/mac";
import {
  E2E,
  EXTRACTED,
  getInstalledElectronVersion,
  ROOT,
} from "./setup/utils";

// The pinned Obsidian release to test against
const OBSIDIAN_VERSION = "1.12.7";

const VERSION_FILE = join(EXTRACTED, ".obsidian-version");

export default async function globalSetup() {
  ensurePluginBuilt();
  await bundleHttpInterceptor();

  if (!needsSetup()) return;

  console.log(`Setting up Obsidian ${OBSIDIAN_VERSION}...`);

  switch (process.platform) {
    case "darwin":
      await setupMac(OBSIDIAN_VERSION);
      break;
    case "linux":
      await setupLinux(OBSIDIAN_VERSION);
      break;
    default:
      // When adding Windows support, ensure the electronApp fixture
      // cleanup logic is updated
      throw new Error(`${process.platform} not supported for E2E tests`);
  }

  writeFileSync(VERSION_FILE, versionFileContent());
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

async function bundleHttpInterceptor() {
  await esbuild.build({
    entryPoints: [join(E2E, "setup", "http-interceptor.ts")],
    outfile: join(E2E, "setup", "http-interceptor.js"),
    bundle: true,
    platform: "browser",
  });
}

function versionFileContent() {
  return `Obsidian: ${OBSIDIAN_VERSION}\nElectron: ${getInstalledElectronVersion()}`;
}

function needsSetup() {
  if (!existsSync(VERSION_FILE)) return true;
  return readFileSync(VERSION_FILE, "utf-8").trim() !== versionFileContent();
}

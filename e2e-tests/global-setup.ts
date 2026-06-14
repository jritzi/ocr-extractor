import { execFileSync } from "child_process";
import { existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import esbuild from "esbuild";
import { downloadLinuxObsidian } from "./setup/linux";
import { downloadMacObsidian } from "./setup/mac";
import { downloadWindowsObsidian } from "./setup/windows";
import {
  CACHE,
  getCachedElectronVersion,
  downloadElectron,
  E2E,
  getElectronVersionFile,
  ROOT,
} from "./setup/utils";
import { versions } from "./versions";

export default async function globalSetup() {
  ensurePluginBuilt();
  await bundleHttpInterceptor();

  for (const { obsidian, electron } of versions) {
    downloadDependencies(obsidian, electron);
  }

  pruneStaleCache();
}

function ensurePluginBuilt() {
  const missing = ["main.js", "manifest.json"].filter(
    (file) => !existsSync(join(ROOT, file)),
  );

  if (missing.length > 0) {
    console.log("Building plugin...");
    execFileSync(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["build"],
      {
        stdio: "inherit",
        cwd: ROOT,
      },
    );
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

function downloadDependencies(
  obsidianVersion: string,
  electronOverride: string | undefined,
) {
  const electronVersionFile = getElectronVersionFile(obsidianVersion);

  if (!existsSync(electronVersionFile)) {
    downloadObsidian(obsidianVersion);
  }

  downloadElectron(
    electronOverride ?? getCachedElectronVersion(obsidianVersion),
  );
}

function downloadObsidian(version: string) {
  switch (process.platform) {
    case "darwin":
      downloadMacObsidian(version);
      break;
    case "linux":
      downloadLinuxObsidian(version);
      break;
    case "win32":
      downloadWindowsObsidian(version);
      break;
    default:
      throw new Error(`${process.platform} not supported for E2E tests`);
  }
}

function pruneStaleCache() {
  const obsidianVersions = new Set(versions.map((version) => version.obsidian));

  const electronVersions = new Set<string>();
  for (const version of versions) {
    if (version.electron) {
      electronVersions.add(version.electron);
    } else {
      const electronVersionFile = getElectronVersionFile(version.obsidian);
      if (existsSync(electronVersionFile)) {
        electronVersions.add(getCachedElectronVersion(version.obsidian));
      }
    }
  }

  const obsidianCacheDir = join(CACHE, "obsidian");
  if (existsSync(obsidianCacheDir)) {
    for (const entry of readdirSync(obsidianCacheDir)) {
      if (!obsidianVersions.has(entry)) {
        console.log(`Removing stale Obsidian cache: ${entry}`);
        rmSync(join(obsidianCacheDir, entry), { recursive: true, force: true });
      }
    }
  }

  const electronCacheDir = join(CACHE, "electron");
  if (existsSync(electronCacheDir)) {
    for (const entry of readdirSync(electronCacheDir)) {
      if (!electronVersions.has(entry)) {
        console.log(`Removing stale Electron cache: ${entry}`);
        rmSync(join(electronCacheDir, entry), { recursive: true, force: true });
      }
    }
  }
}

import { extractAll } from "@electron/asar";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";

export const ROOT = join(__dirname, "../..");
export const E2E = join(ROOT, "e2e");
export const CACHE = join(E2E, "cache");
const arch = process.arch === "arm64" ? "arm64" : "x64";

export function getObsidianDownloadUrl(version: string, filename: string) {
  return `https://github.com/obsidianmd/obsidian-releases/releases/download/v${version}/${filename}`;
}

export function getElectronDownloadUrl(electronVersion: string) {
  const filename = `electron-v${electronVersion}-${process.platform}-${arch}.zip`;
  return `https://github.com/electron/electron/releases/download/v${electronVersion}/${filename}`;
}

export function getObsidianCacheDir(obsidianVersion: string) {
  return join(CACHE, "obsidian", obsidianVersion);
}

export function getElectronCacheDir(electronVersion: string) {
  return join(
    CACHE,
    "electron",
    electronVersion,
    `${process.platform}-${arch}`,
  );
}

export function getElectronVersionFile(obsidianVersion: string) {
  return join(getObsidianCacheDir(obsidianVersion), ".electron-version");
}

export function getElectronExecutable(electronVersion: string) {
  const cacheDir = getElectronCacheDir(electronVersion);

  switch (process.platform) {
    case "darwin":
      return join(cacheDir, "Electron.app", "Contents", "MacOS", "Electron");
    case "win32":
      return join(cacheDir, "electron.exe");
    default:
      return join(cacheDir, "electron");
  }
}

export function extractObsidianApp(sourceDir: string, obsidianVersion: string) {
  const cacheDir = getObsidianCacheDir(obsidianVersion);
  mkdirSync(cacheDir, { recursive: true });

  extractAll(join(sourceDir, "app.asar"), cacheDir);

  copyFileSync(
    join(sourceDir, "obsidian.asar"),
    join(cacheDir, "obsidian.asar"),
  );

  cpSync(
    join(sourceDir, "app.asar.unpacked"),
    join(cacheDir, "app.asar.unpacked"),
    { recursive: true },
  );
}

export function downloadElectron(electronVersion: string) {
  const cacheDir = getElectronCacheDir(electronVersion);
  const executable = getElectronExecutable(electronVersion);

  if (existsSync(executable)) return;

  const filename = `electron-v${electronVersion}-${process.platform}-${arch}.zip`;
  const tmpDir = mkdtempSync(join(tmpdir(), "electron-download-"));
  const zipFile = join(tmpDir, filename);

  try {
    console.log(`Downloading Electron ${electronVersion}...`);
    execFileSync(
      "curl",
      ["-fL", "-o", zipFile, getElectronDownloadUrl(electronVersion)],
      { stdio: "inherit" },
    );

    console.log("Extracting Electron...");
    mkdirSync(cacheDir, { recursive: true });

    if (process.platform === "win32") {
      execFileSync("7z.exe", ["x", zipFile, `-o${cacheDir}`, "-y"], {
        stdio: "inherit",
      });
    } else {
      execFileSync("unzip", ["-q", zipFile, "-d", cacheDir], {
        stdio: "inherit",
      });
      chmodSync(executable, 0o755);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function getBundledElectronVersion(binary: string) {
  return execFileSync(binary, ["--version"])
    .toString()
    .trim()
    .replace(/^v/, "");
}

export function getCachedElectronVersion(obsidianVersion: string) {
  return readFileSync(getElectronVersionFile(obsidianVersion), "utf-8").trim();
}

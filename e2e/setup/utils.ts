import { execFileSync } from "child_process";
import { extractAll } from "@electron/asar";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";

export const ROOT = join(__dirname, "../..");
export const E2E = join(ROOT, "e2e");
export const EXTRACTED = join(E2E, "obsidian-extracted");

export function getDownloadUrl(version: string, filename: string) {
  return `https://github.com/obsidianmd/obsidian-releases/releases/download/v${version}/${filename}`;
}

export function prepareAsars(sourceDir: string) {
  if (existsSync(EXTRACTED)) {
    rmSync(EXTRACTED, { recursive: true });
  }
  mkdirSync(EXTRACTED, { recursive: true });

  console.log("Extracting app.asar...");
  extractAll(join(sourceDir, "app.asar"), EXTRACTED);

  console.log("Copying obsidian.asar...");
  copyFileSync(
    join(sourceDir, "obsidian.asar"),
    join(EXTRACTED, "obsidian.asar"),
  );
}

export function verifyElectronVersion(obsidianBinary: string) {
  const bundledVersion = getBundledElectronVersion(obsidianBinary);
  const installedVersion = getInstalledElectronVersion();

  if (bundledVersion !== installedVersion) {
    console.error(
      `Electron version mismatch: Obsidian bundles Electron ${bundledVersion} but the installed version is ${installedVersion}. Update the electron devDependency to ${bundledVersion}.`,
    );
    process.exit(1);
  }
}

function getBundledElectronVersion(obsidianBinary: string) {
  const line = execFileSync(
    "sh",
    ["-c", `strings "${obsidianBinary}" | grep -m1 "^Electron v"`],
    { encoding: "utf-8" },
  ).trim();
  const match = line.match(/^Electron v(.+)$/);
  if (!match) throw new Error("Could not determine bundled Electron version.");
  return match[1];
}

function getInstalledElectronVersion() {
  const pkg = JSON.parse(
    readFileSync(
      join(ROOT, "node_modules", "electron", "package.json"),
      "utf-8",
    ),
  ) as { version: string };
  return pkg.version;
}

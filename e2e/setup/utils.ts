import { extractAll } from "@electron/asar";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "fs";
import { join } from "path";

export const ROOT = join(__dirname, "../..");
export const E2E = join(ROOT, "e2e");
export const EXTRACTED = join(E2E, "obsidian-extracted");

export function getDownloadUrl(version: string, filename: string) {
  return `https://github.com/obsidianmd/obsidian-releases/releases/download/v${version}/${filename}`;
}

export function prepareAsars(sourceDir: string) {
  if (existsSync(EXTRACTED)) {
    rmSync(EXTRACTED, { recursive: true, force: true });
  }
  mkdirSync(EXTRACTED, { recursive: true });

  console.log("Extracting app.asar...");
  extractAll(join(sourceDir, "app.asar"), EXTRACTED);

  console.log("Copying obsidian.asar...");
  copyFileSync(
    join(sourceDir, "obsidian.asar"),
    join(EXTRACTED, "obsidian.asar"),
  );

  cpSync(
    join(sourceDir, "app.asar.unpacked"),
    join(EXTRACTED, "app.asar.unpacked"),
    { recursive: true },
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
  const content = readFileSync(obsidianBinary, "latin1");
  const match = content.match(/Electron\/([\d.]+)/);
  if (!match) {
    throw new Error("Could not determine bundled Electron version.");
  }
  return match[1];
}

export function getInstalledElectronVersion() {
  const pkg = JSON.parse(
    readFileSync(
      join(ROOT, "node_modules", "electron", "package.json"),
      "utf-8",
    ),
  ) as { version: string };
  return pkg.version;
}

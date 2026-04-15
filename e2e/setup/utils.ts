import { spawn } from "child_process";
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

export async function verifyElectronVersion(obsidianBinary: string) {
  const bundledVersion = await getBundledElectronVersion(obsidianBinary);
  const installedVersion = getInstalledElectronVersion();

  if (bundledVersion !== installedVersion) {
    console.error(
      `Electron version mismatch: Obsidian bundles Electron ${bundledVersion} but the installed version is ${installedVersion}. Update the electron devDependency to ${bundledVersion}.`,
    );
    process.exit(1);
  }
}

async function getBundledElectronVersion(obsidianBinary: string) {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn("strings", [obsidianBinary]);
    let buffer = "";
    let resolved = false;

    proc.stdout.on("data", (chunk: Buffer) => {
      if (resolved) return;
      buffer += chunk.toString();
      const match = buffer.match(/^Electron v(.+)$/m);
      if (match) {
        resolved = true;
        proc.kill();
        resolve(match[1]);
      }
    });

    proc.on("close", () => {
      if (!resolved) {
        reject(new Error("Could not determine bundled Electron version."));
      }
    });

    proc.on("error", reject);
  });
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

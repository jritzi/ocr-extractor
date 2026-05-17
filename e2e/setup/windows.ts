import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  getBundledElectronVersion,
  getElectronVersionFile,
  getObsidianDownloadUrl,
  extractObsidianApp,
} from "./utils";

export function downloadWindowsObsidian(obsidianVersion: string) {
  const exeFilename = `Obsidian-${obsidianVersion}.exe`;
  const tmpDir = mkdtempSync(join(tmpdir(), "obsidian-setup-"));
  const tmpExe = join(tmpDir, exeFilename);
  const tmpArchive = join(tmpDir, "$PLUGINSDIR", "app-64.7z");
  const resourcesDir = join(tmpDir, "resources");

  try {
    console.log(`Downloading ${exeFilename}...`);
    execFileSync(
      "curl",
      [
        "-fL",
        "-o",
        tmpExe,
        getObsidianDownloadUrl(obsidianVersion, exeFilename),
      ],
      { stdio: "inherit" },
    );

    console.log("Extracting installer archive...");
    execFileSync(
      "7z.exe",
      ["x", tmpExe, `$PLUGINSDIR\\app-64.7z`, `-o${tmpDir}`, "-y"],
      { stdio: "inherit" },
    );

    console.log("Extracting resources...");
    execFileSync(
      "7z.exe",
      [
        "x",
        tmpArchive,
        `resources\\app.asar`,
        `resources\\app.asar.unpacked`,
        `resources\\obsidian.asar`,
        `Obsidian.exe`,
        `-o${tmpDir}`,
        "-y",
      ],
      { stdio: "inherit" },
    );

    extractObsidianApp(resourcesDir, obsidianVersion);
    writeFileSync(
      getElectronVersionFile(obsidianVersion),
      getBundledElectronVersion(join(tmpDir, "Obsidian.exe")),
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

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

export function downloadLinuxObsidian(obsidianVersion: string) {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const tarRoot = `obsidian-${obsidianVersion}`;
  const tarFilename =
    arch === "arm64" ? `${tarRoot}-arm64.tar.gz` : `${tarRoot}.tar.gz`;

  const tmpDir = mkdtempSync(join(tmpdir(), "obsidian-setup-"));

  try {
    console.log(`Downloading ${tarFilename}...`);
    const tarFile = join(tmpDir, tarFilename);
    execFileSync(
      "curl",
      [
        "-fL",
        "-o",
        tarFile,
        getObsidianDownloadUrl(obsidianVersion, tarFilename),
      ],
      { stdio: "inherit" },
    );

    console.log("Extracting...");
    const extractedDir = join(tmpDir, tarRoot);
    execFileSync(
      "tar",
      [
        "xz",
        "-C",
        tmpDir,
        "-f",
        tarFile,
        `${tarRoot}/resources/app.asar`,
        `${tarRoot}/resources/app.asar.unpacked`,
        `${tarRoot}/resources/obsidian.asar`,
        `${tarRoot}/obsidian`,
      ],
      { stdio: "inherit" },
    );

    extractObsidianApp(join(extractedDir, "resources"), obsidianVersion);
    writeFileSync(
      getElectronVersionFile(obsidianVersion),
      getBundledElectronVersion(join(extractedDir, "obsidian")),
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getDownloadUrl, prepareAsars, verifyElectronVersion } from "./utils";

export async function setupLinux(obsidianVersion: string) {
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
      ["-fL", "-o", tarFile, getDownloadUrl(obsidianVersion, tarFilename)],
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

    prepareAsars(join(extractedDir, "resources"));
    await verifyElectronVersion(join(extractedDir, "obsidian"));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

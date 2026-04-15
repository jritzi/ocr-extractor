import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { prepareAsars, getDownloadUrl, verifyElectronVersion } from "./utils";

export function setupLinux(obsidianVersion: string) {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const tarFilename =
    arch === "arm64"
      ? `obsidian-${obsidianVersion}-arm64.tar.gz`
      : `obsidian-${obsidianVersion}.tar.gz`;

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
    execFileSync(
      "tar",
      [
        "xz",
        "--strip-components=2",
        "-C",
        tmpDir,
        "-f",
        tarFile,
        `obsidian-${obsidianVersion}/resources/app.asar`,
        `obsidian-${obsidianVersion}/resources/obsidian.asar`,
        `obsidian-${obsidianVersion}/obsidian`,
      ],
      { stdio: "inherit" },
    );

    prepareAsars(tmpDir);
    verifyElectronVersion(join(tmpDir, "obsidian"));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

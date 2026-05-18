import { execFileSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  getBundledElectronVersion,
  getElectronVersionFile,
  getObsidianDownloadUrl,
  getObsidianCacheDir,
  extractObsidianApp,
} from "./utils";

export function downloadMacObsidian(obsidianVersion: string) {
  const dmgFilename = `Obsidian-${obsidianVersion}.dmg`;
  const tmpDir = mkdtempSync(join(tmpdir(), "obsidian-setup-"));
  const tmpDmg = join(tmpDir, dmgFilename);
  const mountPoint = join(tmpDir, "mount");

  try {
    console.log(`Downloading ${dmgFilename}...`);
    execFileSync(
      "curl",
      [
        "-fL",
        "-o",
        tmpDmg,
        getObsidianDownloadUrl(obsidianVersion, dmgFilename),
      ],
      { stdio: "inherit" },
    );

    console.log("Mounting DMG...");
    mkdirSync(mountPoint, { recursive: true });
    execFileSync("hdiutil", [
      "attach",
      "-quiet",
      "-nobrowse",
      "-mountpoint",
      mountPoint,
      tmpDmg,
    ]);

    try {
      const resources = join(
        mountPoint,
        "Obsidian.app",
        "Contents",
        "Resources",
      );
      console.log("Extracting Obsidian...");
      extractObsidianApp(resources, obsidianVersion);
      execFileSync("xattr", ["-cr", getObsidianCacheDir(obsidianVersion)], {
        stdio: "inherit",
      });

      const electronBinary = join(
        mountPoint,
        "Obsidian.app",
        "Contents",
        "Frameworks",
        "Electron Framework.framework",
        "Versions",
        "A",
        "Electron Framework",
      );
      writeFileSync(
        getElectronVersionFile(obsidianVersion),
        getBundledElectronVersion(electronBinary),
      );
    } finally {
      execFileSync("hdiutil", ["detach", mountPoint, "-quiet"]);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

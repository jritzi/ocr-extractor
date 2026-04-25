import { execFileSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  prepareAsars,
  getDownloadUrl,
  verifyElectronVersion,
  EXTRACTED,
} from "./utils";

export async function setupMac(obsidianVersion: string) {
  const dmgFilename = `Obsidian-${obsidianVersion}.dmg`;
  const tmpDir = mkdtempSync(join(tmpdir(), "obsidian-setup-"));
  const tmpDmg = join(tmpDir, dmgFilename);
  const mountPoint = join(tmpDir, "mount");

  try {
    console.log(`Downloading ${dmgFilename}...`);
    execFileSync(
      "curl",
      ["-fL", "-o", tmpDmg, getDownloadUrl(obsidianVersion, dmgFilename)],
      { stdio: "inherit" },
    );

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
      prepareAsars(resources);
      execFileSync("xattr", ["-cr", EXTRACTED]);

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
      await verifyElectronVersion(electronBinary);
    } finally {
      execFileSync("hdiutil", ["detach", mountPoint, "-quiet"]);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

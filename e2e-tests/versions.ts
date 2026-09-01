import manifest from "../manifest.json";
import { MIN_ELECTRON_VERSION } from "../src/min-electron-version";

interface E2EVersions {
  name: string;
  obsidian: string;

  /** Electron version to use instead of the one bundled with Obsidian */
  electron?: string;
}

export const LATEST_VERSION = { name: "latest", obsidian: "1.13.7" };

export const versions: E2EVersions[] = [
  LATEST_VERSION,
  { name: "min-app-version", obsidian: manifest.minAppVersion },
  {
    name: "min-electron-version",
    obsidian: LATEST_VERSION.obsidian,
    electron: MIN_ELECTRON_VERSION,
  },
  {
    name: "old-installer",
    obsidian: LATEST_VERSION.obsidian,
    electron: "28.2.3",
  },
];

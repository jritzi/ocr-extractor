interface E2EVersions {
  name: string;
  obsidian: string;

  /** Electron version to use instead of the one bundled with Obsidian */
  electron?: string;
}

// Run `pnpm latest-obsidian` to find the current latest version
export const LATEST_VERSION = { name: "latest", obsidian: "1.12.7" };

export const versions: E2EVersions[] = [
  LATEST_VERSION,
  { name: "min-app-version", obsidian: "1.11.4" },
  { name: "min-electron-version", obsidian: "1.12.7", electron: "37.0.0" },
  { name: "old-installer", obsidian: "1.12.7", electron: "28.2.3" },
];

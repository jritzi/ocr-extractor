import { coerce, lt, valid } from "semver";

export const MIN_ELECTRON_VERSION = "37.0.0";

export function isElectronBelowMinimum(currentVersion: string) {
  const current = valid(coerce(currentVersion));
  return current !== null && lt(current, MIN_ELECTRON_VERSION);
}

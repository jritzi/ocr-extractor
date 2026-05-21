import { describe, expect, it } from "vitest";
import { inc, major } from "semver";
import {
  isElectronBelowMinimum,
  MIN_ELECTRON_VERSION,
} from "./min-electron-version";

const oneBelow = `${major(MIN_ELECTRON_VERSION) - 1}.9.9`;
const oneAbove = inc(MIN_ELECTRON_VERSION, "patch")!;

describe("min-electron-version.ts", () => {
  describe("isElectronBelowMinimum", () => {
    it("returns true when version is below minimum", () => {
      expect(isElectronBelowMinimum(oneBelow)).toBe(true);
    });

    it("returns false when version equals minimum", () => {
      expect(isElectronBelowMinimum(MIN_ELECTRON_VERSION)).toBe(false);
    });

    it("returns false when version is above minimum", () => {
      expect(isElectronBelowMinimum(oneAbove)).toBe(false);
    });
  });
});

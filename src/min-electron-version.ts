import { coerce, lt, valid } from "semver";

// pdfjs-dist >=4.8.69 calls Uint8Array.prototype.toHex() unconditionally, which
// requires Chrome 140+ / Electron 38.0.0+
// https://github.com/mozilla/pdf.js/discussions/20770
// https://github.com/jritzi/ocr-extractor/issues/57
export const MIN_ELECTRON_VERSION = "38.0.0";

export function isElectronBelowMinimum(currentVersion: string) {
  const current = valid(coerce(currentVersion));
  return current !== null && lt(current, MIN_ELECTRON_VERSION);
}

declare global {
  interface Window {
    ocrExtractorDebugLoggingEnabled?: boolean;
  }
}

export function debugLog(message: string) {
  if (activeWindow.ocrExtractorDebugLoggingEnabled) {
    console.debug(message);
  }
}

export function warnSkipped(filename: string, reason: string) {
  console.warn(`Skipping ${filename}: ${reason}`);
}

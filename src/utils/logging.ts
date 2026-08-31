/**
 * Console messages are logged as `warn` for all expected cases that are handled
 * correctly (including every attachment skip/failure or stopped run). `error`
 * is only used for truly unexpected errors that likely indicate a bug in this
 * plugin.
 */

declare global {
  interface Window {
    ocrExtractorDebugLoggingEnabled?: boolean;
  }
}

const LOG_PREFIX = "[OCR Extractor]";

export function debugLog(message: string) {
  if (window.ocrExtractorDebugLoggingEnabled) {
    console.debug(`${LOG_PREFIX} ${message}`);
  }
}

export function warnSkipped(path: string, reason: string) {
  logWarning(`Skipping ${path}: ${reason}`);
}

export function warnFailed(path: string, reason: string) {
  logWarning(`Failed to extract text from ${path}: ${reason}`);
}

export function logWarning(message: string, cause?: unknown) {
  if (cause === undefined) {
    console.warn(`${LOG_PREFIX} ${message}`);
  } else {
    console.warn(`${LOG_PREFIX} ${message}`, cause);
  }
}

export function logError(message: string, error: unknown) {
  console.error(`${LOG_PREFIX} ${message}`, error);
}

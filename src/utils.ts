import { OcrExtractorError } from "../main";

declare global {
  interface Window {
    ocrExtractorDebugLoggingEnabled?: boolean;
  }
}

export function insertAtPosition(
  before: string,
  toInsert: string,
  position: number,
) {
  return before.slice(0, position) + toInsert + before.slice(position);
}

export async function withTimeout<T>(promise: Promise<T>, duration: number) {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new OcrExtractorError("Error: Timed out")),
      duration,
    ),
  );

  return Promise.race([promise, timeout]);
}

export function debugLog(message: string) {
  if (window.ocrExtractorDebugLoggingEnabled) {
    console.debug(message);
  }
}

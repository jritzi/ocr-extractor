import { Notice } from "obsidian";

declare global {
  interface Window {
    ocrExtractorDebugLoggingEnabled?: boolean;
  }
}

export class CancelError extends Error {}

export function insertAtPosition(
  before: string,
  toInsert: string,
  position: number,
) {
  return before.slice(0, position) + toInsert + before.slice(position);
}

/**
 * Split an array of tasks (functions returning a promise) into batches,
 * executing tasks within each batch in parallel
 */
export async function batchPromises<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((task) => task()));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Retry a task with exponential backoff starting at 1 second
 */
export async function withRetries<T>(task: () => Promise<T>, retryCount = 3) {
  let lastError: unknown;

  try {
    return await task();
  } catch (error) {
    lastError = error;
  }

  for (let i = 0; i < retryCount; i++) {
    const delay = 1_000 * Math.pow(2, i);
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      return await task();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

/**
 * Execute a promise, checking `shouldCancel` every second to see if it should
 * be interrupted. Returns the promise result, or `null` if canceled.
 */
export async function withCancellation<T>(
  promise: Promise<T>,
  shouldCancel: () => boolean,
): Promise<T | null> {
  let intervalId: number | undefined;
  let cancelResolve: ((value: null) => void) | undefined;

  const cancelPromise = new Promise<null>((resolve, reject) => {
    cancelResolve = resolve;
    intervalId = window.setInterval(() => {
      if (shouldCancel()) {
        reject(new CancelError());
      }
    }, 1_000);
  });

  try {
    return await Promise.race([promise, cancelPromise]);
  } catch (e: unknown) {
    if (e instanceof CancelError) {
      return null;
    } else {
      throw e;
    }
  } finally {
    clearInterval(intervalId);
    cancelResolve?.(null);
  }
}

export function debugLog(message: string) {
  if (window.ocrExtractorDebugLoggingEnabled) {
    console.debug(message);
  }
}

export function showErrorNotice(message: string) {
  new Notice(message).containerEl.addClass("mod-warning");
}

/**
 * Convert a Uint8Array to a base64 string (use instead of
 * Uint8Array.prototype.toBase64() for compatibility with older mobile devices)
 */
export function uint8ArrayToBase64(bytes: Uint8Array) {
  const CHUNK_SIZE = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    chunks.push(
      String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK_SIZE))),
    );
  }
  return btoa(chunks.join(""));
}

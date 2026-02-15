export class CancelError extends Error {}

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
 * Retry a task with exponential backoff starting at 1 second. Only retries if
 * shouldRetry returns true (defaults to retrying all errors).
 */
export async function withRetries<T>(
  task: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean = () => true,
  retryCount = 3,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (attempt > 0) {
      const delay = 1_000 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error)) {
        throw error;
      }
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
  let resolveCleanup: ((value: null) => void) | undefined;

  const cancelPromise = new Promise<null>((resolve, reject) => {
    resolveCleanup = resolve;
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
    resolveCleanup?.(null);
  }
}

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
 * Race a promise against an AbortSignal, returning null if the signal is
 * aborted first.
 */
export async function raceAbort<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) {
    // Avoid an unhandled rejection if the abandoned task fails (below, this is
    // taken care of by `Promise.race()`)
    void promise.catch(() => {});
    return null;
  }

  let onAbort!: () => void;
  const cancelPromise = new Promise<null>((resolve) => {
    onAbort = () => resolve(null);
    signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    return await Promise.race([promise, cancelPromise]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

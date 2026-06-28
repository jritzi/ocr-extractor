/**
 * Identifies which kind of {@link OcrError} occurred.
 *
 * - `"unsupported-file"`: the OCR engine can't process this file type
 * - `"extraction-failed"`: any other failure during extraction (network,
 *   auth, etc.)
 *
 * @since 1.0.0
 */
export type OcrErrorCode = "unsupported-file" | "extraction-failed";

/**
 * The error thrown by {@link OcrExtractorApi.extractText} when extraction
 * fails. Identify it with {@link isOcrError} (not `instanceof`, which won't
 * work across the plugin and npm package boundary). The original error,
 * if any, is included as `cause`.
 *
 * @since 1.0.0
 */
export interface OcrError extends Error {
  readonly code: OcrErrorCode;
}

/**
 * Checks whether a caught value is an {@link OcrError}.
 *
 * @param error - The caught error to check
 * @returns `true` if `error` is an {@link OcrError}, `false` otherwise
 * @since 1.0.0
 * @example
 * ```ts
 * try {
 *   await api.extractText(file);
 * } catch (error) {
 *   if (isOcrError(error) && error.code === "unsupported-file") return;
 *   throw error;
 * }
 * ```
 */
export function isOcrError(error: unknown): error is OcrError {
  return (
    error instanceof Error &&
    error.name === "OcrError" &&
    typeof (error as Partial<OcrError>).code === "string"
  );
}

/**
 * Used by the plugin to construct an {@link OcrError} with the given code and
 * message.
 *
 * @param code - Which kind of error this is
 * @param message - A human-readable message
 * @param options - Optional settings
 * @param options.cause - The underlying error, if any
 * @returns The new {@link OcrError}
 * @since 1.0.0
 */
export function ocrError(
  code: OcrErrorCode,
  message?: string,
  options?: { cause?: unknown },
): OcrError {
  const error = new Error(message ?? code, options);
  return Object.assign(error, { name: "OcrError", code });
}

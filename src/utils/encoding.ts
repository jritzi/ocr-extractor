// Small enough to pass as arguments without overflowing the call stack
const CHUNK_SIZE = 0x8000;

/**
 * Convert a Uint8Array to a base64 string (use instead of
 * Uint8Array.prototype.toBase64() for compatibility with older devices).
 */
export function uint8ArrayToBase64(bytes: Uint8Array) {
  // Process in chunks to keep memory use down on large files
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE)),
    );
  }
  return btoa(chunks.join(""));
}

export function toDataUrl(data: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${uint8ArrayToBase64(data)}`;
}

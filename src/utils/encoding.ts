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

export function toDataUrl(data: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${uint8ArrayToBase64(data)}`;
}

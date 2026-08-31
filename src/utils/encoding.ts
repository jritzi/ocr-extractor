/**
 * Convert a Uint8Array to a base64 string (use instead of
 * Uint8Array.prototype.toBase64() for compatibility with older mobile devices)
 */
export function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function toDataUrl(data: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${uint8ArrayToBase64(data)}`;
}

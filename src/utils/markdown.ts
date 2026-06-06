const OPENING_FENCE = /^`{3,}\s*(markdown|md|text|txt|plaintext)?\s*$/i;
const CLOSING_FENCE = /^`{3,}\s*$/;
const ANY_FENCE = /^`{3,}/;

/**
 * Some models wrap their entire response in a code fence (e.g. ```markdown ...
 * ```) when asked to return Markdown. Strip a single fence only when it wraps
 * the whole response, leaving genuine code blocks inside the document intact.
 */
export function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const lines = trimmed.split("\n");
  if (lines.length < 2) return text;

  const firstLine = lines[0].trim();
  const lastLine = lines[lines.length - 1].trim();
  if (!OPENING_FENCE.test(firstLine) || !CLOSING_FENCE.test(lastLine)) {
    return text;
  }

  // A fence delimiter between the first and last lines means the opening fence
  // closes early, so it isn't a clean wrapper around the whole response.
  const innerLines = lines.slice(1, -1);
  if (innerLines.some((line) => ANY_FENCE.test(line.trim()))) {
    return text;
  }

  return innerLines.join("\n");
}

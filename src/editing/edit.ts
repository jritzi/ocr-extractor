import { assert } from "../utils/assert";

export interface PlannedEdit {
  from: number;
  to: number;
  replacement: string;

  /** Text expected at `[from, to)`, to validate before replacing */
  expectedText: string;
}

/**
 * Apply a plan's edits to a string in descending offset order, so earlier
 * offsets stay valid as later ones are applied.
 */
export function applyEditPlanToString(content: string, edits: PlannedEdit[]) {
  const ascending = [...edits].sort((a, b) => a.from - b.from);
  assertEditsSortedAndDisjoint(ascending);

  const descending = ascending.reverse();
  let newContent = content;

  for (const edit of descending) {
    assert(
      newContent.slice(edit.from, edit.to) === edit.expectedText,
      "Built from this content and applied in reverse, so text must match",
    );
    newContent =
      newContent.slice(0, edit.from) +
      edit.replacement +
      newContent.slice(edit.to);
  }

  return newContent;
}

/**
 * Shrink an edit to the smallest part that actually changes by trimming the
 * prefix and suffix shared by its expected and replacement text (so an editor
 * transaction leaves the surrounding text untouched). Only apply it to content
 * already confirmed to match the edit plan.
 */
export function toMinimalChange(edit: PlannedEdit) {
  const { expectedText, replacement } = edit;
  const maxTrim = Math.min(expectedText.length, replacement.length);

  let prefixLength = 0;
  while (
    prefixLength < maxTrim &&
    expectedText[prefixLength] === replacement[prefixLength]
  ) {
    prefixLength++;
  }

  let suffixLength = 0;
  while (
    suffixLength < maxTrim - prefixLength &&
    expectedText[expectedText.length - 1 - suffixLength] ===
      replacement[replacement.length - 1 - suffixLength]
  ) {
    suffixLength++;
  }

  return {
    from: edit.from + prefixLength,
    to: edit.to - suffixLength,
    text: replacement.slice(prefixLength, replacement.length - suffixLength),
  };
}

/**
 * Assert edits are sorted ascending by offset and don't overlap (required to
 * apply edits safely)
 */
export function assertEditsSortedAndDisjoint(edits: PlannedEdit[]) {
  for (let index = 1; index < edits.length; index++) {
    assert(
      edits[index - 1].to <= edits[index].from,
      "Plan edits must be sorted and not overlap",
    );
  }
}

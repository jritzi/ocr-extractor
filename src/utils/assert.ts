/**
 * Assert that a condition is true, narrowing the type accordingly in
 * the following lines. Takes a message which should explain why the
 * condition will always be true in this case.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

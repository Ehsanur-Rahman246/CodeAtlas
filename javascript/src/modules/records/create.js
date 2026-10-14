// Create operation. No prompts, no printing.

/**
 * Adds a record, filling in createdAt when the input has none.
 * @param {ReturnType<import('../../model/store.js').createStore>} store
 * @param {unknown} input raw record fields
 * @param {() => Date} [now] injectable clock, so tests are deterministic
 * @throws {ValidationError | DuplicateIdError}
 */
export function createRecord(store, input, now = () => new Date()) {
  const isObject =
    input !== null && typeof input === "object" && !Array.isArray(input);

  // `??` only fills in null/undefined, so a supplied createdAt is kept as-is.
  // Anything that is not an object goes straight to validation for a proper message.
  const filled = isObject
    ? { ...input, createdAt: input.createdAt ?? now().toISOString() }
    : input;

  return store.add(filled);
}

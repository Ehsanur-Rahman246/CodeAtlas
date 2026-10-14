// Suggests the next record id: highest existing "rec-<number>" plus one.
// Pure function: it only looks at the ids it is given.

/**
 * @param {Iterable<string>} existingIds
 * @param {string} [prefix]
 * @param {number} [width] minimum digits, zero-padded
 */
export function nextId(existingIds, prefix = "rec-", width = 3) {
  let max = 0;
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) continue; // ignore ids from other schemas
    const digits = id.slice(prefix.length);
    // Only pure digit suffixes count: "rec-7" does, "rec-7a" does not.
    if (/^\d+$/.test(digits)) max = Math.max(max, Number(digits));
  }
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

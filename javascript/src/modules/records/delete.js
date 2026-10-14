// Delete operation. Confirmation is a CLI concern and lives in index.js.

/**
 * @returns the removed record
 * @throws {NotFoundError}
 */
export function deleteRecord(store, id) {
  return store.remove(id);
}

// Update operation. A thin layer over the store, so the records module exposes
// one consistent set of functions (create/get/list/update/delete) to callers.

/**
 * @throws {NotFoundError | ValidationError} the store is unchanged on failure
 */
export function updateRecord(store, id, changes) {
  return store.update(id, changes);
}

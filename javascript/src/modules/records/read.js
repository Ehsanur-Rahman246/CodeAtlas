// ---------------------------------------------------------------------------
// Read operations: view, list/sort, search, filter. No prompts, no printing.
//
// Decisions:
// - getRecordById throws NotFoundError when missing (store.get returns undefined).
// - search: case-insensitive substring on name or any tag; blank query is an error.
// - filter: category equals (case-insensitive); value range inclusive; AND logic.
// - sort: text is compared case-insensitively; ties always break by id ascending,
//   even for descending order. No sortBy keeps insertion order.
// ---------------------------------------------------------------------------

import { NotFoundError, ValidationError } from "../../lib/errors.js";

export const SORT_FIELDS = Object.freeze([
  "id",
  "name",
  "category",
  "value",
  "createdAt",
]);

export function getRecordById(store, id) {
  const record = store.get(id);
  if (record === undefined) throw new NotFoundError(id);
  return record;
}

// Returns -1, 0 or 1 for any two values of the same type.
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Text is lowercased for comparison; numbers are used as they are.
// (createdAt is ISO text in UTC, so alphabetical order is also time order.)
const sortKey = (record, field) => {
  const value = record[field];
  return typeof value === "string" ? value.toLowerCase() : value;
};

/**
 * @param {{sortBy?: string, direction?: 'asc' | 'desc'}} [options]
 * @returns {object[]} a new array; the store's order is never changed
 */
export function listRecords(store, { sortBy, direction = "asc" } = {}) {
  const records = store.list();
  if (sortBy === undefined) return records;

  const issues = [];
  if (!SORT_FIELDS.includes(sortBy)) {
    issues.push(`sort field must be one of: ${SORT_FIELDS.join(", ")}`);
  }
  if (direction !== "asc" && direction !== "desc") {
    issues.push('direction must be "asc" or "desc"');
  }
  if (issues.length > 0) throw new ValidationError(issues);

  const sign = direction === "asc" ? 1 : -1;
  // toSorted() returns a sorted copy (Node 20+). When the primary comparison is a
  // tie, sign * 0 is falsy, so `||` falls through to the id tie-break.
  return records.toSorted(
    (a, b) =>
      sign * compare(sortKey(a, sortBy), sortKey(b, sortBy)) ||
      compare(a.id, b.id),
  );
}

export function searchRecords(store, query) {
  const needle = typeof query === "string" ? query.trim().toLowerCase() : "";
  if (needle === "")
    throw new ValidationError(["search text must not be empty"]);

  return store
    .list()
    .filter(
      (record) =>
        record.name.toLowerCase().includes(needle) ||
        record.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
}

/**
 * @param {{category?: string, minValue?: number, maxValue?: number}} [criteria]
 *        omitted fields are not applied
 */
export function filterRecords(store, { category, minValue, maxValue } = {}) {
  const issues = [];
  if (
    category !== undefined &&
    (typeof category !== "string" || category.trim() === "")
  ) {
    issues.push("category must be a non-empty string");
  }
  if (minValue !== undefined && !Number.isFinite(minValue)) {
    issues.push("minValue must be a finite number");
  }
  if (maxValue !== undefined && !Number.isFinite(maxValue)) {
    issues.push("maxValue must be a finite number");
  }
  if (
    issues.length === 0 &&
    minValue !== undefined &&
    maxValue !== undefined &&
    minValue > maxValue
  ) {
    issues.push("minValue must not be greater than maxValue");
  }
  if (issues.length > 0) throw new ValidationError(issues);

  const wanted = category?.trim().toLowerCase(); // optional chaining: undefined stays undefined

  return store
    .list()
    .filter(
      (record) =>
        (wanted === undefined || record.category.toLowerCase() === wanted) &&
        (minValue === undefined || record.value >= minValue) &&
        (maxValue === undefined || record.value <= maxValue),
    );
}

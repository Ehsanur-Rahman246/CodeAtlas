// ---------------------------------------------------------------------------
// In-memory record store
//
// - add(input)          validates, rejects duplicate ids, returns the record
// - get(id)             returns the record, or undefined when missing
// - has(id)             true / false
// - list()              NEW array of all records, in insertion order
// - count()             number of records
// - update(id, changes) merges changes, re-validates, returns the new record
// - remove(id)          deletes and returns the removed record
// - clear()             deletes everything
//
// Missing ids: get returns undefined; update and remove throw NotFoundError.
// Duplicate ids: add throws DuplicateIdError.
// Records are frozen (see record.js), so returning references is safe.
// Every failed operation leaves the store unchanged.
// This module never prompts or prints; the CLI layer does that.
// ---------------------------------------------------------------------------

import { normalizeRecord } from './record.js';
import { DuplicateIdError, NotFoundError, ValidationError } from '../lib/errors.js';

/**
 * Creates an independent store.
 * @param {unknown[]} [initialRecords] raw records to load; throws on the first bad one.
 */
export function createStore(initialRecords = []) {
    // `records` lives in this closure: only the functions below can reach it.
    // Map keeps insertion order and gives fast lookup by key.
    const records = new Map();

    function add(input) {
        // Normalize FIRST so the id we check is the cleaned one (e.g. trimmed).
        const record = normalizeRecord(input);
        if (records.has(record.id)) {
            throw new DuplicateIdError(record.id);
        }
        records.set(record.id, record);
        return record;
    }

    // Map#get already returns undefined for unknown keys, including non-strings.
    function get(id) {
        return records.get(id);
    }

    function has(id) {
        return records.has(id);
    }

    // Spreading the iterator makes a fresh array, so callers can sort or empty
    // their copy without touching the store.
    function list() {
        return [...records.values()];
    }

    function count() {
        return records.size;
    }

    function update(id, changes) {
        const existing = records.get(id);
        if (existing === undefined) {
            throw new NotFoundError(id);
        }
        if (changes === null || typeof changes !== 'object' || Array.isArray(changes)) {
            throw new ValidationError(['changes must be an object']);
        }
        // Ids are the identity of a record, so they can't be edited.
        if(changes.id !== undefined && changes.id !== existing.id) {
            throw new ValidationError(['id cannot be chnaged']);
        }

        // Merge old fields with the changes, then run the full validation again.
        // If this throws, the store has not been touched yet.
        const updated = normalizeRecord({ ...existing, ...changes });

        // Setting an existing key replaces the value but keeps its porition.
        records.set(id, updated);
        return updated;
    }

    function remove(id) {
        const existing = records.get(id);
        if (existing === undefined) {
            throw new NotFoundError(id);
        }
        records.delete(id);
        return existing;
    }

    function clear() {
        records.clear();
    }

    // Seed the store. Duplicates or invalid rows throw, and since the caller
    // never recieves the half-built store, nothing partial leaks out.
    for (const input of initialRecords) {
        add(input);
    }

    // Freeze the API object so nobody can swap out a method by accident.
    return Object.freeze({ add, get, has, list, count, update, remove, clear });
}
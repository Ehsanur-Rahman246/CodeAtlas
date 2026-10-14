// ---------------------------------------------------------------------------
// Record contract
//
// id         string, trimmed, non-empty, case-sensitive
// name       string, trimmed, non-empty
// category   string, trimmed, non-empty
// value      finite number (zero and negatives allowed; "12" is rejected)
// tags       array of strings; each trimmed, blanks removed, duplicates removed
//            (first occurrence wins, order kept); empty array is valid
// createdAt  ISO 8601 date-time string with a time zone (Z or +hh:mm);
//            normalized to UTC "YYYY-MM-DDTHH:mm:ss.sssZ"
//
// Extra fields are dropped. The input object is never modified.
// ---------------------------------------------------------------------------

import { ValidationError } from "../lib/errors.js";

// Date-time with a zone, e.g. 2026-01-15T10:30:00Z or ...00.000+06:00.
// Capture groups 1-3 are year, month, day (used for the calender check below).
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

// True for {} style objects; false for null, arrays and primitives.
// `typeof null` is "object", so null needs its own check.
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Shared by id, name and category.
// On failure it records an issue and returns undefined.
function cleanString(value, field, issues) {
  if (typeof value !== "string") {
    issues.push(`${field} must be a string`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    issues.push(`${field} must not be empty`);
    return undefined;
  }
  return trimmed;
}

function cleanValue(value, issues) {
  // Number.isFinite does NOT coerce, so "12", null and undefined all fail,
  // as do NaN, Infinity and -Infinity. The global isFinite("12") would say true.
  if (!Number.isFinite(value)) {
    issues.push("value must be a finite number");
    return undefined;
  }
  return value;
}

function cleanTags(value, issues) {
  if (!Array.isArray(value)) {
    issues.push("tags must be an array of strings");
    return undefined;
  }
  if (!value.every((tag) => typeof tag === "string")) {
    issues.push("tags must contain only strings");
    return undefined;
  }
  const cleaned = value.map((tag) => tag.trim()).filter((tag) => tag !== "");
  // A Set keeps only the first copy of each tag and remembers insertion order.
  // Freezing the new array stops callers from changing it later.
  return Object.freeze([...new Set(cleaned)]);
}

function cleanDate(value, issues) {
  const text = typeof value === "string" ? value.trim() : "";
  const match = ISO_DATE_TIME.exec(text);
  if (!match) {
    issues.push("createdAt must be an ISO 8601 date-time with a time zone");
    return undefined;
  }

  // Date silently rolls impossible days over (Feb 30 becomes Mar 2), so check
  // that teh calender date survives a round trip before trusting the parser.
  const [year, month, day] = match.slice(1, 4).map(Number);
  const calender = new Date(Date.UTC(year, month - 1, day));
  const parsed = new Date(text);
  if (
    calender.getUTCMonth() !== month - 1 ||
    calender.getUTCDate() !== day ||
    Number.isNaN(parsed.getTime()) // catches things like hour 25
  ) {
    issues.push("createdAt is not a real calender date-time");
    return undefined;
  }

  // Always store the same UTC form, whatever zone the input used.
  return parsed.toISOString();
}

/**
 * Validates and normalizes one record.
 * @param {unknown} input Any value; usually a parsed  JSON object.
 * @returns {ReadOnly<{id:string,name:string,category:string,value:number,
 *           tags:readonly string[],createdAt:string}>} a new frozen record.
 * @throws {ValidationError} listing every problem found.
 */
export function normalizeRecord(input) {
  if (!isPlainObject(input)) {
    throw new ValidationError(["record must be an object"]);
  }

  // Every helper adds to this same list instead of throwing, so one call
  // reports all problems at once.
  const issues = [];

  // Building a brand-new object (instead of editing `input`) is what
  // guarantees no mutation and drops any extra fields.
  const record = {
    id: cleanString(input.id, "id", issues),
    name: cleanString(input.name, "name", issues),
    category: cleanString(input.category, "category", issues),
    value: cleanValue(input.value, issues),
    tags: cleanTags(input.tags, issues),
    createdAt: cleanDate(input.createdAt, issues),
  };

  if (issues.length > 0) {
    throw new ValidationError(issues);
  }

  // Freeze is shallow: it locks the records's fields. Tags were frozen separately.
  return Object.freeze(record);
}

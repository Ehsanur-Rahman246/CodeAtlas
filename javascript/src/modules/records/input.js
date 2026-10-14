// Turns text typed at a prompt into record fields. Pure functions, no prompting.
// Only converts; the real validation still happens in normalizeRecord.

// Optional sign, then digits with an optional fraction, or just a fraction.
// This deliberately rejects "1e3", "0x10", "1,000", "" and "Infinity", which
// Number() alone would accept or mishandle (Number("") is 0!).
const DECIMAL_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

/** @returns {number} the number, or NaN so validation reports it */
export function parseValueText(text) {
  const trimmed = text.trim();
  return DECIMAL_NUMBER.test(trimmed) ? Number(trimmed) : NaN;
}

/** Blank means "not given" (undefined); anything else is parsed. */
export function parseOptionalValueText(text) {
  return text.trim() === "" ? undefined : parseValueText(text);
}

// split() leaves blanks and spaces; normalizeRecord trims, drops blanks and deduplicates.
export function parseTagsText(text) {
  return text.split(",");
}

/** Builds the raw input for createRecord. */
export function buildRecordInput({ id, name, category, valueText, tagsText }) {
  return {
    id,
    name,
    category,
    value: parseValueText(valueText),
    tags: parseTagsText(tagsText),
  };
}

/** Builds the changes for an update: blank fields are left out (= keep), "-" clears tags. */
export function buildChanges({ name, category, valueText, tagsText }) {
  const changes = {};
  if (name.trim() !== "") changes.name = name;
  if (category.trim() !== "") changes.category = category;
  if (valueText.trim() !== "") changes.value = parseValueText(valueText);

  const tags = tagsText.trim();
  if (tags === "-") changes.tags = [];
  else if (tags !== "") changes.tags = parseTagsText(tagsText);

  return changes;
}

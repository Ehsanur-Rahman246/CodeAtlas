// Display formatting only. Calculations elsewhere keep full precision.

// Built once and reused: creating an Intl formatter is comparatively expensive.
// A fixed locale ("en-US") keeps output identical on every machine.
const valueFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatValue(value) {
  // Adding 0 turns -0 into +0, so zero never prints as "-0.00".
  return valueFormatter.format(value + 0);
}

// Stored dates are ISO strings in UTC, so the first 10 characters are the date.
export function formatDate(iso) {
  return iso.slice(0, 10);
}

export function formatTags(tags) {
  return tags.length === 0 ? "-" : tags.join(", ");
}

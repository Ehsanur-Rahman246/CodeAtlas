import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { nextId } from "../../src/lib/ids.js";
import { formatDate, formatTags, formatValue } from "../../src/lib/format.js";

describe("nextId", () => {
  it("starts at rec-001", () => {
    assert.equal(nextId([]), "rec-001");
  });

  it("uses the highest number plus one, even with gaps", () => {
    assert.equal(nextId(["rec-001", "rec-007", "rec-003"]), "rec-008");
  });

  it("ignores ids that do not follow the scheme", () => {
    assert.equal(nextId(["abc", "rec-x", "rec-7a", "other-9"]), "rec-001");
  });

  it("grows past the padding width", () => {
    assert.equal(nextId(["rec-999"]), "rec-1000");
  });
});

describe("format helpers", () => {
  it("formats values with two decimals and separators", () => {
    assert.equal(formatValue(1234.5), "1,234.50");
    assert.equal(formatValue(0), "0.00");
    assert.equal(formatValue(0.1 + 0.2), "0.30");
    assert.equal(formatValue(-3.456), "-3.46");
  });

  it("never prints negative zero", () => {
    assert.equal(formatValue(-0), "0.00");
  });

  it("formats dates and tags", () => {
    assert.equal(formatDate("2026-01-15T10:30:00.000Z"), "2026-01-15");
    assert.equal(formatTags(["a", "b"]), "a, b");
    assert.equal(formatTags([]), "-");
  });
});

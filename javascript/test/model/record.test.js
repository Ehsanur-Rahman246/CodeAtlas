import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { normalizeRecord } from "../../src/model/record.js";
import { ValidationError } from "../../src/lib/errors.js";

// ES modules have no __dirname, so resolve fixtures relative to THIS file
// using import.meta.url. Top-level await is allowed in ES modules.
const loadFixture = async (name) =>
  JSON.parse(
    await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"),
  );

const validRecords = await loadFixture("valid-records.json");
const invalidRecords = await loadFixture("invalid-records.json");

// A reusable good record for tests that tweak one thing at a time.
const base = {
  id: "rec-100",
  name: "Sample",
  category: "Test",
  value: 10,
  tags: ["a"],
  createdAt: "2026-01-15T10:30:00.000Z",
};

// Helper: asserts the call throws a ValidationError and returns it for more checks.
function expectValidationError(fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(
      error instanceof ValidationError,
      `expected ValidationError, got ${error}`,
    );
    return error;
  }
  assert.fail("expected a ValidationError but nothing was thrown");
}

describe("normalizeRecord: value input", () => {
  it("returns the six contract fields", () => {
    assert.deepEqual(normalizeRecord(base), base);
  });

  it("trims strings and clean tags", () => {
    const record = normalizeRecord(validRecords[1]); // " Green Pear "
    assert.equal(record.name, "Green Pear");
    assert.equal(record.category, "Fruit");
    assert.deepEqual(record.tags, []);
  });

  it("removes blank and duplicate tags but keeps order", () => {
    const record = normalizeRecord(validRecords[2]);
    assert.deepEqual(record.tags, ["unicode", "hot"]);
  });

  it("keeps Unicode text intact", () => {
    assert.equal(normalizeRecord(validRecords[2]).name, "Épsilon Café");
  });

  it("accepts zero and negative values", () => {
    assert.equal(normalizeRecord({ ...base, value: 0 }).value, 0);
    assert.equal(normalizeRecord({ ...base, value: -3.5 }).value, -3.5);
  });

  it("normalizes dates to UTC with milliseconds", () => {
    assert.equal(
      normalizeRecord(validRecords[2]).createdAt,
      "2026-02-01T14:15:00.000Z",
    );
    // 09:00 at +06:00 is 03:00 UTC.
    assert.equal(
      normalizeRecord(validRecords[3]).createdAt,
      "2026-02-02T03:00:00.000Z",
    );
  });

  it("drops unknown fields", () => {
    const record = normalizeRecord({ ...base, extra: "ignored" });
    assert.equal("extra" in record, false);
  });

  it("is idempotent: normalizing twice gives the same result", () => {
    for (const input of validRecords) {
      const once = normalizeRecord(input);
      assert.deepEqual(normalizeRecord(once), once);
    }
  });
});

describe("normalizeRecord: immutability", () => {
  it("does not modify the input object", () => {
    const input = { ...base, name: " Padded ", tags: ['a', 'b', 'a'] };
    const snapshot = structuredClone(input); // deep copy to compare against
    normalizeRecord(input);
    assert.deepEqual(input, snapshot);
  });

  it("returns a new object with its own tags array", () => {
    const input = { ...base, tags: ["a"] };
    const output = normalizeRecord(input);
    assert.notEqual(output, input);
    assert.notEqual(output.tags, input.tags);
    input.tags.push("z"); // changing the input later must not affect the output
    assert.deepEqual(output.tags, ["a"]);
  });

  it("returns a frozen record", () => {
    const output = normalizeRecord(base);
    assert.ok(Object.isFrozen(output));
    assert.ok(Object.isFrozen(output.tags));
    // ES modules run in strict mode, so writing to a frozen object throws.
    assert.throws(() => {
      output.name = "changed";
    }, TypeError);
  });
});

describe("normalizeRecord: invalid values JSON cannot share", () => {
  // JSON has no NaN or Infinity, so these live in code instead of a fixture.
  for (const bad of [NaN, Infinity, -Infinity, undefined, true, {}, []]) {
    it(`rejects value ${String(bad)}`, () => {
      const error = expectValidationError(() =>
        normalizeRecord({ ...base, value: bad }),
      );
      assert.ok(error.issues.some((issue) => issue.startsWith("value")));
    });
  }
});

describe("normalizeRecord: whole-input problems", () => {
  for (const bad of [null, undefined, [], 42, "text", true]) {
    it(`rejects ${JSON.stringify(bad) ?? "undefined"} as a record`, () => {
      const error = expectValidationError(() => normalizeRecord(bad));
      assert.deepEqual(error.issues, ["record must be an object"]);
    });
  }

  it("reports every problem at once, not just the first", () => {
    const error = expectValidationError(() => normalizeRecord({}));
    assert.equal(error.issues.length, 6); // one per field
  });

  it("sets a useful error name and message", () => {
    const error = expectValidationError(() => normalizeRecord({}));
    assert.equal(error.name, "ValidationError");
    assert.match(error.message, /^Validation failed:/);
  });
});

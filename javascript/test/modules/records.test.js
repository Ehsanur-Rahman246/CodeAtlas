import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../../src/model/store.js";
import { createRecord } from "../../src/modules/records/create.js";
import {
  filterRecords,
  getRecordById,
  listRecords,
  searchRecords,
} from "../../src/modules/records/read.js";
import { updateRecord } from "../../src/modules/records/update.js";
import { deleteRecord } from "../../src/modules/records/delete.js";
import {
  buildChanges,
  buildRecordInput,
  parseOptionalValueText,
  parseTagsText,
  parseValueText,
} from "../../src/modules/records/input.js";
import {
  DuplicateIdError,
  NotFoundError,
  ValidationError,
} from "../../src/lib/errors.js";

// Small fixed dataset. Note the ties (r2 and r3 both have value 5) and mixed capitalization.
const rows = [
  {
    id: "r1",
    name: "Apple",
    category: "Fruit",
    value: 10,
    tags: ["red", "fresh"],
    createdAt: "2026-01-03T00:00:00Z",
  },
  {
    id: "r2",
    name: "banana",
    category: "fruit",
    value: 5,
    tags: ["yellow"],
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "r3",
    name: "Carrot",
    category: "Veg",
    value: 5,
    tags: ["orange", "fresh"],
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "r4",
    name: "Date",
    category: "Fruit",
    value: 20.5,
    tags: [],
    createdAt: "2026-01-04T00:00:00Z",
  },
];
const makeStore = () => createStore(rows);
const ids = (records) => records.map((r) => r.id);

describe("createRecord", () => {
  const input = { id: "n1", name: "New", category: "Test", value: 1, tags: [] };
  const clock = () => new Date("2030-06-01T12:00:00Z");

  it("fills createdAt from the injected clock", () => {
    const record = createRecord(createStore(), input, clock);
    assert.equal(record.createdAt, "2030-06-01T12:00:00.000Z");
  });

  it("keeps a createdAt that was supplied", () => {
    const record = createRecord(
      createStore(),
      { ...input, createdAt: "2026-01-01T00:00:00Z" },
      clock,
    );
    assert.equal(record.createdAt, "2026-01-01T00:00:00.000Z");
  });

  it("stores the record", () => {
    const store = createStore();
    createRecord(store, input, clock);
    assert.equal(store.count(), 1);
  });

  it("rejects invalid input", () => {
    assert.throws(
      () => createRecord(createStore(), { ...input, value: NaN }, clock),
      ValidationError,
    );
  });

  it("rejects non-object input with a validation error", () => {
    for (const bad of [null, undefined, [], "text", 5]) {
      assert.throws(
        () => createRecord(createStore(), bad, clock),
        ValidationError,
      );
    }
  });

  it("rejects a duplicate id", () => {
    const store = createStore();
    createRecord(store, input, clock);
    assert.throws(() => createRecord(store, input, clock), DuplicateIdError);
  });
});

describe("getRecordById", () => {
  it("returns an existing record", () => {
    assert.equal(getRecordById(makeStore(), "r1").name, "Apple");
  });

  it("throws NotFoundError for a missing id", () => {
    assert.throws(() => getRecordById(makeStore(), "nope"), {
      name: "NotFoundError",
      id: "nope",
    });
  });
});

describe("listRecords", () => {
  it("keeps insertion order by default", () => {
    assert.deepEqual(ids(listRecords(makeStore())), ["r1", "r2", "r3", "r4"]);
  });

  it("sorts by value ascending, breaking ties by id", () => {
    assert.deepEqual(ids(listRecords(makeStore(), { sortBy: "value" })), [
      "r2",
      "r3",
      "r1",
      "r4",
    ]);
  });

  it("sorts descending but still breaks ties by id ascending", () => {
    const result = listRecords(makeStore(), {
      sortBy: "value",
      direction: "desc",
    });
    assert.deepEqual(ids(result), ["r4", "r1", "r2", "r3"]);
  });

  it("compares text case-insensitively", () => {
    // "Apple" < "banana" < "Carrot" < "Date" when case is ignored
    assert.deepEqual(ids(listRecords(makeStore(), { sortBy: "name" })), [
      "r1",
      "r2",
      "r3",
      "r4",
    ]);
    assert.deepEqual(
      ids(listRecords(makeStore(), { sortBy: "name", direction: "desc" })),
      ["r4", "r3", "r2", "r1"],
    );
  });

  it("sorts by createdAt in time order", () => {
    assert.deepEqual(ids(listRecords(makeStore(), { sortBy: "createdAt" })), [
      "r2",
      "r3",
      "r1",
      "r4",
    ]);
  });

  it("does not change the order inside the store", () => {
    const store = makeStore();
    listRecords(store, { sortBy: "value", direction: "desc" });
    assert.deepEqual(ids(store.list()), ["r1", "r2", "r3", "r4"]);
  });

  it("rejects an unknown sort field and a bad direction", () => {
    assert.throws(
      () => listRecords(makeStore(), { sortBy: "colour" }),
      ValidationError,
    );
    assert.throws(
      () => listRecords(makeStore(), { sortBy: "name", direction: "up" }),
      ValidationError,
    );
  });
});

describe("searchRecords", () => {
  it("matches names case-insensitively", () => {
    assert.deepEqual(ids(searchRecords(makeStore(), "APP")), ["r1"]);
  });

  it("matches tags", () => {
    assert.deepEqual(ids(searchRecords(makeStore(), "fresh")), ["r1", "r3"]);
    assert.deepEqual(ids(searchRecords(makeStore(), "yel")), ["r2"]);
  });

  it("returns an empty array when nothing matches", () => {
    assert.deepEqual(searchRecords(makeStore(), "zzz"), []);
  });

  it("rejects blank or non-string queries", () => {
    for (const bad of ["", "   ", undefined, null, 5]) {
      assert.throws(() => searchRecords(makeStore(), bad), ValidationError);
    }
  });
});

describe("filterRecords", () => {
  it("returns everything when no criteria are given", () => {
    assert.equal(filterRecords(makeStore()).length, 4);
  });

  it("matches category exactly but ignores case", () => {
    assert.deepEqual(ids(filterRecords(makeStore(), { category: "FRUIT" })), [
      "r1",
      "r2",
      "r4",
    ]);
    assert.deepEqual(ids(filterRecords(makeStore(), { category: "fru" })), []);
  });

  it("treats the value range as inclusive", () => {
    assert.deepEqual(ids(filterRecords(makeStore(), { minValue: 10 })), [
      "r1",
      "r4",
    ]);
    assert.deepEqual(ids(filterRecords(makeStore(), { maxValue: 5 })), [
      "r2",
      "r3",
    ]);
    assert.deepEqual(
      ids(filterRecords(makeStore(), { minValue: 5, maxValue: 10 })),
      ["r1", "r2", "r3"],
    );
  });

  it("combines criteria with AND", () => {
    assert.deepEqual(
      ids(filterRecords(makeStore(), { category: "fruit", maxValue: 10 })),
      ["r1", "r2"],
    );
  });

  it("rejects invalid criteria", () => {
    assert.throws(
      () => filterRecords(makeStore(), { minValue: 10, maxValue: 5 }),
      ValidationError,
    );
    assert.throws(
      () => filterRecords(makeStore(), { minValue: NaN }),
      ValidationError,
    );
    assert.throws(
      () => filterRecords(makeStore(), { category: "  " }),
      ValidationError,
    );
  });
});

describe("updateRecord and deleteRecord", () => {
  it("updates a record", () => {
    const store = makeStore();
    assert.equal(updateRecord(store, "r1", { value: 99 }).value, 99);
    assert.equal(store.get("r1").value, 99);
  });

  it("reports a missing id on update and delete", () => {
    assert.throws(
      () => updateRecord(makeStore(), "nope", { value: 1 }),
      NotFoundError,
    );
    assert.throws(() => deleteRecord(makeStore(), "nope"), NotFoundError);
  });

  it("deletes and returns the record", () => {
    const store = makeStore();
    assert.equal(deleteRecord(store, "r1").id, "r1");
    assert.equal(store.count(), 3);
  });
});

describe("input parsing", () => {
  it("accepts plain decimal numbers", () => {
    assert.equal(parseValueText("12"), 12);
    assert.equal(parseValueText(" 12.5 "), 12.5);
    assert.equal(parseValueText("-3"), -3);
    assert.equal(parseValueText(".5"), 0.5);
    assert.equal(parseValueText("5."), 5);
    assert.equal(parseValueText("+7"), 7);
  });

  it("rejects everything else", () => {
    for (const bad of [
      "",
      "   ",
      "abc",
      "1e3",
      "0x10",
      "1,000",
      "Infinity",
      "1.2.3",
      "--1",
    ]) {
      assert.ok(Number.isNaN(parseValueText(bad)), `expected NaN for "${bad}"`);
    }
  });

  it('treats blank as "not given" for optional numbers', () => {
    assert.equal(parseOptionalValueText("  "), undefined);
    assert.equal(parseOptionalValueText("4"), 4);
  });

  it("splits tags on commas and leaves cleaning to validation", () => {
    assert.deepEqual(parseTagsText("a, b,,c"), ["a", " b", "", "c"]);
    assert.deepEqual(parseTagsText(""), [""]);
  });

  it("builds record input that validation accepts", () => {
    const input = buildRecordInput({
      id: "x1",
      name: "N",
      category: "C",
      valueText: "3.5",
      tagsText: "a, b",
    });
    const record = createRecord(createStore(), input);
    assert.equal(record.value, 3.5);
    assert.deepEqual(record.tags, ["a", "b"]);
  });

  it("builds changes that skip blank fields", () => {
    assert.deepEqual(
      buildChanges({ name: "", category: " ", valueText: "", tagsText: "" }),
      {},
    );
    assert.deepEqual(
      buildChanges({ name: "New", category: "", valueText: "9", tagsText: "" }),
      {
        name: "New",
        value: 9,
      },
    );
  });

  it("clears tags when the user types a dash", () => {
    assert.deepEqual(
      buildChanges({ name: "", category: "", valueText: "", tagsText: "-" }),
      { tags: [] },
    );
  });
});

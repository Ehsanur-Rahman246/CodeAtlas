import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createStore } from "../../src/model/store.js";
import {
  DuplicateIdError,
  NotFoundError,
  ValidationError,
} from "../../src/lib/errors.js";

// Resolve fixtures relative to this file (ES modules have no __dirname).
const loadFixture = async (name) =>
  JSON.parse(
    await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"),
  );

const validRecords = await loadFixture("valid-records.json");
const emptyRecords = await loadFixture("empty-records.json");

// A good raw record; tests override single fields with the spread operator.
const sample = {
  id: "rec-100",
  name: "Sample",
  category: "Test",
  value: 10,
  tags: ["a"],
  createdAt: "2026-01-15T10:30:00.000Z",
};

describe("store: starting state", () => {
  it("is empty when created with no records", () => {
    const store = createStore();
    assert.equal(store.count(), 0);
    assert.deepEqual(store.list(), []);
  });

  it("is empty when seeded from an empty fixture", () => {
    assert.equal(createStore(emptyRecords).count(), 0);
  });

  it("can be seeded from the valid fixture", () => {
    const store = createStore(validRecords);
    assert.equal(store.count(), validRecords.length);
  });

  it("throws if a seed record is invalid", () => {
    assert.throws(() => createStore([sample, { id: "x" }]), ValidationError);
  });

  it("throws if the seed contains a duplicate id", () => {
    assert.throws(() => createStore([sample, sample]), DuplicateIdError);
  });

  it("keeps separate stores independent", () => {
    const a = createStore();
    const b = createStore();
    a.add(sample);
    assert.equal(a.count(), 1);
    assert.equal(b.count(), 0);
  });
});

describe("store: add", () => {
  let store;
  beforeEach(() => {
    store = createStore();
  }); // fresh store before every test

  it("returns the normalized record and stores it", () => {
    const record = store.add({ ...sample, name: "  Padded  " });
    assert.equal(record.name, "Padded");
    assert.equal(store.count(), 1);
    assert.equal(store.get("rec-100"), record);
  });

  it("rejects invalid input and stores nothing", () => {
    assert.throws(() => store.add({ ...sample, value: NaN }), ValidationError);
    assert.equal(store.count(), 0);
  });

  it("rejects a duplicate id and keeps the original", () => {
    store.add(sample);
    assert.throws(() => store.add({ ...sample, name: "Different" }), {
      name: "DuplicateIdError",
      id: "rec-100",
    });
    assert.equal(store.count(), 1);
    assert.equal(store.get("rec-100").name, "Sample");
  });

  it("treats ids as duplicates after trimming", () => {
    store.add(sample);
    assert.throws(
      () => store.add({ ...sample, id: "  rec-100  " }),
      DuplicateIdError,
    );
  });

  it("treats ids as case-sensitive", () => {
    store.add(sample);
    store.add({ ...sample, id: "REC-100" });
    assert.equal(store.count(), 2);
  });
});

describe("store: get and has", () => {
  const store = createStore(validRecords);

  it("finds an existing record", () => {
    assert.equal(store.get("rec-001").name, "Red Apple");
    assert.equal(store.has("rec-001"), true);
  });

  it("returns undefined for a missing id instead of throwing", () => {
    assert.equal(store.get("nope"), undefined);
    assert.equal(store.has("nope"), false);
  });

  it("returns undefined for non-string ids", () => {
    assert.equal(store.get(undefined), undefined);
    assert.equal(store.get(null), undefined);
    assert.equal(store.get(1), undefined);
  });

  it("matches ids exactly, without trimming", () => {
    assert.equal(store.get(" rec-001 "), undefined);
  });

  it("returns frozen records, so references are safe to share", () => {
    assert.ok(Object.isFrozen(store.get("rec-001")));
  });
});

describe("store: list", () => {
  it("returns records in insertion order", () => {
    const store = createStore();
    store.add({ ...sample, id: "c" });
    store.add({ ...sample, id: "a" });
    store.add({ ...sample, id: "b" });
    assert.deepEqual(
      store.list().map((r) => r.id),
      ["c", "a", "b"],
    );
  });

  it("returns a new array each time", () => {
    const store = createStore([sample]);
    const first = store.list();
    first.length = 0; // emptying the copy must not empty the store
    first.push("junk");
    assert.equal(store.count(), 1);
    assert.notEqual(store.list(), store.list());
    assert.equal(store.list()[0].id, "rec-100");
  });
});

describe("store: update", () => {
  let store;
  beforeEach(() => {
    store = createStore([sample, { ...sample, id: "rec-200" }]);
  });

  it("merges changes and returns the new record", () => {
    const updated = store.update("rec-100", { value: 99, name: " New " });
    assert.equal(updated.value, 99);
    assert.equal(updated.name, "New");
    assert.equal(updated.category, "Test"); // untouched fields survive
    assert.equal(store.get("rec-100"), updated);
  });

  it("does not modify the old record object", () => {
    const before = store.get("rec-100");
    store.update("rec-100", { value: 99 });
    assert.equal(before.value, 10);
  });

  it("keeps the record in its original position", () => {
    store.update("rec-100", { value: 99 });
    assert.deepEqual(
      store.list().map((r) => r.id),
      ["rec-100", "rec-200"],
    );
  });

  it("allows an unchanged id inside the changes", () => {
    assert.equal(store.update("rec-100", { id: "rec-100", value: 1 }).value, 1);
  });

  it("rejects changing the id", () => {
    assert.throws(
      () => store.update("rec-100", { id: "rec-200" }),
      ValidationError,
    );
    assert.equal(store.count(), 2);
  });

  it("rejects invalid changes and leaves the record as it was", () => {
    assert.throws(
      () => store.update("rec-100", { value: Infinity }),
      ValidationError,
    );
    assert.equal(store.get("rec-100").value, 10);
  });

  it("throws NotFoundError for a missing id", () => {
    assert.throws(() => store.update("nope", { value: 1 }), {
      name: "NotFoundError",
      id: "nope",
    });
  });

  it("rejects changes that are not an object", () => {
    for (const bad of [null, undefined, [], "text", 5]) {
      assert.throws(() => store.update("rec-100", bad), ValidationError);
    }
  });
});

describe("store: remove and clear", () => {
  let store;
  beforeEach(() => {
    store = createStore([sample, { ...sample, id: "rec-200" }]);
  });

  it("removes a record and returns it", () => {
    const removed = store.remove("rec-100");
    assert.equal(removed.id, "rec-100");
    assert.equal(store.get("rec-100"), undefined);
    assert.equal(store.count(), 1);
  });

  it("throws NotFoundError for a missing id", () => {
    assert.throws(() => store.remove("nope"), NotFoundError);
    assert.equal(store.count(), 2);
  });

  it("throws when removing the same id twice", () => {
    store.remove("rec-100");
    assert.throws(() => store.remove("rec-100"), NotFoundError);
  });

  it("allows re-adding an id after removal", () => {
    store.remove("rec-100");
    store.add(sample);
    assert.equal(store.count(), 2);
  });

  it("clear empties the store", () => {
    store.clear();
    assert.equal(store.count(), 0);
    assert.deepEqual(store.list(), []);
  });
});

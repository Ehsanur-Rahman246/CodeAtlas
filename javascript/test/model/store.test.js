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

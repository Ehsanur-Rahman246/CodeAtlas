import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTopicFile, TOPICS_DIR } from "../../src/guide/catalog.js";

// Writes a file in a fresh temp folder, runs the callback with its path, then cleans up.
async function withTempFile(contents, callback) {
  const dir = await mkdtemp(join(tmpdir(), "codeatlas-"));
  const filePath = join(dir, "topics.json");
  await writeFile(filePath, contents);
  try {
    await callback(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("loads the real fundamentals file as a non-empty array", async () => {
  const topics = await loadTopicFile(join(TOPICS_DIR, "fundamentals.json"));
  assert.ok(Array.isArray(topics));
  assert.ok(topics.length > 0);
  // Every topic should at least have a string id and title.
  for (const topic of topics) {
    assert.equal(typeof topic.id, "string");
    assert.equal(typeof topic.title, "string");
  }
});

test("rejects with the file path when the file does not exist", async () => {
  await assert.rejects(
    loadTopicFile(join(TOPICS_DIR, "does-not-exist.json")),
    /Cannot read topic file .*does-not-exist\.json/,
  );
});

test("rejects with a clear message for malformed JSON", async () => {
  await withTempFile('[ { "id": ', async (filePath) => {
    await assert.rejects(loadTopicFile(filePath), /Malformed JSON in/);
  });
});

test("rejects when the JSON is not an array", async () => {
  await withTempFile('{ "id": "x" }', async (filePath) => {
    await assert.rejects(loadTopicFile(filePath), /must contain an array/);
  });
});

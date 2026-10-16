import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateTopic,
  validateTopicList,
} from "../../src/guide/validate-topic.js";

// A minimal valid topic. Tests override one field at a time to break it.
function makeTopic(overrides = {}) {
  return {
    id: "js-test-topic",
    title: "Test topic",
    category: "Fundamentals",
    difficulty: "beginner",
    sourceType: "language",
    keywords: ["test"],
    summary: "A short summary.",
    explanation: "A longer explanation.",
    examples: [
      { title: "Example", code: "console.log(1);", explanation: "Prints one." },
    ],
    status: "draft",
    ...overrides,
  };
}

// True if any error message contains the given text.
const hasError = (errors, text) =>
  errors.some((message) => message.includes(text));

// ---- validateTopic ----

test("a valid topic has no errors", () => {
  assert.deepEqual(validateTopic(makeTopic()), []);
});

test("optional fields may be present and valid", () => {
  const topic = makeTopic({
    syntax: "const x = 1;",
    commonMistakes: ["A mistake."],
    relatedTopics: ["js-other"],
    references: ["https://example.com"],
    examples: [
      { title: "E", code: "1", expectedOutput: "1", explanation: "Shows one." },
    ],
  });
  assert.deepEqual(validateTopic(topic), []);
});

test("reports a missing title", () => {
  assert.ok(
    hasError(validateTopic(makeTopic({ title: undefined })), '"title"'),
  );
});

test("reports an invalid difficulty", () => {
  assert.ok(
    hasError(validateTopic(makeTopic({ difficulty: "hard" })), '"difficulty"'),
  );
});

test("reports an invalid sourceType", () => {
  assert.ok(
    hasError(validateTopic(makeTopic({ sourceType: "magic" })), '"sourceType"'),
  );
});

test("reports an invalid status", () => {
  assert.ok(
    hasError(validateTopic(makeTopic({ status: "finished" })), '"status"'),
  );
});

test("reports empty keywords", () => {
  assert.ok(hasError(validateTopic(makeTopic({ keywords: [] })), '"keywords"'));
});

test("reports an empty examples array", () => {
  assert.ok(hasError(validateTopic(makeTopic({ examples: [] })), '"examples"'));
});

test("reports an example that is missing its code", () => {
  const topic = makeTopic({ examples: [{ title: "T", explanation: "E" }] });
  const errors = validateTopic(topic);
  assert.ok(hasError(errors, "example 1"));
  assert.ok(hasError(errors, '"code"'));
});

test("reports an expectedOutput that is not a string", () => {
  const topic = makeTopic({
    examples: [{ title: "T", code: "1", explanation: "E", expectedOutput: 42 }],
  });
  assert.ok(hasError(validateTopic(topic), '"expectedOutput"'));
});

test("reports an example that is not an object", () => {
  assert.ok(
    hasError(validateTopic(makeTopic({ examples: ["oops"] })), "example 1"),
  );
});

test("reports an optional field with the wrong type", () => {
  assert.ok(
    hasError(
      validateTopic(makeTopic({ relatedTopics: "js-other" })),
      '"relatedTopics"',
    ),
  );
});

test("rejects values that are not objects", () => {
  for (const bad of [null, "text", [], 42]) {
    assert.deepEqual(validateTopic(bad), ["topic must be an object"]);
  }
});

// ---- validateTopicList ----

test("a valid list has no errors", () => {
  const topics = [makeTopic(), makeTopic({ id: "js-second" })];
  assert.deepEqual(validateTopicList(topics), []);
});

test("reports an empty list", () => {
  assert.ok(hasError(validateTopicList([]), "empty"));
});

test("reports a list that is not an array", () => {
  assert.ok(hasError(validateTopicList("nope"), "must be an array"));
});

test("reports duplicate ids", () => {
  const errors = validateTopicList([makeTopic(), makeTopic()]);
  assert.ok(hasError(errors, 'duplicate id "js-test-topic"'));
});

test("labels errors with the topic position and id", () => {
  const errors = validateTopicList([
    makeTopic(),
    makeTopic({ id: "second", difficulty: "hard" }),
  ]);
  assert.ok(hasError(errors, 'topic #2 ("second")'));
  assert.ok(hasError(errors, '"difficulty"'));
});

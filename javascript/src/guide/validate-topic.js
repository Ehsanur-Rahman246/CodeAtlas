// Allowed values for the fields that only accept a fixed set.
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
export const SOURCE_TYPES = [
  "language",
  "standard-library",
  "runtime",
  "platform",
  "tooling",
  "third-party",
  "codeatlas",
];
export const STATUSES = ["draft", "reviewed", "verified"];

// Fields that must be non-empty strings on every topic.
const REQUIRED_STRING_FIELDS = [
  "id",
  "title",
  "category",
  "summary",
  "explanation",
];

// True for a string with at least one non-space character.
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// True for a plain object (not null, not an array).
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Records an error unless the field's value is one of the allowed values.
function checkAllowed(topic, field, allowed, errors) {
  if (!allowed.includes(topic[field])) {
    errors.push(
      `"${field}" must be one of: ${allowed.join(", ")} (got ${JSON.stringify(topic[field])})`,
    );
  }
}

// Checks a field that should be an array of non-empty strings.
// Required fields must also be present and non-empty; optional ones may be missing.
function checkStringArray(topic, field, errors, { required }) {
  const value = topic[field];

  if (value === undefined) {
    if (required) errors.push(`"${field}" is required`);
    return;
  }
  if (!Array.isArray(value) || !value.every(isNonEmptyString)) {
    errors.push(`"${field}" must be an array of non-empty strings`);
  } else if (required && value.length === 0) {
    errors.push(`"${field}" must not be empty`);
  }
}

// Checks one example and returns its errors. "position" is 1-based for readable messages.
function validateExample(example, position) {
  if (!isPlainObject(example)) return [`example ${position} must be an object`];

  const errors = [];
  for (const field of ["title", "code", "explanation"]) {
    if (!isNonEmptyString(example[field])) {
      errors.push(
        `example ${position}: "${field}" is missing or not a non-empty string`,
      );
    }
  }
  // expectedOutput is optional, but if it is given it must be a string.
  if (
    example.expectedOutput !== undefined &&
    typeof example.expectedOutput !== "string"
  ) {
    errors.push(`example ${position}: "expectedOutput" must be a string`);
  }
  return errors;
}

// Validates one topic. Returns an array of error messages (empty means valid).
export function validateTopic(topic) {
  if (!isPlainObject(topic)) return ["topic must be an object"];

  const errors = [];

  // Required text fields.
  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(topic[field])) {
      errors.push(`"${field}" is missing or not a non-empty string`);
    }
  }

  // Fields limited to a fixed set of values.
  checkAllowed(topic, "difficulty", DIFFICULTIES, errors);
  checkAllowed(topic, "sourceType", SOURCE_TYPES, errors);
  checkAllowed(topic, "status", STATUSES, errors);

  // keywords is required; the other list fields are optional.
  checkStringArray(topic, "keywords", errors, { required: true });
  checkStringArray(topic, "commonMistakes", errors, { required: false });
  checkStringArray(topic, "relatedTopics", errors, { required: false });
  checkStringArray(topic, "references", errors, { required: false });

  // syntax is optional text.
  if (topic.syntax !== undefined && !isNonEmptyString(topic.syntax)) {
    errors.push(`"syntax" must be a non-empty string when present`);
  }

  // A topic needs at least one example, and each example must be well formed.
  if (!Array.isArray(topic.examples) || topic.examples.length === 0) {
    errors.push(`"examples" must be a non-empty array`);
  } else {
    topic.examples.forEach((example, index) => {
      errors.push(...validateExample(example, index + 1));
    });
  }

  return errors;
}

// Validates a list of topics: not empty, each topic valid, no duplicate ids.
// Returns an array of error messages (empty means valid).
export function validateTopicList(topics) {
  if (!Array.isArray(topics)) return ["topic list must be an array"];
  if (topics.length === 0) return ["topic list is empty"];

  const errors = [];
  const firstSeen = new Map(); // id -> position of the first topic that used it

  topics.forEach((topic, index) => {
    const position = index + 1;
    const hasId = isPlainObject(topic) && isNonEmptyString(topic.id);
    // Label errors with the position, plus the id when there is one.
    const label = hasId
      ? `topic #${position} ("${topic.id}")`
      : `topic #${position}`;

    for (const message of validateTopic(topic)) {
      errors.push(`${label}: ${message}`);
    }

    if (hasId) {
      if (firstSeen.has(topic.id)) {
        errors.push(
          `${label}: duplicate id "${topic.id}" (first used by topic #${firstSeen.get(topic.id)})`,
        );
      } else {
        firstSeen.set(topic.id, position);
      }
    }
  });

  return errors;
}

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateTopicList } from "./validate-topic.js";

// Absolute path to the topics folder, resolved relative to this file.
export const TOPICS_DIR = fileURLToPath(
  new URL("../content/topics/", import.meta.url),
);

// Reads one topic file and returns its validated array of topics.
// Throws an Error naming the file if it is missing, malformed, or has invalid topics.
export async function loadTopicFile(filePath) {
  // Step 1: read the file from disk.
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Cannot read topic file ${filePath}: ${error.message}`);
  }

  // Step 2: parse the JSON, naming the file if the syntax is broken.
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`Malformed JSON in ${filePath}: ${error.message}`);
  }

  // Step 3: a topic file must be a list of topics.
  if (!Array.isArray(data)) {
    throw new Error(`Topic file ${filePath} must contain an array of topics.`);
  }

  // Step 4: validate the topics and report every problem in one error.
  const problems = validateTopicList(data);
  if (problems.length > 0) {
    const details = problems.map((problem) => `  - ${problem}`).join("\n");
    throw new Error(`Invalid topics in ${filePath}:\n${details}`);
  }

  return data;
}

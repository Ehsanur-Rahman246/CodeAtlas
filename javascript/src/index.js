import { run } from "./app.js";
import { printError } from "./cli/output.js";

// Entry point only: start the app and report unexpected errors readably.
try {
  await run();
} catch (error) {
  printError(`Unexpected error: ${error.message}`);
  process.exitCode = 1;
}

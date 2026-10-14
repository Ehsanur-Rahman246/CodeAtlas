// Entry point: start the app and catch anything nobody else handled.
import { runApp } from "./app.js";

try {
  // Top-level await works because this is an ES module.
  process.exitCode = await runApp();
} catch (error) {
  // Last line of defense. Keep stack traces for debuugging only.
  console.error(`Fatal error: ${error?.message ?? error}`);
  if (process.env.CODEATLAS_DEBUG) console.error(error?.stack);
  process.exitCode = 1;
}

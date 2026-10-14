// ---------------------------------------------------------------------------
// Main menu: what the options are, how they are shown, and how a choice is run.
// It knows nothing about records. Each option's `run` function receives the
// shared context { store, prompt, out } and does the work.
// ---------------------------------------------------------------------------

import { AppError, InputClosedError } from "./lib/errors.js";

export const EXIT_KEY = "0";

// Placeholder handler until the real module exists. In later phases, replace
// each `run` with the real module's function (imported from src/modules/...).
const comingSoon =
  (label) =>
  async ({ out }) => {
    out.warn(`${label} is not implemented yet.`);
  };

// The dispatch table: key -> label + handler. Exit is handled by the app loop.
export const MENU_ITEMS = Object.freeze([
  { key: "1", label: "Manage Records", run: comingSoon("Manage Records") },
  { key: "2", label: "Analyze Data", run: comingSoon("Analyze Data") },
  {
    key: "3",
    label: "Algorithm Workbench",
    run: comingSoon("Algorithm Workbench"),
  },
  { key: "4", label: "Text Processing", run: comingSoon("Text Processing") },
  {
    key: "5",
    label: "Files and Persistence",
    run: comingSoon("Files and Persistence"),
  },
  {
    key: "6",
    label: "Tasks and Concurrency",
    run: comingSoon("Tasks and Concurrency"),
  },
  {
    key: "7",
    label: "Diagnostics and Benchmarks",
    run: comingSoon("Diagnostics and Benchmarks"),
  },
  {
    key: "8",
    label: "Language Explorer",
    run: comingSoon("Language Explorer"),
  },
]);

/** Every key the user may type, including exit. */
export function menuKeys(items = MENU_ITEMS) {
  return [...items.map((item) => item.key), EXIT_KEY];
}

/** Prints the menu. */
export function renderMenu(out, items = MENU_ITEMS) {
  out.blank();
  out.heading("Main menu");
  for (const item of items) {
    out.line(`${item.key}. ${item.label}`);
  }
  out.line(`${EXIT_KEY}. Exit`);
  out.blank();
}

/**
 * Runs the handler for one menu key. A failing handler must never end the session:
 * expected errors are shown to the user and the menu continues. The one exception
 * is InputClosedError, which means the user is gone, so it is passed up.
 */
export async function dispatch(key, context, items = MENU_ITEMS) {
  const item = items.find((candidate) => candidate.key === key);
  if (item === undefined) {
    context.out.error(`There is no menu option "${key}".`);
    return;
  }

  try {
    await item.run(context);
  } catch (error) {
    if (error instanceof InputClosedError) throw error;
    if (error instanceof AppError) {
      context.out.error(error.message);
    } else {
      // `error?.message ?? error` also copes with code that throws a non-Error value.
      context.out.error(`Unexpected error: ${error?.message ?? error}`);
    }
  }
}

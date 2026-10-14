// ---------------------------------------------------------------------------
// Application lifecycle: build the shared context, run the menu loop, and
// always clean up. Streams and the store are parameters so tests can supply
// their own instead of the real terminal.
// ---------------------------------------------------------------------------

import { createOutput } from "./cli/output.js";
import { createPrompter, askChoice } from "./cli/prompt.js";
import { createStore } from "./model/store.js";
import { EXIT_KEY, dispatch, menuKeys, renderMenu } from "./menu.js";
import { InputClosedError } from "./lib/errors.js";
import { getBanner } from './cli/banner.js';


/**
 * Runs the interactive app until the user exits or input closes.
 * @returns {Promise<number>} process exit code
 */
export async function runApp({
  input = process.stdin,
  output = process.stdout,
  store = createStore(),
} = {}) {
  const prompter = createPrompter({ input, output });
  const out = createOutput({ stream: output });

  // Everything a menu handler may need, passed explicitly instead of global state.
  const context = { store, prompt: prompter, out };

  try {
    out.line(getBanner({ color: out.color }));

    while (true) {
      renderMenu(out);
      const key = await askChoice(
        prompter,
        out,
        "Select an option: ",
        menuKeys(),
      );
      if (key === EXIT_KEY) break;
      await dispatch(key, context);
    }
    out.line("Peace out.");
  } catch (error) {
    // Ctrl+C, Ctrl+D or the end of piped input: a normal way to leave.
    if (!(error instanceof InputClosedError)) throw error;
    out.blank(); // the cursor may be in the middle of the line
    out.line("Input closed. Bye.");
  } finally {
    // Runs on every path, so the terminal is released and the process can end.
    prompter.close();
  }

  return 0;
}

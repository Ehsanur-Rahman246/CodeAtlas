// ---------------------------------------------------------------------------
// Terminal input helpers.
//
// Why not rl.question()? When input is piped, several lines can arrive before
// we ask for them and question() loses those lines. And when input ends while a
// question is pending, its promise never settles, so the program silently stops.
// Instead we collect every line in a queue and hand them out one at a time.
// ---------------------------------------------------------------------------

import { createInterface } from "node:readline";
import { InputClosedError } from "../lib/errors.js";

/**
 * Creates a prompter around a readable stream.
 * ask(question) resolves with the next line, or rejects with InputClosedError
 * once the input has ended and no lines are left.
 */
export function createPrompter({
  input = process.stdin,
  output = process.stdout,
} = {}) {
  const rl = createInterface({ input, output });
  const queue = []; // lines recieved but not asked for yet
  let waiting = null; // { resolve, reject } of the ask()  currently pending
  let closed = false;

  // Each completed line either answers the pending ask() or waits in the queue.
  rl.on("line", (line) => {
    if (waiting !== null) {
      const { resolve } = waiting;
      waiting = null;
      resolve(line);
    } else {
      queue.push(line);
    }
  });

  // Fires on Ctrl+D, Ctrl+C, end of piped input, or our own close().
  rl.on("close", () => {
    closed = true;
    if (waiting !== null) {
      const { reject } = waiting;
      waiting = null;
      reject(new InputClosedError());
    }
  });

  function ask(question) {
    if (waiting !== null) {
      return Promise.reject(
        new Error("ask() called while another question is pending"),
      );
    }
    // Let readline draw the prompt so line editing (backspace, arrows) stays correct.
    if (!closed) {
      rl.setPrompt(question);
      rl.prompt();
    }
    // Queued lines win even if input has already ended (piped input).
    if (queue.length > 0) return Promise.resolve(queue.shift());
    if (closed) return Promise.reject(new InputClosedError());
    return new Promise((resolve, reject) => {
      waiting = { resolve, reject };
    });
  }

  // Safe to call more than once. Closing lets the process exit.
  function close() {
    rl.close();
  }

  return Object.freeze({ ask, close });
}

/**
 * Normalizes raw text and checks it against the allowed choices.
 * @param {string} raw      what the user typed
 * @param {string[]} allowed lowercase choices
 * @returns {string | undefined} the cleaned choice, or undefined if invalid
 */
export function parseChoice(raw, allowed) {
  const choice = raw.trim().toLowerCase();
  return allowed.includes(choice) ? choice : undefined;
}

/**
 * Asks until the user types one of the allowed choices.
 * Closed input throws InputClosedError, so this cannot loop forever.
 */
export async function askChoice(prompter, out, question, allowed) {
  while (true) {
    const raw = await prompter.ask(question);
    const choice = parseChoice(raw, allowed);
    if (choice !== undefined) return choice;

    if (raw.trim() === "") {
      out.error("Please enter a choice.");
    } else {
      out.error(
        `"${raw.trim()}" is not a valid choice. Options: ${allowed.join(", ")}`,
      );
    }
  }
}

/** Asks a yes/no question; returns true for yes. Used from Phase 4 on. */
export async function askYesNo(prompter, out, question) {
  while (true) {
    const answer = (await prompter.ask(`${question} (y/n): `))
      .trim()
      .toLowerCase();
    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;
    out.error("Please answer y or n.");
  }
}

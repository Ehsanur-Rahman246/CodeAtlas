import { createInterface } from "node:readline/promises";

// One shared interface for the whole app, created once.
const rl = createInterface({ input: process.stdin, output: process.stdout });

// Tracks whether input has ended (Ctrl+D, Ctrl+C, or piped input running out).
let isClosed = false;

// Resolves with null when the interface closes, so a pending question never hangs.
const closedSignal = new Promise((resolve) => {
  rl.once("close", () => {
    isClosed = true;
    resolve(null);
  });
});

// Asks one question and returns the trimmed answer, or null if input has ended.
export async function ask(question) {
  // Asking a closed interface throws, so bail out first.
  if (isClosed) return null;

  // Whichever happens first wins: the user answers, or the input closes.
  const answer = await Promise.race([rl.question(question), closedSignal]);
  return answer === null ? null : answer.trim();
}

// Closes the interface so the process can exit. Safe to call more than once.
export function closePrompt() {
  rl.close();
}

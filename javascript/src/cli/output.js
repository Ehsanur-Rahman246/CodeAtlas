// Color is allowed only on a real terminal, and only if NO_COLOR is not set.
export const color = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

// Normal output. Calling print() with no argument prints a blank line.
export function print(text = "") {
  console.log(text);
}

// Error output goes to stderr so it stays separate from normal output.
export function printError(text) {
  console.error(text);
}

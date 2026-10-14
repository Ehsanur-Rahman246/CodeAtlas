// ---------------------------------------------------------------------------
// Terminal output helpers. Everything the user sees goes through here, so
// formatting stays in one place. ANSI escape codes live ONLY in this file.
// ---------------------------------------------------------------------------

// ANSI escape sequences: "\x1b[" starts a code, the number picks the style.
const CODES = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
};

/**
 * Decides whether to use color for a stream.
 * Follows the NO_COLOR convention (https://no-color.org): any non-empty value disables color.
 */
export function detectColor(stream, env = process.env) {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  // isTTY is true for a real terminal and undefined for pipes and files.
  return Boolean(stream.isTTY);
}

/**
 * Creates the output helpers.
 * @param {{stream?: {write: Function, isTTY?: boolean}, color?: boolean}} [options]
 */
export function createOutput({
  stream = process.stdout,
  color = detectColor(stream),
} = {}) {
  // Wraps text in a style, or returns it unchanged when color is off.
  const paint = (style, text) =>
    color ? `${CODES[style]}${text}${CODES.reset}` : text;

  const line = (text = "") => {
    stream.write(`${text}\n`);
  };

  // Messages use tet prefixes, not only color, so they atill read clearly without color.
  return Object.freeze({
    color,
    line,
    blank: () => line(),
    heading: (text) => {
      line(paint("bold", text));
      line(paint("dim", "-".repeat(text.length))); //underline as long as the title
    },
    success: (text) => line(paint("green", `Done: ${text}`)),
    warn: (text) => line(paint("yellow", `Warning: ${text}`)),
    error: (text) => line(paint("red", `Error: ${text}`)),
  });
}

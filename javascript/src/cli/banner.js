const RESET = "\x1b[0m";
const YELLOW = "\x1b[33;1m";
const WHITE = "\x1b[97m";
const GRAY = "\x1b[90m";
const BLACK = "\x1b[30;1m";
const BG_YELLOW = "\x1b[43m";

// String.raw keeps the backslashes in the art exactly as typed.
const art = String.raw`
   █████\  ██████\  
   \__██ |██  __██\ 
      ██ |██ /  \__|
      ██ |\██████\  
██\   ██ | \____██\ 
██ |  ██ |██\   ██ |
\██████  |\██████  |
 \______/  \______/ 
`.replace(/^\n+|\n+$/g, ""); // drop only the surrounding blank lines, keep the art's own spaces

/**
 * Builds the startup banner as a string. It prints nothing.
 * @param {{ color?: boolean }} [options] pass out.color so the banner follows NO_COLOR
 */

export function getBanner({ color = true } = {}) {
  // Wraps text in a color code, or returns it unchanged when color is off.
  const paint = (code, text) => (color ? `${code}${text}${RESET}` : text);

  return [
    paint(YELLOW, art),
    `  ${paint(BG_YELLOW + BLACK, " JS ")} ${paint(WHITE, "CodeAtlas")} ${paint(GRAY, "/ JavaScript Edition")}`,
    `  ${paint(YELLOW, "Explore languages. Discover possibilities.")}`,
    `  ${paint(GRAY, "Mini Data Lab · v1.0.0")}`,
  ].join("\n");
}

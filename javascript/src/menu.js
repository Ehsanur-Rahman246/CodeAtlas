// The main menu as data: the key the user types, an id the app acts on, and a label.
export const MAIN_MENU = [
  { key: "1", id: "guide", label: "Language Guide" },
  { key: "0", id: "exit", label: "Exit" },
];

// Builds the menu text, one "[key] label" line per item. Returns a string, prints nothing.
export function renderMenu(items) {
  return items.map((item) => `[${item.key}] ${item.label}`).join("\n");
}

// Finds the menu item matching the input, or returns null for blank/unknown input.
export function parseChoice(input, items) {
  const cleaned = input.trim();
  return items.find((item) => item.key === cleaned) ?? null;
}

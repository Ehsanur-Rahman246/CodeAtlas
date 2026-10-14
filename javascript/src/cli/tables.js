// Pure table formatter: data in, string out. It prints nothing.
// Limitation: width is counted in code points, so double-width characters
// (CJK, many emoji) can still misalign a column.

// NFC normalization makes "e" + combining accent count the same as "é".
const width = (text) => [...text.normalize("NFC")].length;

// Cuts long text and marks the cut with "...".
function truncate(text, maxWidth) {
  const chars = [...text.normalize("NFC")];
  if (maxWidth === undefined || chars.length <= maxWidth) return chars.join("");
  return `${chars.slice(0, Math.max(0, maxWidth - 3)).join("")}...`;
}

function pad(text, target, align) {
  const gap = " ".repeat(target - width(text));
  return align === "right" ? gap + text : text + gap;
}

/**
 * @param {{header: string, value: (row: any) => unknown,
 *          align?: 'left' | 'right', maxWidth?: number}[]} columns
 * @param {any[]} rows
 * @returns {string} header, separator and one line per row (no trailing newline)
 */
export function formatTable(columns, rows) {
  // Compute every cell's text once, so widths and output use the same strings.
  const cells = rows.map((row) =>
    columns.map((column) =>
      truncate(String(column.value(row)), column.maxWidth),
    ),
  );

  // Column width = widest of the header and all cells. reduce() instead of
  // Math.max(...array) because spreading a huge array can exceed the argument limit.
  const widths = columns.map((column, index) =>
    cells.reduce(
      (max, row) => Math.max(max, width(row[index])),
      width(column.header),
    ),
  );

  const render = (parts) =>
    parts
      .map((text, index) => pad(text, widths[index], columns[index].align))
      .join("  ")
      .trimEnd(); // no trailing spaces after a left-aligned last column

  return [
    render(columns.map((column) => column.header)),
    widths.map((w) => "-".repeat(w)).join('  '),
    ...cells.map(render),
  ].join("\n");
}

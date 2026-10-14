import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatTable } from "../../src/cli/tables.js";

const columns = [
  { header: "Name", value: (r) => r.name },
  { header: "Qty", value: (r) => r.qty, align: "right" },
];

describe("formatTable", () => {
  it("aligns columns and underlines the header", () => {
    const rows = [
      { name: "Apple", qty: 5 },
      { name: "Fig", qty: 120 },
    ];
    assert.deepEqual(formatTable(columns, rows).split("\n"), [
      "Name   Qty",
      "-----  ---",
      "Apple    5",
      "Fig    120",
    ]);
  });

  it("prints only the header and separator for no rows", () => {
    assert.equal(formatTable(columns, []).split("\n").length, 2);
  });

  it("truncates long cells with an ellipsis", () => {
    const lines = formatTable(
      [{ header: "T", value: (r) => r, maxWidth: 8 }],
      ["abcdefghijkl"],
    ).split("\n");
    assert.equal(lines[2], "abcde...");
  });

  it("treats composed and decomposed accents the same", () => {
    const lines = formatTable(
      [{ header: "N", value: (r) => r }],
      ["E\u0301", "\u00C9"],
    ).split("\n");
    assert.equal(lines[2], lines[3]);
  });

  it("does not leave trailing spaces", () => {
    const lines = formatTable(columns, [{ name: "A", qty: 1 }]).split("\n");
    for (const line of lines) assert.equal(line, line.trimEnd());
  });
});

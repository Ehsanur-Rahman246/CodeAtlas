import { test } from "node:test";
import assert from "node:assert/strict";
import { getBanner } from "../src/cli/banner.js";
import { MAIN_MENU, renderMenu, parseChoice } from "../src/menu.js";

test("renderMenu shows every item as [key] label", () => {
  const text = renderMenu(MAIN_MENU);
  assert.ok(text.includes("[1] Language Guide"));
  assert.ok(text.includes("[0] Exit"));
});

test("parseChoice returns the matching item for a valid key", () => {
  assert.equal(parseChoice("1", MAIN_MENU).id, "guide");
});

test("parseChoice ignores whitespace around the key", () => {
  assert.equal(parseChoice("  0 ", MAIN_MENU).id, "exit");
});

test("parseChoice returns null for unknown input", () => {
  assert.equal(parseChoice("9", MAIN_MENU), null);
  assert.equal(parseChoice("abc", MAIN_MENU), null);
});

test("parseChoice returns null for blank input", () => {
  assert.equal(parseChoice("", MAIN_MENU), null);
  assert.equal(parseChoice("   ", MAIN_MENU), null);
});

test("getBanner without color has the title and no escape codes", () => {
  const banner = getBanner({ color: false });
  assert.ok(banner.includes("JavaScript Edition"));
  assert.ok(!banner.includes("\x1b"));
});

test("getBanner with color includes escape codes", () => {
  assert.ok(getBanner({ color: true }).includes("\x1b"));
});

import { describe, it, run } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";

import { runApp } from "../../src/app.js";
import { dispatch } from "../../src/menu.js";
import { createOutput, detectColor } from "../../src/cli/output.js";
import { parseChoice } from "../../src/cli/prompt.js";
import { getBanner } from "../../src/cli/banner.js";
import {
  AppError,
  InputClosedError,
  ValidationError,
} from "../../src/lib/errors.js";
import { createStore } from "../../src/model/store.js";
import { reportError } from "../../src/cli/output.js";

// Runs the whole app against fake streams: no real terminal needed.
async function runWith(lines, store) {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = "";
  output.on("data", (chunk) => {
    text += chunk;
  });

  const finished = runApp({ input, output, store }); // undefined store -> default empty store
  for (const line of lines) input.write(`${line}\n`);
  input.end(); // simulates the end of input
  const code = await finished;
  return { code, text };
}

// A fake output stream that records what was written.
function capture() {
  let text = "";
  const stream = {
    isTTY: false,
    write(chunk) {
      text += chunk;
      return true;
    },
  };
  return { out: createOutput({ stream }), read: () => text };
}

// The timeout option turns an accidental hang into a failure instead of a frozen test run.
const opts = { timeout: 3000 };

describe("banner", () => {
  it(
    "prints the banner exactly once per run, through the output stream",
    opts,
    async () => {
      const { text } = await runWith(["0"]);
      assert.equal(text.split("JavaScript Edition").length - 1, 1);
    },
  );

  it("has no escape codes when color is off", () => {
    assert.doesNotMatch(getBanner({ color: false }), /\x1b\[/);
  });

  it("has escape codes when color is on", () => {
    assert.match(getBanner({ color: true }), /\x1b\[/);
  });
});

describe("app loop", () => {
  it("shows the menu and exits cleanly on 0", opts, async () => {
    const { code, text } = await runWith(["0"]);
    assert.equal(code, 0);
    assert.match(text, /Manage Records/);
    assert.match(text, /Peace out\./);
  });

  it("rejects invalid choices and keeps going", opts, async () => {
    const { text } = await runWith(["9", "abc", "", "0"]);
    assert.match(text, /"9" is not a valid choice/);
    assert.match(text, /"abc" is not a valid choice/);
    assert.match(text, /Please enter a choice\./);
    assert.match(text, /Peace out\./);
  });

  it("returns to the menu after an option runs", opts, async () => {
    const { text } = await runWith(["2", "0"]);
    assert.match(text, /Analyze Data is not implemented yet/);
    assert.equal(text.split("Main menu").length - 1, 2); // shown before and after
  });

  it(
    "ends cleanly when input closes without an exit choice",
    opts,
    async () => {
      const { code, text } = await runWith([]);
      assert.equal(code, 0);
      assert.match(text, /Input closed\. Bye\./);
    },
  );

  it("accepts surrounding spaces in a choice", opts, async () => {
    const { text } = await runWith(["  0  "]);
    assert.match(text, /Peace out\./);
  });
});

describe("dispatch error recovery", () => {
  const makeContext = () => {
    const { out, read } = capture();
    return { context: { out }, read };
  };
  const item = (run) => [{ key: "1", label: "Test", run }];

  it("shows an expected error and continues", async () => {
    const { context, read } = makeContext();
    await dispatch(
      "1",
      context,
      item(async () => {
        throw new AppError("custom problem");
      }),
    );
    assert.match(read(), /Error: custom problem/);
  });

  it("shows validation errors too", async () => {
    const { context, read } = makeContext();
    await dispatch(
      "1",
      context,
      item(async () => {
        throw new ValidationError(["value bad"]);
      }),
    );
    assert.match(read(), /Error: Validation failed: value bad/);
  });

  it("reports unexpected errors without crashing", async () => {
    const { context, read } = makeContext();
    await dispatch(
      "1",
      context,
      item(async () => {
        throw new TypeError("boom");
      }),
    );
    assert.match(read(), /Unexpected error: boom/);
  });

  it("passes closed input up so the app can end", async () => {
    const { context } = makeContext();
    await assert.rejects(
      dispatch(
        "1",
        context,
        item(async () => {
          throw new InputClosedError();
        }),
      ),
      InputClosedError,
    );
  });

  it("reports an unknown key", async () => {
    const { context, read } = makeContext();
    await dispatch("x", context, []);
    assert.match(read(), /There is no menu option "x"/);
  });
});

describe("parseChoice", () => {
  const allowed = ["1", "2", "q"];
  it("trims and lowercases", () => {
    assert.equal(parseChoice("  Q ", allowed), "q");
  });
  it("returns undefined for invalid or empty input", () => {
    assert.equal(parseChoice("9", allowed), undefined);
    assert.equal(parseChoice("", allowed), undefined);
  });
});

describe("output color", () => {
  it("uses color only on a terminal without NO_COLOR", () => {
    assert.equal(detectColor({ isTTY: true }, {}), true);
    assert.equal(detectColor({ isTTY: false }, {}), false);
    assert.equal(detectColor({}, {}), false);
    assert.equal(detectColor({ isTTY: true }, { NO_COLOR: "1" }), false);
  });

  it("adds escape codes only when color is on", () => {
    const colored = [];
    const plain = [];
    createOutput({
      stream: { write: (c) => colored.push(c) },
      color: true,
    }).error("x");
    createOutput({
      stream: { write: (c) => plain.push(c) },
      color: false,
    }).error("x");
    assert.match(colored.join(""), /\x1b\[/);
    assert.equal(plain.join(""), "Error: x\n");
  });
});

// Two seeded records for the workflow tests below.
const seed = () =>
  createStore([
    {
      id: "r1",
      name: "Apple",
      category: "Fruit",
      value: 10,
      tags: ["fresh"],
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "r2",
      name: "Carrot",
      category: "Veg",
      value: 2,
      tags: [],
      createdAt: "2026-01-02T00:00:00Z",
    },
  ]);

describe("records menu workflows", () => {
  it("creates a record with an automatic id", opts, async () => {
    const store = createStore();
    // main 1 -> create (1) -> id, name, category, value, tags -> back (0) -> exit (0)
    const { text } = await runWith(
      ["1", "1", "", "Apple", "Fruit", "5", "red, fresh", "0", "0"],
      store,
    );
    assert.match(text, /Created record rec-001/);
    assert.deepEqual(store.get("rec-001").tags, ["red", "fresh"]);
    assert.equal(store.get("rec-001").value, 5);
  });

  it(
    "shows every validation problem and stays in the submenu",
    opts,
    async () => {
      const store = createStore();
      const { code, text } = await runWith(
        ["1", "1", "", "", "Fruit", "abc", "", "0", "0"],
        store,
      );
      assert.equal(code, 0);
      assert.match(text, /name must not be empty/);
      assert.match(text, /value must be a finite number/);
      assert.equal(store.count(), 0);
      assert.equal(text.split("Manage records").length - 1, 2); // submenu shown again
    },
  );

  it("lists records as a table", opts, async () => {
    const { text } = await runWith(["1", "2", "", "0", "0"], seed());
    assert.match(text, /Apple/);
    assert.match(text, /10\.00/);
    assert.match(text, /2 record\(s\)/);
  });

  it("shows an empty state for no records", opts, async () => {
    const { text } = await runWith(["1", "2", "", "0", "0"]);
    assert.match(text, /No records found\./);
  });

  it("lists sorted when asked", opts, async () => {
    const { text } = await runWith(
      ["1", "2", "value", "desc", "0", "0"],
      seed(),
    );
    assert.ok(text.indexOf("Apple") < text.indexOf("Carrot"));
  });

  it(
    "views a record, and reports a missing one without leaving",
    opts,
    async () => {
      const { text } = await runWith(
        ["1", "3", "r1", "3", "nope", "0", "0"],
        seed(),
      );
      assert.match(text, /Category: Fruit/);
      assert.match(text, /No record with id "nope"/);
    },
  );

  it("updates only the fields that were typed", opts, async () => {
    const store = seed();
    await runWith(["1", "4", "r1", "", "", "12", "", "0", "0"], store);
    assert.equal(store.get("r1").value, 12);
    assert.equal(store.get("r1").name, "Apple");
  });

  it(
    "deletes after confirmation and keeps the record when declined",
    opts,
    async () => {
      const declined = seed();
      await runWith(["1", "5", "r1", "n", "0", "0"], declined);
      assert.equal(declined.count(), 2);

      const confirmed = seed();
      await runWith(["1", "5", "r1", "y", "0", "0"], confirmed);
      assert.equal(confirmed.count(), 1);
      assert.equal(confirmed.get("r1"), undefined);
    },
  );

  it("searches by tag", opts, async () => {
    const { text } = await runWith(["1", "6", "fresh", "0", "0"], seed());
    assert.match(text, /Apple/);
    assert.doesNotMatch(text, /Carrot/);
  });

  it("filters by value range", opts, async () => {
    const { text } = await runWith(["1", "7", "", "5", "", "0", "0"], seed());
    assert.match(text, /Apple/);
    assert.doesNotMatch(text, /Carrot/);
  });
});

describe("reportError", () => {
  it("prints each validation issue and returns true", () => {
    const lines = [];
    const out = createOutput({
      stream: { write: (c) => lines.push(c) },
      color: false,
    });
    assert.equal(
      reportError(out, new ValidationError(["a is bad", "b is bad"])),
      true,
    );
    assert.match(lines.join(""), /a is bad/);
    assert.match(lines.join(""), /b is bad/);
  });

  it("returns false for bugs and for closed input", () => {
    const out = createOutput({ stream: { write() {} }, color: false });
    assert.equal(reportError(out, new TypeError("bug")), false);
    assert.equal(reportError(out, new InputClosedError()), false);
  });
});

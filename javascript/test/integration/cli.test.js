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

// Runs the whole app against fake streams: no real terminal needed.
async function runWith(lines) {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = "";
  output.on("data", (chunk) => {
    text += chunk;
  });

  const finished = runApp({ input, output }); // starts reading immediately
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
    const { text } = await runWith(["1", "0"]);
    assert.match(text, /Manage Records is not implemented yet/);
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

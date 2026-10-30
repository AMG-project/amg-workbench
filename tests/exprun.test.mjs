/* The set, run: the two rules that are the RUN's own.

   What a verdict means moved to core/verdict.js and tests/verdict.test.mjs
   with it. These two are about the run: how much of the class it covers, and
   how hard it looks at each combination. Both were wrong when written, and
   both were wrong in the same way -- a cheaper answer that was also a
   different one.

   The run itself is covered by the page walk, which loads the worked example
   and records the tally it produces. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../docs/bench/core/expset.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

globalThis.EXPSETS = E.EXPSETS;
/* DYNAMIC import, after the globals above are in place. A static `import` is
   HOISTED: the whole graph evaluates before any statement here runs, so a
   global a test installs would arrive after the code reading it had loaded.
   Under `require` the order was the other way about. */
const R = await import("../docs/bench/page/21-exprun.js");

test("the cap is the enumeration's own, so the two cannot disagree", () => {
  assert.equal(R.XRUNCAP, E.EXPCAP,
    "a run cap below the enumeration cap would report a tally over a PREFIX of " +
    "the cross product. The first 240 of the worked example's 3,125 all carry " +
    "the default member in the leading slots, so every proposition came back " +
    "holding at 240 of 240 where the two ends of the same class break one.");
});

test("each combination gets the kernel's own proof effort, not a cheaper one", () => {
  assert.deepEqual(R.XRUNEFF, {},
    "bounded at depth 6 over 120 boxes, eight of the worked example's two-ends " +
    "combinations came back as a reported SIGN CHANGE where the full search " +
    "proves them. That is not a cheaper answer, it is a different and wrong one, " +
    "and the whole class of 3,125 runs in under a millisecond anyway.");
});

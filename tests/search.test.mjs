/* The search over a declared class.

   A declaration admits a product of configurations -- one family member per
   term, one combination rule per outcome -- and the point of declaring a class
   rather than picking a form is that the class can be searched. "Find me a
   configuration in which this proposition lives in an interaction" is a real
   question with a real answer, and the scoring axes are the language the target
   is stated in.

   What these tests are mostly about is the REPORT, not the finding. A search
   that found nothing in a class of twelve and a search that found nothing in
   the first four hundred of a million are different answers, and a tool that
   says "nothing found" for both is lying by omission. So the result carries
   `exhausted`, and the sentence it builds says which case it was.

   And the test function is the caller's. The kernel cannot see inside it, which
   is the same discipline as the lattice: propose outside, dispose inside, and
   nothing reports its own success. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../docs/bench/core/kernel.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";


const AXES = [
  { name: "t_a", choices: ["sqrt", "cbrt", "log"] },
  { name: "t_b", choices: ["quadratic", "cubic"] },
  { name: "y", choices: ["additive", "max"] },
];

test("it finds a configuration the target is satisfied in, and says where", () => {
  const r = K.searchClass(AXES, c => ({
    ok: c.y === "max" && c.t_a === "log",
    why: "the slack term can be switched off under max",
  }));
  assert.equal(r.found.length, 1);
  assert.deepEqual(r.found[0].config, { t_a: "log", t_b: "quadratic", y: "max" });
  assert.equal(r.total, 12);
  assert.match(r.why, /found 1 after \d+ of 12 configurations/);
});

test("nothing in the whole class is a different answer from nothing before the cap", () => {
  const never = () => ({ ok: false });

  const small = K.searchClass(AXES, never);
  assert.equal(small.exhausted, true, "12 configurations fit inside the default cap");
  assert.equal(small.tried, 12);
  assert.match(small.why, /nothing in the whole class satisfies it: 12 configurations searched/);

  /* The same target, a class too big to walk. The sentence has to refuse to
     generalise, because the search did not look at the class -- it looked at
     four hundred of it. */
  const big = [...Array(12)].map((_, i) => ({ name: "t" + i, choices: ["a", "b", "c"] }));
  const huge = K.searchClass(big, never, { cap: 400 });
  assert.equal(huge.exhausted, false);
  assert.equal(huge.tried, 400);
  assert.equal(huge.total, 531441);
  assert.match(huge.why, /not an answer about the class, only about what was looked at/);
});

test("it stops at the first hit unless asked for more", () => {
  const anyMax = c => ({ ok: c.y === "max" });
  assert.equal(K.searchClass(AXES, anyMax).found.length, 1);
  assert.equal(K.searchClass(AXES, anyMax, { want: 3 }).found.length, 3);
  assert.equal(K.searchClass(AXES, anyMax, { want: 99 }).found.length, 6,
    "six of the twelve use max, and it does not invent a seventh");
});

test("the order is deterministic, so a run is reproducible", () => {
  const seen = [];
  K.searchClass(AXES, c => { seen.push(c.t_a + "/" + c.t_b + "/" + c.y); return { ok: false }; });
  const again = [];
  K.searchClass(AXES, c => { again.push(c.t_a + "/" + c.t_b + "/" + c.y); return { ok: false }; });
  assert.deepEqual(seen, again);
  assert.equal(seen[0], "sqrt/quadratic/additive");
  assert.equal(seen[1], "sqrt/quadratic/max", "the last axis moves fastest");
  assert.equal(seen.length, 12);
});

test("a target that throws does not abort the search, and the reason is kept", () => {
  /* A configuration whose arithmetic will not run is a fact about that
     configuration, not a reason to stop looking at the others. */
  const r = K.searchClass(AXES, c => {
    if (c.t_a === "sqrt") throw new Error("log of a negative at the low bound");
    return { ok: c.t_a === "log" };
  });
  assert.equal(r.found.length, 1);
  assert.equal(r.found[0].config.t_a, "log");
  assert.match(r.err, /log of a negative/);
});

test("nothing declared as a class is said plainly, not reported as a failed search", () => {
  const r = K.searchClass([], () => ({ ok: true }));
  assert.equal(r.total, 0);
  assert.equal(r.tried, 0);
  assert.equal(r.exhausted, true);
  assert.match(r.why, /nothing is declared as a class/);
  const r2 = K.searchClass([{ name: "t", choices: [] }], () => ({ ok: true }));
  assert.match(r2.why, /nothing is declared as a class/);
});

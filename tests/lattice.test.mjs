/* The ablation lattice, which is the one piece of this bench with a claim of
   its own behind it.

   REPORT.md §3 lists it as ours and says it is absent from AblateCell and the
   Contagion Tensor protocol: social mechanisms substitute, so disabling them
   one at a time reports that neither mattered. In this corpus that is a count
   rather than a worry -- 82 consequents carry two or more distinct causes from
   two or more independent papers, covering 397 of 1080 claims, and 74 cases
   have an antecedent reaching a consequent BOTH directly and through a
   mediator.

   It had never returned `pair` on anything. Both seeded scenarios declare no
   substitutes and every prediction in them reaches its outcome by exactly one
   route, so the equifinal case the lattice exists for had never arisen. A
   contribution with no executable instance behind it is a sentence in a
   proposal, which is what these tests are for.

   The predicate here is the real shape of the page's: y must rise in x, AND it
   must still be moving. That second half is the subtle one. Ablate a mechanism
   out of the only path from x to y and the curve goes flat -- weakly
   increasing, so it passes "rises" while asserting nothing at all. A collapse
   has to count as a kill or the lattice reports that nothing mattered. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../docs/bench/core/kernel.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";


/* A kept arithmetic, in the shape the page keeps one: lines that say what they
   are, so a term can be switched off and the lines reading it still run. */
function model(lines, params, consts = []) {
  const scope = new Set([...params, ...consts.map(c => c.name), ...lines.map(l => l.lhs)]);
  return {
    params, consts,
    steps: lines.map(l => {
      const e = K.readExpr(l.rhs, scope);
      assert.equal(e.err, undefined, `${l.lhs} = ${l.rhs}: ${e.err}`);
      return { lhs: l.lhs, kind: l.kind, rpn: e.rpn };
    }),
  };
}

/* The page's predicate, in its essentials. */
function rises(m, x, y, bounds) {
  return off => {
    const w = K.sweepModel(m, x, y, bounds, 20, off);
    const span = Math.max(...w.ys) - Math.min(...w.ys);
    if (!(span > 1e-9)) return false;                  // it stopped moving
    for (let i = 1; i < w.ys.length; i++)
      if (w.ys[i] < w.ys[i - 1] - 1e-9) return false;  // it turned
    return true;
  };
}
const B = { x: [0, 1] };
const terms = m => m.steps.filter(s => s.kind === "term").map(s => s.lhs);
const run = m => K.ablate(terms(m), rises(m, "x", "y", B));

test("one route: the prediction belongs to that mechanism, not to the model", () => {
  const m = model([
    { lhs: "t1", kind: "term", rhs: "0.8 * x" },
    { lhs: "y", kind: "out", rhs: "t1" },
  ], ["x"]);
  const r = run(m);
  assert.equal(r.k, "single");
  assert.equal(r.s, 0.3);
  assert.deepEqual(r.off, ["t1"]);
  /* And this is the case a one-at-a-time loop gets right, which is why it is
     the baseline rather than the finding. */
});

test("two routes: it survives either alone and dies under the pair", () => {
  const m = model([
    { lhs: "t1", kind: "term", rhs: "0.5 * x" },
    { lhs: "t2", kind: "term", rhs: "0.5 * x" },
    { lhs: "y", kind: "out", rhs: "t1 + t2" },
  ], ["x"]);
  const r = run(m);
  assert.equal(r.k, "pair", "the lattice's whole reason for existing");
  assert.equal(r.s, 1);
  assert.deepEqual(r.off, ["t1 + t2"]);
  /* What a one-at-a-time loop reports on this same model: */
  const singly = terms(m).filter(t => rises(m, "x", "y", B)(new Set([t])) === false);
  assert.deepEqual(singly, [], "no single ablation moves it -- so a loop that only " +
    "ablates singly concludes that neither mechanism mattered, which is the error");
});

test("three routes: no PAIR kills it either, and the lattice says so rather than guessing", () => {
  const m = model([
    { lhs: "t1", kind: "term", rhs: "0.34 * x" },
    { lhs: "t2", kind: "term", rhs: "0.33 * x" },
    { lhs: "t3", kind: "term", rhs: "0.33 * x" },
    { lhs: "y", kind: "out", rhs: "t1 + t2 + t3" },
  ], ["x"]);
  const r = run(m);
  /* The honest answer, and the lattice's stated bound: it searches singletons
     and pairs. Triply equifinal predictions come back as "no mechanism or pair
     changes it" -- which is true, and is not the same as "nothing matters".
     `prosocial-mission -> worker-effort` is this case in the corpus: direct,
     via employee-social-identity, and via employee-social-reputation. */
  assert.equal(r.k, "none");
  assert.match(r.why, /no mechanism or pair/);
});

test("a prediction that does not hold is not attributed to anything", () => {
  const m = model([
    { lhs: "t1", kind: "term", rhs: "0.8 * x" },
    { lhs: "y", kind: "out", rhs: "1 - t1" },
  ], ["x"]);
  const r = run(m);
  assert.equal(r.k, "fails");
  assert.equal(r.s, 0);
});

test("past the cap it declines to search rather than searching badly", () => {
  const n = 21;
  const lines = [];
  for (let i = 1; i <= n; i++) lines.push({ lhs: "t" + i, kind: "term", rhs: "0.04 * x" });
  lines.push({ lhs: "y", kind: "out", rhs: Array.from({ length: n }, (_, i) => "t" + (i + 1)).join(" + ") });
  const m = model(lines, ["x"]);
  const r = run(m);
  assert.equal(r.k, "capped");
  assert.equal(r.skip, true);
  assert.match(r.why, /21 mechanisms is 210 pairs/);
});

test("switching a term off zeroes it, and the lines reading it still run", () => {
  /* This is what makes the composition rule decide what one-at-a-time ablation
     can see, so it is worth asserting directly rather than inferring. */
  const m = model([
    { lhs: "t1", kind: "term", rhs: "x" },
    { lhs: "t2", kind: "term", rhs: "0.5" },
    { lhs: "y", kind: "out", rhs: "max(t1, t2)" },
  ], ["x"]);
  const at = (p, off) => K.runModel(m, { x: p }, off);
  assert.equal(at(0.9, null).y, 0.9, "the larger term carries it");
  assert.equal(at(0.9, new Set(["t1"])).y, 0.5, "zeroed, so max falls back to the other");
  assert.equal(at(0.2, null).y, 0.5, "below the other term, max already ignores x");
  assert.equal(at(0.2, new Set(["t1"])).y, 0.5,
    "so switching it off changes nothing here -- which is how a substitute hides " +
    "from one-at-a-time ablation");
  assert.equal(at(0.9, new Set(["t1", "t2"])).y, 0, "both off, and the outcome is gone");
});

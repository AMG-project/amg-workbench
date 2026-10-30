/* The claim this bench rests on: a sign PROVED over a box, not sampled in it.

   Interval arithmetic evaluates an expression over a box and returns a range
   guaranteed to contain every value it takes there. Everything step seven says
   follows from that guarantee, and nothing checked it.

   So the central test is a soundness test, and it is the one shaped like the
   property: take an expression, enclose it over a box, then evaluate it at two
   thousand points inside that box, and every single value has to fall inside
   the enclosure. An enclosure that misses one is a proof that is not one.

   The rest follow from the same stance. A derivative is checked against a
   finite difference rather than against another symbolic engine, because the
   question is whether it is the derivative of THAT expression. `simp` has to
   preserve value, not just shorten text. And `proveSign` has to be refutable:
   where it says proved there must be no counter-example, and where it says
   partial there must be one of each sign.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../docs/bench/core/kernel.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";


const tree = (src, names) => K.rpnTree(K.readExpr(src, new Set(names)).rpn);
const at = (t, p) => { const q = {}; for (const k in p) q[k] = [p[k], p[k]];
  const iv = K.ivalTree(t, q); return iv && iv[0] != null ? (iv[0] + iv[1]) / 2 : NaN; };

/* Chosen to exercise the operators the generated arithmetic actually uses, and
   to include the awkward ones: a name occurring twice (where the dependency
   problem bites), a quotient, a nested exponential, and a max. */
const CASES = [
  ["x ** 2 + 3 * x", ["x"], {x: [0, 1]}],
  ["x * (1 - x)", ["x"], {x: [0, 1]}],
  ["x / (1 + x)", ["x"], {x: [0, 2]}],
  ["exp(-2 * x)", ["x"], {x: [0, 1]}],
  ["(1 - exp(-2 * x)) / (1 - exp(-2))", ["x"], {x: [0, 1]}],
  ["log(1 + 4 * x) / log(5)", ["x"], {x: [0, 1]}],
  ["x * x * (3 - 2 * x)", ["x"], {x: [0, 1]}],
  ["max(x, 1 - x)", ["x"], {x: [0, 1]}],
  ["min(x, y) + x * y", ["x", "y"], {x: [0, 1], y: [0, 1]}],
  ["(0.5 * x ** 2 + 0.5 * y ** 2) ** 0.5", ["x", "y"], {x: [0, 1], y: [0, 1]}],
  ["x ** 2 / (x ** 2 + (1 - x) ** 2)", ["x"], {x: [0, 1]}],
];

const draws = (box, n) => {
  const ks = Object.keys(box), out = [];
  for (let i = 0; i < n; i++) {
    const p = {};
    ks.forEach((k, j) => {
      const t = i < (1 << ks.length) ? ((i >> j) & 1) : Math.random();
      p[k] = box[k][0] + t * (box[k][1] - box[k][0]);
    });
    out.push(p);
  }
  return out;
};

test("an enclosure contains every value the expression takes in the box", () => {
  for (const [src, names, box] of CASES) {
    const t = tree(src, names);
    const iv = K.ivalTree(t, box);
    assert.ok(iv && iv[0] != null, `${src}: no enclosure at all`);
    for (const p of draws(box, 2000)) {
      const y = at(t, p);
      if (!Number.isFinite(y)) continue;
      assert.ok(y >= iv[0] - 1e-9 && y <= iv[1] + 1e-9,
        `${src}: ${y} at ${JSON.stringify(p)} is outside [${iv[0]}, ${iv[1]}]`);
    }
  }
});

test("a derivative is the derivative of that expression", () => {
  const h = 1e-6;
  for (const [src, names, box] of CASES) {
    if (src.includes("max(") || src.includes("min(")) continue;   // corners
    const t = tree(src, names);
    for (const x of names) {
      const d = K.simp(K.dTree(t, x));
      if (d.t === "nd") continue;
      for (const p of draws(box, 40).slice(1 << names.length)) {
        const lo = {...p, [x]: p[x] - h}, hi = {...p, [x]: p[x] + h};
        const fd = (at(t, hi) - at(t, lo)) / (2 * h);
        const sym = at(d, p);
        if (!Number.isFinite(fd) || !Number.isFinite(sym)) continue;
        assert.ok(Math.abs(fd - sym) <= 1e-4 * Math.max(1, Math.abs(sym)),
          `d(${src})/d${x} at ${JSON.stringify(p)}: symbolic ${sym}, finite difference ${fd}`);
      }
    }
  }
});

test("simplifying preserves value", () => {
  for (const [src, names, box] of CASES) {
    const t = tree(src, names), u = K.simp(t);
    for (const p of draws(box, 200)) {
      const a = at(t, p), b = at(u, p);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)),
        `${src} -> ${K.treeText(u)}: ${a} vs ${b}`);
    }
  }
});

test("a variable exponent returns no enclosure, rather than a wrong one", () => {
  /* The documented limit, and the reason rho has to be a number: the power
     rule refuses an exponent that is not a point, instead of guessing. */
  const t = tree("p ** r", ["p", "r"]);
  assert.deepEqual(K.ivalTree(t, {p: [1, 2], r: [1, 4]}), K.IBAD);
  const fixed = K.ivalTree(t, {p: [1, 2], r: [2, 2]});
  assert.deepEqual(fixed, [1, 4]);
});

test("proved means there is no counter-example, and partial means there is", () => {
  /* NOT the smoothstep: its derivative is 6x(1-x), which is zero at BOTH ends
     of [0, 1], so the honest verdict there is partial and not proved. That is
     the code being right and the first version of this test being wrong. The
     saturating exponential is strictly positive throughout. */
  const up = K.simp(K.dTree(tree("(1 - exp(-2 * x)) / (1 - exp(-2))", ["x"]), "x"));
  const box = {x: [0, 1]};
  const r = K.proveSign(up, box, 1, {});
  assert.equal(r.verdict, "proved");
  for (const p of draws(box, 1000))
    assert.ok(at(up, p) >= -1e-12, `proved positive, but ${at(up, p)} at x=${p.x}`);

  /* max(x, 1-x) has its minimum at the crossing, so the derivative of
     x * (1 - x) turns inside the box: the honest verdict is partial. */
  const turns = K.simp(K.dTree(tree("x * (1 - x)", ["x"]), "x"));
  const q = K.proveSign(turns, box, 1, {});
  assert.equal(q.verdict, "partial");
  assert.ok(q.share > 0 && q.share < 1, `share ${q.share} is not a partition`);
  assert.ok(q.witness, "a partial verdict has to name where it fails");
  assert.ok(at(turns, q.witness) <= 1e-12,
    `the witness at ${JSON.stringify(q.witness)} is not a counter-example`);
});

test("a derivative that never leaves zero is not a sign in either direction", () => {
  /* The defect this verdict exists for. `sgn` inside proveSign is weak on
     purpose -- a derivative that is mathematically positive can enclose a
     shade below zero, and discarding that would lose most of what interval
     arithmetic can deliver -- but weak passes `want > 0` and `want < 0`
     alike for a derivative that is identically zero. So "y rises with x",
     and "y falls as x rises", were both returned with a share of 1 for a
     quantity the outcome does not move with at all.

     The two-channel model has exactly one: principal costs are shielded off
     the control channel, so d B / d principal_competence simplifies to 0.
     The old engine called that proved to rise. */
  const box = {x: [0, 1], k: [0, 1]};
  const flat = K.simp(K.dTree(tree("k * (x - x)", ["x", "k"]), "x"));
  assert.equal(K.treeText(flat), "0", "the simplifier did not reduce it, so this tests nothing");
  for (const want of [1, -1]) {
    const r = K.proveSign(flat, box, want, {});
    assert.equal(r.verdict, "flat", `want ${want} did not come back flat`);
    assert.equal(r.zeroShare, 1);
    assert.equal(r.share, 1, "share still means what it meant before, so callers are unchanged");
  }
  /* And a derivative that is positive is still proved, not swallowed by the
     new branch: zeroShare separates them. */
  const up = K.simp(K.dTree(tree("k * x", ["x", "k"]), "x"));
  const g = K.proveSign(up, {x: [0, 1], k: [1, 2]}, 1, {});
  assert.equal(g.verdict, "proved");
  assert.equal(g.zeroShare, 0);
});

test("a corner only resolves where one side dominates the whole box", () => {
  const t = tree("max(a, b)", ["a", "b"]);
  const clear = K.mmResolve(t, {a: [0, 1], b: [2, 3]});
  assert.ok(clear.ok, "b is above a everywhere and should have resolved");
  assert.equal(K.treeText(clear.tree), "b");
  const crosses = K.mmResolve(t, {a: [0, 2], b: [1, 3]});
  assert.ok(!crosses.ok, "they cross, and pretending otherwise is the whole hazard");
  assert.equal(crosses.open.length, 1);
});

test("a constant in a crossing is not a dimension of it", () => {
  /* Whether one cut can separate a crossing depends on how many dimensions the
     two sides vary over, and the advice used to count how many NAMES they
     mention. The first real model with a ceiling in it mentions six --
     `chi_0 + chi_pi * pi + chi_alpha * alpha` against `ceil_shareholders` --
     of which four are declared constants and one was a parameter the scholar
     had pinned to a point. The crossing is a line in pi, and the page said it
     was a surface and that splitting was right to refuse.

     A declared interval of width zero is a constant and not an unknown, which
     is the rule the SymPy export already states; this is it applied where it
     changes what a reader is told to do. */
  const t = tree("min(c0 + cp * x, ceil)", ["x", "c0", "cp", "ceil"]);
  const pin = {c0: [0.22, 0.22], cp: [0.45, 0.45], ceil: [0.55, 0.55]};

  const one = {x: [0, 1], ...pin};
  const r1 = K.mmResolve(t, one);
  assert.equal(r1.open.length, 1, "the two do cross over this range");
  assert.match(K.mmWhy(r1, one), /SPLIT it along x\b/,
    "one name has width, so one cut separates it");
  assert.deepEqual(K.mmSpread(r1.open[0], one, "x"), [],
    "and nothing else has to be held anywhere");

  /* Two names with width is a surface, and refusing is right. */
  const t2 = tree("min(c0 + cp * x + ca * y, ceil)", ["x", "y", "c0", "cp", "ca", "ceil"]);
  const two = {x: [0, 1], y: [0, 1], ca: [0.34, 0.34], ...pin};
  const r2 = K.mmResolve(t2, two);
  assert.equal(r2.open.length, 1);
  assert.doesNotMatch(K.mmWhy(r2, two), /SPLIT it along/,
    "two dimensions cannot be separated by one cut");
  assert.deepEqual(K.mmSpread(r2.open[0], two, "x"), ["y"],
    "and y is what would have to be held to make the cut");

  /* Pin that second one and the same crossing becomes splittable again, which
     is exactly the move the message tells the reader to make. */
  const pinned = {...two, y: [0.2, 0.2]};
  const r3 = K.mmResolve(t2, pinned);
  assert.equal(r3.open.length, 1, "it still crosses at y = 0.2");
  assert.match(K.mmWhy(r3, pinned), /SPLIT it along x\b/);
});

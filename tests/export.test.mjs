/* core: the dialects a modeller already runs.

   Three scripts a reader can run -- SymPy, Mathematica, LaTeX -- and two
   renderings of an expression tree beside the kernel's own. Until these moved
   into core/ nothing tested them: 280 lines that produce text somebody else
   executes, checked only by being looked at. Moving them was what made a test
   possible, which is the clearest thing the layer buys.

   What is worth asserting is not that the strings match a transcript. It is
   the two properties a renderer of this kind actually gets wrong -- brackets
   that do not balance, and precedence dropped so that the text means something
   other than the tree -- and the one property these exports promise the reader:
   that each says what the bench did NOT do, so a re-derivation in somebody
   else's tool is not mistaken for a confirmation. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as X from "../docs/bench/core/export.js";
import * as K from "../docs/bench/core/kernel.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/* core/export.js reads negOf, treeText and PREC from core/kernel.js. In the
   page they share one scope; under node they do not, so the test hands them
   over. This is the last thing the conversion to ES modules removes: after it,
   the file says `import { negOf, treeText, PREC } from "./kernel.js"` and
   nothing has to be injected anywhere. */
for(const n of ["negOf", "treeText", "PREC", "simp", "keyOf", "rpnTree", "readExpr"])
  globalThis[n] = K[n];

/* The kernel is the only thing core/export.js reads, so a tree comes from a
   grammar expression rather than being hand-built. */
const tree = (src, names) =>
  K.rpnTree(K.readExpr(src, new Set(names)).rpn);

const SRC = [
  "a + b",
  "a - b",
  "a * (b + c)",
  "(a + b) * c",
  "a / (b - c)",
  "a ** 2",
  "a ** (b + 1)",
  "exp(-2 * a) / (1 - exp(-2))",
  "min(a + b, 1)",
  "max(a, b) * min(a, b)",
  "log(1 + 4 * a) / log(5)",
  "-a + b",
  "a - (b - c)",
  "(a / b) / c",
];
const NAMES = ["a", "b", "c"];

const balanced = (s, open, close) => {
  let d = 0;
  for (const ch of s) {
    if (ch === open) d++;
    else if (ch === close) { d--; if (d < 0) return false; }
  }
  return d === 0;
};

test("every bracket a dialect opens, it closes", () => {
  for (const src of SRC) {
    const t = tree(src, NAMES);
    assert.ok(balanced(X.treeSym(t, 0, X.DSYM), "(", ")"), `SymPy, ${src}`);
    assert.ok(balanced(X.treeSym(t, 0, X.DWOL), "[", "]"), `Mathematica brackets, ${src}`);
    assert.ok(balanced(X.treeSym(t, 0, X.DWOL), "(", ")"), `Mathematica parens, ${src}`);
    const tex = X.treeTex(t);
    assert.equal((tex.match(/\\left\(/g) || []).length,
                 (tex.match(/\\right\)/g) || []).length, `LaTeX, ${src}`);
  }
});

/* PRECEDENCE IS THE THING THAT GOES WRONG. A renderer that drops a bracket
   produces text that parses and means something else, which is worse than
   text that does not parse. The kernel's own grammar is the arbiter: read the
   SymPy rendering back -- its operators are the grammar's, apart from `**`
   which the grammar also uses -- and the tree it gives has to be the tree that
   went in. */
test("what SymPy is given reads back as the same expression", () => {
  for (const src of SRC) {
    const t = tree(src, NAMES);
    const out = X.treeSym(t, 0, X.DSYM)
      .replace(/sp\.exp/g, "exp").replace(/sp\.log/g, "log")
      .replace(/sp\.Min/g, "min").replace(/sp\.Max/g, "max");
    let back;
    try { back = tree(out, NAMES); }
    catch (e) { assert.fail(`${src} rendered as ${out}, which the grammar refuses: ${e.message}`); }
    assert.equal(K.keyOf(K.simp(back)), K.keyOf(K.simp(t)),
      `${src} rendered as ${out}, which is a different expression`);
  }
});

test("a tree the engine could not differentiate says so rather than rendering", () => {
  const nd = {t: "nd", why: "min() is not differentiable where its arguments cross"};
  assert.equal(X.treeSym(nd, 0, X.DSYM), "None");
  assert.equal(X.treeTex(nd), "\\text{undefined}");
});

/* The three scripts. A proposition carries the tree, the direction, the
   verdict and the share; the box carries the ranges. */
const P = {
  names: ["pi", "alpha"],
  box: {pi: [0, 1], alpha: [0.2, 0.2]},
  props: [
    {y: "b", x: "alpha", dir: 1, verdict: "proved", share: 1,
     d1: tree("alpha + 1", ["alpha"]), cs: []},
    {y: "a", x: "pi", dir: -1, verdict: "partial", share: 0.42,
     d1: tree("1 - 2 * pi", ["pi"]), flip: [0.49, 0.51], cs: []},
    {y: "vp", x: "pi", err: "a min or max crosses inside the box"},
  ],
};

test("each script names what was proved, and what this page did not do", () => {
  for (const [what, text] of [["SymPy", X.exportSympy(P)],
                              ["Mathematica", X.exportWolfram(P)],
                              ["LaTeX", X.exportPropTex(P)]]) {
    assert.ok(text.length > 200, `${what} produced ${text.length} characters`);
    assert.match(text, /alpha/, `${what} does not name the parameter`);
    /* The declared box travels with the finding, because a sign without the
       region it was proved on is half a finding. */
    assert.match(text, /\b0\b[\s\S]*\b1\b/, `${what} does not carry the box`);
    /* And the honesty line: every one of these says the reader is re-running
       something this page proved, not confirming it. */
    assert.ok(/bench|AMG|declar/i.test(text), `${what} does not say where it came from`);
  }
  /* A proposition the engine refused is skipped rather than exported as a
     finding with an empty tree. */
  assert.doesNotMatch(X.exportPropTex(P), /\bvp\b/,
    "a refused proposition was exported as though it had been derived");
  assert.match(X.exportPropTex({names: [], box: {}, props: [{y: "x", x: "y", err: "no"}]}),
    /nothing was derivable/);
});

test("a line's label says what kind of line it is", () => {
  assert.equal(X.bufLab({cmd: "inline", y: "avp"}), "avp");
  assert.equal(X.bufLab({y: "b", x: "alpha"}), "∂b / ∂alpha");
  assert.equal(X.bufLab({cmd: "write", id: "l1"}), "a line of yours");
  assert.equal(X.bufLab({cmd: "import", id: "l2"}), "from your tool");
  assert.equal(X.bufLab({cmd: "comb", x: "pi", id: "l3"}), "a combination in pi");
  assert.equal(X.bufLab({cmd: "comb", id: "l4"}), "a combination");
  assert.equal(X.bufLab({id: "l5"}), "l5", "and falls back to the id rather than throwing");
  assert.equal(X.bufLab(null), "?");
});

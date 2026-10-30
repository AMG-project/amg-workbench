/* core: how a candidate finding is scored and ordered.

   This is the file a scholar replaces if they disagree with what the bench
   calls interesting, so what it does has to be legible from its behaviour and
   not only from its source. Four quantities, a weighted mean of them, and a
   requirement list that rules a candidate out rather than scoring it down.

   Two properties carry the weight here. The score is a weighted MEAN, so it
   stays on the same scale whatever weights somebody writes and two rules can
   be compared; and a requirement is a gate rather than a penalty, so a
   candidate that fails one sorts below every candidate that passes, however
   good the rest of it is. Both are choices rather than consequences, which is
   why they are asserted.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../docs/bench/core/rank.js";

/* A candidate, in the shape the page builds: four scored quantities, each
   with a 0-to-1 score and `material` also carrying a pass. */
const cand = (id, m, n, c, b, extra) => Object.assign({
  id, material: {s: m, ok: m >= 1}, novel: {s: n}, comp: {s: c}, robust: {s: b},
}, extra || {});

const RULE = (w, require) => ({weights: w, require: require || [], note: "",
  unreachable: [], declared: true});

test("the default rule weights the four equally and declares nothing", () => {
  const r = R.RULE0();
  assert.deepEqual(r.weights, {material: 1, novel: 1, composition: 1, robust: 1});
  assert.deepEqual(r.require, []);
  assert.equal(r.declared, false,
    "the default is not a declaration: a rule nobody wrote should not read as one");
  /* theRule falls back to it, and SCORE.rule is what a scholar writes. */
  assert.equal(R.theRule().declared, false);
  R.SCORE.rule = RULE({material: 2, novel: 0, composition: 0, robust: 0});
  assert.equal(R.theRule().weights.material, 2);
  R.SCORE.rule = null;
});

test("the score is a weighted MEAN, so two rules can be compared", () => {
  const rows = [cand("a", 1, 1, 1, 1), cand("b", 0, 0, 0, 0)];
  R.rankBy(rows, RULE({material: 1, novel: 1, composition: 1, robust: 1}));
  assert.equal(rows.find(r => r.id === "a").total, 1);
  assert.equal(rows.find(r => r.id === "b").total, 0);

  /* Ten times the weights is the same score. A sum would have been ten times
     the number, and a scholar comparing their rule against the default would
     have been comparing scales. */
  const again = [cand("a", 1, 1, 1, 1)];
  R.rankBy(again, RULE({material: 10, novel: 10, composition: 10, robust: 10}));
  assert.equal(again[0].total, 1);

  /* And a rule that weights nothing scores nothing rather than dividing by
     zero, which is the arithmetic a hand-written rule reaches first. */
  const none = [cand("a", 1, 1, 1, 1)];
  R.rankBy(none, RULE({}));
  assert.equal(none[0].total, 0);
});

test("one weight at a time reads off the quantity it names", () => {
  for (const [key, at] of [["material", 0], ["novel", 1],
                           ["composition", 2], ["robust", 3]]) {
    const vals = [0.25, 0.5, 0.75, 1];
    const rows = [cand("x", ...vals)];
    R.rankBy(rows, RULE({[key]: 1}));
    assert.equal(rows[0].total, vals[at],
      `a rule weighting only ${key} should score only ${key}`);
  }
});

test("a requirement is a gate, not a penalty", () => {
  /* `b` is better on everything the rule scores and fails the one thing it
     requires. It has to sort last, not merely lower. */
  const rows = [cand("a", 1, 0.1, 0.1, 0.1), cand("b", 0, 1, 1, 1)];
  R.rankBy(rows, RULE({novel: 1, composition: 1, robust: 1}, ["material"]));
  assert.equal(rows[0].id, "a");
  assert.equal(rows[1].id, "b");
  assert.equal(rows[1].total, -1);
  assert.equal(rows[1].ruledOut, true,
    "a candidate ruled out has to say so, or the row reads as a low score");
  assert.equal(rows[0].ruledOut, false);
});

test("each requirement reads its own quantity, and novel wants a full score", () => {
  /* The three scored requirements pass at 1 and fail below it, which is the
     one place the gate is not simply "ok": a half-novel finding is one the
     literature half-asserts already. */
  for (const req of ["novel", "composition", "robust"]) {
    const pass = [cand("p", 1, 1, 1, 1)];
    R.rankBy(pass, RULE({material: 1}, [req]));
    assert.notEqual(pass[0].total, -1, `${req} at 1 should pass`);
    const fail = [cand("f", 1, 0.99, 0.99, 0.99)];
    R.rankBy(fail, RULE({material: 1}, [req]));
    assert.equal(fail[0].total, -1, `${req} below 1 should not pass`);
  }
  /* material is the exception: it carries a pass of its own, so the gate
     reads that rather than the score. */
  const odd = [cand("m", 0, 1, 1, 1, {material: {s: 1, ok: false}})];
  R.rankBy(odd, RULE({novel: 1}, ["material"]));
  assert.equal(odd[0].total, -1,
    "material's gate is its own pass, not its score");
});

test("a skipped candidate is set aside rather than scored", () => {
  const rows = [cand("a", 1, 1, 1, 1), Object.assign(cand("s", 1, 1, 1, 1), {skip: true})];
  R.rankBy(rows, RULE({material: 1, novel: 1, composition: 1, robust: 1}));
  assert.equal(rows[0].id, "a");
  assert.equal(rows[1].total, -1);
  assert.equal(rows[1].ruledOut, undefined,
    "skipped is not ruled out: nothing judged it, so the row should not say it was");
});

test("the four axes and the three search targets are named for a reader", () => {
  assert.equal(R.SAXES.length, 4);
  assert.deepEqual(R.SAXES.map(a => a[0]),
    ["material", "novel", "composition", "robust"]);
  for (const [k, short, why] of R.SAXES) {
    assert.ok(short.length > 8, `${k} has no short label`);
    assert.ok(why.length > 30, `${k} does not say what it means`);
  }
  assert.deepEqual(R.STARGETS.map(t => t[0]), ["proved", "interaction", "breaks"]);
  for (const [k, short, why] of R.STARGETS) {
    assert.ok(short.length > 8 && why.length > 40, `${k} is not explained`);
  }
});

test("a line is a candidate only once it says a direction", () => {
  assert.equal(R.lineCandidate(null), null);
  assert.equal(R.lineCandidate({y: "a"}), null, "and only with both ends");
  assert.equal(R.lineCandidate({y: "a", x: "b"}), null,
    "an unsigned line is refused by name rather than scored at zero");
  const proved = R.lineCandidate({id: "l1", y: "b", x: "alpha",
    res: {dir: 1, verdict: "proved", share: 1}});
  assert.equal(proved.form, "up");
  assert.equal(proved.for, "b rises in alpha");
  assert.equal(proved.verdict, "proved");
  const fell = R.lineCandidate({id: "l2", y: "a", x: "alpha",
    res: {dir: -1, verdict: "proved", share: 1}});
  assert.equal(fell.for, "a falls in alpha");
  /* A sampled line is a candidate and says so, because the method is half of
     what a reader weighs. */
  const sampled = R.lineCandidate({id: "l3", y: "b", x: "pi", sim: {dir: 1, share: 0.9}});
  assert.equal(sampled.verdict, "sampled");
  assert.match(sampled.why, /sampled rather than proved/);
  /* And a flat verdict has no direction, so it is not a comparative static
     and not a candidate. */
  assert.equal(R.lineCandidate({id: "l4", y: "b", x: "pc",
    res: {dir: 0, verdict: "flat", share: 1}}), null);
});

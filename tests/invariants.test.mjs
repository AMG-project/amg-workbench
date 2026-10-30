/* core: the invariants, run.

   262 lines that decide the verdict a reader sees beside every kept model --
   "arithmetic holds 4 of 4" -- and until this file nothing exercised them at
   all. Not the page walk, not the hostile scenario: neither does anything
   that calls checkArith, so it moved into core/ with no coverage whatever and
   two missing imports that would have thrown on the first call.

   What is asserted here is each verdict FAILING. A check that only ever
   passes proves nothing, and these are checks: every one of them has a model
   below that breaks it, and the row has to say which and why.

   The models are built here rather than taken from the corpus, which is the
   point of the declarations riding on the model: checkArith asks `M.decl` and
   `M.decl` is whatever this file says it is.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../docs/bench/core/kernel.js";
import * as I from "../docs/bench/core/invariants.js";

/* A model from lines, with declarations of the test's own choosing.
   `lines` is [lhs, rhs, kind, relId]; `rel` maps a relation id to its ends. */
function model(params, lines, opts) {
  const o = opts || {};
  const scope = new Set(params);
  const rels = (o.rels || []).slice();
  const steps = lines.map(([lhs, rhs, kind, relId]) => {
    const e = K.readExpr(rhs, scope);
    scope.add(lhs);
    return {lhs, rpn: e.rpn, py: e.py, uses: e.uses, kind: kind || "local",
            /* `key` is what buildArith puts on an outcome step, and
               declared_mechanisms_used finds the step BY it. Leaving it off
               made that check skip without a word and pass vacuously, which
               is worth knowing about a test model: an incomplete one does not
               fail, it agrees. */
            key: kind === "out" ? lhs : undefined,
            rel: relId ? rels.find(r => r.id === relId) : null, why: ""};
  });
  const B = Object.assign({}, o.bounds);
  const outs = lines.filter(l => l[2] === "out").map(l => l[0]);
  return {
    consts: o.consts || [], steps, bad: [], miss: [], params,
    rels, nm: new Map(rels.map(r => [r.id, r.id])), outs,
    // the term each relation is carried by, as buildArith names them
    terms: new Map(rels.map(r => [r.id, "t_" + r.id])),
    decl: {
      name: k => k,
      bounds: k => B[k] || [0, 1],
      bounded: k => Object.prototype.hasOwnProperty.call(B, k),
      kinds: k => (o.kinds || {})[k] || [],
      aspects: k => (o.aspects || {})[k] || [],
      roles: r => (o.roles || {})[r.id] || [],
      props: r => (o.props || {})[r.id] || [],
      vars: () => params.concat(outs),
      mech: rs => new Map(rs.map(r => [r.id, r.id])),
      substitutes: () => o.substitutes || [],
    },
  };
}
const row = (out, k) => out.rows.find(r => r.k === k);
const REL = [{id: "a", from: "pi", to: "y"}, {id: "b", from: "cost", to: "y"}];
const SAT = "(1 - exp(-2 * pi)) / (1 - exp(-2))";

/* The model every failure below is a mutation of: two mechanisms writing one
   outcome, the first declared increasing, both bounded. */
const GOOD = () => model(["pi", "cost"], [
  ["t_a", SAT, "term", "a"],
  ["t_b", "cost * 0.5", "term", "b"],
  ["y", "t_a - t_b", "out", null],
], {rels: REL, bounds: {pi: [0, 1], cost: [0, 1], y: [-1, 1]},
    props: {a: ["increasing"]}});

test("a model that holds, holds — and says what it ran over", () => {
  const out = I.checkArith(GOOD(), {checks: []});
  assert.equal(out.fail, 0, JSON.stringify(out.rows.filter(r => r.verdict === "fail")));
  assert.ok(out.pass >= 5, `only ${out.pass} invariants fired`);
  /* The sampling is seeded, so the same curation gives the same verdicts on
     anybody's machine. That is the whole reason it is not Math.random. */
  const again = I.checkArith(GOOD(), {checks: []});
  assert.deepEqual(again.rows.map(r => [r.k, r.verdict, r.why]),
                   out.rows.map(r => [r.k, r.verdict, r.why]));
  assert.match(row(out, "numbers_are_numbers").why, /points in the declared parameter box/);
});

test("an outcome that is not a number fails, and the row names where", () => {
  const M = model(["pi"], [
    ["t_a", SAT, "term", "a"],
    ["y", "t_a / (pi - pi)", "out", null],
  ], {rels: [{id: "a", from: "pi", to: "y"}], bounds: {pi: [0, 1], y: [0, 1]}});
  const r = row(I.checkArith(M, {checks: []}), "numbers_are_numbers");
  assert.equal(r.verdict, "fail");
  assert.match(r.why, /returned something that is not a number/);
  assert.match(r.why, /\by\b/, "and says which outcome");
});

test("an outcome outside its declared bounds fails, and quotes the value", () => {
  const M = model(["pi"], [
    ["t_a", SAT, "term", "a"],
    ["y", "t_a * 10", "out", null],
  ], {rels: [{id: "a", from: "pi", to: "y"}], bounds: {pi: [0, 1], y: [0, 1]}});
  const r = row(I.checkArith(M, {checks: []}), "within_bounds");
  assert.equal(r.verdict, "fail");
  assert.match(r.why, /reaches/);
  assert.match(r.why, /outside \[0, 1\]/);
});

test("nothing bounded is a SKIP, and says the 0 to 1 is a default", () => {
  /* The distinction this bench exists for: holding arithmetic to a range
     nobody declared would make a decision nobody took into a result. */
  const M = model(["pi"], [
    ["t_a", SAT, "term", "a"],
    ["y", "t_a", "out", null],
  ], {rels: [{id: "a", from: "pi", to: "y"}]});
  const r = row(I.checkArith(M, {checks: []}), "within_bounds");
  assert.equal(r.verdict, "skip");
  assert.match(r.why, /no outcome carries a bound anybody declared/);
  assert.match(r.why, /this page's default/);
});

test("a relation declared increasing whose term falls, fails", () => {
  const M = model(["pi", "cost"], [
    ["t_a", "1 - " + SAT, "term", "a"],
    ["t_b", "cost * 0.5", "term", "b"],
    ["y", "t_a + t_b", "out", null],
  ], {rels: REL, bounds: {pi: [0, 1], cost: [0, 1], y: [0, 2]},
      props: {a: ["increasing"]}});
  const r = row(I.checkArith(M, {checks: []}), "monotone_in");
  assert.equal(r.verdict, "fail");
  assert.match(r.why, /pi/);
});

test("a term that moves nothing fails the ablation, which is its premise", () => {
  /* Switching a mechanism off has to move what it writes, or the ablation the
     whole method rests on is measuring nothing. */
  const M = model(["pi", "cost"], [
    ["t_a", SAT, "term", "a"],
    ["t_b", "cost * 0.5", "term", "b"],
    ["y", "t_a + t_b * 0", "out", null],
  ], {rels: REL, bounds: {pi: [0, 1], cost: [0, 1], y: [0, 2]}});
  const r = row(I.checkArith(M, {checks: []}), "ablation_bites");
  assert.equal(r.verdict, "fail");
  assert.match(r.why, /t_b|\bb\b/);
});

test("an outcome that ignores a declared mechanism fails", () => {
  const M = model(["pi", "cost"], [
    ["t_a", SAT, "term", "a"],
    ["t_b", "cost * 0.5", "term", "b"],
    ["y", "t_a", "out", null],
  ], {rels: REL, bounds: {pi: [0, 1], cost: [0, 1], y: [0, 1]}});
  const out = I.checkArith(M, {checks: []});
  const r = row(out, "declared_mechanisms_used");
  assert.equal(r.verdict, "fail");
  assert.match(r.why, /t_b|\bb\b/);
});

test("a propensity outside the unit interval fails", () => {
  const M = model(["pi"], [
    ["t_a", SAT, "term", "a"],
    ["y", "t_a * 3", "out", null],
  ], {rels: [{id: "a", from: "pi", to: "y"}],
      bounds: {pi: [0, 1]}, kinds: {y: ["propensity"]}});
  const r = row(I.checkArith(M, {checks: []}), "propensity_in_unit");
  assert.equal(r.verdict, "fail");
  assert.match(r.why, /reaches/);
});

test("a difference that is not zero at the baseline fails", () => {
  const M = model(["pi"], [
    ["t_a", SAT, "term", "a"],
    ["y", "t_a + 1", "out", null],
  ], {rels: [{id: "a", from: "pi", to: "y"}],
      bounds: {pi: [0, 1], y: [0, 2]}, aspects: {y: ["difference"]}});
  const r = row(I.checkArith(M, {checks: []}), "zero_at_baseline");
  assert.equal(r.verdict, "fail");
});

test("an agreed check that will not run is recorded as skipped, not as passed", () => {
  /* A check somebody accepted and the page cannot evaluate must not read as
     one that held. */
  const out = I.checkArith(GOOD(), {checks: [{y: "y", expr: "nosuchname > 0",
    why: "proposed and unevaluable"}]});
  const agreed = out.rows.filter(r => r.k.startsWith("agreed:"));
  assert.equal(agreed.length, 1);
  assert.equal(agreed[0].verdict, "skip");
  assert.match(agreed[0].why, /not run/);
  assert.match(agreed[0].why, /proposed and unevaluable/, "and keeps the reason given");
});

test("the tally counts what the rows say", () => {
  const out = I.checkArith(GOOD(), {checks: []});
  assert.equal(out.pass, out.rows.filter(r => r.verdict === "pass").length);
  assert.equal(out.fail, out.rows.filter(r => r.verdict === "fail").length);
  assert.equal(out.skip, out.rows.filter(r => r.verdict === "skip").length);
  assert.equal(out.pass + out.fail + out.skip, out.rows.length,
    "every row is one of the three, or the header over-counts");
});

/* The measure behind step 1.2's slider.

   Three ways to score a pair, one threshold. What is worth testing is not the
   arithmetic -- readExpr and evalRPN are tested where they live -- but the two
   places where this could quietly lie to a curator:

     a formula is read against a CLOSED list of seven names, so a typo is
     refused by name instead of silently reading as zero and merging nothing;

     a judgement that names a construct which is not on the page is COUNTED
     and not written, which is the rule every other proposal on this bench is
     held to.

   The scoring itself is checked at the one place it is easy to get wrong: a
   pair whose words never matched but whose signature agrees completely, which
   is the pair the shipped wording list cannot see at all. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../docs/bench/core/kernel.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/* The page is one shared scope and this file reads the kernel's two readers
   straight off it. Node gives every file its own, so the scope is reproduced
   here rather than teaching the page script about require(): the page is the
   thing under test, and it should not carry code that only a test runs. */
globalThis.readExpr = K.readExpr;
globalThis.evalRPN = K.evalRPN;
/* DYNAMIC import, after the globals below are in place.

   A static `import` is HOISTED: the whole module graph evaluates before any
   statement in this file runs, so a global a test installs would arrive after
   the code that reads it had already loaded. Under `require` the order was
   the other way about, which is why this changes with the conversion and not
   before. */
const S = await import("../docs/bench/core/similarity.js");

/* Two constructs out of the corpus's own shape: level, scale, bearer, stock or
   flow, and the papers that assert them. */
const A = {i:"stakeholder-voice", l:"firm", s:"ordinal", b:"stakeholder", f:"s",
           p:["020-durand", "026-gartenberg"]};
const B = {i:"employee-say",      l:"firm", s:"ordinal", b:"stakeholder", f:"s",
           p:["026-gartenberg"]};
const C = {i:"firm-performance",  l:"firm", s:"ratio",   b:"firm",        f:"f",
           p:["020-durand"]};

test("a signature that agrees completely is visible to a formula when the wording is not", () => {
  const same = S.simInputsOf(A, B, 0);       // the wording never scored this pair
  assert.equal(same.word, 0);
  assert.equal(same.sig, 1);                 // level, scale, bearer and flow all agree
  assert.equal(same.papers, 1);

  const apart = S.simInputsOf(A, C, 0);
  assert.equal(apart.level, 1);              // both sit at the firm
  assert.equal(apart.scale, 0);
  assert.equal(apart.bearer, 0);
  assert.equal(apart.sig, 0.25);
});

test("the measure starts as the shipped one, so choosing it changes nothing by itself", () => {
  assert.equal(S.SIM.form, "word");
});

test("a fourth power pays only where the whole signature agrees", () => {
  /* The suggested edit. sig ** 4 is the difference between rewarding a full
     signature match and rewarding two fields out of four -- 0.5 ** 4 is
     0.0625, which is the point. `0.6 * word + 0.4 * sig` was measured on the
     seeded corpus and leaves one group out of 139. */
  const f = {src:"", rpn:K.readExpr("word + 0.1 * sig ** 4", S.SIMSET).rpn};
  const hi = S.simScoreOf(S.simInputsOf(A, B, 0), f);   // all four agree
  const lo = S.simScoreOf(S.simInputsOf(A, C, 0), f);   // one of four
  assert.equal(hi.toFixed(4), "0.1000");
  assert.equal(lo.toFixed(4), "0.0004");
  assert.ok(hi > lo * 200);
});

test("a name that is not one of the seven is refused by name, not read as zero", () => {
  assert.throws(() => K.readExpr("0.5 * word + 0.5 * signature", S.SIMSET),
    /"signature" is not a declared name/);
  // and the seven that are declared all parse
  for(const [n] of S.SIMNAMES)
    assert.ok(K.readExpr(n + " * 1", S.SIMSET).rpn.length > 0, n);
});

test("a judgement naming a construct that is not in scope is counted, not written", () => {
  const inv = new Set(["stakeholder-voice", "employee-say", "firm-performance"]);
  const got = S.simTake({pairs:[
    {a:"stakeholder-voice", b:"employee-say",   score:0.9,  why:"one instrument would measure both"},
    {a:"stakeholder-voice", b:"a-construct-it-invented", score:0.8, why:"plausible and absent"},
    {a:"firm-performance",  b:"firm-performance", score:1,  why:"itself"},
    {a:"employee-say",      b:"firm-performance", score:"high", why:"not a number"}
  ]}, inv);

  assert.equal(got.pairs.length, 1);
  assert.equal(got.pairs[0].a, "stakeholder-voice");
  assert.equal(got.pairs[0].s, 0.9);
  assert.equal(got.refused.length, 3);       // invented, self-paired, unscored
});

test("a score outside the scale is clamped, because the scale is the page's and the pair is still a judgement", () => {
  const inv = new Set(["stakeholder-voice", "employee-say"]);
  const got = S.simTake({pairs:[
    {a:"stakeholder-voice", b:"employee-say", score:7, why:"very sure"}
  ]}, inv);
  assert.equal(got.pairs[0].s, 1);
});

test("the same pair twice is one pair, whichever order it arrives in", () => {
  const inv = new Set(["stakeholder-voice", "employee-say"]);
  const got = S.simTake({pairs:[
    {a:"stakeholder-voice", b:"employee-say", score:0.9, why:"first"},
    {a:"employee-say", b:"stakeholder-voice", score:0.2, why:"same pair, other way round"}
  ]}, inv);
  assert.equal(got.pairs.length, 1);
  assert.equal(got.pairs[0].why, "first");
});

test("a group of constructs becomes the pairs inside it, and a group of one is not a group", () => {
  const inv = new Set(["a", "b", "c", "d", "e"]);
  const got = S.simTakeGroups({groups:[
    {members:["a", "b", "c"], score:0.8, why:"one instrument would measure all three"},
    {members:["d"],           score:1,   why:"by itself"},
    {members:["e", "invented"], why:"half of it is not in scope"}
  ]}, inv);

  assert.equal(got.groups, 1);              // the singleton and the half-invented pair are not groups
  assert.equal(got.pairs.length, 3);        // a·b, a·c, b·c
  assert.deepEqual(got.pairs.map(p => p.s), [0.8, 0.8, 0.8]);
  assert.deepEqual(got.refused, ["invented"]);
});

test("a group past the cap is a topic, not a quantity, and the overflow is counted", () => {
  const ids = Array.from({length: S.SIMGCAP + 4}, (_, i) => "c" + i);
  const got = S.simTakeGroups({groups:[{members: ids, why:"everything about purpose"}]},
    new Set(ids));
  assert.equal(got.refused.length, 4);
  assert.equal(got.pairs.length, S.SIMGCAP * (S.SIMGCAP - 1) / 2);
});

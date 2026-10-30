/* The reviewer's computed half.

   The old suggestions just proposed tasks, and a replacement only earns its
   place if what it says is TRUE of the state rather than plausible about it. These are pure
   functions of a plain state object, which is why they can be tested at all
   -- the old nextMoves() read fifteen globals and could only have been
   checked by driving a browser.

   The rule under test throughout: a check states a fact with a number in it,
   and never names a button. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

globalThis.noteFail = () => {};   // the page's failure recorder

/* DYNAMIC import, after the globals above are in place. A static `import` is
   HOISTED: the whole graph evaluates before any statement here runs, so a
   global a test installs would arrive after the code reading it had loaded.
   Under `require` the order was the other way about. */
const R = await import("../docs/bench/core/checks.js");

const S0 = {
  open: 0, decls: 20, unver: 0, corpus: 0, space: null,
  arith: true, stale: false, fail: 0, pass: 9,
  outs: 3, noRule: 0, arrows: 11, corrob: 4,
  lines: [], kept: [], rounds: 1,
  guess: {n: 0, wrong: 0}, scored: true, deposit: 9,
};
const S = o => Object.assign({}, S0, o);
const keys = cs => cs.map(c => c.k);
const find = (cs, k) => cs.find(c => c.k === k);

test("a clean state flags nothing, which is the point of flagging anything", () => {
  assert.deepEqual(keys(R.reviewChecks(S())), []);
});

test("stale arithmetic is the serious one, and says what it means downstream", () => {
  const c = find(R.reviewChecks(S({stale: true})), "stale");
  assert.equal(c.sev, "bad");
  assert.match(c.why, /nobody is asking now/);
});

test("a broken invariant says it cannot tell you which side is wrong", () => {
  const c = find(R.reviewChecks(S({fail: 2, pass: 7})), "invariants");
  assert.equal(c.sev, "bad");
  assert.match(c.text, /2 of 9/);
  /* The page must not pick a side here. Either the body is wrong or the
     declaration it breaks was, and guessing would be the page deciding. */
  assert.match(c.why, /cannot tell you which/);
});

test("findings retained in an earlier round are flagged as possibly about an older model", () => {
  const kept = [{y: "w", x: "c", round: 1, keep: true, share: 1},
                {y: "w", x: "k", round: 3, keep: true, share: 1}];
  /* One round: nothing has moved, so nothing to say. */
  assert.equal(find(R.reviewChecks(S({kept, rounds: 1})), "drift"), undefined);
  const c = find(R.reviewChecks(S({kept, rounds: 3})), "drift");
  assert.equal(c.sev, "bad");
  assert.match(c.text, /1 retained finding was proved in an earlier round/);
  assert.match(c.why, /not the declarations that produced the box/);
});

test("two retained findings pointing opposite ways is a contradiction, not a nuance", () => {
  const kept = [
    {y: "welfare", x: "clarity", round: 1, keep: true, text: "welfare rises with clarity"},
    {y: "welfare", x: "clarity", round: 1, keep: true, text: "welfare falls as clarity rises"},
  ];
  const c = find(R.reviewChecks(S({kept})), "contradiction");
  assert.ok(c, "the same pair retained twice with opposite signs must be caught");
  assert.equal(c.sev, "bad");
  /* Same pair, same direction, is not a contradiction. */
  const same = [
    {y: "welfare", x: "clarity", round: 1, keep: true, text: "welfare rises with clarity"},
    {y: "welfare", x: "clarity", round: 1, keep: true, text: "welfare rises with clarity"},
  ];
  assert.equal(find(R.reviewChecks(S({kept: same})), "contradiction"), undefined);
});

test("a silent default is reported as a theory nobody declared", () => {
  const c = find(R.reviewChecks(S({noRule: 2})), "norule");
  assert.equal(c.sev, "soft");
  assert.match(c.text, /2 of 3 outcomes/);
  assert.match(c.why, /theory nobody declared/);
  /* And it says what is being assumed instead of merely that something is
     missing, which is the difference between a check and a task. */
  assert.match(c.why, /[Aa]dditive is being assumed/);
});

test("open declarations carry the size of what they admit when it is known", () => {
  const bare = find(R.reviewChecks(S({open: 4})), "open");
  assert.match(bare.text, /4 of 20/);
  assert.ok(!/distinct models/.test(bare.why), "no count, no claim about a count");
  const sized = find(R.reviewChecks(S({open: 4, space: {n: 1234567}})), "open");
  assert.match(sized.why, /1,234,567 distinct models/);
});

test("the default scoring weights are named as a default, and only once anything is retained", () => {
  assert.equal(find(R.reviewChecks(S({scored: false})), "criteria"), undefined,
    "nothing retained, so the weights have not ordered anything yet");
  const c = find(R.reviewChecks(S({scored: false, kept: [{y: "a", x: "b", keep: true, round: 1}]})),
    "criteria");
  assert.match(c.why, /not a decision anybody took/);
});

test("no check anywhere tells the scholar to press a button", () => {
  /* The rule the whole rewrite turns on. Every state that produces output,
     checked against the verbs the old task list used. */
  const states = [S({stale: true}), S({fail: 3}), S({noRule: 1}), S({open: 9}),
    S({unver: 2}), S({arrows: 5, corrob: 0}),
    S({scored: false, kept: [{y: "a", x: "b", keep: true, round: 1}]}),
    S({rounds: 4, kept: [{y: "a", x: "b", keep: true, round: 1}]})];
  const bad = /\b(click|press|run it|derive it|go to step|open step)\b/i;
  for(const st of states)
    for(const c of R.reviewChecks(st)){
      assert.ok(!bad.test(c.text), `check "${c.k}" tells you to press something: ${c.text}`);
      assert.ok(!bad.test(c.why), `check "${c.k}" tells you to press something: ${c.why}`);
    }
});

/* ---- exposure ---------------------------------------------------------- */

/* The shape depsOf ACTUALLY returns. The first version of these tests
   invented `{on: [...]}`, which agreed with the code and with nothing else:
   both were wrong together, so the tests passed and the feature had never
   once fired on a real line. A fixture that is not the real shape tests the
   fixture. */
const rests = (mechs, reads, rule) => ({
  used: mechs.map(m => ({lhs: "t_" + m, rel: {}, now: "flat"})),
  idle: [], nterm: mechs.length,
  reads: (reads || []).map(r => (typeof r === "string" ? {n: r, dec: true} : r)),
  rule: {n: 2, rules: [], live: !!rule}, base: {v: "proved"},
});
const withRests = (y, x, mechs, share, reads, rule) => ({
  line: {y, x, rests: rests(mechs, reads, rule)},
  row: {y, x, keep: true, round: 1, share, text: `${y} rises with ${x}`},
});

test("the common denominator is the intersection, and it is the whole point", () => {
  const a = withRests("w", "c", ["clarity_gain", "meaning"], 1);
  const b = withRests("w", "k", ["clarity_gain", "cost"], 1);
  const x = R.reviewExposure(S({kept: [a.row, b.row], lines: [a.line, b.line]}));
  const d = x.find(e => e.k === "denominator");
  assert.ok(d, "two traced findings must produce a denominator line");
  assert.match(d.text, /every one of your 2 traced findings rests on the same declaration/);
  assert.match(d.why, /clarity_gain/);
  assert.ok(!/\bmeaning\b/.test(d.why), "only what they SHARE is the denominator");
  assert.match(d.why, /2 findings wide and one decision deep/);
});

test("findings that fail independently are told so, because nobody checks the good case", () => {
  const a = withRests("w", "c", ["clarity"], 1);
  const b = withRests("w", "k", ["meaning"], 1);
  const d = R.reviewExposure(S({kept: [a.row, b.row], lines: [a.line, b.line]}))
    .find(e => e.k === "denominator");
  assert.match(d.text, /no declaration in common/);
  assert.match(d.why, /the good case/);
});

test("the narrowest region is reported, and a finding proved everywhere is not", () => {
  const wide = {y: "w", x: "c", keep: true, round: 1, share: 1, text: "w rises with c"};
  const thin = {y: "w", x: "k", keep: true, round: 1, share: 0.085, text: "w rises with k"};
  assert.equal(R.reviewExposure(S({kept: [wide]})).find(e => e.k === "narrow"), undefined,
    "proved on the whole box is not an exposure");
  const n = R.reviewExposure(S({kept: [wide, thin]})).find(e => e.k === "narrow");
  assert.match(n.text, /8\.5% of the declared box/);
  assert.match(n.why, /the part is the finding/);
});

test("being wrong is measured, and being right is not treated as success", () => {
  const kept = [{y: "w", x: "c", keep: true, round: 1, share: 1}];
  const w = R.reviewExposure(S({kept, guess: {n: 5, wrong: 3}})).find(e => e.k === "wrong");
  assert.match(w.text, /3 of 5 expectations/);
  assert.match(w.why, /told you something/);
  const r = R.reviewExposure(S({kept, guess: {n: 5, wrong: 0}})).find(e => e.k === "wrong");
  /* The page declines to congratulate. An unbroken run of correct guesses is
     at least as likely to mean the questions were easy. */
  assert.match(r.why, /incurious set of guesses/);
});

test("nothing retained means nothing to measure, rather than an empty reassurance", () => {
  assert.deepEqual(R.reviewExposure(S()), []);
});

test("the actions a reading may name are a closed set", () => {
  /* Same discipline as every other proposal on the bench: the vocabulary is
     closed and anything outside it is counted, not written. */
  assert.deepEqual(R.REVIEW_KINDS, ["declaration", "search", "derivation", "none"]);
});

test("what a line rests on is read off the shape depsOf returns, not an invented one", () => {
  /* The regression this file was rewritten for. restNames must name
     mechanisms, declared ranges and a live combination rule -- and must not
     count a range nobody declared as something the finding rests on, because
     resting on a default is a different and worse fact. */
  const r = rests(["gain", "cost"], [{n: "pi", dec: true}, {n: "delta", dec: false}], true);
  const names = R.restNames(r);
  assert.ok(names.includes("mechanism gain"), names.join("|"));
  assert.ok(names.includes("mechanism cost"));
  assert.ok(names.includes("the range of pi"));
  assert.ok(!names.some(n => /delta/.test(n)), "an undeclared range is not a declaration");
  assert.ok(names.some(n => /combination rule/.test(n)));
  assert.deepEqual(R.restNames(null), []);
  assert.deepEqual(R.restNames({}), []);
});

test("a finding proved over a range nobody declared is the failure to report", () => {
  const a = withRests("w", "c", ["gain"], 1, [{n: "pi", dec: true}, {n: "delta", dec: false}]);
  const x = R.reviewExposure(S({kept: [a.row], lines: [a.line]}));
  const u = x.find(e => e.k === "undeclared");
  assert.ok(u, "depsOf's own comment calls this the failure the bench exists to catch");
  assert.match(u.text, /1 range .* was never declared/);
  assert.match(u.why, /delta/);
  assert.match(u.why, /nobody chose/);
  /* Everything declared, nothing to say. */
  const b = withRests("w", "k", ["gain"], 1, [{n: "pi", dec: true}]);
  assert.equal(R.reviewExposure(S({kept: [b.row], lines: [b.line]}))
    .find(e => e.k === "undeclared"), undefined);
});

/* The set of form combinations step 4.1 explores.

   What is worth testing is the arithmetic of coverage, because every claim
   the step makes about a class rests on it: a set that says 64 and enumerates
   63 has silently dropped a combination, and a sample that does not reproduce
   under its own seed is not a declaration.

   The sizes below are the ones quoted to the scholar in the panel, computed
   here from the same functions that compute them there. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../docs/bench/core/expset.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";


/* Three mechanisms, each admitting the four families of the bench: one
   linear member, five concave, four convex, five sigmoid. Fifteen a slot. */
const FAMS = [["linear", 1], ["concave", 5], ["convex", 4], ["sigmoid", 5]];
const members = () => FAMS.flatMap(([fam, k]) =>
  Array.from({length:k}, (_, i) => ({fam, name:`${fam}-${i + 1}`, src:"X"})));
const slot = (term, running) => ({term, label:term, running, members:members()});
const SLOTS = [slot("t_a", "concave-1"), slot("t_b", "sigmoid-3"), slot("t_c", "convex-2")];

test("the whole class is the cross product, and the page says so before it runs it", () => {
  assert.equal(E.expSize(SLOTS, "all", {}), 15 * 15 * 15);     // 3,375
  assert.equal(E.expLabel(SLOTS, "all", {}), "Everything — 3375 of 3375 combinations");
});

test("as written is one combination, at the members actually written", () => {
  const got = E.expEnum(SLOTS, "written", {});
  assert.equal(got.length, 1);
  assert.deepEqual(got[0].map(m => m.name), ["concave-1", "sigmoid-3", "convex-2"]);
});

test("the two ends bracket each slot: two per slot, eight in three", () => {
  assert.equal(E.expSize(SLOTS, "ends", {}), 8);
  const got = E.expEnum(SLOTS, "ends", {});
  assert.equal(got.length, 8);
  for(const c of got) for(const m of c)
    assert.ok(m.name === "linear-1" || m.name === "sigmoid-5", m.name);
});

test("one per family is one member of each family a slot admits", () => {
  assert.equal(E.expSize(SLOTS, "families", {}), 4 * 4 * 4);   // 64
  const got = E.expEnum(SLOTS, "families", {});
  assert.equal(got.length, 64);
  const fams = new Set(got.flat().map(m => m.fam));
  assert.deepEqual([...fams].sort(), ["concave", "convex", "linear", "sigmoid"]);
});

test("one at a time is linear in the class, not exponential, and sweeps every slot", () => {
  /* 1 baseline + 14 alternatives per slot. This is the set that names which
     declaration a conclusion depends on, and the reason it is affordable. */
  assert.equal(E.expSize(SLOTS, "oat", {}), 1 + 14 * 3);       // 43
  const got = E.expEnum(SLOTS, "oat", {});
  assert.equal(got.length, 43);
  // every row differs from the baseline in at most one slot
  const base = got[0].map(m => m.name);
  for(const c of got.slice(1)){
    const diff = c.filter((m, i) => m.name !== base[i]);
    assert.equal(diff.length, 1);
  }
  // and each slot gets swept
  const swept = new Set(got.slice(1).map(c =>
    c.findIndex((m, i) => m.name !== base[i])));
  assert.deepEqual([...swept].sort(), [0, 1, 2]);
});

test("a seeded sample reproduces, and a different seed does not", () => {
  const a = E.expEnum(SLOTS, "sample", {n:12, seed:7}).map(c => c.map(m => m.name).join("|"));
  const b = E.expEnum(SLOTS, "sample", {n:12, seed:7}).map(c => c.map(m => m.name).join("|"));
  const c = E.expEnum(SLOTS, "sample", {n:12, seed:8}).map(x => x.map(m => m.name).join("|"));
  assert.equal(a.length, 12);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(new Set(a).size, 12);        // no combination drawn twice
});

test("a tailored set is the product of what was picked, and an empty slot means all of it", () => {
  const pick = {t_a:["concave-1", "concave-2"], t_b:["linear-1"]};
  assert.equal(E.expSize(SLOTS, "tailored", {pick}), 2 * 1 * 15);
  const got = E.expEnum(SLOTS, "tailored", {pick});
  assert.equal(got.length, 30);
  assert.ok(got.every(c => c[1].name === "linear-1"));
});

test("a reviewer's proposal is checked against the members that exist", () => {
  const got = E.expTake({
    name: "the curvature of the cost mechanism",
    why: "the sign turns on whether the cost is convex; sweep that slot and hold the rest",
    picks: [
      {term:"t_a", members:["concave-1", "convex-9"]},   // one real, one invented
      {term:"t_b", members:["sigmoid-3"]},
      {term:"t_nothing", members:["concave-1"]}          // a mechanism the model has not got
    ]
  }, SLOTS);

  assert.deepEqual(got.pick, {t_a:["concave-1"], t_b:["sigmoid-3"]});
  assert.deepEqual(got.refused, ["t_a / convex-9", "t_nothing"]);
  assert.equal(got.name, "the curvature of the cost mechanism");
});

test("a class nobody declared is a set of nothing, not a set of one", () => {
  assert.equal(E.expSize([], "all", {}), 0);
  assert.deepEqual(E.expEnum([], "oat", {}), []);
  const bare = [{term:"t_a", label:"t_a", running:"", members:[]}];
  assert.deepEqual(E.expEnum(bare, "written", {}), []);
});

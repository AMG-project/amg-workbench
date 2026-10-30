/* The exchange formats, against real instances.

   A format nobody can read against is not an exchange format; it is a habit. So
   each has a published schema, and this holds them to it: the scenario against
   a file the bench actually produced, the relation and the result against the
   examples beside them.

   THREE OF THE SIX ARE CHECKED SOMEWHERE ELSE, and better. `proof`, `stream`
   and `record` have producers on the page, so `tests/exchange.mjs` opens the
   bench, writes one of each, and validates what came out -- which is stronger
   than an example a human wrote, because an example cannot drift from the
   producer and a producer can drift from its schema. What is checked here for
   those three is the one property an example could never carry: that each is
   versioned and names its format, so a reader can refuse a file from a later
   version before parsing any of it.

   The checker below covers the subset the schemas use and NOTHING ELSE, and
   fails loudly on a keyword it does not know. A validator that silently passes
   what it does not understand is worse than no validator: it reports success
   for a file it never read.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "../cli/schema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = (...p) => JSON.parse(readFileSync(join(here, ...p), "utf8"));

/* The checker lives in cli/schema.mjs: the CLI validates with it and so does
   this, because two copies of a validator is two validators. */

test("the checker rejects what it should, so a pass means something", () => {
  const s = {type: "object", required: ["a"],
    properties: {a: {const: 1}, b: {type: "array", items: {enum: ["x"]}}}};
  assert.deepEqual(validate(s, {a: 1, b: ["x"]}), []);
  assert.ok(validate(s, {b: ["x"]}).length, "a missing required field passed");
  assert.ok(validate(s, {a: 2}).length, "a wrong const passed");
  assert.ok(validate(s, {a: 1, b: ["y"]}).length, "a value outside an enum passed");
  assert.ok(validate({type: "object", wat: 1}, {}).length, "an unknown keyword passed");
});

test("a scenario the bench actually wrote validates", () => {
  const schema = read("..", "schema", "scenario.schema.json");
  const inst = read("fixtures", "scenario.json");
  assert.deepEqual(validate(schema, inst), []);
  assert.equal(inst.format, "amg-scenario");
  assert.ok(inst.provenance.length, "the fixture carries no accepted answer to check");
  assert.ok(inst.rounds.length, "the fixture carries no round to check");
});

/* A SCENARIO WITH MORE THAN ONE LITERATURE. Written by the real page: the demonstration with a second
   literature read in from an amg-stream file, one merge made across the two at
   step 2.1, and exported while that union stood -- which is the state a reader
   is most likely to export in, and the one where the snapshot's own scope is
   the union's rather than any literature's. */
test("a scenario carrying two literatures validates, and says which state is at its top", () => {
  const schema = read("..", "schema", "scenario.schema.json");
  const inst = read("fixtures", "scenario-two-literatures.json");
  assert.deepEqual(validate(schema, inst), []);
  const l = inst.snap.lits;
  assert.ok(l, "the fixture carries no literatures");
  assert.equal(l.list.length, 1, "one literature beside the one that ships");
  assert.equal(l.union, true,
    "the fixture was exported in the union and the snapshot does not say so");
  assert.equal(l.joins.groups.length, 1, "the join across them is not in the file");
  /* The shipped literature's PAYLOAD is not in the file and must never be: it
     is in docs/bench/graph-data.js, which every reader already loads. */
  assert.ok(!l.main.base, "the shipped literature's payload is in the scenario");
  assert.ok(l.list[0].base && l.list[0].base.nodes.length,
    "an imported literature's payload is not in the scenario, so nothing carries it");
  /* And each literature's own decisions are on its own record, because the top
     of the snapshot is the union's. */
  assert.ok(l.main.dec && l.main.dec.minp === 2,
    "the shipped literature's own decisions are not on its record");
});

test("a declared relation validates, and carries its warrant", () => {
  const schema = read("..", "schema", "relation.schema.json");
  const inst = read("..", "schema", "examples", "relation.json");
  assert.deepEqual(validate(schema, inst), []);
  assert.ok(inst.rests_on.length && inst.rests_on[0].quote,
    "a relation that rests on a claim has to carry the span it rests on");
  assert.ok(inst.not_fixed.every(x => x.why),
    "what a relation leaves open has to say why");
});

test("a result validates, and its scope is inside it", () => {
  const schema = read("..", "schema", "result.schema.json");
  const inst = read("..", "schema", "examples", "result.json");
  assert.deepEqual(validate(schema, inst), []);
  assert.ok(schema.required.includes("scope"),
    "scope is half the finding and has to be required");
  assert.ok(inst.scope.declared.length <= Object.keys(inst.scope.box).length);
});

test("results the bench actually exported validate, every one of them", () => {
  const schema = read("..", "schema", "result.schema.json");
  const file = read("fixtures", "results.json");
  assert.equal(file.format, "amg-results");
  assert.ok(file.results.length, "the fixture carries no results");
  for (const r of file.results) {
    const errs = validate(schema, r);
    assert.deepEqual(errs, [], `${r.id}: ${errs.join("; ")}`);
    /* The sentence is the PROPOSITION and not the commentary under it. The
       first export ran the sentence, the cross-check, the error line and the
       region together into one string, because it stripped tags off the whole
       block. */
    assert.ok(!/draws|knocked about|region|Proved, and/.test(r.sentence),
      `${r.id}: the sentence has commentary in it: ${r.sentence}`);
    assert.ok(r.sentence.endsWith("."), `${r.id}: not a sentence`);
    /* Which ranges were declared is a subset of the box the proof ran over, and
       a range nobody declared is the failure this bench exists to catch. */
    for (const n of r.scope.declared)
      assert.ok(n in r.scope.box, `${r.id}: declared ${n} is not in the box`);
  }
});

test("every schema is versioned, and names its format", () => {
  for (const f of ["scenario", "relation", "result", "proof", "stream", "record",
                   "forms", "deposit"]) {
    const s = read("..", "schema", `${f}.schema.json`);
    assert.equal(s.properties.format.const, `amg-${f}`);
    assert.equal(s.properties.v.const, 1);
    assert.ok(s.required.includes("format") && s.required.includes("v"),
      `${f}: a reader has to be able to refuse a file from a later version`);
  }
});

/* The worked example, held to what it says.

   `docs/bench/demo/purpose-x-property-rights.amg.json` is the scenario the
   README advertises and the scenario menu opens. Until now nothing checked
   it: not that it validates against the format it declares, and not that the
   numbers on its three returned rows are the numbers the engine that produced
   them actually reported.

   The second half is the one that matters. A row marked `returned` carries a
   count nobody on this page can recompute -- that is what the warrant means
   -- so the only thing standing between it and a stale number is a test that
   reads the count out of the row and compares it with the frozen reference in
   docs/showcase-a. One of the three was reporting 100 of 100 form
   combinations and saying nothing about the 2,400 form-and-setting pairs,
   where it holds 1,638 times. Both dimensions are quoted now, and this is
   what keeps them quoted. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../docs/bench/core/kernel.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "../cli/schema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = (...p) => JSON.parse(readFileSync(join(here, "..", ...p), "utf8"));


const DEMO = read("docs", "bench", "demo", "purpose-x-property-rights.amg.json");
const SCOPE = read("docs", "showcase-a", "scope.json");
const ROWS = ((DEMO.snap || {}).board || {}).rows || [];

test("the demo validates against the format it declares", () => {
  const schema = read("schema", "scenario.schema.json");
  assert.deepEqual(validate(schema, DEMO), []);
  assert.equal(DEMO.format, "amg-scenario");
  assert.equal(DEMO.snap.stage, 1,
    "the demo opens on step 1.1 so the curation is visible before the findings");
});

test("every accepted answer names a prompt the format lists", () => {
  const kinds = read("schema", "scenario.schema.json").$defs.accepted.properties.what.enum;
  for(const p of (DEMO.provenance || []))
    assert.ok(kinds.includes(p.what), `the demo used "${p.what}", which the schema does not list`);
});

/* THIRTEEN DERIVED, NOT FIVE. The model carried one rights channel and now
   carries two, so the page derives a sign for each of four outcomes against
   every parameter that reaches it. The three returned rows are unchanged:
   they are the bridge's, and the bridge did not run again. */
test("the board is thirteen derived propositions and three returned", () => {
  const by = k => ROWS.filter(r => r.src === k).length;
  assert.equal(ROWS.length, 16);
  assert.equal(by("auto"), 13);
  assert.equal(by("tool"), 3);
  for(const r of ROWS.filter(r => r.src === "auto"))
    assert.equal(r.method, "exact", `${r.y} in ${r.x} is derived and not proved exactly`);
  for(const r of ROWS.filter(r => r.src === "tool"))
    assert.equal(r.method, "", `${r.id} carries a method this page did not run`);
});

/* The body as a standalone model: ordered, parsed, and every board row about a
   name it actually has.

   This does NOT catch the defect that prompted it, and the reason is worth
   keeping. The demo's body named seven mechanisms where the curation it
   restores carries five, so two lines were refused on every load and three of
   its "proved" rows were about an outcome the restored model does not write.
   buildLines, which is the kernel's builder and has no curation, infers a free
   parameter for any name nothing writes -- so the orphan reads back here
   perfectly. Only the page's own buildArith, which knows which relations are
   carried, refuses it. That check is in the page walk, which loads the worked
   example and records what reads back. */
test("the kept arithmetic reads back with nothing refused", () => {
  const a = DEMO.snap.arith;
  assert.ok(a && a.lines.length, "the demo carries no kept arithmetic");
  const M = K.buildLines({constants:a.consts || [], lines:a.lines});
  assert.deepEqual(M.bad.map(x => `${x.lhs}: ${x.why}`), [],
    "the kept body does not read against its own declarations");
  assert.equal(M.steps.length, a.lines.length);
  /* Every proposition on the board names an outcome the body writes and a
     parameter it reads. A row about a name the model has lost is a row
     nobody can reproduce. */
  const written = new Set(M.steps.map(s => s.lhs));
  for(const r of ROWS.filter(r => r.src === "auto")){
    assert.ok(written.has(r.y), `${r.id} is about ${r.y}, which the arithmetic does not write`);
    assert.ok(M.params.includes(r.x), `${r.id} is in ${r.x}, which is not a free parameter`);
  }
});

test("every range the findings rest on was declared, not defaulted", () => {
  /* "A default is never a declaration" is the page's own rule, and `amg
     derive` was reporting all four free parameters of the worked example as
     ranges nobody declared. */
  const a = DEMO.snap.arith;
  const M = K.buildLines({constants:a.consts || [], lines:a.lines});
  const by = new Map((DEMO.snap.vtype || []).map(v => [v.name, v]));
  for(const x of M.params){
    const v = by.get(x);
    assert.ok(v, `${x} has no declared type at all`);
    assert.ok(v.bset, `the range of ${x} is this page's default and not a declaration`);
  }
  for(const v of (DEMO.snap.vtype || []))
    assert.ok(written(M).has(v.name) || M.params.includes(v.name),
      `${v.name} is typed and the arithmetic neither writes nor reads it`);
});
const written = M => new Set(M.steps.map(s => s.lhs));

/* A ROW WITH NO SIGN CANNOT CARRY A TALLY, and the page is right not to give
   it one: reading a proposition against a class means counting the
   combinations its SIGN survives, and a partial verdict has no single sign to
   count. xrunGo() excludes those rows by exactly that test. This used to
   demand a tally from every derived row, which was true of a demonstration in
   which every finding was proved and false of one where the method declines. */
test("each derived row carries the class it was read against", () => {
  const derived = ROWS.filter(r => r.src === "auto");
  assert.ok(derived.length, "no derived row to check");
  const signed = derived.filter(r => r.says);
  assert.ok(signed.length, "no derived row carries a sign");
  for(const r of derived.filter(r => !r.says))
    assert.ok(!r.forms, `${r.id} has no sign, so a count of the combinations its sign ` +
      `survives would be a count of nothing`);
  /* A TALLY IS OWED BY A ROW THAT WAS RETAINED, not by every row that carries
     a sign. Step 4.1 reads the board's KEPT propositions against the declared
     class -- xrunGo filters on boardKept() -- so a signed row the scholar did
     not retain was never run, and demanding a number for it demands one
     nothing computed. The demonstration has two: the pair about the residual
     rights channel, derived and set aside. This read "every signed row" and
     passed only because the base shipped tallies computed against a model
     of a different shape. */
  for(const r of signed.filter(r => r.keep)){
    assert.ok(r.forms && r.forms.of, `${r.id} was retained and signed, so it should have been read against the declared class`);
    assert.ok(r.forms.held >= 0 && r.forms.held <= r.forms.of,
      `${r.id}: ${r.forms.held} of ${r.forms.of} is not a tally`);
    assert.ok(r.forms.set, `${r.id} does not say which set it was run over`);
    assert.equal(r.forms.sig, DEMO.snap.arith.sig,
      `${r.id}'s tally was computed against a different body`);
  }
  /* The point of the second dimension: one of the five is the one the class
     does not settle, and a demo where everything holds everywhere shows
     nothing. */
  assert.ok(signed.some(r => r.forms.held < r.forms.of),
    "every finding survives every combination, so the class run demonstrates nothing");
});

/* "100 of 100 form combinations, and 1,638 of 2,400 form-and-setting pairs" */
const COUNTS = /holds over ([\d,]+) of ([\d,]+) form combinations, and ([\d,]+) of ([\d,]+) form-and-setting pairs/;
const num = s => +String(s).replace(/,/g, "");

test("each returned row quotes the claim it cites, on both dimensions", () => {
  const tool = ROWS.filter(r => r.src === "tool");
  assert.equal(tool.length, 3);
  for(const r of tool){
    const id = /· ([A-Za-z_]+) ·/.exec(r.why);
    assert.ok(id, `${r.id} does not name the claim it came from`);
    const want = SCOPE.claims.find(c => c.id === id[1]);
    assert.ok(want, `${r.id} cites ${id[1]}, which scope.json does not report`);
    const got = COUNTS.exec(r.why);
    assert.ok(got, `${r.id} does not quote both dimensions: ${r.why}`);
    assert.equal(num(got[1]), want.forms.held, `${id[1]}: forms held`);
    assert.equal(num(got[2]), want.forms.of, `${id[1]}: forms of`);
    assert.equal(num(got[3]), want.joint.held, `${id[1]}: joint held`);
    assert.equal(num(got[4]), want.joint.of, `${id[1]}: joint of`);
    assert.ok(/not run by this page/.test(r.why),
      `${r.id} is returned and does not say so`);
  }
});

/* The reason both dimensions are quoted rather than one. A claim universal
   over every declared form and broken by a third of the parameter settings
   is the case the single number hides, and the demo carries one. */
test("the demo carries a claim that holds on forms and breaks jointly", () => {
  const split = SCOPE.claims.filter(c => c.forms.universal && !c.joint.universal);
  assert.ok(split.length, "scope.json has no such claim, so this guard is vacuous");
  const cited = ROWS.filter(r => r.src === "tool")
    .map(r => (/· ([A-Za-z_]+) ·/.exec(r.why) || [])[1]);
  assert.ok(split.some(c => cited.includes(c.id)),
    "the demo cites none of the claims whose two dimensions disagree: " +
    split.map(c => c.id).join(", "));
});

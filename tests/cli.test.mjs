/* The method without the interface, and the page and the CLI agreeing.

   The useful test here is not that the CLI runs. It is that it derives THE SAME
   THINGS the browser derived from the same scenario: one engine, two drivers,
   and if they ever disagree one of them is wrong about a model somebody is
   going to publish.

   `fixtures/scenario.json` is a curation the page wrote; `fixtures/results.json`
   is what the page derived from it. The CLI gets only the first.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CURATED } from "./fixtures/curated.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "..", "cli", "amg.mjs");
const FIX = join(here, "fixtures", "scenario.json");
const FLAT = join(here, "fixtures", "scenario-flat.json");
const run = (...a) => execFileSync(process.execPath, [CLI, ...a], { encoding: "utf8" });
const fails = (...a) => {
  try { execFileSync(process.execPath, [CLI, ...a], { encoding: "utf8", stdio: "pipe" }); }
  catch (e) { return String(e.stderr || "") + String(e.stdout || ""); }
  return null;
};

test("check reads a scenario and reports what it holds", () => {
  const out = run("check", FIX);
  assert.match(out, /^ok — amg-scenario v1/m);
  assert.match(out, /arithmetic 5 lines/);
  assert.match(out, /reads back: 5 steps, 2 free parameters/);
  /* The corpus is unstamped until graph-data.js is rebuilt, and the CLI says
     so rather than leaving the line blank. */
  assert.match(out, /corpus UNSTAMPED/);
});

/* A FLAT FINDING, END TO END. The engine returns `flat` where a derivative is
   identically zero; this is the rest of the chain -- the sentence, the mark,
   the tally, the exported result and the schema that has to accept it.
   `fixtures/scenario-flat.json` is the smallest model with the shape: a
   shielded channel whose share of a cost is that cost minus itself, which is
   what the two-channel model's principal_cost_incidence does and what the
   engine used to report as a rise. */
test("a flat finding keeps its own sentence, mark and tally", () => {
  const out = run("derive", FLAT);
  assert.match(out, /^ {2}= {2}shielded does not move with cost at all, for every cost in \[0\.00, 1\.00\]\.$/m,
    "a flat finding has to say it does not move, and not name a direction");
  assert.doesNotMatch(out, /shielded (rises with|falls as) cost/,
    "the defect: a derivative that never leaves zero reported as a sign");
  /* Not the question mark, which is what "not settled" gets: identically zero
     is the most decided answer the engine can give. */
  assert.match(out, /3 proved, 1 flat\./);
  assert.doesNotMatch(out, /settled/, "the old tally called an undecided result settled");
});

test("an exported flat result validates, with no direction claimed", () => {
  const got = JSON.parse(run("export", FLAT));
  const flat = got.results.filter(r => r.verdict === "flat");
  assert.equal(flat.length, 1);
  assert.equal(flat[0].direction, "none",
    "`none` is the direction field saying there is no direction");
  assert.equal(flat[0].outcome, "shielded");
  assert.equal(flat[0].parameter, "cost");
  for(const r of got.results)
    assert.equal(r.verdict === "flat", r.direction === "none",
      `${r.outcome} in ${r.parameter}: flat and none go together or neither does`);
  /* The CLI dies rather than write a result its own schema refuses, so an
     export that came back at all already validated -- asserted here so that
     removing that guard does not go unnoticed. */
  assert.ok(got.results.length === 4);
});

test("show writes the box, and marks a range nobody declared", () => {
  const out = run("show", FIX);
  assert.match(out, /purpose_clarity_factor\s+\[0, 1\]/);
  assert.match(out, /rho\s+\[2, 2\]\s+\(not declared\)/);
  assert.match(out, /firm_accounting_performance = \(0\.5 \*/);
});

test("the CLI derives what the page derived, from the same file", () => {
  const page = JSON.parse(readFileSync(join(here, "fixtures", "results.json"), "utf8"));
  const cli = JSON.parse(run("export", FIX));
  const key = r => `${r.outcome}|${r.parameter}`;
  const mine = new Map(cli.results.map(r => [key(r), r]));
  assert.equal(cli.results.length, page.results.length,
    "the two drivers found a different number of propositions");
  for (const p of page.results) {
    const c = mine.get(key(p));
    assert.ok(c, `the CLI did not derive ${key(p)}`);
    assert.equal(c.verdict, p.verdict, `${key(p)}: page ${p.verdict}, CLI ${c.verdict}`);
    assert.equal(c.direction, p.direction, `${key(p)}: direction differs`);
    assert.ok(Math.abs(c.share - p.share) < 1e-9, `${key(p)}: share differs`);
  }
});

test("what the CLI exports passes the schema it was written against", () => {
  /* Asserted inside the CLI too, which refuses to write results its own schema
     would reject -- an export that fails its format is a bug that travels. */
  const out = run("export", FIX);
  const o = JSON.parse(out);
  assert.equal(o.format, "amg-results");
  for (const r of o.results) {
    assert.equal(r.method.kind, "exact", "the CLI has one method and should say so");
    assert.ok(r.scope.box && r.scope.declared, "a result carries its box and which of it was declared");
    assert.ok(r.sentence.endsWith("."));
  }
});

test("it refuses what it cannot do, by name", () => {
  assert.match(fails("derive", join(here, "fixtures", "results.json")) || "",
    /no kept arithmetic|not a scenario|step six/i);
  assert.match(fails("wat", FIX) || "", /no such command/);
  assert.match(fails("check") || "", /needs a scenario file/);
});

/* THE CURATION, AND THE PAGE AGREEING WITH IT.

   `amg curate` runs steps 1.1 to 1.3 over the corpus this repository ships and
   the decisions a scenario carries. The useful assertion is the same one the
   rest of this file makes: not that it runs, but that it gets the numbers the
   page gets.

   HOW THE TWO ARE COMPARED, since neither can call the other. The numbers are
   written out here as constants, and `tests/exchange.mjs` asserts the same
   constants from the real browser with the same scenario open. Two drivers
   asserting one set of numbers is the cross-check; if either moves, one of
   them fails, and the pair of failures says which. */

test("curate runs the curation, and gets the numbers the page gets", () => {
  const DEMO = join(here, "..", "docs", "bench", "demo",
    "purpose-x-property-rights.amg.json");
  const out = run("curate", DEMO);
  const num = re => { const m = re.exec(out); return m ? +m[1] : NaN; };

  assert.match(out, /^# Purpose and property rights/m);
  assert.equal(num(/papers\s+(\d+) of 52/), CURATED.papers);
  assert.equal(num(/claims\s+(\d+) of 1080 come off them/), CURATED.claims);
  assert.equal(num(/constructs\s+(\d+) drawn of 1026 extracted/), CURATED.drawn);
  assert.equal(num(/notions\s+(\d+), from/), CURATED.notions);
  assert.equal(num(/isolated\s+(\d+) notion/), CURATED.isolated);
  assert.equal(num(/crossing\s+(\d+) merge/), CURATED.crossing);
  assert.equal(num(/arrows\s+\d+ of (\d+) carry/), CURATED.arrows);
  assert.equal(num(/arrows\s+(\d+) of \d+ carry/), CURATED.clearing);
  assert.equal(num(/claims\s+(\d+) of 1080 clear every bar/), CURATED.claimsClearing);

  /* AND IT SAYS WHAT IT CANNOT DO, which is the line this command exists
     alongside: reading a corpus is here, extracting one is not. */
  assert.match(out, /EXTRACT/);
});


/* TWO LITERATURES, REPORTED APART.

   Block 1 runs once per literature, so a scenario can carry more than one, and
   a reader checking a paper's numbers against its scenario needs them PER
   literature rather than summed. The fixture was written by the real page: the
   demonstration with a second literature read in from an amg-stream file, one
   merge made across the two at step 2.1, and exported while that union stood.

   WHICH IS THE CASE WORTH FIXING IN A FIXTURE. Exported in the union, the
   scenario's own state is the union's permissive scope -- every outlet, a
   threshold of one, no bar raised -- so a reader that took the top of the
   snapshot for the shipped literature's decisions reported it as having drawn
   all 1,026 of its constructs instead of the 158 it drew. Each literature's
   own decisions are on its own record, the snapshot says which state is at its
   top, and this holds the report to the records. */
test("curate reports each literature on its own, off its own record", () => {
  const TWO = join(here, "fixtures", "scenario-two-literatures.json");
  const out = run("curate", TWO);
  assert.match(out, /^# .*2 literatures, each curated on its own/m);
  assert.match(out, /1 merge\(s\) across them/);
  assert.match(out, /Exported while step 2\.1 held both on one map/);

  const sec = out.split(/^## /m);
  const main = sec.find(s => /^Purpose/.test(s));
  const other = sec.find(s => /^Property rights/.test(s));
  assert.ok(main && other, "the report has no section per literature:\n" + out);

  const num = (s, re) => { const m = re.exec(s); return m ? +m[1] : NaN; };
  /* The shipped literature's OWN curation, which is the same set of numbers
     tests/fixtures/curated.mjs holds the single-literature run to. */
  assert.equal(num(main, /papers\s+(\d+) of 52/), CURATED.papers);
  assert.equal(num(main, /constructs\s+(\d+) drawn of 1026/), CURATED.drawn);
  assert.equal(num(main, /notions\s+(\d+) at a tightness/), CURATED.notions);
  assert.equal(num(main, /isolated\s+(\d+) notion/), CURATED.isolated);
  assert.equal(num(main, /arrows\s+\d+ of (\d+) carry/), CURATED.arrows);
  assert.equal(num(main, /arrows\s+(\d+) of \d+ carry/), CURATED.clearing);
  assert.equal(num(main, /claims\s+1080 of 1080, (\d+) clearing/), CURATED.claimsClearing);

  /* And the second literature's, which is the fixture's own four papers, six
     constructs and eight claims -- none of it from the shipped payload. */
  assert.equal(num(other, /papers\s+(\d+) of 4/), 4);
  assert.equal(num(other, /constructs\s+(\d+) drawn of 6/), 6);
  assert.equal(num(other, /claims\s+(\d+) of 8/), 8);
  /* Its own frame, ticked: an imported literature was screened on the outlets
     it arrives with, and re-screening it from nothing would discard the
     decision the file is a record of. */
  assert.equal(num(other, /scope\s+(\d+) outlet/), 3);

  /* The extraction stays out of both. */
  assert.match(out, /EXTRACT/);
});

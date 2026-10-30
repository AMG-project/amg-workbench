/* THE ACTION MODEL AS A FILE, held to its own specification.

   `schema/AMG-FORMAT.md` says what a conforming report must and must not do.
   This is that document as assertions, because a specification nothing checks
   is a specification that drifts from its only implementation.

   The six properties of §3 are each tested, and so are the six refusals of
   §5. The last test is the generalizability audit of §6 turned into a check
   that runs: a report generated from an input mentioning no literature must
   mention no literature.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "../cli/schema.mjs";
import { readRelation, report, reportMd } from "../docs/bench/core/report.js";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(readFileSync(join(here, "..", "schema", "report.schema.json"), "utf8"));

/* A finding with everything on it, named so that nothing here is about any
   literature: the generalizability check at the end depends on that. */
const finding = (over = {}) => Object.assign({
  y: "outcome_one", x: "driver_one", src: "auto", round: 1, at: "2026-10-25",
  expression: "a * b",
  result: {
    sentence: "outcome_one rises with driver_one", outcome: "outcome_one",
    parameter: "driver_one", direction: "up", verdict: "proved", share: 0.75,
    scope: { box: { driver_one: [0, 1], weight_one: [0, 2] }, declared: ["driver_one"] },
    rests_on: { mechanisms: ["mech_one"], idle: ["mech_two"] }
  },
  proof: {
    expression: "a * b",
    /* The shapes are proof.schema.json's: `split` is the list of leaves and
       `boxes` counts the cells the search visited. This fixture invented the
       opposite would check the certificate against a shape nothing
       produces. */
    certificate: { leaves: 12, boxes: 23, covers: 1, method: "branch and bound",
      split: [{ box: { driver_one: [0, 0.5] }, holds: true }] },
    /* `by` says whether anybody set it; `who` says which of them did. The
       two are easy to conflate in a fixture, which is how a fixture comes to
       invent a shape nothing produces. */
    declarations: [
      { what: "the range of driver_one", value: "[0, 1]", by: "declared", who: "hand", at: "2026-10-25" },
      { what: "the shape class of mech_one", value: "increasing", by: "declared", who: "claude", at: "2026-10-25" },
      { what: "the range of weight_one", value: "[0, 2]", by: "default", who: "open", at: "" }
    ]
  },
  evidence: [{
    relation: { from: "driver_one", to: "outcome_one" },
    claims: [
      { paper: "aaa-2020", sign: "positive", basis: "estimated", quote: "It rises.", scope: "one setting" },
      { paper: "bbb-2021", sign: "negative", basis: "asserted", quote: "It falls.", scope: "another setting" }
    ]
  }]
}, over);

const base = (over = {}) => Object.assign({
  derived: 9, boardRows: 5, bench: { v: "0.14" }, corpus: { commit: "abc1234" },
  forms: "forms-tag-1", scenario: "a scenario", regenerate: "amg report a-scenario.amg.json",
  findings: [finding()]
}, over);

test("a report validates against its own published schema", () => {
  assert.deepEqual(validate(SCHEMA, report(base())), []);
});

test("a report with nothing on it still validates, rather than carrying nulls", () => {
  /* The project's rule: absent, not null. A field holding a non-answer needs
     a type that means nothing, and the schema would have to allow it. */
  const bare = report({
    findings: [{ y: "a", x: "b", result: { sentence: "s", outcome: "a", parameter: "b",
      scope: { box: {}, declared: [] }, rests_on: {} }, evidence: [] }]
  });
  assert.deepEqual(validate(SCHEMA, bare), []);
  const f = bare.findings[0];
  for (const k of ["certificate", "method", "share", "undecided", "empirical", "note"])
    assert.ok(!(k in f), `${k} is present and empty rather than absent`);
});

test("the denominator keeps this model's derivation apart from what arrived from elsewhere", () => {
  /* Counting a finding the model never derived against the model's own
     derivation gave a denominator smaller than its numerator. */
  const r = report(base({ derived: 4, boardRows: 8, findings: [
    finding(), finding({ src: "tool" }), finding({ src: "tool" })] }));
  assert.equal(r.selection.derived, 4);
  assert.equal(r.selection.retained, 3);
  assert.equal(r.selection.derived_here, 1);
  assert.equal(r.selection.from_elsewhere, 2);
  assert.equal(r.selection.set_aside, 5);
  const md = reportMd(r);
  assert.match(md, /This model derived 4 propositions\. 1 of them is reported here\./);
  assert.match(md, /2 further findings below were not derived here/);
});

test("a bound nobody declared is named as a default, never merged with the declared ones", () => {
  const f = report(base()).findings[0];
  assert.deepEqual(f.scope.declared, ["driver_one"]);
  assert.deepEqual(f.scope.defaulted, ["weight_one"]);
  assert.match(reportMd(report(base())), /left at the default/);
  assert.match(reportMd(report(base())), /obligation nobody took on/);
});

test("the share it could not settle is reported, not just the share it proved", () => {
  const f = report(base()).findings[0];
  assert.equal(f.share, 0.75);
  assert.equal(f.undecided, 0.25);
  assert.match(reportMd(report(base())), /25\.0% it could not settle either way/);
});

test("differing signs are presented, and the report refuses to call them a disagreement", () => {
  const e = report(base()).findings[0].evidence[0];
  assert.equal(e.agree, false);
  assert.deepEqual(e.signs, { positive: 1, negative: 1 });
  assert.match(e.reading, /not necessarily a disagreement/);
  assert.match(e.reading, /does not judge whether they meet/);
  /* And the sources are there, which is the whole point: a count cannot tell
     a contradiction from a scope difference and neither can this. */
  assert.equal(e.rows.length, 2);
  assert.equal(e.rows[0].scope, "one setting");
  assert.equal(e.rows[1].scope, "another setting");
});

test("agreement is not reported as corroboration until the scopes can be compared", () => {
  const one = readRelation({ from: "a", to: "b" }, [
    { paper: "p1", sign: "positive", scope: "unstated" },
    { paper: "p2", sign: "positive", scope: "unstated" }], {});
  assert.equal(one.agree, true);
  assert.equal(one.unscoped, 2);
  assert.match(one.reading, /state no scope at all/);

  const two = readRelation({ from: "a", to: "b" }, [
    { paper: "p1", sign: "positive", scope: "here" },
    { paper: "p2", sign: "positive", scope: "there" }], {});
  assert.match(two.reading, /not something this report decides/);

  const solo = readRelation({ from: "a", to: "b" },
    [{ paper: "p1", sign: "positive", scope: "here" }], {});
  assert.match(solo.reading, /Nothing here corroborates it/);
});

test("a withheld quote is withheld everywhere, and the report says it was", () => {
  const r = report(base({ quotes: false }));
  assert.ok(r.withheld && r.withheld.quotes);
  for (const row of r.findings[0].evidence[0].rows) {
    assert.ok(row.quote_withheld, "a row carries no withholding mark");
    assert.ok(!("quote" in row), "a quote survived a declaration that withheld it");
  }
  const md = reportMd(r);
  assert.ok(!md.includes("It rises."), "a withheld quote reached the prose");
  assert.match(md, /quote withheld by declaration/);
  assert.deepEqual(validate(SCHEMA, r), []);
});

test("nothing returned from outside is ever marked verified", () => {
  const r = report(base({ findings: [finding({ data: {
    text: "AMG-DATA x sign=+ n=10 agrees=yes", agrees: "yes", n: 10, at: "2026-10-25",
    ran: { runtime: "R", version: "4.4.2", dataset: "d.csv",
      columns: { outcome: "col_a", driver: "col_b", controls: ["col_c"] } } } })] }));
  assert.equal(r.findings[0].empirical.verified_here, false);
  const md = reportMd(r);
  assert.match(md, /Not verified here/);
  /* The measurement decision is the part a reviewer contests, and the result
     line alone is not auditable without it. */
  assert.match(md, /The measurement decision/);
  assert.match(md, /`col_a` stood in for the outcome/);
});

test("a declaration says which of the two chose it, not only that somebody did", () => {
  /* METHOD.md invariant I2: the record says which of the two chose each
     declaration. The record did and the action model did not, so a reviewer
     reading the file alone could not tell a scholar's declaration from an
     accepted proposal. Writing the method specification is what found it. */
  const md = reportMd(report(base()));
  assert.match(md, /1 the scholar/);
  assert.match(md, /1 a model, and accepted/);
  assert.match(md, /declarations this proof reads/);
});

test("what it rests on, and what it does not, are both reported", () => {
  const md = reportMd(report(base()));
  assert.match(md, /Mechanisms: `mech_one`/);
  assert.match(md, /Indifferent to: `mech_two`/);
});

test("the limits are required, and a report cannot be written without them", () => {
  assert.ok(report({}).limits.length > 80);
  const missing = report(base());
  delete missing.limits;
  assert.ok(validate(SCHEMA, missing).length, "a report with no limits passed the schema");
});

test("a finding the model will not re-derive reports without a certificate, and says so", () => {
  const r = report(base({ findings: [finding({ proof: null })] }));
  assert.ok(!("certificate" in r.findings[0]));
  assert.match(reportMd(r), /the model as it stands will not re-derive this/);
  assert.deepEqual(validate(SCHEMA, r), []);
});

test("nothing in the format is about one literature", () => {
  /* The generalizability audit of AMG-FORMAT.md §6, as a check that runs.
     The input above names no construct, theory, journal or discipline, so
     neither may the output. This caught two real defects when it was first
     written: a schema description citing this corpus's own counts, and a
     producer that wrote "the 52 articles" over a corpus of any size. */
  const md = reportMd(report(base({ findings: [finding({ data: {
    text: "AMG-DATA x", agrees: "yes", n: 1, at: "x",
    ran: { runtime: "R", columns: { outcome: "col_a", driver: "col_b", controls: [] } } },
    anno: "a note", annoAt: "2026-10-25" })] })));
  const leaks = ["purpose", "clarity", "mission", "stakeholder", "governance",
    "Gartenberg", "firm accounting", "52 article", "1,080", "1080 claim"];
  for (const w of leaks)
    assert.ok(!new RegExp(w, "i").test(md),
      `the report says ${JSON.stringify(w)} about an input that never mentioned it`);
  /* And no figure from this project leaked into the prose either. */
  for (const n of ["1,026", "9,375", "3,125", "380 of"])
    assert.ok(!md.includes(n), `the report quotes ${n}, which is this project's and not the format's`);
});

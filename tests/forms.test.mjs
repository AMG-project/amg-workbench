/* core: the registry of named forms, and the file that publishes it.

   Four families with fifteen members between them, every member an EXPRESSION
   in the bench grammar. Every robustness claim this bench makes is a claim
   about those fifteen strings: a typo in one would not throw, it would change
   what a hundred form combinations mean, quietly, and the page would report the
   new number with the same confidence as the old one.

   `tests/vocab.test.mjs` already evaluates every member over its whole range
   and holds it to the properties its own family declares, which is the part
   about whether the shapes are the shapes. What is checked here is the part
   about the REGISTRY: that there is one, that it is derived rather than
   restated, that the published file says the same thing as the module, and
   that the tag moves when the registry does and not otherwise.

   WHY A TAG AT ALL. A conclusion that survived a hundred form combinations
   survived a PARTICULAR hundred. A reader comparing two runs, or an engine in
   another language returning a result, needs to know whether it was the same
   hundred -- and nothing that left this page said so.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FORMLIB, FORM_PROPS, fnv1a, formByName, formCount, formsData, formsFor,
  formsTag } from "../docs/bench/core/forms.js";
import { VOCAB } from "../docs/bench/core/vocab.js";
import { validate } from "../cli/schema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = (...p) => JSON.parse(readFileSync(join(here, "..", ...p), "utf8"));

test("the registry is derived from the vocabulary and not restated", () => {
  assert.equal(FORMLIB.length, VOCAB.families.length);
  for (const f of VOCAB.families) {
    const got = formByName(f.name);
    assert.ok(got, `${f.name} is in the vocabulary and not in the registry`);
    assert.deepEqual(got.need, f.properties);
    assert.equal(got.members.length, f.members.length);
    for (let i = 0; i < f.members.length; i++) {
      assert.equal(got.members[i][0], f.members[i][0]);
      assert.equal(got.members[i][1], f.members[i][1]);
    }
  }
  /* DERIVED, which is the point: a property a family declares and the filter
     does not carry is silently dropped from a request, so declaring it narrows
     nothing. A hardcoded list did exactly that once. */
  for (const f of VOCAB.families)
    for (const p of f.properties)
      assert.ok(FORM_PROPS.includes(p), `${p} is declared and the filter drops it`);
});

test("an old family name still resolves", () => {
  /* The three families came with the purpose model, named after its own
     mechanisms. A curation saved under an old name has to keep working. */
  assert.equal(formByName("credibility").fam, "sigmoid");
  assert.equal(formByName("saturating").fam, "concave");
  assert.equal(formByName("convex_cost").fam, "convex");
  assert.equal(formByName("no such family"), null);
});

test("a declared class is conjunctive", () => {
  /* Declare increasing and concave and the sigmoids are not offered, which is
     the point of declaring it. Declare nothing and every family is, because an
     undeclared class is wide and not narrow. */
  assert.deepEqual(formsFor(["increasing", "concave"]).map(f => f.fam), ["concave"]);
  assert.equal(formsFor([]).length, VOCAB.families.length);
  assert.equal(formsFor(["concave", "convex"]).length, 0,
    "a class that curves both ways admits a family");
  /* A family a scholar added is offered where its properties fit. */
  const mine = {fam:"mine", need:["increasing", "concave"], members:[["m", "X ** 0.4"]]};
  assert.ok(formsFor(["increasing", "concave"], [mine]).some(f => f.fam === "mine"));
  assert.equal(formByName("mine", [mine]).fam, "mine");
});

test("the published file says what the module says", () => {
  const file = read("schema", "forms.json");
  assert.equal(file.format, "amg-forms");
  assert.equal(file.tag, formsTag(),
    "schema/forms.json is out of date — run `make forms`");
  assert.deepEqual(file.families, formsData(),
    "schema/forms.json is out of date — run `make forms`");
  assert.deepEqual(file.properties, VOCAB.properties);
  assert.equal(file.counts.families, formsData().length);
  assert.equal(file.counts.members, formCount());
  assert.deepEqual(validate(read("schema", "forms.schema.json"), file), []);
});

test("every published expression is readable, with X for the reader", () => {
  const file = read("schema", "forms.json");
  for (const f of file.families)
    for (const m of f.members) {
      assert.match(m.expr, /X/, `${f.family}:${m.name} does not read anything`);
      /* The grammar is eight operators and nothing else, which is what lets
         the same string run in an engine that implements eight operators. */
      assert.doesNotMatch(m.expr, /[A-WYZ]|lambda|=>|\bdef\b/,
        `${f.family}:${m.name} is not in the bench grammar: ${m.expr}`);
    }
});

test("the tag moves when the registry moves, and not otherwise", () => {
  const t = formsTag();
  assert.match(t, /^forms-[0-9a-f]{8}-\d+x\d+$/);
  assert.equal(t, formsTag(), "the tag is not stable between calls");
  /* It is taken over the family names, their properties and their member
     EXPRESSIONS, so a change to any of those moves it -- and a change to a
     family's prose description does not, which is right: a description is not
     something a result was computed over. */
  const flat = formsData().map(f => f.family + "[" + f.properties.join(",") + "]" +
    f.members.map(m => m.name + "=" + m.expr).join(";")).join("|");
  assert.ok(t.indexOf(fnv1a(flat).toString(16).padStart(8, "0")) > 0);
  assert.notEqual(fnv1a(flat), fnv1a(flat.replace("X ** 0.5", "X ** 0.51")),
    "changing a member expression does not move the hash");
  assert.notEqual(fnv1a(flat), fnv1a(flat.replace("sqrt", "root")),
    "renaming a member does not move the hash");
});

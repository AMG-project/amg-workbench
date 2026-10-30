/* core: the closed vocabularies, and the fifteen member expressions.

   This is the one file under core/ that no test loaded. It was found by
   checking the README's claim that every one of them runs under `node --test`,
   which is a good reason to write the claim down somewhere a check can read it.

   What is at stake is not small. A family's members are EXPRESSIONS, written as
   text with `X` for the reader, and the class machinery substitutes them into a
   model's lines and re-parses: every robustness claim this bench makes is a
   claim about those fifteen strings. A typo in one of them would not throw. It
   would change what a hundred form combinations mean, quietly, and the page
   would report the new number with the same confidence as the old one.

   So each member is evaluated over its whole range and held to the properties
   its own family declares. Nothing is assumed about which members those are:
   the properties are read off the family and the test asserts what they say.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as K from "../docs/bench/core/kernel.js";
import { ATOL, amono, apeak } from "../docs/bench/core/curve.js";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(join(here, "..", "docs", "bench", "core", "vocab.js"), "utf8");

/* Read as TEXT and parsed, which is how the page's own tooling reads it and
   therefore the thing worth testing: scope.test.mjs and the two-channel runner
   both slice this file rather than importing it, so a shape that only node
   accepts would pass an import and break them. */
const V = (() => {
  const body = SRC.slice(0, SRC.indexOf("\nexport {") + 1 || undefined);
  return JSON.parse(body.slice(body.indexOf("{"), body.lastIndexOf("}") + 1));
})();

const N = 201;                                   // the resolution the bench samples at
const xs = Array.from({length: N}, (_, i) => i / (N - 1));
const series = src => {
  const e = K.readExpr(String(src).replace(/X/g, "(x)"), new Set(["x"]));
  return xs.map(x => K.evalRPN(e.rpn, {x}));
};
/* Second differences on an even grid: the sign of curvature. */
const curve = ys => ys.slice(2).map((_, i) => ys[i + 2] - 2 * ys[i + 1] + ys[i]);

test("the file is JSON a slicer can read, and the vocabularies are closed", () => {
  for(const k of ["kinds", "aspects", "roles", "compositions", "shape_props",
                  "properties", "families"])
    assert.ok(k in V, `the vocabulary is missing ${k}`);
  /* THE DECLARABLE SET AND THE DESCRIPTIVE ONE ARE NOT QUITE THE SAME, and
     the difference is worth pinning rather than waving through. `properties`
     is what a scholar can declare and what a model's proposal is checked
     against -- page/03b-decisions.js offers exactly these six and
     page/05-explore.js validates against them. A family may carry one tag
     beyond them: its own name. `linear` is the only one, because the linear
     family is the baseline the others are claims against and nothing declares
     "no curvature" as a property; a declaration of f(0)=0, f(1)=1 and
     increasing is what admits it. Anything else outside the set would mean two
     parts of the page talking about different vocabularies. */
  const props = new Set(V.properties);
  for(const f of V.families)
    for(const p of f.properties)
      assert.ok(props.has(p) || p === f.name,
        `family ${f.name} declares ${p}, which is neither a property nor its own name`);
  /* And every property that CAN be declared has to be satisfiable, or a
     declaration naming it admits no family and the row offers no members. */
  for(const p of V.properties)
    assert.ok(V.families.some(f => f.properties.includes(p)),
      `${p} can be declared and no family has it`);
  for(const [shape, ps] of Object.entries(V.shape_props))
    for(const p of ps)
      assert.ok(props.has(p), `shape ${shape} implies ${p}, which is not a property`);
  /* And each closed list is a list of triples with something to read. */
  for(const k of ["kinds", "aspects", "roles", "compositions"])
    for(const row of V[k]){
      assert.equal(typeof row[0], "string");
      assert.ok(row[1] && row[1].length > 2, `${k} ${row[0]} has no label`);
    }
});

test("every family has members, each named once, each a parsable expression", () => {
  assert.ok(V.families.length >= 4, "four families at least: linear, concave, convex, sigmoid");
  let n = 0;
  for(const f of V.families){
    assert.ok(f.members.length, `${f.name} has no members`);
    assert.ok(String(f.description || "").length > 60,
      `${f.name} does not say what it is a family OF`);
    const seen = new Set();
    for(const [name, src] of f.members){
      assert.ok(!seen.has(name), `${f.name} has two members called ${name}`);
      seen.add(name);
      assert.match(String(src), /X/, `${f.name}/${name} does not read its argument`);
      const e = K.readExpr(String(src).replace(/X/g, "(x)"), new Set(["x"]));
      assert.ok(e.rpn.length, `${f.name}/${name} parsed to nothing`);
      n++;
    }
  }
  assert.equal(n, 15, "fifteen members, which is what every class size on this bench counts");
});

test("every member is finite over the whole unit interval", () => {
  for(const f of V.families)
    for(const [name, src] of f.members)
      for(const [i, y] of series(src).entries())
        assert.ok(Number.isFinite(y),
          `${f.name}/${name} is ${y} at x = ${xs[i].toFixed(3)}`);
});

test("every member has the properties its own family declares", () => {
  for(const f of V.families){
    const want = new Set(f.properties);
    for(const [name, src] of f.members){
      const ys = series(src), at = `${f.name}/${name}`;
      if(want.has("f(0)=0"))
        assert.ok(Math.abs(ys[0]) < 1e-9, `${at}: f(0) is ${ys[0]}, not 0`);
      if(want.has("f(1)=1"))
        assert.ok(Math.abs(ys[N - 1] - 1) < 1e-9, `${at}: f(1) is ${ys[N - 1]}, not 1`);
      if(want.has("increasing")){
        const m = amono(ys, true);
        assert.ok(m.worst >= -ATOL,
          `${at}: falls by ${m.worst} at x = ${xs[m.at] ?? "?"}`);
      }
      /* Curvature from second differences, which is what a reader of a sampled
         series has. The slack scales with the range, because a member of the
         convex family can have a second difference of 1e-5 honestly. */
      const d2 = curve(ys), slack = 1e-9 + 1e-6 * (Math.max(...ys) - Math.min(...ys));
      if(want.has("concave"))
        assert.ok(Math.max(...d2) <= slack, `${at}: curves up by ${Math.max(...d2)}`);
      if(want.has("convex"))
        assert.ok(Math.min(...d2) >= -slack, `${at}: curves down by ${Math.min(...d2)}`);
      if(want.has("linear"))
        assert.ok(Math.max(...d2.map(Math.abs)) <= slack, `${at}: is not straight`);
      /* A SIGMOID IS A CLAIM ABOUT ITS SLOPE, not about its values: slow, then
         rapid, then saturating. So the slope rises to an interior maximum and
         falls away, which is exactly apeak() -- the same test core/curve.js
         offers the page, used here on the derivative. */
      if(want.has("sigmoid")){
        const slope = ys.slice(1).map((y, i) => y - ys[i]);
        const p = apeak(slope);
        assert.ok(p.ok, `${at}: its slope is not single-peaked (${p.why})`);
      }
    }
  }
});

test("the families cover the curvatures a declared class can ask for", () => {
  /* shape_props is what a declared shape implies, and famsFor() reads it to
     decide which families a declaration admits. A shape implying properties no
     family has would admit nothing and the row would offer no members at all. */
  const byProps = V.families.map(f => new Set(f.properties));
  for(const [shape, ps] of Object.entries(V.shape_props)){
    if(!ps.length) continue;                       // declares nothing, admits all
    assert.ok(byProps.some(s => ps.every(p => s.has(p))),
      `a shape declared ${shape} implies ${ps.join(" + ")}, which no family has`);
  }
});

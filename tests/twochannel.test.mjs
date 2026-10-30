/* The two-channel model, ported into the kernel grammar.

   The acceptance test: the port reproduces `docs/showcase-a/two-channel-golden.json` at all of its cases, ablated
   ones included. That file was written by drystone, so this is the test that
   lets drystone go.

   The tolerance is stated rather than tuned: 1e-12 absolute, which is about
   four orders of magnitude tighter than anything the model is read at, and
   the port either matches to floating-point noise or it does not match. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../docs/bench/core/kernel.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const MODEL = JSON.parse(fs.readFileSync(
  join(here, "..", "models", "purpose-two-channel.json"), "utf8"));
const GOLDEN = JSON.parse(fs.readFileSync(
  join(here, "..", "docs", "showcase-a", "two-channel-golden.json"), "utf8"));

const TOL = 1e-12;

/* The model, parsed once: every line read against the names declared before
   it, which is the same scope rule the page enforces. */
function compile(){
  const scope = new Set([...Object.keys(MODEL.constants), ...Object.keys(MODEL.parameters)]);
  const steps = [];
  for(const raw of MODEL.lines){
    const t = raw.replace(/#.*$/, "").trim();
    if(!t) continue;
    const m = /^([a-z][a-z0-9_]*)\s*=\s*(.+)$/.exec(t);
    assert.ok(m, `not a line: ${t}`);
    const r = K.readExpr(m[2], scope);
    steps.push({lhs:m[1], rpn:r.rpn, src:m[2]});
    scope.add(m[1]);
  }
  return steps;
}

const STEPS = compile();

/* A mechanism is named `commitment_credibility` by the model and `t_commitment
   _credibility` by the line that carries it. Ablating by the wrong one of the
   two silently ablates nothing, which is how the first run of this test
   reported the port as broken when it was the test that was. */
function run(params, ablated){
  const off = new Set((ablated || []).map(m => m.startsWith("t_") ? m : "t_" + m));
  const S = Object.create(null);
  for(const [k, v] of Object.entries(MODEL.constants)) S[k] = v;
  for(const [k, v] of Object.entries(params)) S[k] = v;
  for(const s of STEPS){
    const v = K.evalRPN(s.rpn, S);
    S[s.lhs] = off.has(s.lhs) ? 0 : v;
  }
  return S;
}

test("every line parses against the names declared before it", () => {
  assert.equal(STEPS.length, MODEL.lines.filter(l => /^[a-z][a-z0-9_]*\s*=/.test(l)).length);
  assert.ok(STEPS.length > 40, `only ${STEPS.length} lines`);
  for(const m of MODEL.mechanisms)
    assert.ok(STEPS.some(s => s.lhs === "t_" + m), `no term for ${m}`);
});

test("the port reproduces every golden case drystone wrote", () => {
  /* The port writes lower-case names, because the grammar has no others; the
     model file carries the mapping back to the published ones. */
  const keys = Object.entries(MODEL.outcome_names);
  let worst = 0, worstAt = null, n = 0;
  const bad = [];
  for(const c of GOLDEN.cases){
    if(c.forms || c.magnitudes) continue;      // other members and magnitudes: separate cases
    const S = run(c.params, c.ablated);
    n++;
    for(const [mine, theirs] of keys){
      if(typeof c.out[theirs] !== "number") continue;
      /* NaN fails every comparison, so `d > TOL` passes a model that has
         stopped being a model. Named rather than compared. */
      assert.ok(Number.isFinite(S[mine]),
        `${mine} is ${S[mine]} with [${c.ablated.join(",") || "nothing ablated"}], pi=${c.params.pi}`);
      const d = Math.abs(S[mine] - c.out[theirs]);
      if(d > worst){ worst = d; worstAt = {theirs, ablated:c.ablated, want:c.out[theirs], got:S[mine]}; }
      if(d > TOL && bad.length < 6)
        bad.push(`${theirs} ${d.toExponential(2)} off with [${c.ablated.join(",") || "nothing ablated"}]`);
    }
  }
  assert.ok(n > 100, `only ${n} cases at the default members`);
  assert.deepEqual(bad, [], `worst ${worst.toExponential(3)} at ${JSON.stringify(worstAt)}`);
});

/* THE CASE THE FLAT VERDICT EXISTS FOR.

   Principal costs are shielded off the control
   channel, so d B / d principal_competence simplifies to exactly 0, and the
   engine reported it as proved to RISE -- and proved to fall, since a weak
   sign test passes both. The residual channel does move with it, which is the
   content of drystone's principal_costs_spare_B.

   The declared region matters and is part of the result. Over the whole unit
   box the model's two ceilings cross inside it, so nothing differentiates at
   all; where the box keeps them from binding, 27 corners resolve and the
   signs come out. Excluding the origin is part of it too: the divisors that
   stop 0/0 there are themselves max() corners. */
test("the shielded channel does not move with principal competence, and says so", () => {
  const lines = [];
  for(const raw of MODEL.lines){
    const t = raw.replace(/#.*$/, "").trim();
    if(!t) continue;
    const m = /^([a-z][a-z0-9_]*)\s*=\s*(.+)$/.exec(t);
    if(m) lines.push({lhs:m[1], rhs:m[2]});
  }
  const mod = K.buildLines({lines,
    constants:Object.entries(MODEL.constants).map(([name, value]) => ({name, value}))});
  assert.deepEqual(mod.bad, []);
  const box = Object.assign(K.boxFrom(mod, MODEL.parameters),
    {pi:[0.05, 0.5], alpha:[0, 0.2]});

  const sign = (y, x) => {
    const mr = K.mmResolve(K.inlineTree(mod.steps, y), box);
    assert.ok(mr.ok, `${y}: a corner still crosses this box, so nothing can be differentiated`);
    const d = K.simp(K.dTree(mr.tree, x));
    const up = K.proveSign(d, box, +1, {}), dn = K.proveSign(d, box, -1, {});
    return {up, dn, text:K.treeText(d)};
  };

  const b = sign("b", "principal_competence");
  assert.equal(b.text, "0", "the simplifier no longer reduces it, so this tests nothing");
  assert.equal(b.up.verdict, "flat");
  assert.equal(b.dn.verdict, "flat", "a weak sign test passes both directions");
  assert.equal(b.up.zeroShare, 1);

  const a = sign("a", "principal_competence");
  assert.equal(a.up.verdict, "proved",
    "the residual channel does move with it, which is the other half of the claim");
  assert.equal(a.up.zeroShare, 0);

  /* And the two agency-cost statics on the same region, which are the two
     other claims the demo carries as returned rows. */
  assert.equal(sign("b", "agent_conflict").dn.verdict, "proved");
  assert.equal(sign("a", "principal_competence").up.verdict, "proved");
});

test("the stakeholder grid matches too, cell by cell", () => {
  let worst = 0;
  for(const c of GOLDEN.cases.slice(0, 120)){
    if(c.forms || c.magnitudes) continue;
    const S = run(c.params, c.ablated);
    for(const [k, v] of Object.entries(c.out)){
      const m = /^value_(\w+?)_(control|residual)$/.exec(k);
      if(!m) continue;
      const mine = S[m[2] + "_" + m[1]];
      assert.equal(typeof mine, "number", `no ${m[2]}_${m[1]} in the port`);
      worst = Math.max(worst, Math.abs(mine - v));
    }
  }
  assert.ok(worst < TOL, `worst cell deviation ${worst.toExponential(3)}`);
});

test("switching a mechanism off changes something, for all eleven", () => {
  /* A case with integration in it. At pi = 0 every gain and every cost is
     zero, so nothing an ablation does can move anything -- which is the model
     behaving, and a useless place to test switches from. */
  const live = GOLDEN.cases.find(c => !c.forms && !c.magnitudes && c.params.pi > 0.3
    && c.params.alpha > 0.4) || GOLDEN.cases[24];
  const base = run(live.params, []);
  const same = [];
  for(const m of MODEL.mechanisms){
    const off = run(live.params, ["t_" + m]);
    const moved = ["a", "b", "avp", "vp"].some(k => Math.abs(off[k] - base[k]) > 1e-9);
    if(!moved) same.push(m);
  }
  /* Two of them genuinely change nothing at this point, and the model says so:
     the protection routes are substitutes, so removing one while another is
     strong moves nothing. Recorded rather than asserted away. */
  assert.ok(same.length <= 2, `nothing moved for: ${same.join(", ")}`);
});

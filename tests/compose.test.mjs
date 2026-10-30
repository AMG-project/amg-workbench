/* core: how mechanisms combine, as one writer, and what swapping it must keep.

   The composition rule is a declaration like any other, and it is the one a
   conclusion most easily rests on without anything ever asking what would
   happen if it were different: step 3.1 declared it, the
   skeleton wrote it, and step 4.1's declared set could vary every shape class
   and not this. The spec listed it as the one search axis that was not built.

   What is checked here is the part that can be checked without a browser: that
   the five rules come out as the five things they are supposed to be, that a
   CAP around a composition survives being recomposed, and that a min which is
   part of the composition is not mistaken for one.

   The cap is the half that matters. An outcome written `min(<composition>,
   ceil_rights)` has a cap that is a separate declaration, and dropping it
   would turn a bounded outcome unbounded -- and worse, a min is exactly what
   puts a corner in a derivative, so losing one changes what the method can
   decide. The first version of compCap read min as an operator node when
   rpnTree returns a function node, so it found a cap nowhere; that failure
   looks identical to there being no cap, which is why it is tested rather
   than eyeballed.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPRULES, compCap, compRecompose, compWrite } from "../docs/bench/core/compose.js";
import * as K from "../docs/bench/core/kernel.js";

const T3 = ["t_a", "t_b", "t_c"];
/* Read a line back the way the page does, so what is asserted is that the
   line PARSES and what it means, not that it matches a string. */
const parse = src => {
  const e = K.readExpr(src, new Set(K.NAMESIN(src)));
  return {rpn:e.rpn, tree:K.rpnTree(e.rpn)};
};
const at = (src, env) => K.evalRPN(parse(src).rpn, env);

test("the five rules are the five things they are supposed to be", () => {
  assert.deepEqual(COMPRULES, ["additive", "multiplicative", "min", "max", "ces"]);
  const E = {t_a:0.2, t_b:0.5, t_c:0.8, rho:2};
  assert.equal(at(compWrite("additive", T3), E), 1.5);
  assert.ok(Math.abs(at(compWrite("multiplicative", T3), E) - 0.08) < 1e-12);
  assert.equal(at(compWrite("min", T3), E), 0.2);
  assert.equal(at(compWrite("max", T3), E), 0.8);
  /* A MEAN, which is the property the shares are there for: the power mean
     with weights summing to one lies between the smallest term and the largest
     at every rho. Without them two terms in [0, 1] reach 2 at rho = 1. */
  for(const rho of [0.5, 1, 2, 4]){
    const v = at(compWrite("ces", T3, "rho"), Object.assign({}, E, {rho}));
    assert.ok(v >= 0.2 - 1e-9 && v <= 0.8 + 1e-9,
      `ces at rho=${rho} gave ${v}, which is not between the smallest term and the largest`);
  }
});

test("one mechanism has no composition, and every rule says the same thing", () => {
  for(const r of COMPRULES) assert.equal(compWrite(r, ["t_a"]), "t_a");
  assert.equal(compWrite("additive", []), "");
});

test("every rule writes a line the kernel can read", () => {
  for(const r of COMPRULES){
    const src = compWrite(r, T3, "rho");
    assert.doesNotThrow(() => parse(src), `${r}: ${src} does not parse`);
  }
});

test("a cap around a composition survives being recomposed", () => {
  const line = "min(t_a * t_b, ceil_rights)";
  const cap = compCap(line, ["t_a", "t_b"]);
  assert.deepEqual(cap, {fn: "min", cap: "ceil_rights"});
  for(const r of COMPRULES){
    const out = compRecompose(line, r, ["t_a", "t_b"], "rho");
    assert.ok(/^min\(/.test(out) && /ceil_rights\)$/.test(out),
      `${r} lost the cap: ${out}`);
    /* And it still binds. A cap below the composition has to clamp it, or the
       recomposed line is bounded in shape and not in behaviour. */
    const v = at(out, {t_a:0.9, t_b:0.9, ceil_rights:0.3, rho:2});
    assert.ok(v <= 0.3 + 1e-12, `${r}: the cap does not bind, got ${v}`);
  }
  /* A floor written as max survives too, including one that is an expression
     rather than a bare name. */
  const f = compCap("max(t_a + t_b, 0.2 * floor_k)", ["t_a", "t_b"]);
  assert.equal(f.fn, "max");
  assert.ok(/floor_k/.test(f.cap));
});

test("a min that IS the composition is not mistaken for a cap", () => {
  /* Both arguments mention a term, so this min combines them rather than
     capping them, and rewriting around it would be guessing. */
  assert.equal(compCap("min(t_a, t_b)", ["t_a", "t_b"]), null);
  assert.equal(compCap("min(t_a + t_b, t_c)", T3), null);
  /* Neither argument mentions one: not a cap on this composition either. */
  assert.equal(compCap("min(w1, w2)", T3), null);
  /* No wrapper at all is the common case. */
  assert.equal(compCap("w_clarity * t_a + w_mission * t_b", ["t_a", "t_b"]), null);
  assert.equal(compCap("t_a + t_b", ["t_a", "t_b"]), null);
});

test("an unreadable line is left alone rather than half-rewritten", () => {
  assert.equal(compCap("min(t_a,", ["t_a"]), null);
  /* With no terms there is nothing to compose, so the line stands. */
  assert.equal(compRecompose("t_a + t_b", "min", []), "t_a + t_b");
});

test("THE WEIGHTS ARE DROPPED, AND THAT IS SOUND FOR A SIGN", () => {
  /* A line may read `w_clarity * t_a + w_mission * t_b`, and the rules other
     than additive and ces have nowhere to put a weight. What the declared set
     does with a rewritten line is RE-SIGN every proposition over it, and a
     positive constant factor cannot change the sign of a derivative -- which
     is the whole justification, so it is asserted rather than asserted in a
     comment. */
  const terms = ["t_a", "t_b"];
  const weighted = "3 * t_a + 7 * t_b";
  const bare = compRecompose(weighted, "additive", terms);
  assert.equal(bare, "t_a + t_b");
  for(const name of terms){
    const dW = K.simp(K.dTree(parse(weighted).tree, name));
    const dB = K.simp(K.dTree(parse(bare).tree, name));
    const box = {t_a:[0, 1], t_b:[0, 1]};
    const sW = K.ivalTree(dW, box), sB = K.ivalTree(dB, box);
    assert.ok(sW[0] > 0 && sB[0] > 0,
      `the sign of d/d${name} differs once the weights are dropped: ` +
      `${JSON.stringify(sW)} against ${JSON.stringify(sB)}`);
  }
});

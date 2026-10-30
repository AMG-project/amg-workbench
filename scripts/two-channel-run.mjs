/* The two-channel model, built from the grammar and runnable under node.
 *
 * This construction was written inside tests/scope.test.mjs, where it was the
 * acceptance test for removing drystone: the same numbers, out of the kernel
 * grammar instead of the Python engine. scripts/model_report.mjs needs exactly
 * the same model, so it lives here and both read it. Two copies of a model
 * construction is how a test and the file it vouches for come to disagree.
 *
 * What a caller gets: every combination of the three declared classes, and a
 * `run` for any one of them -- a function from a parameter point to the
 * model's variables. core/scope-run.js turns that into readings and verdicts.
 *
 * The members come out of docs/bench/core/vocab.js, which is the only source
 * of the families, and are read as TEXT and parsed so that what is
 * tested is the file a browser is served.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as K from "../docs/bench/core/kernel.js";

const here = dirname(fileURLToPath(import.meta.url));
const read = p => JSON.parse(fs.readFileSync(join(here, "..", p), "utf8"));

const MODEL = read("models/purpose-two-channel.json");
const META = read("models/purpose-two-channel-meta.json");
const POINTS = read("docs/showcase-a/scope-points.json");

const VOCAB = (() => {
  const src = fs.readFileSync(join(here, "..", "docs", "bench", "core", "vocab.js"), "utf8");
  const body = src.slice(0, src.indexOf("\nexport {") + 1 || undefined);
  return JSON.parse(body.slice(body.indexOf("{"), body.lastIndexOf("}") + 1));
})();
const familyOf = name => VOCAB.families.find(f => f.name === name);

const SLOTS = Object.entries(MODEL.classes);          // credibility, saturating, convex_cost
const BOUNDS = MODEL.parameters;
/* The point every published figure was drawn at. A report taken anywhere else
   would not be the one the paper reports, so it is read from the frozen
   sample rather than written again here. */
const CENTRE = POINTS.points[0];

/* Every combination of the declared classes, labelled the way drystone
   labelled them: credibility/saturating/convex_cost. */
function combinations(){
  const lanes = SLOTS.map(([, c]) => familyOf(c.family).members);
  const out = [];
  for(const a of lanes[0]) for(const b of lanes[1]) for(const c of lanes[2])
    out.push({label:[a[0], b[0], c[0]].join("/"),
              members:{[SLOTS[0][0]]:a, [SLOTS[1][0]]:b, [SLOTS[2][0]]:c}});
  return out;
}

/* The model, with one combination's members substituted for the defaults. The
   lines name their member expressions inline, so the substitution is textual
   and then parsed, which is what the page does when a family is picked. */
function makeRun(combo){
  const scope = new Set([...Object.keys(MODEL.constants), ...Object.keys(MODEL.parameters)]);
  const steps = [];
  const sub = {};
  for(const [slot, c] of SLOTS){
    const want = combo.members[slot];
    sub[slot] = {from:familyOf(c.family).members.find(m => m[0] === c.member)[1], to:want[1]};
  }
  for(const raw of MODEL.lines){
    let t = raw.replace(/#.*$/, "").trim();
    if(!t) continue;
    const m = /^([a-z][a-z0-9_]*)\s*=\s*(.+)$/.exec(t);
    let rhs = m[2];
    /* eff, sat and cvx are the three slots, each written as its default
       member over one argument. Swapping the member is swapping that text. */
    const slot = m[1] === "eff" || m[1] === "eff_0" ? "credibility"
      : m[1] === "sat" || m[1] === "sat_0" ? "saturating"
      : m[1] === "cvx" ? "convex_cost" : null;
    if(slot){
      const inner = m[1] === "eff" ? "pi" : m[1] === "eff_0" ? "0"
        : m[1] === "sat" ? "eff" : m[1] === "sat_0" ? "eff_0" : "pi";
      rhs = sub[slot].to.replace(/X/g, `(${inner})`);
    }
    const r = K.readExpr(rhs, scope);
    steps.push({lhs:m[1], rpn:r.rpn});
    scope.add(m[1]);
  }
  return params => {
    const V = Object.create(null);
    Object.assign(V, MODEL.constants, params);
    for(const s of steps) V[s.lhs] = K.evalRPN(s.rpn, V);
    return V;
  };
}

/* The declared classes as the bench shows them: the slot's own declaration,
   which is prose the grammar does not carry, over the members and properties
   of the family it names. One source for the members, one for the words. */
function declaredClasses(){
  return SLOTS.map(([slot, c]) => {
    const f = familyOf(c.family);
    return {name:slot, properties:f.properties, members:f.members.map(m => m[0]),
            declared:META.class_declarations[slot]};
  });
}

const defaultForms = () => Object.fromEntries(SLOTS.map(([slot, c]) => [slot, c.member]));

export { BOUNDS, CENTRE, MODEL, META, POINTS, SLOTS, VOCAB, combinations, declaredClasses,
  defaultForms, familyOf, makeRun };

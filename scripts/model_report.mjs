/** What the model said, as data the bench can read. The model half of
 *  docs/bench/model-report.js; scripts/export_bench_model.py adds the corpus
 *  half and writes the file.
 *
 *  The bench does not run the model. It shows what the model already returned,
 *  so step four can adjudicate conclusions without the enumeration engine
 *  being carried into a curation page.
 *
 *  Two things are emitted per conclusion, and they answer different questions:
 *
 *    survival   over how many of the declared class it holds, and the NAMES of
 *               the members that break it. Which alternative broke a
 *               conclusion is a fact about the theory; the share is a fact
 *               about how many members its author chose to declare.
 *    margin     how far it is from failing, where that has a scalar at all.
 *               Six of the nine compare value quantities and are reported as a
 *               share of the additional value at the optimum. Two compare
 *               positions and are reported in units of pi. One is a shape
 *               property with no scalar, and says so. Step four's threshold --
 *               how large a difference has to be before the theory is about it
 *               -- has nothing to act on without this.
 *
 *  WHAT CHANGED WHEN DRYSTONE WENT. This script used to import
 *  docs/explorer/model.mjs, the JS port of the Python model, and both are
 *  gone. It now builds the model from models/purpose-two-channel.json
 *  through scripts/two-channel-run.mjs, and asks the nine claims in
 *  docs/bench/core/scope-run.js -- the same construction tests/scope.test.mjs
 *  holds to scope.json's numbers, which is what makes this a reconstruction
 *  rather than a second opinion. The margins below are the deleted script's,
 *  transcribed: each mirrors its own claim's predicate, and the shocks are the
 *  same ones, because a 0.40 move within declared bounds of [0, 1] is the
 *  `min(1, p + 0.4)` the port used.
 *
 *  Usage:  node scripts/model_report.mjs        (writes JSON to stdout)
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as S from "../docs/bench/core/scope-run.js";
import { BOUNDS, CENTRE, MODEL, META, combinations, declaredClasses, defaultForms,
  makeRun } from "./two-channel-run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = p => JSON.parse(fs.readFileSync(join(here, "..", p), "utf8"));

/* Sheet 1 of the source sketch: the point every published figure was drawn at.
   The sweep sets pi itself, so it is 0 here as it was in the deleted script. */
const P = {...CENTRE, pi: 0};

/* THE POINT IS NOT A CHOICE MADE HERE. scope.json reports its grid around a
   centre, and a report taken at a different point is not the one the paper
   reports -- so if the frozen sample and the frozen grid ever disagree about
   where the centre is, that stops this rather than being averaged over. */
const GRID = read("docs/showcase-a/scope.json").grid;
for(const k of Object.keys(GRID.centre)){
  if(Math.abs(GRID.centre[k] - P[k]) > 1e-12)
    throw new Error(`scope-points.json and scope.json disagree about the centre: ` +
      `${k} is ${P[k]} in the sample and ${GRID.centre[k]} in the grid`);
}

/* The four curves every margin is written against: the model here, and the
   model with one parameter shocked. They are the same shocks the claims
   themselves use, which is the point -- a margin that moved a different
   parameter would not be measuring its own claim. */
const bundle = p => ({
  base: p(),
  alpha: p({alpha: p.up("alpha")}),
  competence: p({principal_competence: p.down("principal_competence")}),
  agent: p({agent_conflict: p.up("agent_conflict")}),
});

/* A value difference as a share of the additional value at the optimum, which
   is what makes six of these comparable with each other and with a threshold
   somebody declares on step four. */
const share = (x, r) => {
  const denom = r.base.AVp[r.base.star];
  return denom > 1e-12 ? x / denom : null;
};

/* One margin per conclusion, mirroring its own predicate. A margin is the
   amount by which the predicate's binding comparison is satisfied: negative
   when the conclusion fails, so a reader can see how badly. */
const MARGIN = {
  mb_single_peaked: () => null,            // a shape property; no scalar to report
  interior_optimum: r => {
    const pi = r.base.pi[r.base.star];
    return {kind:"pi", value: Math.min(pi - 0.05, 0.95 - pi)};
  },
  mb_starts_at_origin: r => {
    let top = -Infinity;
    for(const v of r.base.MB) if(v > top) top = v;
    return {kind:"share", value: top > 1e-12 ? (0.1 * top - r.base.MB[0]) / top : null};
  },
  channels_non_negative: r => {
    /* From i = 1. Both channels are zero at pi = 0 by construction, so a
       margin measured from the origin is zero for every member and says
       nothing. */
    let worst = Infinity;
    for(let i = 1; i <= r.base.star; i++) worst = Math.min(worst, r.base.A[i], r.base.B[i]);
    return {kind:"share", value: share(worst, r)};
  },
  residual_exhausted_first: r =>
    r.base.bar === null
      ? {kind:"pi", value: null}
      : {kind:"pi", value: (r.base.star - r.base.bar) / (r.base.pi.length - 1)},
  soft_governance_raises_B: r => {
    const k = r.base.star;
    return {kind:"share", value: share(r.alpha.B[k] - r.base.B[k], r)};
  },
  soft_governance_substitutes: r => {
    const k = r.base.star;
    return {kind:"share",
      value: share(Math.min(r.alpha.B[k] - r.base.B[k], r.base.A[k] - r.alpha.A[k]), r)};
  },
  principal_costs_spare_B: r => {
    const k = r.base.star;
    return {kind:"share", value: share(r.base.A[k] - r.competence.A[k], r)};
  },
  agency_costs_hit_both: r => {
    const k = r.base.star;
    return {kind:"share",
      value: share(Math.min(r.base.A[k] - r.agent.A[k], r.base.B[k] - r.agent.B[k]), r)};
  },
};

const round = x => (x === null || !Number.isFinite(x) ? null : Math.round(x * 1e6) / 1e6);

const combos = combinations();
const failures = {}, kept = {};
for(const c of S.SCOPE_CLAIMS){ failures[c.id] = []; kept[c.id] = []; }

for(const combo of combos){
  const probe = S.scopeProbe(makeRun(combo), P, BOUNDS, {n: GRID.resolution});
  const r = bundle(probe);
  for(const c of S.SCOPE_CLAIMS){
    let ok;
    try{ ok = c.holds(probe); }catch(e){ ok = false; }
    const m = MARGIN[c.id](r);
    (ok ? kept : failures)[c.id].push({forms: combo.label, margin: m && round(m.value)});
  }
}

const atDefault = (() => {
  const want = defaultForms();
  const combo = combos.find(c => Object.entries(want)
    .every(([slot, member]) => c.members[slot][0] === member));
  if(!combo) throw new Error("the default forms are not a member of the declared class");
  return bundle(S.scopeProbe(makeRun(combo), P, BOUNDS, {n: GRID.resolution}));
})();

/* THE CLAIM AS THE MODEL STATES IT, not as the bench labels it. core/
   scope-run.js carries the nine as predicates with short labels of its own --
   "Softer governance raises the pinned-down channel" -- and the model's own
   sentence names the sheet of the source sketch it was drawn for: "Sheet 2a:
   AI-enabled contractibility raises the control channel." The report is about
   the model, so it gets the model's sentence, and falls back to the
   predicate's label rather than printing nothing if a claim is added to the
   set before the model declares a sentence for it. */
const conclusions = S.SCOPE_CLAIMS.map(c => {
  const m = MARGIN[c.id](atDefault);
  const ms = kept[c.id].map(x => x.margin).filter(x => x !== null);
  return {
    id: c.id,
    text: (META.claim_texts || {})[c.id] || c.text,
    survives: kept[c.id].length,
    of: combos.length,
    breaks: failures[c.id].map(x => x.forms),
    margin: {
      kind: m ? m.kind : "none",
      at_default: m ? round(m.value) : null,
      min_over_class: ms.length ? round(Math.min(...ms)) : null,
    },
  };
});

process.stdout.write(JSON.stringify({
  model: {
    id: MODEL.id,
    title: MODEL.title,
    source: META.paper,
    settings: META.settings,
    params: P,
    combinations: combos.length,
    classes: declaredClasses(),
    default_forms: defaultForms(),
  },
  conclusions,
}, null, 1) + "\n");

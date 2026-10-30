/* Running a declared set, and reporting what survives it.

   Step 4.1 declares which of the class to explore and sizes it; this is the
   half that runs it.

   The two dimensions are kept apart on purpose. A conclusion can be robust to
   every shape and fragile to the parameter setting, and reporting one number
   is how a result that holds for 100 of 100 forms gets called robust while
   the setting breaks it a third of the time. soft_governance_raises_B is
   exactly that: 100 of 100 on forms, 1,638 of 2,400 jointly.

   Loads in the page and under node. Nothing here touches the DOM. */
"use strict";
/* ONE TOLERANCE, IN ONE PLACE. A curve sampled at 201 points is never exactly
   monotone, and the slack these predicates read against was written out twice
   here as a literal -- which made core/curve.js's claim that a scholar can
   move it by editing one constant false. Found by trying to write the worked
   example that says so; the number is unchanged. */
import { ATOL } from "./curve.js";

/* The derivative of a curve sampled on an even grid, by central differences
   with one-sided ends. numpy.gradient's rule, because the values this is
   checked against were produced by it. */
function scopeGradient(y, x){
  const n = y.length, d = new Array(n);
  if(n < 2) return y.map(() => 0);
  d[0] = (y[1] - y[0]) / (x[1] - x[0]);
  d[n - 1] = (y[n - 1] - y[n - 2]) / (x[n - 1] - x[n - 2]);
  for(let i = 1; i < n - 1; i++) d[i] = (y[i + 1] - y[i - 1]) / (x[i + 1] - x[i - 1]);
  return d;
}

/* One sweep of the model over purpose integration, with the series the nine
   claims are stated in. A is computed as AVp - B rather than read off the
   model's own outcome, which is what drystone did and what the published
   numbers were produced with. */
function scopeReading(run, params, pi0, pi1, n){
  const xs = [], avp = [], bs = [];
  for(let i = 0; i < n; i++){
    const pi = pi0 + (pi1 - pi0) * i / (n - 1);
    const S = run({...params, pi});
    xs.push(pi); avp.push(S.avp); bs.push(S.b);
  }
  const a = avp.map((v, i) => v - bs[i]);
  const mb = scopeGradient(avp, xs), c = scopeGradient(bs, xs);
  let star = 0;
  for(let i = 1; i < avp.length; i++) if(avp[i] > avp[star]) star = i;
  let bar = null;
  for(let i = 0; i < c.length; i++) if(c[i] > mb[i]){ bar = i; break; }
  return {pi:xs, AVp:avp, A:a, B:bs, MB:mb, c, star, bar};
}

/* The nine claims of the two-channel model, as predicates that can fail.
   Each takes a probe: `p()` is the curve here, `p({alpha: v})` the curve with
   an override, and `up`/`down` move a parameter by 0.40 of its range from
   wherever it sits -- a relative shock, because an absolute target inverts
   the comparison wherever the sampled baseline already sits past it. */
const SCOPE_CLAIMS = [
  {id:"mb_single_peaked", text:"MB rises then falls and never turns back up.",
   holds: p => {
     const mb = p().MB;
     let peak = 0;
     for(let i = 1; i < mb.length; i++) if(mb[i] > mb[peak]) peak = i;
     if(peak === 0 || peak === mb.length - 1) return false;
     let floor = mb[peak];
     for(let i = peak; i < mb.length; i++){
       if(mb[i] > floor + ATOL) return false;
       floor = Math.min(floor, mb[i]);
     }
     return true;
   }},
  {id:"interior_optimum", text:"Total additional value is maximal at an interior pi.",
   holds: p => { const r = p();
     return r.pi[r.star] > 0.05 && r.pi[r.star] < 0.95 && r.AVp[r.star] > 0; }},
  {id:"mb_starts_at_origin", text:"Purpose returns nothing until it is believed.",
   holds: p => { const mb = p().MB; return mb[0] <= 0.10 * Math.max(...mb); }},
  {id:"channels_non_negative", text:"Neither channel is negative up to the optimum.",
   holds: p => { const r = p();
     for(let i = 0; i <= r.star; i++) if(r.A[i] < -ATOL || r.B[i] < -ATOL) return false;
     return true; }},
  {id:"residual_exhausted_first", text:"The control boundary meets MB before the optimum.",
   holds: p => { const r = p(); return r.bar !== null && r.bar < r.star; }},
  {id:"soft_governance_raises_B", text:"Softer governance raises the pinned-down channel.",
   holds: p => { const b = p(), s = p({alpha: p.up("alpha")});
     return s.B[b.star] > b.B[b.star]; }},
  {id:"soft_governance_substitutes", text:"It raises B and lowers A: the channels substitute.",
   holds: p => { const b = p(), s = p({alpha: p.up("alpha")});
     return s.B[b.star] > b.B[b.star] && s.A[b.star] < b.A[b.star]; }},
  {id:"principal_costs_spare_B", text:"Principal costs take from A alone.",
   holds: p => { const b = p(), s = p({principal_competence: p.down("principal_competence")});
     return s.A[b.star] < b.A[b.star] && Math.abs(s.B[b.star] - b.B[b.star]) < 1e-12; }},
  {id:"agency_costs_hit_both", text:"Agency costs take from both channels.",
   holds: p => { const b = p(), s = p({agent_conflict: p.up("agent_conflict")});
     return s.A[b.star] < b.A[b.star] && s.B[b.star] < b.B[b.star]; }}
];

/* A probe over one form combination and one parameter point. The curve is
   computed once per distinct override set and kept, because every claim asks
   for the baseline and four of them ask for one shock. */
function scopeProbe(run, params, bounds, opts){
  const o = opts || {}, n = o.n || 201;
  const cache = new Map();
  const at = over => {
    const k = JSON.stringify(over || {});
    if(!cache.has(k)) cache.set(k, scopeReading(run, {...params, ...(over || {})}, 0, 1, n));
    return cache.get(k);
  };
  const move = (key, by) => {
    const b = bounds[key] || [0, 1];
    return Math.min(b[1], Math.max(b[0], params[key] + by * (b[1] - b[0])));
  };
  at.up = (key, by) => move(key, by == null ? 0.40 : by);
  at.down = (key, by) => move(key, -(by == null ? 0.40 : by));
  return at;
}

/* Every claim over every combination of the declared set, and over every
   parameter point. Returns the two dimensions separately and jointly, in the
   shape scope.json reports them. */
function scopeRun(makeRun, combos, points, bounds, opts){
  const o = opts || {};
  const claims = (o.claims || SCOPE_CLAIMS);
  const out = claims.map(c => ({id:c.id, text:c.text,
    forms:{held:0, of:0}, params:{held:0, of:0}, joint:{held:0, of:0},
    breaks:[], first_failure:null}));
  const centre = o.centre || points[0];

  combos.forEach((combo, ci) => {
    const run = makeRun(combo);
    points.forEach((pt, pi) => {
      const probe = scopeProbe(run, pt, bounds, o);
      claims.forEach((c, k) => {
        let ok;
        try{ ok = c.holds(probe); }catch(e){ ok = false; }
        const row = out[k];
        row.joint.of++;
        if(ok) row.joint.held++;
        else {
          if(!row.first_failure) row.first_failure = {forms:combo.label, params:pt};
          if(row.breaks.indexOf(combo.label) < 0 && pt === centre) row.breaks.push(combo.label);
        }
        if(pt === centre){ row.forms.of++; if(ok) row.forms.held++; }
        if(ci === 0){ row.params.of++; if(ok) row.params.held++; }
      });
    });
  });
  for(const r of out){
    r.forms.universal = r.forms.held === r.forms.of;
    r.joint.universal = r.joint.held === r.joint.of;
    r.params.universal = r.params.held === r.params.of;
  }
  return out;
}


/* The page does not load this file -- it runs only under node, in
   tests/scope.test.mjs -- so `module_map.py --emit` never saw it and the
   export is written by hand. */
export { scopeGradient, scopeReading, scopeProbe, scopeRun, SCOPE_CLAIMS };

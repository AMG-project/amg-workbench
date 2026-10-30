/* core: the invariants, run.

   What the arithmetic is held to once it parses. Six derived invariants --
   five properties of numbers at a point or over a sweep, and conservation,
   answered by switching the transfer off and watching the total -- plus two
   checks that are not invariants at all but faithfulness to the declarations:
   that the arithmetic uses every mechanism declared to write an outcome, and
   that switching a mechanism off moves what it writes, which is the whole
   premise of an ablation.

   262 lines that decide the verdict a reader sees beside a kept model
   ("arithmetic holds 4 of 4"), and they had no test until they moved here.

   HOW IT READS THE DECLARATIONS. Not by reaching for the page. The model
   carries them: buildArith() attaches `decl`, ten thin bindings over what the
   curation says about a quantity or a relation -- its name, its bounds, its
   kinds and aspects, a relation's roles and shape properties, the carried
   variables, the mechanism names, the substitute sets. So a test can hand
   this a model with declarations of its own, and nothing here can ask the
   page a question the model did not carry.

   The sampling is seeded on purpose. The same curation has to give the same
   verdicts on somebody else's machine or the verdicts are not evidence, and
   the call scores reproducibility directly.

   core/ RULE: nothing in this file may import from outside core/.
   scripts/check_bench.py fails the build if one does. */

import { ATOL, afin, amono, apeak } from "./curve.js";
import { evalRPN, readExpr } from "./kernel.js";
function runAt(M, p, off){
  const S = Object.create(null);
  for(const k of M.params) S[M.decl.name(k)] = p[M.decl.name(k)];
  for(const c of M.consts) S[c.name] = c.value;
  for(const s of M.steps){
    let v = evalRPN(s.rpn, S);
    if(off && s.kind === "term" && off.has(s.lhs)) v = 0;
    S[s.lhs] = v;
  }
  return S;
}

/* A fixed sequence and not a random one. The same curation has to give the
   same verdicts on someone else's machine or the verdicts are not evidence,
   and the call scores reproducibility directly. */
function alcg(seed){ let x = seed >>> 0;
  return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
function asamples(M, n){
  const rnd = alcg(20261020), out = [];
  const mk = (f, tag) => { const p = Object.create(null);
    for(const k of M.params){ const b = M.decl.bounds(k);
      p[M.decl.name(k)] = b[0] + (b[1] - b[0]) * f(); } return {tag, p}; };
  out.push(mk(() => 0, "every parameter at its low bound"));
  out.push(mk(() => 1, "every parameter at its high bound"));
  out.push(mk(() => 0.5, "every parameter at its midpoint"));
  for(let i = 0; i < n; i++) out.push(mk(rnd, "sample " + (i + 1)));
  return out;
}
function asweep(M, xk, yk, n, off){
  const b = M.decl.bounds(xk), xs = [], ys = [];
  for(let i = 0; i <= n; i++){
    const p = Object.create(null);
    for(const k of M.params){ const c = M.decl.bounds(k);
      p[M.decl.name(k)] = k === xk ? b[0] + (b[1] - b[0]) * i / n : (c[0] + c[1]) / 2; }
    xs.push(p[M.decl.name(xk)]); ys.push(runAt(M, p, off || null)[yk]);
  }
  return {xs, ys};
}

/* The invariants, run. All six of the derived ones are answered here now:
   five are properties of numbers at a point or over a sweep, and conservation
   is answered by switching the transfer off and watching the total, which
   needs no second engine. Two checks are not invariants at all but
   faithfulness to the declarations: that the arithmetic uses every mechanism
   declared to write an outcome, and that switching a mechanism off moves what
   it writes -- which is the whole premise of an ablation. */
function checkArith(M, spec){
  const rows = [], pts = asamples(M, 21);
  const runs = pts.map(x => ({tag:x.tag, S:runAt(M, x.p, null)}));
  const push = (k, n, verdict, why, over) =>
    rows.push({k, n, verdict, why, over:over || ""});
  const outs = M.outs, vn = M.decl.name;

  const nan = [];
  for(const r of runs) for(const k of outs)
    if(!afin(r.S[vn(k)])){ nan.push(vn(k) + " at " + r.tag); break; }
  push("numbers_are_numbers", "every outcome is a finite number",
    nan.length ? "fail" : "pass",
    nan.length
      ? nan.length + " of " + runs.length + " points returned something that is not a number: " + nan[0]
      : "over " + runs.length + " points in the declared parameter box, three of them its corners",
    outs.length + " qty");

  const bq = outs.filter(M.decl.bounded), ob = [], nf = [];
  const undec = outs.filter(k => !M.decl.bounded(k));
  for(const k of bq){
    const b = M.decl.bounds(k);
    let broke = false;
    for(const r of runs){
      const v = r.S[vn(k)];
      if(!afin(v)){ nf.push(vn(k)); broke = true; break; }
      if(v < b[0] - ATOL || v > b[1] + ATOL){
        ob.push(vn(k) + " reaches " + v.toFixed(3) + " at " + r.tag + ", outside [" +
          b[0] + ", " + b[1] + "]");
        broke = true; break;
      }
    }
    if(broke) continue;
  }
  const held = bq.length - ob.length - nf.length;
  if(bq.length) push("within_bounds", "every outcome stays inside its declared bounds",
    ob.length ? "fail" : "pass",
    (ob.length ? ob[0] + (ob.length > 1 ? " (and " + (ob.length - 1) + " more)" : "")
      : held + " bounded outcome" + (held === 1 ? "" : "s") + " held at every point") +
    (nf.length ? "; " + nf.length + " could not be read at all, being " +
      (nf.length === 1 ? "no number" : "not numbers") + ": " + nf[0] : "") +
    (undec.length ? "; " + undec.length + " left out, having no declared bound" : ""),
    bq.length + " qty");
  else if(undec.length) push("within_bounds", "every outcome stays inside its declared bounds",
    "skip",
    "not run: no outcome carries a bound anybody declared. The 0 to 1 beside each one is " +
    "this page's default, and holding arithmetic to a default is how a decision nobody " +
    "took becomes a result.", undec.length + " qty");

  const pq = outs.filter(k => M.decl.kinds(k).includes("propensity")), op = [];
  for(const k of pq) for(const r of runs){
    const v = r.S[vn(k)];
    if(afin(v) && (v < -ATOL || v > 1 + ATOL)){
      op.push(vn(k) + " reaches " + v.toFixed(3) + " at " + r.tag); break; }
  }
  if(pq.length) push("propensity_in_unit", "every propensity is in the unit interval",
    op.length ? "fail" : "pass",
    op.length ? op[0] + ", and a propensity outside [0, 1] is not a propensity"
      : pq.length + " propensity-kind outcome" + (pq.length === 1 ? "" : "s") + " held at every point",
    pq.length + " qty");

  const sq = outs.filter(k => M.decl.kinds(k).includes("share"));
  if(sq.length) push("share_sums_to_one", "the shares sum to one",
    sq.length < 2 ? "skip" : (() => {
      let worst = 0, at = "";
      for(const r of runs){
        const t = sq.reduce((z, k) => z + (r.S[vn(k)] || 0), 0);
        if(Math.abs(t - 1) > Math.abs(worst)){ worst = t - 1; at = r.tag; }
      }
      return Math.abs(worst) > 1e-6 ? "fail" : "pass";
    })(),
    sq.length < 2
      ? "not run: one quantity is declared a share, and one share has nothing to sum with. Declare the others or the check is empty."
      : (() => {
          let worst = 0, at = "";
          for(const r of runs){
            const t = sq.reduce((z, k) => z + (r.S[vn(k)] || 0), 0);
            if(Math.abs(t - 1) > Math.abs(worst)){ worst = t - 1; at = r.tag; }
          }
          return (Math.abs(worst) > 1e-6
            ? "they sum to " + (1 + worst).toFixed(4) + " at " + at
            : "they sum to one at every point") +
            ", read as all " + sq.length + " share-kind outcomes together";
        })(),
    sq.length + " qty");

  const dq = outs.filter(k => M.decl.aspects(k).includes("difference"));
  if(dq.length){
    const base = runs[0].S, off = dq.filter(k => Math.abs(base[vn(k)] || 0) > 1e-9);
    push("zero_at_baseline", "a difference is zero at the baseline",
      off.length ? "fail" : "pass",
      off.length
        ? off.map(k => vn(k) + " = " + (+base[vn(k)]).toFixed(4)).slice(0, 3).join(", ") +
          " with every parameter at its low bound, where a difference-aspect quantity is zero by construction"
        : dq.length + " difference-aspect outcome" + (dq.length === 1 ? "" : "s") +
          " came back zero with every parameter at its low bound",
      dq.length + " qty");
  }

  const inc = M.rels.filter(r => M.decl.props(r).includes("increasing"));
  if(inc.length){
    const broke = [], skip = [];
    for(const r of inc){
      if(!M.params.includes(r.from)){ skip.push(vn(r.from)); continue; }
      const w = asweep(M, r.from, vn(r.to), 20), d = amono(w.ys, true);
      if(d.worst < -ATOL) broke.push(vn(r.to) + " falls by " +
        Math.abs(d.worst).toFixed(4) + " as " + vn(r.from) + " rises past " +
        w.xs[d.at].toFixed(2));
    }
    push("monotone_in", "every relation declared increasing is increasing",
      broke.length ? "fail" : "pass",
      broke.length ? broke[0] + (broke.length > 1 ? " (and " + (broke.length - 1) + " more)" : "")
        : (inc.length - skip.length) + " swept over 21 points with the others at their midpoints" +
          (skip.length ? "; " + skip.length + " could not be swept because something writes them" : ""),
      inc.length + " rel");
  }

  /* A declared substitute is ALLOWED to move nothing alone -- that is what
     the declaration says and why it is made before the run. It is not allowed
     to move nothing together with the rest of its set: a term multiplied by
     zero would otherwise hide behind a substitution it has nothing to do
     with, so the group is switched off as a group too. */
  const groups = M.decl.substitutes(), subm = new Set();
  for(const g of groups) for(const m of g.members) subm.add("t_" + m);
  const mid = pts[2], base = runAt(M, mid.p, null);
  const terms = M.steps.filter(x => x.kind === "term" && x.rel);
  const dead = [], subs = [];
  for(const s of terms){
    const y = vn(s.rel.to);
    const d = Math.abs(runAt(M, mid.p, new Set([s.lhs]))[y] - base[y]);
    if(!(d > 1e-12)) (subm.has(s.lhs) ? subs : dead).push(s.lhs);
  }
  const limp = [];
  for(const g of groups){
    const y = vn(g.to), all = new Set(g.members.map(m => "t_" + m));
    if(![...all].some(t => terms.some(s => s.lhs === t))) continue;
    if(!(Math.abs(runAt(M, mid.p, all)[y] - base[y]) > 1e-12)) limp.push(y);
  }
  if(terms.length) push("ablation_bites", "switching a mechanism off moves what it writes",
    dead.length || limp.length ? "fail" : "pass",
    dead.length
      ? dead.length + " mechanism" + (dead.length === 1 ? "" : "s") +
        " can be switched off without moving the outcome, and " +
        (dead.length === 1 ? "it is" : "none of them is") + " a declared substitute: " + dead[0]
      : limp.length
      ? "every mechanism writing " + limp[0] + " can be switched off at once without moving it, " +
        "so the substitution excuses a term that does nothing"
      : terms.length + " checked at the midpoint" + (subs.length ? "; " + subs.length +
        " move nothing alone and are declared substitutes, and switching each set off together " +
        "does move what it writes" : ""),
    terms.length + " mech");

  const unused = [];
  for(const k of outs){
    const st = M.steps.find(s => s.kind === "out" && s.key === k);
    if(!st) continue;
    const reach = new Set(st.uses);
    for(let i = 0; i < 8; i++) for(const n of [...reach]){
      const s2 = M.steps.find(x => x.lhs === n);
      if(s2) for(const u of s2.uses) reach.add(u);
    }
    const gone = M.rels.filter(r => r.to === k).map(r => M.terms.get(r.id))
      .filter(t => !reach.has(t));
    if(gone.length) unused.push(vn(k) + " leaves out " + gone.slice(0, 4).join(", "));
  }
  if(outs.length) push("declared_mechanisms_used",
    "every mechanism declared to write an outcome is in it",
    unused.length ? "fail" : "pass",
    unused.length ? unused[0] + (unused.length > 1 ? " (and " + (unused.length - 1) + " more)" : "")
      : outs.length + " outcome" + (outs.length === 1 ? "" : "s") +
        " reach every term declared to write them, through the locals as well as directly",
    outs.length + " qty");

  /* Conservation, run here rather than left to another engine.

     The old row skipped on the ground that conservation is over a PAIR and
     the role names one half of it. True of the declaration, and beside the
     point for the test: a transfer moves value rather than making it, so
     switching its term off must leave the TOTAL across the outcomes where it
     was. What it adds to one it takes from another, and the sum does not
     care which. */
  const tr = M.rels.filter(r => M.decl.roles(r).includes("transfers"));
  if(tr.length){
    const nm = M.decl.mech(M.rels);
    const total = S => outs.reduce((t, k) => t + (afin(S[vn(k)]) ? S[vn(k)] : 0), 0);
    const bad = [];
    for(const r of tr){
      const term = "t_" + nm.get(r.id);
      if(!M.steps.some(x => x.lhs === term)) continue;
      let worst = 0, at = "";
      for(const x of pts){
        const live = total(runAt(M, x.p, null));
        const off = total(runAt(M, x.p, new Set([term])));
        const d = Math.abs(live - off);
        if(d > worst){ worst = d; at = x.tag; }
      }
      if(worst > 1e-9) bad.push({term, worst, at});
    }
    push("conserved", "a transfer adds what it subtracts",
      bad.length ? "fail" : "pass",
      bad.length
        ? bad[0].term + " moves the total by " + bad[0].worst.toExponential(2) + " at " +
          bad[0].at + ", so it is creating or destroying value rather than moving it" +
          (bad.length > 1 ? " (and " + (bad.length - 1) + " more)" : "")
        : "switching each transfer off leaves the total across the outcomes unchanged, " +
          "at every one of the " + pts.length + " settings sampled",
      tr.length + " rel");
  }

  const scope = new Set([...M.params.map(vn), ...M.consts.map(c => c.name),
    ...M.steps.map(s => s.lhs)]);
  for(const c of ((spec && spec.checks) || []).slice(0, 12)){
    const nmc = String((c && (c.for || c.name)) || "proposed").slice(0, 60);
    const form = String((c && c.form) || "");
    try{
      if(form === "nonneg"){
        const e = readExpr(c.expr, scope);
        let worst = Infinity, at = "";
        for(const r of runs){
          const v = evalRPN(e.rpn, r.S);
          if(!afin(v)) throw new Error("it is not a number at " + r.tag);
          if(v < worst){ worst = v; at = r.tag; }
        }
        push("agreed:" + nmc, e.py + " >= 0", worst < -ATOL ? "fail" : "pass",
          (worst < -ATOL ? "it reaches " + worst.toFixed(4) + " at " + at
            : "its lowest value over " + runs.length + " points is " + worst.toFixed(4)) +
          (c.why ? " — " + c.why : ""), "agreed");
      }else if(form === "up" || form === "down" || form === "peak"){
        const xk = M.decl.vars().find(k => vn(k) === String(c.x)), yk = String(c.y);
        if(!xk || !M.params.includes(xk))
          throw new Error(String(c.x) + " is not a free parameter here");
        if(!M.steps.some(s => s.lhs === yk))
          throw new Error(yk + " is not something the arithmetic writes");
        const w = asweep(M, xk, yk, 20);
        if(w.ys.some(v => !afin(v))) throw new Error("the sweep returned something that is not a number");
        const lab = {up:yk + " rises in " + String(c.x), down:yk + " falls in " + String(c.x),
          peak:yk + " has a single peak in " + String(c.x)}[form];
        if(form === "peak"){
          const pk = apeak(w.ys);
          push("agreed:" + nmc, lab, pk.ok ? "pass" : "fail",
            (pk.ok ? "one peak, at " + w.xs[pk.hi].toFixed(2) + ", strictly inside the range"
              : pk.why) + (c.why ? " — " + c.why : ""), "agreed");
        }else{
          const d = amono(w.ys, form === "up");
          push("agreed:" + nmc, lab, d.worst < -ATOL ? "fail" : "pass",
            (d.worst < -ATOL
              ? "it goes the other way by " + Math.abs(d.worst).toFixed(4) + " past " + w.xs[d.at].toFixed(2)
              : "held over 21 points with the others at their midpoints") +
            (c.why ? " — " + c.why : ""), "agreed");
        }
      }else throw new Error("the form is not one this page can run");
    }catch(e){
      push("agreed:" + nmc, String((c && (c.expr || c.y)) || nmc), "skip",
        "not run: " + (e && e.message ? e.message : "unknown") +
        (c && c.why ? " — " + c.why : ""), "agreed");
    }
  }

  return {rows,
    pass:rows.filter(r => r.verdict === "pass").length,
    fail:rows.filter(r => r.verdict === "fail").length,
    skip:rows.filter(r => r.verdict === "skip").length};
}

export { runAt, alcg, asamples, asweep, checkArith };

/* core: the curation — scope, fold, weigh — over plain data.

   WHY THIS FILE EXISTS. The command line ran the method from step 3.1 onward
   and said so: "What it deliberately does NOT do: run steps one to four. Those
   are curation, they need the corpus." Half of that was true and half of it was
   a confusion. Rebuilding the corpus needs `purpose-review/`, which is outside
   the published repository. READING it does not: `docs/bench/graph-data.js`
   ships with the page and holds every paper, claim, construct and wording
   score. What was missing was not the data. It was that the curation lived in
   functions that read a browser store.

   So the questions steps 1.1 to 1.3 answer are here, each taking what it needs
   as an argument:

     which papers are in scope       the outlet frame and the tradition
     which constructs are drawn      the occurrence threshold, and admissions
     which of them are one notion    the wording scores against a tightness,
                                     with pairs forced apart and merges by hand
     which claims clear the bars     three bars over twelve components

   The page calls these and so does `amg curate`, which is the point: a
   replicator can check that the numbers a paper states are the numbers its
   scenario produces, without a browser.

   A DECISIONS OBJECT, not a store. Every function takes `d`, which is the
   curation's decisions as plain data -- outlets, tradition, threshold,
   admissions, tightness, pairs apart, merges, bars, components, what was
   dropped. The page assembles it from its stores; the command line assembles it
   from a scenario file. Neither can diverge from the other, because there is
   one implementation of each question.

   core/ RULE: nothing in this file may import from outside core/.
   scripts/check_bench.py fails the build if one does. */
"use strict";

/* ------------------------------------------------------------- the bars */
/* Twelve components under three bars. `cost` inverts the test: a
   commensurability flag records a PROBLEM, so a claim satisfies that component
   by not carrying the flag. */
const COMPONENTS = {
  Comm: {f:"cmf", cost:true, items:[
    {k:"lvl", lab:"same level of analysis", flag:"crosses levels"},
    {k:"agg", lab:"no aggregation owed",    flag:"needs aggregation"},
    {k:"tim", lab:"same time structure",    flag:"stock to flow"},
    {k:"scl", lab:"ordered scale",          flag:"unordered category"}]},
  Spec: {f:"spf", cost:true, items:[
    {k:"frm", lab:"functional form stated", flag:"no functional form"},
    {k:"ant", lab:"one antecedent",         flag:"several antecedents"},
    {k:"mod", lab:"no moderator",           flag:"moderated"},
    {k:"dir", lab:"direction stated",       flag:"no direction"}]},
  Evid: {f:"eaf", cost:false, items:[
    {k:"num", lab:"carries a magnitude",    flag:"has a number"},
    {k:"dat", lab:"estimated from data",    flag:"estimated from data"},
    {k:"fst", lab:"first-hand",             flag:"first-hand"},
    {k:"scp", lab:"scope stated",           flag:"scope stated"}]}
};
const BARS = ["Comm", "Spec", "Evid"];
const STANDING = [["req", "required"], ["opt", "optional"], ["ign", "ignored"]];

/* Does the claim satisfy this component? */
function holds(c, bar, it){
  const has = ((c || {})[COMPONENTS[bar].f] || []).includes(it.flag);
  return COMPONENTS[bar].cost ? !has : has;
}
/* How many of the important ones it satisfies, and whether it clears every
   required one. */
function barScore(c, bar, need){
  const nd = need || {};
  let have = 0, of = 0, req = true;
  for(const it of COMPONENTS[bar].items){
    const st = nd[it.k] || "opt";
    if(st === "ign") continue;
    const ok = holds(c, bar, it);
    if(st === "req"){ if(!ok) req = false; }
    else { of++; if(ok) have++; }     // optional: the slider's pool
  }
  return {have, of, req};
}
const barMax = (bar, need) => COMPONENTS[bar].items
  .filter(it => ((need || {})[bar] ? (need[bar][it.k] || "opt") : "opt") === "opt").length;

function barPasses(c, bar, d, over){
  const sc = barScore(c, bar, (d.need || {})[bar]);
  if(!sc.req) return false;
  const want = over != null ? over : ((d.bar || {})[bar] || 0);
  return sc.have >= Math.min(want, sc.of);
}
const claimPasses = (c, d, over) => BARS.every(b =>
  barPasses(c, b, d, (over || {})[b]));
/* A claim is REMOVED when it fails a bar whose switch is set to filter; it is
   merely faded when it fails one set to fade. The two are independent per bar,
   so a reader can hide what is not commensurable while still seeing what is
   only thinly evidenced. */
const claimKept = (c, d) => BARS.every(b =>
  ((d.apply || {})[b]) !== "filter" || barPasses(c, b, d));

/* ----------------------------------------------------------- the scope */
/* A paper is in scope when its outlet is in the frame and its tradition is the
   one being looked at. `outlets` is the set of FULL journal names, which is
   what a paper records, and `--` is a tradition like any other: a paper the
   review did not place is a fact about the review. */
function paperInScope(p, d){
  if(!p) return false;
  const out = d.outlets;
  if(out && !(out.has ? out.has(p.jf) : out.indexOf(p.jf) >= 0)) return false;
  return !d.tradition || d.tradition === "all" || p.ap === d.tradition;
}
function papersInScope(G, d){
  const out = [];
  for(const [id, p] of Object.entries(G.papers || {}))
    if(paperInScope(p, d)) out.push(id);
  return out;
}
/* A construct is drawn once enough papers IN SCOPE name it, or where it was
   admitted by hand. The threshold is a convenience for finding what a
   literature argues about and never a judgement, so admitting one is the
   curator overriding the convenience -- recorded like any other decision rather
   than applied silently. */
function nodeInScope(n, d, inScope){
  if(!n) return false;
  if(d.admit && (d.admit.has ? d.admit.has(n.i) : d.admit.indexOf(n.i) >= 0)) return true;
  let k = 0;
  for(const s of (n.p || [])) if(inScope(s)) k++;
  return k >= (d.minp == null ? 2 : d.minp);
}

/* ------------------------------------------------------------- the fold */
/* Union-find over the wording scores above the tightness, with two overrides
   that outrank it: a pair forced apart is never merged whatever the score, and
   a merge made by hand is merged whatever it is.

   The representative of each cluster is its member with the most papers, then
   the most claims -- which is what makes a cluster's NAME the construct the
   literature uses most for it rather than whichever id sorted first. */
function foldNodes(nodes, pairs, d){
  const vis = nodes.slice();
  const inv = new Set(vis.map(n => n.i));
  const par = new Map(vis.map(n => [n.i, n.i]));
  const find = x => { while(par.get(x) !== x){ par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  const apart = d.apart || new Set();
  const has = (s, k) => s && (s.has ? s.has(k) : s.indexOf(k) >= 0);
  for(const pr of (pairs || [])){
    const a = pr[0], b = pr[1], w = pr[2];
    if(w < d.tight || !inv.has(a) || !inv.has(b)) continue;
    if(has(apart, [a, b].sort().join("|"))) continue;
    const ra = find(a), rb = find(b);
    if(ra !== rb) par.set(ra, rb);
  }
  if(d.collapse) for(const g of (d.groups || [])){
    const ms = (g.members || []).filter(m => inv.has(m));
    for(let i = 1; i < ms.length; i++){
      const ra = find(ms[0]), rb = find(ms[i]);
      if(ra !== rb) par.set(ra, rb);
    }
  }
  const bucket = new Map();
  for(const n of vis){ const r = find(n.i);
    if(!bucket.has(r)) bucket.set(r, []); bucket.get(r).push(n); }
  const of = new Map();
  const out = new Map();
  for(const [r, mem] of bucket){
    mem.sort((x, y) => (y.p || []).length - (x.p || []).length || (y.n || 0) - (x.n || 0));
    out.set(r, {id:r, label:mem[0].i, mem});
    for(const m of mem) of.set(m.i, r);
  }
  return {cl:out, of};
}

/* ------------------------------------------------------------ the arrows */
/* One arrow per ordered pair of notions, carrying every claim that runs
   between them. A claim whose antecedent and consequent fold into the SAME
   notion is dropped: the merge said they are one quantity, and an arrow from a
   thing to itself is the merge's consequence rather than a relation. */
function arrowsOf(G, d, of, inScopePaper, kept){
  const em = new Map();
  for(const c of (G.claims || [])){
    if(!inScopePaper(c.p)) continue;
    if(kept && !kept(c)) continue;
    const A = new Set((c.a || []).map(x => of.get(x)).filter(Boolean));
    const B = new Set((c.c || []).map(x => of.get(x)).filter(Boolean));
    for(const a of A) for(const b of B){
      if(a === b) continue;
      const k = a + ">" + b;
      if(!em.has(k)) em.set(k, {id:k, source:a, target:b, claims:[],
        signs:new Set(), stat:new Set(), papers:new Set()});
      const e = em.get(k);
      e.claims.push(c); e.signs.add(c.g); e.stat.add(c.e); e.papers.add(c.p);
    }
  }
  return [...em.values()];
}

/* ------------------------------------------------- the whole of it, once */
/* What steps 1.1 to 1.3 produce, as numbers a replicator can check against a
   paper. Nothing here draws; the page uses the parts above and adds its own
   view on top. */
function curate(G, d){
  const inSet = new Set(papersInScope(G, d));
  const okPaper = s => inSet.has(s);
  const drawn = (G.nodes || []).filter(n => nodeInScope(n, d, okPaper));
  const {cl, of} = foldNodes(drawn, d.pairs || G.sim || [], d);
  const passes = c => claimPasses(c, d);
  const arrows = arrowsOf(G, d, of, okPaper, c => claimKept(c, d));
  const clearing = arrows.filter(e => e.claims.some(passes));
  const claimsIn = (G.claims || []).filter(c => okPaper(c.p));
  const touched = new Set();
  for(const e of arrows){ touched.add(e.source); touched.add(e.target); }
  return {
    papers:{in:inSet.size, of:Object.keys(G.papers || {}).length},
    claims:{in:claimsIn.length, of:(G.claims || []).length,
      kept:claimsIn.filter(c => claimKept(c, d)).length,
      clearing:claimsIn.filter(passes).length},
    constructs:{drawn:drawn.length, of:(G.nodes || []).length,
      notions:cl.size, merged:drawn.length - cl.size,
      isolated:[...cl.keys()].filter(k => !touched.has(k)).length},
    arrows:{all:arrows.length, clearing:clearing.length},
    /* A merge across two levels of analysis is the error this bench exists to
       make visible, so it is counted here rather than left to the eye. */
    crossing:[...cl.values()].filter(c => c.mem.length > 1 &&
      new Set(c.mem.map(m => m.l)).size > 1).length,
    cl, of, arrows_list:arrows,
  };
}

export { BARS, COMPONENTS, STANDING, arrowsOf, barMax, barPasses, barScore,
  claimKept, claimPasses, curate, foldNodes, holds, nodeInScope, paperInScope,
  papersInScope };

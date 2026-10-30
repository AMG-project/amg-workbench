/* AMG bench, page script 4c of 22: the opening, the scope, the folding, and the corpus listed.
   One shared global scope, loaded in order. See page/README.md.

   Carved out of 03-stores.js, which declared 133 names and was borrowed
   from by seventeen of the twenty page scripts -- the hub that
   scripts/page_deps.py reports first. The cut follows the section rules
   that were already in the file, and the three parts load in the order
   the one file ran in, so nothing moves into or out of a temporal dead
   zone. */
import { hesc } from "../core/safe.js";
import { AIQ, AITIP, PVOC, aiCap, aiMark } from "./08-ask.js";
import { xlog } from "./05-explore.js";
import { provTake } from "./17-scenarios.js";
import { APC, DEG, JALL, N, cssv, infold, lsRead, lsWrite, nRebuild, noteFail, pap, state } from "./03-stores.js";
import { G } from "../graph-data.js";
import { GHUE, SEEDED, attached, csaveLocal, dbSetAll, decided, dropped, fpersist, groups, gsaveLocal, linkCarried, nodeCarried } from "./03b-decisions.js";
import { apart } from "./16-worklists.js";
import { claimKept, claimPasses, renderPanel } from "./06-wiring.js";
import { hideTip, lastView, showTip } from "./13-map.js";
import { foldNodes, nodeInScope, paperInScope } from "../core/curate.js";
import { impShow } from "./24-import.js";
import { refresh } from "./14-boot.js";
import { simPairs } from "./03d-similarity.js";

/* ------------------------------------------------------------ THE OPENING

   Step 1.2 is "select the constructs", so the default cannot be all 422 of
   them — that is the literature, not a selection. Nor can it be nothing: an
   empty map shows what the bench does only to someone who already knows.

   So a first visit opens on a worked example. Two merges a curator would
   actually propose — several names for the firm's own financial result, and
   several for a socially directed purpose — plus the two constructs that join
   them, which is what makes the six a connected set rather than two islands.
   Press None on the map to clear it; anything you have stored wins over this. */
/* A FUNCTION, because the colours come from another module. GHUE is declared
   in 03b-decisions.js, and the import graph has a cycle through 23 files -- so
   whether that file has finished evaluating when this one does is decided by
   the ORDER of the import statements, which is not a thing any reader should
   have to know. Read at call time and the question does not arise.

   Found by sorting the import list for readability, which moved this file
   ahead of the one it reads and broke two tests with `Cannot access 'GHUE'
   before initialization`. In a cyclic graph the order of imports is
   load-bearing, and that is a reason to have no load-time reads rather than a
   reason to keep a particular order. */
const DEMO_GROUPS = () => [
  {id:"demo-performance", name:"Firm accounting performance", color:GHUE[0],
   members:["firm-accounting-performance","firm-overall-performance",
            "stock-market-index-outperformance"]},
  {id:"demo-prosocial", name:"Prosocial purpose", color:GHUE[2],
   members:["prosocial-mission","societal-purpose-realization",
            "purpose-societal-ideal-coupling"]}
];
const DEMO_BRIDGE = ["purpose-clarity-factor","perceived-work-meaningfulness"];

/* Seeded only where nothing was stored, which is why it waits for boot(): the
   question it asks -- did this browser already hold a curation -- cannot be
   answered until the stores have been read, and they are read in boot() now. */
function bootSeed(){
  if(SEEDED.carry || SEEDED.groups) return;
  const demo = DEMO_GROUPS();
  const keep = new Set([...demo.flatMap(g => g.members), ...DEMO_BRIDGE]);
  G.nodes.forEach(n => { if(!keep.has(n.i)) dropped.c.add(n.i); });
  /* Constructs only. This used to drop every claim that did not join the seeded
     six as well, which put 582 step-three decisions in the record that nobody
     made, and left step 1.3 opening on arrows already dropped by a seed. What
     step 1.2 seeds is a construct set; the arrows between those constructs are
     step 1.3's to keep or decline. */
  demo.forEach(g => groups.set(g.id, {...g, members:[...g.members]}));
  csaveLocal(); gsaveLocal();
}
/* A shared store answers back with what this page just wrote to it, and
   re-rendering on that echo threw away whatever the reader was in the middle of
   — a scroll position, most visibly, because a rebuilt list starts at the top.
   Nothing below redraws unless what came back differs from what is already
   held. */
const sigSet = s => [...s].sort().join("\u0000");
const sigMap = m => [...m.keys()].sort()
  .map(k => k + "=" + JSON.stringify(m.get(k))).join("\u0000");
/* The shared store, connected in boot() rather than while this file loads.
   Its four listeners write into maps five other files declare, so a snapshot
   arriving mid-load wrote into stores that had not been restored yet. */
function bootStore(){
Promise.resolve(window.claude?.use?.("db") ?? null).then(db => {
  if(!db) return;                  // no viewer, or not granted: localStorage carries it
  dbSetAll(db);
  db.doc("fulltext/state").onSnapshot(d => {
    const v = (d && d.data && d.data()) || null; if(!v || !v.a) return;
    attached.clear(); v.a.forEach(([k, x]) => attached.set(k, x));
    if(state.stage === 1) renderPanel();
  }, e => noteFail("watching fulltext/state", e));
  db.doc("carry/state").onSnapshot(d => {
    const v = (d && d.data && d.data()) || null; if(!v) return;
    const c = new Set(v.c || []), k = new Set(v.k || []);
    if(sigSet(c) === sigSet(dropped.c) && sigSet(k) === sigSet(dropped.k)) return;
    dropped.c = c; dropped.k = k;
    refresh();
  }, e => noteFail("watching carry/state", e));
  db.collection("decisions").onSnapshot(snap => {
    const next = new Map();
    snap.docs.forEach(x => { const v = x.data() || {}; if(v.key) next.set(v.key, v); });
    if(sigMap(next) === sigMap(decided)) return;
    decided.clear(); next.forEach((v, k) => decided.set(k, v));
    refresh();
  }, e => noteFail("watching decisions", e));
  db.collection("groups").onSnapshot(snap => {
    const next = new Map();
    snap.docs.forEach(d => { const v = d.data() || {};
      next.set(d.id, {id:d.id, name:v.name || "Untitled construct",
                      members:v.members || [], color:v.color || GHUE[0]}); });
    if(sigMap(next) === sigMap(groups)) return;
    groups.clear(); next.forEach((v, k) => groups.set(k, v));
    refresh();
  }, e => noteFail("watching groups", e));
/* The store being absent is not a failure -- the page runs on browser storage
   alone and says so. The store being THERE and refusing is, so the four
   listeners above report theirs and this reports a connection that resolved
   and then threw. */
}).catch(e => noteFail("connecting to the shared store", e));
}

/* --------------------------------------------------- scope and folding */
/* THE SCOPE TEST IS core/curate.js NOW, for the same reason the bars are:
   `amg curate` asks which papers are in scope over the same corpus without a
   browser, and two implementations of that question would be two answers.
   What is left here is the join -- the live stores, as the decisions object the
   core function takes. */
const okPaper = sl => paperInScope(G.papers[sl],
  {outlets:state.jr, tradition:state.ap});

// Union-find over the similarity pairs above the tightness threshold. A hand-made
// group only folds into one node when you ask it to; otherwise it stays a boundary.
/* A construct is in scope if enough papers in scope use it, OR if it was
   admitted by hand. The threshold is a convenience for finding the constructs a
   literature argues about; it is not a judgement, and a relation a model needs
   can run through a construct only one paper named. Admitting one is the
   curator overriding the convenience, so it is recorded like any other
   decision rather than applied silently. */
const inScope = n => nodeInScope(n, {admit:state.admit, minp:state.minp}, okPaper);

/* The constructs under the threshold that a claim joins to this one. They are
   not on the map -- that is what being under the threshold means -- so they are
   found in the claims rather than in the view. */
function underThreshold(d){
  const mine = new Set(d.mem.map(m => m.i));
  const out = new Map();
  for(const c of G.claims){
    if(!okPaper(c.p)) continue;
    const a = c.a || [], b = c.c || [];
    const hitsA = a.some(x => mine.has(x)), hitsB = b.some(y => mine.has(y));
    if(!hitsA && !hitsB) continue;
    for(const other of (hitsA ? b : []).concat(hitsB ? a : [])){
      if(mine.has(other)) continue;
      const n = N.get(other);
      if(!n || inScope(n)) continue;
      if(!n.p.some(okPaper)) continue;        // out of scope for its outlet, not its count
      if(!out.has(other)) out.set(other, {n, claims:0});
      out.get(other).claims++;
    }
  }
  return [...out.values()].sort((x, y) => y.claims - x.claims);
}

function clusters(){
  const vis = G.nodes.filter(inScope);
  const inv = new Set(vis.map(n => n.i));
  /* THE UNION-FIND IS core/curate.js NOW. Whichever similarity is standing --
     the shipped wording scores, a formula the scholar wrote, or what a model
     judged -- comes back in G.sim's own shape, so the threshold is the one
     slider either way, and the fold that reads it is the one `amg curate`
     reads. What is left here is everything the PAGE needs on top of a cluster
     and the command line does not: the papers behind it, the claim count, the
     levels it spans, and which research tradition most of its papers sit in. */
  const {cl, of} = foldNodes(vis, simPairs(inv), {
    tight:state.tight, collapse:state.collapse,
    apart:(typeof apart !== "undefined" ? apart : new Set()),
    groups:[...groups.values()]});
  const out = new Map();
  for(const [r, c] of cl){
    const mem = c.mem;
    const papers = new Set(); let nc = 0;
    for(const m of mem){ m.p.filter(okPaper).forEach(p => papers.add(p)); nc += m.n; }
    const levels = [...new Set(mem.map(m => m.l))];
    const apc = {}; [...papers].forEach(sl => { const a = pap(sl).ap; apc[a] = (apc[a]||0) + 1; });
    const top = Object.entries(apc).sort((x,y) => y[1] - x[1])[0];
    out.set(r, {id:r, label:mem[0].i, mem, papers:[...papers].sort(), nc, levels,
                level:mem[0].l, mixed:levels.length > 1, ap:top ? top[0] : "--", apc});
  }
  return {cl:out, of};
}

/* PAPERS ADDED TO THE CORPUS, AND WHY THEY GO INTO G RATHER THAN BESIDE IT.
   ==========================================================================

   A paper somebody adds has to behave like a paper the build shipped: it is
   in scope or out of it by the same filters, its constructs are nodes on the
   same map, its claims are arrows weighed by the same three bars, and step
   1.3 asks the same questions of them. Thirty-seven places read G.papers,
   G.claims and G.nodes directly, and an overlay beside them would have to be
   remembered in every one -- which is thirty-seven chances to forget, and the
   kind of split that leaves a feature half-connected.

   So the shipped payload is kept as a base and G is REBUILT from it: base
   plus whatever has been added. Every existing reader is untouched and sees
   one corpus. Taking a paper away restores the base exactly, because the base
   was never written to.

   What is added lives in this browser, in its own store, and travels in the
   scenario like every other decision. It is not written into graph-data.js:
   the shipped corpus is evidence and stays as it was built.

   The node records carry the same seven fields the extraction writes, so a
   construct added this way is typed, scaled and borne like any other -- which
   is what lets step 1.2 and step 3.1 read it without a special case. */
let CBASE = null;
const CPAP = new Map();   // id -> paper record
const CNOD = new Map();   // id -> node record
const CCLM = new Map();   // id -> claim record
/* THE BIBLIOMETRIC NUMBERS, WHICH ARE A FOURTH OVERLAY AND NOT A FIFTH KIND
   OF PAPER. A count read from an index is not a property of the paper: it is
   attention at a date, measured by somebody else, and it moves. So it is kept
   apart from the record the extraction wrote, merged over it on the way into
   G, and reversible -- dropping it restores the shipped snapshot exactly,
   because the base is never written to.

   Each entry carries the day it was read. A count with no date behind it is
   not evidence of anything, and the shipped numbers have one (19 October
   2026) for the same reason. */
const CSTAT = new Map();  // id -> {cb, cy, cly, cread}
/* AND THE OUTLETS, WHICH IS WHAT MAKES AN IMPORT MEAN ANYTHING.

   A paper is in scope when its journal is ticked on the outlet list, and that
   list is the twelve the search covered. So a paper imported from a
   thirteenth journal could never be in scope and there was no box to tick.

   Importing one adds its outlet to the list UNTICKED, which is the screening
   decision the file cannot carry made where it belongs: a reader looks at the
   journal, decides whether it is part of this literature, and ticks it. Until
   they do, the paper is in the corpus and out of scope, which is exactly what
   the greyed button used to promise. */
const CJRN = new Map();   // full journal name -> {n, f, c}
/* AND THE CLASSIFICATION, which is the one overlay that is not additive.

   The tradition filter sorts papers by a scheme read out of a review of the
   literature: three traditions, declared for this corpus, recorded in
   index/approaches.tsv. A second scheme is not three more traditions beside
   those -- it is a DIFFERENT CUT of the same papers, so it replaces rather than
   joins. A paper is statement-centric under one review and something else
   under another, and holding both at once would mean the filter sorted by two
   questions at the same time.

   So CSCHM is one scheme or nothing, CTRAD is the assignment under it, and
   dropping them puts the shipped cut back exactly. Which is also why the
   assignment is kept apart from the paper records: `ap` on a paper is what the
   shipped review said, and this is what another one would say. */
let CSCHM = null;        // {name, cite, what, traditions:[{code, label, why}]}
const CTRAD = new Map(); // paper id -> code under CSCHM

/* THE SHIPPED PAYLOAD AND THE ACTIVE LITERATURE'S, WHICH BECAME TWO THINGS.

   There was one corpus, so one base was enough: whatever graph-data.js carried,
   captured the first time anybody asked. A second literature makes that two
   questions. SHIPPED is what the file carried and never changes; CBASE is the
   base of the literature being curated, which is SHIPPED for the one that ships
   and a payload read in from a file for any other.

   Both are read-only. Everything that varies is an overlay over whichever one
   is standing, which is what makes switching literature a swap rather than a
   rebuild and makes dropping an overlay restore its base exactly. */
let SHIPPED = null;
function corpusShipped(){
  if(!SHIPPED) SHIPPED = {papers:G.papers, claims:G.claims, nodes:G.nodes,
    journals:G.journals, approaches:G.approaches,
    sim:G.sim || [], meta:G.meta || [], edges:G.edges || []};
  return SHIPPED;
}
function corpusBase(){
  corpusShipped();
  if(!CBASE) CBASE = SHIPPED;
  return CBASE;
}
/* The base of the literature now being curated. `null` puts the shipped one
   back. Every field is defaulted rather than assumed, because a payload read in
   from a file was written by somebody else. */
function corpusBaseSet(o){
  corpusShipped();
  CBASE = o ? {
    papers:o.papers || {}, claims:o.claims || [], nodes:o.nodes || [],
    journals:o.journals || [], approaches:o.approaches || {"--":{l:"Unassigned"}},
    sim:o.sim || [], meta:o.meta || [], edges:o.edges || [],
  } : SHIPPED;
  return CBASE;
}
const corpusBaseIsShipped = () => CBASE === SHIPPED || !CBASE;
/* AN EMPTY LITERATURE, which is not the shipped one with nothing ticked.

   `New project` used to mean the latter: fifty-two papers still loaded, every
   outlet unticked, so the page drew an empty map above a list of somebody
   else's corpus, twelve journals with somebody else's counts beside them, and
   three traditions read off papers this project does not have. Every one of
   those is an answer to "which literature is this?" and the whole point of a
   new project is that nobody has answered it yet.

   So a new project gets its own payload rather than a filter over the shipped
   one. Nothing derived from papers can then appear, because there are no
   papers: the outlet list, the tradition list and the counts beside them all
   come off `G`, and `G` is empty until a search export is read in or an AMG is
   opened. It is in memory only, like the project itself -- `New project`
   creates nothing, and a reload lands back on the shipped corpus.

   Coming back needs no undoing here: every path that opens a project runs
   snapApply, which calls litTake, which puts the shipped base back. */
const CORPUS_EMPTY = {papers:{}, claims:[], nodes:[], journals:[],
  approaches:{"--":{l:"Unassigned"}}, sim:[], meta:[], edges:[]};
function corpusBaseEmpty(){ corpusBaseSet(CORPUS_EMPTY); corpusTake(null); }
/* How many papers the corpus NOW holds under each outlet, counted rather than
   carried. The shipped journals carry a count that happens to agree -- all
   twelve of them, summing to the same 52 -- but it is data written when the
   payload was built, so it is right only until something moves: a paper read
   in, a paper dropped, a literature swapped, or a corpus that has no papers
   at all and twelve outlets still claiming them. */
function jrnHeld(){
  const m = new Map();
  for(const p of Object.values(G.papers || {}))
    if(p && p.jf) m.set(p.jf, (m.get(p.jf) || 0) + 1);
  return m;
}
/* One rebuild, after any change to what was added. Cheap: the corpus is
   1,026 nodes and 1,080 claims and this is a concat and an assign. */
function corpusApply(){
  const b = corpusBase();
  let papers = CPAP.size ? Object.assign({}, b.papers, Object.fromEntries(CPAP)) : b.papers;
  if(CSTAT.size || CTRAD.size){
    papers = Object.assign({}, papers);
    for(const [id, s] of CSTAT)
      if(papers[id]) papers[id] = Object.assign({}, papers[id], s);
    for(const [id, code] of CTRAD)
      if(papers[id]) papers[id] = Object.assign({}, papers[id], {ap:code});
  }
  G.papers = papers;
  /* The scheme REPLACES rather than joins, because it is a different cut of
     the same papers and not more traditions beside the shipped ones. */
  /* The scheme's own order, with unassigned LAST, which is where the shipped
     one puts it and where a reader looks for it: it is not a tradition among
     the others, it is what is left. */
  G.approaches = CSCHM
    ? Object.assign(
        Object.fromEntries(CSCHM.traditions.map(t => [t.code, {l:t.label, w:t.why}])),
        {"--":{l:"Unassigned"}})
    : b.approaches;
  G.nodes  = CNOD.size ? b.nodes.concat([...CNOD.values()]) : b.nodes;
  G.claims = CCLM.size ? b.claims.concat([...CCLM.values()]) : b.claims;
  /* THE THREE THE CORPUS HOLDS BESIDE THE CLAIMS, which no overlay touches and
     which used to need no mention because there was one corpus: the wording
     scores the tightness reads, the paper-level theses no arrow can hold, and
     what each claim answers. A second literature brings its own of all three,
     so they come off the base rather than being left where the last one put
     them. */
  G.sim    = b.sim || [];
  G.meta   = b.meta || [];
  G.edges  = b.edges || [];
  /* REBUILT FROM THE BASE rather than appended to, because this runs after
     every change and appending would add the same outlet once per run. JALL is
     a Set the whole page shares, so it is mutated and never rebound -- and the
     new outlet is deliberately NOT added to state.jr, which is what leaves an
     imported paper out of scope until somebody ticks it. */
  /* AND THE BY-ID MAP, which fifteen files read and which used to be built once
     while 03-stores.js loaded -- so every construct added after that was
     missing from it, silently. */
  nRebuild();
  G.journals = CJRN.size ? b.journals.concat([...CJRN.values()]) : b.journals;
  for(const j of G.journals) JALL.add(j.f);
  for(const f of [...JALL]) if(!G.journals.some(j => j.f === f)) JALL.delete(f);
}
/* How many papers in the corpus each outlet now holds, which the list prints
   beside the name. Recomputed rather than carried, so an import and a drop
   both leave it right. */
function jrnCount(){
  for(const j of CJRN.values())
    j.c = Object.values(G.papers).filter(p => p && p.jf === j.f).length;
}
const addedPapers = () => [...CPAP.values()];
const isAdded = id => CPAP.has(id);
/* The day the standing numbers were read, where they have been re-read, and
   nothing where the shipped snapshot still stands. Read off the entries rather
   than stored beside them, so it cannot say one date while they carry
   another. */
const statRead = () => {
  const d = [...new Set([...CSTAT.values()].map(s => s.cread).filter(Boolean))].sort();
  return d.length ? d[d.length - 1] : "";
};
const statCount = () => CSTAT.size;

function corpusSave(){
  lsWrite("purposeAddPapers", [...CPAP.values()].map(x => Object.assign({}, x)));
  lsWrite("purposeAddNodes", [...CNOD.values()]);
  lsWrite("purposeAddClaims", [...CCLM.values()]);
  lsWrite("purposeStats", [...CSTAT].map(([id, s]) => Object.assign({id}, s)));
  lsWrite("purposeAddOutlets", [...CJRN.values()]);
  lsWrite("purposeScheme", CSCHM ? {scheme:CSCHM, at:[...CTRAD]} : null);
}
function corpusLoad(){
  corpusBase();
  const p = lsRead("purposeAddPapers"), n = lsRead("purposeAddNodes"),
        c = lsRead("purposeAddClaims"), s = lsRead("purposeStats"),
        j = lsRead("purposeAddOutlets"), sc = lsRead("purposeScheme");
  if(p) p.forEach(x => { if(x && x.id) CPAP.set(x.id, x); });
  if(n) n.forEach(x => { if(x && x.i) CNOD.set(x.i, x); });
  if(c) c.forEach(x => { if(x && x.id) CCLM.set(x.id, x); });
  if(s) s.forEach(x => { if(x && x.id) CSTAT.set(x.id, statOne(x)); });
  if(j) j.forEach(x => { if(x && x.f) CJRN.set(x.f, {n:x.n || x.f, f:x.f, c:+x.c || 0}); });
  if(sc && sc.scheme) schemeTake(sc.scheme, sc.at || []);
  corpusApply(); jrnCount();
}
/* One stats entry, with every number forced to a number and the date to a
   string. It is read back out of a browser store and out of a scenario file
   somebody else wrote, so neither is trusted to have put a number there. */
function statOne(x){
  const n = v => (v == null || v === "" || !isFinite(+v)) ? 0 : Math.max(0, Math.round(+v));
  return {cb:n(x.cb), cy:n(x.cy), cly:n(x.cly), cread:String(x.cread || "").slice(0, 10)};
}
/* What came back from an index, applied to the papers it names and no others:
   an index knows about works this corpus does not hold, and a filter query is
   written by hand. */
function corpusStats(rows){
  corpusBase();
  let n = 0;
  for(const r of rows || []){
    if(!r || !r.id || !G.papers[r.id]) continue;
    CSTAT.set(r.id, statOne(r)); n++;
  }
  corpusApply(); corpusSave();
  return n;
}
function statsDrop(){
  if(!CSTAT.size) return 0;
  const n = CSTAT.size;
  CSTAT.clear();
  corpusApply(); corpusSave();
  return n;
}

/* A CLASSIFICATION READ OUT OF A PAPER, taken whole or not at all.

   Checked on the way in rather than trusted, because it arrives from a model
   and from a scenario file somebody else wrote. A code outside the scheme's own
   list is refused and counted; a paper id the corpus does not hold is refused
   and counted. What is refused is reported by the dialog and never written,
   which is the rule every other proposal on this bench goes through.

   `--` is always a tradition, whatever the scheme says, because a paper the
   review does not place is a fact about the review and has to be sayable. */
const SCHEMECAP = 6;
function schemeTake(scheme, pairs){
  const ts = [];
  const seen = new Set(["--"]);
  for(const t of ((scheme && scheme.traditions) || [])){
    const code = String((t && t.code) || "").trim().slice(0, 12);
    const label = String((t && t.label) || "").trim().slice(0, 80);
    if(!code || !label || seen.has(code)) continue;
    seen.add(code);
    ts.push({code, label, why:String((t && t.why) || "").trim().slice(0, 400)});
    if(ts.length >= SCHEMECAP) break;
  }
  if(ts.length < 2) return {err:"a classification needs at least two traditions"};
  CSCHM = {name:String((scheme && scheme.name) || "").slice(0, 160),
    cite:String((scheme && scheme.cite) || "").slice(0, 200),
    what:String((scheme && scheme.what) || "how a paper treats the subject").slice(0, 160),
    traditions:ts};
  CTRAD.clear();
  let refused = 0;
  for(const [id, code] of (pairs || [])){
    if(!G.papers[id]){ refused++; continue; }
    if(code !== "--" && !seen.has(code)){ refused++; continue; }
    CTRAD.set(id, code);
  }
  corpusApply(); corpusSave();
  return {ok:ts.length, refused};
}
function schemeDrop(){
  if(!CSCHM) return false;
  CSCHM = null; CTRAD.clear();
  corpusApply(); corpusSave();
  return true;
}
const schemeNow = () => CSCHM;
/* The colour each tradition takes on the map and in the paper list. The three
   shipped codes keep the three tokens they have always had; an imported
   scheme's codes take the same three and then the two added for them, in the
   order the scheme listed them, so a cut read out of a paper is drawn in the
   same key as the declared one. */
const APORDER = ["--ap-st", "--ap-ex", "--ap-dm", "--ap-4", "--ap-5", "--ap-x"];
function apVar(code){
  if(code === "--") return "--ap-x";
  if(!CSCHM) return APC[code] || "--ap-x";
  const i = CSCHM.traditions.findIndex(t => t.code === code);
  return i < 0 ? "--ap-x" : APORDER[i % APORDER.length];
}
/* Everything one added paper brought, taken back together: its claims cannot
   outlive it and nor can a construct nothing else names. */
function corpusAdd(paper, nodes, claims){
  corpusBase();
  CPAP.set(paper.id, paper);
  for(const nd of nodes) if(!CNOD.has(nd.i)) CNOD.set(nd.i, nd);
  for(const cl of claims) CCLM.set(cl.id, cl);
  /* An outlet the frame does not hold arrives with the paper and arrives
     UNTICKED: the file says where a paper was published and cannot say whether
     that journal is part of this literature. */
  if(paper.jf && !JALL.has(paper.jf) && !CJRN.has(paper.jf))
    CJRN.set(paper.jf, {n:paper.j || paper.jf, f:paper.jf, c:0});
  corpusApply(); jrnCount(); corpusSave();
}
function corpusDrop(id){
  if(!CPAP.has(id)) return false;
  CPAP.delete(id);
  for(const [k, c] of [...CCLM]) if(c.p === id) CCLM.delete(k);
  const named = new Set();
  for(const c of CCLM.values()) for(const x of [...(c.a || []), ...(c.c || [])]) named.add(x);
  for(const k of [...CNOD.keys()]) if(!named.has(k)) CNOD.delete(k);
  /* An outlet nothing is published in any more goes with the last paper in it,
     so the list does not grow a row for a journal the corpus has left. */
  for(const f of [...CJRN.keys()])
    if(!Object.values(G.papers).some(x => x && x.jf === f && x.id !== id)) CJRN.delete(f);
  corpusApply(); jrnCount(); corpusSave();
  return true;
}
/* What the scenario carries, and what it restores. */
const corpusSnap = () => (CPAP.size || CSTAT.size || CJRN.size || CSCHM)
  ? {papers:[...CPAP.values()], nodes:[...CNOD.values()], claims:[...CCLM.values()],
     stats:[...CSTAT].map(([id, s]) => Object.assign({id}, s)),
     outlets:[...CJRN.values()],
     scheme:CSCHM ? {scheme:CSCHM, at:[...CTRAD]} : null} : null;
function corpusTake(o){
  CPAP.clear(); CNOD.clear(); CCLM.clear(); CSTAT.clear(); CJRN.clear();
  CSCHM = null; CTRAD.clear();
  if(o){
    (o.papers || []).forEach(x => { if(x && x.id) CPAP.set(x.id, x); });
    (o.nodes || []).forEach(x => { if(x && x.i) CNOD.set(x.i, x); });
    (o.claims || []).forEach(x => { if(x && x.id) CCLM.set(x.id, x); });
    (o.stats || []).forEach(x => { if(x && x.id) CSTAT.set(x.id, statOne(x)); });
    (o.outlets || []).forEach(x => { if(x && x.f)
      CJRN.set(x.f, {n:x.n || x.f, f:x.f, c:+x.c || 0}); });
    if(o.scheme && o.scheme.scheme) schemeTake(o.scheme.scheme, o.scheme.at || []);
  }
  corpusApply(); jrnCount(); corpusSave();
}

function build(){
  const {cl, of} = clusters();
  const em = new Map();
  for(const c of G.claims){
    if(!okPaper(c.p)) continue;
    const good = claimPasses(c);
    if(!claimKept(c)) continue;
    const A = new Set(c.a.map(x => of.get(x)).filter(Boolean));
    const B = new Set(c.c.map(x => of.get(x)).filter(Boolean));
    for(const a of A) for(const b of B){
      if(a === b) continue;
      const k = a + ">" + b;
      if(!em.has(k)) em.set(k, {source:a, target:b, claims:[], good:[],
        signs:new Set(), stat:new Set(), est:[], papers:new Set()});
      const e = em.get(k);
      e.claims.push(c); e.signs.add(c.g); e.stat.add(c.e); e.papers.add(c.p);
      if(good) e.good.push(c);
      if(c.v) e.est.push({v:c.v, p:c.p, t:c.t});
    }
  }
  let links = [...em.values()].filter(e => {
    // one categorical field, read once: how the claim was obtained
    if(state.ev !== "all" && !e.stat.has(state.ev)) return false;
    /* Outright reversal -- one paper positive, another negative -- happens for
       no relation in this corpus, so this filter is the widest reading of
       difference: any arrow carrying more than one distinct sign, whoever
       asserted them. It is deliberately wider than the badge on the claim list,
       which asks whether the PAPERS differ and whether the values can all hold.
       A filter is for finding things to look at; a badge is a finding. */
    if(state.sgn === "mixed") return e.signs.size > 1;
    if(state.sgn !== "all"   && !e.signs.has(state.sgn)) return false;
    return true;
  });
  for(const e of links){
    e.pass = e.good.length > 0;
    e.carried = linkCarried(e);
    e.tone = (e.signs.has("positive") && e.signs.has("negative")) ? "amb"
           : e.signs.has("positive") ? "pos"
           : e.signs.has("negative") ? "neg"
           : e.signs.has("none") ? "nul" : "amb";
    e.id = e.source + ">" + e.target;
  }
  const touched = new Set(); links.forEach(e => { touched.add(e.source); touched.add(e.target); });
  const all = [...cl.values()];
  all.forEach(n => { n.carried = nodeCarried(n); });
  // A relation cannot be carried past a notion that was not: the arrow would
  // have nowhere to land.
  const liveN = new Set(all.filter(n => n.carried).map(n => n.id));
  links.forEach(e => { if(!liveN.has(e.source) || !liveN.has(e.target)) e.carried = false; });
  const isoCount = all.filter(n => !touched.has(n.id)).length;
  // From step 1.3. This is a step-three filter, and the scope is the scope:
  // hiding the unconnected on step 1.1 would be the later step reaching back
  // into the earlier one's view, which is the one thing the chain forbids.
  let nodes = (state.hideIso && state.stage >= 3) ? all.filter(n => touched.has(n.id)) : all;
  const allNodes = nodes, allLinks = links;

  /* Each step draws what the step before it handed on. Step 1.1 ends with a
     scope and step 1.2 is drawn over the whole of it, because selecting is what
     step 1.2 is for and you cannot select what is not on screen. Step 1.2 ends
     with a construct set, so step 1.3 draws that and nothing else. Step 1.3
     ends with a set of arrows, so step 2.1 draws those. The narrowing is what
     makes the handoff visible, and it is the other half of asking each decision
     on the step that caused it: a construct you can no longer see is one you go
     back a step to change. */
  if(state.stage >= 3){
    nodes = nodes.filter(n => n.carried);
    const live = new Set(nodes.map(n => n.id));
    links = links.filter(e => live.has(e.source) && live.has(e.target));
  }
  if(state.stage >= 4) links = links.filter(e => e.carried);

  if(state.core){
    const kept = core(nodes, links.filter(e => e.pass));
    nodes = nodes.filter(n => kept.n.has(n.id));
    links = links.filter(e => kept.n.has(e.source) && kept.n.has(e.target));
  }else{
    const keep = new Set(nodes.map(n => n.id));
    links = links.filter(e => keep.has(e.source) && keep.has(e.target));
  }
  DEG.clear();
  links.forEach(e => { for(const k of [e.source, e.target]){
    const id = k.id ?? k; DEG.set(id, (DEG.get(id) || 0) + 1); } });
  // allNodes and allLinks are the unnarrowed world. The worklist needs it:
  // "a construct you did not carry" cannot be found in a view that has already
  // dropped the uncarried ones.
  return {nodes, links, allNodes, allLinks, isoCount, totalNotions:all.length};
}

// Largest connected set of arrows that clear the cost and calibration bars.
function core(nodes, pass){
  const adj = new Map(nodes.map(n => [n.id, []]));
  for(const e of pass){
    if(adj.has(e.source) && adj.has(e.target)){
      adj.get(e.source).push(e.target); adj.get(e.target).push(e.source);
    }
  }
  const seen = new Set(); let best = new Set();
  for(const n of nodes){
    if(seen.has(n.id)) continue;
    const comp = new Set([n.id]); const stack = [n.id]; seen.add(n.id);
    while(stack.length){
      const cur = stack.pop();
      for(const nb of (adj.get(cur) || [])){
        if(!comp.has(nb)){ comp.add(nb); seen.add(nb); stack.push(nb); }
      }
    }
    if(comp.size > best.size) best = comp;
  }
  return {n:best};
}

/* ------------------------------------------------------ the corpus, listed

   Step 1.1 used to be three controls and a count, which reads as if the
   literature were given and the sliders were the decision. The papers are what
   is being scoped, so they are in the step: dimmed when a filter puts one out
   of scope, and each with the one affordance a scoping step needs, which is a
   way to hand it a full text.                                              */

const APLAB = s => (G.approaches[s] && G.approaches[s].l) || "Unassigned";


/* What each column is, and what it sorts on. The meaning lives here so the
   header, its tooltip and the sort all read from one place. */
const PCOLS = [
  {k:"ap", cls:"ptrad", h:"", num:false,
   why:"The research tradition the paper was classified into, from Durand &amp; Huynh (2024). The same colour the paper's constructs take on the map."},
  {k:"a",  cls:"pwho",  h:"author", num:false, why:"First author's surname."},
  {k:"y",  cls:"pyr",   h:"year",   num:true,  why:"Year of publication. The corpus runs 2014 to 2026; nothing earlier passed the search."},
  {k:"ti", cls:"pti",   h:"title",  num:false, why:"The title as cited. Hover a row for the full record \u2014 journal, type, DOI and how the corpus holds it."},
  {k:"j",  cls:"pj",    h:"outlet", num:false, why:"The journal. Twelve are in the frame; which ones are in scope is set by the outlet list above."},
  {k:"nc", cls:"pnc",   h:"relationships", num:true,  why:"How many extracted relationships this paper contributes. A paper with many relationships is load-bearing on the map whether or not it is much cited."},
  /* A FUNCTION, because this one changes. The shipped numbers are a snapshot
     and Import the statistics re-reads them, so a fixed sentence would go on
     naming a date the column no longer carries. */
  {k:"cb", cls:"pcb",   h:"cited",  num:true,
   why:() => "Citations of the paper, from OpenAlex on " +
     (statRead() || "19 October 2026") + ". Attention, not standing." +
     (statCount() ? ` Re-read here for ${statCount()} paper${
       statCount() === 1 ? "" : "s"}; the rest carry the shipped snapshot.` : "")},
  {k:"",   cls:"pft",   h:"full text", num:false,
   why:"Whether the corpus holds a full text, and a way to attach one. Every quote in the corpus was verified verbatim against the text held."}
];

function paperOrder(){
  const {k, d} = state.pSort;
  const col = PCOLS.find(c => c.k === k) || PCOLS[2];
  return Object.entries(G.papers).sort((A, B) => {
    const a = A[1][k], b = B[1][k];
    const r = col.num ? (+a || 0) - (+b || 0)
                      : String(a || "").localeCompare(String(b || ""));
    return r * d || String(A[1].a || "").localeCompare(String(B[1].a || ""));
  });
}

function paperHead(){
  return `<tr>${PCOLS.map(c => c.k
    ? `<th class="${c.cls}${c.num ? " num" : ""}" data-psort="${c.k}"
         aria-sort="${state.pSort.k === c.k ? (state.pSort.d < 0 ? "descending" : "ascending") : "none"}">${c.h}${
         state.pSort.k === c.k ? `<span class="parr">${state.pSort.d < 0 ? "▾" : "▴"}</span>` : ""}</th>`
    : `<th class="${c.cls}">${c.h}</th>`).join("")}</tr>`;
}

/* NOTHING IN SCOPE IS NOT FIFTY-TWO DIMMED ROWS.

   The list draws the whole corpus and dims what the filters above put out of
   scope, which is right while SOME papers are in: you can see what you
   excluded and press it back. At zero it stops being informative and starts
   being a lie -- a new project is supposed to hold no literature at all, and
   it opened showing fifty-two titles the project does not have. Reported from
   the start page, where it is worst: `New project` says "no literature, no
   constructs, nothing decided" and then lists the shipped corpus.

   Two causes, two messages, because the way out differs. No outlet ticked is
   a project that has not been told what it is about. Outlets ticked with
   nothing surviving is a filter set too narrow. */
function noPapersHTML(){
  return state.jr.size
    ? `<p class="empty"><b>Nothing is in scope.</b> Every paper in this corpus is
       filtered out by the choices above. Widen the outlets or the research tradition
       to bring some back.</p>`
    : `<p class="empty"><b>No literature yet.</b> This project holds none, and nothing
       above is derived from papers it has not got. Say which literature it is about:
       read a search export in under <b>Import</b>, or open an AMG somebody else built
       from the Menu.</p>`;
}

function paperRows(){
  return paperOrder().map(([sl, p]) => {
    const at = attached.get(sl);
    return `<tr class="prow${okPaper(sl) ? "" : " out"}" data-slug="${hesc(sl)}">
      <td class="ptrad"><i style="background:${cssv(apVar(p.ap))}"></i></td>
      <td class="pwho">${hesc(p.a)}</td>
      <td class="pyr num">${hesc(p.y)}</td>
      <td class="pti">${hesc(p.ti || sl)}</td>
      <td class="pj">${hesc(p.j)}</td>
      <td class="pnc num">${p.nc}</td>
      <td class="pcb num">${p.cb || 0}</td>
      <td class="pft"><button type="button" class="ftbtn${at ? " has" : ""}"
        data-ft="${hesc(sl)}">${at ? "held ✓" : "attach"}</button></td>
    </tr>`;
  }).join("");
}

/* ADD A PAPER: THE SAME EXTRACTION, ASKED OF ONE PAPER AT A TIME.
   ==========================================================================

   The shipped fifty-two were read offline, from full texts, by a pipeline
   nobody at this page can run. This asks the same job of one paper, in the
   browser, from whatever the scholar can give it -- and what comes back goes
   through the path every other proposal goes through: parsed against the
   corpus's own vocabularies, counted where it falls outside them, shown
   before it is applied, and accepted or refused by name.

   THREE WAYS IN, and they are not equal, which the page says rather than
   hides:
     - A PDF is read HERE. The browser never sends the file anywhere; the
       text is extracted locally and only the text goes to the model.
     - A DOI is looked up at api.crossref.org, which is open and needs no
       key. That gives a title, authors, a year, a journal and sometimes an
       abstract -- metadata, not the paper.
     - A URL cannot be fetched from a page on another origin, and saying so
       is better than a request that fails for a reason nobody can see. It is
       kept as provenance; the text is pasted.

   What a short input yields is few claims, which is the correct answer. The
   prompt says so, and the proposal shows how much text it had. */
const PAPER = {busy:"", err:"", meta:null, text:"", out:null, refused:0, src:""};

function pdlgShow(){
  const d = document.getElementById("pdlg");
  if(!d) return;
  pdlgDraw(); pdlgWire();
  if(!d.open) d.showModal();
}
function pdlgDraw(){
  const b = document.getElementById("pdlgbody");
  const w = document.getElementById("pdlgwhat");
  const sv = document.getElementById("pdlgsave");
  if(!b) return;
  const o = PAPER.out;
  if(w) w.textContent = o
    ? `${o.constructs.length} construct${o.constructs.length === 1 ? "" : "s"}, ${
        o.claims.length} relationship${o.claims.length === 1 ? "" : "s"}${
        PAPER.refused ? ` \u00b7 ${PAPER.refused} refused` : ""}`
    : "a PDF, a DOI, or text you paste";
  if(sv){ sv.disabled = !o; sv.hidden = !o; }
  if(o){ b.innerHTML = paperPropHTML(o); return; }
  b.innerHTML = `
    <p class="why" style="margin:0 0 11px">One paper, read into this corpus's own shape: its
      constructs with the level, scale and bearer each is measured on, and its relationships with the
      sign each asserts and the scope its own paper stated. Nothing is added until you accept
      it, and what falls outside the corpus's vocabularies is counted rather than written.</p>
    <div class="pways">
      <div class="pway">
        <h5>A PDF</h5>
        <p>Read in this browser. The file is never uploaded; the text it contains is what
          goes to the model.</p>
        <input type="file" id="pPdf" accept="application/pdf,.pdf">
      </div>
      <div class="pway">
        <h5>A DOI</h5>
        <p>Looked up at <code>api.crossref.org</code> for the title, the authors, the year,
          the journal and the abstract where the publisher deposited one.</p>
        <div class="obkey" style="margin:0">
          <input type="text" id="pDoi" spellcheck="false" placeholder="10.1111/joms.12659"
            aria-label="DOI">
          <button type="button" class="tabbtn" id="pDoiGo">Look it up</button>
        </div>
      </div>
      <div class="pway">
        <h5>Text, and where it came from</h5>
        <p>A page on another origin cannot be fetched from here, so a URL is kept as
          provenance and the words are pasted.</p>
        <input type="text" id="pUrl" spellcheck="false" placeholder="https://… (optional)"
          aria-label="URL">
        <textarea class="defbox" id="pText" rows="5"
          placeholder="Paste the abstract, a section, or the whole paper."></textarea>
      </div>
    </div>
    ${PAPER.meta ? `<div class="pmeta">
      <span class="cst ok">found</span>
      <span><b>${hesc(PAPER.meta.title || "untitled")}</b><i>${
        hesc([PAPER.meta.authors, PAPER.meta.year, PAPER.meta.journal]
          .filter(Boolean).join(" \u00b7 "))}</i></span>
      <span class="pchars">${PAPER.text.length.toLocaleString()} characters to read</span>
    </div>` : ""}
    ${PAPER.err ? `<p class="why" style="color:var(--neg);margin:9px 0 0">${hesc(PAPER.err)}</p>` : ""}
    <div class="cmpacts" style="margin:12px 0 0">
      <button type="button" class="tabbtn" id="pGo"${
        PAPER.busy || !(PAPER.text || "").trim() ? " disabled" : ""}>${aiMark()}${
        PAPER.busy ? hesc(PAPER.busy) + "\u2026" : "Read it into the corpus"}</button>
      <span class="mblab">${(PAPER.text || "").trim()
        ? "Nothing is added until you accept what comes back."
        : "Give it a PDF, a DOI or some text first."}</span>
    </div>`;
}

/* The proposal, before anything is written. Every row says what it is and
   every refusal says why, which is the same contract the other eleven asks
   keep. */
function paperPropHTML(o){
  const by = new Map(o.constructs.map(c => [c.i, c]));
  return `
    <div class="pmeta">
      <span class="cst part">${aiMark()}proposed</span>
      <span><b>${hesc(o.paper.ti || "untitled")}</b><i>${hesc([o.paper.a, o.paper.y,
        o.paper.jf || o.paper.j].filter(Boolean).join(" \u00b7 "))}${
        o.paper.d ? " \u00b7 " + hesc(o.paper.d) : ""}</i></span>
      <!-- APLAB is a function and this read it as a map, so the tradition a
           model proposed for a paper always drew as "unassigned". -->
      <span class="pchars">${hesc(o.paper.t || "?")} \u00b7 ${
        hesc(APLAB(o.paper.ap))}</span>
    </div>
    <span class="ctl-label" style="margin-top:13px;display:block">Constructs \u00b7 ${
      o.constructs.length}</span>
    <div class="chain">${o.constructs.map(c => `<div class="crow">
      <span class="cst ok">new</span>
      <span class="cnm">${hesc(c.n || c.i)}<span class="cfl">${hesc(c.i)} \u00b7 ${
        hesc(c.l)} \u00b7 ${hesc(c.s)} \u00b7 ${c.f === "f" ? "flow" : "stock"} \u00b7 borne by ${
        hesc(c.b)}</span></span>
      <span class="cwy">${hesc(String(c.d || "").slice(0, 240))}</span>
    </div>`).join("")}</div>
    <span class="ctl-label" style="margin-top:13px;display:block">Relationships \u00b7 ${
      o.claims.length}</span>
    <div class="chain">${o.claims.map(c => `<div class="crow">
      <span class="cst ${c.g === "positive" ? "ok" : c.g === "negative" ? "gap" : "part"}">${
        hesc(c.g)}</span>
      <span class="cnm">${hesc((by.get(c.a[0]) || {}).n || c.a[0])} <b>\u2192</b> ${
        hesc((by.get(c.c[0]) || {}).n || c.c[0])}<span class="cfl">${hesc(c.e)}</span></span>
      <span class="cwy">${hesc(c.t || "")}${c.sc && !/^unstated$/i.test(c.sc)
        ? `<br><i class="bnote">scope: ${hesc(c.sc)}</i>`
        : `<br><i class="bnote">no scope stated</i>`}</span>
    </div>`).join("")}</div>
    ${PAPER.refused ? `<p class="why" style="margin:11px 0 0"><b>${PAPER.refused}</b> item${
      PAPER.refused === 1 ? " was" : "s were"} refused: a construct outside the corpus's
      vocabularies, or a relationship naming an end that was not proposed. They are counted here
      and not written.</p>` : ""}
    <p class="why" style="margin:9px 0 0">Read from <b>${
      PAPER.text.length.toLocaleString()}</b> characters${PAPER.src
      ? ` (${hesc(PAPER.src)})` : ""}. Accepting adds the paper, its constructs and its
      relationships to this corpus, marked as added and carried in the scenario. The shipped
      corpus is not touched.</p>`;
}

/* CROSSREF, which is open, needs no key and answers CORS. It gives metadata
   and not a paper: a title, the authors, a year, a journal, and an abstract
   where the publisher deposited one. The page says that rather than implying
   it read the article. */
async function doiLook(doi){
  doi = String(doi || "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if(!/^10\.\d{4,9}\//.test(doi)) throw new Error("that does not look like a DOI");
  const r = await fetch("https://api.crossref.org/works/" + encodeURIComponent(doi),
    {headers:{accept:"application/json"}});
  if(!r.ok) throw new Error(r.status === 404
    ? "Crossref has no record of that DOI" : "Crossref answered " + r.status);
  const m = ((await r.json()) || {}).message || {};
  const au = (m.author || []).map(a => [a.given, a.family].filter(Boolean).join(" "));
  const abs = String(m.abstract || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {meta:{doi, title:(m.title || [])[0] || "", authors:au.join(", "),
    year:String(((m.issued || {})["date-parts"] || [[]])[0][0] || ""),
    journal:(m["container-title"] || [])[0] || ""}, abstract:abs};
}

/* A PDF, READ HERE. pdf.js is loaded on demand and only when somebody picks a
   file, so a page nobody adds a paper on never fetches it. The file does not
   leave the browser: what goes to the model is the text. */
let PDFJS = null;
async function pdfText(file){
  if(!PDFJS){
    const src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";
    PDFJS = await import(/* @vite-ignore */ src);
    PDFJS.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";
  }
  const buf = await file.arrayBuffer();
  const doc = await PDFJS.getDocument({data:buf}).promise;
  const out = [];
  for(let i = 1; i <= Math.min(doc.numPages, 60); i++){
    const pg = await doc.getPage(i);
    const tc = await pg.getTextContent();
    out.push(tc.items.map(x => x.str).join(" "));
  }
  return out.join("\n").replace(/\s+/g, " ").trim();
}

/* WHAT CAME BACK, AGAINST THE CORPUS'S OWN VOCABULARIES. The same rule as
   every other ask: anything outside them is counted rather than written, and
   a claim whose end was not proposed has nowhere to land. */
function paperTake(r){
  const ok = (v, list) => list.includes(String(v));
  const P = r && r.paper || {};
  let refused = 0;
  const cons = [];
  for(const c of (r && r.constructs) || []){
    const i = String(c && c.i || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if(!i || !ok(c.l, PVOC.level) || !ok(c.s, PVOC.scale) || !ok(c.f, PVOC.flow)){
      refused++; continue; }
    cons.push({i, n:String(c.n || i).slice(0, 120), l:c.l, s:c.s, f:c.f,
      b:String(c.b || "unstated").slice(0, 60), d:String(c.d || "").slice(0, 900)});
  }
  const have = new Set(cons.map(c => c.i));
  const claims = [];
  for(const c of (r && r.claims) || []){
    const A = (c && c.a || []).map(x => String(x).trim()).filter(x => have.has(x));
    const C = (c && c.c || []).map(x => String(x).trim()).filter(x => have.has(x));
    if(!A.length || !C.length || !ok(c.g, PVOC.sign) || !ok(c.e, PVOC.evid)){ refused++; continue; }
    claims.push({a:A, c:C, g:c.g, e:c.e, t:String(c.t || "").slice(0, 400),
      sc:String(c.sc || "unstated").slice(0, 600)});
  }
  PAPER.refused = refused;
  if(!cons.length) throw new Error(
    "nothing came back inside the corpus's vocabularies, so there is nothing to add");
  return {paper:{a:String(P.a || "unknown").slice(0, 60), y:String(P.y || "").slice(0, 4),
    j:String(P.j || "").slice(0, 24), jf:String(P.jf || "").slice(0, 120),
    ti:String(P.ti || "").slice(0, 300), d:String(P.d || "").slice(0, 120),
    t:ok(P.t, PVOC.kind) ? P.t : "theory",
    ap:ok(P.ap, PVOC.tradition) ? P.ap : "--"},
    constructs:cons, claims};
}

/* ACCEPTED. The paper gets an id of the corpus's own shape, its constructs
   become nodes carrying it, and its claims become claims owned by it -- which
   is what makes it behave like one of the fifty-two rather than like a note
   beside them. */
function paperAccept(){
  const o = PAPER.out;
  if(!o) return;
  const stamp = Date.now().toString(36);
  const id = `add-${String(o.paper.a || "paper").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${o.paper.y || "0000"}-${stamp}`;
  const paper = Object.assign({}, o.paper, {id, sf:`${o.paper.a} - ${o.paper.y} - ${o.paper.j}`,
    src:"added", nc:o.claims.length, cb:0, cy:0, cly:0, msp:0, mcm:0, mea:0, e4:0, rdy:0,
    at:new Date().toISOString().slice(0, 10)});
  const nodes = o.constructs.map(c => ({i:c.i, l:c.l, s:c.s, f:c.f, b:c.b, n:1, p:[id],
    d:c.d, add:true}));
  const claims = o.claims.map((c, k) => ({id:`${id}#claim-${k + 1}`, a:c.a, c:c.c, g:c.g,
    e:c.e, p:id, t:c.t, sh:"unspecified", sb:"unspecified", sc:c.sc,
    sp:0, spf:[], cm:0, cmf:[], ea:0, eaf:[], add:true}));
  corpusAdd(paper, nodes, claims);
  xlog("corpus", "Added a paper to the corpus",
    `${paper.ti || paper.a} \u00b7 ${nodes.length} construct${nodes.length === 1 ? "" : "s"}, ${
      claims.length} relationship${claims.length === 1 ? "" : "s"}`);
  PAPER.out = null; PAPER.meta = null; PAPER.text = ""; PAPER.src = ""; PAPER.err = "";
  const d = document.getElementById("pdlg"); if(d && d.open) d.close();
  refresh(); renderPanel(); renderPapers();
}

/* The dialog wires itself on every draw: its body is innerHTML and what is in
   it depends on whether anything has been read yet. */
function pdlgWire(){
  const on = (id, ev, fn) => { const e = document.getElementById(id);
    if(e) e.addEventListener(ev, fn); };
  const redraw = () => { pdlgDraw(); pdlgWire(); };
  const keep = () => {
    const t = document.getElementById("pText"), u = document.getElementById("pUrl");
    if(t && t.value.trim()){ PAPER.text = t.value.trim(); PAPER.src = "pasted"; }
    if(u && u.value.trim()) PAPER.meta = Object.assign({}, PAPER.meta || {}, {url:u.value.trim()});
  };
  on("pText", "input", () => { keep(); const g = document.getElementById("pGo");
    if(g) g.disabled = !(PAPER.text || "").trim(); });
  on("pUrl", "change", keep);
  on("pPdf", "change", async ev => {
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    PAPER.busy = "reading the PDF"; PAPER.err = ""; redraw();
    try{
      PAPER.text = await pdfText(f);
      PAPER.src = f.name;
      PAPER.meta = Object.assign({}, PAPER.meta || {}, {title:f.name.replace(/\.pdf$/i, "")});
      if(!PAPER.text) PAPER.err = "no text came out of that PDF \u2014 it may be a scan, " +
        "in which case paste the text instead";
    }catch(e){ PAPER.err = "the PDF could not be read here: " + (e && e.message || e); }
    PAPER.busy = ""; redraw();
  });
  on("pDoiGo", "click", async ev => {
    ev.preventDefault();
    const i = document.getElementById("pDoi");
    if(!i || !i.value.trim()) return;
    PAPER.busy = "asking Crossref"; PAPER.err = ""; redraw();
    try{
      const r = await doiLook(i.value);
      PAPER.meta = Object.assign({}, PAPER.meta || {}, r.meta);
      PAPER.src = "Crossref";
      /* The abstract is what there is to read. Where the publisher deposited
         none, the metadata alone is thin and the page says so rather than
         sending a title and calling the answer an extraction. */
      PAPER.text = [r.meta.title, r.abstract].filter(Boolean).join("\n\n");
      if(!r.abstract) PAPER.err = "Crossref has no abstract for that DOI, so there is only " +
        "a title to read. Paste the abstract or the paper below for anything more.";
    }catch(e){ PAPER.err = String(e && e.message || e); }
    PAPER.busy = ""; redraw();
  });
  on("pGo", "click", async ev => {
    ev.preventDefault();
    if(!(PAPER.text || "").trim()) return;
    const cap = await aiCap();
    if(!cap){ PAPER.err = "no model is reachable from this page, so a paper cannot be read " +
      "into the corpus here. The start page says where one comes from."; redraw(); return; }
    PAPER.busy = "reading the paper"; PAPER.err = ""; redraw();
    const q = AIQ.paper(PAPER.meta || {}, PAPER.text);
    try{
      const r = await cap.json(q, {modelTier:"complex", cache:false});
      provTake("paper", q, r);
      PAPER.out = paperTake(r);
    }catch(e){ PAPER.err = "the ask came back empty: " + (e && e.message || e); }
    PAPER.busy = ""; redraw();
  });
  /* THROUGH onclick AND NOT addEventListener, because these two are in the
     markup rather than in the body this function redraws: a listener added to
     one of them is not thrown away with the body, so wiring them again adds a
     second handler instead of replacing the first. Pressing Add after five
     redraws called paperAccept five times. onclick replaces. The same defect
     in 24-import.js sent ten rounds of requests where two were asked for, and
     counting them is how it was found. */
  const once = (id, fn) => { const e = document.getElementById(id);
    if(e) e.onclick = fn; };
  once("pdlgsave", ev => { ev.preventDefault(); paperAccept(); });
  once("pdlgcancel", ev => { ev.preventDefault();
    const d = document.getElementById("pdlg"); if(d && d.open) d.close(); });
}

/* The list is not a control, so it is not in the control panel. It sits
   between the step and the map, at the map's own width, and folds away when
   you are working on the map instead. */
function renderPapers(){
  const el = document.getElementById("papersec");
  if(!el) return;
  if(state.stage !== 1){ el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  const n = Object.keys(G.papers).length;
  el.innerHTML = `
   <div class="phdr">
     <button type="button" class="pfold" id="pFold" aria-expanded="${state.papersOpen}">
       <span class="caret">${state.papersOpen ? "▾" : "▸"}</span>
       <span class="ctl-label">List of papers</span></button>
     ${infold(`The corpus itself, dimmed where a filter above puts a paper out of scope.
       Click a column to sort by it. Scoping decides which papers belong; choosing single
       constructs out of them is step 1.2, at a finer grain. <b>Hover a title</b> for the
       record and for what that paper argues beyond any single relationship: ${THESIS_PAPERS} of
       the ${Object.keys(G.papers).length} carry theses no arrow could hold.`)}
     <span class="pcount" id="pCount"></span>
     <span class="pacts" id="pimp">
       <!-- Three sources, one menu. A row of import buttons read as three
            features; the menu reads as one question -- where does a corpus come
            from -- with the answers under it, each saying what it would do and
            that it does not do it yet. -->
       <details class="menu" id="impMenu">
         <summary class="tabbtn" title="Where a corpus comes from: a file you already hold, or the index the search runs on">Import<span class="mcar">▾</span></summary>
         <div class="menupop">
           <button type="button" class="tabbtn" id="impCsv">From a search export&hellip;</button>
           <button type="button" class="tabbtn off" aria-disabled="true" id="impScopus">From Scopus<span class="pil">needs a key</span></button>
           <button type="button" class="tabbtn off" aria-disabled="true" id="impWos">From Web of Science<span class="pil">needs a key</span></button>
         </div>
       </details>
       <button type="button" class="tabbtn" id="impStats"
         title="Read the citation counts again, from OpenAlex, and stamp each with today. Open, no key needed, and nothing leaves this browser but the DOIs. Reversible: the shipped snapshot is never written to.">Read the statistics again</button>
       <button type="button" class="tabbtn" id="addPaper"
         title="Read one paper into this corpus: its constructs with their level, scale and bearer, and its relationships with the sign each asserts and the scope its own paper stated. From a PDF, a DOI, or text you paste.${AITIP}">${aiMark()}Add a paper</button>
     </span>
   </div>
   ${state.papersOpen ? (lastView.papersIn ? `
   <div class="pbox" tabindex="0">
     <table class="plist" id="plist">
       <colgroup><col class="c-t"><col class="c-w"><col class="c-y"><col><col class="c-j"><col class="c-n"><col class="c-n"><col class="c-f"></colgroup>
       <thead id="phead2">${paperHead()}</thead>
       <tbody id="pbody2">${paperRows()}</tbody>
     </table>
   </div>` : noPapersHTML()) : ``}`;
  wirePapers();
  paperScope();
}

function wirePapers(){
  const fold = document.getElementById("pFold");
  if(fold) fold.addEventListener("click", () => {
    state.papersOpen = !state.papersOpen; renderPapers(); });

  /* ADD A PAPER. The list is innerHTML, so the button is re-wired on every
     render; the dialog's own controls are wired each time it is drawn,
     because its body changes between asking and showing what came back. */
  { const ap = document.getElementById("addPaper");
    if(ap) ap.addEventListener("click", ev => { ev.preventDefault();
      PAPER.err = ""; pdlgShow(); }); }

  /* THE TWO IMPORTS THAT NEED NO ACCOUNT ANYWHERE. OpenAlex answers a browser
     without one; a file the reader already holds needs nobody's permission.
     The two that stay greyed need a subscriber key, which is why. */
  { const st = document.getElementById("impStats");
    if(st) st.addEventListener("click", ev => { ev.preventDefault();
      hideTip(); impShow("stats"); }); }
  { const cs = document.getElementById("impCsv");
    if(cs) cs.addEventListener("click", ev => { ev.preventDefault();
      hideTip(); impShow("csv"); }); }

  /* The hover for each control on this row. Three of the four entries describe
     something greyed and say why; the other two describe something live, and
     the click handler below is what tells them apart -- preventDefault on a
     live control would stop nothing, since the handlers above are already
     attached, but it is not asked for either. */
  Object.keys(PACT_TIP).forEach(id => {
    const b = document.getElementById(id); if(!b) return;
    b.addEventListener("mouseenter", ev => showTip(PACT_TIP[id], ev));
    b.addEventListener("mousemove", ev => showTip(PACT_TIP[id], ev));
    b.addEventListener("mouseleave", hideTip);
    if(b.classList.contains("off")) b.addEventListener("click", ev => ev.preventDefault());
  });

  const pl = document.getElementById("plist");
  if(!pl) return;
  pl.addEventListener("click", ev => {
    const b = ev.target.closest("[data-ft]");
    if(b){ ftPick(b.dataset.ft); return; }
    const th = ev.target.closest("[data-psort]");
    if(!th) return;
    const k = th.dataset.psort;
    const col = PCOLS.find(c => c.k === k);
    state.pSort = state.pSort.k === k ? {k, d: -state.pSort.d}
                                      : {k, d: col && col.num ? -1 : 1};
    document.getElementById("phead2").innerHTML = paperHead();
    document.getElementById("pbody2").innerHTML = paperRows();
    paperScope();
  });
  const tipFor = t => {
    if(!t || !t.closest) return null;
    const b = t.closest("[data-ft]");   if(b)  return ftTip(b.dataset.ft);
    const td = t.closest("td.pti");     if(td) return paperTip(td.parentElement.dataset.slug);
    const th = t.closest("th");
    if(th){ const c = PCOLS.find(x => x.cls === th.classList[0]);
      return c ? `<h5>${c.h || "research tradition"}</h5><p class="def">${
        typeof c.why === "function" ? c.why() : c.why}</p>` +
        (c.k ? `<span class="act">click to sort</span>` : "") : null; }
    return null;
  };
  ["mouseover","mousemove"].forEach(e => pl.addEventListener(e, ev => {
    const html = tipFor(ev.target); html ? showTip(html, ev) : hideTip(); }));
  pl.addEventListener("mouseleave", hideTip);
}

/* WHAT A PAPER ARGUES, BEYOND ANY ONE CLAIM. 290 paper-level theses ship in
   the payload -- "what the situation demands is closer to revolution than to
   reform" -- across 46 of the 52 papers, and nothing in the page had ever
   shown one. They are not claims about constructs and no arrow could carry
   them, which is exactly why they matter when the question on this step is
   whether a paper belongs to this literature at all. Indexed once rather than
   filtered on every hover. */
const THESES = (() => {
  const m = new Map();
  for(const r of (G.meta || [])){
    if(!m.has(r.p)) m.set(r.p, []);
    m.get(r.p).push(r.t);
  }
  return m;
})();
const THESIS_PAPERS = THESES.size;

function paperTip(sl){
  const p = G.papers[sl]; if(!p) return "";
  const at = attached.get(sl);
  const th = THESES.get(sl) || [];
  return `<h5>${hesc(p.ti || sl)}</h5>
    <span class="sig">${hesc(p.a)} ${hesc(p.y)} · ${hesc(p.jf)}</span>
    <span class="sig">${hesc(p.t)} · ${APLAB(p.ap)} · ${p.nc} relationship${p.nc === 1 ? "" : "s"}${p.e4 ? ` · ${p.e4} fully evidenced` : ""}</span>
    ${p.d ? `<span class="sig">doi ${hesc(p.d)}</span>` : ""}
    ${th.length ? `<p class="def" style="margin-bottom:3px"><b>What it argues, beyond any
      one relationship</b></p>
    <ul class="thx">${th.slice(0, 4).map(t => `<li>${hesc(t)}</li>`).join("")}</ul>${
      th.length > 4 ? `<span class="sig">and ${th.length - 4} more</span>` : ""}` : ""}
    <span class="act">${at ? `full text attached here — ${hesc(at.n)}`
      : `held in the corpus as ${hesc(p.sf || "—")}`}</span>`;
}

function ftTip(sl){
  const p = G.papers[sl] || {}; const at = attached.get(sl);
  return `<h5>${at ? "Full text attached" : "Attach a full text"}</h5>
    <p class="def">${at
      ? `<code>${hesc(at.n)}</code>, ${Math.max(1, Math.round(at.s / 1024))} KB, attached
         ${hesc(at.at)}. Click to replace it.`
      : `Hand this paper a PDF or a text file. The corpus already holds it as
         <code>${hesc(p.sf || "—")}</code>, which is what every quote attributed to it
         was verified against — so the case this is for is a paper that arrived without
         one.`}</p>
    <p class="def"><b>The bench does not extract from it.</b> Extraction runs in the
    repository, against the three renderings of each PDF; what is recorded here is that a
    file was supplied, not its contents.</p>`;
}

/* What one step of the threshold costs, in constructs. The slider's effect is
   steep and not obvious from the handle: at the default, two thirds of what is
   drawn is shared by exactly two papers. */
function minpStats(){
  const el = document.getElementById("minpTab"); if(!el) return;
  const at = t => G.nodes.filter(n => n.p.filter(okPaper).length >= t).length;
  const t = state.minp, now = at(t);
  const rows = [t - 1, t, t + 1].filter(x => x >= 1 && x <= 6);
  el.innerHTML = `<table class="mstat"><tbody>${rows.map(x => {
    const n = at(x), d = n - now;
    return `<tr class="${x === t ? "now" : ""}">
      <td>${x}+ paper${x === 1 ? "" : "s"}</td>
      <td class="num">${n}</td>
      <td class="num hint">${x === t ? "constructs drawn"
        : `${d > 0 ? "+" : ""}${d}`}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function paperScope(){
  const box = document.getElementById("plist");
  if(box) box.querySelectorAll("tr.prow").forEach(tr =>
    tr.classList.toggle("out", !okPaper(tr.dataset.slug)));
  const el = document.getElementById("pCount");
  if(el) el.textContent =
    `${lastView.papersIn} of ${Object.keys(G.papers).length} in scope` +
    (attached.size ? ` · ${attached.size} attached here` : "");
}

/* One file input, reused by whichever row asked for it. */
let ftTarget = null, ftInput = null;
function ftPick(sl){
  ftTarget = sl;
  if(!ftInput){
    ftInput = document.createElement("input");
    ftInput.type = "file";
    ftInput.accept = ".pdf,.txt,application/pdf,text/plain";
    ftInput.hidden = true;
    document.body.appendChild(ftInput);
    ftInput.addEventListener("change", () => {
      const f = ftInput.files && ftInput.files[0];
      if(f && ftTarget){
        attached.set(ftTarget, {n:f.name, s:f.size,
                                at:new Date().toISOString().slice(0, 10)});
        fpersist();
        const b = document.querySelector(`[data-ft="${ftTarget}"]`);
        if(b){ b.classList.add("has"); b.textContent = "held ✓"; }
        paperScope();
      }
      ftInput.value = "";
    });
  }
  ftInput.click();
}

/* The two greyed buttons. Each says what it would do and what this corpus
   actually came from, so the disabled state is informative rather than a dead
   end. */
const PACT_TIP = {
  impCsv: `<h5>From a search export</h5>
    <p class="def">A file you already hold — a Scopus CSV, a Web of Science tab-delimited
    export — read in this browser and screened the way the twelve-journal frame was. Both
    shapes are read: the delimiter and the columns are matched off the header, and the match
    is shown as something you can change before anything arrives.</p>
    <p class="def">What a file carries is <b>metadata</b>, which is what screening is done
    on. It cannot carry a relationship: a relationship is a verbatim span read out of a text by somebody
    who read the text, and that is <b>Add a paper</b>. An imported paper with a DOI is ready
    for it.</p>
    <p class="def">And it cannot carry the <b>screening decision</b>. A row says a paper
    appeared in some journal; it cannot say whether that journal belongs to this literature.
    So an outlet the frame does not hold joins the list above <b>unticked</b>, and until you
    tick it the paper is in the corpus and out of scope. That is the same act this step asks
    of you over the twelve, asked again over what arrived.</p>`,
  impScopus: `<h5>From Scopus</h5>
    <p class="def">The query run from this page, rather than a file carried in by hand.
    <b>Not implemented in this pilot.</b></p>
    <p class="def">This corpus came from two Scopus runs on 2026-09-21 — the phrase query
    and the bare word — and the log of both is in <code>data/raw/QUERIES.md</code>.
    Running it from here needs a subscriber key, which is the reason it is greyed rather than
    built: a step that only works for scholars at subscribing institutions is not a step this
    bench can claim.</p>`,
  impWos: `<h5>From Web of Science</h5>
    <p class="def">The same search design on the other index.
    <b>Not implemented in this pilot.</b></p>
    <p class="def">The Web of Science half was specified and never run, so this corpus is one
    index deep. Two indexes disagreeing about what the literature contains is a measurement
    in its own right, and it is one nothing here has made.</p>`,
  impStats: `<h5>Read the statistics again</h5>
    <p class="def">The <b>cited</b> column is attention at a date and not standing. It came
    from <b>OpenAlex</b> on 19 October 2026, and this reads it again now and stamps each
    number with today — because a count with no date behind it is not evidence of
    anything.</p>
    <p class="def">OpenAlex rather than the index the search ran on, for one reason: it is
    open and answers a browser without an account, so this is an import every reader can
    run rather than one for subscribers. What leaves this browser is the DOIs and nothing
    else. Nothing is written until you accept, and the shipped snapshot is never written
    to, so dropping what you accepted restores it exactly.</p>
    <p class="def">What it does <b>not</b> bring is what a Scopus or Web of Science export
    carries beside the counts — document type, funding, affiliations. That needs the export,
    which is the button above.</p>`,
  addPaper: `<h5>Add a paper</h5>
    <p class="def">One paper read into this corpus's own shape: its constructs with the
    level, scale and bearer each is measured on, and its relationships with the sign each asserts
    and the scope its own paper stated. From a PDF read in this browser, a DOI looked up at
    Crossref, or text you paste.</p>
    <p class="def">This is the protocol's hand search, and it is here because a metadata
    pipeline structurally cannot reach a paper whose title, abstract and keywords never name
    the construct it is about. Widening the query measured that at two fifths of the
    literature. What falls outside the corpus's vocabularies is counted rather than
    written, and nothing is added until you accept it.</p>`
};

export { APLAB, APORDER, DEMO_BRIDGE, DEMO_GROUPS, PACT_TIP, PCOLS, SCHEMECAP, addedPapers, apVar, bootSeed, bootStore, build, corpusAdd, corpusDrop, corpusLoad, corpusBaseEmpty, corpusBaseIsShipped, corpusBaseSet, corpusShipped, corpusSnap, corpusStats, corpusTake, doiLook, isAdded, jrnHeld, clusters, core, ftInput, ftPick, ftTarget, ftTip, inScope, jrnCount, minpStats, okPaper, paperHead, paperOrder, paperRows, paperScope, paperTip, pdfText, renderPapers, schemeDrop, schemeNow, schemeTake, sigMap, sigSet, statCount, statRead, statsDrop, underThreshold, wirePapers };

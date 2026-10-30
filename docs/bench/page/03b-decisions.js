/* AMG bench, page script 4b of 22: what the curator decided: carrying, full texts, answers, domains, hand-added relations and constructs.
   One shared global scope, loaded in order. See page/README.md.

   Carved out of 03-stores.js, which declared 133 names and was borrowed
   from by seventeen of the twenty page scripts -- the hub that
   scripts/page_deps.py reports first. The cut follows the section rules
   that were already in the file, and the three parts load in the order
   the one file ran in, so nothing moves into or out of a temporal dead
   zone. */
import { VOCAB } from "../core/vocab.js";
import { G } from "../graph-data.js";
import { lastView } from "./13-map.js";
import { lbl } from "./15-deposit.js";
import { lsRead, lsWrite, noteFail, state } from "./03-stores.js";
import { refresh } from "./14-boot.js";

/* ---------------------------------------------------------------- CARRYING

   What passes from one step to the next used to be implicit: whatever survived
   the filters. It is now a set you decide.

   We store what is DROPPED, not what is carried, for two reasons. Everything
   starts carried, so the empty set is the right default and a researcher who
   ignores the feature sees the tool behave as before. And a drop has to survive
   a change of tightness, which renames every notion — so a drop is recorded
   against stable corpus identifiers, never against a cluster:

     dropped.c   construct ids   — a notion is carried if ANY member survives
     dropped.k   claim ids       — a relation is carried if ANY claim survives

   Those are also exactly what the curator's pass needs to say, and what step
   2.1's `retire` verb is about, so the three agree by construction.          */
const dropped = {c:new Set(), k:new Set()};
let cdb = null;
/* The five shared-store handles are declared across this file and assigned
   together, once, by 03c-corpus.js when the store answers. A setter, because
   an imported binding cannot be assigned. */
function dbSetAll(db){ cdb = ddb = fdb = gdb = sdb = db; }

function csaveLocal(){
  lsWrite("purposeDropped", {c:[...dropped.c], k:[...dropped.k]});
}
function cloadLocal(){
  const v = lsRead("purposeDropped");
  if(!v) return false;
  (v.c||[]).forEach(x => dropped.c.add(x));
  (v.k||[]).forEach(x => dropped.k.add(x));
  return true;
}
async function cpersist(){
  if(cdb){ try{ await cdb.doc("carry/state")
      .set({c:[...dropped.c], k:[...dropped.k]}); return; }
    /* persistence: the shared store is gone or refused the write, so this
       falls back to browser storage below and the failure is recorded. */
    catch(e){ noteFail("carry/state", e); } }
  csaveLocal();
}
/* WHETHER ANYTHING WAS STORED, which decides whether the page seeds a demo.
   Two `const`s initialised by reading the browser store while this file
   evaluated; an object mutated by boot() now, because a store read during
   load is the class of failure boot() exists to remove -- and because a `let`
   written from another file is the other thing the modularization has to get
   rid of. */
const SEEDED = {carry:false, groups:false};

/* ------------------------------------------------------- FULL TEXTS HELD

   The corpus holds every one of these papers already — that is what each
   quote was verified against. What this records is a full text a user hands
   to the bench for a paper the corpus has not got, which is the case a CSV
   import would create. It is a pointer, not the file: the pilot does not
   extract in the browser, and storing the bytes would imply that it does.  */
const attached = new Map();   // slug -> {n:filename, s:bytes, at:date}
let fdb = null;

function fsaveLocal(){ lsWrite("purposeFullText", [...attached]); }
function floadLocal(){
  const v = lsRead("purposeFullText");
  if(v) v.forEach(([k, x]) => attached.set(k, x));
}
async function fpersist(){
  if(fdb){ try{ await fdb.doc("fulltext/state").set({a:[...attached]}); return; }
    catch(e){ noteFail("fulltext/state", e); } }                 // persistence
  fsaveLocal();
}

// Dropping a notion drops every name folded into it; carrying it restores them.
function setCarryNode(n, on){
  n.mem.forEach(m => on ? dropped.c.delete(m.i) : dropped.c.add(m.i));
}
// Dropping a relation drops the claims that assert it. Nothing else uses them.
function setCarryLink(e, on){
  e.claims.forEach(c => { if(c.id) on ? dropped.k.delete(c.id) : dropped.k.add(c.id); });
}
const nodeCarried = n => n.mem.some(m => !dropped.c.has(m.i));
const linkCarried = e => e.claims.some(c => !c.id || !dropped.k.has(c.id));

/* The curation record this corpus already carries. A proposal the bench makes
   is checked against these, so step 2.1 can say "already recorded" or
   "contradicts a recorded CONFLICT" instead of silently re-proposing. */
const RECORDED = [{"d": "2026-09-21", "a": "CONFLICT", "t": "firm-performance", "p": "020-durand-munro-clark-2025;026-gartenberg-prat-serafeim-2019", "r": "same id, different signature — left unmerged, first proposal used"}, {"d": "2026-09-21", "a": "merge", "t": "firm-performance", "p": "020-durand-munro-clark-2025;026-gartenberg-prat-serafeim-2019", "r": "same id proposed by several papers"}, {"d": "2026-09-21", "a": "split", "t": "firm-performance", "p": "020;026", "r": "two extractors proposed one id for a simulated landscape payoff and an accounting ratio; signatures differed on aggregation. Split into firm-performance-simulated and firm-accounting-performance"}, {"d": "2026-09-22", "a": "merge", "t": "societal-welfare → social-welfare-outcomes", "p": "156;175", "r": "same signature (field/society/ordinal/flow) and the same object: welfare generated for society net of firm-imposed costs"}, {"d": "2026-09-23", "a": "CO-MINT", "t": "activist-hedge-fund-targeting", "p": "015-davis-2021;230-kaplan-2023", "r": "two extractors independently proposed this id from different papers with no shared authors; signatures agree on level, aggregation, bearer and stock_or_flow and differ only on scale (ordinal vs binary). Kept as one construct at the more general scale"}, {"d": "2026-09-23", "a": "INVERSE", "t": "purpose-washing ↔ business-practice-alignment", "p": "126;152;207", "r": "same signature, definitions are negations of each other. Not merged: merging requires flipping the sign on every relationship using one of them. Recorded reciprocally on both files"}, {"d": "2026-09-23", "a": "CONFLATION", "t": "outside-in-purpose-orientation", "p": "061;065;152", "r": "Westphal borrows 'inside-out/outside-in' from Almandoz and from Rindova & Martins as one source; the two mean different bearers (employees vs strategists). Recorded, not merged"}, {"d": "2026-09-23", "a": "SPLIT-PENDING", "t": "performance-incentive-scheme-introduction", "p": "168;254", "r": "one id covers two instruments that behave oppositely: schemes tying reward to the QUANTIFIED pole (Bruder claim-20, raises tension) and to the previously UNQUANTIFIED pole (Manelli claim-22, embeds purpose). Manelli's BetaSigma ran both at once, so the evidence is within one case. Split warranted by Bruder's own definition; deferred to final curation so the contradicts edge stands as the honest record meanwhile"}, {"d": "2026-09-23", "a": "CO-MINT-RESOLVED", "t": "radical-purpose-adaptation", "p": "076;168", "r": "both propose the id; row 168 read the primary and row 076 reports it. Committed row 168's definition. The two use it in opposite directions (consequent vs antecedent) — recorded, not reconciled"}, {"d": "2026-09-23", "a": "merge", "t": "business-school-repurposing → business-school-re-purposing", "p": "076;172", "r": "identical signature, same quantity, ids differing by one hyphen. Kept the primary's spelling. The merge is what lets the two second-hand reports of Kitchener be compared"}];

/* Decisions taken in the bench. One row per judgement, in the vocabulary
   passes.tsv already uses, so the export is an input to curate.py rather than
   a transcript of settings. */
const decided = new Map();   // key -> {key, verb, target, members, reason, note, at}
let ddb = null;
const DVERBS = {
  merge:    "the same quantity under two names",
  split:    "one name covering two quantities",
  apart:    "never merge these, whatever the tightness",
  INVERSE:  "the same quantity with the sign flipped",
  CONFLICT: "same name, different signature — left unmerged",
  CONFLATION:"one source read as saying two different things",
  retire:   "withdraw the relationship from the corpus",
  keep:     "inspected and left as it stands",
  // conclusions, not constructs: what a surviving or failing result is about
  structure:      "a claim about the theory — it survives the whole declared class",
  implementation: "a claim about one way of writing the theory down, not about the theory",
  widen:          "the declared class was too narrow — widen it and run again",
  rescope:        "true, but not everywhere it was stated to be true",
  // relations the model needs
  declare:  "the model needs it and the literature does not assert it — declared, unsupported",
  rebind:   "bound to the wrong construct — choose another",
  drop:     "the model should not carry this relation"
};
function dkey(kind, target){ return kind + ":" + target; }
function dsaveLocal(){ lsWrite("purposeDecisions", [...decided.values()]); }
function dloadLocal(){
  const v = lsRead("purposeDecisions");
  if(v) v.forEach(d => decided.set(d.key, d));
}
async function dpersist(d){
  if(ddb){ try{ await ddb.doc("decisions/" + encodeURIComponent(d.key)).set(d); return; }
    catch(e){ noteFail("decisions/" + d.key, e); } }             // persistence
  dsaveLocal();
}
async function dforget(key){
  decided.delete(key);
  if(ddb){ try{ await ddb.doc("decisions/" + encodeURIComponent(key)).delete(); }
    catch(e){ noteFail("deleting decisions/" + key, e); } }      // persistence
  dsaveLocal(); refresh();
}

/* ------------------------------------------- what answers what

   `edges.tsv`, which the payload carried for the first time on 2026-10-22.
   A PAPER answering a specific CLAIM in another paper: 46 responds_to, 19
   refines, 8 contradicts, 59 of the 73 landing on a claim this corpus can
   draw, across 25 of the 52 papers.

   Why it belongs on THIS step. Step 1.3 weighs a claim by how many papers
   agree on its sign -- a tally, and the footer's own argument is that merging
   is the only operation that changes how much evidence a statement has. That
   is incomplete. Thirteen of these edges are cases where the answering paper
   asserts the SAME statement as the claim it answers, and four of those
   disagree about the sign. For those four the tally counts an answer as
   independent corroboration, which overstates the evidence: three papers
   asserting one statement is not three papers unless they arrived
   independently, and an edge is the record that two of them did not.

   The disputed subset is computed in `webdata.py` and not here, because it is
   a measurement over the corpus and ought to be reproducible without a
   browser. What this file does is read it.

   Note what it replaces. Until now the page's entire knowledge of
   disagreement was one CONFLICT row in RECORDED, typed in by a curator on
   2026-09-21 -- and another row in that same array reasons about "the
   contradicts edge" as the honest record, citing a file the page could not
   read. The curator was doing by eye, twice, what this does 73 times. */
const ANSWVERB = {responds_to:"responds to", refines:"refines", contradicts:"contradicts"};
const ANSW = new Map();            // claim id -> the edges answering it
for(const e of (typeof G !== "undefined" && G.edges) || []){
  if(!ANSW.has(e.t)) ANSW.set(e.t, []);
  ANSW.get(e.t).push(e);
}
const answOf = id => ANSW.get(id) || [];
/* An edge is DISPUTED when the answering paper asserts the same statement and
   gives it a different sign. `same` and `tg` are written by webdata.py. */
const dispOf = id => answOf(id).filter(e => (e.same || []).some(s => s.g !== e.tg));
/* Counted once: the corpus does not move while the page is open. */
/* COUNTED WHEN ASKED, not once while this file loads. As a constant it froze
   the shipped corpus's figures into the page for the session: a project that
   swapped the corpus out -- a second literature, or `New project`, which now
   holds none -- still read "57 relationships are answered by another paper"
   off a corpus it did not have. Three counts over 1,080 claims is nothing to
   recompute. */
const ANSWSTAT = () => {
  const drawable = new Set((typeof G !== "undefined" ? G.claims : []).map(c => c.id));
  const tgt = [...ANSW.keys()].filter(i => drawable.has(i));
  return {answered:tgt.length, disputed:tgt.filter(i => dispOf(i).length).length,
          edges:((typeof G !== "undefined" && G.edges) || []).filter(e => drawable.has(e.t)).length};
};

/* ------------------------------------------- a claim's domain of validity

   A claim is not enough. What a model needs from one is the region over which
   it is asserted to hold, and the corpus does not carry a testable one: all
   1080 claims have a `scope`, in English, and none of them is a domain.

   The dimensions are not invented here. They are the ones the scope report already
   quantifies over for a model's conclusions, turned on the claims instead.

     FORM      docs/bench/vocab.js declares a class of functions by "the
               qualitative properties a theory actually asserts -- increasing,
               concave, zero at the origin" and carries several structurally
               different members, because "picking a logistic because it is
               S-shaped is a stipulation, and no amount of sensitivity analysis
               over its parameters answers the objection". 477 of the claims in
               scope are flagged `no functional form`, so this dimension is
               nearly always open.
     RANGE     tests/scope.test.mjs reports "the share of the declared classes and
               the region of parameter space over which the claim holds", and
               the region is declared rather than discovered: grid() uses "a
               grid rather than a random draw, because the point is to report a
               share over a stated region, and a reader who wants to check it
               should be able to reconstruct the region exactly rather than be
               told a seed".
     ESTIMATE  87 claims carry a number, as prose. A point is not a domain; an
               interval is.
     MATTERS   the exported model file's minimum_effect -- "how big a difference in
               each outcome has to be before it is a difference the theory is
               about". Below it a verdict is UNRESOLVED, neither pass nor
               failure. One threshold for the whole set, which is why it sits on
               the step and not on the row.

   The property vocabulary is docs/bench/vocab.js `_FORM_CHECKS` exactly, so a
   declaration made here is one `check_family()` can verify against members. */
/* ---------------------------------------- the taxonomy a claim is described by

   "Use the taxonomy from one of the papers." Jaccard & Jacoby (2010) carry two
   that between them cover what a claim asserts, and they are the only complete
   ones in the library.

   RELATIONSHIP, from chapter 7: "Causal models have one or more of six types of
   'causal' relationships in them. The six relationships capture the universe of
   relationship types used in causal modeling" -- direct causal, indirect causal,
   spurious, moderated causal, bidirectional causal, unanalyzed. Before them sits
   their prior cut: a PREDICTIVE relationship asks only "is variability in A
   related to variability in B?" with "no presumption or implication of
   causation".

   FORM, from chapter 8: six classes of function -- linear, logarithmic,
   exponential, power, polynomial, trigonometric -- described by concavity,
   proportionality and scaling constants.

   The corpus can support some of these and not others, and the panel says which
   is which rather than offering an empty box. It holds `sign` and `shape` per
   claim, so those carry paper counts. It has no mediator field at all, which
   SCHEMA-GAPS calls "the strongest candidate for the next field", so indirect
   and spurious can be declared and never corroborated. That asymmetry is the
   finding, not a gap in the panel. */
/* -------------------------------------------- relations nobody asserted

   Two constructs can be joined by a chain when no paper joins them directly.
   Composing is not free, and the corpus says how unfree: of 30 pairs carrying
   both a direct claim and a two-step path, 29 compose to the stated sign and
   one contradicts it -- purpose raises meaning-making which raises work-life
   conflict, while purpose lowers work-life conflict overall. A suppressor path,
   inside the one paper this corpus has a mediation model from. So 97% in this
   corpus, and the 3% is the structural case rather than noise.

   A composed relation is therefore a PROPOSAL and never a claim: it is drawn
   apart, it says which link is weakest, and it cannot pretend a paper asserts
   it. What it is, in Jaccard & Jacoby's vocabulary, is an indirect causal
   relationship -- which is why carrying one declares the pair that way. */
const SOLID = [
  {k:"any", n:"any relationship",
   why:"Every relationship between the constructs you selected, whatever stands behind it."},
  {k:"sourced", n:"not merely asserted",
   why:"Drops links whose only basis is the author asserting it. Relayed, derived and estimated relationships remain."},
  {k:"estimated", n:"estimated from data",
   why:"Only links a paper estimated from its own data. 101 of the corpus's relations qualify, and they reach 65 further pairs at two steps."},
  {k:"corroborated", n:"two or more papers agreeing",
   why:"Only relations more than one paper asserts with no disagreement about the sign. There are sixteen of those in the extraction and <b>no two of them join end to end</b>, so before any merging this setting finds nothing at all. What it finds here is whatever your merges have joined \u2014 which is worth seeing, because the merge did it, not the literature."},
];
const edgeAdmits = (e, k) =>
  k === "any" ? true
  : k === "sourced" ? e.claims.some(c => c.e !== "asserted")
  : k === "estimated" ? e.claims.some(c => c.e === "estimated")
  : (e.papers.size > 1 && e.signs.size === 1);

// positive through positive is positive, negative through negative is positive,
// one of each is negative. A null, a condition or a category composes to
// nothing, and saying so is the honest result.
function composeSign(signs){
  let neg = 0;
  for(const s of signs){
    if(s.size !== 1) return null;
    const g = [...s][0];
    if(g === "positive") continue;
    if(g === "negative") neg++;
    else return null;
  }
  return neg % 2 ? "negative" : "positive";
}
const SOLIDRANK = {asserted:0, reported:1, derived:2, estimated:3};
const edgeRank = e => Math.max(...e.claims.map(c => SOLIDRANK[c.e] ?? 0));

/* Every pair the admitted links reach in two steps or more, up to the limit,
   that no carried claim already joins. Shortest path wins; a path may not
   revisit a construct. */
function composedPaths(){
  if(state.hops < 2) return [];
  const AN = lastView.allNodes || [], AL = lastView.allLinks || [];
  const end = x => x && x.id !== undefined ? x.id : x;
  const live = new Set(AN.filter(n => n.carried).map(n => n.id));
  const out = new Map();
  for(const e of AL){
    const a = end(e.source), b = end(e.target);
    if(!live.has(a) || !live.has(b) || !edgeAdmits(e, state.solid)) continue;
    if(!out.has(a)) out.set(a, []);
    out.get(a).push(e);
  }
  const direct = new Set(AL.filter(e => e.carried)
    .map(e => end(e.source) + ">" + end(e.target)));
  const found = new Map();
  for(const s of live){
    const walk = (u, path, seen) => {
      if(path.length >= state.hops) return;
      for(const e of (out.get(u) || [])){
        const v = end(e.target);
        if(seen.has(v)) continue;
        const p2 = path.concat([e]);
        if(p2.length >= 2){
          const k = s + ">" + v;
          if(!direct.has(k) && (!found.has(k) || found.get(k).path.length > p2.length))
            found.set(k, {id:k, from:s, to:v, path:p2});
        }
        walk(v, p2, new Set([...seen, v]));
      }
    };
    walk(s, [], new Set([s]));
  }
  for(const f of found.values()){
    f.sign = composeSign(f.path.map(e => e.signs));
    f.weak = f.path.reduce((w, e) => edgeRank(e) < edgeRank(w) ? e : w, f.path[0]);
    f.papers = [...new Set(f.path.flatMap(e => [...e.papers]))];
  }
  return [...found.values()].sort((a, b) =>
    a.path.length - b.path.length || String(a.id).localeCompare(String(b.id)));
}

const JJ_REL = [
  {k:"predictive", n:"Predictive only",
   why:"Variability in one is related to variability in the other, with \u201cno presumption or implication of causation\u201d. Jaccard &amp; Jacoby's prior cut, before any of the six."},
  {k:"direct", n:"Direct causal",
   why:"The cause is assumed to have a direct causal impact on the outcome. Their first type, and what an arrow in this corpus is read as by default."},
  {k:"indirect", n:"Indirect causal",
   why:"It influences the outcome only through an intermediary \u2014 a mediator, \u201cbecause other variables work through it\u201d. The corpus has no mediator field, so support for this is recovered from structure: a paper claiming A to M, M to B and A to B is itself saying the relation runs through M. 44 relationships in 18 papers are routed that way."},
  {k:"moderated", n:"Moderated causal",
   why:"The relationship \u201cdiffers depending on the value of a third variable\u201d. Partly supported: the corpus carries a moderators field, filled on 47 of 1080 relationships."},
  {k:"bidirectional", n:"Bidirectional",
   why:"The two are \u201cconceptualized as influencing each other\u201d. The corpus records a direction per relationship and nothing that pairs two directions as one relation."},
  {k:"spurious", n:"Spurious",
   why:"They are related because they share a common cause, \u201cbut not because either causes the other\u201d. No field for it."},
  {k:"unanalyzed", n:"Unanalyzed",
   why:"Correlated, and the theorist declines to say why: \u201cthe correlation may be spurious or it may be\u201d causal. The honest declaration when nothing warrants more."},
];
/* Their six function classes, which is what a PAPER states. Distinct from the
   class a modeller declares below: the kernel's argument is that you declare the
   properties a theory asserts and enumerate the members, rather than pick a
   named function, so the two rows answer different questions -- what was
   stated, and what will be run. */
const JJ_FORM = ["linear", "logarithmic", "exponential", "power", "polynomial",
                 "trigonometric"];

const FORMPROPS = [
  {k:"f(0)=0",     n:"zero at the origin",
   why:"No cause, no effect. Almost always true of a rate or a share and almost never of a level."},
  {k:"f(1)=1",     n:"one at the top",
   why:"Normalised at the top end, so swapping one member for another changes the shape and not the scale. every member of a family is required to have it."},
  {k:"increasing",  n:"increasing",
   why:"More of the antecedent never means less of the consequent. This is what a sign of positive asserts, and it is weaker than it looks: it fixes no curvature."},
  {k:"concave",     n:"concave",
   why:"Diminishing returns \u2014 the first increment does the most."},
  {k:"convex",      n:"convex",
   why:"Increasing returns, or a compounding cost \u2014 the last increment does the most."},
  {k:"sigmoid",     n:"sigmoid",
   why:"A threshold rather than a proportion: slow, then rapid, then saturating. Changes curvature exactly once, so it is neither concave nor convex."},
];
// Declarations that cannot both hold. check_family() would reject these against
// any member, so refusing them here is the same rule applied one step earlier.
const PROPCLASH = [
  ["concave", "convex", "a function cannot curve both ways"],
  ["concave", "sigmoid", "a sigmoid changes curvature once, so it is neither concave nor convex"],
  ["convex",  "sigmoid", "a sigmoid changes curvature once, so it is neither concave nor convex"],
];
const propClash = props => PROPCLASH
  .filter(([a, b]) => props.includes(a) && props.includes(b))
  .map(([a, b, why]) => `${a} and ${b}: ${why}`);

/* How many structurally different members a declaration admits. Not a count of
   functions -- a count of the members the kernel actually carries for that shape,
   which is what an enumeration would run: five sigmoid, five concave, four
   convex. A declaration that fixes no curvature admits all fourteen, which is
   the honest reading of a claim that states no form. */
const MEMBERS = {sigmoid:5, concave:5, convex:4};
const MEMBERS_ALL = Object.values(MEMBERS).reduce((a, b) => a + b, 0);
function memberCount(props){
  const hit = Object.keys(MEMBERS).filter(k => props.includes(k));
  return hit.length ? hit.reduce((t, k) => t + MEMBERS[k], 0) : MEMBERS_ALL;
}

/* One declaration per claim. Editing a claim does not edit the corpus: the
   corpus records what a paper said, and this records what a modeller declares
   on top of it. Keeping them apart is what lets the export say which is which. */
/* Keyed by STATEMENT -- the pair of constructs -- and not by claim. A model
   carries one relation per pair; the several claims under it are the evidence
   for that relation, and they can disagree. Properties belong to the thing the
   model carries. */
const spec = new Map();   // statement id -> {rel, props, lo, hi, elo, ehi, note, at}
let sdb = null;
/* `roles` is a list and not a value, like `props` beside it. A step that can
   only say "this is a cost" forces a point where the evidence supports a class,
   and the whole argument of the bench one level down is that you declare the
   class and enumerate the members. `role` is still read where an older record
   or an imported model carries one. */
const SPEC0 = () => ({rel:"", roles:[], props:[], lo:0, hi:1, elo:null, ehi:null, note:""});
const specSet = v => !!v && (!!v.rel || !!v.role || (v.roles && v.roles.length) || !!v.target ||
  v.props.length || v.lo !== 0 || v.hi !== 1 || v.elo != null || v.ehi != null || !!v.note);
function compSave(){ lsWrite("purposeComposed", [...state.comp]); }
function compLoad(){
  const v = lsRead("purposeComposed");
  if(v) v.forEach(x => state.comp.add(x));
}

function ssaveLocal(){ lsWrite("purposeClaimSpec", [...spec.entries()]); }
function sloadLocal(){
  const v = lsRead("purposeClaimSpec");
  if(v) v.forEach(([k, x]) => spec.set(k, x));
}
async function spersist(id, v){
  if(sdb){ try{ await sdb.doc("claimspec/" + encodeURIComponent(id)).set({id, ...v}); return; }
    catch(e){ noteFail("claimspec/" + id, e); } }                // persistence
  ssaveLocal();
}
async function sforget(id){
  spec.delete(id);
  if(sdb){ try{ await sdb.doc("claimspec/" + encodeURIComponent(id)).delete(); }
    catch(e){ noteFail("deleting claimspec/" + id, e); } }       // persistence
  ssaveLocal(); refresh();
}

/* ------------------------------------------------- proposed constructs */
const GHUE = ["#4f7fa8","#a8704f","#5f8f6a","#8a5f96","#9c8140","#4f8f95","#96566a"];
const groups = new Map();         // id -> {id, name, members:[constructId], color}
let gdb = null, gseq = 0;
const gid = () => "g" + Date.now().toString(36) + (gseq++).toString(36);

function gsaveLocal(){ lsWrite("purposeGroups", [...groups.values()]); }
function gloadLocal(){
  const v = lsRead("purposeGroups");
  if(!v) return false;
  v.forEach(g => groups.set(g.id, g));
  return true;
}
async function gpersist(g){
  if(gdb){ try{ await gdb.doc("groups/" + g.id)
      .set({name:g.name, members:g.members, color:g.color}); return; }
    catch(e){ noteFail("groups/" + g.id, e); } }                 // persistence
  gsaveLocal();
}
async function gremove(id){
  groups.delete(id);
  if(gdb){ try{ await gdb.doc("groups/" + id).delete(); }
    catch(e){ noteFail("deleting groups/" + id, e); } }          // persistence
  gsaveLocal(); refresh();
}


/* ------------------------------------------------------- added by hand

   Step 2.1 is where a model needs a construct or a relation the corpus has not
   got. The import does that from somebody else's model; this does it from the
   modeller, and the record has to say which. So nothing added here is ever
   evidence: it carries no paper, it is never counted as corroborated or
   contested, it stays out of the corpus figures, and every row it appears on
   says ADDED BY HAND.

   The definition text is the point of it rather than a note on it. A construct
   nobody extracted has no entry in a registry and no measure behind it, so the
   only thing that says what it means is what the modeller writes here \u2014 and
   that is what the next reader has to work from. It goes out with the record. */
/* the kernel's three closed vocabularies, which is what makes a declaration made
   here comparable with one made about another model. A quantity's KIND is the
   shape of the thing, deliberately not an ontology of constructs: two theories
   can agree that something is a rate while disagreeing about everything else.
   ASPECT is the one everybody forgets \u2014 a quantity measured against a baseline
   is zero at that baseline by construction, so "it is zero there" is a fact
   about the measure and not a finding, and missing it has already made two
   governance models in this repository look incomparable. ROLE is what a
   mechanism does, and it is what makes one ablatable: you can only switch off
   an operation that has been named as separable. */
/* Read from vocab.js, which the kernel's forms.py is held to by the suite.
   They were declared here and again there, transcribed, with nothing
   checking that the two still said the same thing. */
const KINDS = VOCAB.kinds;
const ASPECTS = VOCAB.aspects;
/* the exported identifier is the contract and cannot move -- purpose.py declares
   eleven mechanisms against it -- so the plain phrase leads and the identifier
   follows. The last two are both "moderator" in regression language, and
   collapsing them loses the distinction that matters: whether the third
   variable is a switch or a dial. */
const ROLES = VOCAB.roles;
/* What a paper's stated shape commits to, in the property vocabulary
   check_family() verifies. Only `asserted` and `derived` bases are read: 97 of
   the 1080 claims carry a shape the ESTIMATOR imposed, almost all of them
   linear, and a regression's default is not a theory's commitment. */
const SHAPE_PROPS = VOCAB.shape_props;

/* How the mechanisms writing one quantity combine. This is the choice that
   changes predictions most and gets made most quietly: additive says the
   mechanisms are independent contributions, multiplicative says each one is
   necessary, min says the smallest binds. Three theories of the same mechanism
   set, with different ablation signatures, and no paper ever states which. A
   class here is swept like any other. */
const COMPOSITIONS = VOCAB.compositions;
/* Where a carried relation came from. It was a local inside step 3.1's body and
   is now read by the mechanism row as well, which is in another file. */
const SRCLAB = {corpus:"from the corpus", composed:"composed", model:"from the model",
                hand:"added by hand"};
/* What must be true of the result, whoever writes it. These are not arithmetic
   -- they are predicates over the model's behaviour, run after it runs, and
   they are what lets the equations stay in a file and still be answerable to
   the declarations. Every one is derived from something already declared. */
const INVARIANTS = [
  {k:"zero_at_baseline", n:"zero at its baseline",
   why:"A quantity declared `difference` is measured against a baseline and is therefore zero there BY CONSTRUCTION. Nothing checks it today, and a missed one has already made two governance models in this repository look incomparable on a quantity they both declared.",
   from:"aspect: difference"},
  {k:"within_bounds", n:"inside the declared bounds",
   why:"Every quantity stays in the interval declared for it at every point of the sweep. A model that leaves its own bounds is not being swept over the space it says it is.",
   from:"the bounds on each quantity"},
  {k:"share_sums_to_one", n:"shares sum to one",
   why:"A quantity declared `share` is a fraction of a whole, so the set of shares over that whole adds to one. Unchecked, a share that drifts is indistinguishable from a finding.",
   from:"kind: share"},
  {k:"propensity_in_unit", n:"propensities stay in [0,1]",
   why:"A propensity is an inclination and has no meaning outside the unit interval.",
   from:"kind: propensity"},
  {k:"conserved", n:"a transfer conserves",
   why:"A mechanism declared `moves between` must leave the total unchanged: one holder's gain is another's loss. If it creates value it is not a transfer, and calling it one hides where the value came from.",
   from:"role: transfers"},
  {k:"monotone_in", n:"monotone in a named parameter",
   why:"Declared per relation rather than derived: where a shape class says increasing, the outcome it writes should not fall as its input rises. The weakest of the six and the easiest to violate by accident through a cost term.",
   from:"shape class: increasing"},
];

/* How one quantity's mechanisms combine, and what caps it. */
const compo = new Map();  // outcome node id -> {id, rules:[], at}
function csaveLocal2(){ lsWrite("purposeCompose", [...compo.values()]); }
function cloadLocal2(){
  const v = lsRead("purposeCompose");
  if(v) v.forEach(x => compo.set(x.id, x));
}
const rulesOf = k => { const c = compo.get(k); return (c && c.rules) || []; };
// which mechanism an `enables` or `scales` acts on
const targetOf = r => ((spec.get(r.id) || {}).target) || "";

/* A construct typed as a model variable. Keyed by the node id, which is what
   survives a merge: typing is declared about the quantity a model carries, and
   a merge is the decision that two constructs are one quantity. */
const vtype = new Map();  // node id -> {id, name, kind, aspect, lo, hi, at}
function vsaveLocal(){ lsWrite("purposeVarType", [...vtype.values()]); }
function vloadLocal(){
  const v = lsRead("purposeVarType");
  if(v) v.forEach(x => vtype.set(x.id, x));
}

const mcon = new Map();   // id -> {id, name, def, at}
const mclm = new Map();   // id -> {id, from, to, g, sh, def, at}
let mseq = 0;
const mid = p => p + Date.now().toString(36) + (mseq++).toString(36);
/* The extraction's own sign vocabulary, from SPEC.md, so a claim added by hand
   is comparable with the ones that were read off papers rather than sitting in
   a vocabulary of its own. */
const SIGNS = ["positive", "negative", "none", "conditional", "categorical", "inverted-U"];
function msaveLocal(){
  lsWrite("purposeHandCon", [...mcon.values()]);
  lsWrite("purposeHandClm", [...mclm.values()]);
}
function mloadLocal(){
  const a = lsRead("purposeHandCon");
  if(a) a.forEach(x => mcon.set(x.id, x));
  const b = lsRead("purposeHandClm");
  if(b) b.forEach(x => mclm.set(x.id, x));
}
/* A claim added by hand can stand on a construct added by hand, so the name of
   an end is looked for in both places. */
const handName = x => {
  const i = x && x.id !== undefined ? x.id : x;
  if(mcon.has(i)) return mcon.get(i).name;
  const n = (lastView.allNodes || []).find(k => k.id === i);
  return n ? lbl(n) : lbl(i);
};
/* What a claim can be asserted between: the constructs this step was handed,
   and the ones added to it. Nothing else \u2014 a relation to a construct step 1.2
   dropped would have nowhere to land, which is the same rule the arrows obey. */
const handEnds = () => {
  const out = [...mcon.values()].map(m => ({id:m.id, name:m.name, hand:true}));
  for(const n of (lastView.allNodes || []))
    if(n.carried) out.push({id:n.id, name:lbl(n), hand:false});
  return out.sort((a, b) => a.name.localeCompare(b.name));
};
// a construct removed takes its claims with it: a relation with one end missing
// is not a relation
function mforgetCon(id){
  mcon.delete(id);
  [...mclm.values()].forEach(m => { if(m.from === id || m.to === id) mclm.delete(m.id); });
  msaveLocal(); refresh();
}
function mforgetClm(id){
  mclm.delete(id); msaveLocal(); sforget("mx:" + id);
}

export { ANSW, ANSWSTAT, ANSWVERB, ASPECTS, COMPOSITIONS, DVERBS, FORMPROPS, GHUE, INVARIANTS, JJ_FORM, JJ_REL, KINDS, MEMBERS, MEMBERS_ALL, PROPCLASH, RECORDED, ROLES, SEEDED, SHAPE_PROPS, SIGNS, SOLID, SOLIDRANK, SPEC0, SRCLAB, answOf, attached, cdb, cloadLocal, cloadLocal2, compLoad, compSave, compo, composeSign, composedPaths, cpersist, csaveLocal, csaveLocal2, dbSetAll, ddb, decided, dforget, dispOf, dkey, dloadLocal, dpersist, dropped, dsaveLocal, edgeAdmits, edgeRank, fdb, floadLocal, fpersist, fsaveLocal, gdb, gid, gloadLocal, gpersist, gremove, groups, gsaveLocal, gseq, handEnds, handName, linkCarried, mclm, mcon, memberCount, mforgetClm, mforgetCon, mid, mloadLocal, msaveLocal, mseq, nodeCarried, propClash, rulesOf, sdb, setCarryLink, setCarryNode, sforget, sloadLocal, spec, specSet, spersist, ssaveLocal, targetOf, vloadLocal, vsaveLocal, vtype };

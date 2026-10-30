/* AMG bench, page script 18 of 22: scenarios, provenance, and the three exchange formats.
   One shared global scope, loaded in order. See page/README.md. */
import { hesc } from "../core/safe.js";
import { comLoad, comSnap } from "./22-communities.js";
import { EXP } from "../core/expset.js";
import { SIM } from "../core/similarity.js";
import { ARITH, CT, asaveLocal, xinv, xsaveLocal } from "./08-ask.js";
import { BOARD, GUESS, ROUNDS, XLOG, boardSave } from "./05-explore.js";
import { corpusBaseEmpty, corpusShipped, corpusSnap, corpusTake } from "./03c-corpus.js";
import { depSnap, depTake } from "./26-deposit.js";
import { litSnap, litTake } from "./27-streams.js";
import { impSnap, impTake } from "./29-models.js";
import { nbSnap, nbTake } from "./25-notebook.js";
import { G } from "../graph-data.js";
import { JALL, lsRead, lsWrite, noteFail, state } from "./03-stores.js";
import { MR } from "../model-report.js";
import { WS, wsSave } from "./18-workspace.js";
import { apart, asave } from "./16-worklists.js";
import { bufSeed, famSave, xfam } from "./10-depends.js";
import { chint, draw, lastView } from "./13-map.js";
import { compSave, compo, cpersist, csaveLocal, csaveLocal2, ddb, decided, dpersist, dropped, dsaveLocal, gdb, gpersist, groups, gsaveLocal, mclm, mcon, msaveLocal, spec, ssaveLocal, vsaveLocal, vtype } from "./03b-decisions.js";
import { BUF, PROPS, deriveProps, tsaveLocal, xtest } from "./09-derive.js";
import { expSave } from "./20-expset.js";
;
import { onRefresh, refresh } from "./14-boot.js";
import { renderPanel, renderTrack, stepNo, wayOut } from "./06-wiring.js";
import { simForget, simSave } from "./03d-similarity.js";
/* ------------------------------------------------------------ SCENARIOS

   Every setting, merge, drop, selection and answer on every step is one
   scenario, and the block in the header is the whole of save and load. There is
   no save button: choices are written to the scenario you are in as you make
   them, which is the only version that cannot be forgotten. Switching swaps the
   lot at once.

   A scenario is a snapshot and not a diff. That costs a few kilobytes each and
   buys the property that matters: the scenario you come back to is the one you
   left, whatever has happened to the others since.

   Two are seeded on a first visit. The worked example the bench has always
   opened on, saved before anything else so it cannot be lost, and a second for
   the decisions needed to reach the model this corpus was built towards --
   which is not a copy of the first: it carries the constructs the model's
   variables are bound to, drops the two-paper threshold that hides four of
   them, and hands all eleven of the model's relations to step 2.1.         */

/* ------------------------------------------------- what every export carries */
/* The call rules out work that cannot be reproduced, and nothing that left this
   page said WHICH page it left. A pass export carried a date; `graph-data.js`
   opens straight on `const G={"nodes"...` with no version at all; and an
   accepted proposal kept no record of what was asked or what came back, so a
   scenario could not be replayed without calling a model again.

   Three stamps fix that, and the third is the one with teeth: an LLM answer
   that somebody ACCEPTED is a decision, and a decision whose input nobody kept
   is not reproducible however carefully the rest of the chain behaves. */
const BENCH = {v:"0.14", at:"2026-10-22"};
/* webdata.py emits `built` from here on. A corpus file made before that says so
   rather than being quietly undated. */
const CORPUS = (typeof G !== "undefined" && G && G.built) ? G.built : null;
const corpusStamp = () => CORPUS
  ? `corpus ${CORPUS.commit || "?"} of ${CORPUS.at || "?"}`
  : "corpus build unstamped — rebuild graph-data.js to date it";
const stampLines = () => [
  `# AMG Workbench, bench ${BENCH.v} of ${BENCH.at}`,
  `# ${corpusStamp()}`,
  `# written ${new Date().toISOString().slice(0, 19).replace("T", " ")}`];

/* Every answer a scholar ACCEPTED, with what was asked for it. Kept whole, so a
   replay reads the file instead of the model. */
const PROV = [];
function provTake(what, prompt, answer){
  PROV.push({what, at:new Date().toISOString(),
    /* The capability promises no model id, so the field is present and empty
       rather than guessed at. */
    model:"",
    prompt:String(prompt || "").slice(0, 20000),
    answer:(typeof answer === "string" ? answer
      : JSON.stringify(answer || null)).slice(0, 20000)});
  if(PROV.length > 60) PROV.shift();
}

/* The scenario as a FILE: every decision, every accepted proposal, and the
   stamps, so a replay never calls a model and a reader can tell which bench and
   which corpus it came off. It is also what a command line would read. */
const SCEN_FORMAT = "amg-scenario", SCEN_V = 1;
function scenFile(){
  const cur = (typeof scenCur === "function" ? scenCur() : null) || {};
  return JSON.stringify({
    format:SCEN_FORMAT, v:SCEN_V,
    bench:BENCH, corpus:CORPUS,
    at:new Date().toISOString(),
    name:cur.name || "",
    snap:snapNow(),
    provenance:PROV,
    rounds:ROUNDS.map(r => ({n:r.n, at:r.at, lines:r.lines, props:r.props, decl:r.decl})),
    log:XLOG
  }, null, 1);
}
function scenLoad(text){
  let o; try{ o = JSON.parse(text); }
  catch(e){ return {err:"that is not JSON"}; }
  if(!o || o.format !== SCEN_FORMAT) return {err:"not a project file this workbench wrote"};
  if(+o.v !== SCEN_V) return {err:`that file is version ${o.v}; this bench reads ${SCEN_V}`};
  if(!o.snap) return {err:"the file carries no decisions"};
  const warn = [];
  if(o.bench && o.bench.v !== BENCH.v)
    warn.push(`written on bench ${o.bench.v}, read on ${BENCH.v}`);
  const mine = CORPUS && CORPUS.commit, theirs = o.corpus && o.corpus.commit;
  if(mine && theirs && mine !== theirs)
    warn.push("a different corpus build — ids may not resolve");
  else if(!mine || !theirs) warn.push("one of the two corpus builds is unstamped");
  return {o, warn};
}

/* The scenario, put somewhere a reader can reach.

   Everything this page decides lives in localStorage, under this browser, on
   this device: clear the site data and it is gone, and nobody else can see it.
   That is the right default for a workbench and the wrong one for showing
   somebody what you built.

   The file export is the portable answer and stays the primary one, because it
   works with no account, no host and no network. This is the other half: on a
   host that offers a store, the same scenario file goes into it under the
   artifact, which is how a co-author -- or a model reading on your behalf --
   can open what you have without you mailing a file around.

   Everything about it degrades to nothing: no host, no store, no button. The
   page outside claude.ai is unchanged, which is the condition the call puts on
   infrastructure other researchers have to be able to run. */
const SCEN_COLL = "scenarios";
let SCEN_DB;                       // undefined until asked, null when there is none
async function scenStore(){
  if(SCEN_DB !== undefined) return SCEN_DB;
  SCEN_DB = null;
  try{
    if(typeof window !== "undefined" && window.claude && window.claude.use)
      SCEN_DB = await window.claude.use("db");
  }catch(e){ SCEN_DB = null; }
  return SCEN_DB;
}
async function scenPush(){
  const db = await scenStore();
  if(!db) return {err:"this page has no store to write to \u2014 export the file instead"};
  const cur = scenCur() || {};
  const id = cur.id || scenId();
  let body;
  try{ body = JSON.parse(scenFile()); }
  catch(e){ return {err:"the project would not serialise"}; }
  try{
    await db.doc(SCEN_COLL + "/" + id).set({
      name: body.name || "untitled",
      at: body.at,
      bench: (body.bench && body.bench.v) || "",
      corpus: (body.corpus && body.corpus.commit) || "",
      /* Enough to tell two scenarios apart in a listing without reading
         either: where it stands, how much was thrown away, and whether it
         has been taken past the curation. */
      step: (body.snap && body.snap.stage) || 1,
      dropped: (body.snap && body.snap.dropped && (body.snap.dropped.c || []).length) || 0,
      merges: (body.snap && (body.snap.groups || []).length) || 0,
      declared: (body.snap && (body.snap.vtype || []).length) || 0,
      arithmetic: !!(body.snap && body.snap.arith),
      scenario: body
    });
    return {ok:true, id};
  }catch(e){ return {err:(e && e.message) || "the store refused it"}; }
}

/* Everything in the store, as rows.

   The page is written against a store whose exact shape it cannot see from
   here, so it asks in every plausible way and says which one answered. A
   capability that is present but shaped differently is the one failure mode
   worth naming on screen rather than swallowing: "cannot open it" sends
   somebody looking in the wrong place. */
const dbNames = o => {
  const s = new Set();
  let p = o;
  while(p && p !== Object.prototype){
    for(const n of Object.getOwnPropertyNames(p)) if(n !== "constructor") s.add(n);
    p = Object.getPrototypeOf(p);
  }
  return [...s].sort().join(" ");
};
/* Whatever came back, as a list of plain rows. A store may hand back
   {docs:[...]}, {items:[...]}, a bare array, or a map of id to document, and
   each row may carry its fields under .data or at the top. */
function dbRows(raw){
  if(!raw) return [];
  const list = Array.isArray(raw) ? raw
    : Array.isArray(raw.docs) ? raw.docs
    : Array.isArray(raw.documents) ? raw.documents
    : Array.isArray(raw.items) ? raw.items
    : Array.isArray(raw.results) ? raw.results
    : (raw && typeof raw === "object")
      ? Object.keys(raw).map(k => Object.assign({id:k}, raw[k]))
      : [];
  return list.map(d => {
    const body = (d && typeof d.data === "function") ? d.data()
      : (d && d.data && typeof d.data === "object") ? d.data : d;
    return Object.assign({id:(d && (d.id || d.doc_id || d.name)) || ""}, body || {});
  });
}
/* The demo ships beside the page, so opening it asks nothing of the host:
   no store, no account, no file on anybody's disk. The same JSON is in the
   repository, written by the bench itself. */
const DEMO_FILE = "demo/purpose-x-property-rights.amg.json";
/* The second one. The two-channel model was in the grammar and not yet a
   scenario, so the workbench could not open it; this is the file that closes
   that, written by scripts/make_two_channel_scenario.mjs
   from the grammar and checked against it by tests/twochannel-scenario.test.mjs.
   It goes from the model to the literature rather than the other way, which is
   the reverse of the first demo and is why both are worth opening: the same
   corpus read for the constructs this model needs, a second literature joined
   to it, and the quantities no paper carries saying so on themselves. */
const MODEL_FILE = "demo/purpose-two-channel.amg.json";
/* ONE NAME PER EXAMPLE, wherever it is shown. The toggle said "Worked
   example", the menu "Open the demo", the way-in page "Open the worked
   example" and the scenario list "Purpose × property rights (example)", cut
   to "(e:" at 1440 wide. Four names for one thing. */
const EGNAME = {[DEMO_FILE]:"Purpose and property rights", [MODEL_FILE]:"Two-channel model"};
async function scenDemo(file){
  try{
    const r = await fetch(file || DEMO_FILE, {cache:"no-store"});
    if(!r.ok) return {err:"the demo file is not beside this page (" + r.status + ")"};
    return scenLoad(await r.text());
  }catch(e){ return {err:(e && e.message) || "the demo file would not load"}; }
}

async function scenPullList(){
  const db = await scenStore();
  if(!db) return {err:"this page has no store to read"};
  const col = (typeof db.collection === "function") ? db.collection(SCEN_COLL) : null;
  const tried = [];
  const go = async (what, fn) => {
    if(!fn) return undefined;
    try{ const v = await fn(); tried.push(what); return v; }
    catch(e){ tried.push(what + " threw " + ((e && e.message) || "")); return undefined; }
  };
  let raw;
  if(col) raw = await go("collection.get", col.get && (() => col.get()));
  if(raw === undefined && col) raw = await go("collection.getDocs", col.getDocs && (() => col.getDocs()));
  if(raw === undefined && col) raw = await go("collection.list", col.list && (() => col.list()));
  if(raw === undefined && col) raw = await go("collection.query", col.query && (() => col.query()));
  if(raw === undefined) raw = await go("db.list", db.list && (() => db.list(SCEN_COLL)));
  if(raw === undefined) raw = await go("db.query", db.query && (() => db.query(SCEN_COLL)));
  if(raw === undefined)
    return {err:"the store would not list. It offers [" + dbNames(db) + "]" +
      (col ? ", a collection offers [" + dbNames(col) + "]" : ", and has no collection()") +
      (tried.length ? ". Tried: " + tried.join("; ") : "")};
  const rows = dbRows(raw);
  return rows.length ? {rows}
    : {err:"the store answered " + tried[tried.length - 1] + " with nothing this page could read: " +
        JSON.stringify(raw).slice(0, 160)};
}
async function scenPull(id){
  const db = await scenStore();
  if(!db) return {err:"this page has no store to read"};
  const path = SCEN_COLL + "/" + id;
  const go = async fn => { if(!fn) return undefined;
    try{ return await fn(); }catch(e){ return undefined; } };
  let raw = await go(db.doc && (() => db.doc(path).get()));
  if(raw === undefined) raw = await go(db.get && (() => db.get(path)));
  if(raw === undefined && db.collection) raw = await go(() => db.collection(SCEN_COLL).doc(id).get());
  if(raw === undefined) return {err:"the store would not read " + path};
  const body = dbRows([raw])[0] || {};
  const sc = body.scenario;
  if(!sc) return {err:"that row carries no project \u2014 it has [" +
    Object.keys(body).join(", ") + "]"};
  return scenLoad(typeof sc === "string" ? sc : JSON.stringify(sc));
}

/* WHAT THE EXAMPLES ARE: SLOTS, NOT COPIES.

   Opening one used to append a scenario every time, so a reader who looked
   twice had two and a reader who looked ten times had ten. A scenario the page
   built from a file beside it carries that file in `src`, and opening it again
   switches to the slot rather than making another -- as it stands, including
   anything the reader did in it, because a scenario somebody worked in is
   theirs and not the page's to overwrite. Deleting it from the menu is how you
   get a pristine one back.

   The example's own name is kept and marked, so the menu reads
   "Purpose x property rights (example)" and a reader can see at a glance which
   of their scenarios are theirs. */
async function scenOpenFile(file){
  const slot = scen.list.find(x => x.src === file);
  const cur = scenCur();
  if(cur) cur.snap = snapNow();                 // never leave without saving
  if(slot){
    scen.active = slot.id; scenWrite();
    return {id:slot.id, created:false};
  }
  const got = await scenDemo(file);
  if(got.err) return got;
  const id = scenId();
  scen.list.push({id, name:EGNAME[file] || got.o.name || "Example", at:"", eg:true,
                  src:file, snap:got.o.snap});
  scen.active = id; scenWrite();
  return {id, created:true, o:got.o, warn:got.warn};
}
/* THE DEMONSTRATION, OPENED BECAUSE NOBODY ASKED FOR ANYTHING ELSE.

   Not scenOpenFile: that saves the current project and switches to the new
   one as its first act, and the check that the reader has not meanwhile
   pressed `New project` has to come BEFORE either. Opening through it put
   the demonstration's slot in place, returned without applying it because
   the wheel had been taken, and left the empty state saved over the slot --
   so pressing the demonstration afterwards opened an empty one.

   The fetch is pure and can race freely; everything below it mutates and
   runs only if the reader has not acted. */
async function scenOpenDefault(file){
  const got = await scenDemo(file);
  if(got.err || scenHasWheel()) return null;
  const cur = scenCur();
  if(cur) cur.snap = snapNow();
  const id = scenId();
  scen.list.push({id, name:EGNAME[file] || got.o.name || "Example", at:"", eg:true,
                  src:file, snap:got.o.snap});
  scen.active = id; scenWrite();
  return got;
}

/* A SANDBOX FOR A GUIDED TOUR.
   ==========================================================================

   Everything during a tour is sandboxed. Starting one by pressing the
   Purpose project's own button would replace whatever is open; and since the stops hand the
   reader controls to press, and the engine puts back what a stop changed, a
   tour also WRITES. Both of those are fine against a copy and not against
   somebody's work.

   So a tour opens the Purpose project as a project of its own, named for what
   it is, and remembers which project the reader came from. Leaving switches
   back and deletes the copy; a second tour in a row reuses it. The copy is a
   project like any other while it exists, so nothing else on the page needs
   to know about it. */
const TOURNAME = "Purpose and property rights (tour)";
let TOURFROM = "";
async function scenTourOpen(file){
  const cur = scenCur();
  if(cur && cur.name !== TOURNAME) TOURFROM = cur.id;
  const had = scen.list.find(x => x.name === TOURNAME);
  if(had){ scenGo(had.id); return {id:had.id, created:false}; }
  if(cur) cur.snap = snapNow();
  const got = await scenDemo(file);
  if(got.err) return got;
  const id = scenId();
  scen.list.push({id, name:TOURNAME, at:"", eg:true, src:file, snap:got.o.snap});
  scen.active = id; scenWrite();
  snapApply(got.o.snap);
  renderScen(); renderPanel(); renderTrack(lastView); refresh();
  draw(); chint();
  return {id, created:true, o:got.o};
}
/* What the reader was in before the tour, if the copy is still open and they
   were somewhere else. The card's last button offers it by name. */
function scenTourBack(){
  const cur = scenCur();
  if(!cur || cur.name !== TOURNAME) return null;
  const back = scen.list.find(x => x.id === TOURFROM && x.id !== cur.id);
  return back ? {id:back.id, name:back.name} : null;
}
/* Switching back and dropping the copy, which is one act: a tour project left
   in the menu is a project nobody made. */
function scenTourClose(){
  const cur = scenCur();
  if(!cur || cur.name !== TOURNAME) return false;
  const back = scenTourBack();
  const drop = cur.id;
  if(back) scenGo(back.id);
  const i = scen.list.findIndex(x => x.id === drop);
  if(i >= 0 && scen.list.length > 1){ scen.list.splice(i, 1); scenWrite(); }
  /* ALWAYS REDRAWN, because scenGo drew the menu BEFORE the copy came out of
     the list: the reader was switched back correctly and the menu still
     offered them a project that no longer existed. */
  renderScen();
  if(!back){ renderPanel(); renderTrack(lastView); refresh(); }
  TOURFROM = "";
  return true;
}

/* Whether what is open came from a file beside the page rather than from the
   reader's own work, and which file. */
const scenFrom = () => (scenCur() || {}).src || "";

/* Whether anything was ever declared in a stored snapshot. Deliberately about
   DECLARATIONS and not about settings: a filter somebody moved and left is not
   work, and an arithmetic, a typed quantity, a hand-added construct, a merge
   or a retained finding is. */
const scenDeclares = s => !!(s && (s.arith || (s.vtype || []).length ||
  (s.mcon || []).length || (s.decided || []).length ||
  (((s.added || {}).papers) || []).length ||
  ((s.board || {}).rows || []).length));

/* A SCENARIO IS REMOVED ONLY WHERE REMOVING IT CANNOT LOSE ANYTHING.

   Two rules, both narrow on purpose, because this runs on load over somebody
   else's browser store. The page's own second seed goes when nothing was ever
   declared in it, by the exact name the page gave it. And two copies of one
   EXAMPLE carrying the same declarations collapse into one, because a menu of
   four rows with one name in it costs a reader something and the fourth row
   holds nothing the first does not. Anything a reader made, named or worked in
   is left alone; the menu's Delete is how that goes. */
const scenSig = s => JSON.stringify([
  ((s && s.arith && s.arith.lines) || []).length, ((s && s.vtype) || []).length,
  (((s && s.board) || {}).rows || []).length, ((s && s.decided) || []).length,
  ((s && s.groups) || []).length, ((s && s.spec) || []).length]);
const scenMade = x => !!x.src || / \((demo|example)\)$/.test(x.name || "");

function scenPrune(){
  const was = scen.list.length;
  /* A ONE-TIME ADOPTION, BEFORE ANYTHING IS REMOVED. Copies made before the
     examples became slots carry no `src`, and the page named each of them
     "<the file's own name> (demo)". Left alone they are invisible to the
     toggle, which would open a second copy of the same example beside each
     one -- so they are adopted by the only thing they carry, their name, and
     only where no slot for that file exists yet. Whatever a reader did in one
     stays in it: this renames and marks, it does not replace. */
  for(const [name, file] of [["Purpose \u00d7 property rights (demo)", DEMO_FILE],
                             ["Purpose, two channels (demo)", MODEL_FILE]]){
    /* EVERY ONE OF THEM, not the first: a reader who pressed the button twice
       has two, and marking one leaves the other keyed by its name while the
       marked one is keyed by its file, so the rule below cannot see that they
       are the same thing. Marked, they collapse if they carry the same
       declarations and both stay if they do not. */
    for(const x of scen.list)
      if(!x.src && x.name === name){
        x.src = file; x.name = name.replace(" (demo)", " (example)");
      }
  }
  scen.list = scen.list.filter(x =>
    !(x.name === SEED_DROPPED && x.id !== scen.active && !scenDeclares(x.snap)));
  const seen = new Set();
  scen.list = scen.list.filter(x => {
    if(!scenMade(x)) return true;               // not the page's to collapse
    const k = (x.src || x.name) + "\u0000" + scenSig(x.snap);
    if(x.id === scen.active || !seen.has(k)){ seen.add(k); return true; }
    return false;
  });
  if(!scen.list.length) return 0;               // nothing to prune into nothing
  if(!scen.list.some(x => x.id === scen.active)) scen.active = scen.list[0].id;
  const gone = was - scen.list.length;
  if(gone) scenWrite();
  return gone;
}

const SCEN_KEY = "purposeScenarios";
let scen = {active:"", list:[]};
let scenHold = false;              // true while a switch is being applied

const scenId = () => "s" + Date.now().toString(36) +
  Math.floor(Math.random() * 1296).toString(36);

function snapNow(){
  return {
    stage:state.stage,
    jr:[...state.jr], ap:state.ap, minp:state.minp,
    tight:state.tight, collapse:state.collapse,
    ev:state.ev, sgn:state.sgn, core:state.core, hideIso:state.hideIso,
    bar:{...state.bar}, need:JSON.parse(JSON.stringify(state.need)),
    apply:{...state.apply}, matter:state.matter, msel:[...state.msel],
    admit:[...state.admit],
    /* The layout travels with the axes, because it is part of what the map
       shows: a scenario saved in Network and reopened on Axes is a different
       picture of the same model. */
    xAxis:state.xAxis, yAxis:state.yAxis, layout:state.layout, cBy:state.cBy, sBy:state.sBy,
    /* The clustering: which construct, what counts as a tie, the resolution,
       every name and every move, and the members as computed -- so a reader
       who opens this gets the same clusters, and can see what a name was
       about before anything is recomputed. */
    com: typeof comSnap === "function" ? comSnap() : null,
    groups:[...groups.values()].map(g => ({...g, members:[...g.members]})),
    dropped:{c:[...dropped.c], k:[...dropped.k]},
    apart:[...apart],
    decided:[...decided.values()],
    // a declared domain is a decision, so it travels with the scenario
    spec:[...spec.entries()],
    // and so is a quantity typed, or a construct and a claim added by hand:
    // switching scenario without them left step 3.1's declarations behind
    vtype:[...vtype.values()], mcon:[...mcon.values()], mclm:[...mclm.values()],
    added:corpusSnap(),
    /* EVERY LITERATURE, each with its own payload and its own block-1
       decisions. The one that ships carries no payload here: it is in
       graph-data.js, which every reader loads. */
    lits:litSnap(),
    /* The notebook is an ORDER somebody chose over things already derived,
       which makes it a decision and not a view: it travels. */
    notebook:nbSnap(),
    /* The deposit's five declarations: what leaves, on what terms, at what
       address. Decisions, so they travel. */
    deposit:depSnap(),
    compo:[...compo.values()], xinv:[...xinv.values()], arith:ARITH.kept,
    xtest:[...xtest.values()], xfam:[...xfam.values()],
    hops:state.hops, solid:state.solid, comp:[...state.comp],
    /* The last four steps make decisions too, and they were being left
       behind: a scenario that carries the declarations but not what was
       RETAINED from them hands on half a round. The workspace's own lines
       stay out on purpose -- they are a working surface, overwritten by the
       next attempt -- but the board is not a working surface. */
    /* Guarded for the same reason the reader is: this runs at load, and all
       four of these live in scripts that load after this one. A snapshot
       taken before they exist simply leaves them out, which is what a
       snapshot of a page that has not finished loading should do. */
    board: typeof BOARD === "undefined" ? null : {rows:BOARD.rows, seq:BOARD.seq},
    guess: typeof GUESS === "undefined" ? null : {...GUESS},
    sim: typeof SIM === "undefined" ? null
      : {m:SIM.m, crit:SIM.crit, form:SIM.form, out:SIM.out, at:SIM.at},
    exp: typeof EXP === "undefined" ? null
      : {set:EXP.set, n:EXP.n, seed:EXP.seed, pick:EXP.pick, why:EXP.why, name:EXP.name},
    folders: typeof WS === "undefined" ? null : WS.own,
    /* ANOTHER SCHOLAR'S MODEL, held beside this one. Reading one in and
       placing its declarations against this corpus is work; so is every
       adoption, and which of them were adopted is on the record here. */
    models: typeof impSnap === "undefined" ? null : impSnap()
  };
}

function snapApply(sn){
  if(!sn) return;
  /* APPLYING A SNAPSHOT IS GOING INTO A PROJECT, whoever asked for it: the
     start page's buttons, the Menu, a tour, a test driving the page. The
     start page used to get out of the way on its own, because homeOn() hides
     it once there is work to go back to and opening a project is work. A
     first arrival now pins it OPEN over the demonstration loaded behind it,
     and a pin stays pinned -- so the one act that always means "I am going
     into this project" has to let it go. */
  wayOut();
  scenHold = true;
  const wasG = [...groups.keys()], wasD = [...decided.keys()];
  state.stage = sn.stage || 1;
  state.jr = new Set(sn.jr || JALL); state.ap = sn.ap || "all";
  state.minp = sn.minp ?? 2;
  state.tight = sn.tight ?? 0.15; state.collapse = !!sn.collapse;
  state.ev = sn.ev || "all"; state.sgn = sn.sgn || "all";
  state.core = !!sn.core; state.hideIso = sn.hideIso !== false;
  state.bar = Object.assign({Comm:0, Spec:0, Evid:0}, sn.bar);
  state.need = Object.assign({Comm:{}, Spec:{}, Evid:{}}, sn.need);
  /* TWO VALUES, AND A THIRD ONE WAS GETTING THROUGH. A bar either fades what
     fails it or filters it out, and the stored words are `dim` and `filter`.
     The demonstration that ships with the page carries `Evid: "hide"` -- the
     word the BUTTON is labelled with and not the one the page stores -- and
     because every reader of this setting asks `!== "filter"`, an unknown value
     has always been read as the weaker action. So the Evidence bar in the
     worked example has never filtered anything, silently, and the numbers it
     reports were produced that way.

     Refused rather than guessed at, and the default stands: translating it to
     `filter` would change what the demonstration shows and what every count
     recorded against it means. What was wrong was that nothing said so. */
  const APPLYV = ["dim", "filter"];
  const ap = Object.assign({}, sn.apply || {});
  const odd = Object.keys(ap).filter(k => ap[k] && !APPLYV.includes(ap[k]));
  for(const k of odd) delete ap[k];
  state.apply = Object.assign({Comm:"dim", Spec:"dim", Evid:"dim"}, ap);
  if(odd.length) noteFail("scenario.apply",
    new Error(odd.length + " bar(s) carried a value this page does not use (" +
      odd.map(k => k + "=" + (sn.apply || {})[k]).join(", ") +
      "); a bar either fades what fails it (dim) or filters it out (filter), so " +
      "the default stands and nothing was guessed at"));
  state.matter = sn.matter || 0;
  state.msel = new Set(sn.msel || []);
  state.admit = new Set(sn.admit || []);

  ["xAxis","yAxis","layout","cBy","sBy"].forEach(k => { if(sn[k]) state[k] = sn[k]; });
  comLoad(sn);
  groups.clear(); (sn.groups || []).forEach(g => groups.set(g.id, {...g, members:[...g.members]}));
  dropped.c = new Set((sn.dropped || {}).c || []);
  dropped.k = new Set((sn.dropped || {}).k || []);
  apart.clear(); (sn.apart || []).forEach(k => apart.add(k));
  decided.clear(); (sn.decided || []).forEach(d => decided.set(d.key, d));
  spec.clear(); (sn.spec || []).forEach(([k, v]) => spec.set(k, v));
  vtype.clear(); (sn.vtype || []).forEach(x => vtype.set(x.id, x));
  compo.clear(); (sn.compo || []).forEach(x => compo.set(x.id, x)); csaveLocal2();
  xinv.clear(); (sn.xinv || []).forEach(x => xinv.set(x.id, x)); xsaveLocal();
  ARITH.kept = sn.arith || null; ARITH.prop = null; asaveLocal();
  xtest.clear(); (sn.xtest || []).forEach(x => xtest.set(x.id, x)); tsaveLocal();
  xfam.clear(); (sn.xfam || []).forEach(f => xfam.set(f.fam, f)); famSave();
  CT.rows = null; CT.err = "";
  mcon.clear(); (sn.mcon || []).forEach(x => mcon.set(x.id, x));
  /* THE LITERATURES FIRST, because taking one installs its payload and its
     decisions, and the corpus overlay below belongs to whichever is active. */
  litTake(sn.lits || null);
  impTake(sn.models || null);
  corpusTake(sn.added || null);
  nbTake(sn.notebook || null);
  depTake(sn.deposit || null);
  mclm.clear(); (sn.mclm || []).forEach(x => mclm.set(x.id, x));
  vsaveLocal(); msaveLocal();
  state.hops = sn.hops ?? 1; state.solid = sn.solid || "estimated";
  state.comp = new Set(sn.comp || []);
  /* The four that used to be left behind. Each is absent from a scenario
     written before they travelled, so each one falls back to what it was
     rather than to nothing. */
  /* These four live in scripts that load AFTER this one, and this function
     runs at load to restore the active scenario. Naming one of them
     unguarded killed this file from here down, and only the page walk's
     load watch caught it, after it had been live for several commits. */
  if(sn.board && typeof BOARD !== "undefined"){
    BOARD.rows = (sn.board.rows || []).slice(); BOARD.seq = sn.board.seq || 0; }
  if(sn.guess && typeof GUESS !== "undefined"){
    for(const k of Object.keys(GUESS)) delete GUESS[k]; Object.assign(GUESS, sn.guess); }
  if((sn.board || sn.guess) && typeof boardSave === "function") boardSave();
  if(sn.sim && typeof SIM !== "undefined"){
    SIM.m = sn.sim.m || "word"; SIM.crit = sn.sim.crit || "";
    SIM.form = sn.sim.form || "word"; SIM.out = sn.sim.out || null;
    SIM.at = sn.sim.at || ""; simForget(); simSave(); }
  /* EXP moved into core/expset.js, which loads before this file, so the guard
     on EXP stopped guarding and the call below -- which is still in a later
     page script -- started throwing at load. The page walk's load watch caught
     it the same hour. Guarded on what is actually being called now, which is
     the pattern the two lines above already use; every guard of this kind goes
     when boot() exists and nothing in this file runs during load. */
  if(sn.exp && typeof EXP !== "undefined"){
    EXP.set = sn.exp.set || "written"; EXP.n = sn.exp.n || 24;
    EXP.seed = sn.exp.seed ?? 7; EXP.pick = sn.exp.pick || {};
    EXP.why = sn.exp.why || ""; EXP.name = sn.exp.name || "";
    if(typeof expSave === "function") expSave(); }
  if(Array.isArray(sn.folders) && typeof WS !== "undefined"){
    WS.own = sn.folders.slice(); wsSave(); }
  csaveLocal(); gsaveLocal(); dsaveLocal(); asave(); ssaveLocal(); compSave();
  /* The derivation is a function of the declarations, so a scenario that
     carries kept arithmetic and shows "nothing derived yet" is telling the
     reader something false about itself. The workspace's lines stay out of
     the file on purpose -- they are a working surface -- so they are
     recomputed here instead, which takes about as long as pressing Derive. */
  if(sn.arith && typeof deriveProps === "function" && typeof bufSeed === "function"){
    /* After the caller has rebuilt the view, not during this function: the
       derivation reads the carried relations, and halfway through applying a
       snapshot those are still the last scenario's. Derived here directly, it
       came back with half the propositions. */
    setTimeout(() => {
      /* computation inside a render: the derivation is recomputed because a
         scenario that carries kept arithmetic and shows nothing derived is
         telling the reader something false about itself. A model that will
         not derive is step 3.2's own news and that step says so on its rows;
         recorded here as well, because this restore happens off-screen. */
      try{ deriveProps(); bufSeed();
        if(typeof renderPanel === "function") renderPanel();
      }catch(e){ noteFail("deriving the scenario that was just loaded", e); }
    }, 0);
  }
  /* AND A SNAPSHOT WITH NO ARITHMETIC EMPTIES THE WORKSPACE. The branch above
     reseeds the lines from the derivation whenever a scenario carries a kept
     arithmetic; nothing emptied them when one did not, so the lines stayed
     from whatever was open before. Invisible while the page booted with no
     arithmetic anywhere -- there was never anything to leak -- and wrong as
     soon as it booted into the demonstration: a new project opened showing
     thirteen signed lines of a model it did not have. */
  else if(BUF && Array.isArray(BUF.lines)){
    BUF.lines.length = 0; BUF.sel = ""; BUF.err = ""; BUF.hand = ""; BUF.imp = "";
    /* And the derivation they came from. A project with no arithmetic has
       derived nothing, and leaving PROPS.out standing had step 3.2 offering
       to "Derive again" over a model that was not there. */
    if(PROPS){ PROPS.out = null; PROPS.err = ""; PROPS.at = ""; PROPS.impres = null; }
  }
  scenHold = false;
  scenMirror(wasG, wasD);
}

/* The three stores each keep their own copy, and one of them may be a shared
   document rather than this browser. A switch has to reach those too, or the
   next snapshot from the server would put the other scenario back. */
async function scenMirror(wasG, wasD){
  try{
    for(const id of wasG) if(!groups.has(id) && gdb)
      try{ await gdb.doc("groups/" + id).delete(); }
      catch(e){ noteFail("deleting groups/" + id, e); }          // persistence
    for(const g of groups.values()) await gpersist(g);
    for(const k of wasD) if(!decided.has(k) && ddb)
      try{ await ddb.doc("decisions/" + encodeURIComponent(k)).delete(); }
      catch(e){ noteFail("deleting decisions/" + k, e); }        // persistence
    for(const d of decided.values()) await dpersist(d);
    await cpersist();
  }catch(e){ noteFail("clearing the last scenario from the store", e); }  // persistence
}

function scenWrite(){ lsWrite(SCEN_KEY, scen); }
function scenRead(){
  const v = lsRead(SCEN_KEY);
  if(v && Array.isArray(v.list) && v.list.length){ scen = v; return true; }
  return false;
}
const scenCur = () => scen.list.find(x => x.id === scen.active) || null;

/* ------------------------------------------------------------- the history

   A scenario is where you are. The history is how you got there, and it exists
   because the last three steps are a loop and not a line: you declare, run,
   read what broke, and come back to the declaration that broke it. Without a
   record of the state you came back FROM, "come back" means "remember".

   Every change that bears on a decision is kept, with a line saying what moved.
   View state is excluded deliberately -- a fold, a filter, a scroll position
   and the step you are standing on are not decisions, and a history that kept
   them would bury the ones that are. */
const HIST_KEY = "purposeHistory";
const HIST_MAX = 25;
let hist = [], histOpen = false;
const VIEWKEYS = ["stage", "cq", "xAxis", "yAxis", "layout", "cBy", "sBy"];
const histSig = sn => JSON.stringify(Object.keys(sn).sort()
  .filter(k => !VIEWKEYS.includes(k)).map(k => [k, sn[k]]));
// counts, for saying what moved; scalars are reported as a new value
const HCOUNT = {
  "merges": sn => (sn.groups || []).length,
  "constructs dropped": sn => ((sn.dropped || {}).c || []).length,
  "relationships dropped": sn => ((sn.dropped || {}).k || []).length,
  "declarations": sn => (sn.spec || []).length,
  "quantities typed": sn => (sn.vtype || []).length,
  "model relations carried": sn => (sn.msel || []).length,
  "composed relations": sn => (sn.comp || []).length,
  "constructs by hand": sn => (sn.mcon || []).length,
  "papers added": sn => ((sn.added || {}).papers || []).length,
  "relationships by hand": sn => (sn.mclm || []).length,
  "decisions answered": sn => (sn.decided || []).length,
  "journals": sn => (sn.jr || []).length,
};
const HSCALAR = {
  "occurrence threshold": sn => sn.minp,
  "tightness": sn => sn.tight,
  "difference that matters": sn => sn.matter,
  "evidence filter": sn => sn.ev,
  "sign filter": sn => sn.sgn,
  "links a chain may use": sn => sn.hops,
  "solidity": sn => sn.solid,
};
function histLabel(prev, now){
  if(!prev) return "opened here";
  const out = [];
  for(const k of Object.keys(HCOUNT)){
    const d = HCOUNT[k](now) - HCOUNT[k](prev);
    if(d) out.push(`${k} ${d > 0 ? "+" : ""}${d}`);
  }
  for(const k of Object.keys(HSCALAR)){
    const a = HSCALAR[k](prev), b = HSCALAR[k](now);
    if(a !== b) out.push(`${k} \u2192 ${b}`);
  }
  return out.length ? out.slice(0, 3).join(" \u00b7 ") +
    (out.length > 3 ? ` \u00b7 +${out.length - 3} more` : "") : "a setting moved";
}
function hsave(){
  if(lsWrite(HIST_KEY, hist)) return;
  /* a full store drops the oldest rather than losing the newest */
  hist = hist.slice(-Math.max(5, Math.floor(hist.length / 2)));
  lsWrite(HIST_KEY, hist);
}
function hload(){ hist = lsRead(HIST_KEY) || []; }
/* Called on the same beat as the autosave. A snapshot is pushed only when the
   signature has actually moved, so holding a slider writes one entry and not
   forty. */
function histPush(sn){
  const sig = histSig(sn);
  const last = hist[hist.length - 1];
  if(last && last.sig === sig) return;
  const cur = (typeof scenCur === "function" ? scenCur() : null) || {};
  hist.push({id:"h" + Date.now().toString(36), sig, snap:sn,
    at:new Date().toISOString().slice(0, 16).replace("T", " "),
    scen:cur.name || "", step:sn.stage || 1,
    label:histLabel(last && last.snap, sn)});
  if(hist.length > HIST_MAX) hist = hist.slice(-HIST_MAX);
  hsave();
  if(histOpen) renderHist();
}

function renderHist(){
  const box = document.getElementById("histbox");
  if(!box) return;
  box.hidden = !histOpen;
  if(!histOpen) return;
  const rows = [...hist].reverse();
  box.innerHTML = `<p class="why fold" style="margin:0 0 9px"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Every change that bears on a decision,
      newest first. <b>Fork</b> starts a new project from that point and leaves this one where
      it is \u2014 which is how a second round is begun without losing the first. Folds, filters
      and the step you are standing on are not decisions and are not kept.</span></p>
    <div class="chain">${rows.length ? rows.map((h, i) => `<div class="crow hrow">
      <span class="cst ${i === 0 ? "ok" : "part"}">step ${stepNo(h.step)}</span>
      <span class="cnm">${hesc(h.label)}<span class="cfl">${hesc(h.at)}${
        h.scen ? " \u00b7 " + hesc(h.scen) : ""}</span></span>
      <button type="button" class="edbtn" data-fork="${h.id}">Fork</button>
    </div>`).join("")
      : `<p class="empty">Nothing yet. The first decision you make writes the first entry.</p>`}</div>`;
  box.querySelectorAll("[data-fork]").forEach(b =>
    b.addEventListener("click", () => histFork(b.dataset.fork)));
}

/* Forking leaves the scenario you are in exactly as it is. That is the point:
   a round you have come back from is still there to compare against. */
function histFork(id){
  const h = hist.find(x => x.id === id);
  if(!h) return;
  const nm = prompt("Name the project this point starts.",
    `From ${h.at} \u2014 ${h.label}`.slice(0, 60));
  if(!nm) return;
  const cur = scenCur(); if(cur) cur.snap = snapNow();
  const sid = scenId();
  scen.list.push({id:sid, name:nm.trim(), at:"", snap:JSON.parse(JSON.stringify(h.snap))});
  scenGo(sid);
  histOpen = false; renderHist();
}

let scenTimer = 0;
function scenTouch(){
  if(scenHold) return;
  const cur = scenCur(); if(!cur) return;
  clearTimeout(scenTimer);
  scenTimer = setTimeout(() => {
    cur.snap = snapNow(); cur.at = new Date().toISOString().slice(0, 16).replace("T", " ");
    scenWrite();
    histPush(cur.snap);
  }, 250);
}

function scenGo(id){
  const cur = scenCur();
  if(cur) cur.snap = snapNow();            // never leave without saving
  scen.active = id;
  scenWrite();
  snapApply((scenCur() || {}).snap);
  renderScen(); renderPanel(); renderTrack(lastView); refresh();
  draw(); chint();
}

/* THE SCENARIOS, AS A TICKED LIST AT THE FOOT OF THE MENU.
   -------------------------------------------------------------------------
   This was a <select> beside the menu plus a toggle beside that: three
   controls for one idea, on the row that also carries the chain. A window
   menu lists its windows at the end with a tick beside the one you are in,
   and a scenario is exactly that -- the workbench you are looking at.

   Demonstrations are kept apart under their own heading, because "which of
   these did I make" is the first question the list has to answer. */
function renderScen(){
  const box = document.getElementById("scenList");
  if(!box) return;
  const row = x => `<button type="button" class="tabbtn scenpick${
      x.id === scen.active ? " on" : ""}" data-scen="${hesc(x.id)}"${
      x.src ? ` data-from="${hesc(x.src)}"` : ""}${
      x.id === scen.active ? ' aria-current="true"' : ""}><span class="tick" aria-hidden="true">${
      x.id === scen.active ? "\u2713" : ""}</span><span class="scennm">${hesc(x.name)}</span>${
      x.at ? `<i>${hesc(x.at)}</i>` : ""}</button>`;
  const egs = scen.list.filter(x => x.eg), mine = scen.list.filter(x => !x.eg);
  box.innerHTML = mine.map(row).join("") +
    (egs.length ? `<span class="menuhd sub">Demonstrations</span>${egs.map(row).join("")}` : "");
  box.querySelectorAll("[data-scen]").forEach(b =>
    b.addEventListener("click", ev => {
      ev.preventDefault();
      if(b.dataset.scen !== scen.active) scenGo(b.dataset.scen);
      const m = document.getElementById("scenMenu"); if(m) m.open = false;
    }));
  const d = document.getElementById("scenDrop");
  if(d) d.disabled = scen.list.length < 2;
}

const snapBase = () => ({
  stage:1, ap:"all", minp:2, tight:0.15,
  groups:[], dropped:{c:[], k:[]}, apart:[], decided:[], spec:[],
  vtype:[], mcon:[], mclm:[], compo:[], xinv:[], xtest:[], xfam:[],
  msel:[], admit:[], comp:[], arith:null,
  board:{rows:[], seq:0}, guess:{}, sim:null, lits:null, added:null,
});
/* EVERY OUTLET IN THE FRAME TICKED -- and which frame that is has to survive
   being asked from an empty project. `snapBlank` reads G at call time, so
   once `New project` could leave G with no journals in it, a blank snapshot
   taken from there ticked nothing and applied over the shipped corpus that
   snapApply then put back: fifty-two papers loaded and none in scope. The
   shipped frame is the fallback because it is the corpus snapApply installs
   when a snapshot names no literature of its own. */
const snapBlank = () => {
  const js = (G.journals || []).length
    ? G.journals : ((corpusShipped() || {}).journals || []);
  return {...snapBase(), jr:js.map(j => j.f)};
};
const snapEmpty = () => ({...snapBase(), jr:[]});

/* THE START PAGE'S OWN WAY IN. Applied through snapApply, which is the one
   path that replaces every store, so nothing a previous project declared can
   survive into a project that is meant to hold nothing. No prompt and no new
   slot in the menu: this is the workbench cleared, and naming a project is
   something the menu does when there is something worth naming. */
const NEWNAME = "New project";
function projectEmpty(){
  scenTookWheel();
  /* A PROJECT OF ITS OWN, and it has to be. `New project` used to be "this
     one, with the start page out of the way", which was harmless while the
     project it was standing on was the seed with nothing in it. It is not
     harmless now that the demonstration is what a first arrival opens: the
     demonstration stayed the active project, the empty workbench was drawn
     over it, and the next thing to save the active project -- the auto-save
     on refresh, or pressing the demonstration's own button, which saves
     before it switches -- wrote the empty state into the demonstration's
     slot. Pressing `Purpose and property rights` then opened an empty one.

     So the project being left keeps its work, and the empty workbench gets a
     slot to be empty in. One slot, reused: pressing this twice is one new
     project and not a store filling with empties. */
  const cur = scenCur();
  if(cur) cur.snap = snapNow();
  let slot = scen.list.find(x => !x.eg && x.name === NEWNAME);
  if(!slot){ slot = {id:scenId(), name:NEWNAME, at:"", snap:snapEmpty()};
             scen.list.push(slot); }
  slot.snap = snapEmpty();
  scen.active = slot.id;
  scenWrite();
  snapApply(snapEmpty());
  /* AND THE CORPUS ITSELF, after snapApply rather than before: snapApply runs
     litTake, which installs the shipped base, so swapping first would be
     undone a line later. Everything the page draws that is not a decision is
     derived from G -- the outlet list and its counts, the traditions, the
     papers, the arrows a join offers, the propositions a finding could be
     made of -- so emptying G is what empties all of them at once, and there
     is nothing else to clear one list at a time. */
  corpusBaseEmpty();
  renderScen();
}

function wireScen(){
  const hb = document.getElementById("histBtn");
  if(hb) hb.addEventListener("click", () => {
    histOpen = !histOpen;
    hb.setAttribute("aria-expanded", String(histOpen));
    renderHist();
  });
  /* NEW AND DUPLICATE ARE TWO THINGS, and one button doing both is a trap.
     A "New scenario" that copies where you were which is what a duplicate is;
     a reader who wanted to start something else got their current curation
     with a new name on it. They are separate now, and the labels say which is
     which. New project could start with no literature at all; today it starts
     with the shipped one and nothing decided, which is
     what the start page's own button has always done. */
  /* TWO WAYS TO START, and they are not the same project.

     `snapBlank` is the shipped literature in full view with no choice made on
     it: twelve outlets ticked, nothing merged, nothing declared. It is what
     the menu's New project has always made, and it is the right start for
     somebody who wants to curate THIS corpus their own way.

     `snapEmpty` is a project with no literature at all. The only difference
     is `jr`, and it is the whole difference: with no outlet ticked no paper
     is in scope, so step 1.1 draws nothing and the scholar's first act is to
     say which literature this is about -- by ticking outlets, importing a
     search export, or reading in an AMG somebody else built. That is what the
     start page's New project means, and it used to mean the other thing. */
  /* Both live at module scope, below, because the start page reaches one of
     them and this function is not exported. */
  const copyNow = (label, dflt) => {
    const nm = prompt(label, dflt);
    if(!nm) return null;
    const cur = scenCur(); if(cur) cur.snap = snapNow();
    const id = scenId();
    scen.list.push({id, name:nm.trim(), at:"", snap:snapNow()});
    scenGo(id);
    return id;
  };
  const nb = document.getElementById("scenNew");
  if(nb) nb.addEventListener("click", () => {
    const nm = prompt("Name the project. It starts with nothing decided.",
      "Project " + (scen.list.length + 1));
    if(!nm) return;
    const cur = scenCur(); if(cur) cur.snap = snapNow();
    const id = scenId();
    scen.list.push({id, name:nm.trim(), at:"", snap:snapBlank()});
    scenGo(id);
  });
  const cb = document.getElementById("scenCopy");
  if(cb) cb.addEventListener("click", () => {
    const cur = scenCur();
    copyNow("Name the copy. It starts from where you are now.",
      "Copy of " + ((cur && cur.name) || "this project"));
  });
  const rb = document.getElementById("scenName");
  if(rb) rb.addEventListener("click", () => {
    const cur = scenCur(); if(!cur) return;
    const nm = prompt("Rename this project", cur.name);
    if(!nm) return;
    cur.name = nm.trim(); scenWrite(); renderScen();
  });
  const db2 = document.getElementById("scenDrop");
  if(db2) db2.addEventListener("click", () => {
    const cur = scenCur();
    if(!cur || scen.list.length < 2) return;
    if(!confirm(`Delete "${cur.name}"? Every choice recorded in it goes with it.`)) return;
    scen.list = scen.list.filter(x => x.id !== cur.id);
    scenGo(scen.list[0].id);
  });
}

/* The constructs the model's variables are bound to, as far as this corpus
   draws them. Computed rather than listed: if a binding stops resolving the
   scenario shrinks where you can see it. */
function boundOnMap(){
  const have = new Set(G.nodes.map(n => n.i));
  const out = new Set();
  Object.values(MR.bindings || {}).forEach(b =>
    (b.ids || []).forEach(i => { if(have.has(i)) out.add(i); }));
  return out;
}

/* ONE SEEDED SCENARIO, WHICH IS THE READER'S OWN WORKBENCH: the purpose
   literature drawn and nothing declared. There used to be a second, a starting
   point for the two-channel model with its constructs carried and the rest
   dropped, and it cluttered the menu for everybody who never opened it. What
   it was a starting point FOR is now a finished scenario that ships beside the
   page -- demo/purpose-two-channel.amg.json -- so the seed is one again. */
/* A FIRST ARRIVAL, which is the only time the page may choose what is open.
   Anything stored is the reader's and is restored untouched; a fresh browser
   has nothing, and an empty workbench is the worst first impression this page
   can make -- it shows the instrument with no literature in it, which is the
   one state that demonstrates nothing. So a fresh seed is marked, and boot()
   opens the demonstration over it once the first paint is done. */
let SCEN_FRESH = false;
const scenFresh = () => SCEN_FRESH;
function scenSeed(){
  scen.list = [{id:scenId(), name:"Workbench", at:"", snap:snapNow()}];
  scen.active = scen.list[0].id;
  scenWrite();
  SCEN_FRESH = true;
}
/* Read once. A second call must not reopen the demonstration over work the
   reader has started since. */
function scenFreshTake(){ const was = SCEN_FRESH; SCEN_FRESH = false; return was; }
/* AND THE READER CAN GET THERE FIRST. The default demonstration is fetched
   after the first paint, so there is a window -- short, but real on a slow
   line -- in which the page is already usable and the file has not landed.
   A reader who presses `New project` inside that window emptied the corpus
   and then watched the demonstration arrive on top of it. Whoever acts first
   wins, and the reader acting is what sets this. */
let SCEN_WHEEL = false;
const scenTookWheel = () => { SCEN_WHEEL = true; };
const scenHasWheel = () => SCEN_WHEEL;
/* The old second seed, by the name the page gave it, so scenPrune can tell it
   from anything a reader made. */
const SEED_DROPPED = "Stoelhorst & Vishwanathan \u2014 what the model needs";

/* RESTORING THE ACTIVE SCENARIO, from boot() rather than while this file
   loads. `make modules-map` reports 82 of the page's 93 load-time reads
   inside these five lines: snapApply() writes into eighteen stores that six
   other files declare, and on a module page every one of those would be read
   before its file had evaluated. Running it from boot() means every store is
   already restored, which is also what the typeof guards inside snapApply
   were approximating. */
function bootScenario(){
  if(!scenRead()) scenSeed(); else scenPrune();
  wireScen();
  renderScen();
  renderHist();
  snapApply((scenCur() || {}).snap);

  /* Auto-save hangs off refresh, which every control already calls. A hook
     rather than a reassignment: `refresh` belongs to 14-boot.js, and that
     wrapper was the last of the sixteen assignments to a name another file
     declares -- the one an import makes impossible rather than merely
     awkward. */
  onRefresh(scenTouch);
}

export { projectEmpty, snapBlank, scenFresh, scenFreshTake, scenHasWheel, scenOpenDefault, scenTookWheel, BENCH, CORPUS, DEMO_FILE, MODEL_FILE, HCOUNT, scenOpenFile, scenTourOpen, scenTourBack, scenTourClose, TOURNAME, scenFrom, scenPrune, HIST_KEY, HIST_MAX, HSCALAR, PROV, SCEN_COLL, SCEN_DB, SCEN_FORMAT, SCEN_KEY, SCEN_V, VIEWKEYS, bootScenario, boundOnMap, corpusStamp, dbNames, dbRows, hist, histFork, histLabel, histOpen, histPush, histSig, hload, hsave, provTake, renderHist, renderScen, scen, scenCur, scenDemo, scenFile, scenGo, scenHold, scenId, scenLoad, scenMirror, scenPull, scenPullList, scenPush, scenRead, scenSeed, scenStore, scenTimer, scenTouch, scenWrite, snapApply, snapNow, stampLines, wireScen };

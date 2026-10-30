/* AMG bench, page script: more than one literature, each curated on its own.
   One shared global scope, loaded in order. See page/README.md.

   THE CLAIM THIS CLOSES. The procedure is not specific to purpose, and a second
   literature is how that stops being an assertion. Block 1's own description
   has said so from the start -- "Run once for each literature you mean to join:
   a literature that has not been adjudicated cannot be joined with" -- and
   `lit:true` has sat on that block in the data. What was missing was that the
   page had exactly one corpus and one set of decisions over it.

   WHY IT WAS HARD, AND WHAT MADE IT TRACTABLE. Forty-seven places read
   `G.papers`, `G.claims` and `G.nodes` directly, across eight files. Teaching
   every one of them about streams would be forty-seven chances to forget, and
   the kind of split that leaves a feature half-connected. So G is not given a
   stream dimension. G stays ONE corpus and becomes a VIEW:

     in block 1, G is the literature being curated, and nothing else;
     from block 2 on, G is the UNION of every literature's carried parts.

   Which is not a trick. It is the chain's own story: the first three steps run
   once per literature, and the join is where two curated literatures meet. The
   step you are standing on already says which of the two G should be, because
   `blockOf(stage).lit` is the flag, so the switch is read off the data rather
   than invented here.

   WHAT BELONGS TO A LITERATURE AND WHAT BELONGS TO THE SCENARIO. A literature
   owns its payload and its block-1 decisions: the outlet frame, the tradition,
   the threshold and what was admitted under it; the tightness, the merges and
   the pairs forced apart; the three bars and their twelve components; and what
   was dropped. Everything from step 2.1 on -- the quantities, the relations'
   declared classes, the arithmetic, the board -- belongs to the SCENARIO,
   because it is about the joined model and not about any one literature.

   WHERE A SECOND ONE COMES FROM. Three doors, and all three were greyed:
   an empty literature the scholar fills with Add a paper or a search export;
   an `amg-stream` file, which is the format step 4.2 already writes and which
   therefore round-trips; and a scenario written by another bench, read as a
   literature beside the one you are in rather than over it. */
import { G } from "../graph-data.js";
import { JALL, N, lsRead, lsWrite, nRebuild, noteFail, state } from "./03-stores.js";
import { claimKept, nodeInScope, paperInScope } from "../core/curate.js";
import { corpusBaseSet, corpusShipped, corpusSnap, corpusTake } from "./03c-corpus.js";
import { apart, pinApart, unpinApart } from "./16-worklists.js";
import { cpersist, dropped, groups, gsaveLocal } from "./03b-decisions.js";
import { xlog } from "./05-explore.js";

/* The one that ships. Its payload is not kept in the store: it is in
   graph-data.js, which every reader already loads, and a copy in a browser
   store would be 1.6 megabytes of the same thing going stale. */
const MAIN = "purpose";
const LIT = {
  at:MAIN,
  list:new Map(),          // id -> {id, name, base|null, add, dec, at}
  union:false,             // is G the union right now?
  join:{a:"", b:""},       // which two the join on step 2.1 is between
  /* THE DECISIONS THAT SPAN LITERATURES, which belong to no single one of them
     and therefore to the scenario. A merge whose members come from two
     literatures IS the join; a pair forced apart across two is the refusal of
     one. They are harvested out of the union when it comes down, so switching
     back into block 1 does not write one literature's name on a decision about
     two. */
  joins:{groups:[], apart:[]},
};
const LITKEY = "purposeLits";
/* Which literature a construct or a paper came from, filled when the union is
   installed. A side map rather than a field on the record, because stamping one
   would mean copying 1,026 node objects on every switch and breaking identity
   with the by-id map that fifteen files read. */
const LITN = new Map();    // construct id -> literature id
const LITP = new Map();    // paper id -> literature id

const litMain = () => MAIN;
const litNow = () => LIT.at;
const litIs = id => LIT.at === id;
const litHas = id => id === MAIN || LIT.list.has(id);
const litName = id => id === MAIN ? "Purpose"
  : ((LIT.list.get(id) || {}).name || id);
/* Every literature, the one that ships first. A Map keeps insertion order, so
   the order a reader sees is the order they were added. */
const litList = () => [{id:MAIN, name:litName(MAIN), main:true}]
  .concat([...LIT.list.values()].map(x => ({id:x.id, name:x.name, main:false})));
const litCount = () => LIT.list.size + 1;
const litOf = i => LITN.get(i) || "";
const litOfPaper = p => LITP.get(p) || "";

/* ------------------------------------------- the decisions a literature owns */
/* Captured and restored as plain data, by name, so a field nobody listed here
   stays with the scenario rather than following a literature around. Sets and
   Maps are copied out and back in rather than handed over, because the page
   mutates them in place and two literatures sharing one Set would be one
   literature. */
function litDec(){
  return {
    jr:[...state.jr], ap:state.ap, minp:state.minp, admit:[...state.admit],
    tight:state.tight, collapse:state.collapse,
    bar:Object.assign({}, state.bar),
    need:JSON.parse(JSON.stringify(state.need || {})),
    apply:Object.assign({}, state.apply),
    ev:state.ev, sgn:state.sgn, core:state.core, hideIso:state.hideIso,
    groups:[...groups.values()].map(g => Object.assign({}, g,
      {members:(g.members || []).slice()})),
    dropped:{c:[...dropped.c], k:[...dropped.k]},
    apart:[...apart],
  };
}
function litPut(d){
  const o = d || {};
  if(Array.isArray(o.jr)) state.jr = new Set(o.jr);
  if(typeof o.ap === "string") state.ap = o.ap;
  if(isFinite(+o.minp)) state.minp = +o.minp;
  state.admit = new Set(o.admit || []);
  if(isFinite(+o.tight)) state.tight = +o.tight;
  state.collapse = !!o.collapse;
  if(o.bar) state.bar = Object.assign({Comm:0, Spec:0, Evid:0}, o.bar);
  if(o.need) state.need = JSON.parse(JSON.stringify(o.need));
  /* THE SAME TWO VALUES AS EVERYWHERE ELSE. A bar either fades what fails it or
     filters it out, and a third word has got into a payload before now. */
  const ap = {};
  for(const [k, v] of Object.entries(o.apply || {}))
    if(v === "dim" || v === "filter") ap[k] = v;
  state.apply = Object.assign({Comm:"dim", Spec:"dim", Evid:"dim"}, ap);
  if(typeof o.ev === "string") state.ev = o.ev;
  if(typeof o.sgn === "string") state.sgn = o.sgn;
  state.core = !!o.core; state.hideIso = !!o.hideIso;
  groups.clear();
  for(const g of (o.groups || [])) if(g && g.id) groups.set(g.id, g);
  gsaveLocal();
  dropped.c.clear(); dropped.k.clear();
  for(const x of ((o.dropped || {}).c || [])) dropped.c.add(x);
  for(const x of ((o.dropped || {}).k || [])) dropped.k.add(x);
  cpersist();
  for(const k of [...apart]) unpinApart(k);
  for(const k of (o.apart || [])){
    const p = String(k).split("|");
    if(p.length === 2) pinApart(p[0], p[1]);
  }
}

/* ------------------------------------------------------- installing one of them */
/* The active literature's overlays and decisions, written back into its record
   before anything else is installed over them. Called before every switch, and
   before the union, so a reader who curates, joins, and comes back finds their
   own decisions where they left them. */
function litStash(){
  /* NOT WHILE THE UNION STANDS. The decisions in force then are the union's own
     permissive scope plus every literature's merges at once, and writing those
     into whichever literature happened to be active would give it the others'
     merges and a scope nobody set. litHarvest() is what takes the union down. */
  if(LIT.union) return false;
  const r = LIT.list.get(LIT.at);
  if(r){ r.add = corpusSnap(); r.dec = litDec(); r.at = stampDay(); }
  else { MAINREC.add = corpusSnap(); MAINREC.dec = litDec(); }
  litSave();
  return true;
}

/* THE UNION, TAKEN DOWN. Every merge, drop and forced-apart pair made while it
   stood is sorted by WHOSE it is: one whose members all come from one
   literature belongs to that literature, and one that spans two belongs to the
   scenario, because it is about both. Told apart by asking each member which
   literature it came from, which is what the side map is for.

   Without this, a join made at step 2.1 would be written into whichever
   literature was active and would come back as one of its own merges -- a
   decision about two vocabularies, filed under one. */
/* THE PARTITION, WITHOUT WRITING IT. litHarvest() tears the union down and
   files everything; this answers the same question and changes nothing, which
   is what the scenario snapshot needs: a reader who exports while standing on
   step 2.1 -- the likeliest moment, since that is where the join is made --
   would otherwise get a file with the join missing, because the join is in
   `groups` until the union comes down. It was missing, and the test that asked
   for it at the wrong moment is what found it. */
function litPartition(){
  const mine = new Map();
  const put = id => { if(!mine.has(id)) mine.set(id, {groups:[], dropC:[], dropK:[], apart:[]});
    return mine.get(id); };
  const joins = {groups:[], apart:[]};
  const copy = g => Object.assign({}, g, {members:(g.members || []).slice()});
  for(const g of groups.values()){
    const ls = new Set((g.members || []).map(m => LITN.get(m)).filter(Boolean));
    if(ls.size === 1) put([...ls][0]).groups.push(copy(g));
    /* A group whose members span two literatures IS the join. One whose members
       this page cannot place -- every one from a payload no literature claims --
       goes with the joins rather than being dropped: it was somebody's decision
       and losing it silently is worse than filing it imprecisely. */
    else joins.groups.push(copy(g));
  }
  for(const i of dropped.c){ const l = LITN.get(i); if(l) put(l).dropC.push(i); }
  for(const k of dropped.k){ const l = litOfClaim(k); if(l) put(l).dropK.push(k); }
  for(const key of apart){
    const p = String(key).split("|");
    const a = LITN.get(p[0]), b = LITN.get(p[1]);
    if(a && b && a === b) put(a).apart.push(key);
    else joins.apart.push(key);
  }
  return {mine, joins};
}

function litHarvest(){
  if(!LIT.union) return null;
  const {mine, joins} = litPartition();
  for(const [id, v] of mine){
    const rec = id === MAIN ? MAINREC : LIT.list.get(id);
    if(!rec) continue;
    const d = rec.dec || litBlank();
    d.groups = v.groups;
    d.dropped = {c:v.dropC, k:v.dropK};
    d.apart = v.apart;
    rec.dec = d;
  }
  LIT.joins = joins;
  litSave();
  return joins;
}
/* A claim's literature is its paper's. Claim ids are paper-prefixed in this
   corpus and in every stream it writes, but the field is read rather than the
   prefix parsed, because a stream somebody else wrote need not use one. */
function litOfClaim(id){
  for(const c of G.claims) if(c.id === id) return LITP.get(c.p) || "";
  return "";
}
const stampDay = () => new Date().toISOString().slice(0, 10);
/* The shipped literature's own overlays and decisions. It has no record in the
   list because its payload is not stored; this is where the rest of it lives. */
const MAINREC = {add:null, dec:null};

function litApply(id){
  const to = litHas(id) ? id : MAIN;
  if(LIT.union) litHarvest(); else if(to !== LIT.at) litStash();
  LIT.at = to;
  LIT.union = false;
  if(to === MAIN){
    corpusBaseSet(null);
    corpusTake(MAINREC.add || null);
    if(MAINREC.dec) litPut(MAINREC.dec);
  }else{
    const r = LIT.list.get(to);
    corpusBaseSet(r.base);
    corpusTake(r.add || null);
    litPut(r.dec || litBlank());
  }
  LITN.clear(); LITP.clear();
  for(const n of G.nodes) LITN.set(n.i, to);
  for(const p of Object.keys(G.papers)) LITP.set(p, to);
  nRebuild();
  litSave();
  return to;
}
/* What a literature with nothing decided looks like: every outlet it brought in
   the frame, every tradition, and the page's own defaults for the rest. An
   imported literature arrives with its outlets TICKED, unlike a paper imported
   into one -- its own frame is what it was screened on, and re-screening it from
   nothing would discard the decision the file is a record of. */
function litBlank(outlets){
  return {jr:outlets || [], ap:"all", minp:2, admit:[], tight:0.15,
    collapse:false, bar:{Comm:0, Spec:0, Evid:0},
    need:{Comm:{}, Spec:{}, Evid:{}},
    apply:{Comm:"dim", Spec:"dim", Evid:"dim"},
    ev:"all", sgn:"all", core:false, hideIso:false,
    groups:[], dropped:{c:[], k:[]}, apart:[]};
}

/* ------------------------------------------------------------------ the union */
/* FROM BLOCK 2 ON, G IS EVERY LITERATURE AT ONCE, so the join can be what it
   claims to be: one map with both vocabularies on it, and the question of which
   of their constructs are the same construct.

   Only the CARRIED part of each travels. A literature that has not been through
   block 1 has had nothing adjudicated, so joining with it would carry decisions
   nobody made -- which is the rule block 1's own description states, and it is
   enforced here rather than written down: a literature whose decisions are
   untouched contributes nothing and is named as the reason.

   The decisions in force while the union stands are the ACTIVE literature's.
   That is deliberate and it is stated on the step: block 2 onward is not where
   a scope is set, and a union with two scope decisions fighting would make the
   arrows depend on which literature you happened to be standing in. */
/* A literature's decisions as core/curate.js takes them, so the same functions
   that answer "is this paper in scope" for the page answer it here. A
   literature nobody has curated yet gets its own outlets and the page's
   defaults, which is what it would show if you switched into it. */
function litDecOf(id){
  const rec = id === MAIN ? MAINREC : LIT.list.get(id);
  const d = (rec || {}).dec || litBlank(id === MAIN
    ? (corpusShipped().journals || []).map(j => j.f)
    : (((LIT.list.get(id) || {}).base || {}).journals || []).map(j => j.f));
  return {outlets:new Set(d.jr || []), tradition:d.ap || "all",
    minp:d.minp == null ? 2 : +d.minp, admit:new Set(d.admit || []),
    bar:d.bar || {}, need:d.need || {}, apply:d.apply || {}};
}
function litReady(id){
  const d = id === MAIN ? MAINREC.dec : (LIT.list.get(id) || {}).dec;
  if(!d) return id === MAIN;      // the shipped one is curated by its defaults
  return true;
}
function litUnion(){
  if(LIT.union) return null;
  litStash();
  const parts = [];
  for(const x of litList()){
    const r = x.main ? MAINREC : LIT.list.get(x.id);
    const base = x.main ? corpusShipped() : (LIT.list.get(x.id) || {}).base;
    if(!base) continue;
    parts.push({id:x.id, base, add:(r || {}).add || null, ready:litReady(x.id)});
  }
  const papers = {}, nodes = [], claims = [], journals = [], sim = [], meta = [], edges = [];
  const seenN = new Set(), seenJ = new Set();
  LITN.clear(); LITP.clear();
  /* ONLY WHAT EACH LITERATURE DREW. Not its whole payload: a literature's
     threshold decided which of its constructs are in play at all, and carrying
     the rest would put a thousand constructs on the join's map that the
     curation never admitted. So each side is filtered by ITS OWN decisions,
     through the same functions the page uses -- which is what core/curate.js
     taking its decisions as an argument is for.

     The first version carried the payloads whole and let the union's threshold
     stand at one. The join's map then held 664 notions where the two curations
     between them had admitted a fraction of that. */
  const drew = {};
  for(const p of parts){
    const d = litDecOf(p.id);
    const add = p.add || {};
    const ps = Object.assign({}, p.base.papers);
    for(const x of (add.papers || [])) ps[x.id] = x;
    const inP = new Set();
    for(const [id, rec] of Object.entries(ps))
      if(paperInScope(rec, d)) inP.add(id);
    const ok = id => inP.has(id);
    let nn = 0, nc = 0;
    for(const [id, rec] of Object.entries(ps)){
      if(!inP.has(id) || papers[id]) continue;
      papers[id] = rec; LITP.set(id, p.id);
    }
    for(const n of p.base.nodes.concat(add.nodes || [])){
      /* THE STAMP GOES ON BEFORE THE THRESHOLD IS ASKED. Which literature a
         construct came from does not depend on whether that literature's own
         threshold shows it, and stamping only what was in scope lost each
         literature's record of its own decisions: every id in its dropped
         list that its threshold had put out of scope came back unplaced, and
         litPartition() discards what it cannot place. The purpose
         demonstration lost 264 of its 411 drops that way, and they came back
         into scope the next time the union came down. */
      if(!LITN.has(n.i)) LITN.set(n.i, p.id);
      if(seenN.has(n.i) || !nodeInScope(n, d, ok)) continue;
      seenN.add(n.i); nodes.push(n); nn++;
    }
    for(const c of p.base.claims.concat(add.claims || [])){
      if(!inP.has(c.p) || !claimKept(c, d)) continue;
      claims.push(c); nc++;
    }
    /* An outlet travels where a paper IN SCOPE was published in it. A paper
       record carries no id of its own -- the id is the map's key -- and reading
       one off the record left every outlet behind, so the union had no frame
       and nothing in it was in scope. The join's map held two constructs. */
    const jfIn = new Set();
    for(const [id, rec] of Object.entries(ps)) if(inP.has(id) && rec.jf) jfIn.add(rec.jf);
    for(const j of (p.base.journals || []).concat(add.outlets || []))
      if(jfIn.has(j.f) && !seenJ.has(j.f)){ seenJ.add(j.f); journals.push(j); }
    /* An outlet a paper names and the payload's own list does not: carried as
       its own row rather than dropped, or that paper could never be in scope. */
    for(const f of jfIn) if(!seenJ.has(f)){ seenJ.add(f); journals.push({n:f, f, c:0}); }
    for(const s of (p.base.sim || [])) sim.push(s);
    for(const m of (p.base.meta || [])) meta.push(m);
    for(const e of (p.base.edges || [])) edges.push(e);
    drew[p.id] = {papers:inP.size, constructs:nn, claims:nc};
  }
  /* The union is installed as a BASE with no overlays over it, because every
     overlay has already been folded into it above. Taking one here would apply
     one literature's additions to all of them. */
  corpusBaseSet({papers, nodes, claims, journals,
    approaches:corpusShipped().approaches, sim, meta, edges});
  corpusTake(null);
  nRebuild();
  LIT.union = true;
  /* AND A SCOPE THAT ADMITS WHAT EACH LITERATURE CARRIED, which is the whole
     difference between a union the join can work on and one it cannot.

     The first version installed the union's payload and left the ACTIVE
     literature's scope over it, so at step 2.1 a reader saw six constructs out
     of a thousand and thirty-two: the other literature's papers were in
     journals this one's frame did not tick, and its constructs needed two
     papers in a scope that held none of them. Nothing was broken and the join
     had nothing to join.

     So the union's own scope admits everything it holds -- every outlet, every
     tradition, a construct drawn once one paper names it, no bar raised -- and
     what each literature decided NOT to carry stays out, because the dropped
     sets are unioned. Each side has already been adjudicated; re-filtering one
     literature's claims through another's bars would be a decision nobody
     made.

     The tightness and the merges are the exception: tightness is one slider
     over both vocabularies, which is what it has always been, and the merges
     are every literature's own plus the joins made across them. */
  const outlets = journals.map(j => j.f);
  const d = litBlank(outlets);
  d.minp = 1;
  d.tight = state.tight;
  d.collapse = state.collapse;
  const gs = [], dc = [], dk = [], ap = [];
  const admit = [];
  for(const p of parts){
    const r = p.id === MAIN ? MAINREC : LIT.list.get(p.id);
    const dd = (r || {}).dec;
    if(!dd) continue;
    for(const g of (dd.groups || [])) gs.push(g);
    for(const x of ((dd.dropped || {}).c || [])) dc.push(x);
    for(const x of ((dd.dropped || {}).k || [])) dk.push(x);
    for(const x of (dd.apart || [])) ap.push(x);
    for(const x of (dd.admit || [])) admit.push(x);
  }
  d.admit = admit;
  d.groups = gs.concat(LIT.joins.groups || []);
  d.dropped = {c:dc, k:dk};
  d.apart = ap.concat(LIT.joins.apart || []);
  litPut(d);
  /* Which two the join is between, where nobody has said. The active one and
     the first other literature that is ready; with only one literature the
     second side stays empty and step 2.1 falls back to the imported model,
     which is what it has always done. */
  if(!litHas(LIT.join.a)) LIT.join.a = LIT.at;
  if(!litHas(LIT.join.b) || LIT.join.b === LIT.join.a){
    const other = litList().find(x => x.id !== LIT.join.a && litReady(x.id));
    LIT.join.b = other ? other.id : "";
  }
  litSave();
  return {parts:parts.length, papers:Object.keys(papers).length,
    nodes:nodes.length, claims:claims.length, drew,
    unready:parts.filter(p => !p.ready).map(p => p.id)};
}

/* WHICH OF THE TWO G SHOULD BE, read off the step rather than decided here.
   Called by goStage and by refresh, and cheap when nothing has to change: the
   common case is one literature, where the union of one is the one. */
function litMode(wantUnion){
  if(litCount() < 2){
    /* ONE LITERATURE IS THE CASE EVERY EXISTING SCENARIO IS IN, and it must
       behave exactly as it did: no union, no restore, nothing touched. */
    LIT.union = false;
    return false;
  }
  if(!!wantUnion === !!LIT.union) return LIT.union;
  if(wantUnion) litUnion();
  else litApply(LIT.at);
  return LIT.union;
}

/* ------------------------------------------------------------ adding and taking away */
const litId = name => "lit-" + String(name || "literature").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) +
  "-" + Date.now().toString(36);

/* An empty literature, to be filled with Add a paper or a search export. Its
   frame is empty too: a literature with no outlets has nothing in scope, which
   is the honest starting point -- the first paper read into it brings its own
   outlet, unticked, and somebody decides. */
function litAdd(name, base, from){
  const id = litId(name);
  LIT.list.set(id, {id, name:String(name || "A literature").slice(0, 80),
    from:from || null,
    base:base || {papers:{}, nodes:[], claims:[], journals:[],
      approaches:corpusShipped().approaches, sim:[], meta:[], edges:[]},
    add:null,
    dec:litBlank(base ? (base.journals || []).map(j => j.f) : []),
    at:stampDay()});
  litSave();
  return id;
}
function litDrop(id){
  if(id === MAIN || !LIT.list.has(id)) return false;
  const was = litName(id);
  LIT.list.delete(id);
  if(LIT.join.a === id) LIT.join.a = "";
  if(LIT.join.b === id) LIT.join.b = "";
  if(LIT.at === id) litApply(MAIN); else litSave();
  xlog("lit", "Removed a literature", was + " · " + litCount() +
    " left, and the decisions taken over it went with it");
  return true;
}
function litRename(id, name){
  const n = String(name || "").trim().slice(0, 80);
  if(!n) return false;
  if(id === MAIN) return false;   // the shipped one is named by what it is
  const r = LIT.list.get(id);
  if(!r) return false;
  r.name = n; litSave();
  return true;
}

/* ------------------------------------------- a literature out of an amg-stream */
/* The format step 4.2 writes, read back. It round-trips by construction: the
   stream export is the material a curation was made from, so reading one in is
   how a second researcher starts where the first one stopped -- which is the
   half of the open-source argument the greyed button was about.

   CHECKED RATHER THAN TRUSTED, because the file was written by somebody else.
   What is refused is counted and named: a construct without a signature, a
   claim naming an end the file does not carry, a scale or a sign outside the
   vocabularies. The counts are shown before anything is installed. */
const SVOC = {
  scale:["binary", "nominal", "ordinal", "interval", "ratio"],
  flow:["stock", "flow"],
  sign:["positive", "negative", "none", "conditional", "categorical", "inverted-U"],
  evid:["asserted", "reported", "derived", "estimated"],
};
function litReadStream(o){
  if(!o || o.format !== "amg-stream")
    return {err:"that file does not say it is an amg-stream. A literature comes in as the " +
      "file the last step writes with Export the stream, or as a project file."};
  if(+o.v !== 1)
    return {err:"that stream says it is version " + o.v + " and this reads version 1. A " +
      "file from a later version is refused rather than half-read."};
  const nodes = [], papers = {}, claims = [], journals = [];
  const refused = {constructs:0, claims:0, papers:0};
  const why = [];
  for(const p of (o.papers || [])){
    if(!p || !p.id){ refused.papers++; continue; }
    papers[p.id] = {a:p.authors || "", y:String(p.year || ""), j:p.journal || "",
      jf:p.journal_full || p.journal || "", d:p.doi || "", ti:p.title || p.id,
      sf:[p.authors, p.year, p.journal].filter(Boolean).join(" - "),
      t:p.kind || "", ap:p.tradition || "--", nc:0,
      cb:+p.cited || 0, cy:0, cly:0, cread:p.cited_read || "",
      msp:0, mcm:0, mea:0, e4:p.full_text ? 1 : 0, rdy:0, src:"stream"};
  }
  const have = new Set();
  for(const c of (o.constructs || [])){
    if(!c || !c.id || !c.level || !SVOC.scale.includes(c.scale) ||
       !SVOC.flow.includes(c.stock_or_flow)){ refused.constructs++; continue; }
    have.add(c.id);
    nodes.push({i:c.id, l:c.level, s:c.scale, f:c.stock_or_flow === "flow" ? "f" : "s",
      b:c.bearer || "", n:(c.papers || []).length, p:(c.papers || []).slice(),
      d:c.definition || ""});
  }
  for(const c of (o.claims || [])){
    if(!c || !c.id || !SVOC.sign.includes(c.sign) ||
       !SVOC.evid.includes(c.epistemic_status)){ refused.claims++; continue; }
    const a = (c.antecedent || []).filter(x => have.has(x));
    const b = (c.consequent || []).filter(x => have.has(x));
    if(!a.length || !b.length){ refused.claims++; continue; }
    claims.push({id:c.id, a, c:b, g:c.sign, e:c.epistemic_status,
      p:c.paper || "", t:c.quote || "",
      sh:c.shape || "unspecified", sb:c.shape_basis || "unspecified",
      sc:c.scope || "unstated",
      sp:+((c.scores || {}).specification) || 0, spf:((c.flags || {}).specification || []).slice(),
      cm:+((c.scores || {}).commensurability) || 0, cmf:((c.flags || {}).commensurability || []).slice(),
      ea:+((c.scores || {}).evidence) || 0, eaf:((c.flags || {}).evidence || []).slice()});
  }
  for(const c of claims) if(papers[c.p]) papers[c.p].nc++;
  const byJ = new Map();
  for(const p of Object.values(papers)){
    if(!p.jf) continue;
    if(!byJ.has(p.jf)) byJ.set(p.jf, {n:p.j || p.jf, f:p.jf, c:0});
    byJ.get(p.jf).c++;
  }
  for(const j of byJ.values()) journals.push(j);
  if(refused.constructs) why.push(refused.constructs +
    " construct(s) arrived without a level, a scale or a stock-or-flow this page knows");
  if(refused.claims) why.push(refused.claims +
    " relationship(s) named a sign, a basis or an end the file does not carry");
  if(refused.papers) why.push(refused.papers + " paper record(s) had no identifier");
  if(!nodes.length)
    return {err:"nothing in that stream read as a construct, so there is no literature in it" +
      (why.length ? ": " + why.join("; ") : "")};
  return {base:{papers, nodes, claims, journals,
      approaches:corpusShipped().approaches,
      sim:(o.near || []).map(x => [x.a, x.b, +x.score || 0]),
      meta:(o.theses || []).map(x => ({p:x.paper, t:x.says})),
      edges:(o.answers || []).map(x => ({f:x.from, t:x.to, k:x.kind}))},
    name:String(o.name || "An imported literature").slice(0, 80),
    /* WHERE IT CAME FROM, WHICH THE IMPORT USED TO THROW AWAY. The file says
       which bench, which corpus commit and which curation wrote it, and that
       is the only thing that makes "built on" checkable rather than asserted:
       a reader holding this AMG can fetch the one under it and diff. Carried
       verbatim and never rebuilt, because a provenance this page composed
       would be this page's claim about the source rather than the source's
       own. */
    from:{
      name:String(o.name || "").slice(0, 80),
      doi:String(o.doi || ""),
      built:o.built && typeof o.built === "object" ? {...o.built} : null,
      provenance:o.provenance && typeof o.provenance === "object" ? {...o.provenance} : null
    },
    counts:{papers:Object.keys(papers).length, constructs:nodes.length,
      claims:claims.length, outlets:journals.length},
    refused, why};
}

/* EVERY LITERATURE THIS ONE WAS BUILT ON, for the two files that leave.
   Only the imported ones answer: the shipped literature was not built on
   anything this format can name, and saying so with an empty entry would be
   worse than saying nothing. */
function litSources(){
  const out = [];
  for(const l of LIT.list.values()){
    const f = l.from;
    if(!f || !(f.name || f.doi || f.built || f.provenance)) continue;
    out.push({name:f.name || l.name, doi:f.doi || "",
      built:f.built || null, provenance:f.provenance || null});
  }
  return out;
}

/* ----------------------------------------------------- the store and the scenario */
/* THE SHIPPED PAYLOAD IS NEVER STORED. Its base is in graph-data.js, which
   every reader loads anyway; what is kept for it is what was added and decided,
   like any other literature. */
function litSave(){
  lsWrite(LITKEY, {at:LIT.at, join:LIT.join, joins:LIT.joins, main:MAINREC,
    list:[...LIT.list.values()]});
}
function litLoad(){
  const v = lsRead(LITKEY);
  if(!v || typeof v !== "object") return;
  litTake(v, true);
}
/* What the joins ARE right now, which is not the same as what LIT.joins holds
   while the union stands: the merges made at step 2.1 are in `groups` until it
   comes down. */
function litJoinsNow(){
  const j = LIT.union ? litPartition().joins : LIT.joins;
  return {groups:(j.groups || []).map(g => Object.assign({}, g,
            {members:(g.members || []).slice()})),
          apart:(j.apart || []).slice()};
}
/* The shipped literature's own record, with the decisions it would get back if
   the union came down now rather than the union's own. */
function litMainNow(){
  const bare = o => { const r = Object.assign({}, o);
    if(!r.add) delete r.add; if(!r.dec) delete r.dec; return r; };
  if(!LIT.union) return bare({add:MAINREC.add, dec:MAINREC.dec});
  const v = litPartition().mine.get(MAIN);
  const d = Object.assign({}, MAINREC.dec || litBlank(
    (corpusShipped().journals || []).map(j => j.f)));
  if(v){ d.groups = v.groups; d.dropped = {c:v.dropC, k:v.dropK}; d.apart = v.apart; }
  return bare({add:MAINREC.add, dec:d});
}
/* And each other literature's, for the same reason. */
function litRecsNow(){
  const part = LIT.union ? litPartition().mine : null;
  return [...LIT.list.values()].map(x => {
    const o = Object.assign({}, x);
    const v = part && part.get(x.id);
    if(v) o.dec = Object.assign({}, x.dec || litBlank(),
      {groups:v.groups, dropped:{c:v.dropC, k:v.dropK}, apart:v.apart});
    /* ABSENT RATHER THAN NULL, for the same reason the declared estimate is:
       a literature with nothing added to it has no overlay, not an overlay of
       null, and a reader checking for one gets the right answer either way. */
    if(!o.add) delete o.add;
    if(!o.base) delete o.base;
    return o;
  });
}
const litSnap = () => (LIT.list.size || MAINREC.dec || (litJoinsNow().groups || []).length)
  ? {at:LIT.at, join:Object.assign({}, LIT.join),
     /* THE JOINS TRAVEL. A merge across two literatures is the whole of what
        step 2.1 produces, and it belongs to no single literature -- so it goes
        in the scenario beside them rather than inside one of them. It was left
        out of the first version of this snapshot, and a join survived a
        reload and not an export. */
     joins:litJoinsNow(),
     /* WHETHER THE TOP OF THIS SNAPSHOT IS THE UNION'S. While it stands, the
        page's own state is the union's permissive scope -- every outlet, a
        threshold of one, no bar raised -- and a reader of the file who took
        that for a literature's decisions would read the shipped literature as
        having drawn all 1,026 of its constructs. So it is said, and each
        literature's own decisions are below where they belong. */
     union:!!LIT.union,
     main:litMainNow(),
     list:litRecsNow()} : undefined;
/* UNDEFINED RATHER THAN NULL, which is the same rule the records below keep:
   a scenario with one literature has no literature block, not a block of
   null. JSON.stringify drops the key, and the schema asks for an object
   wherever it is present -- so a null wrote a file the bench's own checker
   refused. It surfaced the moment make demo stopped carrying a board over
   from the base and the export was read against the schema again. */
/* A LITERATURE'S PAYLOAD, WHICHEVER OF ITS TWO FORMS ARRIVED. The union reads
   `nodes`, a papers map and `claims`; an `amg-stream` -- the file step 4.2
   writes and the one a scholar hands over -- carries `constructs`, a papers
   ARRAY and claims in the published spelling. Both are the same literature and
   only one of them is what the union can walk.

   This was a hole rather than a choice: a stream imported through the menu went
   through litReadStream and was stored converted, so nothing noticed until a
   scenario carried a stream in its published form. The union then read
   `base.nodes` off a published stream, found undefined, and the refresh threw
   from inside litUnion -- which is to say the published format did not round
   trip into a scenario at all. One reader, asked twice. */
function litBase(b){
  if(!b || typeof b !== "object") return null;
  if(b.format !== "amg-stream") return b;
  const r = litReadStream(b);
  if(r.err){ noteFail("stream.base", new Error(r.err)); return null; }
  return r.base;
}

function litTake(o, quiet){
  LIT.list.clear(); LIT.at = MAIN; LIT.union = false;
  LIT.join = {a:"", b:""};
  LIT.joins = {groups:[], apart:[]};
  MAINREC.add = null; MAINREC.dec = null;
  LITN.clear(); LITP.clear();
  if(o){
    for(const x of (o.list || []))
      if(x && x.id && x.id !== MAIN) LIT.list.set(x.id, {
        id:x.id, name:String(x.name || x.id).slice(0, 80),
        base:litBase(x.base), add:x.add || null, dec:x.dec || null,
        from:x.from || null, at:x.at || ""});
    if(o.main){ MAINREC.add = o.main.add || null; MAINREC.dec = o.main.dec || null; }
    if(o.join) LIT.join = {a:String(o.join.a || ""), b:String(o.join.b || "")};
    if(o.joins) LIT.joins = {
      groups:(o.joins.groups || []).filter(g => g && g.id),
      apart:(o.joins.apart || []).map(String)};
    if(typeof o.at === "string" && litHas(o.at)) LIT.at = o.at;
  }
  /* Installed rather than only recorded, because every reader of G is about to
     ask it what the corpus is. `quiet` is the boot path, where the stores are
     still being restored and corpusLoad has not run yet. */
  if(!quiet) litApply(LIT.at);
  else litSave();
}

export { LIT, MAIN, litAdd, litSources, litApply, litBlank, litCount, litDec, litDrop, litHas,
  litIs, litList, litLoad, litMain, litMode, litName, litNow, litOf, litOfPaper,
  litPut, litReadStream, litReady, litRename, litSave, litSnap, litStash,
  litTake, litUnion };

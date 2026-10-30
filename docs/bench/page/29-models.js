"use strict";
/* READING SOMEBODY ELSE'S ACTION MODEL IN, BESIDE YOUR OWN.
   ==========================================================================

   A literature already arrives beside the one you are in: Import a literature
   on step 1.1 brings a second scholar's corpus and their curator's pass,
   without touching yours. What it does not bring is the rest of an action
   model -- the declarations made over that literature, the arithmetic that
   closed it, and the conclusions with the regions they hold on. So a second
   literature could be looked at and a second MODEL could not, and the control
   in the Menu said so and was greyed.

   This is that, and the design decision in it is one word: BESIDE.

   Reading a scenario file in could mean two things. It could mean opening it,
   which this page already does -- Import a scenario file, in the Menu -- and
   that replaces your work with theirs. Or it can mean holding theirs next to
   yours so the two can be compared, which is the thing a reader of a published
   action model actually wants to do, and which nothing here could do before.

   WHAT ARRIVES, AND WHAT IT CAN DO:

     THE DECLARATIONS. One per statement: the relationship, the roles, the
       shape properties, the range, and what in their corpus it rested on.
       Each one is PLACED against this page -- the statement it is about is
       looked for here -- and then offered to be adopted BY NAME, one at a
       time. Adopting writes it into your declarations stamped with the model
       it came from, so the record says you took it rather than made it. A
       declaration this page cannot place is refused with the reason, which is
       almost always that a construct it is about is not in this corpus.
     THE QUANTITIES. The kinds, the aspects and the bounds somebody declared
       for a construct, adopted the same way.
     THE ARITHMETIC. Shown as it was kept, and NOT run. Their names need not
       resolve here, and an arithmetic that silently half-resolved would be
       worse than none. It can be put into the editor on step 3.1, where it
       goes through the same parser as anything typed by hand and is refused
       by name if it does not read.
     THE CONCLUSIONS. Their findings, with the verdict and the region each
       holds on, beside yours about the same pair wherever you have one. This
       is read-only on purpose: a conclusion is a claim about a model, and
       their conclusion is about THEIR model. Adopting one would be adopting
       a result without its proof, which is the one thing this bench will not
       do -- but seeing that two models disagree about a pair is exactly the
       thing a second model is worth reading for.

   NOTHING IS ADOPTED BY ARRIVING. The whole file lands as something to read,
   and every one of your own declarations stays as it was until you say
   otherwise. ======================================================= */
import { hesc } from "../core/safe.js";
import { lsRead, lsWrite } from "./03-stores.js";
import { ASPECTS, FORMPROPS, JJ_REL, KINDS, groups, spec, specSet, spersist,
  ssaveLocal, vsaveLocal, vtype } from "./03b-decisions.js";
import { xlog } from "./05-explore.js";
import { varName } from "./11-classes.js";
/* The imported model report, which ships with this page: a declaration about
   one of ITS relations places here when this page carries the same report. */
import { MR } from "../model-report.js";

/* Keyed by an id of this page's making, because two files can carry the same
   scenario name and a store keyed by name would merge them. */
const IMPM = {list:new Map(), err:"", open:"", seq:0};
const IMPMKEY = "purposeImportedModels";
function impSave(){ lsWrite(IMPMKEY, [...IMPM.list.values()]); }
function impLoad(){
  const v = lsRead(IMPMKEY);
  if(Array.isArray(v)) v.forEach(m => { IMPM.list.set(m.id, m);
    IMPM.seq = Math.max(IMPM.seq, +String(m.id).replace(/\D/g, "") || 0); });
}

/* ------------------------------------------------------- the closed vocabularies */
/* Each is the page's own list, asked rather than re-stated here. A value
   outside one is REFUSED and counted: a file from a later version of this
   bench, or from a fork, can carry a verb or a property this page has no
   meaning for, and writing it in would make the declaration unreadable by
   everything downstream that switches on these. */
/* BUILT ON FIRST USE AND NOT AT LOAD. Four lists imported from another module,
   read at the top level of this one, is the import-cycle bug this bench has hit
   twice: whichever module evaluates second reads the other's bindings while
   they are still uninitialised, the module throws, and what is lost is an
   export nothing else can see is missing. Nothing in this file runs until
   something calls it. */
const vkey = x => Array.isArray(x) ? x[0] : (x && x.k) || x;
let VSETS = null;
function vsets(){
  if(!VSETS) VSETS = {
    rels:new Set(JJ_REL.map(x => x.k)),
    props:new Set(FORMPROPS.map(x => x.k)),
    /* VOCAB's two lists are [key, why, note] triples and the other two are
       objects with a `k`. Both shapes are read, because reading one of them
       wrongly drops every value silently -- which is what it did, and what
       tests/models.mjs caught by refusing a file this bench itself wrote. */
    kinds:new Set((KINDS || []).map(vkey)),
    aspects:new Set((ASPECTS || []).map(vkey))};
  return VSETS;
}

/* --------------------------------------------------------------- placing it here */
/* WHICH STATEMENT ON THIS PAGE IS THIS A DECLARATION ABOUT?

   A statement id is the pair of node ids with a `>` between them, and a node
   id is a construct id after this page's merges. Construct ids are the
   corpus's and they travel, so the common case is an exact hit. The two that
   are not:

     their merge is not yours. A declaration about `firm-overall-performance`
       belongs, here, to whatever node that construct folded into -- so each
       endpoint is folded through this page's own merges before the pair is
       looked for again;
     the construct is not in this corpus at all, which is not a failure to
       place but a true statement about two different literatures. It is said,
       with the name, rather than counted. */
const foldHere = id => {
  for(const g of groups.values())
    if((g.members || []).includes(id)) return g.id;
  return id;
};
/* A statement is declared about one of three things, and only the first of
   them is an arrow in a corpus. The page writes all three into the same store
   under three id schemes, so a model read in carries all three and placing it
   means telling them apart:

     `a>b`     an arrow between two constructs. Folded and looked for;
     `mr:<id>` a relation out of the imported model report, which ships with
               this page -- so it places when this page carries the same report,
               which is the common case, and is refused by name when it does
               not;
     `mx:<id>` a relation THEY asserted by hand. The id is theirs and the
               relation is in no corpus, so it cannot be placed at all. That is
               not a defect in the file: it is a declaration about something
               that exists only in the session that made it, and the honest
               thing is to say so rather than to drop it quietly. */
function impPlace(statement){
  const raw = String(statement || "");
  if(/^mx:/.test(raw)) return {err:"that is a relation they asserted by hand, which " +
    "exists only in the session that made it \u2014 assert it here and declare it yourself, " +
    "or ask them for the relationship"};
  if(/^mr:/.test(raw)){
    const id = raw.slice(3);
    const has = (MR && (MR.relations || []).some(r => r.id === id));
    return has ? {id:raw, moved:false, imported:true}
      : {err:"this page's imported model carries no relation called " + id};
  }
  const parts = raw.split(">");
  if(parts.length !== 2) return {err:"that is not a statement id this page writes"};
  const a = foldHere(parts[0]), b = foldHere(parts[1]);
  const here = a + ">" + b;
  const have = i => groups.has(i) || hasConstruct(i);
  if(!have(a) || !have(b)) return {err:"this corpus has not got " +
    [!have(a) ? parts[0] : "", !have(b) ? parts[1] : ""].filter(Boolean).join(" or ")};
  return {id:here, moved:here !== raw, from:parts[0], to:parts[1]};
}
/* Asked of the corpus as the page holds it, which is the shipped payload plus
   whatever was imported over it -- so a declaration about a construct that
   arrived with a second literature places correctly. */
let hasC = null;
const impCorpus = fn => { hasC = fn; };
const hasConstruct = i => (hasC ? !!hasC(i) : false);

/* ------------------------------------------------------------------ reading one */
/* A SCENARIO FILE, which is the only one of the formats that carries all four
   parts. An `amg-stream` carries declarations and no arithmetic; it is read
   too, and says which halves it brought. */
function impRead(o){
  if(!o || typeof o !== "object") return {err:"that file is not an object"};
  const kind = o.format === "amg-stream" ? "stream"
    : (o.snap || o.scenario || o.name) ? "scenario" : "";
  if(!kind) return {err:"that is neither a project file this workbench wrote nor an amg-stream"};
  const why = [];
  const sn = kind === "scenario" ? (o.snap || {}) : {};

  /* --- the declarations, in whichever shape the file carries them --------- */
  const decls = [];
  if(kind === "scenario"){
    for(const row of (sn.spec || [])){
      if(!Array.isArray(row) || row.length < 2) continue;
      const [id, v] = row;
      if(!specSet(v)) continue;
      const bad = (v.props || []).filter(p => !vsets().props.has(p));
      const rel = v.rel && !vsets().rels.has(v.rel) ? "" : (v.rel || "");
      if(bad.length) why.push("dropped " + bad.length + " shape propert" +
        (bad.length === 1 ? "y" : "ies") + " this page does not name");
      if(v.rel && !rel) why.push("dropped a relationship verb this page does not name: " + v.rel);
      decls.push({statement:String(id),
        rel, roles:(v.roles || (v.role ? [v.role] : [])).slice(0, 8),
        props:(v.props || []).filter(p => vsets().props.has(p)),
        target:v.target || "",
        lo:+v.lo || 0, hi:v.hi == null ? 1 : +v.hi,
        elo:v.elo == null ? null : +v.elo, ehi:v.ehi == null ? null : +v.ehi,
        note:String(v.note || "").slice(0, 400), at:String(v.at || "")});
    }
  } else {
    /* A STREAM NAMES ITS ENDPOINTS BY LABEL AND NOT BY ID, because a stream is
       about a literature and the labels are what a reader of it sees. So a
       declaration out of a stream carries what it rests on, and that is what
       places it: a claim id is global and identifies the arrow it belongs to. */
    for(const d of (o.declarations || [])){
      if(!d || !d.statement) continue;
      decls.push({statement:String(d.statement),
        rel:vsets().rels.has(d.relationship) ? d.relationship : "",
        roles:(d.roles || []).slice(0, 8),
        props:(d.properties || []).filter(p => vsets().props.has(p)),
        target:d.moderates || "",
        lo:+(d.range || [0, 1])[0] || 0, hi:+(d.range || [0, 1])[1] || 1,
        elo:(d.estimate || [null, null])[0], ehi:(d.estimate || [null, null])[1],
        note:String(d.note || "").slice(0, 400), at:String(d.at || ""),
        rests_on:(d.rests_on || []).slice(0, 40),
        label:[d.from || "", d.to || ""]});
    }
  }

  /* --- the quantities ---------------------------------------------------- */
  const vtypes = [];
  const vrows = kind === "scenario" ? (sn.vtype || [])
    : (o.declarations || []).filter(d => d && d.quantity)
        .map(d => ({id:d.quantity, name:d.name, kinds:d.kind ? [d.kind] : [],
          aspects:d.aspect ? [d.aspect] : [], lo:d.lo, hi:d.hi, at:d.at}));
  for(const v of vrows){
    if(!v || !v.id) continue;
    const ks = (v.kinds || (v.kind ? [v.kind] : [])).filter(k => vsets().kinds.has(k));
    const as = (v.aspects || (v.aspect ? [v.aspect] : [])).filter(k => vsets().aspects.has(k));
    const dropped = (v.kinds || []).length - ks.length + ((v.aspects || []).length - as.length);
    if(dropped > 0) why.push("dropped " + dropped +
      " kind or aspect this page does not name, on " + v.id);
    vtypes.push({id:String(v.id), name:String(v.name || ""), kinds:ks, aspects:as,
      lo:+v.lo || 0, hi:v.hi == null ? 1 : +v.hi, bset:!!v.bset, at:String(v.at || "")});
  }

  /* --- the arithmetic, kept as text and not run -------------------------- */
  const A = kind === "scenario" ? (sn.arith || null) : null;
  const arith = !A ? null : {
    lines:(A.lines || []).map(x => ({lhs:String(x.lhs || ""),
      rhs:String(x.rhs || x.py || "")})).slice(0, 200),
    consts:(A.consts || []).map(c => ({name:String(c.name || ""), value:c.value,
      lo:c.lo, hi:c.hi})).slice(0, 200),
    at:String(A.at || ""), note:String(A.note || "").slice(0, 600),
    sig:String(A.sig || ""), hand:!!A.hand,
    checks:(A.checks || []).length, miss:(A.miss || []).length};

  /* --- the conclusions --------------------------------------------------- */
  /* THE BOARD AND NOT THE BUFFER. What somebody stood behind is a decision and
     travels; the buffer is a working surface and does not. */
  const findings = ((sn.board || {}).rows || [])
    .filter(r => r && r.keep && r.y && r.x)
    .map(r => ({y:String(r.y), x:String(r.x), text:String(r.text || ""),
      verdict:String(r.verdict || ""), share:typeof r.share === "number" ? r.share : null,
      method:String(r.method || ""), src:String(r.src || ""),
      round:+r.round || 0, at:String(r.at || ""),
      anno:String(r.anno || "").slice(0, 400)}))
    .slice(0, 200);

  /* CAPPED, because this is held in a browser store beside everything else the
     page keeps and a curation can be much larger than the one that ships. What
     is dropped is said rather than silently missing, which is the same rule the
     refusals above keep. */
  const CAP = 400;
  for(const [what, arr] of [["declaration", decls], ["quantity", vtypes]]){
    if(arr.length > CAP){
      why.push("kept the first " + CAP + " " + what + "s of " + arr.length +
        ", which is as many as this page will hold beside your own");
      arr.length = CAP;
    }
  }

  if(!decls.length && !vtypes.length && !arith && !findings.length)
    return {err:"that file carries no model: no declarations, no arithmetic and " +
      "nothing retained. " + (kind === "stream"
        ? "A stream exported before its declarations were made carries none."
        : "A project saved before the model was declared carries none.")};

  return {name:String(o.name || (kind === "stream" ? "an imported literature" : "an imported model")),
    kind,
    from:{bench:String((o.bench || {}).v || ""), corpus:String((o.corpus || {}).commit || ""),
      at:String(o.at || (o.provenance || {}).at || "")},
    decls, vtypes, arith, findings,
    counts:{decls:decls.length, vtypes:vtypes.length,
      lines:arith ? arith.lines.length : 0, findings:findings.length},
    why:[...new Set(why)]};
}

function impAdd(got){
  const id = "m" + (++IMPM.seq) + "-" + Date.now().toString(36);
  /* A MODEL JUST READ IN OPENS ON ITS DECLARATIONS, whatever tab was last
     looked at. A second one arriving into the tab the first was left on shows
     the wrong part of itself, and for a model whose declarations cannot be
     placed here that is the part a reader most needs. */
  IMPM.tab = "decls";
  IMPM.list.set(id, Object.assign({id, read:new Date().toISOString().slice(0, 16)
    .replace("T", " "), took:[]}, got));
  IMPM.open = id;
  impSave();
  return id;
}
function impDrop(id){
  IMPM.list.delete(id);
  if(IMPM.open === id) IMPM.open = [...IMPM.list.keys()][0] || "";
  impSave();
}

/* ------------------------------------------------------------- adopting one */
/* BY NAME, ONE AT A TIME, AND STAMPED. The record already distinguishes a
   declaration the scholar made from one a model proposed; this is a third
   case and it gets a third stamp rather than passing as either. `took` keeps
   which of them were adopted, so the panel can say so and a second click
   cannot adopt the same thing twice without the page noticing. */
function impAdopt(modelId, i){
  IMPM.err = "";
  const m = IMPM.list.get(modelId);
  if(!m){ IMPM.err = "that model is gone"; return false; }
  const d = m.decls[i];
  if(!d){ IMPM.err = "that declaration is gone"; return false; }
  const at = impPlace(d.statement);
  if(at.err){ IMPM.err = "it cannot be placed here: " + at.err; return false; }
  const was = spec.get(at.id);
  const v = {rel:d.rel, roles:d.roles.slice(), props:d.props.slice(),
    target:d.target, lo:d.lo, hi:d.hi, elo:d.elo, ehi:d.ehi,
    note:d.note, at:new Date().toISOString().slice(0, 10),
    /* WHERE IT CAME FROM, which is the one thing about an adopted declaration
       that cannot be recomputed from the declaration itself. */
    from:{model:m.name, id:m.id, statement:d.statement, at:d.at}};
  spec.set(at.id, v);
  spersist(at.id, v);
  ssaveLocal();
  if(!m.took.includes("d" + i)) m.took.push("d" + i);
  impSave();
  xlog("model", "Adopted a declaration from another model",
    m.name + " · " + at.id + (at.moved ? " (through your merges)" : "") +
    (was ? " — replacing one you had" : ""));
  return true;
}
function impAdoptVar(modelId, i){
  IMPM.err = "";
  const m = IMPM.list.get(modelId);
  if(!m){ IMPM.err = "that model is gone"; return false; }
  const q = m.vtypes[i];
  if(!q){ IMPM.err = "that quantity is gone"; return false; }
  const id = foldHere(q.id);
  if(!groups.has(id) && !hasConstruct(id)){
    IMPM.err = "this corpus has not got " + q.id; return false; }
  const v = {id, name:q.name || varName(id), kinds:q.kinds.slice(),
    aspects:q.aspects.slice(), lo:q.lo, hi:q.hi, bset:q.bset,
    at:new Date().toISOString().slice(0, 10),
    from:{model:m.name, id:m.id, quantity:q.id, at:q.at}};
  vtype.set(id, v);
  vsaveLocal();
  if(!m.took.includes("v" + i)) m.took.push("v" + i);
  impSave();
  xlog("model", "Adopted a quantity's typing from another model",
    m.name + " · " + id + " · " + (q.kinds.join(", ") || "no kind") +
    ", in [" + q.lo + ", " + q.hi + "]");
  return true;
}

/* Their arithmetic, as the text the editor on step 3.1 reads. Not applied:
   handed to the editor, where it goes through the same parser as anything
   typed and is refused by name if it does not read against the declarations
   this page actually holds. */
function impArithText(modelId){
  const m = IMPM.list.get(modelId);
  if(!m || !m.arith) return "";
  const L = [];
  for(const c of m.arith.consts)
    L.push(c.name + " = " + c.value +
      (c.lo != null && c.hi != null ? " in [" + c.lo + ", " + c.hi + "]" : ""));
  if(m.arith.consts.length) L.push("");
  for(const x of m.arith.lines) L.push(x.lhs + " = " + x.rhs);
  return L.join("\n");
}

/* --------------------------------------------------------------- the panel */
const pct = x => (100 * x).toFixed(1) + "%";
const impNow = () => IMPM.list.get(IMPM.open) || null;
const impCount = () => IMPM.list.size;

function impDeclRowHTML(m, d, i){
  const at = impPlace(d.statement);
  const took = m.took.includes("d" + i);
  const mine = at.id ? spec.get(at.id) : null;
  const bits = [d.rel ? (JJ_REL.find(x => x.k === d.rel) || {n:d.rel}).n : "",
    d.roles.length ? d.roles.join(", ") : "",
    d.props.length ? d.props.join(" · ") : "",
    "in [" + d.lo + ", " + d.hi + "]",
    d.elo != null || d.ehi != null ? "estimate [" + d.elo + ", " + d.ehi + "]" : ""]
    .filter(Boolean);
  return `<div class="imrow${took ? " took" : ""}${at.err ? " nope" : ""}">
    <div class="imwhat"><code>${hesc(d.statement)}</code>${at.moved
      ? `<span class="cst">through your merges → <code>${hesc(at.id)}</code></span>` : ""}</div>
    <div class="imsay">${bits.map(b => `<span class="sup">${hesc(b)}</span>`).join("")}
      ${d.note ? `<i class="bnote">${hesc(d.note)}</i>` : ""}</div>
    ${at.err ? `<i class="bnote nope">Cannot be placed: ${hesc(at.err)}</i>`
      : `<div class="imacts">
        ${took ? `<span class="cst ok">adopted</span>`
          : `<button type="button" class="edbtn" data-imdecl="${hesc(m.id)}:${i}">${
            mine && specSet(mine) ? "Replace mine with this" : "Adopt this"}</button>`}
        ${mine && specSet(mine) ? `<i class="bnote">You have a declaration here${
          mine.from ? " adopted from " + hesc(String(mine.from.model || "")) : ""}: ${
          hesc([mine.rel, (mine.roles || []).join(", "),
                (mine.props || []).join(" · ")].filter(Boolean).join(" · ") ||
               "range only")}</i>`
          : `<i class="bnote">You have declared nothing about this statement.</i>`}
      </div>`}
  </div>`;
}

function impVarRowHTML(m, q, i){
  const id = foldHere(q.id);
  const here = groups.has(id) || hasConstruct(id);
  const took = m.took.includes("v" + i);
  const mine = vtype.get(id);
  return `<div class="imrow${took ? " took" : ""}${here ? "" : " nope"}">
    <div class="imwhat"><code>${hesc(q.id)}</code>${q.name
      ? ` <span class="cst">${hesc(q.name)}</span>` : ""}</div>
    <div class="imsay">
      ${(q.kinds.length ? q.kinds : ["no kind"]).map(k =>
        `<span class="sup">${hesc(k)}</span>`).join("")}
      ${q.aspects.map(k => `<span class="sup">${hesc(k)}</span>`).join("")}
      <span class="sup">in [${q.lo}, ${q.hi}]${q.bset ? "" : ", not declared"}</span></div>
    ${!here ? `<i class="bnote nope">Cannot be placed: this corpus has not got it.</i>`
      : `<div class="imacts">
        ${took ? `<span class="cst ok">adopted</span>`
          : `<button type="button" class="edbtn" data-imvar="${hesc(m.id)}:${i}">${
            mine ? "Replace mine with this" : "Adopt this"}</button>`}
        ${mine ? `<i class="bnote">Yours: ${hesc((mine.kinds || []).join(", ") ||
          "no kind")}, in [${mine.lo}, ${mine.hi}]</i>`
          : `<i class="bnote">You have not typed this quantity.</i>`}
      </div>`}
  </div>`;
}

/* THEIR CONCLUSIONS BESIDE YOURS, read-only. A conclusion is a claim about a
   model and theirs is about theirs; adopting one would be taking a result
   without its proof. What it is for is the disagreement: two models over the
   same pair reaching different verdicts is the thing worth seeing, and the
   row says so in those words where it happens. */
function impFindHTML(m, f, board){
  const mine = (board || []).find(r => r.keep && r.y === f.y && r.x === f.x);
  const clash = mine && mine.verdict && f.verdict && mine.verdict !== f.verdict;
  return `<div class="imrow${clash ? " clash" : ""}">
    <div class="imwhat">${hesc(f.text || (f.y + " in " + f.x))}</div>
    <div class="imsay"><span class="sup">${hesc(f.verdict || "no verdict")}</span>
      ${f.share != null ? `<span class="sup">${pct(f.share)} of their box</span>` : ""}
      ${f.method ? `<span class="sup">${hesc(f.method)}</span>` : ""}
      ${f.src && f.src !== "auto" ? `<span class="sup">${hesc(f.src)}</span>` : ""}</div>
    ${f.anno ? `<i class="bnote">Their note: ${hesc(f.anno)}</i>` : ""}
    <i class="bnote">${mine
      ? (clash ? `<b>You disagree.</b> Yours says <b>${hesc(mine.verdict)}</b>${
          typeof mine.share === "number" ? " on " + pct(mine.share) + " of your box" : ""
        } about the same pair — which is two models over one question and not an error in either.`
        : `Yours agrees: <b>${hesc(mine.verdict)}</b>${
          typeof mine.share === "number" ? " on " + pct(mine.share) + " of your box" : ""}.`)
      : "You have retained nothing about this pair."}</i>
  </div>`;
}

function impPanelHTML(board){
  const n = IMPM.list.size;
  if(!n) return "";
  const m = impNow();
  const tab = IMPM.tab || "decls";
  const on = k => tab === k ? ' aria-pressed="true"' : "";
  return `<div class="impanel">
    <div class="embhd">
      <span class="ctl-label">Another model, beside yours</span>
      <span class="pcount">${n === 1 ? "one read in" : n + " read in"}</span>
    </div>
    ${n > 1 ? `<div class="presets">${[...IMPM.list.values()].map(x =>
      `<button type="button" data-impsel="${hesc(x.id)}"${
        x.id === IMPM.open ? ' aria-pressed="true"' : ""}>${hesc(x.name)}</button>`).join("")}
    </div>` : ""}
    ${!m ? "" : `
    <p class="why">${hesc(m.name)} — ${m.counts.decls} declaration${
      m.counts.decls === 1 ? "" : "s"}, ${m.counts.vtypes} quantit${
      m.counts.vtypes === 1 ? "y" : "ies"}, ${m.counts.lines} line${
      m.counts.lines === 1 ? "" : "s"} of arithmetic and ${m.counts.findings} retained
      finding${m.counts.findings === 1 ? "" : "s"}. Read ${hesc(m.read)}${m.from.bench
      ? " off bench " + hesc(m.from.bench) : ""}${m.from.corpus
      ? ", corpus " + hesc(m.from.corpus.slice(0, 7)) : ""}.
      <b>Nothing here is yours until you adopt it.</b></p>
    ${m.why.length ? `<p class="why" style="color:var(--neg)">What was refused on the way in:
      ${hesc(m.why.join("; "))}.</p>` : ""}
    <div class="modebar tabsrow" role="tablist" aria-label="What of their model to read">
      <button type="button" role="tab" data-imtab="decls"${on("decls")}>Declarations
        <b>${m.counts.decls}</b></button>
      <button type="button" role="tab" data-imtab="vars"${on("vars")}>Quantities
        <b>${m.counts.vtypes}</b></button>
      <button type="button" role="tab" data-imtab="arith"${on("arith")}>Arithmetic
        <b>${m.counts.lines}</b></button>
      <button type="button" role="tab" data-imtab="finds"${on("finds")}>Conclusions
        <b>${m.counts.findings}</b></button>
    </div>
    ${IMPM.err ? `<p class="why" style="color:var(--neg)">${hesc(IMPM.err)}</p>` : ""}
    <div class="imlist">${
      tab === "decls" ? (m.decls.length
          ? m.decls.map((d, i) => impDeclRowHTML(m, d, i)).join("")
          : `<p class="empty">This file carries no declaration over a statement.</p>`)
      : tab === "vars" ? (m.vtypes.length
          ? m.vtypes.map((q, i) => impVarRowHTML(m, q, i)).join("")
          : `<p class="empty">This file types no quantity.</p>`)
      : tab === "finds" ? (m.findings.length
          ? m.findings.map(f => impFindHTML(m, f, board)).join("")
          : `<p class="empty">This file retained no finding.</p>`)
      : (m.arith ? `
        <p class="why">As they kept it${m.arith.at ? ", " + hesc(m.arith.at) : ""}${
          m.arith.hand ? ", written by hand" : ""}. <b>Not run here</b> — their names need
          not resolve against your declarations, and an arithmetic that half-resolved would
          be worse than none. Putting it in the editor sends it through the same parser as
          anything you type, which refuses by name.</p>
        ${m.arith.note ? `<i class="bnote">Their note: ${hesc(m.arith.note)}</i>` : ""}
        <pre class="imarith">${hesc(impArithText(m.id))}</pre>
        <div class="cmpacts">
          <button type="button" class="edbtn" data-imarith="${hesc(m.id)}">Put it in the
            editor on step 3.1</button>
          <span class="mblab" style="align-self:center">${m.arith.checks} check${
            m.arith.checks === 1 ? "" : "s"} passed for them${m.arith.miss
            ? ", " + m.arith.miss + " left undone" : ""}</span>
        </div>`
        : `<p class="empty">This file carries no arithmetic. A stream never does, and a
           project saved before the model was operationalized does not.</p>`)}
    </div>
    <div class="cmpacts" style="margin-top:9px">
      <button type="button" class="edbtn" data-impdrop="${hesc(m.id)}">Remove this model
        from the page</button>
      <span class="mblab" style="align-self:center">Removing it leaves every declaration
        you adopted from it exactly where it is.</span>
    </div>`}
  </div>`;
}

/* ------------------------------------------------------------------ wiring */
function wireModels(redraw, toEditor){
  document.querySelectorAll("#pbody [data-impsel]").forEach(b => b.onclick = () => {
    IMPM.open = b.dataset.impsel; IMPM.err = ""; redraw(); });
  document.querySelectorAll("#pbody [data-imtab]").forEach(b => b.onclick = () => {
    IMPM.tab = b.dataset.imtab; IMPM.err = ""; redraw(); });
  document.querySelectorAll("#pbody [data-imdecl]").forEach(b => b.onclick = () => {
    const [id, i] = b.dataset.imdecl.split(":");
    impAdopt(id, +i); redraw(); });
  document.querySelectorAll("#pbody [data-imvar]").forEach(b => b.onclick = () => {
    const [id, i] = b.dataset.imvar.split(":");
    impAdoptVar(id, +i); redraw(); });
  document.querySelectorAll("#pbody [data-imarith]").forEach(b => b.onclick = () => {
    const t = impArithText(b.dataset.imarith);
    if(t && typeof toEditor === "function") toEditor(t);
    redraw(); });
  document.querySelectorAll("#pbody [data-impdrop]").forEach(b => b.onclick = () => {
    impDrop(b.dataset.impdrop); redraw(); });
}

/* It travels, because reading a model in and placing it against this corpus is
   work somebody did, and so is every adoption. */
const impSnap = () => [...IMPM.list.values()];
function impTake(rows){
  IMPM.list.clear(); IMPM.open = ""; IMPM.seq = 0;
  for(const m of (rows || [])) if(m && m.id){
    IMPM.list.set(m.id, Object.assign({took:[], why:[]}, m));
    IMPM.seq = Math.max(IMPM.seq, +String(m.id).replace(/\D/g, "") || 0);
  }
  IMPM.open = [...IMPM.list.keys()][0] || "";
  impSave();
}

export { IMPM, impAdd, impAdopt, impAdoptVar, impArithText, impCorpus, impCount,
  impDrop, impLoad, impNow, impPanelHTML, impPlace, impRead, impSave, impSnap,
  impTake, wireModels };

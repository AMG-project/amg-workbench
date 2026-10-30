/* AMG bench, page script 6 of 22: the exploring phase: the four methods, rounds, propositions.
   One shared global scope, loaded in order. See page/README.md. */
import { alcg } from "../core/invariants.js";
import { hesc } from "../core/safe.js";
import { EXPSETS } from "../core/expset.js";
import { GUESSLAB, lineSays, vKey, vSay, vWord, xrunClause, xrunStale } from "../core/verdict.js";
import { REVIEW, reviewChecks, reviewExposure } from "../core/checks.js";
import { VOCAB } from "../core/vocab.js";
import { ivalTree } from "../core/kernel.js";
import { formsTag } from "../core/forms.js";
import { AI, AIQ, AITIP, ARITH, abnd, aiCap, aiMark, arithKeep, arithSig, bdec, takeArith } from "./08-ask.js";
import { BENCH, CORPUS, provTake, scenCur, stampLines } from "./17-scenarios.js";
import { BSRC, BUF, PROPS, bufModel } from "./09-derive.js";
/* An accepted study design, drawn on the row it is about. The module that
   asked for it owns how it is said; the row only says where. */
import { bridgeRowHTML } from "./28-bridge.js";
import { COMPOSITIONS, KINDS, ROLES, SPEC0, compo, csaveLocal2, groups, handName, mclm, mcon, rulesOf, sforget, spec, specSet, spersist, vsaveLocal, vtype } from "./03b-decisions.js";
import { DEPOSIT } from "./02-modules.js";
import { JALL, infold, lsRead, lsWrite, noteFail, state } from "./03-stores.js";
import { bufSeed } from "./10-depends.js";
import { carriedRelations, carriedVars, looksLikeDifference, propsOf, recordedKinds, rolesOf, statedProps, vAspects, vKinds } from "./07-grouping.js";
;
import { lastView } from "./13-map.js";
import { mechDesc, outcomeVars, varName } from "./11-classes.js";
import { refresh } from "./14-boot.js";
import { goStage, renderPanel, stepNo } from "./06-wiring.js";
import { STAGES } from "./04-stages.js";
import { reviewAsk, reviewState } from "./19-review.js";
/* ------------------------------------------- the exploring phase, run as one */
/* Block three asks for fourteen declarations on the demo and twenty-four on the
   eleven-mechanism model, and arrives with none of them made. That is a lot to
   ask before anything has been derived, and a good deal of it is answerable
   from material the page already holds. So the phase can be run.

   Three things keep that honest, and all three are rules the bench already
   lives by:

     a default is not a declaration, so everything a pass chooses carries WHO
       chose it and is reversible as a set;
     nothing enters because a model said so — every proposal still goes
       through the grammar, the declared box and the interval checker, which
       refuse a bad one by name;
     and the one choice nothing can check — a relation's ROLE, which no paper
       in the corpus states — is counted separately and said out loud, rather
       than sitting in the tally looking like the others. */
const PASSDEPTH = [
  ["manual",  "Manual — nothing is proposed"],
  ["propose", "Propose — fill the declarations, stop there"],
  ["run",     "Run — declare, close and derive"],
];
const PASS = {depth:"propose", set:new Map(), log:[], busy:"", err:"", refused:0};
const passPaint = () => { refresh(); renderPanel(); };

const passKeys = () => {
  const out = [];
  for(const k of carriedVars()){ out.push("k:" + k); out.push("a:" + k); }
  for(const r of carriedRelations()){ out.push("r:" + r.id); out.push("p:" + r.id); }
  return out;
};
/* The current value of a choice, as a string. Provenance is then a comparison
   rather than a hook in every picker on the step: if what is there now is what
   the pass put there, the pass put it there. Touch it by hand and it becomes
   yours, with nothing to remember to call. */
function passValue(key){
  const t = key.slice(0, 1), id = key.slice(2);
  if(t === "k") return vKinds(id).join(",");
  if(t === "a") return vAspects(id).join(",");
  if(t === "c") return rulesOf(id).join(",");
  const r = carriedRelations().find(x => x.id === id);
  if(!r) return "";
  if(t === "r") return rolesOf(r).join(",");
  if(t === "p") return propsOf(r).join(",");
  return "";
}
function passWho(key){
  const now = passValue(key);
  if(!now) return "open";
  const e = PASS.set.get(key);
  return (e && e.v === now) ? e.who : "hand";
}
function passTally(){
  const t = {open:0, corpus:0, claude:0, hand:0, n:0, unver:0};
  for(const key of passKeys()){ t.n++; t[passWho(key)]++; }
  for(const r of carriedRelations())
    if(passWho("r:" + r.id) === "claude") t.unver++;
  return t;
}

/* What the corpus can answer on its own. These are the three bulk actions step
   3.1 already offers, called rather than reimplemented, so the pass proposes
   exactly what a scholar pressing those buttons would get — and nothing it
   would not. Roles are absent on purpose: no paper states one. */
function passDeclareFromCorpus(){
  const today = new Date().toISOString().slice(0, 10);
  const vv = k => Object.assign({id:k, name:varName(k), kinds:[], aspects:[], lo:0, hi:1},
    vtype.get(k) || {});
  let n = 0;
  for(const k of carriedVars()){
    const kinds = recordedKinds(k);
    if(kinds.length && !vKinds(k).length){
      const v = vv(k); v.kinds = kinds; v.name = varName(k); v.at = today;
      vtype.set(k, v); PASS.set.set("k:" + k, {who:"corpus", v:kinds.join(",")}); n++;
    }
    if(looksLikeDifference(k) && !vAspects(k).length){
      const v = vv(k); v.aspects = ["difference"]; v.name = varName(k); v.at = today;
      vtype.set(k, v); PASS.set.set("a:" + k, {who:"corpus", v:"difference"}); n++;
    }
  }
  for(const r of carriedRelations()){
    const ps = statedProps(r);
    if(ps.length && !propsOf(r).length){
      const v = Object.assign(SPEC0(), spec.get(r.id) || {});
      v.props = ps; v.at = today;
      if(specSet(v)){ spec.set(r.id, v); spersist(r.id, v);
        PASS.set.set("p:" + r.id, {who:"corpus", v:ps.join(",")}); n++; }
    }
  }
  vsaveLocal();
  return n;
}

function passGaps(){
  const g = {kinds:[], aspects:[], roles:[], props:[]};
  for(const k of carriedVars()){
    if(!vKinds(k).length) g.kinds.push(k);
    if(!vAspects(k).length) g.aspects.push(k);
  }
  for(const r of carriedRelations()){
    if(!rolesOf(r).length) g.roles.push(r);
    if(!propsOf(r).length) g.props.push(r);
  }
  return g;
}
/* Only the gaps go to the model, with the ids it must answer in and what the
   corpus holds about each. Sending the whole model invites it to revise what is
   already settled. */
function passBrief(g){
  const L = [];
  if(g.roles.length){
    L.push("RELATIONS NEEDING A ROLE:");
    for(const r of g.roles)
      L.push(`  id=${r.id}   ${handName(r.from)} -> ${handName(r.to)}` +
        (propsOf(r).length ? `   shapes declared: ${propsOf(r).join(", ")}` : "") +
        `\n      ${mechDesc(r).replace(/\s+/g, " ").slice(0, 320)}`);
  }
  if(g.props.length){
    L.push("RELATIONS NEEDING A SHAPE CLASS:");
    for(const r of g.props)
      L.push(`  id=${r.id}   ${handName(r.from)} -> ${handName(r.to)}` +
        (rolesOf(r).length ? `   role declared: ${rolesOf(r).join(", ")}` : ""));
  }
  const q = [...new Set([...g.kinds, ...g.aspects])];
  if(q.length){
    L.push("QUANTITIES NEEDING A KIND OR AN ASPECT:");
    for(const k of q)
      L.push(`  id=${k}   "${handName(k)}"` +
        (vKinds(k).length ? `   kind declared: ${vKinds(k).join(", ")}` : "") +
        (vAspects(k).length ? `   aspect declared: ${vAspects(k).join(", ")}` : ""));
  }
  return L.join("\n").slice(0, 9000);
}

const PASSPROPS = VOCAB.properties;

/* Everything that comes back is checked against the id lists and the vocabulary
   before it is written, and what fails is counted rather than argued with. */
async function passAsk(cap, g){
  const q = AIQ.roles(g);
  const r = await cap.json(q, {modelTier:"complex", cache:false});
  provTake("roles", q, r);
  const okRole = new Set(ROLES.map(x => x[0])), okProp = new Set(PASSPROPS);
  const okKind = new Set(KINDS.map(x => x[0]));
  const byId = new Map(carriedRelations().map(x => [x.id, x]));
  const vars = new Set(carriedVars());
  const today = new Date().toISOString().slice(0, 10);
  let n = 0; PASS.refused = 0;
  for(const p of ((r && r.roles) || [])){
    const rel = byId.get(String((p && p.rel) || ""));
    if(!rel){ PASS.refused++; continue; }
    const v = Object.assign(SPEC0(), spec.get(rel.id) || {});
    let touched = false;
    const role = String(p.role || "");
    if(role && !okRole.has(role)) PASS.refused++;
    else if(role && !rolesOf(rel).length){
      v.roles = [role]; touched = true;
      PASS.set.set("r:" + rel.id, {who:"claude", v:role,
        why:String(p.why || "").replace(/\s+/g, " ").slice(0, 220)});
    }
    const ps = (Array.isArray(p.props) ? p.props : []).map(String).filter(x => okProp.has(x));
    if(ps.length && !propsOf(rel).length){
      v.props = ps; touched = true;
      PASS.set.set("p:" + rel.id, {who:"claude", v:ps.join(",")});
    }
    if(touched){ v.at = today;
      if(specSet(v)){ spec.set(rel.id, v); spersist(rel.id, v); n++; } }
  }
  for(const p of ((r && r.quantities) || [])){
    const k = String((p && p.var) || "");
    if(!vars.has(k)){ PASS.refused++; continue; }
    const kinds = (Array.isArray(p.kinds) ? p.kinds : []).map(String).filter(x => okKind.has(x));
    const asp = String(p.aspect || "");
    const v = Object.assign({id:k, name:varName(k), kinds:[], aspects:[], lo:0, hi:1},
      vtype.get(k) || {});
    let touched = false;
    if(kinds.length && !vKinds(k).length){
      v.kinds = kinds; touched = true;
      PASS.set.set("k:" + k, {who:"claude", v:kinds.join(",")});
    }
    if((asp === "level" || asp === "difference") && !vAspects(k).length){
      v.aspects = [asp]; touched = true;
      PASS.set.set("a:" + k, {who:"claude", v:asp});
    }
    if(touched){ v.name = varName(k); v.at = today; vtype.set(k, v); n++; }
  }
  vsaveLocal();
  return n;
}

/* The composition prompt was written and nothing ever called it: AIQ.comp had
   no button anywhere on the page. This is its first caller. */
async function passCompose(cap){
  const q = AIQ.comp();
  const r = await cap.json(q, {modelTier:"complex", cache:false});
  provTake("comp", q, r);
  const ok = new Set(COMPOSITIONS.map(x => x[0]));
  const byName = new Map(outcomeVars().map(k => [varName(k), k]));
  const today = new Date().toISOString().slice(0, 10);
  let n = 0;
  for(const p of ((r && r.proposals) || [])){
    const k = byName.get(String((p && p.outcome) || ""));
    if(!k || rulesOf(k).length) continue;
    const rules = (Array.isArray(p.rules) ? p.rules : []).map(String).filter(x => ok.has(x));
    if(!rules.length) continue;
    compo.set(k, {id:k, rules, at:today});
    PASS.set.set("c:" + k, {who:"claude", v:rules.join(",")});
    n++;
  }
  if(n) csaveLocal2();
  return n;
}

/* The one thing a pass accepts on your behalf, and the only one it could: the
   arithmetic is parsed by the page's own grammar, run over the declared box and
   held to the invariants the declarations earned BEFORE it gets here. Keeping it
   is what lets the pass go on and derive; dropping it is one button. */
async function passWrite(cap){
  const q = AIQ.arith();
  const r = await cap.json(q, {modelTier:"complex", cache:false});
  provTake("arith", q, r);
  takeArith(r);
  if(!ARITH.prop) return 0;
  arithKeep();
  return 1;
}

async function passRun(){
  if(PASS.busy) return;
  if(PASS.depth === "manual"){
    PASS.err = "the dial is on manual, so nothing was proposed"; passPaint(); return; }
  const t0 = Date.now(), did = [];
  PASS.err = ""; PASS.refused = 0;
  try{
    PASS.busy = "reading the corpus"; passPaint();
    const nc = passDeclareFromCorpus();
    did.push(nc + " from the corpus");
    const g = passGaps();
    const left = g.roles.length + g.props.length + g.kinds.length + g.aspects.length;
    if(left){
      const cap = await aiCap();
      if(!cap) did.push(left + " left open, no model available here");
      else {
        PASS.busy = "asking for the rest"; passPaint();
        const na = await passAsk(cap, g);
        did.push(na + " proposed" + (PASS.refused ? ", " + PASS.refused + " refused" : ""));
      }
    }
    if(PASS.depth === "run"){
      const cap = await aiCap();
      if(!cap) did.push("stopped before the arithmetic, no model available here");
      else {
        if(outcomeVars().some(k => !rulesOf(k).length)){
          PASS.busy = "composing"; passPaint();
          did.push((await passCompose(cap)) + " combination rules");
        }
        PASS.busy = "writing the arithmetic"; passPaint();
        const w = await passWrite(cap);
        did.push(w ? "arithmetic written, run and kept" : "the arithmetic came back unusable");
        if(w){
          PASS.busy = "deriving"; passPaint();
          try{ bufSeed(); }catch(e){ PASS.err = "the buffer could not be seeded"; }
          did.push(BUF.lines.length + " lines on the list");
        }
      }
    }
  }catch(e){
    PASS.err = (e && e.code) ? String(e.code).replace(/_/g, " ")
      : String((e && e.message) || "the pass could not finish");
  }
  PASS.busy = "";
  PASS.log.push({n:PASS.log.length + 1, depth:PASS.depth, did,
    at:new Date().toTimeString().slice(0, 5), ms:Date.now() - t0});
  xlog("pass", "Pass " + PASS.log.length + " — " + PASS.depth, did.join(", "));
  passPaint();
}

/* Reversible as a set, which is the other half of "not a decision until you
   accept it". A choice you have since changed is yours and is left alone. */
function passClear(){
  const today = new Date().toISOString().slice(0, 10);
  let n = 0;
  for(const key of [...PASS.set.keys()]){
    if(passWho(key) === "hand"){ PASS.set.delete(key); continue; }
    const t = key.slice(0, 1), id = key.slice(2);
    if(t === "k" || t === "a"){
      const v = vtype.get(id);
      if(v){
        if(t === "k") v.kinds = []; else v.aspects = [];
        if(!(v.kinds || []).length && !(v.aspects || []).length &&
           +v.lo === 0 && +v.hi === 1) vtype.delete(id);
        else { v.at = today; vtype.set(id, v); }
        n++;
      }
    } else if(t === "r" || t === "p"){
      const v = spec.get(id);
      if(v){
        if(t === "r"){ v.roles = []; v.role = ""; } else v.props = [];
        if(specSet(v)){ v.at = today; spec.set(id, v); spersist(id, v); }
        else { spec.delete(id); sforget(id); }
        n++;
      }
    } else if(t === "c"){ compo.delete(id); n++; }
    PASS.set.delete(key);
  }
  vsaveLocal(); csaveLocal2();
  PASS.log.push({n:PASS.log.length + 1, depth:"clear",
    did:[n + " proposed choice" + (n === 1 ? "" : "s") + " removed; anything you had changed was left"],
    at:new Date().toTimeString().slice(0, 5), ms:0});
  xlog("clear", "Cleared what the pass proposed",
    n + " choice" + (n === 1 ? "" : "s") + " back to open; anything changed by hand was left");
  passPaint();
}

function passBarHTML(){
  const t = passTally();
  const a = ARITH.kept, stale = !!(a && a.sig && a.sig !== arithSig());
  const bits = [];
  if(t.corpus) bits.push(`<b>${t.corpus}</b> from the corpus`);
  if(t.claude) bits.push(`<b>${t.claude}</b> proposed`);
  if(t.hand)   bits.push(`<b>${t.hand}</b> yours`);
  if(t.open)   bits.push(`<b>${t.open}</b> still open`);
  const last = PASS.log[PASS.log.length - 1];
  /* "Run the phase" names nothing a reader can act on: somebody looking for
     a button to fill everything in would not recognise it, which is the same
     failure "run them" has. It says what it will do, and what that is depends on the dial beside it. */
  const GOLAB = {manual:"Nothing will be proposed",
    propose:"Fill in the declarations",
    run:"Fill in, close and derive"};
  return `<div class="litbar passbar">
    <label class="scenlab" for="passDepth">Fill it in for me</label>
    <select id="passDepth" aria-label="How far an automatic pass should go">
      ${PASSDEPTH.map(([k, lab]) => `<option value="${k}"${
        PASS.depth === k ? " selected" : ""}>${lab}</option>`).join("")}
    </select>
    <button type="button" class="tabbtn" id="passGo"${
      PASS.busy || PASS.depth === "manual" ? " disabled" : ""}
      title="${hesc("Reads every declaration the corpus already settles -- the scale and the "
        + "stock-or-flow behind each quantity, the shape a paper committed to where one did -- "
        + "and then asks a model only for what is left. Nothing it chooses is a decision until "
        + "you accept it: every proposal is checked against the declared ids and the closed "
        + "vocabularies first, what fails is counted rather than written, and the record says "
        + "which of the two of you chose each one." + AITIP)}">${aiMark()}${
      PASS.busy ? hesc(PASS.busy) + "…" : GOLAB[PASS.depth] || "Fill in the declarations"}</button>
    ${PASS.set.size ? `<button type="button" class="tabbtn" id="passClear"${
      PASS.busy ? " disabled" : ""}>Clear what it proposed</button>` : ""}
    ${PASS.log.length ? `<span class="passn">pass ${PASS.log.length}</span>` : ""}
    <span class="litwhy" title="${hesc(
      "Nothing a pass chooses is a decision until you accept it, and clearing takes back only " +
      "what you have not touched since. Everything it proposes is checked against the declared " +
      "ids and vocabularies first, and what fails is counted rather than written. At `run` it " +
      "also keeps the arithmetic, which is the one thing on this step the page verifies in " +
      "full: parsed by the grammar, run over the declared box, held to the invariants the " +
      "declarations earned.")}"><b>${t.n}</b> declaration${t.n === 1 ? "" : "s"}${
      bits.length ? " — " + bits.join(" — ") : ""}${
      t.unver ? ` — <b class="warn">${t.unver} unverifiable</b>` : ""}.${
      stale ? ` <b class="warn">Arithmetic stale.</b>` : ""}${
      last ? ` <span class="passlast">Pass ${last.n}: ${hesc(last.did.join(", "))}.</span>` : ""}${
      PASS.err ? ` <b class="warn">${hesc(PASS.err)}</b>` : ""}</span>
  </div>`;
}

function wirePassBar(root){
  const sel = root.querySelector("#passDepth");
  if(sel) sel.addEventListener("change", () => { PASS.depth = sel.value; passPaint(); });
  const go = root.querySelector("#passGo");
  if(go) go.addEventListener("click", ev => { ev.preventDefault(); passRun(); });
  const cl = root.querySelector("#passClear");
  if(cl) cl.addEventListener("click", ev => { ev.preventDefault(); passClear(); });
}

/* ------------------------------- the exploring phase, recorded and guided */
/* This block has a history the others do not: it is the one you go round. What
   it has done, and what it is waiting on, belong BESIDE it rather than in it,
   which is why this is a column and not another control on a step.

   The suggestions are COMPUTED and pushed, not asked for. Each one is a fact
   about the state with a move attached, so the same state always yields the same
   advice and somebody re-running this gets the list we got.

   They are gated by the chain. The first step of the block that is not finished
   is the last one anything is suggested for — telling a scholar to derive from
   an arithmetic they have not written is noise in a confident voice, and this
   page's whole argument is that the order of the steps is load-bearing. Claude
   can add to the list, and what comes back is put through the SAME gate before
   it is shown: a proposal about a step you cannot act on yet is dropped, not
   displayed with a caveat. */
const XLOG = [];
function xlog(kind, text, detail){
  XLOG.push({n:XLOG.length + 1, kind, text:String(text),
    detail:String(detail || ""), at:new Date().toTimeString().slice(0, 5),
    stage:state.stage});
  if(XLOG.length > 240) XLOG.shift();
}
const GUIDE = {moves:null, busy:false, err:"", open:false};

/* nextMoves() WAS HERE and it is gone, with the twenty-odd items it carried.

   It was not smart enough, and what it proposed was mostly tasks. The
   diagnosis is that almost every item named a button that was already on the
   screen -- "nothing is derived yet" beside the Derive button, "nothing is
   ranked yet" beside Score -- so the list got LESS useful every time the
   interface got better, which is the signature of advice that is really a
   checklist. The rule now is that if a button on the step does it, it is not
   a suggestion, and what survives that rule is in page/19-review.js: what
   contradicts something else, what was defaulted silently, and what the
   findings rest on. */

/* The whole chain, not the step somebody is on. A decision taken at step 1.2 is
   what a conclusion at step 3.2 rests on, so a reader given only the exploring
   phase cannot see the thing most worth saying. */
function guideBrief(gate){
  const L = [];
  // computation inside a render: no tally means the brief leaves that line out
  let t = null; try{ t = passTally(); }catch(e){ noteFail("the pass tally", e); }
  const N = lastView.nodes || [], E = lastView.links || [];
  L.push(`SCOPE: ${lastView.papersIn} of 52 papers, ${state.jr.size} of ${JALL.size} outlets, ` +
    `tradition "${state.ap}", a construct drawn at ${state.minp}+ papers.`);
  L.push(`CONSTRUCTS: ${N.length} drawn, ${N.filter(x => x.carried).length} carried, ` +
    `${groups.size} merged by hand (the slider is at ${state.tight}).`);
  L.push(`RELATIONSHIPS: ${E.length} arrows, ${E.filter(x => x.carried).length} carried, ` +
    `${lastView.corrob3 != null ? lastView.corrob3 : "?"} corroborated by more than one paper.`);
  L.push(`FROM ELSEWHERE: ${state.msel.size} relations carried off the imported model, ` +
    `${mclm.size} relationships and ${mcon.size} constructs added by hand.`);
  if(t) L.push(`DECLARATIONS: ${t.n} in all — ${t.corpus} from the corpus, ${t.claude} proposed, ` +
    `${t.hand} by hand, ${t.open} still open. ${t.unver} are roles nothing can check.`);
  const A = ARITH.kept;
  L.push(`ARITHMETIC: ${A ? A.lines.length + " lines kept" +
    (A.sig && A.sig !== arithSig() ? ", STALE against the declarations" : "") +
    (A.run ? `, holding ${A.run.pass} of ${A.run.pass + A.run.fail} invariants` : "")
    : "not written"}.`);
  L.push(`DERIVATION: ${BUF.lines.length} lines, ${BUF.lines.filter(x => x.res).length} signed, ` +
    `${BUF.lines.filter(x => x.stated).length} stated, ` +
    `${new Set(BUF.lines.filter(x => x.corner).map(x => x.corner)).size} corners still crossing.`);
  L.push(`DEPOSIT: 0 of ${DEPOSIT.length} decisions taken.`);
  if(XLOG.length){
    L.push("WHAT HAS HAPPENED, oldest first:");
    for(const e of XLOG.slice(-26))
      L.push(`  ${e.at}  ${e.text}${e.detail ? " — " + e.detail : ""}`);
  }
  return L.join("\n").slice(0, 7000);
}


/* --------------------------------------------- a result, as something reusable */
/* The cumulativeness argument, made literal. Propositions left this page as
   LaTeX, SymPy and Mathematica: three ways of handing a finding to a human or
   to a solver, and no way of handing it back to a curation. So a result that
   took a corpus, a set of declarations and an arithmetic to produce could only
   ever be read, never carried.

   Two objects come out of it now, and the pair is the point.

   `amg-result` is the finding with everything a reader needs to weigh it: the
   sentence, the box the proof ran over, WHICH of those ranges somebody actually
   declared, the method that settled it, the region if sampling found one, and
   the mechanisms it rests on. Written against schema/result.schema.json.

   A CLAIM RECORD in the corpus's own columns is the other half, and it is the
   one that closes the loop: `epistemic_status: derived` is already a value that
   schema carries — 98 claims in the pilot have it — so a proposition this
   bench derives can re-enter as an input to the next curation without anything
   being invented for it. The `quote` column is left empty on purpose: a quote is
   a verbatim span from a paper, a derived claim has none, and filling it with
   the sentence would make a derivation look like a reading. */
function resultOf(l, n){
  if(!l || !l.res || !l.y || !l.x) return null;
  const box = {};
  for(const k of Object.keys(l.bx || {})) box[k] = (l.bx[k] || []).slice();
  const declared = carriedVars().filter(k => bdec(k) && box[varName(k)]).map(varName);
  const kind = l.sim ? (l.res ? "exact+sampled" : "sampled") : "exact";
  const o = {
    format:"amg-result", v:1, id:"r" + n,
    sentence:propClause(l),
    outcome:l.y, parameter:l.x,
    direction:l.res.dir > 0 ? "up" : "down",
    verdict:l.res.verdict, share:+(l.res.share || 0).toFixed(6),
    scope:{box, declared},
    method:{kind, boxes:l.res.boxes || 0},
    rests_on:{mechanisms:[]}
  };
  if(l.sim){ o.method.draws = l.sim.draws; o.method.corners = l.sim.corners; }
  if(l.stoch){ o.method.error_sd = l.stoch.sd; o.method.holds = +l.stoch.share.toFixed(6); }
  if(l.where && !l.where.none) o.scope.region = {
    cuts:(l.where.cuts || []).map(c => Object.assign({name:c.v},
      c.lo != null ? {lo:+c.lo.toFixed(6)} : {}, c.hi != null ? {hi:+c.hi.toFixed(6)} : {})),
    rate:+l.where.rate.toFixed(6), base:+l.where.base.toFixed(6),
    volume:+l.where.vol.toFixed(6), read_off:l.where.n};
  if(l.rests && !l.rests.err){
    o.rests_on.mechanisms = l.rests.used.map(u => u.lhs);
    o.rests_on.idle = l.rests.idle.map(u => u.lhs);
    if(l.rests.rule && l.rests.rule.live) o.rests_on.combination_rule = (l.rests.rule.rules || [])[0] || "";
  }
  if(l.res.witness) o.witness = l.res.witness;
  const cur = (typeof scenCur === "function" ? scenCur() : null) || {};
  /* AND WHICH REGISTRY OF FORMS. A conclusion read against the declared class
     was read against a particular fifteen member expressions, and a reader
     comparing two results needs to know whether they were the same fifteen. */
  o.provenance = {bench:BENCH.v, corpus:(CORPUS && CORPUS.commit) || "",
    scenario:cur.name || "", round:ROUNDS.length, forms:formsTag(),
    at:new Date().toISOString()};
  return o;
}
/* WHAT THE BOARD STANDS BEHIND, which is not the same as what was signed.

   `stated` is set two ways: putting a proposition on the board sets it, and
   the automatic pass sets it on every derivative it signs, board or no board.
   Setting a row aside then flips `keep` and leaves `stated` alone, so the
   results export and the derived-claims file went on writing a finding
   somebody had explicitly withdrawn -- and wrote the whole automatic pass
   whether or not anybody had stood behind any of it.

   One predicate answers for the plates on step 4.1 and for both exports, so
   the step and the file it writes cannot disagree about which set they mean.
   Before anything is kept there is nothing to filter by, and an empty export
   would be the worse error, so the signed ones stand in. */
const boardStands = () => BOARD.rows.some(r => r.keep);
const stands = (y, x) => !boardStands() ||
  BOARD.rows.some(r => r.keep && r.y === y && r.x === x);
const statedLines = () => BUF.lines.filter(l =>
  l.stated && l.res && l.y && l.x && stands(l.y, l.x));
function resultsFile(){
  const rs = statedLines().map((l, i) => resultOf(l, i + 1)).filter(Boolean);
  return JSON.stringify({format:"amg-results", v:1, bench:BENCH, corpus:CORPUS,
    at:new Date().toISOString(), results:rs}, null, 1);
}
/* The corpus's own columns, in its own order, so the file drops into
   `index/claims.tsv` beside what was read off papers. */
const CLAIMCOLS = ["claim", "paper", "label", "antecedent", "consequent", "sign",
  "epistemic_status", "shape", "shape_basis", "scope", "effect", "moderators",
  "status", "quote"];
function derivedClaims(){
  const cur = ((typeof scenCur === "function" ? scenCur() : null) || {}).name || "project";
  const slug = cur.replace(/[^\w]+/g, "-").toLowerCase();
  const L = stampLines().concat(["#",
    "# Propositions this bench derived, in the columns index/claims.tsv uses, so",
    "# a result can re-enter a curation as an input. epistemic_status is `derived`",
    "# for all of them, which that schema already carries. `quote` is EMPTY: a",
    "# quote is a verbatim span from a paper and a derived relationship has none.",
    "#", CLAIMCOLS.join("\t")]);
  statedLines().forEach((l, i) => {
    const o = resultOf(l, i + 1);
    const bx = o.scope.box[o.parameter] || [];
    const reg = o.scope.region && o.scope.region.cuts.length
      ? "; holds where " + o.scope.region.cuts.map(c => c.name +
          (c.lo != null ? " >= " + c.lo : "") + (c.hi != null ? " <= " + c.hi : "")).join(" and ")
      : "";
    L.push([
      `${slug}#derived-${i + 1}`,
      `bench:${slug}`,
      o.sentence,
      o.parameter, o.outcome,
      o.direction === "up" ? "positive" : "negative",
      "derived",
      "unspecified", "derived",
      (bx.length ? `${o.parameter} in [${bx[0]}, ${bx[1]}]` : "unstated") +
        (o.scope.declared.includes(o.parameter) ? "" : " (range not declared)") + reg,
      "unspecified", "", "live", ""
    ].join("\t"));
  });
  return L.join("\n") + "\n";
}

/* ------------------------------------------- where it holds, read off the draws */
/* A share is not a scope condition. "It holds in 76% of runs" tells a reader
   that something is going on and not where, and the one thing this bench says
   it produces is a proposition WITH its region. The exact method gets that for
   free: branch and bound returns boxes. Sampling and error did not, and were
   reporting a number where the other method reports a place.

   So: peel the box. Take the draws, shave a small slice off whichever face most
   raises the share among what is left, and keep going until shaving costs more
   support than it buys — Friedman and Fisher's patient rule induction, which
   is what scenario discovery is built on, in about forty lines because the only
   output needed is one box.

   It is read off draws, so it is evidence like the draws are. The page says
   `where` and never `only where`: a region found this way is where the sampling
   looked and agreed, not a proved boundary. */
const PRIMCAP = 4000;
function primBox(pts, box, floor){
  const vs = Object.keys(box).filter(v => box[v] && box[v][1] > box[v][0]);
  if(!pts || pts.length < 30 || !vs.length) return null;
  const N = pts.length, alpha = 0.06, minSup = floor == null ? 0.18 : floor;
  const rate = a => a.length ? a.filter(z => z.ok).length / a.length : 0;
  let cur = {}; vs.forEach(v => cur[v] = box[v].slice());
  let live = pts.slice();
  const base = rate(live);
  let best = {b:cur, rate:base, sup:1, peels:0};
  const inside = (p, b) => vs.every(v =>
    p[v] >= b[v][0] - 1e-12 && p[v] <= b[v][1] + 1e-12);
  for(let it = 0; it < 120; it++){
    if(live.length / N <= minSup) break;
    let pick = null;
    for(const v of vs) for(const side of [0, 1]){
      const col = live.map(z => z.p[v]).sort((a, c) => a - c);
      const q = side === 0 ? col[Math.floor(col.length * alpha)]
                           : col[Math.max(0, Math.ceil(col.length * (1 - alpha)) - 1)];
      if(q == null) continue;
      const b2 = {}; vs.forEach(k => b2[k] = cur[k].slice());
      if(side === 0) b2[v][0] = q; else b2[v][1] = q;
      if(!(b2[v][1] > b2[v][0])) continue;
      const kept = live.filter(z => inside(z.p, b2));
      if(!kept.length || kept.length === live.length || kept.length / N <= minSup) continue;
      const r = rate(kept);
      if(!pick || r > pick.r) pick = {b2, kept, r, v, side};
    }
    if(!pick || pick.r <= rate(live) + 1e-9) break;
    cur = pick.b2; live = pick.kept;
    if(pick.r > best.rate + 1e-9)
      best = {b:cur, rate:pick.r, sup:live.length / N, peels:it + 1};
    if(pick.r >= 0.9995) break;
  }
  /* A BOX THAT BARELY BEATS THE WHOLE RANGE IS NOISE, and reporting it as a
     scope condition is the exact charge laid against scenario discovery. The
     first run of this found "holds where purpose clarity factor <= 0.68" at
     62.6% against a base of 59.3% -- three points, off a peel that could have
     gone either way. So a box has to earn its place by a margin, and where it
     cannot the page says the claim fails diffusely, which is itself worth
     knowing: what breaks it is not a parameter being high or low. */
  const LIFT = 0.06;
  if(!best.peels || best.rate < base + LIFT)
    return {none:true, rate:base, best:best.rate, lift:LIFT};
  /* How much of the declared space the box covers, which is what says whether a
     region is a finding or a sliver. */
  let vol = 1;
  for(const v of vs) vol *= (best.b[v][1] - best.b[v][0]) / (box[v][1] - box[v][0]);
  /* Only the faces that actually moved are worth saying. */
  const cuts = [];
  for(const v of vs){
    const lo = best.b[v][0] > box[v][0] + 1e-9, hi = best.b[v][1] < box[v][1] - 1e-9;
    if(lo || hi) cuts.push({v, lo:lo ? best.b[v][0] : null, hi:hi ? best.b[v][1] : null});
  }
  return {b:best.b, rate:best.rate, sup:best.sup, vol, cuts, base, n:N, peels:best.peels};
}
function whereText(w){
  if(!w) return "";
  if(w.none) return `<b>no region worth reporting.</b> It holds in ${
    (w.rate * 100).toFixed(1)}% of draws across the whole range, and the best box found${
    w.best != null && w.best > w.rate ? ` reaches only ${(w.best * 100).toFixed(1)}%` : ""} —
    under the ${((w.lift || 0.06) * 100).toFixed(0)}-point margin a box has to earn. The relationship
    fails <i>diffusely</i>, which is itself worth knowing: what breaks it is not a parameter
    being high or low.`;
  const say = c => `<b>${hesc(readName(c.v))}</b>` +
    (c.lo != null && c.hi != null ? ` between ${c.lo.toFixed(2)} and ${c.hi.toFixed(2)}`
     : c.lo != null ? ` ≥ ${c.lo.toFixed(2)}` : ` ≤ ${c.hi.toFixed(2)}`);
  return `holds where ${w.cuts.map(say).join(" and ")} — <b>${
    (w.rate * 100).toFixed(1)}%</b> of the draws in there, against ${
    (w.base * 100).toFixed(1)}% over the whole range, and that region is <b>${
    (w.vol * 100).toFixed(0)}%</b> of the space you declared. Read off ${w.n} draws, so it is
    where the sampling looked and agreed — not a proved boundary.`;
}

/* ------------------------------------- the third method: idiosyncratic error */
/* McKelvey's phrase is the proposal's epigraph — organizational phenomena
   exhibit STOCHASTIC IDIOSYNCRASY — and nothing on this bench had any
   randomness in it at all. Both methods so far ask about a clean model: one
   proves a sign over a box, the other samples that box. Neither asks the
   question a management scholar actually faces, which is whether the finding
   survives being measured on firms that differ for reasons the model does not
   carry.

   So: perturb every quantity by an idiosyncratic error and ask how often the
   claim still holds. What comes back is not a verdict and not evidence of one.
   It is a DEGREE OF CERTAINTY, which is the third thing a reader needs and the
   one the draft asks for by name.

   The size of that error is a DECLARATION like any other on this bench, and
   until somebody makes it the page says the number is its own and not theirs.
   A default dressed as a finding is the failure this whole chain exists to
   stop. */
const NOISE = {sd:0.05, draws:400, dec:false, seed:20261023};
/* Every draw on this page is seeded. Two readings of the same proposition
   that disagree because the sampler was somewhere else that time are a
   verdict nobody can check, and this is the one surface where the page was
   still calling Math.random: the sampled sign and the idiosyncratic-error
   test both drew unseeded, so their verdicts moved between runs while every
   other draw stayed put. The seed is in NOISE, so it travels with the rest
   of the declaration and a reader can say which stream produced a number. */
/* Made on first use, not at load: alcg() lives in a script that loads after
   this one, and a top-level call to it killed this file at its first line --
   taking BOARD, the rounds and everything below with it. The same shape as
   the boot bug of 2026-10-23, and the reason the page renders itself after
   the last script rather than in the middle of them. */
let NRND = null;
const nreset = () => { NRND = alcg(NOISE.seed); };
const nrnd = () => { if(!NRND) nreset(); return NRND(); };
function gauss(){
  let u = 0, v = 0;
  while(u === 0) u = nrnd();
  while(v === 0) v = nrnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/* The outcome written out in free parameters is what gets evaluated, not the
   derivative: the question is whether y is still HIGHER at a higher x once
   everything has been knocked about, which is what a reader of the proposition
   would check. */
function stochHold(ftree, box, x, sd, draws){
  const vs = Object.keys(box);
  if(!box[x]) return null;
  const w = box[x][1] - box[x][0];
  if(!(w > 0)) return null;
  let hold = 0, n = 0, flat = 0;
  const pts = [];
  const at = (pt) => { let iv;
    try{ iv = ivalTree(ftree, pt); }catch(e){ return null; }
    return (iv && isFinite(iv[0]) && isFinite(iv[1])) ? (iv[0] + iv[1]) / 2 : null; };
  nreset();                      // the same draws every time this is asked
  for(let i = 0; i < draws; i++){
    const base = {};
    for(const v of vs) base[v] = box[v][0] + nrnd() * (box[v][1] - box[v][0]);
    const lo = box[x][0] + nrnd() * w * 0.9;
    const hi = Math.min(box[x][1], lo + w * 0.1);
    /* EVERYTHING BUT x. The claim is that y rises with x; the idiosyncrasy is
       in what the model does not carry, not in the variable being varied.
       Perturbing x as well destroys the contrast being tested, and at a five
       per cent error against a ten per cent step it destroyed most of it —
       the first run of this read 65.7% on a relation the prover had just proved
       monotone, which is a measurement of the test and not of the model. */
    const mk = xv => { const p = {};
      for(const v of vs){
        const r = box[v][1] - box[v][0];
        const c = v === x ? xv : base[v] + gauss() * sd * (r || 1);
        p[v] = [c, c];
      }
      return p; };
    const a = at(mk(lo)), b = at(mk(hi));
    if(a == null || b == null) continue;
    n++;
    if(b > a) hold++; else if(b === a) flat++;
    /* The point kept is the FIRM -- the base configuration everything else was
       drawn around -- because the question a region answers here is which firms
       the finding survives on. */
    if(pts.length < PRIMCAP) pts.push({p:Object.assign({}, base, {[x]:(lo + hi) / 2}), rose:b > a});
  }
  return {n, hold, flat, draws, sd, share:n ? hold / n : 0, pts};
}
function stochOf(l){
  if(!l || !l.x || !l.y) return null;
  const host = BUF.lines.find(z => z.cmd === "inline" && z.y === l.y && z.tree);
  if(!host) return {err:"the outcome is not written out in free parameters on this buffer"};
  const box = l.bx || (bufModel().box || {});
  const r = stochHold(host.tree, box, l.x, NOISE.sd, NOISE.draws);
  if(!r || !r.n) return {err:"nothing evaluated to a number under this much error"};
  /* The claim being tested is the one the exact pass made, so a line proved to
     FALL is held when the outcome falls. */
  const down = l.res && l.res.dir < 0;
  r.pts = r.pts.map(z => ({p:z.p, ok:down ? !z.rose : z.rose}));
  return Object.assign(r, {down, share:down ? 1 - r.share - r.flat / (r.n || 1) : r.share});
}

/* --------------------------------- the second method, and why it earns a place */
/* Interval arithmetic is SOUND AND INCOMPLETE. It never lies and it can shrug,
   and the dependency problem — a bound widened wherever a name occurs twice,
   which generated arithmetic does constantly — makes shrugging common. An
   undecided verdict is honest and it is also an answer nobody can publish.

   So a second method, and it is not here to make the first one easier. It is
   here because the two fail differently. Sampling cannot prove a sign; it can
   find the counter-example an enclosure was too wide to rule out, and it can
   say "no counter-example in two thousand draws" where the prover said nothing
   at all. Every corner of the box is tried before any random point, because a
   sign that only turns at a boundary is exactly the kind a draw misses.

   What makes the pair worth having is that each CHECKS the other, and the
   result carries a method tag so nobody has to remember which it was:
     exact and sampled agree        the ordinary case, and the sampling is
                                    evidence the prover was asked the right thing
     proved, but sampling disagrees a defect, and the page says so loudly
     undecided, sampling consistent what the hybrid is for: not a proof, and
                                    not nothing either */
const MTH = {how:"both", draws:2000};
const MTHS = [["exact", "prove it — exact, and it may shrug"],
              ["both",  "prove it and sample it — each checks the other"],
              ["sample","sample it — evidence, never proof"]];
function simSign(tree, box, draws){
  const vs = Object.keys(box);
  const corners = vs.length <= 8 ? (1 << vs.length) : 0;
  let pos = 0, neg = 0, zero = 0, bad = 0, firstPos = null, firstNeg = null;
  const pts = [];
  const total = corners + Math.max(0, draws);
  nreset();                      // and the same corners, then the same interior
  for(let i = 0; i < total; i++){
    const pt = {}, raw = {};
    vs.forEach((v, j) => {
      const t = i < corners ? ((i >> j) & 1) : nrnd();
      const x = box[v][0] + t * (box[v][1] - box[v][0]);
      pt[v] = [x, x]; raw[v] = x;
    });
    let iv; try{ iv = ivalTree(tree, pt); }catch(e){ bad++; continue; }
    if(!iv || !isFinite(iv[0]) || !isFinite(iv[1])){ bad++; continue; }
    const y = (iv[0] + iv[1]) / 2;
    if(y > 0){ pos++; if(!firstPos) firstPos = raw; }
    else if(y < 0){ neg++; if(!firstNeg) firstNeg = raw; }
    else zero++;
    /* The points are kept because a share is not a scope condition. Where a
       claim holds is a REGION, and a region can only be read back out of the
       draws that made the share. */
    if(pts.length < PRIMCAP) pts.push({p:raw, up:y > 0, flat:y === 0});
  }
  const n = pos + neg + zero;
  const dir = pos >= neg ? 1 : -1;
  const agree = dir > 0 ? pos : neg;
  /* A FLAT POINT IS NOT A COUNTER-EXAMPLE. Counting zeros as disagreement made
     a line the prover had just proved monotone read "Proved, and sampling
     disagrees" off four points where a saturating term is flat to machine
     precision -- the loudest message on the page, fired at nothing. A sign
     CHANGE needs both signs present; zeros are reported in their own column. */
  const turned = pos > 0 && neg > 0;
  /* The minority point IS the counter-example, whichever way the majority
     turned out, so it is the one worth keeping. */
  const wit = turned ? (dir > 0 ? firstNeg : firstPos) : null;
  return {n, pos, neg, zero, bad, dir, corners, draws:total,
    share:n ? agree / n : 0,
    verdict:!n ? "nothing evaluated" : (turned ? "mixed" : "consistent"),
    witness:wit, pts:pts.map(z => ({p:z.p, ok:(dir > 0 ? z.up : (!z.up && !z.flat))}))};
}
/* The two readings on one line, and what their disagreement means. */
function mthCross(l){
  if(!l || !l.sim) return null;
  const s = l.sim, e = l.res;
  if(!e) return {k:"only", t:`<b>${s.verdict === "consistent"
    ? "no counter-example" : "a sign change"}</b> in ${s.draws} draws, ${
    s.corners} of them corners — evidence, not proof`};
  if(e.verdict === "proved" && s.verdict === "mixed")
    return {k:"bad", t:`<b>Proved, and sampling disagrees.</b> ${s.pos} up and ${s.neg} down
      over ${s.draws} draws. One of the two is wrong and it matters which — do not carry
      this line until it is settled.`};
  if(e.verdict === "proved")
    return {k:"ok", t:`proved, and ${s.draws} draws agree — no counter-example at any corner` +
      (s.zero ? `, ${s.zero} of them flat` : "")};
  if(e.verdict === "undecided" && s.verdict === "consistent")
    return {k:"res", t:`the prover could not settle this; <b>${s.draws} draws found no
      counter-example</b>, ${s.corners} of them corners. Evidence, not proof — and more
      than the enclosure could say.`};
  if(s.verdict === "mixed")
    return {k:"ok", t:`sampling finds the sign turning too: ${s.pos} up, ${s.neg} down over ${
      s.draws} draws`};
  return {k:"ok", t:`${s.draws} draws, ${(s.share * 100).toFixed(1)}% one way`};
}

/* ------------------------------------------------- the round, and what moved */
/* Five to seven is drawn as a loop and was not one. You could go back, change a
   declaration and derive again, and nothing anywhere noticed that a conclusion
   had just flipped — which is the whole reason the loop is drawn: a conclusion
   that fails names the declaration it depends on, and that declaration is on
   step 3.1.

   So every derivation closes a ROUND. What is kept is small and exact: the
   declarations as they stood, the arithmetic's signature, and each proposition
   with its verdict. Comparing two rounds then answers the question the loop
   exists to ask — I changed that, what moved? — which is also the only
   evidence this bench can offer for cumulativeness: a record of a model
   improving rather than an assertion that it would. */
const ROUNDS = [];
const DECLLAB = {k:"the kind of", a:"the aspect of", r:"the role of",
  p:"the shapes of", c:"the combination rule for", b:"the range of"};
function declLabel(key){
  const t = key.slice(0, 1), id = key.slice(2);
  if(t === "r" || t === "p"){
    const r = carriedRelations().find(x => x.id === id);
    return DECLLAB[t] + " " + (r ? handName(r.from) + " " + "→" + " " + handName(r.to) : id);
  }
  return (DECLLAB[t] || "") + " " + handName(id);
}
function declSnapshot(){
  const d = {};
  for(const key of passKeys()) d[key] = passValue(key);
  for(const k of outcomeVars()) d["c:" + k] = rulesOf(k).join(",");
  for(const k of carriedVars()){
    const b = abnd(k);
    d["b:" + k] = bdec(k) ? `[${b[0]}, ${b[1]}]` : "";
  }
  return d;
}
function roundDiff(a, b){
  const decl = [];
  for(const k of new Set([...Object.keys(a.decl), ...Object.keys(b.decl)])){
    const x = a.decl[k] || "", y = b.decl[k] || "";
    if(x !== y) decl.push({k, from:x, to:y});
  }
  const same = [], moved = [], gone = [], fresh = [];
  for(const k of Object.keys(b.props)){
    const p = a.props[k];
    if(!p) fresh.push(k);
    else if(p.v === b.props[k].v && p.dir === b.props[k].dir) same.push(k);
    else moved.push({k, from:p, to:b.props[k]});
  }
  for(const k of Object.keys(a.props)) if(!b.props[k]) gone.push(k);
  return {decl, same, moved, gone, fresh};
}
const roundLine = d => {
  const b = [];
  if(d.decl.length) b.push(d.decl.length + " declaration" + (d.decl.length === 1 ? "" : "s") + " changed");
  if(d.moved.length) b.push("<b>" + d.moved.length + " conclusion" +
    (d.moved.length === 1 ? "" : "s") + " moved</b>");
  if(d.fresh.length) b.push(d.fresh.length + " new");
  if(d.gone.length) b.push(d.gone.length + " gone");
  if(!d.moved.length && !d.fresh.length && !d.gone.length)
    b.push("nothing moved" + (d.decl.length ? " in spite of it" : ""));
  return b.join(" — ");
};
function roundTake(){
  const props = {};
  for(const p of ((PROPS.out && PROPS.out.props) || [])){
    if(p.err || !p.x) continue;
    props[p.y + " | " + p.x] = {v:p.verdict, dir:p.dir,
      share:Math.round((p.share || 0) * 1000) / 1000};
  }
  const r = {n:ROUNDS.length + 1, at:new Date().toTimeString().slice(0, 5),
    decl:declSnapshot(), props, lines:ARITH.kept ? ARITH.kept.lines.length : 0};
  ROUNDS.push(r);
  if(ROUNDS.length > 40) ROUNDS.shift();
  const d = ROUNDS.length > 1 ? roundDiff(ROUNDS[ROUNDS.length - 2], r) : null;
  xlog("round", "Round " + r.n + " closed",
    (d ? roundLine(d).replace(/<[^>]+>/g, "")
       : Object.keys(props).length + " propositions, the first round"));
  return r;
}
/* The rounds had their own map of the same five words. A round counts
   verdicts rather than showing one finding, so `turned` is not knowable here
   and a partial is reported as a partial -- which is the word core/verdict.js
   gives it when nothing says a counter-example was found. */
const vLab = v => vWord(v, false);
function roundsHTML(){
  if(!ROUNDS.length) return "";
  const cur = ROUNDS[ROUNDS.length - 1];
  const d = ROUNDS.length > 1 ? roundDiff(ROUNDS[ROUNDS.length - 2], cur) : null;
  const pn = k => { const [y, x] = k.split(" | ");
    return hesc(readName(y)) + " in " + hesc(readName(x)); };
  return `<details class="deet sect"${d && d.moved.length ? " open" : ""}>
     <summary>Rounds — <b>${ROUNDS.length}</b> through five to seven${
       d ? ", the last one: " + roundLine(d) : ", the first one"}</summary>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       ${!d ? `<p class="why">Round one: <b>${Object.keys(cur.props).length}</b> propositions
         off <b>${cur.lines}</b> lines of arithmetic. Change a declaration, derive again, and
         this says what moved.</p>` : `
       ${d.decl.length ? `<p class="why" style="margin-bottom:5px"><b>What you changed</b></p>
         <div class="chain">${d.decl.map(c => `<div class="crow">
           <span class="cst">changed</span>
           <span class="cnm">${hesc(declLabel(c.k))}</span>
           <span class="cwy"><code>${hesc(c.from || "open")}</code> → <code>${
             hesc(c.to || "open")}</code></span></div>`).join("")}</div>`
         : `<p class="why">No declaration changed between these two rounds.</p>`}
       ${d.moved.length ? `<p class="why" style="margin:9px 0 5px"><b>What moved</b></p>
         <div class="chain">${d.moved.map(m => `<div class="crow">
           <span class="cst ${m.to.v === "proved" ? "ok" : m.to.v === "partial" ? "part" : "gap"}">${
             vLab(m.to.v)}</span>
           <span class="cnm">${pn(m.k)}</span>
           <span class="cwy">was <b>${vLab(m.from.v)}</b>${
             m.from.dir !== m.to.dir ? ", and " + (m.to.dir > 0 ? "rising now, falling before"
               : "falling now, rising before") : ""}${
             m.from.v === "partial" || m.to.v === "partial"
               ? ` — ${(m.from.share * 100).toFixed(0)}% of the range to ${
                   (m.to.share * 100).toFixed(0)}%` : ""}</span></div>`).join("")}</div>`
         : ""}
       ${d.fresh.length || d.gone.length ? `<p class="why" style="margin-top:8px">${
         d.fresh.length ? `<b>${d.fresh.length}</b> new: ${d.fresh.map(pn).join(", ")}. ` : ""}${
         d.gone.length ? `<b>${d.gone.length}</b> no longer derived: ${
           d.gone.map(pn).join(", ")}.` : ""}</p>` : ""}
       ${d.same.length ? `<p class="why" style="margin-top:8px"><b>${d.same.length}</b> unchanged.
         A conclusion that survives a declaration moving is a different object from one that has
         only ever been derived once.</p>` : ""}`}
     </div>
   </details>`;
}

/* ------------------------ a proved line, as the sentence somebody would write */
/* Step 3.2's rows are expressions and verdicts: the form a formal modeller
   reads and nobody else does. What a formal modeller PUBLISHES is a proposition
   in words with its scope condition attached — "X raises Y, for every Z in
   this interval" — and every part of that sentence is already on the row: the
   quantity, the parameter, the direction, the share, the turning point and the
   box the proof ran over. Nothing here is new work. It is the same fact said in
   the language the finding is for.

   The scope travels with the sentence and is not a footnote on it. That is the
   whole of this bench's claim about propositions: a region is metadata in
   mathematics and half the finding here. */
function readName(n){
  const k = carriedVars().find(x => varName(x) === n);
  return k ? handName(k) : String(n).replace(/_/g, " ");
}
const pcs = x => (x == null ? "?" : (x * 100).toFixed(x > 0.995 || x < 0.005 ? 0 : 1) + "%");
/* ---- the board: what step 3.2 hands on -----------------------------------

   Step 3.2 carried three working surfaces -- the minimum effect, the
   derivation buffer, the candidate ranker -- and every one of them is
   overwritten by the next attempt. Nothing accumulated and nothing was phrased
   as an output, so a scholar who had derived six propositions over four rounds
   had six lines in a buffer and no list.

   The proposal says what the output is. `ActionModel-2.docx`, objective (i):
   "a reasoned, transparent, and accessible set of testable relationships and
   findings whose validity dimensions are measured and known", and (ii) "base
   actions in organizations with estimated degrees of veracity and
   predictability". So: a numbered set of propositions, each with the region it
   holds on and how sure that is. A list a scholar could put in a paper.

   And the expectation, recorded BEFORE the derivation. Two reasons it earns its
   four fields. It is the only way this bench can challenge rather than serve --
   a proposition that contradicts what the scholar expected is worth more than
   one that confirms it, and without the expectation on record there is nothing
   to contradict. And it makes the misses accumulate where they can be seen: a
   scholar who has been wrong four times about curvature should be told so.

   An expectation recorded after seeing the answer is worthless, so the field
   closes once a line is derived. The bench cannot stop anybody lying to
   themselves; it can decline to help. */
const BOARD = {rows:[], seq:0};
const GUESS = {};                              // "y|x" -> up | down | turns | none
const BOARDKEY = "purposeBoard", GUESSKEY = "purposeGuess";
function boardSave(){
  lsWrite(BOARDKEY, {rows:BOARD.rows, seq:BOARD.seq});
  lsWrite(GUESSKEY, GUESS);
}
function boardLoad(){
  const b = lsRead(BOARDKEY);
  if(b && Array.isArray(b.rows)){ BOARD.rows = b.rows; BOARD.seq = +b.seq || b.rows.length; }
  const g = lsRead(GUESSKEY);
  if(g) for(const k of Object.keys(g)) GUESS[k] = g[k];
}

const gkey = l => String(l && l.y) + "|" + String(l && l.x);
/* The expectation is answerable only while the answer is not on the page. */
const guessOpen = l => !!l && !l.res && !l.sim;

/* lineSays() and GUESSLAB are core/verdict.js now. They turned a
   verdict into a word, and the rules were in four files; every verdict
   defect this bench has had lived in that spread. */

/* Taking a line onto the board is a decision, so it is an act and not a
   side effect of deriving: the buffer is where you work and the board is what
   you would stand behind. One row per statement, replaced if you derive the
   same one again in a later round -- the newer verdict is the one that counts,
   and the round it moved in is kept so the change is legible. */
function boardTake(l){
  if(!l || !l.y || !l.x) return;
  const says = lineSays(l);
  const g = GUESS[gkey(l)] || "";
  const row = {
    id:"b" + (++BOARD.seq),
    y:l.y, x:l.x,
    /* A derived line gets its sentence built from its tree; a line that came
       back from somewhere else brought its own, and had it thrown away. */
    text:(propClause ? propClause(l) : "") || l.text || "",
    verdict:(l.res && l.res.verdict) || (l.sim ? "sampled" : ""),
    share:(l.res && typeof l.res.share === "number") ? l.res.share
      : (l.sim ? l.sim.share : null),
    open:(l.res && typeof l.res.open === "number") ? l.res.open : null,
    method:l.res ? "exact" : l.sim ? "sampled" : "",
    /* The one thing about a proposition that cannot be recomputed is where it
       came from. The board was dropping it, so a line returned from somebody
       else's tool arrived here looking exactly like one this page proved. */
    src:l.src || "auto",
    why:String(l.note || "").slice(0, 200),
    says, guess:g,
    agree:g && says ? (g === says) : null,
    round:ROUNDS.length,
    at:new Date().toISOString().slice(0, 16).replace("T", " "),
    /* WHICH ARITHMETIC IT WAS PROVED UNDER. Without this a retained finding
       outlives the model that produced it: declare a role, rewrite a line, and
       a derivative that the new body REFUSES goes on sitting on the board as
       proved, with nothing saying so. The kept body already carries a
       signature and xrunStale already compares one for a tally; the board was
       the one place that stated a verdict and never recorded what it was a
       verdict about. */
    sig:(typeof arithSig === "function" ? arithSig() : ""),
    keep:true,
  };
  /* WHAT CAME BACK FROM OUTSIDE, if anything has. Carried here rather than
     left on the buffer line, because the line is a working surface and the
     row is what travels in the scenario and the deposit. Copied in both
     directions -- `wsDataIn` writes it onto an existing row, and this catches
     the other order, where the result was recorded before the line was
     taken. */
  if(l.data) row.data = Object.assign({}, l.data);
  /* `stated` is already the flag that means "in the set step 4.1 plots and
     the exports write", so the board does not invent a second notion of the
     same thing -- putting a proposition on the board IS stating it. */
  l.stated = true;
  const i = BOARD.rows.findIndex(r => r.y === row.y && r.x === row.x);
  if(i >= 0){
    /* THE OLD TALLY DOES NOT SURVIVE THE NEW VERDICT. Re-taking a row merges
       the new fields over the old ones, which is right for everything except
       the class tally: that was computed against the body this row was proved
       under, and the body has just changed underneath it. Carrying it would
       put "3,125 of 3,125" beside a verdict reached over a class of 125. */
    const was = Object.assign({}, BOARD.rows[i]);
    if(!row.forms) delete was.forms;
    BOARD.rows[i] = Object.assign(was, row, {id:BOARD.rows[i].id});
  }
  else BOARD.rows.push(row);
  boardSave();
  xlog("board", "Put a proposition on the board",
    String(row.text || (row.y + " in " + row.x)).slice(0, 120) +
    (row.agree === false ? " \u2014 against what you expected" : ""));
}

/* A row whose arithmetic has moved under it. The verdict is NOT recomputed:
   what it said when it was taken is the record, and silently replacing it
   would lose the fact that it ever said anything else. */
const bstale = r => !!(r && r.sig && r.sig !== arithSig());

/* A ROW THE MODEL WILL NOT GIVE BACK, which is not the same as a stale one.

   `bstale` compares signatures: the arithmetic has been rewritten under the
   row. This is the other case, and it is worse because nothing flags it. The
   arithmetic is the one the row was proved under, and the automatic pass
   REFUSES the pair anyway -- a ceiling whose two branches cross inside the
   declared box has no single branch to differentiate, and widening a bound
   after the fact is enough to put one there.

   The shipped worked example has two. Both say `proved` on the board and both
   come back from the derivation as refused, with a message naming the two ways
   on. Found by the per-finding proof export: a certificate cannot be built for
   a verdict the page can no longer re-derive, and asking for one on every
   retained row is what turned the silence into a sentence.

   Free to compute: the automatic pass has already answered for every pair it
   walked, so this is a lookup and not a second derivation. The verdict is left
   as it was, because what it said is the record. */
const brefused = r => {
  if(!r || !r.y || !r.x || r.src === "tool") return "";
  const P = PROPS.out;
  if(!P || !P.props) return "";
  const p = P.props.find(z => z.y === r.y && (z.x || "") === r.x);
  return (p && p.err) ? String(p.err) : "";
};

const boardKept = () => BOARD.rows.filter(r => r.keep);
/* WHICH ROW IS BEING ANNOTATED. One at a time, and transient: a half-typed
   note is not a decision and nothing should remember it across a reload.

   Why a board row needs a note at all. Everything else on the row is computed
   -- the verdict, the share of the box, the share of the declared class, the
   round, what the scholar expected. What none of it carries is the reading: a
   sign proved over three quarters of the box with a threshold at 0.58 means
   something to the person who declared the box, and the method has no way to
   say what, so the scholar annotates the finding by hand.

   It is marked as the scholar's and never mixed into the computed text, which
   is the same rule the record keeps for an accepted proposal: the row says
   which of the two said it. */
let bannoing = "";
const bannoSet = v => { bannoing = String(v || ""); };
const bannoNow = () => bannoing;
/* The tally the scholar is meant to be shown about themselves. */
function guessTally(){
  const seen = BOARD.rows.filter(r => r.guess && r.guess !== "none" && r.agree !== null);
  return {n:seen.length, wrong:seen.filter(r => !r.agree).length};
}

/* THE VERDICT, AS THE PAGE DRAWS IT.
   ==========================================================================

   Five places drew the same five verdicts, each with its own words and its
   own colours. On the worked example one line was REGION in the derived list,
   TURNS among the retained findings and PARTIAL in the settled-share chart,
   on one step; undecided was drawn in red in two of them, on a page that
   says in its own words that undecided is a verdict and not a failure.

   The word is core/verdict.js's and so is the key the colour is chosen by.
   What is here is the markup: one filled badge, and beside it the region the
   verdict holds on, wherever a share exists. The chart on step 4.1 is the
   large version of the same thing.

   SETTLED, NOT PROVED. The bar is how much of the declared box the search
   decided, which is 1 minus the undecided share. For a proved or a partial
   line that is the same as the proved share; for a DISPROVED one it is not,
   because the share proved in the direction asked is near zero while the box
   is settled throughout. A bar reading the proved share would have drawn the
   most decisive verdict on the page as an empty one. */
function vdHTML(verdict, turned, share, open){
  const k = vKey(verdict, turned);
  const w = `<span class="vd ${k}">${hesc(vWord(verdict, turned))}</span>`;
  const set = typeof open === "number" ? 1 - open
    : typeof share === "number" ? share : null;
  if(set == null || !k) return w;
  const pc = Math.max(0, Math.min(100, set * 100));
  return `<span class="vdw">${w}<span class="vdbar" role="img"
    aria-label="${pc.toFixed(0)}% of the declared box settled, the rest undecided"
    ><i style="width:${pc.toFixed(2)}%"></i></span></span>`;
}

function boardHTML(){
  const R = BOARD.rows, T = guessTally();
  return `
   <div class="fld" style="flex:1 1 100%;max-width:none">
     <div class="embhd">
       <span class="ctl-label">The propositions ${infold(`The propositions this step hands on.`)}</span>
       <span class="pcount">${R.length
         ? `<b>${boardKept().length}</b> of ${R.length} kept${T.n
             ? ` \u00b7 <b>${T.wrong}</b> of ${T.n} against what you expected` : ""}`
         : "nothing on the board yet"}</span>
     </div>
     ${T.n ? `<p class="why"><b>Your expectations: ${T.wrong} of ${T.n} wrong.</b>
       ${T.wrong ? `Those are the ones worth reading twice \u2014 a derivation that confirms what
         you already thought has told you the model is consistent, not that the world is.`
         : `Nothing has contradicted you yet: either a good model or an incurious set of
         guesses.`}</p>` : ""}
     <div class="chain">${R.length ? R.map((r, i) => `<div class="crow prow${r.keep ? "" : " off"}">
       ${bstale(r) ? `<span class="cst gap" title="This was proved under an arithmetic this model no longer has. The verdict is left as it was rather than recomputed silently, because a number about a model you no longer hold is worth flagging rather than replacing.">stale</span>`
         : brefused(r) ? `<span class="cst gap" title="${hesc("The model will not give this back. " + brefused(r))}">refused now</span>`
         : r.verdict ? vdHTML(r.verdict, r.says === "turns", r.share, r.open)
         : `<span class="cst">no verdict</span>`}
       <span class="cnm"><b>P${i + 1}</b> ${hesc(r.text) || hesc(r.y + " in " + r.x)}<span class="cfl">${
         r.src && r.src !== "auto" && BSRC[r.src]
           ? `<b>${r.src === "ai" ? aiMark() : ""}${BSRC[r.src][0]}</b> \u00b7 ` : ""}${r.method}${r.share != null ? " \u00b7 " + (100 * r.share).toFixed(1) + "% of the box" : ""
         } \u00b7 round ${r.round} \u00b7 ${r.at}${r.guess
           ? " \u00b7 you said " + GUESSLAB[r.guess] : ""}${
         /* THE SECOND DIMENSION. What was proved, and over which box, was the
            whole of a row until step 4.1 could run the declared set. A row
            that has been read against the class carries the tally here, in
            the same words a result returned from another engine carries it,
            so the two can be read side by side. */
         r.forms && r.forms.of
           ? " \u00b7 " + xrunClause(r.forms, EXPSETS) +
             (xrunStale(r.forms, ARITH.kept && ARITH.kept.sig)
               ? ", against arithmetic since changed" : "")
           : ""}</span></span>
       <span class="pacts2">
         <button type="button" class="edbtn" data-bkeep="${hesc(r.id)}">${
           r.keep ? "Set aside" : "Stand behind"}</button>
         <button type="button" class="edbtn" data-bnote="${hesc(r.id)}">${
           bannoing === r.id ? "Close" : r.anno ? "Edit note" : "Note"}</button>
         <!-- ONE FINDING, WITH ITS PROOF, as a file somebody else could check.
              The format is page/23-exchange.js and schema/proof.schema.json.
              It is RE-PROVED at export rather than read off this row: the row
              records what the verdict said when it was taken, and the
              certificate for it was thrown away at the time. So the file
              carries a fresh certificate and says whether it agrees with the
              row, which is how a reader learns the model has moved. -->
         <button type="button" class="edbtn" data-bproof="${hesc(r.id)}"
           title="The finding, its expression, the box it was proved over, the enclosure at each corner the search split, the declared class and the share that agreed, and the provenance of every declaration underneath it. Proved again as it is written, so the file says whether the verdict still holds.">Export with its proof</button>
       </span>
       <span class="cwy">${r.agree === false
         ? `<b class="dispm">Against what you expected</b> — you said it would ${
             GUESSLAB[r.guess]} and it ${GUESSLAB[r.says] || "did not settle"}. That is the
             finding, not the failure.`
         : r.agree === true
           ? "As you expected \u2014 which says the model is consistent, not that the world is."
           : "No expectation was recorded before this was derived."}${
         bannoing === r.id ? `
         <span class="bannoed">
           <textarea class="defbox" data-bnotebox="${hesc(r.id)}" rows="3"
             placeholder="What this means, in your words. It travels with the project and is marked as yours."
             aria-label="Your note on this proposition">${hesc(r.anno || "")}</textarea>
           <span class="cmpacts" style="margin:4px 0 0">
             <button type="button" class="edbtn" data-bnotesave="${hesc(r.id)}"><b>Save the note</b></button>
             ${r.anno ? `<button type="button" class="edbtn" data-bnotedel="${
               hesc(r.id)}">Delete it</button>` : ""}
           </span>
         </span>`
         : r.anno ? `<span class="banno"><b>Your note</b> ${hesc(r.anno)}${
             r.annoAt ? `<i>${hesc(r.annoAt)}</i>` : ""}</span>` : ""}
       ${bridgeRowHTML(r)}</span>
     </div>`).join("")
       : `<p class="empty">Derive a line above and <b>put it on the board</b>. Nothing arrives
          here automatically \u2014 what you stand behind is a decision.</p>`}</div>
   </div>`;
}

function propSentence(l){
  if(!l || !l.y || !l.x) return "";
  /* A line sampled but never proved has something to say and no verdict object,
     so it says the sampled thing on its own. */
  if(!l.res){
    if(!l.sim) return "";
    const x0 = mthCross(l);
    return `<p class="psent"><b>${hesc(readName(l.y))}</b> ${l.sim.dir > 0 ? "rises with" :
      "falls as"} <b>${hesc(readName(l.x))}</b> at ${(l.sim.share * 100).toFixed(1)}% of
      ${l.sim.draws} sampled points <span class="mtag msamp">sampled</span></p>` +
      (x0 ? `<p class="mcross ${x0.k}">${x0.t}</p>` : "");
  }
  const v = l.res.verdict;
  /* THE SENTENCE IS core/verdict.js's. Six branches lived here, and one of
     them read "over 75.0% of for every purpose clarity factor in [0.00,
     1.00]" because the declared box was written one way for three different
     grammatical places. A partial verdict with a counter-example reports where
     the sign turns; without one there is no turn to report and the sentence
     must not imply one. A flat line does not move at all, which is a result
     and not a failure -- saying "rises with" here was the defect that put that
     verdict in the kernel. */
  const Y = hesc(readName(l.y)), X = hesc(readName(l.x));
  const t = vSay({
    y:Y, x:X,
    verdict:v, dir:l.res.dir,
    bx:(l.bx && l.bx[l.x]) ? l.bx[l.x] : null,
    seg:l.seg || null,
    sh:pcs(l.res.share), op:pcs(l.res.open),
    turnAt:(v === "partial" && l.res.witness && Array.isArray(l.flip))
      ? (l.flip[0] + l.flip[1]) / 2 : null,
    /* The sampled reading of the curve, carried only where the proof had no
       answer. vSay decides whether to use it. */
    shape:l.res.shape || null,
  }, w => `<b>${w}</b>`);
  const x = mthCross(l);
  const st = l.stoch ? `<p class="mcross stoch">with everything but <b>${X}</b> knocked about
    by <b>${(l.stoch.sd * 100).toFixed(0)}%</b> of its range, it still holds in <b>${
    (l.stoch.share * 100).toFixed(1)}%</b> of ${l.stoch.n} runs${
    NOISE.dec ? "" : ` — <b>and nobody declared that error</b>, so the figure is this page's and not yours`}</p>` : "";
  const tag = `<span class="mtag ${l.sim ? (l.res ? "mboth" : "msamp") : "mex"}">${
    l.sim ? (l.res ? "exact + sampled" : "sampled") : "exact"}</span>` +
    (l.stoch ? ` <span class="mtag mstoch">+ error</span>` : "");
  const w = (v === "disproved" || v === "partial") && l.res.witness
    ? ` <span class="pwit">a counter-example sits at ${hesc(Object.entries(l.res.witness)
        .slice(0, 3).map(([k, x]) => readName(k) + " = " + (+x).toFixed(3)).join(", "))}</span>` : "";
  const wh = l.where ? `<p class="mcross wbox">${
    l.whereFrom === "error" ? "under that error, it " : "of the draws, it "}${
    whereText(l.where)}</p>` : "";
  /* The clause on its own, because the export needs the PROPOSITION and the
     block under it is commentary. Stripping tags off the whole thing ran the
     sentence, the cross-check, the error line and the region together into one
     unreadable string in every exported result. */
  l.__clause = t;
  return `<p class="psent">${t}${w} ${tag}</p>` +
    (x ? `<p class="mcross ${x.k}">${x.t}</p>` : "") + st + wh;
}
/* THE PROPOSITION ALONE, with its two names emphasised and nothing else: no
   method tag, no cross-check line, no error figure, no counter-example. The
   Findings tab on step 3.2 wants the sentence, and propSentence() draws the
   whole block around it. */
function propLine(l){ propSentence(l); return String(l.__clause || ""); }

function propClause(l){
  propSentence(l);
  return String(l.__clause || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/* THE REVIEWER'S PANEL. Three sections and a record, where there used to be
   a task list: what contradicts or was defaulted, what the findings rest on,
   and -- only when asked, because it is slow and it costs -- a reading of the
   whole thing by a model that has been given both of the first two so it
   cannot spend its answer repeating them. */
const rvSev = k => k === "bad" ? "gap" : "part";
const rvKind = {spark:"idea", robustness:"robustness", inconsistency:"inconsistent"};

/* WHERE YOU ARE, AND THE ONE THING IN THE WAY.
   ==========================================================================

   Not a task list: one small instruction naming the blocking piece, to say
   where the scholar is and what to do next.

   So: one sentence saying what is finished, and one naming the first step
   that is not, with the single act that would finish it. Read off each step's
   own done(), which is the same test the chevrons tick, so this cannot say a
   step is unfinished that the header has already ticked.

   It sits at the FOOT of the drawer, under the checks and the reading,
   because it is the least of what the drawer knows: the checks are facts
   about the state and this is only a next step. */
const NEXTMOVE = {
  1: "Narrow the literature, or move the threshold, and step 1.1 is settled.",
  2: "Choose which constructs the model will carry, or merge two that name one quantity.",
  3: "Weigh the relationships: say which arrows the model carries and how much each rests on.",
  4: "Either join a second literature here, or go past it \u2014 a single-stream model is finished without it.",
  5: "Type a quantity or declare what a mechanism does, and the model starts to close.",
  6: "Derive the findings, then keep the ones you stand behind.",
  7: "Read the findings against the declared class of forms, and plot what survives.",
  8: "Five decisions are open. Each one is a choice this page will not make for you.",
};
function nextMoveHTML(){
  const steps = STAGES.slice().sort((a, b) => a.n - b.n);
  const ok = n => { try{ return !!STAGES.find(x => x.n === n).done(); }catch(e){ return false; } };
  const next = steps.find(x => !ok(x.n));
  /* Step 4.2 is never done -- a deposit is built, not finished -- so the last
     step is its own case rather than a hole in the walk. */
  if(!next) return "";
  /* WHERE YOU ARE IS THE FURTHEST STEP WITH WORK IN IT, not the last one
     before the first gap. Opened on the Purpose project -- a finished run,
     curated, closed, derived and plotted -- this said "Nothing
     is settled yet. The chain starts at step 1.1." Step 1.1's `done()` means
     "a filter was moved off its default", and that project kept the defaults,
     so the first step read as untouched and every step after it was hidden
     behind that one gap. A gap early in the chain is worth naming; it is not
     worth claiming the work downstream of it does not exist. */
  const far = steps.filter(x => ok(x.n));
  const last = far.length ? far[far.length - 1] : null;
  const skipped = last ? steps.filter(x => x.n < last.n && !ok(x.n)) : [];
  return `
    <div class="gsec gnext">
      <h4>Where you are</h4>
      <p class="gwhere">${last
        ? `Work as far as <b>step ${stepNo(last.n)}</b>, ${hesc(last.title.toLowerCase())}.${
            skipped.length ? ` <b>Step${skipped.length === 1 ? "" : "s"} ${
              skipped.map(x => stepNo(x.n)).join(", ")}</b> ${
              skipped.length === 1 ? "is" : "are"} still on the defaults.` : ""}`
        : `Nothing is settled yet. The chain starts at <b>step 1.1</b>.`}</p>
      <p class="gdo"><span class="gdon">Step ${stepNo(next.n)}</span> ${
        hesc(NEXTMOVE[next.n] || next.blurb || "")}</p>
      ${next.n === state.stage ? "" :
        `<button type="button" class="tabbtn" id="gGo" data-gostep="${next.n}">Take me there</button>`}
    </div>`;
}

function renderGuide(){
  const el = document.getElementById("guide"), w = document.getElementById("work");
  if(!el || !w) return;
  const fab = document.getElementById("gfab");
  const S = reviewState(), C = reviewChecks(S), X = reviewExposure(S);
  const bad = C.filter(c => c.sev === "bad").length;
  el.hidden = !GUIDE.open;
  if(fab){
    fab.setAttribute("aria-expanded", String(GUIDE.open));
    /* The launcher counts what CONTRADICTS, not what is undone. A badge that
       counts outstanding tasks is a nag; one that counts contradictions is a
       reason to look. */
    const n = GUIDE.open ? 0 : C.length;
    fab.innerHTML = GUIDE.open
      ? `<span class="gfabi" aria-hidden="true">&times;</span>`
      : `${AI.cap ? aiMark("a model can read the whole chain") : ""}<span
          class="gfabt">Suggestions</span>${n
        ? `<span class="gcount${bad ? " gbad" : ""}">${n}</span>` : ""}`;
  }
  if(!GUIDE.open){ el.innerHTML = ""; return; }

  const act = REVIEW.ideas.filter(n => n.act !== "none");
  const inert = REVIEW.ideas.filter(n => n.act === "none");
  el.innerHTML = `
    <h3>Suggestions</h3>
    <p class="gsub">what contradicts, what it rests on, and what a reader makes of it</p>

    <div class="gsec">
      <h4>Checks — ${C.length ? `${C.length}${bad ? `, ${bad} serious` : ""}` : "nothing to flag"}</h4>
      <p class="gnote">Computed from the state, not asked. ${infold(`Facts about the state
        rather than things to do. The page cannot know which side of a contradiction is the
        wrong one, which is why it says it instead of fixing it. Nothing here names a
        button.`)}</p>
      ${C.length ? C.map(c => `<div class="rvrow">
        <span class="cst ${rvSev(c.sev)}">${c.sev === "bad" ? "conflict" : "defaulted"}</span>
        <div class="rvb"><b>${c.text}</b><i>${hesc(c.why)}</i></div>
      </div>`).join("")
        : `<p class="gempty">Nothing contradicts anything and nothing load-bearing was
           defaulted. On an empty bench that is because there is nothing yet.</p>`}
    </div>

    <div class="gsec">
      <h4>Exposure — ${X.length ? `${X.length} measured` : "nothing retained yet"}</h4>
      <p class="gnote">What the retained findings rest on, and how narrowly. ${infold(`Robustness
        as a measurement rather than a reassurance: every line carries the number it came
        from, so a reader can check it against the run instead of taking the word
        robust.`)}</p>
      ${X.length ? X.map(x => `<div class="rvrow">
        <span class="cst">${x.k}</span>
        <div class="rvb"><b>${x.text}</b><i>${hesc(x.why)}</i></div>
      </div>`).join("")
        : `<p class="gempty">Retain a finding on step 3.2 and this measures what it depends on,
           how much of the declared box it holds over, and how often you have been wrong.</p>`}
    </div>

    <div class="gsec">
      <h4>Simulate a review${REVIEW.at ? ` — ${REVIEW.ideas.length} notes, ${REVIEW.secs}s` : ""}</h4>
      <p class="gnote">One pass over the whole chain, read as a reviewer would read it. Slow,
        and it costs. ${infold(`The reader is given everything above, including <b>what you
        have been wrong about</b>, so it cannot spend the answer repeating what was already
        computed. Each note must name a declaration to change, a search to run or a
        derivation to take; anything that names none is shown apart as something it could
        not make actionable. It runs when you ask and not before.`)}</p>
      <div class="gacts">
        ${AI.cap ? `<button type="button" class="tabbtn" id="gAsk"${
          REVIEW.busy ? " disabled" : ""}
          title="Reads the whole chain -- what contradicts, what the findings rest on -- and returns a reviewer's reading of it.${AITIP}">${aiMark()}${REVIEW.busy ? "reading the whole chain…"
            : REVIEW.at ? "simulate it again" : "simulate a review"}</button>` : ""}
        ${REVIEW.ideas.length ? `<button type="button" class="tabbtn" id="gClr">clear</button>` : ""}
      </div>
      ${REVIEW.err ? `<p class="gempty" style="color:var(--neg);margin-top:7px">${
        hesc(REVIEW.err)}</p>` : ""}
      ${act.map(n => `<div class="rvrow rvidea">
        <span class="cst ${n.kind === "inconsistency" ? "gap" : "ok"}">${
          rvKind[n.kind] || n.kind}</span>
        <div class="rvb"><b>${hesc(n.what)}</b><i><span class="rvact">${hesc(n.act)}</span> ${
          hesc(n.do)}</i></div>
      </div>`).join("")}
      ${inert.length ? `<p class="gnote" style="margin-top:9px"><b>${inert.length} it could not
        make actionable</b>, shown because hiding them would be deciding for you:</p>
        ${inert.map(n => `<div class="rvrow rvinert">
          <span class="cst">opinion</span>
          <div class="rvb"><i>${hesc(n.what)}</i></div>
        </div>`).join("")}` : ""}
      ${REVIEW.outside ? `<p class="gnote">${REVIEW.outside} note${
        REVIEW.outside === 1 ? "" : "s"} named no move at all and ${
        REVIEW.outside === 1 ? "was" : "were"} discarded.</p>` : ""}
    </div>

    <div class="gsec">
      <h4>Record — ${XLOG.length} entr${XLOG.length === 1 ? "y" : "ies"}</h4>
      ${XLOG.length ? `<div class="glog">${XLOG.slice().reverse().slice(0, 40).map(e =>
        `<div class="grow"><span class="gt">${e.at}</span><span class="gd">${hesc(e.text)}${
          e.detail ? `<i>${hesc(e.detail)}</i>` : ""}</span></div>`).join("")}</div>`
        : `<p class="gempty">Nothing yet. Every pass, every arithmetic kept and every command
           run on the list is recorded here in order, with what it did.</p>`}
    </div>
    ${nextMoveHTML()}`;
  const a = el.querySelector("#gAsk");
  if(a) a.addEventListener("click", ev => { ev.preventDefault(); reviewAsk(); });
  const g = el.querySelector("#gGo");
  if(g) g.addEventListener("click", ev => {
    ev.preventDefault(); GUIDE.open = false;
    goStage(+g.dataset.gostep); renderGuide();
  });
  const c = el.querySelector("#gClr");
  if(c) c.addEventListener("click", ev => {
    ev.preventDefault(); REVIEW.ideas = []; REVIEW.err = ""; REVIEW.at = ""; renderGuide(); });
}

/* One listener for the launcher, not one per render: the button is in the
   static page and never redrawn away. */
function wireGuideFab(){
  const fab = document.getElementById("gfab");
  if(!fab || fab.dataset.wired) return;
  fab.dataset.wired = "1";
  fab.addEventListener("click", ev => {
    ev.preventDefault(); GUIDE.open = !GUIDE.open; renderGuide();
    if(GUIDE.open) xlog("guide", "Opened the suggestions", "");
  });
  document.addEventListener("keydown", ev => {
    if(ev.key === "Escape" && GUIDE.open){ GUIDE.open = false; renderGuide(); }
  });
}


export { BOARD, BOARDKEY, CLAIMCOLS, DECLLAB, GUESS, GUESSKEY, GUIDE, MTH, MTHS, NOISE, NRND, PASS, PASSDEPTH, PASSPROPS, PRIMCAP, ROUNDS, XLOG, bannoNow, bannoSet, boardHTML, boardKept, boardLoad, boardSave, boardStands, boardTake, brefused, declLabel, declSnapshot, derivedClaims, gauss, gkey, guessOpen, guessTally, guideBrief, mthCross, nreset, nrnd, passAsk, passBarHTML, passBrief, passClear, passCompose, passDeclareFromCorpus, passGaps, passKeys, passPaint, passRun, passTally, passValue, passWho, passWrite, pcs, primBox, propClause, propLine, propSentence, readName, renderGuide, resultOf, resultsFile, roundDiff, roundLine, roundTake, roundsHTML, rvKind, rvSev, simSign, stands, statedLines, stochHold, stochOf, vLab, vdHTML, whereText, wireGuideFab, wirePassBar, xlog };

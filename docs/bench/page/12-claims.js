/* AMG bench, page script 13 of 22: claim lists, the claim editor, and typing a construct.
   One shared global scope, loaded in order. See page/README.md. */
import { cssColor, hesc } from "../core/safe.js";
import { exportRelation } from "./23-exchange.js";
import { ANSWVERB, ASPECTS, FORMPROPS, JJ_FORM, JJ_REL, KINDS, MEMBERS_ALL, SIGNS, SOLID, SPEC0, answOf, compSave, composedPaths, cpersist, dispOf, dropped, gpersist, gremove, groups, handEnds, handName, mclm, mcon, memberCount, mforgetClm, mforgetCon, mid, msaveLocal, propClash, setCarryNode, sforget, spec, specSet, spersist, vsaveLocal, vtype } from "./03b-decisions.js";
import { MR } from "../model-report.js";
import { N, pap, picked, state } from "./03-stores.js";
import { STREAMS, streamLabel, addNodeToGroup, dragNid, dragSet, dropNodeFromGroup, handGroupHTML, joinNodes, namedBox, streamOf, vAspects, vKinds, wireRelRows, wireTabs } from "./07-grouping.js";
import { claimsBox, varName } from "./11-classes.js";
;
import { hideTip, lastView, showTip, wireUnder } from "./13-map.js";
import { lbl, noArrowsWhy } from "./15-deposit.js";
import { refresh } from "./14-boot.js";
import { relName, renderPanel } from "./06-wiring.js";
/* ------------------------------------- the claims a step can act on

   Step 1.3 receives the constructs step 1.2 selected, and what it can act on
   is EVERY claim between them -- the ones already selected and the ones not,
   because selecting is what step 1.3 is for and you cannot select what is not
   shown. Step 1.1 had the same bug once, drawing step 1.2's selection as though
   it were the scope.

   From step 2.1 the set is what step 1.3 handed on, so it narrows to the
   claims actually carried. The chain says a decision is changed on the step
   that made it: to take one back, go to step 1.3.

   One row per claim and not per statement -- a domain of validity is declared
   about a paper's assertion, and two papers asserting the same statement can be
   asserting it over different regions.

   Read off allLinks, not links: from step 1.3 the view holds only what was
   carried, and reading the narrowed view would make this list its own filter. */
function claimsInPlay(all){
  const out = new Map();
  const end = x => x && x.id !== undefined ? x.id : x;
  const live = new Set((lastView.allNodes || []).filter(n => n.carried).map(n => n.id));
  for(const e of (lastView.allLinks || [])){
    if(!live.has(end(e.source)) || !live.has(end(e.target))) continue;
    for(const c of e.claims){
      if(!all && dropped.k.has(c.id)) continue;
      /* Keyed by the claim ON THIS STATEMENT and not by the claim. A claim
         naming two antecedents asserts two relations and is evidence for both,
         and keying by the claim alone handed it to whichever pair came first
         and left the other with no rows at all -- so four arrows on the map,
         one of them corroborated by two papers, had no row in this list to be
         selected on, qualified or declared. */
      const k = e.id + "\u0000" + c.id;
      if(!out.has(k)) out.set(k, {e, c, on: !c.id || !dropped.k.has(c.id)});
    }
  }
  return [...out.values()];
}
// what goes forward: the selected ones
const carriedClaims = () => claimsInPlay(false);
/* A row is a claim on a pair, so one claim can be two rows. Where the question
   is how many assertions are carried, the claims are counted, not the rows. */
const distinctClaims = rs => new Set(rs.map(r => r.c.id)).size;

/* The statements in play, with their claims under them. The pair is what a
   model carries and what a property is declared about; the claims are the
   evidence for it, and they can disagree. */
function statementsInPlay(all){
  const g = new Map();
  for(const r of claimsInPlay(all)){
    if(!g.has(r.e.id)) g.set(r.e.id, {e:r.e, rows:[]});
    g.get(r.e.id).rows.push(r);
  }
  return [...g.values()];
}

/* How many papers stand behind a thing, and which. Asked of a whole statement
   and of each property value separately, because a pair carried by seven papers
   can have its sign carried by two of them -- and the number that matters is
   papers, not claims: one paper making the same assertion three times is one
   paper. */
function support(rows, pick){
  const ps = new Set();
  for(const r of rows) if(!pick || pick(r.c)) ps.add(r.c.p);
  return [...ps];
}
/* Two papers can share an author and a year -- there are two Gartenberg 2023 in
   this corpus -- and a list reading "Gartenberg 2023 · Gartenberg 2023" looks
   like a bug rather than two papers. Where a label repeats, the row number that
   the corpus files them under is added, which is what distinguishes them. */
function paperNames(ps){
  const lab = x => `${pap(x).a} ${pap(x).y}`;
  const seen = {};
  ps.forEach(x => { seen[lab(x)] = (seen[lab(x)] || 0) + 1; });
  return ps.map(x => seen[lab(x)] > 1 ? `${lab(x)} (${String(x).split("-")[0]})` : lab(x))
    .sort();
}
// a count with the papers behind it on hover, which is the whole of the request
function supChip(label, ps, extra){
  const n = ps.length;
  const tip = n ? paperNames(ps).join(" · ") : "no paper in this corpus";
  return `<span class="sup${n ? "" : " none"}${extra || ""}" title="${hesc(tip)}"
    >${label}<i>${n}p</i></span>`;
}

// A claim is selected one at a time, because dropped.k is a set of claim ids:
// an arrow carries if any of its claims does, which is what linkCarried says.
function setCarryClaim(id, on){
  if(!id) return;
  if(on) dropped.k.delete(id); else dropped.k.add(id);
}

// How big a space the carried set implies, if nothing further is declared. The
// product over claims of the members each admits, in logs because fourteen to
// the power of a few dozen does not fit in a double.
function impliedSpace(stmts){
  let log = 0, open = 0;
  for(const {e} of stmts){
    const v = spec.get(e.id);
    if(!specSet(v)) open++;
    log += Math.log10(memberCount((v && v.props) || []));
  }
  return {log, open, n:stmts.length};
}
const spaceText = sp => {
  if(sp.n === 0) return "nothing carried";
  if(sp.log < 6) return Math.round(Math.pow(10, sp.log)).toLocaleString();
  const e = Math.floor(sp.log);
  return `${Math.pow(10, sp.log - e).toFixed(1)} \u00d7 10<sup>${e}</sup>`;
};

function domChips(id){
  const v = spec.get(id);
  if(!specSet(v)) return `<span class="dom">no domain declared — admits all ` +
    `${MEMBERS_ALL} members and the whole range</span>`;
  const bad = propClash(v.props || []);
  const chip = (t, cls) => `<span class="dchip ${cls || "on"}">${t}</span>`;
  let h = (v.props || []).map(k => chip(k, bad.length ? "bad" : "on")).join("");
  if(v.lo !== 0 || v.hi !== 1)
    h += chip(`range ${(+v.lo).toFixed(2)}–${(+v.hi).toFixed(2)}`);
  if(v.elo != null || v.ehi != null)
    h += chip(`estimate ${v.elo == null ? "?" : v.elo}–${v.ehi == null ? "?" : v.ehi}`);
  if(h) h += " ";
  return `<span class="dom ${bad.length ? "clash" : "set"}">${h}` +
    (bad.length ? bad.join("; ")
      : `${memberCount(v.props || [])} of ${MEMBERS_ALL} members admitted`) +
    (v.note ? ` · ${hesc(v.note)}` : "") + `</span>`;
}

/* The list, rendered into whichever step asked for it. Step 1.3 shows it
   because that is where the arrows are selected; step 2.1 because the
   additions are proposed against it; step 3.1 because that is where the
   declarations are made to pay. */
/* ------------------------------------------- one claim list, three places

   Step 1.3 has it under the diagram, step 2.1 inside the building blocks,
   step 3.1 under the diagram again. Same component each time: statements as
   headings, the claims as evidence beneath, and the properties of the relation
   between them. Only two things change with the step -- whether the claims can
   be ticked, which is step 1.3's act, and which statements are in the set. */
/* Three outcomes and not two. One word for every divergence reported a null
   against a direction -- where one of the papers has to be wrong -- in the same
   breath as a direction against a condition, where neither is: the condition is
   the same claim over a narrower domain. SPEC.md's own rule for the extraction
   says so, `sign: conditional` being assigned when the sign DEPENDS on a
   subgroup, so a bare direction is that same claim asserted unconditionally.
   The two disagree about where the relation holds, which is step 3.1's
   question, not about whether it holds, which is this one's.

   The first test comes before any of that: a value every paper asserts means
   the papers do not differ at all. Cassar reports a mission premium and also a
   null on whether that premium scales with the worker's own motivation; Chua
   reports the premium. Two signs on the pair and no disagreement between the
   papers -- it was the extraction putting a level effect and an interaction
   onto one construct pair. Counting values on the statement found a dispute
   where there was one paper qualifying itself. */
const EVB = {co:"corroborated", cx:"contested", sc:"scope disputed", one:"one paper"};
const EVW = {
  co:"More than one paper, and a value every one of them asserts. Any further value here is a paper qualifying its own result, not two papers differing.",
  cx:"No value every paper asserts, and the ones asserted cannot all hold: a direction against a null, two directions against each other, a relation against no relation at all. One of these papers is wrong, and carrying the pair as settled carries the error into the model.",
  sc:"No value every paper asserts, but the ones asserted are nested rather than opposed \u2014 a direction, and the same direction said to hold only under a condition. Both can be true. What is unsettled is the domain, and that is declared on step 3.1.",
  one:"One paper. Nothing here is corroborated or contested; it is asserted, and the model will rest on that one account.",
};
const DIRS = new Set(["positive", "negative", "inverted-U"]);
const kindOf = rs => {
  const byp = new Map();
  for(const r of rs){
    if(!byp.has(r.c.p)) byp.set(r.c.p, new Set());
    byp.get(r.c.p).add(r.c.g);
  }
  if(byp.size < 2) return "one";
  const sg = [...new Set(rs.map(r => r.c.g))];
  if(sg.length === 1) return "co";
  // a value every paper behind the statement asserts: nobody differs
  if(sg.some(g => [...byp.values()].every(s => s.has(g)))) return "co";
  // nested rather than opposed: one direction, and the condition on it
  return sg.every(g => g === "conditional" || DIRS.has(g)) &&
         sg.filter(g => DIRS.has(g)).length === 1 ? "sc" : "cx";
};
const ORDK = {co:0, cx:1, sc:2, one:3};
const byEvidence = (a, b) =>
  ORDK[kindOf(a.rows)] - ORDK[kindOf(b.rows)] ||
  b.rows.length - a.rows.length ||
  String(a.e.id).localeCompare(String(b.e.id));

/* A claim another paper has answered, and whether the answer disputes it.
   Not decoration: where the answering paper asserts the same statement with a
   different sign, the agreement count on step 1.3 is treating that answer as
   if it were independent agreement. */
/* The same fact at the group level, and only the disputed half of it.

   A statement asserted by several papers collapses into one line per sign, and
   that line says "papers agree". Where an edge records that one of those papers
   was answering another and gave the statement a different sign, the line is
   wrong in the one way that matters: the papers are not independent, so the
   label is changed rather than footnoted. "Answered" is left off the group on
   purpose -- 45 claims are answered and most of them agree, so surfacing all of
   it here would bury the three that do not. It stays on the row. */
function dispGroupMark(rows){
  const dis = rows.filter(r => dispOf(r.c.id).length);
  if(!dis.length) return "";
  const say = dis.map(r => dispOf(r.c.id).map(e => {
    const q = pap(e.f);
    return (q && q.a ? q.a + " " + q.y : e.f) + " " + ANSWVERB[e.k] +
      " " + r.c.id.split("#")[0] + " and calls the same statement " +
      [...new Set((e.same || []).map(x => x.g))].join(" / ");
  }).join(" \u00b7 ")).join(" \u00b7 ");
  return ` <span class="dispm" title="${hesc(say +
    " \u2014 so the count beside this line is not a count of independent papers.")}">${
    dis.length} disputed</span> \u00b7`;
}

function answMark(c){
  const es = answOf(c.id);
  if(!es.length) return "";
  const dis = es.filter(e => (e.same || []).some(s => s.g !== e.tg));
  const say = es.map(e => {
    const q = pap(e.f);
    const who = (q && q.a ? q.a + " " + q.y : e.f);
    const sames = [...new Set((e.same || []).map(x => x.g))];
    return who + " " + ANSWVERB[e.k] + " it" + (sames.length
      ? ", and asserts the same statement itself as " + sames.join(" / ") +
        " where this one says " + e.tg
      : "");
  }).join(" \u00b7 ");
  const why = (dis.length
    ? "DISPUTED. " + say + " \u2014 so the papers behind this statement did not arrive at " +
      "it independently, and counting them as agreement overstates what is there."
    : say + ". The answer does not assert the same statement, so the agreement count " +
      "is unaffected; what it tells you is that this relationship was taken up.");
  return ` \u00b7 <span class="${dis.length ? "dispm" : "viam"}" title="${hesc(why)}">${
    dis.length ? "disputed" : "answered"} by ${es.length} paper${es.length === 1 ? "" : "s"}</span>`;
}

function claimRowHTML({c, on}, picking, bare){
  const p = pap(c.p);
  const form = (c.spf || []).includes("no functional form")
    ? "no form stated" : "a form stated";
  const body = `<span class="sttx">${bare ? "" : `<b>${c.g}</b> · `}${c.e} · ${p.a} ${p.y}
      · ${form}${c.sh && c.sh !== "unspecified" ? ` (${c.sh})` : ""}${
      c.mo ? " · moderated" : ""}${c.v ? " · carries a number" : ""}${
      c.ef ? ` · <b>${c.ef} effect</b>` : ""}${answMark(c)}${
      c.via ? ` · <span class="viam" title="${hesc(
        "The same paper also claims this relation through " +
        c.via.map(x => x.replace(/-/g, " ")).join(", ") +
        ". So this row is either the total effect or the direct effect holding " +
        "that route constant, and nothing in it says which. Carrying this row AND " +
        "the two legs counts the route twice.")}">also routed via ${
        c.via.map(x => x.replace(/-/g, " ")).join(", ")}</span>` : ""}</span>`;
  return `<div class="clrw${picking && !on ? " off" : ""}${bare ? " sub" : ""}">
    ${picking
      ? `<label class="st"><input type="checkbox" class="clpick" data-claim="${hesc(c.id)}"
           ${on ? "checked" : ""} aria-label="Carry ${hesc(c.id)}">${body}</label>`
      : `<span class="st">${body}</span>`}
  </div>`;
}

/* Several papers saying the same thing is one row, not several. Within a
   statement the sign is what they agree or disagree about, so the claims are
   gathered by it: one line per direction, with how many papers are behind it
   and what they rest on, and an expander for the papers themselves. A pair
   eleven claims deep was eleven near-identical lines, and the one thing they
   differed about -- the direction -- was the hardest thing to see. */
function signBlockHTML(e, g, rows, picking){
  const key = e.id + "|" + g;
  const open = state.clOpen.has(key);
  const ps = support(rows);
  const lit = rows.filter(r => r.on).length;
  if(rows.length === 1) return claimRowHTML(rows[0], picking, false);
  const disp = rows.filter(r => dispOf(r.c.id).length).length;
  const bases = [...new Set(rows.map(r => r.c.e))];
  const forms = [...new Set(rows.map(r => r.c.sh).filter(x => x && x !== "unspecified"))];
  return `<div class="sgrp${picking && !lit ? " off" : ""}">
    <div class="sghd">
      <button type="button" class="sgfold" data-fold="${hesc(key)}"
        aria-expanded="${open}"><span class="caret">${open ? "▾" : "▸"}</span></button>
      ${picking ? `<input type="checkbox" class="sgall" data-sign="${hesc(key)}"
         ${lit === rows.length ? "checked" : ""}
         aria-label="Carry every ${g} relationship on this pair">` : ``}
      <span class="sgn"><b>${g}</b></span>
      <span class="sgmeta">${supChip(ps.length === 1 ? "one paper"
          : disp ? "papers, not independently" : "papers agree", ps)}${dispGroupMark(rows)}
        ${rows.length} relationship${rows.length === 1 ? "" : "s"} · ${bases.join(", ")}${
        forms.length ? ` · ${forms.join(", ")}` : " · no form stated"}${
        picking && lit !== rows.length ? ` · ${lit} selected` : ""}</span>
    </div>
    ${open ? rows.map(r => claimRowHTML(r, picking, true)).join("") : ""}
  </div>`;
}

/* The properties of the relation, under the pair that carries it, in Jaccard
   & Jacoby's vocabulary. Every value says how many papers stand behind it and
   names them on hover: a relationship type the corpus has no field for shows
   nought, which is the honest reading and not an omission in the panel. */
/* The properties of the relation, on one wrapped line under the pair that
   carries it. Four buckets inline rather than four stacked rows, and only the
   values something stands behind: the sign and the form come off the claims so
   every value shown has papers, while the relationship is a taxonomy and most
   of it has nothing. Showing seven options of which five read 0p said very
   little, five times over. The unsupported ones are still how a relationship
   gets declared, so they are a click away rather than gone. */
function claimPropsHTML(e, rows){
  const v = spec.get(e.id);
  const rel = (v && v.rel) || "";
  const open = state.relOpen.has(e.id);
  const sgs = [...new Set(rows.map(r => r.c.g))];
  const shs = [...new Set(rows.map(r => r.c.sh || "unspecified"))]
    .filter(x => x !== "unspecified");
  const noForm = support(rows, c => (c.sh || "unspecified") === "unspecified");
  const mod = support(rows, c => !!c.mo);
  const ind = support(rows, c => !!c.via);
  const vias = [...new Set(rows.flatMap(r => r.c.via || []))];
  const SUPOF = {moderated: mod, indirect: ind};
  const relTip = r => {
    const ps = SUPOF[r.k] || [];
    return r.n + " — " + r.why.replace(/<[^>]+>/g, "") +
      (ps.length
        ? "\n\nsupported by: " + paperNames(ps).join(" · ") +
          (r.k === "indirect" && vias.length
            ? "\n\nrouted through: " + vias.map(x => x.replace(/-/g, " ")).join(", ") +
              "\n\nRecovered from those papers' own relationships, not from a mediator field, " +
              "which this corpus has not got."
            : "")
        : "\n\nno field in this corpus records it");
  };
  const relBtn = r => {
    const got = (SUPOF[r.k] || []).length;
    return `<button type="button" class="sup pick${rel === r.k ? " on" : ""}${
      got ? "" : " none"}" data-setrel="${hesc(e.id)}|${r.k}"
      title="${hesc(relTip(r))}">${r.n}${got ? `<i>${got}p</i>` : ""}</button>`;
  };
  const shown = open ? JJ_REL
    : JJ_REL.filter(r => (SUPOF[r.k] || []).length || rel === r.k);

  const bucket = (lab, tip, body) =>
    `<span class="cpb"><span class="cplab" title="${hesc(tip)}">${lab}</span>${body}</span>`;

  return `<div class="cprops">
    ${bucket("rel",
      "Jaccard and Jacoby (2010) ch. 7: the six types that capture the universe of " +
      "relationship types used in causal modeling, and their prior cut, predictive only. " +
      "Only the ones something stands behind are shown; declare opens the rest.",
      shown.map(relBtn).join("") +
      (shown.length ? "" : `<span class="sup none">nothing recorded</span>`) +
      `<button type="button" class="cpmore" data-relmore="${hesc(e.id)}"
        >${open ? "less" : "declare…"}</button>`)}
    ${bucket("sign",
      "The direction the papers assert. The corpus holds it per relationship, so every value " +
      "here carries real support.",
      sgs.map(g => supChip(g, support(rows, c => c.g === g))).join(""))}
    ${bucket("form",
      "Jaccard and Jacoby ch. 8: six classes of function, linear, logarithmic, " +
      "exponential, power, polynomial, trigonometric. What a PAPER stated, which is a " +
      "different question from the class a modeller declares.",
      shs.map(x => supChip(x, support(rows, c => (c.sh || "unspecified") === x))).join("") +
      supChip("not stated", noForm, " none"))}
    ${bucket("class",
      "The class to enumerate over, declared in the kernel's vocabulary rather than picked " +
      "from a named function. Nobody asserts this; it is the modeller's, and Edit is " +
      "where it is set.",
      (v && v.props && v.props.length
        ? v.props.map(k => `<span class="sup on">${k}</span>`).join("") +
          `<span class="sup on">${memberCount(v.props)}/${MEMBERS_ALL}</span>`
        : `<span class="sup none">not declared</span>`) +
      (v && (v.lo !== 0 || v.hi !== 1)
        ? `<span class="sup on">${(+v.lo).toFixed(2)}–${(+v.hi).toFixed(2)}</span>` : "") +
      (v && (v.elo != null || v.ehi != null)
        ? `<span class="sup on">est ${v.elo == null ? "?" : v.elo}–${
            v.ehi == null ? "?" : v.ehi}</span>` : "") +
      `<button type="button" class="edbtn" data-ed="${hesc(e.id)}">Edit</button>`)}
    ${v && v.note ? `<span class="cpnote">${hesc(v.note)}</span>` : ""}
  </div>`;
}

/* A composed relation, drawn apart from the claims. It carries the chain that
   produced it, the link in that chain with the least behind it, and no evidence
   badge, because nothing asserts it. Ticking one declares the pair indirect
   causal in the properties above — which is what it is. */
function composedGroupHTML(f, picking){
  const on = state.comp.has(f.id);
  const SG = {positive:"positive", negative:"negative"};
  const chain = [f.from].concat(f.path.map(e =>
    (e.target && e.target.id !== undefined ? e.target.id : e.target)));
  return `<div class="cgrp cmpd${picking && !on ? " off" : ""}">
    <div class="cghd">
      ${picking ? `<input type="checkbox" class="cpick" data-cpath="${hesc(f.id)}"
         ${on ? "checked" : ""} aria-label="Carry the composed relation ${
         lbl(f.from)} to ${lbl(f.to)}">` : ``}
      <span class="cgn">${lbl(f.from)} <b>⇢</b> ${lbl(f.to)}</span>
      <span class="cgmeta"><span class="evb cmp">composed, not asserted</span>
        <span class="sup" title="${hesc(paperNames(f.papers).join(" · "))}"
          >papers<i>${f.papers.length}</i></span>
        ${f.path.length} links</span>
    </div>
    <div class="cpath">
      <span class="cplab">Chain</span>
      <span class="cpv">${chain.map(x => lbl(x)).join(" → ")}</span>
    </div>
    <div class="cpath">
      <span class="cplab">Composes to</span>
      <span class="cpv">${f.sign
        ? `<b>${SG[f.sign]}</b>, from ${f.path.map(e => [...e.signs].join("/")).join(" then ")}`
        : `<b>nothing</b> — a null, a condition or a category on the chain
           (${f.path.map(e => [...e.signs].join("/")).join(" then ")}) does not compose`}</span>
    </div>
    <div class="cpath">
      <span class="cplab">Weakest link</span>
      <span class="cpv">${lbl(f.weak.source)} → ${lbl(f.weak.target)},
        ${[...f.weak.stat].join(" / ")} · ${f.weak.papers.size} paper${
        f.weak.papers.size === 1 ? "" : "s"}. A chain is worth no more than this.</span>
    </div>
  </div>`;
}

function claimGroupHTML({e, rows}, picking){
  const k = kindOf(rows), lit = rows.filter(r => r.on).length;
  const ps = support(rows);
  return `<div class="cgrp">
    <div class="cghd">
      ${picking ? `<input type="checkbox" class="cgall" data-stmt="${hesc(e.id)}"
         ${lit === rows.length ? "checked" : ""}
         aria-label="Carry every relationship from ${lbl(e.source)} to ${lbl(e.target)}">` : ``}
      <span class="cgn">${lbl(e.source)} <b>→</b> ${lbl(e.target)}</span>
      <span class="cgmeta"><span class="evb ${k}" title="${hesc(EVW[k])}"
          >${EVB[k]}</span>
        <span class="sup" title="${hesc(paperNames(ps).join(" · "))}"
          >papers<i>${ps.length}</i></span>
        ${rows.length} relationship${rows.length === 1 ? "" : "s"}${
          picking ? ` · ${lit} selected` : ""}</span>
    </div>
    ${claimPropsHTML(e, rows)}
    ${[...new Set(rows.map(r => r.c.g))]
      .map(g => signBlockHTML(e, g, rows.filter(r => r.c.g === g), picking))
      .join("")}</div>`;
}

// every list of claim groups is wired the same way, wherever it was rendered
function wireClaimGroups(el){
  el.querySelectorAll("[data-ed]").forEach(b =>
    b.addEventListener("click", () => openDomain(b.dataset.ed)));
  el.querySelectorAll("[data-mced]").forEach(b =>
    b.addEventListener("click", () => openClm(b.dataset.mced)));
  el.querySelectorAll("[data-mcdel]").forEach(b =>
    b.addEventListener("click", () => mforgetClm(b.dataset.mcdel)));
  el.querySelectorAll(".clpick").forEach(b =>
    b.addEventListener("change", () => {
      setCarryClaim(b.dataset.claim, b.checked);
      cpersist(); refresh();
    }));
  // one of the six, or none: clicking the lit one again clears it, because a
  // declaration withdrawn is as much a decision as one made
  el.querySelectorAll("[data-setrel]").forEach(b =>
    b.addEventListener("click", () => {
      const [id, k] = b.dataset.setrel.split("|");
      const v = Object.assign(SPEC0(), spec.get(id) || {});
      v.rel = v.rel === k ? "" : k;
      v.at = new Date().toISOString().slice(0, 10);
      if(specSet(v)){ spec.set(id, v); spersist(id, v); } else sforget(id);
      refresh();
    }));
  // the whole statement at once, which is what clicking its arrow on the map does
  el.querySelectorAll("[data-relmore]").forEach(b =>
    b.addEventListener("click", () => {
      const k = b.dataset.relmore;
      if(state.relOpen.has(k)) state.relOpen.delete(k); else state.relOpen.add(k);
      refresh();
    }));
  el.querySelectorAll("[data-fold]").forEach(b =>
    b.addEventListener("click", () => {
      const k = b.dataset.fold;
      if(state.clOpen.has(k)) state.clOpen.delete(k); else state.clOpen.add(k);
      refresh();
    }));
  el.querySelectorAll(".sgall").forEach(b =>
    b.addEventListener("change", () => {
      const [id, g] = b.dataset.sign.split("|");
      const st = statementsInPlay(true).find(x => x.e.id === id);
      if(!st) return;
      st.rows.filter(r => r.c.g === g).forEach(r => setCarryClaim(r.c.id, b.checked));
      cpersist(); refresh();
    }));
  el.querySelectorAll(".cgall").forEach(b =>
    b.addEventListener("change", () => {
      const g = statementsInPlay(true).find(x => x.e.id === b.dataset.stmt);
      if(!g) return;
      g.rows.forEach(r => setCarryClaim(r.c.id, b.checked));
      cpersist(); refresh();
    }));
  /* Carrying a composed relation also declares what it is. Jaccard & Jacoby
     have a name for a relation that runs through an intermediary, and this is
     one, so the properties say so rather than leaving it to be inferred. */
  el.querySelectorAll(".cpick").forEach(b =>
    b.addEventListener("change", () => {
      const id = b.dataset.cpath;
      if(b.checked){
        state.comp.add(id);
        const f = composedPaths().find(x => x.id === id);
        const v = Object.assign(SPEC0(), spec.get(id) || {});
        v.rel = "indirect";
        v.note = v.note || (f ? "composed over " + f.path.length + " links" : "");
        v.at = new Date().toISOString().slice(0, 10);
        spec.set(id, v); spersist(id, v);
      }else state.comp.delete(id);
      compSave(); refresh();
    }));
}

/* The proposals, in a list of their own. They are not claims and they outnumber
   the claims -- a hundred and thirty-eight of them at the loosest bar -- so
   mixing them in would bury what the papers actually say. Add one, or add the
   lot, and it joins the claims above carrying its own status wherever it goes. */
/* The two settings sit here and not on the step, because what they govern is
   this list: how long a chain may be, and what every link in it must have
   behind it. A control whose only effect is a list somewhere else is the
   doubling this bench keeps taking out. */
function composedControlsHTML(){
  return `<div class="cmpctl">
    <div class="cmpc">
      <div class="sh"><span class="ctl-label">Links a chain may use</span>
        <span class="sv" id="vHops">${state.hops === 1 ? "direct only"
          : state.hops + " links"}</span></div>
      <input type="range" id="cHops" min="1" max="4" step="1" value="${state.hops}"
             aria-label="How many links a chain may use">
    </div>
    <div class="cmpc wide">
      <span class="ctl-label">What each link must have behind it</span>
      <div class="modebar" role="group" aria-label="Solidity of each link">
        ${SOLID.map(q => `<button type="button" data-solid="${q.k}"
          title="${hesc(q.why.replace(/<[^>]+>/g, ""))}"
          aria-pressed="${state.solid === q.k}">${q.n}</button>`).join("")}
      </div>
    </div>
  </div>`;
}

function composedListHTML(){
  const all = composedPaths();
  if(!all.length) return `<section class="wlgroup cmpd"><div class="wlhead">
      <h4>Indirect relationships (proposed) <span class="n cmpd">0</span></h4>
      ${composedControlsHTML()}
      <p>${state.hops < 2
        ? `A chain may use one link, so nothing is composed. Raise <b>links a chain may
           use</b> on the step above.`
        : `No chain of up to ${state.hops} links joins two selected constructs under this
           bar. ${state.solid === "corroborated"
             ? "At this bar there is nothing to find: sixteen relations have two papers "
               + "agreeing and no two of them join end to end."
             : "Loosen the bar, or allow a longer chain."}`}</p></div></section>`;
  const on = all.filter(f => state.comp.has(f.id)).length;
  const sign = all.filter(f => f.sign).length;
  return `<section class="wlgroup cmpd"><div class="wlhead">
      <h4>Indirect relationships (proposed)
        <span class="n cmpd">${on} of ${all.length} added</span></h4>
      ${composedControlsHTML()}
      <div class="cmpacts">
        <button type="button" id="compAll">Add all ${all.length}</button>
        <button type="button" id="compNone">Remove all</button>
        <button type="button" id="compSigned" ${sign ? "" : "disabled"}
          title="${sign ? "" : "None of these compose to a sign: every chain has a null, a condition or a category on it."}"
          >Add only the ${sign} with a sign</button>
      </div>
    </div>
    <div class="clist cmplist">${all.map(f => composedGroupHTML(f, true)).join("")}</div>
  </section>`;
}

function wireComposed(el){
  const bulk = (pick) => {
    const all = composedPaths();
    state.comp = new Set(all.filter(pick).map(f => f.id));
    for(const f of all.filter(pick)){
      const v = Object.assign(SPEC0(), spec.get(f.id) || {});
      v.rel = "indirect";
      v.note = v.note || "composed over " + f.path.length + " links";
      v.at = new Date().toISOString().slice(0, 10);
      spec.set(f.id, v); spersist(f.id, v);
    }
    compSave(); refresh();
  };
  const on = (id, fn) => { const b = el.querySelector("#" + id);
    if(b) b.addEventListener("click", fn); };
  /* A slider inside the block it redraws cannot re-render on every input event
     or the drag loses its own handle. The readout moves live; the list is
     recomputed when the pointer is let go. */
  const hp = el.querySelector("#cHops");
  if(hp){
    hp.addEventListener("input", () => {
      const rd = el.querySelector("#vHops");
      if(rd) rd.textContent = +hp.value === 1 ? "direct only" : hp.value + " links";
    });
    hp.addEventListener("change", () => { state.hops = +hp.value; refresh(); });
  }
  el.querySelectorAll("[data-solid]").forEach(b =>
    b.addEventListener("click", () => { state.solid = b.dataset.solid; refresh(); }));
  on("compAll", () => bulk(() => true));
  on("compNone", () => bulk(() => false));
  on("compSigned", () => bulk(f => !!f.sign));
}

/* Rebuilding a panel replaces its DOM, and a fresh scroller starts at the top.
   These lists are long and a refresh arrives from anywhere — a snapshot from the
   shared store, a control on the far side of the page, an autosave — so a reader
   halfway down the claims was having their place taken away by something they
   never touched. The positions are read before the rewrite and put back after,
   keyed by where each scroller sits in the panel: they are generated and carry
   no ids, and an index plus the class is enough to know the panel came back in
   the same shape. Where it did not, the position is dropped rather than guessed. */
const SCROLLERS = ".bbscroll,.clist,.cmplist";
function scrollMark(el){
  const was = [...el.querySelectorAll(SCROLLERS)].map(x => [x.className, x.scrollTop]);
  return () => [...el.querySelectorAll(SCROLLERS)].forEach((x, i) => {
    if(was[i] && was[i][0] === x.className && was[i][1]) x.scrollTop = was[i][1];
  });
}

function renderClaimList(hostId){
  const el = document.getElementById(hostId);
  if(!el) return;
  const keep = scrollMark(el);
  /* Step 1.3 is where arrows are selected, so it lists every claim between
     the constructs step 1.2 handed it, checked or not. Later steps list what it
     handed on. */
  const picking = state.stage === 3;
  const stmts = statementsInPlay(picking).sort(byEvidence);
  // only the ones added. The rest are proposals, and they have a list of their
  // own below: a hundred and thirty-eight of them among the claims would bury
  // what the papers actually say.
  const comp = composedPaths().filter(f => state.comp.has(f.id));
  const rows = stmts.reduce((t, g) => t + g.rows.length, 0);
  const on = stmts.reduce((t, g) => t + g.rows.filter(r => r.on).length, 0);
  /* A relation added by hand widens the space to enumerate exactly as much as
     one a paper asserted: what sets the width is the class declared on it, and
     a claim with no class declared admits all fourteen members whoever wrote
     it. So it counts here, and it is counted apart in the figures. */
  const hand = [...mclm.values()].map(m => ({e:{id:"mx:" + m.id}}));
  const sp = impliedSpace(statementsInPlay(false).concat(hand));
  /* What step 2.1 added, shown on the step after it. Not editable here: a
     claim asserted on step 2.1 is taken back on step 2.1, which is the same
     rule that sends you back for an arrow you dropped. */
  const handSec = state.stage >= 5 && mclm.size
    ? `<section class="wlgroup hand"><div class="wlhead">
        <h4>Added by hand <span class="n hand">${mclm.size}</span></h4>
        <p class="wlfrom">goes to <b>whoever builds the model</b></p>
        <p>Relations asserted on step 2.1 because the model needed them and the corpus
          has not got them${mcon.size ? `, over ${mcon.size} construct${
          mcon.size === 1 ? "" : "s"} added the same way` : ""}. No paper stands behind any
          of them, so none is evidence and none is counted as such \u2014 but each one
          carries a class to enumerate, and the figure above includes them.</p>
      </div><div class="clist">${[...mclm.values()]
        .map(m => handGroupHTML(m, false)).join("")}</div></section>`
    : "";
  const nextOf = {3:"step 2.1", 4:"step 3.1", 5:"whoever builds the model",
                  6:"step 3.2", 7:"step 4.1"};
  if(!stmts.length){
    const why = noArrowsWhy();
    el.innerHTML = `<section class="wlgroup"><div class="wlhead">
      <h4>${picking ? "Selection of relationships for next step" : "Relationships carried forward"}
        <span class="n">0</span></h4>
      <p>${why ? `Nothing can be carried, because ${why}.`
        : `Every arrow between the selected constructs has been dropped. Click one on the
           map to take it back, or press <b>All</b> above the map.`}</p>
      </div></section>` + handSec;
    wireClaimGroups(el); keep();
    return;
  }
  el.innerHTML = `<section class="wlgroup">
    <div class="wlhead">
      <h4>${picking ? "Selection of relationships for next step" : "Relationships carried forward"}
        <span class="n">${picking ? `${on} of ${rows}` : rows}</span>${
        comp.length ? ` <span class="n cmpd">+${comp.length} composed</span>` : ""}</h4>
      ${picking ? "" : `<p class="wlfrom">goes to <b>${
        nextOf[state.stage] || "the next step"}</b></p>
      <p>Every relationship on a selected arrow, grouped by the pair it joins, with the properties
        of the relation between them. To take one back or add one, go to step 1.3, where
        that was decided.
        <b>${sp.n - sp.open}</b> of ${sp.n} carried relations have a declared class, implying at
        most <b>${spaceText(sp)}</b> distinct models${sp.open
          ? ` — ${sp.open} of them fix no shape` : ""}.</p>`}
    </div>
    <div class="clist">${stmts.map(g => claimGroupHTML(g, picking)).join("")}${
      comp.map(f => composedGroupHTML(f, picking)).join("")}</div></section>`
    + (picking ? composedListHTML() : "") + handSec;
  wireClaimGroups(el);
  wireComposed(el);
  keep();
}

/* ------------------------------------------------ the editor for one claim */
let domEditing = null;

/* The same editor, for three kinds of row. A corpus statement arrives with its
   papers; a relation reconstructed from a model and a claim added by hand
   arrive with none, and the preamble has to say so rather than print an empty
   record. Without this the Edit button on both of those looked live and did
   nothing at all, because the lookup only ever searched the corpus. */
function declaredOnly(id){
  if(id.startsWith("mx:")){
    const m = mclm.get(id.slice(3));
    return m && {e:{id, source:{label:handName(m.from)}, target:{label:handName(m.to)}},
      rows:[], bare:"Nothing in the corpus asserts this. You added it on step 2.1" +
        (m.g ? ", declaring it " + m.g : "") + (m.def ? ": " + m.def : ".")};
  }
  if(id.startsWith("mr:")){
    const r = (MR.relations || []).find(x => "mr:" + x.id === id);
    if(!r || !r.proposes) return null;
    return {e:{id, source:{label:handName(r.proposes.from)},
      target:{label:handName(r.proposes.to)}}, rows:[],
      bare:"No paper asserts this. It is what " + relName(r.id) +
        " would need one to assert" + (r.says ? ": " + r.says : ".")};
  }
  return null;
}
function openDomain(id){
  const dlg = document.getElementById("domdlg");
  const hit = statementsInPlay(state.stage === 3).find(x => x.e.id === id)
    || declaredOnly(id);
  if(!hit || !dlg) return;
  domEditing = id;
  const {e, rows} = hit;
  const ps = support(rows);
  /* The evidence across the whole pair, because the declaration is about the
     pair: every sign the papers assert, every basis, and the first estimate
     any of them reports. */
  const c = {
    g: [...new Set(rows.map(r => r.c.g))].join(" / "),
    e: [...new Set(rows.map(r => r.c.e))].join(" / "),
    spf: rows.every(r => (r.c.spf || []).includes("no functional form"))
      ? ["no functional form"] : [],
    eaf: rows.some(r => (r.c.eaf || []).includes("scope stated")) ? ["scope stated"] : [],
    v: (rows.find(r => r.c.v) || {c:{}}).c.v,
    t: (rows[0] || {c:{}}).c.t,
  };
  const v = Object.assign(SPEC0(), spec.get(id) || {});
  // a name somebody typed keeps its hyphens; a construct id does not have any
  const nm = x => hit.bare ? String((x && x.label) || x) : lbl(x);
  document.getElementById("domwhat").innerHTML = hit.bare
    ? `${nm(e.source)} → ${nm(e.target)} · no paper`
    : `${nm(e.source)} → ${nm(e.target)} · ${ps.length} paper${
      ps.length === 1 ? "" : "s"} · ${rows.length} relationship${rows.length === 1 ? "" : "s"}`;

  const recorded = [
    ["sign", c.g],
    ["basis", c.e],
    ["form", (c.spf || []).includes("no functional form") ? "not stated" : "stated"],
    ["scope", (c.eaf || []).includes("scope stated") ? "stated, in prose" : "not stated"],
    ["estimate", c.v ? "a number" : "none"],
  ];
  document.getElementById("dombody").innerHTML = `
    <p class="why" style="margin-top:0">${hit.bare ? hesc(hit.bare)
      : `What the paper recorded, which this does not change: ${
          recorded.map(([k, x]) => `<b>${k}</b> ${x}`).join(" · ")}.
        ${c.t ? `<i>“${hesc(String(c.t).slice(0, 220))}${
          String(c.t).length > 220 ? "…" : ""}”</i>` : ""}`}</p>
    <span class="ctl-label" style="margin-top:12px;display:block">Functional form</span>
    <p class="why">The class, not a member. A property here is one
      <code>check_family()</code> can verify, and declaring none admits every member
      the vocabulary carries.</p>
    <div class="pgrid">${FORMPROPS.map(f => `
      <label class="chk"><input type="checkbox" data-prop="${f.k}"
        ${v.props.includes(f.k) ? "checked" : ""}>
        <span><b>${f.k}</b><i>${f.why}</i></span></label>`).join("")}</div>
    <span class="ctl-label" style="margin-top:14px;display:block">Range of the antecedent</span>
    <p class="why">The region the relationship is asserted over, on the antecedent's own
      normalised scale. Declared rather than discovered, so a reader can reconstruct it.</p>
    <div class="rng">
      <label>from <input type="number" id="domlo" step="0.05" min="0" max="1"
        value="${v.lo}"></label>
      <label>to <input type="number" id="domhi" step="0.05" min="0" max="1"
        value="${v.hi}"></label>
    </div>
    <span class="ctl-label" style="margin-top:14px;display:block">Range of the estimate</span>
    <p class="why">${c.v
      ? `The paper reports <i>${hesc(String(c.v).slice(0, 160))}</i>${c.vn
          ? ` — one of <b>${c.vn}</b> figures it gives for this relationship` : ""}. An interval, not the
         point: a relationship asserted at one coefficient is a claim about that regression.`
      : `This relationship carries no number, so an interval here is a declaration and not a
         reading. Leave it empty unless you mean to bound it.`}</p>
    <div class="rng">
      <label>from <input type="number" id="domelo" step="0.01"
        value="${v.elo == null ? "" : v.elo}"></label>
      <label>to <input type="number" id="domehi" step="0.01"
        value="${v.ehi == null ? "" : v.ehi}"></label>
    </div>
    <span class="ctl-label" style="margin-top:14px;display:block">Why</span>
    <p class="why">The reason goes in the record with the declaration. A domain nobody
      can account for is the stipulation this step exists to replace.</p>
    <input type="text" id="domnote" value="${hesc(v.note || "")}"
      placeholder="on what grounds this is the region" aria-label="Why this domain">
    <p class="dlgwarn" id="domclash" hidden></p>`;

  const read = () => ({
    props: [...document.querySelectorAll("#dombody [data-prop]")]
      .filter(x => x.checked).map(x => x.dataset.prop),
    lo: parseFloat(document.getElementById("domlo").value),
    hi: parseFloat(document.getElementById("domhi").value),
    elo: document.getElementById("domelo").value === "" ? null
      : parseFloat(document.getElementById("domelo").value),
    ehi: document.getElementById("domehi").value === "" ? null
      : parseFloat(document.getElementById("domehi").value),
    note: document.getElementById("domnote").value.trim(),
  });
  const warn = () => {
    const d = read(), bad = propClash(d.props);
    if(!(d.lo < d.hi)) bad.push("the range runs from " + d.lo + " to " + d.hi +
      ", which is not a range");
    if(d.elo != null && d.ehi != null && !(d.elo < d.ehi))
      bad.push("the estimate interval does not run upwards");
    const w = document.getElementById("domclash");
    w.hidden = !bad.length; w.textContent = bad.join(" · ");
    document.getElementById("domsize").innerHTML = bad.length
      ? "not declarable as it stands"
      : `${memberCount(d.props)} of ${MEMBERS_ALL} members admitted`;
    document.getElementById("domsave").disabled = bad.length > 0;
    return bad;
  };
  document.getElementById("dombody").addEventListener("input", warn);
  warn();
  dlg.showModal();
}

/* WHAT A DOMAIN SAVE MUST NOT THROW AWAY.

   A declared relation's record holds more than this dialog edits. SPEC0 in
   03b-decisions.js gives the shape -- rel, roles, props, lo, hi, elo, ehi,
   note -- and specSet() also tests `role`, which an older record or an
   imported model carries, and `target`, a moderator's. The dialog edits six
   of those and used to rebuild the record from scratch, carrying `rel`
   forward by hand and silently dropping ROLES, ROLE and TARGET. So declaring
   a domain of validity on a relation erased the roles somebody had declared
   for it, and the moderator it was declared to run through, every time.

   Recorded as the last of the defects in the specification's section 5.3.

   A merge, so a field this dialog does not edit survives it, and a function
   so the merge can be tested without a dialog: tests/domain.test.mjs. */
function domMerge(existing, edited){
  const was = existing || {};
  return Object.assign({}, was, edited);
}

function wireDomain(){
  const dlg = document.getElementById("domdlg");
  if(!dlg) return;
  const close = () => { domEditing = null; dlg.close(); };
  document.getElementById("domcancel").addEventListener("click", close);
  document.getElementById("domclear").addEventListener("click", () => {
    if(domEditing) sforget(domEditing);
    close();
  });
  /* The relation as a file, written from what is SAVED rather than from what
     is on screen: a half-edited dialog is not a declaration, and exporting
     one would put a value in a file that nothing on the page holds. The
     dialog stays open, because looking at the declaration is how a reader
     checks the file they just asked for. */
  const dx = document.getElementById("domexp");
  if(dx) dx.addEventListener("click", ev => {
    ev.preventDefault();
    if(domEditing) exportRelation(domEditing, dx);
  });
  document.getElementById("domsave").addEventListener("click", () => {
    if(!domEditing) return close();
    const edited = {
      props: [...document.querySelectorAll("#dombody [data-prop]")]
        .filter(x => x.checked).map(x => x.dataset.prop),
      lo: parseFloat(document.getElementById("domlo").value),
      hi: parseFloat(document.getElementById("domhi").value),
      elo: document.getElementById("domelo").value === "" ? null
        : parseFloat(document.getElementById("domelo").value),
      ehi: document.getElementById("domehi").value === "" ? null
        : parseFloat(document.getElementById("domehi").value),
      note: document.getElementById("domnote").value.trim(),
      at: new Date().toISOString().slice(0, 10),
    };
    const d = domMerge(spec.get(domEditing), edited);
    if(propClash(d.props).length || !(d.lo < d.hi)) return;
    spec.set(domEditing, d);
    spersist(domEditing, d);
    // declaring is the decision; nothing asks for it to be confirmed again
    close(); refresh();
  });
  dlg.addEventListener("cancel", () => { domEditing = null; });
}

/* --------------------------------------- the two things step 2.1 can add

   A construct and a relation, each on the modeller's own authority. They are
   popups for the reason the domain editor is one: the definition is several
   lines long and the list it is reached from is longer. */
let conEditing = null, clmEditing = null;

function openCon(id){
  const dlg = document.getElementById("condlg");
  if(!dlg) return;
  conEditing = id || null;
  const m = id ? mcon.get(id) : null;
  const on = id ? [...mclm.values()].filter(x => x.from === id || x.to === id).length : 0;
  document.getElementById("condlgh").textContent = m ? "Edit a construct" : "Add a construct";
  document.getElementById("conwhat").textContent = m
    ? `added ${m.at} · ${on} relationship${on === 1 ? "" : "s"} on it`
    : "it joins the selected constructs, and carries no paper";
  document.getElementById("conwarn").textContent = "";
  document.getElementById("conbody").innerHTML = `
    <span class="ctl-label" style="display:block">Name</span>
    <p class="why" style="margin-top:3px">What the quantity is called. A merge takes its name
      from the papers that measured it. This one has none, so the name is yours.</p>
    <input type="text" id="conname" value="${hesc(m ? m.name : "")}"
      placeholder="regulatory exposure" aria-label="Name of the construct">
    <span class="ctl-label" style="margin-top:14px;display:block">Definition</span>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A few lines on what it means and, if you can say it, what would measure
      it. Every other construct on this page is defined by the extractions behind it; this
      one is defined by nothing but this text, and this text is what goes out with the
      record for whoever reads it next.</span></p>
    <textarea id="condef" rows="5" placeholder="The degree to which …"
      aria-label="Definition of the construct">${hesc(m ? m.def || "" : "")}</textarea>`;
  dlg.showModal();
  document.getElementById("conname").focus();
}

function wireCon(){
  const dlg = document.getElementById("condlg");
  if(!dlg) return;
  const close = () => { conEditing = null; dlg.close(); };
  document.getElementById("concancel").addEventListener("click", close);
  dlg.addEventListener("cancel", () => { conEditing = null; });
  document.getElementById("consave").addEventListener("click", () => {
    const nm = document.getElementById("conname").value.trim();
    const df = document.getElementById("condef").value.trim();
    if(!nm){
      document.getElementById("conwarn").textContent = "A construct needs a name.";
      document.getElementById("conname").focus();
      return;
    }
    const id = conEditing || mid("xc");
    const old = mcon.get(id);
    mcon.set(id, {id, name:nm, def:df,
      at: old ? old.at : new Date().toISOString().slice(0, 10)});
    msaveLocal(); close(); refresh();
  });
}

function openClm(id){
  const dlg = document.getElementById("clmdlg");
  if(!dlg) return;
  clmEditing = id || null;
  const m = id ? mclm.get(id) : null;
  const ends = handEnds();
  const v = spec.get("mx:" + (id || ""));
  const opt = (cur, k, t) =>
    `<option value="${hesc(k)}"${cur === k ? " selected" : ""}>${hesc(t)}</option>`;
  const pick = cur => ends.map(e =>
    opt(cur, e.id, e.name + (e.hand ? "  — added by hand" : ""))).join("");
  const nh = ends.filter(e => e.hand).length;
  // a fresh claim opens on the first two, because opening on one construct
  // twice is a form the Assert button would have to refuse
  const d0 = m ? m.from : ((ends[0] || {}).id || "");
  const d1 = m ? m.to : ((ends[1] || {}).id || "");
  document.getElementById("clmdlgh").textContent = m ? "Edit a relationship" : "Assert a relationship";
  document.getElementById("clmwhat").textContent = ends.length < 2
    ? "a relationship needs two constructs and this step has fewer"
    : `${ends.length} constructs to choose between${nh ? `, ${nh} of them added by hand` : ""}`;
  document.getElementById("clmwarn").textContent = "";
  document.getElementById("clmbody").innerHTML = `
    <p class="why fold" style="margin-top:0"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">No paper in this extraction asserts this. Everything
      declared below is yours, every row it appears on says so, and none of it is ever
      counted as evidence — which is the only way the corpus figures stay true.</span></p>
    <div class="frow">
      <label>from<select id="clmfrom">${pick(d0)}</select></label>
      <label>to<select id="clmto">${pick(d1)}</select></label>
    </div>
    <span class="ctl-label" style="margin-top:15px;display:block">Relationship</span>
    <p class="why">Jaccard and Jacoby's six causal types and the prior cut before them. The
      same declaration the <b>rel</b> bucket makes on every other relationship, and it can be
      changed on the row afterwards.</p>
    <select id="clmrel" aria-label="Type of relationship">${
      opt((v && v.rel) || "", "", "not declared")}${
      JJ_REL.map(r => opt((v && v.rel) || "", r.k, r.n)).join("")}</select>
    <div class="frow" style="margin-top:15px">
      <label>sign<select id="clmsign">${opt(m ? m.g : "", "", "not declared")}${
        SIGNS.map(g => opt(m ? m.g : "", g, g)).join("")}</select></label>
      <label>form stated<select id="clmform">${opt(m ? m.sh : "", "", "not stated")}${
        JJ_FORM.map(f => opt(m ? m.sh : "", f, f)).join("")}</select></label>
    </div>
    <span class="ctl-label" style="margin-top:15px;display:block">Definition</span>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A few lines on what the relation asserts and on what grounds. The class it
      will be enumerated over and the range it is asserted on are declared separately, with
      <b>Edit</b> on the row once this exists — the same editor every other relationship uses.</span></p>
    <textarea id="clmdef" rows="5" placeholder="Higher … raises …, because …"
      aria-label="Definition of the relationship">${hesc(m ? m.def || "" : "")}</textarea>`;
  dlg.showModal();
}

function wireClm(){
  const dlg = document.getElementById("clmdlg");
  if(!dlg) return;
  const close = () => { clmEditing = null; dlg.close(); };
  document.getElementById("clmcancel").addEventListener("click", close);
  dlg.addEventListener("cancel", () => { clmEditing = null; });
  document.getElementById("clmsave").addEventListener("click", () => {
    const from = document.getElementById("clmfrom").value;
    const to = document.getElementById("clmto").value;
    const w = document.getElementById("clmwarn");
    if(!from || !to){
      w.textContent = "Two constructs are needed, and this step has fewer than two.";
      return;
    }
    if(from === to){
      w.textContent = "A construct bearing on itself is not a relation. Pick two.";
      return;
    }
    const id = clmEditing || mid("xk");
    const old = mclm.get(id);
    mclm.set(id, {id, from, to,
      g: document.getElementById("clmsign").value,
      sh: document.getElementById("clmform").value,
      def: document.getElementById("clmdef").value.trim(),
      at: old ? old.at : new Date().toISOString().slice(0, 10)});
    // the relationship type lives where every other claim's does
    const sid = "mx:" + id, rel = document.getElementById("clmrel").value;
    const sv = Object.assign(SPEC0(), spec.get(sid) || {});
    sv.rel = rel; sv.at = new Date().toISOString().slice(0, 10);
    if(specSet(sv)){ spec.set(sid, sv); spersist(sid, sv); } else spec.delete(sid);
    msaveLocal(); close(); refresh();
  });
}

/* ------------------------------------------- typing a construct as a quantity

   The one declaration the bench never asked for and the build cannot do
   without. Everything else on step 3.1 is read off something: the relations
   from step 1.3, the definitions from step 2.1. This is read off nothing,
   which is why the corpus's own signature is printed in the header rather than
   buried \u2014 a field-level stock typed as a firm-level degree should be
   uncomfortable at the moment it is declared. */
let varEditing = null;

function openVar(k){
  const dlg = document.getElementById("vardlg");
  if(!dlg) return;
  varEditing = k;
  const t = Object.assign({name:varName(k), lo:0, hi:1}, vtype.get(k) || {});
  const curK = vKinds(k), curA = vAspects(k);
  const n = (lastView.allNodes || []).find(x => x.id === k);
  const lead = (n && typeof N !== "undefined" && N.get) ? (N.get(n.mem[0].i) || {}) : {};
  document.getElementById("vardlgh").textContent = handName(k);
  document.getElementById("varwhat").textContent = n
    ? `${n.levels.join(" + ")} \u00b7 ${lead.s || "?"} \u00b7 ${
        lead.f === "s" ? "stock" : "flow"} \u00b7 borne by ${lead.b || "?"} \u00b7 ${
        n.papers.length} paper${n.papers.length === 1 ? "" : "s"}`
    : "added by hand \u2014 no measure behind it, so nothing to read this against";
  document.getElementById("varwarn").textContent = "";
  // checkboxes and not radios: tick every kind the evidence leaves open and the
  // enumeration runs them all, which is the same move the form class makes
  const grid = (nme, opts, cur) => `<div class="pgrid">${opts.map(([kk, why]) => `
    <label class="chk"><input type="checkbox" name="${nme}" value="${kk}"
      ${cur.includes(kk) ? "checked" : ""}>
      <span><b>${kk}</b><i>${why}</i></span></label>`).join("")}</div>`;
  document.getElementById("varbody").innerHTML = `
    <span class="ctl-label" style="display:block">Name in the model</span>
    <p class="why" style="margin-top:3px">An identifier. It is what the generated file calls this
      quantity and what every mechanism reading or writing it will name.</p>
    <input type="text" id="varnm" value="${hesc(t.name)}" aria-label="Name in the model">
    <span class="ctl-label" style="margin-top:15px;display:block">Kind</span>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The shape of the thing, and deliberately not an ontology of constructs: two
      theories can agree that something is a rate while disagreeing about everything else.
      <b>Tick every one the evidence leaves open</b> \u2014 the enumeration runs them all, and
      ticking none admits all nine.</span></p>
    ${grid("vkind", KINDS, curK)}
    <span class="ctl-label" style="margin-top:15px;display:block">Aspect</span>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Whether it is measured absolutely or against a baseline. The second is
      load-bearing and easy to miss: such a quantity is zero at its baseline <i>by
      construction</i>, so a relationship that it is zero there asserts nothing. Missing it has already
      made two governance models in this repository look incomparable.</span></p>
    ${grid("vaspect", ASPECTS, curA)}
    <span class="ctl-label" style="margin-top:15px;display:block">Bounds</span>
    <p class="why">The interval a sweep runs over. Declared, not estimated \u2014 nothing in this
      corpus fixes a parameter, which <code>reconcile.py</code> measured rather than assumed.</p>
    <div class="rng">
      <label>from <input type="number" id="varlo" step="0.05" value="${t.lo}"></label>
      <label>to <input type="number" id="varhi" step="0.05" value="${t.hi}"></label>
    </div>`;
  dlg.showModal();
  document.getElementById("varnm").focus();
}

function wireVar(){
  const dlg = document.getElementById("vardlg");
  if(!dlg) return;
  const close = () => { varEditing = null; dlg.close(); };
  document.getElementById("varcancel").addEventListener("click", close);
  dlg.addEventListener("cancel", () => { varEditing = null; });
  document.getElementById("varclear").addEventListener("click", () => {
    if(varEditing){ vtype.delete(varEditing); vsaveLocal(); }
    close(); refresh(); renderPanel();
  });
  document.getElementById("varsave").addEventListener("click", () => {
    if(!varEditing) return close();
    const pick = n => [...document.querySelectorAll(`#varbody [name="${n}"]:checked`)]
      .map(x => x.value);
    const nm = document.getElementById("varnm").value.trim()
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const lo = parseFloat(document.getElementById("varlo").value);
    const hi = parseFloat(document.getElementById("varhi").value);
    const w = document.getElementById("varwarn");
    if(!nm) return void (w.textContent = "A quantity needs a name the generated file can use.");
    if(!(lo < hi)) return void (w.textContent = "The bounds run from " + lo + " to " + hi +
      ", which is not an interval.");
    const clash = [...vtype.entries()].find(([k, x]) => k !== varEditing && x.name === nm);
    if(clash) return void (w.textContent = `${nm} is already the name of another quantity.`);
    // the interval was on screen and was saved, so it is declared. A bulk
    // action never sets this, which is what keeps [0, 1] a default rather
    // than something to hold the arithmetic to
    vtype.set(varEditing, {id:varEditing, name:nm, kinds:pick("vkind"),
      aspects:pick("vaspect"), lo, hi, bset:true,
      at:new Date().toISOString().slice(0, 10)});
    vsaveLocal(); close(); refresh(); renderPanel();
  });
}

/* WHAT THE RAIL'S LISTENERS READ, held apart from the render that builds it.

   `#grail` is not replaced between renders -- only its innerHTML is -- so the
   seven listeners bound at the end of renderSelectedRail() were bound again on
   every render and never removed. After fifty renders fifty copies of each ran
   on every drag event, all doing the same work, and the oldest closed over a
   node index fifty renders stale.

   They are bound once now, and the two per-render indexes they need live here
   so a handler reads the current one instead of the one it captured. */
const RAIL = {byId:new Map(), gOf:new Map()};
function renderSelectedRail(){
  const el = document.getElementById("grail");
  const keep = scrollMark(el);
  const all = lastView.nodes || [];
  const byId = new Map(all.map(n => [n.id, n]));

  const gOf = new Map();
  [...groups.values()].forEach(g => all.forEach(n => {
    if(n.mem.some(m => g.members.includes(m.i))) gOf.set(n.id, g); }));
  RAIL.byId = byId; RAIL.gOf = gOf;

  const bySize = (a, b) => b.nc - a.nc;
  const row = n => `<li class="crow" data-zone="row" data-nid="${n.id}" draggable="true">
      <input type="checkbox" data-pick="${n.id}" ${n.carried ? "checked" : ""}
             aria-label="${n.label.replace(/-/g," ")}">
      <span class="tname">${n.label.replace(/-/g," ")}</span>
      <span class="tmeta">${n.papers.length}p</span></li>`;

  const tally = {cur:0, rights:0, other:0}, picked2 = {cur:0, rights:0, other:0};
  all.forEach(n => { const k = streamOf(n); tally[k]++; if(n.carried) picked2[k]++; });

  /* The three literature sections are a step-four device. They split THIS one
     corpus by a rule over construct names, so that an imported second stream
     would have somewhere to sit beside it -- and on step 1.2 there is one
     literature, no import yet, and no claims chosen, so the split says nothing
     and the claims column has nothing to hold. Step 1.2 shows the selection. */
  /* Every word has to match, somewhere in the name or in the ids behind it --
     a hundred and thirty-nine constructs is more than a list anyone reads, and
     the thing a curator arrives with is a word. The ids are searched too
     because a merge can carry a name of its own that no paper used. */
  const terms = state.cq.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = n => (n.label + " " + n.mem.map(m => m.i).join(" "))
    .toLowerCase().replace(/-/g, " ");
  const match = n => !terms.length || terms.every(t => hay(n).includes(t));
  const assembling = state.stage >= 4;
  // the claims column is step 2.1's: there the blocks run the width of the
  // page, and the same list sits under the diagram on the steps either side
  const withClaims = state.stage === 4;

  /* One column, scrolling, with a heading per literature. No tabs: the three
     streams are a partition of the same corpus, and a curator comparing what
     purpose names with what property rights names should not have to click
     between them. The merges come first because they are the curator's own
     constructs and a merge can span two streams. */
  let html = `<div class="bbox"><div class="bbhd"><span class="movlab">Constructs</span>
      <span class="seedn">${all.filter(n => n.carried).length} selected of ${all.length}</span></div>
    <div class="bbfind">
      <input type="text" id="cq" value="${hesc(state.cq)}" autocomplete="off"
             placeholder="filter by word \u2014 purpose, trust, performance"
             aria-label="Filter the constructs by word">
      ${state.cq ? `<button type="button" id="cqx" aria-label="Clear the filter"
        >\u00d7</button>` : ``}
    </div>
    ${terms.length ? (() => {
      // count what the buttons can actually act on: a construct inside a merge
      // is carried with its merge, and the list below does not offer it
      const hit = all.filter(n => match(n) && !gOf.has(n.id));
      const inG = all.filter(n => match(n) && gOf.has(n.id)).length;
      return `<p class="railnote" style="margin:5px 0 0">${hit.length} of ${
        all.filter(n => !gOf.has(n.id)).length} match, ${
        hit.filter(n => n.carried).length} of them selected. The two buttons below act on
        the matches only.${inG ? ` ${inG} more sit inside a merge above and are carried
        with it.` : ""}</p>`; })() : ``}
    <div class="bbacts">
      <button type="button" data-free="all">select ${terms.length ? "the matches" : "all"}</button>
      <button type="button" data-free="none">${terms.length ? "none of them" : "none"}</button>
      ${assembling ? `<button type="button" class="tabbtn" id="impAmg"
              title="Somebody else's action model, held beside yours: their declarations, their arithmetic and the conclusions they retained. Each declaration is placed against this corpus and adopted by name or not at all. The same as Menu &rarr; Import &rarr; From an AMG.">Import another AMG&hellip;</button>
        <button type="button" class="tabbtn" data-imp="rtabImp"
              title="A second literature's own extraction, read in on step 1.1. This takes you there: a literature is scoped and weighed before it can be joined with.">+ literature</button>
        <button type="button" class="edbtn" id="addcon">+ construct</button>` : ``}
    </div>
    <div class="bbscroll">`;

  const gl = [...groups.values()].map(g => {
    const mem = all.filter(n => gOf.get(n.id) === g).sort(bySize);
    const lv = new Set(mem.flatMap(n => n.levels));
    return `<li class="gitem">
      <div class="gtop" data-zone="group" data-gid="${g.id}">
        <span class="gswatch" style="background:${cssColor(g.color)}"></span>
        <span class="gname">${hesc(g.name)}</span>
        <span class="tmeta">${mem.length}</span></div>
      ${lv.size > 1 ? `<div class="gmem mixed">mixed level: ${[...lv].join(" + ")}</div>` : ""}
      <ul class="gsub" data-zone="group" data-gid="${g.id}">${mem.length ? mem.map(row).join("")
        : `<li class="gnone">drag a construct here</li>`}</ul>
      <div class="gact">
        <button type="button" data-ren="${g.id}">Rename</button>
        <button type="button" class="del" data-del="${g.id}">Ungroup</button>
      </div></li>`;
  }).join("");
  if(groups.size) html += `<div class="strmhd" data-strm="hand"><span class="movlab">Merged by hand</span>
    <span class="seedn">${groups.size}</span></div><ul class="glist">${gl}</ul>`;

  /* Constructs the modeller added. Beside the merges rather than inside a
     stream, for the same reason: both are the curator's own and neither came
     out of a literature. A merge pools measures that exist; this has none, so
     what stands in for them is the definition underneath. */
  if(assembling && mcon.size) html += `<div class="strmhd" title="${hesc(
      "Constructs added on step 2.1, because the model needs them and no paper in this " +
      "extraction supplies one. Each carries a definition and no measure.")
    }"><span class="movlab">Added by hand</span>
    <span class="seedn">${mcon.size}</span></div><ul class="glist">${
    [...mcon.values()].map(m => {
      const on = [...mclm.values()].filter(x => x.from === m.id || x.to === m.id).length;
      return `<li class="gitem">
        <div class="gtop"><span class="gswatch" style="background:var(--steel)"></span>
          <span class="gname">${hesc(m.name)}</span>
          <span class="tmeta">${on ? `${on} relationship${on === 1 ? "" : "s"}` : "no relationship"}</span></div>
        <div class="gmem">${hesc(m.def || "no definition written")}</div>
        <div class="gact">
          <button type="button" data-hcon="${hesc(m.id)}">Edit</button>
          <button type="button" class="del" data-hcdel="${hesc(m.id)}">Remove</button>
        </div></li>`;
    }).join("")}</ul>`;

  if(assembling){
    for(const st of STREAMS){
      const mine = all.filter(n => streamOf(n) === st.k && !gOf.has(n.id))
        .sort((a, b) => (b.carried ? 1 : 0) - (a.carried ? 1 : 0) || bySize(a, b));
      html += `<div class="strmhd" title="${st.why}"><span class="movlab">${hesc(streamLabel(st.k))}</span>
        <span class="seedn">${picked2[st.k]} of ${tally[st.k]}</span></div>`;
      html += mine.length
        ? `<ul class="slist">${mine.map(row).join("")}</ul>`
        : `<p class="empty">Nothing from this literature is in view.</p>`;
      html += namedBox(new Set(all.flatMap(n => n.mem.map(m => m.i))), st.k);
    }
  }else{
    const mine = all.filter(n => !gOf.has(n.id) && match(n))
      .sort((a, b) => (b.carried ? 1 : 0) - (a.carried ? 1 : 0) || bySize(a, b));
    html += mine.length
      ? `<ul class="slist">${mine.map(row).join("")}</ul>`
      : terms.length
      ? `<p class="empty">No construct matches ${hesc(state.cq)}. The search reads the
         name and the construct ids behind it.</p>`
      : `<p class="empty">Nothing in view. Lower the occurrence threshold on step 1.1.</p>`;
  }

  if(!groups.size) html += `<p class="empty">No merges yet. Drag one construct onto another,
    here or on the map, and name the quantity they both measure.</p>`;

  html += `</div></div>` + (withClaims ? claimsBox() : "");
  el.innerHTML = html;
  keep();
  wireRelRows(el);
  wireClaimGroups(el);
  wireUnder();

  wireTabs(el);

  /* IMPORT ANOTHER AMG, ON THE STEP THAT IS ABOUT JOINING ONE. Block 2's
     own gist says it brings in another research stream
     packaged as an AMG, and the only way in was two levels down the Menu.
     It opens the same file input the Menu entry does -- one path, two doors --
     and it is wired here rather than at boot because the Building blocks are
     rewritten on every render. */
  const ia = el.querySelector("#impAmg");
  if(ia) ia.addEventListener("click", ev => {
    ev.preventDefault();
    const f = document.getElementById("impModelIn");
    if(f){ f.value = ""; f.click(); }
  });
  const ac = el.querySelector("#addcon");
  if(ac) ac.addEventListener("click", () => openCon(null));
  const ak = el.querySelector("#addclm");
  if(ak) ak.addEventListener("click", () => openClm(null));
  el.querySelectorAll("[data-hcon]").forEach(b =>
    b.addEventListener("click", () => openCon(b.dataset.hcon)));
  /* Removing a construct is its own decision and nothing asks to confirm it.
     Removing the claims standing on it is not a decision anybody made, so that
     one is said out loud before it happens. */
  el.querySelectorAll("[data-hcdel]").forEach(b =>
    b.addEventListener("click", () => {
      const m = mcon.get(b.dataset.hcdel);
      if(!m) return;
      const on = [...mclm.values()].filter(x => x.from === m.id || x.to === m.id).length;
      if(on && !confirm(`${m.name} has ${on} relationship${on === 1 ? "" : "s"} on it. ` +
        `Removing the construct removes ${on === 1 ? "that relationship" : "those relationships"} too.`)) return;
      mforgetCon(m.id);
    }));

  el.querySelectorAll("[data-del]").forEach(b =>
    b.addEventListener("click", () => gremove(b.dataset.del)));
  el.querySelectorAll("[data-ren]").forEach(b => b.addEventListener("click", () => {
    const g = groups.get(b.dataset.ren); if(!g) return;
    const nm = prompt("Name this construct", g.name);
    if(nm && nm.trim()){ g.name = nm.trim(); gpersist(g); refresh(); }
  }));
  /* Everything not gathered under a name, in one gesture. The merges are the
     decisions you made; this is the rest. */
  el.querySelectorAll("[data-free]").forEach(b => b.addEventListener("click", () => {
    const on = b.dataset.free === "all";
    // what is shown is what they act on: a filter you cannot act on is a
    // reading aid, and this one is for selecting
    all.forEach(n => { if(!gOf.has(n.id) && match(n)) setCarryNode(n, on); });
    cpersist(); refresh();
  }));
  /* Typing changes nothing that was decided, so it redraws the rail and does
     not refresh the view -- and it puts the caret back where it was, because a
     box that loses focus on the second letter cannot be typed into. */
  const q = el.querySelector("#cq");
  if(q) q.addEventListener("input", () => {
    const at = q.selectionStart;
    state.cq = q.value;
    renderSelectedRail();
    const q2 = document.getElementById("cq");
    // expected: setSelectionRange throws on an input type with no selection
    if(q2){ q2.focus(); try{ q2.setSelectionRange(at, at); }catch(e){} }
  });
  const qx = el.querySelector("#cqx");
  if(qx) qx.addEventListener("click", () => { state.cq = ""; renderSelectedRail(); });
  el.querySelectorAll("[data-pick]").forEach(cb => cb.addEventListener("change", () => {
    // byId holds this tab's clusters; a construct named by a claim can belong to
    // another tab, so fall back to the unnarrowed world before giving up.
    const n = byId.get(cb.dataset.pick)
      || (lastView.allNodes || []).find(x => x.id === cb.dataset.pick);
    if(!n) return;
    setCarryNode(n, cb.checked); cpersist(); refresh();
  }));

  /* ---- dragging between the three sections, bound once ---------------- */
  if(el.dataset.railWired) return;
  el.dataset.railWired = "1";
  const zoneOf = t => (t && t.closest) ? t.closest("[data-zone]") : null;
  const clear = () => el.querySelectorAll(".dragover")
    .forEach(x => x.classList.remove("dragover"));

  el.addEventListener("dragstart", ev => {
    const li = ev.target.closest && ev.target.closest(".crow"); if(!li) return;
    dragSet(li.dataset.nid);
    ev.dataTransfer.effectAllowed = "move";
    // expected: some browsers refuse setData outside a real drag gesture
    try{ ev.dataTransfer.setData("text/plain", dragNid); }catch(e){}
    li.classList.add("dragging");
  });
  el.addEventListener("dragend", () => { dragSet(null); clear();
    el.querySelectorAll(".dragging").forEach(x => x.classList.remove("dragging")); });
  el.addEventListener("dragover", ev => {
    const z = zoneOf(ev.target); if(!z || !dragNid) return;
    ev.preventDefault(); ev.dataTransfer.dropEffect = "move";
    if(z.dataset.zone === "row" && z.dataset.nid === dragNid){ clear(); return; }
    clear(); z.classList.add("dragover");
  });
  el.addEventListener("dragleave", ev => { if(ev.target === el) clear(); });
  el.addEventListener("drop", ev => {
    const z = zoneOf(ev.target); if(!z) return;
    ev.preventDefault(); clear();
    const src = RAIL.byId.get(dragNid || (ev.dataTransfer && ev.dataTransfer.getData("text/plain")));
    dragSet(null);
    if(!src) return;
    const kind = z.dataset.zone;
    if(kind === "row"){
      const tgt = RAIL.byId.get(z.dataset.nid);
      if(tgt) joinNodes(src, tgt);
      return;
    }
    if(kind === "group"){
      const g = groups.get(z.dataset.gid);
      if(g && RAIL.gOf.get(src.id) !== g) addNodeToGroup(g, src);
      return;
    }
    if(kind === "free"){
      const g = RAIL.gOf.get(src.id);
      if(g) return dropNodeFromGroup(g, src);
      if(!src.carried){ setCarryNode(src, true); cpersist(); refresh(); }
      return;
    }
    if(kind === "out"){
      const g = RAIL.gOf.get(src.id);
      if(g){ dropNodeFromGroup(g, src); return; }
      if(src.carried){ setCarryNode(src, false); cpersist(); refresh(); }
    }
  });

  const tipOf = t => { const li = t && t.closest && t.closest("[data-nid]");
    const n = li && RAIL.byId.get(li.dataset.nid);
    return n ? nodeTip(n, n.carried ? "drag it onto another to merge the two"
                                    : "tick it to select it") : null; };
  ["mouseover","mousemove"].forEach(e => el.addEventListener(e, ev => {
    const html = tipOf(ev.target); html ? showTip(html, ev) : hideTip(); }));
  el.addEventListener("mouseleave", hideTip);
}

/* A construct's card: its definition, signature and the papers behind it. The
   map and the rail hover the same thing, so they show the same card. */
function nodeTip(d, act){
  const def = d.mem[0] && N.get(d.mem[0].i) ? N.get(d.mem[0].i).d : "";
  const ps = d.papers.slice(0,5).map(s => { const p = pap(s);
    return `<li>${p.a} (${p.y}) \u00b7 ${p.j}</li>`; }).join("");
  if(act === undefined) act = state.tool === "carry"
    ? (d.carried ? "click to DROP \u2014 it stops here" : "click to CARRY it forward")
    : state.tool === "group"
    /* `inPicked` is a function-LOCAL in 13-map.js and was called here as
       though it were global. It never resolved, on the module page or the
       classic one, so this branch threw whenever the group tool was the live
       one and a card was drawn. The old scanner could not see it: it pooled
       every declaration from every file including the ones nested inside
       functions, so "declared somewhere" was true. Asking the set directly
       is what the local does anyway. */
    ? (d.mem.some(m => picked.has(m.i)) ? "click to unpick" : "click to pick for merging")
    : "click to pin \u00b7 drag onto another to merge";
  return `<h5>${d.label.replace(/-/g," ")}</h5>
    ${def ? `<p class="def">${def.length>240?def.slice(0,239)+"\u2026":def}</p>` : ""}
    <span class="sig">${d.levels.join(" + ")} \u00b7 ${d.nc} relationship${d.nc>1?"s":""} \u00b7 ${d.papers.length} paper${d.papers.length>1?"s":""}${d.mem.length>1?` \u00b7 ${d.mem.length} constructs merged`:""}${(state.stage >= 2 && !d.carried)?" \u00b7 DROPPED":""}</span>
    ${d.nc <= 1 ? `<p class="def">One relationship names this, so nothing in the corpus corroborates
      or contradicts what it asserts. Carried into a model it is a quantity on one paper's
      word, which the model can say and a reader should know.</p>` : ""}
    <h6>Papers</h6><ul>${ps}${d.papers.length>5?`<li>+${d.papers.length-5} more</li>`:""}</ul>
    ${act ? `<span class="act">${act}</span>` : ""}`;
}


export { DIRS, EVB, EVW, ORDK, RAIL, SCROLLERS, answMark, byEvidence, carriedClaims, claimGroupHTML, claimPropsHTML, claimRowHTML, claimsInPlay, clmEditing, composedControlsHTML, composedGroupHTML, composedListHTML, conEditing, declaredOnly, dispGroupMark, distinctClaims, domChips, domEditing, domMerge, impliedSpace, kindOf, nodeTip, openClm, openCon, openDomain, openVar, paperNames, renderClaimList, renderSelectedRail, scrollMark, setCarryClaim, signBlockHTML, spaceText, statementsInPlay, supChip, support, varEditing, wireClaimGroups, wireClm, wireComposed, wireCon, wireDomain, wireVar };

/* AMG bench, page script 5 of 22: the four stages, and the chevrons that walk them.
   One shared global scope, loaded in order. See page/README.md. */
import { cssColor, hesc } from "../core/safe.js";
import { vKey, vTurned, vWord, xrunClause, xrunStale } from "../core/verdict.js";
import { comCount, comReady } from "./22-communities.js";
import { SCORE } from "../core/rank.js";
import { EXP, EXPSETS, expLabel, expLanes, expSize } from "../core/expset.js";
import { SIM, SIMNAMES, SIMSTEP, simForm } from "../core/similarity.js";
import { AI, AITIP, ARITH, CT, READ, aiErrHTML, aiMark, arithToText, classSpec, xinv } from "./08-ask.js";
import { ANSWSTAT, ASPECTS, COMPOSITIONS, KINDS, MEMBERS_ALL, ROLES, compo, cpersist, decided, dropped, groups, handName, mclm, mcon, memberCount, rulesOf, setCarryLink, setCarryNode, spec, specSet, targetOf, vtype } from "./03b-decisions.js";
import { BARSETS, COMPONENTS, barField, barsetOn, plotBlock, stepNo } from "./06-wiring.js";
import { BUF, CONDTXT, PROPS, RUNFORM, lineSigned, xtest } from "./09-derive.js";
import { CHAIN, DEPOSIT, PARTS } from "./02-modules.js";
import { G } from "../graph-data.js";
import { JALL, N, infold, pap, state } from "./03-stores.js";
import { MR } from "../model-report.js";
import { XRUN, xrunHTML } from "./21-exprun.js";
import { arithKeptHTML, arithPropHTML, liveInvariants, mechNames, mechRowsHTML, openSpace, outRowsHTML, outcomeVars, paramTableHTML, substituteSets, varName } from "./11-classes.js";
import { BOARD, boardHTML, boardKept, propLine, propSentence, readName, roundsHTML, statedLines, vdHTML } from "./05-explore.js";
import { PROV } from "./17-scenarios.js";
import { boardLaunchHTML, wsPopHTML, wsRankHTML } from "./18-workspace.js";
import { bufHTML, ctRowsHTML, keptPlot, plateHTML, plotBoarded } from "./10-depends.js";
/* Somebody else's action model, held beside this one. page/29-models.js. */
import { impPanelHTML } from "./29-models.js";
import { carriedClaims, distinctClaims, impliedSpace, spaceText, statementsInPlay } from "./12-claims.js";
import { carriedRelations, carriedVars, crossGroups, joinRecoHTML, propsOf, rolesOf, statedProps, vAspects, vKinds } from "./07-grouping.js";
import { core, inScope, okPaper, schemeNow } from "./03c-corpus.js";
import { ARCHIVES, CODELIC, DATALIC, DEP, HOSTS, TRANSCRIPTS, depDone, depFiles, depState, depVersion } from "./26-deposit.js";
import { NB, NBKIND, nbBad, nbKind, nbLabel } from "./25-notebook.js";
import { expSlotsNow } from "./20-expset.js";
import { lastView } from "./13-map.js";
import { lbl } from "./15-deposit.js";
import { refresh } from "./14-boot.js";
import { simPairs } from "./03d-similarity.js";
/* ------------------------------------------------------- the four stages */
const h = (s) => s;   // readability marker for template strings

/* The scheme the corpus is classified by, and where it came from. Everything
   the interface says about traditions is built from this, so swapping the
   source paper is a one-object change rather than a rewrite. */
/* THE CLASSIFICATION THE TRADITION FILTER SORTS BY, which used to be a
   constant and is a question now: a scheme can be read out of another paper
   and applied to the same corpus, so what the bar says about itself has to
   come from whichever scheme is standing. The shipped one is the fallback and
   stays named, because a reader comparing two cuts needs to know which one
   they are looking at. */
const SHIPPED = {
  n: 3,
  cite: 'Durand &amp; Huynh (2024), <i>JOMSR</i> 2(3\u20134)',
  what: "how a paper treats purpose"
};
/* What each shipped tradition means, which `G.approaches` does not carry: it
   holds the labels and these are the gloss the select used to spell out by
   hand. An imported scheme brings its own. */
const SHIPWHY = {
  st:"purpose as what a firm declares",
  ex:"purpose as what members feel",
  dm:"purpose as what guides choices",
};
function SCHEME(){
  const s = schemeNow();
  if(!s) return SHIPPED;
  return {n:s.traditions.length,
    cite:s.cite ? hesc(s.cite) : "<i>a paper read in on this step</i>",
    what:s.what || "how a paper treats the subject",
    name:s.name, imported:true};
}
/* The tradition options, built from whichever scheme is standing rather than
   written out, so an imported cut is selectable the moment it is accepted. */
function apOptions(){
  const s = schemeNow();
  const why = c => s
    ? ((s.traditions.find(t => t.code === c) || {}).why || "")
    : (SHIPWHY[c] || "");
  /* ONLY THE TRADITIONS SOME PAPER IS IN. A tradition nobody in this corpus
     works in is not a filter, it is a dead option -- and on a project with no
     papers at all every one of them is dead, which is how `New project` came
     to offer a cut of a literature it does not hold. Counted off G, so it
     follows an import and a literature swap without being told. */
  const used = new Set();
  for(const p of Object.values(G.papers || {})) if(p) used.add(p.ap || "--");
  return Object.entries(G.approaches).filter(([c]) => used.has(c)).map(([c, v]) => {
    const w = why(c);
    return `<option value="${hesc(c)}">${hesc(v.l)}${
      w ? " \u2014 " + hesc(String(w).slice(0, 90)) : ""}</option>`;
  }).join("");
}

/* A conclusion survives two things, and they are not the same question.

   `survives/of` is the class of functional FORMS, enumerated at sheet 1 -- the
   one parameter setting every published figure was drawn at. `make scope` also
   varies the setting at the reported shape, and both at once. The three
   disagree: soft_governance_raises_B survives every form and a quarter of the
   parameter samples break it, so a page reading only the form column reports it
   as surviving the whole declared class. These read the joint column when it is
   there and fall back to the form column when it is not, which is what a page
   served without a scope report has. */
const SCOPED = c => c && c.scope && c.scope.joint;
const holdsThroughout = c => SCOPED(c) ? c.scope.joint.universal : c.survives === c.of;
const DIMLAB = {
  "form-dependent": "the shape it is written in",
  "parameter-dependent": "the setting it is read at, not the shape",
  robust: "",
};
// What the conclusion survived, in both dimensions, for a worklist row.
const scopeDetail = c => {
  if(!SCOPED(c)) return `survives ${c.survives} of ${c.of} form combinations` +
    ` \u2014 the parameter dimension is not in this report`;
  const f = c.scope.forms, p = c.scope.params, j = c.scope.joint;
  const pc = x => x.of ? Math.round(100 * x.held / x.of) + "%" : "\u2014";
  return `${pc(f)} of ${f.of} forms at the reported setting \u00b7 ${pc(p)} of ${p.of}` +
    ` settings at the reported shape \u00b7 <b>${pc(j)} of the ${j.of} jointly</b>` +
    (DIMLAB[c.scope.kind] ? ` \u2014 fragile in ${DIMLAB[c.scope.kind]}` : "");
};

/* The two halves of specifying a model, as two functions, so the merge of
   step 3.1 is a text move. Each is the body of the step it came from,
   unchanged: `specifyBodyHTML` is what the literature leaves open, declared;
   `closeBodyHTML` is the arithmetic that closes it and the checks those
   declarations generate.

   They stay two functions and not one because the SECOND CHECKS THE FIRST,
   which is the only reason two acts belong apart -- seven of the nine checks in
   the second exist because of a declaration in the first, and a verdict has to
   be read against a standard entered before it. What the merge changes is the
   navigation and not the order: declare, then close, then read what held,
   without a chevron between a failure and the declaration that caused it. */
function specifyBodyHTML(v){
    const rels = carriedRelations(), vars = carriedVars(), nm = mechNames(rels);
    /* The moderators moved into this function with the mechanisms they modify,
       and this is the local they need. */
    const mods = rels.filter(r => rolesOf(r).some(x => ["gates", "modulates"].includes(x)));
    const subs = substituteSets(), sp = openSpace();
    const sig = k => {
      const n = (lastView.allNodes || []).find(x => x.id === k);
      if(!n) return mcon.has(k) ? "added by hand · no measure behind it" : "";
      const lead = (typeof N !== "undefined" && N.get) ? (N.get(n.mem[0].i) || {}) : {};
      return `${n.levels.join(" + ")} · ${lead.s || "?"} · ${
        lead.f === "s" ? "stock" : "flow"} · borne by ${lead.b || "?"}`;
    };
    const chip = (on, lab, attr, tip) =>
      `<button type="button" class="sup pick${on ? " on" : " none"}" ${attr}
        title="${hesc(tip)}">${lab}</button>`;
    return `
   <div class="row" style="gap:14px 26px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <p class="why" style="margin:0"><b>${sp.n - sp.open}</b> of ${sp.n} choices narrowed.
         What is left admits <b>${spaceText(sp)}</b> distinct models — ${sp.open} choices
         still carrying their whole vocabulary, each one multiplying the rest.</p>
     </div>

     <div class="fld" style="flex:1 1 100%;max-width:none">
       <!-- Two tabs over one panel, which is what they always were. As two
            pressed buttons in a box they read as a choice that DOES something,
            and each view then repeated its own name as a heading underneath. -->
       <div class="modebar tabsrow" role="tablist" aria-label="What is being declared">
         <button type="button" role="tab" id="decTabVars" aria-controls="decPanel"
           data-dec="vars" aria-selected="${state.dec !== "mech"}"
           title="What sort of thing each construct is, how the mechanisms writing an outcome combine, and the range each parameter runs over.">Variables</button>
         <button type="button" role="tab" id="decTabMech" aria-controls="decPanel"
           data-dec="mech" aria-selected="${state.dec === "mech"}"
           title="What each relation does, the class of shapes it runs over, which mechanisms stand in for each other and which only modify another.">Mechanisms</button>
         <!-- THE CODE GOES BEHIND A TAB. The arithmetic, the conditions and
              the model file were drawn under BOTH of the tabs above, so a
              first visit to this step met a box of code whatever it had come
              to declare. The fill-in pass above the step still writes the
              arithmetic without anybody opening this. -->
         <button type="button" role="tab" id="decTabAr" aria-controls="decPanel"
           data-dec="arith" aria-selected="${state.dec === "arith"}"
           title="The body that closes the model, the regularity conditions it has to satisfy, and the file both are written to.">Arithmetic</button>
       </div>
     </div>

     <div class="declgrid" id="decPanel" role="tabpanel"
       aria-labelledby="${state.dec === "mech" ? "decTabMech"
         : state.dec === "arith" ? "decTabAr" : "decTabVars"}">
     <div class="fld declcol${state.dec === "vars" || !state.dec ? "" : " off"}">
       <div class="embhd">
         <span class="ctl-label">Quantities ${infold(`Each construct typed as a mathematical object: its kind, its aspect, its bounds.`)}</span>
         <span class="cmpacts" style="margin:0">
           <button type="button" data-qbulk="recorded"
             title="Read the scale and the stock/flow the corpus recorded into the kind vocabulary. It narrows; it does not settle.">as recorded</button>
           <button type="button" data-qbulk="diff"
             title="Tick difference on quantities whose name says they are measured against something. Leaves everything it does not match alone.">differences</button>
           <button type="button" data-qbulk="all"
             title="Every kind and both aspects, written down as a decision rather than left absent.">all kinds</button>
           <button type="button" data-qbulk="none"
             title="Clear every quantity. The widest declaration available, not the narrowest.">none</button>
         </span>
       </div>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A construct as the literature reports it is a measured thing, with a level,
         a bearer and a scale; a quantity in a model is a mathematical object. The signature on
         the right is what the corpus recorded, so a field-level stock declared a firm-level
         degree is visible as you do it. <b>aspect</b> is the one that bites: a quantity measured
         against a baseline is zero there <i>by construction</i>, which is a fact about the
         measure and not a finding.</span></p>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx"><b>as recorded</b> reads the two things the corpus holds for all 422 — a
         scale and whether the thing is a stock or a flow — into the nine kinds. It narrows
         rather than settles: an ordinal stock comes back as two of nine, <i>nominal</i> reaches
         no kind the nine have a word for, and <i>ratio</i> says a zero is meaningful without
         saying what of. Aspect it cannot touch, because nothing records it — which is what
         <b>differences</b> is for, and that one proposes from the name rather than reading
         anything off, so it ticks what it matches and leaves the rest where it was.</span></p>
       ${aiRoleRows("qty")}
       <div class="chain">${vars.length ? vars.map(k => {
         const ks = vKinds(k), as = vAspects(k), t = vtype.get(k) || {};
         return `<div class="crow vrow">
           <span class="cst ${ks.length ? "ok" : "gap"}">${
             ks.length ? ks.length + " of 9" : "any of 9"}</span>
           <span class="cnm">${hesc(handName(k))}<span class="cfl">${hesc(varName(k))}${
             ks.length ? " · " + ks.join("/") : ""}${
             as.length ? " · " + as.join("/") : " · either aspect"} · ${
             t.bset ? (+t.lo).toFixed(2) + "–" + (+t.hi).toFixed(2)
               : "bound not declared"}</span></span>
           <button type="button" class="edbtn" data-vt="${hesc(k)}">${
             ks.length || as.length ? "Edit" : "Declare"}</button>
           <span class="cwy">${hesc(sig(k))}</span>
         </div>`; }).join("")
         : `<p class="empty">Nothing is being carried. Select arrows on step 1.3.</p>`}</div>

       <!-- An outcome is a quantity, so how its mechanisms combine belongs with
            the quantities and not with the mechanisms. This is the choice the
            literature never states and the one that decides what an ablation
            can see: under max a slack mechanism can be switched off and
            nothing moves. -->
       <div class="subsblk">
         <div class="embhd">
           <span class="ctl-label">Outcomes ${infold(`The mechanisms writing each outcome, and the rule that combines them.`)}</span>
           ${AI.cap ? `<span class="cmpacts" style="margin:0"><button type="button"
             data-ai="comp"${AI.busy ? " disabled" : ""}
             title="Reads the outcomes you have declared and proposes how each combines its inputs.${AITIP}">${aiMark()}${AI.busy === "comp"
               ? "reading the outcomes\u2026" : "suggest how they combine"}</button></span>` : ``}
         </div>
         <p class="lgloss">additive, multiplicative, a bottleneck, a substitute set, or between the two</p>
         ${outRowsHTML()}
         ${aiErrHTML("comp")}
         <!-- A COMPOSITION PROPOSAL, offered exactly as a condition is. The
              accept path has been here since the proposals were written: it
              finds the outcome by name, keeps only the rules inside the closed
              vocabulary and drops the rest. What was missing was the asking and
              the showing, so the capability was reachable from nothing. -->
         ${AI.comp.length ? `<div class="chain prop">${AI.comp.map(p => {
           const ok = (p.rules || []).filter(r => COMPOSITIONS.some(c => c[0] === r));
           const out = (p.rules || []).length - ok.length;
           return `<div class="crow prow">
             <span class="cst ${ok.length ? "part" : ""}">${ok.length ? "proposed" : "outside"}</span>
             <span class="cnm">${hesc(p.outcome || "outcome")}<span class="cfl">${
               ok.length ? hesc(ok.join(" | ")) : "none of these is one of the six"}${
               out ? ` \u00b7 ${out} outside the six, dropped` : ""}</span></span>
             <span class="pacts2">
               ${ok.length ? `<button type="button" class="edbtn" data-aiok="${hesc(p.id)}">Accept</button>` : ""}
               <button type="button" class="edbtn" data-aino="${hesc(p.id)}">Dismiss</button>
             </span>
             <span class="cwy">${hesc(p.why || "")}</span>
           </div>`;}).join("")}</div>` : ""}
       </div>

       <!-- Free parameters and the arithmetic's own constants, with the range
            each runs over. A range is a quantity's property, so it is here and
            not under the arithmetic that reads it: nothing can be proved over a
            range nobody stated. -->
       ${paramTableHTML() ? `<div class="subsblk">
         <span class="ctl-label">Parameters ${infold(`The range each one is swept over.`)}</span>
         <p class="lgloss">what the model reads rather than writes, and the weights the arithmetic introduced</p>
         ${paramTableHTML()}</div>` : ""}
     </div>

     <div class="fld declcol${state.dec === "mech" ? "" : " off"}">
       <div class="embhd">
         <span class="ctl-label">Mechanisms ${infold(`Each relation's role, and the class of shapes it runs over.`)}</span>
         <span class="cmpacts" style="margin:0">
           <button type="button" data-fams="1"
             title="The classes a shape can be declared from, with every member of each. A reference while you attribute shapes here, so it opens rather than sitting on the page.">families of forms</button>
           ${AI.cap ? `<button type="button" data-ai="roles"${AI.busy ? " disabled" : ""}
             title="Reads what every mechanism has been given and proposes the declarations still missing.${AITIP}">${aiMark()}${
             AI.busy === "roles" ? "reading the gaps\u2026" : "suggest what is missing"}</button>` : ``}
           <button type="button" data-bulk="stated">as stated</button>
           <button type="button" data-bulk="all"
             title="Increasing, and normalised at both ends: the three properties that do not exclude each other. Curvature is left open, so all three families stay admissible.">monotone</button>
           <button type="button" data-bulk="none">none</button>
         </span>
       </div>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The six on the left say what the relation <i>does</i> — and that is what
         makes a mechanism ablatable, since you can only switch off an operation named as
         separable. The six on the right are the class of shapes it will be run over, in the
         property vocabulary <code>check_family()</code> verifies. <b>as stated</b> reads the
         shape a paper committed to where one did and the estimator did not do it for them: 97
         of the 1080 relationships carry a shape imposed by a method, almost all of them linear, and a
         regression's default is not a theory's commitment — ${
           rels.filter(r => statedProps(r).length).length} of the ${rels.length} carried here
         ${rels.filter(r => statedProps(r).length).length === 1 ? "has" : "have"} one.
         A shape class is <b>conjunctive</b>, which inverts what a bulk action can mean: unlike
         the kinds on the left, every property ticked here NARROWS the class, so <b>none</b> is
         the widest declaration available and not the narrowest. <b>monotone</b> is as much as
         can be said without choosing a curvature.</span></p>
       <!-- One row per mechanism, and the row carries its own declarations: the
            six roles, the six shape properties, then the family that carries
            that shape, the member running, the curve and the verdict. It was
            two rows in two blocks -- declare here, see the consequence three
            blocks down -- which showed the same relation twice. -->
       ${aiErrHTML("roles")}
       ${(AI.roles || []).length && AI.outside ? `<p class="why"><b>${AI.outside}</b> proposal${
         AI.outside === 1 ? "" : "s"} named something outside the declared ids or the closed
         vocabularies, and ${AI.outside === 1 ? "was" : "were"} counted and dropped.</p>` : ""}
       ${aiRoleRows("rel")}
       ${mechRowsHTML()}

       <!-- Substitutes are a fact about the mechanisms, so they live with them.
            They were a full-width block under both columns, which put the one
            declaration that decides what an ablation can see furthest from the
            list it is about. -->
       <div class="subsblk">
         <span class="ctl-label">Substitutes ${infold(`Mechanisms that stand in for each other.`)}</span>
         <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Declared before the run and not after it. If two mechanisms substitute,
           disabling either alone changes nothing, and a loop that has not been told reports that
           neither mattered. Any two writing the same quantity are candidates, and the corpus says
           how common that is rather than leaving it an assumption: <b>82</b> consequents carry two
           or more distinct causes from two or more independent papers, over a third of relationships.</span></p>
         <div class="chain">${subs.length ? subs.map(x => `<div class="crow">
           <span class="cst part">${x.members.length}</span>
           <span class="cnm">all write <b>${hesc(varName(x.to))}</b></span>
           <span class="cwy">${x.members.map(m => hesc(m)).join(" · ")}</span>
         </div>`).join("")
           : `<p class="empty">No quantity here is written by more than one mechanism, so there is
              nothing to declare — which is itself worth knowing before an ablation is read.</p>`}</div>
       </div>

       <!-- A moderator is a mechanism that writes nothing: it multiplies another
            one's term. Which one is not derivable from the relationship, so it is
            declared -- and it belongs with the mechanisms rather than three
            blocks below them. -->
       ${mods.length ? `     <div class="fld" style="flex:1 1 100%;max-width:none">
         <span class="ctl-label">Moderators</span>
         <p class="lgloss">which term each one multiplies, which no relationship states and the arithmetic cannot guess</p>
         <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx"><b>enables</b> and <b>scales</b> do not write a quantity \u2014 they modify
           another mechanism's term. Which one is not derivable from the relationship, and without it the
           generated arithmetic has nowhere to put them.</span></p>
         ${mods.length ? `<div class="chain">${mods.map(r => {
           const tgt = targetOf(r), cands = rels.filter(x => x.id !== r.id && x.to === r.to);
           return `<div class="crow vrow">
             <span class="cst ${tgt ? "ok" : "gap"}">${rolesOf(r).includes("gates") ? "enables" : "scales"}</span>
             <span class="cnm">${hesc(handName(r.from))} <b>\u2192</b> ${hesc(handName(r.to))}</span>
             <select class="modsel" data-target="${hesc(r.id)}" aria-label="What it acts on">
               <option value="">not declared</option>
               ${cands.map(x => `<option value="${hesc(x.id)}"${
                 tgt === x.id ? " selected" : ""}>${hesc(nm.get(x.id))}</option>`).join("")}
             </select>
             <span class="cwy">${cands.length
               ? `${cands.length} mechanism${cands.length === 1 ? "" : "s"} write the same quantity`
               : "nothing else writes that quantity, so it has nothing to modify"}</span>
           </div>`; }).join("")}</div>`
           : `<p class="empty">No relation is declared <b>enables</b> or <b>scales</b> yet.</p>`}
       </div>
  ` : ``}
     </div>

     </div>

   </div>`;
}

function closeBodyHTML(v){
    const rels = carriedRelations(), outs = outcomeVars(), nm = mechNames(rels);
    const inv = liveInvariants();
    const chip = (on, lab, attr, tip) =>
      `<button type="button" class="sup pick${on ? " on" : " none"}" ${attr}
        title="${hesc(tip)}">${lab}</button>`;
    return `
   <div class="row" style="gap:14px 26px">
     <div class="secthd">
       <span class="sectn">The arithmetic</span>
       <span class="secti"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The two sections above declare what the model is made of and what it
         has to satisfy. Neither fixes the arithmetic and nothing can &mdash; but together they
         fix what it has to satisfy, which is enough to write a candidate and to refuse one.</span></span>
     </div>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="embhd">
         <span class="ctl-label">What is written</span>
         <span class="cmpacts" style="margin:0">
           ${AI.cap ? `<button type="button" data-ai="arith" ${AI.busy ? "disabled" : ""}
             title="Writes a body for the arithmetic out of the declarations above, which is then run against them before you see it.${AITIP}">${aiMark()}${AI.busy === "arith" ? "writing\u2026"
               : (ARITH.prop && ARITH.prop.run && ARITH.prop.run.fail)
                 ? "ask again with what broke" : "write it for me"}</button>` : ``}
           <button type="button" data-aedit="1">${ARITH.edit ? "hide the text" : "write it yourself"}</button>
         </span>
       </div>
       <p class="lgloss">the functional form of every term, and how they aggregate into each outcome</p>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">One row per mechanism below: what step 3.1 declared it to be, which of
         <code>the kernel</code>'s families carry that shape, which member is running, and the
         curve. The family is the declaration and the member is only what runs first —
         running the conditions below puts the others through the same obligations and lists
         them on the row, which is the difference between exploring a class and taking the
         tractable one out of it. The declarations do not fix the arithmetic and
         nothing can \u2014 but they do fix what it has to satisfy, and that is enough to write
         a candidate and to refuse one.${AI.cap ? ` Asking returns one assignment per mechanism and one per outcome, in a
         grammar that is arithmetic and nothing else. Every token is checked against the
         declared names, the expression is walked rather than compiled, it is run over a fixed
         sample of the parameter box \u2014 the same sample on anyone's machine \u2014 and the
         invariants above are run against what came back. The verdicts are below before you
         decide, and asking again sends the failures back, which is what the loop around these
         four steps is for.` : `${ARITH.kept ? ` This view cannot ask for another \u2014 the
         sampling capability is not available here \u2014 but what was kept is below, and it is
         what goes into the file.` : ` Asking for one needs the sampling
         capability, which this view does not have \u2014 <b>write it yourself</b> opens the
         text, and a form picked from a family above fills a line without any typing.`}`}</span></p>
       ${ARITH.edit ? `<p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">One line per mechanism and one per outcome, named as the
         declarations name them. A bare number is a weight, and <code>k = 0.5 in [0.2, 1.0]</code>
         declares the range it runs over — which is what lets a proposition be proved over the
         weights rather than at them. Checking it again after editing one line keeps the others.</span></p>
       <textarea class="defbox" id="abox" style="min-height:310px;font-family:'IBM Plex Mono',monospace;font-size:11.5px">${
         hesc(ARITH.text != null ? ARITH.text : arithToText())}</textarea>
       <div class="cmpacts" style="margin:7px 0 0">
         <button type="button" data-acheck="1">check it</button>
         <button type="button" data-askel="1">start from a skeleton</button>
       </div>
       ${ARITH.err ? `<p class="why" style="color:var(--neg)">${hesc(ARITH.err)}</p>` : ""}` : ""}
       ${aiErrHTML("arith")}
       <p class="why fold" style="margin-top:14px"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A line may name a <b>family</b> and a
         <b>member</b> beside it, and the page then runs the whole family against the model
         rather than only the line that was written —
         <button type="button" class="edbtn" data-fams="1">families of forms</button></span></p>
       ${ARITH.prop ? arithPropHTML(ARITH.prop) : ""}
       ${ARITH.kept ? arithKeptHTML() : ""}
     </div>



     <div class="secthd">
       <span class="sectn">The conditions</span>
       <span class="secti"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Isolated from both sections above because it belongs to both: four of
         the six conditions are read off a <b>quantity</b>'s declaration &mdash; its bounds, its
         kind, its aspect &mdash; and two off a <b>mechanism</b>'s, its role and its shape class.
         You do not write these. Declaring a bound <i>is</i> writing the test that later catches
         an outcome at 2.000.</span></span>
     </div>
     <details class="deet sect"${CT.rows || (ARITH.kept && ARITH.kept.run) ? " open" : ""}>
       <summary>Regularity conditions — <b>${inv.length}</b> earned by what you declared${
         ARITH.kept && ARITH.kept.run
           ? `, holding <b>${ARITH.kept.run.pass}</b> of ${
               ARITH.kept.run.pass + ARITH.kept.run.fail}` : ""}</summary>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="embhd">
         <span class="ctl-label">Regularity conditions</span>
         <span class="cmpacts" style="margin:0">
           ${AI.cap ? `<button type="button" data-ai="cond" ${AI.busy ? "disabled" : ""}
             title="Proposes further regularity conditions on the kept arithmetic, in the grammar this page can run.${AITIP}">${aiMark()}${
             AI.busy === "cond" ? "asking…" : "suggest more"}</button>` : ``}
           <button type="button" data-ctrun="1"
             title="Runs every condition above against the kept arithmetic, at every member of every declared shape class rather than only the one that happens to be written. One row per condition per member, with the first setting that breaks one named. This is what makes a declared class a class and not a preference.">${
             CT.rows ? `run them again` : `run them over the whole class`}</button>
         </span>
       </div>
       <p class="lgloss">what must hold of the output at every parameter value, whatever the
         forms — and whether it does</p>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Six are derived from what you already declared and need no asking: an
         aspect of <i>difference</i> implies zero at the baseline, a <i>transfer</i> implies
         conservation, a <i>share</i> implies adding up. The rest are yours. Write one in any of
         the four forms below, or ask for proposals — either way it has to be a property of
         the numbers the model returns, because one that is not cannot be run and this page will
         say so rather than keep it where it looks checked.</span></p>

       <div class="condrow">
         <input type="text" class="defbox cond" id="condbox" value="${hesc(CONDTXT.t || "")}"
           placeholder="vp - vs >= 0   ·   vp rises in pi   ·   vp falls in pi   ·   vp peaks in pi"
           aria-label="Write a regularity condition">
         <button type="button" class="edbtn" data-condadd="1">add it</button>
       </div>
       ${CONDTXT.err ? `<p class="why" style="color:var(--neg)">${hesc(CONDTXT.err)}</p>` : ""}
       ${aiErrHTML("cond")}

       ${AI.cond.length ? `<div class="chain prop">${AI.cond.map(p => `<div class="crow prow">
         <span class="cst part">${RUNFORM(p.form) ? "proposed" : "stated only"}</span>
         <span class="cnm">${hesc(p.for || p.check || "condition")}<span class="cfl">${
           RUNFORM(p.form) ? hesc(p.form) + (p.expr ? " · " + hesc(p.expr)
             : p.y ? " · " + hesc(p.y) + " in " + hesc(p.x) : "")
             : "not one of the four forms, so it cannot be run"}</span></span>
         <span class="pacts2">
           <button type="button" class="edbtn" data-aiok="${hesc(p.id)}">Accept</button>
           <button type="button" class="edbtn" data-aino="${hesc(p.id)}">Dismiss</button>
         </span>
         <span class="cwy">${hesc(p.why || "")}</span>
       </div>`).join("")}</div>` : ""}

       ${(xtest.size || xinv.size) ? `<div class="chain">${[
         ...[...xtest.values()].map(x => ({x, run:true})),
         ...[...xinv.values()].map(x => ({x, run:false}))].map(({x, run}) => `<div class="crow prow">
         <span class="cst ${run ? "ok" : "part"}">${run ? "runs" : "stated"}</span>
         <span class="cnm">${hesc(x.for || x.check || "condition")}<span class="cfl">${
           run ? hesc(x.form) + " · " + hesc(x.why === "written here" ? "written here" : "agreed to")
             : "stated only — in the file, not checked here"}</span></span>
         <span class="pacts2"><button type="button" class="edbtn del"
           data-${run ? "xtest" : "xinv"}="${hesc(x.id)}">Remove</button></span>
         <span class="cwy">${hesc(x.why || "")}</span>
       </div>`).join("")}</div>` : ""}

       <div class="chain">${inv.length ? inv.map(x => `<div class="crow">
         <span class="cst ok">${x.n2}</span>
         <span class="cnm">${x.n}<span class="cfl">from ${x.from}</span></span>
         <span class="cwy">${x.why}</span>
       </div>`).join("")
         : `<p class="empty">Nothing declared yet implies one. Type a quantity or role a relation
            on step 3.1 and they appear here.</p>`}</div>

       ${CT.err ? `<p class="why" style="color:var(--neg)">${hesc(CT.err)}</p>` : ""}
       ${CT.rows ? ctRowsHTML() : `<p class="empty">${classSpec() ? "" :
         `<b>No arithmetic yet.</b> Write it in the specification above, or ask for it, and
          check it — what is checked and whole is kept, and this runs against that. `}Not
         run yet. Running answers every class
         declared on step 3.1 against the arithmetic above, and every condition here that can
         be run — including every member of the form class each term was declared from,
         not only the one in the text.</p>`}
     </div>
     </details>
     <div class="secthd">
       <span class="sectn">The model file</span>
       <span class="secti"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The declarations and the arithmetic as a file <code>the kernel</code>
         can read, which is the part of the action model that is executable on its own. Step
         4.2 shares the rest.</span></span>
     </div>
     <details class="deet sect">
       <summary>What leaves the browser for somebody else to run</summary>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="embhd">
         <span class="ctl-label">What it writes</span>
         <button type="button" class="edbtn" id="expModel"><b>Write the model</b></button>
       </div>
       <p class="lgloss">what another researcher runs</p>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Every method <code>check_contract()</code> requires, filled from steps 3.1
         and 3.2, with each class carried beside its first member as a comment \u2014 what runs is
         a member, what is recorded is the class. <code>evaluate()</code> comes with the
         composition written out and the arithmetic left to you, and
         <code>invariants()</code> carries the predicates above for <code>the kernel</code> to
         run against whatever you write.</span></p>
     </div>
     </details>
   </div>`;
}

/* What the standing formula does to THIS corpus, computed rather than
   described: a formula is only as good as how many pairs it puts over the
   line, and that number is not predictable from reading it. */
function simTallyHTML(){
  const inv = new Set(G.nodes.filter(inScope).map(n => n.i));
  const rows = simPairs(inv).filter(r => inv.has(r[0]) && inv.has(r[1]));
  const of = inv.size * (inv.size - 1) / 2;
  if(!rows.length) return `<p class="lgloss">Nothing scored in scope yet.
    <span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A pair this
    measure was never given is unscored rather than scored zero, so it stands alone whatever
    the slider says.</span></p>`;
  const over = rows.filter(r => r[2] >= state.tight).length;
  const loud = over > rows.length / 4;
  return `<p class="lgloss"><b>${rows.length}</b> scored \u00b7 <b>${over}</b> over the slider
    \u00b7 top <b>${rows[0][2].toFixed(3)}</b>
    <span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">${rows.length}
    of the ${of} pairs the ${inv.size} constructs in scope can make, and ${over} of those clear
    the slider where it stands. A pair the measure never scored is unscored rather than zero.
    </span>${loud ? ` <b style="color:var(--neg)">a quarter of all pairs is a merge of the
    corpus, not a curation</b>` : ""}</p>`;
}

/* The measure's own controls, under the slider on step 1.2. Only the chosen
   one is on screen: a formula box standing open under a wording score is a
   control that does nothing, which is the defect class this page keeps
   finding in itself. */
function simPanelHTML(){
  const INF = `<span class="inf" tabindex="0" aria-label="more">i</span>`;

  if(SIM.m === "word")
    return `${simTallyHTML()}
      <p class="lgloss">Wording, as the corpus ships it. ${INF}<span class="infx">An
        IDF-weighted overlap of the words in two constructs\u2019 ids and aliases, computed
        once by <code>cluster.py</code> and carried in the corpus as
        <b>${(typeof G !== "undefined" && G.sim) ? G.sim.length : 0}</b> scored pairs. Weighting
        by how rare a word is, so that a word most of the corpus uses counts for almost nothing.
        A pair under 0.06 was never written down, so it reads here as unscored rather than as
        far apart.</span></p>`;

  if(SIM.m === "form"){
    const f = simForm();
    return `<div class="embhd" style="margin-top:8px">
        <span class="ctl-label">Your formula ${INF}<span class="infx">Seven names, and nothing
          else:<ul class="simnames">${SIMNAMES.map(([n, g]) =>
            `<li><code>${n}</code> ${g}</li>`).join("")}</ul>
          Read by the grammar the model itself is written in on step 3.1:
          <code>+ - * / **</code>, <code>min</code>, <code>max</code>, <code>exp</code>,
          <code>log</code>. A name outside the seven is refused by name rather than evaluated,
          and nothing here is <code>eval</code>ed. It starts as <code>word</code>, the shipped
          measure exactly, so nothing moves until you change it.<br><br>
          <b>Worth trying:</b> <code>word + 0.1 * sig ** 4</code>. The fourth power pays only
          where all four signature fields agree rather than rewarding two of four, and on the
          seeded scope it takes the corpus from 139 groups to 110 at the same threshold.
          <code>0.6 * word + 0.4 * sig</code> looks just as reasonable and leaves
          <b>one</b>.</span></span>
        <button type="button" class="edbtn" id="simRun"><b>Use it</b></button>
      </div>
      <input type="text" id="simF" value="${hesc(SIM.form)}" spellcheck="false"
        style="width:100%;font-family:var(--mono,monospace)"
        aria-label="A formula over the facts about a pair">
      ${f.err ? `<p class="why" style="color:var(--neg)">${hesc(f.err)}</p>` : ""}
      ${simTallyHTML()}`;
  }

  const o = SIM.out, n = G.nodes.filter(inScope).length;
  return `<div class="embhd" style="margin-top:8px">
      <span class="ctl-label">Judge on ${INF}<span class="infx"><b>Say what you mean by the
        same construct.</b> Left empty it judges on whether one instrument could measure both,
        which is a defensible default and still a default. Your criteria go into the record
        beside the merges they produced.</span></span>
      ${AI.cap ? `<button type="button" data-ai="simil" ${AI.busy ? "disabled" : ""}
          title="Judges the ${SIMSTEP} pairs the wording scores highest, one by one, with a reason for each. Wording picks what is worth a judgement; it does not make one.${AITIP}">${aiMark()}${
          AI.busy === "simil" ? "asking\u2026" : "the " + SIMSTEP + " closest"}</button>
        <button type="button" data-ai="similall" ${AI.busy ? "disabled" : ""}
          title="One ask over every construct in scope, not over pairs: the model reads all ${n} definitions and returns the groups that name the same quantity. It sees pairs no wording score would ever have shortlisted, and it costs one ask rather than two hundred.${AITIP}">${aiMark()}${
          AI.busy === "similall" ? "reading all " + n + "\u2026" : "all " + n + " constructs"}</button>`
        : `<span class="mblab">no model is reachable from this page</span>`}
    </div>
    <textarea id="simC" rows="2" placeholder="e.g. the same quantity, measurable by one instrument, not merely related"
      aria-label="What the judgement is made against">${hesc(SIM.crit)}</textarea>
    ${aiErrHTML("simil")}${aiErrHTML("similall")}
    ${o ? `<p class="lgloss"><b>${o.pairs.length}</b> judged${
        o.groups ? ` in <b>${o.groups}</b> group${o.groups === 1 ? "" : "s"}` : ""} on ${hesc(o.at)}
      ${INF}<span class="infx">${o.refused.length
        ? `<b>${o.refused.length}</b> named a construct that is not in scope, or sat past the
           twenty a group may hold, so ${o.refused.length === 1 ? "it was" : "they were"}
           counted rather than written. ` : ""}A pair it was never asked about is unscored
        rather than zero, so this measure merges only what it saw.</span></p>` : ""}
    ${simTallyHTML()}`;
}

/* Step 4.1's first question, asked before anything is computed: which of the
   declared class is being explored. It used to be whatever the page ran, so
   the coverage behind a robustness claim was an accident of what was cheap.
   The size is quoted before the run, because the size is what decides whether
   a claim about the class is a claim about the class. */
/* WHAT THE STEP SAYS ABOUT THE SET, which is one line and a button.
   ==========================================================================

   The whole class is the default and the step says what was tested;
   narrowing it is a deliberate act behind one button. Putting the apparatus
   on the step itself -- the slots with their members, a result label, the run
   button, the sets to choose between -- reads backwards, because the chooser
   that decides the label comes after it, and it asks for a declaration before
   the reader has reached the findings. The declaration that is almost always
   right is the whole class. */
function expHeadHTML(){
  const slots = expSlotsNow();
  if(!slots.length)
    return `<p class="empty"><b>Nothing to explore yet.</b> A slot here is a declaration
      that admits more than one answer, and there are two kinds: the <b>shape class</b> on a
      mechanism, declared on step 3.1 or recognised in a line you wrote, and <b>how an
      outcome combines</b> the mechanisms that write it. Declare either and the class
      appears. It will not be filled in: every member of every family is not a class
      anybody declared, and a robustness claim over it would be about this page rather than
      about the model.</p>`;
  const of = slots.reduce((t, x) => t * x.members.length, 1);
  const o = {pick:EXP.pick, n:EXP.n, seed:EXP.seed};
  const n = expSize(slots, EXP.set, o);
  const whole = n === of && of > 1;
  const ncomp = slots.filter(x => x.comp).length;
  return `<div class="xhead${whole ? "" : " xnarrow"}">
      <div class="xhwords">
        <p class="xhline">${whole
          ? `Read against <b>all ${of.toLocaleString("en")}</b> combinations of the declared class`
          : n === 1
            ? `Read against <b>one</b> combination of ${of.toLocaleString("en")} — a point and
               not a class, so whatever it shows is about the members you wrote`
            : `Read against <b>${n.toLocaleString("en")}</b> of ${of.toLocaleString("en")}
               combinations — ${hesc((EXPSETS.find(x => x[0] === EXP.set) || [, , ""])[2])}`}</p>
        <p class="xhsub">${slots.length} slot${slots.length === 1 ? "" : "s"}${
          ncomp ? `, of which <b>${ncomp}</b> ${ncomp === 1 ? "is a composition" : "are compositions"}
            rather than a shape — how an outcome combines the mechanisms that write it is a
            declaration too, and a conclusion can rest on it` : ""}${
          XRUN.rows ? ` · last run ${hesc(XRUN.at)}` : ""}</p>
      </div>
      <span class="cmpacts" style="margin:0">
        <button type="button" id="expRun" ${XRUN.busy ? "disabled" : ""}
          title="Rewrite every slot to each combination of the declared set, rebuild the model from the rewritten lines, and re-sign every proposition on the board over the same box.">${
          XRUN.busy ? "running\u2026" : XRUN.rows ? "test again" : "test the validity domains"}</button>
        <button type="button" class="edbtn" data-expopen="1">Narrow what is tested&hellip;</button>
      </span>
    </div>
    ${EXP.why ? `<p class="why"><b>The reviewer\u2019s reason:</b> ${hesc(EXP.why)}</p>` : ""}
    ${aiErrHTML("expset")}
    ${xrunHTML()}`;
}

function expSetHTML(){
  const slots = expSlotsNow();
  if(!slots.length)
    return `<p class="empty"><b>Nothing to explore yet.</b> A slot here is a declaration
      that admits more than one answer, and there are two kinds: the <b>shape class</b> on a
      mechanism, declared on step 3.1 or recognised in a line you wrote, and <b>how an
      outcome combines</b> the mechanisms that write it. Declare either and the class
      appears. It will not be filled in: every member of every family is not a class
      anybody declared, and a robustness claim over it would be about this page rather than
      about the model.</p>`;
  const of = slots.reduce((t, x) => t * x.members.length, 1);
  const o = {pick:EXP.pick, n:EXP.n, seed:EXP.seed};
  const n = expSize(slots, EXP.set, o);
  /* SCROLLABLE, because this is a list to read down once and then act on, and
     a model with a class on every mechanism pushes the run button and the
     findings below it off the screen. The same container the merger proposals
     use, for the same reason. */
  return `<div class="xscroll xshort" id="expSlots"><div class="chain" style="margin-top:8px">${slots.map(x => `<div class="crow">
      <span class="cst part">${x.members.length}</span>
      <span class="cnm">${hesc(x.label)}<span class="cfl">${hesc(x.term)} \u00b7 ${
        [...new Set(x.members.map(m => m.fam))].join(", ")}${
        x.running ? " \u00b7 written at " + hesc(x.running) : " \u00b7 nothing written"}</span></span>
      <span class="cwy">${EXP.set === "tailored"
        ? x.members.map(m => `<button type="button" class="sup pick${
            (EXP.pick[x.term] || []).includes(m.name) ? " on" : " none"}"
            data-exppick="${hesc(x.term)}|${hesc(m.name)}"
            title="${hesc(m.fam + " \u2014 " + m.src)}">${hesc(m.name)}</button>`).join("")
        : hesc(expLanes(slots, EXP.set, o)[slots.indexOf(x)].map(m => m.name).join(" \u00b7 "))}</span>
    </div>`).join("")}</div></div>
    <div class="embhd" style="margin-top:10px">
      <span class="ctl-label">${hesc(expLabel(slots, EXP.set, o))}</span>
      <span class="cmpacts" style="margin:0">
        ${EXP.set === "sample" ? `<label class="mblab">n <input type="number" id="expN"
          min="1" max="500" value="${EXP.n}" style="width:62px"></label>
          <label class="mblab">seed <input type="number" id="expSeed"
          min="0" max="99999" value="${EXP.seed}" style="width:72px"></label>` : ""}
        ${AI.cap ? `<button type="button" data-ai="expset" ${AI.busy ? "disabled" : ""}
          title="A reviewer reads the model and the declared class and says which combinations are worth running, and why. What it proposes is a tailored set you then edit: members it names that a slot does not admit are counted, not written.${AITIP}">${aiMark()}${
          AI.busy === "expset" ? "asking\u2026" : "suggest which to run"}</button>` : ""}
      </span>
    </div>
    <div class="modebar" role="group" aria-label="Which combinations to explore"
      style="flex-wrap:wrap">${EXPSETS.map(([k, lab, why]) =>
      `<button type="button" data-expset="${k}" aria-pressed="${EXP.set === k}"
        title="${hesc(why)}">${hesc(lab)}</button>`).join("")}</div>
    <p class="why">${hesc((EXPSETS.find(x => x[0] === EXP.set) || [, , ""])[2])}.
      ${of > 1 && n === of
        ? `All <b>${of}</b> combinations of the declared class.`
        : n === 1
          ? `One combination of <b>${of}</b>, which is a point and not a class \u2014 whatever
             it shows is about the members you wrote.`
          : `<b>${n}</b> of <b>${of}</b> combinations.`}</p>
    ${slots.some(x => x.comp) ? `<p class="why"><b>${
      slots.filter(x => x.comp).length}</b> of the ${slots.length} slot${
      slots.length === 1 ? "" : "s"} above ${slots.filter(x => x.comp).length === 1
      ? "is a composition" : "are compositions"} rather than a shape. How an outcome
      combines the mechanisms that write it is a declaration too, and a conclusion can
      rest on it.</p>` : ""}
    ${EXP.why ? `<p class="why"><b>The reviewer\u2019s reason:</b> ${hesc(EXP.why)}</p>` : ""}
    ${aiErrHTML("expset")}
    ${EXP.out && EXP.out.refused.length ? `<p class="why"><b>${EXP.out.refused.length}</b>
      proposed member${EXP.out.refused.length === 1 ? "" : "s"} named something no slot admits,
      so ${EXP.out.refused.length === 1 ? "it was" : "they were"} counted rather than written:
      ${hesc(EXP.out.refused.slice(0, 6).join(", "))}.</p>` : ""}
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The set is declared, sized and saved with the project before
      anything runs, which is the point: a set chosen after seeing the results is not a
      robustness check. Running it rewrites each slot to the member the combination picks and
      re-signs every proposition on the board over the same declared box.</span></p>
    ${xrunHTML()}`;
}

/* WHAT IS SETTLED, AND WHAT IS NOT.
   ==========================================================================

   Not a picture of the declared space, which has 10^10 points in it and is
   unviewable, but of the two things a scholar can act on: WHICH declarations
   are still open, and WHERE the undecided share of a retained finding sits.

   openSpace() already multiplies the open slots out into the size of what is
   still admitted. It says how many, never which, so the number read as a score
   rather than as a list of things to go and do. This names them, says how many
   ways each could still go, and sorts by that, because the biggest open choice
   is the one whose closing pays most.

   The second half is the honest half. A finding on the board carries the share
   of the declared box its sign was proved on; the rest is not the other sign,
   it is the part the method could not decide, and a bar that draws proved and
   leaves the rest white says so without a sentence. */
function openSlots(){
  const out = [];
  for(const k of carriedVars()){
    const nm = handName(k);
    if(!vKinds(k).length) out.push({of:"quantity", name:nm, slot:"kind", ways:KINDS.length});
    if(!vAspects(k).length) out.push({of:"quantity", name:nm, slot:"aspect", ways:ASPECTS.length});
  }
  /* mechNames takes the whole set, because a name has to be unique against
     the others and cannot be decided one relation at a time. */
  const rels = carriedRelations(), names = mechNames(rels);
  for(const r of rels){
    const nm = names.get(r.id) || handName(r.to);
    if(!rolesOf(r).length) out.push({of:"mechanism", name:nm, slot:"role", ways:ROLES.length});
    if(!propsOf(r).length)
      out.push({of:"mechanism", name:nm, slot:"shape class", ways:memberCount([])});
  }
  out.sort((a, b) => b.ways - a.ways || String(a.name).localeCompare(String(b.name)));
  return out;
}

/* THE DECLARATIONS THE CORPUS COULD NOT SUPPLY, proposed.
   ==========================================================================

   No paper in this corpus states what a relation DOES to its consequent, so a
   role is a modelling decision the page cannot check. The same holds for a
   quantity's kind and its aspect where nothing recorded them. `roles` asks for
   all four at once, which is why its proposals land on both tabs: a relation's
   row under the mechanisms, a quantity's under the variables, each beside the
   row it is about.

   Everything is held to a closed list. A role outside the six, a shape class
   outside the stated properties, a kind outside the nine or an aspect that is
   neither level nor difference is counted and dropped, and the header says how
   many. Nothing is applied until the button is pressed. */
function aiRoleRows(kind){
  const P = (AI.roles || []).filter(p => kind === "rel" ? p.rel : p.qty);
  if(!P.length) return "";
  const nm = p => p.rel
    ? (() => { const r = carriedRelations().find(x => String(x.id) === p.rel);
               return r ? handName(r.from) + " \u2192 " + handName(r.to) : p.rel; })()
    : handName(p.qty);
  const says = p => p.rel
    ? [p.role ? "role " + p.role : "", p.props.length ? "shape " + p.props.join(" + ") : ""]
        .filter(Boolean).join(" \u00b7 ")
    : [p.kinds.length ? "kind " + p.kinds.join(" | ") : "", p.aspect ? "aspect " + p.aspect : ""]
        .filter(Boolean).join(" \u00b7 ");
  return `<div class="chain prop">${P.map(p => `<div class="crow prow">
      <span class="cst part">${aiMark()}proposed</span>
      <span class="cnm">${hesc(nm(p))}<span class="cfl">${hesc(says(p))}</span></span>
      <span class="pacts2">
        <button type="button" class="edbtn" data-airole="${hesc(p.id)}">Accept</button>
        <button type="button" class="edbtn" data-airole-no="${hesc(p.id)}">Dismiss</button>
      </span>
      <span class="cwy">${hesc(p.why || "")}</span>
    </div>`).join("")}</div>`;
}

function settledHTML(){
  const slots = openSlots(), sp = openSpace();
  const rows = (BOARD.rows || []).filter(r => typeof r.share === "number");
  if(!slots.length && !rows.length) return "";
  const SHOW = 12;
  /* The large version of the badge the retained findings carry: the same word
     from core/verdict.js, the same colour, the same label on the bar. It
     printed the raw verdict field here, so one line read PARTIAL in this
     chart, REGION in the derived list and TURNS on the board, on one step. */
  const bar = r => {
    const got = Math.max(0, Math.min(1,
      typeof r.open === "number" ? 1 - r.open : r.share));
    const pc = (got * 100).toFixed(0);
    return `<div class="stline">
      <span class="stnm">${hesc(readName(r.y))} in ${hesc(readName(r.x))}</span>
      <span class="stbar ${hesc(vKey(r.verdict, r.says === "turns"))}" role="img"
        aria-label="${pc}% of the declared box settled, the rest undecided">
        <i style="width:${(got * 100).toFixed(2)}%"></i></span>
      <span class="stpc">${pc}%</span>
      <span>${r.verdict ? vdHTML(r.verdict, r.says === "turns")
        : `<span class="cst">no verdict</span>`}${
        r.method === "sampled" ? ` <span class="cst">sampled</span>` : ""}</span>
    </div>`;
  };
  return `
     <div class="secthd">
       <span class="sectn">What is settled, and what is not</span>
       <span class="secti">${infold(`Not the space, which has ${spaceText(sp)} points in it
         and cannot be drawn, but the two things you can act on: the declarations still
         carrying their whole vocabulary, and the share of the declared box each retained
         finding was actually settled over.`)}</span>
     </div>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       ${slots.length ? `<span class="ctl-label">Still open · ${slots.length} of ${
         sp.n} choices</span>
       <p class="lgloss">each one multiplies what the model could still be; the widest
         first, because that is the order in which closing them pays</p>
       <div class="stslots">${slots.slice(0, SHOW).map(o =>
         `<span class="stslot"><b>${hesc(o.name)}</b> <i>${hesc(o.slot)}</i>
            <em>&times;${o.ways}</em></span>`).join("")}${
         slots.length > SHOW ? `<span class="stslot more">and ${
           slots.length - SHOW} more, on step 3.1</span>` : ""}</div>`
       : `<p class="why">Every declaration is closed. What the findings below hold on is a
          model with nothing left carrying its whole vocabulary.</p>`}

       ${rows.length ? `<span class="ctl-label" style="margin-top:15px;display:block">The
         share each finding was settled over</span>
       <p class="lgloss">filled is where the sign was proved; the rest is what the method
         could not decide, which is not the other sign</p>
       <div class="stbars">${rows.slice(0, 24).map(bar).join("")}</div>`
       : `<p class="why" style="margin-top:13px">Nothing retained yet, so there is no
          settled share to show. The board above is what fills this.</p>`}
     </div>`;
}

/* THE READING: WHAT THE FINDINGS MEAN, WITHOUT THE FORMULA.
   ==========================================================================

   Step 3.2's first tab, and the default, so that somebody who does not work
   in formal models can read the candidate findings without going to the
   formula -- which stays one press away, with the full derivation.

   What is NOT delegated. The verdict is interval arithmetic's and was settled
   before anything was asked: a sign is proved over a declared box or the
   method declines, and nothing here can move that. What is delegated is the
   SENTENCE -- and the one thing the prompt insists on is the distinction a
   non-modeller is most likely to lose: an undecided share is not a share
   where the sign fails. So every reading carries a second line saying what it
   does NOT establish, and the row keeps the verdict and the shares beside the
   prose rather than instead of it, because a reading that replaced the
   numbers would be the formula hidden rather than explained.

   And it is a DRAFT. Accepting a reading writes it into that finding's note, where it is marked as the scholar's -- because
   once they have accepted it, it is -- with the record saying it was drafted
   by a model and taken by them. */
/* THE FINDINGS, BEFORE THE DERIVATION.
   ==========================================================================

   The rule for this step and for what comes after it: PLAIN WORDS FIRST,
   formulas and the method on request. The plain sentence for a finding leads
   and the formula follows it -- two lines of nested exponentials, derivatives
   in partial notation and snake_case names are not where a reader should have
   to start. A model's help is offered before the details and never in place
   of the check: everything it proposes goes through the same accept-or-refuse
   path as anything else.

   A candidate here is a line that has been SIGNED: proved over the box or
   sampled. An unsigned line has nothing to say yet in words, so it is
   counted rather than listed, and the count says where to go. */
/* WHAT YOU STOOD BEHIND, and the two tallies over it. This was the bottom of
   the working list, about 1,400 pixels into the step, under the formulas. It
   belongs with the findings, which is where it is now; the Derivation tab
   keeps the way ONTO it, on every line. */
function keptHTML(){
  return `
   <div class="row" style="gap:14px 26px">
     <div class="secthd" id="keptSec">
       <span class="sectn">Retained findings</span>
       <span class="secti">${infold(`What you decided to stand behind, out of everything the
         list has held — each one a testable relationship with the region it holds on and
         how sure that is. It <b>accumulates across rounds</b> rather than being replaced by
         the next attempt, and it is what step 4.1 draws.`)}</span>
     </div>
     ${boardHTML()}
     ${boardLaunchHTML()}

     ${roundsHTML()}
     ${settledHTML()}
   </div>`;
}

function findingsHTML(){
  const signed = BUF.lines.filter(l => l.y && l.x && (l.res || l.sim));
  const open = BUF.lines.filter(l => l.y && l.x && !l.res && !l.sim).length;
  const onBoard = l => (BOARD.rows || []).some(r => r.y === l.y && r.x === l.x);
  const row = l => {
    const v = l.res ? l.res.verdict : "sampled";
    const sh = l.res ? l.res.share : (l.sim ? l.sim.share : null);
    const op = l.res ? l.res.open : null;
    return `<div class="fnd">
      ${vdHTML(v, l.res ? vTurned(l.res) : false, sh, op)}
      <div class="fndbody">
        <p class="fnsay">${propLine(l)}</p>
        <span class="cmpacts" style="margin:4px 0 0">
          <button type="button" class="edbtn" data-btake="${hesc(l.id)}">${
            onBoard(l) ? "Update what you kept" : "Keep"}</button>
          <button type="button" class="edbtn" data-derat="${hesc(l.id)}"
            title="The expression, the box, the method and every command that produced it.">How was this derived?</button>
        </span>
      </div>
    </div>`;
  };
  return `
   <div class="row" style="gap:14px 26px;margin-top:2px">
     <div class="fld" style="flex:1 1 100%;max-width:none">

       <!-- THE HELP STRIP. The step's own button first, then what a model can
            do, then one sentence saying what happens to what it returns. -->
       <div class="helpstrip">
         <button type="button" class="tabbtn hsmain" data-derive="1"${
           PROPS.busy ? " disabled" : ""}
           title="Differentiates every outcome in the kept arithmetic with respect to every parameter, and settles each sign over the declared box.">${
           BUF.lines.length ? "Derive again" : "Derive the findings"}</button>
         ${AI.cap ? `<button type="button" data-ai="predict"${AI.busy ? " disabled" : ""}
           title="Proposes further predictions this model could be asked for, in the declared vocabulary; each is scored and ranked beside what you already have.${AITIP}">${aiMark()}${
           AI.busy === "predict" ? "asking…" : "Suggest more predictions"}</button>` : ""}
         <button type="button" class="tabbtn" data-rankopen="1"
           aria-expanded="${!!state.rankOpen}"
           title="What you want favoured, in your own words, compiled into weights over the four quantities this page can compute.">${
           AI.cap ? aiMark() : ""}Rank them by what matters to you</button>
       </div>
       <p class="why" style="margin:5px 0 0">${AI.cap
         ? `Suggestions are checked by the page before you see them, and nothing is kept
            until you keep it.`
         : `Deriving needs no model, and nor does saying what you want ranked first.
            <b>Suggesting more</b> does, and this host offers none, so it is not drawn.`}</p>
       ${aiErrHTML("predict")}
       ${state.rankOpen ? wsRankHTML() : ""}

       <div class="secthd" style="margin-top:14px">
         <span class="sectn">Candidate findings</span>
         <span class="secti">${infold(`Every line that has been signed, as a sentence. The
           verdict and the region are the method's and were settled by arithmetic before
           anything was written. <b>Keep</b> puts one among the findings you stand behind;
           <b>how was this derived</b> opens the same line on the Derivation tab with its
           expression, its box and every command that produced it.`)}</span>
         <span class="pcount">${signed.length
           ? `<b>${signed.length}</b> signed` : "nothing signed yet"}</span>
       </div>
       ${signed.length ? `<div class="fnds">${signed.map(row).join("")}</div>`
         : `<p class="empty">Nothing is signed yet. <b>Derive the findings</b> above fills
            this, or write a line yourself on <b>Derivation</b>.</p>`}
       ${BUF.lines.length ? `<p class="why" style="margin:7px 0 0"><b>${signed.length}</b> of the
         <b>${BUF.lines.length}</b> lines in the working list are signed, and they are the
         candidates above.${open ? ` The other <b>${open}</b> ${open === 1 ? "is" : "are"} on
         <b>Derivation</b>.` : ""} A line becomes a candidate here once it says which
         quantity moves with which and something has settled it.</p>` : ""}
     </div>
   </div>`;
}

function readingHTML(){
  /* EVERY FINDING STOOD BEHIND, not only the ones this page signed. Three of
     the demonstration's eight came back from another engine and carry a
     provenance instead of a verdict; they are findings the scholar retained,
     so leaving them out of the reading would be the reading quietly
     disagreeing with the board. */
  const kept = (BOARD.rows || []).filter(r => r.keep);
  const by = new Map(READ.out.map(x => [x.id, x]));
  const pcs = x => x == null ? "" : (100 * x).toFixed(1) + "%";
  return `
   <div class="row" style="gap:14px 26px;margin-top:2px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="embhd">
         <span class="ctl-label">What the model turned out to imply ${infold(`The findings
           you retained, in words. The verdict and the regions are the method's and were
           settled before anything was asked; what an LLM is asked for is the sentence, and
           what it is told not to do is call an undecided share a failure. The expression
           and the derivation are behind each row rather than gone.`)}</span>
         <span class="pcount">${kept.length
           ? `<b>${kept.length}</b> retained · <b>${READ.out.length}</b> read`
           : "nothing retained yet"}</span>
         <span class="cmpacts" style="margin:0">
           ${AI.cap && kept.length ? `<button type="button" data-ai="read"${
             AI.busy ? " disabled" : ""}
             title="Send the findings, their verdicts, the regions they hold on and the mechanism statements behind them, and ask for a plain-language reading of each. The verdicts are not up for discussion: they were proved or refused before this is called.${AITIP}">${aiMark()}${
             AI.busy === "read" ? "reading the findings…" : READ.out.length
               ? "read them again" : "read these in words"}</button>` : ""}
         </span>
       </div>
       ${aiErrHTML("read")}
       ${!kept.length ? `<p class="empty">Nothing is retained yet. <b>Working</b> is the
         other tab: derive a line there and put it on the board, and this reads what you
         stood behind.</p>`
       : !READ.out.length ? `<p class="why">${AI.cap
         ? `Nothing read yet. The findings are below with their verdicts; <b>read these in
            words</b> asks for a sentence on each.`
         : `No model is reachable from this page, so the readings cannot be drafted. The
            findings are below with their verdicts and the regions they hold on.`}</p>` : ""}
       ${READ.outside ? `<p class="why">${READ.outside} reading${
         READ.outside === 1 ? "" : "s"} named no finding on this board and ${
         READ.outside === 1 ? "was" : "were"} discarded.</p>` : ""}
       <div class="reads">${kept.map((r, i) => { const x = by.get(r.id); return `
         <div class="readrow">
           ${r.verdict ? vdHTML(r.verdict, r.says === "turns", r.share, r.open)
             : `<span class="cst">no verdict</span>`}
           <div class="rdbody">
             <p class="rdsay">${x ? hesc(x.says)
               : `<i>${hesc(r.text || (readName(r.y) + " in " + readName(r.x)))}</i>`}</p>
             ${x && x.mind ? `<p class="rdmind"><b>what it does not establish</b> ${
               hesc(x.mind)}</p>` : ""}
             <p class="rdnums">${r.share != null
               ? `proved over <b>${pcs(r.share)}</b> of the declared box${
                   r.open ? `, <b>${pcs(r.open)}</b> undecided — which is not the other
                   sign` : ""}` : "no region recorded"}${r.forms && r.forms.of
               ? ` · ${hesc(xrunClause(r.forms, EXPSETS))}` : ""}</p>
             ${x ? `<span class="cmpacts" style="margin:3px 0 0">
               <button type="button" class="edbtn" data-rdtake="${hesc(r.id)}">${
                 r.anno ? "Replace the note with this" : "Keep this as the note"}</button>
               <button type="button" class="edbtn" data-rdno="${hesc(r.id)}">Dismiss</button>
             </span>` : ""}
             ${r.anno ? `<span class="banno"><b>Your note</b> ${hesc(r.anno)}${
               r.annoAt ? `<i>${hesc(r.annoAt)}</i>` : ""}</span>` : ""}
             <details class="rdmore">
               <summary>the expression, and how it was derived</summary>
               <div class="rdfull">${propSentence(r) || ""}
                 <p class="rdprov">${hesc(r.method || "")}${r.src && r.src !== "auto"
                   ? " · " + hesc(r.src) : ""} · round ${hesc(String(r.round))}
                   · ${hesc(r.at || "")}</p>
                 <p class="rdprov">Everything above is computed. The reading is the only
                   part a model wrote, and only where you see one.</p>
               </div>
             </details>
           </div>
         </div>`; }).join("")}</div>
     </div>
   </div>`;
}

/* WHAT EACH MECHANISM RESTS ON.
   ==========================================================================

   The corpus records, for every claim, the scope its paper stated, and this
   is where that belongs: the step that draws each finding over the region its
   sign was proved on. It is deliberately NOT a computation. A declared box is
   an interval over named parameters; a stated scope is a sentence about a
   population, and nothing can compare the two.

   THE SENTENCES THEMSELVES GO BEHIND A FOLD. A scope sentence is econometric
   prose written to sit beside its own claim inside its own paper: lifted out,
   it reads as a pointer to something the reader cannot see -- "same GPTW
   applicant-firm sample as Claim 1" -- and a screen of them is reference
   material rather than something to act on. So they are one press away, and what is left is the part a reader can act on, per
   mechanism, in one line:

     how many claims and how many papers      -- how much stands behind it
     which signs those claims asserted        -- whether they agree at all
     how many are estimated against reported  -- what kind of support it is
     how many restate one sample              -- how much is INDEPENDENT
     how many state no scope at all           -- what nobody bounded

   On the demonstration that line says: purpose clarity to firm performance,
   nine claims from six papers, five positive and four CONDITIONAL, five
   estimated and four relayed, three restating one sample, one stating no
   scope. Every one of those facts was on the screen before and none of them
   was legible. */
const SCBACK = /^\s*same\b|\bas claim\b|\bas table\b/i;
/* THE SIGN A PAPER ASSERTED, IN THE COLOUR THE REST OF THE PAGE USES FOR IT.
   The corpus carries six: positive, negative, none, inverted-U, categorical
   and conditional. Three map onto the verdict colours directly; a relation
   stated as inverted-U or as conditional holds over part of its range and
   takes the ochre a partial verdict takes; `none` is a relation asserted not
   to be there, which is the flat colour. `categorical` names a contrast
   rather than a direction and stays neutral. */
const SCSG = {positive:"up", negative:"down", none:"flat",
  "inverted-U":"part", conditional:"part", categorical:""};

function statedScopesHTML(){
  const rows = carriedClaims();
  if(!rows.length) return "";
  const by = new Map();
  const seen = new Set();
  let none = 0, back = 0;
  const papers = new Set();
  for(const r of rows){
    const c = r.c || {}, e = r.e || {};
    const k = String(e.id || "");
    if(!by.has(k)) by.set(k, {e, cl:[], ps:new Set()});
    const g = by.get(k);
    const sc = String(c.sc || "").trim();
    const bare = !sc || /^unstated$/i.test(sc);
    g.cl.push({c, sc, bare, back:!bare && SCBACK.test(sc)});
    if(c.p){ g.ps.add(c.p); papers.add(c.p); }
    if(seen.has(c.id)) continue;
    seen.add(c.id);
    if(bare) none++; else if(SCBACK.test(sc)) back++;
  }
  const got = [...by.values()].sort((a, b) => b.cl.length - a.cl.length ||
    b.ps.size - a.ps.size);
  const SHOW = 8;
  const trim = (t, n) => t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t;
  const tally = xs => {
    const n = new Map();
    for(const x of xs) if(x) n.set(x, (n.get(x) || 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1])
      .map(([k, v]) => v + " " + hesc(k)).join(", ");
  };
  const row = g => {
    const nb = g.cl.filter(x => x.bare).length;
    const nk = g.cl.filter(x => x.back).length;
    const sgs = new Set(g.cl.map(x => String(x.c.g || "")).filter(Boolean));
    return `<details class="scgrp">
      <summary>
        <span class="scnm">${hesc(lbl(g.e.source))} <b>→</b> ${
          hesc(lbl(g.e.target))}</span>
        <span class="scmeta">${g.cl.length} relationship${g.cl.length === 1 ? "" : "s"}, ${
          g.ps.size} paper${g.ps.size === 1 ? "" : "s"} · ${
          tally(g.cl.map(x => x.c.g))}${sgs.size > 1 ? " — they disagree" : ""} · ${
          tally(g.cl.map(x => x.c.e))}${nk ? " · <b>" + nk + "</b> restate one sample" : ""}${
          nb ? " · <b>" + nb + "</b> state no scope" : ""}</span>
      </summary>
      <div class="scwords">${g.cl.map(x => `<p><b>${hesc(((pap(x.c.p) || {}).a ||
        x.c.p || "") + " " + ((pap(x.c.p) || {}).y || ""))}</b>
        <i class="scsg ${SCSG[String(x.c.g || "")] || ""}">${
          hesc(String(x.c.g || ""))}</i><i>${hesc(String(x.c.e || ""))}</i>
        ${x.bare ? "<em>no scope stated</em>"
          : (x.back ? "<em>restates a sample stated elsewhere in this paper:</em> " : "") +
            hesc(trim(x.sc, 320))}</p>`).join("")}</div>
    </details>`;
  };
  return `
       <span class="ctl-label" style="margin-top:15px;display:block">What each mechanism
         rests on ${infold(`One line per relation the curation carried: how many relationships and
         papers stand behind it, which signs they asserted and whether those agree, what
         kind of support they are, how many merely restate one sample, and how many bound
         nothing. The papers' own words are inside, because a scope sentence is written to
         sit beside its own relationship in its own paper and reads as reference material anywhere
         else. Read beside the regions above, never compared with them: a declared box is an
         interval over named parameters and a stated scope is a sentence about a population,
         and nothing here pretends one bounds the other.`)}</span>
       <p class="lgloss">${seen.size} relationship${seen.size === 1 ? "" : "s"} carried on ${
         got.length} relation${got.length === 1 ? "" : "s"}, from ${papers.size} paper${
         papers.size === 1 ? "" : "s"} · <b>${none}</b> state no scope at all · <b>${
         back}</b> restate a sample stated elsewhere in the same paper · open one for the
         papers' own words</p>
       <div class="scopes">${got.slice(0, SHOW).map(row).join("")}</div>${
         got.length > SHOW ? `<p class="why" style="margin:6px 0 0">and ${
         got.length - SHOW} more relation${got.length - SHOW === 1 ? "" : "s"}, in the same
         order. Step 1.3 lists every relationship against the arrow it belongs to.</p>` : ""}`;
}

/* WHAT THE THRESHOLD IS HOLDING BACK.
   ==========================================================================

   An absence nobody shows reads as an absence of the question. A reader who
   meets a map of 139 constructs with nothing beside it has no way to know
   that 1,026 are in the registry and that a control decides how many arrive.

   WHY THE REGISTRY HAS NO FLOOR OF ITS OWN. Dropping every construct carried
   by fewer than two claims rests on the reasoning that a name used once
   cannot be compared with anything. The first half is true and the action
   does not follow: this bench marks weakness everywhere else rather than
   excluding it -- it draws an arrow resting only on relayed claims and flags
   it, and it carries 266 constructs used by a single paper. A floor in the
   build would be the one place it excluded instead of marking, and it would
   live in another repository, which makes it the one curation decision in the
   chain a scholar could not see, let alone move. The paper threshold on step
   1.2 does the same work where it can be seen: at its default of two, the 604
   arrive hidden and the map you open on is unchanged.

   What the block says now: the registry admits every name a claim uses, the
   threshold is what you see, and here is the trade at each setting. Read-only,
   with a pointer to step 1.2, because a decision is changed on the step that
   made it. */
function floorHTML(){
  const nodes = G.nodes || [], claims = G.claims || [];
  if(!nodes.length) return "";
  const live = n => (n.p || []).filter(okPaper).length;
  const inAt = m => new Set(nodes
    .filter(n => state.admit.has(n.i) || live(n) >= m).map(n => n.i));
  /* Both ends in scope, by the rule the builder draws with: a claim naming
     several things on a side is drawn for whichever of them survive. */
  const drawn = set => claims.filter(c => (c.a || []).some(e => set.has(e)) &&
                                          (c.c || []).some(e => set.has(e))).length;
  const now = inAt(state.minp), nd = drawn(now);
  const once = nodes.filter(n => (n.n || 0) <= 1);
  const onceShown = once.filter(n => now.has(n.i)).length;
  const STEPS = [1, 2, 3, 4, 5, 6];
  return `
   <div class="row" style="margin-top:16px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <!-- COLLAPSED ON ARRIVAL. This is step 1.2's paper threshold, read here
            because step 1.3 is where the arrows it decides are weighed, and it
            is a thing to consult rather than the step's own work. The two
            facts that matter are in the header, so collapsing it hides the
            detail and not the number. -->
       <div class="phdr">
         <button type="button" class="pfold" id="floorFold"
                 aria-expanded="${state.floorOpen}">
           <span class="caret">${state.floorOpen ? "\u25be" : "\u25b8"}</span>
           <span class="ctl-label">What step 1.2's threshold is holding back</span></button>
         <span class="pcount"><b>${nodes.length - now.size}</b> of ${
           nodes.length} constructs hidden \u00b7 <b>${claims.length - nd}</b> relationship${
           claims.length - nd === 1 ? "" : "s"} with a box at one end or neither</span>
       </div>
       ${state.floorOpen ? `
       <span class="ctl-label" hidden>What the threshold is holding back ${infold(`The registry
         admits every name a relationship in this corpus uses, so nothing is undrawable. What
         decides how much of it you see is the paper threshold on step 1.2, and this is the
         trade at each of its settings. It is read here and moved there, because a decision
         belongs to the step that made it.`)}</span>
       <p class="lgloss"><b>${nodes.length}</b> constructs in the registry and <b>${
         claims.length}</b> relationships, every one of them drawable; at <b>${state.minp}</b>
         paper${state.minp === 1 ? "" : "s"} or more you are seeing <b>${now.size}</b> of
         those constructs and <b>${nd}</b> of those relationships</p>
       <div class="offm">
         <div class="offrow"><span class="offn">${nodes.length - now.size}</span>
           <span class="offt"><b>constructs the threshold is hiding,</b> and with them ${
             claims.length - nd} relationships that have a box at only one end or at neither. Every
             one is in the registry and reachable: step 1.1's slider at <b>1</b> brings all
             of them onto the map.
             <span class="offsub">${STEPS.map(m => { const st = inAt(m);
               return `<span class="flpill${m === state.minp ? " on" : ""}"><b>${m}+</b>
                 ${st.size} constructs <i>${drawn(st)} relationships</i></span>`; }).join("")}</span></span>
         </div>
         <div class="offrow"><span class="offn">${once.length}</span>
           <span class="offt"><b>are carried by a single relationship,</b> which is one paper's
             wording used once. A name used once has no second measurement to be
             commensurable with, so nothing in this corpus can corroborate or contradict
             what it asserts${onceShown ? `, and <b>${onceShown}</b> of them are on the map
             at the present threshold` : ", and none of them is on the map at the present threshold"}.
             <span class="offsub">They are in the registry and marked rather than left out.
               A floor in the build would be the one curation decision in this chain nobody
               could see. Calling a name used once a construct of a literature is a
               judgement, and it is one somebody makes on step 1.1 rather than one a script
               made before anybody arrived.</span></span>
         </div>
       </div>
     </div>
   </div>` : ""}
   </div>`;
}

/* THE NOTEBOOK, RESERVED.
   ==========================================================================

   The tab is reserved, and says what it would hold rather than standing
   empty.

   Why it is built here rather than embedded. A general notebook -- JupyterLite,
   Observable, Starboard -- takes arbitrary prose and arbitrary code, which
   reopens the one door this instrument closed: a cell could assert anything
   and nothing would check it. It also costs the property that there is no
   install step, since the smallest of them is tens of megabytes of wasm
   against a page that is one file.

   What a notebook is actually for here is ORDER AND READING over content that
   is already typed. Every row below is an object this bench produces, with a
   verdict or a provenance attached to it; a cell is a reference to one of
   them plus the scholar's prose, so the content stays checkable because a
   cell POINTS at something derived rather than claiming to be derived.

   Where a real notebook does belong is the other direction: the record of a
   detour through another engine. A result
   that came back from Mathematica should travel as the notebook that produced
   it, so somebody with no licence can replay what was done rather than retype
   its answer. Notebook as evidence, imported. Notebook as presentation, this.

   What is NOT built is the ordering, the prose between the cells, and the
   export. Said here rather than left to be discovered. */
/* THE DEPOSIT, as five declarations and one file.

   Each row is the decision, what it is currently declared to be, and the
   control that declares it. A closed list where the choice is closed -- a
   licence is picked and not written, because a permissive licence over somebody
   else's extracted text and a restrictive one over the part meant to be reused
   are both failures of picking. Free text where it is not: a repository address
   is whatever it is.

   The second decision has no `select` because it is not a free choice: 52
   articles are other people's copyright. The one part of it that IS a choice --
   whether the verbatim spans travel with the claims -- is declared like the
   rest, and the consequence of withholding them is written beside it.

   page/26-deposit.js writes the bundle. */
const depOpts = (list, cur) => list.map(([k, n, w]) =>
  `<option value="${hesc(k)}"${cur === k ? " selected" : ""}>${hesc(n)}${
    w ? " — " + hesc(String(w).slice(0, 64)) : ""}</option>`).join("");

function depRowsHTML(){
  const st = depState();
  /* `depDecs` is the handle a guided tour rings: the five decisions as one
     block, which is what the stop is about rather than any one of them. */
  const chip = i => `<span class="cst ${st.got[i] ? "ok" : "gap"}">${
    st.got[i] ? "declared" : "open"}</span>`;
  const when = k => DEP.at[k] ? `<i class="bnote">declared ${hesc(DEP.at[k])}</i>` : "";
  return `<div class="chain" id="depDecs">
    <div class="crow">
      ${chip(0)}
      <span class="cnm">${DEPOSIT[0].n}<span class="cfl">${DEPOSIT[0].f}</span></span>
      <span class="cwy">${DEPOSIT[0].w}
        <div class="row" style="gap:6px 10px;margin-top:7px">
          <label class="mblab">a host
            <select data-dep="host"><option value="">— not decided</option>${
              depOpts(HOSTS, DEP.host)}</select></label>
          <label class="mblab" style="flex:1 1 220px">its address
            <input type="text" data-dep="repo" value="${hesc(DEP.repo)}"
              placeholder="https://..." spellcheck="false"></label>
          <label class="mblab">an archive
            <select data-dep="archive"><option value="">— not decided</option>${
              depOpts(ARCHIVES, DEP.archive)}</select></label>
          <label class="mblab" style="flex:1 1 180px">the identifier it mints
            <input type="text" data-dep="doi" value="${hesc(DEP.doi)}"
              placeholder="10.5281/zenodo..." spellcheck="false"></label>
        </div>${when("host")}</span>
    </div>
    <div class="crow">
      ${chip(1)}
      <span class="cnm">${DEPOSIT[1].n}<span class="cfl">${DEPOSIT[1].f}</span></span>
      <span class="cwy">${DEPOSIT[1].w}
        <div class="row" style="gap:6px 10px;margin-top:7px">
          <label class="mblab" style="flex:1 1 340px">the verbatim spans
            <select data-dep="quotes">
              <option value="yes"${DEP.quotes === "yes" ? " selected" : ""}>travel with the relationships — a reader can check one against its source</option>
              <option value="no"${DEP.quotes === "no" ? " selected" : ""}>are withheld — a reader must obtain the paper first</option>
            </select></label>
        </div>
        <p class="why" style="margin:6px 0 0"><b>Not a free choice.</b> The 52 articles do
          not travel under any decision available here. The material is what was read off
          them, with an identifier per paper.</p>${when("quotes")}</span>
    </div>
    <div class="crow">
      ${chip(2)}
      <span class="cnm">${DEPOSIT[2].n}<span class="cfl">${DEPOSIT[2].f}</span></span>
      <span class="cwy">${DEPOSIT[2].w}
        <div class="row" style="gap:6px 10px;margin-top:7px">
          <label class="mblab" style="flex:1 1 300px">for anything executable
            <select data-dep="code"><option value="">— not decided</option>${
              depOpts(CODELIC, DEP.code)}</select></label>
          <label class="mblab" style="flex:1 1 300px">for the claim table
            <select data-dep="data"><option value="">— not decided</option>${
              depOpts(DATALIC, DEP.data)}</select></label>
        </div>${when("code")}</span>
    </div>
    <div class="crow">
      ${chip(3)}
      <span class="cnm">${DEPOSIT[3].n}<span class="cfl">${DEPOSIT[3].f}</span></span>
      <span class="cwy">${DEPOSIT[3].w}
        <div class="row" style="gap:6px 10px;margin-top:7px">
          <label class="mblab" style="flex:1 1 340px">the exchanges
            <select data-dep="transcripts"><option value="">— not decided</option>${
              depOpts(TRANSCRIPTS, DEP.transcripts)}</select></label>
          <span class="sp">${PROV.length} exchange${PROV.length === 1 ? "" : "s"} accepted
            so far</span>
        </div>${when("transcripts")}</span>
    </div>
    <div class="crow">
      ${chip(4)}
      <span class="cnm">${DEPOSIT[4].n}<span class="cfl">${DEPOSIT[4].f}</span></span>
      <span class="cwy">${DEPOSIT[4].w}
        <div class="row" style="gap:6px 10px;margin-top:7px">
          <label class="mblab" style="flex:1 1 340px">the version
            <input type="text" data-dep="version" value="${hesc(DEP.version)}"
              placeholder="${hesc(depVersion())}" spellcheck="false"></label>
          <button type="button" class="edbtn" id="depVer">Use ${hesc(depVersion())}</button>
        </div>${when("version")}</span>
    </div>
  </div>`;
}

function depositHTML(){
  const st = depState();
  const files = depFiles();
  return depRowsHTML() + `
    <div class="embhd" style="margin-top:13px">
      <span class="ctl-label">The deposit, as one file</span>
      <span class="pcount">${files.length} file${files.length === 1 ? "" : "s"}${
        st.n === st.of ? "" : " · " + (st.of - st.n) + " decision" +
        (st.of - st.n === 1 ? "" : "s") + " still open"}</span>
    </div>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">One archive and not six downloads, because a deposit of six
      downloads is six chances to ship five of them. Inside: the parts above, the five
      decisions with the reason for each, a <code>CITATION.cff</code>, and a
      <code>MANIFEST.txt</code> carrying a SHA-256 per file computed over the bytes that
      went in — so a reader can check that what they have is what was deposited without
      trusting this page or the archive it came from. The archive is stored rather than
      compressed and carries no timestamps, so the same deposit gives the same bytes and
      therefore the same digest.</span></p>
    <div class="chain" id="depFiles">${files.map(f => `<div class="crow">
      <span class="cst ok">in</span>
      <span class="cnm">${hesc(f.name)}</span>
      <span class="cwy">${hesc(f.what)}</span>
    </div>`).join("")}</div>
    <div class="cmpacts" style="margin:11px 0 0">
      <button type="button" class="edbtn" id="depGo"><b>Write the deposit</b></button>
      <span class="sp">${st.n === st.of
        ? "every decision declared"
        : "it will be written with " + (st.of - st.n) + " decision" +
          (st.of - st.n === 1 ? "" : "s") + " open, and will say so on every page of itself"}</span>
    </div>`;
}

/* THE NOTEBOOK, which is an ORDER and a READING over things already derived.

   The list below was a description until the three parts that make it a
   notebook were built: the order, the prose between the parts, and the file.
   What is here now is the editor for all three. Every part but the prose names
   something the bench derived, and the file renders what it names from the
   model as it stands -- so a part cannot say the sign was proved, it names the
   finding and the number comes from the derivation. page/25-notebook.js. */
function nbPickHTML(){
  const kept = boardKept().filter(r => r.y && r.x);
  const kind = nbKind(NB.pick) || NBKIND[0];
  const of = kind[2];
  return `
    <div class="row" style="gap:7px 12px;align-items:flex-end">
      <label class="mblab" style="flex:1 1 280px">what to add
        <select id="nbPick" aria-label="What kind of part to add">${NBKIND.map(k =>
          `<option value="${k[0]}"${NB.pick === k[0] ? " selected" : ""}>${hesc(k[1])}</option>`
        ).join("")}</select></label>
      ${of === "finding" ? `<label class="mblab" style="flex:1 1 320px">about which finding
        <select id="nbAt" aria-label="Which finding this part is about">${
          kept.length ? kept.map(r =>
            `<option value="${hesc(r.id)}">${hesc(String(r.text ||
              (r.y + " in " + r.x)).slice(0, 80))}</option>`).join("")
            : `<option value="">nothing is retained on step 3.2 yet</option>`}
        </select></label>` : ""}
      ${of === "ask" ? `<label class="mblab" style="flex:1 1 320px">which ask
        <select id="nbAt" aria-label="Which ask this part is about">${
          PROV.length ? PROV.map((p, i) =>
            `<option value="${i}">${hesc((p.what || "an ask") + " · " +
              String(p.at || "").slice(0, 16).replace("T", " "))}</option>`).join("")
            : `<option value="">no answer has been accepted from a model yet</option>`}
        </select></label>` : ""}
      <button type="button" class="edbtn" id="nbAdd"${
        (of === "finding" && !kept.length) || (of === "ask" && !PROV.length)
          ? " disabled" : ""}>Add it</button>
    </div>
    <p class="why">${hesc(kind[3])}</p>`;
}

function notebookHTML(){
  const cells = NB.cells;
  return `
   <div class="row" id="finPanel" style="gap:14px 26px;margin-top:2px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <span class="ctl-label">The notebook ${infold(`The findings in an order you chose,
         with your reading between them. Every part but the prose names something the bench
         derived, and the file renders what it names.`)}</span>
       <p class="lgloss">${cells.length
         ? `<b>${cells.length}</b> part${cells.length === 1 ? "" : "s"} · <b>${
             cells.filter(c => c.kind === "note").length}</b> of them your own prose`
         : "nothing in it yet — add a part below"}</p>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Built here rather than embedded, for one reason: a general notebook
         takes arbitrary prose and arbitrary code, which reopens the door this instrument
         closed — a cell could assert anything and nothing would check it. Here a part
         <b>points at</b> something derived rather than claiming to be derived, so the only
         part that is not checkable is the prose, which is marked as the author's. Where a
         real notebook does belong is the other direction: a result returned from Mathematica
         should travel as the notebook that produced it, so somebody with no licence can
         replay the detour rather than retype its answer.</span></p>

       <div class="fld" style="max-width:none">
         <span class="ctl-label">Its title</span>
         <input type="text" id="nbTitle" value="${hesc(NB.title)}"
           placeholder="An action model, read" aria-label="The notebook's title">
       </div>

       <span class="ctl-label" style="margin-top:13px;display:block">What is in it, in
         order</span>
       ${cells.length ? `<div class="chain">${cells.map((c, i) => {
         const k = nbKind(c.kind), bad = nbBad(c);
         return `<div class="crow nbrow">
           <span class="cst ${bad ? "gap" : "ok"}">${i + 1}</span>
           <span class="cnm">${hesc(k[1])}<span class="cfl">${hesc(nbLabel(c))}</span></span>
           <span class="cwy">${bad ? `<b>${hesc(bad)}</b>` : hesc(k[3])}${
             c.kind === "note" ? `
             <textarea class="defbox" data-nbtext="${hesc(c.id)}" rows="3"
               placeholder="your reading of what is above, in your own words">${
               hesc(c.text || "")}</textarea>`
             : `<textarea class="defbox" data-nbtext="${hesc(c.id)}" rows="2"
               placeholder="a line of your own under this part, if you want one">${
               hesc(c.text || "")}</textarea>`}</span>
           <span class="pacts2">
             <button type="button" class="edbtn" data-nbup="${hesc(c.id)}"${
               i === 0 ? " disabled" : ""} title="Move it up">&#9650;</button>
             <button type="button" class="edbtn" data-nbdn="${hesc(c.id)}"${
               i === cells.length - 1 ? " disabled" : ""} title="Move it down">&#9660;</button>
             <button type="button" class="edbtn" data-nbdel="${hesc(c.id)}"
               title="Take it out">Remove</button>
           </span>
         </div>`; }).join("")}</div>`
         : `<p class="why">A notebook is an order and a reading over what the steps above
           produced. Nothing here is written by hand except your own prose.</p>`}

       <span class="ctl-label" style="margin-top:13px;display:block">Add a part</span>
       ${nbPickHTML()}

       <div class="cmpacts" style="margin:13px 0 0">
         <button type="button" class="edbtn" id="nbExp"${cells.length ? "" : " disabled"}
           title="One Markdown file: your prose as prose, and every other part rendered from the model as it stands. Markdown rather than HTML because a notebook here is read, quoted and diffed, and everything else that leaves this page is plain text.">Export the notebook</button>
         <span class="sp">${cells.length
           ? `${cells.filter(c => !nbBad(c)).length} of ${cells.length} part${
               cells.length === 1 ? "" : "s"} will render`
           : "nothing to export yet"}</span>
       </div>
     </div>
   </div>`;
}

const STAGES = [
 {n:1, key:"scope", title:"Scope the literature", what:"the sources",
  short:"Which papers count as this literature.",
  blurb:"The scholar decides what counts as this literature. This step assembles the foundation its constructs and their relationships are extracted from, each one traceable to the paper it came from.",
  long:"A literature is not given — somebody decides what belongs to it. Narrow by outlet and by the research tradition a paper works in. How many papers must name a construct before it is drawn is a decision about constructs, and it is made on the next step.",
  count: v => `<b>${v.papersIn}</b> of ${
    Object.keys(G.papers || {}).length || v.papersIn} papers · <b>${v.claimsIn}</b> relationships`,
  done: () => state.jr.size !== JALL.size || state.ap !== "all",
  body: v => `
   <div class="row scoperow">
     <div class="fld">
       <span class="ctl-label">Research tradition</span>
       <select id="cAp" aria-label="Research tradition">
         <option value="all">Every tradition</option>
         ${apOptions()}
       </select>
       <div class="schemebar">
         <!-- A CUT OF A LITERATURE THIS PROJECT HAS NOT GOT is not a cut. The
              shipped classification names three traditions and the review it
              was read from, which is the right thing to say over the shipped
              corpus and says nothing over an empty one: a new project opened
              offering to sort papers it does not hold. -->
         <span class="schemesrc">${Object.keys(G.papers || {}).length
           ? `${SCHEME().n} traditions, read from ${SCHEME().cite}`
           : "no classification yet \u2014 one arrives with the literature"}</span>
         <button type="button" class="tabbtn" id="impScheme">Read one from a paper&hellip;</button>
         ${schemeNow() ? `<button type="button" class="tabbtn" id="schemeOff"
           title="Put the shipped cut back: three traditions from Durand &amp; Huynh (2024), with every paper's tradition as that review assigned it.">Back to the shipped cut</button>` : ""}
       </div>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A classification is read out of a paper, not out of the corpus — this one sorts papers by ${SCHEME().what}. Papers are coloured by tradition on the map whenever this is set to every tradition.${
         schemeNow() ? ` <b>This cut was read in on this step</b>${SCHEME().name
           ? ` from ${hesc(SCHEME().name)}` : ""}, and it replaced the shipped one rather than joining it: a second review is a different cut of the same papers, not more traditions beside the first.` : ""}</span></p>
     </div>
     <div class="fld">
       <span class="ctl-label">Outlets in scope</span>
       <div class="jbox"><div class="jgrid" id="cJr"></div></div>
       <div class="minor">
         <button type="button" id="jAll">All outlets</button>
         <button type="button" id="jNone">None</button>
         <span class="jcount" id="jCount"></span>
       </div>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Where the conversation happens. Choosing outlets is what fixes which discipline's literature this is — these twelve are strategy and organization theory, and each count is the papers retrieved from that outlet.</span></p>
     </div>
   </div>
`},

 {n:2, key:"notion", title:"Select the constructs", what:"the boxes",
  short:"Theory-based grouping.",
  blurb:"You keep the constructs a model can carry, drop the rest, and group the ones naming the same quantity under one name.",
  long:"Theory-based grouping, and the decision the bench exists for. The threshold at the foot of the step fixes which constructs are on the table — a construct is drawn once that many papers name it — and everything else here is done to the set it leaves. The slider proposes merges from how similar two names look, which is a test of wording and not of theory; the merges you make by hand are the record of what you judged. A hand-made merge is drawn as a boundary around the constructs in it, not collapsed into one circle, so it stays inspectable and reversible. What you carry from here is the construct set a model would be built on.",
  count: v => `<b>${v.constructsIn}</b> constructs · <b>${v.notions}</b> after merging · <b>${groups.size}</b> by hand`,
  done: () => groups.size > 0 || state.tight !== 0.15 || state.minp !== 2,
  body: v => `
   <div class="row mergerow">
     ${plotBlock()}
     <div class="mergeside">
     <div class="fld">
       <div class="sh"><span class="ctl-label">Merge constructs by similarity</span>
         <span class="sv" id="vTight">${state.tight.toFixed(2)}</span></div>
       <select id="simM" aria-label="How similarity is measured"
         title="What the number under the slider is a number OF. The threshold is the same control either way; what moves is the thing being thresholded.">
         <option value="word"${SIM.m === "word" ? " selected" : ""}>Wording \u2014 what the corpus ships</option>
         <option value="form"${SIM.m === "form" ? " selected" : ""}>A formula you write</option>
         <option value="mean"${SIM.m === "mean" ? " selected" : ""}>Meaning \u2014 judged by an LLM</option>
       </select>
       <input type="range" id="cTight" min="0.04" max="${SIM.m === "word" ? "0.30" : "1"}"
              step="0.01" value="${state.tight}"
              aria-label="Merge constructs by similarity">
       <p class="why" id="wTight"></p>
       <!-- THE OTHER WAY TO FIND A MERGE, and it belongs here because this is
            the block about finding merges. The threshold proposes them from a
            similarity between two constructs; clustering proposes them from the
            papers a GROUP of constructs share, which is structure no pairwise
            score can see. One button, and the proposals arrive in an overlay
            rather than as a column in this panel: a list of candidate merges is
            something you read down once and act on. -->
       <span class="cmpacts" style="margin:7px 0 0">
         <button type="button" class="edbtn" data-comopen="1"${
           comReady() ? "" : ` data-comrun=""`}>${comReady()
           ? "The " + comCount() + " clusters proposed" : "Propose merges by clustering"}</button>
       </span>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The slider above asks whether two constructs are similar. This asks
         which constructs the same papers keep using together, which is a different question
         and finds groups no pairwise score would shortlist: on the demonstration's
         performance merge, thirteen of its twenty-four neighbours have no arrow to any other
         neighbour, and seventy-three pairs of them share a paper. The settings are on the
         <b>Clusters</b> preset above; this opens what they produced.</span></p>
       ${simPanelHTML()}
     </div>
     <div class="fld">
       <span class="ctl-label">Display merged constructs as</span>
       <div class="modebar" role="group" aria-label="Display merged constructs as">
         <button type="button" id="dBound" aria-pressed="${!state.collapse}">A boundary</button>
         <button type="button" id="dOne" aria-pressed="${state.collapse}">One node</button>
       </div>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A <b>boundary</b> leaves every construct on the map inside a dashed outline, so the merge stays inspectable and you can undo it. <b>One node</b> collapses them into a single circle and the arrows between them disappear — which is what a model built on this set would actually see.</span></p>
     </div>
     <!-- THE THRESHOLD IS A COUNT OF CONSTRUCTS, so it belongs on the step
          about constructs. It sat on 1.1 beside the tradition and outlet
          filters because all three narrow what is in scope -- but those two
          narrow PAPERS, and a reader moving this one on 1.1 had no construct
          count on screen to move with it. Here the step's own count answers
          the slider directly. Boxed, because it is not one control among the
          others: it fixes the set every merge on this step is made from. -->
     <div class="fld keyfld">
       <div class="sh"><span class="ctl-label">Minimum occurrence threshold</span>
         <span class="sv" id="vMinp">${state.minp}+ papers</span></div>
       <input type="range" id="cMinp" min="1" max="6" step="1" value="${state.minp}"
              aria-label="Minimum occurrence threshold">
       <p class="why fold">${infold(`A construct is drawn once this many papers name it. Raise it and only what the field <b>shares</b> survives, which is the part a model can be built on. Every merge you make here is made from the set it leaves.`)}</p>
       <div id="minpTab"></div>
     </div>
     </div>
   </div>
   <div class="selbar" id="selbar" hidden></div>`},

 {n:3, key:"carry", title:"Weigh the relationships", what:"the arrows",
  short:"Study-based. What each relationship can and cannot support.",
  blurb:"Of the relationships left between those constructs, you keep the ones carrying real support and enough specification to model.",
  long:"Step 1.2 read the literature's concepts; this step reads its studies, and what you do here is select the arrows a model would be built on \u2014 a click on an arrow is the decision, and the record carries it. The weighting at the foot of the step is the instrument for finding which ones to decline: how much each relationship settles about the form of the relationship, about whether its two ends are commensurable, and about what stands behind it. The middle one is what stops a formal modeller and an empirical study alike.",
  count: v => `<b>${v.arrows3}</b> arrows · <b>${v.strong3}</b> clear all three · <b>${v.corrob3}</b> corroborated` +
    (v.answ3 ? ` · <b>${v.answ3}</b> answered elsewhere${
      v.disp3 ? `, <b>${v.disp3}</b> disputed` : ""}` : ""),
  done: () => state.ev!=="all" || state.sgn!=="all" || state.core ||
    ["Comm","Spec","Evid"].some(b => state.bar[b] !== 0 ||
      COMPONENTS[b].items.some(it => (state.need[b][it.k] || "opt") !== "opt")),
  body: v => `
   <div class="row" style="margin-top:2px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="phdr">
         <button type="button" class="pfold" id="wgtFold" aria-expanded="${state.wgtOpen}">
           <span class="caret">${state.wgtOpen ? "\u25be" : "\u25b8"}</span>
           <span class="ctl-label">Filter</span></button>
         <span class="pcount">${["Comm","Spec","Evid"].some(b => state.bar[b] ||
           COMPONENTS[b].items.some(it => (state.need[b][it.k] || "opt") !== "opt"))
           ? `<b>${v.strong}</b> of ${v.arrows} arrows clear what you asked`
           : "nothing asked of a relationship yet"}</span>
       </div>
       ${state.wgtOpen ? `
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">This does not decide what you carry — <b>clicking an arrow does</b>, and
         that click is the record. What the three readings are for is finding the arrows worth
         declining: ${v.arrows || 0} of them is more than anyone inspects by hand, and a
         relationship can fail any of the three independently. Nothing is counted twice, so a relationship
         expensive to specify is not thereby recorded as poorly evidenced.</span></p>
       <div class="row mergerow" style="margin-top:11px">
         ${["Comm", "Spec", "Evid"].map(b => barField(b)).join("")}
       </div>
       <div class="row" style="margin-top:12px">
         <div class="fld wide">
           <span class="movlab preslab" style="margin-top:0">Presets</span>
           <div class="presets" id="barsets">
             ${BARSETS.map(q => `<button type="button" data-barset="${q.k}"
               aria-pressed="${barsetOn(q)}">${q.n}</button>`).join("")}
           </div>
         </div>
       </div>` : ""}
     </div>
   </div>
   ${(AS => AS.answered ? `<p class="why fold" style="margin-top:13px"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">
     <b>Across the whole corpus, ${AS.answered} relationships are answered by another paper</b> —
     ${AS.edges} edges in three verbs: a paper responding to, refining or contradicting one
     specific relationship in another. The count above is the part of that reaching the constructs you
     carry. A relationship that has been answered is marked in the list below.
     ${AS.disputed ? `<b>${AS.disputed} of them are disputed</b>: the answering
       paper asserts the very same statement and gives it a different sign. For those, the
       corroboration count above is counting an answer as independent agreement, which
       overstates the evidence — three papers asserting one statement are not three papers
       unless they arrived at it separately. Those rows are marked in red, and the count is
       left as it is rather than silently adjusted, because which of the two readings you want
       is a judgement and not a default.` : ``}</span></p>` : ``)(ANSWSTAT())}
   <div class="row mergerow isorow" style="margin-top:13px;gap:10px 26px">
     <label class="chk"><input type="checkbox" id="cCore" ${state.core?"checked":""}>
       <span class="chkl"><b>Show only the largest joined-up set of qualifying arrows</b>${infold(`The biggest island reachable on relationships that clear all three bars, which is the part a single model could be built on.`)}</span></label>
     <label class="chk"><input type="checkbox" id="cIso" ${state.hideIso?"checked":""}>
       <span class="chkl"><b>Hide constructs with no arrows at all</b><i id="isoN"></i></span></label>
   </div>
   ${floorHTML()}`},

 {n:4, key:"pass", title:"Join other literatures", what:"the additions",
  short:"The creative step: find something related, in another literature.",
  blurb:"Other literature streams come in here, one or several, and their constructs and relationships join the core model.",
  long:"No model has been built from this curation yet. What is here is one built elsewhere, and the relations it needs that this literature never asserts. Those gaps are the work: close one with the smallest addition drawn from a second literature \u2014 <b>analogical abduction</b>, the only method Borsboom et al. (2021) offer for the step they call the least methodologically developed of theirs.",
  count: v => { const prop = (MR.relations || []).filter(x => x.proposes).length;
    return `<b>${state.msel.size}</b> of ${prop} model relations carried` +
      (mclm.size ? ` \u00b7 <b>${mclm.size}</b> relationship${mclm.size === 1 ? "" : "s"} added by hand` : "") +
      (mcon.size ? ` \u00b7 <b>${mcon.size}</b> construct${mcon.size === 1 ? "" : "s"}` : ""); },
  done: () => state.msel.size > 0 || mclm.size > 0 || mcon.size > 0 || crossGroups().length > 0,
  /* UNDER THE BUILDING BLOCKS, not above them. The panel sits above the whole
     stageWrap, so anything rendered into it lands before the blocks this step
     is about -- and the mergers are an operation ON those blocks. `under`
     renders into the slot between the blocks and the map: directly below the
     Building blocks and above the map and the inspector. */
  body: () => "",
  under: () => joinRecoHTML()},

 /* Step 3.1. The decisions the model leaves open used to sit on step 2.1,
    beside the additions. They are not about the additions: they are about how
    far a conclusion reaches, which is the question a claim's domain of validity
    asks too, so both belong here. The threshold moved with them -- it does
    nothing but govern that list, and a control whose only effect is a list on
    another step is the doubling this bench keeps taking out. */
 /* Step 3.1. It was "Scope the claims", and what it did was declare the class
    of forms a relation would be enumerated over. That is one of the five things
    a model declares; the other four had no home, and the step that would have
    collected them was drawn outside the bench as a ghost. They are one act:
    deciding what the model is made of. So the ghost comes inside and the
    declaration it already held comes with it, and what leaves this step is a
    file rather than a figure. */
 /* Step 3.1 holds both halves of the declaring, on one page. The separation
    test -- two steps stay apart exactly when the second checks the first --
    constrains the ORDER of the two acts, not the number of pages they occupy.
    Declaring a bound and then reading the verdict that bound generated is one
    piece of work, and a chevron between them means a failure at the
    arithmetic points at a declaration a step back. Each half keeps its own
    region of the page, and the verdicts name the declaration each test came
    from. The chain is eight steps. */
 {n:5, key:"build", title:"Operationalize the model", what:"the model",
  short:"Declare what the literature left open, write the arithmetic that closes it, and read what those declarations require.",
  blurb:"You declare the nature of each variable, the family of forms each relationship may take and the range of each parameter, then write the arithmetic those declarations allow.",
  long:"Steps 1.1 to 2.1 narrowed the literature. What is left is everything the literature never decided, and a model has to decide all of it \u2014 what sort of quantity each construct is, what each relation <b>does</b>, the class of shapes it runs over, which mechanisms substitute. Then the arithmetic that closes it, and the part that makes the declaring worth doing: <b>the checks are generated from the declarations</b>. Seven of the nine exist only because something above was declared, so declaring a bound IS writing the test that later catches an outcome at 2.000. Nothing is checked that you did not ask for, and the list shrinks when you declare less.",
  count: v => { const sp = openSpace(), outs = outcomeVars();
    const done = outs.filter(k => rulesOf(k).length).length;
    return `<b>${sp.n - sp.open}</b> of ${sp.n} choices narrowed \u00b7 ` +
      `<b>${done}</b> of ${outs.length} composed \u00b7 ` +
      (ARITH.kept && ARITH.kept.run
        ? `arithmetic holds <b>${ARITH.kept.run.pass}</b> of <b>${
            ARITH.kept.run.pass + ARITH.kept.run.fail}</b>`
        : `arithmetic <b>not written</b>`); },
  done: () => (vtype.size > 0 || [...spec.values()].some(x => x &&
    ((x.roles && x.roles.length) || x.role || (x.props && x.props.length)))) &&
    compo.size > 0,
  /* Another model's declarations, arithmetic and conclusions, under this
     step's own, because this step is where declarations and arithmetic live
     and a second model is worth having here to compare with rather than to
     read somewhere else. Empty markup until one is read in. */
  body: v => specifyBodyHTML(v) + (state.dec === "arith" ? closeBodyHTML(v) : "") +
    impPanelHTML(typeof BOARD === "undefined" ? [] : BOARD.rows)},

 /* Step 3.2. It ran the model and the step after it read how far the
    conclusions reached, which is one question asked twice: a run nobody scopes
    is a number, and a scope with no run under it is an opinion. They are one
    step now.

    The step carried the ARGUMENT for the method ahead of the thing it argues
    for: four paragraphs on soundness, corners and conditionality, then the
    buffer. So a scholar who came here to derive something read six hundred
    words of epistemology first, and the one surface on this bench that is
    worked on rather than read sat in the same flat column as the prose. The
    argument is intact and one summary away. What is on the page is the
    workspace -- a bounded panel with the derivation in it -- then the board it
    hands on to, then the two ways of asking for more. Concision here is not a
    cut of the reasoning; it is moving the reasoning to where somebody goes
    looking for it. */
 {n:6, key:"statics", title:"Derive the findings", what:"and retain them",
  short:"Derive the findings \u2014 on a working list, retaining what you stand behind.",
  blurb:"The workbench derives what follows from the model, and you search the declared forms, combine what comes back, score it, and retain the findings you stand behind.",
  long:"Step 3.1 asks whether the model is what you declared. This derives what <b>follows</b> from it. A derivative comes back as an <b>expression</b>, so interval arithmetic can turn its sign into a proof over the declared box — bisecting until the parts decide, so what comes back is a <b>region</b>: the scope condition, derived rather than stated. You work on the list; what you would stand behind goes on the board, and accumulates across rounds.",
  /* A step's counter has to count the step's own work, which is why this
     counts the buffer rather than MR.conclusions — the repository model's
     precomputed report, which it used to read, so the header said "9
     conclusions, 4 survive both dimensions" before anybody had touched
     anything and went on saying it afterwards. */
  count: v => { const n = BUF.lines.length;
    const sg = BUF.lines.filter(x => x.res).length;
    const st = BUF.lines.filter(x => x.stated).length;
    const sc = SCORE.rows ? SCORE.rows.length : 0;
    return (n ? `<b>${sg}</b> of <b>${n}</b> line${n === 1 ? "" : "s"} signed · <b>${
          st}</b> stated`
      : "<b>nothing</b> derived yet") +
      (sc ? ` · <b>${sc}</b> candidate${sc === 1 ? "" : "s"} ranked` : ""); },
  done: () => BUF.lines.some(l => l.stated),
  body: v => `
   <div class="row" style="margin-bottom:2px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <!-- TWO WAYS TO READ THE SAME DERIVATION. One tab where the work is
            automatic and the reading is in words, and another with the list
            of candidate findings, so that somebody who does not work in
            formal models can get at the results without going to the
            formula. She/he can see the formula and full derivation if
            needed."

            So Reading is first and is the default. It holds what the findings
            MEAN, in words, with the expression and the derivation each behind
            a fold rather than absent. Working is the list: the buffer, the
            exports, the board, the rounds -- everything a formal modeller
            wants and a curator does not have to meet. -->
       <div class="modebar tabsrow" role="tablist" aria-label="How to read the derivation">
         <button type="button" role="tab" data-der="read" aria-controls="derPanel"
           aria-selected="${state.der !== "work"}"
           title="What the model turned out to imply, as sentences, with a model's help offered before any of the detail.">Findings</button>
         <button type="button" role="tab" data-der="work" aria-controls="derPanel"
           aria-selected="${state.der === "work"}"
           title="The expressions and the commands: derive, combine, search the declared class, and every line's own working.">Derivation</button>
       </div>
     </div>
   </div>
   ${state.der !== "work" ? findingsHTML() + readingHTML() + keptHTML() : ""}
   <div id="derPanel"${state.der !== "work" ? " hidden" : ""}>
   <div class="row" style="gap:14px 26px;margin-top:2px">

     <div class="secthd sectone">
       <!-- NOT "CANDIDATE FINDINGS", which is the Findings tab's list and a
            different set: that one holds the lines something has settled, this
            one holds every line including the ones nothing has. Two lists
            under one name leave a reader unable to tell how the two tabs
            relate to each other at all. -->
       <span class="sectn">The working list</span>
       <span class="secti"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">It opens <b>empty</b>. Four things fill it, and they are the toolbar
         below: derive the whole model at once, look for a sign in data, search the declared
         class in a named direction, or rank what is there. Everything on the list is a working
         surface — overwritten by the next attempt, until you retain it.</span></span>
     </div>

     <div class="wbench">
       ${wsPopHTML()}

       <div class="fld" style="flex:1 1 100%;max-width:none">
         <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Everything else on this step samples; this proves. An interval that sits
           above zero contains no point below it, so a sign over the declared box is settled by
           arithmetic rather than by trial — and where the whole box will not decide, it is
           bisected until the parts do. The method is <b>sound and incomplete</b>, so
           <i>undecided</i> is a verdict and not a failure, and every line means <i>given these
           declarations, this follows</i>.</span></p>
         <details class="deet">
           <summary>What the method rests on, and why a corner is the finding</summary>
           <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The grammar step 3.1 writes in is <b>five operators and four
             functions</b> — <code>+ - * / **</code>, <code>min</code>, <code>max</code>,
             <code>exp</code>, <code>log</code> — and it is closed under differentiation. That
             is why a derivative comes back as an <b>expression</b> rather than a number, and why
             interval arithmetic has something to work on: bisecting the declared box until the
             parts decide reports a <b>region</b>, which is the scope condition derived rather
             than stated.</span></p>
           <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx"><b>A corner is not an obstacle, it is the finding.</b> <code>min</code>
             and <code>max</code> have no derivative only <i>where their arguments cross</i>;
             everywhere else the expression <b>is</b> one of them, and differentiating the one
             that binds is exact. So the branch is resolved against your declared box before
             anything is differentiated: where one argument dominates the whole range, the corner
             falls outside it and the <code>max</code> simply disappears. Where they do cross,
             <b>split where they cross</b> locates the crossing by bisection and derives on each
             side of it — and that crossing is where the binding mechanism switches, which in a
             substitutes model is the scope condition worth having.</span></p>
           <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx"><b>Two ways to work, one list.</b> <b>Derive</b> fills it with the
             automatic pass; the commands carry any line further by hand, and what your own tool
             sends back arrives as a line too. Each line carries where it came from and what the
             checker said, which is why this is a list of rows and not a conversation: a sequence
             of named commands over named expressions re-runs, and <b>the script</b> exports
             exactly that.</span></p>
           <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx"><b>What is proved is conditional on the declarations.</b> The arithmetic
             was proposed and kept because it survived the checks on step 3.1, not derived from
             any theory. A formula reads as more authoritative than an interval, which is why that
             sentence is here and in every file this exports.</span></p>
         </details>
         ${PROPS.err ? `<p class="why" style="color:var(--neg)">${hesc(PROPS.err)}</p>` : ""}
         ${BUF.lines.length ? `<div class="cmpacts" style="margin:9px 0 0">
           <span class="mblab" style="align-self:center">write it out as</span>
           <button type="button" data-dex="tex">LaTeX</button>
           <button type="button" data-dex="sympy">SymPy</button>
           <button type="button" data-dex="wolfram">Mathematica</button>
           <button type="button" data-dex="script">the script</button>
           ${statedLines().length ? `<button type="button" data-dex="results"
             title="The findings as data rather than as prose: the sentence, the box, which of its ranges you declared, the method, the region, and what each one rests on. Written against schema/result.schema.json.">results</button>
           <button type="button" data-dex="claims"
             title="The same findings in the columns index/claims.tsv uses, status 'derived', so a result can re-enter a curation as an input rather than only being read.">claim records</button>` : ``}
         </div>` : ``}
         ${bufHTML()}
       </div>
     </div>

   </div>
   </div>`},

 /* Step 4.1. It sits OUTSIDE the loop bracket, and that is the whole of
    why it is a step and not a button on step 3.1's export. Five to seven are a
    round — declare, run, read what broke, declare again — and this is the
    terminus. What it decides is not about the model at all. It is about what
    survives the browser tab.

    Hanging it off the export was the alternative and it is the wrong shape:
    the export writes one file, and a deposit is not one file. It is the claim
    table, the declarations, the generated model with its verdicts, the
    conclusions with their scope and the history of how they were reached —
    none of which is complete until step 3.2 has run. Nothing below is
    built. It is a list rather than a blank because a deposit assembled at the
    end without these decided is one that defaulted on every line. */
 /* Step 4.1. Step 3.2 derives and ranks; nothing drew the result, and the
    picture is what a reader of the paper actually sees. It is its own step
    because it is its own act: deciding which of what survived is the finding,
    and showing it over the range it was proved on rather than at whatever
    setting happened to be convenient.

    The worked example sits here too, at the end rather than at the top of
    step 3.2, where it competed with the curation's own derivation and set
    that step's counter. Here it is what it is: the same plate, finished, on a
    model the repository already carries. */
 {n:7, key:"plot", title:"Finalize the findings", what:"their validity domains",
  short:"Finalize the findings and their validity domains: each one drawn over the range its sign was proved on.",
  blurb:"Each retained finding is read against the set of form combinations you declare, and drawn over the range its sign holds on.",
  long:"A finding is a sign that was settled somewhere: proved on the whole declared box, or on part of it with the threshold located \u2014 a proposition and the <b>domain it is valid on</b>. This draws each one over that domain, with the domain under the axis rather than described in a sentence. What the method could not decide anywhere is listed rather than drawn, because an absence nobody shows reads as an absence of the question.",
  count: v => { const p = PROPS.out ? PROPS.out.props.filter(x => !x.err) : [];
    return p.length
      ? `<b>${p.filter(keptPlot).length}</b> of ${p.length} ${
          plotBoarded() ? "retained and plotted" : "findings plotted, none retained yet"}`
      : "<b>nothing</b> derived to plot"; },
  done: () => !!(PROPS.out && PROPS.out.props.some(keptPlot)),
  body: v => { const P = PROPS.out, all = P ? P.props.filter(x => !x.err) : [];
    const keep = all.filter(keptPlot), drop = all.filter(x => !keptPlot(x));
    /* What the class run found about one proposition, handed to the plate.
       10-depends.js cannot read XRUN itself: 21-exprun.js imports from it, so
       the arrow has to point this way or the modules form a cycle. */
    const xslots = expSlotsNow(), xopt = {pick:EXP.pick, n:EXP.n, seed:EXP.seed};
    const xn = xslots.length ? expSize(xslots, EXP.set, xopt) : 0;
    const xstale = !!(XRUN.rows && xrunStale({sig:XRUN.sig}, ARITH.kept && ARITH.kept.sig));
    const plCls = q => ({n:xn, stale:xstale,
      row:XRUN.rows ? XRUN.rows.find(r => r.y === q.y && r.x === q.x) || null : null});
    const tabs = `
     <div class="row" style="margin-bottom:2px">
       <div class="fld" style="flex:1 1 100%;max-width:none">
         <div class="modebar tabsrow" role="tablist" aria-label="What this step shows">
           <button type="button" role="tab" data-fin="findings" aria-controls="finPanel"
             aria-selected="${state.fin !== "notebook"}"
             title="Every retained finding drawn over the region its sign was proved on, what the method could not decide, the scope the papers claimed, and the model read as comparative statics.">Findings</button>
           <button type="button" role="tab" data-fin="notebook" aria-controls="finPanel"
             aria-selected="${state.fin === "notebook"}"
             title="The findings in an order somebody chose, with the reading between them. Reserved: see what it would hold.">Notebook</button>
         </div>
       </div>
     </div>`;
    if(state.fin === "notebook") return tabs + notebookHTML();
    return tabs + `
   <div class="row" id="finPanel" style="gap:14px 26px;margin-top:2px">
     <div class="secthd sectone">
       <span class="sectn">The set to explore</span>
       <span class="secti"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Which of the declared class the findings are read against, declared
         <b>before</b> they are read rather than taken from whatever was cheap to run. A
         conclusion that survives one combination and a conclusion that survives three
         thousand are different relationships, and only the second is about the class.</span></span>
     </div>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       ${expHeadHTML()}
     </div>

     <div class="secthd">
       <span class="sectn">The findings</span>
       <span class="secti"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Each one drawn over the range its sign was proved on, with what the
         method could not decide listed rather than dropped.</span></span>
     </div>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <span class="ctl-label">The findings, drawn over the range they were proved on</span>
       <p class="lgloss">one plate per signed derivative — the relation above, what it does
         at the margin below, and what that can be anywhere in the box</p>
       ${keep.length ? keep.map(p => plateHTML(p, P, plCls(p))).join("") + `
       <p class="plkey">The band on the lower panel is the range the marginal effect can
         take over every setting of the other parameters at once, cell by cell:
         <i class="dbdp"></i> the sign is proved there · <i class="dbdf"></i> proved the
         other way · <i class="dbdm"></i> it depends on a parameter the picture does not
         show · <i class="dbdo"></i> the method could not decide. The sign holds wherever
         the band clears the zero line. The dashed line is where it turns.</p>`
         : `<p class="empty">${P
             ? "Nothing was settled anywhere. The list below says which derivative, and why."
             : "Nothing derived yet — step 3.2's <b>derive</b> is what fills this."}</p>`}
     </div>

     ${drop.length ? `<div class="fld" style="flex:1 1 100%;max-width:none">
       <span class="ctl-label">What did not survive, and why</span>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Sound and incomplete means <i>undecided</i> is a verdict rather than a
         bug. The usual cause is the dependency problem: a name occurring twice in an
         expression is enclosed as two independent ranges, which widens the result until it
         straddles zero. Narrowing a declared bound on step 3.1 is what tightens it.</span></p>
       <div class="chain">${drop.map(p => `<div class="crow arow">
         ${vdHTML(p.verdict || "undecided", vTurned(p), p.share, p.open)}
         <span class="cnm">∂${hesc(p.y)} / ∂${hesc(p.x)}<span class="cfl">${
           p.boxes} boxes searched</span></span>
         <span class="cwy">${(100 * p.open).toFixed(1)}% of the declared box could not be
           decided either way${p.share > 0.0001
             ? `, and the ${(100 * p.share).toFixed(1)}% that could has no located threshold`
             : ""}.</span>
       </div>`).join("")}</div>
     </div>` : ""}

     <div class="fld" style="flex:1 1 100%;max-width:none">
       ${statedScopesHTML()}
       <span class="ctl-label">The model, read as comparative statics ${infold(`One panel per free parameter, drawn from this model rather than described.`)}</span>
       <p class="lgloss">each parameter moved on its own, with what the shift does to every outcome</p>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Computed from the arithmetic step 3.2 closed, by the same kernel the
         findings above are proved with, and redrawn whenever that arithmetic changes. The
         statements beside each panel are the mechanism declarations that reach the parameter
         being moved. Before anything is declared it draws the finished example the bench
         ships, so the section is never empty and never pretends the example is your
         result. The standalone page at <code>statics/index.html</code> mounts the same
         module.</span></p>
       <div class="stx" id="stxhost"></div>
       <span class="ctl-label" style="margin-top:15px;display:block">What your findings
         still leave open ${infold(`Two questions, about the findings you retained on step
         3.2 and no others.`)}</span>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Two dimensions are kept apart, because a conclusion can be robust to
         one and fragile to the other: the class of functional forms, and the parameter
         setting. A finding proved over the declared box has answered the second and may not
         have been asked the first at all, which is the commonest state a board is in. And
         where the class has been run, the combinations it <b>contradicts</b> are the ones
         to read: a combination the search could not settle is not a combination that
         disagreed, and the two are counted apart. What is asked about here is the model you
         built, never the one that ships with the page.</span></p>
       <div class="seg" role="group" aria-label="Which decisions to show" data-wl="0">
         <button type="button" data-f="open">Open</button>
         <button type="button" data-f="done">Answered</button>
         <button type="button" data-f="all">Everything</button>
       </div>
       <div id="worklist"></div>
     </div>
   </div>`; }},

 {n:8, key:"deposit", title:"Share the action model", what:"the building block",
  short:"The action model as a building block somebody else can import: the material, the licence, and an address that can be cited.",
  blurb:"The closed model, its findings and the record of every choice leave here as one deposit another scholar can reopen.",
  long:"Everything above happens in a browser tab and dies with it. The call rules out work that cannot be reproduced by others, which makes the last decision a curation takes not a modelling decision at all: what leaves, on what terms, at an address somebody can cite. Not all of it can leave. The 52 papers are other people's copyright, so what ships is what was read off them — the relationships, the constructs, the signature recorded for each — and a replicator obtains the texts. <b>None of this is built.</b> It is set down as five decisions rather than left blank, because a deposit assembled at the end without them is one that defaulted on every line.",
  count: () => { const st = depState();
    return `<b>${st.n}</b> of ${st.of} decided${st.n === st.of
      ? " \u00b7 <b>ready</b>" : ""}`; },
  done: () => depDone(),
  body: () => `
   <div class="row" style="gap:14px 26px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <span class="ctl-label">The five decisions</span>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The same device as the chain under step 3.2: a list that counts
         itself, so what is missing is stated rather than inferred from its absence. Every
         other step on this bench exists to stop a choice being defaulted, and these five
         would otherwise be defaulted. Four of them are declarations, in the same shape as
         every other declaration here: a closed list where the choice is
         closed, free text where it is not, each carrying the day it was made, travelling
         in the project and reversible. The fifth is not a free choice and says so.</span></p>
       ${depositHTML()}
     </div>

     <!-- What an action model IS, as files. Not one artefact: every step leaves
          something, and a reader who disagrees with a conclusion wants the step
          the disagreement is about rather than the whole of it. So the parts are
          addressable one at a time, and the last row is all of them at once. -->
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="embhd">
         <span class="ctl-label">The action model, part by part</span>
         <span class="pcount">${PARTS.filter(x => x.has()).length} of ${PARTS.length} available</span>
       </div>
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">An action model is <b>a building block somebody else can start from</b>,
         and it is not one file. Each step leaves something, and a reader who disagrees with a
         conclusion wants the step the disagreement is about — the relationships it rests on, the
         declarations, the arithmetic — rather than the whole of it. Those are addressable here
         one at a time; the last row is all of them together, and it is the one a citation should
         pin to. <b>What is not here is said so</b> rather than left to be discovered.</span></p>
       <div class="chain">${PARTS.map(x => { const on = x.has(); return `<div class="crow">
         <span class="cst ${on ? "ok" : "gap"}">${Array.isArray(x.at)
           ? `steps ${stepNo(x.at[0])}\u2013${stepNo(x.at[1])}`
           : `step ${stepNo(x.at)}`}</span>
         <span class="cnm">${x.n}<span class="cfl">${x.f}</span></span>
         ${on ? `<button type="button" class="edbtn" data-part="${hesc(x.k)}">Download</button>`
              : ``}
         <span class="cwy">${on ? x.w : `<b>Nothing yet.</b> ${x.w}`}</span>
       </div>`; }).join("")}</div>
     </div>
   </div>`}
];

/* The carry controls, shared by steps 1.2 and 1.3. Bulk actions matter more
   than the per-click toggle: 139 notions is far too many to pick through by
   hand, and the useful starting points are all computable. */

/* How many uncarried notions sit one arrow from this one. Reaching outward is
   the commonest move when assembling a small model, so it is a button on the
   row rather than a modifier key nothing on screen advertises. */
function neighboursOf(n){
  const out = new Map();
  (lastView.links || []).forEach(e => {
    const a = e.source.id ?? e.source, b = e.target.id ?? e.target;
    if(a !== n.id && b !== n.id) return;
    const other = (lastView.nodes || []).find(x => x.id === (a === n.id ? b : a));
    if(other && !other.carried) out.set(other.id, {node:other, edge:e});
  });
  return [...out.values()];
}
function pullNeighbours(n){
  neighboursOf(n).forEach(({node, edge}) => { setCarryNode(node, true); setCarryLink(edge, true); });
  // and join the new arrivals to what was already there
  (lastView.links || []).forEach(e => {
    const a = e.source.id ?? e.source, b = e.target.id ?? e.target;
    if(a === n.id || b === n.id) setCarryLink(e, true);
  });
  cpersist(); refresh();
}

/* The tray: what you are carrying, by name, with the three things you actually
   do to a short list — take one out, reach one arrow further, or add something
   you cannot find on the map. */
/* What this step hands to the next, listed. One place for all five steps,
   between the two arrows that move between them — the list is long on the
   early steps and short on the late ones, which is the whole shape of the
   procedure, so it scrolls rather than being truncated. */
function renderHandover(){
  const host = document.getElementById("hoffbox");
  if(!host) return;
  const S = state.stage;
  const N = lastView.nodes || [], E = lastView.links || [];
  const row = (a, b) => `<li><span class="hn">${a}</span><span class="hm">${b}</span></li>`;
  let head = "", body = "", extra = "";

  if(S === 1){
    const ps = Object.keys(G.papers).filter(okPaper)
      .sort((a, b) => (G.papers[b].nc || 0) - (G.papers[a].nc || 0));
    head = `${ps.length} papers, and the ${lastView.constructsIn} constructs they share`;
    /* The list below draws what the map draws, which is the in-scope set after
       merging; the heading counts the set before it. Naming both rather than
       letting a reader read one number against the other list. */
    /* BOTH HALVES OF WHAT THE HEADING COUNTS. A heading reading "52 papers,
       and the 156 constructs they share" over a list of the papers alone
       leaves the second number pointing at nothing a reader can look at. Two
       columns, under two labels, and the constructs
       carry the one fact step 1.1 decides about them: how many papers name
       each. Sorted by that, because the threshold above is about exactly it. */
    const cs = N.slice().sort((a, b) => b.papers.length - a.papers.length ||
      (b.nc || 0) - (a.nc || 0));
    body = `<ul class="hlist">${ps.map(sl => { const q = G.papers[sl];
      return row(`${q.a} ${q.y}`, `${q.j} · ${q.nc} relationships`); }).join("")}</ul>`;
    extra = `<div class="hcol"><span class="movlab">Constructs, as the map draws them${
        cs.length === lastView.constructsIn ? "" : ` \u00b7 ${cs.length} after merging`}</span>
      ${cs.length ? `<ul class="hlist">${cs.slice(0, 60).map(n => row(
          n.label.replace(/-/g, " "),
          `${n.papers.length} paper${n.papers.length === 1 ? "" : "s"}`)).join("")}${
          cs.length > 60 ? row("", `+ ${cs.length - 60} more of ${cs.length}`) : ""}</ul>`
        : `<p class="empty">No construct is in scope at this threshold.</p>`}</div>`;
  }

  if(S === 2 || S === 3){
    const car = N.filter(n => n.carried).sort((a, b) => b.nc - a.nc);
    const gOf = new Map();
    [...groups.values()].forEach(g => car.forEach(n => {
      if(n.mem.some(m => g.members.includes(m.i))) gOf.set(n.id, g); }));
    head = S === 2
      ? `${car.length} constructs${groups.size ? `, ${groups.size} of them merged by hand` : ""}`
      : `${car.length} constructs and ${E.filter(e => e.carried).length} arrows between them`;
    body = car.length
      ? `<ul class="hlist">${car.map(n => { const g = gOf.get(n.id);
          return row(n.label.replace(/-/g, " ") +
            (g ? ` <i class="hg" style="color:${cssColor(g.color)}">in ${hesc(g.name)}</i>` : ""),
            `${n.papers.length}p · ${n.nc} relationships`); }).join("")}</ul>`
      : `<p class="empty">Nothing selected yet.</p>`;
    if(S === 3){
      const ids = new Set(car.map(n => n.id));
      const inner = E.filter(e => e.carried && ids.has(e.source.id ?? e.source)
                                            && ids.has(e.target.id ?? e.target));
      extra = `<div class="hcol"><span class="movlab">Arrows</span>
        ${inner.length ? `<ul class="hlist">${inner.map(e => row(
            `${lbl(e.source)} → ${lbl(e.target)}`,
            `${e.claims.length} relationship${e.claims.length === 1 ? "" : "s"}`)).join("")}</ul>`
          : `<p class="empty">None between the selected constructs.</p>`}</div>`;
      const reach = core(car, inner).n, split = car.length - reach.size;
      if(split > 0) head += ` — ${split} not joined to the rest`;
    }
  }

  if(S === 4){
    const cc = carriedClaims(), nc = distinctClaims(cc);
    const rel = (MR.relations || []).filter(x => state.msel.has(x.id));
    head = `${nc} relationship${nc === 1 ? "" : "s"}` +
           (rel.length ? ` and ${rel.length} imported relation${rel.length === 1 ? "" : "s"}` : "");
    body = cc.length
      ? `<ul class="hlist">${cc.slice(0, 40).map(({e, c}) => row(
          `${lbl(e.source)} \u2192 ${lbl(e.target)}`,
          `${c.g} \u00b7 ${pap(c.p).a} ${pap(c.p).y}`)).join("")}${
          cc.length > 40 ? row("", `+ ${cc.length - 40} more`) : ""}</ul>`
      : `<p class="empty">Nothing carried. Select arrows on step 1.3.</p>`;
  }

  /* Step 3.1 hands on a declaration per claim, so what moves on is the
     domains, not the decisions: a decision answers a nomination and stays in
     the record, while a domain is what the next hand needs in order to run
     anything. */
  if(S === 5){
    // a domain is declared per relation, so the count is over relations; this
    // was counting one per claim and reporting several domains for one pair
    const sp = impliedSpace(statementsInPlay(false));
    head = `${sp.n - sp.open} of ${sp.n} domains declared` +
           (decided.size ? `, ${decided.size} decision${decided.size === 1 ? "" : "s"} recorded` : "");
    const got = statementsInPlay(false).filter(({e}) => specSet(spec.get(e.id)));
    body = got.length
      ? `<ul class="hlist">${got.map(({e}) => { const v = spec.get(e.id);
          return row(`${lbl(e.source)} \u2192 ${lbl(e.target)}`,
            [v.rel || "", v.props.length ? v.props.join(", ") : "",
             `${memberCount(v.props)}/${MEMBERS_ALL}`].filter(Boolean).join(" \u00b7 ")); })
          .join("")}</ul>`
      : `<p class="empty">No domain declared yet, so every carried relationship admits every
         member and the space is as wide as it can be. The list under the diagram has an
         Edit on each row.</p>`;
  }

  host.innerHTML = `
    <div class="hhead"><span class="ctl-label">What moves on</span>
      <span class="pcount">${head}</span></div>
    <div class="hcols">
      <div class="hcol">${S === 3 ? `<span class="movlab">Constructs</span>`
        : S === 1 ? `<span class="movlab">Papers in scope</span>` : ``}${body}</div>
      ${extra}
      ${(S === 2 || S === 3) ? `<div class="hcol hsearch">
        <span class="movlab">Add one by name</span>${traySearch()}</div>` : ``}
    </div>`;
  if(S === 2 || S === 3) wireTray();
}

function traySearch(){
  return `<div class="tsearch">
    <input type="text" id="tq" placeholder="add a construct by name" aria-label="Search constructs to carry"
           autocomplete="off">
    <div id="tres" class="tres" hidden></div>
  </div>`;
}

function wireTray(){
  const q = document.getElementById("tq"), res = document.getElementById("tres");
  if(!q) return;
  const run = () => {
    const t = q.value.trim().toLowerCase();
    if(t.length < 2){ res.hidden = true; return; }
    const hits = (lastView.nodes || [])
      .filter(n => !n.carried && (n.label.includes(t) ||
                                  n.mem.some(m => m.i.includes(t))))
      .sort((a,b) => b.nc - a.nc).slice(0, 8);
    res.hidden = false;
    res.innerHTML = hits.length
      ? hits.map(n => `<button type="button" data-tadd="${n.id}">
          <span>${n.label.replace(/-/g," ")}</span>
          <i>${n.papers.length} papers · ${n.nc} relationships</i></button>`).join("")
      : `<p class="empty">nothing uncarried matches</p>`;
    res.querySelectorAll("[data-tadd]").forEach(b => b.addEventListener("click", () => {
      const n = (lastView.nodes || []).find(x => x.id === b.dataset.tadd);
      if(n){ setCarryNode(n, true); cpersist(); q.value = ""; refresh(); }
    }));
  };
  q.addEventListener("input", run);
}

/* The action itself, so the panel's bar and the map's overlay run the same
   code rather than two copies that drift. */
/* Step 1.2 selects constructs and step 1.3 selects arrows, so a preset on
   step 1.2 must not write to the arrows. It used to: None dropped all 593
   claims as well as the constructs, so picking constructs back carried the
   boxes and left every arrow dropped -- and a dropped arrow draws at six per
   cent, which is why step 1.3 looked as though it had no arrows at all. A
   step-two button settling a step-three decision is the doubling this bench
   keeps taking out, and the chain says you go back a step to change what a
   step decided, not forward. */
function applyCarry(how){
      const N = lastView.nodes || [], E = lastView.links || [];
      // Whose decision this step is. Boxes on step 1.2, arrows on step 1.3,
      // and a preset writes only to its own, both ways round: None on step
      // three used to wipe step 1.2's construct selection as well.
      const arrows = state.stage >= 3, boxes = state.stage < 3;
      if(how === "all"){ if(boxes) dropped.c.clear(); if(arrows) dropped.k.clear(); }
      else if(how === "none"){ if(boxes) N.forEach(n => setCarryNode(n, false));
                               if(arrows) E.forEach(e => setCarryLink(e, false)); }
      else if(how === "invert"){
        const wasN = new Map(N.map(n => [n.id, n.carried]));
        const wasE = new Map(E.map(e => [e.id, e.carried]));
        if(boxes) N.forEach(n => setCarryNode(n, !wasN.get(n.id)));
        if(arrows) E.forEach(e => setCarryLink(e, !wasE.get(e.id)));
      }
      else if(how === "core"){
        const keep = core(N, E.filter(x => x.pass)).n;
        N.forEach(n => setCarryNode(n, keep.has(n.id)));
        if(arrows) E.forEach(e => setCarryLink(e, keep.has(e.source.id ?? e.source) &&
                                       keep.has(e.target.id ?? e.target)));
      }
      else if(how === "grow"){
        // one hop outward from everything currently carried
        const seeds = N.filter(n => n.carried).map(n => n.id);
        const seedSet = new Set(seeds);
        E.forEach(e => {
          const a = e.source.id ?? e.source, b = e.target.id ?? e.target;
          if(!seedSet.has(a) && !seedSet.has(b)) return;
          const ao = N.find(n => n.id === a), bo = N.find(n => n.id === b);
          if(ao) setCarryNode(ao, true);
          if(bo) setCarryNode(bo, true);
          if(arrows) setCarryLink(e, true);
        });
      }
      else if(how === "pass"){
        E.forEach(e => setCarryLink(e, e.pass));
        const live = new Set(); E.forEach(e => { if(e.pass){
          live.add(e.source.id ?? e.source); live.add(e.target.id ?? e.target); } });
        N.forEach(n => setCarryNode(n, live.has(n.id)));
      }
      cpersist(); refresh();
}

/* What has to exist for the chain to run end to end. A report on the
   software rather than any step's work, so it sits under the last step at
   the level of its statistics and says only "details" until it is asked.
   Built here rather than wired once, because the strip is re-rendered. */
function chainDetHTML(){
  const built = CHAIN.filter(x => x.s === "ok").length;
  const part = CHAIN.filter(x => x.s === "part").length;
  return `<details class="chaindet"><summary title="What this chain needs to exist \u00b7 ${
    built} of ${CHAIN.length} built${part ? ", " + part + " partial" : ""}">details</summary>
    <div class="chaindetb">
      <p class="why" style="margin-top:0"><b>${built} of ${CHAIN.length} built.</b> One of the
        rest is the arithmetic, built in part rather than missing: step 3.1 proposes a body, runs
        it against the declared invariants and writes the verdicts into the file. What it cannot do
        is warrant it, and no interface can. Each other unfinished row says what it is waiting
        on.</p>
      <div class="chain">${CHAIN.map(x => `<div class="crow">
        <span class="cst ${x.s}">${x.s === "ok" ? "built"
          : x.s === "part" ? "in part" : "missing"}</span>
        <span class="cnm">${x.n}${x.f ? `<span class="cfl">${x.f}</span>` : ""}</span>
        ${x.w ? `<span class="cwy">${x.w}</span>` : ""}
      </div>`).join("")}</div>
    </div></details>`;
}


export { DIMLAB, SCHEME, SHIPPED, SHIPWHY, SCOPED, apOptions, STAGES, applyCarry, chainDetHTML, closeBodyHTML, expHeadHTML, expSetHTML, h, holdsThroughout, neighboursOf, pullNeighbours, renderHandover, scopeDetail, simPanelHTML, simTallyHTML, specifyBodyHTML, traySearch, wireTray };

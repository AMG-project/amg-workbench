/* AMG bench, page script 7 of 22: the flow, and every control wired to it.
   One shared global scope, loaded in order. See page/README.md. */
import { asweep } from "../core/invariants.js";
import { COM, comLabel, comListHTML, comMs, comPick, comReady, comRun, comSetHTML } from "./22-communities.js";
import { fsMark, fsToggle } from "../fullscreen.js";
import { hesc } from "../core/safe.js";
import { SCORE, SEARCH } from "../core/rank.js";
import { EXP } from "../core/expset.js";
import { SIM } from "../core/similarity.js";
import { exportPropTex, exportSympy, exportWolfram } from "../core/export.js";
import { AI, AMODEL, ARITH, READ, aiAsk, aiCap, aiMark, arithKeep, arithSkeleton, arithToText, asaveLocal, parseArith, runClassTests, takeArith, xinv, xsaveLocal } from "./08-ask.js";
import { ASPECTS, COMPOSITIONS, KINDS, SPEC0, compo, cpersist, csaveLocal2, gremove, groups, rulesOf, setCarryNode, sforget, spec, specSet, spersist, vsaveLocal, vtype } from "./03b-decisions.js";
import { AXES, JALL, LAYOUTS, PRESETS, failBar, infold, noteFail, picked, state } from "./03-stores.js";
import { jrnHeld } from "./03c-corpus.js";
import { BCMDLOG, bufImport, bufRun, bufScript, famByName, keptPlot, setLineForm } from "./10-depends.js";
import { BOARD, GUESS, MTH, NOISE, bannoNow, bannoSet, boardKept, boardSave, boardTake, passBarHTML, roundTake, simSign, wirePassBar, xlog } from "./05-explore.js";
import { BUF, CONDTXT, PROPS, RUNFORM, addCondUI, deriveProps, newId, runScorer, runSearch, tsaveLocal, xtest } from "./09-derive.js";
import { DEPOSIT, PARTS } from "./02-modules.js";
import { G } from "../graph-data.js";
import { MR } from "../model-report.js";
import { PL, chint, draw, hideTip, laidOnAxes, lastView, nodes, recentre, renderInsp, showTip, sim, size } from "./13-map.js";
import { STAGES, applyCarry, chainDetHTML, renderHandover, expSetHTML} from "./04-stages.js";
import { XRUN, XRUNSAMP, xrunGo } from "./21-exprun.js";
import { carriedClaims, distinctClaims, openVar, spaceText } from "./12-claims.js";
import { DEMO_FILE, scenCur, scenFrom, scenTourBack, scenTourClose, scenTourOpen, snapNow } from "./17-scenarios.js";
import { carriedRelations, carriedVars, looksLikeDifference, makeGroup, recordedKinds, renderSelbar, statedProps, xjoinDo, xtake } from "./07-grouping.js";
import { expSave } from "./20-expset.js";
import { COMPONENTS, STANDING, barMax as cBarMax, barPasses as cBarPasses, barScore, claimKept as cClaimKept, claimPasses as cClaimPasses, holds } from "../core/curate.js";
import { exportDerived, exportModel, exportResults, renderWorklist, saveText } from "./16-worklists.js";
import { wireModels } from "./29-models.js";
import { NEXTTOUR, TOUR, tourDone, tourEnd, tourGo, tourHTML, tourNow, tourOn, tourOnBack,
  tourOnWire, tourPaint, tourPickHTML, tourStart, tourWire } from "./30-tour.js";
import { exportProof } from "./23-exchange.js";
import { minpStats, renderPapers, schemeDrop, schemeNow } from "./03c-corpus.js";
import { LIT, litAdd, litApply, litCount, litDrop, litIs, litList, litMain, litName, litNow, litReadStream, litRename } from "./27-streams.js";
import { impShow } from "./24-import.js";
import { DEP, depSet, depVersion, exportDeposit } from "./26-deposit.js";
import { NB, exportNotebook, nbAdd, nbDrop, nbKind, nbLabel, nbMove, nbSave, nbSet } from "./25-notebook.js";
import { openFams, openJoin, openSpace, outcomeVars, sparkHTML, varName, wireFamControls } from "./11-classes.js";
import { comPlace, comRelease, refresh } from "./14-boot.js";
import { simForget, simSave } from "./03d-similarity.js";
import { stxInit } from "./00-worked-example.js";
import { wireWorkspace } from "./18-workspace.js";
/* ------------------------------------------------------------ the flow */

/* Nine steps are four pieces of work. The blocks are not a tidier drawing of
   the same chain -- they say where its joints are, and the joints were not
   where the straight 1-to-9 track implied. Steps 1.1 to 1.3 run ONCE PER
   LITERATURE, which is why the literature selector belongs inside that block
   rather than in a page header governing all nine; step 2.1 is the join;
   five to seven are the round; eight and nine are what you do with what came
   out. Drawn flat, step 2.1 looked as though it invented its material out of
   nothing, which is exactly what a reader of the draft asked about. */
/* Whether the way-in page has been shut by hand this session. Module-local
   and so transient: see the note in renderPanel. */
/* THE START PAGE IS A VIEW, not a banner that gets dismissed.
   -------------------------------------------------------------------------
   `null` means nobody has chosen: the page shows while this browser has
   declared nothing, which is the behaviour the banner had. Pressing a way in,
   or the wordmark, is a choice and is remembered -- module-local, so a reload
   is a fresh arrival, which is what a start page should be.

   wayOut() is what the three ways in call. homeIn() is the way back, which
   the banner had no need of and a page does. */
let homeAt = null;
const homeOn = () => homeAt === null
  ? !(ARITH.kept || vtype.size || (BOARD.rows || []).length)
  : homeAt;
const wayOut = () => { homeAt = false; };
const homeIn = () => { homeAt = true; refresh(); renderTrack(); renderPanel(); draw(); };
/* THE FOUR PHASES. `title` is the chevron in the header, `why` its tooltip,
   and `gist` the one line the start page draws. Three fields rather than two
   because the start page used to take the first sentence of `why` and a
   tooltip's first sentence is not a summary: phase 2's opened "The join." and
   on its own that said nothing.

   NO STEP NUMBER IN ANY OF THEM. A reader on the start page has not
   met the chain yet, and the walk now fails the build if one comes back. The
   step chevrons inside the workbench keep their numbers. */
const BLOCKS = [
  {n:1, key:"core", title:"Build the core model", steps:[1,2,3], lit:true,
   gist:"Scope the literature, then select the constructs and the relationships with the most support.",
   why:"Scout and scope the literature, select its constructs, and keep the relationships with the most support. Done once for each literature you mean to join, so that no literature is joined carrying choices nobody made."},
  {n:2, key:"join", title:"Join streams of literature", steps:[4],
   gist:"Bring in constructs and relationships from another research stream, packaged in another AMG.",
   why:"Bring in constructs and relationships from another research stream, and decide which constructs in the two are the same. Also where an AMG built elsewhere comes in."},
  {n:3, key:"explore", title:"Explore", steps:[5,6], loop:true, run:true,
   /* Named for what the two steps do together: this is where the action model
      is built and interrogated. Two, not three, since the merge: the gist
      and LOOPTIP both have to say so. */
   gist:"Operationalize the model and derive its findings. Each round yields an action model: a complete model with its findings.",
   why:"Operationalize the model, derive what follows, and test the findings. A round, not a single run: a finding that fails names the choice it depends on, so you can change that choice and go round again."},
  {n:4, key:"assess", title:"Finalize", steps:[7,8],
   gist:"Keep the findings that hold and see where each one holds, then package the AMG for others to build on.",
   why:"See where each finding holds, and package the AMG to share. Outside the round: you explore in rounds, then finalize once."}
];
const stageOf = n => STAGES.find(s => s.n === n);
const blockOf = n => BLOCKS.find(b => b.steps.includes(n)) || BLOCKS[0];
/* A step is numbered by its place in its block: the first step of block two
   is 2.1. One label then says both which block you are in and where in it,
   so the block chevron carries a bare block number and the step chevron the
   pair. Read off BLOCKS rather than stored, so moving a step between blocks
   renumbers it. */
const stepNo = n => { const b = blockOf(n); const i = b.steps.indexOf(n);
  return b.n + "." + (i < 0 ? 1 : i + 1); };


/* build() narrows by stage, so changing the stage has to rebuild and not merely
   repaint: repainting from a stale lastView left the previous step's constructs
   and arrows on screen until some control happened to be touched. */
function goStage(n){
  state.stage = n;
  wayOut();
  /* Which corpus G should be is asked by refresh(), which this calls: a step
     is arrived at from more places than here. See the note there. */
  /* refresh() first: renderTrack reads the view for its counts, and on the
     first move off the start page there is not one yet. */
  refresh(); renderTrack(); renderPanel(); draw();
}

const LOOPTIP = "A round, not a single run. A finding that fails names the choice it depends on; change that choice and go round again.";

/* The literature the first block reads. It used to be two tabs in the page
   header, which put a choice about three steps above a bar that governs all
   nine. A selector says it is one of several; the menu beside it holds the
   three actions that are about HAVING a literature rather than curating one. */
function litCapHTML(){
  return `<div class="stepcol litcol">
    <div class="litcap">
      <span class="scenlab">Literature</span>
      <select id="litSel" aria-label="The literature these three steps read"
        title="Which corpus steps 1.1 to 1.3 read. Each literature carries its own scope, its own merges, its own bars and its own curator's pass, and switching here switches all of them. Purpose is the one that ships: 52 papers from twelve outlets, two Scopus runs on 2026-09-21.">
        ${litList().map(x => `<option value="${hesc(x.id)}"${
          litIs(x.id) ? " selected" : ""}>${hesc(x.name)}${
          x.main ? "" : " · " + litSize(x.id)}</option>`).join("")}
      </select>
      <details class="menu" id="litMenu">
        <summary class="tabbtn" title="What you can do to the literatures">⋯</summary>
        <div class="menupop">
          <p class="menunote">Steps 1.1 to 1.3 run <b>once per literature</b>. Each carries
            its own scope, merges and bars; step 2.1 is where two of them meet, and a
            literature that has not been through this block cannot be joined with.</p>
          <span class="menusep"></span>
          <button type="button" class="tabbtn" id="importStream"
            title="A literature somebody else extracted and curated, as the file step 4.2 writes with Export the stream. Its constructs, its relationships and their quotes arrive with the frame they were screened on.">Import a literature&hellip;</button>
          <input type="file" id="litFileIn" accept=".json,application/json" hidden>
          <button type="button" class="tabbtn" id="addStream"
            title="An empty literature to fill with Add a paper or a search export. Nothing is in scope until a paper brings an outlet and you tick it.">Add an empty literature</button>
          <span class="menusep"></span>
          <button type="button" class="tabbtn" id="renStream"${
            litIs(litMain()) ? " disabled" : ""}>Rename this literature</button>
          <button type="button" class="tabbtn" id="dropStream"${
            litIs(litMain()) ? " disabled" : ""}>Remove this literature</button>
          <span class="menusep"></span>
          <button type="button" class="tabbtn mi2" id="mergeStreams">Join two literatures<i>step 2.1, where their vocabularies meet</i></button>
        </div>
      </details>
    </div>
    <p class="sccn">${litCount() > 1
      ? `<b>${litCount()}</b> literatures · these three run <b>once for each</b>`
      : `these three run <b>once per literature</b>`}</p>
  </div>`;
}
/* What a literature holds, for the selector, which is where a reader decides
   whether they are about to switch into something or into nothing. */
function litSize(id){
  const r = LIT.list.get(id);
  if(!r || !r.base) return "empty";
  const n = (r.base.nodes || []).length + ((r.add || {}).nodes || []).length;
  const p = Object.keys(r.base.papers || {}).length +
    (((r.add || {}).papers) || []).length;
  return p + " paper" + (p === 1 ? "" : "s") + ", " + n +
    " construct" + (n === 1 ? "" : "s");
}

function wireLitBar(root){
  const tip = (el, html) => {
    if(!el) return;
    el.addEventListener("mouseenter", ev => showTip(html, ev));
    el.addEventListener("mousemove", ev => showTip(html, ev));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("click", ev => { if(el.classList.contains("off")) ev.preventDefault(); });
  };
  tip(root.querySelector("#litSel"), `<h5>The literature</h5>
    <p class="def">Which corpus steps 1.1 to 1.3 read. Each literature carries its own
    scope, its own merges, its own bars and its own curator's pass, and switching here
    switches all of them: the decisions you took over one are where you left them when you
    come back.</p>
    <p class="def"><b>Purpose</b> is the one that ships: 52 papers from twelve outlets, two
    Scopus runs on 2026-09-21, logged in <code>data/raw/QUERIES.md</code>. Its payload is in
    the page; any other literature's arrives from a file and lives in this browser until
    you export the project.</p>`);
  tip(root.querySelector("#importStream"), `<h5>Import a literature</h5>
    <p class="def">A literature somebody else extracted and curated, as the file step 4.2
    writes with <b>Export the stream</b>: its constructs with their signatures, its relationships
    with their quotes and scores, its papers as metadata, and the wording scores a
    threshold reads. The format round-trips by construction, which is what makes this the
    half of the open-source argument that lets a second researcher start where the first
    one stopped.</p>
    <p class="def"><b>Checked rather than trusted.</b> A construct without a level, a scale
    or a stock-or-flow this page knows is refused; so is a relationship naming a sign, a basis or
    an end the file does not carry. What is refused is counted and named before anything is
    installed.</p>`);
  tip(root.querySelector("#addStream"), `<h5>Add an empty literature</h5>
    <p class="def">A literature to fill here: <b>Add a paper</b> reads one in from a PDF, a
    DOI or pasted text, and <b>From a search export</b> brings a Scopus or Web of Science
    file. It starts with nothing in scope, which is the honest beginning — the first paper
    brings its own outlet, unticked, and you decide whether that journal belongs.</p>`);
  tip(root.querySelector("#mergeStreams"), `<h5>Join two literatures</h5>
    <p class="def">Two curated literatures, and the question of which of their constructs
    are the same construct. That is step 2.1's own act, so this takes you there rather than
    doing it here.</p>
    <p class="def"><b>Each side must have been through this block first</b> — scope,
    constructs, relationships — or the join carries decisions nobody made. That is why these three
    steps run per literature and the join is a block of its own.</p>
    <p class="def">From step 2.1 on, the map holds <b>every</b> curated literature at once:
    one map with both vocabularies on it is what lets a relation cross between them.</p>`);

  /* ---- and the controls themselves ----------------------------------- */
  const sel = root.querySelector("#litSel");
  if(sel) sel.addEventListener("change", () => {
    const to = sel.value;
    if(litIs(to)) return;
    const was = litName(litNow());
    litApply(to);
    xlog("lit", "Switched literature",
      "from " + was + " to " + litName(to) +
      " \u2014 its own scope, merges and bars came with it");
    renderPanel(); refresh();
  });
  const on = (id, fn) => { const e = root.querySelector("#" + id);
    if(e) e.addEventListener("click", ev => { ev.preventDefault(); fn(e); }); };
  on("addStream", () => {
    const nm = prompt("A name for the literature:", "A second literature");
    if(!nm || !nm.trim()) return;
    const id = litAdd(nm.trim(), null);
    litApply(id);
    xlog("lit", "Added a literature",
      nm.trim() + " \u2014 empty, with nothing in scope until a paper brings an outlet");
    renderPanel(); refresh();
  });
  on("renStream", () => {
    const nm = prompt("Rename this literature:", litName(litNow()));
    if(!nm || !nm.trim()) return;
    const was = litName(litNow());
    if(litRename(litNow(), nm.trim())){
      xlog("lit", "Renamed a literature", was + " \u2192 " + nm.trim());
      renderPanel();
    }
  });
  on("dropStream", () => {
    const nm = litName(litNow());
    if(!window.confirm("Remove " + nm + ", and every decision taken over it?")) return;
    if(litDrop(litNow())){ renderPanel(); refresh(); }
  });
  /* THE FILE INPUT IS THE IMPORT. A hidden input the button presses, which is
     the same shape the scenario import uses: a browser will not open a file
     picker from anything else. */
  on("importStream", () => { const f = root.querySelector("#litFileIn");
    if(f){ f.value = ""; f.click(); } });
  const fin = root.querySelector("#litFileIn");
  if(fin) fin.addEventListener("change", async ev => {
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    let got;
    try{ got = litReadStream(JSON.parse(await f.text())); }
    catch(e){ got = {err:"that file is not JSON this page can read: " +
      String(e && e.message || e)}; }
    if(got.err){ window.alert(got.err); return; }
    const id = litAdd(got.name, got.base, got.from);
    litApply(id);
    xlog("lit", "Imported a literature",
      got.name + " \u00b7 " + got.counts.papers + " papers, " + got.counts.constructs +
      " constructs, " + got.counts.claims + " relationships, " + got.counts.outlets +
      " outlets in its own frame" +
      (got.why.length ? " \u2014 " + got.why.join("; ") : ""));
    renderPanel(); refresh();
    if(got.why.length) window.alert("Imported " + got.name + ", and " +
      got.why.join("; ") + ". What was refused is not in the corpus.");
  });
  /* The join is step 2.1's act, so this goes there rather than doing it. */
  on("mergeStreams", () => { goStage(4); });
}

function renderTrack(v){
  if(!v) v = lastView;
  if(!v) return;
  const t = document.getElementById("track");
  const here = blockOf(state.stage);
  // A repaint must not shut a menu somebody has open: the track redraws on
  // every refresh, and the literature menu lives inside it.
  let html = "";

  // All four blocks, always, so the shape of the procedure is on screen
  // whichever part of it you are working in. They live in the header, beside
  // the title and the scenario, so the whole of the navigation is one row that
  // stays put while you work down a step.
  let bhtml = "";
  BLOCKS.forEach(b => {
    /* The block's own number. It used to be the span of step numbers it
       covers ("1–3"), which the dotted step numbers under it now say. */
    const span = String(b.n);
    bhtml += `<div class="blkcol">
      <button class="blk${b.steps.every(n => stageOf(n).done()) ? " done" : ""}"
        data-block="${b.n}" aria-current="${b.n === here.n}" title="${hesc(b.why)}">
        <span class="bn">${span}${b.loop
          ? `<span class="blkloop" title="${hesc(LOOPTIP)}">↻</span>` : ""}</span>
        <span class="bt">${b.title}</span>
        <!-- WHAT THIS BLOCK HANDS FORWARD. The block chevrons are the only
             navigation on every step, and they carried no number at all while
             the numbers that best say what the bench is for sat at 8.5px in
             the faintest colour on the page. Same computation as the footer
             of the block's last step, so the two cannot drift apart. -->
        <span class="bhand">${(() => { const h = blockHands(b);
          return h ? hesc(h) : `<i>nothing yet</i>`; })()}</span>
      </button>
    </div>`;
  });
  const brow = document.getElementById("blockrow");
  if(brow) brow.innerHTML = bhtml;

  /* The pass is an action on the block, so it sits under the header with the
     step's page. The literature is not an action @MD@ it is what steps 1.1 to
     1.3 READ, so it goes at the head of their row rather than under it. */
  if(here.run) html += passBarHTML();

  /* The steps of the open block, as chevrons in the header beside their block.
     Each one is a page: clicking it changes what the panel below is, and
     nothing from the other steps is stacked under it. */
  let shtml = here.lit ? litCapHTML() : "";
  /* A block holding one step needs no step chevron: it would repeat the block's
     own title and select what selecting the block already selected. The
     counter stays, because the count is the step's own work. */
  const soleStep = here.steps.length === 1;
  here.steps.forEach(n => {
    const z = stageOf(n), on = state.stage === z.n;
    shtml += `<div class="stepcol">
      ${soleStep ? `` : `<button type="button" class="schev${z.done() ? " done" : ""}" data-stage="${z.n}"
        aria-current="${on}" title="${hesc(z.short || z.title)}">
        <span class="ssn">Step ${stepNo(z.n)}</span>
        <span class="stt">${z.title}${z.what ? `<i>${z.what}</i>` : ``}</span>
      </button>`}
      <p class="sccn">${z.count(v)}</p>
      ${on && z.n === STAGES.length ? chainDetHTML() : ""}
    </div>`;
  });
  const hd = document.querySelector("header");
  if(hd) document.documentElement.style.setProperty("--navh",
    Math.round(hd.getBoundingClientRect().height) + "px");
  const srow = document.getElementById("steprow");
  if(srow){
    const litOpen2 = (() => { const d = srow.querySelector("#litMenu");
      return !!(d && d.open); })();
    srow.innerHTML = shtml;
    srow.querySelectorAll(".schev[data-stage]").forEach(b =>
      b.addEventListener("click", () => goStage(+b.dataset.stage)));
    if(here.lit){
      wireLitBar(srow);
      const d = srow.querySelector("#litMenu");
      if(d && litOpen2) d.open = true;
    }
  }

  t.innerHTML = html;
  if(brow) brow.querySelectorAll(".blk[data-block]").forEach(b =>
    b.addEventListener("click", () => {
      const blk = BLOCKS.find(x => x.n === +b.dataset.block);
      if(blk && !blk.steps.includes(state.stage)) goStage(blk.steps[0]);
    }));

  /* A block is not a second thing to remember. It is whichever one holds the
     step you are on, so there is nothing for it to get out of step with, and
     clicking one goes to its first step. */

  if(here.run) wirePassBar(t);
}

/* What each step hands to the next. Naming it is what makes the sequence a
   sequence: you leave a step with something, you do not merely stop using it. */
/* WHAT EACH STEP HANDS FORWARD, in two lengths.
   ==========================================================================

   The bench turns a literature into findings, and in the worked example that
   chain runs 52 papers and 1,080 claims to 8 constructs and 5 arrows to 17
   claims and 2 imported relations to the findings retained to a deposit.
   Every one of those numbers was already on the page and in two places a
   reader does not look: under each step chevron at 8.5px in the faintest
   colour on the page, and in the footer of the step you happen to be on.

   So each entry returns BOTH forms from one computation: `long` for the
   footer, `short` for the block chevron that is on screen on every step.
   Written as one function per step rather than two, because two would
   eventually say different numbers about the same handoff. */
const HANDOFF = {
  1: () => { const t = `${lastView.papersIn} papers and ${
        lastView.constructsIn} constructs go forward`;
    return {long:t, short:`${lastView.papersIn} papers \u00b7 ${
      lastView.constructsIn} constructs`}; },
  2: () => { const N = lastView.nodes || [];
    const c = N.filter(n => n.carried).length;
    return {long:`${c} of ${N.length} constructs selected` +
        (groups.size ? `, ${groups.size} merged by hand` : ""),
      short:`${c} constructs${groups.size ? ` \u00b7 ${groups.size} merged` : ""}`}; },
  3: () => { const N = lastView.nodes || [], E = lastView.links || [];
    const c = N.filter(n => n.carried).length, a = E.filter(e => e.carried).length;
    return {long:`${c} constructs and ${a} arrows selected`,
      short:`${c} constructs \u00b7 ${a} arrow${a === 1 ? "" : "s"}`}; },
  4: () => { const n = distinctClaims(carriedClaims());
    const m = (MR.relations || []).filter(x => state.msel.has(x.id)).length;
    return {long:`${n} relationship${n === 1 ? "" : "s"} and ${m} imported relations go forward`,
      short:`${n} relationship${n === 1 ? "" : "s"} \u00b7 ${m} imported`}; },
  /* Old five and six are one step, so one foot line: what the declarations
     narrowed, and what the arithmetic they generated then held. */
  5: () => { const sp = openSpace(), outs = outcomeVars();
    const comp = outs.filter(k => rulesOf(k).length).length;
    // the foot is innerHTML, so the exponent's markup survives; stripping it
    // turned 10 to the 14 into the integer 1014
    return {long:`${sp.n - sp.open} of ${sp.n} choices narrowed, ` +
        `${spaceText(sp)} models still admitted, ` +
        `${comp} of ${outs.length} composed` +
        (ARITH.kept && ARITH.kept.run
          ? `, arithmetic holding ${ARITH.kept.run.pass} of ${
              ARITH.kept.run.pass + ARITH.kept.run.fail}`
          : `, no arithmetic`),
      short:`${sp.n - sp.open} of ${sp.n} narrowed \u00b7 ${
        ARITH.kept ? "arithmetic kept" : "no arithmetic"}`}; },
  /* THE BOARD, NOT THE BUFFER. What leaves this block is what the scholar
     stood behind, which is what step 4.1 reads; the derived lines are a
     working surface and the next derivation replaces them. */
  6: () => { const p = PROPS.out ? PROPS.out.props.filter(x => !x.err) : [];
    const kept = boardKept();
    const pv = kept.filter(x => x.verdict === "proved").length;
    const short = kept.length
      ? `${kept.length} kept \u00b7 ${pv} proved`
      : (p.length ? `${p.length} signed \u00b7 nothing kept` : "");
    if(!p.length && !kept.length)
      return {long:"nothing derived from the arithmetic yet", short:""};
    return {long:(p.length
        ? `${p.length} derivative${p.length === 1 ? "" : "s"} signed`
        : "nothing derived from the arithmetic yet") +
        (kept.length ? `, ${kept.length} retained of which ${pv} proved over the whole box`
          : p.length ? `, nothing retained` : "") +
        (SCORE.rows ? `, ${SCORE.rows.length} candidate${
          SCORE.rows.length === 1 ? "" : "s"} ranked` : ""),
      short}; },
  7: () => { const p = PROPS.out ? PROPS.out.props.filter(x => !x.err) : [];
    const keep = p.filter(keptPlot);
    return {long:!p.length ? "nothing derived to plot yet"
        : `${keep.length} of ${p.length} findings plotted, ${
            p.length - keep.length} still undecided`,
      short:p.length ? `${keep.length} of ${p.length} plotted` : ""}; },
  8: () => ({long:`nothing leaves yet \u00b7 ${DEPOSIT.length} decisions open`,
    short:"not built"}),
};

/* The block's own handoff is its LAST step's, because that is what leaves it.
   A block that has produced nothing says so rather than drawing an empty
   line, which would move the chevrons under it as soon as it did. */
function blockHands(b){
  const n = b.steps[b.steps.length - 1];
  const f = HANDOFF[n];
  if(!f) return "";
  try{ return String((f() || {}).short || ""); }catch(e){ return ""; }
}

/* Asking an LLM is wired the same way wherever it is offered: step 3.1 writes
   the arithmetic, step 3.2 asks for tests the declarations cannot derive.
   Resolving the capability never prompts -- consent is asked on the first
   call -- which is why every call hangs off a click. */
function wireAI(){
  if(AI.cap === undefined) aiCap().then(() => renderPanel());
  PANELS("[data-ai]").forEach(b =>
    b.addEventListener("click", () => aiAsk(b.dataset.ai)));
  document.querySelectorAll("#pbody [data-aiok]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.dataset.aiok;
      const p = AI.comp.concat(AI.cond).find(x => x.id === id);
      if(!p) return;
      const today = new Date().toISOString().slice(0, 10);
      if(p.outcome){
        const k = carriedVars().find(x => varName(x) === p.outcome);
        const ok = (p.rules || []).filter(r => COMPOSITIONS.some(c => c[0] === r));
        if(k && ok.length){
          const cur = Object.assign({id:k, rules:[]}, compo.get(k) || {});
          cur.rules = ok; cur.at = today;
          compo.set(k, cur); csaveLocal2();
        }
        AI.comp = AI.comp.filter(x => x.id !== id);
      }else if(p.form || p.for){
        /* Runnable or not, it is kept -- and which it is shows on the row.
           Dropping the ones that cannot be run would lose a condition the
           theory implies; filing them somewhere separate, which this page did
           until now, made whether a condition was ever checked depend on
           which button proposed it. */
        if(RUNFORM(p.form)){
          const tid = newId("t");
          xtest.set(tid, {id:tid, for:String(p.for || "condition").slice(0, 60),
            form:String(p.form), expr:String(p.expr || "").slice(0, 400),
            y:String(p.y || ""), x:String(p.x || ""),
            why:String(p.why || "").slice(0, 400), at:today});
          tsaveLocal();
        }else{
          const xid = newId("x");
          xinv.set(xid, {id:xid, check:String(p.for || p.check || "condition").slice(0, 60),
            over:(p.over || []).slice(0, 12), why:String(p.why || "").slice(0, 400), at:today});
          xsaveLocal();
        }
        AI.cond = AI.cond.filter(x => x.id !== id);
      }
      refresh(); renderPanel();
    }));
  /* A PROPOSED DECLARATION, ACCEPTED. The filtering already happened when the
     answer came in, so what is here is inside the vocabularies by
     construction; what this does is write it where a hand-made declaration
     goes, with today's date, so the record cannot tell the two apart by where
     they live and can tell them apart by what it says. */
  document.querySelectorAll("#pbody [data-airole]").forEach(b =>
    b.addEventListener("click", () => {
      const p = (AI.roles || []).find(x => x.id === b.dataset.airole);
      if(!p) return;
      const today = new Date().toISOString().slice(0, 10);
      if(p.rel){
        const v = Object.assign(SPEC0(), spec.get(p.rel) || {});
        if(p.role) v.roles = [p.role];
        if(p.props.length) v.props = p.props.slice();
        v.role = ""; v.at = today;
        if(specSet(v)){ spec.set(p.rel, v); spersist(p.rel, v); } else sforget(p.rel);
      }else{
        const cur = Object.assign({id:p.qty, name:varName(p.qty), kinds:[], aspects:[],
          lo:0, hi:1}, vtype.get(p.qty) || {});
        if(p.kinds.length) cur.kinds = p.kinds.slice();
        if(p.aspect) cur.aspects = [p.aspect];
        cur.name = varName(p.qty); cur.at = today;
        vtype.set(p.qty, cur); vsaveLocal();
      }
      AI.roles = AI.roles.filter(x => x.id !== p.id);
      refresh(); renderPanel();
    }));
  document.querySelectorAll("#pbody [data-airole-no]").forEach(b =>
    b.addEventListener("click", () => {
      AI.roles = (AI.roles || []).filter(x => x.id !== b.dataset["airoleNo"]);
      renderPanel();
    }));
  document.querySelectorAll("#pbody [data-aino]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.dataset.aino;
      AI.comp = AI.comp.filter(x => x.id !== id);
      AI.cond = AI.cond.filter(x => x.id !== id);
      renderPanel();
    }));
}

/* WHERE A MODEL COMES FROM, said on the start page and only there.
   ==========================================================================

   Three states, and the right one is never a guess: aiCap() has already
   tried the host and the stored key in that order, and AI.via says which
   answered.

   A key is not necessary where the host answers: published on claude.ai it
   does, and this section says so in one line rather than asking. The field
   is for everywhere else -- a clone on a static host, a file opened locally,
   somebody else's fork -- where until now the twelve asks were simply absent.

   The key is in this browser under its own store, never in `state`, so it is
   in no scenario, no export and no record. */
/* WHERE AN LLM COMES FROM, in the three states a host can be in.

   THE HOST CASE SAYS SO, in one line. It used to draw nothing, on the
   grounds that a section about a non-event is a paragraph wasted -- but the
   reader's question is "where do I put a key", and a blank space answers it
   with nothing at all. Somebody looking for the field on claude.ai found no
   field and no reason there was none. One line costs less than that. */
function modelSetupHTML(){
  const mark = AI.cap ? aiMark("uses AI") : "";
  if(AI.via === "host") return `
    <h3 class="obh">The language model</h3>
    <p class="obmok">${mark}This page is open inside a host that provides one, so every
      control marked with the sparkle already works and there is no key to give. Run the
      same page anywhere else -- a clone on a static server, a copy opened from disk --
      and this is where it asks for an <b>Anthropic API key</b> instead.</p>`;
  if(AI.via === "key") return `
    <h3 class="obh">Your own key is in use</h3>
    <p class="obmok">${mark}Requests go to <code>api.anthropic.com</code> as
      <code>${hesc(AMODEL)}</code>, with the key kept in this browser.</p>
    <div class="obkey">
      <button type="button" class="tabbtn" id="keyDrop">Remove the key</button>
      <span class="mblab">It is in this browser only: not in any project, export or record.</span>
    </div>`;
  return `
    <h3 class="obh">An LLM, if you want one</h3>
    <p>Nothing here needs one: the literature, your choices, the derivation and every proof
      run without an LLM. Seventeen controls <i>offer</i> one: to read a paper into the
      corpus, suggest how relationships combine, propose a model or candidate findings, or
      rank findings on criteria you set. Each carries the mark. This host provides none, so
      you can give an <b>Anthropic API key</b> and they appear.</p>
    <div class="obkey">
      <input type="password" id="keyIn" autocomplete="off" spellcheck="false"
        placeholder="sk-ant-..." aria-label="Anthropic API key">
      <button type="button" class="tabbtn" id="keySave">Use this key</button>
    </div>
    <p class="why"><b>Where it goes.</b> Into this browser's own storage and nowhere else.
      It is not part of a project, so it is in no export and no decision record, and it is
      sent to <code>api.anthropic.com</code> and to no other address. Remove it here at any
      time. Asks are charged to your account at Anthropic's own rates; this page is
      <code>${hesc(AMODEL)}</code> and makes one request per ask.</p>`;
}

function renderPanel(){
  const s = STAGES.find(x => x.n === state.stage);
  /* THE SIGNPOST, WHILE IT IS STILL TRUE. Derived rather than stored: no
     dismissal to remember and nothing that can nag, because declaring anything
     at all is what takes it away -- and opening either example declares a
     model's worth in one go. */
  const ob = document.getElementById("openbar");
  const home = homeOn();
  /* A PAGE AND NOT A BANNER: the class takes the chain, the panel, the map
     and the footer off screen, and this is the only thing left. */
  document.body.classList.toggle("home", home);
  { const hb = document.getElementById("goHome");
    if(hb) hb.setAttribute("aria-current", String(home)); }
  if(ob){
    ob.hidden = !home;
    /* THE FOUR PHASES, READ OFF BLOCKS rather than written again in the
       markup: a step moving between phases cannot leave the way-in page
       saying the old thing. One sentence each, which is the first clause of
       each phase's own reason -- the rest is on the phase itself. */
    const ph = document.getElementById("obphases");
    /* THE PHASE'S OWN GIST, and no step line under it. Cutting the summary
       out of the tooltip with a helper that takes sentences until it has 54
       characters does not give a summary: a tooltip's first sentences are
       not one. */
    if(ph && home) ph.innerHTML = BLOCKS.map(b => `<li>
      <b>${hesc(b.title)}</b>
      <span>${hesc(b.gist || "")}</span>
    </li>`).join("");
    const ot = document.getElementById("obtours");
    if(ot && home){
      ot.innerHTML = tourPickHTML();
      /* Wired here and not at boot: the list is written by this render, so at
         boot there is nothing to wire. A TOUR OPENS THE PURPOSE PROJECT
         FIRST, because every stop points at a real control and on an empty
         workbench most of them are absent. The Menu's own button is pressed
         rather than the loading repeated, which keeps one path into it.

         WHICH PROJECT IS OPEN IS ASKED BY FILE, NOT BY NAME. It was compared
         against the string "Worked example", so renaming that project would
         have left every tour reloading it over itself, and a reader who renamed their own copy
         the same. `scenFrom()` answers which file the open project came from,
         which is a fact about it rather than a label on it. */
      /* A TOUR RUNS ON ITS OWN COPY, so that everything during it is
         sandboxed. The stops hand
         the reader controls to press and the engine puts back what a stop
         changed; both are fine against a copy and not against somebody's
         work. `scenTourOpen` makes one beside theirs, or reuses it when they
         take a second tour, and awaits the load rather than guessing at it. */
      for(const b of ot.querySelectorAll("[data-tour]")) b.onclick = async () => {
        const id = b.dataset.tour;
        const got = await scenTourOpen(DEMO_FILE);
        if(got && got.err){ window.alert(got.err); return; }
        /* A TOUR THAT STARTS MID-CHAIN BUILDS THE VIEW FIRST. Tours 2 and 3
           open on step 2.1 and 4.1, and the map view those steps draw their
           blocks from is built by the first block-1 render after a project is
           opened. Jumping straight to step 2.1 from the start page gave it
           nothing to draw, so the first stop of the second tour marked an
           empty rail. A reader walking the chain never meets this; a tour
           that starts in the middle does, so it walks the first step the way
           they would and then goes where it is going. */
        goStage(1);
        tourStart(id);
        tourGo(0, st => {
          if(typeof st.fin === "string") state.fin = st.fin;
          if(typeof st.dec === "string") state.dec = st.dec;
          if(typeof st.der === "string") state.der = st.der;
          state.stage = st.stage || 1;
          renderPanel();
        });
      };
    }
    const om = document.getElementById("obmodel");
    if(om && home){
      om.innerHTML = modelSetupHTML();
      /* HIDDEN WHEN IT HAS NOTHING TO SAY, because .obsec carries a rule and
         padding of its own: an empty one leaves a band and a line across the
         page under the tours. */
      om.hidden = !om.innerHTML;
    }
  }
  // from step 3.1 the object is the model and not the corpus
  /* The map goes from the merged step on, not from the step after it. Old step
     3.2 was deliberately mapless and old step 3.1 never used the map for
     anything -- the carry and group tools belong to steps 1.2 and 1.3, and no
     stage hint in 13-map.js covers five. Leaving it on would have put a map
     the step cannot use under an arithmetic, on a page that is now long. This
     is a change beyond the merge rather than part of it. */
  document.body.classList.toggle("nomap", state.stage >= 5);
  /* One sentence, and the paragraph it replaced behind the (i) beside it. The
     head of every step used to open with five or six lines of prose before the
     first control. */
  document.getElementById("phead").innerHTML =
    `<div class="pttl"><span class="sn">Step ${stepNo(s.n)}</span><h2>${s.title}</h2></div>
     <p class="pblurb">${s.blurb}${s.long
       ? ` <span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">${s.long}</span>`
       : ``}</p>`;
  document.getElementById("pbody").innerHTML = s.body(lastView);
  // At step 2.1 the building blocks lead and the map follows: the work is
  // choosing what a model is made of, and the diagram is there to check it.
  const sw = document.querySelector(".stageWrap");
  if(sw) sw.classList.toggle("blocksfirst", s.n === 4);
  /* Step 2.1 keeps its map behind a toggle. Everywhere else the map is the
     step's own object; there it is a check on a choice made above it. */
  if(sw) sw.classList.toggle("nocanvas", s.n === 4 && !state.mapOn);
  /* A step with an `under` renders it between its building blocks and the map.
     Only step 2.1 has one, and that is the point: its work is an operation on
     the blocks above it rather than something to meet before them. */
  /* THE CAPABILITY IS RESOLVED ON EVERY STEP, not only on the two that wire
     the asks they own. wireAI() was called from wireQuantities and
     wireStatics -- steps 3.1 and 3.2 -- and it is the only thing that ever
     calls aiCap(). So `simil` and `similall` on step 1.2, `join` on step 2.1
     and `cluname` in the cluster block were gated on a capability nothing on
     their steps ever asked for: on a fresh page step 1.2 said "no model is
     reachable from this page" indefinitely, and the suggest-mergers button
     never drew. Measured, four seconds after load with a host supplying the
     capability: zero ask buttons on either step.

     Resolving never prompts -- consent is asked on the first CALL, which is
     still behind a click -- so there is no cost to asking early, and the
     answer is memoised after the first. */
  if(AI.cap === undefined) aiCap().then(() => renderPanel());
  /* THE MAP OPENS ON ITS CLUSTERS, so they have to exist by then. The layout
     defaults to clusters and only the preset's own click computed, so step 1.2
     arrived in the cluster view with nothing clustered: the settings box
     showed and the diagram had no regions in it. Guarded by comReady, so this
     runs once rather than on every render. */
  if(state.layout === "clusters" && !comReady() && (lastView.nodes || []).length){
    COM.hub = "";
    comRun(lastView);
    comPlace();
    /* AND REDRAW, or the boundaries are computed and not painted: the hulls
       come out of draw() and renderPanel does not call it. Measured: five
       clusters in COM.out and two hulls on the map, which were the
       demonstration's existing merges. */
    if(sim) sim.alpha(.6).restart();
    draw();
  }
  const bf = document.getElementById("blkfoot");
  if(bf){
    bf.innerHTML = s.under ? s.under(lastView) : "";
    bf.hidden = !s.under;
  }
  const wf = document.getElementById("wlfoot");
  /* Step 2.1's merger suggestions go UNDER THE MAP, which is the bottom of
     that page: the map carries every construct both streams hold and any two
     can be merged on it by hand, so a list of proposals is a footnote to it
     rather than the thing you meet first. */
  /* Step 2.1's proposals moved INTO the step, above the map: the buttons that
     make them are there, and the list is the step's work rather than its
     leftovers. */
  if(wf) wf.innerHTML = s.n === 3 ? stepWork(3) : "";
  renderFoot(s);
  renderMapPanel();
  renderPapers();
  wireCom();
  if(state.hoffOpen) renderHandover();
  wire(s.key);
  tightenNotes();
  tightenNotes(bf);
  renderTour();
}

/* THE TOUR, redrawn after the panel it is pointing into. Its own host sits
   outside #pbody, so a stop that navigates between steps keeps its backdrop
   through the render that follows. */
function renderTour(){
  const host = document.getElementById("tourhost");
  if(!host) return;
  host.innerHTML = tourOn() ? tourHTML() : "";
  if(!tourOn()) return;
  /* A stop says where the page has to be; this is what puts it there. The
     tabs are set before the render rather than after, or the control the
     backdrop goes looking for is not drawn yet. */
  /* A stop says where the page has to be; this is what puts it there. A TAB
     COUNTS AS A MOVE. This redrew the panel only when the STEP changed, so a
     stop naming a tab on the step already open set the tab and never drew it:
     its marks then measured a panel that still showed the other tab, and the
     stop came up with no rings at all. */
  const drive = st => {
    let moved = false;
    const tab = (k, v) => {
      if(typeof v !== "string" || state[k] === v) return;
      state[k] = v; moved = true;
    };
    tab("fin", st.fin);
    tab("dec", st.dec);
    /* The Derivation tab, which is where the expectation field and the
       buffer live. */
    tab("der", st.der);
    /* A STEP MOVE GOES THROUGH THE SAME DOOR A READER USES. This set the stage
       and called renderPanel alone, which draws the step's own panel and
       nothing around it -- so step 2.1's Building blocks, which refresh()
       draws, were never there for a stop to mark, and the first stop of the
       second tour came up with no rings at all. goStage does what pressing a
       chevron does. */
    if(st.stage && state.stage !== st.stage){ goStage(st.stage); moved = false; }
    else if(moved) renderPanel();
    else renderTour();
  };
  /* HANDED TO THE TOUR RATHER THAN WIRED ONCE. The card is rewritten whenever
     the reader takes a stop's own press, so a Next wired at render time alone
     would be left on an element that no longer exists. */
  const wire = () => {
    const on = (id, fn) => { const e = document.getElementById(id); if(e) e.onclick = fn; };
    on("tourPrev", () => tourGo(TOUR.at - 1, drive));
    on("tourNext", () => {
      const t = tourNow();
      /* DONE IS A STOP OF ITS OWN. Pressing Done used to put the card away,
         switch the reader back and drop the tour's copy in one move, so
         somebody who had just finished thirteen stops was standing in a
         project they had not opened with nothing said about where the tour
         had gone. Now it asks: carry on in the step the tour left them in, go
         back to where they were, or go back to the start page. */
      if(t && TOUR.at + 1 >= t.stops.length){ tourDone(); renderTour(); return; }
      tourGo(TOUR.at + 1, drive);
    });
    /* THE CLOSING CARD'S THREE ANSWERS. Carrying on keeps the copy open on
       the step the last stop reached: the tour's whole point is the state it
       built, and dropping it at the end would be throwing that away. The other
       two drop it, which is what `scenTourClose` is. */
    on("tourStay", () => { tourEnd(); renderTour(); });
    on("tourBack", () => { tourEnd(); scenTourClose(); renderTour(); });
    on("tourHome", () => { tourEnd(); scenTourClose(); homeIn(); renderTour(); });
    /* LEAVING IS ALSO PUTTING THE READER BACK. While a tour is on, its copy
       of the Purpose project is what is open; closing it switches back to
       the project they came from and drops the copy. Where they came from
       nowhere -- a first visit, straight off the start page -- there is
       nothing to switch to and the copy stays, which is what a reader who
       wants to keep poking at it would want. */
    on("tourX", () => { tourEnd(); scenTourClose(); renderTour(); });
    /* AND THE NEXT TOUR runs on the same copy, from its first stop. */
    on("tourMore", () => {
      const nx = NEXTTOUR();
      if(!nx) return;
      tourEnd();
      tourStart(nx.id);
      tourGo(0, drive);
    });
  };
  /* AND HOW THE TOUR ADVANCES WHEN THE READER MOVED THE PAGE. A stop's `next`
     is the step's own forward button: the footer's handler has already taken
     them to the next step, so the tour follows to its own next stop without
     driving the page a second time. */
  const follow = () => {
    const t = tourNow();
    if(!t) return;
    if(TOUR.at + 1 >= t.stops.length){ tourEnd(); renderTour(); return; }
    tourGo(TOUR.at + 1, null);
  };
  tourOnWire(wire, follow);
  tourOnBack(scenTourBack);
  wire();
  requestAnimationFrame(() => requestAnimationFrame(() => { tourPaint(); tourWire(); }));
}

/* A folded note is one circle, and a circle on a line of its own is a line
   spent on a mark. After every render each one moves up onto the end of the
   thing it explains, which is where a reader looks for it anyway.

   Done here rather than in the markup because the notes come from forty-odd
   places and the rule is the same at all of them: join the element before you
   if that element is a line of text, otherwise stay where you are. A note
   attached to the end of a <div> would land at the bottom of the block it
   explains, which is worse than a line of its own. */
const NOTEHOST = ".ctl-label, .lgloss, .sectn, .sh, summary, h3, h4, label, .secti";
/* TWO HOSTS, because a step's work can render under the blocks rather than in
   the panel. Every control family that appears in either is wired over both:
   a selector scoped to one host alone is how twelve Join buttons came to be
   drawn and do nothing. */
const PANELS = sel => [...document.querySelectorAll("#pbody " + sel + ", #blkfoot " + sel)];
function tightenNotes(root){
  const host = root || document.getElementById("pbody");
  if(!host) return;
  /* The line of text this note belongs to: the nearest one above it, or the
     label inside the header row above it, or -- for a note that opens its own
     block -- the one above the block. Three steps back and no further: past
     that the note would end up beside something it is not about. */
  const lineAbove = el => {
    let n = el, hop = 0;
    while(n && hop++ < 3){
      let prev = n.previousElementSibling;
      while(prev && hop++ < 6){
        if(prev.matches && prev.matches(NOTEHOST)) return prev;
        const lab = prev.querySelector && prev.querySelector(".ctl-label, .sectn");
        if(lab) return lab;
        prev = prev.previousElementSibling;
      }
      n = n.parentElement;
      if(!n || n === host) break;
    }
    return null;
  };
  for(const p of [...host.querySelectorAll("p.why.fold")]){
    const into = lineAbove(p);
    if(!into) continue;
    /* ONE CIRCLE PER LINE, HOLDING EVERY NOTE ON IT. Several tooltip circles
       following each other are consolidated into one. The worst case is step 3.2's "What the method rests on, and why a corner
       is the finding", where four folded paragraphs sit inside one <details>
       and all four land on its summary: four identical circles in a row, each
       hiding a different paragraph, with nothing to tell them apart and no
       reason for a reader to try the second one.

       So a note arriving at a line that already carries one is APPENDED TO
       THAT NOTE rather than given a circle of its own. The order is the
       order they were written in, and the tip puts a blank line between them,
       because they are separate paragraphs and read as separate paragraphs. */
    const last = into.lastElementChild;
    if(last && last.classList && last.classList.contains("infx")){
      const add = p.querySelector(".infx");
      if(add){
        last.appendChild(document.createElement("br"));
        last.appendChild(document.createElement("br"));
        while(add.firstChild) last.appendChild(add.firstChild);
      }
      p.remove();
      continue;
    }
    /* A non-breaking space, so the circle cannot be the only thing on a
       wrapped line: it stays with the last word of what it explains. */
    into.appendChild(document.createTextNode("\u00a0"));
    while(p.firstChild) into.appendChild(p.firstChild);
    p.remove();
  }
}

function carryEmpty(n){
  if(n !== 2 && n !== 3) return false;
  const N = lastView.nodes || [];
  return N.length > 0 && N.filter(x => x.carried).length === 0;
}

function renderFoot(s){
  const foot = document.getElementById("pfoot");
  if(!foot) return;
  const prev = STAGES.find(x => x.n === s.n - 1);
  const next = STAGES.find(x => x.n === s.n + 1);
  /* NO SECOND SET OF STEP BUTTONS. The footer used to carry a row of small
     numbered buttons for the other steps in the phase -- 1.1, 1.2, 1.3 -- on
     the grounds that reaching 3.2 from 3.1 otherwise meant pressing next
     twice. They are redundant: the chain at the top of
     the page is the way between steps and shows every one of them with its
     phase, and a second control for the same move in the same screen asks a
     reader to work out which of the two they are looking at. */
  foot.innerHTML = `
    ${/* Nothing while nothing has failed, so a normal run is unchanged. When
          something has, this is where a curator sees it: the footer is on
          every step, and the console is not. */ ""}${failBar()}
    <div class="fleft">${prev
      ? `<button type="button" class="stepbtn back" data-step="${prev.n}">← ${prev.title}</button>`
      : `<span class="fnote">First step — nothing upstream of this.</span>`}</div>
    <div class="fmid">
      <button type="button" class="handoff${carryEmpty(s.n)?" warn":""}" id="hoff"
        aria-expanded="${state.hoffOpen}">${(HANDOFF[s.n]() || {}).long || ""}
        <span class="caret">${state.hoffOpen ? "\u25b4" : "\u25be"}</span></button>
      ${carryEmpty(s.n) ? `<span class="fwarn">${s.n === 2
        ? "Nothing selected — pick constructs on the map, or press All."
        : "Nothing is selected — the next step will be empty."}</span>` : ``}</div>
    <div class="fright">${next
      ? `<button type="button" class="stepbtn fwd" data-step="${next.n}">${next.title} →</button>`
      : `<span class="fnote">The end of the chain. What is downstream of this is
         other people, and none of that is built yet.</span>`}</div>`;
  const hb = document.getElementById("hoffbox");
  if(hb){ hb.hidden = !state.hoffOpen; if(state.hoffOpen) renderHandover(); }
  const hbtn = document.getElementById("hoff");
  if(hbtn) hbtn.addEventListener("click", () => {
    state.hoffOpen = !state.hoffOpen; renderFoot(s);
    if(state.hoffOpen) document.getElementById("hoffbox")
      .scrollIntoView({behavior:"smooth", block:"nearest"});
  });
  foot.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => {
    state.stage = +b.dataset.step;
    renderPanel(); refresh(); draw();
    document.getElementById("panel").scrollIntoView({behavior:"smooth", block:"start"});
  }));
}

/* --------------------------------------------------------- control wiring */
/* THE DISPATCHER. This was one function of 536 lines, and both of the
   dead-control bugs this page has had happened inside it: a branch keyed to a
   step that stopped existing, and a selector scoped to a host the controls had
   moved out of. Neither is visible when the step's wiring is a block in the
   middle of five hundred lines; both are obvious when it is a named function
   you can read end to end. Nothing moved between files -- the wiring for a
   step belongs with the other wiring -- and nothing changed but the shape.

   scripts/page_deps.py measures what this is part of: twenty files in one
   shared scope with fifty mutual dependencies between them. A function this
   size is the same problem one level down. */
/* The one helper every step's wiring uses: bind by id, and do nothing if the
   element is not on screen. It was a local inside wire(), which is what made
   the split below fail on its first run -- the page walk said "on is not
   defined" before anything was committed, which is what a safety net is for. */
function on(id, ev, fn){
  const el = document.getElementById(id);
  if(el) el.addEventListener(ev, fn);
}

function wire(key){
  if(key === "scope") wireScopeStep();

  if(key === "pass") wireJoinStep();
  if(key === "notion") wirePlot(document.getElementById("pbody"));

  if(key === "notion") wireConstructs();

  if(key === "carry") wireClaims();

  // each step's own list of decisions: the fold, then the rows
  document.querySelectorAll("[data-wlfold]").forEach(b => b.addEventListener("click", () => {
    const n = +b.dataset.wlfold;
    state.wlOpen[n] = !state.wlOpen[n];
    renderPanel(); renderTrack(lastView);
  }));
  if(typeof renderWorklist === "function" && key !== "pass"){
    const st = STAGES.find(x => x.key === key);
    if(st) renderWorklist(st.n);
  }

  if(key === "build") wireQuantities();

  /* The worked example is part of this step, not a page inside a box: the
     template is cloned in and its script run here, because here is where its
     elements exist. */
  if(key === "plot") wirePlotStep();

  /* This said `key === "compose"`, and that step stopped existing when five and
     six merged -- so for one commit every control in here was dead: the
     composition chips, the family and member selects, every arithmetic button,
     the parameter ranges, the conditions, "run them", and the families overlay.
     Twenty control families, silently, because a key that matches nothing is
     not an error. The merged step's key is `build`, and there are two branches
     for it now rather than one long one. */
  if(key === "build") wireComposition();

  if(key === "statics") wireStatics();

  wireEveryStep();
}

/* Step scope. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
function wireScopeStep(){
    const jg = document.getElementById("cJr");
    /* THE COUNT IS WHAT THIS CORPUS HOLDS, counted on every render rather
       than read off the payload. For the shipped twelve the two agree, so
       nothing visible moves here; what changes is that an import, a drop or
       a literature swap can no longer leave a stale number beside an outlet,
       and an empty corpus shows no outlets rather than twelve with counts. */
    const held = jrnHeld();
    jg.innerHTML = G.journals.length
      ? G.journals.map((j, i) =>
          `<label class="chk"><input type="checkbox" data-j="${i}" ${state.jr.has(j.f)?"checked":""}>
           <span>${j.f} <span class="cnt">${held.get(j.f) || 0}</span></span></label>`).join("")
      : `<p class="empty">No outlets yet. They arrive with the papers \u2014 read a search
         export in under <b>Import</b> on this step, or open an AMG from the Menu.</p>`;
    const jc = () => { const el = document.getElementById("jCount");
      if(el) el.textContent = G.journals.length
        ? `${state.jr.size} of ${G.journals.length} ticked` : "no outlets yet"; };
    jc();
    jg.querySelectorAll("input").forEach(cb => cb.addEventListener("change", () => {
      const j = G.journals[+cb.dataset.j].f;
      cb.checked ? state.jr.add(j) : state.jr.delete(j);
      jc(); refresh();
    }));
    on("jAll","click", () => { state.jr = new Set(JALL); renderPanel(); refresh(); });
    on("jNone","click", () => { state.jr = new Set(); renderPanel(); refresh(); });
    const ap = document.getElementById("cAp"); if(ap){ ap.value = state.ap;
      ap.addEventListener("change", () => { state.ap = ap.value; refresh(); }); }
    const imps = document.getElementById("impScheme");
    if(imps){
      const html = `<h5>Read a classification from a paper</h5>
        <p class="def">A classification is read out of a <b>paper</b> and not out of a
        corpus, so the cut this filter sorts by should be traceable to whoever argued for
        it. The shipped one is: three traditions from a review of this literature, applied
        by hand and recorded in <code>index/approaches.tsv</code>.</p>
        <p class="def">This reads in another. <b>Two asks:</b> the first takes the scheme out
        of the paper — between two and six traditions, each with a name and what a paper in
        it does — and the second applies it to the ${Object.keys(G.papers).length} papers
        here, on their titles, outlets and what the extraction recorded that each one
        argues. You see both before anything changes, and what the answer names that does
        not exist is counted rather than written.</p>
        <p class="def">It <b>replaces</b> the current cut rather than joining it: a second
        review is a different cut of the same papers, not more traditions beside the first.
        A button beside this one puts the shipped cut back.</p>`;
      imps.addEventListener("mouseenter", ev => showTip(html, ev));
      imps.addEventListener("mousemove", ev => showTip(html, ev));
      imps.addEventListener("mouseleave", hideTip);
      imps.addEventListener("click", ev => { ev.preventDefault();
        hideTip(); impShow("scheme"); });
    }
    /* BACK TO THE SHIPPED CUT. Only drawn while another one is standing, and
       it clears the tradition filter with it: a code from a scheme that has
       just gone would leave the filter selecting on nothing. */
    on("schemeOff", "click", ev => {
      ev.preventDefault();
      const s = schemeNow();
      if(schemeDrop()){
        state.ap = "all";
        xlog("corpus", "Put the shipped classification back",
          (s && s.name ? "dropped " + s.name + " and " : "") +
          "restored the three traditions from Durand & Huynh (2024), with every " +
          "paper's tradition as that review assigned it");
        renderPanel(); refresh();
      }
    });
  }

/* Step pass. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
function wireJoinStep(){
    document.querySelectorAll("#pbody [data-xjoin]").forEach(b =>
      b.addEventListener("click", () => { xjoinDo(); refresh(); renderPanel(); }));
    PANELS("[data-xdrop]").forEach(b =>
      b.addEventListener("click", () => { gremove(b.dataset.xdrop); refresh(); renderPanel(); }));
  }

/* Step notion. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
function wireConstructs(){
    /* THE THRESHOLD belongs here rather than on step 1.1: it is a count of
       constructs, and this is the step about constructs. */
    on("cMinp","input", e => { state.minp = +e.target.value;
      document.getElementById("vMinp").textContent = state.minp + "+ papers";
      minpStats(); refresh(); });
    minpStats();
    /* The measure is a declaration, so changing it rebuilds the panel: each
       one brings its own controls and leaves the others off the page. */
    on("simM","change", e => { SIM.m = e.target.value; simForget(); simSave();
      renderPanel(); refresh(); });
    on("simRun","click", () => {
      const el = document.getElementById("simF");
      if(el) SIM.form = el.value.trim() || SIM.form;
      simForget(); simSave(); renderPanel(); refresh(); });
    const sc = document.getElementById("simC");
    if(sc) sc.addEventListener("input", () => { SIM.crit = sc.value; simSave(); });
    on("cTight","input", e => { state.tight = +e.target.value;
      document.getElementById("vTight").textContent = state.tight.toFixed(2);
      tightWhy(); refresh(); });
    tightWhy();
    const setDraw = v => { state.collapse = v;
      const a = document.getElementById("dBound"), b = document.getElementById("dOne");
      if(a) a.setAttribute("aria-pressed", String(!v));
      if(b) b.setAttribute("aria-pressed", String(v));
      refresh(); };
    on("dBound","click", () => setDraw(false));
    on("dOne","click", () => setDraw(true));
    renderSelbar();
  }

/* Step carry. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
function wireClaims(){
    on("wgtFold","click", () => { state.wgtOpen = !state.wgtOpen;
      renderPanel(); renderTrack(lastView); });
    const ev = document.getElementById("cEv"); if(ev){ ev.value = state.ev;
      ev.addEventListener("change", () => { state.ev = ev.value; refresh(); }); }
    const sg = document.getElementById("cSgn"); if(sg){ sg.value = state.sgn;
      sg.addEventListener("change", () => { state.sgn = sg.value; refresh(); }); }
    ["Comm", "Spec", "Evid"].forEach(b => {
      on("c" + b, "input", e => { state.bar[b] = +e.target.value; barWhy(); refresh(); });
    });
    document.querySelectorAll("[data-comp]").forEach(btn => {
      const [bar, k, st] = btn.dataset.comp.split(":");
      const it = COMPONENTS[bar].items.find(x => x.k === k);
      btn.addEventListener("click", () => {
        state.need[bar][k] = st;
        // asking for more than there are important ones left would be a lie
        state.bar[bar] = Math.min(state.bar[bar], Math.max(1, barMax(bar)));
        renderPanel(); refresh();
      });
      const tip = `<h5>${it.lab}</h5>
        <p class="def"><b>required</b> \u2014 a relationship without it fails, whatever else it has.
        <b>optional</b> \u2014 it joins the pool the slider counts: <i>at least N of these</i>.
        <b>ignored</b> \u2014 not looked at, and not in the denominator either.</p>`;
      btn.addEventListener("mouseenter", ev => showTip(tip, ev));
      btn.addEventListener("mousemove", ev => showTip(tip, ev));
      btn.addEventListener("mouseleave", hideTip);
    });
    document.querySelectorAll("[data-barset]").forEach(b => {
      const q = BARSETS.find(x => x.k === b.dataset.barset); if(!q) return;
      b.addEventListener("click", () => {
        ["Comm","Spec","Evid"].forEach(x => {
          state.bar[x] = q.bar[x];
          state.need[x] = Object.assign({}, q.need[x] || {});
        });
        renderPanel(); refresh();
      });
      b.addEventListener("mouseenter", ev => showTip(barSetTip(q), ev));
      b.addEventListener("mousemove", ev => showTip(barSetTip(q), ev));
      b.addEventListener("mouseleave", hideTip);
    });
    document.querySelectorAll("[data-apply]").forEach(b => {
      b.addEventListener("click", () => {
        state.apply[b.dataset.bar] = b.dataset.apply;
        renderPanel(); refresh(); });
      const tip = `<h5>A relationship that fails ${BARLAB[b.dataset.bar].toLowerCase()}</h5>
        <p class="def"><b>fade</b> \u2014 it stays on the map, drawn faint, and step 2.1 can
        still ask you about it. <b>hide</b> \u2014 it comes off the map, and step 2.1 cannot.</p>
        <p class="def">Set for each bar on its own: you can hide what is not commensurable and
        still see what is only thinly evidenced.</p>`;
      b.addEventListener("mouseenter", ev => showTip(tip, ev));
      b.addEventListener("mousemove", ev => showTip(tip, ev));
      b.addEventListener("mouseleave", hideTip);
    });
    on("cCore","change", e => { state.core = e.target.checked; refresh(); });
    on("cIso","change", e => { state.hideIso = e.target.checked; refresh(); });
    barWhy();
  }

/* Step build. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
function wireQuantities(){
    document.querySelectorAll("#pbody [data-dec]").forEach(b =>
      b.addEventListener("click", () => { state.dec = b.dataset.dec; renderPanel(); }));
    document.querySelectorAll("#pbody [data-vt]").forEach(b =>
      b.addEventListener("click", () => openVar(b.dataset.vt)));
    // one of the six, or none: pressing the lit one again clears it, because a
    // declaration withdrawn is as much a decision as one made
    document.querySelectorAll("#pbody [data-setrole]").forEach(b =>
      b.addEventListener("click", () => {
        const [id, k] = b.dataset.setrole.split("|");
        const v = Object.assign(SPEC0(), spec.get(id) || {});
        const cur = Array.isArray(v.roles) && v.roles.length ? v.roles
          : (v.role ? [v.role] : []);
        v.roles = cur.includes(k) ? cur.filter(x => x !== k) : cur.concat([k]);
        v.role = "";
        v.at = new Date().toISOString().slice(0, 10);
        if(specSet(v)){ spec.set(id, v); spersist(id, v); } else sforget(id);
        refresh(); renderPanel();
      }));
    // the same, for a form property declared inline on the mechanism row
    document.querySelectorAll("#pbody [data-setprop]").forEach(b =>
      b.addEventListener("click", () => {
        const [id, k] = b.dataset.setprop.split("|");
        const v = Object.assign(SPEC0(), spec.get(id) || {});
        const cur = v.props || [];
        v.props = cur.includes(k) ? cur.filter(x => x !== k) : cur.concat([k]);
        v.at = new Date().toISOString().slice(0, 10);
        if(specSet(v)){ spec.set(id, v); spersist(id, v); } else sforget(id);
        refresh(); renderPanel();
      }));
    /* All, none, as stated. The first two are nearly the same declaration seen
       from opposite ends -- an empty class admits every member, so "none" is
       the widest thing you can say and "all" only writes it down. "As stated"
       is the one with evidence under it: the shape a paper committed to, where
       one did and the estimator did not do it for them. */
    /* The same four moves on the quantities, and the same ethic: "none" and
       "all kinds" are one declaration seen from both ends, "as recorded" is
       the one with the corpus under it, and "differences" is the one with only
       a name under it, which is why it is separate and why it is additive. */
    document.querySelectorAll("#pbody [data-qbulk]").forEach(b =>
      b.addEventListener("click", () => {
        const how = b.dataset.qbulk, today = new Date().toISOString().slice(0, 10);
        for(const k of carriedVars()){
          const cur = vtype.get(k);
          if(how === "diff" && !looksLikeDifference(k)) continue;
          const v = Object.assign({id:k, name:varName(k), kinds:[], aspects:[],
            lo:0, hi:1}, cur || {});
          if(how === "all"){ v.kinds = KINDS.map(x => x[0]); v.aspects = ASPECTS.map(x => x[0]); }
          else if(how === "none"){ v.kinds = []; v.aspects = []; }
          else if(how === "recorded") v.kinds = recordedKinds(k);
          else if(how === "diff") v.aspects = ["difference"];
          v.name = varName(k); v.at = today;
          // an empty record with the default bounds is an absence, not a decision
          if(how === "none" && +v.lo === 0 && +v.hi === 1) vtype.delete(k);
          else vtype.set(k, v);
        }
        vsaveLocal(); refresh(); renderPanel();
      }));
    document.querySelectorAll("#pbody [data-bulk]").forEach(b =>
      b.addEventListener("click", () => {
        const how = b.dataset.bulk;
        for(const r of carriedRelations()){
          const v = Object.assign(SPEC0(), spec.get(r.id) || {});
          /* The three properties that do not exclude one another. It used to
             drop convex and sigmoid and keep concave, which is not "all" --
             it is one of three curvatures, chosen here rather than declared,
             and it closed the other two families off a mechanism nobody had
             said anything about. */
          v.props = how === "all" ? ["f(0)=0", "f(1)=1", "increasing"]
            : how === "none" ? []
            : statedProps(r);
          v.at = new Date().toISOString().slice(0, 10);
          if(specSet(v)){ spec.set(r.id, v); spersist(r.id, v); } else sforget(r.id);
        }
        refresh(); renderPanel();
      }));
  }

/* Step plot. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
/* NARROWING WHAT IS TESTED, in an overlay. The apparatus -- the slots, their
   members, the seven sets, the sample's size and seed, and the reviewer --
   used to sit on the step above the findings, where it read backwards and
   asked every reader to make a declaration before reaching what they came
   for. The step now says what was tested in one line; this is what opens
   when somebody wants it otherwise. Wired the way the cluster proposals are,
   because it is the same shape of thing. */
function openExp(){
  const dlg = document.getElementById("expdlg");
  if(!dlg) return;
  const b = document.getElementById("expbody");
  if(b) b.innerHTML = expSetHTML();
  const w = document.getElementById("expwhat");
  if(w) w.textContent = "declared before the run, and saved with the project";
  wireExp();
  if(!dlg.open) dlg.showModal();
}

/* Every control inside the overlay. A change redraws the overlay AND the step
   behind it, because the step's one line is a reading of the same state. */
function wireExp(){
  const again = () => {
    expSave(); renderPanel();
    const dlg = document.getElementById("expdlg");
    if(dlg && dlg.open) openExp();
  };
  const B = sel => [...document.querySelectorAll("#expbody " + sel)];
  B("[data-expset]").forEach(b =>
    b.addEventListener("click", () => { EXP.set = b.dataset.expset; again(); }));
  B("[data-exppick]").forEach(b =>
    b.addEventListener("click", () => {
      const [term, name] = b.dataset.exppick.split("|");
      const had = EXP.pick[term] || [];
      const next = had.includes(name) ? had.filter(x => x !== name) : had.concat([name]);
      EXP.pick = Object.assign({}, EXP.pick, {[term]: next});
      if(!next.length){ const p = Object.assign({}, EXP.pick); delete p[term]; EXP.pick = p; }
      again(); }));
  B("#expN").forEach(e => e.addEventListener("change", ev => {
    EXP.n = Math.max(1, Math.min(XRUNSAMP, +ev.target.value || 1)); again(); }));
  B("#expSeed").forEach(e => e.addEventListener("change", ev => {
    EXP.seed = Math.max(0, +ev.target.value || 0) >>> 0; again(); }));
  /* The reviewer, asked through the one path every model control uses. */
  B("[data-ai]").forEach(b => b.addEventListener("click", () => aiAsk(b.dataset.ai)));
}

function wirePlotStep(){
    document.querySelectorAll("#pbody [data-expopen]").forEach(b =>
      b.addEventListener("click", ev => { ev.preventDefault(); openExp(); }));
    on("expclose", "click", () => {
      const d = document.getElementById("expdlg"); if(d && d.open) d.close(); });
    /* Running the set is an act, not a side effect of declaring one: it costs
       a wait proportional to the size, and the size is on the screen before
       the button is pressed. Painted as busy first, because a set of two
       hundred combinations is long enough that a dead button reads as a dead
       page. */
    on("expRun", "click", () => {
      XRUN.busy = true; renderPanel();
      setTimeout(() => {
        try{ xrunGo(); }
        catch(e){ XRUN.rows = null;
          XRUN.err = "the set would not run: " + ((e && e.message) || "unknown"); }
        XRUN.busy = false; renderPanel();
      }, 0);
    });
    /* The way out of a set too big to run, as one press: declare the seeded
       sample the refusal recommends, and run it. Declaring it is the point --
       the set is saved before anything runs, so the tally is a tally of
       something somebody chose. */
    on("expSample", "click", ev => {
      ev.preventDefault();
      EXP.set = "sample"; EXP.n = XRUNSAMP; expSave();
      XRUN.busy = true; renderPanel();
      setTimeout(() => {
        try{ xrunGo(); }
        catch(e){ XRUN.rows = null;
          XRUN.err = "the sample would not run: " + ((e && e.message) || "unknown"); }
        XRUN.busy = false; renderPanel();
      }, 0);
    });
    /* Redrawn when the model changes, not once. It used to be filled from a
       <template> and left alone, which was right while it drew a model of its
       own and wrong now that it draws yours. */
    const host = document.getElementById("stxhost");
    const sig = String((ARITH.sig || "") + "/" + ((ARITH.kept || []).length || 0));
    if(host && host.dataset.filled !== sig){
      host.dataset.filled = sig;
      stxInit(host, snapNow()).catch(e => { host.innerHTML =
        `<p class="empty">The comparative statics could not be drawn: ${hesc(e && e.message || "")}</p>`; });
    }
  }

/* Step build. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
function wireComposition(){
    document.querySelectorAll("#pbody [data-setcomp]").forEach(b =>
      b.addEventListener("click", () => {
        const [k, c] = b.dataset.setcomp.split("|");
        const cur = Object.assign({id:k, rules:[]}, compo.get(k) || {});
        cur.rules = cur.rules.includes(c) ? cur.rules.filter(x => x !== c) : cur.rules.concat([c]);
        cur.at = new Date().toISOString().slice(0, 10);
        if(cur.rules.length) compo.set(k, cur); else compo.delete(k);
        csaveLocal2(); refresh(); renderPanel();
      }));
    document.querySelectorAll("#pbody .modsel").forEach(sel =>
      sel.addEventListener("change", () => {
        const id = sel.dataset.target;
        const v = Object.assign(SPEC0(), spec.get(id) || {});
        v.target = sel.value;
        v.at = new Date().toISOString().slice(0, 10);
        if(specSet(v)){ spec.set(id, v); spersist(id, v); } else sforget(id);
        refresh(); renderPanel();
      }));
    on("expModel", "click", ev => { ev.preventDefault(); exportModel(ev.currentTarget); });
    wireAI();
    /* data-xinv was wired here to a control nothing renders. Left behind by a
       rename or a move; a querySelectorAll that matches nothing costs
       nothing until somebody reads it and believes it. */
    {
      const cb = document.getElementById("condbox");
      if(cb) cb.addEventListener("input", () => { CONDTXT.t = cb.value; CONDTXT.err = ""; });
      if(cb) cb.addEventListener("keydown", ev => {
        if(ev.key === "Enter"){ ev.preventDefault(); addCondUI(); } });
    }
    /* The families list now lives in an overlay as well as being reachable from
       two steps, so its controls are wired against whichever host is showing
       it. `redraw` is what differs: the panel re-renders itself, the dialog
       re-renders its own body. One wiring, two hosts -- the alternative was a
       second copy of these five handlers, which is how the save/load pair came
       to be declared twice. */
    wireFamControls("#pbody", renderPanel);
    /* And the two buttons that open it: step 3.1's mechanisms column, where a
       shape class is attributed, and step 3.1, where a line may name a member. */
    document.querySelectorAll("#pbody [data-fams]").forEach(b =>
      b.addEventListener("click", ev => { ev.preventDefault(); openFams(); }));
    /* Step 2.1: the manual join behind a button, and taking a recommendation. */
    /* Step 3.2's board: the expectation, the take, and standing behind one. */
    /* data-wlo and data-whi was wired here to a control nothing renders. Left behind by a
       rename or a move; a querySelectorAll that matches nothing costs
       nothing until somebody reads it and believes it. */
    document.querySelectorAll("#pbody [data-condadd]").forEach(b =>
      b.addEventListener("click", () => addCondUI()));
    document.querySelectorAll("#pbody [data-ctrun]").forEach(b =>
      b.addEventListener("click", () => { runClassTests(); renderPanel(); }));
    /* data-xtest was wired here to a control nothing renders. Left behind by a
       rename or a move; a querySelectorAll that matches nothing costs
       nothing until somebody reads it and believes it. */
    document.querySelectorAll("#pbody [data-aedit]").forEach(b =>
      b.addEventListener("click", () => {
        ARITH.edit = !ARITH.edit;
        if(ARITH.edit && ARITH.text == null) ARITH.text = arithToText();
        renderPanel();
      }));
    {
      const ab = document.getElementById("abox");
      if(ab) ab.addEventListener("input", () => { ARITH.text = ab.value; });
    }
    /* The panel holding another model, under this step's own. The editor
       handler is passed in rather than reached for, so the only way their
       arithmetic reaches the page is through the box a scholar then runs. */
    wireModels(renderPanel, t => {
      ARITH.edit = true; ARITH.text = t; state.dec = "arith";
      xlog("model", "Put another model's arithmetic in the editor",
        t.split("\n").filter(Boolean).length + " line(s), unparsed \u2014 run it to see " +
        "whether it reads against your declarations");
    });
    document.querySelectorAll("#pbody [data-acheck]").forEach(b =>
      b.addEventListener("click", () => {
        takeArith(parseArith(ARITH.text), true); refresh(); renderPanel();
      }));
    document.querySelectorAll("#pbody [data-fam]").forEach(sel =>
      sel.addEventListener("change", () => {
        const [term, reader] = sel.dataset.fam.split("|");
        if(!sel.value){
          const f = Object.assign({}, ARITH.fam || {}); delete f[term]; ARITH.fam = f;
          renderPanel(); return;
        }
        const fam = famByName(sel.value);
        setLineForm(term, sel.value, fam.members[0][0], reader);
        refresh(); renderPanel();
      }));
    document.querySelectorAll("#pbody [data-mem]").forEach(sel =>
      sel.addEventListener("change", () => {
        const [term, reader, fam] = sel.dataset.mem.split("|");
        setLineForm(term, fam, sel.value, reader);
        refresh(); renderPanel();
      }));
    /* A skeleton that has not been checked is a textarea full of text. It is
       built to pass its own declarations -- that is the only reason it is
       worth having -- so asking for one runs it, and what is whole and holds
       is kept. Two presses for one act was what sent "run them" to a message
       about nothing having been kept. */
    document.querySelectorAll("#pbody [data-askel]").forEach(b =>
      b.addEventListener("click", () => {
        ARITH.text = arithSkeleton();
        takeArith(parseArith(ARITH.text), true);
        refresh(); renderPanel();
      }));
    document.querySelectorAll("#pbody [data-akeep]").forEach(b =>
      b.addEventListener("click", () => { arithKeep(); refresh(); renderPanel(); }));
    document.querySelectorAll("#pbody [data-adrop]").forEach(b =>
      b.addEventListener("click", () => { ARITH.prop = null; renderPanel(); }));
    document.querySelectorAll("#pbody [data-adel]").forEach(b =>
      b.addEventListener("click", () => {
        ARITH.kept = null; asaveLocal(); refresh(); renderPanel();
      }));
  }

/* Step statics. Pulled out of wire(), which was 536 lines.
   See the note on wire() for why these are separate functions. */
function wireStatics(){
    wireAI();
    {
      const tb = document.getElementById("defbox");
      // typing must not redraw: the panel is innerHTML and a redraw would
      // take the caret with it
      if(tb) tb.addEventListener("input", () => { SCORE.defn = tb.value; });
      if(tb) tb.addEventListener("blur", () => renderPanel());
    }
    document.querySelectorAll("#pbody [data-derive]").forEach(b =>
      b.addEventListener("click", () => { deriveProps();
        xlog("derive", "Derived from the model", PROPS.err ? PROPS.err
          : (PROPS.out ? PROPS.out.props.length + " propositions, "
             + BUF.lines.length + " lines on the buffer" : ""));
        /* A derivation IS the end of a pass through five to seven, so it closes
           a round rather than waiting for somebody to say it did. */
        /* The hybrid, where it costs nothing to run both: the exact pass has
           already produced an expression per line, and sampling it is the same
           walk over a box. */
        if(MTH.how !== "exact"){
          let n = 0;
          for(const l of BUF.lines){
            if(!l.tree || !l.x) continue;
            /* computation inside a render: one line that will not sample is
               skipped and the rest are still sampled, which is why this is
               caught per line rather than around the loop. */
            try{ const r = simSign(l.tree, l.bx || {}, MTH.draws);
              if(r.n){ l.sim = r; n++; } }
            catch(e){ noteFail("sampling a sign", e); }
          }
          if(n) xlog("sim", "Sampled the signs", n + " line" + (n === 1 ? "" : "s") +
            " at " + MTH.draws + " draws plus every corner");
        }
        if(!PROPS.err && PROPS.out) roundTake();
        renderPanel(); }));
    const ms = document.getElementById("mthsel");
    if(ms) ms.addEventListener("change", () => { MTH.how = ms.value; renderPanel(); });
    document.querySelectorAll("#pbody [data-lvl]").forEach(b =>
      b.addEventListener("click", () => { PROPS.lvl = b.dataset.lvl; renderPanel(); }));
    // the curve for a derivative, on hover, using the tooltip the map already has
    document.querySelectorAll("#pbody [data-plot]").forEach(e => {
      const [y, x] = e.dataset.plot.split("|");
      const draw = ev => {
        const M = PROPS.out && PROPS.out.M;
        const xk = carriedVars().find(k => varName(k) === x);
        if(!M || !xk || !M.params.includes(xk)) return;
        const w = asweep(M, xk, y, 40);
        showTip(`<h5>${hesc(y)} over ${hesc(x)}</h5>` +
          sparkHTML(w.xs, w.ys, 220, 90) +
          `<p class="dfn">${hesc(x)} from ${w.xs[0].toFixed(2)} to ${
            w.xs[w.xs.length - 1].toFixed(2)}, everything else at its midpoint.</p>`, ev);
      };
      e.addEventListener("mouseenter", draw);
      e.addEventListener("mousemove", draw);
      e.addEventListener("mouseleave", hideTip);
    });
    document.querySelectorAll("#pbody [data-dex]").forEach(b =>
      b.addEventListener("click", ev => {
        const how = b.dataset.dex, P = PROPS.out;
        /* The script is the buffer itself and needs no derivation behind it:
           a line written by hand and signed is a derivation, and refusing to
           export it because the automatic pass had not run would be the tail
           wagging the dog. */
        if(how === "script"){
          saveText(bufScript(), "derivation-" + new Date().toISOString().slice(0, 10) + ".txt",
            "text/plain", ev.currentTarget);
          return;
        }
        /* Both of these read what was STATED rather than what was derived: a
           derivation is a working surface and a result is something somebody
           decided to stand behind. */
        if(how === "results" || how === "claims"){
          if(how === "results") exportResults(ev.currentTarget);
          else exportDerived(ev.currentTarget);
          return;
        }
        if(!P) return;
        const t = how === "tex" ? exportPropTex(P)
          : how === "sympy" ? exportSympy(P) : exportWolfram(P);
        const ext = how === "tex" ? "tex" : how === "sympy" ? "py" : "wl";
        saveText(t, "propositions-" + new Date().toISOString().slice(0, 10) + "." + ext,
          "text/plain", ev.currentTarget);
      }));
    /* THE BUFFER. Selecting a line redraws, because the palette's enabled set
       and every reason on a disabled button are computed from the selection:
       a palette that did not follow the selection would be lying about what
       the next command can do. The two textareas are read on input and never
       redraw, because the panel is innerHTML and a redraw takes the caret. */
    document.querySelectorAll("#pbody [data-bsel]").forEach(e =>
      e.addEventListener("click", () => {
        if(BUF.sel === e.dataset.bsel) return;
        BUF.sel = e.dataset.bsel; BUF.err = ""; renderPanel();
      }));
    {
      const hb = document.getElementById("bufhand");
      if(hb) hb.addEventListener("input", () => { BUF.hand = hb.value; });
      const ib = document.getElementById("bufimp");
      if(ib) ib.addEventListener("input", () => { BUF.imp = ib.value; });
    }
    document.querySelectorAll("#pbody [data-bcmd]").forEach(b =>
      b.addEventListener("click", () => {
        const c = b.dataset.bcmd;
        const pick = id => { const e = document.getElementById(id); return e ? e.value : ""; };
        const arg = c === "diff" ? pick("bdiffn") : c === "cs" ? pick("bcsn")
          : c === "outcome" ? pick("boutn") : c === "sub" ? pick("bsubn")
          : c === "split" ? pick("bsplitn") : c === "noise" ? pick("bnsd") : "";
        if(c === "noise"){
          const v = Math.min(0.5, Math.max(0, +arg));
          /* Typing a number IS the declaration. Until one is typed the page
             owns the figure and says so. */
          if(isFinite(v) && v !== NOISE.sd){ NOISE.sd = v; NOISE.dec = true; }
          else if(isFinite(v)) NOISE.dec = true;
        }
        const n0 = BUF.lines.length;
        bufRun(c, arg);
        xlog("buf", BCMDLOG[c] || c, BUF.err ? "refused: " + BUF.err
          : (BUF.lines.length > n0 ? (BUF.lines.length - n0) + " line added" : "")
            + (arg ? (BUF.lines.length > n0 ? " — " : "") + arg : ""));
        renderPanel();
      }));
    document.querySelectorAll("#pbody [data-bimp]").forEach(b =>
      b.addEventListener("click", () => { bufImport(b.dataset.bimp); renderPanel(); }));
    document.querySelectorAll("#pbody [data-screrun]").forEach(b =>
      b.addEventListener("click", () => { runScorer(); renderPanel(); }));
    document.querySelectorAll("#pbody [data-scok]").forEach(b =>
      b.addEventListener("click", () => {
        SCORE.rule = Object.assign({declared:true}, AI.rule);
        AI.rule = null; runScorer(); renderPanel();
      }));
    document.querySelectorAll("#pbody [data-scno]").forEach(b =>
      b.addEventListener("click", () => { AI.rule = null; renderPanel(); }));
    document.querySelectorAll("#pbody [data-scedrop]").forEach(b =>
      b.addEventListener("click", () => {
        SCORE.rule = null; runScorer(); renderPanel();
      }));
    const mt = document.getElementById("cMatter");
    if(mt) mt.addEventListener("input", () => {
      state.matter = +mt.value;
      const rd = document.getElementById("vMatter");
      if(rd) rd.textContent = state.matter ? state.matter.toFixed(1) + "% of value" : "any";
      renderWorklist(0);
    });

    if(typeof renderWorklist === "function") renderWorklist();
  }

/* The controls that belong to NO step, and are wired whatever is on
   screen. A querySelectorAll over #pbody finds nothing when its step is
   not rendered, so there is no cost to not guarding these and one less
   condition to get wrong -- which is the lesson of the twenty control
   families that went dead when two steps merged. */
function wireEveryStep(){
  /* Unconditional, deliberately. These six belong to steps 2.1, 3.2 and
     4.2, and they sat inside the branch for step 3.1's key -- which worked
     only because that branch happened to be the one running when they were
     written, and stopped working the moment the key changed. A
     querySelectorAll over #pbody finds nothing when its step is not on screen,
     so there is no cost to not guarding them and one less condition to get
     wrong. */
  wireWorkspace();
  document.querySelectorAll("#pbody [data-guess]").forEach(b =>
    b.addEventListener("click", () => {
      const p = b.dataset.guess.split("|");
      const k = p[0] + "|" + p[1], v = p[2];
      GUESS[k] = GUESS[k] === v ? "" : v;
      boardSave(); renderPanel();
    }));
  document.querySelectorAll("#pbody [data-btake]").forEach(b =>
    b.addEventListener("click", () => {
      const l = BUF.lines.find(x => x.id === b.dataset.btake);
      if(l) boardTake(l);
      renderPanel();
    }));
  document.querySelectorAll("#pbody [data-bkeep]").forEach(b =>
    b.addEventListener("click", () => {
      const r = BOARD.rows.find(x => x.id === b.dataset.bkeep);
      if(r){ r.keep = !r.keep; boardSave(); }
      renderPanel();
    }));
  /* THE SCHOLAR'S NOTE ON A PROPOSITION. Opening is a toggle, saving reads
     the box beside the button rather than the one that happens to be first,
     and the note is stamped so a reader can tell a note written before a
     model changed from one written after. */
  document.querySelectorAll("#pbody [data-bnote]").forEach(b =>
    b.addEventListener("click", () => {
      bannoSet(b.dataset.bnote === bannoNow() ? "" : b.dataset.bnote);
      renderPanel();
    }));
  document.querySelectorAll("#pbody [data-bnotesave]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.dataset.bnotesave;
      const box = document.querySelector(`#pbody [data-bnotebox="${id}"]`);
      const r = BOARD.rows.find(x => x.id === id);
      if(r && box){
        const t = String(box.value || "").trim().slice(0, 600);
        r.anno = t;
        r.annoAt = t ? new Date().toISOString().slice(0, 16).replace("T", " ") : "";
        if(!t){ delete r.anno; delete r.annoAt; }
        boardSave();
        xlog("board", "Annotated a proposition", (r.text || r.y + " in " + r.x) +
          (t ? " \u2014 " + t.slice(0, 120) : " \u2014 note removed"));
      }
      bannoSet("");
      renderPanel();
    }));
  /* ONE FINDING, WITH THE CERTIFICATE THAT SETTLED IT. The work is in
     23-exchange.js; the button only has to find its row. */
  document.querySelectorAll("#pbody [data-bproof]").forEach(b =>
    b.addEventListener("click", ev => {
      ev.preventDefault();
      const r = BOARD.rows.find(x => x.id === b.dataset.bproof);
      if(r) exportProof(r, b);
    }));
  document.querySelectorAll("#pbody [data-bnotedel]").forEach(b =>
    b.addEventListener("click", () => {
      const r = BOARD.rows.find(x => x.id === b.dataset.bnotedel);
      if(r){ delete r.anno; delete r.annoAt; boardSave();
        xlog("board", "Removed a note from a proposition", r.text || r.y + " in " + r.x); }
      bannoSet("");
      renderPanel();
    }));
  /* The search over the declared class. Unconditional with the rest of them. */
  document.querySelectorAll("#pbody [data-ssearch]").forEach(b =>
    b.addEventListener("click", ev => { ev.preventDefault();
      const sel = document.getElementById("startgt");
      if(sel) SEARCH.target = sel.value;
      runSearch(); renderPanel();
    }));
  {
    /* Changing the target drops the last result rather than leaving it under a
       new heading: a report that says what it was looking for is the whole
       point of stating the target first. */
    const sel = document.getElementById("startgt");
    if(sel) sel.addEventListener("change", () => {
      SEARCH.target = sel.value; SEARCH.out = null; SEARCH.err = ""; renderPanel();
    });
  }
  document.querySelectorAll("#pbody [data-part]").forEach(b =>
    b.addEventListener("click", ev => { ev.preventDefault();
      const x = PARTS.find(p => p.k === b.dataset.part);
      if(x && x.has()) x.run(ev.currentTarget);
    }));
  /* THE FIVE DECISIONS OF THE DEPOSIT. A select changes on change; a text
     field on blur, because the panel is innerHTML and redrawing on a keystroke
     would take the caret with it. Each writes the day it was made, which is
     what makes it a declaration rather than a setting. */
  document.querySelectorAll("#pbody [data-dep]").forEach(e => {
    const k = e.dataset.dep;
    const put = () => {
      const was = DEP[k];
      if(depSet(k, e.value) && was !== DEP[k]){
        xlog("deposit", "Declared part of the deposit",
          k + " = " + (DEP[k] || "(cleared)"));
        renderPanel();
      }
    };
    e.addEventListener(e.tagName === "SELECT" ? "change" : "blur", put);
  });
  { const dv = document.getElementById("depVer");
    if(dv) dv.addEventListener("click", ev => { ev.preventDefault();
      depSet("version", depVersion());
      xlog("deposit", "Declared what a citation pins to", DEP.version);
      renderPanel(); }); }
  { const dg = document.getElementById("depGo");
    if(dg) dg.addEventListener("click", ev => { ev.preventDefault();
      exportDeposit(dg); }); }
  /* The two halves of step 4.1: the findings, or the notebook they would be
     written up in. A view, so it redraws the panel and saves nothing. */
  { const mb = document.getElementById("mapToggle");
    if(mb) mb.addEventListener("click", () => {
      state.mapOn = !state.mapOn;
      renderPanel();
      /* Shown again, the map has to be re-laid: it was display:none, so its
         box was zero and size() had nothing to measure. */
      if(state.mapOn){ size(); recentre();
        if(sim){ sim.nodes(nodes); sim.alpha(.6).restart(); }
        draw(); }
    }); }
  { const fb = document.getElementById("floorFold");
    if(fb) fb.addEventListener("click", () => {
      state.floorOpen = !state.floorOpen; renderPanel(); }); }
  PANELS("[data-der]").forEach(b =>
    b.addEventListener("click", () => { state.der = b.dataset.der; renderPanel(); }));
  /* FROM THE SENTENCE TO THE WORKING. The Findings tab is where a reader who
     does not want formulas stays; this is the one door out of it, and it has
     to land on the line they were reading rather than at the top of a list of
     nine. The scroll waits a frame, because the panel is innerHTML and the
     row does not exist until the render has run. */
  PANELS("[data-derat]").forEach(b =>
    b.addEventListener("click", () => {
      BUF.sel = b.dataset.derat;
      state.der = "work";
      renderPanel();
      requestAnimationFrame(() => {
        const el = document.querySelector(`#pbody [data-bsel="${CSS.escape(BUF.sel)}"]`);
        if(el) el.scrollIntoView({block:"center", behavior:"smooth"});
      });
    }));
  PANELS("[data-rankopen]").forEach(b =>
    b.addEventListener("click", () => { state.rankOpen = !state.rankOpen; renderPanel(); }));
  /* A DRAFTED READING BECOMES THE NOTE, and the record says who drafted it
     and who took it. Once accepted it is the scholar's, which is why it lands
     in the same field a note typed by hand lands in. */
  PANELS("[data-rdtake]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.dataset.rdtake;
      const x = (READ.out || []).find(z => z.id === id);
      const r = (BOARD.rows || []).find(z => z.id === id);
      if(!x || !r) return;
      r.anno = (x.says + (x.mind ? " What it does not establish: " + x.mind : ""))
        .slice(0, 600);
      r.annoAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      boardSave();
      xlog("board", "Took a drafted reading as the note on a proposition",
        (r.text || r.y + " in " + r.x) + " \u2014 drafted by an LLM, accepted by the scholar");
      READ.out = (READ.out || []).filter(z => z.id !== id);
      renderPanel();
    }));
  PANELS("[data-rdno]").forEach(b =>
    b.addEventListener("click", () => {
      READ.out = (READ.out || []).filter(z => z.id !== b.dataset.rdno);
      renderPanel();
    }));
  PANELS("[data-fin]").forEach(b =>
    b.addEventListener("click", () => { state.fin = b.dataset.fin; renderPanel(); }));
  /* THE NOTEBOOK: the order, the prose, and the file. A part naming something
     derived is added by picking a kind and the thing it is about; the order is
     two buttons per row; the prose is a box per part. The title and the boxes
     save on blur rather than on every keystroke, because the panel is
     innerHTML and a redraw would take the caret with it. */
  { const pk = document.getElementById("nbPick");
    if(pk) pk.addEventListener("change", () => { NB.pick = pk.value; renderPanel(); }); }
  { const ad = document.getElementById("nbAdd");
    if(ad) ad.addEventListener("click", ev => {
      ev.preventDefault();
      const at = document.getElementById("nbAt");
      const c = nbAdd(NB.pick, at ? at.value : "");
      if(c) xlog("notebook", "Added a part to the notebook",
        (nbKind(c.kind) || [, "a part"])[1] + " · " + nbLabel(c));
      renderPanel();
    }); }
  { const ti = document.getElementById("nbTitle");
    if(ti) ti.addEventListener("blur", () => {
      NB.title = String(ti.value || "").slice(0, 160); nbSave(); }); }
  PANELS("[data-nbup]").forEach(b =>
    b.addEventListener("click", () => { nbMove(b.dataset.nbup, -1); renderPanel(); }));
  PANELS("[data-nbdn]").forEach(b =>
    b.addEventListener("click", () => { nbMove(b.dataset.nbdn, 1); renderPanel(); }));
  PANELS("[data-nbdel]").forEach(b =>
    b.addEventListener("click", () => {
      const c = NB.cells.find(x => x.id === b.dataset.nbdel);
      if(c) xlog("notebook", "Took a part out of the notebook",
        (nbKind(c.kind) || [, "a part"])[1] + " · " + nbLabel(c));
      nbDrop(b.dataset.nbdel); renderPanel();
    }));
  PANELS("[data-nbtext]").forEach(t =>
    t.addEventListener("blur", () => nbSet(t.dataset.nbtext, "text", t.value)));
  { const ex = document.getElementById("nbExp");
    if(ex) ex.addEventListener("click", ev => {
      ev.preventDefault(); exportNotebook(ex); }); }
  PANELS("[data-joinman]").forEach(b =>
    b.addEventListener("click", ev => { ev.preventDefault(); openJoin(); }));
  /* FULL SCREEN, PER PLATE. The plate goes, not the svg inside it, so the key
     under the axis travels with the curve it explains. */
  PANELS("[data-fsplate]").forEach(b =>
    b.addEventListener("click", () => {
      const pl = b.closest(".plate");
      if(!pl) return;
      pl.classList.add("fschart");
      fsToggle(pl, {onEnter:() => fsMark(b, pl),
                    onExit:() => { fsMark(b, pl); pl.classList.remove("fschart"); }});
    }));
  /* Over both panel hosts, because the suggestions have moved twice -- under
     the map, back into the panel, and now into the slot under the building
     blocks. A selector scoped to one host matched nothing the moment they
     did, and a querySelectorAll that matches nothing is not an error: it is
     twelve Join buttons that quietly do nothing, which is the same way twenty
     control families went dead when two steps merged. */
  PANELS("[data-xtake]").forEach(b =>
    b.addEventListener("click", () => {
      xtake(b.dataset.xtake); refresh(); renderPanel();
    }));
}


const MODE = {
  explore: {label:"Inspect", tip:`<h5>Inspect</h5>
    <p class="def">Click a construct or an arrow to pin it in the inspector on the right: its
    definition in the paper's own words, its signature, the papers behind it and the relationships it
    carries. Looking changes nothing.</p>`},
  group: {label:"Pick to merge", tip:`<h5>Pick to merge</h5>
    <p class="def">Click constructs to collect them, then name the quantity they all measure.
    The merge is drawn as a boundary around them rather than collapsed into one circle, so it
    stays inspectable and you can undo it. Picking constructs that sit at different levels of
    analysis is flagged before you commit, because they are not measuring the same kind of
    thing.</p>`},
  carry: {label:"Select or drop", tip:`<h5>Select or drop</h5>
    <p class="def">Click a construct or an arrow to select it, or to drop one you had selected.
    What you drop stays on the map, faded, so a narrowing decision leaves a trace instead of
    vanishing — and step 2.1 will ask you about the ones with the most behind them.</p>`}
};

const SEED_TIP = {
  all: `<h5>Select everything</h5><p class="def">Nothing is dropped. This is where the step
    starts, and the state to come back to if a narrowing went wrong.</p>`,
  none: `<h5>Select nothing</h5><p class="def">Drops everything, so you build the set up by
    clicking the few constructs a model would actually use. <b>Grow by one arrow</b>, in the
    panel, then reaches outward from what you picked.</p>`,
  core: `<h5>The largest joined-up set</h5><p class="def">Selects the biggest group of
    constructs that are all reachable from one another along arrows, and drops everything
    hanging off it. A model needs its quantities connected: a construct nothing runs to or
    from cannot bear on anything else in it.</p>`,
  pass: `<h5>What clears both bars</h5><p class="def">Selects only the arrows whose relationships
    clear the cost bar and the number bar, and the constructs those arrows join. This is the
    bars used as a decision rather than as a lens \u2014 which is a choice, not the default.</p>`,
  grow: `<h5>Grow by one arrow</h5><p class="def">Also selects everything that sits one arrow
    from what you have, and the arrows joining them. This is how a small set is assembled:
    pick the construct the model is about, then reach outward until it stops being about
    that.</p>`,
  invert: `<h5>Invert</h5><p class="def">Selects everything now dropped and drops everything
    now selected. Useful for checking the complement of a selection: if what you left out is
    the more defensible set, that is worth knowing before step 2.1.</p>`
};

/* One panel, because the modes and the axes are both answers to "what is this
   map showing me". Each axis gets its own menu with a short name; what the
   choice actually means is a paragraph underneath, folded away by default so
   the panel stays a control and not an essay. */
/* The axis menus sit on the axes. In a panel they were a legend you had to
   cross-reference; on the axis the menu IS the axis label. */
function axOptions(sel){
  return Object.entries(AXES).map(([k, a]) =>
    `<option value="${k}"${sel === k ? " selected" : ""}>${a.label}</option>`).join("");
}
/* The axis label IS the menu. A select box on a chart reads as a form; a
   label with a caret reads as the name of the axis, which is what it is. */
let axOpen = null;

function renderAxisMenus(){
  const xw = document.getElementById("xSelWrap"), yw = document.getElementById("ySelWrap");
  if(!xw || !yw) return;
  /* NO AXES, NO AXIS MENUS. A label with a caret sitting where an axis would
     be, on a map whose forces ignore it, is a control that lies about what it
     governs. */
  if(!laidOnAxes()){
    xw.innerHTML = ""; yw.innerHTML = "";
    xw.hidden = true; yw.hidden = true;
    return;
  }
  xw.hidden = false; yw.hidden = false;
  const lab = (key, vert) => {
    const a = AXES[state[key]] || {label:""};
    const arrow = state.axBold && a.of ? (vert ? " ↑" : " →") : "";
    return `<button type="button" class="axlab${vert ? " vert" : ""}" data-axmenu="${key}"
       aria-haspopup="listbox" aria-expanded="false">${a.label}${arrow}<span class="axcaret">▾</span></button>
      <div class="axmenu" data-axfor="${key}" role="listbox" hidden>
        ${Object.entries(AXES).map(([k, x]) =>
          `<button type="button" role="option" data-axpick="${k}"
            aria-selected="${state[key] === k}">${x.label}</button>`).join("")}
        <div class="axmsep"></div>
        <button type="button" class="axbold" data-axbold aria-pressed="${state.axBold}">
          ${state.axBold ? "\u2713 " : ""}Draw the axes boldly</button>
      </div>`;
  };
  xw.innerHTML = lab("xAxis", false);
  yw.innerHTML = lab("yAxis", true);
  [xw, yw].forEach(w => wireAxMenu(w));
  placeAxisMenus();
}

function wireAxMenu(w){
  const btn = w.querySelector("[data-axmenu]"), menu = w.querySelector(".axmenu");
  if(!btn || !menu) return;
  const key = btn.dataset.axmenu;
  btn.addEventListener("click", ev => {
    ev.stopPropagation();
    const open = menu.hidden;
    closeAxMenus();
    if(open){ menu.hidden = false; btn.setAttribute("aria-expanded", "true"); axOpen = menu; }
  });
  const tip = () => { const a = AXES[state[key]];
    return a && a.why ? `<h5>${a.label}</h5><p class="def">${a.why}</p>
      <span class="act">click to plot something else here</span>` : null; };
  ["mouseenter","mousemove"].forEach(e => btn.addEventListener(e, ev => {
    const t = tip(); t ? showTip(t, ev) : hideTip(); }));
  btn.addEventListener("mouseleave", hideTip);

  const bb = menu.querySelector("[data-axbold]");
  if(bb){
    const t = `<h5>Draw the axes boldly</h5><p class="def">Heavier rules, larger tick labels
      and a direction arrow on each axis \u2014 the chart treatment. Off, the axes recede to
      faint guides and the constructs carry the picture.</p>`;
    bb.addEventListener("click", ev => { ev.stopPropagation();
      state.axBold = !state.axBold; closeAxMenus();
      document.documentElement.classList.toggle("axbold", state.axBold);
      renderAxisMenus(); draw(); });
    bb.addEventListener("mouseenter", ev => showTip(t, ev));
    bb.addEventListener("mousemove", ev => showTip(t, ev));
    bb.addEventListener("mouseleave", hideTip);
  }
  menu.querySelectorAll("[data-axpick]").forEach(b => {
    b.addEventListener("click", ev => {
      ev.stopPropagation();
      state[key] = b.dataset.axpick;
      closeAxMenus();
      refresh(); syncPlot(); if(sim) sim.alpha(.75).restart();
    });
    const a = AXES[b.dataset.axpick];
    const t = a && a.why ? `<h5>${a.label}</h5><p class="def">${a.why}</p>` : null;
    if(t){ b.addEventListener("mouseenter", ev => showTip(t, ev));
           b.addEventListener("mousemove", ev => showTip(t, ev));
           b.addEventListener("mouseleave", hideTip); }
  });
}

function closeAxMenus(){
  document.querySelectorAll(".axmenu").forEach(m => { m.hidden = true; });
  document.querySelectorAll("[data-axmenu]").forEach(b => b.setAttribute("aria-expanded", "false"));
  axOpen = null;
}
/* Closing an axis menu on a click or Escape anywhere. Bound in boot(). */
function bootAxMenus(){
  addEventListener("click", () => { if(axOpen) closeAxMenus(); });
  addEventListener("keydown", e => { if(e.key === "Escape" && axOpen) closeAxMenus(); });
}

function placeAxisMenus(){
  document.documentElement.classList.toggle("axbold", !!state.axBold);
  const yw = document.getElementById("ySelWrap");
  if(yw) yw.style.left = Math.max(6, Math.round(PL()) - 30) + "px";
}

/* THE PLOT BLOCK: READINGS FIRST, THE CONTROLS BEHIND MANUAL.
   ==========================================================================

   This showed four menus and then six presets, which asked a scholar to
   assemble a reading out of axis names before being told that six ready ones
   were underneath. The presets belong at the first level with Manual last,
   which also leaves room for readings where the axes are not used at all.

   So: the presets are the block, and Manual is the last of them. Manual opens
   the layout choice and the four menus, and in a layout without axes the X
   and Y menus go away in the panel and on the map, because an axis menu
   governing nothing is a control that lies.

   WHICH BUTTON IS LIT. A preset, when the layout is Axes and both axes match
   it. Manual, when it was pressed, or when nothing else matches -- a scenario
   saved in Network, or with axes no preset holds. Whether Manual is OPEN is
   not saved: it follows from that rule, plus the press. */
let manualOn = false;
const presetLit = () => (state.layout || "axes") === "axes" &&
  PRESETS.find(q => state.xAxis === q.x && state.yAxis === q.y);
/* Clusters is a preset of its own now, so Manual does not claim the row when
   it is lit: the two boxes are alternatives and only one is open. */
const manualOpen = () => (state.layout || "axes") !== "clusters" &&
  (manualOn || !presetLit());
function plotBlock(){
  const lay = state.layout || "axes";
  const axed = lay === "axes";
  const menus = axed
    ? [["X axis", "xAxis"], ["Y axis", "yAxis"], ["Colour", "cBy"], ["Size", "sBy"]]
    : [["Colour", "cBy"], ["Size", "sBy"]];
  return `
   <div class="fld plotfld">
     <span class="ctl-label">Plot</span>
     <div class="presets">
       <!-- CLUSTERS FIRST, because it is what the step opens on. It is the reading that shows structure rather than
            scores, and on arrival the structure is what a scholar is looking
            for; the seven score readings follow it. -->
       <button type="button" data-clpreset="1"
         aria-pressed="${lay === "clusters"}" aria-expanded="${lay === "clusters"}"
         title="Group the constructs by the papers they share, and draw each group in its own region with a boundary round it. The settings appear below, like Manual's.">Clusters</button>
       ${PRESETS.map(q => `<button type="button" data-preset="${q.k}"
         aria-pressed="${presetLit() === q}">${q.n}</button>`).join("")}
       <button type="button" data-manual="1" class="manbtn"
         aria-pressed="${manualOpen()}" aria-expanded="${manualOpen()}">Manual</button>
     </div>
     ${lay === "clusters" ? comSetHTML() : ""}
     ${manualOpen() ? `<div class="manbox">
       <span class="movlab">Layout</span>
       <div class="modebar" role="group" aria-label="How the map is laid out">
         ${LAYOUTS.filter(x => x[0] !== "clusters").map(([k, n, why]) =>
           `<button type="button" data-layout="${k}" aria-pressed="${lay === k}"
           title="${hesc(why)}">${n}</button>`).join("")}
       </div>
       <div class="axgrid">
         ${menus.map(([lab, key]) => `<label class="axrow"><span class="movlab">${lab}</span>
           <select data-ax="${key}" aria-label="What the ${lab.toLowerCase()} shows">
             ${axOptions(state[key])}</select></label>`).join("")}
       </div>
       <p class="why">${axed
         ? `The X and Y menus are also on the map, on the axes themselves.`
         : `This layout uses no axes, so the X and Y menus are not shown here or on the map.
            Going back to <b>Axes</b> restores the two you had.`} <b>Hover a menu, a layout or
         a preset</b> for what it means.</p>
     </div>` : `<p class="why">Each of these is a reading of the same constructs.
       <b>Hover one</b> for what it shows, or open <b>Manual</b> to choose the axes, the
       colour and the size yourself, or a layout without axes.</p>`}
   </div>`;
}

/* The same four values appear in the panel, on the axes and on the presets. A
   change anywhere has to show up everywhere, or the controls disagree about
   what the map is showing. */
function syncPlot(){
  document.querySelectorAll("[data-ax]").forEach(el => { el.value = state[el.dataset.ax]; });
  document.querySelectorAll("[data-axmenu]").forEach(b => {
    const a = AXES[state[b.dataset.axmenu]] || {label:""};
    const arrow = state.axBold && a.of
      ? (b.classList.contains("vert") ? " \u2191" : " \u2192") : "";
    b.innerHTML = `${a.label}${arrow}<span class="axcaret">\u25be</span>`;
  });
  document.querySelectorAll(".axmenu").forEach(m => {
    const key = m.dataset.axfor;
    m.querySelectorAll("[data-axpick]").forEach(b =>
      b.setAttribute("aria-selected", state[key] === b.dataset.axpick));
  });
  document.querySelectorAll("[data-preset]").forEach(b => {
    const q = PRESETS.find(x => x.k === b.dataset.preset);
    b.setAttribute("aria-pressed", !!q && presetLit() === q);
  });
  document.querySelectorAll("[data-layout]").forEach(b =>
    b.setAttribute("aria-pressed", (state.layout || "axes") === b.dataset.layout));
  document.querySelectorAll("[data-manual]").forEach(b => {
    b.setAttribute("aria-pressed", manualOpen());
    b.setAttribute("aria-expanded", manualOpen());
  });
}

function wirePlot(root){
  if(!root) return;
  const restart = () => { refresh(); syncPlot(); if(sim) sim.alpha(.75).restart(); };
  root.querySelectorAll("[data-ax]").forEach(sel => {
    const key = sel.dataset.ax;
    sel.addEventListener("change", () => { state[key] = sel.value; restart(); });
    const tip = () => { const a = AXES[state[key]];
      return a && a.why ? `<h5>${a.label}</h5><p class="def">${a.why}</p>` : null; };
    ["mouseenter","mousemove"].forEach(e => sel.addEventListener(e, ev => {
      const t = tip(); t ? showTip(t, ev) : hideTip(); }));
    sel.addEventListener("mouseleave", hideTip);
  });
  root.querySelectorAll("[data-preset]").forEach(b => {
    const q = PRESETS.find(x => x.k === b.dataset.preset); if(!q) return;
    /* A preset is a whole reading: the two axes AND the layout they are read
       on, because a preset chosen while the map has no axes would otherwise
       set two values nothing draws. It closes Manual, which is what makes the
       first level the first level. */
    b.addEventListener("click", () => {
      state.xAxis = q.x; state.yAxis = q.y; state.layout = "axes";
      manualOn = false;
      /* RENDERPANEL IS NOT ENOUGH, and this trap is easy to fall into twice.
         The panel lights the button it was told to light; the MAP's axis lines
         come from drawAxes and its axis labels from renderAxisMenus, both of
         which refresh() calls and renderPanel() does not. So a preset lit
         itself and the diagram kept the axes it had, which reads as the presets
         not working at all. The
         layout buttons below had the identical fault and were fixed there
         and not here, which is what a shared helper exists to
         prevent: `restart` is that helper and this is what it is for. */
      renderPanel();
      restart();
      comRelease();
      if(sim){ sim.nodes(nodes); sim.alpha(.9).restart(); }
    });
    const tip = `<h5>${q.n}</h5><p class="def">${q.why}</p>
      <span class="act">${AXES[q.x].label} across \u00b7 ${AXES[q.y].label} up</span>`;
    b.addEventListener("mouseenter", ev => showTip(tip, ev));
    b.addEventListener("mousemove", ev => showTip(tip, ev));
    b.addEventListener("mouseleave", hideTip);
  });
  root.querySelectorAll("[data-clpreset]").forEach(b => {
    /* THE CLUSTERS PRESET. It is a whole reading like the others: a layout, no
       axes, and a grouping. It computes on arrival if nothing has been
       computed yet, because 28ms over the whole corpus is not worth a button
       press -- and the button is in the settings below anyway. */
    b.addEventListener("click", () => {
      state.layout = "clusters";
      manualOn = false;
      /* THE PRESET IS THE WHOLE-MAP READING, so it scopes to the whole map
         rather than inheriting whatever a pinned construct was clustered
         with: the whole map is clustered with nested levels, and only when this
         preset is pressed. It also matters for the levels: the
         neighbourhood of one construct collapses in a single Louvain pass and
         so has no hierarchy to offer, while the whole map has two rungs. The
         inspector's line re-scopes back to a construct. */
      if(COM.hub || !comReady()){ COM.hub = ""; comRun(lastView); }
      renderPanel();
      refresh(); syncPlot();
      comPlace();
      if(sim){ sim.nodes(nodes); sim.alpha(.9).restart(); }
      recentre();
    });
    b.addEventListener("mouseenter", ev => showTip(`<h5>Clusters</h5><p class="def">Group the
      constructs by the papers they share, each group drawn in its own region with a boundary
      round it. The settings appear below, like Manual's: what counts as a tie, how cohesive,
      which level of the hierarchy, and the ask that names them.</p>`, ev));
    b.addEventListener("mouseleave", hideTip);
  });
  root.querySelectorAll("[data-manual]").forEach(b => {
    /* Opening Manual changes nothing on the map: it shows what is already
       set. Closing it is only possible by choosing a preset, which is a
       change, so the button toggles open and the presets close it. */
    b.addEventListener("click", () => { manualOn = !manualOpen(); renderPanel(); });
    const tip = `<h5>Manual</h5><p class="def">Choose the axes, the colour and the size
      yourself, or a layout without axes.</p>`;
    b.addEventListener("mouseenter", ev => showTip(tip, ev));
    b.addEventListener("mouseleave", hideTip);
  });
  root.querySelectorAll("[data-layout]").forEach(b => {
    const row = LAYOUTS.find(x => x[0] === b.dataset.layout); if(!row) return;
    b.addEventListener("click", () => {
      if(b.disabled) return;
      state.layout = row[0];
      manualOn = true;
      /* THREE THINGS MOVE, and the first attempt moved only the first: the
         panel's own menus, then the MAP -- its axis lines come from drawAxes
         and its axis labels from renderAxisMenus, both of which refresh()
         calls and renderPanel() does not. Without the second the layout read
         as Network in the panel and as Axes on the diagram. */
      renderPanel();
      refresh(); syncPlot();
      /* The clusters layout SETS positions rather than pulling toward them,
         so entering it places every node and leaving it lets them go. */
      if(row[0] === "clusters") comPlace(); else comRelease();
      /* And the forces, which read the layout through axOn and axDomain. d3
         caches a target per node when a force initialises, so the simulation
         has to be re-initialised rather than merely restarted or every
         construct stays aimed at the axis position it had. */
      if(sim){ sim.nodes(nodes); sim.alpha(.9).restart(); }
      recentre();
    });
    const tip = `<h5>${row[1]}</h5><p class="def">${row[2]}</p>`;
    b.addEventListener("mouseenter", ev => showTip(tip, ev));
    b.addEventListener("mouseleave", hideTip);
  });
}

/* THE CLUSTER BLOCK'S CONTROLS. In the inspector, which is redrawn whenever
   anything is pinned, so these are rebound on every render rather than once.

   Every one of them recomputes rather than patching: the clustering is cheap
   on a neighbourhood of this size, and a block that showed clusters computed
   under ties the checkboxes no longer say would be the stalest kind of lie. */
/* BOTH HOSTS. The block is on step 1.2's panel and in the inspector, and a
   selector scoped to one of them leaves the other's buttons drawn and dead --
   which is the failure this file has a PANELS helper for. */
/* BOUND ONCE PER ELEMENT, AND THE MARK IS NOT IN THE DOM. wireCom is called
   from renderInsp AND from renderPanel, because the block lives in both hosts
   and either can redraw without the other; an element that survives one of
   those redraws was getting a second handler, so accepting a cluster merged
   it twice and wrote two lines into the record. tests/clusters.mjs caught it
   by counting them.

   The first fix used a data- attribute, which is the marker renderWorklist
   uses, and the page walk records every control's dataset keys -- so the mark
   became part of each control's recorded identity and the removal guard read
   it as the old control disappearing. A WeakSet holds the same fact and
   leaves the markup alone. */
const comWired = new WeakSet();
/* THE OVERLAY. One dialog, two ways in: the button in step 1.2's similarity
   block, and the line in the inspector for a single pinned construct. Wired
   the way openJoin is, because it is the same shape of thing -- proposals that
   become merges. */
function openCom(){
  const dlg = document.getElementById("comdlg");
  if(!dlg) return;
  const w = document.getElementById("comwhat");
  const O = COM.out;
  if(w) w.textContent = O
    ? `${O.clusters.length} cluster(s) over ${O.n} construct(s) of ` +
      (COM.hub ? "what one construct is linked to" : "the whole map") +
      ` · ${comMs()} · accepting one is a merge`
    : "nothing clustered yet";
  document.getElementById("combody").innerHTML = comListHTML(lastView);
  wireCom();
  if(!dlg.open) dlg.showModal();
}

function wireCom(){
  const Q = sel => [...document.querySelectorAll(
      "#insp " + sel + ", #pbody " + sel + ", #combody " + sel)]
    .filter(b => { if(comWired.has(b)) return false; comWired.add(b); return true; });
  const again = () => { comRun(lastView); renderInsp();
    if(state.layout === "clusters"){ comPlace(); if(sim) sim.alpha(.5).restart(); }
    draw(); renderPanel();
    const dlg = document.getElementById("comdlg");
    if(dlg && dlg.open) openCom(); };
  Q("[data-comopen]").forEach(b => b.addEventListener("click", () => {
    /* A button that carries data-comrun as well means nothing has been
       computed yet, so compute before showing an empty overlay. */
    if(b.hasAttribute("data-comrun") && !comReady()){
      COM.hub = b.dataset.comrun || "";
      comRun(lastView);
      renderPanel();
    }
    openCom();
  }));
  Q("[data-comrung]").forEach(b => b.addEventListener("click", () => {
    /* FREE: the ladder came out of the run, so a level is a redraw. */
    COM.rung = +b.dataset.comrung;
    comPick(lastView);
    if(state.layout === "clusters"){ comPlace(); if(sim) sim.alpha(.5).restart(); }
    renderPanel(); draw();
    if(document.getElementById("comdlg").open) openCom();
  }));
  Q("[data-comrun]").forEach(b => b.addEventListener("click", () => {
    COM.hub = b.dataset.comrun || "";
    COM.moving = "";
    comRun(lastView);
    if(state.layout === "clusters") comPlace();
    xlog("cluster", COM.hub ? "Clustered what a construct is linked to"
                            : "Clustered the whole map",
      (COM.out ? COM.out.clusters.length + " cluster(s) over " + COM.out.n +
        " construct(s), ties " + Object.entries(COM.ties).filter(e => e[1])
          .map(e => e[0]).join("+") + ", resolution " + COM.res
       : COM.err));
    renderInsp(); renderPanel(); draw();
  }));
  Q("[data-comtie]").forEach(b => b.addEventListener("change", () => {
    COM.ties[b.dataset.comtie] = b.checked;
    again();
  }));
  Q("[data-comres]").forEach(r => r.addEventListener("change", () => {
    COM.res = Math.min(3, Math.max(0.4, +r.value || 1));
    again();
  }));
  /* A NAME IS THE SCHOLAR'S AND IS RECORDED AS ONE. Written on blur, because
     the inspector is innerHTML and a redraw on every keystroke would take the
     caret with it. */
  Q("[data-comname]").forEach(i => i.addEventListener("blur", () => {
    const id = i.dataset.comname, was = COM.names[id] || "";
    const now = String(i.value || "").trim().slice(0, 80);
    if(now === was) return;
    if(now) COM.names[id] = now; else delete COM.names[id];
    xlog("cluster", "Named a cluster", now || "(name removed from " + id + ")");
    renderInsp();
  }));
  Q("[data-commove]").forEach(b => b.addEventListener("click", () => {
    COM.moving = COM.moving === b.dataset.commove ? "" : b.dataset.commove;
    /* THE ROWS LIVE IN THE OVERLAY NOW, so redrawing the inspector alone
       leaves the select nowhere: every one of these handlers has to refresh
       whichever surface is actually showing. */
    renderInsp();
    const d = document.getElementById("comdlg");
    if(d && d.open) openCom();
  }));
  /* ACCEPTING A CLUSTER IS A MERGE, through the door every merge goes
     through: an accepted cluster is merged in the language of the workbench.
     So this does not invent a third kind of object: it carries
     every member, calls makeGroup over their construct ids, and leaves the
     record a drag on the map leaves. Reversible the same way, and flagged the
     same way when it spans levels. */
  /* A PROPOSED NAME IS ACCEPTED ONE AT A TIME, and the sentence comes with
     it: the name goes on the map and the sentence is what a reader needs to
     judge whether accepting the cluster as one quantity would be wrong. The
     record says the name was proposed and by whom it was taken. */
  Q("[data-comname-ok]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset["comnameOk"];
    const pr = ((COM.ai && COM.ai.out) || []).find(x => x.id === id);
    if(!pr) return;
    if(pr.name) COM.names[id] = pr.name;
    if(pr.why) COM.descr[id] = pr.why;
    COM.ai = {out:(COM.ai.out || []).filter(x => x.id !== id),
              outside:COM.ai.outside, at:COM.ai.at};
    xlog("cluster", "Accepted a proposed name for a cluster",
      pr.name + (pr.why ? " \u2014 " + pr.why : "") + " \u2014 proposed by an LLM, taken by the scholar");
    renderInsp(); renderPanel(); draw();
    const d1 = document.getElementById("comdlg"); if(d1 && d1.open) openCom();
  }));
  Q("[data-comname-no]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset["comnameNo"];
    COM.ai = {out:((COM.ai && COM.ai.out) || []).filter(x => x.id !== id),
              outside:(COM.ai || {}).outside, at:(COM.ai || {}).at};
    renderInsp();
    const d2 = document.getElementById("comdlg"); if(d2 && d2.open) openCom();
  }));
  Q("[data-comtake]").forEach(b => b.addEventListener("click", () => {
    const c = ((COM.out && COM.out.clusters) || []).find(z => z.id === b.dataset.comtake);
    if(!c || c.members.length < 2) return;
    for(const id of c.members){
      const n = (lastView.allNodes || lastView.nodes || []).find(z => z.id === id);
      if(n) setCarryNode(n, true);
    }
    cpersist();
    makeGroup(c.ids || [], comLabel(c));
    xlog("cluster", "Accepted a cluster as a merge",
      comLabel(c) + " \u2014 " + c.members.length + " constructs the clustering proposed, " +
      "merged under one name" + ((c.levels || []).length > 1
        ? " ACROSS " + c.levels.length + " levels of analysis (" + c.levels.join(", ") + ")"
        : "") + "; proposed by the clustering, taken by the scholar");
    comRun(lastView);
    if(state.layout === "clusters") comPlace();
    renderInsp(); renderPanel(); draw();
    const d3 = document.getElementById("comdlg"); if(d3 && d3.open) openCom();
  }));
  Q("[data-commoveto]").forEach(sel => sel.addEventListener("change", () => {
    const node = sel.dataset.commoveto, to = sel.value;
    COM.moves[node] = to;
    COM.moving = "";
    xlog("cluster", "Moved a construct between clusters",
      node.replace(/-/g, " ") + " \u2192 " + (COM.names[to] || to) +
      " \u2014 the scholar's, against what was computed");
    again();
  }));
}

function renderMapPanel(){
  const el = document.getElementById("mapov"); if(!el) return;
  const modes = state.stage === 2 ? ["explore","group","carry"]
              : state.stage === 3 ? ["explore","carry"] : null;
  if(modes && state.tool === "group" && !modes.includes("group")) state.tool = "explore";
  // A step that offers no modes offers no selecting either. Without this, a
  // carry tool chosen on step 1.2 stayed armed on step 1.1, where a click would
  // then drop a construct with nothing on screen saying it could.
  if(!modes) state.tool = "explore";
  const N = lastView.nodes || [], E = lastView.links || [];
  const nCar = N.filter(n => n.carried).length;
  const yk = state.byLevel ? "level" : "none";

  el.innerHTML = `
    ${modes ? `<span class="movlab">A click on the map</span>
    <div class="modebar" role="group" aria-label="What a click does">
      ${modes.map(m => `<button type="button" data-mode="${m}"
        aria-pressed="${state.tool === m}">${MODE[m].label}</button>`).join("")}
    </div>
    <div class="seedrow">
      <span class="movlab">Select</span>
      <button type="button" data-seed="all">All</button>
      <button type="button" data-seed="none">None</button>
      <button type="button" data-seed="core">Largest set</button>
      ${state.stage === 3 ? `<button type="button" data-seed="pass">Clears both bars</button>` : ``}
      <button type="button" data-seed="invert">Invert</button>
      ${nCar && nCar < N.length
        ? `<button type="button" class="grow" data-seed="grow">Grow +1</button>` : ``}
      <span class="seedn">${nCar} of ${N.length}${state.stage === 3
        ? ` · ${E.filter(e => e.carried).length} of ${E.length} arrows` : ``}</span>
    </div>
    <div class="ovrule"></div>` : ``}`;

  el.querySelectorAll("[data-mode]").forEach(b => {
    const tip = MODE[b.dataset.mode].tip;
    b.addEventListener("click", () => setTool(b.dataset.mode));
    b.addEventListener("mouseenter", ev => showTip(tip, ev));
    b.addEventListener("mousemove", ev => showTip(tip, ev));
    b.addEventListener("mouseleave", hideTip);
  });
  el.querySelectorAll("[data-seed]").forEach(b => {
    const tip = SEED_TIP[b.dataset.seed] || "";
    b.addEventListener("click", () => applyCarry(b.dataset.seed));
    b.addEventListener("mouseenter", ev => showTip(tip, ev));
    b.addEventListener("mousemove", ev => showTip(tip, ev));
    b.addEventListener("mouseleave", hideTip);
  });
}

function setTool(t){
  state.tool = t;
  document.querySelectorAll("#mapov [data-mode]").forEach(b =>
    b.setAttribute("aria-pressed", b.dataset.mode === t));
  if(t !== "group"){ picked.clear(); renderSelbar(); }
  draw();
  chint();
}

function tightWhy(){
  const el = document.getElementById("wTight"); if(!el) return;
  const t = state.tight;
  const msg = t <= 0.07 ? "Very loose. Almost any shared wording merges, and distinct quantities will be joined together."
    : t <= 0.13 ? "Loose. Picks up genuine synonyms and some false ones — worth scanning what it joined."
    : t <= 0.20 ? "Moderate. Roughly where shared wording stops being coincidence."
    : "Tight. Only near-identical wording merges, so most constructs stand alone.";
  /* The four readings above are calibrated on WORDING scores, where 0.15 is
     roughly where shared words stop being coincidence. They mean nothing about
     a formula somebody else wrote or about a model\u2019s judgement, so under
     those two the slider says what it is cutting instead of pretending to
     interpret it. */
  const say = SIM.m === "word"
    ? msg       // the sentence about rare words is in the (i) under the slider
    : SIM.m === "form"
    ? `Merging everything your formula scores <b>${state.tight.toFixed(2)}</b> or above. The
       readings this slider used to give are about wording scores and would be a guess here.`
    : `Merging every pair the model scored <b>${state.tight.toFixed(2)}</b> or above. A pair it
       was never asked about is unscored, so it stands alone whatever the slider says.`;
  el.innerHTML = say;
}

/* The two audiences, as settings of the three bars rather than as a mode. A
   preset is honest about what it is: a place to start from, that you can then
   move. Nothing about a claim's three scores changes with the reader. */
const BARSETS = [
  {k:"formal", n:"For a formal model",
   bar:{Comm:1, Spec:1, Evid:0},
   need:{Comm:{lvl:"req"}, Spec:{frm:"req"}, Evid:{}},
   why:"A functional form and a single level of analysis are made <b>required</b>: without them there is nothing to write down. Evidence is left open, because a model can be built on an asserted relation and say so."},
  {k:"empirical", n:"For an empirical study",
   bar:{Comm:0, Spec:0, Evid:1},
   need:{Comm:{lvl:"req", agg:"req"}, Spec:{}, Evid:{num:"req"}},
   why:"One level, no aggregation owed and a magnitude are made <b>required</b>: the two constructs have to be measurable together and something has to stand behind the relationship. Specification is left open, because a missing functional form is one you choose and defend, not a wall."},
  {k:"open", n:"Everything",
   bar:{Comm:0, Spec:0, Evid:0}, need:{Comm:{}, Spec:{}, Evid:{}},
   why:"Every component back to <b>optional</b> and every bar at zero. Nothing is faded, and the map shows the literature as it was extracted."}
];

/* A preset is lit only while both the bars and the standings still match it. */
function barsetOn(q){
  return ["Comm","Spec","Evid"].every(b => {
    if(state.bar[b] !== q.bar[b]) return false;
    const want = q.need[b] || {};
    return COMPONENTS[b].items.every(it =>
      (state.need[b][it.k] || "opt") === (want[it.k] || "opt"));
  });
}

function barSetTip(q){
  return `<h5>${q.n}</h5><p class="def">${q.why}</p>
    <span class="act">${["Comm","Spec","Evid"].map(b => {
      const r = Object.keys(q.need[b] || {}).length;
      return `${BARLAB[b].toLowerCase()} \u2265 ${q.bar[b]}${r ? ` +${r} required` : ""}`;
    }).join(" \u00b7 ")}</span>`;
}

/* Each bar is four separate things, and "3 of 4" treats them as
   interchangeable, which they are not: a relationship across two levels of
   analysis is a different problem from an unordered scale. So each component
   carries a standing —

     required   the claim must satisfy it, or it fails whatever else it has
     optional   the slider's pool: at least N of these must hold
     ignored    not looked at, and not in the denominator either

   The slider ranges over the optional ones alone — a required component is
   already a gate, and an ignored one is not in the question. Three is the
   complete set for a filter: must have, counts, ignore. A fourth ("must NOT
   have") has no use here — nothing in these twelve is a defect you would
   insist on.

   The corpus records two of the bars as costs, so a cost label present means
   the component FAILED; for evidence a label present means it HELD.         */
/* THE TWELVE COMPONENTS AND THE THREE BARS ARE core/curate.js NOW, because
   `amg curate` asks the same questions of the same corpus without a browser,
   and two implementations of "does this claim clear the bars" would be two
   answers. What is left here is the join: the live stores, as the decisions
   object those functions take. */
const barMax = bar => cBarMax(bar, state.need);
const barPasses = (c, bar, over) => cBarPasses(c, bar, decisionsNow(), over);
const claimPasses = (c, over) => cClaimPasses(c, decisionsNow(), over);
const claimKept = c => cClaimKept(c, decisionsNow());

/* EVERY CURATION DECISION, AS PLAIN DATA. The page keeps these in nine stores
   because each is edited in a different place; core/ wants them in one object
   because a function that takes a store cannot be run anywhere else. This is
   the only place that knows both, and it is also exactly what a scenario file
   carries -- which is why `amg curate` can assemble the same object from one. */
function decisionsNow(){
  return {
    outlets:state.jr, tradition:state.ap, minp:state.minp, admit:state.admit,
    tight:state.tight, collapse:state.collapse,
    apart:(typeof apart !== "undefined" ? apart : new Set()),
    groups:[...groups.values()],
    bar:state.bar, need:state.need, apply:state.apply,
    ev:state.ev, sgn:state.sgn,
  };
}

const BARLAB = {Comm:"Commensurability", Spec:"Specification", Evid:"Evidence"};

/* Each bar scores a field; two of those fields also have a value worth picking.
   `epistemic_status` is the one field two of Evidence's four components read, and
   `sign` is the field Specification's fourth reads — so the picker sits in the
   bar that already reads it, rather than in a block of its own. The bar asks how
   much of the field is settled; the picker says which value. Commensurability
   has no such field: level, units and time structure are all pairs, not values. */
const PICK = {
  Spec: {id:"cSgn", lab:"Direction", aria:"Direction of the relationship",
    opts:[["all","Any direction"], ["positive","Positive"], ["negative","Negative"],
          ["none","Null — looked for, not found"], ["mixed","An arrow whose relationships differ"]],
    why:`The same field as <b>direction stated</b> above, which asks only whether a direction
      is given. A null is a value like any other here, so it is kept rather than dropped.`},
  Evid: {id:"cEv", lab:"Basis", aria:"Basis of the relationship",
    opts:[["all","Any basis"], ["asserted","Asserted — nothing estimated behind it"],
          ["derived","Derived inside a formal model"],
          ["estimated","Estimated from the paper's own data"],
          ["reported","Relayed — somebody else's finding"]],
    why:`The same field as <b>estimated from data</b> and <b>first-hand</b> above, which ask
      only how far it goes. Every relationship carries exactly one of the four.`}
};

/* The relations a model declares, imported. They are not from this corpus: a
   model is built on a source of its own, and what arrives here is its list of
   relations together with what this literature turns out to have behind each
   one -- a claim running the length of the relation, a chain of at most three
   joining its ends, or nothing. That is why it is an import on step 2.1 rather
   than a control on step 1.3: step 1.3 weighs the claims this corpus makes,
   and none of these is one of them. Selecting a relation puts it in the
   decisions below, an unsupported one included, because a model carrying a
   relation the literature never asserts should say so rather than let the
   silence pass. */
const RELKIND = {
  arrow:       ["asserted",    "the corpus states this relationship end to end"],
  path:        ["composed",    "no single relationship states it, but a short chain of them joins its ends"],
  unsupported: ["unsupported", "no relationship and no short chain — the model needs it anyway"]
};
const relName = id => id.replace(/_/g, " ");

/* A decision is asked in the step that caused it. A merge is made on step 1.2,
   so a merge that joined a stock to a flow is answered on step 1.2, with the
   tightness that proposed it on screen and movable. Step 2.1 was asking all of
   them, which made it a second opinion on work already done rather than the
   step after it. What is left there is what only exists once a model has run. */
function stepWork(n){
  const open = (lastView.openBy || {})[n] || 0;
  return `
   <div class="row" style="margin-top:17px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="phdr">
         <button type="button" class="pfold" data-wlfold="${n}"
                 aria-expanded="${state.wlOpen[n]}">
           <span class="caret">${state.wlOpen[n] ? "\u25be" : "\u25b8"}</span>
           <span class="ctl-label">Flagged at this step</span></button>
         <span class="pcount">${open ? `<b>${open}</b> to look at` : "nothing flagged"}</span>
       </div>
       ${state.wlOpen[n] ? `
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">What you do on this step is already a decision and the record carries
         it — a merge you make, a construct you deselect, a bar you move. Nothing here asks
         you to confirm any of that. These are the other kind: something a setting or the
         corpus did that you have not ruled on.</span></p>
       <div class="seg" role="group" aria-label="Which decisions to show" data-wl="${n}">
         <button type="button" data-f="open">Open</button>
         <button type="button" data-f="done">Answered</button>
         <button type="button" data-f="all">Everything</button>
       </div>
       <div id="wl${n}"></div>` : ""}
     </div>
   </div>`;
}

/* Where a second literature arrives. The addition that extends a model has to
   be drawn from a literature rather than invented -- that is the whole claim of
   the step -- so the import is the first task and not a convenience. Nothing is
   wired: the second stream is declared in the header and has no corpus yet, and
   a button that pretended otherwise would be the one lie this page cannot
   afford. */
function barField(bar){
  const max = Math.max(1, barMax(bar));
  const v = Math.min(state.bar[bar], max);
  return `
   <div class="fld">
     <span class="ctl-label">${BARLAB[bar]} <span class="whyi" id="w${bar}"></span></span>
     <div class="comps" id="k${bar}">
       ${COMPONENTS[bar].items.map(it => `<div class="comp">
         <span class="cname">${it.lab}</span>
         <span class="cstand" role="group" aria-label="${it.lab}">
           ${STANDING.map(([k, t]) => `<button type="button" data-comp="${bar}:${it.k}:${k}"
             aria-pressed="${(state.need[bar][it.k] || "opt") === k}"
             title="${t}">${k}</button>`).join("")}
         </span></div>`).join("")}
     </div>
     <div class="minbar">
       <span class="mblab">and at least</span>
       <input type="range" class="mbslide" id="c${bar}" min="0" max="${max}" step="1" value="${v}"
              aria-label="How many optional ${BARLAB[bar].toLowerCase()} components a relationship must satisfy">
       <span class="sv" id="v${bar}">${v} of ${max}</span>
       <span class="applyset">
         <span class="mblab">what fails</span>
         <span class="cstand" role="group" aria-label="What happens to a relationship that fails">
           <button type="button" data-apply="dim" data-bar="${bar}"
             aria-pressed="${state.apply[bar] === "dim"}" title="fade">fade</button>
           <button type="button" data-apply="filter" data-bar="${bar}"
             aria-pressed="${state.apply[bar] === "filter"}" title="hide">hide</button>
         </span></span>
     </div>
     <div id="t${bar}"></div>
     ${PICK[bar] ? `<div class="pick">
       <span class="ctl-label">${PICK[bar].lab} ${infold(PICK[bar].why)}</span>
       <select id="${PICK[bar].id}" aria-label="${PICK[bar].aria}">
         ${PICK[bar].opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}
       </select>
       </div>` : ""}
   </div>`;
}

function barWhy(){
  const sp = document.getElementById("wSpec"), cm = document.getElementById("wComm"),
        ev = document.getElementById("wEvid");
  ["Comm", "Spec", "Evid"].forEach(b => {
    const max = Math.max(1, barMax(b));
    if(state.bar[b] > max) state.bar[b] = max;
    const sl = document.getElementById("c" + b), rd = document.getElementById("v" + b);
    if(sl){ sl.max = max; sl.value = state.bar[b]; }
    if(rd) rd.textContent = `${state.bar[b]} of ${max}`;
  });
  if(sp) sp.innerHTML = infold(`The papers settled this much about the <b>form</b> of the
    relationship: its functional form, how several antecedents combine, any moderator, the
    direction. At four, nothing about the form is left for you to invent.`);
  if(cm) cm.innerHTML = infold(`The two constructs a relationship joins already agree this far
    on <b>level, units and time structure</b>. At four nothing is owed, and this is the bar
    that binds a modeller and an empiricist alike.`);
  if(ev) ev.innerHTML = infold(`Something <b>stands behind</b> the relationship: a magnitude,
    estimated from the paper's own data, first-hand, scope stated. It measures what is there
    to check, not whether the relationship is true.`);
  barStats("Spec"); barStats("Comm"); barStats("Evid");
  const iso = document.getElementById("isoN");
  if(iso) iso.innerHTML = `<b>${lastView.isoCount}</b>&nbsp;isolated&nbsp;` + infold(
    `${lastView.isoCount} of the constructs selected on step 1.2 carry no relationship to or from ` +
    `another one. They cannot hold a relation, so hiding them clears the map without ` +
    `changing what step 1.2 passed on.`);
  // a preset stays lit only while the bars still match it
  document.querySelectorAll("[data-barset]").forEach(b => {
    const q = BARSETS.find(x => x.k === b.dataset.barset);
    b.setAttribute("aria-pressed", !!q && barsetOn(q));
  });

}

/* What one notch of a bar costs, in arrows, holding the other two where they
   are. Same shape as the occurrence threshold on step 1.1. */
function barStats(which){
  const el = document.getElementById("t" + which); if(!el) return;
  const E = lastView.links || [];
  const at = v => E.filter(e => e.claims.some(c =>
    claimPasses(c, {[which]: v}))).length;
  const t = state.bar[which], max = Math.max(1, barMax(which)), now = at(t);
  const rows = [t - 1, t, t + 1].filter(x => x >= 0 && x <= max);
  const op = "≥";
  el.innerHTML = `<table class="mstat"><tbody>${rows.map(x => {
    const n = at(x), d = n - now;
    return `<tr class="${x === t ? "now" : ""}"><td>${op} ${x}</td>
      <td class="num">${n}</td>
      <td class="num hint">${x === t ? "arrows pass" : `${d > 0 ? "+" : ""}${d}`}</td></tr>`;
  }).join("")}</tbody></table>`;
}



export { axOpen, axOptions, barField, BARLAB, barMax, barPasses, barScore, barsetOn, BARSETS, barSetTip, barStats, barWhy, blockOf, BLOCKS, bootAxMenus, carryEmpty, claimKept, claimPasses, closeAxMenus, COMPONENTS, decisionsNow, goStage, HANDOFF, holds, homeIn, homeOn, litCapHTML, LOOPTIP, MODE, NOTEHOST, on, PICK, placeAxisMenus, plotBlock, RELKIND, relName, renderAxisMenus, renderFoot, renderMapPanel, renderPanel, renderTrack, SEED_TIP, setTool, stageOf, STANDING, stepNo, stepWork, syncPlot, tightenNotes, tightWhy, wayOut, wire, wireAI, wireAxMenu, wireClaims, wireCom, wireComposition, wireConstructs, wireEveryStep, wireJoinStep, wireLitBar, wirePlot, wirePlotStep, wireQuantities, wireScopeStep, wireStatics };

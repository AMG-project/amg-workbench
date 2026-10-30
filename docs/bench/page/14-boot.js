/* AMG bench, page script 15 of 22: boot -- the statements that start the page.
   One shared global scope, loaded in order. See page/README.md. */
import { hesc } from "../core/safe.js";
import { EXP, EXPSETS } from "../core/expset.js";
import { OP, VAR } from "../core/kernel.js";
import { reviewChecks } from "../core/checks.js";
import { xrunClause } from "../core/verdict.js";
import { ARITH, READ, aiCap, aloadLocal, buildArith, classSpec, keySet, xloadLocal } from "./08-ask.js";
import { BOARD, GUIDE, boardLoad, boardSave, derivedClaims, renderGuide, resultsFile, wireGuideFab, xlog } from "./05-explore.js";
import { BUF, PROPS, bufPush, tloadLocal } from "./09-derive.js";
import { G } from "../graph-data.js";
import { H, PB, PL, PR, PT, W, axDomain, axFrac, axOn, axesOn, bootArrows, bootMap, bootSvg, chint, draw, fitNodes, hideTip, lastView, links, mapFS, mapSet, nodes, openMarks, rOf, recentre, renderInsp, renderTally, showTip, sim, size, svg, tickOnce, xAt, yAt, zoomBy } from "./13-map.js";
import { fsMark, fsOn, fsToggle } from "../fullscreen.js";
import { COM, comCount, comOf, comRun } from "./22-communities.js";
import { JALL, N, noteFail, picked, state } from "./03-stores.js";
import { projectEmpty, scenFreshTake, scenOpenDefault, snapBlank, DEMO_FILE, MODEL_FILE, PROV, bootScenario, hload, renderScen, scen, scenCur, scenDemo, scenFrom, scenGo, scenId, scenLoad, scenOpenFile, scenPull, scenPullList, scenPush, scenFile, scenWrite, snapApply, snapNow } from "./17-scenarios.js";
import { SEEDED, answOf, cloadLocal, cloadLocal2, compLoad, dispOf, dropped, dloadLocal, floadLocal, gloadLocal, groups, mloadLocal, sloadLocal, spec, vloadLocal, vtype } from "./03b-decisions.js";
import { STAGES, renderHandover } from "./04-stages.js";
import { WS, wsLoad } from "./18-workspace.js";
import { XRUN, xrunBox, xrunGo } from "./21-exprun.js";
import { exportRecord, exportStream, proofOf, recordFile, relationIds, relationOf, streamFile } from "./23-exchange.js";
import { BRIDGE, bridgeHello } from "./28-bridge.js";
import { IMPM, impAdd, impCorpus, impLoad, impPlace, impRead } from "./29-models.js";
import { reportMarkdown, reportNow } from "./31-report.js";
import { tourFollow, tourOn } from "./30-tour.js";
import { DEP, depLoad, depState, depositBundle, depositMd } from "./26-deposit.js";
import { LIT, litApply, litCount, litList, litLoad, litMode, litNow, litOf } from "./27-streams.js";
import { NB, nbLoad, nbMarkdown } from "./25-notebook.js";
import { barWhy, blockOf, bootAxMenus, homeIn, homeOn, renderAxisMenus, renderFoot, renderMapPanel, renderPanel, renderTrack, tightWhy, wayOut } from "./06-wiring.js";
import { bootApart, exportPass, exportScen, renderPass, renderWorklist } from "./16-worklists.js";
import { bootSeed, bootStore, build, corpusLoad, inScope, minpStats, okPaper, renderPapers } from "./03c-corpus.js";
import { expLoad, expSlotsNow } from "./20-expset.js";
import { famLoad, famOf } from "./10-depends.js";
import { kindOf, renderClaimList, wireClm, wireCon, wireDomain, wireVar } from "./12-claims.js";
import { renderSelbar, renderStepCard } from "./07-grouping.js";
import { reviewState } from "./19-review.js";
import { simLoad } from "./03d-similarity.js";
import { varName, wireFams, wireJoin } from "./11-classes.js";
import { worklist } from "./15-deposit.js";
/* ----------------------------------------------------------------- boot */
/* THE CLUSTERS LAYOUT: each cluster pulled to its own cell of a grid, with
   everything the clustering never considered in a cell of its own at the end.
   Arrows are still drawn and there are no axes, which is the layout's whole
   claim: what you see is which constructs were read as belonging together.

   A cell rather than a hull, because a hull already means a merge on this
   map and a cluster is a reading. */
const onClusters = () => state.layout === "clusters" && comCount() > 0;
/* A number in [0, 1) from a name, so an angle is a fact about the construct
   rather than about the order it arrived in. */
function spin(id){
  const t = String(id || "");
  let h = 0;
  for(let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 100003;
  return h / 100003;
}
/* PLACED, NOT PULLED.
   ==========================================================================

   This was a force: a target per cluster and a strength that competed with
   the springs, the charge and the collide. It took four tries and none of
   them was reproducible. The simulation settled into one of exactly two
   stable arrangements depending on where it started -- three runs in six
   landing 240px from the ring -- and every strength that fixed one case broke
   another. Tuning a simulation until it usually looks right is not a layout.

   So the positions are SET. In the clusters layout every node gets fx and fy,
   which d3 honours absolutely: the hub in the middle, each cluster on a ring
   around it, each cluster's own members on a small ring of their own in
   sorted order, and everything the clustering never considered on an outer
   ring at an angle hashed from its name. Nothing is left for the simulation
   to decide, so the picture is the same on every machine and on every open --
   which is the reproducibility this artifact is for, not a nicety of the
   diagram. Arrows are still drawn across it.

   Leaving the layout clears fx and fy, or the map would stay frozen in a
   shape nobody asked for. */
function comPlace(){
  if(!onClusters()) return;
  const K = comCount();
  const cls = (COM.out && COM.out.clusters) || [];
  const cx = W / 2, cy = H / 2;
  for(const n of nodes){
    if(COM.hub && n.id === COM.hub){ n.fx = cx; n.fy = cy; continue; }
    const i = comOf(n.id);
    if(i == null){
      const a = spin(n.id) * 2 * Math.PI;
      n.fx = cx + Math.cos(a) * W * 0.46;
      n.fy = cy + Math.sin(a) * H * 0.45;
      continue;
    }
    const g = comCell(n);
    const gx = g.x, gy = g.y;
    const mem = cls[i].members;
    const j = mem.indexOf(n.id), m = Math.max(1, mem.length);
    const r = m === 1 ? 0 : Math.min(62, 16 + m * 7);
    const b = (j / m) * 2 * Math.PI;
    n.fx = gx + Math.cos(b) * r;
    n.fy = gy + Math.sin(b) * r;
  }
}
function comRelease(){
  for(const n of nodes){ delete n.fx; delete n.fy; }
}
/* ONLY THE CLUSTERED GET A CELL. The first build gave the unclustered one too,
   which on step 1.2 meant 143 constructs piled into a quarter of the map: the
   collide force out of that pile pushed the clusters out of their own cells
   and the means came back at 550, 753 and 570 where the targets were 254, 761
   and 254. Everything outside the clustering now falls through to the weak
   centre pull and is drawn faint, so the clusters have the canvas and the rest
   reads as the background it is. */
/* The declared centre of whatever a node belongs to: the hub in the middle,
   a cluster on the inner ring, anything outside on the outer one. comPlace
   reads it, and tests/clusters.mjs reads it to say where a construct ought to
   be before looking at where it is. */
function comCell(d){
  if(!onClusters()) return null;
  const id = d && d.id;
  if(COM.hub && id === COM.hub) return {x:W / 2, y:H / 2};
  const i = comOf(id);
  const K = comCount();
  if(i == null){
    const a = spin(id) * 2 * Math.PI;
    return {x:W / 2 + Math.cos(a) * W * 0.46, y:H / 2 + Math.sin(a) * H * 0.45};
  }
  const A = (i / K) * 2 * Math.PI - Math.PI / 2;
  return {x:W / 2 + Math.cos(A) * W * 0.30, y:H / 2 + Math.sin(A) * H * 0.30};
}


function refresh(){
  /* WHICH CORPUS G SHOULD BE, before anything reads it. Block 1 runs once per
     literature, so there G is the literature being curated; from block 2 on,
     the join needs both vocabularies on one map, so G is every curated
     literature at once. `lit:true` on block 1 in BLOCKS is the flag.

     Here rather than in goStage, because a step is arrived at from more places
     than that one: restoring a scenario, a harness setting state.stage, the
     page walk. Asked once, before build(), so no reader of G ever sees the
     wrong one. With a single literature it does nothing at all, which is the
     state every existing scenario is in. */
  litMode(!blockOf(state.stage).lit);
  // the page itself: a panel that shrinks for an instant lets the browser clamp
  // the window scroll, and the reader lands back at the top of the page
  const zy = window.scrollY;
  const v = build();
  const papersIn = new Set();
  G.claims.forEach(c => { if(okPaper(c.p)) papersIn.add(c.p); });
  Object.keys(G.papers).forEach(s => { if(okPaper(s)) papersIn.add(s); });
  mapSet({view:{
    papersIn: papersIn.size,
    claimsIn: G.claims.filter(c => okPaper(c.p)).length,
    constructsIn: G.nodes.filter(inScope).length,
    notions: v.totalNotions,
    arrows: v.links.length,
    strong: v.links.filter(e => e.pass).length,
    /* Borsboom et al.'s first step asks for phenomena that are well established;
       this is the least that can count as one, and it is the number a merge is
       capable of raising. It is the claim list's own test, so the chevron and
       the badge cannot disagree: more than one paper, and a value every one of
       them asserts. */
    corrob: v.links.filter(e => kindOf(e.claims.map(c => ({c}))) === "co").length,
    // What step 1.3 has, computed from the unnarrowed world so it reads the
    // same from every step. The chevron used to show v.links, which is the
    // CURRENT view: 164 arrows while standing on step 1.2 and 1.3 while standing
    // on step 1.3, the same label meaning two different things, so arriving
    // at step 1.3 looked as though the arrows had just been thrown away.
    ...(() => { const live = new Set(v.allNodes.filter(n => n.carried).map(n => n.id));
      const at3 = v.allLinks.filter(e => live.has(e.source) && live.has(e.target));
      /* The second order, on the SAME basis as the three above: claims whose
         both ends are carried. ANSWSTAT counts the whole corpus, which is a
         different denominator, and putting the two on one line would read as
         one. */
      const cl3 = at3.flatMap(e => e.claims || []);
      return {arrows3: at3.length,
              strong3: at3.filter(e => e.pass).length,
              corrob3: at3.filter(e => kindOf(e.claims.map(c => ({c}))) === "co").length,
              answ3: cl3.filter(c => answOf(c.id).length).length,
              disp3: cl3.filter(c => dispOf(c.id).length).length}; })(),
    isoCount: v.isoCount,
    decisions: groups.size + (state.jr.size !== JALL.size ? 1 : 0) +
               (state.ap !== "all" ? 1 : 0) + (state.minp !== 2 ? 1 : 0) +
               (state.tight !== 0.15 ? 1 : 0) +
               ["Comm","Spec","Evid"].filter(b => state.bar[b] !== 0).length +
               (state.ev !== "all" ? 1 : 0) +
               (state.sgn !== "all" ? 1 : 0) + (state.core ? 1 : 0),
    open: 0,
    // the worklist nominates from the graph itself, not from these counts.
    // allNodes and allLinks are the world before this step narrowed it, which
    // is what "a construct you did not carry" has to be looked for in.
    nodes: v.nodes, links: v.links, allNodes: v.allNodes, allLinks: v.allLinks
  }});
  // worklist() lives in a later script block; at first paint it is not yet there
  if(typeof worklist === "function"){
    try{
      const wl = worklist(lastView);
      lastView.open = wl.filter(x => !x.answered).length;
      lastView.openBy = {0:0, 1:0, 2:0, 3:0};
      wl.filter(x => !x.answered).forEach(x =>
        lastView.openBy[x.nom.from] = (lastView.openBy[x.nom.from] || 0) + 1);
      mapSet({open:{n:new Set(), e:new Set()}});
      wl.filter(x => !x.answered).forEach(x => {
        (x.nodeIds || []).forEach(i => openMarks.n.add(i));
        (x.linkIds || []).forEach(i => openMarks.e.add(i));
      });
    /* computation inside a render, and the one the handoff calls the worst:
       the open counts and the map's marks come from here, so a failure left
       the worklist showing nothing and the map unmarked with no sign that
       anything had gone wrong. Recorded, and renderWorklist draws one line
       instead of an empty panel. */
    }catch(e){ lastView.wlErr = String((e && e.message) || e);
      noteFail("the worklist", e); }
  }

  // keep positions across rebuilds so the map does not jump
  const prev = new Map(nodes.map(n => [n.id, n]));
  mapSet({nodes:v.nodes.map(n => { const o = prev.get(n.id);
    return o ? Object.assign(n, {x:o.x, y:o.y, vx:o.vx, vy:o.vy}) : n; })});
  mapSet({links:v.links});

  if(!sim){
    mapSet({sim:d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance(d => 52 + d.claims.length * 2)
        .strength(.32))
      .force("charge", d3.forceManyBody().strength(() => axesOn() ? -62 : -205))
      .force("collide", d3.forceCollide(d => rOf(d) + 10))
      .force("x", d3.forceX(d => {
        const f = axFrac(state.xAxis, d, axDomain(state.xAxis, nodes));
        return f == null ? (axesOn() ? (PL() + PR()) / 2 : W / 2) : xAt(f); })
        .strength(() => axOn(state.xAxis) ? .5 : .045))
      .force("y", d3.forceY(d => {
        const f = axFrac(state.yAxis, d, axDomain(state.yAxis, nodes));
        return f == null ? (axesOn() ? (PT() + PB()) / 2 : H / 2) : yAt(f, state.yAxis); })
        .strength(() => axOn(state.yAxis) ? .55 : .045))
      .on("tick", tickOnce)});
  }else{
    sim.nodes(nodes);
    sim.force("link").links(links);
    sim.alpha(.55).restart();
  }

  recentre();
  draw();
  renderTally(lastView);
  renderMapPanel();
  renderAxisMenus();
  renderStepCard();
  if(state.hoffOpen) renderHandover();
  renderTrack(lastView);
  wireGuideFab();
  renderGuide();
  renderFoot(STAGES.find(x => x.n === state.stage));
  const s = STAGES.find(x => x.n === state.stage);
  renderPapers();
  if(s.key === "notion") minpStats();
  if(state.recOpen) renderPass();
  // the step's own list moves with the step's own settings, which is why it is
  // redrawn here and not only when the panel is rebuilt
  // the model's own nominations are step 3.1's; a step with no host is a no-op
  if(typeof renderWorklist === "function")
    renderWorklist(s.key === "plot" ? 0 : s.n);
  // the claims being handed on, from step 1.3 where they start being chosen
  const cf = document.getElementById("clfoot");
  if(cf){
    // step 2.1 carries the same list inside the building blocks, full width;
    // rendering it here as well would put it on screen twice
    // and not under step 3.1 or 4.1: there the object is the model's own
    // conclusions, and the claims that produced them were settled three steps ago
    cf.hidden = state.stage < 3 || state.stage === 4 || state.stage >= 6;
    if(!cf.hidden) renderClaimList("clfoot");
  }
  if(s.key === "notion"){ renderSelbar(); tightWhy(); }
  if(s.key === "carry") barWhy();
  chint();
  if(window.scrollY !== zy) window.scrollTo(0, zy);
  for(const fn of REFRESHED){
    // one hook failing is not the others' problem, and not the render's
    try{ fn(); }catch(e){ noteFail("an after-refresh hook", e); }
  }
}

/* WHAT RUNS AFTER A REFRESH, as a list rather than a reassignment.

   17-scenarios.js used to wrap this function -- `const refreshOnly = refresh;
   refresh = function(){ ... }` -- so that every control that refreshes also
   auto-saves the scenario. That was the last of the sixteen assignments to a
   name another file declares, and the one an imported binding makes outright
   impossible: you can mutate what an import points at, never rebind it.

   A list instead. The owner calls the hooks and the hooks say nothing about
   each other, which is also why one of them throwing is recorded rather than
   taking the render down with it. */
const REFRESHED = [];
function onRefresh(fn){ if(typeof fn === "function") REFRESHED.push(fn); }

/* What is left here is what belongs to no single step: the decision record and
   the pass export. The literature selector and the three actions on it moved
   into block one, where the steps that read a literature are -- and because
   that bar is redrawn on every refresh, its tooltips are wired per render in
   wireLitBar rather than once here. */
/* EVERYTHING THIS FILE USED TO DO WHILE IT LOADED, in one function.

   Three immediately-invoked blocks and eight calls, all of them reaching into
   the map, the tooltip and seven other files. `make modules-map` reports eight
   reads here that would throw once evaluation order came from the import
   graph: H, W and svg from 13-map.js, and hideTip reached through tip() and
   z(). Nothing is reordered -- the sequence below is the sequence the file
   had -- because the only claim this change makes is that the page does the
   same thing, and the walk's snapshot is what says so. */
function bootWiring(){
(function streams(){
  const tip = (el, html) => {
    el.addEventListener("mouseenter", ev => showTip(html, ev));
    el.addEventListener("mousemove", ev => showTip(html, ev));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("click", ev => { if(el.classList.contains("off")) ev.preventDefault(); });
  };
  /* The record: one button in the header opens it, and it is kept current while
     it is open, because every setting changes what it says. */
  /* A menu closes when something in it is used, and when you click away. Two
     cases, one listener for the page rather than one per menu. */
  if(!document.body.dataset.menuWired){
    document.body.dataset.menuWired = "1";
    document.addEventListener("click", ev => {
      const pop = ev.target.closest && ev.target.closest(".menupop");
      document.querySelectorAll("details.menu[open]").forEach(d => {
        if(!d.contains(ev.target) || (pop && d.contains(pop))) d.open = false;
      });
    });
  }

  /* The scenario as a file, both ways. Import lands as a NEW scenario rather
     than over the one you are in: reading somebody else's decisions is not the
     same act as replacing your own. */
  const sv = document.getElementById("scenSave");
  if(sv && !sv.dataset.wired){
    sv.dataset.wired = "1";
    sv.addEventListener("click", ev => { ev.preventDefault(); exportScen(sv); });
  }
  const ps = document.getElementById("scenPush");
  if(ps && !ps.dataset.wired){
    ps.dataset.wired = "1";
    ps.addEventListener("click", async ev => {
      ev.preventDefault();
      const was = ps.textContent;
      ps.textContent = "saving\u2026"; ps.disabled = true;
      const r = await scenPush();
      ps.disabled = false;
      ps.textContent = r.ok ? "saved" : "cannot save here";
      if(r.err) ps.title = r.err;
      setTimeout(() => { ps.textContent = was; }, 2600);
    });
  }
  /* ONE WAY IN, USED BY THREE CONTROLS: the menu, the signpost over the steps
     and the toggle beside the scenario name. 17-scenarios.js owns the slot --
     whether this example is already open somewhere and should be switched to
     rather than copied -- and this owns what the page does once it is. */
  async function openExample(file, btn){
    const was = btn ? btn.textContent : "";
    if(btn) btn.textContent = "opening\u2026";
    const got = await scenOpenFile(file);
    if(got.err){
      if(btn){ btn.textContent = got.err; setTimeout(() => { btn.textContent = was; }, 4000); }
      return;
    }
    /* The label goes back BEFORE the render, not after: renderScen writes the
       toggle's own label from the state it is now in, and restoring the text
       afterwards put "Worked example" back over the "· on" it had just set. */
    if(btn) btn.textContent = was;
    /* INTO THE PROJECT, said rather than inferred. This used to need no
       saying: homeOn() hides the start page by itself once there is work to
       go back to, and opening an example is work. It needs saying now that a
       first arrival pins the start page open over the demonstration loaded
       behind it -- pinned, it stays pinned, and pressing a project's button
       drew the project behind a signpost the reader had just left. */
    wayOut();
    renderScen(); snapApply((scenCur() || {}).snap);
    /* Only on the first open: what a model proposed and a reader accepted is
       recorded once, and pushing it again on every visit would read as three
       sessions' worth of acceptances. */
    if(got.created && Array.isArray(got.o.provenance))
      for(const p of got.o.provenance) PROV.push(p);
    renderPanel(); refresh(); draw();
  }

  /* Two examples, neither needing anything of the host: the curation and the
     model. The second exists because starting from the model and reading the
     literature for what the model needs is the half the first does not show --
     including the three quantities it needs and no paper in either literature
     carries, which it says on each of them. */
  for(const [btn, file] of [["scenDemo", DEMO_FILE], ["scenModel", MODEL_FILE]]){
    const dm = document.getElementById(btn);
    if(!dm || dm.dataset.wired) continue;
    dm.dataset.wired = "1";
    dm.addEventListener("click", ev => { ev.preventDefault(); openExample(file, dm); });
  }

  /* The signpost's buttons press the menu's own, so there is one way of
     opening an example and not two. By id, because the page's scanner reads
     the scripts and not bench.html, so a `[data-open]` selector on static
     markup is indistinguishable to it from wiring left behind by a rename --
     and every other static control here is wired by id. */
  /* NEW PROJECT is not a project to open: it is this one, with the start page
     out of the way. Nothing is created, because creating a project for
     somebody who has declared nothing is how a store fills with empties.

     The id changed from `openEmpty` deliberately: a new project starts with no
     literature at all, and anything still pressing the old id expecting the
     purpose literature should fail loudly rather than walk a project it did
     not ask for. That has landed: `projectEmpty` applies a snapshot with no
     outlet ticked, through snapApply, which is the one path that replaces
     every store -- so nothing an earlier project declared survives into one
     that is meant to hold nothing. Step 1.1 draws nothing and the first act
     is to say which literature this is about. The shipped corpus is still one
     press away, under the demo projects. */
  { const e = document.getElementById("openNew");
    if(e) e.addEventListener("click", () => {
      projectEmpty();
      wayOut();
      state.stage = 1;
      refresh(); renderTrack(); renderPanel(); draw();
      window.scrollTo(0, 0);
    }); }
  /* THE WAY BACK. The start page is a view now rather than a banner that goes
     for good, so the wordmark returns to it from anywhere. Nothing is
     discarded: the scenario is where it was and the same button brings the
     work back. */
  { const h = document.getElementById("goHome");
    if(h && !h.dataset.wired){
      h.dataset.wired = "1";
      h.addEventListener("click", () => {
        if(homeOn()){ wayOut(); refresh(); renderTrack(); renderPanel(); draw(); }
        else homeIn();
        window.scrollTo(0, 0);
      });
    } }
  /* THE KEY, GIVEN AND TAKEN AWAY. Re-wired on every render because the
     section is innerHTML and which controls are in it depends on whether a
     model was already reachable. */
  { const sv = document.getElementById("keySave"), inp = document.getElementById("keyIn");
    if(sv && inp && !sv.dataset.wired){
      sv.dataset.wired = "1";
      const take = () => {
        if(!keySet(inp.value)) return;
        inp.value = "";
        /* aiCap() was cleared by keySet, so resolving it again is what makes
           every ask control appear. */
        aiCap().then(() => { renderTrack(); renderPanel(); });
      };
      sv.addEventListener("click", take);
      inp.addEventListener("keydown", ev => { if(ev.key === "Enter") take(); });
    } }
  { const dr = document.getElementById("keyDrop");
    if(dr && !dr.dataset.wired){
      dr.dataset.wired = "1";
      dr.addEventListener("click", () => {
        keySet(""); aiCap().then(() => { renderTrack(); renderPanel(); });
      });
    } }
  /* `openModel` is not on the start page: two near-identical buttons
     make a reader guess which to press, and the two-channel model is in the
     Menu under the demo projects. The pair is kept so the Menu's own ids stay
     the one path into an example. */
  for(const [from, to] of [["openDemo", "scenDemo"], ["openModel", "scenModel"]]){
    const b = document.getElementById(from);
    if(!b || b.dataset.wired) continue;
    b.dataset.wired = "1";
    b.addEventListener("click", () => {
      const t = document.getElementById(to);
      if(t) t.click();
    });
  }

  /* THE TWO SUBMENUS. One opens at a time, which is the convention and also
     stops a menu that is already tall from growing twice over. */
  { const subs = [["impHd", "impRows"], ["scenEgs", "egRows"], ["scenPull", "scenRows"]];
    const shut = except => subs.forEach(([b, r]) => {
      if(r === except) return;
      const rr = document.getElementById(r), bb = document.getElementById(b);
      if(rr) rr.hidden = true;
      if(bb) bb.setAttribute("aria-expanded", "false");
    });
    for(const [bid, rid] of [["impHd", "impRows"], ["scenEgs", "egRows"]]){
      const e = document.getElementById(bid), er = document.getElementById(rid);
      if(!e || !er || e.dataset.wired) continue;
      e.dataset.wired = "1";
      e.addEventListener("click", ev => {
        ev.preventDefault();
        const open = er.hidden;
        shut(null);
        er.hidden = !open;
        e.setAttribute("aria-expanded", String(open));
      });
    }
    window.__scenShut = shut;
  }
  const pl = document.getElementById("scenPull"), rows = document.getElementById("scenRows");
  if(pl && rows && !pl.dataset.wired){
    pl.dataset.wired = "1";
    pl.addEventListener("click", async ev => {
      ev.preventDefault();
      if(!rows.hidden){ rows.hidden = true; pl.setAttribute("aria-expanded", "false"); return; }
      if(window.__scenShut) window.__scenShut("scenRows");
      rows.hidden = false; pl.setAttribute("aria-expanded", "true");
      rows.innerHTML = `<p class="why" style="margin:4px 0">reading\u2026</p>`;
      const r = await scenPullList();
      if(r.err){ rows.innerHTML = `<p class="why" style="margin:4px 0">${hesc(r.err)}</p>`; return; }
      if(!r.rows.length){ rows.innerHTML = `<p class="why" style="margin:4px 0">Nothing in the store yet. <b>Save to the workbench</b> puts this one there.</p>`; return; }
      rows.innerHTML = r.rows.map(x => `<button type="button" class="tabbtn scenrow" data-pull="${hesc(x.id)}">
        <b>${hesc(x.name || "untitled")}</b>
        <i>step ${hesc(String(x.step || "?"))} \u00b7 ${x.merges || 0} merged \u00b7 ${
          x.declared ? x.declared + " declared" : "nothing declared"}${
          x.arithmetic ? " \u00b7 arithmetic" : ""}</i></button>`).join("");
      rows.querySelectorAll("[data-pull]").forEach(b => b.addEventListener("click", async e2 => {
        e2.preventDefault();
        b.textContent = "opening\u2026";
        const got = await scenPull(b.dataset.pull);
        if(got.err){ b.textContent = got.err; return; }
        const id = scenId();
        scen.list.push({id, name:(got.o.name || "from the workbench") + " (opened)", at:"",
          snap:got.o.snap});
        scen.active = id; scenWrite(); renderScen(); snapApply(got.o.snap);
        if(Array.isArray(got.o.provenance)) for(const p of got.o.provenance) PROV.push(p);
        rows.hidden = true;
        renderPanel(); refresh();
      }));
    });
  }
  const op = document.getElementById("scenOpen"), fin = document.getElementById("scenFileIn");
  if(op && fin && !op.dataset.wired){
    op.dataset.wired = "1";
    op.addEventListener("click", ev => { ev.preventDefault(); fin.click(); });
    fin.addEventListener("change", () => {
      const f = fin.files && fin.files[0];
      if(!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const r = scenLoad(String(rd.result || ""));
        fin.value = "";
        if(r.err){ alert("That file could not be read: " + r.err); return; }
        const msg = (r.warn && r.warn.length)
          ? "Read it anyway?\n\n" + r.warn.join("\n") : "";
        if(msg && !confirm(msg)) return;
        const id = scenId();
        scen.list.push({id, name:(r.o.name || "imported") + " (imported)", at:"",
          snap:r.o.snap});
        scen.active = id; scenWrite(); renderScen(); snapApply(r.o.snap);
        if(Array.isArray(r.o.provenance)) for(const p of r.o.provenance) PROV.push(p);
        xlog("scen", "Imported a project file",
          `written ${(r.o.at || "").slice(0, 10)} on bench ${(r.o.bench || {}).v || "?"}` +
          ((r.o.provenance || []).length ? `, ${r.o.provenance.length} accepted answers with it` : ""));
        refresh(); renderPanel();
      };
      rd.readAsText(f);
    });
  }

  /* ANOTHER MODEL, BESIDE THIS ONE. The same shape as the scenario import
     above and the opposite act: that one replaces your work with theirs, this
     one holds theirs next to yours. A reader of a published action model wants
     the second one, and until now the page offered only the first. */
  const im = document.getElementById("impModel"), imf = document.getElementById("impModelIn");
  if(im && imf && !im.dataset.wired){
    im.dataset.wired = "1";
    im.addEventListener("click", ev => { ev.preventDefault(); imf.value = ""; imf.click(); });
    imf.addEventListener("change", async () => {
      const f = imf.files && imf.files[0];
      if(!f) return;
      let got;
      try{ got = impRead(JSON.parse(await f.text())); }
      catch(e){ got = {err:"that file is not JSON this page can read: " +
        String((e && e.message) || e)}; }
      imf.value = "";
      if(got.err){ alert(got.err); return; }
      const id = impAdd(got);
      /* Taken to the step the panel is on, because a file read in from a menu
         with nothing visibly happening reads as a file that failed to read. */
      state.stage = 5; state.dec = state.dec || "vars";
      xlog("model", "Read another model in beside this one",
        got.name + " \u00b7 " + got.counts.decls + " declarations, " + got.counts.vtypes +
        " quantities, " + got.counts.lines + " lines of arithmetic, " +
        got.counts.findings + " retained findings" +
        (got.why.length ? " \u2014 " + got.why.join("; ") : ""));
      refresh(); renderPanel();
      if(got.why.length) alert("Read " + got.name + " in, and " + got.why.join("; ") +
        ". What was refused is not on the page.");
    });
  }

  const rb = document.getElementById("recBtn"), rbox = document.getElementById("recbox");
  if(rb && rbox && !rb.dataset.wired){
    rb.dataset.wired = "1";
    const show = on => { state.recOpen = on; rbox.hidden = !on;
      rb.setAttribute("aria-expanded", String(on));
      if(on){ renderPass(); rbox.scrollIntoView({behavior:"smooth", block:"nearest"}); } };
    rb.addEventListener("click", ev => { ev.preventDefault(); show(!state.recOpen); });
    const cl = document.getElementById("recClose");
    if(cl) cl.addEventListener("click", ev => { ev.preventDefault(); show(false); });
    const ep = document.getElementById("expPass");
    if(ep) ep.addEventListener("click", ev => { ev.preventDefault(); exportPass(ev.currentTarget); });
    const er = document.getElementById("expRec");
    if(er){
      tip(er, `<h5>Export the record as JSON</h5>
        <p class="def">The same rows as <code>passes.tsv</code>, against
        <code>schema/record.schema.json</code>, with the section each decision falls under
        as a field. The TSV is the shape <code>index/passes.tsv</code> uses and a curator
        reads; this is the one a reader's own tooling can parse without guessing what the
        columns are.</p>`);
      er.addEventListener("click", ev => { ev.preventDefault(); exportRecord(er); });
    }
    const es = document.getElementById("expStream");
    if(es){
      tip(es, `<h5>Export the stream</h5>
        <p class="def">The corpus as another bench would import it: every construct with its
        signature, every relationship with its quote and its three scores, the papers as metadata,
        what each relationship answers, the wording scores the threshold reads, and the declarations
        made on top. The record is the curation; this is the material it was curated from,
        and the two together are what make a stream forkable.</p>
        <p class="def"><b>The papers do not travel.</b> Fifty-two articles are other
        people's copyright, so what ships is what was read off them, with an identifier per
        paper so a replicator obtains the texts.</p>`);
      es.addEventListener("click", ev => { ev.preventDefault(); exportStream(es); });
    }
  }


})();

size();
wireDomain();
wireCon();
wireClm();
wireVar();
wireFams();
wireJoin();
/* The first render used to happen HERE, and it threw every time the page
   loaded: renderPanel() wires the step, the step's wiring calls
   wireWorkspace(), and 18-workspace.js is four scripts further down the
   page. The ReferenceError took the REST of this file with it -- the zoom
   buttons, the click that clears a selection, the resize and the Escape
   key were never wired, and neither was anything added here later. It only
   ever looked fine because the panel is rebuilt on the first thing anybody
   clicks, and by then every script has loaded.

   So the page renders itself once at the bottom of bench.html, after the
   last script, and this file only sets things up. */

(() => {
  const z = (id, fn, tip) => { const b = document.getElementById(id); if(!b) return;
    b.addEventListener("click", fn);
    b.addEventListener("mouseenter", ev => showTip(tip, ev));
    b.addEventListener("mousemove", ev => showTip(tip, ev));
    b.addEventListener("mouseleave", hideTip); };
  z("zIn",  () => zoomBy(1.35), `<h5>Zoom in</h5><p class="def">The wheel does the same, and
    dragging the background pans.</p>`);
  z("zOut", () => zoomBy(1/1.35), `<h5>Zoom out</h5><p class="def">The wheel does the same, and
    dragging the background pans.</p>`);
  z("zAll", () => fitNodes(nodes), `<h5>Fit all</h5><p class="def">Frames every construct drawn
    at the current scope, dropped ones included, so you can see what you are not carrying.</p>`);
  z("zSel", () => { const car = nodes.filter(n => n.carried);
      fitNodes(car.length ? car : nodes, car.length ? 70 : 44); },
    `<h5>Fit selection</h5><p class="def">Frames what you have carried. On a set of a handful
    this is the view a model would be read off \u2014 and if it frames the whole map, you have
    not selected anything yet.</p>`);
  wireMapFS();
})();

/* THE MAP, FULL SCREEN, WITH ITS CONTROLS AS PANES OVER IT.
   ==========================================================================

   The map needs the room. Every filter stays available and hidden behind a
   button that reveals it as an overlay, so the graph is the whole screen;
   and the steps are not drawn
   when going full screen".

   So the full-screen element is `.canvas` and not `.stageWrap`. The rail's two
   cards and the step's own controls are MOVED inside it, into panes that start
   closed, and moved back on the way out. Moving the live nodes rather than
   copying them is what keeps every control wired: a listener survives a move,
   and `renderPanel` rewrites the body wherever the body happens to live.

   What is deliberately left outside, and therefore invisible: the step title,
   the chevrons, the block row, the scenario menu. In full screen there is a
   map and there are filters, and no way to walk the chain -- which is the
   point of an immersive view rather than an oversight.

   RE-LAYING IS NOT OPTIONAL. d3's forceX and forceY evaluate their accessors
   once, when a force is initialised, and cache a target per node. Restarting
   the simulation alone leaves every construct aimed at the old box, so they
   bunch where the map used to end. `sim.nodes(nodes)` re-initialises every
   force, which is what re-reads W and H. */
function fsPanes(){
  return {bar:document.getElementById("fsbar"),
          filt:document.getElementById("fsFilters"),
          fbody:document.getElementById("fsFiltBody"),
          insp:document.getElementById("fsInsp"),
          ibody:document.getElementById("fsInspBody")};
}
function fsPane(which, show){
  const P = fsPanes();
  const pane = which === "filters" ? P.filt : P.insp;
  const btn = document.getElementById(which === "filters" ? "fsFiltBtn" : "fsInspBtn");
  if(!pane) return;
  const on = show === undefined ? !!pane.hidden : !!show;
  pane.hidden = !on;
  if(btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
}
function mapRelay(){
  size(); recentre();
  if(sim){
    sim.nodes(nodes);
    sim.force("link").links(links);
    sim.alpha(.6).restart();
  }
  draw(); chint();
  /* Fitting immediately frames where the constructs were, not where they are
     going, so it waits for the simulation to have moved them. */
  setTimeout(() => { try{ fitNodes(nodes); }catch(e){} }, 420);
}
function wireMapFS(){
  const cv = document.querySelector(".canvas");
  const btn = document.getElementById("zFS");
  if(!cv || !btn) return;
  const P = fsPanes();
  const opts = {
    adopt: [document.getElementById("pbody"),
            document.getElementById("blkfoot"),
            document.getElementById("stepcard"),
            document.querySelector(".rail .card.insp"),
            document.getElementById("tip"),
            /* THE CLUSTER OVERLAY, which belongs in full screen too. The
               settings
               already travel, because they are in the Plot block and the Plot
               block is in the panel. The proposals are a dialog at body
               level, and in REAL full screen the browser draws only the
               full-screen element and its subtree -- a modal dialog is in the
               top layer and may survive that, may not, and differs between
               engines. Moving it inside settles it. */
            document.getElementById("comdlg")],
    onEnter: () => {
      /* Each adopted node goes to the pane that should hold it. The helper put
         them all at the end of the canvas, because it does not know what they
         are for. */
      const pb = document.getElementById("pbody"), bf = document.getElementById("blkfoot");
      const sc = document.getElementById("stepcard"), ic = document.querySelector(".card.insp");
      if(P.fbody){ if(pb) P.fbody.appendChild(pb); if(bf) P.fbody.appendChild(bf); }
      if(P.ibody){ if(sc) P.ibody.appendChild(sc); if(ic) P.ibody.appendChild(ic); }
      if(P.bar) P.bar.hidden = false;
      fsPane("filters", false); fsPane("inspector", false);
      mapFS(true); mapRelay();
      fsMark(btn, cv);
    },
    onExit: () => {
      if(P.bar) P.bar.hidden = true;
      fsPane("filters", false); fsPane("inspector", false);
      mapFS(false); mapRelay();
      fsMark(btn, cv);
    }
  };
  /* WHILE A TOUR IS ON, the CSS path. The browser's own full screen draws the
     map and nothing else, which would take the tour's rings and card off the
     screen at the one stop that sends a reader into the map. */
  btn.addEventListener("click", () => {
    fsToggle(cv, Object.assign({}, opts, tourOn() ? {css:true} : {}));
  });
  btn.addEventListener("mouseenter", ev => showTip(`<h5>Full screen</h5><p class="def">The map
    takes the whole screen. The filters and the inspector come with it, as panes you open and
    close, so the diagram is what you are looking at. Esc comes back.</p>`, ev));
  btn.addEventListener("mouseleave", hideTip);
  const on = (id, fn) => { const b = document.getElementById(id);
    if(b) b.addEventListener("click", fn); };
  on("fsFiltBtn", () => fsPane("filters"));
  on("fsInspBtn", () => fsPane("inspector"));
  on("fsFiltX", () => fsPane("filters", false));
  on("fsInspX", () => fsPane("inspector", false));
}
/* Pinning a construct with nowhere to read the result is the one way this view
   can waste a click, so the pane opens itself for that. */
function fsInspPop(){
  const cv = document.querySelector(".canvas");
  if(cv && fsOn(cv) && state.pinned) fsPane("inspector", true);
}
/* One handler for every (i) on the page, now and after any redraw. The text
   it shows sits in the DOM beside the icon rather than in an attribute, so
   the markup inside it survives and nothing has to be escaped twice. */
(function(){
  /* The text is the icon's SIBLING, not its child: the icon is a circle with
     one letter in it, and burying a paragraph inside it would put the
     paragraph inside the hover target. Looked for next to it, then anywhere
     in the element that holds both. */
  const text = el => {
    const sib = el.nextElementSibling;
    const x = (sib && sib.classList.contains("infx")) ? sib
      : (el.parentElement && el.parentElement.querySelector(".infx"));
    return x ? x.innerHTML : "";
  };
  document.addEventListener("mouseover", ev => {
    const el = ev.target.closest && ev.target.closest(".inf");
    if(el) showTip(text(el), ev);
  });
  document.addEventListener("mousemove", ev => {
    const el = ev.target.closest && ev.target.closest(".inf");
    if(el) showTip(text(el), ev);
  });
  document.addEventListener("mouseout", ev => {
    if(ev.target.closest && ev.target.closest(".inf")) hideTip();
  });
  /* Reachable without a mouse: the icon takes focus, and Escape drops the tip
     wherever it was raised from. */
  document.addEventListener("focusin", ev => {
    const el = ev.target.closest && ev.target.closest(".inf");
    if(!el) return;
    const r = el.getBoundingClientRect();
    showTip(text(el), {clientX:r.left + r.width / 2, clientY:r.bottom});
  });
  document.addEventListener("focusout", ev => {
    if(ev.target.closest && ev.target.closest(".inf")) hideTip();
  });
})();

svg.on("click", () => {
  state.pinned = null; state.focus = null; picked.clear();
  renderInsp(); renderSelbar(); draw(); chint();
});
addEventListener("resize", () => { size(); recentre();
  if(sim) sim.alpha(.2).restart(); draw(); });
/* A GUIDED TOUR'S RINGS FOLLOW THE PAGE. Everything the tour draws is in
   viewport coordinates, so a reader who scrolled took the page out from under
   every ring. One capturing listener for the life of the page, which does
   nothing at all while no tour is running. page/30-tour.js A10. */
tourFollow();
{ const c = document.getElementById("comclose");
  if(c) c.addEventListener("click", () => {
    const d = document.getElementById("comdlg"); if(d && d.open) d.close(); }); }
addEventListener("keydown", e => { if(e.key === "Escape"){
  picked.clear(); state.focus = null; state.pinned = null;
  renderSelbar(); renderInsp(); draw(); chint(); } });
}


/* ==========================================================================
   BOOT -- everything that used to run while a script evaluated.

   The page was 34 classic scripts in one shared global scope, and 58
   statements ran during load. Each of those is a file reaching into another
   while that other may not have finished evaluating, and three such failures
   got through in a single day: a global read at the top level of one file
   killed the rest of that file, silently, and the page still rendered
   because most panels are rebuilt on the first click. `make modules-map`
   counted 93 reads that would throw outright once the scripts became modules
   and evaluation order came from the import graph instead of the tag order.

   So nothing runs during load any more. Every one of those statements is a
   function, and this calls them, in the order the script tags used to imply.
   The order is kept rather than improved on purpose: the point of this change
   is that the page does the same thing, and the page walk's snapshot being
   identical is what says so. After it, evaluation order cannot matter, which
   is what makes the conversion to modules a mechanical step rather than a
   rewrite -- and which removes the `typeof` guards that only ever papered
   over the order.

   Called once, from the end of bench.html. ========================================================================= */
/* THE ONE DOOR THE TESTS COME THROUGH.

   tests/pagewalk.mjs and tests/hostile.mjs drive the real page by appending a
   classic script to it and calling the page's own names. That works because
   every script here shares one global scope, and it stops working the moment
   they become modules: a module's bindings are not global, so the harness
   would see none of the twenty-eight names it uses.

   So the page hands them over, on purpose and in one place. Getters, because
   half of them are `let` and a snapshot of the value at boot would be a
   snapshot of the wrong thing -- `lastView` is replaced on every refresh.

   This is a TEST SURFACE and not an API. It exists because driving the real
   page is the only check that catches a control wired to a selector matching
   nothing, and because the alternative -- a harness that reaches into a
   module scope -- does not exist. Adding a name here is cheap; reading one
   from the page's own code would be a way of pretending the layer rule does
   not apply, so nothing in docs/bench reads it. */
function benchHook(){
  const d = {};
  d.ARITH = {get:() => (typeof ARITH === "undefined" ? undefined : ARITH), enumerable:true};
  d.BOARD = {get:() => (typeof BOARD === "undefined" ? undefined : BOARD), enumerable:true};
  d.BUF = {get:() => (typeof BUF === "undefined" ? undefined : BUF), enumerable:true};
  d.EXP = {get:() => (typeof EXP === "undefined" ? undefined : EXP), enumerable:true};
  d.EXPSETS = {get:() => (typeof EXPSETS === "undefined" ? undefined : EXPSETS), enumerable:true};
  d.GUIDE = {get:() => (typeof GUIDE === "undefined" ? undefined : GUIDE), enumerable:true};
  d.OP = {get:() => (typeof OP === "undefined" ? undefined : OP), enumerable:true};
  d.PROPS = {get:() => (typeof PROPS === "undefined" ? undefined : PROPS), enumerable:true};
  d.STAGES = {get:() => (typeof STAGES === "undefined" ? undefined : STAGES), enumerable:true};
  d.VAR = {get:() => (typeof VAR === "undefined" ? undefined : VAR), enumerable:true};
  d.WS = {get:() => (typeof WS === "undefined" ? undefined : WS), enumerable:true};
  d.XRUN = {get:() => (typeof XRUN === "undefined" ? undefined : XRUN), enumerable:true};
  d.bufPush = {get:() => (typeof bufPush === "undefined" ? undefined : bufPush), enumerable:true};
  d.buildArith = {get:() => (typeof buildArith === "undefined" ? undefined : buildArith), enumerable:true};
  d.classSpec = {get:() => (typeof classSpec === "undefined" ? undefined : classSpec), enumerable:true};
  d.expSlotsNow = {get:() => (typeof expSlotsNow === "undefined" ? undefined : expSlotsNow), enumerable:true};
  d.famOf = {get:() => (typeof famOf === "undefined" ? undefined : famOf), enumerable:true};
  d.lastView = {get:() => (typeof lastView === "undefined" ? undefined : lastView), enumerable:true};
  d.renderGuide = {get:() => (typeof renderGuide === "undefined" ? undefined : renderGuide), enumerable:true};
  d.renderPanel = {get:() => (typeof renderPanel === "undefined" ? undefined : renderPanel), enumerable:true};
  /* THE BLANK PROJECT, for the harness alone. The start page's New project is
     an EMPTY one now -- no outlet ticked, nothing in scope -- which is right
     for a reader and wrong for a walk that measures what every step draws
     with nothing decided. The walk presses the reader's button, checks it
     really is empty, and then takes this to get the shipped literature in
     full view with no choice made on it, which is the state it has always
     measured. */
  d.snapBlank = {get:() => (typeof snapBlank === "undefined" ? undefined : snapBlank), enumerable:true};
  /* The inspector and the clustering, because a harness that cannot pin a
     construct cannot reach the one block that lives only in the inspector. */
  d.renderInsp = {get:() => (typeof renderInsp === "undefined" ? undefined : renderInsp), enumerable:true};
  d.COM = {get:() => (typeof COM === "undefined" ? undefined : COM), enumerable:true};
  d.comOf = {get:() => (typeof comOf === "undefined" ? undefined : comOf), enumerable:true};
  d.comRun = {get:() => (typeof comRun === "undefined" ? undefined : comRun), enumerable:true};
  d.comCount = {get:() => (typeof comCount === "undefined" ? undefined : comCount), enumerable:true};
  /* The merges, because an accepted cluster becomes one and a harness has to
     be able to see that it did. Whether a merge DRAWS as one node is a
     separate display setting (state.collapse), so the merge itself is the
     thing to look at. */
  d.groups = {get:() => (typeof groups === "undefined" ? undefined : groups), enumerable:true};
  /* WHAT WAS SET ASIDE, which a harness cannot otherwise see. A scenario's
     selection lives here, and a probe asking whether a scenario arrived had
     only the view to go on: the view answers a different question, because a
     construct can be out of view for three reasons and dropped is one. */
  d.dropped = {get:() => (typeof dropped === "undefined" ? undefined : dropped), enumerable:true};
  /* THE CORPUS AS THE PAGE HOLDS IT, which is the shipped payload plus
     whatever was added or re-read over it. A harness checking an import that
     changes the corpus has to be able to see the corpus; reading graph-data.js
     off disk would show it the base and miss the whole point of the overlay. */
  d.G = {get:() => (typeof G === "undefined" ? undefined : G), enumerable:true};
  /* The literatures, because a harness checking that two of them are curated
     apart has to be able to see which one it is standing in. */
  d.LIT = {get:() => (typeof LIT === "undefined" ? undefined : LIT), enumerable:true};
  d.litList = {get:() => (typeof litList === "undefined" ? undefined : litList), enumerable:true};
  d.litApply = {get:() => (typeof litApply === "undefined" ? undefined : litApply), enumerable:true};
  d.litNow = {get:() => (typeof litNow === "undefined" ? undefined : litNow), enumerable:true};
  d.litCount = {get:() => (typeof litCount === "undefined" ? undefined : litCount), enumerable:true};
  d.litOf = {get:() => (typeof litOf === "undefined" ? undefined : litOf), enumerable:true};
  /* REBUILDING THE VIEW, which renderPanel does not do. A harness that
     changes a setting the map reads -- the threshold, whether a merge draws
     as one node -- has to be able to ask for the rebuild, or it measures the
     view from before its own change and concludes the change did nothing. */
  d.refresh = {get:() => (typeof refresh === "undefined" ? undefined : refresh), enumerable:true};
  /* The drafted readings, because they are the one proposal a harness cannot
     reach any other way: they live only in memory until one is accepted. */
  d.READ = {get:() => (typeof READ === "undefined" ? undefined : READ), enumerable:true};
  d.comCell = {get:() => (typeof comCell === "undefined" ? undefined : comCell), enumerable:true};
  d.reviewChecks = {get:() => (typeof reviewChecks === "undefined" ? undefined : reviewChecks), enumerable:true};
  d.reviewState = {get:() => (typeof reviewState === "undefined" ? undefined : reviewState), enumerable:true};
  d.scenDemo = {get:() => (typeof scenDemo === "undefined" ? undefined : scenDemo), enumerable:true};
  d.snapApply = {get:() => (typeof snapApply === "undefined" ? undefined : snapApply), enumerable:true};
  /* The door opened one way: a harness could put a scenario IN and not read
     one out, so a run that built a model had no way to hand it back. */
  d.snapNow = {get:() => (typeof snapNow === "undefined" ? undefined : snapNow), enumerable:true};
  d.scenFile = {get:() => (typeof scenFile === "undefined" ? undefined : scenFile), enumerable:true};
  /* The exchange formats, as the objects rather than as downloads. A harness
     cannot read a saved file, and the thing worth checking about a format is
     its contents -- against its own schema, which tests/exchange.mjs does. */
  d.proofOf = {get:() => (typeof proofOf === "undefined" ? undefined : proofOf), enumerable:true};
  /* The two files step 4.1 writes, and the board's save, because the thing
     worth checking about them is WHICH FINDINGS THEY CARRY: the plates were
     filtered by what the board retained and these two were not, so setting a
     finding aside removed it from the step and left it in the file. A harness
     cannot read a download, and reading the source would not have caught it
     -- the filter was there, one call away from where it was needed. */
  /* The local runtime, because whether the page found one decides which of two
     controls on step 3.2 is live and no other surface says so. */
  d.BRIDGE = {get:() => (typeof BRIDGE === "undefined" ? undefined : BRIDGE), enumerable:true};
  /* Another model held beside this one, because whether a declaration of
     theirs can be PLACED against this corpus is the whole of what reading one
     in is worth, and no other surface says so. */
  d.IMPM = {get:() => (typeof IMPM === "undefined" ? undefined : IMPM), enumerable:true};
  d.impRead = {get:() => (typeof impRead === "undefined" ? undefined : impRead), enumerable:true};
  d.impAdd = {get:() => (typeof impAdd === "undefined" ? undefined : impAdd), enumerable:true};
  /* Where a declaration of theirs LANDS here, which is the whole of what
     reading a model in is worth and the one thing a harness cannot see from
     the markup: the refusal and the fold both come out of this function. */
  d.impPlace = {get:() => (typeof impPlace === "undefined" ? undefined : impPlace), enumerable:true};
  /* THIS PAGE'S OWN DECLARATIONS, which is what a harness checking an adoption
     has to be able to count: the thing worth asserting about reading another
     model in is that nothing here changed until somebody clicked. */
  d.SPEC = {get:() => (typeof spec === "undefined" ? undefined : spec), enumerable:true};
  d.VTYPE = {get:() => (typeof vtype === "undefined" ? undefined : vtype), enumerable:true};
  d.resultsFile = {get:() => (typeof resultsFile === "undefined" ? undefined : resultsFile), enumerable:true};
  d.derivedClaims = {get:() => (typeof derivedClaims === "undefined" ? undefined : derivedClaims), enumerable:true};
  d.boardSave = {get:() => (typeof boardSave === "undefined" ? undefined : boardSave), enumerable:true};
  d.streamFile = {get:() => (typeof streamFile === "undefined" ? undefined : streamFile), enumerable:true};
  d.recordFile = {get:() => (typeof recordFile === "undefined" ? undefined : recordFile), enumerable:true};
  d.relationIds = {get:() => (typeof relationIds === "undefined" ? undefined : relationIds), enumerable:true};
  d.relationOf = {get:() => (typeof relationOf === "undefined" ? undefined : relationOf), enumerable:true};
  /* The notebook, because the file is the whole of what it produces and a
     harness cannot read a download. */
  d.NB = {get:() => (typeof NB === "undefined" ? undefined : NB), enumerable:true};
  d.nbMarkdown = {get:() => (typeof nbMarkdown === "undefined" ? undefined : nbMarkdown), enumerable:true};
  /* The deposit: the five declarations, and the bundle as bytes. A harness
     cannot read a download, and the bundle is the whole of what the step
     produces. */
  d.DEP = {get:() => (typeof DEP === "undefined" ? undefined : DEP), enumerable:true};
  d.depState = {get:() => (typeof depState === "undefined" ? undefined : depState), enumerable:true};
  d.depositBundle = {get:() => (typeof depositBundle === "undefined" ? undefined : depositBundle), enumerable:true};
  /* The report, because it is the deposit's first file and the one whose
     contents are the whole of what it claims. A harness cannot read a
     download. */
  d.reportNow = {get:() => (typeof reportNow === "undefined" ? undefined : reportNow), enumerable:true};
  d.reportMarkdown = {get:() => (typeof reportMarkdown === "undefined" ? undefined : reportMarkdown), enumerable:true};
  d.depositMd = {get:() => (typeof depositMd === "undefined" ? undefined : depositMd), enumerable:true};
  d.state = {get:() => (typeof state === "undefined" ? undefined : state), enumerable:true};
  d.varName = {get:() => (typeof varName === "undefined" ? undefined : varName), enumerable:true};
  d.xrunClause = {get:() => (typeof xrunClause === "undefined" ? undefined : xrunClause), enumerable:true};
  d.xrunGo = {get:() => (typeof xrunGo === "undefined" ? undefined : xrunGo), enumerable:true};
  /* The box a tally ran over. A tally without it is not interpretable, and
     a tally that moves while the model does not is a leak. */
  d.xrunBox = {get:() => (typeof xrunBox === "undefined" ? undefined : xrunBox), enumerable:true};
  /* Frozen, so a probe cannot quietly add to the page's scope through it. */
  return Object.freeze(Object.defineProperties({}, d));
}

async function boot(){
  /* 1. THE BROWSER'S STORES, in the order their files were loaded in. Each
        reads localStorage through lsRead and writes into its own file's maps,
        so the only thing the order decides is which wins when two stores
        describe the same thing -- and that is the order it always was. */
  /* WHAT THIS CORPUS HOLDS, handed to the module that places another model's
     declarations against it. It asks the page rather than graph-data.js,
     because a declaration about a construct that arrived with a second
     literature has to place too, and the shipped payload would not know it. */
  impCorpus(i => N.has(i));
  SEEDED.carry = cloadLocal();
  floadLocal();
  dloadLocal();
  sloadLocal();
  compLoad();
  SEEDED.groups = gloadLocal();
  cloadLocal2();
  vloadLocal();
  mloadLocal();
  litLoad();
  corpusLoad();
  simLoad();
  boardLoad();
  impLoad();
  xloadLocal();
  aloadLocal();
  tloadLocal();
  famLoad();
  bootApart();
  hload();
  wsLoad();
  expLoad();
  nbLoad();
  depLoad();

  /* 2. THE SEEDED DEMO, which can only be decided once the stores are read:
        anything stored wins over it. */
  bootSeed();

  /* 3. THE SCENARIO, restored last of the state, because snapApply() writes
        into eighteen of the stores above and the map reports 82 of the 93
        load-time reads inside it. */
  bootScenario();

  /* 4. THE DOM, wired after all of the state exists, so a listener cannot
        fire against a store that has not been restored. In the order the
        script tags gave: 06-wiring, then 13-map, then this file. Document
        level listeners fire in registration order, so the order is kept. */
  bootAxMenus();
  bootSvg();
  bootArrows();
  bootMap();
  bootWiring();

  /* 5. THE SHARED STORE last of all: it is a network call whose listeners
        write into the maps above, and connecting before they are restored was
        a snapshot arriving into empty stores. */
  bootStore();

  /* 6. WHAT IS OPEN ON A FIRST ARRIVAL. Only then: anything stored is the
        reader's own, `scenFreshTake` is false, and this does nothing. A fresh
        browser used to get the shipped corpus with nothing decided, which is
        the instrument with no demonstration in it.

        AWAITED, and that is the point. Fetching after the first paint left a
        window in which the page was live and the file was not in yet, and
        whatever happened in that window -- a reader pressing `New project`, a
        harness driving the page -- was overwritten when the demonstration
        landed. Awaiting it costs one local fetch on a first arrival and
        nothing on every later one, and the page paints once, with what it
        means to show. A reader can still get in first, and scenOpenDefault
        checks that before it touches anything. */
  let opened = null;
  if(scenFreshTake()){
    opened = await scenOpenDefault(DEMO_FILE).catch(() => null);
    if(opened){
      renderScen();
      snapApply((scenCur() || {}).snap);
      if(opened.created && Array.isArray(opened.o && opened.o.provenance))
        for(const p of opened.o.provenance) PROV.push(p);
    }
  }

  /* The test surface, before the first paint so a harness can read the state
     the page opens on -- and after the default project, so what it reads is
     the state the page settles on rather than the one it passed through. */
  window.__bench = benchHook();

  /* And the first paint. This was two statements in bench.html; it is here so
     that the whole of what starting the page means is in one function. */
  renderPanel();
  refresh();
  /* THE START PAGE STAYS UP OVER IT. homeOn() hides it as soon as there is
     work to go back to -- a kept arithmetic, a declared quantity, a finding
     on the board -- which is right for a reader returning to their own
     project and wrong for a first arrival, because the demonstration is all
     three. Without this, loading it by default would drop a first-time reader
     into step 6 of somebody else's model, past the start page, the tours and
     the question of a key. */
  if(opened) homeIn();

  /* 6. IS THERE A RUNTIME BESIDE THIS PAGE? Asked after the first paint and
        never waited for: the answer decides whether two controls on step 3.2
        are live, and a page that blocked its own paint on a request that has
        nothing listening -- which is the normal case, because this page is a
        static file -- would open slowly for every reader to suit the few who
        run the bridge. It asks only when served from loopback, so a reader on
        a web host sees no failed request at all. */
  bridgeHello().then(on => { if(on) renderPanel(); });
}

export { REFRESHED, benchHook, boot, bootWiring, comPlace, comRelease, onRefresh, refresh };

/* AMG bench, page script 14 of 22: the map, the axes, the inspector and the tally.
   One shared global scope, loaded in order. See page/README.md. */
import { hesc } from "../core/safe.js";
import { fsOn } from "../fullscreen.js";
import { COM, comCount, comLabel, comOf, comPinHTML } from "./22-communities.js";
import { AXES, LVL, N, TONE, cssv, pap, picked, state } from "./03-stores.js";
import { cpersist, dropped, groups, setCarryLink, setCarryNode } from "./03b-decisions.js";
import { apVar, okPaper, underThreshold } from "./03c-corpus.js";
import { makeGroup, renderSelbar } from "./07-grouping.js";
import { noArrowsWhy } from "./15-deposit.js";
import { nodeTip } from "./12-claims.js";
import { placeAxisMenus, renderPanel, renderTrack, wireCom } from "./06-wiring.js";
import { refresh } from "./14-boot.js";
/* --------------------------------------------------------------- the map */
/* THE MAP'S HANDLES, TAKEN IN boot(). These were three consts calling
   d3.select and d3.append while this file evaluated -- the same load-time work
   boot() took out of every other file, for a library and an element instead of
   another script. It matters more than it looks: with static imports,
   importing ANY page module pulls its whole graph eagerly, so one d3 call at
   this file's top level makes every page module unimportable under node, and
   the three node tests that reach page code die with `d3 is not defined`.

   All 54 uses are unchanged: every one of them runs after boot. */
let svg = null, root = null, defs = null;
/* The arrowheads, one per tone, built in boot(). TONE and cssv are declared in
   03-stores.js, which the tag order puts before this file and the import graph
   of a module page puts after it -- so this was one of the two reads that
   broke outright, and the kind that is invisible until the order changes. */
function bootArrows(){
  for(const [k, v] of Object.entries(TONE)){
    defs.append("marker").attr("id","ar-"+k).attr("viewBox","0 0 10 10")
      .attr("refX",19).attr("refY",5).attr("markerWidth",5.5).attr("markerHeight",5.5)
      .attr("orient","auto-start-reverse")
      .append("path").attr("d","M0,0 L10,5 L0,10 z").attr("fill",cssv(v));
  }
}
/* The zoom is held rather than thrown away, so the buttons on the map can
   drive the same transform the wheel does. */
let zoomB = null;
function bootSvg(){
  svg  = d3.select("#g");
  root = svg.append("g");
  defs = svg.append("defs");
  gAxis = root.append("g").attr("class","axes");
  gHull = root.append("g"); gLink = root.append("g");
  gNode = root.append("g"); gLab  = root.append("g");
  tip = document.getElementById("tip");
  zoomB = d3.zoom().scaleExtent([0.2, 5])
  .on("zoom", ev => { root.attr("transform", ev.transform); zoomRead(ev.transform.k); })
    .filter(ev => !ev.target.closest(".nodeg"));
}

function zoomRead(k){
  const el = document.getElementById("zoomPct");
  if(el) el.textContent = Math.round(k * 100) + "%";
}
function zoomBy(f){ zoomB.scaleBy(svg, f); }
function fitNodes(ns, pad){
  ns = (ns || []).filter(n => isFinite(n.x) && isFinite(n.y));
  if(!ns.length) return;
  pad = pad == null ? 44 : pad;
  const xs0 = Math.min(...ns.map(n => n.x - rOf(n))) - pad;
  const xs1 = Math.max(...ns.map(n => n.x + rOf(n))) + pad;
  const ys0 = Math.min(...ns.map(n => n.y - rOf(n))) - pad;
  const ys1 = Math.max(...ns.map(n => n.y + rOf(n))) + pad;
  const k = Math.min(5, Math.max(0.2, Math.min(W / Math.max(1, xs1 - xs0),
                                               H / Math.max(1, ys1 - ys0))));
  const t = d3.zoomIdentity
    .translate(W/2 - k * (xs0 + xs1) / 2, H/2 - k * (ys0 + ys1) / 2).scale(k);
  zoomB.transform(svg, t);
}
/* The five layer groups, in the order they stack. Appended in boot() with
   the handles above, for the same reason. */
let gAxis = null, gHull = null, gLink = null, gNode = null, gLab = null;
let tip = null;   // taken in boot(), with the handles above

/* What the map emphasises depends on which step you are on. Without this the
   five steps are five control panels over one unchanging picture, and they read
   as tabs rather than as stages of a procedure. */
/* WHAT THE MAP OWNS AND OTHER FILES SET.

   `lastView`, `nodes`, `links`, `sim`, `openMarks` and `spotlight` are
   declared here and assigned from 14-boot.js and 16-worklists.js -- sixteen
   assignments, across three files, to names this one declares. An imported
   binding cannot be assigned at all, so every one of them has to go before
   the page can become modules.

   A setter rather than an object, because these six are read 336 times
   between them and `lastView` alone 93: turning them into members would be a
   three-hundred-site edit for no gain, while this leaves every read exactly
   as it was and changes the handful of writes. The file that owns the state
   is the file that sets it, which is the property that matters. */
function mapSet(p){
  if("view" in p) lastView = p.view;
  if("nodes" in p) nodes = p.nodes;
  if("links" in p) links = p.links;
  if("sim" in p) sim = p.sim;
  if("open" in p) openMarks = p.open;
  if("spot" in p) spotlight = p.spot;
}
let spotlight = null;                       // step 2.1: one nomination lit up
let openMarks = {n:new Set(), e:new Set()}; // step 2.1: everything still unanswered
const idOf = x => (x && x.id) || x;

let W = 900, H = 660, sim = null, lastView = {papersIn:0, claimsIn:0, notions:0,
  constructsIn:0, arrows:0, strong:0, corrob:0, isoCount:0, decisions:0};
let nodes = [], links = [], nodeSel = null, linkSel = null, labSel = null;
let dragging = false;

/* WHETHER THE MAP IS THE WHOLE SCREEN. Set by the full-screen button, read
   here, and nowhere else: the 680px cap below is exactly what that button
   exists to lift, and out of full screen it stays, because the map sits in a
   page with a header and a rail and a diagram that grows with the window
   pushes the step's own work off the bottom. */
let fsmap = false;
const mapFS = v => { fsmap = !!v; };
function size(){
  const r = document.querySelector(".canvas").getBoundingClientRect();
  /* A HIDDEN CANVAS HAS NO BOX. Step 2.1 keeps its map shut, and measuring a
     display:none element gives zero, which would reflow the whole diagram to
     the 320px floor and back again on every visit to that step. Keep what we
     had instead. */
  if(r.width < 2) return;
  W = Math.max(320, r.width);
  H = fsmap ? Math.max(420, r.height - 10)
            : Math.max(420, Math.min(680, window.innerHeight - 220));
  svg.attr("viewBox", `0 0 ${W} ${H}`).style("height", H + "px");
}

function showTip(html, ev, live){
  clearTimeout(tipHold);
  tip.innerHTML = html; tip.classList.add("on");
  tip.classList.toggle("live", !!live);
  const pad = 14, r = tip.getBoundingClientRect();
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if(x + r.width  > innerWidth  - 8) x = ev.clientX - r.width  - pad;
  if(y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
  tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
}
const hideTip = () => { tip.classList.remove("on", "live"); };

/* A tooltip you can reach into. Most of them are read and left, so the tip
   takes no pointer events and vanishes the moment the cursor leaves what
   raised it. One of them has a button in it -- adding an arrow to the list from
   the map -- and a button inside something that disappears when you move
   towards it is no button at all. So a live tip survives a short gap and stays
   while the pointer is inside it. */
let tipHold = null;
const hideTipSoon = () => {
  clearTimeout(tipHold);
  tipHold = setTimeout(() => {
    if(!tip.matches(":hover")) hideTip();
  }, 180);
};
/* The tooltip's own listeners, and the zoom, bound in boot(). */
function bootMap(){
  svg.call(zoomB);
  tip.addEventListener("mouseenter", () => clearTimeout(tipHold));
  tip.addEventListener("mouseleave", hideTip);
/* The one action a tooltip offers. The arrow's own click still toggles it --
   that is the decision and it stays one click -- and this is the same decision
   reached from the tooltip, for a reader who got there by hovering. */
  tip.addEventListener("click", ev => {
  const b = ev.target.closest && ev.target.closest("[data-addlink]");
  if(!b) return;
  ev.stopPropagation();
  const e = (lastView.allLinks || []).find(x => x.id === b.dataset.addlink);
  if(!e) return;
  setCarryLink(e, !e.carried);
  cpersist(); refresh(); hideTip();
  });
}

// Within `hops` arrows of the focused notion.
function near(){
  if(!state.focus) return null;
  const adj = new Map();
  for(const e of links){
    (adj.get(e.source.id ?? e.source) || adj.set(e.source.id ?? e.source, []).get(e.source.id ?? e.source))
      .push(e.target.id ?? e.target);
    (adj.get(e.target.id ?? e.target) || adj.set(e.target.id ?? e.target, []).get(e.target.id ?? e.target))
      .push(e.source.id ?? e.source);
  }
  const seen = new Set([state.focus]); let front = [state.focus];
  for(let d = 0; d < state.hops; d++){
    const next = [];
    for(const id of front) for(const nb of (adj.get(id) || []))
      if(!seen.has(nb)){ seen.add(nb); next.push(nb); }
    front = next;
  }
  return seen;
}

/* Size and colour are two more channels onto the same readings. Size takes a
   number; colour takes a category directly and bins a number into five steps,
   because a continuous ramp on a scatter of circles reads as noise. */
const SRAMP = [3.5, 15.5];
function rOf(n){
  const a = AXES[state.sBy];
  if(!a || !a.of) return 7.5;
  const dom = axDomain(state.sBy, nodes);
  const f = dom ? axFrac(state.sBy, n, dom) : null;
  return f == null ? SRAMP[0] : SRAMP[0] + Math.sqrt(f) * (SRAMP[1] - SRAMP[0]);
}

const CRAMP = ["--c1","--c2","--c3","--c4","--c5"];
function colOf(n){
  const a = AXES[state.cBy];
  if(!a) return cssv("--muted");
  if(a.cat){
    if(state.cBy === "ap") return cssv(apVar(n.ap));
    if(state.cBy === "level") return cssv(LVL[n.level] || "--muted");
    const i = a.cat.indexOf(a.catOf(n));
    return cssv(CRAMP[(i < 0 ? CRAMP.length - 1 : i) % CRAMP.length]);
  }
  if(!a.of) return cssv("--muted");
  const dom = axDomain(state.cBy, nodes);
  const f = dom ? axFrac(state.cBy, n, dom) : null;
  if(f == null) return cssv("--faint");
  return cssv(CRAMP[Math.min(CRAMP.length - 1, Math.floor(f * CRAMP.length))]);
}
/* What the colour legend has to say, given the reading. */
function colKeys(){
  const a = AXES[state.cBy];
  if(!a) return [];
  if(a.cat) return a.cat.map(c => ({
    c: state.cBy === "ap" ? cssv(apVar(c))
     : state.cBy === "level" ? cssv(LVL[c] || "--muted")
     : cssv(CRAMP[a.cat.indexOf(c) % CRAMP.length]),
    t: a.catLabel(c)}));
  if(!a.of) return [];
  const dom = axDomain(state.cBy, nodes);
  if(!dom) return [];
  const lo = Math.round(dom.lo), hi = Math.round(dom.hi);
  return CRAMP.map((v, i) => ({c:cssv(v), t: i === 0 ? String(lo)
    : i === CRAMP.length - 1 ? String(hi) : ""}));
}

// A drop lands when the pointer is inside the target's circle plus a margin.
// The margin is generous and the simulation is stopped while dragging, so the
// target cannot drift away from under the cursor — which is what made this
// unusable before.
function dropTarget(self, x, y){
  let best = null, bd = Infinity;
  for(const n of nodes){
    if(n.id === self.id || n.x == null) continue;
    const r = rOf(n) + 22, dd = Math.hypot(n.x - x, n.y - y);
    if(dd < r && dd < bd){ best = n; bd = dd; }
  }
  return best;
}

// Per-step emphasis, as a multiplier on the opacity the map would otherwise use.
// Each step lights the thing that step is a decision about.
function emphasis(){
  if(spotlight) return {
    node: n => spotlight.n.has(n.id) ? 1 : .06,
    edge: e => spotlight.e.has(e.id) ? 1 : .04,
    note: "showing one open decision — move off it to see the whole map"
  };
  /* IN THE CLUSTERS LAYOUT, what the clustering never considered is drawn
     faint. It stays ON the map -- a construct hidden because a clustering
     ignored it would be a clustering quietly deciding the scope -- but it
     reads as background, which is what lets three clusters of four be seen
     among a hundred and fifty constructs. */
  if(state.layout === "clusters" && comCount() > 0)
    return {
      node: n => comOf(n.id) == null ? .1 : 1,
      edge: e => (comOf(idOf(e.source)) == null || comOf(idOf(e.target)) == null) ? .05 : 1,
      note: "the clustered constructs lit, the rest of the map faint"
    };
  const S = state.stage;
  if(S === 1){
    /* The threshold's effect is a count, and it now sits under the slider that
       causes it. Lighting up the constructs on the edge of it put the same
       fact on the map as an encoding nobody asked for, with a caption to
       explain the encoding. Step 1.1's map is left plain. */
    return {node: () => 1, edge: () => 1, note: ""};
  }
  if(S === 2){
    const grouped = n => n.mem.length > 1 ||
      [...groups.values()].some(g => n.mem.some(m => g.members.includes(m.i)));
    return {node: n => grouped(n) ? 1 : .36, edge: () => .34,
      note: `lit: the ${nodes.filter(grouped).length} constructs that merge more than one`};
  }
  if(S === 3){
    const touched = new Set();
    links.forEach(e => { if(e.pass){ touched.add(idOf(e.source)); touched.add(idOf(e.target)); } });
    const failing = links.length - links.filter(e => e.pass).length;
    // At a permissive setting nothing fails, and saying so is more useful than
    // lighting everything and calling it emphasis.
    const note = failing
      ? `lit: the ${touched.size} constructs reachable by a relationship that clears both bars — ${failing} arrow${failing>1?"s":""} fail${failing>1?"":"s"}`
      : `every arrow clears the bars as they stand — tighten one to see what it costs`;
    return {node: n => touched.has(n.id) ? 1 : .26, edge: e => e.pass ? 1 : .3, note};
  }
  if(S === 4){
    const any = openMarks.n.size || openMarks.e.size;
    return {node: n => !any || openMarks.n.has(n.id) ? 1 : .26,
            edge: e => !any || openMarks.e.has(e.id) ? 1 : .22,
            note: any ? "lit: everything still undecided — hover one to isolate it"
                      : "nothing left to decide at these settings"};
  }
  return {node: () => 1, edge: () => 1, note: ""};
}

// Carried while failing the current bars — judgement over the filter.
function overridden(n){
  const touching = links.filter(e => (e.source.id ?? e.source) === n.id ||
                                     (e.target.id ?? e.target) === n.id);
  return touching.length > 0 && !touching.some(e => e.pass);
}

/* ------------------------------------------------------------- the axes

   The map is a force layout, so nothing stops it drifting into a shape that
   means nothing. Pinning the vertical to level of analysis and the horizontal
   to one reading of a construct turns it into a plot you can read a position
   off, while the force still handles the crowding within each cell.         */
const PL = () => Math.min(306, W * 0.34);     // left gutter: the controls sit here
const PR = () => W * 0.97;
const PT = () => H * 0.10;
const PB = () => H - 76;                      // above the axis name and the bottom bar
/* THE LAYOUT GATES BOTH OF THESE, which is how Network and Clusters have no
   axes without "none" being written into state.xAxis. Everything downstream
   asks one of them: the forces for their targets and their strengths,
   drawAxes for its ticks, recentre for whether to centre at all. So gating
   here is gating all of it, and going back to Axes restores the axes the
   scholar chose rather than a default. */
const laidOnAxes = () => (state.layout || "axes") === "axes";
const axOn = k => { if(!laidOnAxes()) return false;
  const a = AXES[k]; return !!(a && (a.of || a.cat)); };
const axesOn = () => axOn(state.xAxis) || axOn(state.yAxis);
/* NO CENTRE FORCE WHERE THE POSITIONS ARE DECLARED. forceCenter translates
   every node on every tick so that their MEAN sits in the middle, which is
   right for a free-floating network and wrong for a layout that puts each
   cluster in a cell: the mean is dominated by the constructs outside the
   clustering, so the clusters were dragged toward the centre by however that
   crowd happened to settle. It made tests/clusters.mjs flaky -- clusters at
   x=298 and x=305 on one run and x=467 and x=468 on the next, against a
   target of 254 -- which read as a settling problem and was not one. */
const recentre = () => { if(sim) sim.force("center",
  (axesOn() || (state.layout === "clusters" && comCount() > 0))
    ? null : d3.forceCenter(W/2, H/2)); };

function axDomain(k, ns){
  if(!laidOnAxes()) return null;
  const a = AXES[k];
  if(!a || !(a.of || a.cat)) return null;
  if(a.cat) return {cat:a.cat};
  const vs = ns.map(a.of).filter(v => v != null && isFinite(v));
  if(!vs.length) return null;
  return {lo: a.lo != null ? a.lo : Math.min(...vs),
          hi: a.hi != null ? a.hi : Math.max(...vs), sq: !!a.sq};
}
function frac(v, dom){
  const f = x => dom.sq ? Math.sqrt(Math.max(0, x)) : x;
  const span = f(dom.hi) - f(dom.lo);
  return span <= 0 ? 0.5 : Math.min(1, Math.max(0, (f(v) - f(dom.lo)) / span));
}
/* 0 at the axis origin, 1 at its far end. Categories sit at the middle of
   their band; a value the reading cannot give returns null, and the force
   leaves that node alone on this axis. */
function axFrac(k, n, dom){
  const a = AXES[k];
  if(!a || !dom) return null;
  if(a.cat){ const i = a.cat.indexOf(a.catOf(n));
    return ((i < 0 ? a.cat.length - 1 : i) + 0.5) / a.cat.length; }
  const v = a.of(n);
  return (v == null || !isFinite(v)) ? null : frac(v, dom);
}
const xAt = f => PL() + f * (PR() - PL());
// numbers read upward; categories read down the list, so level stays macro-to-micro
const yAt = (f, k) => AXES[k] && AXES[k].cat
  ? PT() + f * (PB() - PT())
  : PB() - f * (PB() - PT());

function axTicks(k, dom){
  const a = AXES[k];
  if(!a || !dom) return [];
  if(a.cat) return a.cat.map((c, i) => ({f:(i + 0.5) / a.cat.length, t:a.catLabel(c)}));
  const cand = dom.sq ? [1,2,3,5,8,12,20,30,50,80,120,200,350,600,1000,1800,3000] :
    Array.from({length: Math.max(0, Math.round(dom.hi - dom.lo) + 1)}, (_, i) => dom.lo + i);
  const keep = cand.filter(v => v >= dom.lo && v <= dom.hi);
  const step = Math.max(1, Math.ceil(keep.length / 7));
  return keep.filter((_, i) => i % step === 0).map(v => ({f:frac(v, dom), t:String(v)}));
}

function drawAxes(){
  const ns = nodes;
  const xd = axDomain(state.xAxis, ns), yd = axDomain(state.yAxis, ns);
  const rows = yd ? axTicks(state.yAxis, yd) : [];
  const cols = xd ? axTicks(state.xAxis, xd) : [];
  const l = PL(), r = PR(), t = PT(), b = PB();
  const yCat = AXES[state.yAxis] && AXES[state.yAxis].cat;

  gAxis.selectAll("line.axr").data(rows, d => d.t).join(
    en => en.append("line").attr("class","axr"), u => u, ex => ex.remove())
    .attr("x1", l).attr("x2", r)
    .attr("y1", d => yAt(d.f, state.yAxis)).attr("y2", d => yAt(d.f, state.yAxis));

  gAxis.selectAll("text.axrl").data(rows, d => d.t).join(
    en => en.append("text").attr("class","axrl"), u => u, ex => ex.remove())
    .classed("num", !yCat)
    .attr("x", l + 1).attr("y", d => yAt(d.f, state.yAxis) - 5)
    .attr("text-anchor","start").text(d => d.t);

  gAxis.selectAll("line.axc").data(cols, d => d.t).join(
    en => en.append("line").attr("class","axc"), u => u, ex => ex.remove())
    .attr("x1", d => xAt(d.f)).attr("x2", d => xAt(d.f))
    .attr("y1", t - 12).attr("y2", b - 11);

  gAxis.selectAll("text.axcl").data(cols, d => d.t).join(
    en => en.append("text").attr("class","axcl"), u => u, ex => ex.remove())
    .attr("x", d => xAt(d.f)).attr("y", b).attr("text-anchor","middle").text(d => d.t);

  placeAxisMenus();
}

function draw(){
  drawAxes();
  const vis = near();
  const EM = emphasis();
  /* Selecting is step 1.2's act, so step 1.1 must not draw its result. An
     uncarried construct is drawn at 6% opacity, and with a selection already in
     hand that made step 1.1 look as though the scope held seven constructs
     rather than a hundred and twenty-two -- the later step's decision bleeding
     back into the earlier step's view. Before step 1.2 the map shows the scope,
     flat, and the carried/dropped distinction appears where it is made. */
  const carryShown = state.stage >= 2;
  const isCar = d => !carryShown || d.carried;
  const onN = n => !vis || vis.has(n.id);
  const onE = e => !vis || (vis.has(e.source.id ?? e.source) && vis.has(e.target.id ?? e.target));
  const inPicked = n => n.mem.some(m => picked.has(m.i));

  linkSel = gLink.selectAll("line").data(links, d => d.id).join(
    en => en.append("line"), u => u, ex => ex.remove())
    .attr("stroke", d => cssv(TONE[d.tone]))
    .attr("stroke-opacity", d => (!onE(d) ? .07
      : !isCar(d) ? .1
      : (!d.pass ? .22 : .62)) * EM.edge(d))
    .attr("stroke-dasharray", d => d.pass ? null : "3 3")
    .attr("stroke-width", d => (onE(d) ? 1 : .55) *
      Math.min(4.5, .9 + Math.log2(1 + d.claims.length) * 1.15))
    .attr("marker-end", d => (!isCar(d) || !onE(d)) ? null : `url(#ar-${d.tone})`)
    .style("cursor","pointer")
    .on("mouseenter", (ev, d) => {
      if(dragging) return;
      const ps = d.claims.slice(0,4).map(c => `<li>${c.t}</li>`).join("");
      showTip(`<h5>${d.claims.length} relationship${d.claims.length>1?"s":""}</h5>
        <span class="sig">${d.source.label ?? d.source} → ${d.target.label ?? d.target}</span>
        <span class="sig">${[...d.signs].join(", ")} · ${[...d.stat].join(", ")} · ${d.papers.size} paper${d.papers.size>1?"s":""}${d.est.length?` · ${d.est.length} with a number`:""}</span>
        <ul>${ps}</ul>
        ${d.claims.length>4?`<span class="act">+${d.claims.length-4} more</span>`:``}
        ${state.stage === 3
          ? `<button type="button" class="tipadd${d.carried ? " on" : ""}"
               data-addlink="${hesc(d.id)}">${d.carried
               ? "\u2713 in the list \u2014 remove it" : "+ add to the list"}</button>
             <span class="act">or click the arrow</span>`
          : `<span class="act">click to pin</span>`}`, ev, state.stage === 3);
    })
    .on("mouseleave", () => state.stage === 3 ? hideTipSoon() : hideTip())
    .on("click", (ev, d) => { ev.stopPropagation();
      if(state.tool === "carry" && state.stage === 3){
        setCarryLink(d, !d.carried); cpersist(); refresh(); return;
      }

      state.pinned = {t:"e", d}; renderInsp(); });

  const ng = gNode.selectAll("g.nodeg").data(nodes, d => d.id).join(
    en => { const g = en.append("g").attr("class","nodeg");
      g.append("circle").attr("class","drop");
      g.append("circle").attr("class","ring");
      g.append("circle").attr("class","over");
      g.append("circle").attr("class","body");
      return g; },
    u => u, ex => ex.remove())
    .classed("picked", inPicked);

  ng.select("circle.body")
    .attr("r", rOf)
    .attr("fill", colOf)
    .attr("fill-opacity", d => (isCar(d) ? (onN(d) ? (d.mixed ? .55 : .9) : .13) : .06) * EM.node(d))
    .attr("stroke", d => isCar(d) ? cssv("--card") : cssv("--faint"))
    .attr("stroke-width", d => isCar(d) ? 1.4 : 1.1)
    .attr("stroke-dasharray", d => !isCar(d) ? "2 2.5" : (d.mixed ? "2 2" : null));
  ng.select("circle.ring").attr("r", d => rOf(d) + 5);
  // carried past the bars it fails: the override, made visible
  ng.select("circle.over")
    .attr("r", d => rOf(d) + 2.5)
    .attr("opacity", d => (state.stage === 3 && d.carried && overridden(d)) ? 1 : 0);
  ng.select("circle.drop").attr("r", d => rOf(d) + 22);

  ng.style("cursor", state.tool === "group" ? "copy"
                   : state.tool === "carry" ? "cell" : "pointer")
    .on("mouseenter", (ev, d) => {
      if(dragging) return;
      showTip(nodeTip(d), ev);
    })
    .on("mouseleave", hideTip)
    .on("click", (ev, d) => {
      ev.stopPropagation();
      // only where selecting is the step's job: on step 1.1 a click inspects
      if(state.tool === "carry" && carryShown){
        setCarryNode(d, !d.carried); cpersist(); refresh(); return;
      }
      if(state.tool === "group"){
        const ids = d.mem.map(m => m.i);
        const has = ids.some(i => picked.has(i));
        ids.forEach(i => has ? picked.delete(i) : picked.add(i));
        if(state.stage !== 2){ state.stage = 2; renderPanel(); renderTrack(lastView); }
        else renderSelbar();
        draw();
        return;
      }
      state.focus = state.focus === d.id ? null : d.id;
      state.pinned = {t:"n", d}; renderInsp(); draw();
    })
    .call(d3.drag()
      .on("start", (ev, d) => { dragging = true; hideTip();
        if(sim) sim.stop();                       // hold everything still
        d.fx = d.x; d.fy = d.y; })
      .on("drag", (ev, d) => {
        d.fx = ev.x; d.fy = ev.y; d.x = ev.x; d.y = ev.y;
        const t = dropTarget(d, ev.x, ev.y);
        ng.classed("dropcand", n => !!t && n.id === t.id);
        tickOnce();
      })
      .on("end", (ev, d) => {
        const t = dropTarget(d, ev.x, ev.y);
        ng.classed("dropcand", false);
        d.fx = null; d.fy = null; dragging = false;
        if(t){
          const ids = [...new Set([...d.mem.map(m => m.i), ...t.mem.map(m => m.i)])];
          const nm = (d.label.length <= t.label.length ? d.label : t.label).replace(/-/g," ");
          makeGroup(ids, nm);
        }else if(sim){ sim.alpha(.12).restart(); }
      }));

  nodeSel = ng;

  const labelled = nodes.filter(n => n.nc >= 8 || n.mem.length > 1 ||
    (state.focus && vis && vis.has(n.id)));
  labSel = gLab.selectAll("text").data(labelled, d => d.id)
    .join(en => en.append("text"), u => u, ex => ex.remove())
    .text(d => { const s = d.label.replace(/-/g," ");
      return s.length > 26 ? s.slice(0,25) + "…" : s; })
    .attr("font-family",'"IBM Plex Sans",sans-serif').attr("font-size",9.5)
    .attr("fill", cssv("--muted")).attr("text-anchor","middle").attr("pointer-events","none")
    .attr("opacity", d => (onN(d) ? 1 : .12) * EM.node(d));

  /* THE MERGES, AND THE MERGES BEING PROPOSED. Constructs are grouped on the
     map as though they already formed a node, which is what a reader expects
     of a cluster. A cluster IS a proposed merge now, so drawing it the way a merge is
     drawn is the honest preview -- and it is drawn DIFFERENTLY, dotted and
     fainter with its name in brackets, because a proposal that looks like a
     decision is the one thing this bench must not do. */
  const glist = state.collapse ? [] : [...groups.values()];
  if(state.layout === "clusters" && COM.out)
    COM.out.clusters.forEach((c, i) => glist.push({
      id:"com:" + c.id, name:"(" + comLabel(c) + ")", members:c.ids || [],
      color:cssv("--com-" + (i % 8)) || cssv("--steel"), proposed:true}));
  const hullOf = g => {
    const pts = [];
    for(const n of nodes) if(n.x != null && n.mem.some(m => g.members.includes(m.i))){
      const r = rOf(n) + 14;
      for(let k = 0; k < 10; k++){ const a = k * Math.PI / 5;
        pts.push([n.x + Math.cos(a)*r, n.y + Math.sin(a)*r]); }
    }
    if(pts.length < 3) return null;
    const hl = d3.polygonHull(pts);
    return hl ? d3.line().curve(d3.curveCatmullRomClosed.alpha(.5))(hl) : null;
  };
  const hulls = gHull.selectAll("path").data(glist, g => g.id).join(
    en => en.append("path").attr("class","hull"), u => u, ex => ex.remove())
    .attr("fill", g => g.color).attr("fill-opacity", g => g.proposed ? .06 : .1)
    .attr("stroke", g => g.color).attr("stroke-width", g => g.proposed ? 1.1 : 1.6)
    .attr("stroke-dasharray", g => g.proposed ? "2 4" : "5 3")
    .attr("stroke-opacity", g => g.proposed ? .5 : .75);
  const hlabs = gHull.selectAll("text").data(glist, g => g.id).join(
    en => en.append("text").attr("class","hulllab"), u => u, ex => ex.remove())
    .attr("fill", g => g.color).attr("text-anchor","middle")
    .attr("opacity", g => g.proposed ? .7 : 1).text(g => g.name);

  function paint(){
    // Keep every node inside the frame. Without this the simulation pushes the
    // outermost notions past the canvas edge and their labels are cut off.
    for(const n of nodes){
      if(n.x == null) continue;
      const r = rOf(n);
      n.x = Math.max(r + 6, Math.min(W - r - 6, n.x));
      n.y = Math.max(r + 20, Math.min(H - r - 32, n.y));
      if(n.fx != null) n.fx = n.x;
      if(n.fy != null) n.fy = n.y;
    }
    linkSel.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
           .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    ng.attr("transform", d => `translate(${d.x},${d.y})`);
    labSel.attr("x", d => d.x).attr("y", d => d.y - rOf(d) - 5);
    hulls.attr("d", g => hullOf(g) || "");
    hlabs.each(function(g){
      const ns = nodes.filter(n => n.x != null && n.mem.some(m => g.members.includes(m.i)));
      if(!ns.length){ d3.select(this).attr("opacity", 0); return; }
      d3.select(this).attr("opacity", 1)
        .attr("x", d3.mean(ns, n => n.x))
        .attr("y", d3.min(ns, n => n.y - rOf(n)) - 18);
    });
  }
  window.__paint = paint;
  paint();
}
function tickOnce(){ if(window.__paint) window.__paint(); }

/* ------------------------------------------------------------- inspector */
/* PINNING WITH NOWHERE TO READ THE RESULT is the one way the full-screen view
   can waste a click, so the inspector pane opens itself for that. It is closed
   again by its own Hide button, or by leaving full screen. */
function fsInspPop(){
  const cv = document.querySelector(".canvas");
  if(!cv || !fsOn(cv) || !state.pinned) return;
  const pane = document.getElementById("fsInsp");
  const btn = document.getElementById("fsInspBtn");
  if(pane) pane.hidden = false;
  if(btn) btn.setAttribute("aria-pressed", "true");
}
function renderInsp(){
  const box = document.getElementById("insp"), sub = document.getElementById("inspSub");
  const p = state.pinned;
  if(!p){ box.hidden = true; sub.textContent = "Hover anything on the map for a definition. Click to pin it here."; return; }
  box.hidden = false;
  if(p.t === "n"){
    const d = p.d, lead = N.get(d.mem[0].i);
    sub.textContent = "A construct, and what the corpus records about it.";
    box.innerHTML = `<dl>
      <dt>Construct</dt><dd style="font-family:Spectral,Georgia,serif;font-size:16px;line-height:1.25">${d.label.replace(/-/g," ")}</dd>
      ${lead?.d ? `<dt>Definition</dt><dd class="def">${lead.d}</dd>` : ""}
      <dt>Signature</dt><dd class="mono" style="font-size:11.5px">${d.levels.join(" + ")} · ${lead?.s || "?"} · ${lead?.f === "s" ? "stock" : "flow"} · borne by ${lead?.b || "?"}</dd>
      ${d.mixed ? `<dd style="color:var(--neg);font-size:12px">Merged from constructs at more than one level of analysis — they are not measuring the same kind of thing.</dd>` : ""}
      <dt>Weight</dt><dd>${d.nc} relationship${d.nc>1?"s":""} across ${d.papers.length} paper${d.papers.length>1?"s":""}</dd>
      ${d.mem.length > 1 ? `<dt>Names folded here (${d.mem.length})</dt><dd class="mono" style="font-size:11px;color:var(--muted)">${d.mem.map(m => m.i).join(", ")}</dd>` : ""}
      <dt>Papers</dt><dd><ul>${d.papers.map(s => { const q = pap(s);
        return `<li>${q.d?`<a href="https://doi.org/${q.d}" target="_blank" rel="noopener">${q.a} (${q.y})</a>`:`${q.a} (${q.y})`} <span class="jr">${q.j}</span></li>`;}).join("")}</ul></dd>
      ${state.stage === 1 ? underBlock(d) : ""}
      ${comPinHTML(d)}
    </dl>`;
    wireUnder();
    wireCom();
  }else{
    const e = p.d;
    sub.textContent = "An arrow, and every relationship the corpus holds for it.";
    box.innerHTML = `<dl>
      <dt>Arrow</dt><dd style="font-family:Spectral,Georgia,serif;font-size:15px;line-height:1.3">${(e.source.label ?? e.source).replace(/-/g," ")} → ${(e.target.label ?? e.target).replace(/-/g," ")}</dd>
      <dt>Agreement</dt><dd>${[...e.signs].join(", ")} · ${e.pass ? `<span class="pill ok">clears both bars</span>` : `<span class="pill no">fails a bar</span>`}</dd>
      <dt>Relationships (${e.claims.length})</dt><dd><ul>${e.claims.map(c => {
        const q = pap(c.p);
        return `<li>${c.t}<br><span class="jr">${q.a} ${q.y} · ${c.e} · spec ${c.sp}/4 · comm ${c.cm}/4 · evidence ${c.ea}/4</span></li>`;}).join("")}</ul></dd>
      ${e.est.length ? `<dt>Estimates</dt><dd><ul>${e.est.map(x =>
        `<li class="mono" style="font-size:11px;color:var(--muted)">${x.v}</li>`).join("")}</ul></dd>` : ""}
    </dl>`;
  }
  fsInspPop();
}

/* Under the threshold and one claim away: the constructs the occurrence filter
   is holding back, offered where the curator is already looking at what they
   connect to. Adding one puts it in scope and selects it, because a construct
   admitted by hand and then left behind would be a decision with no effect. */
function underBlock(d){
  const cand = underThreshold(d);
  const mine = new Set(d.mem.map(m => m.i));
  const added = [...state.admit].map(i => N.get(i)).filter(n => n && !mine.has(n.i));
  if(!cand.length && !added.length) return "";
  const row = (n, k, on) => `<li class="undrow">
    <button type="button" class="undbtn" data-${on ? "unadmit" : "admit"}="${n.i}"
      title="${on ? "put it back under the threshold" : "add it to what goes forward"}">${on ? "\u2212" : "+"}</button>
    <span>${n.i.replace(/-/g," ")}${k ? `<i>${k} relationship${k>1?"s":""} to this one</i>` : ""}</span>
  </li>`;
  // Grouped by how many papers use them, nearest the threshold first: with the
  // threshold at three, a construct two papers share is a different proposition
  // from one a single paper named, and the grouping is the whole of that reading.
  const byN = new Map();
  for(const x of cand){
    const k = x.n.p.filter(okPaper).length;
    if(!byN.has(k)) byN.set(k, []);
    byN.get(k).push(x);
  }
  const bands = [...byN.keys()].sort((a, b) => b - a);
  return `
    <dt>Under the threshold, one relationship away (${cand.length})</dt>
    <dd>${cand.length ? bands.map(k => `
      <div class="undband"><span class="undn">${k} paper${k === 1 ? "" : "s"}
        <i>${byN.get(k).length}</i></span>
      <ul class="undlist">${byN.get(k).map(x => row(x.n, x.claims, false)).join("")}</ul></div>`).join("")
      + `<p class="def">Used by fewer than ${state.minp} paper${state.minp === 1 ? "" : "s"} in scope, so
      the occurrence threshold keeps ${cand.length === 1 ? "it" : "them"} off the map. Add one and it
      is drawn, selected, and carried forward — the threshold finds what a literature argues
      about, and a model can still need a construct only one paper named.</p>`
      : `<p class="def">Nothing under the threshold connects to this one.</p>`}
    ${added.length ? `<dt>Admitted by hand (${added.length})</dt>
      <dd><ul class="undlist">${added.map(n => row(n, 0, true)).join("")}</ul></dd>` : ""}</dd>`;
}

function wireUnder(){
  document.querySelectorAll("[data-admit]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.dataset.admit;
      state.admit.add(id);
      dropped.c.delete(id);              // admitted and not carried is a no-op
      cpersist(); refresh();
      // the pinned cluster is from the previous build and may now fold it in
      if(state.pinned && state.pinned.t === "n"){
        const lead = state.pinned.d.mem[0].i;
        const fresh = (lastView.nodes || []).find(x => x.mem.some(m => m.i === lead));
        if(fresh) state.pinned = {t:"n", d:fresh};
      }
      renderInsp();
    }));
    /* data-unadmit was wired here to a control nothing renders. Left behind by a
       rename or a move; a querySelectorAll that matches nothing costs
       nothing until somebody reads it and believes it. */
}

/* ------------------------------------------------------------ tally etc. */
function renderTally(v){
  const sel = (lastView.nodes || []).filter(n => n.carried).length;
  document.getElementById("tally").innerHTML =
    `<b>${v.notions}</b> drawn · <b>${sel}</b> selected · <b>${v.arrows}</b> arrows<br>` +
    `<b>${v.papersIn}</b> papers · ${v.constructsIn} constructs in scope` +
    (state.core ? ` · largest joined-up set only` : "");
  /* The key sits in the toolbar as swatches and a name; what each colour and
     each circle size means is on hover, where it costs no room. */
  const keys = colKeys();
  const ca = AXES[state.cBy] || {label:""}, sa = AXES[state.sBy] || {};
  const lg = document.getElementById("legend");
  lg.innerHTML = `<button type="button" class="lgbtn" id="lgTog">
    ${keys.map(k => `<i style="background:${k.c}"></i>`).join("")}
    <span class="lgname">${ca.label}</span></button>`;
  const t = document.getElementById("lgTog");
  if(t){
    const tip = `<h5>What the map is coloured and sized by</h5>
      <span class="sig">colour \u00b7 ${ca.label}</span>
      <ul class="lgkey">${keys.map(k =>
        `<li><i style="background:${k.c}"></i>${k.t || "\u2014"}</li>`).join("")}</ul>
      <span class="sig">size \u00b7 ${sa.of ? sa.label : "fixed"}</span>
      ${sa.of ? `<p class="def">A bigger circle is a higher ${sa.label}, on a square-root
        scale so the largest does not swamp the rest.</p>` : ""}
      <span class="act">change either in the plot block on step 1.2</span>`;
    t.addEventListener("mouseenter", ev => showTip(tip, ev));
    t.addEventListener("mousemove", ev => showTip(tip, ev));
    t.addEventListener("mouseleave", hideTip);
    t.addEventListener("click", ev => ev.preventDefault());
  }
}
function chint(){
  const el = document.getElementById("chint");
  if(!el) return;
  // before the tool branches: with nothing to act on, what the tool does is
  // not the thing to say
  if(state.stage === 3){
    const why = noArrowsWhy();
    if(why){ el.textContent = "No arrows here: " + why; return; }
  }
  if(state.tool === "carry" && (state.stage === 2 || state.stage === 3)){
    const N = lastView.nodes || [];
    const E = lastView.links || [];
    el.textContent = `Click to select or drop \u00b7 ${N.filter(n => n.carried).length} of ${N.length} constructs selected`
      + (state.stage === 3
          ? ` \u00b7 ${E.filter(e => e.carried).length} of ${E.length} arrows selected` +
            " \u00b7 clicking an arrow toggles it \u00b7 only step 1.2's selection is drawn"
          : "");
    return;
  }
  if(state.tool === "group" && state.stage === 2){
    el.textContent = picked.size
      ? `${picked.size} picked — name them in the panel above`
      : "Click the constructs you judge to measure the same quantity. Use the mode buttons above the map to switch what a click does.";
    return;
  }
  if(state.focus){
    el.textContent = "Showing what is within one arrow of the pinned construct — click it again to show everything";
    return;
  }
  const note = emphasis().note;
  el.textContent = note || (state.stage >= 3
    ? (state.stage === 4
        ? "Only what step 1.3 selected — the arrows you kept, and the constructs they join"
        : "Only the constructs step 1.2 selected · go back a step to add one")
    : "Drag one construct onto another to merge them · scroll to zoom · click to pin");
}


export { CRAMP, H, PB, PL, PR, PT, SRAMP, W, axDomain, axFrac, axOn, axTicks, axesOn, bootArrows, bootMap, bootSvg, chint, colKeys, colOf, defs, dragging, draw, drawAxes, dropTarget, emphasis, fitNodes, frac, gAxis, gHull, gLab, gLink, gNode, hideTip, hideTipSoon, idOf, labSel, lastView, linkSel, links, laidOnAxes, mapFS, mapSet, near, nodeSel, nodes, openMarks, overridden, rOf, recentre, renderInsp, renderTally, root, showTip, sim, size, spotlight, svg, tickOnce, tip, tipHold, underBlock, wireUnder, xAt, yAt, zoomB, zoomBy, zoomRead };

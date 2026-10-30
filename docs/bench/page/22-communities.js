/* AMG bench, page script: clusters around one construct.
   One shared global scope, loaded in order. See page/README.md.

   WHY THIS IS NOT COMMUNITY DETECTION ON THE ARROWS.
   ==========================================================================

   A literature puts a large number of constructs around one main construct
   -- firm performance, in this corpus -- and clusters have to be made out of
   that.

   The obvious method is Louvain over the map's links, and a hub defeats it.
   Measured on the shipped payload: the three constructs the demonstration
   merges as firm performance have 24 neighbours; with the hub left out those
   24 have SEVEN arrows between them, touching eleven of them, so thirteen
   have no arrow to any other neighbour at all. To a method that clusters on
   arrows the neighbourhood is a star, and a star has no community structure
   to find.

   What carries the structure instead is co-occurrence: 73 of the 276 possible
   pairs appear in the same paper, and exactly one neighbour shares a paper
   with nobody. So the tie is the scholar's declaration -- shared papers,
   direct arrows, wording similarity, in any combination -- and core/
   communities.js does the clustering over whatever that yields.

   A CAUTION THE PAGE HAS TO SHOW, not hide. Most constructs appear in one or
   two papers, so shared-paper ties partly follow the papers that use many
   constructs together: the second cluster on the demonstration is one paper's
   own survey factors. That is still a finding, because it is a stream. But
   the block reports the papers behind every cluster, so a cluster that crosses
   papers can be told from one that repeats a single paper.

   A CLUSTER IS A PROPOSAL, AND ACCEPTING ONE IS A MERGE, in the language the
   workbench already has rather than in one of its own. There is exactly one
   object in this bench that holds several constructs under one
   name -- the group step 1.2 makes -- and it says that they measure one
   quantity. A clustering is a way of PROPOSING candidates for it, which is
   the same shape as step 2.1's suggested mergers: computed, read, and taken
   or not.

   So until it is accepted a cluster changes nothing: the members stay
   separate constructs, and renaming one or moving a construct between them is
   a reading the scholar can revise. Accepting goes through makeGroup, the
   same door a drag on the map and a taken cross-stream proposal go through,
   so it carries both ends, draws one boundary, is reversible, and leaves the
   same record.

   WHAT IT COSTS, SAID BEFORE IT IS PRESSED. A cluster is built from shared
   papers, and papers do not respect the level of analysis: the demonstration's
   third cluster spans firm and individual. Merging across levels is the error
   this bench exists to make visible, so a cluster that spans them says so on
   its own row, and the merge stays flagged afterwards exactly as a hand-made
   one does.

   The word in the code is `communities`, because `clusters()` in 03c-corpus.js
   already means something else: merging constructs whose similarity clears
   the threshold into the map's nodes. The word on the page is "cluster",
   which is the word a reader brings with them. */
import { hesc } from "../core/safe.js";
import { AI, AITIP, aiErrHTML, aiMark } from "./08-ask.js";
import { communities } from "../core/communities.js";
import { COMAX, N, pap, state } from "./03-stores.js";
import { simPairs } from "./03d-similarity.js";
import { G } from "../graph-data.js";

/* WHAT IS BEING CLUSTERED AND HOW. Everything here travels in the scenario
   except `out`, which is derived, and `busy`. */
const COM = {
  hub: "",            // a map node's id, or "" for the whole map
  ties: {papers:true, arrows:true, simil:false},
  res: 1,
  names: {},          // cluster id -> the scholar's name for it
  moves: {},          // node id -> cluster id the scholar put it in
  out: null,
  at: "",
  err: "",
  moving: "",       // the member whose move is being chosen; transient
  descr: {},        // cluster id -> the sentence a reader was given for it
  ai: null,         // the last naming proposal: {out, outside, at}
  /* HOW COARSE. Two controls, because they are two different questions.
     `res` is the resolution: a continuous dial on how tightly a cluster has
     to hold together, measured on the shipped corpus at the default threshold
     as running from one cluster of 156 at 0.4 to eighty-two clusters of ten
     at 8, monotonically. `rung` picks a level of Louvain's own hierarchy,
     which is free once a run is done because the whole ladder comes out of
     it: -1 is the coarsest, 0 the finest. */
  rung: -1,
  lad: null,        // the ladder as the engine returned it
  ms: 0             // what the last run cost, so the question of automatic
                    // versus manual computation stays answerable from the page
};
const TIES = [
  ["papers", "Shared papers", "One tie per paper that uses both constructs. This is what carries the structure a hub's arrows do not: most of these neighbours have no arrow to each other."],
  ["arrows", "Arrows between them", "One tie per relationship running directly from one to the other, not through the construct being clustered."],
  ["simil", "Wording similarity", "The standing similarity score from step 1.2, whichever measure is set. A word score cannot tell a shared quantity from a shared vocabulary, so it is off by default."]
];

/* A cluster's id is its smallest member when it was computed, so that a
   scenario can name a cluster and have the name still land after a
   recomputation. A move changes a cluster's membership and not its id. */
const comKey = members => "k:" + members[0];
const comLabel = c => COM.names[c.id] || (c.members[0] || "").replace(/-/g, " ");

/* The levels a cluster's constructs sit at. More than one is the thing to say
   out loud before anybody merges it. */
function comLevels(c, view){
  const out = new Set();
  for(const id of c.members){
    const n = nodeOf(view, id);
    for(const l of ((n && n.levels) || [])) out.add(l);
  }
  return [...out].sort();
}
/* Every construct id inside a cluster, which is what a merge is made of: a
   cluster's members are MAP NODES and a node may already be a merge. */
function comIds(c, view){
  const out = [];
  for(const id of c.members){
    const n = nodeOf(view, id);
    for(const m of ((n && n.mem) || [])) out.push(m.i);
  }
  return [...new Set(out)];
}

const nodeOf = (view, id) => (view.allNodes || view.nodes || []).find(n => n.id === id);
const ends = e => [e.source && e.source.id !== undefined ? e.source.id : e.source,
                   e.target && e.target.id !== undefined ? e.target.id : e.target];

/* The map nodes joined to the hub by any arrow, the hub itself left out. On
   the whole map, every node in scope. */
function comHood(view){
  const ns = view.nodes || [];
  if(!COM.hub) return ns.slice();
  const live = new Set(ns.map(n => n.id));
  const got = new Set();
  for(const e of (view.links || [])){
    const [a, b] = ends(e);
    if(a === COM.hub && live.has(b) && b !== COM.hub) got.add(b);
    if(b === COM.hub && live.has(a) && a !== COM.hub) got.add(a);
  }
  return ns.filter(n => got.has(n.id));
}

/* The ties, one list per kind so the block can say how many each contributed.
   Weights add, which is what lets a pair held by both a shared paper and an
   arrow count for more than one held by either. */
function comTies(view, hood){
  const ids = new Set(hood.map(n => n.id));
  const out = {papers:[], arrows:[], simil:[]};
  if(COM.ties.papers){
    for(let i = 0; i < hood.length; i++){
      const pi = new Set(hood[i].papers || []);
      for(let j = i + 1; j < hood.length; j++){
        const sh = (hood[j].papers || []).filter(p => pi.has(p)).length;
        if(sh) out.papers.push([hood[i].id, hood[j].id, sh]);
      }
    }
  }
  if(COM.ties.arrows){
    for(const e of (view.links || [])){
      const [a, b] = ends(e);
      if(a === b || !ids.has(a) || !ids.has(b)) continue;
      out.arrows.push([a, b, (e.claims || []).length || 1]);
    }
  }
  if(COM.ties.simil){
    /* The similarity is scored between CONSTRUCTS and the nodes may be
       merges, so a pair's score is the strongest between their members. */
    const of = new Map();
    for(const n of hood) for(const m of (n.mem || [])) of.set(m.i, n.id);
    const best = new Map();
    for(const [a, b, s] of (simPairs(new Set(of.keys())) || [])){
      const x = of.get(a), y = of.get(b);
      if(!x || !y || x === y) continue;
      const k = x < y ? x + "\u0000" + y : y + "\u0000" + x;
      if(!best.has(k) || best.get(k) < s) best.set(k, s);
    }
    for(const [k, s] of best){
      const [x, y] = k.split("\u0000");
      out.simil.push([x, y, s]);
    }
  }
  return out;
}

/* The papers behind a cluster, most shared first, so a cluster that crosses
   papers can be told from one that is a single paper's instrument. */
function comPapers(members, view){
  const n = new Map();
  for(const id of members){
    const nd = nodeOf(view, id);
    for(const p of ((nd && nd.papers) || [])) n.set(p, (n.get(p) || 0) + 1);
  }
  return [...n.entries()].filter(e => e[1] > 1)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

/* THE RUN, which is the expensive half, and THE PICK, which is not.

   Measured on the shipped payload: the whole map at a floor of one claim is
   1,026 constructs and 26,039 shared-paper ties, and the run costs 28ms --
   8ms to build the ties and 20ms for Louvain. At the default threshold it is
   11ms over 156 constructs. That is below a frame, which is the answer to
   whether this should compute on change or wait for a button: it computes.
   The button is kept and the cost is printed beside it, so that on a corpus
   where it stops being free the page says so rather than the scholar
   guessing. Moving the level costs nothing at all, because the ladder came
   out of the same run. */
function comRun(view){
  COM.err = "";
  const hood = comHood(view);
  if(hood.length < 2){
    COM.out = null; COM.lad = null;
    COM.err = COM.hub
      ? "Nothing on the map is joined to this construct at the current scope, so there is nothing to cluster."
      : "Fewer than two constructs are drawn, so there is nothing to cluster.";
    return;
  }
  /* performance.now(), because Date.now() rounds an eleven-millisecond run
     to zero, and the number on screen is the whole argument for computing on
     change rather than on a button press. */
  const t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  const T = comTies(view, hood);
  const pairs = T.papers.concat(T.arrows, T.simil);
  const r = communities(hood.map(n => n.id), pairs, {resolution:COM.res});
  COM.ms = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;
  COM.lad = {ladder:r.ladder, lone:r.lone.slice(), n:r.n,
             ties:{papers:T.papers.length, arrows:T.arrows.length, simil:T.simil.length}};
  comPick(view);
}

/* Which rung is being read, with the scholar's moves applied over it. Free,
   so the level control redraws rather than recomputing. */
function comPick(view){
  const L = COM.lad;
  if(!L){ COM.out = null; return; }
  const rung = COM.rung < 0 || COM.rung >= L.ladder.length
    ? L.ladder.length - 1 : COM.rung;
  const r = {clusters:L.ladder[rung], lone:L.lone, n:L.n};
  let cls = r.clusters.map(m => ({id:comKey(m), members:m.slice()}));
  /* THE SCHOLAR'S MOVES, APPLIED AFTER THE COMPUTATION AND RECORDED AS
     THEIRS. A move to a cluster that no longer exists is dropped rather than
     resurrecting an empty one, because the model it was read off has changed
     and a silent restoration would hide that. */
  const byId = new Map(cls.map(c => [c.id, c]));
  let moved = 0, stale = 0;
  for(const [node, to] of Object.entries(COM.moves || {})){
    if(!byId.has(to)){ stale++; continue; }
    const from = cls.find(c => c.members.includes(node));
    if(!from || from.id === to) continue;
    from.members = from.members.filter(x => x !== node);
    byId.get(to).members = byId.get(to).members.concat([node]).sort();
    moved++;
  }
  cls = cls.filter(c => c.members.length);
  cls.sort((a, b) => b.members.length - a.members.length ||
    (a.members[0] < b.members[0] ? -1 : 1));
  for(const c of cls){
    c.papers = comPapers(c.members, view);
    c.levels = comLevels(c, view);
    c.ids = comIds(c, view);
  }
  COM.out = {clusters:cls, lone:r.lone.slice(), n:r.n, moved, stale,
             rung, rungs:L.ladder.length, sizes:L.ladder.map(x => x.length),
             ties:L.ties};
  COM.at = new Date().toISOString().slice(0, 16).replace("T", " ");
  comAxis();
}

/* THE READING ON THE MAP. One category per cluster plus one for everything
   outside the neighbourhood, so a construct the clustering never considered
   is drawn as outside rather than folded into a cluster it is not in. The
   array is mutated in place because AXES holds a reference to it. */
function comAxis(){
  const cats = COMAX.cats;
  cats.length = 0;
  const cls = (COM.out && COM.out.clusters) || [];
  cls.forEach(c => cats.push(c.id));
  cats.push("\u0000out");
  const at = new Map();
  cls.forEach(c => { for(const m of c.members) at.set(m, c.id); });
  COMAX.of = n => at.get(n && n.id) || "\u0000out";
  COMAX.label = c => c === "\u0000out" ? "outside" :
    (COM.names[c] || String(c).replace(/^k:/, "").replace(/-/g, " "));
}

/* WHICH CLUSTER A NODE IS IN, for the map. An index rather than an id,
   because what the map needs is a colour slot and a region. */
function comOf(id){
  if(!COM.out) return null;
  const i = COM.out.clusters.findIndex(c => c.members.includes(id));
  return i < 0 ? null : i;
}
const comCount = () => COM.out ? COM.out.clusters.length : 0;
const comReady = () => !!(COM.out && COM.out.clusters.length);

/* ---- the three surfaces ------------------------------------------------

   The clustering is reached from one button in the Merge constructs by
   similarity block, which opens an overlay of the proposals; its settings sit
   behind the Clusters preset, laid out as Manual's are; and the naming is
   launched from that same panel.

   So there are three surfaces, and each has one job.

   comSetHTML  the settings, in the Plot block behind the Clusters preset,
               laid out like Manual's: what counts as a tie, how cohesive, which
               rung, what the last run cost, and the naming ask.
   comListHTML the proposals, in an overlay. A list of candidate merges is
               something you read down once and act on, which is a dialog and
               not a column in a panel.
   comPinHTML  one line in the inspector, which opens the same overlay for
               what a single pinned construct is linked to.

   The block that was inline on step 1.2's panel is gone: it put a long list
   at the first level of reading on a step whose work is the threshold. */

/* Browsers coarsen performance.now() to protect against timing attacks, so a
   run faster than their granularity really does come back as zero. Printing
   "0.0ms" reads as a measurement nobody took; saying it was under a
   millisecond is what was actually observed. */
const comMs = () => COM.ms < 1 ? "under a millisecond" : Math.round(COM.ms) + "ms";
const comScopeWord = () => COM.hub ? "what one construct is linked to" : "the whole map";

function comSetHTML(){
  const O = COM.out;
  const sizes = O ? O.sizes : null;
  return `
    <div class="combox">
      <span class="movlab">What counts as a tie</span>
      <div class="comties">${TIES.map(([k, lab, why]) => `<label class="chk"
        title="${hesc(why)}"><input type="checkbox" data-comtie="${k}"${
        COM.ties[k] ? " checked" : ""}><span>${lab}</span></label>`).join("")}</div>

      <span class="movlab">How cohesive <b>${COM.res.toFixed(1)}</b>${O
        ? ` · ${O.clusters.length} cluster${O.clusters.length === 1 ? "" : "s"}` : ""}</span>
      <input type="range" data-comres="1" min="0.4" max="8" step="0.1" value="${COM.res}"
        aria-label="How cohesive a cluster has to be: higher gives more and tighter clusters">
      <p class="why">Higher asks a cluster to hold together more tightly, so there are more
        of them and each is smaller.${Object.keys(G.papers || {}).length ? ` On this corpus at the shipped threshold it runs from
        one cluster of 156 at the left to eighty-two of about ten at the right.` : ``}</p>

      ${sizes && sizes.length > 1 ? `<span class="movlab">Which level</span>
      <div class="modebar">${sizes.map((n, i) => `<button type="button" data-comrung="${i}"
        aria-pressed="${O.rung === i}">${n} clusters</button>`).join("")}</div>
      <p class="why">Louvain's own hierarchy: each level groups the level below it, so
        moving down subdivides what you are looking at rather than showing you a different
        clustering. It is free — the whole ladder came out of one run.</p>` : ""}

      <span class="cmpacts" style="margin:8px 0 0">
        <button type="button" class="edbtn" data-comrun="${hesc(COM.hub)}"><b>${
          O ? "Compute again" : "Compute"}</b></button>
        ${O ? `<button type="button" class="edbtn" data-comopen="1">See the ${
          O.clusters.length} proposed</button>` : ""}
        ${O && AI.cap ? `<button type="button" data-ai="cluname"${AI.busy ? " disabled" : ""}
          title="Reads every member's definition and returns a name and a sentence per cluster. Asked for rather than automatic, because the prompt is long and nothing about a name changes when a slider moves.${AITIP}">${aiMark()}${
          AI.busy === "cluname" ? "reading the definitions…" : "name these clusters"}</button>` : ""}
      </span>
      ${COM.err ? `<p class="why" style="color:var(--neg)">${hesc(COM.err)}</p>` : ""}
      ${O ? `<p class="why"><b>${O.clusters.length}</b> cluster${
        O.clusters.length === 1 ? "" : "s"} over <b>${O.n}</b> construct${
        O.n === 1 ? "" : "s"} of ${hesc(comScopeWord())} · ties: ${
        O.ties.papers} shared paper${O.ties.papers === 1 ? "" : "s"}, ${
        O.ties.arrows} arrow${O.ties.arrows === 1 ? "" : "s"}${
        COM.ties.simil ? `, ${O.ties.simil} by wording` : ""} · ${O.lone.length} tied to
        nothing${O.moved ? ` · <b>${O.moved}</b> moved by hand` : ""} · computed in
        <b>${comMs()}</b>, which is why it does not wait for the button</p>` : ""}
      ${aiErrHTML("cluname")}
      <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A cluster is a <b>proposal</b>. Nothing in the model changes until one
        is accepted, and accepting it is a <b>merge</b>: the same act as dragging one
        construct onto another, with the same record and the same boundary on the map. On
        the map the members of a proposed cluster are drawn inside a dashed boundary, so you
        can see the merge before you make it. The same ties and the same settings give the
        same clusters on any machine: the nodes are sorted before they are indexed, every
        candidate is considered in order, and there is no random number in it.</span></p>
    </div>`;
}

/* The proposals, for the overlay. */
function comListHTML(view){
  const O = COM.out;
  if(!O) return `<p class="empty">${hesc(COM.err ||
    "Nothing has been clustered yet. The Clusters preset on step 1.2 has the settings.")}</p>`;
  return `
    ${COM.ai && COM.ai.out.length ? `<p class="def"><b>${
      COM.ai.out.length}</b> name${COM.ai.out.length === 1 ? "" : "s"} proposed${
      COM.ai.outside ? `, ${COM.ai.outside} naming no cluster here and discarded` : ""} ·
      nothing is applied until you accept it, and the record says which of the two of you
      chose.</p>` : ""}
    <div class="comlist">${O.clusters.map((c, i) => `<div class="comrow">
      <span class="comn" style="background:var(--com-${i % 8})">${c.members.length}</span>
      <span class="comnm"><input type="text" class="defbox cond" data-comname="${hesc(c.id)}"
          value="${hesc(comLabel(c))}" aria-label="Name for this cluster">
        <span class="commem">${c.members.map(m => COM.moving === m
          ? `<select class="commvsel" data-commoveto="${hesc(m)}"
               aria-label="Which cluster to move ${hesc(m.replace(/-/g, " "))} to">
               ${O.clusters.map(z => `<option value="${hesc(z.id)}"${
                 z.id === c.id ? " selected" : ""}>${hesc(comLabel(z))}</option>`).join("")}
             </select>`
          : `<button type="button" class="commv" data-commove="${hesc(m)}"
               title="Move this construct to another cluster"
               >${hesc(m.replace(/-/g, " "))}</button>`).join("")}</span>
        <span class="compap">${c.papers.length
          ? c.papers.slice(0, 3).map(([p, k]) => `${hesc((pap(p) || {}).a || p)} ${
              hesc(String((pap(p) || {}).y || ""))} <i>${k} of ${c.members.length}</i>`).join(" · ")
          : "no paper uses more than one of these"}</span>
        ${(() => { const pr = ((COM.ai && COM.ai.out) || []).find(x => x.id === c.id);
          return pr ? `<span class="comprop">
            <b>proposed</b> ${hesc(pr.name)}
            <button type="button" class="edbtn" data-comname-ok="${hesc(c.id)}">Accept</button>
            <button type="button" class="edbtn" data-comname-no="${hesc(c.id)}">Dismiss</button>
            <i>${hesc(pr.why)}</i></span>` : ""; })()}
        ${COM.descr[c.id] ? `<span class="comdesc">${hesc(COM.descr[c.id])}</span>` : ""}
        ${c.members.length > 1 ? `<span class="comacts">
          <button type="button" class="edbtn" data-comtake="${hesc(c.id)}"
            title="Merge these into one construct under this name. The same act as dragging one onto another on the map, and reversible the same way.">Accept as a merge</button>
          ${c.levels.length > 1 ? `<b class="comwarn">${c.levels.join(" + ")} — two
            constructs at different levels are not measuring the same kind of thing;
            the merge will stay flagged</b>` : ""}
        </span>` : ""}
      </span>
    </div>`).join("")}</div>`;
}

/* One line in the inspector: the per-construct route into the same overlay. */
function comPinHTML(d){
  if(!d) return "";
  const mine = COM.hub === d.id;
  return `
    <dt>Clusters</dt>
    <dd>
      <p class="def">What this construct is linked to, grouped by the papers those
        constructs share. A proposal: accepting one is a merge.</p>
      <span class="cmpacts" style="margin:4px 0 0">
        <button type="button" class="edbtn" data-comrun="${hesc(d.id)}">${
          mine && COM.out ? "Cluster it again" : "Cluster what it is linked to"}</button>
        ${mine && COM.out ? `<button type="button" class="edbtn" data-comopen="1">See the ${
          COM.out.clusters.length} proposed</button>` : ""}
      </span>
    </dd>`;
}

/* ---- what travels in the scenario -------------------------------------- */

const comSnap = () => ({hub:COM.hub, ties:Object.assign({}, COM.ties), res:COM.res,
  names:Object.assign({}, COM.names), moves:Object.assign({}, COM.moves),
  descr:Object.assign({}, COM.descr),
  /* The members as computed, so a reader who opens this scenario can see what
     the names and the moves were about even before anything is recomputed --
     and so a cluster could later become a building block of the model, which
     is a decision for the scholar and is not built. */
  were:COM.out ? COM.out.clusters.map(c => ({id:c.id, members:c.members.slice()})) : []});

function comLoad(sn){
  const s = sn && sn.com;
  /* A SNAPSHOT THAT CARRIES NO CLUSTERS CLEARS THEM. This used to return and
     leave COM.out standing, which is invisible while every project is over
     the same corpus and wrong the moment one is not: `New project` emptied
     the corpus and step 2 went on reporting five clusters over 139 constructs
     that the project no longer held. A result computed against a corpus that
     has been swapped out is not a cached result, it is a stale one. */
  if(!s){
    COM.out = null; COM.names = {}; COM.moves = {}; COM.descr = {};
    return;
  }
  if(typeof s.hub === "string") COM.hub = s.hub;
  if(s.ties) for(const k of Object.keys(COM.ties))
    if(typeof s.ties[k] === "boolean") COM.ties[k] = s.ties[k];
  if(isFinite(+s.res)) COM.res = Math.min(3, Math.max(0.4, +s.res));
  COM.names = Object.assign({}, s.names || {});
  COM.moves = Object.assign({}, s.moves || {});
  COM.descr = Object.assign({}, s.descr || {});
  COM.out = null;
}

export { COM, TIES, comAxis, comCount, comHood, comIds, comLabel, comLevels,
         comListHTML, comLoad, comMs, comOf, comPick, comPinHTML, comReady, comRun, comSetHTML,
         comSnap, comTies };

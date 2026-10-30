/* CLUSTERS AROUND ONE CONSTRUCT, IN THE PAGE.
   ==========================================================================

   tests/communities.test.mjs holds the engine: determinism, the star, and the
   result on the real corpus. This holds the part of it a scholar touches, and
   the two things that part can get wrong without any number coming out
   different.

   THE FIRST is that a cluster is a READING. Its members stay separate
   constructs and the model does not change, so the test checks that a name
   and a move are recorded as the scholar's and travel in the scenario -- the
   clusters themselves can be recomputed, those two cannot.

   THE SECOND is the Clusters layout, where the only check that means anything
   is on the map. The first build of it gave the unclustered constructs a cell
   of their own, which on step 1.2 put a hundred and forty of them in a
   quarter of the diagram; the collide force out of that pile pushed the
   clustered ones clean out of their cells, with targets at 254 and 761 and
   means coming back at 645 and 723. Nothing in the panel showed it. So this
   asserts where the constructs actually ARE.

   Run:  node tests/clusters.mjs
*/

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "docs");
const BENCH = path.join(DOCS, "bench");
const NAME = "the survey instrument";

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
  {stdio:"ignore"});
const file = path.join(BENCH, "__clusters.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 700));
  const page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  /* NO BACKTICKS AND NO DOLLAR-BRACE BELOW: this is a template literal, so a
     backtick closes it and an interpolation is evaluated out here. And two
     backslashes for any regex class. */
  const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const o = {};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  const Q = s => [...document.querySelectorAll(s)];
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  try{
    const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(6000); }
    B.state.stage = 2; B.renderPanel(); await nap(1600);
    const hub = B.lastView.nodes.find(n =>
      (n.mem || []).some(m => m.i === "firm-accounting-performance"));
    if(!hub) throw new Error("the demonstration's performance merge is not on the map");
    o.hub = hub.id;
    B.state.pinned = {t:"n", d:hub};
    B.renderInsp(); await nap(800);
    if(!document.querySelector("#insp [data-comrun]"))
      throw new Error("a pinned construct offers no way to cluster what it is linked to");
    Q("#insp [data-comrun]")[0].click(); await nap(2500);
    if(!B.COM.out) throw new Error("clustering produced nothing: " + (B.COM.err || ""));
    o.first = B.COM.out.clusters.map(c => c.members.join("+"));
    o.ties = B.COM.out.ties;
    /* THE PROPOSALS ARE IN AN OVERLAY NOW, not in the card. A list of
       candidate merges is read down once and acted on, which is a dialog;
       the settings live on the Clusters preset. So the test opens it. */
    const openb = document.querySelector("#insp [data-comopen]");
    if(!openb) throw new Error("clustering offers no way to see what it proposed");
    openb.click(); await nap(1200);
    if(!document.getElementById("comdlg").open)
      throw new Error("the overlay did not open");
    o.rows = Q("#combody .comrow").length;
    o.papersShown = Q("#combody .compap")
      .filter(e => String(e.textContent || "").indexOf(" of ") >= 0).length;
    /* RUN IT AGAIN: same ties, same resolution, same clusters. */
    Q("#insp [data-comrun]")[0].click(); await nap(2500);
    o.second = B.COM.out.clusters.map(c => c.members.join("+"));
    /* The layout, and where the constructs actually go. */
    B.state.stage = 2; B.renderPanel(); await nap(600);
    /* CLUSTERS IS A PRESET, not a layout inside Manual: one click gives the
       settings box and the view together. */
    const cl = document.querySelector("#pbody [data-clpreset]");
    o.layoutOffered = !!cl && !cl.disabled;
    if(!o.layoutOffered) throw new Error("step 1.2 offers no Clusters preset");
    cl.click(); await nap(2600);
    o.settings = {box:!!document.querySelector("#pbody .combox"),
                  ties:Q("#pbody [data-comtie]").length,
                  res:!!document.querySelector("#pbody [data-comres]"),
                  rungs:Q("#pbody [data-comrung]").length,
                  manualShut:!document.querySelector("#pbody .manbox")};
    o.hulls = document.querySelectorAll("#g path.hull").length;
    o.layout = B.state.layout;
    const cellsNow = () => B.COM.out.clusters.map(c => {
      const t = B.comCell({id:c.members[0]});
      const xs = c.members.map(m => (B.lastView.nodes.find(z => z.id === m) || {}).x)
        .filter(x => x != null);
      const mean = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
      return {want:t ? Math.round(t.x) : null, got:mean == null ? null : Math.round(mean),
              n:c.members.length};
    });
    /* TWO MEASUREMENTS, FIVE SECONDS APART. The first build of this test
       asserted on one taken at five seconds and failed with two clusters
       sitting at x=500 against a target of 254 -- not because the layout was
       wrong but because the simulation had not finished moving them. A
       picture that is right eventually and wrong when first looked at is
       worth knowing about, so both are kept and the assertion reads the
       settled one. */
    o.at5 = cellsNow();
    await nap(2200);
    o.cells = cellsNow();
    o.axisLines = document.querySelectorAll("#g line.axr, #g line.axc").length;
    /* A name and a move: the scholar's, recorded, and carried in the file. */
    const reopen = document.querySelector("#pbody [data-comopen]");
    if(reopen){ reopen.click(); await nap(1200); }
    const nm = document.querySelector("#combody [data-comname]");
    if(!nm) throw new Error("a cluster cannot be named");
    nm.value = ${JSON.stringify(NAME)};
    nm.dispatchEvent(new Event("blur", {bubbles:true}));
    await nap(700);
    const mv = document.querySelector("#combody [data-commove]");
    if(!mv) throw new Error("a construct cannot be moved between clusters");
    mv.click(); await nap(500);
    const sel = document.querySelector("#combody [data-commoveto]");
    if(!sel || sel.options.length < 2)
      throw new Error("moving a construct offers nowhere to move it to");
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event("change", {bubbles:true}));
    await nap(2500);
    o.moved = B.COM.out.moved;
    /* ACCEPTING IS A MERGE, in the workbench's own language. The check is not
       that a button exists: it is that the constructs the cluster held are one
       node on the map afterwards, carried, under the cluster's name, and that
       a cluster spanning levels says so before it is pressed. */
    const take = document.querySelector("#combody [data-comtake]");
    if(!take) throw new Error("a cluster of more than one offers no way to accept it");
    const tid = take.dataset.comtake;
    const took = B.COM.out.clusters.find(z => z.id === tid);
    o.takeWas = {members:took.members.length, ids:(took.ids || []).length,
                 levels:(took.levels || []).length,
                 warned:!!take.parentElement.querySelector(".comwarn")};
    o.groupsBefore = B.groups.size;
    take.click(); await nap(2600);
    /* A MERGE IS A GROUP, and whether a group DRAWS as one node is a separate
       display setting -- state.collapse, which step 1.2 offers as "a boundary"
       or "one node" and which ships off. The first build of this test asserted
       on the node count and failed with five nodes where the merge had in fact
       been made. So: the group, its members, and that every construct in it is
       carried. */
    const g = [...B.groups.values()].find(z =>
      (took.ids || []).some(i => (z.members || []).includes(i)));
    const held = new Set((g && g.members) || []);
    o.afterTake = {groups:B.groups.size, found:!!g,
                   covers:(took.ids || []).filter(i => held.has(i)).length,
                   named:g ? String(g.name || "") : "",
                   carried:(took.ids || []).every(i =>
                     B.lastView.allNodes.some(n => n.carried &&
                       (n.mem || []).some(m => m.i === i)))};
    /* And with the display setting on, it really is one node. */
    B.state.collapse = true;
    B.refresh();
    B.renderPanel(); await nap(1800);
    const one = B.lastView.allNodes.filter(n =>
      (n.mem || []).some(m => (took.ids || []).includes(m.i)));
    o.asOneNode = {nodes:one.length, folded:one.length === 1 ? (one[0].mem || []).length : 0};
    B.state.collapse = false;
    o.takeLogged = 0;
    o.named = B.COM.names;
    const f = JSON.parse(B.scenFile());
    const c = f.snap.com || {};
    o.inFile = {hub:c.hub, res:c.res, names:Object.keys(c.names || {}).length,
                moves:Object.keys(c.moves || {}).length, were:(c.were || []).length};
    o.logged = (f.log || []).filter(r => /cluster/i.test(JSON.stringify(r))).length;
    o.takeLogged = (f.log || [])
      .filter(r => /Accepted a cluster as a merge/.test(JSON.stringify(r))).length;
  }catch(e){ o.FATAL = String(e && e.message || e); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--window-size=1440,900", "--virtual-time-budget=240000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__clusters.html`],
    {encoding:"utf8", maxBuffer:128 * 1024 * 1024});
  const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
  if(!m || !m[1].trim()) throw new Error("the probe produced nothing; chrome said: " +
    String(r.stderr || "").slice(0, 900));
  out = JSON.parse(m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
} finally {
  try{ fs.unlinkSync(file); }catch(e){}
  srv.kill();
}

const fail = [];
const want = (ok, why) => { if(!ok) fail.push(why); };
if(out.FATAL) fail.push(out.FATAL);
else {
  want(out.first.length >= 2,
    "clustering gave " + out.first.length + " cluster(s), which is not a reading of anything");
  want(JSON.stringify(out.first) === JSON.stringify(out.second),
    "running it twice gave different clusters, so it is not reproducible");
  want(out.rows === out.first.length,
    out.rows + " rows shown for " + out.first.length + " clusters");
  want(out.papersShown >= 1,
    "no cluster says which papers tie it, so a cluster that repeats one paper " +
    "cannot be told from one that crosses several");
  want(out.ties && out.ties.papers > out.ties.arrows,
    "shared papers should carry more of this neighbourhood than arrows do: " +
    JSON.stringify(out.ties));
  want(out.settings && out.settings.box && out.settings.ties === 3 &&
       out.settings.res && out.settings.rungs >= 2 && out.settings.manualShut,
    "the Clusters preset did not show its settings the way Manual does: " +
    JSON.stringify(out.settings));
  want(out.hulls >= 1,
    "no boundary is drawn round a proposed cluster, so the members do not read " +
    "as grouped on the map");
  want(out.layout === "clusters" && out.axisLines === 0,
    "the Clusters layout left " + out.axisLines + " axis lines on the map");
  /* WHERE THE CONSTRUCTS ACTUALLY ARE. The clusters layout SETS positions
     rather than pulling toward them, so a member sits on a small ring of at
     most 62px around its cluster's centre and nothing else moves it. The
     tolerance is that ring and not a hope about a simulation: four attempts
     at doing this with forces each settled into one of two arrangements
     depending on where the simulation started, three runs in six landing
     240px out, and this test passing at 120px was what said so. */
  for(const c of (out.cells || []))
    want(c.want != null && c.got != null && Math.abs(c.want - c.got) <= 64,
      "a cluster of " + c.n + " is centred at x=" + c.want + " and its members " +
      "average x=" + c.got + ", which is off its own ring");
  want(JSON.stringify(out.at5) === JSON.stringify(out.cells),
    "the layout was still moving five seconds in, so it is not placed but pulled");
  want(out.moved === 1, "the move did not take: moved = " + out.moved);
  want(Object.values(out.named || {}).includes(NAME), "the name did not stick");
  /* NAMES >= 1, not exactly one: this walk names a cluster in the
     neighbourhood scope and then the Clusters preset re-scopes to the whole
     map, where it names another. Both survive, because a name is keyed to the
     cluster's id rather than to the run, which is the property worth having.
     The move is exactly one because only one is made. */
  want(out.inFile && out.inFile.names >= 1 && out.inFile.moves === 1,
    "the name and the move do not travel in the scenario: " + JSON.stringify(out.inFile));
  want(out.inFile && out.inFile.were >= 2,
    "the computed members do not travel, so a name in a saved scenario is about nothing");
  want(out.takeWas && out.takeWas.ids >= out.takeWas.members,
    "a cluster's construct ids should cover at least its member nodes: " +
    JSON.stringify(out.takeWas));
  want(out.takeWas && (out.takeWas.levels < 2 || out.takeWas.warned),
    "a cluster spanning " + (out.takeWas || {}).levels + " levels of analysis was offered " +
    "for merging with no warning on the row");
  /* NOT "one more merge". makeGroup joins an EXISTING merge when any of the
     constructs is already in one, which is its rule everywhere and the right
     one: if two of these are already held to measure one quantity, the
     cluster joins that merge rather than standing a rival beside it. So the
     test is that the merges did not go DOWN and that one of them now holds
     the whole cluster. The worked example ships with merges, and this
     assertion read +1 and failed on exactly that. */
  want(out.afterTake && out.afterTake.groups >= out.groupsBefore,
    "accepting lost a merge: " + out.groupsBefore + " before, " +
    (out.afterTake || {}).groups + " after");
  want(out.afterTake && out.afterTake.found &&
       out.afterTake.covers === out.takeWas.ids,
    "the merge holds " + (out.afterTake || {}).covers + " of the " +
    (out.takeWas || {}).ids + " constructs the cluster held");
  want(out.afterTake && out.afterTake.named,
    "the merge went in unnamed, so the cluster's name did not travel into it");
  want(out.afterTake && out.afterTake.carried,
    "not every construct in the merge is carried, so the merge is invisible downstream");
  want(out.asOneNode && out.asOneNode.nodes === 1 &&
       out.asOneNode.folded >= out.takeWas.ids,
    "with step 1.2 set to draw a merge as one node the cluster is " +
    (out.asOneNode || {}).nodes + " nodes folding " + (out.asOneNode || {}).folded +
    " constructs, against the " + (out.takeWas || {}).ids + " it held");
  want(out.takeLogged === 1,
    "the record does not say the merge came from a cluster the scholar accepted");
  want(out.logged >= 2,
    "the record does not carry the clustering as the scholar's: " + out.logged + " entries");
}

if(fail.length){
  console.error("clusters: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
console.log("clusters: " + out.first.length + " clusters around the demonstration's " +
  "performance merge, same on a second run · " + out.ties.papers + " shared-paper ties " +
  "against " + out.ties.arrows + " arrows · every cluster on its own declared ring · " +
  "a name and a move recorded as the scholar's and carried in the scenario \u00b7 " +
  "one accepted as a merge of " + out.takeWas.ids + " constructs, drawn as " +
  out.asOneNode.folded + " folded into one node when step 1.2 is set to collapse");

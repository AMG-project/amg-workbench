/* AMG bench, page script 8 of 22: grouping constructs, and what a model would be made of.
   One shared global scope, loaded in order. See page/README.md. */
import { hesc } from "../core/safe.js";
import { AI, AITIP, aiErrHTML, aiMark } from "./08-ask.js";
import { BARLAB, barScore, goStage, relName } from "./06-wiring.js";
import { G } from "../graph-data.js";
import { GHUE, JJ_REL, KINDS, MEMBERS_ALL, SHAPE_PROPS, composedPaths, cpersist, gid, gpersist, gremove, groups, handName, mclm, mcon, memberCount, propClash, setCarryNode, spec, vtype } from "./03b-decisions.js";
import { LIT, litCount, litList, litName, litOf, litReady } from "./27-streams.js";
import { MR } from "../model-report.js";
import { N, infold, picked, state } from "./03-stores.js";
import { draw, hideTip, lastView, links, showTip } from "./13-map.js";
import { inScope, okPaper } from "./03c-corpus.js";
import { refresh } from "./14-boot.js";
import { renderSelectedRail, statementsInPlay, support } from "./12-claims.js";
import { xlog } from "./05-explore.js";
/* ------------------------------------------------- grouping: the decision */
function renderSelbar(){
  const bar = document.getElementById("selbar");
  if(!bar) return;
  if(picked.size === 0){ bar.hidden = true; return; }
  bar.hidden = false;
  const names = [...picked].map(i =>
    `<span>${i}<button type="button" data-drop="${i}" aria-label="Remove ${i}">×</button></span>`).join("");
  const lv = new Set([...picked].map(i => N.get(i)?.l).filter(Boolean));
  const warn = lv.size > 1
    ? `<p style="color:var(--neg);margin:0 0 11px;font-size:12.5px">These sit at ${lv.size} different levels of analysis (${[...lv].join(", ")}). Two constructs at different levels are not measuring the same kind of thing — merge them only if you mean to, and the merge will stay flagged.</p>` : "";
  const suggest = [...picked].sort((a,b) => a.length - b.length)[0] || "";
  bar.innerHTML = `
    <h4>${picked.size === 1 ? "One construct picked" : `${picked.size} constructs picked`}</h4>
    <p>${picked.size === 1 ? "Pick at least one more, or drag this one onto another." : "Name the quantity these all measure."}</p>
    <div class="selnames">${names}</div>${warn}
    ${picked.size >= 2 ? `<div class="mkgrp">
      <input type="text" id="gName" placeholder="Name this construct" value="${suggest.replace(/-/g," ")}"
             aria-label="Name for the merged construct">
      <button class="btn" type="button" id="gMake">Merge as one construct</button>
      <button class="btn ghostbtn" type="button" id="gClear">Clear</button>
    </div>` : `<div class="mkgrp"><button class="btn ghostbtn" type="button" id="gClear">Clear</button></div>`}`;
  bar.querySelectorAll("[data-drop]").forEach(b => b.addEventListener("click", () => {
    picked.delete(b.dataset.drop); renderSelbar(); draw();
  }));
  const mk = document.getElementById("gMake");
  if(mk) mk.addEventListener("click", () => {
    const nm = (document.getElementById("gName").value || "").trim();
    makeGroup([...picked], nm || "Untitled construct");
    picked.clear(); renderSelbar();
  });
  const cl = document.getElementById("gClear");
  if(cl) cl.addEventListener("click", () => { picked.clear(); renderSelbar(); draw(); });
}

// Members are construct ids, never cluster nodes: a node may itself be several
// names folded by tightness, and all of them join.
function makeGroup(ids, name){
  const all = [...new Set(ids)];
  let target = null;
  for(const g of groups.values()) if(all.some(i => g.members.includes(i))){ target = g; break; }
  if(target){
    target.members = [...new Set([...target.members, ...all])];
    if(name && name !== "Untitled construct") target.name = name;
  }else{
    target = {id:gid(), name, members:all, color:GHUE[groups.size % GHUE.length]};
    groups.set(target.id, target);
  }
  gpersist(target); refresh();
}

/* The rail's top card is about the step you are on, not always about groups. */
function renderStepCard(){
  const h = document.getElementById("stepcardh"), sub = document.getElementById("stepcardp");
  const el = document.getElementById("grail");
  if(!h || !el) return;
  const S = state.stage;

  if(S === 1){
    // The counts are on the map and the papers are in the panel; a third
    // copy in the rail was saying the same thing a third time.
    const card = document.getElementById("stepcard");
    if(card) card.hidden = true;
    return;
  }
  { const card = document.getElementById("stepcard"); if(card) card.hidden = false; }


  if(S === 3){
    h.textContent = "What the bars are doing";
    sub.textContent = "Which of the three bars is actually binding, and what each one costs you in arrows.";
    const total = lastView.arrows, pass = lastView.strong;
    const alone = bar => links.filter(e => e.claims.some(c => {
      const sc = barScore(c, bar, state.need[bar]);
      return sc.req && sc.have >= Math.min(state.bar[bar], sc.of);
    })).length;
    const bySpec = alone("Spec"), byComm = alone("Comm"), byEvid = alone("Evid");
    const low = Math.min(bySpec, byComm, byEvid);
    const binding = [["specification", bySpec], ["commensurability", byComm], ["evidence", byEvid]]
      .filter(([, n]) => n === low).map(([t]) => t).join(" and ");
    const carriedE = links.filter(e => e.carried).length;
    const overE = links.filter(e => e.carried && !e.pass).length;
    el.innerHTML = `<div class="scopebox">
      <dl class="mini">
        <div><dt>arrows</dt><dd>${total}</dd></div>
        <div><dt>clear all three</dt><dd>${pass}<i>${total ? Math.round(100*pass/total) : 0}%</i></dd></div>
      </dl>
      <ul class="jlist">
        <li><span>specification alone admits</span><b>${bySpec}</b></li>
        <li><span>commensurability alone</span><b>${byComm}</b></li>
        <li><span>evidence alone</span><b>${byEvid}</b></li>
        <li><span>binding constraint</span><b>${binding}</b></li>
        <li><span>selected</span><b>${carriedE}</b></li>
        ${overE ? `<li><span>carried though failing</span><b>${overE}</b></li>` : ``}
      </ul>
      <p class="railnote">${(() => {
        const hid = ["Comm","Spec","Evid"].filter(b => state.apply[b] === "filter");
        return hid.length === 0
          ? "Failing arrows are drawn faded. They still count as present, and step 2.1 will ask about them."
          : hid.length === 3
          ? "Every failing arrow is removed, so step 2.1 cannot ask about them."
          : `Arrows failing ${hid.map(b => BARLAB[b].toLowerCase()).join(" or ")} are removed; the rest are faded and step 2.1 can still ask about them.`;
      })()}</p>
    </div>`;
    return;
  }

  /* Building blocks is step 2.1's name for it, because that is the step where
     a model is assembled out of constructs AND claims from more than one
     literature. Step 1.2 has neither: one literature, no claims yet, and what
     is in the rail is the construct selection. */
  const RAILNAME = {2:"Selected constructs", 4:"Building blocks",
                    5:"What a model would be built from"};
  h.innerHTML = `<button type="button" class="cardfold" id="selFold"
    aria-expanded="${state.selOpen}"><span class="caret">${state.selOpen ? "\u25be" : "\u25b8"}</span>${
    RAILNAME[S] || "Selected constructs"}</button>`;
  sub.textContent = S === 2
    ? "What you are carrying out of this step: the constructs you merged under a name, and the ones selected on their own. The relationships between them are chosen on step 1.3."
    : S === 5
    ? "The constructs and relationships a model would be assembled from, by literature \u2014 the set step 2.1 settled, with the domains declared on this step."
    : "What a model would be built from, by literature. The relationships box holds what these papers assert and, beneath it, what a model's mechanisms would need them to assert.";
  const body = document.getElementById("grail");
  if(body) body.hidden = !state.selOpen;
  if(sub) sub.hidden = !state.selOpen;
  const f = document.getElementById("selFold");
  if(f) f.addEventListener("click", () => { state.selOpen = !state.selOpen; renderStepCard(); });
  if(state.selOpen) renderSelectedRail();
}

/* A merge is not a different kind of object from a construct — it is a name
   over several of them. So the rail is one list of constructs in three
   sections: the ones you have gathered under a name, the ones selected and
   standing alone, and the ones not selected. A tick moves a construct between
   selected and not; dragging it moves it between groups, and dragging one
   construct onto another is how a group gets made in the first place.      */
let dragNid = null;
// set from 12-claims.js's rail, which cannot assign an imported binding
function dragSet(v){ dragNid = v; }

function groupOfNode(n){
  for(const g of groups.values()) if(n.mem.some(m => g.members.includes(m.i))) return g;
  return null;
}
function addNodeToGroup(g, n){
  g.members = [...new Set([...g.members, ...n.mem.map(m => m.i)])];
  setCarryNode(n, true); cpersist(); gpersist(g); refresh();
}
function dropNodeFromGroup(g, n){
  const ids = new Set(n.mem.map(m => m.i));
  g.members = g.members.filter(i => !ids.has(i));
  if(g.members.length < 2){ gremove(g.id); return; }   // a group of one is a construct
  gpersist(g); refresh();
}
/* Dragged onto a construct that is already in a group, it joins that group;
   onto a free one, the two become a new group you name. */
function joinNodes(a, b){
  if(a.id === b.id) return;
  const ga = groupOfNode(a), gb = groupOfNode(b);
  if(ga && ga === gb) return;
  if(gb) return addNodeToGroup(gb, a);
  if(ga) return addNodeToGroup(ga, b);
  const nm = prompt("These two measure the same quantity. Name it:",
                    b.label.replace(/-/g, " "));
  if(!nm || !nm.trim()) return;
  setCarryNode(a, true); setCarryNode(b, true); cpersist();
  makeGroup([...a.mem.map(m => m.i), ...b.mem.map(m => m.i)], nm.trim());
}

/* THE JOIN. Step 2.1's own act, and the one the draft calls the creative step:
   two literatures name things differently, and deciding that two of those names
   are one quantity is what lets a relation cross between them. It is step 1.2's
   decision taken again over vocabularies that share nothing -- which is exactly
   where the registry nanopublication assumes, and this literature lacks, would
   have done the work.

   What is honest about the two sides: the purpose column is extraction output,
   122 constructs off 52 papers. The rights column is twelve names the same
   corpus happens to carry, picked out by a rule over wording -- a demonstration
   of the shape, not a second extraction. Saying so is the point; the row says
   it on the page. */
function xstream(k){
  return (lastView.allNodes || []).filter(n => streamOf(n) === k)
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
}
/* streamOfId and streamOf disagreed, and the join is where it showed: the NODE
   `stakeholder-enfranchisement` reads as rights, because streamOf tests the
   rights pattern first; its ID read as "other", because streamOfId tests only
   the imported footprint and then the purpose pattern. So a join made across
   the two columns was not a join by the check that counts them, and the row
   went into the groups and nowhere onto the page. One rule for both. */
/* WHICH SIDE OF THE JOIN A CONSTRUCT IS ON.

   With more than one literature it is PROVENANCE: which literature the
   construct came from, which the union records as it is built. That is what
   this step has always claimed to be about, and what the greyed Import a
   literature button was for -- the sections below used to split THIS corpus by
   a rule over construct names, which reads wording rather than papers.

   With one literature the rule over names stands, because that is the state
   every existing scenario is in and the demonstration's two-column join is
   drawn from it. The fallback is not a leftover: a single literature joined
   against the imported model's footprint is the approximation the
   specification names, and it is still the only join a reader with one corpus
   can make. */
const xstreamOf = i => {
  if(litCount() > 1){
    const l = litOf(i);
    if(l && l === LIT.join.a) return "cur";
    if(l && l === LIT.join.b) return "rights";
    return "other";
  }
  /* ONE LITERATURE: the second side is what the import ADDS, and this corpus
     is the first side. It used to be the imported model's whole footprint
     plus a pattern over construct names, and between them they put 64 of this
     corpus's own constructs in a column headed "Property rights (imported)" --
     a firm's accounting result among them, because the model binds to it.
     Nineteen of the model's 21 bound ids are constructs these 52 papers
     carry; the two it genuinely adds are carried by no paper, so they are not
     in the corpus at all and never appeared in that column. And two step 1.2
     merges INSIDE the purpose literature read as joins across the two,
     because one member of each was in the footprint. */
  return importedAdds().has(i) ? "rights"
    : STREAM_RX.cur.test(i) ? "cur" : "other";
};
/* What each side of the join is called, and what to say about it. One
   literature: the demonstration, which says it is one. Two or more: their own
   names, and whether each has been through block 1 -- the rule the join waits
   on, enforced rather than written down. */
function joinSides(){
  if(litCount() < 2) return {
    a:{id:"", name:"Purpose", ready:true,
       note:`Extraction output: the constructs these ${
         Object.keys(G.papers).length} papers name, as step 1.2 left them.`},
    b:{id:"", name:"Property rights (imported)", ready:true,
       note:`<b>What the imported model adds, and only that</b> — the quantities it needs
         that no paper in this corpus carries. Every other quantity it reads is a construct
         on the left, carried by papers here. <b>Nothing is listed on this side to join
         against</b>, because an addition is not a construct of this corpus: to join one,
         add it as a construct of your own first, and the merge is then an ordinary one. A
         real second literature arrives with its own corpus and its own curator's pass —
         <b>Import a literature</b> in the menu beside the literature selector on step 1.1.`},
    one:true};
  const side = id => ({id, name:litName(id), ready:litReady(id),
    note:litReady(id)
      ? `Its own corpus and its own curator's pass: the constructs <b>${litName(id)}</b>
         carried out of step 1.2.`
      : `<b>${litName(id)}</b> has not been through block 1. A literature that has not been
         adjudicated cannot be joined with: the join would carry decisions nobody made.
         Switch to it on step 1.1 and run the three steps.`});
  return {a:side(LIT.join.a), b:side(LIT.join.b), one:false};
}
function crossGroups(){
  const out = [];
  for(const g of groups.values()){
    const ks = new Set((g.members || []).map(xstreamOf));
    if(ks.has("cur") && ks.has("rights")) out.push(g);
  }
  return out;
}
/* ---- the join, recommended rather than hunted for

   Step 2.1 was the manual two-column selector and nothing else: pick one
   construct from each stream, name the quantity, join. That asks a scholar to
   find the join by reading down two lists, which is the work the page should be
   doing.

   So the candidates are computed, and the honest thing about them is that they
   are weak. `G.sim` holds 1,416 similarity pairs over wording; on the seeded
   corpus 58 of them cross the two streams and the closest scores 0.17. These
   two literatures mostly do not name the same things, which is the right prior
   and is why nothing here is proposed automatically -- a word score cannot tell
   a shared quantity from a shared vocabulary.

   What can is a reader with both definitions in front of it, which is what the
   `join` prompt is for. It proposes; the curator accepts or discards; the
   record says which of the two chose. The manual block is still there, behind a
   button, because the exception has to stay reachable. */
const XJOINA = {at:"", err:"", out:[], outside:0, asked:0};

/* THE TWO STREAMS IN FULL, which is what a reader by meaning has to be given.
   Everything already joined is out, because it is not a candidate any more. */
function xstreams(){
  const have = new Set();
  for(const g of crossGroups()) for(const m of (g.members || [])) have.add(m);
  const out = {cur:[], rights:[]};
  if(typeof N === "undefined" || !N.keys) return out;
  for(const i of N.keys()){
    if(have.has(i)) continue;
    const k = xstreamOf(i);
    if(k === "cur" || k === "rights") out[k].push(i);
  }
  out.cur.sort(); out.rights.sort();
  return out;
}
/* How many pairs there ARE, against how many the wording score ever surfaces.
   This is the number that justifies the change: the score gated the reader. */
function xspace(){
  const L = xstreams();
  return {n:L.cur.length * L.rights.length, cur:L.cur.length, rights:L.rights.length};
}
/* Whether a pair is one the wording would have found, and at what score. It
   is a DATUM on the row now and not a gate in front of the reader -- a pair
   the wording never scored is the interesting case, not the invalid one. */
function xwordScore(a, b){
  if(typeof G === "undefined" || !G.sim) return null;
  for(const [x, y, sc] of G.sim)
    if((x === a && y === b) || (x === b && y === a)) return sc;
  return null;
}
function xcand(){
  if(typeof G === "undefined" || !G.sim) return [];
  const have = new Set();
  for(const g of crossGroups()) for(const m of (g.members || [])) have.add(m);
  const out = [];
  for(const [a, b, sc] of G.sim){
    const ka = xstreamOf(a), kb = xstreamOf(b);
    if(!((ka === "cur" && kb === "rights") || (ka === "rights" && kb === "cur"))) continue;
    if(have.has(a) || have.has(b)) continue;   // already joined, so not a candidate
    out.push({a:ka === "cur" ? a : b, b:ka === "cur" ? b : a, s:sc});
  }
  return out.sort((x, y) => y.s - x.s);
}
const xdefn = i => {
  const n = (typeof N !== "undefined" && N.get) ? (N.get(i) || {}) : {};
  return String(n.d || "").replace(/\s+/g, " ").trim();
};
const xlab = i => String(i).replace(/-/g, " ");

/* THE PANEL at step 2.1: what the step is for, the way in, and what has been
   joined. The SUGGESTIONS are not here -- they go under the map, which is the
   bottom of this page, because joining across two literatures is the exception
   and the construct list below carries everything. */
/* The two buttons that act on the list of proposals, in the header of the list
   they act on. They used to sit in a block of their own at the top of the step,
   with the proposals under the map, a screen away from them. */
function joinActs(){
  return `<span class="cmpacts" style="margin:0">
      ${AI.cap ? `<button type="button" data-ai="join"${AI.busy ? " disabled" : ""}
        title="Reads both streams' constructs with their definitions and proposes the pairs that name the same quantity.${AITIP}">${aiMark()}${
        AI.busy === "join" ? "reading both lists\u2026" : "suggest mergers"}</button>` : ``}
      <button type="button" data-joinman="1">merge other constructs</button>
    </span>`;
}

/* WHAT THE IMPORT ADDS, NAMED. With one literature there is no second column
   to pair against, so this is the step's own work instead of a candidate list:
   the quantities the imported model needs that no paper in this corpus
   carries, and the relations carried from it. It replaced a header that
   offered 253 x 64 = 16,192 possible pairs, every one of them a pair of this
   corpus's own constructs. The manual door stays, because a join this corpus
   can make by hand is still a join. */
/* NOTHING IS IMPORTED INTO A PROJECT WITH NO LITERATURE. model-report.js is a
   shipped constant -- a model somebody already ran -- and every panel built
   from it drew on a blank project: eleven reconstructed relations, the two
   quantities the model adds, and a column headed with the demonstration's
   second literature. None of it is this project's, and on an empty one there
   is nothing for it to be imported INTO. */
const litHere = () => !!Object.keys(G.papers || {}).length;
function importAddsHTML(){
  if(!litHere()) return "";
  const adds = [...importedAdds()].sort();
  const bind = new Map();
  for(const [k, b] of Object.entries(MR.bindings || {}))
    for(const x of (b.bound || []))
      bind.set(x.id, {v:k, lab:b.label || k, note:b.note || "", sig:x.signature || ""});
  const prop = (MR.relations || []).filter(r => r.proposes);
  const took = prop.filter(r => state.msel.has(r.id));
  return `<div class="xsug">
    <div class="embhd">
      <span class="ctl-label">What the import adds</span>
      <span class="pcount"><b>${adds.length}</b> construct${adds.length === 1 ? "" : "s"}
        \u00b7 <b>${took.length}</b> of ${prop.length} relationships carried</span>
      <span class="cmpacts" style="margin:0">
        <button type="button" data-joinman="1"
          title="One construct from each literature, under one name. With one literature there is nothing on the second side to join against, and the dialog says so: an addition is not a construct of this corpus until you add it as one.">merge other constructs</button>
      </span>
    </div>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">A construct this corpus already carries is a <b>binding</b>, not an
      addition: the model reading it is what makes the model about this literature, and it
      sits in the list above under its own papers. An <b>addition</b> is a quantity the model
      needs that no paper here names, which is what the second literature is for. Nothing
      below is carried by any of the ${Object.keys(G.papers).length} papers, and the model's
      own report says so.</span></p>
    ${adds.length ? `<div class="chain">${adds.map(i => {
      const b = bind.get(i) || {};
      return `<div class="crow">
        <span class="cst part" title="No paper in this corpus carries it">no paper</span>
        <span class="cnm"><b class="xsrights">${hesc(xlab(i))}</b>${b.lab
          ? `<span class="cfl">the model\u2019s <b>${hesc(b.lab)}</b></span>` : ""}</span>
        <span class="cwy">${hesc(b.sig || "")}${b.sig && b.note ? " \u00b7 " : ""}${
          hesc(b.note || "")}</span>
      </div>`; }).join("")}</div>`
    : `<p class="empty">The imported model needs nothing this corpus has not got, so it adds
       no construct. Every quantity it reads is in the list above.</p>`}
  </div>`;
}

/* THE STEP'S OWN WORK, with the map below it for reference. The proposals used
   to render into #wlfoot, under the diagram, which read as leftovers rather
   than as the thing this step is for. */
function joinRecoHTML(){
  const X = crossGroups();
  return `
   <div class="row" style="gap:14px 26px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       ${litCount() > 1 ? joinSuggestHTML() + aiErrHTML("join") : importAddsHTML()}
     </div>

     ${X.length ? `<div class="fld" style="flex:1 1 100%;max-width:none">
       <span class="ctl-label">Joined so far</span>
       <div class="chain">${X.map(g => `<div class="crow">
         <span class="cst ok">joined</span>
         <span class="cnm">${hesc(g.name || g.id)}</span>
         <span class="cwy">${(g.members || []).map(i =>
           `<b class="xs${xstreamOf(i)}">${hesc(xlab(i))}</b>`).join(" + ")}
           <button type="button" class="edbtn" data-xdrop="${hesc(g.id)}"
             style="margin-left:8px">undo</button></span>
       </div>`).join("")}</div>
     </div>` : ""}
     <!-- THE MAP, BEHIND A TOGGLE AND SHUT. This step's work is choosing what
          a model is assembled from, which happens in the blocks above; the
          diagram is there to check a choice rather than to make one, and open
          beside the work it reads as the thing to look at. -->
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <span class="cmpacts" style="margin:0">
         <button type="button" class="edbtn" id="mapToggle"
           aria-pressed="${state.mapOn}">${state.mapOn
             ? "Hide the map" : "Show the map"}</button>
       </span>
       <p class="why">${state.mapOn
         ? `Every construct both literatures carry is on it, and any two can be merged there
            by hand — the same operation step 1.2 makes, leaving the same record.`
         : `Shut, because the work on this step is above it. Opening it shows every construct
            both literatures carry, where any two can be merged by hand.`}</p>
     </div>
   </div>`;
}

/* THE SUGGESTIONS, under the map. Scrollable, because a list of proposals is
   something you read down once and then act on, and it should not push the
   map and the step off the screen to do it. */
function joinSuggestHTML(){
  const O = XJOINA.out, sp = xspace(), C = xcand();
  /* A proposal that has been taken is still on this list, and it must not go
     on offering a Join: the row says it was taken instead, so a scholar can
     see what they did without the page pretending there is still a choice. */
  const done = new Set();
  for(const g of crossGroups()) for(const m of (g.members || [])) done.add(m);
  const taken = o => done.has(o.a) || done.has(o.b);
  const best = C.length ? C[0].s : 0;
  const blind = O.filter(o => o.word == null).length;
  if(!XJOINA.at && !XJOINA.err) return `<div class="xsug">
    <div class="embhd">
      <span class="ctl-label">Suggested mergers</span>
      <span class="pcount">${sp.cur} \u00d7 ${sp.rights} = <b>${
        sp.n.toLocaleString("en")}</b> possible pairs</span>
      ${joinActs()}
    </div>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Nothing asked yet. <b>Suggest mergers</b> puts the lists, with their
      definitions, in front of a reader that can judge them by <b>meaning</b>. It is not given a
      shortlist: the similarity over wording scores <b>${best.toFixed(3)}</b> at its best across
      these streams, which is barely above noise, and using it to choose what the reader
      sees would mean the reader could only ever confirm a word match. Every construct every
      stream carries is also on the map below, where any two can be merged by hand: the same
      operation step 1.2 makes, leaving the same record. Joining across streams is <b>the
      exception rather than the norm</b>, which is why nothing is proposed until you
      ask.</span></p>
  </div>`;
  return `<div class="xsug">
    <div class="embhd">
      <span class="ctl-label">Suggested mergers</span>
      <span class="pcount">${O.length
        ? `<b>${O.length}</b> proposed of ${sp.n.toLocaleString("en")} possible`
        : `none proposed of ${sp.n.toLocaleString("en")} possible`}${
        XJOINA.outside ? ` \u00b7 ${XJOINA.outside} outside the streams, discarded` : ""}</span>
      ${joinActs()}
    </div>
    ${XJOINA.err ? `<p class="why" style="color:${O.length ? "var(--neg)" : "var(--muted)"}">${
      hesc(XJOINA.err)}</p>` : ""}
    ${O.length ? `<p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Each one is a proposal about <b>meaning</b>, read off both
      definitions. The number beside it is what the similarity over <b>wording</b> made of the
      same pair${blind ? `, and <b>${blind}</b> of these ${O.length === 1 ? "is a pair" :
      "are pairs"} the wording never scored at all \u2014 which the old shortlist could not have
      surfaced` : ""}. Nothing is applied until you press <b>Join</b>, and the record says which
      of the two of you chose it.</span></p>
    <div class="xscroll"><div class="chain">${O.map(o => `<div class="crow${
      taken(o) ? " off" : ""}">
      <span class="cst ${taken(o) ? "ok" : o.word == null ? "part" : ""}" title="${taken(o)
        ? "You took this one"
        : o.word == null
        ? "No wording similarity was recorded for this pair at all"
        : "Similarity over wording, which is not what this proposal was made on"}">${
        taken(o) ? "joined" : o.word == null ? "unscored" : o.word.toFixed(2)}</span>
      <span class="cnm"><b class="xscur">${hesc(xlab(o.a))}</b> + <b class="xsrights">${
        hesc(xlab(o.b))}</b>${o.name ? `<span class="cfl">as <b>${hesc(o.name)}</b></span>` : ""}</span>
      ${taken(o) ? "" : `<button type="button" class="edbtn" data-xtake="${
        hesc(o.a + "|" + o.b)}">Join</button>`}
      <span class="cwy">${hesc(String(o.why || ""))}</span>
    </div>`).join("")}</div></div>`
    : `<p class="empty">No pair was proposed. On these two literatures that is the likely
       answer and it is a result: ${sp.n.toLocaleString("en")} pairs were available to propose
       from and the reader took none of them. The join would have to be made by hand, which
       <b>merge other constructs</b> is for.</p>`}
  </div>`;
}

/* Taking a recommendation is the same act as a manual join, so it goes through
   the same door: both ends carried, one boundary drawn, one record written. */
function xtake(key){
  const [a, b] = String(key).split("|");
  const v = XJOINA.out.find(o => o.a === a && o.b === b);
  const A = (lastView.allNodes || []).find(n => (n.mem || []).some(m => m.i === a) || n.id === a);
  const B = (lastView.allNodes || []).find(n => (n.mem || []).some(m => m.i === b) || n.id === b);
  if(!A || !B){ XJOINA.err = "one of those constructs is no longer on the map"; return; }
  const name = String((v && v.name) || "").trim() || xlab(a);
  XJOINA.err = "";
  setCarryNode(A, true); setCarryNode(B, true); cpersist();
  makeGroup([...A.mem.map(m => m.i), ...B.mem.map(m => m.i)], name);
  xlog("join", "Joined the streams, on a proposal", name + " = " + xlab(a) + " + " + xlab(b) +
    (v && v.why ? " \u2014 " + String(v.why).slice(0, 120) : ""));
}

function joinBlockHTML(){
  /* NOTHING TO JOIN IS NOT ONE LITERATURE. With fewer than two literatures
     this step describes the demonstration's own shape -- purpose on the left,
     what the imported model adds on the right -- and that is right while
     there IS a purpose literature. On a project holding no papers it named
     two sides of a join over a corpus that does not exist. */
  if(!Object.keys(G.papers || {}).length)
    return `<p class="empty"><b>Nothing to join yet.</b> This step puts two literatures on
      one map so a relation can cross between them, and this project holds none. Scope a
      literature on step 1.1 first, or read a second one in from the menu beside the
      literature selector there.</p>`;
  const A = xstream("cur"), B = xstream("rights"), X = crossGroups();
  const S = joinSides();
  const opt = n => `<option value="${hesc(n.id)}">${hesc(String(n.label).replace(/-/g, " "))}</option>`;
  const side = (k, ns, lab, note) => `<div class="fld declcol">
      <span class="ctl-label">${lab} <b class="xn">${ns.length}</b></span>
      <select class="xsel" id="x${k}" aria-label="${hesc(lab)}"${ns.length ? "" : " disabled"}>
        ${ns.map(opt).join("")}</select>
      <p class="why" style="margin-top:5px">${note}</p>
    </div>`;
  return `
   <div class="row" style="gap:14px 26px">
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="embhd">
         <span class="ctl-label">Join the literatures ${infold(`One construct from each literature, under one name.`)}</span>
         <span class="pcount">${X.length
           ? `<b>${X.length}</b> join${X.length === 1 ? "" : "s"} made`
           : "nothing joined yet"}</span>
       </div>
     </div>
     ${S.one ? "" : `<div class="fld" style="flex:1 1 100%;max-width:none">
       <p class="why" style="margin:0 0 7px"><b>${litCount()}</b> literatures, and this
         joins two of them. From this step on the map holds every one of them at once:
         one map with both vocabularies on it is what lets a relation cross between
         them.</p>
       ${litCount() > 2 ? `<div class="row" style="gap:6px 10px">
         <label class="mblab">one side
           <select data-joinside="a">${litList().map(x =>
             `<option value="${hesc(x.id)}"${LIT.join.a === x.id ? " selected" : ""}>${
               hesc(x.name)}</option>`).join("")}</select></label>
         <label class="mblab">the other
           <select data-joinside="b">${litList().map(x =>
             `<option value="${hesc(x.id)}"${LIT.join.b === x.id ? " selected" : ""}>${
               hesc(x.name)}</option>`).join("")}</select></label>
       </div>` : ""}
     </div>`}
     <div class="declgrid">
       ${side("Cur", A, hesc(S.a.name), S.a.note)}
       ${side("Rights", B, hesc(S.b.name), S.b.note)}
     </div>
     <div class="fld" style="flex:1 1 100%;max-width:none">
       <div class="cmpacts" style="margin:0;align-items:center">
         <input type="text" class="defbox cond" id="xname" style="max-width:280px;margin:0"
           placeholder="name the quantity the two of them measure"
           aria-label="Name for the joined quantity">
         <button type="button" class="edbtn" data-xjoin="1"${
           A.length && B.length && S.a.ready && S.b.ready ? "" : " disabled"}>these are the same quantity</button>
       </div>
       ${XJOIN.err ? `<p class="why" style="color:var(--neg)">${hesc(XJOIN.err)}</p>` : ""}
       <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Joining carries both constructs and draws one boundary around them, so it
         stays inspectable and reversible — the same object a merge at step 1.2 makes, and the
         same record. What it buys is a relation that can run from one literature into the
         other, which neither corpus asserts on its own.</span></p>
     </div>
     ${X.length ? `<div class="fld" style="flex:1 1 100%;max-width:none">
       <span class="ctl-label">Joined so far</span>
       <div class="chain">${X.map(g => `<div class="crow">
         <span class="cst ok">joined</span>
         <span class="cnm">${hesc(g.name || g.id)}</span>
         <span class="cwy">${(g.members || []).map(i =>
           `<b class="xs${xstreamOf(i)}">${hesc(String(i).replace(/-/g, " "))}</b>`).join(" + ")}
           <button type="button" class="edbtn" data-xdrop="${hesc(g.id)}"
             style="margin-left:8px">undo</button></span>
       </div>`).join("")}</div>
     </div>` : ""}
   </div>`;
}
const XJOIN = {err:""};
function xjoinDo(){
  const a = document.getElementById("xCur"), b = document.getElementById("xRights");
  const nm = document.getElementById("xname");
  if(!a || !b){ XJOIN.err = "both literatures need a construct to join"; return; }
  const A = (lastView.allNodes || []).find(n => n.id === a.value);
  const B = (lastView.allNodes || []).find(n => n.id === b.value);
  if(!A || !B){ XJOIN.err = "that construct is no longer on the map"; return; }
  const name = String((nm && nm.value) || "").trim();
  if(!name){ XJOIN.err = "a join needs a name — it is a construct you are minting, not a tick"; return; }
  XJOIN.err = "";
  /* Both ends have to be carried or the join carries nothing forward, which is
     what `joinNodes` does for a merge at step 1.2. */
  setCarryNode(A, true); setCarryNode(B, true); cpersist();
  makeGroup([...A.mem.map(m => m.i), ...B.mem.map(m => m.i)], name);
  xlog("join", "Joined the literatures", name + " = " +
    String(A.label).replace(/-/g, " ") + " + " + String(B.label).replace(/-/g, " "));
}

/* Which conversation a construct belongs to.

   This is a LEXICAL rule over the construct's own id, not a reading of the
   papers -- the same honesty the merge slider needs, which tests wording rather
   than theory. It earns its place because the purpose corpus turns out to hold
   three kinds of construct and only one of them is about purpose. A second
   stream, when one exists, replaces the rule for its own constructs with its
   own extraction.

   THERE WAS A SECOND PATTERN HERE, over rights, enfranchisement, ownership and
   governance, and it is gone. It matched 45 constructs of this corpus and
   filed them under the imported literature, which they are not from: this
   corpus was retrieved on purpose and names governance because the purpose
   conversation does. What the import adds is `importedAdds` above, and it is
   two constructs rather than 45. */
const STREAM_RX = {
  cur: /purpose|mission|prosocial|societal|meaningful|values|moral|ideal/
};
/* What the model actually imported, as against what merely sounds like it.
   The lexical rule put the Stoelhorst and Vishwanathan material in three
   different sections, because it reads construct names and the model binds to
   constructs whose names say nothing about rights -- purpose integration, the
   firm's accounting result. The footprint is exact: every id the model's
   variables bind to, and every end of a relation it proposes. */
let IMPORTED = null;
function importedIds(){
  if(IMPORTED) return IMPORTED;
  IMPORTED = new Set();
  for(const b of Object.values(MR.bindings || {}))
    for(const i of (b.ids || [])) IMPORTED.add(i);
  for(const r of (MR.relations || [])){
    const p = r.proposes; if(!p) continue;
    IMPORTED.add(p.from); IMPORTED.add(p.to);
    for(const i of (p.also_reads || [])) IMPORTED.add(i);
    for(const i of (p.also_writes || [])) IMPORTED.add(i);
  }
  return IMPORTED;
}
/* WHAT THE MODEL ADDS, as against what it merely binds to. A construct this
   corpus already carries is not an addition: it is a binding, and the model
   reading it is what makes the model about this literature. An addition is a
   quantity the model needs that no paper here names, and the model's own
   report says which those are -- it carries the paper count behind every
   binding. On the two-channel model there are two, the residual and the fixed
   control rights channel, each a share where the corpus has only a binary or
   a category. An id the report does not account for counts as an addition,
   which is the safe way round: a construct nothing vouches for is not one
   this corpus was shown to carry. */
let IMPADD = null;
function importedAdds(){
  if(IMPADD) return IMPADD;
  IMPADD = new Set(importedIds());
  for(const b of Object.values(MR.bindings || {}))
    for(const x of (b.bound || [])) if(+x.papers > 0) IMPADD.delete(x.id);
  return IMPADD;
}
/* ONE RULE FOR BOTH, and it is xstreamOf. These two disagreed once -- the
   NODE `stakeholder-enfranchisement` read as rights because streamOf tested the
   rights pattern first, and its ID read as "other" because streamOfId tested
   the imported footprint and then the purpose pattern -- so a join made across
   the two columns was not a join by the check that counted them. They are the
   same rule now, applied to an id or to whichever of a node's members answers
   first, and with more than one literature that rule is provenance. */
const streamOfId = i => xstreamOf(i);
function streamOf(n){
  for(const m of (n.mem || [])){
    const k = xstreamOf(m.i);
    if(k !== "other") return k;
  }
  return "other";
}
/* THE SECTIONS THE CONSTRUCT BASKET IS SPLIT INTO, which are the two sides of
   the join plus what belongs to neither. Their NAMES follow the literatures
   where there are two: the labels below are what a single-literature run sees,
   where the second side is what the imported model adds. */
function streamLabel(k){
  if(litCount() < 2) return (STREAMS.find(x => x.k === k) || {}).n || k;
  if(k === "cur") return litName(LIT.join.a);
  if(k === "rights") return litName(LIT.join.b);
  return "Neither";
}
const STREAMS = [
  {k:"cur", n:"Current stream",
   why:"The constructs this stream was built for \u2014 their names carry purpose, mission, values or the societal ideal. This is the conversation the corpus was retrieved to cover."},
  {k:"rights", n:"Property rights (imported)",
   why:"What the imported model ADDS: the quantities it needs that no paper in this corpus carries. Everything else it reads is a construct above \u2014 purpose integration, the firm's accounting result \u2014 and a construct the corpus already carries is a binding rather than an addition."},
  {k:"other", n:"Other",
   why:"Neither. Performance measures, trust, identity, attention, legal form. The largest of the three, which is the finding: a literature about purpose names mostly other things."}
];

function wireTabs(el){
  const TIP = {
    rtabImp: `<h5>Import a literature</h5><p class="def">A second literature's own
      extraction \u2014 its constructs, its relationships, the same signatures \u2014 so the two can be
      curated side by side and a relation can cross between them. This is the step's method:
      <b>analogical abduction</b>, borrowing explanatory principles from a field that is
      better understood.</p>
      <p class="def">It is read in on <b>step 1.1</b>, in the menu beside the literature
      selector, because a literature is scoped, selected and weighed before it can be joined
      with \u2014 and this takes you there. With one literature the sections below split THIS
      corpus by a rule over construct names, which reads wording rather than papers; with
      two they are the two literatures, by where each construct came from.</p>`,
  };
  Object.keys(TIP).forEach(id => {
    const b = el.querySelector(`[data-imp="${id}"]`); if(!b) return;
    b.addEventListener("mouseenter", ev => showTip(TIP[id], ev));
    b.addEventListener("mousemove", ev => showTip(TIP[id], ev));
    b.addEventListener("mouseleave", hideTip);
    /* It goes to step 1.1, where a literature is read in, rather than doing it
       here: the three steps before the join are what make a literature
       joinable. */
    b.addEventListener("click", ev => { ev.preventDefault(); hideTip(); goStage(1); });
  });
}

function wireRelRows(el){
  const msel = ids => { state.msel = new Set(ids); renderSelectedRail(); refresh(); };
  const on = (id, fn) => { const b = el.querySelector("#" + id); if(b) b.addEventListener("click", fn); };
  on("rAll",  () => msel(MR.relations.map(r => r.id)));
  on("rSup",  () => msel(MR.relations.filter(r => r.corpus.kind === "arrow").map(r => r.id)));
  on("rNone", () => msel([]));
  el.querySelectorAll("[data-rel]").forEach(b => b.addEventListener("change", () => {
    if(b.checked) state.msel.add(b.dataset.rel); else state.msel.delete(b.dataset.rel);
    renderSelectedRail(); refresh();
  }));
}

/* The claims half of the building blocks. Two kinds of row, and the difference
   between them is the whole point of the box:

     EXTRACTED      a statement these papers make, shown once however many of
                 them make it, with its evidence set beneath it. It exists.
     RECONSTRUCTED  the statement a model's mechanism would need in order to be
                 warranted, written in this corpus's own construct ids with a
                 sign inferred from what the mechanism does. It does NOT exist:
                 it is the sentence someone would have to go and find or test,
                 and ticking it is what carries it into step 2.1's decisions.

   A model that reads principal conflict and dissipates value is proposing that
   shareholder primacy lowers the firm's accounting result. Nobody in this
   corpus says so. That is worth seeing as a row rather than inferring from an
   absence. */
/* Every construct named by a claim shown in this tab, whichever stream the rule
   puts it in. The two boxes have to agree: a claim about shareholder primacy and
   the firm's accounting result is unreadable if neither construct is listed
   above it, and for a stream being assembled by hand -- which is what property
   rights is, there being nothing to import -- the claims are where its
   constructs come from in the first place.

   Three cases, and each says what can be done about it:
     on the map        a cluster holds it; its tick carries it like any other
     under the bar     in the extraction but drawn by nothing; admit it on step 1.1
     not extracted     registered in the corpus and carrying no claim at all,
                       which is why it is not in the payload. Nothing to do. */
function claimEnds(tab){
  const inTab = i => streamOfId(i) === tab;
  const out = new Set();
  for(const e of (lastView.links || [])) for(const c of e.claims){
    const ends = (c.a || []).concat(c.c || []);
    if(ends.some(inTab)) ends.forEach(i => out.add(i));
  }
  for(const r of (MR.relations || [])){
    const p = r.proposes; if(!p) continue;
    if(inTab(p.from) || inTab(p.to)){ out.add(p.from); out.add(p.to); }
  }
  return out;
}

function namedBox(shownIds, tab){
  if(!litHere()) return "";
  const ends = [...claimEnds(tab)].filter(i => !shownIds.has(i));
  if(!ends.length) return "";
  // The unnarrowed world: from step 1.3 the view holds only what was carried,
  // and a construct missing from it is not thereby under the threshold.
  const host = i => (lastView.allNodes || lastView.nodes || [])
    .find(n => n.mem.some(m => m.i === i));
  const rank = i => host(i) ? 0 : N.get(i) ? 1 : 2;
  ends.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const row = i => {
    const h = host(i), reg = N.get(i);
    const where = STREAMS.find(x => x.k === streamOfId(i));
    const tag = h ? (h.carried ? "selected" : "in scope, not selected")
              : reg && inScope(reg) ? "in scope, not drawn"
              : reg ? "under the occurrence threshold"
              : "registered with no relationship";
    const far = where && where.k !== tab;
    return `<li class="undrow">
      ${h ? `<input type="checkbox" data-pick="${h.id}" ${h.carried ? "checked" : ""}
              aria-label="${i.replace(/-/g," ")}">`
          : reg ? `<button type="button" class="undbtn" data-admit="${i}"
              title="admit it, and it is drawn and carried">+</button>`
          : `<span class="undbtn" style="border-style:dotted;cursor:default">\u2013</span>`}
      <span>${i.replace(/-/g," ")}<i>${tag}${far ? ` \u00b7 ${where.n.toLowerCase()}` : ""}${
        reg ? ` \u00b7 ${reg.p.filter(okPaper).length}p` : ""}</i></span></li>`;
  };
  const n = {map:0, under:0, none:0};
  ends.forEach(i => { const r = N.get(i);
    host(i) ? n.map++ : r && !inScope(r) ? n.under++ : r ? n.map++ : n.none++; });
  return `<div class="namedhd"><span class="movlab">Named by a relationship here</span>
      <span class="seedn">${ends.length}</span></div>
    <ul class="undlist">${ends.map(row).join("")}</ul>
    <p class="railnote">${[n.map ? `${n.map} in scope` : "",
      n.under ? `${n.under} under the occurrence threshold \u2014 admit one on step 1.1` : "",
      n.none ? `${n.none} in the registry with no relationship at all, so absent from the payload and
        nothing a model can be checked against` : ""].filter(Boolean).join(" \u00b7 ")}</p>`;
}

/* The claims half of the building blocks, by literature. The rows themselves
   are the same component step 1.3 uses -- statements as headings, the claims
   as evidence beneath, the properties of the relation between them, editable
   here as there -- because a curator looking at the claims on step 2.1 is
   looking at the same objects, and a second interface for them would be a
   second vocabulary to learn.

   What is added here and is not on step 1.3: the RECONSTRUCTED rows. Those
   are not claims at all. They are what a model's mechanism would need a paper
   to assert, written in this corpus's construct ids with the sign inferred from
   what the mechanism does. Nobody has asserted them, and ticking one carries it
   on the modeller's authority. */
/* A relation the model needs, written as a statement so it reads like the rest.
   It is qualified the same way -- relationship, sign, class -- and the one
   thing it cannot have is support: nobody asserts it, so every count is zero
   and the sign is inferred from what the mechanism does rather than read off a
   paper. The role is shown because it is where the sign came from. */
const ROLE_WHY = {
  dissipates: "destroys value, so the relationship behind it would be a cost",
  modulates:  "changes how much another mechanism does, so its own sign is not fixed",
  gates:      "below a threshold it does nothing, so the relationship is a condition",
  allocates:  "moves value between channels rather than changing the total",
};
function reconGroupHTML(r){
  const p = r.proposes;
  const id = "mr:" + r.id;
  const v = spec.get(id);
  const rel = (v && v.rel) || "";
  const open = state.relOpen.has(id);
  const shown = open ? JJ_REL : JJ_REL.filter(x => rel === x.k);
  const relBtn = x => `<button type="button" class="sup pick${rel === x.k ? " on" : ""} none"
      data-setrel="${hesc(id)}|${x.k}"
      title="${hesc(x.n + " \u2014 " + x.why.replace(/<[^>]+>/g, "") +
        "\n\nNo paper asserts this relation at all, so nothing supports any of the seven.")}"
      >${x.n}</button>`;
  const host = i => (lastView.allNodes || lastView.nodes || [])
    .find(n => n.mem.some(m => m.i === i));
  const nm = i => { const h = host(i); return h ? h.label.replace(/-/g, " ") : i.replace(/-/g, " "); };
  const bucket = (lab, tip, body) =>
    `<span class="cpb"><span class="cplab" title="${hesc(tip)}">${lab}</span>${body}</span>`;
  return `<div class="cgrp recon">
    <div class="cghd">
      <input type="checkbox" data-rel="${r.id}" ${state.msel.has(r.id) ? "checked" : ""}
             aria-label="Carry ${relName(r.id)}">
      <span class="cgn">${nm(p.from)} <b>\u21e2</b> ${nm(p.to)}</span>
      <span class="cgmeta"><span class="evb rec">no paper asserts it</span>
        <span class="sup none">papers<i>0</i></span>
        ${r.corpus && r.corpus.kind === "arrow" ? "the corpus draws this pair" : "reconstructed"}</span>
    </div>
    <div class="cprops">
      ${bucket("rel", "Nothing in the corpus asserts this relation, so none of the seven " +
        "carries support. Declaring one is the modeller's call.",
        shown.map(relBtn).join("") +
        (shown.length ? "" : `<span class="sup none">not declared</span>`) +
        `<button type="button" class="cpmore" data-relmore="${hesc(id)}"
          >${open ? "less" : "declare\u2026"}</button>`)}
      ${bucket("sign", hesc(p.inferred_from || ""),
        `<span class="sup none">${p.sign}<i>inferred</i></span>`)}
      ${bucket("role", "What the mechanism does in the model, which is where the sign " +
        "above came from.",
        `<span class="sup none" title="${hesc(ROLE_WHY[r.role] || "")}">${r.role}</span>`)}
      ${bucket("class", "The class to enumerate over. Declared, like every other.",
        (v && v.props && v.props.length
          ? v.props.map(k => `<span class="sup on">${k}</span>`).join("") +
            `<span class="sup on">${memberCount(v.props)}/${MEMBERS_ALL}</span>`
          : `<span class="sup none">not declared</span>`) +
        `<button type="button" class="edbtn" data-ed="${hesc(id)}">Edit</button>`)}
    </div>
    <div class="clrw sub"><span class="st"><span class="sttx">${hesc(r.says || "")}</span></span></div>
  </div>`;
}

/* A relation the modeller added. The same four buckets as every other row,
   because the question is the same one; what differs is that every value in
   them is declared rather than supported, and the badge says so. No carry
   checkbox: a claim added on step 2.1 is carried by the act of adding it, and
   the way to take it back is to remove it, here, on the step that made it. */
function handGroupHTML(m, editable){
  const id = "mx:" + m.id;
  const v = spec.get(id);
  const rel = (v && v.rel) || "";
  const open = state.relOpen.has(id);
  const shown = open ? JJ_REL : JJ_REL.filter(x => rel === x.k);
  const relBtn = x => `<button type="button" class="sup pick${rel === x.k ? " on" : ""} none"
      data-setrel="${hesc(id)}|${x.k}"
      title="${hesc(x.n + " \u2014 " + x.why.replace(/<[^>]+>/g, "") +
        "\n\nNothing in the corpus asserts this relation, so none of the seven carries " +
        "support here. The declaration is the modeller's.")}">${x.n}</button>`;
  const bucket = (lab, tip, body) =>
    `<span class="cpb"><span class="cplab" title="${hesc(tip)}">${lab}</span>${body}</span>`;
  return `<div class="cgrp hand">
    <div class="cghd">
      <span class="cgn">${hesc(handName(m.from))} <b>\u2192</b> ${hesc(handName(m.to))}</span>
      <span class="cgmeta"><span class="evb hand" title="${hesc(
        "Not from the corpus. A relationship the modeller asserted on step 2.1, on " +
        "their own authority, because the model needs it and no paper in this extraction " +
        "supplies it. It is carried, and it is never counted as evidence.")
        }">added by hand</span>
        <span class="sup none">papers<i>0</i></span>
        ${m.at}${editable ? `
        <button type="button" class="edbtn" data-mced="${hesc(m.id)}">Edit</button>
        <button type="button" class="edbtn del" data-mcdel="${hesc(m.id)}">Remove</button>` : ""}</span>
    </div>
    <div class="cprops">
      ${bucket("rel", "Jaccard and Jacoby (2010) ch. 7. Nothing supports any of the seven " +
        "here, so the declaration is the whole of the record.",
        shown.map(relBtn).join("") +
        (shown.length ? "" : `<span class="sup none">not declared</span>`) +
        `<button type="button" class="cpmore" data-relmore="${hesc(id)}"
          >${open ? "less" : "declare\u2026"}</button>`)}
      ${bucket("sign", "The direction the modeller asserts. On every other row this is read " +
        "off the papers; here there are none to read.",
        `<span class="sup none">${m.g || "not declared"}<i>declared</i></span>`)}
      ${bucket("form", "The functional form the modeller states, in Jaccard and Jacoby's " +
        "six classes. A different question from the class below, which is what gets run.",
        `<span class="sup none">${m.sh || "not stated"}</span>`)}
      ${bucket("class", "The class to enumerate over. Declared, like every other.",
        (v && v.props && v.props.length
          ? v.props.map(k => `<span class="sup on">${k}</span>`).join("") +
            `<span class="sup on">${memberCount(v.props)}/${MEMBERS_ALL}</span>`
          : `<span class="sup none">not declared</span>`) +
        (v && (v.lo !== 0 || v.hi !== 1)
          ? `<span class="sup on">${(+v.lo).toFixed(2)}\u2013${(+v.hi).toFixed(2)}</span>` : "") +
        (v && (v.elo != null || v.ehi != null)
          ? `<span class="sup on">est ${v.elo == null ? "?" : v.elo}\u2013${
              v.ehi == null ? "?" : v.ehi}</span>` : "") +
        `<button type="button" class="edbtn" data-ed="${hesc(id)}">Edit</button>`)}
      ${v && v.note ? `<span class="cpnote">${hesc(v.note)}</span>` : ""}
    </div>
    ${m.def ? `<div class="clrw sub"><span class="st"><span class="sttx"
      >${hesc(m.def)}</span></span></div>` : ""}</div>`;
}

/* The additions in a section of their own, at the end. Not folded into a
   stream: a stream is a literature and this is not one. */
function handListHTML(editable){
  if(!mcon.size && !mclm.size) return "";
  const cl = [...mclm.values()].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const n = mcon.size;
  return `<div class="strmhd" data-strm="added" title="${hesc(
      "Constructs and relations the modeller added because the model needs them and the " +
      "corpus has not got them. Nothing in here is evidence.")
    }"><span class="movlab">Added by hand</span>
      <span class="seedn">${n} construct${n === 1 ? "" : "s"} \u00b7 ${
        cl.length} relationship${cl.length === 1 ? "" : "s"}</span></div>` +
    (cl.length
      ? `<div class="clist">${cl.map(m => handGroupHTML(m, editable)).join("")}</div>`
      : `<p class="empty">${n} construct${n === 1 ? "" : "s"} added and no relation between
         them yet. <b>+ relationship</b>, by the relationship count above, asserts one.</p>`);
}

/* ------------------------------------------ what a model would be made of

   A carried relation can have come from four places \u2014 a statement the corpus
   asserts, a path composed out of several, a relation the imported model
   proposes, one added by hand \u2014 and a model carries a term for each of them
   the same way. What differs is what stands behind it, so `src` travels with
   the relation and into the generated file, where it is a comment and not a
   number: the record says who authorised each term. */
const varKey = x => {
  const i = x && x.id !== undefined ? x.id : x;
  if(mcon.has(i)) return i;
  const n = (lastView.allNodes || []).find(k => k.id === i || (k.mem || []).some(m => m.i === i));
  return n ? n.id : i;
};
function carriedRelations(){
  const out = [];
  for(const g of statementsInPlay(false))
    out.push({id:g.e.id, from:varKey(g.e.source), to:varKey(g.e.target), src:"corpus",
      papers:support(g.rows).length, why:(g.rows[0] || {c:{}}).c.t || ""});
  for(const f of composedPaths().filter(x => state.comp.has(x.id)))
    out.push({id:f.id, from:varKey(f.from), to:varKey(f.to), src:"composed",
      papers:f.papers.length,
      why:`Composed along ${f.path.length} links. No paper asserts it end to end.`});
  for(const r of (MR.relations || []))
    if(r.proposes && state.msel.has(r.id))
      out.push({id:"mr:" + r.id, from:varKey(r.proposes.from), to:varKey(r.proposes.to),
        src:"model", papers:0, why:r.says || "", role:r.role});
  for(const m of mclm.values())
    out.push({id:"mx:" + m.id, from:varKey(m.from), to:varKey(m.to), src:"hand",
      papers:0, why:m.def || "", name:m.name || ""});
  // a relation to a construct that is not in view has nowhere to land, and a
  // construct bearing on itself is not a relation
  return out.filter(x => x.from && x.to && x.from !== x.to);
}
// only the constructs the model will actually use: the ends of what is carried
function carriedVars(){
  const seen = [];
  for(const r of carriedRelations())
    for(const k of [r.from, r.to]) if(!seen.includes(k)) seen.push(k);
  return seen;
}
/* Every one of these returns a CLASS. An empty one is not "nothing declared
   and therefore nothing": it is the widest declaration available, admitting the
   whole vocabulary, and the space below counts it that way. */
const rolesOf = r => {
  const v = spec.get(r.id) || {};
  if(Array.isArray(v.roles) && v.roles.length) return v.roles;
  if(v.role) return [v.role];          // a record written before this was a class
  if(r.role) return [r.role];          // or a role the imported model supplied
  return [];
};
const roleOf = r => rolesOf(r)[0] || "";
const vKinds = k => { const t = vtype.get(k) || {};
  return (Array.isArray(t.kinds) && t.kinds.length) ? t.kinds : (t.kind ? [t.kind] : []); };
const vAspects = k => { const t = vtype.get(k) || {};
  return (Array.isArray(t.aspects) && t.aspects.length) ? t.aspects : (t.aspect ? [t.aspect] : []); };
const propsOf = r => ((spec.get(r.id) || {}).props) || [];
/* What the corpus recorded about a construct, read into the kind vocabulary.
   It holds a scale and a stock/flow mark for all 422. Two of the five scales
   reach a kind and three do not: nominal names a category the nine have no
   word for, and ratio says a zero is meaningful without saying what of. So
   this narrows and does not settle — an ordinal stock comes back as two of
   nine, which is a smaller class and still a class.

   A merged construct is the union of its members, because a class has to
   admit every reading its parts carry: merging an ordinal stock with a ratio
   flow leaves both in, and that is the honest result rather than a failure
   to decide. */
const SCALE_KIND = {binary:"threshold", ordinal:"degree", interval:"degree"};
function recordedKinds(k){
  const n = (lastView.allNodes || []).find(x => x.id === k);
  if(!n || typeof N === "undefined" || !N.get) return [];
  const out = new Set();
  for(const m of (n.mem || [])){
    const r = N.get(m.i) || {};
    if(r.f === "s") out.add("stock");
    if(r.f === "f") out.add("rate");
    if(SCALE_KIND[r.s]) out.add(SCALE_KIND[r.s]);
  }
  return KINDS.map(x => x[0]).filter(x => out.has(x));
}
/* Aspect is recorded nowhere, and the step's own text calls it the one that
   bites. What a name carries is a comparison — outperformance is measured
   against an index, a reduction against a before — and those are exactly the
   quantities sitting at zero when the baseline does. Proposed from the name
   and read off nothing, which is why it is its own action and why it touches
   only what it matches: not containing one of these words is not evidence of
   being a level. */
const DIFFWORDS = /(?:out|under)perform\w*|excess|premium|\bgap\b|differen\w*|relative|\bnet\b|spread|deviation|\bchange\b|growth|improvement|increase|reduction|\bversus\b|\bvs\b/i;
const looksLikeDifference = k =>
  DIFFWORDS.test(String(handName(k))) || DIFFWORDS.test(String(k).replace(/-/g, " "));
/* What a paper actually committed to, where one did and the estimator did not
   do it for them. Several claims on one pair can state different shapes; the
   union is the honest reading, because the class has to admit all of them. */
function statedProps(r){
  if(r.src !== "corpus") return [];
  const g = statementsInPlay(false).find(x => x.e.id === r.id);
  if(!g) return [];
  const out = new Set();
  for(const row of g.rows){
    const c = row.c;
    if(!["asserted", "derived"].includes(c.sb)) continue;
    (SHAPE_PROPS[c.sh] || []).forEach(p => out.add(p));
  }
  return [...out].filter(p => !propClash([...out]).length || p !== "sigmoid");
}

/* The space the declarations still leave open, over every choice and not only
   the forms. An undeclared choice admits its whole vocabulary, so the figure is
   enormous until something is said -- which is the argument for the step rather
   than a fault in the arithmetic. */
/* What a model would have to produce rather than be given: the quantities
   something writes. A quantity nothing writes is a parameter, and a parameter
   is not composed. */

export { DIFFWORDS, IMPORTED, ROLE_WHY, SCALE_KIND, STREAMS, STREAM_RX, joinSides, streamLabel, XJOIN, XJOINA, addNodeToGroup, carriedRelations, carriedVars, claimEnds, crossGroups, dragNid, dragSet, dropNodeFromGroup, groupOfNode, handGroupHTML, handListHTML, importedAdds, importedIds, joinBlockHTML, joinNodes, joinRecoHTML, joinSuggestHTML, looksLikeDifference, makeGroup, namedBox, propsOf, reconGroupHTML, recordedKinds, renderSelbar, renderStepCard, roleOf, rolesOf, statedProps, streamOf, streamOfId, vAspects, vKinds, varKey, wireRelRows, wireTabs, xcand, xdefn, xjoinDo, xlab, xspace, xstream, xstreamOf, xstreams, xtake, xwordScore };

/* AMG bench, page script 17 of 22: the worklists, names forced apart, and the pass.
   One shared global scope, loaded in order. See page/README.md. */
import { hesc } from "../core/safe.js";
import { COMPONENTS, renderPanel, stepNo } from "./06-wiring.js";
import { DVERBS, MEMBERS_ALL, RECORDED, SOLID, composedPaths, decided, dforget, dpersist, groups, memberCount, spec, specSet } from "./03b-decisions.js";
import { G } from "../graph-data.js";
import { JALL, N, lsRead, lsWrite, pap, state } from "./03-stores.js";
import { PROV, scenCur, scenFile, stampLines } from "./17-scenarios.js";
import { STAGES } from "./04-stages.js";
import { STEPOF, context, lbl, worklist } from "./15-deposit.js";
import { chint, draw, hideTip, lastView, mapSet, showTip } from "./13-map.js";
import { derivedClaims, resultsFile, statedLines, xlog } from "./05-explore.js";
import { okPaper } from "./03c-corpus.js";
import { modelPy } from "./11-classes.js";
import { refresh } from "./14-boot.js";
import { statementsInPlay, support } from "./12-claims.js";
/* --------------------------------------- the worklists, one for each step */
/* `from` is the step a nomination belongs to, and 0 is the model. Every list
   below renders the same row; which rows it holds is the only difference. */
const wlFilter = {0:"open", 1:"open", 2:"open", 3:"open"};

function renderWorklist(from){
  if(from === undefined){ [0, 1, 2, 3].forEach(renderWorklist); return; }
  const host = document.getElementById(from === 0 ? "worklist" : "wl" + from);
  if(!host) return;
  const f = wlFilter[from] || "open";
  /* The counting pass in refresh() caught a failure here and left the panel
     empty with nothing to say. One line instead, so a reader can tell a list
     with nothing in it from a list that could not be built. */
  if(lastView.wlErr){
    host.innerHTML = `<p class="empty"><b>The worklist could not be built.</b>
      ${hesc(lastView.wlErr)}</p>`;
    return;
  }
  const all = worklist(lastView).filter(x => x.nom.from === from);
  const items = all.filter(x =>
    f === "all" ? true : f === "open" ? !x.answered : !!x.answered);

  const bar = document.querySelector(`[data-wl="${from}"]`);
  if(bar) bar.querySelectorAll("button").forEach(b => {
    b.setAttribute("aria-pressed", b.dataset.f === f);
    if(!b.dataset.wired){ b.dataset.wired = "1";
      b.addEventListener("click", () => { wlFilter[from] = b.dataset.f; renderWorklist(from); }); }
  });

  // Only step 2.1 carries the ledger: it is the summary of the three before it.
  const led = from === 0 && document.getElementById("ledger");
  if(led){
    const every = worklist(lastView);
    const bystep = {0:0, 1:0, 2:0, 3:0};
    every.filter(x => !x.answered).forEach(x => bystep[x.nom.from] = (bystep[x.nom.from] || 0) + 1);
    const stale = every.filter(x => x.stale).length;
    led.innerHTML = [1,2,3].map(n => {
      const st = STAGES.find(x => x.n === n);
      return `<button type="button" class="ledrow" data-goto="${n}">
        <span class="ledstep">Step ${stepNo(n)} — ${st.title}</span>
        <span class="ledwhat">${STEPOF[n]()}</span>
        <span class="ledn">${bystep[n]} <i>open here</i></span>
      </button>`;
    }).join("") +
    (stale ? `<p class="ledstale">${stale} answer${stale>1?"s were":" was"} given under settings you have since changed. They are marked on the step that asked them; re-answering records the new context.</p>` : "");
    led.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => {
      state.stage = +b.dataset.goto; renderPanel(); refresh(); draw();
      document.querySelector(".panel").scrollIntoView({behavior:"smooth", block:"start"});
    }));
  }

  if(!items.length){
    host.innerHTML = `<p class="empty" style="padding:14px 0 4px">${
      f !== "open" ? "Nothing answered here yet."
        : from === 0
          ? "The model's report raises nothing at these settings. Raise the smallest difference worth having, or hand it a relation from step 1.3, and it will."
          : "Nothing outstanding at this step's settings. Move a setting above and the bench will find something to ask you."}</p>`;
    return;
  }

  const byKind = new Map();
  for(const it of items){
    if(!byKind.has(it.nom.id)) byKind.set(it.nom.id, {nom:it.nom, rows:[]});
    byKind.get(it.nom.id).rows.push(it);
  }

  host.innerHTML = [...byKind.values()].map(({nom, rows}) => `
    <section class="wlgroup">
      <div class="wlhead">
        <h4>${nom.kind} <span class="n">${rows.length}</span></h4>
        <p class="wlfrom">follows from <b>${STEPOF[nom.from]()}</b></p>
        <p>${nom.why}</p>
      </div>
      ${rows.map(it => {
        const a = it.answered;
        const ps = (it.papers || []).filter(x => G.papers[x]);
        return `<div class="wlitem${a?" answered":""}">
          <div class="wltop">
            <span class="wltarget">${it.target}</span>
            ${a ? `<span class="pill ok">${a.verb}</span>` : ``}
            ${(it.nodeIds||[]).length ? `<button type="button" class="papbtn look"
               data-look="1">see on map</button>` : ``}
            ${ps.length ? `<button type="button" class="papbtn" data-pap="${hesc(it.key)}"
               aria-expanded="false">${ps.length} paper${ps.length>1?"s":""}</button>` : ``}
          </div>
          <div class="wldetail">${it.detail || ""}</div>
          ${ps.length ? `<div class="paplist" id="pap-${hesc(it.key)}" hidden>
            ${ps.map(sl => { const q = pap(sl);
              const n = (it.claims && it.claims.length)
                ? 0 : 0;
              return `<div class="paprow">
                ${q.d ? `<a href="https://doi.org/${q.d}" target="_blank" rel="noopener">${q.a} (${q.y})</a>`
                      : `<span>${q.a} (${q.y})</span>`}
                <span class="papj">${q.jf || q.j}</span>
                <span class="papap">${(G.approaches[q.ap]||{}).l || ""}</span>
              </div>`; }).join("")}
          </div>` : ``}
          ${it.stale ? `<div class="wlstale">Answered under different settings — ${it.stale}</div>` : ``}
          ${it.recorded.length ? `<div class="wlrec">Already in the record:
            ${it.recorded.map(r => `<b>${r.a}</b> on ${r.t} — ${r.r.length>150?r.r.slice(0,149)+"\u2026":r.r}`).join("<br>")}</div>` : ``}
          ${a ? `<div class="wlans">
              <span>${a.reason || "no reason given"}</span>
              <button type="button" data-undo="${hesc(it.key)}">Reopen</button>
            </div>`
            : `<div class="wlverbs">
              ${it.nom.verbs.map(vb => `<button type="button" data-ans="${hesc(it.key)}"
                 data-verb="${vb}" title="${DVERBS[vb]||""}">${vb}</button>`).join("")}
              <input type="text" class="wlreason" data-for="${hesc(it.key)}"
                     placeholder="why — recorded with the decision" aria-label="Reason">
            </div>`}
        </div>`;
      }).join("")}
    </section>`).join("");

  // Hovering a nomination lights only what it is about. This is what ties the
  // worklist to the map: you judge the thing while looking at it.
  host.querySelectorAll(".wlitem").forEach((el, i) => {
    const it = items[i]; if(!it) return;
    el.addEventListener("mouseenter", () => {
      if(!(it.nodeIds || []).length && !(it.linkIds || []).length) return;
      mapSet({spot:{n:new Set(it.nodeIds || []), e:new Set(it.linkIds || [])}});
      draw(); chint();
    });
    el.addEventListener("mouseleave", () => { mapSet({spot:null}); draw(); chint(); });
    const look = el.querySelector("[data-look]");
    if(look) look.addEventListener("click", () => {
      document.querySelector(".canvas").scrollIntoView({behavior:"smooth", block:"center"});
    });
  });

  host.querySelectorAll("[data-pap]").forEach(b => b.addEventListener("click", () => {
    const box = document.getElementById("pap-" + b.dataset.pap);
    if(!box) return;
    const show = box.hidden;
    box.hidden = !show; b.setAttribute("aria-expanded", String(show));
  }));
  host.querySelectorAll(".papbtn").forEach(b => {
    b.addEventListener("mouseenter", ev => {
      const box = document.getElementById("pap-" + b.dataset.pap);
      if(!box) return;
      showTip(`<h6>Papers behind this</h6><ul>${
        [...box.querySelectorAll(".paprow")].slice(0,8).map(r =>
          `<li>${r.textContent.trim().replace(/\s+/g," ")}</li>`).join("")}</ul>`, ev);
    });
    b.addEventListener("mouseleave", hideTip);
  });

  host.querySelectorAll("[data-ans]").forEach(b => b.addEventListener("click", () => {
    const key = b.dataset.ans;
    const it = items.find(x => x.key === key); if(!it) return;
    const inp = host.querySelector(`.wlreason[data-for="${CSS.escape(key)}"]`);
    const d = {key, verb:b.dataset.verb, target:it.target,
               members:it.members || [], claims:it.claims || [],
               papers:it.papers || [], kind:it.nom.kind, from:it.nom.from,
               reason:(inp && inp.value.trim()) || "",
               ctx:context(), at:new Date().toISOString().slice(0,10)};
    decided.set(key, d); dpersist(d);
    if(d.verb === "apart" && (it.members || []).length > 1) pinApart(it.members);
    refresh();
  }));
  host.querySelectorAll("[data-undo]").forEach(b =>
    b.addEventListener("click", () => {
      const k = b.dataset.undo; const d = decided.get(k);
      if(d && d.verb === "apart" && d.members) unpinApart(d.members);
      dforget(k);
    }));
}
/* `esc` is gone. It escaped only the double quote, which is enough for an
   attribute and nothing else, and having two escapers one letter apart is how
   the wrong one gets reached for. hesc covers a superset. */

/* Names forced apart never fold, whatever the tightness. This is the direct
   counterpart to a hand-made merge and the move step 2.1 is named for:
   two concepts merged under one name are split again. */
const apart = new Set();   // "a|b" for every forbidden pair
function pairsOf(ids){ const o = [];
  for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++)
    o.push([ids[i],ids[j]].sort().join("|"));
  return o; }
function pinApart(ids){ pairsOf(ids).forEach(k => apart.add(k)); asave(); }
function unpinApart(ids){ pairsOf(ids).forEach(k => apart.delete(k)); asave(); }
function asave(){ lsWrite("purposeApart", [...apart]); }
// restored by boot(), with every other store read
function bootApart(){ (lsRead("purposeApart") || []).forEach(k => apart.add(k)); }

/* ------------------------------------------------------------ the pass */
function renderPass(){
  const box = document.getElementById("passbox");
  if(!box) return;
  box.textContent = passText();
}

/* The pass, as text. Separated from the box because it is also the file: the
   same rows a curator reads here are the ones Export writes out, and a second
   way of generating them would be a second thing to keep true. */
function passText(){
  const today = new Date().toISOString().slice(0,10);
  const L = stampLines().concat(["#"]);
  L.push(`# curator's pass — purpose corpus`);
  L.push(`# ${today} · from the bench · proposals for curate.py, not changes`);
  L.push(`#`);
  L.push(`# date\taction\ttarget\tmembers\treason`);
  L.push(``);
  L.push(`# -- what was in view -------------------------------------------`);
  L.push(`${today}\tscope\toutlets\t${state.jr.size === JALL.size ? "all" : [...state.jr].join(";")}\t`);
  L.push(`${today}\tscope\tapproach\t${state.ap}\t`);
  L.push(`${today}\tscope\tmin_papers\t${state.minp}\t`);
  for(const i of state.admit){
    const n = N.get(i);
    L.push(`${today}\tadmit\t${i}\t${i}\t` +
      `added by hand under a threshold of ${state.minp}` +
      (n ? `, used by ${n.p.filter(okPaper).length} paper(s) in scope` : ""));
  }
  L.push(`${today}\tscope\ttightness\t${state.tight.toFixed(2)}\t`);
  L.push(`${today}\tscope\tbars\t` + ["Comm","Spec","Evid"].map(b =>
    `${b.toLowerCase()}>=${state.bar[b]}` + COMPONENTS[b].items
      .filter(it => (state.need[b][it.k] || "opt") !== "opt")
      .map(it => `,${it.k}=${state.need[b][it.k]}`).join("")).join(";")
    + `;stands=${state.ev};sign=${state.sgn}\t`);
  L.push(``);

  // The unnarrowed world: from step 1.3 the view holds only what was carried,
  // and a pass built from it would report that nothing was ever dropped.
  const VN = lastView.allNodes || lastView.nodes || [],
        E  = lastView.allLinks || lastView.links || [];
  const dropN = VN.filter(n => !n.carried), dropE = E.filter(e => !e.carried);
  L.push(`# -- what was carried forward ----------------------------------`);
  L.push(`${today}\tcarry\tnotions\t${VN.filter(n=>n.carried).length} of ${VN.length}\t`);
  L.push(`${today}\tcarry\tarrows\t${E.filter(e=>e.carried).length} of ${E.length}\t`);
  if(dropN.length){
    L.push(`# constructs dropped (${dropN.length}) — recorded by construct id, which survives a refold`);
    for(const n of dropN)
      L.push(`${today}\tdrop\t${n.label}\t${n.mem.map(m=>m.i).join(";")}\t` +
             `${n.papers.length} papers, ${n.nc} relationships`);
  }
  if(dropE.length){
    L.push(`# relations dropped (${dropE.length}) — recorded by claim id`);
    for(const e of dropE)
      L.push(`${today}\tdrop\t${lbl(e.source)} -> ${lbl(e.target)}\t` +
             `${e.claims.map(c=>c.id).filter(Boolean).join(";")}\t${e.claims.length} relationships`);
  }
  const over = E.filter(e => e.carried && !e.pass);
  if(over.length){
    L.push(`# carried although no relationship clears the bars (${over.length}) — judgement over the filter`);
    for(const e of over)
      L.push(`${today}\tcarry\t${lbl(e.source)} -> ${lbl(e.target)}\t` +
             `${e.claims.map(c=>c.id).filter(Boolean).join(";")}\tfails the bars set on step 1.3`);
  }
  L.push(``);

  /* The domains declared on step 3.1. Not proposals about the corpus -- the
     corpus records what a paper said and these record what a modeller declared
     on top of it -- so they are their own action, and the member count is
     carried because it is what the declaration buys. */
  const stmts = statementsInPlay(false);
  const dom = stmts.filter(({e}) => specSet(spec.get(e.id)));
  L.push(`# -- relations declared (${dom.length} of ${stmts.length} carried relations) ----`);
  if(!dom.length) L.push(`# none — every carried relation admits all ${MEMBERS_ALL} members`);
  for(const {e, rows} of dom){
    const v = spec.get(e.id);
    L.push(`${today}\tdeclare\t${lbl(e.source)} -> ${lbl(e.target)}\t` +
      [v.rel ? `relationship=${v.rel}` : "relationship=undeclared",
       v.props.length ? `form=${v.props.join("+")}` : "form=any",
       `range=${(+v.lo).toFixed(2)}-${(+v.hi).toFixed(2)}`,
       (v.elo != null || v.ehi != null)
         ? `estimate=${v.elo == null ? "" : v.elo}-${v.ehi == null ? "" : v.ehi}` : "",
       `members=${memberCount(v.props)}/${MEMBERS_ALL}`].filter(Boolean).join(";") +
      `\t${rows.length} relationship(s) from ${support(rows).length} paper(s): ` +
      `${rows.map(r => r.c.id).join(";")}` +
      (v.note ? ` — ${v.note}` : " — declared on the bench, no reason given"));
  }
  /* A composed relation is the strongest thing on this page that no paper
     says, so the record carries the chain, the bar every link had to clear and
     the weakest link in it. A reader of the pass can refuse the inference
     without re-deriving it. */
  const comp = composedPaths().filter(f => state.comp.has(f.id));
  L.push(``);
  L.push(`# -- relations composed, not asserted (${comp.length}) ----------------`);
  L.push(`# chains of up to ${state.hops} link(s), every link ${
    (SOLID.find(q => q.k === state.solid) || {}).n}`);
  if(!comp.length) L.push(`# none`);
  for(const f of comp){
    const chain = [f.from].concat(f.path.map(e =>
      (e.target && e.target.id !== undefined ? e.target.id : e.target)));
    L.push(`${today}\tcompose\t${lbl(f.from)} -> ${lbl(f.to)}\t` +
      `${chain.map(x => lbl(x)).join(" -> ")}\t` +
      `${f.sign ? "composes " + f.sign : "sign does not compose"}; ` +
      `weakest link ${lbl(f.weak.source)} -> ${lbl(f.weak.target)} (${
        [...f.weak.stat].join("/")}, ${f.weak.papers.size} paper(s)); ` +
      `NO PAPER ASSERTS THIS RELATION`);
  }
  L.push(``);

  if(state.matter)
    L.push(`${today}\tdomain\tminimum_effect\t${state.matter.toFixed(1)}% of value\t` +
      `smallest difference the theory is taken to be about`);
  L.push(``);

  const prop = [...groups.values()];
  L.push(`# -- merges proposed by hand (${prop.length}) ------------------------`);
  if(!prop.length) L.push(`# none`);
  for(const g of prop){
    const lv = [...new Set(g.members.map(m => N.get(m)?.l).filter(Boolean))];
    L.push(`${today}\tmerge\t${g.name}\t${g.members.join(";")}\t` +
      `proposed on the bench${lv.length>1?` — MIXED LEVEL ${lv.join("+")}, flagged`:""}`);
  }
  L.push(``);

  /* What a setting did on the curator's behalf. These were questions in the
     worklist until it became clear they were a second decision about work
     already done: merging is the decision, and whether the merge crosses a
     level, a stock and a flow, or a bearer is a fact about it. A fact belongs
     in the record beside the merge, not in a queue. Computed over every
     multi-member notion, so a merge the slider proposed is reported too. */
  const sigOf = (mem, k) => [...new Set(mem.map(m => m[k]).filter(Boolean))];
  const crossing = VN.filter(n => n.mem.length > 1).map(n => {
    const f = [];
    const lv = sigOf(n.mem, "l"), sf = sigOf(n.mem, "f"), br = sigOf(n.mem, "b");
    if(lv.length > 1) f.push("LEVEL " + lv.join("+"));
    if(sf.length > 1) f.push("STOCK WITH FLOW");
    if(br.length > 1) f.push("BEARER " + br.join("+"));
    return f.length ? {n, f} : null;
  }).filter(Boolean);
  L.push(`# -- merges that cross a signature (${crossing.length}) ------------------`);
  if(!crossing.length) L.push(`# none at this tightness`);
  for(const x of crossing)
    L.push(`${today}\tflag\t${x.n.label}\t${x.n.mem.map(m=>m.i).join(";")}\t${x.f.join(", ")}`);
  L.push(``);

  const partial = [];
  for(const e of E) for(const c of e.claims) if(c.po) partial.push({e, c});
  L.push(`# -- arrows asserting more than their relationship did (${partial.length}) -------`);
  if(!partial.length) L.push(`# none at this occurrence threshold`);
  for(const x of partial)
    L.push(`${today}\tflag\t${lbl(x.e.source)} -> ${lbl(x.e.target)}\t${x.c.id || ""}\t` +
           `conjunctive relationship, ${x.c.po} conjunct${x.c.po>1?"s":""} below the threshold`);
  L.push(``);

  const ans = [...decided.values()];
  L.push(`# -- adjudications (${ans.length}) ----------------------------------`);
  if(!ans.length) L.push(`# none — the worklist above is unanswered`);
  for(const d of ans){
    const mem = (d.members && d.members.length) ? d.members.join(";")
              : (d.claims && d.claims.length) ? d.claims.join(";") : "";
    const c = d.ctx || {};
    const under = c.tight !== undefined
      ? ` [under tightness=${c.tight};min_papers=${c.minp};approach=${c.ap}` +
        (c.bar ? `;comm>=${c.bar.Comm};spec>=${c.bar.Spec};evidence>=${c.bar.Evid}]` : `]`)
      : "";
    const who = (d.papers && d.papers.length)
      ? ` {papers: ${d.papers.join(";")}}` : "";
    L.push(`${d.at}\t${d.verb}\t${d.target}\t${mem}\t${d.reason || d.kind}${under}${who}`);
  }
  L.push(``);
  const open = worklist(lastView).filter(x => !x.answered).length;
  L.push(`# ${open} decision${open===1?"":"s"} still open at these settings`);
  L.push(`# ${RECORDED.length} decisions already in index/passes.tsv were checked against`);
  return L.join("\n");
}

/* Export. The viewer may grant a download, may refuse it, or may not offer one
   at all, and the page has to work in all three cases -- so the text stays on
   screen and selectable whatever happens here. */
let dlCap, dlAsked = false;
async function saveText(text, name, type, btn){
  const say = m => { if(btn){ const was = btn.innerHTML; btn.textContent = m;
    setTimeout(() => { btn.innerHTML = was; }, 2200); } };
  if(!dlAsked){
    dlAsked = true;
    try{ dlCap = await (window.claude && window.claude.use
      ? window.claude.use("downloads") : null); }catch(e){ dlCap = null; }
  }
  if(dlCap){
    /* expected: a viewer may decline the save, and a decline is not a
       failure of the page. Either way the anchor below still offers the file. */
    try{ await dlCap.save({filename:name, data:text}); say("saved"); return; }
    catch(e){ /* declined, or failed: fall through to the anchor */ }
  }
  try{
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([text], {type}));
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("saved");
  }catch(e){
    say("select and copy it");
  }
}
const stamp = () => new Date().toISOString().slice(0, 10);
async function exportPass(btn){
  return saveText(passText(), `passes-${stamp()}.tsv`, "text/tab-separated-values", btn);
}
/* The skeleton. A .py file and not a payload: what step 3.1 declares is a
   model's declarations, and the thing that reads them is the kernel, not another
   copy of this page. */
async function exportModel(btn){
  return saveText(modelPy(), `curated_model-${stamp()}.py`, "text/x-python", btn);
}
/* The other three were written inline at their one call site each, which was
   fine until step 4.2 needed to offer the same files as parts of the action
   model. Named here with the two that already were, so there is one of each. */
async function exportResults(btn){
  const r = await saveText(resultsFile(), `results-${stamp()}.json`, "application/json", btn);
  xlog("export", "Exported the findings as results",
    statedLines().length + " stated — what somebody decided to stand behind, not the " +
    "working surface the derivation is");
  return r;
}
async function exportDerived(btn){
  const r = await saveText(derivedClaims(), `derived-claims-${stamp()}.tsv`,
    "text/tab-separated-values", btn);
  xlog("export", "Exported the findings as claim records",
    statedLines().length + " stated, status derived, ready to re-enter a curation");
  return r;
}
async function exportScen(btn){
  const nm = ((typeof scenCur === "function" ? scenCur() : null) || {}).name || "project";
  const r = await saveText(scenFile(), nm.replace(/[^\w.-]+/g, "-").toLowerCase() + ".amg.json",
    "application/json", btn);
  xlog("scen", "Exported the project as a file",
    PROV.length + " accepted answer" + (PROV.length === 1 ? "" : "s") + " travel with it");
  return r;
}

export { apart, asave, bootApart, dlAsked, dlCap, exportDerived, exportModel, exportPass, exportResults, exportScen, pairsOf, passText, pinApart, renderPass, renderWorklist, saveText, stamp, unpinApart, wlFilter };

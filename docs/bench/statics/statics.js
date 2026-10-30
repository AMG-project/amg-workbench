
/* THE MODEL IS NOT IN THIS FILE.
   ==========================================================================

   It used to be. This page carried its own three families, its own three
   stakeholders and its own three comparative statics, written out in
   JavaScript beside the charts -- a second account of the model the bench was
   built to declare, which nothing held to the first. Two accounts of one model
   is how a figure and the thing it figures come to disagree.

   What it does now: read the scenario you are in, compile its lines with
   core/kernel.js -- the same function the workbench's own step 3.2 compiles
   with -- and draw what comes out. The parameters, the outcomes, the declared
   shape classes and the prose beside each panel are all read off the model.
   Open a different model and this page is about that one.

   Where the model comes from, in order: the scenario open in this browser, if
   anything has been declared in it; otherwise the finished example the bench
   ships. Both are the product of the eight steps, which is the only kind of
   model this page knows how to draw. */

import * as K from "../core/kernel.js";
import { VOCAB } from "../core/vocab.js";
import { fsMark, fsToggle } from "../fullscreen.js";

const SHIPPED = new URL("../demo/purpose-two-channel.amg.json", import.meta.url).href;
const STORE = "purposeScenarios";
const NS = 161;                      /* samples along the bottom */
const COLS = ["--chan-b", "--chan-a", "--pos", "--muted"];
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hesc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = v => !isFinite(v) ? "—" : Math.abs(v) < 5e-4 ? "0.000" : (v > 0 ? "+" : "") + v.toFixed(3);
const famOf = n => VOCAB.families.find(f => f.name === n);
/* A declared name, as a reader should meet it. The t_ prefix marks a
   mechanism term in the grammar and means nothing to anybody reading a form
   menu; left on, and uppercased by the stylesheet, it printed every mechanism
   as "T PURPOSE CLARITY FACTOR TO FIRM ACCOUNTING PERFORMANCE". */
const pretty = n => String(n).replace(/^t_/, "").replace(/_/g, " ");

/* CUT AT A SPACE, AND KEEP THE WHOLE OF IT WITHIN REACH. Two notes were cut
   with a bare slice and stopped mid-word with nothing to say they had been
   cut: "A thre", "show d", "meaningf". This page is loaded on its own from
   statics/index.html as well as mounted on step 4.1, so it cannot import the
   bench's own trim; this is that function, written again here. */
const snip = (t, n) => { t = String(t || "");
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "\u2026" : t; };
const titled = (t, n) => { t = String(t || "");
  return t.length > n ? ' title="' + hesc(t) + '"' : ""; };

/* ---- the scenario ------------------------------------------------------ */

function fromStore(){
  try{
    const raw = localStorage.getItem(STORE);
    if(!raw) return null;
    const s = JSON.parse(raw) || {};
    const cur = (s.list || []).find(x => x.id === s.active);
    const snap = cur && cur.snap;
    if(!snap || !snap.arith || !((snap.arith.lines || []).length)) return null;
    return {snap, name:cur.name || "your project", where:"open in this browser",
            at:cur.at || ""};
  }catch(e){ return null; }
}

async function load(given){
  if(given && given.arith && (given.arith.lines || []).length)
    return {snap:given, name:"the model you are building", where:"this project, as it stands"};
  const mine = fromStore();
  if(mine) return mine;
  const r = await fetch(SHIPPED, {cache:"no-store"});
  if(!r.ok) throw new Error("the example project did not load (" + r.status + ")");
  const o = await r.json();
  return {snap:o.snap, name:o.name || "the example", where:"the example this bench ships",
          at:o.at || "", corpus:o.corpus || null};
}

/* ---- the declared classes ---------------------------------------------- */

/* A class line is one member of a family written over one argument. Putting a
   different member in its place means getting the argument back out, so the
   declared member becomes a pattern and the line is matched against it. Every
   X in a member stands for the same argument, which is what the equality test
   at the end checks. */
function argOf(py, expr){
  const parts = String(expr).split("X");
  if(parts.length < 2) return null;
  const m = new RegExp("^" + parts.map(esc).join("(.+?)") + "$").exec(String(py).trim());
  if(!m) return null;
  const got = m.slice(1);
  return got.every(x => x === got[0]) ? got[0] : null;
}

function slotsOf(snap){
  const out = [];
  for(const ln of (snap.arith.lines || [])){
    if(!ln.family || !ln.member) continue;
    const f = famOf(ln.family);
    const mem = f && f.members.find(m => m[0] === ln.member);
    if(!mem) continue;
    out.push({lhs:ln.lhs, family:f, member:ln.member, why:ln.why || "",
              arg:argOf(ln.py, mem[1])});
  }
  return out;
}

function linesFor(snap, slots, pick){
  return (snap.arith.lines || []).map(ln => {
    const s = slots.find(x => x.lhs === ln.lhs && x.arg != null);
    if(!s) return ln;
    const want = s.family.members.find(m => m[0] === pick[s.lhs]);
    if(!want || want[0] === s.member) return ln;
    return Object.assign({}, ln, {py:want[1].replace(/X/g, s.arg)});
  });
}

const compile = (snap, slots, pick) =>
  K.buildLines({lines:linesFor(snap, slots, pick), constants:snap.arith.consts || []});

/* ---- what the model is made of ----------------------------------------- */

/* A parameter's declared range, as step 3.1 recorded it. A name with no
   declaration gets 0 to 1 and says so, because inventing a bound is the one
   thing this bench refuses everywhere else. */
function boxesOf(snap, params){
  const by = new Map((snap.vtype || []).map(v => [v.name || v.id, v]));
  return params.map(p => {
    const v = by.get(p) || {};
    let lo = isFinite(+v.lo) ? +v.lo : 0;
    let hi = isFinite(+v.hi) ? +v.hi : 1;
    if(!(hi > lo)){ lo = 0; hi = 1; }
    return {name:p, lo, hi, declared:!!v.bset && +v.hi > +v.lo};
  });
}

/* Which parameters each line depends on, through the locals between them. The
   prose beside a panel is the mechanisms that reach the parameter being moved,
   and `uses` only names what a line reads directly. */
function reachOf(model){
  const dep = new Map();
  const par = new Set(model.params);
  for(const s of model.steps){
    const got = new Set();
    for(const u of (s.uses || [])){
      if(par.has(u)) got.add(u);
      else for(const x of (dep.get(u) || [])) got.add(x);
    }
    dep.set(s.lhs, got);
  }
  return dep;
}

/* residual_employees and control_employees are two sides of one stakeholder.
   Read off the names rather than declared, because a model that does not split
   that way simply has no table. */
function stakeholdersOf(model){
  const names = new Set(model.steps.map(s => s.lhs));
  const out = [];
  for(const s of names){
    const m = /^residual_(.+)$/.exec(s);
    if(m && names.has("control_" + m[1])) out.push(m[1]);
  }
  return out.sort();
}

/* ---- the chart --------------------------------------------------------- */

const W = 340, H = 236, M = {t:14, r:12, b:30, l:42};
const PW = W - M.l - M.r, PH = H - M.t - M.b;

function chart(xs, series, at, ylab){
  let lo = Infinity, hi = -Infinity;
  for(const s of series) for(const arr of [s.base, s.shock]) for(const v of arr){
    if(!isFinite(v)) continue;
    if(v < lo) lo = v;
    if(v > hi) hi = v;
  }
  if(!isFinite(lo)){ lo = 0; hi = 1; }
  if(hi - lo < 1e-9){ hi = lo + 1; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const sx = v => M.l + (x1 === x0 ? 0 : (v - x0) / (x1 - x0)) * PW;
  const sy = v => M.t + PH - (v - lo) / (hi - lo) * PH;
  const path = ys => ys.map((v, i) => (i ? "L" : "M") + sx(xs[i]).toFixed(1) + " " +
    (isFinite(v) ? sy(v) : sy(lo)).toFixed(1)).join("");
  let g = "";
  for(let i = 0; i <= 4; i++){
    const v = lo + (hi - lo) * i / 4, y = sy(v).toFixed(1);
    g += `<line x1="${M.l}" y1="${y}" x2="${M.l + PW}" y2="${y}" stroke="var(--rule-soft)"/>` +
      `<text x="${M.l - 6}" y="${+y + 3.5}" text-anchor="end" font-size="8.5"
        fill="var(--faint)" font-family="IBM Plex Mono, monospace">${v.toFixed(2)}</text>`;
  }
  for(let i = 0; i <= 4; i++){
    const v = x0 + (x1 - x0) * i / 4, x = sx(v).toFixed(1);
    g += `<text x="${x}" y="${H - 14}" text-anchor="middle" font-size="8.5"
      fill="var(--faint)" font-family="IBM Plex Mono, monospace">${v.toFixed(2)}</text>`;
  }
  const ax = sx(at).toFixed(1);
  g += `<line x1="${ax}" y1="${M.t}" x2="${ax}" y2="${M.t + PH}" stroke="var(--faint)"
    stroke-dasharray="2 3"/>`;
  for(const s of series){
    g += `<path d="${path(s.shock)}" fill="none" stroke="var(${s.col})" stroke-width="1.1"
      stroke-dasharray="3 3" opacity=".75"/>`;
    g += `<path d="${path(s.base)}" fill="none" stroke="var(${s.col})" stroke-width="1.7"/>`;
  }
  g += `<text x="${M.l}" y="${H - 2}" font-size="8.5" fill="var(--faint)"
    font-family="IBM Plex Mono, monospace">${hesc(ylab)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${hesc(ylab)}">${g}</svg>`;
}

/* ---- the markup, and the sheet that dresses it ------------------------- */

const SHEET = new URL("./statics.css", import.meta.url).href;
let sheeted = false;
function sheet(){
  if(sheeted || document.querySelector(`link[href="${SHEET}"]`)) return;
  sheeted = true;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = SHEET;
  document.head.appendChild(l);
}

const HEADER = `<header>
  <div class="top">
    <div>
      <p class="eyebrow">comparative statics · step 4</p>
      <h1 data-s="h1">Reading the model</h1>
      <p class="standfirst" data-s="stand">Every curve here is computed from the arithmetic the chain closed, by the kernel the workbench proves with. Nothing on this page is drawn by hand.</p>
    </div>
    <a class="backlink" href="../bench.html">&larr; the workbench</a>
  </div>
</header>`;
const SHELL = chrome => `${chrome}
<p class="src" data-s="src"></p>
<div data-s="warn"></div>

<div class="bar">
  <div class="row">
    <div>
      <span class="ctl-label" data-s="lbl-out">What to draw</span>
      <div class="chips" role="group" aria-label="What to draw" data-s="chips"></div>
    </div>
    <div class="slider-group">
      <span class="ctl-label" data-s="lbl-x">Along the bottom</span>
      <select data-s="xsel" aria-label="Along the bottom"></select>
      <p class="hint" data-s="xhint"></p>
    </div>
    <div class="slider-group">
      <div class="slider-head"><span class="ctl-label">Read at</span><span class="slider-val" data-s="atVal">—</span></div>
      <input type="range" data-s="at" min="0" max="1" step="0.005" value="0.5" aria-label="Where the numbers below are read">
      <p class="hint">The vertical line on each chart.</p>
    </div>
    <div class="slider-group">
      <div class="slider-head"><span class="ctl-label">Size of the change</span><span class="slider-val" data-s="tVal">0.60</span></div>
      <input type="range" data-s="t" min="0" max="1" step="0.01" value="0.60" aria-label="Size of the change">
      <p class="hint">Each parameter is pushed this far toward the top of its declared range. Dashed is before.</p>
    </div>
  </div>
</div>

<div class="bar" data-s="holdbar">
  <span class="ctl-label">Everything else held at</span>
  <div class="holds" data-s="holds"></div>
</div>

<div class="bar" data-s="formbar">
  <div class="forms" data-s="forms"></div>
</div>

<div class="panels" data-s="panels"></div>

<section class="robust">
  <h3 id="stxSurvive">Does the sign survive the class?</h3>
  <p class="sub" data-s="rsub"></p>
  <div class="rgrid" data-s="rgrid"></div>
</section>

<div class="tablewrap" data-s="tablewrap" hidden>
  <table>
    <caption>Where each stakeholder's value sits
      <span>At the point read above, under the forms chosen, before any change. The last column is where nothing is left on the discretionary side.</span>
    </caption>
    <thead><tr><th>Stakeholder</th><th>Discretionary</th><th>Pinned down</th><th>Total</th><th>Share pinned</th><th>All pinned at</th></tr></thead>
    <tbody data-s="tbody"></tbody>
  </table>
</div>`;

/* ---- mounting ---------------------------------------------------------- */

/* `host` is any element. `opts.snap` is a scenario snapshot to draw instead of
   whatever the browser's store holds, which is what the workbench passes so
   that the copy on step 7 shows the model you are working on rather than the
   last one written to the store. `opts.chrome` false drops the title and the
   link back, because inside a step both are already there. */
export async function mount(host, opts){
  opts = opts || {};
  sheet();
  host.classList.add("stx");
  host.innerHTML = SHELL(opts.chrome === false ? "" : HEADER);
  const $ = k => host.querySelector(`[data-s="${k}"]`);
  let SNAP, SLOTS, PICK, MODEL, BOXES, XNAME, HOLD, DRAW, SHOCKS, REACH, STAKE, SRC, OUTS = [];
  const CACHE = new Map();

  function modelFor(pick){
    const key = SLOTS.map(s => s.lhs + ":" + pick[s.lhs]).join("|");
    if(!CACHE.has(key)) CACHE.set(key, compile(SNAP, SLOTS, pick));
    return CACHE.get(key);
  }
  
  const point = (over, at) => {
    const p = Object.create(null);
    for(const b of BOXES) p[b.name] = HOLD[b.name];
    p[XNAME] = at;
    if(over) for(const k in over) p[k] = over[k];
    return p;
  };
  
  function curve(model, shock){
    const b = BOXES.find(x => x.name === XNAME);
    const xs = [], vals = {};
    for(const d of DRAW) vals[d] = [];
    for(let i = 0; i < NS; i++){
      const x = b.lo + (b.hi - b.lo) * i / (NS - 1);
      xs.push(x);
      const V = K.runModel(model, point(shock, x));
      for(const d of DRAW) vals[d].push(V[d]);
    }
    return {xs, vals};
  }
  
  const shockPoint = (name, t) => {
    const b = BOXES.find(x => x.name === name);
    return {[name]: HOLD[name] + t * (b.hi - HOLD[name])};
  };
  
  function render(){
    const at = +$("at").value, t = +$("t").value;
    $("atVal").textContent = pretty(XNAME) + " = " + at.toFixed(2);
    $("tVal").textContent = t.toFixed(2);
  
    const model = modelFor(PICK);
    const base = curve(model, null);
    const V0 = K.runModel(model, point(null, at));
  
    $("panels").innerHTML = SHOCKS.map((p, i) => {
      const sh = curve(model, shockPoint(p, t));
      const V1 = K.runModel(model, Object.assign(point(null, at), shockPoint(p, t)));
      const series = DRAW.map((d, j) => ({name:d, col:COLS[j % COLS.length],
        base:base.vals[d], shock:sh.vals[d]}));
      const says = MODEL.steps.filter(s => s.kind === "term" && (REACH.get(s.lhs) || new Set()).has(p));
      return `<section class="panel">
        <button type="button" class="fsbtn" data-fspanel="${i}"
          aria-pressed="false">Full screen</button>
        <span class="panel-num">${String(i + 1).padStart(2, "0")} · one parameter</span>
        <h2>${hesc(pretty(p))} rises</h2>
        <p class="what">Pushed ${(t * 100).toFixed(0)}% of the way from ${HOLD[p].toFixed(2)} to the top of its declared range, with everything else held.</p>
        ${says.length ? `<ul class="mechs">${says.slice(0, 3).map(s =>
          `<li${titled(s.why || "no statement recorded", 150)}><code>${
            hesc(s.lhs.replace(/^t_/, ""))}</code> — ${
            hesc(snip(s.why || "no statement recorded", 150))}</li>`).join("")}</ul>` : ""}
        <div class="pbot">
        ${chart(base.xs, series, at, pretty(XNAME) + " →")}
        <div class="readout">${DRAW.slice(0, COLS.length).map(d => {
          const dv = V1[d] - V0[d];
          const cl = Math.abs(dv) < 5e-4 ? "flat" : (dv > 0 ? "up" : "down");
          return `<div><span class="rk">Δ ${hesc(pretty(d))}</span>
            <span class="rv ${cl}">${fmt(dv)}</span></div>`;
        }).join("")}</div>
        <p class="legend">${DRAW.map((d, j) =>
          `<span><i style="border-color:var(${COLS[j % COLS.length]})"></i>${hesc(pretty(d))}</span>`).join("")}</p>
        </div>
      </section>`;
    }).join("");
  
    grid(at, t, V0);
    table(model, at);
  }
  
  /* Every combination of the declared classes, and the share of them that keeps
     the sign the chosen forms give. A sign that holds everywhere is about the
     model's structure; one that holds sometimes is about the shapes chosen.

     THE CAP IS DECLARED AND NOT A BREAK. This enumerated the product and broke
     out of the loop once it passed 400, which left every slot after the break
     pinned to one member and then reported the truncated count as though it
     were the class -- so a model with 3,125 combinations was described as
     having 625, and the two slots nobody reached were silently held constant.
     The grid redraws on every tick of every slider, so the cap has to stay
     small; what it must not do is lie about what it covered. */
  const CAP = 400;
  const classSize = () => SLOTS.reduce((t, s) => t * s.family.members.length, 1);
  function combos(){
    const n = classSize();
    /* The i-th combination, by mixed radix over the slots. Indexing rather
       than building the product is what lets a sample reach every slot. */
    const at = i => {
      const pick = {};
      let k = i;
      for(const s of SLOTS){
        const ms = s.family.members;
        pick[s.lhs] = ms[k % ms.length][0];
        k = Math.floor(k / ms.length);
      }
      return pick;
    };
    if(n <= CAP) return {all:true, n, rows:Array.from({length:n}, (_, i) => at(i))};
    const step = Math.max(1, Math.floor(n / CAP));
    const rows = [];
    for(let i = 0; i < n && rows.length < CAP; i += step) rows.push(at(i));
    return {all:false, n, rows};
  }
  
  function grid(at, t, V0){
    const C = combos(), all = C.rows;
    $("rsub").innerHTML = C.all
      ? `Every combination of the ${SLOTS.length} declared class${
          SLOTS.length === 1 ? "" : "es"} — <b>${C.n}</b> in all — run at this point, this ` +
        `size of change and these outcomes. Each cell is the share of them that moves the ` +
        `same way the chosen forms do.`
      : `The ${SLOTS.length} declared classes make <b>${C.n.toLocaleString("en")}</b> ` +
        `combinations, which is more than this picture redraws on every slider tick, so ` +
        `it runs an evenly spaced <b>${all.length}</b> of them — a sample, and the cells ` +
        `below are shares of that sample rather than of the class. The workbench's own ` +
        `<b>run the set</b> on step 4.1 runs the whole class and signs each proposition ` +
        `over it.`;
    $("rgrid").innerHTML = SHOCKS.map(p => {
      const V1 = K.runModel(modelFor(PICK), Object.assign(point(null, at), shockPoint(p, t)));
      const want = {};
      for(const d of DRAW) want[d] = Math.sign(Math.abs(V1[d] - V0[d]) < 5e-4 ? 0 : V1[d] - V0[d]);
      let n = 0;
      for(const c of all){
        const m = modelFor(c);
        const a = K.runModel(m, point(null, at));
        const b = K.runModel(m, Object.assign(point(null, at), shockPoint(p, t)));
        if(DRAW.every(d => {
          const dv = b[d] - a[d];
          return Math.sign(Math.abs(dv) < 5e-4 ? 0 : dv) === want[d];
        })) n++;
      }
      const cl = n === all.length ? "all" : n === 0 ? "none" : "some";
      const tag = n === all.length ? (C.all ? "holds throughout" : "holds across the sample")
        : n === 0 ? "the forms decide it" : "form-dependent";
      return `<div class="rcell"><span class="lab">${hesc(pretty(p))} rises, and
        ${DRAW.map(pretty).map(hesc).join(" and ")} move the same way</span>
        <span class="score ${cl}">${n}<small>/${all.length}</small></span>
        <span class="tag">${tag}</span></div>`;
    }).join("");
  }
  
  function table(model, at){
    if(!STAKE.length){ $("tablewrap").hidden = true; return; }
    $("tablewrap").hidden = false;
    const b = BOXES.find(x => x.name === XNAME);
    const V = K.runModel(model, point(null, at));
    $("tbody").innerHTML = STAKE.map((s, i) => {
      const a = V["residual_" + s], c = V["control_" + s], tot = a + c;
      /* Where the discretionary side runs out, if it does inside the range. */
      let full = NaN, started = false;
      for(let k = 0; k < NS; k++){
        const x = b.lo + (b.hi - b.lo) * k / (NS - 1);
        const r = K.runModel(model, point(null, x))["residual_" + s];
        if(r > 1e-6){ started = true; continue; }
        if(started){ full = x; break; }
      }
      return `<tr><td><span class="swatch" style="background:var(${COLS[i % COLS.length]})"></span>${hesc(pretty(s))}</td>
        <td>${a.toFixed(3)}</td><td>${c.toFixed(3)}</td><td>${tot.toFixed(3)}</td>
        <td>${tot > 0 ? (c / tot * 100).toFixed(0) + "%" : "—"}</td>
        <td class="${isFinite(full) && at > full ? "past" : ""}">${isFinite(full) ? full.toFixed(2) : "never"}</td></tr>`;
    }).join("");
  }
  
  /* ---- wiring ------------------------------------------------------------ */
  
  function controls(){
    $("chips").innerHTML = OUTS.map((d, j) =>
      `<button class="chip" type="button" data-chip="${hesc(d)}" aria-pressed="${DRAW.includes(d)}">
        <span class="dot" style="background:var(${COLS[j % COLS.length]})"></span>${hesc(pretty(d))}</button>`).join("");
    $("chips").addEventListener("click", e => {
      const b = e.target.closest(".chip");
      if(!b) return;
      /* `data-chip`, not `data-id`. The attribute was `data-s` until the module
         was embedded in a step, where `data-s` is how `$()` finds the shell's
         own slots -- so prefixing it made the chips `data-data-s` while this
         line went on reading `dataset.id`, which is undefined. Every chip
         rendered, every click did nothing, and no check could see it because
         pressing a chip that does nothing throws nothing. */
      const id = b.dataset.chip;
      if(DRAW.includes(id)){ if(DRAW.length === 1) return; DRAW = DRAW.filter(x => x !== id); }
      else DRAW = OUTS.filter(x => DRAW.includes(x) || x === id);
      b.setAttribute("aria-pressed", DRAW.includes(id));
      render();
    });
  
    $("xsel").innerHTML = BOXES.map(b =>
      `<option value="${hesc(b.name)}"${b.name === XNAME ? " selected" : ""}>${hesc(pretty(b.name))}</option>`).join("");
    $("xsel").addEventListener("change", e => {
      XNAME = e.target.value;
      SHOCKS = BOXES.filter(b => b.name !== XNAME).map(b => b.name);
      holds(); xhint(); render();
    });
  
    $("at").addEventListener("input", render);
    $("t").addEventListener("input", render);

    /* FULL SCREEN, PER PANEL. Delegated, because `render` rewrites every panel
       on every tick of every slider and a listener bound to a button would go
       with it. The whole section goes full screen rather than the chart alone,
       so the mechanism statements and the readout stay beside the picture they
       are about. */
    $("panels").addEventListener("click", e => {
      const b = e.target.closest("[data-fspanel]");
      if(!b) return;
      const sec = b.closest("section.panel");
      if(!sec) return;
      sec.classList.add("fschart");
      fsToggle(sec, {onEnter:() => fsMark(b, sec),
                     onExit:() => { fsMark(b, sec); sec.classList.remove("fschart"); }});
    });
  
    $("forms").innerHTML = SLOTS.map(s => {
      const dead = s.arg == null;
      return `<div><span class="ctl-label">${hesc(pretty(s.lhs))} · ${hesc(s.family.name)}</span>
        <select data-s="sel-${hesc(s.lhs)}" aria-label="${hesc(s.lhs)}"${dead ? " disabled" : ""}>${
          s.family.members.map(m => `<option value="${hesc(m[0])}"${m[0] === PICK[s.lhs] ? " selected" : ""}>${hesc(m[0])}</option>`).join("")}</select>
        <p class="form-desc"${dead ? "" : titled(s.why, 170)}>${dead
          ? "This line does not match the member it names, so the class cannot be swapped here."
          : hesc(snip(s.why, 170)) + ` <b>${hesc(s.family.properties.join(" · "))}</b>`}</p></div>`;
    }).join("");
    for(const s of SLOTS){
      const el = $("sel-" + s.lhs);
      if(el) el.addEventListener("change", e => { PICK[s.lhs] = e.target.value; render(); });
    }
  }
  
  function holds(){
    $("holds").innerHTML = BOXES.filter(b => b.name !== XNAME).map(b =>
      `<div class="hold">
        <div class="slider-head"><span class="ctl-label">${hesc(pretty(b.name))}</span>
          <span class="slider-val" data-s="hv-${hesc(b.name)}">${HOLD[b.name].toFixed(2)}</span></div>
        <input type="range" data-s="h-${hesc(b.name)}" min="${b.lo}" max="${b.hi}" step="0.01"
          value="${HOLD[b.name]}" aria-label="${hesc(b.name)}">
      </div>`).join("");
    for(const b of BOXES){
      const el = $("h-" + b.name);
      if(!el) continue;
      el.addEventListener("input", e => {
        HOLD[b.name] = +e.target.value;
        $("hv-" + b.name).textContent = HOLD[b.name].toFixed(2);
        render();
      });
    }
  }
  
  function xhint(){
    const b = BOXES.find(x => x.name === XNAME);
    $("xhint").textContent = b.declared
      ? `declared ${b.lo} to ${b.hi} on step 3.1`
      : `no range was declared for this one; 0 to 1 is the page's default, not a declaration`;
    $("at").min = b.lo; $("at").max = b.hi;
    $("at").value = Math.min(b.hi, Math.max(b.lo, +$("at").value));
  }
  
  
  
    try{
      SRC = await load(opts.snap);
    }catch(e){
      $("warn").innerHTML = `<div class="note"><b>No model to draw.</b> ${hesc(e.message)}</div>`;
      return;
    }
    SNAP = SRC.snap;
    SLOTS = slotsOf(SNAP);
    PICK = Object.fromEntries(SLOTS.map(s => [s.lhs, s.member]));
    MODEL = compile(SNAP, SLOTS, PICK);
    CACHE.set(SLOTS.map(s => s.lhs + ":" + PICK[s.lhs]).join("|"), MODEL);
  
    OUTS = MODEL.steps.filter(s => s.kind === "out").map(s => s.lhs);
    if(!OUTS.length) OUTS = MODEL.steps.slice(-3).map(s => s.lhs);
    /* EVERY OUTCOME, UP TO THE COLOURS THERE ARE. Two was the old default,
       and on a model whose outcomes fall into two groups it drew one group:
       the purpose pair moved and the two rights channels, which is where
       half the parameters act, were not on the chart at all. Four of the
       five cards then reported a delta of 0.000 and a flat line -- true of
       what was drawn, and nothing to do with what the shock did. A reader
       cannot press a chip for a series they have no reason to think exists,
       so the default has to show what moves. */
    DRAW = OUTS.slice(0, COLS.length);
    BOXES = boxesOf(SNAP, MODEL.params);
    REACH = reachOf(MODEL);
    STAKE = stakeholdersOf(MODEL);
  
    if(!BOXES.length){
      $("warn").innerHTML = `<div class="note"><b>This model has no free parameters.</b>
        Every name in it is written by a line or fixed as a constant, so there is nothing to
        move and no comparative static to take.</div>`;
      return;
    }
    /* THE AXIS EVERY CARD IS DRAWN AGAINST, and the one the comparative
       statics are actually about. The fallback was BOXES[0], which is
       whichever parameter sorts first -- externality vulnerability here, a
       quantity two of the four outcomes do not read at all. Purpose
       integration is what this model turns on, and it is where the interior
       optimum shows. */
    const XPREF = ["pi", "purpose_integration", "purpose_clarity_factor"];
    XNAME = (XPREF.find(n => BOXES.some(b => b.name === n))) || BOXES[0].name;
    SHOCKS = BOXES.filter(b => b.name !== XNAME).map(b => b.name);
    HOLD = Object.fromEntries(BOXES.map(b => [b.name, +((b.lo + b.hi) / 2).toFixed(2)]));
  
    if(opts.chrome !== false) document.title = SRC.name + " · comparative statics";
    if($("h1")) $("h1").textContent = SRC.name;
    $("src").innerHTML = [
      `<span><b>${MODEL.steps.length}</b> lines, <b>${MODEL.consts.length}</b> constants, ` +
        `<b>${BOXES.length}</b> free parameters, <b>${OUTS.length}</b> outcomes</span>`,
      `<span>read from ${hesc(SRC.where)}</span>`,
      SRC.at ? `<span>${hesc(SRC.at)}</span>` : "",
      MODEL.bad.length ? `<span style="color:var(--neg)">${MODEL.bad.length} line(s) refused</span>` : "",
    ].filter(Boolean).join("");
    if(MODEL.bad.length)
      $("warn").innerHTML = `<div class="note"><b>${MODEL.bad.length} line${
        MODEL.bad.length === 1 ? " was" : "s were"} refused by the grammar</b> and left out of
        everything below: ${hesc(MODEL.bad.slice(0, 4).map(b => b.lhs + " (" + b.why + ")").join("; "))}.</div>`;
  
    controls(); holds(); xhint(); render();
    if(opts.chrome !== false) document.documentElement.dataset.ready = "1";
    return {name:SRC.name, lines:MODEL.steps.length, params:BOXES.length, outcomes:OUTS.length};
}

"use strict";
/* THE BRIDGE, FROM THE PAGE'S SIDE.
   ==========================================================================

   Two controls on step 3.2 were greyed with the same reason written on both.
   Connect a dataset: the page cannot see your data, so it writes the script
   and not the answer. Dispatch an agent: a model may propose a design, which
   is a declaration to accept or refuse by name, and may not report evidence,
   because nothing here could check that claim.

   Neither reason was about the browser's permissions. Both were about WHERE
   THE WORK HAPPENS. A regression reimplemented in a page would be a
   regression nobody could hold to anything, and a model asked for evidence
   inside the page would be a model the page then had to vouch for.

   So the work moved out. `amg bridge` serves this page and runs jobs in R or
   Python on the machine the page is open on, and the division survives the
   move intact:

     the SCRIPT is still written here, by the same writer whose output a
       scholar downloads -- so what ran and what travelled in the deposit are
       the same file, with the columns filled in rather than left blank;
     the RESULT is still a returned result. It is recorded, attributed, dated
       and marked unverified, through `wsDataIn`, which is the path a pasted
       line already took. A line that came back from a process this page does
       not control is not promoted by having arrived over a socket;
     the DESIGN is still a proposal. It arrives as prose, it is accepted by
       name or refused, and nothing about it enters the arithmetic.

   WHEN IT IS NOT THERE, which is the normal case. This page is a static file
   and most readers will open it from a web host or from disk, with nothing
   listening. Then the two controls stay greyed and say how to get them, and
   the download-the-script route is unchanged. The page asks once, only when
   it was served from loopback, so a reader on a static host never sees a
   failed request in their console.

   WHAT THE PAGE WILL NOT DO. It does not name a program to run: the bridge
   was started with the command, by the scholar, in a terminal. It does not
   choose a column: which column stands for which construct is a measurement
   decision. And it sends nothing but the script it wrote and the name of a
   dataset the bridge already told it about. ====================== */
import { hesc } from "../core/safe.js";
import { BUF, bufFind } from "./09-derive.js";
import { BOARD, boardSave, xlog } from "./05-explore.js";
import { WS, exportPyline, exportRline, wsDataIn } from "./18-workspace.js";
import { bufLab } from "../core/export.js";
import { aiMark, arithToText, bdec, classSpec } from "./08-ask.js";
import { varName } from "./11-classes.js";

/* What the bridge said about itself, and nothing inferred. `asked` separates
   "there is no bridge" from "nobody has looked", which are different states
   and were drawn the same way in the first version of this panel. */
const BRIDGE = {asked:false, on:false, at:"", dir:"", exists:false, sets:[],
  runtimes:{r:null, python:null}, design:{offered:false, command:""},
  limits:null, err:"",
  /* The scholar's choices, which are the whole of what this panel collects. */
  lang:"r", set:"", y:"", x:"", ctl:[],
  busy:"", out:null, asking:"", proposal:null, seeing:""};

/* SERVED FROM THIS MACHINE, which is the only case where asking makes sense.
   A page on a web host has no bridge and never will; a page opened from disk
   is on the `file:` scheme and cannot fetch at all. */
const bridgeLocal = () => /^https?:$/.test(location.protocol) &&
  /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);

/* Asked once, with a deadline, and every failure swallowed. A bridge that is
   not there is not an error: it is the normal case. */
async function bridgeHello(){
  if(BRIDGE.asked || !bridgeLocal()) { BRIDGE.asked = true; return BRIDGE.on; }
  BRIDGE.asked = true;
  try{
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 1500);
    const r = await fetch("/bridge/hello", {signal:ac.signal, cache:"no-store"});
    clearTimeout(t);
    if(!r.ok) return false;
    const o = await r.json();
    if(o.format !== "amg-bridge") return false;
    BRIDGE.on = true;
    BRIDGE.at = o.at || "";
    BRIDGE.runtimes = o.runtimes || {};
    BRIDGE.dir = (o.data || {}).dir || "";
    BRIDGE.exists = !!(o.data || {}).exists;
    BRIDGE.sets = ((o.data || {}).sets || []).slice(0, 60);
    BRIDGE.design = o.design || {offered:false, command:""};
    BRIDGE.limits = o.limits || null;
    BRIDGE.lang = BRIDGE.runtimes.r ? "r" : BRIDGE.runtimes.python ? "python" : "r";
    if(BRIDGE.sets.length === 1) BRIDGE.set = BRIDGE.sets[0].name;
    xlog("bridge", "A local runtime answered",
      [BRIDGE.runtimes.r && "R", BRIDGE.runtimes.python && "Python"].filter(Boolean).join(" and ") +
      ", " + BRIDGE.sets.length + " dataset(s)" +
      (BRIDGE.design.offered ? ", and a design route" : ""));
  }catch(e){ /* nothing is listening, which is not news */ }
  return BRIDGE.on;
}

const setOf = n => BRIDGE.sets.find(s => s.name === n) || null;
const bridgeCols = () => (setOf(BRIDGE.set) || {columns:[]}).columns;
/* A runtime this bridge has. The page offers neither route for a runtime the
   bridge said it has not got, rather than offering it and reporting a refusal. */
const bridgeLangs = () => ["r", "python"].filter(k => BRIDGE.runtimes[k]);
const LANGLAB = {r:"R", python:"Python"};

/* ---------------------------------------------------- running one line's test */
/* THE SAME WRITER, WITH THE COLUMNS FILLED IN. `exportRline` and
   `exportPyline` are the functions whose output a scholar downloads; this
   passes them what was picked instead of leaving the names empty. The script
   that ran is therefore the script that travels, which is the only version of
   this worth having. */
function bridgeScript(l){
  const fill = {data:BRIDGE.set, outcome:BRIDGE.y, driver:BRIDGE.x, controls:BRIDGE.ctl};
  return BRIDGE.lang === "python" ? exportPyline(l, fill) : exportRline(l, fill);
}
async function bridgeRun(lineId, redraw){
  const l = bufFind(lineId);
  BRIDGE.err = ""; BRIDGE.out = null;
  if(!l){ BRIDGE.err = "select a line to test"; return; }
  if(!BRIDGE.set){ BRIDGE.err = "pick a dataset"; return; }
  if(!BRIDGE.y || !BRIDGE.x){
    BRIDGE.err = "pick the column standing in for the outcome and the one standing in " +
      "for the parameter — nothing here will guess either, because a column standing " +
      "in for a construct is a measurement decision"; return; }
  if(BRIDGE.y === BRIDGE.x){ BRIDGE.err = "those are the same column"; return; }
  BRIDGE.busy = "running in " + LANGLAB[BRIDGE.lang];
  if(redraw) redraw();
  try{
    const r = await fetch("/bridge/run", {method:"POST", cache:"no-store",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({of:bufLab(l) || l.id, lang:BRIDGE.lang,
        dataset:BRIDGE.set, script:bridgeScript(l)})});
    const o = await r.json();
    BRIDGE.out = o;
    if(!o.ok){ BRIDGE.err = o.why || ("it exited " + o.code +
      (o.stderr ? ": " + String(o.stderr).split("\n").filter(Boolean).slice(-2).join(" ") : "")); }
    else if(!o.line){ BRIDGE.err = "it ran and wrote no AMG-DATA line, so there is " +
      "nothing to record. What it did write is below."; }
    else {
      /* THE PATH A PASTED LINE ALREADY TOOK. One recorder, so a result that
         arrived over a socket cannot be marked differently from one a scholar
         typed in -- and `ran` says which, because that is the part nobody
         could recompute. */
      wsDataIn(l.id, o.line);
      if(l.data) l.data.ran = Object.assign({}, o.ran,
        {script:BRIDGE.lang, ms:o.ms, columns:{outcome:BRIDGE.y, driver:BRIDGE.x,
          controls:BRIDGE.ctl.slice()}});
      xlog("bridge", "A test ran in " + LANGLAB[BRIDGE.lang],
        (bufLab(l) || l.id) + " against " + BRIDGE.set + " — " + o.line.slice(0, 120));
    }
  }catch(e){
    BRIDGE.err = "the bridge did not answer: " + ((e && e.message) || e) +
      " — is it still running in your terminal?";
    BRIDGE.on = false;
  }finally{ BRIDGE.busy = ""; if(redraw) redraw(); }
}

/* ------------------------------------------------------- asking for a design */
/* THE BRIEF, AND WHAT IT IS CAREFUL NOT TO ASK FOR. A design is a plan for
   getting evidence, so the brief says what was proved, over what range, under
   which declarations, and what the model cannot settle. It asks for a design
   and tells the model not to report findings, because a finding it reported
   would be one nothing here could check -- and the page would then be in the
   position of either vouching for it or quietly discarding it. */
function designBrief(r){
  const spec = classSpec();
  const L = [];
  L.push("You are asked for a STUDY DESIGN and not for a finding.");
  L.push("");
  L.push("A formal model has been built and one proposition has been PROVED from it by");
  L.push("interval arithmetic over a declared box. The proof is settled and is not in");
  L.push("question. What is wanted is a design that would put the proposition to data.");
  L.push("");
  L.push("THE PROPOSITION");
  L.push("  " + (r.text || (r.y + " in " + r.x)));
  L.push("  verdict: " + (r.verdict || "unknown") +
    (typeof r.share === "number" ? ", on " + (100 * r.share).toFixed(1) + "% of the declared box" : ""));
  L.push("  outcome: " + r.y + "      parameter: " + r.x);
  if(r.anno) L.push("  the scholar's own note: " + r.anno);
  L.push("");
  L.push("THE MODEL IT WAS PROVED FROM");
  const txt = typeof arithToText === "function" ? arithToText() : "";
  for(const line of String(txt || "(not available)").split("\n").slice(0, 40)) L.push("  " + line);
  L.push("");
  L.push("THE DECLARED RANGES");
  for(const k of (spec && spec.params) || []){
    const n = varName(k);
    L.push("  " + n + (bdec(k) ? " (declared)" : " (left at the default)"));
  }
  L.push("");
  L.push("WHAT TO WRITE. A design, in prose, under these headings:");
  L.push("  MEASUREMENT    what would stand in for the outcome and for the parameter,");
  L.push("                 and what each choice commits the researcher to");
  L.push("  IDENTIFICATION what would have to be true for the estimate to mean anything,");
  L.push("                 and what would break it");
  L.push("  WHERE TO LOOK  the setting, the population and the period, said concretely");
  L.push("  WHAT WOULD DISAGREE  the result that would send the scholar back to a");
  L.push("                 declaration, and which declaration it would be");
  L.push("");
  L.push("WHAT NOT TO WRITE. Do not report evidence, cite a finding as established, or");
  L.push("give an effect size. Nothing reading this can check such a claim, so it would");
  L.push("be discarded, and a design that leans on one is not usable. Do not rank or");
  L.push("recommend: this is one proposal, to be accepted by name or refused.");
  return L.join("\n");
}
async function bridgeDesign(rowId, redraw){
  const r = BOARD.rows.find(z => z.id === rowId);
  BRIDGE.err = ""; BRIDGE.proposal = null;
  if(!r){ BRIDGE.err = "that finding is gone"; return; }
  if(!BRIDGE.design.offered){
    BRIDGE.err = "this bridge was started without --agent, so it offers no design route"; return; }
  BRIDGE.asking = r.id;
  BRIDGE.busy = "asking " + (BRIDGE.design.command || "the command");
  if(redraw) redraw();
  try{
    const res = await fetch("/bridge/design", {method:"POST", cache:"no-store",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({of:r.text || (r.y + " in " + r.x), brief:designBrief(r)})});
    const o = await res.json();
    if(!o.ok){ BRIDGE.err = o.why || "the command wrote nothing"; }
    else BRIDGE.proposal = {row:r.id, text:String(o.text || "").slice(0, 20000),
      by:(o.ran || {}).command || BRIDGE.design.command,
      at:new Date().toISOString().slice(0, 16).replace("T", " "), ms:o.ms};
  }catch(e){
    BRIDGE.err = "the bridge did not answer: " + ((e && e.message) || e);
    BRIDGE.on = false;
  }finally{ BRIDGE.busy = ""; if(redraw) redraw(); }
}
/* ACCEPTED BY NAME. The proposal goes onto the row as a design, stamped with
   the command that wrote it, and it is never mixed into the scholar's own note
   or into anything the page computed. Refusing writes nothing, which is the
   point of there being two buttons. */
function bridgeTakeDesign(){
  const p = BRIDGE.proposal;
  if(!p) return;
  const r = BOARD.rows.find(z => z.id === p.row);
  if(!r) return;
  r.design = {text:p.text, by:p.by, at:p.at};
  boardSave();
  xlog("bridge", "A study design was accepted", (r.text || r.y) + " — proposed by " + p.by +
    ", " + p.text.length + " chars");
  BRIDGE.proposal = null; BRIDGE.asking = "";
}
const bridgeDropDesign = () => { BRIDGE.proposal = null; BRIDGE.asking = ""; };

/* ------------------------------------------------------------------ the panel */
const opt = (v, cur, lab) =>
  `<option value="${hesc(v)}"${v === cur ? " selected" : ""}>${hesc(lab == null ? v : lab)}</option>`;
const bytesLab = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB"
  : n > 1024 ? Math.round(n / 1024) + " KB" : n + " bytes";

/* WHAT TO SAY WHEN THERE IS NO BRIDGE, which is most of the time. The control
   stays greyed, as it was, and the title says the one command that changes
   that -- rather than describing a division the reader has no way to act on. */
function bridgeOffHTML(){
  return `<button type="button" class="off" aria-disabled="true" data-wsconnect="1"
      title="${hesc("Not available here. The page cannot look at data: a regression " +
      "reimplemented in a browser would be one nothing could hold to a standard, and " +
      "the page could not see your file anyway. Run the artifact beside R or Python " +
      "instead — `amg bridge --data ./your-data` serves this page and runs the script " +
      "it writes, on your machine, as you. Then this control picks a dataset and the " +
      "columns, and what comes back is recorded here exactly as a pasted line is. " +
      "Until then, the script below is the honest half." +
      (bridgeLocal() ? " (This page is served locally and nothing answered on /bridge/hello.)" : ""))}"
      >connect a dataset<span class="pil">needs the bridge</span></button>`;
}

function bridgePanelHTML(){
  const cols = bridgeCols(), set = setOf(BRIDGE.set);
  const langs = bridgeLangs();
  const sel = (typeof WS !== "undefined" && BUF.sel) ? bufFind(BUF.sel) : null;
  const testable = sel && sel.tree && sel.y && sel.x;
  return `<div class="wsbridge">
    <div class="embhd">
      <span class="ctl-label">A dataset, through the bridge</span>
      <span class="pcount">${langs.map(k => LANGLAB[k]).join(" and ") || "no runtime"} on
        this machine${BRIDGE.sets.length ? ` · <b>${BRIDGE.sets.length}</b> dataset${
        BRIDGE.sets.length === 1 ? "" : "s"}` : ""}</span>
    </div>
    <p class="why">The script is written here and run by <code>amg bridge</code> in your
      terminal, against a file in <code>${hesc(BRIDGE.dir)}</code>. <b>What comes back is
      recorded, not checked</b> — the page did not run it and cannot see your data, and the
      result sits beside the proof rather than over it.</p>
    ${BRIDGE.sets.length ? `
    <div class="row">
      <div class="fld"><label for="brSet">the dataset</label>
        <select id="brSet">${BRIDGE.sets.map(s => opt(s.name, BRIDGE.set)).join("")}</select>
        ${set ? `<i class="bnote">${bytesLab(set.bytes)}, ${set.columns.length} column${
          set.columns.length === 1 ? "" : "s"}</i>` : ""}</div>
      <div class="fld"><label for="brLang">run it in</label>
        <select id="brLang">${langs.map(k => opt(k, BRIDGE.lang, LANGLAB[k])).join("")}</select>
        <i class="bnote">${BRIDGE.lang === "python"
          ? "the standard library only — no package to install"
          : "needs the <code>boot</code> package"}</i></div>
    </div>
    <div class="row">
      <div class="fld"><label for="brY">${hesc(sel && sel.y ? sel.y : "the outcome")} is measured by</label>
        <select id="brY">${opt("", BRIDGE.y, "— pick a column —")}${
          cols.map(c => opt(c, BRIDGE.y)).join("")}</select></div>
      <div class="fld"><label for="brX">${hesc(sel && sel.x ? sel.x : "the parameter")} is measured by</label>
        <select id="brX">${opt("", BRIDGE.x, "— pick a column —")}${
          cols.map(c => opt(c, BRIDGE.x)).join("")}</select></div>
    </div>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Nothing is guessed for you. A column standing in for a construct is a
      measurement decision and it is yours; the page knows the construct's name and nothing
      about your data. The controls below are the same decision and carry the same burden.</span></p>
    <div class="fld" style="flex:1 1 100%;max-width:none">
      <label>controls</label>
      <div class="presets">${cols.filter(c => c !== BRIDGE.y && c !== BRIDGE.x).map(c =>
        `<button type="button" data-brctl="${hesc(c)}"${
          BRIDGE.ctl.includes(c) ? ' aria-pressed="true"' : ""}>${hesc(c)}</button>`).join("")
        || `<i class="bnote">no other column in this file</i>`}</div>
      <i class="bnote">${BRIDGE.ctl.length
        ? "<b>" + BRIDGE.ctl.length + "</b> control(s) — yours to justify"
        : "none, which is also a decision"}</i>
    </div>
    <div class="cmpacts" style="margin:9px 0 0">
      <button type="button" id="brGo"${testable && !BRIDGE.busy ? "" : " disabled"}
        title="${hesc(testable ? "Writes the script for this line with the columns you picked, " +
          "sends it to the bridge, and records the line it writes back"
          : "Select a derived line on the list first")}">${BRIDGE.busy
        ? hesc(BRIDGE.busy) + "…"
        : "run it on " + hesc(BRIDGE.set || "the dataset")}</button>
      <button type="button" id="brSee"${testable ? "" : " disabled"}
        title="The exact file the bridge would run, before it runs">show the script</button>
      ${testable ? `<span class="mblab" style="align-self:center">for ${hesc(bufLab(sel))}</span>`
        : `<span class="mblab" style="align-self:center">select a line on the list</span>`}
    </div>`
    : `<p class="why" style="color:var(--neg)"><b>The bridge is running and its data
      directory ${BRIDGE.exists ? "is empty" : "does not exist"}.</b> Put a
      <code>.csv</code> or <code>.tsv</code> in <code>${hesc(BRIDGE.dir)}</code> and reload,
      or restart it with <code>--data</code> pointing somewhere else.</p>`}
    ${BRIDGE.err ? `<p class="why" style="color:var(--neg)">${hesc(BRIDGE.err)}</p>` : ""}
    ${BRIDGE.out && BRIDGE.out.ran ? `<p class="why"><b>Ran</b> in
      ${hesc(BRIDGE.out.ran.runtime)} ${hesc(BRIDGE.out.ran.version || "")}, ${BRIDGE.out.ms}ms,
      over ${hesc(BRIDGE.out.ran.dataset)}. ${BRIDGE.out.line
        ? "Recorded against the line, and it travels in the exports marked unverified."
        : "It wrote no AMG-DATA line."}</p>` : ""}
    ${BRIDGE.out && !BRIDGE.out.line && (BRIDGE.out.stdout || BRIDGE.out.stderr)
      ? `<pre class="brout">${hesc(String(BRIDGE.out.stdout || "") +
          (BRIDGE.out.stderr ? "\n" + BRIDGE.out.stderr : "")).slice(0, 4000)}</pre>` : ""}
    ${BRIDGE.seeing ? `<pre class="brout">${hesc(BRIDGE.seeing).slice(0, 20000)}</pre>` : ""}
  </div>`;
}

/* THE DESIGN ROUTE, on the retained finding rather than on a derived line: a
   design is a plan for getting evidence about something somebody decided to
   stand behind, and asking for one about a line still being worked on puts the
   cart first. */
function bridgeDesignHTML(){
  const kept = BOARD.rows.filter(r => r.keep && r.y && r.x);
  if(!BRIDGE.on || !BRIDGE.design.offered) return "";
  const p = BRIDGE.proposal;
  return `<div class="wsbridge">
    <div class="embhd">
      <span class="ctl-label">${aiMark()}A study design, proposed</span>
      <span class="pcount">through <code>${hesc(BRIDGE.design.command)}</code></span>
    </div>
    <p class="why">The brief says what was proved, over what range and under which
      declarations, and asks for a design. It tells the model <b>not</b> to report evidence
      or give an effect size: nothing here could check such a claim. What comes back is
      <b>a proposal you accept by name or refuse</b>, and it never enters the arithmetic.</p>
    ${kept.length ? `<div class="cmpacts">
      ${kept.slice(0, 12).map(r => `<button type="button" data-brask="${hesc(r.id)}"${
        BRIDGE.busy ? " disabled" : ""}>${BRIDGE.asking === r.id && BRIDGE.busy
        ? hesc(BRIDGE.busy) + "…" : "ask about " + hesc(
          String(r.text || (r.y + " in " + r.x)).slice(0, 48))}</button>`).join("")}
    </div>` : `<p class="why">Nothing is on the board yet. A design is about a finding
      somebody decided to stand behind.</p>`}
    ${p ? `<div class="brprop">
      <div class="embhd"><span class="ctl-label">What came back</span>
        <span class="pcount">${p.text.length} chars, ${p.ms}ms, from
          <code>${hesc(p.by)}</code></span></div>
      <pre class="brout">${hesc(p.text).slice(0, 20000)}</pre>
      <div class="cmpacts" style="margin:6px 0 0">
        <button type="button" id="brTake"><b>Accept this design</b></button>
        <button type="button" id="brDrop">Refuse it</button>
        <span class="mblab" style="align-self:center">accepting keeps it on the finding,
          stamped with the command that wrote it</span>
      </div>
    </div>` : ""}
  </div>`;
}

/* WHAT AN ACCEPTED DESIGN LOOKS LIKE ON THE ROW. Marked as proposed and by
   what, beside the scholar's own note and never merged into it -- the same
   rule the board already keeps for an accepted proposal. */
function bridgeRowHTML(r){
  if(!r || !r.design) return "";
  return `<div class="bdesign"><b>${aiMark()}A study design</b>
    <i class="bnote">proposed by <code>${hesc(r.design.by)}</code>, accepted
      ${hesc(r.design.at)}. Not checked here and not part of any verdict.</i>
    <pre class="brout">${hesc(r.design.text).slice(0, 8000)}</pre></div>`;
}

/* ------------------------------------------------------------------- wiring */
/* In this file because the controls are, and called from the one place that
   wires the step. `once` rather than addEventListener for the same reason the
   deposit's footer uses it: this panel is redrawn on every change and a
   listener added per redraw would send one request per redraw. */
const once = (id, fn) => { const e = document.getElementById(id); if(e) e.onclick = fn; };
function wireBridge(redraw){
  const set = document.getElementById("brSet");
  if(set) set.onchange = () => {
    BRIDGE.set = set.value;
    /* The columns are this file's columns. Carrying a choice over to another
       dataset would be carrying a measurement decision somebody made about a
       different file. */
    BRIDGE.y = ""; BRIDGE.x = ""; BRIDGE.ctl = []; BRIDGE.out = null; BRIDGE.err = "";
    redraw();
  };
  const lang = document.getElementById("brLang");
  if(lang) lang.onchange = () => { BRIDGE.lang = lang.value; BRIDGE.seeing = ""; redraw(); };
  for(const [id, k] of [["brY", "y"], ["brX", "x"]]){
    const e = document.getElementById(id);
    if(e) e.onchange = () => { BRIDGE[k] = e.value;
      BRIDGE.ctl = BRIDGE.ctl.filter(c => c !== BRIDGE.y && c !== BRIDGE.x);
      BRIDGE.err = ""; BRIDGE.seeing = ""; redraw(); };
  }
  document.querySelectorAll("#pbody [data-brctl]").forEach(b => b.onclick = () => {
    const c = b.dataset.brctl;
    BRIDGE.ctl = BRIDGE.ctl.includes(c) ? BRIDGE.ctl.filter(z => z !== c) : BRIDGE.ctl.concat([c]);
    BRIDGE.seeing = ""; redraw();
  });
  once("brGo", () => { bridgeRun(BUF.sel, redraw); });
  once("brSee", () => {
    const l = bufFind(BUF.sel);
    BRIDGE.seeing = BRIDGE.seeing ? "" : (l ? bridgeScript(l) : "");
    redraw();
  });
  document.querySelectorAll("#pbody [data-brask]").forEach(b => b.onclick = () => {
    bridgeDesign(b.dataset.brask, redraw);
  });
  once("brTake", () => { bridgeTakeDesign(); redraw(); });
  once("brDrop", () => { bridgeDropDesign(); redraw(); });
}

/* The greyed agent control's replacement, for the toolbar: the same button,
   live, when a bridge offered the route. */
function bridgeAgentBtnHTML(){
  if(!BRIDGE.on || !BRIDGE.design.offered)
    return `<button type="button" class="off" aria-disabled="true" data-wsagent="1"
      title="${hesc("Not available here. It would hand a line of enquiry to a model: " +
      "propose a study design for a finding you decided to stand behind. A model may " +
      "PROPOSE a design, which is a declaration you accept or refuse by name, and may " +
      "not REPORT evidence, because nothing on this page could check that relationship — so " +
      "the proposing has to happen somewhere this page does not have to vouch for it. " +
      "Run the artifact beside your own tool to get it: `amg bridge --agent \"<command>\"` " +
      "serves this page and hands the brief to that command, on your machine, as you.")}"
      >${aiMark()}Dispatch an agent<span class="pil">needs the bridge</span></button>`;
  return `<button type="button" data-wspop="design"${WS.pop === "design" ? ' aria-pressed="true"' : ""}
    title="${hesc("Asks " + BRIDGE.design.command + " for a study design for a retained " +
    "finding. It comes back as a proposal to accept by name or refuse, and never enters " +
    "the arithmetic.")}">${aiMark()}Dispatch an agent</button>`;
}

export { BRIDGE, bridgeAgentBtnHTML, bridgeCols, bridgeDesign, bridgeDesignHTML,
  bridgeDropDesign, bridgeHello, bridgeLangs, bridgeLocal, bridgeOffHTML,
  bridgePanelHTML, bridgeRowHTML, bridgeRun, bridgeScript, bridgeTakeDesign,
  designBrief, wireBridge };

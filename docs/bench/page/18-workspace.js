/* AMG bench, page script 19 of 22: step 3.2's workspace -- the rail, the
   filter, combinations, a line's score, and the trip out to R and back.
   One shared global scope, loaded in order. See page/README.md.
   Unlike the other page scripts this one also loads under node, because most
   of what is in it computes rather than draws -- see tests/workspace.test.mjs.
   =========================================================================== */
import { asamples } from "../core/invariants.js";
import { hesc } from "../core/safe.js";
/* The local runtime's own module, which owns both routes this step offers
   through it and every refusal either one can give. */
import { BRIDGE, bridgeAgentBtnHTML, bridgeDesignHTML, bridgeOffHTML,
  bridgePanelHTML, wireBridge } from "./28-bridge.js";
import { SAXES, SCORE, lineCandidate, rankBy, theRule } from "../core/rank.js";
import { OP, SIMPL, simp } from "../core/kernel.js";
import { bufLab } from "../core/export.js";
import { lineSays } from "../core/verdict.js";
import { AI, AITIP, aiErrHTML, aiMark, buildArith, classSpec } from "./08-ask.js";
import { BCMDLOG, SBAR, bufRun, keptPlot, scoreRowsHTML } from "./10-depends.js";
import { BOARD, GUESS, MTH, MTHS, NOISE, boardSave, gkey, xlog } from "./05-explore.js";
import { BUF, PROPS, bufFind, bufPush, bufSel, scoreOne, searchBlockHTML } from "./09-derive.js";
import { MR } from "../model-report.js";
;
import { infold, lsRead, lsWrite, noteFail, state } from "./03-stores.js";
import { renderPanel } from "./06-wiring.js";
import { saveText } from "./16-worklists.js";
/* ===========================================================================
   THE WORKSPACE -- step 3.2's list, and the rail that makes it navigable.

   The buffer began as a scratch surface: a dozen lines, a palette, and one
   flat list. That is the right object for a dozen lines and the wrong one for
   the thing it is for. A scholar pursuing two explanations of the same
   outcome has two paths of enquiry and one list, and no way to say which
   lines belong to which -- so the list grows past reading and the work
   happens in the scholar's head instead of on the page.

   What this adds, and nothing here changes what a line IS:

     a rail of folders   by KIND (what a line is) and by STATE (what is known
                         about it), both COMPUTED from the line, plus folders
                         the scholar makes and files lines into by hand
     a filter           over the name, the expression and the note
     per-row actions    prove, sample, score, send to R, file
     combinations       two lines and an operator, which is a line
     a data record      what came back from R, recorded and SAID to be
                        unverified, because the page did not run it

   The two folder trees are different in kind and the rail says so. A kind
   folder is a fact about where the line came from; a state folder is a fact
   about what has been proved; an own folder is a decision of the scholar's.
   Collapsing the three into one tree would hide exactly the distinction the
   rest of this bench is built on.
   ========================================================================= */

const WSKEY = "purposeWorkspace";
/* `lang` governs which writer the two download buttons use. It is on the
   workspace and not on the bridge, because a scholar downloading a script has
   no bridge running and still has to be able to say which engine they have. */
const WS = {fold:"", q:"", own:[], seq:0, err:"", din:"", menu:"", pop:"", lang:"r"};
function wsSave(){ lsWrite(WSKEY, {own:WS.own, seq:WS.seq, fold:WS.fold}); }
function wsLoad(){
  const v = lsRead(WSKEY);
  if(!v) return;
  WS.own = Array.isArray(v.own) ? v.own.filter(f => f && f.id) : [];
  WS.seq = +v.seq || 0;
  WS.fold = String(v.fold || "");
}

/* ---- the folders --------------------------------------------------------
   KIND: what the line is, which is a fact about how it got here. */
const WSKIND = [
  ["diff",   "Derivatives",          l => l.cmd === "diff",
   "\u2202y/\u2202x as an expression, which is what most of a formal proposition is about"],
  ["inline", "Outcomes written out", l => l.cmd === "inline",
   "an outcome with every assignment substituted into it, which is what gets differentiated"],
  ["seg",    "Segments",             l => !!l.seg,
   "a line about one part of a range and no other, made by splitting where two branches cross"],
  ["comb",   "Combinations",         l => l.cmd === "comb",
   "two lines put together by an operator \u2014 an expression about the model, not yet a proposition"],
  ["hand",   "Written by hand",      l => l.src === "hand",
   "read against the same grammar as everything else, and unsigned until you sign it"],
  ["tool",   "Back from a tool",     l => l.cmd === "import" || l.src === "tool",
   "brought back from Mathematica, SymPy or anywhere else, and checked here rather than trusted"],
  ["data",   "Checked against data", l => !!l.data,
   "an external result recorded against the line. The page did not run it and does not vouch for it"],
  ["bad",    "Would not derive",     l => !!l.bad,
   "a command that could not apply, kept rather than dropped, because the reason is a result"],
];
/* STATE: what is known, which is a fact about what was proved. */
const WSSTATE = [
  ["proved",   "Proved",      l => !!l.res && (l.res.verdict === "proved" || l.res.verdict === "disproved"),
   "one sign over the whole declared box, by interval arithmetic"],
  ["partial",  "Turns",       l => !!l.res && l.res.verdict === "partial",
   "one sign on part of the box and the other on the rest \u2014 the scope condition, derived"],
  ["undec",    "Undecided",   l => !!l.res && l.res.verdict === "undecided",
   "the method is sound and incomplete, so this is a verdict and not a gap"],
  ["sampled",  "Sampled",     l => !!l.sim,
   "evidence and not proof: a sweep cannot see a dip between two of its points"],
  ["unsigned", "Unsigned",    l => !l.res && !l.sim && !l.bad,
   "nothing has been proved about it yet"],
  ["stated",   "Stated",      l => !!l.stated,
   "in the set step 4.1 plots and the exports write"],
  ["scored",   "Scored",      l => !!l.score,
   "run against the four quantities this page can compute, under your criteria"],
  ["against",  "Against you", l => { const s = lineSays(l), g = GUESS[gkey(l)];
     return !!(g && g !== "none" && s && g !== s); },
   "you expected one thing and it did another, which is the finding and not the failure"],
];
const wsOwn = () => WS.own;

/* A folder id is typed: "" everything, k:/s: computed, f: the scholar's. */
function wsPred(id){
  if(!id) return () => true;
  const [k, v] = String(id).split(":");
  if(k === "k"){ const f = WSKIND.find(x => x[0] === v); return f ? f[2] : () => true; }
  if(k === "s"){ const f = WSSTATE.find(x => x[0] === v); return f ? f[2] : () => true; }
  if(k === "f") return v === "none" ? (l => !l.fold) : (l => l.fold === v);
  return () => true;
}
/* computation inside a render: a filter that throws on one line still counts
   the rest, and the count beside the folder is what the reader sees. */
const wsCount = id => { const p = wsPred(id);
  let n = 0;
  for(const l of BUF.lines){ try{ if(p(l)) n++; }
    catch(e){ noteFail("counting what a folder holds", e); } }
  return n; };

/* The filter runs over what a reader can see on the row: the label, the
   expression as text, and the note. Not over the id, which nobody reads. */
function wsMatch(l, q){
  if(!q) return true;
  const s = (bufLab(l) + " " + (l.text || "") + " " + (l.note || "") + " " +
    (l.bad || "") + " " + (l.data ? l.data.text : "")).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => s.indexOf(w) >= 0);
}
function wsLines(){
  const p = wsPred(WS.fold), q = WS.q.trim();
  return BUF.lines.filter(l => { try{ return p(l) && wsMatch(l, q); }catch(e){ return false; } });
}
const wsFoldName = id => { if(!id) return "everything";
  const [k, v] = String(id).split(":");
  if(k === "k"){ const f = WSKIND.find(x => x[0] === v); return f ? f[1] : id; }
  if(k === "s"){ const f = WSSTATE.find(x => x[0] === v); return f ? f[1] : id; }
  if(k === "f"){ if(v === "none") return "unfiled";
    const f = WS.own.find(x => x.id === v); return f ? f.name : id; }
  return id; };

/* ---- the rail ----------------------------------------------------------- */
function wsRailHTML(){
  const row = (id, lab, why) => { const n = wsCount(id);
    return `<button type="button" class="wsf${WS.fold === id ? " on" : ""}${
      n ? "" : " nil"}" data-wsfold="${hesc(id)}" title="${hesc(why || "")}">
      <span class="wsfn">${hesc(lab)}</span><span class="wsfc">${n}</span></button>`; };
  return `<div class="wsrail">
    <div class="wsgrp">
      ${row("", "All lines", "every line on the buffer, filed or not")}
    </div>
    <div class="wsgrp">
      <span class="wsgl">by kind</span>
      <span class="wsgw">what the line is, computed from how it got here</span>
      ${WSKIND.map(([k, lab, , why]) => row("k:" + k, lab, why)).join("")}
    </div>
    <div class="wsgrp">
      <span class="wsgl">by what is known</span>
      <span class="wsgw">computed from what was proved, so a line moves between these on its own</span>
      ${WSSTATE.map(([k, lab, , why]) => row("s:" + k, lab, why)).join("")}
    </div>
    <div class="wsgrp">
      <span class="wsgl">your folders</span>
      <span class="wsgw">Yours to name, and nothing is filed automatically. The folders survive
        a reload and the lines do not \u2014 a verdict restored from a previous session was proved
        against declarations that may have moved since. Step 4.2's deposit is what carries
        work out.</span>
      ${WS.own.map(f => `<span class="wsfw">${row("f:" + f.id, f.name, "a folder of yours")}
        <button type="button" class="wsfx" data-wsdel="${hesc(f.id)}"
          title="Delete the folder. The lines in it stay on the buffer, unfiled.">\u00d7</button></span>`).join("")}
      ${row("f:none", "Unfiled", "on the buffer and in none of your folders")}
      <span class="wsnew">
        <input type="text" id="wsnewn" placeholder="a new folder" aria-label="name a new folder">
        <button type="button" data-wsadd="1">add</button>
      </span>
    </div>
  </div>`;
}

function wsBarHTML(){
  const shown = wsLines().length, all = BUF.lines.length;
  return `<div class="wsbar">
    <span class="wsbf">${hesc(wsFoldName(WS.fold))}</span>
    <span class="wsbc">${shown === all ? `<b>${all}</b> line${all === 1 ? "" : "s"}`
      : `<b>${shown}</b> of ${all}`}</span>
    <input type="search" id="wsq" value="${hesc(WS.q)}" placeholder="filter by name, expression or note"
      aria-label="filter the lines">
    ${(WS.fold || WS.q) ? `<button type="button" data-wsclr="1">clear</button>` : ""}
  </div>`;
}

/* ---- filing ------------------------------------------------------------- */
function wsAdd(name){
  const n = String(name || "").trim();
  if(!n){ WS.err = "a folder needs a name"; return; }
  if(WS.own.some(f => f.name.toLowerCase() === n.toLowerCase())){
    WS.err = "you already have a folder called " + n; return; }
  WS.own.push({id:"F" + (++WS.seq), name:n.slice(0, 40)});
  WS.err = ""; wsSave();
}
function wsDel(id){
  WS.own = WS.own.filter(f => f.id !== id);
  for(const l of BUF.lines) if(l.fold === id) l.fold = "";
  if(WS.fold === "f:" + id) WS.fold = "";
  wsSave();
}
function wsFile(lineId, foldId){
  const l = bufFind(lineId); if(!l) return;
  l.fold = foldId || "";
}

/* ---- combining two lines ------------------------------------------------
   An operator over two expressions is an expression, and the grammar already
   admits all four. What it is NOT is a proposition: nothing says the sum of
   two derivatives is about anything. So the line arrives unsigned with that
   said on it, and it earns a verdict the same way every other line does. */
const WSOPS = [["+", "plus"], ["-", "minus"], ["*", "times"], ["/", "over"]];
function wsCombine(aId, op, bId){
  BUF.err = "";
  const a = bufFind(aId), b = bufFind(bId);
  if(!a || !b){ BUF.err = "pick two lines to combine"; return; }
  if(a.id === b.id){ BUF.err = "that is one line twice"; return; }
  if(!a.tree || !b.tree){ BUF.err = "a line with no expression has nothing to combine"; return; }
  if(!WSOPS.some(o => o[0] === op)){ BUF.err = "unknown operator"; return; }
  /* Two lines proved on different parts of a range are about different
     places, and an operator over them would be about neither. */
  const sa = a.seg ? a.seg.join("|") : "", sb = b.seg ? b.seg.join("|") : "";
  if(sa !== sb){ BUF.err = "those two lines are about different parts of the range — " +
    "combining them would be about neither"; return; }
  const tree = simp(OP(op, a.tree, b.tree));
  const same = a.x && a.x === b.x;
  bufPush({src:(a.src === "hand" || b.src === "hand") ? "hand" : "auto",
    cmd:"comb", of:[a.id, b.id], x:same ? a.x : "", y:"",
    tree, raw:OP(op, a.raw || a.tree, b.raw || b.tree), box:a.box, seg:a.seg,
    fold:a.fold === b.fold ? a.fold : "",
    note:bufLab(a) + " " + (WSOPS.find(o => o[0] === op) || [])[1] + " " + bufLab(b) +
      ". An operator over two expressions is an expression; it is not yet about anything. " +
      "Sign it and it is, over the box those two were about" +
      (same ? "" : ", and note that the two are in different parameters")});
}

/* ---- scoring one line --------------------------------------------------
   The same four quantities and the same runner the ranking uses. A line is
   not a candidate until it says a direction, which is what a sign gives it,
   so an unsigned line is refused by name rather than scored at zero. */
function lineScoreRun(lineId){
  BUF.err = "";
  const l = bufFind(lineId); if(!l) return;
  const c = lineCandidate(l);
  if(!c){ BUF.err = !l.y || !l.x
    ? "that line is not about a pair of quantities, so there is nothing to score"
    : "sign or sample it first — a score needs a direction, and this line has none"; return; }
  const spec = classSpec();
  if(!spec){ BUF.err = "nothing to score against: no arithmetic was kept on step 3.1"; return; }
  const M = buildArith(spec);
  if(!M.steps.length){ BUF.err = "the kept arithmetic no longer reads"; return; }
  try{
    const row = scoreOne(M, c, asamples(M, 21), spec);
    rankBy([row], theRule());
    l.score = row;
  }catch(e){ BUF.err = "the score would not run: " + ((e && e.message) || "unknown"); }
}
function lineScoreHTML(l){
  if(!l.score) return "";
  const r = l.score, R = theRule();
  if(r.skip) return `<div class="wssc"><b>not scored</b> ${hesc(r.why || "")}</div>`;
  const part = [["material", r.material.s, r.material.why],
    ["novel", r.novel.s, r.novel.why],
    ["composition", r.comp.s, r.comp.why],
    ["robust", r.robust.s, r.robust.why]];
  return `<div class="wssc">
    <span class="wsscn">${r.ruledOut ? "ruled out" : (100 * r.total).toFixed(0) + " / 100"}</span>
    ${part.map(([a, s, why]) => `<span class="wsscp" title="${hesc(why || "")}">${a}
      ${SBAR(s)}<i>\u00d7${(R.weights || {})[a] || 0}</i></span>`).join("")}
    <i class="bnote">${r.ruledOut ? "It fails a criterion you declared must pass, so it carries no rank."
      : "Against the criteria you declared. The weights are yours; the four quantities are what this page can compute."}</i>
  </div>`;
}

/* ---- out to R, and back ------------------------------------------------
   The one thing a browser cannot do is look at data, and the one thing a
   scholar in this field already has is a dataset and an R session. So this
   writes the script rather than the answer: the sign the model PROVED, the
   box it was proved on, and the regression that would show that sign in
   data, with the columns left as names for somebody who knows the data to
   fill in. What comes back is RECORDED and said to be unverified, because
   the page did not run it and has no way to check it. */
/* FILLED IN OR LEFT EMPTY, by one writer. A scholar who downloads the script
   fills the columns in their own editor; a scholar running the bridge picks
   them from the dataset's header and the same writer fills them here. Two
   writers would be two scripts, and the one that ran would not be the one that
   travelled in the deposit. */
const rq = s => '"' + String(s == null ? "" : s).replace(/[\\"]/g, "") + '"';
const pq = rq;
function exportRline(l, fill){
  const f = fill || {};
  const dir = l.res ? l.res.dir : (l.sim ? l.sim.dir : 0);
  const sign = dir > 0 ? "+" : dir < 0 ? "-" : "?";
  const bx = (l.bx && l.bx[l.x]) ? l.bx[l.x] : null;
  const L = [];
  L.push(`# Derived on the AMG Workbench, ${new Date().toISOString().slice(0, 10)}.`);
  L.push(`#`);
  L.push(`# WHAT THE MODEL PROVES`);
  L.push(`#   ${bufLab(l)}`);
  L.push(`#   ${l.text || "(no expression)"}`);
  if(l.res && l.res.verdict === "flat")
    L.push(`#   identically zero on the declared box: ${l.y} does not move with ${l.x} at all`);
  else if(l.res) L.push(`#   sign ${sign}, ${l.res.verdict}, on ${(100 * l.res.share).toFixed(1)}% of ` +
    `the declared box (${l.res.boxes} boxes searched)`);
  if(bx) L.push(`#   over ${l.x} in [${(+bx[0]).toFixed(4)}, ${(+bx[1]).toFixed(4)}]`);
  if(l.seg) L.push(`#   and only on ${l.seg[0]} in [${l.seg[1].toFixed(4)}, ${l.seg[2].toFixed(4)}]`);
  L.push(`#`);
  L.push(`# WHAT THIS SCRIPT DOES, AND WHAT IT DOES NOT`);
  L.push(`# It asks whether the sign above shows up in your data. That is not a test of the`);
  L.push(`# model: the model is conditional on declarations, and a regression is conditional`);
  L.push(`# on a sample and on everything left out of it. Agreement is one more reason to`);
  L.push(`# hold the proposition; disagreement locates a declaration to go back to. Neither`);
  L.push(`# is a verdict on the arithmetic, which was already settled by proof.`);
  L.push(`#`);
  L.push(`# Fill in the two column names and the controls. Nothing is guessed for you,`);
  L.push(`# because a column standing in for a construct is a measurement decision.`);
  L.push(``);
  L.push(`library(boot)`);
  L.push(``);
  L.push(`DATA     <- ${rq(f.data || "your-data.csv")}`);
  L.push(`OUTCOME  <- ${rq(f.outcome)}   # the column standing in for ${l.y || "the outcome"}`);
  L.push(`DRIVER   <- ${rq(f.driver)}   # the column standing in for ${l.x || "the parameter"}`);
  L.push(`CONTROLS <- ${(f.controls || []).length
    ? "c(" + (f.controls || []).map(rq).join(", ") + ")"
    : "character(0)"}   # yours to justify`);
  L.push(`EXPECTED <- "${sign}"   # the sign the model proves`);
  L.push(``);
  /* SEEDED, so two runs of this script over one dataset agree. Every draw on
     the page runs off one seed carried with the model and the script that
     leaves the page was the one place that did not. */
  L.push(`set.seed(20261023)   # so this script gives the same answer twice`);
  L.push(``);
  L.push(`d <- read.csv(DATA)`);
  L.push(`stopifnot(nzchar(OUTCOME), nzchar(DRIVER))`);
  L.push(`d <- d[stats::complete.cases(d[, c(OUTCOME, DRIVER, CONTROLS)]), , drop = FALSE]`);
  L.push(``);
  L.push(`rhs <- paste(c(DRIVER, CONTROLS), collapse = " + ")`);
  L.push(`f   <- stats::as.formula(paste(OUTCOME, "~", rhs))`);
  L.push(`fit <- stats::lm(f, data = d)`);
  L.push(`b   <- stats::coef(fit)[[DRIVER]]`);
  L.push(`p   <- stats::coef(summary(fit))[DRIVER, 4]`);
  L.push(``);
  L.push(`# The model proves a SIGN, so the sign is what is bootstrapped -- not the size,`);
  L.push(`# which is in the units of whatever columns you chose and is not what was proved.`);
  L.push(`bs  <- boot::boot(d, function(dd, i)`);
  L.push(`         stats::coef(stats::lm(f, data = dd[i, ]))[[DRIVER]], R = 2000)`);
  L.push(`ci  <- boot::boot.ci(bs, type = "perc")$percent[4:5]`);
  L.push(`agr <- if (EXPECTED == "+") ci[1] > 0 else if (EXPECTED == "-") ci[2] < 0 else NA`);
  L.push(``);
  if(l.res && l.res.verdict === "partial" && Array.isArray(l.flip)){
    L.push(`# The model proves the sign TURNS, inside [${l.flip[0].toFixed(4)}, ${l.flip[1].toFixed(4)}].`);
    L.push(`# A linear term cannot see a turning point, so the quadratic is the comparable test`);
    L.push(`# and the derived interval is what its vertex is read against.`);
    L.push(`fq   <- stats::as.formula(paste(OUTCOME, "~", DRIVER, "+ I(", DRIVER, "^2)",`);
    L.push(`                                if (length(CONTROLS)) paste("+", paste(CONTROLS, collapse = " + ")) else ""))`);
    L.push(`fitq <- stats::lm(fq, data = d)`);
    L.push(`cq   <- stats::coef(fitq)`);
    L.push(`vx   <- -cq[[2]] / (2 * cq[[3]])`);
    L.push(`cat(sprintf("quadratic vertex at %s = %.4f; derived interval [${
      l.flip[0].toFixed(4)}, ${l.flip[1].toFixed(4)}]\\n", DRIVER, vx))`);
    L.push(``);
  }
  L.push(`cat(sprintf("AMG-DATA %s  sign=%s  b=%.5g  ci=[%.5g, %.5g]  p=%.4g  n=%d  agrees=%s\\n",`);
  L.push(`            "${(bufLab(l) || "").replace(/"/g, "'")}",`);
  L.push(`            if (b > 0) "+" else "-", b, ci[1], ci[2], p, nrow(d),`);
  L.push(`            ifelse(is.na(agr), "unknown", ifelse(agr, "yes", "no"))))`);
  L.push(``);
  L.push(`# Paste that AMG-DATA line back into the bench, under "what came back from your`);
  L.push(`# data". It is RECORDED against this line and marked unverified: the bench did`);
  L.push(`# not run it, cannot see your data, and will not pretend either.`);
  return L.join("\n");
}

/* ---- and out to Python, for a scholar who does not have R ---------------
   THE STANDARD LIBRARY AND NOTHING ELSE. The call this artifact answers asks
   for infrastructure "that other researchers have a reasonable chance of
   accessing", and the R script needs `boot` installed. This needs a python3
   and no package at all: least squares by normal equations, and the sign
   bootstrapped the same 2,000 times.

   Two differences from the R script, both stated in the file rather than left
   for a reader to discover:

     p is the BOOTSTRAP two-sided p and not the regression's t-test. The model
       proves a sign, the bootstrap is over the sign, and a p computed from the
       same resamples as the interval is one inferential object rather than two
       that can disagree. A t-test would need a t distribution, which the
       standard library has not got, and approximating one quietly with a
       normal is the kind of thing this page exists to refuse;
     the solve is Gauss-Jordan with partial pivoting, which is enough for the
       handful of columns a specification like this has, and says so if the
       columns are collinear instead of returning a number.

   The AMG-DATA line is byte-identical in shape to the R one, because the
   page's own reader parses either and a second format would be a second
   reader. */
function exportPyline(l, fill){
  const f = fill || {};
  const dir = l.res ? l.res.dir : (l.sim ? l.sim.dir : 0);
  const sign = dir > 0 ? "+" : dir < 0 ? "-" : "?";
  const bx = (l.bx && l.bx[l.x]) ? l.bx[l.x] : null;
  const L = [];
  L.push(`# Derived on the AMG Workbench, ${new Date().toISOString().slice(0, 10)}.`);
  L.push(`#`);
  L.push(`# WHAT THE MODEL PROVES`);
  L.push(`#   ${bufLab(l)}`);
  L.push(`#   ${l.text || "(no expression)"}`);
  if(l.res && l.res.verdict === "flat")
    L.push(`#   identically zero on the declared box: ${l.y} does not move with ${l.x} at all`);
  else if(l.res) L.push(`#   sign ${sign}, ${l.res.verdict}, on ${(100 * l.res.share).toFixed(1)}% of ` +
    `the declared box (${l.res.boxes} boxes searched)`);
  if(bx) L.push(`#   over ${l.x} in [${(+bx[0]).toFixed(4)}, ${(+bx[1]).toFixed(4)}]`);
  if(l.seg) L.push(`#   and only on ${l.seg[0]} in [${l.seg[1].toFixed(4)}, ${l.seg[2].toFixed(4)}]`);
  L.push(`#`);
  L.push(`# WHAT THIS SCRIPT DOES, AND WHAT IT DOES NOT`);
  L.push(`# It asks whether the sign above shows up in your data. That is not a test of the`);
  L.push(`# model: the model is conditional on declarations, and a regression is conditional`);
  L.push(`# on a sample and on everything left out of it. Agreement is one more reason to`);
  L.push(`# hold the proposition; disagreement locates a declaration to go back to. Neither`);
  L.push(`# is a verdict on the arithmetic, which was already settled by proof.`);
  L.push(`#`);
  L.push(`# Standard library only -- no numpy, no statsmodels, no pandas.`);
  L.push(`# p is the BOOTSTRAP two-sided p, from the same resamples as the interval,`);
  L.push(`# and not the regression's t-test: the standard library has no t distribution`);
  L.push(`# and approximating one with a normal would be a number nobody could stand behind.`);
  L.push(``);
  L.push(`import csv, random, sys`);
  L.push(``);
  L.push(`DATA     = ${pq(f.data || "your-data.csv")}`);
  L.push(`OUTCOME  = ${pq(f.outcome)}   # the column standing in for ${l.y || "the outcome"}`);
  L.push(`DRIVER   = ${pq(f.driver)}   # the column standing in for ${l.x || "the parameter"}`);
  L.push(`CONTROLS = [${(f.controls || []).map(pq).join(", ")}]   # yours to justify`);
  L.push(`EXPECTED = ${pq(sign)}   # the sign the model proves`);
  L.push(`DRAWS    = 2000`);
  L.push(``);
  L.push(`random.seed(20261023)   # so this script gives the same answer twice`);
  L.push(``);
  L.push(`def solve(A, b):`);
  L.push(`    """Gauss-Jordan with partial pivoting. Says so rather than guessing."""`);
  L.push(`    n = len(A)`);
  L.push(`    M = [row[:] + [b[i]] for i, row in enumerate(A)]`);
  L.push(`    for c in range(n):`);
  L.push(`        p = max(range(c, n), key=lambda r: abs(M[r][c]))`);
  L.push(`        if abs(M[p][c]) < 1e-12:`);
  L.push(`            return None   # collinear columns: no unique coefficient to report`);
  L.push(`        M[c], M[p] = M[p], M[c]`);
  L.push(`        d = M[c][c]`);
  L.push(`        M[c] = [v / d for v in M[c]]`);
  L.push(`        for r in range(n):`);
  L.push(`            if r != c and M[r][c]:`);
  L.push(`                k = M[r][c]`);
  L.push(`                M[r] = [v - k * w for v, w in zip(M[r], M[c])]`);
  L.push(`    return [M[i][n] for i in range(n)]`);
  L.push(``);
  L.push(`def ols(rows, cols):`);
  L.push(`    """The coefficient on the first column after the intercept."""`);
  L.push(`    k = len(cols) + 1`);
  L.push(`    A = [[0.0] * k for _ in range(k)]`);
  L.push(`    b = [0.0] * k`);
  L.push(`    for r in rows:`);
  L.push(`        x = [1.0] + [r[c] for c in cols]`);
  L.push(`        y = r["__y__"]`);
  L.push(`        for i in range(k):`);
  L.push(`            b[i] += x[i] * y`);
  L.push(`            for j in range(k):`);
  L.push(`                A[i][j] += x[i] * x[j]`);
  L.push(`    s = solve(A, b)`);
  L.push(`    return None if s is None else s[1]`);
  L.push(``);
  L.push(`if not OUTCOME or not DRIVER:`);
  L.push(`    sys.exit("fill in OUTCOME and DRIVER: a column standing in for a construct "`);
  L.push(`             "is a measurement decision and nothing here will guess it")`);
  L.push(``);
  L.push(`need = [OUTCOME, DRIVER] + CONTROLS`);
  L.push(`rows = []`);
  L.push(`with open(DATA, newline="") as fh:`);
  L.push(`    head = fh.readline()`);
  L.push(`    fh.seek(0)`);
  L.push(`    sep = "\\t" if head.count("\\t") > head.count(",") else ","   # .csv or .tsv`);
  L.push(`    rd = csv.DictReader(fh, delimiter=sep)`);
  L.push(`    miss = [c for c in need if c not in (rd.fieldnames or [])]`);
  L.push(`    if miss:`);
  L.push(`        sys.exit("%s has no column(s): %s" % (DATA, ", ".join(miss)))`);
  L.push(`    for raw in rd:`);
  L.push(`        try:`);
  L.push(`            v = {c: float(raw[c]) for c in need}`);
  L.push(`        except (TypeError, ValueError):`);
  L.push(`            continue   # the complete cases, same rule as the R script`);
  L.push(`        v["__y__"] = v[OUTCOME]`);
  L.push(`        rows.append(v)`);
  L.push(``);
  L.push(`if len(rows) < len(CONTROLS) + 3:`);
  L.push(`    sys.exit("only %d complete case(s) for %d column(s)" % (len(rows), len(need)))`);
  L.push(``);
  L.push(`cols = [DRIVER] + CONTROLS`);
  L.push(`b = ols(rows, cols)`);
  L.push(`if b is None:`);
  L.push(`    sys.exit("the columns you chose are collinear, so there is no single "`);
  L.push(`             "coefficient on %s to report" % DRIVER)`);
  L.push(``);
  L.push(`# The model proves a SIGN, so the sign is what is bootstrapped -- not the size,`);
  L.push(`# which is in the units of whatever columns you chose and is not what was proved.`);
  L.push(`n = len(rows)`);
  L.push(`draws = []`);
  L.push(`for _ in range(DRAWS):`);
  L.push(`    s = ols([rows[random.randrange(n)] for _ in range(n)], cols)`);
  L.push(`    if s is not None:`);
  L.push(`        draws.append(s)`);
  L.push(`draws.sort()`);
  L.push(`if len(draws) < DRAWS // 2:`);
  L.push(`    sys.exit("most resamples were collinear, so the interval would mean nothing")`);
  L.push(`lo = draws[int(0.025 * (len(draws) - 1))]`);
  L.push(`hi = draws[int(0.975 * (len(draws) - 1))]`);
  /* (1 + k) / (1 + B) and not k / B. A bootstrap in which no resample crossed
     zero gives p = 0, which is not a probability anybody should print: what it
     means is "smaller than this many draws can resolve", and the standard
     estimator says that instead of overstating it. */
  L.push(`k = min(sum(1 for d in draws if d <= 0), sum(1 for d in draws if d >= 0))`);
  L.push(`p = 2 * (1 + k) / (1 + len(draws))   # floored at what DRAWS can resolve`);
  L.push(`agrees = "yes" if (lo > 0 if EXPECTED == "+" else hi < 0) else "no"`);
  L.push(`if EXPECTED not in ("+", "-"):`);
  L.push(`    agrees = "unknown"`);
  L.push(``);
  if(l.res && l.res.verdict === "partial" && Array.isArray(l.flip)){
    L.push(`# The model proves the sign TURNS, inside [${l.flip[0].toFixed(4)}, ${l.flip[1].toFixed(4)}].`);
    L.push(`# A linear term cannot see a turning point, so the quadratic is the comparable test`);
    L.push(`# and the derived interval is what its vertex is read against.`);
    L.push(`for r in rows:`);
    L.push(`    r["__sq__"] = r[DRIVER] ** 2`);
    L.push(`k = len(CONTROLS) + 3`);
    L.push(`A = [[0.0] * k for _ in range(k)]`);
    L.push(`bb = [0.0] * k`);
    L.push(`qc = [DRIVER, "__sq__"] + CONTROLS`);
    L.push(`for r in rows:`);
    L.push(`    x = [1.0] + [r[c] for c in qc]`);
    L.push(`    for i in range(k):`);
    L.push(`        bb[i] += x[i] * r["__y__"]`);
    L.push(`        for j in range(k):`);
    L.push(`            A[i][j] += x[i] * x[j]`);
    L.push(`cq = solve(A, bb)`);
    L.push(`if cq and abs(cq[2]) > 1e-12:`);
    L.push(`    print("quadratic vertex at %s = %.4f; derived interval [${
      l.flip[0].toFixed(4)}, ${l.flip[1].toFixed(4)}]" % (DRIVER, -cq[1] / (2 * cq[2])))`);
    L.push(``);
  }
  L.push(`print("AMG-DATA %s  sign=%s  b=%.5g  ci=[%.5g, %.5g]  p=%.4g  n=%d  agrees=%s" % (`);
  L.push(`      ${pq((bufLab(l) || "").replace(/"/g, "'"))},`);
  L.push(`      "+" if b > 0 else "-", b, lo, hi, p, n, agrees))`);
  L.push(``);
  L.push(`# Paste that AMG-DATA line back into the bench, under "what came back from your`);
  L.push(`# data". It is RECORDED against this line and marked unverified: the bench did`);
  L.push(`# not run it, cannot see your data, and will not pretend either.`);
  return L.join("\n");
}

/* What came back. Recorded, attributed, and NOT believed. */
function wsDataIn(lineId, text){
  BUF.err = "";
  const l = bufFind(lineId);
  if(!l){ BUF.err = "select a line to record it against"; return; }
  const t = String(text || "").trim();
  if(!t){ BUF.err = "nothing pasted"; return; }
  if(t.length > 600){ BUF.err = "that is longer than a result line — paste the AMG-DATA line"; return; }
  const m = /agrees=(yes|no|unknown)/.exec(t);
  const n = /\bn=(\d+)/.exec(t);
  l.data = {text:t, at:new Date().toISOString().slice(0, 16).replace("T", " "),
    agrees:m ? m[1] : "unknown", n:n ? +n[1] : null};
  /* AND ONTO THE BOARD, WHICH IS WHAT TRAVELS. A buffer line is a working
     surface and stays out of the scenario on purpose; the board is not. A
     result returned from R or Python that was recorded only here would be
     shown on the row and lost on the next reload, reaching no file at all --
     including the deposit, which is specified to carry it. */
  const r = BOARD.rows.find(z => z.y === l.y && z.x === l.x);
  if(r){ r.data = Object.assign({}, l.data); boardSave(); }
  WS.din = "";
}
function wsDataHTML(l){
  if(!l.data) return "";
  const a = l.data.agrees;
  return `<div class="wsdat ${a === "no" ? "dis" : a === "yes" ? "agr" : ""}">
    <span class="wsdl">${a === "yes" ? "data agrees" : a === "no" ? "data disagrees" : "data recorded"}</span>
    <code>${hesc(l.data.text)}</code>
    <i class="bnote">Recorded ${hesc(l.data.at)}${l.data.n ? ", n = " + l.data.n : ""}. <b>Not
      verified here</b> — the bench did not run it and cannot see the data. It is your result,
      attributed to you, and it sits beside the proof rather than over it.</i>
  </div>`;
}

/* A row's own prove/sample runs the SAME command the palette runs, on the row
   clicked rather than on the selection -- so a row button is a shortcut and
   not a second implementation. Selecting first is what makes it one. */
function wsRun(cmd, lineId){
  const l = bufFind(lineId);
  if(!l){ BUF.err = "that line is gone"; return; }
  BUF.sel = l.id;
  bufRun(cmd, "");
}

/* ---- the per-row actions ------------------------------------------------
   The palette acts on the selected line and has fifteen commands. These four
   are the ones a row is for, put on the row so the common move is one click
   rather than select-then-find. */
function wsRowActs(l){
  if(l.bad) return "";
  const can = l.tree ? "" : " disabled";
  return `<div class="wsacts">
    <button type="button" class="edbtn" data-wsrun="sign|${hesc(l.id)}"${can}
      title="Interval arithmetic over the declared box. Proves, or says it could not.">prove</button>
    <button type="button" class="edbtn" data-wsrun="sim|${hesc(l.id)}"${can}
      title="A sweep. Evidence, not proof — it cannot see a dip between two of its points.">sample</button>
    <button type="button" class="edbtn" data-wssc="${hesc(l.id)}"
      title="The four quantities this page can compute, weighted by the criteria you declared.">score</button>
    <button type="button" class="edbtn" data-wsr="${hesc(l.id)}"
      title="An R script that asks whether the sign proved here shows up in your data. It writes the script, not the answer.">to R</button>
    ${WS.own.length ? `<select class="wsfs" data-wsfile="${hesc(l.id)}" aria-label="file this line">
      <option value=""${l.fold ? "" : " selected"}>unfiled</option>
      ${WS.own.map(f => `<option value="${hesc(f.id)}"${
        l.fold === f.id ? " selected" : ""}>${hesc(f.name)}</option>`).join("")}
    </select>` : ""}
  </div>`;
}

/* ---- wiring -------------------------------------------------------------
   UNCONDITIONAL, and that is deliberate. The last time a block of controls
   was hung inside `wire(key)` on the key of the step it belonged to, the
   steps were merged, the key stopped existing and twenty control families
   went dead in silence -- a querySelectorAll that matches nothing is not an
   error. A selector over #pbody finds nothing when its step is off screen,
   so there is no cost to not guarding this and one less condition to get
   wrong. */
function wireWorkspace(){
  /* Which menu is open is remembered because several commands inside them
     re-render the panel, and a scholar running three in a row should not have
     to reopen the menu between them. No render here: setting it IS the state
     the browser has already applied. */
  document.querySelectorAll("#pbody [data-wsmenu]").forEach(d =>
    d.addEventListener("toggle", () => {
      WS.menu = d.open ? d.dataset.wsmenu : (WS.menu === d.dataset.wsmenu ? "" : WS.menu);
    }));
  /* The four routes in. A panel toggles rather than opening a second copy:
     clicking the one already open closes it. */
  document.querySelectorAll("#pbody [data-wspop]").forEach(b =>
    b.addEventListener("click", () => {
      const k = b.dataset.wspop;
      WS.pop = WS.pop === k ? "" : k;
      renderPanel();
      /* Launched from the board, which is below the panel it opens, so the
         panel has to be brought into view or the click reads as doing
         nothing at all. */
      const el = document.querySelector("#pbody .wspanel, #pbody .wsbridge");
      if(el && WS.pop) el.scrollIntoView({block:"nearest"});
    }));
  document.querySelectorAll("#pbody [data-wsrall]").forEach(b =>
    b.addEventListener("click", ev => {
      const which = b.dataset.wsrall;
      const day = new Date().toISOString().slice(0, 10);
      /* ONE WRITER PER LANGUAGE AND NO THIRD PATH. The bridge fills the same
         writers' column names in; nothing here knows which engine will run it. */
      const py = WS.lang === "python";
      const write = l => py ? exportPyline(l) : exportRline(l);
      const ext = py ? ".py" : ".R", lang = py ? "Python" : "R";
      if(which === "sel"){
        const l = bufSel();
        if(!l) return;
        saveText(write(l), "check-" + l.id + "-" + day + ext, "text/plain", ev.currentTarget);
        xlog("dex", "Wrote a " + lang + " script", "for " + bufLab(l));
        return;
      }
      /* One file for the whole retained set. A scholar going to the data goes
         once, not once per finding, and a block per finding in one script is
         what makes the multiplicity visible: six blocks is six tests. */
      const kept = BOARD.rows.filter(r => r.keep);
      const ls = kept.map(r => BUF.lines.find(l => l.y === r.y && l.x === r.x)).filter(Boolean);
      if(!ls.length){ BUF.err = "nothing retained has a line still on the list to write from";
        renderPanel(); return; }
      const head = ["# " + ls.length + " retained finding" + (ls.length === 1 ? "" : "s") +
        " from the AMG Workbench, " + day + ".",
        "#",
        "# One block each. They are " + ls.length + " separate tests and this file is the",
        "# record of that: a set of findings taken to data together is a set of tests run",
        "# together, and reporting the one that worked without saying how many were run is",
        "# the thing a p-value cannot survive.", "", ""];
      saveText(head.join("\n") + ls.map(l => write(l)).join("\n\n\n"),
        "check-retained-" + day + ext, "text/plain", ev.currentTarget);
      xlog("dex", "Wrote a " + lang + " script", ls.length + " retained findings, one file");
    }));
  document.querySelectorAll("#pbody [data-wslang]").forEach(b =>
    b.addEventListener("click", () => { WS.lang = b.dataset.wslang; renderPanel(); }));
  /* The bridge's own controls, wired by the file that draws them. */
  wireBridge(renderPanel);
  document.querySelectorAll("#pbody [data-wsfold]").forEach(b =>
    b.addEventListener("click", () => {
      WS.fold = b.dataset.wsfold === WS.fold ? "" : b.dataset.wsfold;
      WS.err = ""; wsSave(); renderPanel();
    }));
  document.querySelectorAll("#pbody [data-wsdel]").forEach(b =>
    b.addEventListener("click", () => { wsDel(b.dataset.wsdel); renderPanel(); }));
  document.querySelectorAll("#pbody [data-wsadd]").forEach(b =>
    b.addEventListener("click", () => {
      const e = document.getElementById("wsnewn");
      wsAdd(e ? e.value : "");
      renderPanel();
      const f = document.getElementById("wsnewn");
      if(f && WS.err) f.focus();
    }));
  document.querySelectorAll("#pbody [data-wsclr]").forEach(b =>
    b.addEventListener("click", () => {
      WS.fold = ""; WS.q = ""; WS.err = ""; wsSave(); renderPanel();
    }));
  /* A search field has to filter as it is typed, and the panel is innerHTML,
     so the field is put back and the caret with it. Everything else on this
     bench reads on input and redraws on blur for exactly the opposite
     reason -- a caret in the middle of an expression must not move. */
  {
    const q = document.getElementById("wsq");
    if(q) q.addEventListener("input", () => {
      WS.q = q.value;
      renderPanel();
      const n = document.getElementById("wsq");
      // expected: setSelectionRange throws on an input with no selection to set
      if(n){ n.focus(); try{ n.setSelectionRange(n.value.length, n.value.length); }catch(e){} }
    });
    const nn = document.getElementById("wsnewn");
    if(nn) nn.addEventListener("keydown", ev => {
      if(ev.key !== "Enter") return;
      ev.preventDefault(); wsAdd(nn.value); renderPanel();
    });
    const di = document.getElementById("wsdin");
    if(di) di.addEventListener("input", () => { WS.din = di.value; });
  }
  document.querySelectorAll("#pbody [data-wsrun]").forEach(b =>
    b.addEventListener("click", () => {
      const [cmd, id] = b.dataset.wsrun.split("|");
      wsRun(cmd, id);
      xlog("buf", BCMDLOG[cmd] || cmd, BUF.err ? "refused: " + BUF.err : "on " + id);
      renderPanel();
    }));
  document.querySelectorAll("#pbody [data-wssc]").forEach(b =>
    b.addEventListener("click", () => {
      lineScoreRun(b.dataset.wssc);
      const l = bufFind(b.dataset.wssc);
      xlog("score", "Scored a line", BUF.err ? "refused: " + BUF.err
        : (l && l.score && !l.score.skip
            ? (l.score.ruledOut ? "ruled out by a criterion you declared must pass"
               : (100 * l.score.total).toFixed(0) + " of 100 under your criteria") : ""));
      renderPanel();
    }));
  document.querySelectorAll("#pbody [data-wsr]").forEach(b =>
    b.addEventListener("click", ev => {
      const l = bufFind(b.dataset.wsr);
      if(!l) return;
      saveText(exportRline(l), "check-" + b.dataset.wsr + "-" +
        new Date().toISOString().slice(0, 10) + ".R", "text/plain", ev.currentTarget);
      xlog("dex", "Wrote an R script", "for " + bufLab(l) +
        " — the script, not the answer: the bench cannot see your data");
    }));
  document.querySelectorAll("#pbody [data-wsfile]").forEach(sl =>
    sl.addEventListener("change", () => {
      wsFile(sl.dataset.wsfile, sl.value);
      renderPanel();
    }));
  document.querySelectorAll("#pbody [data-wscomb]").forEach(b =>
    b.addEventListener("click", () => {
      const op = (document.getElementById("wscop") || {}).value || "+";
      const other = (document.getElementById("wscb") || {}).value || "";
      const n0 = BUF.lines.length;
      wsCombine(BUF.sel, op, other);
      xlog("buf", BCMDLOG.comb, BUF.err ? "refused: " + BUF.err
        : (BUF.lines.length > n0 ? "one line added" : ""));
      renderPanel();
    }));
  document.querySelectorAll("#pbody [data-wsdin]").forEach(b =>
    b.addEventListener("click", () => {
      const e = document.getElementById("wsdin");
      wsDataIn(BUF.sel, e ? e.value : WS.din);
      const l = bufSel();
      xlog("data", BCMDLOG.data, BUF.err ? "refused: " + BUF.err
        : "against " + bufLab(l) + ", unverified by this page");
      renderPanel();
    }));
}


/* ---- the toolbar ---------------------------------------------------------
   Fifteen commands, three ways to put a line on the list, a combiner and the
   simplification level all sat UNDER the list as a wall of controls and prose
   -- which is how "what is this?" happens to three labelled textareas. The
   list is the step; these act on it; so they go above it, in menus, in the
   same <details class="menu"> the header's scenario menu already uses.

   The menu that is open is remembered for the session, because several of
   these commands re-render the panel and a scholar running three in a row
   should not have to reopen the menu between them. It is NOT persisted: a
   folder is a decision worth keeping across a reload and an open menu is not.

   Each group of commands is named by what it DOES rather than by the order
   the palette happened to list them in. */
const WSCMDG = [
  ["Write it differently", [["diff", "differentiate in", "bdiffn"], ["simp", "simplify", null],
    ["sub", "substitute", "bsubn"], ["outcome", "write out", "boutn"]]],
  ["Settle a sign", [["sign", "sign it over the box", null], ["sim", "sample the sign", null],
    ["where", "where does it hold?", null], ["flip", "find the turning point", null],
    ["noise", "run it with error of", "bnsd"]]],
  ["Past a corner", [["split", "split where they cross, along", "bsplitn"]]],
  ["Take it further", [["cs", "comparative static on", "bcsn"], ["rests", "what it rests on", null],
    ["state", "state it", null]]],
];
function wsToolsHTML(P){
  const men = (key, label, title, body, wide) => `<details class="menu wsmenu"
      data-wsmenu="${key}"${WS.menu === key ? " open" : ""}>
    <summary class="tabbtn" title="${hesc(title)}">${label}</summary>
    <div class="menupop${wide ? " wsp" : ""}">${body}</div>
  </details>`;
  const arg = id => id === "bdiffn" ? P.SEL("bdiffn", P.dn)
    : id === "bcsn" ? P.SEL("bcsn", P.cn)
    : id === "boutn" ? P.SEL("boutn", P.outs)
    : id === "bsplitn" ? P.SEL("bsplitn", P.dnS)
    : id === "bsubn" ? `<input id="bsubn" type="text"
        placeholder="k_clarity := 2 * k_meaning" aria-label="the substitution"${
        P.can.sub ? " disabled" : ""}>`
    : id === "bnsd" ? `<input id="bnsd" type="number" step="0.01" min="0" max="0.5"
        value="${NOISE.sd}" aria-label="idiosyncratic error, as a share of each range"${
        P.can.noise ? " disabled" : ""}>`
    : "";
  const cmds = WSCMDG.map(([g, rows]) => `<div class="wscg">
      <span class="wscgl">${hesc(g)}</span>
      ${rows.map(([c, lab, a]) => a
        ? `<span class="bpg">${P.B(c, lab)}${arg(a)}</span>`
        : P.B(c, lab)).join("")}
    </div>`).join("") + `<p class="why wscgw">A command reads the <b>selected</b> line and either
      appends an expression or marks that line. Running one <b>is</b> the decision, and one that
      cannot apply here is greyed with its reason on it rather than failing when you click.
      <b>State it</b> is the one that leaves this step.</p>`;

  const add = `<div class="wsadd">
    <div class="wsai">
      <span class="ctl-label">By hand</span>
      <p class="why">An expression you write. Read against the same grammar as everything else,
        so a name nothing declared is refused by name. It arrives <b>unsigned</b>.</p>
      <textarea class="defbox bufbox" id="bufhand" ${P.ready ? "" : "disabled"}
        placeholder="${P.ready ? "purpose_clarity_factor / (k_clarity + purpose_clarity_factor)"
          : "nothing to read it against until step 3.1 has kept an arithmetic"}">${
        hesc(BUF.hand || "")}</textarea>
      <div class="cmpacts" style="margin:5px 0 0">
        <button type="button" data-bcmd="write"${P.can.write ? ` disabled title="${
          hesc(P.can.write)}"` : ""}>read it onto the list</button>
      </div>
    </div>
    <div class="wsai">
      <span class="ctl-label">From Mathematica, SymPy or any algebra tool</span>
      <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Send a line out with the export buttons, do the algebra wherever you do
        algebra, and paste the answer back. It is read against the grammar and then
        <b>checked by interval</b> over the declared box — so an answer from Mathematica gets
        exactly the treatment an answer from a language model gets, and a refuted answer stays
        on the list, because it is a result.</span></p>
      <textarea class="defbox bufbox" id="bufimp" ${P.ready ? "" : "disabled"}
        placeholder="${P.ready ? "(a - c) / (2 * a)"
          : "nothing to check it against until step 3.1 has kept an arithmetic"}">${
        hesc(BUF.imp || "")}</textarea>
      <div class="cmpacts" style="margin:5px 0 0">
        <button type="button" data-bimp="same"${P.can.same ? ` disabled title="${
          hesc(P.can.same)}"` : ""}>same expression as the selected line?</button>
        <button type="button" data-bimp="stat"${P.can.stat ? ` disabled title="${
          hesc(P.can.stat)}"` : ""}>a stationary point of it?</button>
      </div>
    </div>
  </div>`;

  const sel = bufSel();
  const others = BUF.lines.filter(l => l.tree && (!sel || l.id !== sel.id));
  const comb = `<div class="wscomb">
    <span class="mblab">combine</span>
    <b>${sel && sel.tree ? hesc(bufLab(sel)) : "select a line"}</b>
    <select id="wscop" aria-label="the operator">${WSOPS.map(([o]) =>
      `<option value="${o}">${o}</option>`).join("")}</select>
    <select id="wscb" aria-label="with which line"${others.length ? "" : " disabled"}>${
      others.map(l => `<option value="${hesc(l.id)}">${hesc(bufLab(l))}</option>`).join("")
      || `<option value="">nothing else to combine with</option>`}</select>
    <button type="button" data-wscomb="1"${
      sel && sel.tree && others.length ? "" : " disabled"}>as a new line</button>
  </div>
  <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">An operator over two expressions is an expression; it is <b>not</b> a
    proposition, so the line arrives unsigned. Two lines proved on different parts of a range
    cannot be combined — the result would be about neither.</span></p>`;

  return `<div class="wstools">
    ${men("add", "Add a line", "Put an expression on the list: written by hand, or returned from an algebra tool. A result from data goes on under Find evidence in data.", add, true)}
    ${men("cmds", "Commands", "The fifteen commands, on the line selected below", cmds, true)}
    ${men("comb", "Combine", "Two lines and an operator, which is a line", comb, true)}
    <span class="wssimp">
      <span class="mblab">simplify</span>
      ${SIMPL.map(([k, w]) => `<button type="button" data-lvl="${k}"
        aria-pressed="${(PROPS.lvl || "full") === k}" title="${hesc(w)}">${k}</button>`).join("")}
    </span>
  </div>`;
}

/* ---- what populates the workspace ---------------------------------------
   The list arrives EMPTY and four things fill it, so those four are a toolbar
   of their own above everything else, with derive as the primary because it
   is the one that works from nothing. Before this, derive was a small button
   among six exports inside a block called "the derivation", and the other
   three routes in -- data, the class search, the ranking -- were somewhere
   else entirely, under a heading called "Ask for more". That is three places
   to look for one question: how do I get something on this list.

   The agent is here, named and disabled, because the alternative is leaving a
   hole where a reader cannot tell whether it was considered. The same idiom
   as the second literature and the model import: say what it would do and why
   it is not here.

   A panel opens under the toolbar rather than in a popover: what these show
   is a result to read, not a form to fill. */
/* "design" is here so the toolbar's pressed state and the panel below it
   agree about which is open; the button itself exists only when a bridge
   offered the route. */
const WSPOPS = ["evidence", "search", "score", "design"];
function wsPopHTML(){
  const on = k => WS.pop === k ? " aria-pressed=\"true\"" : "";
  const nb = BOARD.rows.filter(r => r.keep).length;
  return `<div class="wspop">
    <button type="button" class="wsbig" data-derive="1" title="${PROPS.out
      ? "Rebuilds the list from the automatic pass. Anything derived by hand since is dropped, because the model it was derived against may have changed."
      : "Walks every outcome against every parameter it depends on, and fills the list with the result"}">${
      PROPS.out ? "Derive again" : "Derive"}</button>
    <button type="button" data-wspop="evidence"${on("evidence")}
      title="Write the R script that would look for this sign in a dataset, and record what comes back.">Find evidence in data</button>
    <button type="button" data-wspop="search"${on("search")}
      title="Walk the class your declarations admit, looking for a configuration with a named property.">Search in a defined direction</button>
    <button type="button" data-wspop="score"${on("score")}
      title="Rank what is on the list and what was proposed, on the four quantities this page can compute, under criteria you declare in Settings.">Score the findings${
      nb ? "" : ""}</button>
    ${bridgeAgentBtnHTML()}
    ${wsSetHTML()}
  </div>
  ${WS.pop === "evidence" ? wsEvidenceHTML()
    : WS.pop === "search" ? `<div class="wspanel">${searchBlockHTML()}</div>`
    : WS.pop === "score" ? `<div class="wspanel">${wsScorePanelHTML()}</div>`
    : WS.pop === "design" ? bridgeDesignHTML() : ""}`;
}

/* The settings: three things that govern every verdict and every rank below
   them, and none of which is a command. They were spread down the step --
   the minimum effect at the top, the method beside derive, the criteria four
   hundred words further down next to the ranking they govern. */
/* WHAT YOU WANT RANKED FIRST, as its own surface.
   This was buried inside the Settings menu, two levels down from the step, so
   the one place on the bench where a scholar declares their own criteria was
   also the hardest to find. It is on the help strip at the top of the
   Findings tab now, where the model's help is offered. Settings
   keeps everything else it had. */
function wsRankHTML(){
  return `
      <div class="wsai">
        <span class="ctl-label">Scoring criteria ${infold(`Yours to declare.`)}</span>
        <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Interestingness, relevance, novelty, policy bite — which of those you
          mean is contested, so this page supplies none of them. It supplies <b>four quantities
          it can compute</b>. Write what you want favoured in your own words; it compiles into
          weights over those four, is shown before it applies, and <b>whatever none of the four
          reaches is named rather than approximated onto the nearest one</b>. Until you write
          something all four weigh equally — a default, not a decision anybody took.</span></p>
        <div class="chain saxlist">${SAXES.map(([a, lab, long]) => `<div class="crow arow">
          <span class="cst">${a}</span>
          <span class="cnm">${hesc(lab)}<span class="cfl">${
            a === "composition" ? "the ablation lattice" : ""}</span></span>
          <span class="cwy">${hesc(long)}${a === "composition"
            ? ". The one with a relationship behind it: switch each mechanism off alone and then in pairs, because 82 consequents in this corpus carry two or more distinct causes from independent papers, and a loop that only ablates singletons reports that neither of a substituting pair mattered."
            : a === "material" ? ". The minimum is the slider above." : ""}</span>
        </div>`).join("")}</div>
        <textarea class="defbox" id="defbox" placeholder="What I want ranked first is ... (for example: it has to clear the minimum effect at all, and after that I care most about predictions nobody has already asserted and that need more than one mechanism to hold. I also care whether it is relevant to a board, which I know you cannot compute.)">${hesc(SCORE.defn || "")}</textarea>
        <div class="cmpacts" style="margin:6px 0 0">
          ${AI.cap ? `<button type="button" data-ai="defn" ${
            AI.busy || !(SCORE.defn || "").trim() ? "disabled" : ""}
            title="Reads what you wrote above and returns weights over the four quantities this page can compute, saying which of your criteria it could not express.${AITIP}">${aiMark()}${
            AI.busy === "defn" ? "reading…" : "turn this into weights"}</button>` : ``}
          ${SCORE.rule ? `<button type="button" data-scedrop="1">back to equal weights</button>` : ``}
        </div>
        ${aiErrHTML("defn")}
        ${AI.rule ? `<div class="chain prop"><div class="crow prow">
          <span class="cst part">${aiMark()}compiled</span>
          <span class="cnm">your criteria<span class="cfl">${SAXES.map(([a]) =>
            a + " " + ((AI.rule.weights || {})[a] || 0)).join(" · ")}${
            AI.rule.require.length ? " · must pass " + AI.rule.require.join(", ") : ""}</span></span>
          <span class="pacts2">
            <button type="button" class="edbtn" data-scok="1">Accept</button>
            <button type="button" class="edbtn" data-scno="1">Dismiss</button>
          </span>
          <span class="cwy">${hesc(AI.rule.note || "")}${AI.rule.unreachable.length
            ? `<br><b style="color:var(--neg)">Not computed, and not ranked:</b> ${
                AI.rule.unreachable.map(hesc).join("; ")}. None of the four quantities reaches
              those, so they had no effect on any order below and are carried into the deposit
              as declared-and-unranked.` : `<br>Every part of what you wrote reached at least
              one of the four — unusual enough to be worth rereading what you wrote.`}</span>
        </div></div>` : ""}
        ${SCORE.rule ? `<div class="chain"><div class="crow prow">
          <span class="cst ok">declared</span>
          <span class="cnm">your criteria<span class="cfl">${SAXES.map(([a]) =>
            a + " " + ((SCORE.rule.weights || {})[a] || 0)).join(" · ")}${
            SCORE.rule.require.length ? " · must pass " + SCORE.rule.require.join(", ") : ""}</span></span>
          <span class="cwy">${hesc(SCORE.rule.note || "")}${(SCORE.rule.unreachable || []).length
            ? ` <b>Declared and not ranked:</b> ${SCORE.rule.unreachable.map(hesc).join("; ")}.` : ""}</span>
        </div></div>` : ""}
      </div>`;
}

function wsSetHTML(){
  return `<details class="menu wsmenu wsset" data-wsmenu="set"${WS.menu === "set" ? " open" : ""}>
    <summary class="tabbtn" title="What a verdict is measured against, how a sign is settled, and what you want ranked first">Settings</summary>
    <div class="menupop wsp">
      <div class="wsai">
        <span class="ctl-label">How a sign is settled</span>
        <p class="why">Interval arithmetic proves and may shrug; sampling cannot prove and
          rarely shrugs. Together each checks the other.</p>
        <select id="mthsel" aria-label="How to settle a sign">${
          MTHS.map(([k, lab]) => `<option value="${k}"${
            MTH.how === k ? " selected" : ""}>${lab}</option>`).join("")}</select>
      </div>
      ${MR.model ? `<div class="wsai">
        <span class="ctl-label">How big a difference the theory is about</span>
        <p class="why">Declared, not computed — <code>the kernel</code>'s
          <code>minimum_effect</code>. Below it a verdict is <i>unresolved</i>: neither a pass
          nor a failure.</p>
        <div class="minbar" style="margin:0">
          <span class="mblab">worth having from</span>
          <input type="range" class="mbslide" id="cMatter" min="0" max="10" step="0.5"
                 value="${state.matter}"
                 aria-label="Smallest difference the theory is taken to be about">
          <span class="sv" id="vMatter">${state.matter ? state.matter.toFixed(1) + "% of value" : "any"}</span>
        </div>
      </div>` : ""}
    </div>
  </details>`;
}

/* The data route, at the level of the workspace rather than one row's menu:
   write the script, run it where the data is, bring the line back. */
function wsEvidenceHTML(){
  const sel = bufSel(), kept = BOARD.rows.filter(r => r.keep);
  const withData = BUF.lines.filter(l => l.data).length;
  return `<div class="wspanel">
    <div class="embhd">
      <span class="ctl-label">Find evidence in data</span>
      <span class="pcount">${withData
        ? `<b>${withData}</b> line${withData === 1 ? "" : "s"} carry a recorded result`
        : "nothing recorded yet"}</span>
    </div>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">The page cannot see your data, so it writes <b>the script and not the
      answer</b>: the sign that was proved, the box it was proved on, and a bootstrap of the
      <i>sign</i> rather than of the coefficient — the size is in the units of whatever columns
      you choose and is not what was proved. Every column name is left empty, because a column
      standing in for a construct is a measurement decision. <b>To R</b> on any row writes it
      for that line.</span></p>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">This is not a test of the model. The model is conditional on declarations and
      a regression is conditional on a sample; neither is a verdict on the other. Agreement is
      one more reason to hold a proposition, disagreement locates a declaration to go back to.</span></p>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx"><b>On this literature, expect to supply the data yourself.</b>
      <code>reconcile.py</code> counted it: across 1,080 relationships, <b>no relation</b> is estimated
      first-hand, with a magnitude, by two teams sharing no author — three relations are
      touched by two or more papers, two survive first-hand-with-magnitude, <b>none</b> by
      independent teams. A literature that argues about purpose continuously has never measured
      the same thing twice, so the published record cannot corroborate this model. That is a
      finding, not a gap in this page.</span></p>
    <div class="cmpacts" style="margin:8px 0 0">
      ${BRIDGE.on ? "" : bridgeOffHTML()}
      <button type="button" data-wsrall="sel"${sel && sel.tree ? "" : " disabled"}
        title="The script for the line selected on the list">script for ${
        sel && sel.tree ? hesc(bufLab(sel)) : "the selected line"}</button>
      <button type="button" data-wsrall="board"${kept.length ? "" : " disabled"}
        title="One file, with a block per retained finding, so a session's worth of findings goes to the data in one pass">one script for all <b>${kept.length}</b> retained</button>
      <span class="mblab" style="align-self:center">in</span>
      <div class="presets" style="align-self:center">
        <button type="button" data-wslang="r"${WS.lang === "r" ? ' aria-pressed="true"' : ""}
          title="Needs the boot package">R</button>
        <button type="button" data-wslang="python"${WS.lang === "python" ? ' aria-pressed="true"' : ""}
          title="The standard library only — no package to install, and the bootstrap p rather than a t-test">Python</button>
      </div>
    </div>
    ${BRIDGE.on ? bridgePanelHTML() : ""}
    <div class="wsai" style="margin-top:11px">
      <span class="ctl-label">What came back</span>
      <p class="why">Pasted against the line selected on the list. <b>Recorded, not checked</b> —
        attributed, dated, marked unverified, and it travels in the exports that way.</p>
      <textarea class="defbox bufbox" id="wsdin"
        placeholder="AMG-DATA ∂welfare / ∂purpose_clarity  sign=+  b=0.0412  ci=[0.011, 0.073]  p=0.0038  n=1240  agrees=yes">${
        hesc(WS.din || "")}</textarea>
      <div class="cmpacts" style="margin:5px 0 0">
        <button type="button" data-wsdin="1"${sel ? "" : " disabled"}>record against ${
          sel ? hesc(bufLab(sel)) : "the selected line"}</button>
      </div>
    </div>
  </div>`;
}

function wsScorePanelHTML(){
  return `<div class="embhd">
      <span class="ctl-label">Score the findings</span>
      <span class="cmpacts" style="margin:0">
        <button type="button" data-screrun="1" ${
          SCORE.prop.length || (PROPS.out && PROPS.out.props.some(keptPlot))
            ? "" : "disabled"}>${SCORE.rows ? "score again" : "score what is stated"}</button>
      </span>
    </div>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Two kinds, ranked together: propositions stated on the list, carrying the proof
      they earned, and proposals from an LLM, carrying nothing. <b>The LLM is not asked which of
      them matter</b> — an answer handed its own hypothesis comes back confirmed. The criteria
      are in <b>Settings</b>; until you write some, all four weigh equally.</span></p>
    ${SCORE.err ? `<p class="why" style="color:var(--neg)">${hesc(SCORE.err)}</p>` : ""}
    ${aiErrHTML("predict")}
    ${SCORE.rows && SCORE.rows.length ? scoreRowsHTML()
      : `<p class="empty">Nothing ranked yet. ${AI.cap
          ? "Derive and state something, or ask for candidates; the ranking is what sorts them."
          : "This needs the sampling capability, which this view does not have."}</p>`}`;
}

/* What a retained finding can be taken to next, which is NOT what step 4.1
   does to it. Seven draws each one over the domain it was proved on. These
   are the moves that still belong to the making of them. */
function boardLaunchHTML(){
  const kept = BOARD.rows.filter(r => r.keep);
  if(!kept.length) return "";
  return `<div class="wslaunch">
    <span class="mblab">from here</span>
    <button type="button" data-wspop="search">search the class for another like these</button>
    <button type="button" data-wspop="evidence">look for them in data</button>
    <button type="button" data-wspop="score">rank them against your criteria</button>
    <span class="wslw">Step 4.1 draws each one over the domain its sign was proved on, and
      decides which are findings you would publish. These three are still about <i>making</i>
      them.</span>
  </div>`;
}

export { WS, wsRankHTML, WSCMDG, WSKEY, WSKIND, WSOPS, WSPOPS, WSSTATE, boardLaunchHTML, exportPyline, exportRline, lineScoreHTML, lineScoreRun, wireWorkspace, wsAdd, wsBarHTML, wsCombine, wsCount, wsDataHTML, wsDataIn, wsDel, wsEvidenceHTML, wsFile, wsFoldName, wsLines, wsLoad, wsMatch, wsOwn, wsPopHTML, wsPred, wsRailHTML, wsRowActs, wsRun, wsSave, wsScorePanelHTML, wsSetHTML, wsToolsHTML };

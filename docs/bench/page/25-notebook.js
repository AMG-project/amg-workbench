/* AMG bench, page script: the notebook — an order somebody chose, with the reading between.
   One shared global scope, loaded in order. See page/README.md.

   Step 4.1's second tab listed ten things a notebook here would hold and said
   that seven of them the bench produces and three it does not: the ORDER, the
   PROSE between the cells, and the FILE. Those three are what a notebook
   actually is. Without them the tab was a description of a feature.

   WHY NOT A REAL NOTEBOOK, which is the first question and is answered in the
   tab itself: JupyterLite, Observable and Starboard take arbitrary prose and
   arbitrary code, which reopens the one door this instrument closed -- a cell
   could assert anything and nothing would check it -- and the smallest of them
   is tens of megabytes of wasm against a page that is one file.

   SO A CELL POINTS RATHER THAN CLAIMS. Every cell but one is a reference to
   something this bench derived, and the file renders what it points at from
   the model as it stands. A cell cannot say the sign was proved: it names the
   finding, and the number beside it comes from the derivation. The one cell
   that is not derived from anything is the scholar's prose, and it is marked
   as theirs -- which is the whole division the bench is built on, applied to a
   document.

   AND THE ORDER IS A DECISION, so it is recorded like one: it travels in the
   scenario, it goes in the decision record, and a reader of the file can see
   that somebody chose this sequence rather than taking whatever order the
   derivation happened to produce.

   THE FILE IS MARKDOWN. Not HTML: a notebook here is read, quoted and diffed,
   and the five other things that leave this page are a .tsv, a .py, two .json
   and a .amg.json -- plain text every one. A drawn finding comes out as the
   band strip the page draws under the axis, in characters, because that strip
   IS the region and not a picture of it. */
import { BOARD, boardKept, propClause, xlog } from "./05-explore.js";
import { EXPSETS } from "../core/expset.js";
import { PROPS } from "./09-derive.js";
import { BENCH, CORPUS, PROV, scenCur } from "./17-scenarios.js";
import { carriedClaims } from "./12-claims.js";
import { depsOf } from "./10-depends.js";
import { lbl } from "./15-deposit.js";
import { lsRead, lsWrite } from "./03-stores.js";
import { saveText, stamp } from "./16-worklists.js";
import { xrunClause } from "../core/verdict.js";

/* WHAT A CELL CAN BE. Seven kinds that point at something derived, and one
   that is the author's own words. `of` says what a cell of that kind is
   ABOUT, which is what the picker has to offer: a retained finding, an
   accepted answer, or nothing at all. */
const NBKIND = [
  ["words",   "A finding, in words", "finding",
   "the sentence, its verdict, how much of the declared range its sign was proved over, and how much of the declared class of forms agrees"],
  ["drawn",   "A finding, drawn", "finding",
   "the same finding as the band strip the page draws under the axis, so the region its sign holds on is in the file rather than described in a caption"],
  ["moved",   "One parameter, moved", "finding",
   "what moving this parameter on its own does, and the mechanism declarations that reach it"],
  ["undec",   "What could not be decided", "none",
   "every derivative the method left undecided, how much of the range that was, and whether a turning point was located in it"],
  ["claimed", "What the papers claimed", "finding",
   "for each mechanism the finding rests on: the relationships behind it, the sign each asserted, and the restriction its own paper stated"],
  ["mynote",  "A note of your own", "finding",
   "the note you wrote on this finding at step 3.2, attributed to you and stamped with the day"],
  ["ask",     "The record of an ask", "ask",
   "the prompt sent and the answer returned, in full, for a proposal a model made and you accepted"],
  ["note",    "Your own prose", "prose",
   "the reading. The one part of a notebook that is not derived from anything, and so the one part marked as the author's"],
];
const nbKind = k => NBKIND.find(x => x[0] === k) || null;
const nbOf = k => (nbKind(k) || [, , "none"])[2];

const NB = {cells:[], seq:0, title:"", pick:"words"};
const NBKEY = "purposeNotebook";

function nbSave(){
  lsWrite(NBKEY, {cells:NB.cells, seq:NB.seq, title:NB.title});
}
function nbLoad(){
  const v = lsRead(NBKEY);
  if(!v || typeof v !== "object") return;
  NB.cells = Array.isArray(v.cells) ? v.cells.filter(nbOk) : [];
  NB.seq = +v.seq || NB.cells.length;
  NB.title = String(v.title || "").slice(0, 160);
}
/* Checked on the way in, because this is read back out of a browser store and
   out of a scenario file somebody else wrote. A cell of an unknown kind would
   render as nothing and be impossible to remove. */
const nbOk = c => !!(c && typeof c === "object" && nbKind(c.kind));
const nbSnap = () => NB.cells.length || NB.title
  ? {cells:NB.cells, seq:NB.seq, title:NB.title} : null;
function nbTake(o){
  NB.cells = []; NB.seq = 0; NB.title = "";
  if(o){
    NB.cells = (o.cells || []).filter(nbOk);
    NB.seq = +o.seq || NB.cells.length;
    NB.title = String(o.title || "").slice(0, 160);
  }
  nbSave();
}

function nbAdd(kind, at){
  if(!nbKind(kind)) return null;
  const c = {id:"n" + (++NB.seq), kind, at:String(at || ""), text:""};
  NB.cells.push(c);
  nbSave();
  return c;
}
function nbMove(id, d){
  const i = NB.cells.findIndex(c => c.id === id);
  const j = i + d;
  if(i < 0 || j < 0 || j >= NB.cells.length) return false;
  const t = NB.cells[i]; NB.cells[i] = NB.cells[j]; NB.cells[j] = t;
  nbSave();
  return true;
}
function nbDrop(id){
  const i = NB.cells.findIndex(c => c.id === id);
  if(i < 0) return false;
  NB.cells.splice(i, 1);
  nbSave();
  return true;
}
function nbSet(id, field, v){
  const c = NB.cells.find(x => x.id === id);
  if(!c) return false;
  if(field === "text") c.text = String(v || "").slice(0, 4000);
  else if(field === "at") c.at = String(v || "");
  else return false;
  nbSave();
  return true;
}

/* ------------------------------------------------- what a cell points at */
const nbRow = at => BOARD.rows.find(r => r.id === at) || null;
const nbProp = r => {
  const P = PROPS.out;
  if(!P || !r) return null;
  return P.props.find(p => p.y === r.y && p.x === r.x && !p.err) || null;
};
const nbLabel = c => {
  const of = nbOf(c.kind);
  if(of === "finding"){
    const r = nbRow(c.at);
    return r ? (r.text || (r.y + " in " + r.x)) : "no finding chosen";
  }
  if(of === "ask"){
    const p = PROV[+c.at];
    return p ? (p.what || "an ask") + " · " +
      String(p.at || "").slice(0, 16).replace("T", " ") : "no ask chosen";
  }
  if(of === "prose") return (c.text || "").trim()
    ? (c.text.trim().slice(0, 70) + (c.text.trim().length > 70 ? "…" : ""))
    : "nothing written yet";
  return "the whole list";
};
/* A cell that points at nothing cannot be rendered, and the panel says so
   rather than the file coming out short. */
const nbBad = c => {
  const of = nbOf(c.kind);
  if(of === "finding") return !nbRow(c.at) ? "no finding chosen" : "";
  if(of === "ask") return !PROV[+c.at] ? "no ask chosen" : "";
  if(of === "prose") return (c.text || "").trim() ? "" : "nothing written yet";
  return "";
};

/* ============================================================= the file */
/* The band strip, in characters. The page draws 96 cells under the axis and
   this is the same 96: # where the sign was proved, x where it runs the other
   way, and a dot where the search left it open. A reader with the axis bounds
   above it can read the region straight off. */
const BANDCH = {p:"#", f:"x", o:".", m:"~"};
const bandStrip = bands => (bands || []).map(b => BANDCH[b] || ".").join("");

const n4 = x => (typeof x === "number" && isFinite(x)) ? (Math.round(x * 1e4) / 1e4) : x;
const pct = x => (100 * (+x || 0)).toFixed(1) + "%";

/* THE SENTENCE AS THE MODEL GIVES IT NOW, where it still gives one.

   A board row carries the sentence it was taken with, and that is the record.
   But the file says at the top that every part is rendered from the model as it
   stands, so a sentence frozen at the moment it was retained would make that
   false -- and on the shipped worked example it is visibly false: those rows
   were recorded before the sentence builder stopped writing "over 75.0% of for
   every", and the old wording is in the payload.

   So the sentence is rebuilt where the derivation still produces the finding,
   the recorded one stands where it does not, and a row whose verdict has MOVED
   says both. Nothing is silently replaced. */
function nbSay(r, p){
  if(!p) return {say:r.text || (r.y + " in " + r.x), fresh:false};
  try{
    const l = {y:r.y, x:r.x, bx:{[r.x]:(p.xbox || [0, 1]).slice()},
      res:{dir:p.dir, verdict:p.verdict, share:p.share, open:p.open, witness:p.witness}};
    const s = propClause(l);
    return s ? {say:s, fresh:true} : {say:r.text || (r.y + " in " + r.x), fresh:false};
  }catch(e){ return {say:r.text || (r.y + " in " + r.x), fresh:false}; }
}

function mdWords(r, p){
  const s = nbSay(r, p);
  const L = ["**" + s.say + "**", ""];
  L.push("- verdict: **" + (r.verdict || "none recorded") + "**" +
    (r.share != null ? ", proved over " + pct(r.share) + " of the declared range" : "") +
    (r.open ? ", " + pct(r.open) + " of it left open by the search" : ""));
  if(p && r.verdict && p.verdict && p.verdict !== r.verdict)
    L.push("- **the model now says " + p.verdict + "**, where this was retained as " +
      r.verdict + ". The row records what it said when it was taken; this is what it " +
      "says today.");
  if(!p) L.push("- *the model as it stands no longer derives this, so the line above is " +
    "the sentence as it was recorded*");
  L.push("- method: " + (r.method || "not recorded") +
    (r.src && r.src !== "auto" ? ", source: " + r.src : ""));
  if(r.forms && r.forms.of)
    L.push("- class of forms: " + xrunClause(r.forms, EXPSETS));
  else
    L.push("- class of forms: not read against the declared class");
  if(r.guess) L.push("- expected before deriving: " + r.guess +
    (r.agree === false ? " — **against what was expected**" : r.agree ? ", and it agreed" : ""));
  L.push("- round " + r.round + ", taken " + r.at);
  return L;
}
function mdDrawn(r, p){
  if(!p) return ["*" + (r.text || r.y + " in " + r.x) +
    ": the model as it stands no longer derives this, so there is no region to draw.*"];
  const b = p.xbox || [0, 1];
  const L = ["**" + nbSay(r, p).say + "**, over " + r.x +
    " in [" + n4(b[0]) + ", " + n4(b[1]) + "]", "", "```"];
  L.push(bandStrip(p.bands));
  L.push(String(n4(b[0])).padEnd(48) + String(n4(b[1])).padStart(48));
  L.push("```");
  L.push("");
  L.push("`#` the sign was proved here · `x` it runs the other way · " +
    "`.` the search left it open · `~` the cell holds more than one answer");
  if(p.flip) L.push("");
  if(p.flip) L.push("A turning point was located at " + r.x + " ≈ " +
    n4(p.flip.at != null ? p.flip.at : p.flip));
  return L;
}
function mdMoved(r, p){
  const L = ["**Moving " + r.x + " on its own**, with everything else held", ""];
  if(!p) { L.push("*The model as it stands no longer derives this.*"); return L; }
  L.push("- " + r.y + " " + (p.dir > 0 ? "rises" : p.dir < 0 ? "falls" : "does not move") +
    " with " + r.x + " where the sign is settled" +
    (p.share != null ? " (" + pct(p.share) + " of the range)" : ""));
  if((p.cs || []).length){
    L.push("- at the stationary point, the comparative statics on each weight:");
    for(const c of p.cs) L.push("    - " + c.k + ": " +
      (c.sign > 0 ? "moves it up" : c.sign < 0 ? "moves it down" : "sign not settled"));
  }
  const d = nbDeps(r);
  if(d && (d.used || []).length)
    L.push("- the mechanisms it rests on: " +
      d.used.map(u => String(u.lhs).replace(/^t_/, "").replace(/_/g, " ")).join(", "));
  if(d && (d.idle || []).length)
    L.push("- switching off " + d.idle.map(u =>
      String(u.lhs).replace(/^t_/, "").replace(/_/g, " ")).join(" or ") +
      " alone does not move the verdict");
  return L;
}
function mdUndec(){
  const P = PROPS.out;
  if(!P) return ["*Nothing has been derived, so nothing is undecided.*"];
  const open = P.props.filter(p => !p.err &&
    (p.verdict === "undecided" || p.verdict === "partial"));
  if(!open.length && !P.props.some(p => p.err))
    return ["Every derivative this model produced was settled over the whole declared range."];
  const L = [];
  for(const p of open) L.push("- **" + p.y + " in " + p.x + "**: " + p.verdict +
    (p.share != null ? ", proved over " + pct(p.share) : "") +
    (p.open ? ", " + pct(p.open) + " left open" : "") +
    (p.flip ? ", with a turning point located in it" : ", with no turning point located"));
  for(const p of P.props.filter(x => x.err))
    L.push("- **" + p.y + (p.x ? " in " + p.x : "") + "**: refused — " +
      String(p.err).replace(/\s+/g, " ").slice(0, 300));
  return L;
}
/* The claims behind the mechanisms a finding rests on, with the sign each
   asserted and the restriction its own paper stated. `unstated` is a value: in
   this corpus 380 of 1080 claims state no scope, which is a finding about the
   literature. */
function mdClaimed(r, p){
  const d = nbDeps(r);
  const want = new Set((d && d.used ? d.used : [])
    .filter(u => u.rel).map(u => String(u.rel.id)));
  const rows = carriedClaims();
  const by = new Map();
  for(const x of rows){
    const k = String((x.e || {}).id || "");
    if(want.size && !want.has(k)) continue;
    if(!by.has(k)) by.set(k, {e:x.e, cl:[]});
    by.get(k).cl.push(x.c);
  }
  if(!by.size) return ["*No relationship in this corpus stands behind the mechanisms this " +
    "finding rests on, which is itself worth saying.*"];
  const L = ["**What the papers claimed, under " + nbSay(r, p).say + "**", ""];
  for(const g of by.values()){
    L.push("- " + lbl(g.e.source) + " → " + lbl(g.e.target));
    for(const c of g.cl){
      L.push("    - " + (c.g || "no sign") + ", " + (c.e || "no basis") +
        " (" + (c.p || "no paper") + "): " + String(c.t || "").replace(/\s+/g, " "));
      L.push("      scope as the paper stated it: " +
        (c.sc && !/^unstated$/i.test(c.sc) ? String(c.sc).replace(/\s+/g, " ") : "*unstated*"));
    }
  }
  return L;
}
function mdMyNote(r){
  if(!r.anno) return ["*No note was written on " +
    (r.text || (r.y + " in " + r.x)) + " at step 3.2.*"];
  return ["> " + String(r.anno).replace(/\n/g, "\n> "), "",
    "*Written by the scholar on " + (r.annoAt || "an unrecorded day") + ", about " +
    (r.text || (r.y + " in " + r.x)) + ". Not derived from anything.*"];
}
function mdAsk(i){
  const p = PROV[+i];
  if(!p) return ["*That ask is no longer in the record.*"];
  return ["**An ask: " + (p.what || "unnamed") + "**, " +
      String(p.at || "undated").slice(0, 16).replace("T", " "), "",
    "The prompt, in full:", "", "```", String(p.prompt || "").trim(), "```", "",
    "What came back, in full:", "", "```", String(p.answer || "").trim(), "```", "",
    "*Proposed by a model and accepted by the scholar. The page checked it " +
    "against the declared vocabulary before it was written.*"];
}

/* depsOf wants a line with a tree, and a board row has none: the line it came
   from is not kept across a reload. So the dependency walk is asked for once
   per export and cached, because it rebuilds and re-signs the model per
   mechanism and a notebook can name the same finding in three cells. */
let DEPC = new Map();
function nbDeps(r){
  if(!r || !r.y || !r.x) return null;
  const k = r.y + "|" + r.x;
  if(DEPC.has(k)) return DEPC.get(k);
  let out = null;
  const p = nbProp(r);
  if(p && p.d1){
    try{ const d = depsOf({y:r.y, x:r.x, tree:p.d1, res:{dir:p.dir, verdict:p.verdict,
      share:p.share}}); out = d && !d.err ? d : null; }catch(e){ out = null; }
  }
  DEPC.set(k, out);
  return out;
}

function nbMarkdown(){
  DEPC = new Map();
  const cur = scenCur() || {};
  const L = [];
  L.push("# " + (NB.title.trim() || "An action model, read"));
  L.push("");
  L.push("*" + (cur.name ? cur.name + " · " : "") + "bench " + BENCH.v +
    (CORPUS && CORPUS.commit ? " · corpus " + CORPUS.commit : "") +
    " · written " + new Date().toISOString().slice(0, 16).replace("T", " ") + "*");
  L.push("");
  L.push("Every part of this but the prose is a reference to something the workbench " +
    "derived, rendered from the model as it stands when the file was written. The prose " +
    "is the author's and is marked as such. The order is the author's too, and it is in " +
    "the decision record.");
  L.push("");
  for(const c of NB.cells){
    const kind = nbKind(c.kind);
    L.push("---");
    L.push("");
    if(c.kind === "note"){
      L.push(String(c.text || "").trim() || "*(nothing written)*");
      L.push("");
      continue;
    }
    L.push("## " + kind[1]);
    L.push("");
    const of = nbOf(c.kind);
    const r = of === "finding" ? nbRow(c.at) : null;
    if(of === "finding" && !r){ L.push("*No finding was chosen for this part.*"); L.push(""); continue; }
    const p = r ? nbProp(r) : null;
    const body = c.kind === "words"   ? mdWords(r, p)
      : c.kind === "drawn"   ? mdDrawn(r, p)
      : c.kind === "moved"   ? mdMoved(r, p)
      : c.kind === "undec"   ? mdUndec()
      : c.kind === "claimed" ? mdClaimed(r, p)
      : c.kind === "mynote"  ? mdMyNote(r)
      : c.kind === "ask"     ? mdAsk(c.at)
      : ["*(nothing)*"];
    for(const ln of body) L.push(ln);
    L.push("");
    if(String(c.text || "").trim()){
      L.push(String(c.text).trim());
      L.push("");
    }
  }
  if(!NB.cells.length){
    L.push("*This notebook has no parts yet.*");
    L.push("");
  }
  L.push("---");
  L.push("");
  L.push("*" + NB.cells.length + " part" + (NB.cells.length === 1 ? "" : "s") + ", " +
    NB.cells.filter(c => c.kind === "note").length + " of them the author's prose. " +
    "The findings, the regions and the relationships come from the workbench; the reading does " +
    "not.*");
  return L.join("\n") + "\n";
}

async function exportNotebook(btn){
  const nm = ((scenCur() || {}).name || "notebook").replace(/[^\w.-]+/g, "-").toLowerCase();
  const r = await saveText(nbMarkdown(), `${nm}-notebook-${stamp()}.md`,
    "text/markdown", btn);
  xlog("export", "Exported the notebook",
    NB.cells.length + " part" + (NB.cells.length === 1 ? "" : "s") + " in the order you " +
    "chose, " + NB.cells.filter(c => c.kind === "note").length + " of them your own prose");
  return r;
}

export { NB, NBKIND, exportNotebook, nbAdd, nbBad, nbDeps, nbDrop, nbKind, nbLabel,
  nbLoad, nbMarkdown, nbMove, nbOf, nbProp, nbRow, nbSave, nbSet, nbSnap, nbTake };

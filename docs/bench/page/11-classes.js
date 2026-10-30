/* AMG bench, page script 12 of 22: the declared class, enumerated.
   One shared global scope, loaded in order. See page/README.md. */
import { asamples, asweep, runAt } from "../core/invariants.js";
import { hesc, numText } from "../core/safe.js";
import { evalRPN, readExpr, rpnTree } from "../core/kernel.js";
import { ALINE, ARITH, AWGT, CLS, abnd, aiMark, arithSig, arithToText, bdec, buildArith, classSpec, keptModel, parseArith, shapeVerdict, takeArith, treeHTML, wdec, xinv } from "./08-ask.js";
import { ASPECTS, COMPOSITIONS, FORMPROPS, INVARIANTS, KINDS, MEMBERS_ALL, ROLES, SRCLAB, composedPaths, groups, gsaveLocal, handName, mclm, memberCount, propClash, rulesOf, targetOf, vtype } from "./03b-decisions.js";
import { passWho } from "./05-explore.js";
import { FORM_ENDS, addFamily, allFams, famByName, famOf, famSave, famsFor, lineCheck, memberSrc, needLab, sweepUnit, xfam } from "./10-depends.js";
import { MR } from "../model-report.js";
import { LIT, litList, litSave } from "./27-streams.js";
import { STREAMS, joinSides, streamLabel, carriedRelations, carriedVars, crossGroups, handListHTML, joinBlockHTML, propsOf, reconGroupHTML, roleOf, rolesOf, streamOfId, vAspects, vKinds, xjoinDo, xstream } from "./07-grouping.js";
import { byEvidence, claimGroupHTML, composedGroupHTML, kindOf, statementsInPlay } from "./12-claims.js";
;
import { lastView } from "./13-map.js";
import { refresh } from "./14-boot.js";
import { relName, renderPanel } from "./06-wiring.js";
import { scenCur } from "./17-scenarios.js";
import { state } from "./03-stores.js";
import { G } from "../graph-data.js";
/* ---- the class, enumerated ------------------------------------------- */
/* A family is the declaration and a member is only what runs. Until now the
   conformance suite answered the declaration by running ONE member, which is
   the stipulation a family exists to replace: declare increasing and concave,
   pick sqrt, get a proof, and the other four members of saturating were never
   put through anything.

   So rebuild the model with each member in turn and run the same shape
   obligations against each. Nothing is sampled that was not sampled before
   and nothing is proved that was not proved before -- what changes is how
   many bodies the declaration is answered for, which is the whole difference
   between exploring a class and taking the tractable member out of it.

   THE READER MATTERS AND THE ROW SAYS SO. Members are written on [0, 1],
   which is the kernel's endpoint rule; a reader declared over some other box
   runs them outside the interval they were written for, and a sigmoid past
   its top end turns over. That is a finding about the declaration and not a
   bug in the member, so it is reported rather than corrected.

   A line written by hand has no family, and that is reported too: a declared
   shape with a hand-written body is one function, not a class, and knowing
   how much of a model is in that state is worth a row of its own. */
/* The same model with one line rewritten. Built from M.steps, so it does not
   matter whether the arithmetic was asked for, typed out, or kept earlier. */
function respec(M, term, rhs){
  return buildArith({constants:M.consts,
    lines:M.steps.map(x => ({lhs:x.lhs, rhs:x.lhs === term ? rhs : x.py, why:x.why}))});
}
function classCheck(M, r, term){
  const cur = famOf(term), f = cur ? famByName(cur.fam) : null;
  const props = propsOf(r);
  if(!M || !f || !props.length || !cur.reader) return null;
  const free = M.params.includes(r.from);
  const out = {fam:f.fam, reader:cur.reader, running:cur.member, swept:free,
    box:abnd(r.from), props:props, rows:[]};
  /* The scale as a number, for the branch that sweeps a member on its own:
     the member's source knows only X, so a named weight in front of it has to
     be resolved before it can be read in a scope of one name. */
  let scaleN = 1;
  if(cur.scale) try{
    const S = Object.create(null);
    for(const c of M.consts) S[c.name] = c.value;
    const v = evalRPN(readExpr(cur.scale, new Set(M.consts.map(c => c.name))).rpn, S);
    if(typeof v === "number" && isFinite(v)) scaleN = v;
  /* expected: a scale this page cannot resolve to a number leaves scaleN at
     one, and the row below says the member was run on its own. The fallback
     IS the reported answer, so there is nothing hidden to record. */
  }catch(e){ /* left at one, and the row says the member was run on its own */ }
  for(const m of f.members){
    let rows;
    if(free){
      /* The running member keeps the full proof effort it had on its own row.
         The others get a shallower search, because fourteen members at depth
         seven is a wait and an undecided verdict costs nothing here -- the
         sweep still answers, and the row says which answer it got. */
      try{ rows = lineCheck(respec(M, term, memberSrc(m[1], cur, out.box)), r, term,
             m[0] === cur.member ? null : {depth:5, boxes:90}).rows; }
      catch(e){ out.rows.push({name:m[0], ok:false, tested:0,
          why:"could not be run: " + ((e && e.message) || "unknown")}); continue; }
    }else{
      /* The reader is written by something upstream, so the model cannot be
         swept in it and lineCheck says so rather than guessing. The obligation
         is still about the member as a function of what it reads, so sweep the
         MEMBER over the box its reader is declared on. Sampled and the row
         says so -- the first version of this took lineCheck's shrug for a pass
         and reported that five members held an obligation none of them had
         been put to, which is the one failure mode this bench exists against. */
      /* On the unit interval, not on the reader's box: the member reads a
         NORMALISED reader now, so [0, 1] is the range it is actually given. */
      try{ const w = sweepUnit(scaleN === 1 ? m[1]
             : "(" + scaleN + ") * (" + m[1] + ")");
        rows = props.map(p => { const v = shapeVerdict(p, w);
          return {ok:v.ok, skip:!!v.skip, n:p,
            why:v.ok ? "held at 25 points of the member alone" : v.why}; }); }
      catch(e){ out.rows.push({name:m[0], ok:false, tested:0,
          why:"could not be run: " + ((e && e.message) || "unknown")}); continue; }
    }
    const live = rows.filter(x => !x.skip), broke = live.filter(x => !x.ok);
    out.rows.push({name:m[0], ok:!broke.length, tested:live.length,
      proved:live.some(x => x.proved), dflt:live.some(x => x.dflt),
      why:broke.length ? broke.map(x => x.n + " — " + x.why).join("; ")
        : live.length ? "" : "nothing the declaration asks could be run against it"});
  }
  return out;
}
/* One row per term whose shape is declared: is every member of the class it
   was declared from consistent with it, or only the member that happens to
   be in the text. */
function formRows(M){
  const out = [];
  CLS.rows = {}; CLS.at = new Date().toISOString().slice(0, 16).replace("T", " ");
  for(const r of M.rels){
    const term = M.terms.get(r.id);
    if(!term || !M.steps.some(x => x.lhs === term)) continue;
    const props = propsOf(r);
    if(!props.length) continue;
    const c = classCheck(M, r, term);
    if(!c){
      out.push({k:"forms:" + term, n:term.slice(0, 46), group:"forms",
        cls:"no family", ok:true, skip:true,
        why:"its shape is declared and its body was written by hand, so what runs is one " +
          "function rather than a class. Picking a family on its row is what makes the " +
          "other members reachable."});
      continue;
    }
    CLS.rows[term] = c;            // what the rows above the sheet read back
    const bad = c.rows.filter(x => !x.ok), pv = c.rows.filter(x => x.proved).length;
    const none = c.rows.every(x => !x.tested);
    const unit = c.box[0] === 0 && c.box[1] === 1;
    out.push({k:"forms:" + term, n:term.slice(0, 46), group:"forms",
      cls:c.fam + " · " + c.rows.length + " members",
      ok:!bad.length, skip:none,
      why:none
        ? `nothing ${props.join("+")} asks could be run against its members here`
        : (bad.length
          ? `${bad.length} of ${c.rows.length} members break ${props.join("+")}: ` +
            bad.map(x => x.name + " (" + x.why + ")").join("; ")
          : `all ${c.rows.length} members are ${props.join("+")}` +
            (c.swept ? " in the model" : " as functions of what they read — the model " +
              "cannot be swept in a quantity something else writes, so each member was run " +
              "on its own") +
            (pv ? `, ${pv} of them with a sign obligation proved over the whole box` +
                  (c.rows.some(x => x.dflt)
                    ? " — though that box is this page's 0 to 1 default and not a bound " +
                      "anybody declared, so the scope is the page's rather than yours"
                    : ", not sampled")
                : ", at 24 points each")) +
        /* This used to warn that the members were written for [0, 1] while the
           reader ran over something else, which was true and was the bug --
           formExpr maps the reader on now, so the clause said the opposite of
           what the page does. */
        (unit ? "." : `. Its reader runs over [${c.box[0]}, ${c.box[1]}], and each member is ` +
          `applied to it mapped onto [0, 1] — which is what makes the family's endpoint ` +
          `properties properties of this term and not of the member alone.`)});
  }
  return out;
}
/* The members, shown where the choice was made. The one running carries a
   dot, because a conclusion is about the class and the dot is what it is not
   about. */
function clsStripHTML(c){
  const bad = c.rows.filter(x => !x.ok), none = c.rows.every(x => !x.tested);
  const held = c.rows.filter(x => x.ok && x.tested).length;
  return `<span class="cwy clsrow"><b>${held} of ${
    c.rows.length}</b> members of <code>${hesc(c.fam)}</code> hold ${
    hesc(c.props.join("+"))} ${c.rows.map(x =>
      `<span class="mem ${!x.tested ? "na" : x.ok ? (x.proved ? "pv" : "ok") : "no"}" title="${
        hesc(!x.tested ? x.why : x.ok
          ? (x.proved ? (x.dflt
                          ? "a sign obligation proved over the page's default box, the rest at 24 points"
                          : "a sign obligation proved over the declared box, the rest at 24 points")
                      : "held at 24 points") : x.why)}">${hesc(x.name)}${
        x.name === c.running ? " ∙" : ""}</span>`).join("")} ${none
      ? "— nothing the declaration asks could be run against them here."
      : bad.length
      ? "— " + hesc(bad.map(x => x.name + ": " + x.why).join("; "))
      : "— so the conclusion is about the class and not about the member running."}</span>`;
}

/* A curve, because writing a functional form is the one place where looking
   at it beats reading about it. */
/* One row per mechanism: what it is declared to be, which family carries
   that, which member runs first, whether it holds, and the curve. The family
   is the declaration and the member is only what runs -- the other members
   are there to be swept, which is the difference between exploring a class
   and picking the tractable one out of it. */
/* What a name is computed as, typeset. The text below is the editable
   surface and this is the readable one: the same line, and you change it
   either by picking a family on its row or by typing in the text. */
function lineEq(M, lhs){
  if(!M) return "";
  const st = M.steps.find(x => x.lhs === lhs);
  if(!st) return `<span class="mu">not written</span>`;
  // NOT simplified: this is the model as written, and the text below says the
  // same thing. Collecting it here would leave the two surfaces disagreeing,
  // and would hide which family member a line came from -- the saturating
  // exponential collects into a constant times a bracket and stops looking
  // like the member it is. Simplification is step 3.2's, where it is a
  // declared level over a derivative rather than a silent rewrite of a model.
  let t;
  try{ t = rpnTree(st.rpn); }catch(e){ return hesc(st.py); }
  return `<span class="meq">${treeHTML(t)}</span>`;
}

/* What an outcome does, and what it returns. The term rows had a curve and
   the outcomes did not, which is the wrong way round: the outcome is the
   thing whose shape anybody cares about. Swept over the first free parameter
   that moves it, which is named on the row so the picture is not mistaken
   for a picture of everything. */
function outSweep(M, k){
  const vn = varName(k);
  if(!M || !M.steps.some(x => x.lhs === vn)) return null;
  for(const p of M.params){
    const w = asweep(M, p, vn, 24);
    const f = w.ys.filter(v => typeof v === "number" && isFinite(v));
    if(f.length > 1 && Math.max.apply(null, f) - Math.min.apply(null, f) > 1e-12)
      return {w, x:varName(p), flat:false};
  }
  const p0 = M.params[0];
  return p0 ? {w:asweep(M, p0, vn, 24), x:varName(p0), flat:true} : null;
}
function outValues(M, k){
  const vn = varName(k), pts = asamples(M, 0);
  const at = p => { const v = runAt(M, p, null)[vn];
    return (typeof v === "number" && isFinite(v)) ? +v.toFixed(4) : null; };
  return {lo:at(pts[0].p), mid:at(pts[2].p), hi:at(pts[1].p)};
}

/* One row per mechanism, and one per outcome, which used to be one function
   and one block. They are two now because they are about two different
   things -- a mechanism is a relation, an outcome is a quantity -- and step
   3.1 reads better split by the object than by which control came from where.

   The mechanism row also carries the ROLE and SHAPE chips now. They were a
   second row per mechanism in a block of their own, which showed the same
   relation twice: once to declare what it does and over what shapes, and
   once to show which family carries that shape and which member runs. One
   row, declaration and consequence side by side. */
function mechRowsHTML(){
  const rels = carriedRelations(), nm = mechNames(rels);
  const M = ARITH.prop ? ARITH.prop.M : keptModel();
  if(!rels.length) return "";
  return `<div class="chain" style="margin-top:10px">${rels.map(r => {
    const term = "t_" + nm.get(r.id), props = propsOf(r);
    const fams = famsFor(props), cur = famOf(term);
    const lc = M ? lineCheck(M, r, term) : {rows:[], xs:null, ys:null};
    const broke = lc.rows.filter(x => !x.ok && !x.skip);
    const fam = cur ? famByName(cur.fam) : null;
    return `<div class="crow trow">
      <span class="cst ${!M ? "part" : broke.length ? "gap" : "ok"}">${
        !M ? "unchecked" : broke.length ? "breaks"
          : (lc.rows.length && lc.rows.every(x => x.proved || x.skip) &&
             lc.rows.some(x => x.proved)) ? "proved" : "holds"}</span>
      <span class="cnm">${passWho("r:" + r.id) === "claude" ||
        passWho("p:" + r.id) === "claude"
        ? `<span class="aiwho" title="A model proposed this and you have not changed it since. The record says so.">${
          aiMark("proposed by a model")}</span>` : ""}${
        hesc(handName(r.from))} <b>→</b> ${hesc(handName(r.to))}<span
        class="cfl">${hesc(term).slice(0, 44)} · ${SRCLAB[r.src] || r.src}${
        r.papers ? " · " + r.papers + "p" : ""}</span></span>
      <!-- The two declarations, where the relation they are about is. They were a
           second row per mechanism in a block of their own, which showed the same
           relation twice. The six on the left say what it DOES, which is what makes
           it ablatable; the six on the right are the class of shapes it runs over. -->
      <span class="roles">${ROLES.map(([k, lab, why]) =>
        `<button type="button" class="sup pick${rolesOf(r).includes(k) ? " on" : " none"}"
          data-setrole="${hesc(r.id)}|${k}"
          title="${hesc(lab + " — " + k + "() — " + why)}">${lab}</button>`).join("")}</span>
      <span class="roles props">${FORMPROPS.map(f =>
        `<button type="button" class="sup pick${props.includes(f.k) ? " on" : " none"}"
          data-setprop="${hesc(r.id)}|${f.k}"
          title="${hesc(f.n + " — " + f.why)}">${f.k}</button>`).join("")}<span class="sup ${
        propClash(props).length ? "none" : props.length ? "on" : "none"}">${
        propClash(props).length ? propClash(props)[0]
          : memberCount(props) + "/" + MEMBERS_ALL}</span></span>
      <span class="fsel">
        <select class="modsel" data-fam="${hesc(term)}|${hesc(varName(r.from))}"
                aria-label="Family for ${hesc(term)}">
          <option value="">written by hand</option>
          ${fams.map(f => `<option value="${f.fam}"${cur && cur.fam === f.fam ? " selected" : ""}>${
            f.fam} · ${f.corpus.c} relationships, ${f.corpus.p} papers</option>`).join("")}
        </select>
        ${fam ? `<select class="modsel" data-mem="${hesc(term)}|${hesc(varName(r.from))}|${fam.fam}"
                  aria-label="Member for ${hesc(term)}">
          ${fam.members.map(m => `<option value="${m[0]}"${
            m[0] === cur.member ? " selected" : ""}>${m[0]}</option>`).join("")}
        </select>` : ""}
        ${sparkHTML(lc.xs, lc.ys)}
      </span>
      <span class="cwy">${M ? `<div class="eqwrap"><span class="eqlhs">${
        hesc(term).slice(0, 40)} =</span> ${lineEq(M, term)}</div>` : ""}${broke.length
        ? hesc(broke.map(x => x.n + " — " + x.why).join("; "))
        : fam ? `${cur.how === "read" ? `<b>Recognised.</b> Nobody declared the family; this
            line <i>is</i> the <code>${hesc(cur.member)}</code> member of it, read off the
            expression, so the class it belongs to is answerable. ` : ""}`
          + hesc(fam.why) + ` <b>${fam.members.length} members</b>, all agreeing at both ends,
            so swapping one moves the shape and not the scale.${CLS.rows[term] ? ""
              : ` Running the conditions below puts every one of them through the same
                  obligations.`}`
        : props.length && !fams.length
          ? `No family here carries ${hesc(props.join(" and "))}. Write it by hand, or widen the
             class on step 3.1.`
        : props.length
          ? `${fams.length} famil${fams.length === 1 ? "y carries" : "ies carry"} what step 3.1
             declared for it. Picking one makes the shape a declaration rather than a stipulation.`
        : `Declare a shape on step 3.1 and the families that carry it appear here.`}</span>
      ${CLS.rows[term] ? clsStripHTML(CLS.rows[term]) : ""}
    </div>`;
  }).join("")}</div>`;
}

/* ONE row per outcome, not one per outcome per mechanism. This had an outer
   `rels.map(r => ...)` wrapped round the whole list, left behind when the row
   stopped being a per-mechanism row: `r` was never read inside it, so the
   effect was silent -- the two outcomes of the demo were drawn three times
   because three relations are carried, and a curation carrying ten would have
   drawn them ten times. */
function outRowsHTML(){
  const rels = carriedRelations();
  const M = ARITH.prop ? ARITH.prop.M : keptModel();
  if(!rels.length) return "";
  return `<div class="chain" style="margin-top:10px">${outcomeVars().map(k => {
    const rs = rulesOf(k), writers = rels.filter(x => x.to === k);
    const vn = varName(k), written = M && M.steps.some(x => x.lhs === vn);
    const sw = written ? outSweep(M, k) : null;
    const val = written ? outValues(M, k) : null;
    return `<div class="crow trow out">
      <span class="cst ${!M ? "part" : written ? "ok" : "gap"}">${
        !M ? "unchecked" : written ? "outcome" : "missing"}</span>
      <span class="cnm">${hesc(handName(k))}<span class="cfl">${hesc(vn)} · ${
        writers.length} ${writers.length === 1 ? "mechanism writes" : "mechanisms write"} it · ${
        rs.length ? hesc(rs.join(" or ")) : "composition not declared"}</span></span>
      <span class="roles">${sw ? `<span class="ovals" title="at every parameter's low bound, midpoint and high bound">${
        val.lo == null ? "?" : val.lo} \u2192 ${val.mid == null ? "?" : val.mid} \u2192 ${
        val.hi == null ? "?" : val.hi}</span>${sparkHTML(sw.w.xs, sw.w.ys, 72, 22)}` : ""}${
      COMPOSITIONS.map(([c, lab, why]) =>
        `<button type="button" class="sup pick${rs.includes(c) ? " on" : " none"}"
          data-setcomp="${hesc(k)}|${c}" title="${hesc(lab + " — " + c + " — " + why)}"
          >${lab}</button>`).join("")}</span>
      ${sw && !sw.flat ? `<span class="cwy swlab">curve over ${hesc(sw.x)}, the others at their
        midpoints</span>` : sw ? `<span class="cwy swlab">flat in every free parameter</span>` : ""}
      <span class="cwy">${M && written ? `<details class="eqfold"><summary>show the formula</summary><div class="eqwrap"><span class="eqlhs">${hesc(vn)} =</span> ${
        lineEq(M, vn)}</div></details>` : ""}${!M
        ? `Nothing is written yet. Pick a family on each mechanism above, or open the text.`
        : !written
        ? `No line is written for it, so the model returns nothing here.`
        : rs.length ? `` : `How its terms aggregate is not declared, so what is written is
          whatever the line says rather than something the declarations fix.`}</span>
    </div>`;
  }).join("")}</div>`;
}


/* The parameter table a specification has and this step did not. Free
   inputs with the box step 3.1 declared for them, and weights with the
   interval the proofs run over -- which was editable only by typing it into
   the text, for the one quantity the generated file calls the thinnest thing
   in it. A box nobody declared says so, because [0, 1] is this page's
   default and holding arithmetic to a default is how a decision nobody took
   becomes a result. */
function setWeightRange(name, lo, hi){
  const lines = String(ARITH.text != null ? ARITH.text : arithToText()).split("\n");
  for(let i = 0; i < lines.length; i++){
    const m = ALINE.exec(lines[i].replace(/#.*$/, ""));
    if(!m || m[1] !== name) continue;
    const w = AWGT.exec(m[2]);
    if(!w) return;
    const ok = isFinite(lo) && isFinite(hi) && +lo < +hi;
    lines[i] = name + " = " + w[1] + (ok ? " in [" + +lo + ", " + +hi + "]" : "");
    ARITH.text = lines.join("\n");
    takeArith(parseArith(ARITH.text), true);
    return;
  }
}
/* The families, listed and extensible. Shown with the shape every member
   shares, how many members there are, and what attests it -- a count from the
   corpus for the three that came with the model, and nothing for one added
   here, which is the honest entry. */
const FAMNEW = {open:false, name:"", need:["f(0)=0", "f(1)=1"], text:"", why:"", err:""};
/* The list as an overlay. It was inlined under step 3.1's arithmetic, where it
   was always on screen whether or not anybody was choosing a shape -- and the
   place a shape IS chosen is step 3.1, several steps earlier. So: a button
   where the choosing happens, and the reference behind it. */
function openFams(){
  const dlg = document.getElementById("famdlg");
  if(!dlg) return;
  const fs = allFams();
  const w = document.getElementById("famwhat");
  if(w) w.textContent = `${fs.length} famil${fs.length === 1 ? "y" : "ies"} \u00b7 ` +
    `${fs.reduce((n, f) => n + f.members.length, 0)} members \u00b7 ` +
    `${fs.filter(f => f.mine).length} added here`;
  document.getElementById("fambody").innerHTML = famListHTML();
  wireFamControls("#fambody", openFams);
  if(!dlg.open) dlg.showModal();
}
/* The list's own controls, wired against whatever is hosting it. Called once
   per render by the panel and once per open by the dialog, so `redraw` says
   which of the two to re-render afterwards. */
function wireFamControls(root, redraw){
  const Q = sel => [...document.querySelectorAll(root + " " + sel)];
  Q("[data-famnew]").forEach(b => b.addEventListener("click", () => {
    FAMNEW.open = !FAMNEW.open; FAMNEW.err = ""; redraw();
  }));
  Q("[data-famneed]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.famneed, i = FAMNEW.need.indexOf(k);
    if(i < 0) FAMNEW.need.push(k); else FAMNEW.need.splice(i, 1);
    redraw();
  }));
  /* The three text inputs carry ids rather than data attributes, so they are
     found under the host rather than by getElementById -- which would have
     found the panel's copy while the dialog was the one on screen. */
  [["famname", "name"], ["fammem", "text"], ["famwhy", "why"]].forEach(([id, k]) => {
    const e = document.querySelector(root + " #" + id);
    if(e) e.addEventListener("input", () => { FAMNEW[k] = e.value; });
  });
  Q("[data-famadd]").forEach(b => b.addEventListener("click", () => {
    const r = addFamily(FAMNEW.name, FAMNEW.need, FAMNEW.text, FAMNEW.why);
    if(r.err) FAMNEW.err = r.err;
    else { FAMNEW.open = false; FAMNEW.name = ""; FAMNEW.need = ["f(0)=0", "f(1)=1"];
           FAMNEW.text = ""; FAMNEW.why = ""; FAMNEW.err = ""; }
    refresh(); redraw();
  }));
  Q("[data-famdel]").forEach(b => b.addEventListener("click", () => {
    xfam.delete(b.dataset.famdel); famSave(); refresh(); redraw();
  }));
}

function openJoin(){
  const dlg = document.getElementById("joindlg");
  if(!dlg) return;
  const A = xstream("cur"), B = xstream("rights");
  const S = joinSides();
  const w = document.getElementById("joinwhat");
  if(w) w.textContent = `${A.length} ${S.a.name} \u00b7 ${B.length} ${S.b.name} \u00b7 ` +
    `${crossGroups().length} joined`;
  document.getElementById("joinbody").innerHTML = joinBlockHTML();
  wireJoinControls("#joinbody");
  if(!dlg.open) dlg.showModal();
}
/* Same shape as wireFamControls and for the same reason: the block is hosted
   outside the panel now, and a second copy of these handlers is how a pair of
   functions came to be declared twice eleven thousand lines apart. */
function wireJoinControls(root){
  const Q = sel => [...document.querySelectorAll(root + " " + sel)];
  Q("[data-xjoin]").forEach(b => b.addEventListener("click", () => {
    xjoinDo(); refresh(); openJoin(); renderPanel();
  }));
  /* WHICH TWO LITERATURES THE JOIN IS BETWEEN, drawn only where there are more
     than two to choose from. Changing a side repartitions both columns, which
     is why it redraws rather than only recording. */
  Q("[data-joinside]").forEach(sel => sel.addEventListener("change", () => {
    const k = sel.dataset.joinside;
    LIT.join[k] = sel.value;
    /* Never the same literature on both sides: a join of something with itself
       is a merge, and that is step 1.2's. */
    if(LIT.join.a === LIT.join.b){
      const other = litList().find(x => x.id !== sel.value);
      LIT.join[k === "a" ? "b" : "a"] = other ? other.id : "";
    }
    litSave();
    refresh(); renderPanel();
  }));
  Q("[data-xdrop]").forEach(b => b.addEventListener("click", () => {
    groups.delete(b.dataset.xdrop); gsaveLocal(); refresh(); openJoin(); renderPanel();
  }));
}
function wireJoin(){
  const dlg = document.getElementById("joindlg");
  if(!dlg || dlg.dataset.wired) return;
  dlg.dataset.wired = "1";
  const cl = document.getElementById("joinclose");
  if(cl) cl.addEventListener("click", () => dlg.close());
}

function wireFams(){
  const dlg = document.getElementById("famdlg");
  if(!dlg || dlg.dataset.wired) return;
  dlg.dataset.wired = "1";
  const cl = document.getElementById("famclose");
  if(cl) cl.addEventListener("click", () => dlg.close());
}

function famListHTML(){
  const fs = allFams();
  const chip = (on, lab, attr) =>
    `<button type="button" class="sup pick${on ? " on" : " none"}" ${attr}>${lab}</button>`;
  return `<div class="embhd" style="margin-top:16px">
    <span class="ctl-label">Families of forms</span>
    <span class="cmpacts" style="margin:0">
      <button type="button" data-famnew="1">${FAMNEW.open ? "cancel" : "add a family"}</button>
    </span>
  </div>
  <p class="lgloss">the classes a shape can be declared from — three came with the model, and
    the set is yours to extend</p>
  <div class="chain">${fs.map(f => `<div class="crow">
    <span class="cst ${f.mine ? "part" : "ok"}">${f.mine ? "yours" : "built in"}</span>
    <span class="cnm">${hesc(f.fam)}<span class="cfl">${hesc(needLab(f))} · ${
      f.members.length} member${f.members.length === 1 ? "" : "s"}${f.mine ? ""
        : " · " + f.corpus.c + " relationships, " + f.corpus.p + " papers attest this shape"}</span></span>
    ${f.mine ? `<span class="pacts2"><button type="button" class="edbtn del"
      data-famdel="${hesc(f.fam)}">Remove</button></span>` : ""}
    <span class="cwy">${hesc(f.why)} <span class="mu">${
      f.members.map(m => hesc(m[0])).join(" · ")}</span>${
      FORM_ENDS.every(p => f.need.includes(p)) ? "" : ` <b>Not normalised at both ends</b>, so
        swapping a member here moves the scale as well as the shape and a broken obligation
        cannot be attributed to either. every family carried is required to have it.`}</span>
  </div>`).join("")}</div>
  ${FAMNEW.open ? `<div class="famadd">
    <div class="condrow">
      <input type="text" class="defbox cond" id="famname" value="${hesc(FAMNEW.name)}"
        placeholder="a name, lower_snake_case" aria-label="Family name">
      <span class="roles">${["increasing", "concave", "convex", "sigmoid", "f(0)=0", "f(1)=1"]
        .map(p => chip(FAMNEW.need.includes(p), p, `data-famneed="${hesc(p)}"`)).join("")}</span>
    </div>
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">What every member has in common. Each member below is checked against it
      before the family is accepted — which is what <code>check_family()</code> does in
      the kernel, and the reason a family is a class and not a list. The two
      endpoint properties start ticked on purpose: when every member agrees at both ends,
      swapping one moves the shape and not the scale, and a broken obligation can be
      attributed to the shape. Untick them and the family is still kept, with that said
      against it.</span></p>
    <textarea class="defbox" id="fammem" style="min-height:92px;font-family:'IBM Plex Mono',monospace;font-size:11.5px"
      placeholder="one member per line, writing X for what it reads:&#10;sqrt = X ** 0.5&#10;cbrt = X ** (1 / 3)">${hesc(FAMNEW.text)}</textarea>
    <input type="text" class="defbox cond" id="famwhy" value="${hesc(FAMNEW.why)}"
      placeholder="what this shape says, in one line" aria-label="What the family means"
      style="margin-top:7px">
    <div class="cmpacts" style="margin:7px 0 0">
      <button type="button" class="edbtn" data-famadd="1">add it</button>
    </div>
    ${FAMNEW.err ? `<p class="why" style="color:var(--neg)">${hesc(FAMNEW.err)}</p>` : ""}
  </div>` : ""}`;
}

function paramTableHTML(){
  const M = ARITH.prop ? ARITH.prop.M : keptModel();
  const rels = carriedRelations(), w = new Set(rels.map(r => r.to));
  const params = carriedVars().filter(k => !w.has(k));
  const consts = M ? M.consts : [];
  if(!params.length && !consts.length) return "";
  const num = (a, n, v) => `<input type="number" step="0.05" class="wnum" data-${a}="${
    hesc(n)}" value="${v == null ? "" : v}" placeholder="${a === "wlo" ? "lo" : "hi"}"
    aria-label="${a === "wlo" ? "lower" : "upper"} end for ${hesc(n)}">`;
  return `<table class="ptab">
    <thead><tr><th>name</th><th>runs over</th><th></th></tr></thead>
    <tbody>
    ${params.map(k => { const b = abnd(k); return `<tr>
      <td class="pn">${hesc(varName(k))}</td>
      <td class="pr">[${b[0]}, ${b[1]}]</td>
      <td class="pw">${bdec(k) ? "declared on step 3.1"
        : `<b>not declared</b> — this is the page's default, so a sign proved over it is
           proved over a range nobody claimed`}</td>
    </tr>`; }).join("")}
    ${consts.map(c => `<tr>
      <td class="pn">${hesc(c.name)} <span class="mu">= ${numText(c.value)}</span></td>
      <td class="pr">${num("wlo", c.name, wdec(c) ? c.lo : null)}${
        num("whi", c.name, wdec(c) ? c.hi : null)}</td>
      <td class="pw">${wdec(c) ? "a weight, and the proofs run over this interval"
        : `a weight with <b>no interval</b> — proved at ${numText(c.value)} and nowhere else`}</td>
    </tr>`).join("")}
    </tbody></table>`;
}

function sparkHTML(xs, ys, w, h){
  if(!ys || ys.length < 2) return "";
  w = w || 92; h = h || 26;
  const fin = ys.filter(v => typeof v === "number" && isFinite(v));
  if(fin.length < 2) return `<span class="spark bad">not a number</span>`;
  const lo = Math.min.apply(null, fin), hi = Math.max.apply(null, fin);
  const sp = Math.max(1e-12, hi - lo);
  const pts = ys.map((v, i) => {
    const x = (i / (ys.length - 1)) * (w - 2) + 1;
    const y = h - 1 - ((isFinite(v) ? v : lo) - lo) / sp * (h - 2);
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <polyline points="${pts}"/></svg>`;
}

/* What ran, as rows. A verdict that could not be reached says so in the same
   column as a pass, because "not run" is a result about the declarations and
   not an absence: five checks on a thinly declared model is what a thinly
   declared model earns, and the row says how many that was. */
const AV = {pass:"ok", fail:"gap", skip:"part"};
const AVW = {pass:"holds", fail:"broken", skip:"not run"};
/* Seven of the nine checks exist because of something declared on step 3.1,
   and until now the row did not say which. That matters when one fails: the
   thing to change is the declaration, not the arithmetic, and a curator reading
   "firm_accounting_performance reaches 2.000, outside [0, 1]" has to remember
   that the [0, 1] was their own and two steps back.

   The mapping was already on the page and unused -- `INVARIANTS[].from` names
   the declaration each obligation is read off. The two checks with no `from`
   are the two that come from nowhere but arithmetic: that the numbers are
   numbers, and that a mechanism in the model does something. Saying so is
   worth as much as the other seven, because it marks the boundary between what
   the curator declared and what the page insists on regardless. */
function arithRowsHTML(run){
  const src = k => (INVARIANTS.find(i => i.k === k) || {}).from || "";
  return `<div class="chain">${run.rows.map(r => { const f = src(r.k);
    return `<div class="crow arow">
    <span class="cst ${AV[r.verdict]}">${AVW[r.verdict]}</span>
    <span class="cnm">${hesc(r.n)}<span class="cfl">${hesc(r.k)}${
      r.over ? " · " + hesc(r.over) : ""}</span></span>
    <span class="cwy">${hesc(r.why)}<i class="afrom">${f
      ? "This test exists because you declared <b>" + hesc(f) + "</b> on step 3.1. " +
        "If it fails, that declaration is what to look at first."
      : "Not read off any declaration: this one holds whatever you declared."}</i></span>
  </div>`; }).join("")}</div>`;
}
function arithCodeHTML(lines, consts){
  const L = [];
  for(const c of consts) L.push(`<span class="alh">${hesc(c.name)}</span> = ${numText(c.value)}` +
    (c.why ? `  <span class="acm">· ${hesc(String(c.why).replace(/\s+/g, " "))}</span>` : ""));
  if(consts.length) L.push("");
  for(const s of lines) L.push(`<span class="alh">${hesc(s.lhs)}</span> = ${hesc(s.py)}` +
    (s.why ? `  <span class="acm">· ${hesc(String(s.why).replace(/\s+/g, " "))}</span>` : ""));
  return `<pre class="arith">${L.join("\n")}</pre>`;
}
function arithPropHTML(p){
  const n = p.M.steps.length, c = p.M.consts.length;
  return `<div class="chain prop">
    <div class="crow prow">
      <span class="cst part">${aiMark()}proposed</span>
      <span class="cnm">${n} assignment${n === 1 ? "" : "s"}${
        c ? `, ${c} weight${c === 1 ? "" : "s"}` : ""}<span class="cfl">${
        p.run ? `${p.run.pass} hold · ${p.run.fail} broken · ${p.run.skip} not run`
          : hesc(p.err || "not run")}</span></span>
      <span class="pacts2">
        ${p.M.steps.length ? `<button type="button" class="edbtn" data-akeep="1">${
          p.run && !p.run.fail ? "<b>Keep</b>" : "Keep anyway"}</button>` : ``}
        <button type="button" class="edbtn" data-adrop="1">Dismiss</button>
      </span>
      <span class="cwy">${hesc(p.a.note || "")}</span>
    </div>
  </div>
  ${p.M.steps.length ? arithCodeHTML(p.M.steps, p.M.consts) : ""}
  ${p.M.bad.length || p.M.miss.length ? `<p class="why" style="color:var(--neg)">${
    p.M.bad.length ? `${p.M.bad.length} line${p.M.bad.length === 1 ? " was" : "s were"} refused
      before anything ran — ${p.M.bad.slice(0, 3).map(b =>
        hesc(b.lhs) + ": " + hesc(b.why)).join("; ")}. ` : ""}${
    p.M.miss.length ? `${p.M.miss.length} declared name${p.M.miss.length === 1 ? " was" : "s were"}
      never written — ${p.M.miss.slice(0, 6).map(hesc).join(", ")}.` : ""}</p>` : ""}
  ${p.run ? arithRowsHTML(p.run) : ""}`;
}
function arithKeptHTML(){
  const a = ARITH.kept, stale = a.sig && a.sig !== arithSig();
  const n = (a.lines || []).length;
  return `<div class="chain" style="margin-top:9px">
    <div class="crow prow">
      <span class="cst ${stale ? "part" : "ok"}">${stale ? "stale" : "kept"}</span>
      <span class="cnm">${n} assignment${n === 1 ? "" : "s"}, written into the file<span
        class="cfl">${a.run ? `${a.run.pass} held · ${a.run.fail} broken · ${
          a.run.skip} not run` : "never run"} · kept ${hesc(a.at || "")}</span></span>
      <span class="pacts2"><button type="button" class="edbtn del"
        data-adel="1">Remove</button></span>
      <span class="cwy">${stale
        ? `A mechanism or an outcome is not the same set it was when this ran. It is still
           written into the file and labelled there as unchecked against what is declared now
           — ask again to re-run it.`
        : hesc(a.note || "")}</span>
    </div>
  </div>
  ${arithCodeHTML(a.lines || [], a.consts || [])}
  ${/* What held needs no reminding; what did not is the reason to come back,
       so a kept body keeps showing only that half. */
    (a.run && (a.run.rows || []).some(x => x.verdict !== "pass"))
      ? arithRowsHTML({rows:a.run.rows.filter(x => x.verdict !== "pass")}) : ""}`;
}
/* The second ask is not a second attempt from nothing: what broke goes back
   with it, which is the whole of why this sits inside the loop and not before
   it. */
function arithFail(){
  const p = ARITH.prop;
  if(!p || !p.run || !p.run.fail) return "";
  const L = ["", "", "YOUR PREVIOUS ATTEMPT WAS RUN HERE. It was:"];
  for(const c of p.M.consts) L.push("  " + c.name + " = " + c.value);
  for(const s of p.M.steps) L.push("  " + s.lhs + " = " + s.py);
  if(p.M.bad.length){
    L.push("Refused before it ran:");
    for(const b of p.M.bad.slice(0, 8)) L.push("  " + b.lhs + ": " + b.why);
  }
  if(p.M.miss.length) L.push("Never written at all: " + p.M.miss.slice(0, 10).join(", "));
  L.push("These checks BROKE:");
  for(const r of p.run.rows.filter(x => x.verdict === "fail"))
    L.push("  " + r.n + " -- " + r.why);
  L.push("Rewrite the whole thing so they hold, keeping what already held, in the same JSON.");
  return L.join("\n");
}

/* The brief the arithmetic is written from: every parameter with its declared
   box, every outcome with its composition and its cap, every mechanism as a
   named term with its role and its shape class, the substitute sets, and the
   invariants already agreed to. */
function arithBrief(){
  const rels = carriedRelations(), nm = mechNames(rels), outs = outcomeVars();
  const vars = carriedVars(), written = new Set(rels.map(r => r.to));
  const bx = k => { const b = abnd(k); return "[" + b[0] + ", " + b[1] + "]"; };
  const L = ["PARAMETERS -- free inputs, nothing writes them"];
  for(const k of vars.filter(x => !written.has(x)))
    L.push("  " + varName(k) + " in " + bx(k) + "  kind=" +
      (vKinds(k).join("|") || "undeclared") + '  ("' + handName(k) + '")');
  for(const k of outs){
    L.push("");
    L.push("OUTCOME " + varName(k) + " in " + bx(k) +
      "  kind=" + (vKinds(k).join("|") || "undeclared") +
      "  aspect=" + (vAspects(k).join("|") || "undeclared") +
      '  ("' + handName(k) + '")');
    L.push("  composition: " + (rulesOf(k).join(" or ") ||
      "not declared -- choose one and say which in the note"));
    for(const r of rels.filter(x => x.to === k)){
      L.push("  TERM t_" + nm.get(r.id) + "  reads " + varName(r.from) +
        "  role=" + (rolesOf(r).join("|") || "undeclared") +
        "  shape=" + (propsOf(r).join("+") || "unconstrained") +
        (targetOf(r) ? "  acts on t_" + nm.get(targetOf(r)) : "") +
        "  (" + (r.papers ? r.papers + " papers" : r.src) + ")");
      /* Which classes carry that shape, named on the term. Without this the
         prompt asks for a property and gets an expression of the model's own,
         so the class is declared and nothing can enumerate it -- the form row
         then says the body was written by hand, which is true and is a loss. */
      const ff = famsFor(propsOf(r));
      if(ff.length) L.push("    families carrying it: " +
        ff.map(f => f.fam + " (" + f.members.map(m => m[0]).join(", ") + ")").join("; "));
    }
  }
  /* The members themselves, once, for the families some term can use. Naming
     a member is no use to anybody who cannot see what it is. */
  const used = [];
  for(const r of rels) for(const f of famsFor(propsOf(r)))
    if(!used.includes(f)) used.push(f);
  if(used.length){
    L.push("");
    L.push("FORM FAMILIES -- the classes a shape can be declared from. X is what the term reads.");
    for(const f of used){
      L.push("  " + f.fam + "  (" + f.need.join(", ") + ")");
      for(const m of f.members) L.push("    " + m[0] + " = " + m[1]);
    }
  }
  const g = substituteSets();
  if(g.length){
    L.push("");
    L.push("DECLARED SUBSTITUTES -- disabling either alone is allowed to change nothing");
    for(const x of g) L.push("  " + x.members.map(m => "t_" + m).join(" / ") +
      " -> " + varName(x.to));
  }
  if(xinv.size){
    L.push("");
    L.push("INVARIANTS ALREADY AGREED TO -- your arithmetic has to satisfy these");
    for(const x of xinv.values()) L.push("  " + x.check + ": " + x.why);
  }
  return L.join("\n").slice(0, 16000);
}

/* The arithmetic AS KEPT. arithBrief above is the declarations; this is what
   was written against them and survived step 3.1. A prompt asking what the
   model predicts needs this one, because without it the answer is about the
   declarations and the four forms are run against the model. */
function keptBrief(){
  const sp = classSpec();
  if(!sp) return "";
  const L = ["", "THE ARITHMETIC AS KEPT -- this is what a prediction is about"];
  for(const c of (sp.constants || []))
    L.push("  " + c.name + " = " + c.value +
      (c.lo != null && c.hi != null ? "  swept over [" + c.lo + ", " + c.hi + "]" : ""));
  for(const l of (sp.lines || [])) L.push("  " + l.lhs + " = " + l.rhs);
  return L.join("\n").slice(0, 6000);
}

function outcomeVars(){
  const w = new Set(carriedRelations().map(r => r.to));
  return carriedVars().filter(k => w.has(k));
}
/* The invariants the declarations have earned. Each is derived rather than
   asked for: declare an aspect of `difference` and the zero-at-baseline check
   appears, declare a transfer and conservation appears. Nothing is listed that
   nothing implies. */
function liveInvariants(){
  const rels = carriedRelations(), vars = carriedVars();
  const n = {
    zero_at_baseline:  vars.filter(k => vAspects(k).includes("difference")).length,
    within_bounds:     vars.filter(bdec).length,
    share_sums_to_one: vars.filter(k => vKinds(k).includes("share")).length,
    propensity_in_unit:vars.filter(k => vKinds(k).includes("propensity")).length,
    conserved:         rels.filter(r => rolesOf(r).includes("transfers")).length,
    monotone_in:       rels.filter(r => propsOf(r).includes("increasing")).length,
  };
  const REL = ["conserved", "monotone_in"];
  return INVARIANTS.filter(x => n[x.k] > 0).map(x => Object.assign({}, x,
    {count:n[x.k], n2:n[x.k] + (REL.includes(x.k) ? " rel" : " qty")}));
}

function openSpace(){
  const rels = carriedRelations(), vars = carriedVars();
  let log = 0, open = 0, n = 0;
  for(const k of vars){
    const ki = vKinds(k).length || KINDS.length;
    const as = vAspects(k).length || ASPECTS.length;
    log += Math.log10(ki) + Math.log10(as); n += 2;
    if(!vKinds(k).length) open++;
    if(!vAspects(k).length) open++;
  }
  for(const r of rels){
    const ro = rolesOf(r).length || ROLES.length;
    log += Math.log10(ro) + Math.log10(memberCount(propsOf(r))); n += 2;
    if(!rolesOf(r).length) open++;
    if(!propsOf(r).length) open++;
  }
  return {log, open, n};
}
/* A mechanism's description is read by the language model, and the kernel
   refuses one under five words rather than let a thin one through. A claim's
   own label is often shorter than that and is in any case a label, not an
   account of what the mechanism does -- so where there is no better text the
   file says plainly that there is none, and the header counts them. */
const WORDS = t => String(t || "").trim().split(/\s+/).filter(Boolean).length;
const mechDesc = r => {
  const t = String(r.why || "").trim();
  if(WORDS(t) >= 5) return t;
  return (t ? t + ". " : "") + `${handName(r.from)} bears on ${handName(r.to)}. ` +
    (r.papers
      ? `Asserted by ${r.papers} paper${r.papers === 1 ? "" : "s"} in the corpus, which state the relation and not the mechanism.`
      : `No paper asserts it; what it does is the modeller's to state here.`);
};
const varName = k => {
  const v = vtype.get(k);
  if(v && v.name) return v.name;
  return String(handName(k)).toLowerCase().replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "x";
};
/* check_contract() refuses duplicate mechanism names, so they are made unique
   here rather than left for the import to fail on.

   A MECHANISM THE MODELLER NAMED KEEPS ITS NAME. Everything carried from the
   corpus is named for its ends, because that is all a claim gives you: one
   paper asserting that A bears on B says nothing about what the mechanism is
   called. A model declared by hand does say -- the two-channel model's eleven
   mechanisms have names, and five of them write the same outcome, so named
   for their ends they would arrive as `pi_to_a`, `pi_to_a_2` and so on, which
   is what the ablation readout, the Python export and every row that says
   which mechanism broke a conclusion would then be about. The name is used
   where one is given and the ends are used where it is not, and the
   uniqueness pass below runs either way. */
function mechNames(rels){
  const out = new Map(), used = new Set();
  for(const r of rels){
    const own = String(r.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    let base = own || `${varName(r.from)}_to_${varName(r.to)}`;
    // cut back to a word boundary rather than through one
    if(base.length > 54) base = base.slice(0, 54).replace(/_[^_]*$/, "");
    let n = base, i = 2;
    while(used.has(n)) n = `${base}_${i++}`;
    used.add(n); out.set(r.id, n);
  }
  return out;
}
/* Two mechanisms writing the same quantity are candidate substitutes, and
   declaring the sets BEFORE the run is what makes an ablation result readable:
   disable either of a substituting pair alone and nothing moves, so a loop
   that has not been told reports that neither mattered. The corpus says how
   common this is rather than leaving it an assumption \u2014 82 consequents carry
   two or more distinct causes from two or more independent papers. */
function substituteSets(){
  const by = new Map();
  const rels = carriedRelations(), nm = mechNames(rels);
  for(const r of rels){
    if(!by.has(r.to)) by.set(r.to, []);
    by.get(r.to).push(nm.get(r.id));
  }
  return [...by.entries()].filter(([, ms]) => ms.length > 1)
    .map(([k, ms]) => ({to:k, members:ms}));
}

/* The skeleton. Every method the kernel's contract requires, filled from the
   declarations, except the one that cannot be: evaluate() is arithmetic, and
   arithmetic does not follow from claims. check_contract() passes every
   structural test on this file and stops at that call, which is the honest
   boundary of what a curation can hand over. */
function modelPy(){
  const rels = carriedRelations(), vars = carriedVars(), nm = mechNames(rels);
  const S = x => JSON.stringify(String(x == null ? "" : x));
  const written = new Set(rels.map(r => r.to));
  const params = vars.filter(k => !written.has(k));
  const outs = vars.filter(k => written.has(k));
  const subs = substituteSets();
  const sc = (typeof scenCur === "function" ? scenCur() : null) || {};
  const untyped = vars.filter(k => !vtype.has(k));
  const unroled = rels.filter(r => !roleOf(r));
  const thin = rels.filter(r => WORDS(r.why) < 5);
  /* The arithmetic, if any was kept. It is the only thing in this file that
     was not declared by hand, which is why the docstring says where it came
     from and what happened when it ran. */
  const A = (ARITH.kept && (ARITH.kept.lines || []).length) ? ARITH.kept : null;
  const astale = !!(A && A.sig && A.sig !== arithSig());
  const amath = !!(A && (A.lines || []).some(x => /\b(?:exp|log)\s*\(/.test(x.py)));
  /* The form families the lines were declared from, as DATA and not as a
     comment. forms.py exists so that a proposition can be reported with its
     scope -- "holds for any saturating protection" rather than "holds for a
     square root" -- and until now this file named the class in a comment,
     which reads but does not run. Emitted as the kernel families, so
     check_family() is the test, and it is the same test the bench ran before
     it accepted them. */
  const fams = [];
  if(A) for(const x of (A.lines || [])){
    const fm0 = (ARITH.fam || {})[x.lhs];
    const f0 = fm0 ? famByName(fm0.fam) : null;
    if(f0 && !fams.some(g => g.fam === f0.fam)) fams.push(f0);
  }
  const fmath = fams.some(f => f.members.some(m => /\b(?:exp|log)\s*\(/.test(m[1])));
  // the grammar's two functions, under the names Python knows them by
  const PYX = e => String(e).replace(/\b(exp|log)\s*\(/g, "math.$1(");
  /* A description wrapped into an implicitly concatenated Python string, which
     is how the three families in docs/bench/vocab.js are written. */
  const PYS = (t, ind) => {
    const words = String(t || "").replace(/\s+/g, " ").trim().split(" ");
    const out = []; let ln = "";
    for(const w of words){
      if(ln && (ln + " " + w).length > 84 - ind.length){ out.push(ln); ln = w; }
      else ln = ln ? ln + " " + w : w;
    }
    if(ln) out.push(ln);
    return out.map((x, i) => ind + JSON.stringify(x + (i < out.length - 1 ? " " : "")));
  };
  const L = [];
  L.push(`"""Generated by the AMG Workbench on ${new Date().toISOString().slice(0, 10)}.`);
  L.push(``);
  L.push(`Project: ${sc.name || "(unnamed)"}`);
  L.push(`${vars.length} quantities, ${rels.length} mechanisms, ${subs.length} candidate`);
  L.push(`substitute set${subs.length === 1 ? "" : "s"}.`);
  L.push(``);
  L.push(`Every declaration below is the modeller's. The corpus supplies the relations;`);
  L.push(`it does not supply their roles, the kinds of their quantities, or any bound.`);
  L.push(`Each declaration below is a CLASS. The concrete value is its first member and the`);
  L.push(`class is in the comment beside it \u2014 what runs is a member, what is recorded is the`);
  L.push(`class, and a conclusion is only about the theory if it survives all of them.`);
  L.push(``);
  if(fams.length){
    L.push(`The shape classes are FAMILIES below, as the kernel families rather than as prose.`);
    L.push(`check_family() is the test that every member has the properties its family claims;`);
    L.push(`it is the same test this bench ran before it would write any of these lines. What`);
    L.push(`runs is the member named beside each term. The others are the scope.`);
    L.push(``);
  }
  if(untyped.length) L.push(`${untyped.length} quantit${untyped.length === 1 ? "y is" : "ies are"} undeclared and defaulted to degree/level.`);
  if(unroled.length) L.push(`${unroled.length} mechanism${unroled.length === 1 ? " has" : "s have"} no declared role.`);
  if(thin.length) L.push(`${thin.length} description${thin.length === 1 ? " is a stub" : "s are stubs"}: the corpus gave a label, not an account of the mechanism.`);
  L.push(``);
  if(!A) L.push(`Nothing here runs until evaluate() is written.`);
  else{
    L.push(`evaluate() was written by a language model from the declarations above and then`);
    L.push(`run in the browser before it was kept: ${A.run ? A.run.pass : 0} of the invariants held, ${
      A.run ? A.run.fail : 0} broke, ${A.run ? A.run.skip : 0} could not be run`);
    L.push(`there. Its weights are its own \u2014 nothing in the corpus fixes them, and they are`);
    L.push(`the thinnest thing in this file.`);
    if(astale) L.push(`STALE: the declarations changed after it ran. Re-run before trusting it.`);
  }
  L.push(`"""`);
  L.push(``);
  if(amath || fmath) L.push(`import math`);
  if(amath || fmath) L.push(``);
  if(fams.length) L.push(`from the kernel.forms import Form, FormFamily`);
  L.push(`from the kernel.protocol import Mechanism, Quantity`);
  L.push(``);
  if(fams.length){
    L.push(`FAMILIES = (`);
    for(const f of fams){
      L.push(`    FormFamily(`);
      L.push(`        name=${S(f.fam)},`);
      L.push(`        description=(`);
      for(const ln of PYS(f.why, `            `)) L.push(ln);
      L.push(`        ),`);
      L.push(`        properties=(${f.need.map(S).join(", ")}${f.need.length === 1 ? "," : ""}),`);
      L.push(`        members=(`);
      for(const m of f.members)
        L.push(`            Form(${S(m[0])}, lambda X: ${PYX(m[1])}),`);
      L.push(`        ),`);
      L.push(`    ),`);
    }
    L.push(`)`);
    L.push(``);
  }
  L.push(``);
  L.push(`class CuratedModel:`);
  L.push(`    def quantities(self):`);
  L.push(`        return {`);
  for(const k of vars){
    const ks = vKinds(k), as = vAspects(k);
    L.push(`            ${S(varName(k))}: Quantity(${S(ks[0] || "degree")}, ${S(as[0] || "level")},`);
    L.push(`                note=${S(handName(k))}),  # class: ${
      ks.length ? ks.join("|") : "any of 9"} \u00b7 ${as.length ? as.join("|") : "either"}`);
  }
  L.push(`        }`);
  L.push(``);
  L.push(`    def parameters(self):`);
  L.push(`        # nothing in the carried set writes these`);
  L.push(`        return {`);
  for(const k of params){
    const v = vtype.get(k) || {};
    L.push(`            ${S(varName(k))}: (${(+(v.lo != null ? v.lo : 0)).toFixed(2)}, ${
      (+(v.hi != null ? v.hi : 1)).toFixed(2)}),${bdec(k) ? "" : "  # not declared: the bench's default"}`);
  }
  if(!params.length) L.push(`            # none: every quantity is written by something`);
  L.push(`        }`);
  L.push(``);
  L.push(`    def outcomes(self):`);
  L.push(`        return (${outs.map(k => S(varName(k))).join(", ")}${outs.length === 1 ? "," : ""})`);
  L.push(``);
  L.push(`    def mechanisms(self):`);
  L.push(`        return (`);
  for(const r of rels){
    const ro = rolesOf(r), role = ro[0] || "";
    L.push(`            Mechanism(`);
    L.push(`                ${S(nm.get(r.id))},`);
    L.push(`                ${S(mechDesc(r))},`);
    L.push(`                reads=(${S(varName(r.from))},), writes=(${S(varName(r.to))},),`);
    L.push(`                role=${role ? S(role) : "None"}),  # ${r.src}${
      r.papers ? `, ${r.papers} paper${r.papers === 1 ? "" : "s"}` : ", no paper asserts it"}`);
    L.push(`            # role class: ${ro.length ? ro.join("|") : "any of 6"}` +
      ` \u00b7 shape class: ${propsOf(r).length ? propsOf(r).join("+") : "unconstrained"}` +
      ` (${memberCount(propsOf(r))} of ${MEMBERS_ALL} members)`);
  }
  L.push(`        )`);
  L.push(``);
  L.push(`    def substitutable_groups(self):`);
  L.push(`        return (`);
  for(const s of subs)
    L.push(`            (${s.members.map(S).join(", ")}),  # all write ${varName(s.to)}`);
  if(!subs.length) L.push(`            # no quantity is written by more than one mechanism`);
  L.push(`        )`);
  L.push(``);
  /* The invariants, as data. Running them is the kernel's job and not this
     page's: they are predicates over behaviour, so they need the model to have
     run. What the bench can do is say which ones the declarations earned. */
  L.push(`    def invariants(self):`);
  L.push(`        """What must hold of whatever evaluate() returns.`);
  L.push(``);
  L.push(`        Derived from the declarations, not asked for separately. Each is a`);
  L.push(`        predicate over behaviour rather than over source, which is what lets the`);
  L.push(`        arithmetic below stay hand-written and still be answerable.`);
  L.push(`        """`);
  L.push(`        return (`);
  for(const x of liveInvariants()){
    const vs = x.k === "conserved" || x.k === "monotone_in"
      ? carriedRelations().filter(r => x.k === "conserved"
          ? rolesOf(r).includes("transfers") : propsOf(r).includes("increasing"))
          .map(r => mechNames(carriedRelations()).get(r.id))
      : carriedVars().filter(k => x.k === "zero_at_baseline" ? vAspects(k).includes("difference")
          : x.k === "share_sums_to_one" ? vKinds(k).includes("share")
          : x.k === "propensity_in_unit" ? vKinds(k).includes("propensity")
          : bdec(k)).map(varName);
    L.push(`            {"check": ${S(x.k)}, "over": (${vs.slice(0, 40).map(S).join(", ")}${
      vs.length === 1 ? "," : ""})},  # ${x.n}`);
  }
  for(const x of xinv.values())
    L.push(`            {"check": ${S(x.check)}, "over": (${
      (x.over || []).map(S).join(", ")}${(x.over || []).length === 1 ? "," : ""})},` +
      `  # proposed, then agreed to: ${String(x.why || "").replace(/\s+/g, " ").slice(0, 110)}`);
  if(!liveInvariants().length && !xinv.size)
    L.push(`            # nothing declared yet implies one`);
  L.push(`        )`);
  L.push(``);
  L.push(`    def evaluate(self, params, ablation=None):`);
  if(!A){
    L.push(`        """The arithmetic. Hand-written, and the only thing here that is.`);
    L.push(``);
    L.push(`        The composition declared for each outcome is written out below. What is`);
    L.push(`        left is the body: the weights, the order, and anything the six roles and`);
    L.push(`        five composition rules do not reach. A mechanism named in ablation must`);
    L.push(`        contribute nothing, which is what makes any of this testable.`);
    L.push(`        """`);
  }else{
    L.push(`        """The arithmetic. The only thing here that was not declared by hand.`);
    L.push(``);
    L.push(`        Proposed by a language model from the declarations above, in a grammar`);
    L.push(`        that is arithmetic in Python and in JavaScript at once, and then run in`);
    L.push(`        the browser over a fixed sample of the parameter box below before it was`);
    L.push(`        kept. What the invariants said is in the comments beside them. The`);
    L.push(`        weights are the proposal's own.`);
    if(astale){
      L.push(``);
      L.push(`        STALE. The declarations changed after this ran, so the verdicts quoted`);
      L.push(`        below are about a set of mechanisms that is not the one above.`);
    }
    L.push(`        """`);
  }
  for(const k of outs){
    const rs = rulesOf(k), writers = rels.filter(r => r.to === k);
    L.push(`        # ${varName(k)}: ${rs.length ? rs.join(" | ") : "composition not declared"}`);
    for(const r of writers)
      L.push(`        #   ${roleOf(r) || "role not declared"}  ${nm.get(r.id)}(${varName(r.from)})${
        targetOf(r) ? `  on ${nm.get(targetOf(r)) || "?"}` : ""}`);
  }
  if(!A){
    L.push(`        raise NotImplementedError(`);
    L.push(`            "Write the body. The declarations above fix what it is about; "`);
    L.push(`            "they do not fix the arithmetic, and nothing can."`);
    L.push(`        )`);
  }else{
    const CM = t => String(t || "").replace(/\s+/g, " ").slice(0, 92);
    const have = new Set((A.lines || []).map(x => x.lhs));
    L.push(``);
    L.push(`        off = set(ablation or ())`);
    if(amath){
      // only the ones it uses: binding both left an unused name in a file
      // somebody else is going to lint
      const fns = ["exp", "log"].filter(f =>
        (A.lines || []).some(x => new RegExp("\\b" + f + "\\s*\\(").test(x.py)));
      L.push(`        ${fns.join(", ")} = ${fns.map(f => "math." + f).join(", ")}`);
    }
    L.push(``);
    for(const k of params) L.push(`        ${varName(k)} = params[${S(varName(k))}]`);
    if(!params.length) L.push(`        # no free parameter: everything here is written`);
    if((A.consts || []).length){
      L.push(``);
      L.push(`        # weights proposed with the arithmetic. Not declared, not in any paper,`);
      L.push(`        # and the first thing to sweep.`);
      for(const c of A.consts)
        L.push(`        ${c.name} = ${c.value}  # ${wdec(c)
          ? `declared over [${c.lo}, ${c.hi}]` : "no interval declared"}${
          c.why ? ", " + CM(c.why) : ""}`);
    }
    L.push(``);
    for(const x of (A.lines || [])){
      const fm = (ARITH.fam || {})[x.lhs];
      const fo = fm ? famByName(fm.fam) : null;
      L.push(`        ${x.lhs} = ${x.py}${x.why ? `  # ${CM(x.why)}` : ""}`);
      if(fo) L.push(`        # ${fm.member} of FAMILIES[${
        fams.findIndex(g => g.fam === fo.fam)}], the ${fo.fam} class: ${fo.need.join(", ")}`);
      if(fo) L.push(`        # its ${fo.members.length} members are ${
        fo.members.map(m => m[0]).join(", ")} — swap one and the proposition is the test`);
      /* The ablation guard is the bench's and not the proposal's: the grammar
         has no conditional in it, so what a mechanism contributes is zeroed
         here, by name, after its own line and before anything reads it. */
      if(x.kind === "term" && x.mech){
        L.push(`        if ${S(x.mech)} in off:`);
        L.push(`            ${x.lhs} = 0.0`);
      }
    }
    const gone = outs.filter(k => !have.has(varName(k)));
    if(gone.length){
      L.push(``);
      L.push(`        # no assignment was proposed for these, and nan rather than a number`);
      L.push(`        # is what says so to every invariant that reads them`);
      for(const k of gone) L.push(`        ${varName(k)} = float("nan")`);
    }
    L.push(``);
    L.push(`        return {`);
    for(const k of outs) L.push(`            ${S(varName(k))}: ${varName(k)},`);
    if(!outs.length) L.push(`            # nothing is written by anything`);
    L.push(`        }`);
    if(A.run && (A.run.rows || []).length){
      L.push(``);
      L.push(`    # What the browser said when it ran the above, on ${A.at || "an earlier day"}:`);
      for(const r of A.run.rows)
        L.push(`    #   ${r.verdict === "pass" ? "HOLDS " : r.verdict === "fail" ? "BROKEN" : "NOT RUN"}  ${
          r.n} \u2014 ${CM(r.why)}`);
    }
  }
  L.push(``);
  return L.join("\n");
}

function claimsBox(){
  /* See the note on litHere in 07-grouping.js: with no papers there is no
     corpus for the shipped model's relations to be reconstructed against. */
  if(!Object.keys(G.papers || {}).length) return "";
  const SIGN_L = {negative:"a cost", conditional:"a condition", redistributive:"a transfer",
                  unspecified:"sign not fixed"};
  const host = i => (lastView.allNodes || lastView.nodes || [])
    .find(n => n.mem.some(m => m.i === i));
  const nameOf = i => { const h = host(i); return h ? h.label.replace(/-/g, " ") : i.replace(/-/g, " "); };
  const also = i => { const h = host(i);
    return h && h.label !== i ? ` <span class="clid">${i.replace(/-/g," ")}</span>` : ""; };
  const prow = x => `<label class="clrw prop">
    <input type="checkbox" data-rel="${x.r.id}" ${state.msel.has(x.r.id) ? "checked" : ""}
           aria-label="Carry ${relName(x.r.id)} into step 2.1">
    <span class="clw">${nameOf(x.p.from)}${also(x.p.from)} <b>→</b> ${nameOf(x.p.to)}${also(x.p.to)}
      <i><span class="evb">no paper asserts it</span> ${x.p.sign} · ${SIGN_L[x.p.sign] || ""}
      · reconstructed from <b>${relName(x.r.id)}</b></i></span></label>`;

  const stmts = statementsInPlay(false).sort(byEvidence);
  // and the composed relations that were carried, which belong to the stream
  // their two ends belong to, like any other
  const comp = composedPaths().filter(f => state.comp.has(f.id));
  const got = {}, prop = {}, cmp = {};
  for(const st of STREAMS){ got[st.k] = []; prop[st.k] = []; cmp[st.k] = []; }
  for(const f of comp)
    for(const st of STREAMS)
      if(streamOfId(f.from) === st.k || streamOfId(f.to) === st.k) cmp[st.k].push(f);
  for(const g of stmts){
    const ends = new Set();
    for(const r of g.rows) (r.c.a || []).concat(r.c.c || []).forEach(i => ends.add(i));
    for(const st of STREAMS)
      if([...ends].some(i => streamOfId(i) === st.k)) got[st.k].push(g);
  }
  /* All of them in the imported group, not sorted by their ends. A relation the
     model proposes was imported with the model, whatever the names at either
     end sound like -- and sorting by the ends put the same eleven relations
     into three different sections. */
  for(const r of (MR.relations || []))
    if(r.proposes) prop.rights.push({r, p:r.proposes});
  const nk = (k, w) => got[k].filter(g => kindOf(g.rows) === w).length;
  const nSt = STREAMS.reduce((t, st) => t + got[st.k].length, 0);
  const nCor = STREAMS.reduce((t, st) => t + nk(st.k, "co"), 0);
  const nCx  = STREAMS.reduce((t, st) => t + nk(st.k, "cx"), 0);
  const nSc  = STREAMS.reduce((t, st) => t + nk(st.k, "sc"), 0);
  const nProp = (MR.relations || []).filter(r => r.proposes).length;

  let h = `<div class="bbox"><div class="bbhd"><span class="movlab">Relationships</span>
      <span class="seedn">${nSt} statements · ${nCor} corroborated${
        nCx ? ` · ${nCx} contested` : ""}${
        nSc ? ` · ${nSc} scope disputed` : ""} · ${nProp} reconstructed${
        comp.length ? ` · ${comp.length} composed` : ""}${
        mclm.size ? ` · ${mclm.size} added by hand` : ""}</span>
      <button type="button" class="edbtn" id="addclm">+ relationship</button></div>
    <div class="bbscroll">`;
  for(const st of STREAMS){
    /* `data-strm` is the handle: a stop that rings "what the property-rights
       model brought" has to name that section and not the first heading on
       the step. */
    h += `<div class="strmhd" data-strm="${hesc(st.k)}" title="${st.why}"><span class="movlab">${hesc(streamLabel(st.k))}</span>
      <span class="seedn">${got[st.k].length} statements · ${nk(st.k, "co")} corroborated${
        nk(st.k, "cx") ? ` · ${nk(st.k, "cx")} contested` : ""}${
        nk(st.k, "sc") ? ` · ${nk(st.k, "sc")} scope disputed` : ""} · ${
        prop[st.k].length} reconstructed${
        cmp[st.k].length ? ` · ${cmp[st.k].length} composed` : ""}</span></div>`;
    h += got[st.k].length
      ? `<div class="clist">${got[st.k].map(g => claimGroupHTML(g, false)).join("")}</div>`
      : `<p class="empty">No relationship in this corpus joins a construct from this literature —
         which, for one the corpus was not built around, is the finding and not a gap.</p>`;
    if(cmp[st.k].length)
      h += `<div class="clist">${cmp[st.k].map(f => composedGroupHTML(f, false)).join("")}</div>`;
    if(prop[st.k].length)
      h += `<div class="clist">${prop[st.k].map(x => reconGroupHTML(x.r)).join("")}</div>`;
  }
  h += handListHTML(true);
  return h + `</div></div>`;
}


export { AV, AVW, FAMNEW, WORDS, arithBrief, arithCodeHTML, arithFail, arithKeptHTML, arithPropHTML, arithRowsHTML, claimsBox, classCheck, clsStripHTML, famListHTML, formRows, keptBrief, lineEq, liveInvariants, mechDesc, mechNames, mechRowsHTML, modelPy, openFams, openJoin, openSpace, outRowsHTML, outSweep, outValues, outcomeVars, paramTableHTML, respec, setWeightRange, sparkHTML, substituteSets, varName, wireFamControls, wireFams, wireJoin, wireJoinControls };

/* AMG bench, page script 10 of 22: the dialects a modeller already runs, and the propositions.
   One shared global scope, loaded in order. See page/README.md. */
import { asamples, asweep, checkArith, runAt } from "../core/invariants.js";
import { hesc } from "../core/safe.js";
import { SCORE, SEARCH, STARGETS, rankBy, theRule } from "../core/rank.js";
import { NEG, OP, ablate, boxFrom, dTree, hasVar, ivalTree, locateFlip, mmResolve, mmWhy, proveSign, readExpr, rpnTree, searchClass, simp, sizeOf, sweepModel, treeText } from "../core/kernel.js";
import { CT, abnd, bdec, buildArith, classSpec, runClassTests, runPredicate, wbnd, wdec } from "./08-ask.js";
import { bufSeed, famByName, famsFor, formExpr, keptPlot } from "./10-depends.js";
import { carriedRelations, carriedVars, propsOf } from "./07-grouping.js";
;
import { lsRead, lsWrite, state } from "./03-stores.js";
import { mechNames, varName } from "./11-classes.js";
import { renderPanel } from "./06-wiring.js";
import { xlog } from "./05-explore.js";
/* ---- interval arithmetic --------------------------------------------- */
function inlineOutcome(M, name){
  const env = new Map();
  for(const s of M.steps){
    let tree = rpnTree(s.rpn);
    const sub = node => {
      if(!node) return node;
      if(node.t === "v" && env.has(node.v)) return env.get(node.v);
      if(node.t === "n" || node.t === "v") return node;
      const c = Object.assign({}, node);
      c.a = sub(node.a); if(node.b) c.b = sub(node.b);
      return c;
    };
    tree = sub(tree);
    for(const c of M.consts) if(c.name) { /* constants stay named */ }
    /* SIMPLIFIED AS IT GOES, AND THE CAP MEASURES WHAT IT MEANT TO.

       Substituting every line into every later line duplicates whatever the
       earlier ones held, so an intermediate carries bulk that collapses the
       moment it is simplified: in the two-channel model, `a` inlines to 2,723
       nodes and simplifies to 806, and `avp` to 4,187 and 356. Measuring the
       unsimplified tree refused a model that fits ten times over.

       And the refusal was for the whole pass rather than for the outcome that
       was too large, because this loop walks every step and returns on the
       first one over the cap. One large outcome took every other outcome's
       derivation with it -- `vp` at 359 nodes reported "passed 4000 nodes" --
       which reads as a model the bench cannot derive when it is one line of
       it. Simplifying here fixes both: the cap is applied to the tree that is
       actually differentiated, and no outcome is refused for another's size. */
    env.set(s.lhs, simp(tree));
    if(sizeOf(env.get(s.lhs)) > 4000)
      return {err:"the inlined expression passed 4000 nodes"};
  }
  const t = env.get(name);
  return t ? {tree:t} : {err:name + " is not written by the arithmetic"};
}


/* ---- the same expression, in the dialects a modeller already runs ------
   Export is one-way and safe: a reader who owns Mathematica already owns it,
   and nobody needs it to use this page. What comes BACK is the interesting
   direction, and it is handled the way everything proposed to this bench is
   handled -- parsed against the grammar, then checked, never trusted. */

/* ---- dispatching a search over the declared class -------------------------

   Dispatching agents to look for specific configurations is one way to read
   this, and it is not what happens.

   Not agents. `searchClass` in the kernel walks configurations and asks a test
   it cannot see inside, which is the same split as the lattice and for the same
   reason: a search that reported its own successes would be exactly the thing
   the editors call slop. What is dispatched is a TARGET, declared before the
   run, and what comes back includes how much of the class was covered -- so
   "nothing found" in a class of twelve and "nothing found" in the first four
   hundred of half a million read differently, because they are different
   answers.

   The axis is the family member of each term. That is the functional form, the
   thing the declaration left open and the proposal's whole argument about
   declaring a class rather than freezing a form. The combination rule is NOT an
   axis yet: varying it means regenerating the outcome line through the skeleton
   rather than substituting a member, which is a different piece of machinery.
   Set it by hand and search again. Saying so beats searching a space the report
   would imply was the whole of it. */
/* The axes: one per term that has a family declared, its members as choices. */
function searchAxes(){
  const rels = carriedRelations(), nm = mechNames(rels);
  const out = [];
  for(const r of rels){
    const term = "t_" + nm.get(r.id);
    const fams = famsFor(propsOf(r));
    const ch = [];
    for(const f of fams) for(const m of f.members) ch.push(f.fam + "/" + m[0]);
    if(ch.length > 1) out.push({name:term, choices:ch, rel:r});
  }
  return out;
}

/* A configuration, as a spec `buildArith` can read. Nothing is mutated: the
   kept arithmetic is read, its term lines are substituted, and the result is
   handed straight to the builder. A search that edited ARITH four hundred times
   and put it back would be one bad exception away from losing the model. */
function specForConfig(config, axes){
  const base = classSpec();
  if(!base) return null;
  const byTerm = new Map(axes.map(a => [a.name, a]));
  const lines = base.lines.map(l => {
    const pick = config[l.lhs], ax = byTerm.get(l.lhs);
    if(!pick || !ax) return l;
    const cut = String(pick).indexOf("/");
    const f = famByName(pick.slice(0, cut));
    const m = f && f.members.find(x => x[0] === pick.slice(cut + 1));
    if(!m) return l;
    return Object.assign({}, l,
      {rhs:formExpr(m[1], varName(ax.rel.from), abnd(ax.rel.from))});
  });
  return Object.assign({}, base, {lines});
}

function runSearch(){
  SEARCH.err = ""; SEARCH.out = null;
  const axes = searchAxes();
  if(!axes.length){
    SEARCH.err = "no term has more than one member declared for it, so the class is a point — " +
      "declare a family on a mechanism and there is something to search";
    return;
  }
  const base = classSpec();
  if(!base){ SEARCH.err = "there is no kept arithmetic to vary"; return; }
  const line = BUF.lines.find(l => l.id === BUF.sel) ||
    BUF.lines.find(l => l.y && l.x && l.res);
  if(SEARCH.target !== "breaks" && !(line && line.y && line.x)){
    SEARCH.err = "select a line in the derivation above: this target is about one conclusion, " +
      "and which one is not something the page should guess";
    return;
  }
  const want = SEARCH.target;
  const test = config => {
    const spec = specForConfig(config, axes);
    const M = buildArith(spec);
    if(!M || !M.steps || !M.steps.length) return {ok:false};
    if(want === "breaks"){
      const run = checkArith(M, spec);
      const bad = run.rows.filter(r => r.verdict === "fail");
      return {ok:!!bad.length,
        why:bad.length ? bad[0].n + " — " + bad[0].why : ""};
    }
    if(want === "proved"){
      const t = inlineOutcome(M, String(line.y));
      if(!t) return {ok:false};
      const d = simp(dTree(t, String(line.x)));
      const box = boxFrom(M, {});
      const pr = proveSign(d, box, 1);
      const ok = pr.verdict === "proved" || pr.verdict === "disproved";
      return {ok, why:ok ? "the sign is " + pr.verdict + " over the whole box" : ""};
    }
    /* interaction: the lattice, over this configuration */
    const terms = M.steps.filter(x => x.kind === "term").map(x => x.lhs);
    const bx = boxFrom(M, {});
    const holds = off => {
      const w = sweepModel(M, String(line.x), String(line.y), bx, 20, off);
      const span = Math.max.apply(null, w.ys) - Math.min.apply(null, w.ys);
      if(!(span > 1e-9)) return false;
      for(let i = 1; i < w.ys.length; i++) if(w.ys[i] < w.ys[i - 1] - 1e-9) return false;
      return true;
    };
    const r = ablate(terms, holds);
    return {ok:r.k === "pair", why:r.k === "pair" ? r.why : ""};
  };
  /* The cap, measured rather than guessed. 400 configurations of the worked
     example took 76ms, so 400 was leaving answers on the table: the class is
     2,744 and exhausting it is what turns "nothing in the first 400" into
     "nothing in the whole class", which is a finding rather than a shrug. 4,000
     is about a second on this model and still bounded for a bigger one. */
  SEARCH.out = searchClass(axes, test, {cap:4000, want:1});
  SEARCH.at = new Date().toISOString().slice(0, 16).replace("T", " ");
  const o = SEARCH.out;
  xlog("search", "Searched the declared class for " +
    (STARGETS.find(t => t[0] === want) || ["", want])[1],
    o.why + (o.found.length
      ? " \u2014 " + Object.entries(o.found[0].config).map(([k, v]) => k + " = " + v).join(", ")
      : ""));
}

function searchBlockHTML(){
  const axes = searchAxes();
  const space = axes.reduce((n, a) => n * a.choices.length, 1);
  const o = SEARCH.out;
  return `
   <div class="fld" style="flex:1 1 100%;max-width:none">
     <div class="embhd">
       <span class="ctl-label">Search the declared class</span>
       <span class="cmpacts" style="margin:0">
         <select id="startgt" aria-label="What to look for">
           ${STARGETS.map(([k, lab]) => `<option value="${k}"${
             SEARCH.target === k ? " selected" : ""}>${lab}</option>`).join("")}
         </select>
         <button type="button" data-ssearch="1"${axes.length ? "" : " disabled"}>${
           o ? "search again" : "search"}</button>
       </span>
     </div>
     <p class="why">${axes.length
       ? `<b>${space.toLocaleString("en")}</b> configuration${space === 1 ? "" : "s"} over ${
           axes.length} term${axes.length === 1 ? "" : "s"}, one family member each. Walked in a
          fixed order, and <b>what it covered is reported alongside what it found</b>: nothing in
          a class of twelve and nothing in the first four hundred of a million are different
          answers. The combination rule is not an axis; set it by hand above.`
       : `No term has more than one member declared, so the class is a point. Declare a family on
          a mechanism above.`}
       ${STARGETS.filter(t => t[0] === SEARCH.target).map(t => `<br><b>${hesc(t[1])}.</b> ${t[2]}`).join("")}</p>
     ${SEARCH.err ? `<p class="why" style="color:var(--neg)">${hesc(SEARCH.err)}</p>` : ""}
     ${o ? `<div class="chain">
       <div class="crow">
         <span class="cst ${o.found.length ? "ok" : o.exhausted ? "gap" : "part"}">${
           o.found.length ? "found" : o.exhausted ? "nowhere" : "capped"}</span>
         <span class="cnm">${hesc(o.why)}<span class="cfl">${o.axes.map(a =>
           hesc(a.name) + " × " + a.n).join(" · ")}${o.err
             ? " · some configurations would not run: " + hesc(o.err) : ""}</span></span>
       </div>
       ${o.found.map(f => `<div class="crow">
         <span class="cst ok">configuration</span>
         <span class="cnm">${Object.entries(f.config).map(([k, v]) =>
           `${hesc(k)} = <b>${hesc(v)}</b>`).join(" · ")}</span>
         <span class="cwy">${hesc(f.why)} <b>Not applied</b> — taking it is a declaration you
           make above.</span>
       </div>`).join("")}
     </div>` : ""}
   </div>`;
}


/* ---- the propositions ------------------------------------------------ */
const PROPS = {out:null, err:"", at:"", imp:"", impres:null, lvl:"full"};

// where a derivative changes sign, narrowed until both sides are proved
/* THE REGION, PROJECTED ONTO THE AXIS THAT WILL BE PLOTTED. The search
   returns boxes in every declared dimension at once, and a plot has one. For
   each cell of the axis the verdict is that cell's only where every box
   covering it agrees; where they disagree the cell is MIXED and is drawn as
   mixed. Projecting without that test would draw a region that holds for some
   setting of the other parameters as though it held for all of them, which is
   the one thing a picture of a scope condition must not do.

   Lifted out of deriveProps so that a line signed by hand on the buffer can
   be plotted by step 4.1 on exactly the same terms as one the automatic
   pass produced. Two band computations would have been two definitions of a
   region. */
function bandsOf(best, x, box){
  const NB = 96, bands = new Array(NB).fill("o");
  if(!box[x]) return bands;
  const b0 = box[x][0], b1 = box[x][1], cw = (b1 - b0) / NB;
  const kinds = [["p", best.proved], ["f", best.failed], ["o", best.open]];
  for(let i = 0; i < NB; i++){
    const c = b0 + (i + 0.5) * cw;
    let seen = "";
    for(const [code, list] of kinds)
      for(const bx of list)
        if(bx[x] && bx[x][0] <= c && c <= bx[x][1]){
          if(!seen) seen = code; else if(seen !== code) seen = "m";
        }
    bands[i] = seen || "o";
  }
  return bands;
}

/* THE SAME 96 CELLS, AS A RANGE RATHER THAN A COLOUR.
   -------------------------------------------------------------------------
   bandsOf says what the verdict is in a cell. This says what the derivative
   can BE there, over every setting of the other parameters at once, which is
   what the plate draws the band from.

   It is built from the same sub-boxes and never from a fresh interval
   evaluation of the whole cell. Interval arithmetic over-estimates and
   proveSign tightens by bisecting, so one call on the undivided cell comes
   back wider than the verdict and would draw a band straddling zero where
   the page says proved. Reading the partition the proof already produced is
   the only construction under which the picture and the word cannot
   disagree: a cell is green exactly when every sub-box over it evaluated
   positive, which is exactly when the union of those intervals is positive.

   A cell with no finite range is null and is drawn as nothing rather than as
   a band off the top of the plot. That happens where a denominator admits
   zero, which is also where proveSign returns open, so the cell is grey
   either way. */
function dbandOf(best, d1, x, box){
  const NB = 96, out = new Array(NB).fill(null);
  if(!box || !box[x] || !d1) return out;
  const b0 = box[x][0], b1 = box[x][1], cw = (b1 - b0) / NB;
  if(!(cw > 0)) return out;
  const all = [].concat(best.proved || [], best.failed || [], best.open || [])
    .filter(bx => bx && bx[x]);
  /* bucketed once: a sub-box touches a contiguous run of cells, and walking
     every box for every cell is 96 times the work for the same answer. */
  const per = new Array(NB); for(let i = 0; i < NB; i++) per[i] = [];
  for(const bx of all){
    const lo = Math.max(0, Math.floor((bx[x][0] - b0) / cw));
    const hi = Math.min(NB - 1, Math.ceil((bx[x][1] - b0) / cw));
    for(let i = lo; i <= hi; i++) per[i].push(bx);
  }
  for(let i = 0; i < NB; i++){
    const cl = b0 + i * cw, ch = b0 + (i + 1) * cw;
    let a = Infinity, z = -Infinity, bad = false, got = false;
    for(const bx of per[i]){
      const lo = Math.max(bx[x][0], cl), hi = Math.min(bx[x][1], ch);
      if(lo > hi) continue;
      const cell = Object.assign(Object.create(null), bx); cell[x] = [lo, hi];
      const iv = ivalTree(d1, cell);
      if(!iv || !isFinite(iv[0]) || !isFinite(iv[1])){ bad = true; break; }
      if(iv[0] < a) a = iv[0];
      if(iv[1] > z) z = iv[1];
      got = true;
    }
    out[i] = (!bad && got) ? [a, z] : null;
  }
  return out;
}

/* The derivative along the same slice the level curve is drawn on: every
   other parameter at the centre of its declared bounds. A point is a
   degenerate interval and every operation on one is exact, so this is the
   value and not a bound on it. Drawn inside the band, it is the one line on
   the plate that answers "and what does it actually do here". */
function dcurveOf(d1, x, box, n){
  const out = [];
  if(!box || !box[x] || !d1) return out;
  const b0 = box[x][0], b1 = box[x][1];
  const at = Object.create(null);
  for(const k of Object.keys(box)) at[k] = [(box[k][0] + box[k][1]) / 2, (box[k][0] + box[k][1]) / 2];
  for(let i = 0; i <= n; i++){
    const v = b0 + (b1 - b0) * i / n;
    at[x] = [v, v];
    const iv = ivalTree(d1, at);
    out.push(iv && isFinite(iv[0]) ? iv[0] : null);
  }
  return out;
}

/* THE SHAPE THE SAMPLED DERIVATIVE HAS, when the prover could not sign one.

   An interior optimum is the most interesting thing a model of this kind can
   say, and it is exactly what the sign prover cannot settle: proveSign asks
   whether the derivative keeps one sign over the WHOLE declared box, and a
   curve that turns keeps neither, so with six variables and a four-hundred
   box budget it runs out before isolating a sign anywhere and answers
   "undecided". Four of the demonstration's findings are that, and all four
   are Rodolphe's first comparative static: integration raises what is
   conceded as the square root and both costs as the square, so each channel
   turns.

   "Undecided" is true and useless there. So when the proof gives up, the
   curve is READ: the derivative is already sampled at 81 points along the
   axis for the plot, and a single clean sign change in it is a turn.

   SAMPLED, AND IT SAYS SO. The other parameters are pinned at their
   midpoints, which is one slice of the box the proof quantifies over. This
   is a reading of a curve, never a theorem about a box, and it is reported
   under its own word so the two can never be mistaken for one another. It
   adds nothing to `share` and does not change the verdict. */
function shapeOf(dcurve){
  const n = (dcurve || []).length;
  if(n < 9) return null;
  const EPS = 1e-9;
  let first = 0, last = 0, cross = -1, changes = 0, pos = 0, neg = 0, fin = 0;
  for(let i = 0; i < n; i++){
    const z = dcurve[i];
    /* SKIPPED, NOT FATAL. A square root has no derivative at zero, so the
       first sample of any curve with one in it comes back undefined -- and
       bailing on it threw away the one finding this whole function exists
       for. A hole is a point the slice says nothing about; the rest of the
       curve still says what it says. */
    if(z == null || !isFinite(z)) continue;
    fin++;
    const sg = z > EPS ? 1 : z < -EPS ? -1 : 0;
    if(!sg) continue;
    if(sg > 0) pos++; else neg++;
    if(!first) first = sg;
    if(last && sg !== last){ changes++; cross = i; }
    last = sg;
  }
  if(fin < n * 0.7 || !first) return null;     // too little curve to read
  /* ONE CHANGE IS A TURN, and enough of the curve on each side of it that a
     single stray sample cannot be read as one. */
  if(changes === 1 && first !== last && pos >= 3 && neg >= 3)
    return {kind:first > 0 ? "peak" : "trough", at:cross / (n - 1), n:fin};
  /* NO CHANGE IS A DIRECTION. The prover answers over the whole declared
     box and gives up when it cannot sign one corner of it; the slice can
     still be flatly one-signed, and saying so is more use than "undecided"
     as long as the word says which of the two it is. */
  if(!changes && (pos === 0 || neg === 0))
    return {kind:first > 0 ? "rises" : "falls", at:null, n:fin};
  return null;
}

function deriveProps(){
  PROPS.err = ""; PROPS.out = null;
  const spec = classSpec();
  if(!spec){ PROPS.err = "nothing to derive from: no arithmetic was kept on step 3.1"; return; }
  const M = buildArith(spec);
  if(!M.steps.length){ PROPS.err = "the kept arithmetic no longer reads"; return; }
  const box = {}, names = [];
  for(const k of M.params){ box[varName(k)] = abnd(k); names.push(varName(k)); }
  for(const c of M.consts){ box[c.name] = wbnd(c); names.push(c.name); }
  const props = [];
  for(const k of M.outs){
    const yk = varName(k);
    const ino = inlineOutcome(M, yk);
    if(ino.err){ props.push({y:yk, err:ino.err}); continue; }
    /* Resolve the corners before differentiating. A substitute set whose
       winner is determinate over the declared range has no corner in it, and
       every outcome written with max used to come back as "not derived" for
       want of asking. */
    const mr = mmResolve(ino.tree, box);
    const ftree = mr.tree;
    for(const p of M.params){
      const x = varName(p);
      if(!hasVar(ftree, x)) continue;
      const d1raw = dTree(ftree, x);
      const d1 = simp(d1raw);
      if(d1.t === "nd"){
        const o0 = mr.open[0];
        props.push({y:yk, x, f:ftree,
          corner:o0 ? o0.fn + "(" + treeText(o0.a) + ", " + treeText(o0.b) + ")" : "",
          err:mr.open.length ? mmWhy(mr, box) : d1.why});
        continue;
      }
      const up = proveSign(d1, box, +1, {}), dn = proveSign(d1, box, -1, {});
      /* A derivative that never leaves zero satisfies both directions, so the
         tie would be broken toward "rises". It has no direction: 0, which is
         what every consumer that asks for one tests against. */
      const dir = up.verdict === "flat" ? 0 : up.share >= dn.share ? 1 : -1;
      const best = dir === -1 ? dn : up;
      const flip = best.verdict === "partial" ? locateFlip(d1, box, x) : null;
      // the comparative static on that stationary point, which the implicit
      // function theorem gives without ever solving for it
      const d2 = simp(dTree(d1, x));
      /* The implicit function theorem is about a point where the derivative
         vanishes. Where it is signed on the whole box there is no such point,
         and "at the stationary point" would be a sentence about nothing. */
      const cs = [];
      for(const c of (flip ? M.consts : [])){
        if(!hasVar(d1, c.name)) continue;
        const dxk = simp(dTree(d1, c.name));
        if(dxk.t === "nd" || d2.t === "nd") continue;
        const e = simp(NEG(OP("/", dxk, d2)));
        const sp = proveSign(e, box, +1, {}), sn = proveSign(e, box, -1, {});
        cs.push({k:c.name, e, sign:sp.verdict === "proved" ? 1 : sn.verdict === "proved" ? -1 : 0});
        if(cs.length >= 3) break;
      }
      /* THE REGION, PROJECTED ONTO THE AXIS THAT WILL BE PLOTTED. The
         search returns boxes in every declared dimension at once, and a plot
         has one. For each cell of the axis the verdict is that cell's only
         where every box covering it agrees; where they disagree the cell is
         MIXED and is drawn as mixed. Projecting without that test would draw
         a region that holds for some setting of the other parameters as
         though it held for all of them, which is the one thing a picture of
         a scope condition must not do. */
      const bands = bandsOf(best, x, box);
      const dcurve = dcurveOf(d1, x, box, 80);
      /* Only where the proof gave up: a signed box is an answer already, and
         a sampled reading beside it would be a second voice on a settled
         question. */
      const sh = best.verdict === "undecided" ? shapeOf(dcurve) : null;
      /* A direction has no turning point, and `null * range` is 0 -- which
         would have put "bottoms out near 0.000" on every sampled rise. */
      const shape = sh ? {kind:sh.kind, n:sh.n,
        at:sh.at == null ? null : box[x][0] + sh.at * (box[x][1] - box[x][0])} : null;
      props.push({y:yk, x, f:ftree, fraw:ino.tree, binds:mr.bound, d1, d1raw, d2, dir, flip, cs, bands, shape,
        dband:dbandOf(best, d1, x, box), dcurve,
        xbox:box[x].slice(),
        verdict:best.verdict, share:best.share, open:best.openShare,
        boxes:best.boxes, witness:best.witness});
    }
  }
  PROPS.out = {props, box, names, M};
  PROPS.at = new Date().toISOString().slice(0, 16).replace("T", " ");
  /* The automatic pass is now the buffer's SEED rather than the whole step.
     Deriving again rebuilds it from scratch, which drops hand work -- correct,
     because the model it was derived against has changed, and the button says
     so. */
  bufSeed();
}

/* What a modeller's own tool sends back is checked by bufImport below,
   against the line it is an answer about rather than against every
   derivative at once. */

/* ---------------------------------------------------------------------------
   Scoring a candidate.

   The bench asks a language model for candidate predictions about the curated
   model, and then does NOT ask it which of them matter. An answer handed its
   own hypothesis comes back confirmed. So the order is computed here, by
   arithmetic, against criteria the scholar declares.

   THE CRITERION SET IS OPEN AND THE COMPUTABLE SET IS NOT. Four axes used to
   be presented as what interesting means, which was the same imposition this
   whole project argues against -- a contested construct, declared by me, in
   the one place the bench does not let anybody else default. They are now
   presented as what they are: the four quantities a browser can compute about
   a candidate. A scholar writes their criteria in prose, those compile into
   weights over these four, and every part of what they wrote that none of the
   four reaches is named verbatim and reported as not having affected the
   order. That list is the honest half of the answer, which is why the prompt
   asks for it twice and the panel prints it in the negative colour.

   The four, then:

     material     the effect clears the minimum the theory is about, which is
                  already declared on this step and is the kernel's
                  minimum_effect rather than anything new
     novel        no carried relation runs from the antecedent to the
                  consequent. A prediction about a pair somebody already
                  asserted is a confirmation; one about a pair joined only
                  through a path is what a model is for
     composition  the ablation lattice. Disable each mechanism alone: if the
                  prediction dies, it belongs to that mechanism. If it
                  survives every singleton and dies under a PAIR, it exists
                  only in the interaction, which is the case single-mechanism
                  ablation reports as nothing mattering
     robust       it still holds with each weight at half and at double

   The lattice is the one with a claim behind it. 82 consequents in the corpus
   carry two or more distinct causes from two or more independent papers, 37%
   of claims, so substitutes are the normal case and a loop that only ablates
   singletons reports that neither of a substituting pair mattered. */
/* How the antecedent reaches the consequent, which is what makes a prediction
   about the model rather than about a claim already in it. */
function predPath(from, to){
  const rels = carriedRelations();
  if(rels.some(r => r.from === from && r.to === to)) return {k:"direct", n:1};
  const adj = new Map();
  for(const r of rels){ if(!adj.has(r.from)) adj.set(r.from, []); adj.get(r.from).push(r.to); }
  let edge = [from], seen = new Set([from]);
  for(let d = 2; d <= 6 && edge.length; d++){
    const next = [];
    for(const a of edge) for(const b of (adj.get(a) || [])){
      if(b === to) return {k:"indirect", n:d};
      if(!seen.has(b)){ seen.add(b); next.push(b); }
    }
    edge = next;
  }
  return {k:"none", n:0};
}

/* The lattice. Singletons first, because a prediction that dies when one
   mechanism is switched off is that mechanism's prediction and there is
   nothing to look for in the pairs. */
function ablationClass(M, c, pts){
  const terms = M.steps.filter(s => s.kind === "term").map(s => s.lhs);
  /* "y rises in x" is not satisfied by a y that stopped moving. Ablate a
     mechanism out of the path and the sweep goes flat, which is weakly
     increasing and therefore passes the predicate while asserting nothing --
     so a collapse counts as a kill, which is the whole point of asking what
     the prediction depends on. */
  const xk0 = carriedVars().find(k => varName(k) === String(c.x));
  const span = off => {
    if(!xk0 || !M.params.includes(xk0) || !c.y) return null;
    const w = asweep(M, xk0, String(c.y), 20, off);
    return Math.max.apply(null, w.ys) - Math.min.apply(null, w.ys);
  };
  const base = span(null);
  const holds = off => {
    try{
      if(!runPredicate(M, c, pts.map(x => ({tag:x.tag, S:runAt(M, x.p, off)})), off).ok) return false;
      if(off && base != null){
        const sp = span(off);
        if(sp != null && !(sp > 1e-9 + 1e-6 * Math.abs(base))) return false;
      }
      return true;
    }catch(e){ return null; }
  };
  /* The search itself moved to kernel.js, where it can be tested: singletons
     first, then bounded pairs. It is the one piece of this bench with a claim
     of its own behind it, it had never run outside a browser, and it had
     therefore never been shown to return `pair` at all -- both seeded
     scenarios reach every outcome by one route.

     What stays here is the predicate, which is the part that needs the
     curation: the bound a sweep runs over, the name a quantity was declared
     under, and the four forms a prediction can take. The kernel is handed
     `holds` and knows nothing about any of it. */
  return ablate(terms, holds);
}

function scoreOne(M, c, pts, spec){
  const runs = pts.map(x => ({tag:x.tag, S:runAt(M, x.p, null)}));
  let v;
  try{ v = runPredicate(M, c, runs); }
  catch(e){ return {c, skip:true, why:"not run: " + (e && e.message ? e.message : "unknown")}; }

  // material -- the size of what it is about, against the declared minimum
  let eff = 0, escale = "";
  const yk = String(c.y || ""), xk = carriedVars().find(k => varName(k) === String(c.x));
  if(yk && xk && M.params.includes(xk)){
    const w = asweep(M, xk, yk, 20);
    const lo = Math.min.apply(null, w.ys), hi = Math.max.apply(null, w.ys);
    const ky = carriedVars().find(k => varName(k) === yk);
    const b = ky ? abnd(ky) : [0, 1];
    const span = Math.max(1e-9, bdec(ky) ? b[1] - b[0] : Math.max(1e-9, hi - lo));
    eff = 100 * (hi - lo) / span;
    escale = bdec(ky) ? "of its declared range" : "of its own observed range, no bound being declared";
  }else{
    // a nonneg test is about a margin rather than a movement
    const vals = runs.map(r => r.S[Object.keys(r.S)[0]]);
    eff = 100; escale = "not a movement, so the minimum effect does not bite on it";
  }
  const matter = (typeof state !== "undefined" && state.matter) || 0;
  const material = {ok:!matter || eff >= matter, v:eff,
    s:matter ? Math.min(1, eff / matter) : 1,
    why:(eff === 100 && !escale.indexOf("not a movement") ? escale
      : eff.toFixed(1) + "% " + escale) +
      (matter ? ", against a declared minimum of " + matter.toFixed(1) + "%" : "; no minimum declared")};

  // novel
  const p = (xk && yk) ? predPath(xk, carriedVars().find(k => varName(k) === yk)) : {k:"none"};
  const novel = {k:p.k, s:p.k === "indirect" ? 1 : p.k === "direct" ? 0 : 0.3,
    why:p.k === "direct" ? "a carried relation already runs from " + c.x + " to " + c.y +
          ", so this confirms a relationship rather than adding one"
      : p.k === "indirect" ? "nothing asserts " + c.x + " on " + c.y + " directly; they are joined " +
          "through " + p.n + " links, so this is the model talking and not the corpus"
      : "no path joins them in the carried set at all, which is worth looking at before trusting it"};

  // composition
  const comp = ablationClass(M, c, pts);

  // robust -- the weights, which nothing in the corpus fixes
  let held = 0, tried = 0, broke = [], guessed = 0;
  for(const k of (spec.constants || [])){
    // the ends of its declared interval where it has one, and half and double
    // where it does not, which the row then says rather than passing off
    const b = wbnd(k);
    if(!wdec(k)) guessed++;
    for(const val of (wdec(k) ? [b[0], b[1]] : [k.value * 0.5, k.value * 2])){
    const alt = {constants:spec.constants.map(d =>
      d.name === k.name ? Object.assign({}, d, {value:val}) : d),
      lines:spec.lines, checks:spec.checks};
    const M2 = buildArith(alt);
    if(!M2.steps.length) continue;
    tried++;
    try{
      const r2 = runPredicate(M2, c, pts.map(x => ({tag:x.tag, S:runAt(M2, x.p, null)})));
      if(r2.ok) held++; else broke.push(k.name + " at " + (+val).toPrecision(3));
    }catch(e){ broke.push(k.name + " at " + (+val).toPrecision(3) + " could not be run"); }
    }
  }
  const nw = (spec.constants || []).length;
  const tail = guessed
    ? "; " + guessed + " of " + nw + " ha" + (guessed === 1 ? "s" : "ve") +
      " no declared interval, so half and double stand in for one"
    : "";
  const robust = {s:tried ? held / tried : 1, held, tried,
    why:!tried ? "no weights to move" : (held === tried
      ? "it holds at both ends of every weight" + tail
      : "it breaks at " + broke.slice(0, 3).join(", ") + " — " + held + " of " + tried +
        " settings" + tail)};

  return {c, skip:false, verdict:v, material, novel, comp, robust};
}


/* WHAT THE DERIVATION PROPOSES, AS CANDIDATES.

   The two halves of this step did not meet. An LLM proposed predictions from
   the declarations and the scorer ranked them; the derivation signed
   derivatives over the declared box and proved regions for them. So the
   best-warranted results on the page were not in the ranking, and everything
   in the ranking had no proof behind it.

   A signed derivative IS a prediction -- y rises in x, over this region --
   and it arrives in exactly the form runPredicate already runs. So it enters
   the ranking as a candidate like any other, on the same four quantities,
   carrying the verdict it earned. An asked-for candidate now competes against
   a proved one, which is the comparison that makes a ranking mean anything.

   It reads PROPS.out.props, which is the STATED set: everything the automatic
   pass produced, plus every line somebody signed on the buffer and stated. So
   a proposition derived by hand reaches the ranking, the plots on step 4.1
   and the exports without any of them knowing where it came from -- one store,
   two authors.

   What it does NOT do is award itself the robust axis. The proof holds over
   the weight intervals that were declared; the robustness sweep also moves a
   weight to half and to double where no interval was declared, which is
   outside what was proved. Both answers are worth having and they are
   different answers, so the row says which it got. */
function derivedCandidates(){
  if(!PROPS.out) return [];
  /* A FLAT FINDING IS NOT A CANDIDATE PROPOSITION. This page states one as
     "y rises in x" or "y falls in x", and a derivative that is identically
     zero is neither: `form` and `for` are built from the direction, so a flat
     result would arrive here labelled as a rise. "Does not move with it" is a
     finding about the model and worth having -- it is on the derivation row
     and in the sentence -- and it is not a comparative static, so it is not
     offered as one. */
  return PROPS.out.props.filter(p => keptPlot(p) && p.verdict !== "flat").map((p, i) => ({
    id:"d" + i, src:"derived", form:p.dir > 0 ? "up" : "down", y:p.y, x:p.x,
    verdict:p.verdict, share:p.share, flip:p.flip,
    for:(p.dir > 0 ? p.y + " rises in " + p.x : p.y + " falls in " + p.x),
    why:p.verdict === "proved"
      ? "Derived, not proposed: the sign of the derivative is proved over the whole declared box."
      : "Derived, not proposed: proved on " + (100 * p.share).toFixed(1) + "% of the box" +
        (p.flip ? ", turning inside [" + p.flip[0].toFixed(4) + ", " + p.flip[1].toFixed(4) + "]"
                : "") + "."}));
}
function runScorer(){
  SCORE.err = ""; SCORE.rows = null;
  const spec = classSpec();
  if(!spec){ SCORE.err = "nothing to score against: no arithmetic was kept on step 3.1"; return; }
  const M = buildArith(spec);
  if(!M.steps.length){ SCORE.err = "the kept arithmetic no longer reads"; return; }
  // the derivation's own propositions lead, because they arrive with a proof
  const cand = derivedCandidates().concat(SCORE.prop);
  if(!cand.length){ SCORE.err = "nothing to score yet — derive above, or ask for predictions"; return; }
  const pts = asamples(M, 21);
  const rows = cand.map(c => scoreOne(M, c, pts, spec));
  rankBy(rows, theRule());
  SCORE.rows = rows;
  // the funnel, because fifty candidates and one winner is a multiple
  // comparison wearing a method's clothes unless the count is on the page
  SCORE.funnel = {
    got:rows.length,
    derived:rows.filter(r => r.c && r.c.src === "derived").length,
    ran:rows.filter(r => !r.skip).length,
    material:rows.filter(r => !r.skip && r.material.ok).length,
    novel:rows.filter(r => !r.skip && r.novel.k === "indirect").length,
    comp:rows.filter(r => !r.skip && r.comp.k === "pair").length,
    kept:rows.filter(r => r.total > 0).length};
  SCORE.at = new Date().toISOString().slice(0, 16).replace("T", " ");
}

/* Tests asked for here rather than derived. Kept apart from step 3.1's
   invariants for the same reason those are kept apart from the derived ones:
   the warrant is a judgement somebody agreed with. */
/* A regularity condition, typed. Asking an LLM was the only way to add one
   that the page could actually run, which is the wrong default for a step
   whose whole argument is that a declaration is the modeller's. Four forms,
   because they are the four a browser can answer, in the words you would use
   to say them. */
const COND_FORMS = [
  [/^(.+?)\s*>=\s*0$/i,                                    m => ({form:"nonneg", expr:m[1]})],
  [/^([a-z][a-z0-9_]*)\s+rises\s+in\s+([a-z][a-z0-9_]*)$/i, m => ({form:"up", y:m[1], x:m[2]})],
  [/^([a-z][a-z0-9_]*)\s+falls\s+in\s+([a-z][a-z0-9_]*)$/i, m => ({form:"down", y:m[1], x:m[2]})],
  [/^([a-z][a-z0-9_]*)\s+peaks\s+in\s+([a-z][a-z0-9_]*)$/i, m => ({form:"peak", y:m[1], x:m[2]})],
];
function parseCond(text){
  const t = String(text || "").trim().replace(/\s+/g, " ");
  if(!t) return {err:"nothing typed"};
  for(const [re, f] of COND_FORMS){
    const m = re.exec(t);
    if(m) return f(m);
  }
  return {err:'not one of the four forms. Write "vp - vs >= 0", or "vp rises in pi", ' +
    'or "vp falls in pi", or "vp peaks in pi".'};
}
/* Checked before it is kept, against the model as it stands, so a condition
   naming something that does not exist is refused here rather than reported
   as not run for the rest of the session. */
function addCond(text){
  const c = parseCond(text);
  if(c.err) return c;
  const spec = classSpec();
  const M = spec ? buildArith(spec) : null;
  if(!M || !M.steps.length) return {err:"write the arithmetic first, so there is something to hold to it"};
  const scope = new Set([...M.params.map(varName), ...M.consts.map(x => x.name),
    ...M.steps.map(x => x.lhs)]);
  if(c.form === "nonneg"){
    try{ readExpr(c.expr, scope); }
    catch(e){ return {err:(e && e.message) || "cannot read it"}; }
  }else{
    if(!M.steps.some(x => x.lhs === c.y)) return {err:c.y + " is not something the arithmetic writes"};
    const xk = carriedVars().find(k => varName(k) === c.x);
    if(!xk || !M.params.includes(xk)) return {err:c.x + " is not a free parameter"};
  }
  const id = newId("t");
  xtest.set(id, Object.assign({id, for:String(text).trim().slice(0, 60), why:"written here",
    at:new Date().toISOString().slice(0, 10)}, c));
  tsaveLocal();
  return {ok:true};
}

/* Two things accepted in the same millisecond got the same id and the second
   replaced the first, which is how adding two conditions kept one. */
let NIDC = 0;
const newId = p => p + Date.now().toString(36) + (NIDC++).toString(36);

const RUNFORM = f => ["nonneg", "up", "down", "peak"].includes(String(f));

const CONDTXT = {t:"", err:""};
function addCondUI(){
  const r = addCond(CONDTXT.t);
  if(r.err){ CONDTXT.err = r.err; }
  else { CONDTXT.t = ""; CONDTXT.err = ""; if(CT.rows) runClassTests(); }
  renderPanel();
}

const xtest = new Map();
function tsaveLocal(){ lsWrite("purposeTests", [...xtest.values()]); }
function tloadLocal(){
  const v = lsRead("purposeTests");
  if(v) v.forEach(x => xtest.set(x.id, x));
}

const showLvl = p => PROPS.lvl === "raw" ? p.d1raw
  : PROPS.lvl === "light" ? simp(p.d1raw, true) : p.d1;

/* ---------------------------------------------------------------------------
   THE DERIVATION BUFFER.

   Deriving used to be one button that walked every outcome against every
   parameter through one fixed pipeline, and the only thing a scholar could
   bring back from their own algebra was a claimed stationary point. So the
   automatic half could not be steered and the manual half was a cul-de-sac,
   and nothing passed between them. Both halves were on the page; neither
   could reach the other.

   A buffer is what lets them meet. It is an ordered list of expressions, each
   one carrying WHERE IT CAME FROM and WHAT THE CHECKER SAID, and every
   operation this page can perform on an expression is a command that reads one
   line and either appends another or attaches a verdict to the one it read.
   "derive" now SEEDS the buffer rather than being the whole step, so the
   automatic pipeline's output is the manual mode's input, in one object. That
   is the whole of the interweaving: there is no handoff, because there is only
   one list.

   WHY ROWS AND NOT A CHAT. A sequence of named commands over named
   expressions is a script: it exports, it re-runs, and a replicator gets the
   same propositions. A conversation does not re-run, and reproducibility is
   the first gate this project is built to clear. The second reason is sharper.
   This bench proposes externally and verifies internally; in a transcript the
   proposal and the verified result arrive in the same voice, in the same
   bubble, in the same type. Here the stamp on the left says derived, written,
   proposed or returned, and whether the checker has seen it -- which is the
   warrant separation this file has now discovered four times.

   WHAT STATING DOES. PROPS.out.props stays the canonical set: step 4.1 plots
   it and the exports write it. A line the automatic pass produced is stated
   when it is seeded, because running "derive" IS accepting that pass. A line
   derived by hand is stated only when somebody clicks, and stating pushes a
   proposition of exactly the same shape into the same set -- so step 4.1,
   the exports and the ranking need to know nothing about any of this. One
   store, two authors. */
const BUF = {lines:[], sel:"", seq:0, err:"", hand:"", imp:"", at:""};
/* WHEN A LINE IS A CANDIDATE FINDING, asked in one place.
   ==========================================================================

   Step 3.2's two tabs have to agree about what counts as a candidate
   finding, or a reader cannot relate one list to the other.

   They did not. Step 3.2's two tabs each counted this for themselves and did not
   agree: the Findings tab asked for a line that names an outcome AND a
   parameter and carries either a proof or a sample, and the Derivation tab
   asked only whether it carried a proof. So a line settled by sampling was a
   candidate finding on one tab and an unsigned line on the other, and a proof
   over something that is not an outcome-and-parameter pair was the reverse.
   On the shipped project both came to four and the disagreement was invisible,
   which is the worst place for one to sit.

   One predicate now, and both tabs ask it. A line is a candidate finding when
   it says WHICH quantity moves with WHICH, and something has settled it. */
const lineSigned = l => !!(l && l.y && l.x && (l.res || l.sim));
const bstamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

/* The stamp. Four warrants, and the difference between them is the only thing
   on this surface that cannot be recomputed. */
const BSRC = {
  auto:["derived",  "produced by a command on this page, out of the arithmetic step 3.1 kept"],
  hand:["written",  "written or substituted by you — nothing about it is checked until it is signed"],
  ai:  ["proposed", "proposed by an LLM, and not checked by anything"],
  tool:["returned", "brought back from your own tool and checked here rather than trusted"],
};

/* The model a command runs against, rebuilt per command rather than cached.
   The arithmetic on step 3.1 and the bounds on step 3.1 can both change
   between two commands, and a buffer that went on signing against the box it
   was seeded under would be proving things about a model nobody has. */
function bufModel(){
  const spec = classSpec();
  if(!spec) return {err:"no arithmetic was kept on step 3.1, so there is nothing to derive from"};
  const M = buildArith(spec);
  if(!M.steps.length) return {err:"the kept arithmetic no longer reads against these declarations"};
  const box = {};
  for(const k of M.params) box[varName(k)] = abnd(k);
  for(const c of M.consts) box[c.name] = wbnd(c);
  return {M, box, spec};
}

function bufPush(o){
  const l = Object.assign({src:"auto", stated:false, cmd:"", y:"", x:""}, o,
    {id:"L" + (++BUF.seq)});
  l.text = l.tree ? treeText(l.tree) : "";
  BUF.lines.push(l);
  BUF.sel = l.id;
  return l;
}
const bufFind = id => BUF.lines.find(l => l.id === id) || null;
const bufSel = () => bufFind(BUF.sel);
const bufShow = l => !l || !l.tree ? null
  : PROPS.lvl === "raw" ? (l.raw || l.tree)
  : PROPS.lvl === "light" ? simp(l.raw || l.tree, true) : l.tree;

/* Seeding. Every proposition the automatic pass produced arrives as a line,
   stated, with the outcome it came from written out above it -- because the
   inlined function is what was differentiated and a derivative whose parent
   is not on the page is a step nobody can check. */

export { BSRC, BUF, CONDTXT, lineSigned, COND_FORMS, NIDC, PROPS, RUNFORM, ablationClass, addCond, addCondUI, bandsOf, bstamp, dbandOf, dcurveOf, bufFind, bufModel, bufPush, bufSel, bufShow, deriveProps, derivedCandidates, inlineOutcome, newId, parseCond, predPath, runScorer, runSearch, scoreOne, searchAxes, searchBlockHTML, showLvl, specForConfig, tloadLocal, tsaveLocal, xtest };

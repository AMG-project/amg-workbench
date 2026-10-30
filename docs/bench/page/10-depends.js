/* AMG bench, page script 11 of 22: what a conclusion actually rests on.
   One shared global scope, loaded in order. See page/README.md. */
import { asweep } from "../core/invariants.js";
import { afin } from "../core/curve.js";
import { hesc } from "../core/safe.js";
import { SAXES, SCORE, theRule } from "../core/rank.js";
import { GUESSLAB, lineSays, vTurned } from "../core/verdict.js";
import { NEG, OP, dTree, evalRPN, flatProd, hasVar, ivalTree, keyOf, locateFlip, mmResolve, mmSpread, mmWhy, proveSign, readExpr, rpnTree, simp, treeText } from "../core/kernel.js";
import { FAMALIAS, FAMCORPUS, FORMLIB, FORM_ENDS, FORM_PROPS, formByName, formsFor, formsTag } from "../core/forms.js";
import { bufLab } from "../core/export.js";
import { ALINE, ARITH, CT, abnd, aiMark, arithToText, bdec, buildArith, classSpec, keptModel, parseArith, shapeVerdict, takeArith, treeHTML, wbnd, wdec } from "./08-ask.js";
import { BOARD, GUESS, MTH, gkey, guessOpen, nrnd, primBox, propSentence, boardStands, simSign, stands, stochOf, vdHTML } from "./05-explore.js";
import { BSRC, BUF, PROPS, bandsOf, bstamp, bufModel, bufPush, bufSel, bufShow, dbandOf, dcurveOf, inlineOutcome } from "./09-derive.js";
import { WS, lineScoreHTML, wsBarHTML, wsDataHTML, wsFoldName, wsLines, wsRailHTML, wsRowActs, wsToolsHTML } from "./18-workspace.js";
import { carriedRelations, carriedVars, propsOf } from "./07-grouping.js";
;
import { lsRead, lsWrite, noteFail } from "./03-stores.js";
import { mechNames, varName } from "./11-classes.js";
import { rulesOf } from "./03b-decisions.js";
import { stampLines } from "./17-scenarios.js";
/* ------------------------------------ what a conclusion actually rests on */
/* Step 3.1 asks for fourteen declarations on the demo and twenty-four on the
   eleven-mechanism model, and asks for all of them BEFORE anything has been
   derived. Most conclusions do not use most of them. So derive first, and then
   ask of one conclusion which declarations it would have noticed.

   The test is the ablation lattice's, pointed at a PROVED line instead of a
   sampled predicate: rewrite the model with one mechanism's term set to zero,
   differentiate again, prove the sign again, and see whether the verdict moved.
   A mechanism the conclusion does not notice is one whose role and whose shape
   class this conclusion does not rest on -- get those wrong and this sentence
   is unaffected.

   What this must NOT be read as saying: a step-five declaration never enters a
   derivative directly. They all act through step 3.1, by deciding which
   arithmetic could be kept at all. So "rests on" means: if that declaration
   turns out to be wrong, this is a conclusion to re-examine — and the ones it
   does not rest on are the ones you can stop worrying about. */
const DEPCAP = 24;
function depsOf(l){
  if(!l || !l.res || !l.y || !l.x) return {err:"that line is not a signed derivative"};
  const base = classSpec();
  if(!base) return {err:"no arithmetic is kept, so there is nothing to re-derive"};
  let M0; try{ M0 = buildArith(base); }catch(e){ return {err:"the kept arithmetic no longer reads"}; }
  const terms = M0.steps.filter(x => x.kind === "term");
  if(!terms.length) return {err:"the kept arithmetic carries no mechanism terms"};
  if(terms.length > DEPCAP) return {err:terms.length +
    " mechanisms is past the " + DEPCAP + " this page re-derives one at a time"};
  /* The ORIGINAL box throughout, including for the ablated models: zeroing a
     term can drop a parameter from the model, and a comparison run over a
     different box is not a comparison. */
  const box = {};
  for(const k of M0.params) box[varName(k)] = abnd(k);
  for(const c of M0.consts) box[c.name] = wbnd(c);

  const verdictOf = spec => {
    let M; try{ M = buildArith(spec); }catch(e){ return {v:"broke"}; }
    if(!M.steps.length) return {v:"broke"};
    const ino = inlineOutcome(M, l.y);
    if(ino.err) return {v:"gone"};
    const mr = mmResolve(ino.tree, box);
    /* NORMALISED, because this verdict is compared for equality: a term is
       called idle when switching it off leaves the verdict where it was. The
       outcome not moving with the parameter can be found two ways -- the name
       is not in the tree at all, or the derivative is identically zero -- and
       they are the same answer. Left unnormalised, the first came back with no
       direction and the second with direction 1, so a term whose ablation
       merely removed the name from the tree was reported as moving the
       verdict. */
    const FLAT = {v:"flat", dir:0, share:1};
    if(!hasVar(mr.tree, l.x)) return FLAT;
    const d1 = simp(dTree(mr.tree, l.x));
    if(d1.t === "nd") return {v:"corner"};
    const up = proveSign(d1, box, +1, {}), dn = proveSign(d1, box, -1, {});
    if(up.verdict === "flat") return FLAT;
    const best = up.share >= dn.share ? up : dn;
    return {v:best.verdict, dir:up.share >= dn.share ? 1 : -1,
      share:Math.round(best.share * 1e6) / 1e6};
  };
  const zero = lhs => ({constants:base.constants, checks:base.checks,
    lines:base.lines.map(z => z.lhs === lhs ? {lhs:z.lhs, rhs:"0", why:z.why} : z)});
  const same = (a, b) => !!a && !!b && a.v === b.v && a.dir === b.dir && a.share === b.share;

  const b0 = verdictOf(base);
  const used = [], idle = [];
  for(const t of terms){
    const r = verdictOf(zero(t.lhs));
    (same(b0, r) ? idle : used).push({lhs:t.lhs, rel:t.rel || null, now:(r || {}).v});
  }
  /* Which ranges the proof actually ran over, and which of those nobody
     declared. A conclusion proved over a default interval is the failure this
     bench exists to catch, and it is worth saying per conclusion and not only
     per model. */
  const reads = [];
  for(const k of carriedVars()){
    const n = varName(k);
    if(!box[n] || !hasVar(l.tree, n)) continue;
    reads.push({n, dec:bdec(k)});
  }
  const yk = carriedVars().find(k => varName(k) === l.y);
  const mine = terms.filter(t => t.rel && varName(t.rel.to) === l.y);
  return {base:b0, used, idle, reads, nterm:terms.length,
    rule:{n:mine.length, rules:yk ? rulesOf(yk) : [],
      live:mine.length > 1 && used.some(u => u.rel && varName(u.rel.to) === l.y)}};
}

function depsHTML(d){
  if(!d) return "";
  if(d.err) return `<i class="bnote">could not work out what it rests on: ${hesc(d.err)}</i>`;
  /* The term's own name is t_<mechanism>, which on this corpus runs to sixty
     characters. The mechanism is what the sentence is about. */
  const nm = u => hesc(String(u.lhs).replace(/^t_/, "").replace(/_/g, " "));
  const decl = d.used.filter(u => u.rel).length * 2 + (d.rule.live ? 1 : 0);
  const undec = d.reads.filter(r => !r.dec);
  const L = [];
  L.push(`<b>${d.used.length}</b> of ${d.nterm} mechanism${d.nterm === 1 ? "" : "s"}` +
    (d.used.length ? `: ${d.used.map(nm).join(", ")}` : "") +
    (decl ? ` — so on <b>${decl}</b> declaration${decl === 1 ? "" : "s"}, ` +
      `the role and shape class of ${d.used.filter(u => u.rel).length} relation` +
      `${d.used.filter(u => u.rel).length === 1 ? "" : "s"}` +
      `${d.rule.live ? " and the combination rule" : ""}` : ""));
  if(d.idle.length) L.push(`switching off ${d.idle.map(nm).join(" or ")} alone does not move the ` +
    `verdict, so whatever ${d.idle.length === 1 ? "it was" : "they were"} declared to be, ` +
    `this sentence is unaffected`);
  if(!d.rule.live && d.rule.n <= 1)
    L.push(`the combination rule does nothing here: ${hesc(d.y || "the outcome")} has one term`);
  if(d.reads.length) L.push(`proved over ${d.reads.length} range${
    d.reads.length === 1 ? "" : "s"}` +
    (!undec.length ? `, every one of them declared`
     : undec.length === d.reads.length
     ? `, <b>none</b> of which anybody declared (${undec.map(r => hesc(r.n)).join(", ")}) — ` +
       `so the proof is over this page's default there, which is not an obligation anyone took on`
     : `, <b>${undec.length}</b> of which nobody declared (${
       undec.map(r => hesc(r.n)).join(", ")}) — the proof is over this page's default there`));
  return `<i class="bnote bdep">rests on: ${L.join(" — ")}</i>`;
}

function bufSeed(){
  BUF.lines = []; BUF.seq = 0; BUF.sel = ""; BUF.err = "";
  const P = PROPS.out;
  if(!P) return;
  const seen = new Set();
  for(const p of P.props){
    /* The outcome's own line goes on FIRST, before any verdict about it,
       including a failure. It used to sit after the error branch returned, so
       an outcome whose every derivative hit a corner contributed nothing but
       rows saying "not derived" -- and the one row telling you to split was
       the one row carrying no expression to split. The line with the min or
       max in it is the thing to act on, so it has to be on the page. */
    if(p.f && !seen.has(p.y)){
      seen.add(p.y);
      bufPush({cmd:"inline", y:p.y, tree:p.f, raw:p.f,
        note:p.y + " written out in the free parameters, which is the form that can be differentiated"});
    }
    if(p.err){
      bufPush({cmd:"diff", y:p.y, x:p.x || "", bad:p.err, corner:p.corner});
      continue;
    }
    bufPush({cmd:"diff", y:p.y, x:p.x, tree:p.d1, raw:p.d1raw, cs:p.cs, flip:p.flip,
      binds:p.binds,
      res:{dir:p.dir, verdict:p.verdict, share:p.share, open:p.open, boxes:p.boxes,
           witness:p.witness, shape:p.shape || null},
      bx:P.box, best:null, p, stated:true, at:PROPS.at});
  }
  BUF.at = PROPS.at;
  BUF.sel = (BUF.lines.find(l => l.res) || BUF.lines[0] || {}).id || "";
}

/* A menu that offers a name the expression does not contain is a menu whose
   answer is always zero. */
function bufDiffNames(l, mm){
  if(!l || !l.tree) return [];
  return mm.M.params.map(varName).filter(n => hasVar(l.tree, n));
}
function bufConstNames(l, mm){
  if(!l || !l.tree) return [];
  return mm.M.consts.map(c => c.name).filter(n => hasVar(l.tree, n));
}

/* What can be run on the selection, and WHY NOT where it cannot. A command
   that fails when clicked teaches nothing; a disabled command carrying its own
   reason is the same information before the click. */
/* The line a split would actually act on: the selected one if it carries an
   expression, otherwise the outcome's own line, which is where the corner is.
   A row that reports a corner and the row that contains it are two views of
   one fact. */
function bufSplitTarget(l){
  if(!l) return null;
  if(l.tree) return l;
  if(!l.corner || !l.y) return null;
  return BUF.lines.find(z => z.cmd === "inline" && z.y === l.y && z.tree) || null;
}
function bufCan(l, mm){
  const no = {};
  const ns = l ? bufDiffNames(l, mm) : [], cs = l ? bufConstNames(l, mm) : [];
  const ALL = ["diff", "sign", "flip", "cs", "simp", "sub", "state", "split", "same", "stat"];
  if(!l) for(const c of ALL) no[c] = "select a line — a command reads one";
  else {
    if(!l.tree){
      const tgt = bufSplitTarget(l);
      for(const c of ALL) no[c] = l.corner
        ? "this row reports a corner; it carries no expression of its own. The line that does " +
          "is the one writing " + (l.y || "the outcome") + " out in full."
        : "that line has no expression on it";
      /* except splitting, which knows where to go */
      if(tgt && mmResolve(tgt.tree, tgt.box || mm.box).open.length &&
         bufDiffNames(tgt, mm).length) delete no.split;
    }
    else {
      /* Splitting is only ever the answer to a corner that is actually inside
         the range. Where there is none the button says which of the two
         reasons applies, because "no min or max here" and "the max already
         resolves" are different facts about the model. */
      const mr = mmResolve(l.tree, l.box || mm.box);
      if(!mr.open.length) no.split = mr.bound.length
        ? "every min and max in that line already resolves on this box — one branch dominates " +
          "the whole range, so the corner is outside it and the line differentiates as it stands"
        : "that line has no min or max in it, so there is no corner to split at";
      else if(!ns.length) no.split = "no free parameter of the model occurs in that line";
      if(!ns.length) no.diff = "no free parameter of the model occurs in that line";
      if(!cs.length) no.cs = "no declared weight occurs in that line, so there is nothing to take the comparative static in";
      else if(!l.flip) no.cs = "the implicit function theorem is about a stationary point — find the turning point first, or the sentence is about nothing";
      if(!l.res) no.flip = "sign it first; this appears when the sign turns out to change";
      else if(l.res.verdict !== "partial") no.flip = l.res.verdict === "undecided"
        ? "the sign was not decided anywhere, so there is no change of sign to locate"
        : l.res.verdict === "flat"
        ? "the derivative is identically zero here, so there is no sign to change"
        : "the sign does not change on the declared box, which is why it was proved on all of it";
      if(!l.x) no.stat = "nothing on that line says which name a stationary point would be in";
      if(!l.res) no.state = "sign it first — a proposition with no proof under it is an opinion";
      else if(l.stated) no.state = "already stated, and in the set step 4.1 plots";
      else if(!(l.y && l.x)) no.state =
        'this page states a proposition as "y rises in x", so a line it can state has to be the ' +
        'derivative of a quantity the arithmetic writes, in a free parameter. This one is not, ' +
        'and reshaping it into one would be a claim nobody made';
      else if(!PROPS.out) no.state = "derive once first, so there is a set for it to join";
      if(!l.res) no.rests = "sign it first — what a conclusion rests on is a question about a verdict";
      if(!ns.length) no.sim = "no free parameter of the model occurs in that line, so there is nothing to vary";
      if(!l.y || !l.x) no.noise = "idiosyncratic error is a question about an outcome and a parameter, and this line names neither";
      if(!(l.stoch && l.stoch.pts && l.stoch.pts.length) && !(l.sim && l.sim.pts && l.sim.pts.length))
        no.where = "a region is read off draws — sample the sign, or run it with error, and then ask where";
      else if((l.stoch || l.sim).share >= 0.9995)
        no.where = "it held at every draw, so there is no region to find: it is the whole of the range you declared";
      else if(!BUF.lines.some(z => z.cmd === "inline" && z.y === l.y && z.tree))
        no.noise = "the outcome is not written out in free parameters on this buffer — derive, or write it out";
      else if(!l.y || !l.x) no.rests = "this line is not a derivative of an outcome in a free parameter";
    }
  }
  if(!no.rests && !ARITH.kept) no.rests = "no arithmetic is kept, so there is nothing to re-derive";
  return no;
}

/* The dispatcher. Running a command IS the decision -- there is no confirm
   step anywhere on this bench -- so each one either appends a line or marks
   the one it read, and says what it did on the row. */
function bufRun(cmd, arg){
  BUF.err = "";
  const mm = bufModel();
  if(mm.err){ BUF.err = mm.err; return; }
  const M = mm.M, box = mm.box;

  if(cmd === "write"){
    const txt = String(BUF.hand || "").trim();
    if(!txt){ BUF.err = "nothing typed"; return; }
    let e;
    try{ e = readExpr(txt, new Set(Object.keys(box))); }
    catch(err){ BUF.err = ((err && err.message) || "could not read it") +
      ". The grammar admits the declared names, + - * / **, min, max, exp, log, round brackets " +
      "and plain decimals, and refuses everything else by name."; return; }
    bufPush({src:"hand", cmd:"write", tree:simp(rpnTree(e.rpn)),
      note:"read against the same grammar as everything else on this bench. Nothing about it " +
        "is checked until you sign it, and it carries no proposition until you state it."});
    BUF.hand = "";
    return;
  }

  if(cmd === "outcome"){
    const ino = inlineOutcome(M, String(arg || ""));
    if(ino.err){ BUF.err = ino.err; return; }
    bufPush({cmd:"inline", y:String(arg), tree:ino.tree, raw:ino.tree,
      note:arg + " written out in the free parameters, every assignment substituted into the " +
        "ones after it, which is exact"});
    return;
  }

  const l = bufSel();
  if(!l){ BUF.err = "select a line first — a command reads one"; return; }
  /* split is the one command that may act on a line other than the selected
     one, because a row reporting a corner carries no expression of its own
     and is precisely the row somebody will have clicked. */
  if(!l.tree && cmd !== "split"){ BUF.err = "that line has no expression to work on"; return; }
  /* A split narrows one dimension, and every command on the lines it made has
     to run over THAT range rather than over the declared one. Carrying the box
     on the line is what makes a segment an honest object: signed on its own
     part of the range, and saying so. */
  const lbox = l.box || box;

  if(cmd === "diff"){
    const x = String(arg || "");
    if(!hasVar(l.tree, x)){ BUF.err = x + " does not occur in that line"; return; }
    /* Resolve the corners against this line's box before differentiating.
       Where one branch of a max dominates over the whole range, the corner is
       outside the range and the derivative is exact. */
    const mr = mmResolve(l.tree, lbox);
    const raw = dTree(mr.tree, x), d = simp(raw);
    if(d.t === "nd"){
      bufPush({cmd:"diff", of:l.id, y:l.y, x, box:l.box,
        bad:mr.open.length ? mmWhy(mr, lbox) : d.why});
      return;
    }
    bufPush({cmd:"diff", of:l.id, y:l.y, x, tree:d, raw, box:l.box, binds:mr.bound,
      note:"the derivative of " + bufLab(l) + " in " + x + ", as an expression and not as a " +
        "number. Most of what a formal paper calls a proposition is a statement about this." +
        (mr.bound.length ? " " + mr.bound.map(b => b.fn + " resolved to " + treeText(b.keep) +
          ", which dominates everywhere on this box — so the corner is outside the range and " +
          "this derivative is exact, not a subgradient.").join(" ") : "")});
    return;
  }

  /* SPLIT WHERE THE BRANCHES CROSS. The only honest way past a corner inside
     the declared range: find it, and derive on each side of it. The crossing
     is located by the same bisection that locates a change of sign, and what
     comes back is two lines, each with its own part of the range and its own
     binding mechanism — which is the scope condition this model is actually
     about. */
  if(cmd === "split"){
    const x = String(arg || "");
    /* act on the line that carries the corner, which may not be the one
       selected: a row reporting a crossing has no expression of its own */
    const t = bufSplitTarget(l) || l;
    const tbox = t.box || box;
    const mr = mmResolve(t.tree, tbox);
    if(!mr.open.length){
      BUF.err = mr.bound.length
        ? "nothing to split: every min and max in that line already resolves on this box, and " +
          "the line differentiates as it stands."
        : "nothing to split: that line has no min or max in it.";
      return;
    }
    if(!tbox[x]){ BUF.err = x + " is not a declared name of this model"; return; }
    const o = mr.open[0];
    const other = mmSpread(o, tbox, x);
    const surface = () => other.length
      ? " Both sides of it move with " + other.slice(0, 4).join(", ") + " as well as with " + x +
        ", so the set where they are equal is a SURFACE and not a point — one cut through one " +
        "axis cannot separate a surface, and nothing here will pretend otherwise. Two ways on. " +
        "Either SUBSTITUTE " + other[0] + " to a value and split along " + x + " again, which " +
        "gives a result conditional on that value and says so on the row. Or go back to step " +
        "3.1 and compose this outcome with CES instead, which has no corner in it at all and is " +
        "the practical answer when a substitute set is driven by several parameters."
      : " Nothing else in the two arguments varies, so this one really should have cut; that is " +
        "worth reporting as a bug rather than working around.";
    const cut = locateFlip(o.d, tbox, x);
    if(!cut){
      BUF.err = o.fn + "(" + treeText(o.a) + ", " + treeText(o.b) + ") does not cross along " +
        x + " alone: the difference encloses to the same sign at both ends of it." + surface();
      return;
    }
    /* locateFlip BRACKETS the crossing; it does not promise the bracket's own
       endpoints lie off it. Where the crossing falls exactly on a bisection
       midpoint -- 0.5 on a unit range, which is the common case and not a
       pathological one -- an endpoint IS the crossing, the enclosure of the
       difference touches zero there, and the segment refuses to resolve. That
       refusal is correct: the corner is inside it.

       So each side steps off the crossing until its own box resolves, and the
       sliver left between the two is REPORTED rather than quietly absorbed
       into one of them. That sliver is the part of the range where this method
       cannot say which branch binds, and a segment that swallowed it would be
       claiming a derivative at a corner. */
    const settle = (lo, hi, inner) => {
      let a = lo, b = hi, e = Math.max(1e-15, (hi - lo) * 1e-9);
      for(let i = 0; i < 60 && b > a; i++, e *= 4){
        const nb = Object.assign({}, tbox); nb[x] = [a, b];
        const rr = mmResolve(t.tree, nb);
        if(rr.ok) return {box:nb, r:rr, lo:a, hi:b};
        if(inner === "hi") b = b - e; else a = a + e;
      }
      return null;
    };
    const lowS = settle(tbox[x][0], cut[0], "hi");
    const upS  = settle(cut[1], tbox[x][1], "lo");
    if(!lowS && !upS){
      BUF.err = o.fn + "(" + treeText(o.a) + ", " + treeText(o.b) + ") does not separate along " +
        x + " alone: a cut was found near " + ((cut[0] + cut[1]) / 2).toFixed(6) + " but neither " +
        "side of it resolves on its own box." + surface();
      return;
    }
    const gap = [lowS ? lowS.hi : cut[0], upS ? upS.lo : cut[1]];
    const where = "The crossing is at " + x + " ≈ " + ((cut[0] + cut[1]) / 2).toFixed(6) +
      ", found by bisection. Neither segment contains it: the " +
      (gap[1] - gap[0]).toExponential(1) + " of range between them is where this method cannot " +
      "say which branch binds, and it is left out rather than given to one side. That crossing " +
      "is where the binding mechanism switches, which is the scope condition this model is " +
      "about and not a nuisance to be smoothed away.";
    for(const g of [lowS, upS]){
      if(!g){ continue; }
      bufPush({src:t.src, cmd:"split", of:t.id, y:t.y, x:t.x, tree:g.r.tree, box:g.box,
        raw:g.r.tree, binds:g.r.bound, seg:[x, g.lo, g.hi],
        note:bufLab(t) + " restricted to " + x + " in [" + g.lo.toFixed(6) + ", " +
          g.hi.toFixed(6) + "], where " +
          g.r.bound.map(b => b.fn + " binds on " + treeText(b.keep)).join(" and ") +
          ". The corner is outside this part of the range, so everything derived here is exact " +
          "rather than a subgradient. " + where});
    }
    if(!lowS || !upS) BUF.err = "only one side of the crossing resolved on its own box; the " +
      "other still has an undecided corner in it and was not written.";
    return;
  }

  if(cmd === "simp"){
    bufPush({src:l.src, cmd:"simp", of:l.id, y:l.y, x:l.x, tree:simp(l.tree), raw:l.raw || l.tree,
      note:"collected and cancelled. The same expression, which is why nothing about it needs " +
        "checking again."});
    return;
  }

  if(cmd === "sub"){
    const m = /^\s*([a-z][a-z0-9_]{0,71})\s*:?=\s*(.+)$/.exec(String(arg || ""));
    if(!m){ BUF.err = 'write the substitution as "name := expression"'; return; }
    if(!hasVar(l.tree, m[1])){ BUF.err = m[1] + " does not occur in that line"; return; }
    let e;
    try{ e = readExpr(m[2], new Set(Object.keys(box))); }
    catch(err){ BUF.err = "the right-hand side: " + ((err && err.message) || "could not read it"); return; }
    const r = simp(rpnTree(e.rpn));
    const walk = n => !n ? n
      : (n.t === "v" && n.v === m[1]) ? r
      : (n.t === "n" || n.t === "v") ? n
      : Object.assign({}, n, {a:walk(n.a), b:n.b ? walk(n.b) : n.b});
    bufPush({src:"hand", cmd:"sub", of:l.id, y:l.y, x:l.x === m[1] ? "" : l.x,
      tree:simp(walk(l.tree)),
      note:m[1] + " replaced by " + treeText(r) + ". This changes what the line is about: the " +
        "declared box no longer constrains " + m[1] + ", so a sign proved after it is proved " +
        "under your substitution as well as under the declarations."});
    return;
  }

  if(cmd === "sign"){
    /* The box is cut down to the names that actually occur, which makes the
       enclosure tighter rather than looser -- a dimension the expression does
       not mention can only add width. l.x is kept whether it occurs or not,
       because the region is projected onto it and a constant derivative still
       has a region: all of it. */
    const bx = {};
    for(const n of Object.keys(lbox)) if(hasVar(l.tree, n)) bx[n] = lbox[n];
    if(l.x && lbox[l.x] && !bx[l.x]) bx[l.x] = lbox[l.x];
    if(!Object.keys(bx).length){
      BUF.err = "no declared name occurs in that line, so there is no box to prove it over. " +
        "It is a number, and evaluating it is not proving anything.";
      return;
    }
    /* A corner inside the box makes every enclosure of it IBAD, so a sign on
       an unresolved max is undecided for a reason that has nothing to do with
       the dependency problem. Resolve first and say which branch was signed. */
    const mr = mmResolve(l.tree, bx);
    if(mr.open.length){
      BUF.err = mmWhy(mr, bx);
      return;
    }
    l.binds = mr.bound;
    const up = proveSign(mr.tree, bx, +1, {}), dn = proveSign(mr.tree, bx, -1, {});
    // no direction where the expression never leaves zero: see deriveProps
    const dir = up.verdict === "flat" ? 0 : up.share >= dn.share ? 1 : -1;
    const best = dir === -1 ? dn : up;
    l.res = {dir, verdict:best.verdict, share:best.share, open:best.openShare,
      boxes:best.boxes, witness:best.witness};
    l.best = best; l.bx = bx; l.at = bstamp();
    /* A fresh sign invalidates what hung off the old one. Keeping a turning
       point located under a previous box would be the worst kind of stale: it
       reads as a result and is an artefact of a bound that has changed. */
    l.flip = null; l.cs = null;
    if(l.stated && l.p){ l.stated = false; l.p = null;
      BUF.err = "re-signed, so it is no longer stated — state it again to put the new verdict " +
        "in the set step 4.1 plots. The old one has been taken out."; }
    return;
  }

  if(cmd === "flip"){
    if(!l.res || !l.bx || !l.x || !l.bx[l.x]){
      BUF.err = "sign it first, along a named parameter"; return; }
    l.flip = locateFlip(l.tree, l.bx, l.x);
    if(!l.flip) BUF.err = "the sign is the same at both ends of " + l.x +
      ", so bisection has nothing to narrow. The region is in more than one dimension at once.";
    return;
  }

  if(cmd === "cs"){
    const k = String(arg || "");
    if(!l.flip || !l.bx || !l.x){
      BUF.err = "find the turning point first \u2014 the theorem is about a stationary point";
      return; }
    const d2 = simp(dTree(l.tree, l.x));
    if(d2.t === "nd"){ BUF.err = "the second derivative is undefined here: " + d2.why; return; }
    const dxk = simp(dTree(l.tree, k));
    if(dxk.t === "nd"){ BUF.err = "the cross partial in " + k + " is undefined here"; return; }
    const e = simp(NEG(OP("/", dxk, d2)));
    const sp = proveSign(e, l.bx, +1, {}), sn = proveSign(e, l.bx, -1, {});
    l.cs = (l.cs || []).filter(c => c.k !== k).concat([{k, e,
      sign:sp.verdict === "proved" ? 1 : sn.verdict === "proved" ? -1 : 0}]);
    return;
  }

  if(cmd === "state"){
    if(!l.res || !l.y || !l.x || !PROPS.out){
      BUF.err = "a stated proposition has to be a signed derivative of a quantity the " +
        "arithmetic writes, in a free parameter"; return; }
    const p = {y:l.y, x:l.x, f:null, d1:l.tree, d1raw:l.raw || l.tree,
      d2:simp(dTree(l.tree, l.x)), dir:l.res.dir, flip:l.flip, cs:l.cs || [],
      bands:l.best ? bandsOf(l.best, l.x, l.bx) : new Array(96).fill("o"),
      /* The band and the slice through it, computed here because this is
         where the proof's own partition and the declared box are both in
         hand. Carrying the box on the proposition instead would put it in
         every file a result travels in, for one picture. */
      dband:l.best ? dbandOf(l.best, l.tree, l.x, l.bx) : new Array(96).fill(null),
      dcurve:dcurveOf(l.tree, l.x, l.bx, PLN),
      xbox:(l.bx && l.bx[l.x] ? l.bx[l.x] : [0, 1]).slice(),
      verdict:l.res.verdict, share:l.res.share, open:l.res.open,
      boxes:l.res.boxes, witness:l.res.witness, byHand:l.src !== "auto"};
    PROPS.out.props.push(p);
    l.stated = true; l.p = p;
    return;
  }

  if(cmd === "where"){
    const src = (l.stoch && l.stoch.pts && l.stoch.pts.length) ? l.stoch : l.sim;
    const box = l.bx || mm.box;
    const w = primBox(src.pts, box);
    if(!w){ BUF.err = "too few draws to read a region off — sample it again"; return; }
    l.where = w; l.whereFrom = (src === l.stoch) ? "error" : "sampling";
    return;
  }

  if(cmd === "noise"){
    const r = stochOf(l);
    if(!r || r.err){ BUF.err = (r && r.err) || "could not run it"; return; }
    l.stoch = r;
    return;
  }

  if(cmd === "sim"){
    const box = l.bx || mm.box;
    l.sim = simSign(l.tree, box, MTH.draws);
    if(!l.sim.n){ BUF.err = "nothing in that expression evaluated to a number over this box";
      l.sim = null; }
    return;
  }

  if(cmd === "rests"){
    /* Re-derives the model once per mechanism, so it is the slowest thing on
       the step and is asked for rather than computed with everything else. */
    l.rests = depsOf(l);
    if(l.rests && l.rests.err){ BUF.err = l.rests.err; l.rests = null; }
    return;
  }

  BUF.err = "no such command";
}

/* WHAT COMES BACK FROM A MODELLER'S OWN TOOL, generalised. The old version
   admitted exactly one thing -- a claimed stationary point, tested against
   every derivative at once. Two checks, named for what they answer, against
   the line you had selected:

     same  the tool rearranged this expression; is the rearrangement equal to
           it? Their difference is enclosed over the box, and an enclosure
           tight around zero is an identity proved rather than eyeballed.
     stat  the tool solved for a stationary point; is it one? Substitute it for
           x and enclose the derivative with x taken out of the box.

   Either way the answer lands on the buffer as a line stamped RETURNED, with
   the verdict in its note, because a refuted answer from Mathematica is a
   result and deleting it would be the only dishonest thing to do with it. */
function bufImport(kind){
  BUF.err = "";
  const mm = bufModel();
  if(mm.err){ BUF.err = mm.err; return; }
  const l = bufSel();
  if(!l || !l.tree){ BUF.err = "select the line your tool's answer is about"; return; }
  const txt = String(BUF.imp || "").trim();
  if(!txt){ BUF.err = "nothing pasted"; return; }
  let e;
  try{ e = readExpr(txt, new Set(Object.keys(mm.box))); }
  catch(err){ BUF.err = ((err && err.message) || "could not read it") +
    ". The grammar admits the declared names, + - * / **, min, max, exp, log, round brackets " +
    "and plain decimals. A Lambert W or a Root object cannot come back through it, and it is " +
    "refused by name rather than approximated."; return; }
  const tree = simp(rpnTree(e.rpn));

  if(kind === "same"){
    const diff = simp(OP("-", l.tree, tree));
    const iv = ivalTree(diff, mm.box);
    const struct = keyOf(diff) === "#0";
    const tight = struct || (Math.abs(iv[0]) < 1e-7 && Math.abs(iv[1]) < 1e-7);
    const zero = iv[0] <= 1e-9 && iv[1] >= -1e-9;
    const smp = bufSample(diff, mm.box, 400);
    bufPush({src:"tool", cmd:"import", of:l.id, y:l.y, x:l.x, tree, ok:tight,
      note:tight
        ? "EQUAL to " + bufLab(l) + " everywhere on the declared box, " + (struct
            ? "and equal by construction: their difference simplifies to zero, which is an " +
              "identity and needs no box at all."
            : "proved: their difference encloses in [" + iv[0].toExponential(1) + ", " +
              iv[1].toExponential(1) + "], zero to the precision interval arithmetic gives.")
        : smp.max < 1e-9
        ? "EQUAL at every one of " + smp.n + " sampled points, and NOT PROVED. The difference " +
          "encloses in [" + iv[0].toPrecision(3) + ", " + iv[1].toPrecision(3) + "], which " +
          "straddles zero \u2014 the dependency problem widens a bound wherever a name occurs " +
          "twice, and in a difference it occurs twice by construction. So this is evidence that " +
          "your tool rearranged it correctly, of the same kind step 3.1's sweeps give, and it is " +
          "not the proof the signed rows carry."
        : zero
        ? "NOT the same expression, though nothing here proves it. The difference encloses in [" +
          iv[0].toPrecision(3) + ", " + iv[1].toPrecision(3) + "], which straddles zero, and it " +
          "reaches " + smp.max.toPrecision(3) + " at a sampled point \u2014 so the two differ " +
          "somewhere, by sampling rather than by proof."
        : "NOT the same expression. The difference lies in [" + iv[0].toPrecision(3) + ", " +
          iv[1].toPrecision(3) + "], which excludes zero, so one of the two is wrong. Kept on " +
          "the list because a refuted answer is a result."});
    return;
  }

  const sub = n => !n ? n
    : (n.t === "v" && n.v === l.x) ? tree
    : (n.t === "n" || n.t === "v") ? n
    : Object.assign({}, n, {a:sub(n.a), b:n.b ? sub(n.b) : n.b});
  const at = simp(sub(l.tree));
  const bx = Object.assign({}, mm.box); delete bx[l.x];
  const iv = ivalTree(at, bx);
  const tight = Math.abs(iv[0]) < 1e-7 && Math.abs(iv[1]) < 1e-7;
  const zero = iv[0] <= 1e-9 && iv[1] >= -1e-9;
  bufPush({src:"tool", cmd:"import", of:l.id, y:l.y, x:"", tree, ok:tight,
    note:tight
      ? "A STATIONARY POINT of " + bufLab(l) + ", proved: substituted for " + l.x + " it gives " +
        "an interval of [" + iv[0].toExponential(1) + ", " + iv[1].toExponential(1) + "] with " +
        l.x + " taken out of the box, which is zero to the precision available."
      : zero
      ? "UNDECIDED. Substituted in, the derivative encloses in [" + iv[0].toPrecision(3) + ", " +
        iv[1].toPrecision(3) + "]: it straddles zero without being tight, which is a shrug and " +
        "not a refutation."
      : "NOT a stationary point of " + bufLab(l) + ". Substituted in, the derivative lies in [" +
        iv[0].toPrecision(3) + ", " + iv[1].toPrecision(3) + "], which excludes zero."});
}

/* Sampling, for the one place on this step where it is the right tool. An
   enclosure that straddles zero says nothing about whether two expressions
   differ, and evaluating their difference at four hundred points says a great
   deal -- so it is reported as evidence and never as proof, which is the
   distinction the whole step turns on. Both ends of every range are sampled
   first, because a difference that only shows up at a boundary is exactly the
   kind a random draw misses. */
function bufSample(n, box, k){
  const vs = Object.keys(box);
  let max = 0, got = 0;
  for(let i = 0; i < k; i++){
    const pt = {};
    for(const v of vs){
      const t = i === 0 ? 0 : i === 1 ? 1 : nrnd();   // seeded, like every other draw
      const x = box[v][0] + t * (box[v][1] - box[v][0]);
      pt[v] = [x, x];
    }
    const iv = ivalTree(n, pt);
    if(!isFinite(iv[0]) || !isFinite(iv[1])) continue;
    got++;
    max = Math.max(max, Math.abs(iv[0]), Math.abs(iv[1]));
  }
  return {max, n:got};
}

/* The buffer as a script, which is the reason it is rows and not a
   conversation: this is the object another researcher re-runs. */
function bufScript(){
  const L = stampLines().concat(["#",
    "# A derivation, run on the curation bench, " + bstamp(),
    "#",
    "# Every verdict below was computed by interval arithmetic over the bounds declared on",
    "# step 3.1, against the arithmetic kept on step 3.1. Each one therefore has the form",
    "# \"given these declarations, this follows\" -- the arithmetic was proposed and kept",
    "# because it survived its checks, not derived from any theory.",
    "#",
    "# derived  = produced by a command on the bench      written  = written or substituted by hand",
    "# proposed = proposed by a language model, unchecked returned = brought back from another tool, checked",
    ""]);
  for(const l of BUF.lines){
    L.push((BSRC[l.src] || BSRC.auto)[0] + "  " + bufLab(l) + (l.stated ? "   [stated]" : ""));
    if(l.bad){ L.push("  ! " + l.bad); L.push(""); continue; }
    L.push("  " + treeText(l.tree));
    if(l.seg) L.push("  over " + l.seg[0] + " in [" + l.seg[1].toFixed(6) + ", " +
      l.seg[2].toFixed(6) + "], and not over the whole declared range");
    for(const b of (l.binds || [])) L.push("  " + b.fn + " binds on " + treeText(b.keep) +
      " here, so the corner is outside this range");
    if(l.note) L.push("  # " + l.note.replace(/\s+/g, " "));
    if(l.fold) L.push("  filed under " + ((WS.own.find(f => f.id === l.fold) || {}).name || l.fold) +
      ", which is a path of enquiry and not a claim about the line");
    if(l.data) L.push("  your data, recorded " + l.data.at + " and NOT checked here: " + l.data.text);
    if(l.res) L.push("  sign: " + l.res.verdict + ", " +
      (l.res.dir > 0 ? "positive" : "negative") + " on " + (100 * l.res.share).toFixed(1) +
      "% of the declared box, " + l.res.boxes + " boxes searched");
    if(l.flip) L.push("  turning point in [" + l.flip[0].toFixed(6) + ", " + l.flip[1].toFixed(6) + "]");
    for(const c of (l.cs || [])) L.push("  d" + l.x + "* / d" + c.k + " = " + treeText(c.e) +
      (c.sign ? "   (" + (c.sign > 0 ? "positive" : "negative") + " on the box)" : "   (sign undecided)"));
    L.push("");
  }
  return L.join("\n");
}

function bufVerdictHTML(l){
  const r = l.res;
  if(!r) return `<i class="bnote">Not signed. The expression is on the page; nothing has been
    proved about it.</i>`;
  const dirw = r.dir > 0 ? "Positive" : "Negative";
  const main = r.verdict === "proved"
    ? `<b>${dirw} everywhere on the declared box</b> — a proof, not twenty-one points.`
    : r.verdict === "disproved"
    ? `<b>${r.dir > 0 ? "Negative" : "Positive"} everywhere on the declared box.</b>`
    : r.verdict === "partial"
    ? `${dirw} on <b>${(100 * r.share).toFixed(1)}%</b> of the declared box and the other way on
       the rest${r.open > 0.0001 ? `, with ${(100 * r.open).toFixed(1)}% undecided` : ""}${
       l.flip ? ` — the sign changes inside <b>[${l.flip[0].toFixed(4)}, ${
         l.flip[1].toFixed(4)}]</b>, which is the scope condition rather than an assumption
         about it` : ""}.`
    : `Interval arithmetic did not decide it anywhere on this box. That is the dependency
       problem, not a result: a bound widens wherever a name occurs twice.`;
  const cs = (l.cs || []).length
    ? `<br><b>At the stationary point</b>, ${l.cs.map(c =>
        `∂${hesc(l.x)}* / ∂${hesc(c.k)} = <code class="dexp">${hesc(treeText(c.e))}</code>` +
        (c.sign ? ` (${c.sign > 0 ? "positive" : "negative"} on the box)`
                : ` (sign undecided on the box)`)).join("; ")}
       — by the implicit function theorem, with nothing solved for.`
    : "";
  return main + cs;
}

function bufRowHTML(l){
  const on = l.id === BUF.sel ? " on" : "";
  if(l.bad) return `<div class="crow arow bline${on}" data-bsel="${l.id}">
    <span class="cst gap">not derived</span>
    <span class="cnm">${hesc(bufLab(l))}</span>
    <span class="cwy">${hesc(l.bad)}${wsDataHTML(l)}</span></div>`;
  const s = BSRC[l.src] || BSRC.auto;
  /* THE VERDICT IS THE VERDICT, drawn the one way. This row called every
     disproved line "proved", every partial "region" and drew undecided in
     red. A line that has no verdict yet is in a STATE rather than at a
     verdict -- unsigned, checked, refused -- and keeps the outlined badge
     those states share. */
  const st = l.cmd === "import" ? (l.ok ? ["ok", "checked"] : ["gap", "refused"])
    : ["", "unsigned"];
  return `<div class="crow arow bline${on}${l.stated ? " bst" : ""}" data-bsel="${l.id}">
    ${l.res ? vdHTML(l.res.verdict, vTurned(l.res), l.res.share, l.res.open)
            : `<span class="cst ${st[0]}">${st[1]}</span>`}
    <span class="cnm">${hesc(bufLab(l))}<span class="cfl"><b class="bsrc"
      title="${hesc(s[1])}">${l.src === "ai" ? aiMark() : ""}${s[0]}</b>${l.seg ? ` · <b class="bseg" title="This line is about that part of the range and no other: everything proved on it is proved there">${
      hesc(l.seg[0])} in [${l.seg[1].toFixed(3)}, ${l.seg[2].toFixed(3)}]</b>` : ""}${
      l.res ? " · " + l.res.boxes + " box" + (l.res.boxes === 1 ? "" : "es") : ""}${
      l.stated ? ` · <b class="bsrc bstt" title="In the set step 4.1 plots and the exports write">stated</b>` : ""}</span></span>
    <span class="cwy">${l.res ? propSentence(l) : ""}<div class="eqwrap"><span class="meq"${
      l.y && l.x ? ` data-plot="${hesc(l.y)}|${hesc(l.x)}"` : ""}>${
      treeHTML(bufShow(l))}</span></div>${
    l.note ? `<i class="bnote">${hesc(l.note)}</i><br>` : ""}${bufVerdictHTML(l)}${
    l.rests ? depsHTML(Object.assign({y:l.y}, l.rests)) : ""}${lineScoreHTML(l)}${
    wsDataHTML(l)}${bufGuessHTML(l)}${wsRowActs(l)}</span></div>`;
}

/* The expectation, and the way onto the board.

   Before a line is derived it can be guessed at; afterwards it cannot, because
   an expectation recorded after the answer is worthless and the page should
   decline to collect one. Once derived, the row offers the board instead. */
function bufGuessHTML(l){
  if(!l || !l.y || !l.x) return "";
  const k = gkey(l), g = GUESS[k] || "";
  if(guessOpen(l)) return `<div class="bguess">
    <span class="movlab" style="margin:0">Before you derive it — what do you expect?</span>
    ${["up", "down", "turns", "none"].map(v => [v, GUESSLAB[v]]).map(
      ([v, lab]) => `<button type="button" class="sup pick${g === v ? " on" : " none"}"
        data-guess="${hesc(k + "|" + v)}">${lab}</button>`).join("")}
    <i class="bnote">On the record before the answer is, which is the only way a derivation can
      contradict you rather than agree with you.</i></div>`;
  const on = BOARD.rows.some(r => r.y === l.y && r.x === l.x);
  const says = lineSays(l);
  return `<div class="bguess">
    ${g ? `<span class="movlab" style="margin:0">You said <b>${GUESSLAB[g]}</b>${
      says ? ` and it ${GUESSLAB[says] || "did not settle"}` : ""}${
      g !== "none" && says ? (g === says
        ? ` \u2014 <b>as you expected</b>` : ` \u2014 <b class="dispm">against you</b>`) : ""
      }</span>` : `<span class="movlab" style="margin:0">No expectation was recorded.</span>`}
    <button type="button" class="edbtn" data-btake="${hesc(l.id)}">${
      on ? "Update on the board" : "Put it on the board"}</button>
  </div>`;
}

const BCMDLOG = {diff:"Differentiated", sign:"Signed it over the box",
  flip:"Looked for the turning point", cs:"Comparative static", simp:"Simplified",
  sub:"Substituted", state:"Stated it", rests:"Asked what it rests on",
  sim:"Sampled the sign", noise:"Ran it with idiosyncratic error",
  where:"Looked for where it holds",
  write:"Wrote a line by hand", outcome:"Wrote an outcome out", split:"Split where they cross",
  same:"Checked it is the same expression", stat:"Checked a stationary point",
  comb:"Combined two lines", data:"Recorded a result from your own data",
  import:"Read something back from a tool"};
const BCMDS = ["diff", "sign", "sim", "noise", "where", "flip", "cs", "simp", "sub", "state", "rests",
               "write", "outcome", "same", "stat"];
function bufHTML(){
  const mm = bufModel();
  const ready = !mm.err;
  /* THE EDITOR IS THE STEP, SO IT IS ALWAYS ON THE PAGE. This returned one
     sentence in place of it whenever step 3.1 had kept nothing — which is
     what a first visit is — and that took the palette and both writing boxes
     away with it, leaving a reader no way to see what the step even was. What
     is missing is now said ON the controls, which is the rule the palette
     already follows for a command that cannot apply here. */
  const l = ready ? bufSel() : null;
  const can = ready ? bufCan(l, mm)
    : BCMDS.reduce((o, c) => { o[c] = mm.err; return o; }, {});
  const dn = ready ? bufDiffNames(l, mm) : [];
  /* split can act on a line other than the selected one, so its menu is that
     line's names: offering the selected row's would be offering names the
     expression being cut does not contain. */
  const sTgt = ready ? bufSplitTarget(l) : null;
  const dnS = sTgt ? bufDiffNames(sTgt, mm) : dn;
  const cn = ready ? bufConstNames(l, mm) : [];
  const outs = ready ? (mm.M.outs || []).map(varName) : [];
  const nsg = BUF.lines.filter(x => x.res).length;
  const nst = BUF.lines.filter(x => x.stated).length;
  const nhd = BUF.lines.filter(x => x.src !== "auto").length;
  const B = (cmd, label) => `<button type="button" data-bcmd="${cmd}"${
    can[cmd] ? ` disabled title="${hesc(can[cmd])}"` : ""}>${label}</button>`;
  const SEL = (id, ns) => `<select id="${id}" aria-label="which name"${
    ns.length ? "" : " disabled"}>${ns.map(n =>
    `<option value="${hesc(n)}">${hesc(n)}</option>`).join("")}</select>`;
  return `<div class="ascore">
    <span><b>${BUF.lines.length}</b> line${BUF.lines.length === 1 ? "" : "s"}</span>
    <span><b>${nsg}</b> signed</span>
    <span><b>${nst}</b> stated</span>
    <span><b>${nhd}</b> not from the automatic pass</span>
    ${(() => {
      /* ONE crossing reported on four rows is one crossing, and counting rows
         made a single max read as four separate problems. */
      const done = new Set();
      for(const z of BUF.lines) for(const b of (z.binds || []))
        done.add(b.fn + "(" + treeText(b.keep) + ")");
      const open = new Set(BUF.lines.filter(z => z.corner).map(z => z.corner));
      const rows = BUF.lines.filter(z => z.corner).length;
      if(!done.size && !open.size) return "";
      return `<span>${done.size ? `<b>${done.size}</b> corner${done.size === 1 ? "" : "s"} resolved` : ""}${
        done.size && open.size ? " · " : ""}${open.size
          ? `<b>${open.size}</b> crossing${open.size === 1 ? "" : "s"} left${
             rows > open.size ? `, reported on ${rows} rows` : ""}` : ""}</span>`;
    })()}
    ${BUF.at ? `<span>seeded ${hesc(BUF.at)}</span>` : ""}
  </div>
  ${BUF.lines.length ? `<div class="wswrap">
    ${wsRailHTML()}
    <div class="wsmain">
      ${wsBarHTML()}
      ${wsToolsHTML({B, SEL, can, dn, dnS, cn, outs, ready})}
      ${BUF.err ? `<p class="why bufmsg">${hesc(BUF.err)}</p>` : ""}
      ${WS.err ? `<p class="why bufmsg">${hesc(WS.err)}</p>` : ""}
      ${(() => { const sh = wsLines();
        return sh.length
          ? `<div class="chain bufchain">${sh.map(bufRowHTML).join("")}</div>`
          : `<p class="empty">Nothing in <b>${hesc(wsFoldName(WS.fold))}</b>${
              WS.q ? ` matches <b>${hesc(WS.q)}</b>` : ""}. ${BUF.lines.length} line${
              BUF.lines.length === 1 ? " is" : "s are"} on the list — a folder is a view of
              them and not a container, so nothing has been lost.</p>`; })()}
    </div>
  </div>`
   : `<p class="empty">${ready
      ? `The list is empty. <b>Derive</b> fills it with the automatic pass — every outcome
         against every parameter it depends on — and any line can then be carried further. The
         folders, the filter and the commands appear with the first line, because a rail of
         eighteen folders all reading zero is apparatus pretending to be work.`
      : `${hesc(mm.err)}. Write an arithmetic on step 3.1 and keep it, and this fills.`}</p>`}

`;
}

/* ---------------------------------------------------------------------------
   The findings, plotted.

   Step 3.2 derives and ranks. This draws what survived, which is a
   different act and was the only thing in the chain with no step of its own:
   a signed derivative is a sentence, and the thing a reader of the paper
   actually sees is the picture of it over the range it was proved on.

   RETAINED means the sign was settled somewhere: proved on the whole
   declared box, or proved on part of it with the threshold located, which is
   a proposition plus its scope. A derivative the method could not decide
   anywhere is not a finding, and it is listed rather than drawn, because an
   absence that is not shown gets read as an absence of the question. */
const plotWorth = p => !p.err && (p.verdict === "proved" || p.verdict === "disproved" ||
  (p.verdict === "partial" && !!p.flip));
/* A finding is drawn here because it was RETAINED, not because it was signed.
   Step 4.1 drew every signed derivative, so setting one aside on the board
   left it in the plates and in the results export -- the step said "what you
   decided to stand behind" and showed what you had not.

   `stands` is the board's own predicate, in 05-explore.js beside the board,
   and the exports ask it too: the plates were filtered here and the exports
   were not, which is a worse state than neither, because the step and the
   file it writes then name different sets. Before anything is kept there is
   nothing to filter by, so the signed ones stand in and the step says which
   it is showing. */
const plotBoarded = () => boardStands();
const keptPlot = p => plotWorth(p) && stands(p.y, p.x);
/* THE PLATE: TWO PANELS, ONE X AXIS.
   -------------------------------------------------------------------------
   It drew one curve, the LEVEL of the outcome along x, and the proposition
   under it was about the SLOPE. A reader was being asked to read a derivative
   off a picture, which is the thing the interval proof exists to avoid, and
   on a partial verdict the turn is a few pixels of inflection.

   The level stays on top, because the shape of a relation is what a reader
   comes for and it is where a change of form class shows. The marginal curve
   goes under it on the same x axis, against a zero line, so the finding is a
   distance from that line rather than a slope to be judged by eye.

   WHAT THE BAND IS. Per cell, the range the derivative can take over EVERY
   setting of the other parameters at once, coloured by the verdict there.
   Both come out of the partition proveSign produced, so a green cell is a
   band clear of the line by construction and the picture cannot contradict
   the word. The old plate drew that verdict as an eight-pixel strip under the
   axis -- the one rigorous thing on it -- and gave the full ink to a single
   slice. This inverts that.

   WHAT IS STILL ONE SLICE. The two lines. Both are drawn with every other
   parameter at the centre of its bounds, at one combination of the declared
   class. The plate says so, and says what the class run found, instead of
   leaving the picture to be read as the finding. */
const PLW = 520, PLL = 48, PLR = 10, PLN = 80;
const PLT = 18, PLTH = 50;         // the level panel: top, height
const PLM = 92, PLMH = 74;         // the marginal panel
const PLAX = PLM + PLMH;           // the x axis the two share
const PLH = PLAX + 30;
const plNum = v => !afin(v) ? "—"
  : (v !== 0 && (Math.abs(v) >= 10000 || Math.abs(v) < 0.001))
    ? v.toExponential(1) : v.toFixed(3);
/* A scale that holds zero whenever the proposition is a sign, padded so that
   a band touching the top edge reads as a band and not as the frame. */
function plScale(vals, withZero){
  const f = vals.filter(afin);
  let lo = f.length ? Math.min.apply(null, f) : 0;
  let hi = f.length ? Math.max.apply(null, f) : 1;
  if(withZero){ lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if(!(hi > lo)) hi = lo + (Math.abs(lo) || 1) * 0.1;
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}
/* What the class run found about THIS proposition, in one line, pointing at
   the list above rather than repeating it. Said even when nothing has run,
   because a plate with no class sentence reads as a plate with no class
   question. */
function plClassHTML(p, cls){
  if(!cls) return "";
  const n = cls.n ? cls.n.toLocaleString("en") : "";
  if(!cls.row) return `<p class="plscope plcls"><b>Class</b> not run${
    n ? ` · ${n} combination${cls.n === 1 ? "" : "s"} declared` : ""
    } — <i>test the validity domains</i>, above, reads this finding against them.</p>`;
  const r = cls.row, dec = r.held + r.turn;
  const stale = cls.stale ? " · against arithmetic that has since changed" : "";
  const body = !dec
    ? `not one of the ${r.of} combinations could be settled either way, so nothing here
       bears on the class in either direction`
    : !r.turn
    ? `the same sign on every one of the ${dec} combination${dec === 1 ? "" : "s"} the search
       could decide${r.undec ? `, with ${r.undec} undecided, which is not the other sign` : ""}`
    : `${r.turn} of the ${dec} decided combination${dec === 1 ? "" : "s"} give the other sign${
       r.undec ? `, and ${r.undec} are undecided` : ""} — ${hesc(
       r.broke.filter(b => b.says !== "not settled").map(b => b.lab).slice(0, 2).join(", "))
       }${r.turn > 2 ? " and others" : ""}`;
  return `<p class="plscope plcls"><b>Class</b> — ${body}.${stale}</p>`;
}
function plateHTML(p, P, cls){
  const M = P.M, xk = M.params.find(k => varName(k) === p.x);
  if(!xk) return "";
  const w = asweep(M, xk, p.y, PLN);
  const fin = w.ys.filter(afin);
  if(fin.length < 2) return `<p class="why">${hesc(p.y)} is not a number across ${
    hesc(p.x)}, so there is nothing to draw.</p>`;

  const iw = PLW - PLL - PLR;
  const b0 = p.xbox[0], b1 = p.xbox[1], bs = Math.max(1e-12, b1 - b0);
  const X = v => PLL + iw * ((v - b0) / bs);
  const AT = f => PLL + iw * f;

  /* ---------------------------------------------------------- the level */
  const lv = plScale(w.ys, false);
  const YL = v => PLT + PLTH * (1 - (v - lv[0]) / (lv[1] - lv[0]));
  const lpts = w.xs.map((xv, i) => afin(w.ys[i])
    ? X(xv).toFixed(1) + "," + YL(w.ys[i]).toFixed(1) : null).filter(Boolean).join(" ");

  /* ------------------------------------------------------- the marginal */
  const dband = p.dband || [], dcurve = p.dcurve || [];
  /* ONE EDGE OF THE BAND CARRIES THE FINDING AND THE OTHER DOES NOT. For a
     derivative proved positive it is the bottom: the sign holds exactly while
     that edge stays above the line, and how far the top reaches is a fact
     about an outer bound rather than about the conclusion. Scaling to both
     put the top at fourteen where the slice lives at nought point seven, and
     squashed the slice and the zero line into the same two pixels.

     So the scale is built from the near edge, the slice and zero; the far
     edge runs off the panel and is said in words. Clipping the side that
     decides nothing is what makes the side that decides everything legible. */
  const far = p.dir < 0 ? 0 : 1, near = 1 - far;
  const vals = [];
  for(const c of dband) if(c) vals.push(c[near]);
  for(const v of dcurve) if(afin(v)) vals.push(v);
  const md = plScale(vals, true);
  /* Zero on the frame is zero invisible. Where the near edge sits at the line
     -- which is the common case, and is the finding saying the sign holds but
     only just in the worst corner of the box -- eight per cent of padding put
     the reference five pixels from the axis and the two read as one rule. */
  const zat = (0 - md[0]) / (md[1] - md[0]);
  if(zat < 0.15 && md[1] > 0) md[0] = -0.1765 * md[1];
  else if(zat > 0.85 && md[0] < 0) md[1] = -0.1765 * md[0];
  const YM = v => PLM + PLMH * (1 - (v - md[0]) / (md[1] - md[0]));
  const CL = y => Math.max(PLM, Math.min(PLAX, y));
  const cw = dband.length ? iw / dband.length : iw;
  let reach = null, clipped = 0;
  for(const c of dband) if(c){
    if(reach === null || (far ? c[far] > reach : c[far] < reach)) reach = c[far];
    if(c[far] > md[1] || c[far] < md[0]) clipped++;
  }
  const slabs = dband.map((c, i) => {
    if(!c) return "";
    const yt = CL(YM(c[1])), yb = CL(YM(c[0]));
    return `<rect class="dbd${p.bands[i] || "o"}" x="${(PLL + cw * i).toFixed(2)}" y="${
      yt.toFixed(2)}" width="${(cw + 0.4).toFixed(2)}" height="${
      Math.max(0.7, yb - yt).toFixed(2)}"/>`;
  }).join("");
  const mpts = dcurve.length > 1 ? dcurve.map((v, i) => afin(v)
    ? AT(i / (dcurve.length - 1)).toFixed(1) + "," + YM(v).toFixed(1) : null)
    .filter(Boolean).join(" ") : "";
  const z = YM(0);
  const zlab = (z - PLM > 11 && PLAX - z > 11)
    ? `<text class="pltk pltz" x="${PLL - 6}" y="${(z + 3).toFixed(1)}" text-anchor="end">0.000</text>` : "";
  const none = !slabs && !mpts;

  /* A turn is a property of the derivative and shows on both panels, so the
     line runs the height of the plate rather than of one of them. */
  const flip = p.flip
    ? `<line class="plflip" x1="${X(p.flip[0]).toFixed(1)}" y1="${PLT}"
        x2="${X(p.flip[0]).toFixed(1)}" y2="${PLAX}"/>` : "";

  const dirw = p.dir > 0 ? "rises" : "falls";
  const title = `<b>${hesc(p.y)}</b> ${dirw} in <b>${hesc(p.x)}</b>`;
  return `<div class="plate">
    <div class="plhd">
      <span class="plttl">${title}</span>
      <button type="button" class="fsbtn" data-fsplate="${hesc(p.y + "|" + p.x)}"
        aria-pressed="false">Full screen</button>
    </div>
    <svg viewBox="0 0 ${PLW} ${PLH}" class="plsvg" role="img"
         aria-label="${hesc(p.y)} against ${hesc(p.x)}: the level above, and underneath it what
           the marginal effect can be over the whole declared box">
      <text class="pllab" x="${PLL}" y="${PLT - 7}">level of ${hesc(p.y)}</text>
      <line class="plax" x1="${PLL}" y1="${PLT}" x2="${PLL}" y2="${PLT + PLTH}"/>
      <line class="plaxs" x1="${PLL}" y1="${PLT + PLTH}" x2="${PLW - PLR}" y2="${PLT + PLTH}"/>
      <polyline class="plline" points="${lpts}"/>
      <text class="pltk" x="${PLL - 6}" y="${PLT + 4}" text-anchor="end">${plNum(lv[1])}</text>
      <text class="pltk" x="${PLL - 6}" y="${PLT + PLTH}" text-anchor="end">${plNum(lv[0])}</text>

      <text class="pllab" x="${PLL}" y="${PLM - 7}">marginal effect · the band is every
        setting of the other parameters at once${clipped
          ? ", reaching " + plNum(reach) + " off the panel" : ""}</text>
      <line class="plax" x1="${PLL}" y1="${PLM}" x2="${PLL}" y2="${PLAX}"/>
      ${slabs}
      ${clipped ? `<line class="plclip" x1="${PLL}" y1="${PLM}" x2="${PLW - PLR}" y2="${PLM}"/>` : ""}
      <line class="plzero" x1="${PLL}" y1="${z.toFixed(1)}" x2="${PLW - PLR}" y2="${z.toFixed(1)}"/>
      ${mpts ? `<polyline class="plmline" points="${mpts}"/>` : ""}
      ${none ? `<text class="plnone" x="${PLL + iw / 2}" y="${PLM + PLMH / 2}"
        text-anchor="middle">no finite range here — the arithmetic admits a zero in a
        denominator over this box</text>` : ""}
      ${/* each end of the scale is padding, not data, so where one crowds the
            zero label it is zero that keeps the room */
        z - PLM > 13 ? `<text class="pltk" x="${PLL - 6}" y="${PLM + 4}" text-anchor="end">${plNum(md[1])}</text>` : ""}
      ${PLAX - z > 13 ? `<text class="pltk" x="${PLL - 6}" y="${PLAX}" text-anchor="end">${plNum(md[0])}</text>` : ""}
      ${zlab}${flip}

      <line class="plax" x1="${PLL}" y1="${PLAX}" x2="${PLW - PLR}" y2="${PLAX}"/>
      <text class="pltk" x="${PLL}" y="${PLAX + 13}">${b0}</text>
      <text class="pltk" x="${PLW - PLR}" y="${PLAX + 13}" text-anchor="end">${b1}</text>
      <text class="pltl" x="${PLL + iw / 2}" y="${PLAX + 26}" text-anchor="middle">${hesc(p.x)}</text>
    </svg>
    <div class="plsay">
      <p class="plprop">${p.verdict === "proved"
        ? `Proved <b>everywhere on the declared box</b>, by interval arithmetic over every
           parameter and weight at once rather than by sampling.`
        : `Proved on <b>${(100 * p.share).toFixed(1)}%</b> of the declared box, and the other
           way on the rest${p.flip
             ? `, turning inside [${p.flip[0].toFixed(4)}, ${p.flip[1].toFixed(4)}]` : ""}.`}${
        p.open > 0.0001 ? ` <b>${(100 * p.open).toFixed(1)}%</b> of the box stayed undecided,
          which is a verdict and not a gap.` : ""}</p>
      ${plClassHTML(p, cls)}
      ${p.cs.length ? `<p class="plscope"><b>At that threshold:</b> ${p.cs.map(c =>
        `${hesc(c.k)} moves it ${c.sign > 0 ? "up" : c.sign < 0 ? "down" : "either way"}`).join(" · ")}
        — by the implicit function theorem, without solving for it.</p>` : ""}
      <p class="plfix">Both lines are one slice: every other parameter at the centre of its
        bounds, at one combination of the class. The band is not a slice.</p>
    </div>
  </div>`;
}

/* The derivation renders as the buffer now -- see bufHTML. */

const SBAR = v => `<span class="sbar"><i style="width:${Math.round(100 * Math.max(0, Math.min(1, v)))}%"></i></span>`;
function scoreRowsHTML(){
  const R = theRule(), f = SCORE.funnel;
  return `<div class="ascore">
    <span><b>${f.got}</b> candidates</span>
    <span><b>${f.derived || 0}</b> derived above</span>
    <span><b>${f.ran}</b> ran</span>
    <span><b>${f.material}</b> material</span>
    <span><b>${f.novel}</b> on a pair nothing asserts</span>
    <span><b>${f.comp}</b> live in an interaction</span>
    <span>scored ${hesc(SCORE.at)}</span>
  </div>
  <p class="why">That funnel is on the page on purpose. ${f.got} candidates ranked down to
    ${f.kept} is a multiple comparison unless the count is visible, and no amount of scoring
    makes the top row a finding by itself.</p>
  <div class="chain">${SCORE.rows.map((r, i) => r.skip
    ? `<div class="crow arow"><span class="cst part">not run</span>
         <span class="cnm">${hesc(r.c.for || "candidate")}<span class="cfl">${hesc(r.c.form || "")}</span></span>
         <span class="cwy">${hesc(r.why)}</span></div>`
    : `<div class="crow prow${r.ruledOut ? " out" : ""}">
      <span class="cst ${r.ruledOut ? "gap" : r.total > 0.66 ? "ok" : "part"}">${
        r.ruledOut ? "ruled out" : "#" + (i + 1)}</span>
      <span class="cnm">${r.c.src === "derived"
        ? `<span class="srcd" title="A signed derivative from the derivation above, not a proposal">derived</span> ` : ""}${
        hesc(r.c.for || "candidate")}<span class="cfl">${
        hesc(r.c.form)}${r.c.y ? " · " + hesc(r.c.y) + " in " + hesc(r.c.x)
          : r.c.expr ? " · " + hesc(r.c.expr) : ""} · ${
        r.verdict.ok ? "holds" : "does not hold"}${r.c.src === "derived"
          ? " · " + (r.c.verdict === "proved" ? "proved on the whole box"
              : "proved on " + (100 * r.c.share).toFixed(0) + "%") : ""}</span></span>
      <span class="pacts2">${SBAR(r.total)}</span>
      <span class="cwy">${hesc(r.c.why || "")}</span>
      <span class="cwy sax">${SAXES.map(([a]) => {
        const o = a === "material" ? r.material : a === "novel" ? r.novel
                : a === "composition" ? r.comp : r.robust;
        const sc = a === "composition" ? r.comp.s : a === "novel" ? r.novel.s
                 : a === "material" ? r.material.s : r.robust.s;
        return `<b class="${sc >= 1 ? "on" : sc > 0 ? "part" : "off"}">${a}${
          a === "composition" ? " · " + hesc(r.comp.lab) : ""}</b> ${hesc(o.why)}`;
      }).join("<br>")}</span>
    </div>`).join("")}</div>`;
}

const CTG = {bounds:"bounds", kinds:"kind class", aspects:"aspect class",
             composition:"composition", forms:"form class",
             shapes:"shape class", roles:"role class", tests:"test"};
/* A number written into an expression is a weight nobody named, and the
   sweep can only move what has a name. "no weights to sweep" reads as
   reassurance and is as often a gap, so the two are worth telling apart: the
   constants inside a declared form member belong to the member, and every
   other number is a decision somebody took and did not declare. */
function unnamedNums(){
  const sp = classSpec();
  if(!sp) return 0;
  let n = 0;
  for(const l of (sp.lines || [])){
    /* A form member's own constants are the member's. The SCALE in front of
       one is not -- it is a weight somebody chose -- so skipping the whole
       line because it carries a family hid every weight on a recognised
       member, which is most of them. */
    const cur = (ARITH.fam || {})[l.lhs];
    const src = cur ? String(cur.scale || "") : String(l.rhs || "");
    n += (src.match(/\d+(?:\.\d+)?/g) || []).length;
  }
  return n;
}
function ctRowsHTML(){
  const rows = CT.rows, held = rows.filter(r => r.ok && !r.skip).length;
  const broke = rows.filter(r => !r.ok), skip = rows.filter(r => r.skip).length;
  const byG = {};
  for(const r of rows){ (byG[r.group] = byG[r.group] || []).push(r); }
  return `<div class="ascore">
    <span><b>${held}</b> obligations hold</span>
    <span><b>${broke.length}</b> broken</span>
    <span><b>${skip}</b> not runnable here</span>
    <span>${CT.n ? `<b>${CT.sweeps.length}</b> of them break when a weight moves`
      : unnamedNums() ? `<b>${unnamedNums()}</b> number${unnamedNums() === 1 ? "" : "s"} written in, none named`
      : "no weights: every number belongs to a declared form"}</span>
    <span>run ${hesc(CT.at)}</span>
  </div>
  <div class="chain">${Object.keys(byG).map(g => byG[g].map(r => `<div class="crow arow">
    <span class="cst ${r.skip ? "part" : r.ok ? "ok" : "gap"}">${
      r.skip ? "not run" : r.ok ? "holds" : "broken"}</span>
    <span class="cnm">${hesc(r.n)}<span class="cfl">${CTG[r.group] || r.group}${
      r.cls ? " \u00b7 " + hesc(r.cls) : ""}${r.disj ? " \u00b7 one of these" : ""}</span></span>
    <span class="cwy">${hesc(r.why)}</span>
  </div>`).join("")).join("")}</div>
  ${CT.sweeps && CT.sweeps.length ? `<p class="why" style="margin-top:9px"><b>What a weight
    moves.</b> ${CT.sweeps.slice(0, 6).map(x =>
      `<code>${hesc(x.c)}</code> at ${x.f}\u00d7 breaks <i>${hesc(x.n)}</i> \u2014 ${hesc(x.why)}`).join("; ")}${
    CT.sweeps.length > 6 ? `; and ${CT.sweeps.length - 6} more` : ""}. A conclusion that survives
    the declared class and not the weights is about the weights, and nothing in the corpus fixes
    those.</p>` : CT.n ? `<p class="why" style="margin-top:9px">Every obligation that held at the
    proposed weights still holds with each of the ${CT.n} swept to half and to double, one at a
    time.</p>` : unnamedNums() ? `<p class="why" style="margin-top:9px"><b>Nothing here was
    swept.</b> ${unnamedNums()} number${unnamedNums() === 1 ? " is" : "s are"} written into the
    expressions without a name, and this page can only move what has one. Give each a name and
    an interval — <code>k_half = 0.5 in [0.2, 1.0]</code> — and every obligation above
    is re-answered at half and at double it. A number nobody named is a decision nobody took,
    and the corpus fixes none of them.</p>` : `<p class="why" style="margin-top:9px">Nothing was
    swept, and nothing needed to be: every number in the arithmetic is a constant of a declared
    form member rather than a weight somebody chose.</p>`}`;
}


/* ---------------------------------------------------------------------------
   The families, as expressions this page can write.

   docs/bench/vocab.js opens by saying what this is for: "Picking a logistic
   because it is S-shaped is a stipulation, and no amount of sensitivity
   analysis over its parameters answers the objection -- it only explores one
   shape more finely. The answer is to stop picking."

   That machinery has been in Python since the model was written and step 3.1
   never used it, so a term was a free expression and the choice of shape was
   the one declaration nobody made. Here it is a declaration: pick the FAMILY
   the theory asserts, pick a member to run first, and the other members are
   there to be run too -- which is what makes the choice explorable rather
   than merely tractable.

   Every member is ENDPOINT-NORMALISED, which is the kernel's rule and not a
   convenience: all members agree at f(0) and f(1), only the shape between
   them differs, and scale lives in a weight outside the family. Without it,
   swapping a form moves magnitude and shape at once and a broken proposition
   cannot be attributed to either.

   The expressions below are the exact Python members transcribed into the
   grammar -- the logistic carries its normalising constants symbolically
   rather than rounded, so nothing drifts between the two implementations. */
/* DERIVED from the published vocabulary rather than transcribed from it.

   This was a third copy. `src/docs/bench/vocab.js` holds the callables,
   `vocab.js` holds the same members as grammar expressions, and
   `tests/vocab_check.py` evaluates both at eleven points to hold them
   together -- and then this list said it all again, in the page, checked by
   nothing. vocab.js's own header warns that a vocabulary transcribed twice
   will disagree eventually; it was transcribed three times.

   The only thing the page knows that the vocabulary does not is how often
   this corpus REPORTED each shape, which is a fact about the literature and
   not about the function, so that is what stays here. */
/* THE REGISTRY IS core/forms.js NOW, with the tag that says which registry a
   result was computed over. What is left here is the half that is about THIS
   PAGE: the families a scholar added in this browser, which live in a store,
   and the labels the rows print. */
const xfam = new Map();
function famSave(){ lsWrite("purposeFams", [...xfam.values()]); }
function famLoad(){
  const v = lsRead("purposeFams");
  if(v) v.forEach(f => xfam.set(f.fam, f));
}
/* Three families came with the model. A bench that can only enumerate over
   those is a bench for this model, and the call asks for infrastructure other
   scholars can use on their own. So the set is extensible, and a family added
   here is a family in every sense the page knows: it is offered where its
   properties fit, it writes a line, and its other members are there to be
   swept. A member is checked against the family's own declared properties
   before it is accepted -- a family whose members do not have the properties it
   claims is not a class, it is a list. */
const allFams = () => FORMLIB.concat([...xfam.values()]);
const famByName = n => formByName(n, [...xfam.values()]);

/* The shape words, with the two endpoint properties collapsed into the one
   sentence the kernel uses for them. They are a declaration and they are also
   true of every member of all four built-in families, which is why reading
   them out in full on every row would be noise. */
function needLab(f){
  const nd = (f && f.need) || [], sh = nd.filter(p => !FORM_ENDS.includes(p));
  const e = FORM_ENDS.filter(p => nd.includes(p));
  return (sh.join("+") || "no shape") + (e.length === 2 ? " \u00b7 normalised at both ends"
    : e.length === 1 ? " \u00b7 " + e[0] : "");
}
const famsFor = props => formsFor(props, [...xfam.values()]);

/* A member over the unit interval, which is where a family lives, or over
   whatever box its reader is declared on -- which is not the same question
   and the rows that use it say which one they asked. */
function sweepUnit(src, box){
  const b = box || [0, 1];
  const e = readExpr(String(src).replace(/X/g, "x_"), new Set(["x_"]));
  const xs = [], ys = [];
  for(let i = 0; i <= 24; i++){
    const x = b[0] + (b[1] - b[0]) * i / 24, S = Object.create(null);
    S.x_ = x; xs.push(x); ys.push(evalRPN(e.rpn, S));
  }
  return {xs, ys};
}
function addFamily(name, need, text, why){
  const nm = String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if(!/^[a-z][a-z0-9_]{0,31}$/.test(nm)) return {err:"a family needs a lower_snake_case name"};
  if(famByName(nm)) return {err:nm + " is already a family"};
  if(!need.length) return {err:"say what every member of it has in common, or it is not a class"};
  const members = [], bad = [];
  for(const raw of String(text || "").split("\n")){
    const t = raw.replace(/#.*$/, "").trim();
    if(!t) continue;
    const m = /^([a-z][a-z0-9_]*)\s*=\s*(.+)$/.exec(t);
    if(!m){ bad.push('"' + t.slice(0, 28) + '" is not name = expression'); continue; }
    let w;
    try{ w = sweepUnit(m[2]); }
    catch(e){ bad.push(m[1] + ": " + ((e && e.message) || "cannot read it")); continue; }
    if(w.ys.some(v => !(typeof v === "number" && isFinite(v)))){
      bad.push(m[1] + " is not a number everywhere on [0, 1]"); continue; }
    // the properties the family claims, checked on the member that claims them
    for(const p of need){
      const v = shapeVerdict(p, w);
      if(!v.ok) bad.push(m[1] + " is not " + p + ": " + v.why);
    }
    members.push([m[1], m[2]]);
  }
  if(bad.length) return {err:bad.slice(0, 3).join("; ") + (bad.length > 3 ? "; and more" : "")};
  if(!members.length) return {err:"a family needs at least one member"};
  xfam.set(nm, {fam:nm, need:need.slice(), members,
    corpus:{n:"yours", c:0, p:0}, mine:true,
    why:String(why || "").slice(0, 240) || "Added here. Nothing in the corpus attests it.",
    at:new Date().toISOString().slice(0, 10)});
  famSave();
  return {ok:true, n:members.length};
}
/* A member reads X on [0, 1] -- that is the kernel's endpoint rule and the
   whole reason swapping one moves the shape and not the scale. Substituting
   the RAW reader therefore only works where the reader's declared range is
   [0, 1], and the page did exactly that everywhere: the skeleton, the
   palette, and the recogniser.

   Declare a parameter over [0.1, 0.5] and pick sqrt, and the page wrote
   sqrt(x) -- which is 0.3162 at the bottom of that range and 0.7071 at the
   top, so it broke f(0)=0 and f(1)=1, the two properties its own family
   claims. The page then reported the break against the modeller. A tool that
   writes a line and then blames you for it is worse than one that writes
   nothing, and this is the one failure mode the bench exists to prevent.

   So the reader is mapped onto the unit interval first, which is what a
   formal modeller does by hand and what makes the family's properties
   properties of the TERM over the range it actually runs on. The affine map
   is increasing, so increasing, concave, convex and sigmoid all survive it,
   and the two endpoint properties become true instead of false. */
const formExpr = (e, reader, box) => {
  const b = box || [0, 1];
  const u = (b[0] === 0 && b[1] === 1) ? String(reader)
    : "((" + reader + " - " + b[0] + ") / " + (b[1] - b[0]) + ")";
  return String(e).replace(/X/g, u);
};
const readBox = r => (r && r.from != null) ? abnd(r.from) : [0, 1];
/* An expression split into the part that carries the shape and the scale in
   front of it. Read off the tree rather than compared as text, so brackets
   and the order of a product do not matter.

   The scale is any numeric factor and any DECLARED CONSTANT factor, because
   a weight on a term is the normal case here -- the prompt insists every
   weight be a named constant, so refusing to see past one would mean no line
   a model writes ever carries a family. A parameter factor is not scale: it
   is part of the shape, and `reader * sqrt(reader)` is not sqrt. */
function bareParts(node, consts){
  const f = []; flatProd(node, f);
  const keep = [], drop = [];
  for(const g of f){
    if(!g) continue;
    if(g.t === "n" || (g.t === "v" && consts && consts.has(g.v))) drop.push(g);
    else keep.push(g);
  }
  return {key:keep.length ? keep.map(keyOf).sort().join(" * ") : null,
          scale:drop.map(g => treeText(g)).join(" * ")};
}
function famsOf(M, lines){
  const claim = {};
  for(const ln of (lines || [])) if(ln && ln.family && ln.member)
    claim[String(ln.lhs || "").trim()] = {fam:String(ln.family), member:String(ln.member)};
  const cs = new Set(M.consts.map(c => c.name));
  const out = {};
  for(const st of M.steps){
    if(st.kind !== "term" || !st.rel) continue;
    const reader = varName(st.rel.from), box = abnd(st.rel.from);
    let got;
    try{ got = bareParts(rpnTree(st.rpn), cs); }catch(e){ continue; }
    if(!got.key) continue;
    /* The scale travels with the record, because swapping a member has to
       swap the member and not the scale: substituting a bare member for a
       weighted one would make f(1)=1 hold across a class whose running line
       breaks it. */
    const take = (c, how) => {
      const f = c && famByName(c.fam);
      const m = f && f.members.find(x => x[0] === c.member);
      if(!m) return false;
      try{
        const want = bareParts(rpnTree(readExpr(formExpr(m[1], reader, box),
          new Set([reader])).rpn), null);
        if(!want.key || want.key !== got.key) return false;
      }catch(e){ return false; }
      out[st.lhs] = {fam:f.fam, member:m[0], reader, scale:got.scale, how};
      return true;
    };
    const was = (ARITH.fam || {})[st.lhs];
    if(take(claim[st.lhs], "named")) continue;
    if(take(was, (was && was.how) || "picked")) continue;
    /* NOBODY NAMED IT, AND IT IS ONE ANYWAY. The first live answer to the
       arithmetic prompt wrote four lines that were four family members
       exactly -- the saturating exponential, sqrt and log, and the
       credibility smoothstep -- and said so in its own notes, while leaving
       the JSON fields empty. So the page offered three families on every row
       and enumerated none of them, and the model's own request that "the page
       can run the whole saturating family" went nowhere.

       An expression that IS a member is a member whoever named it. The
       comparison is the same exact one used above -- read off the tree,
       nothing guessed, nothing approximated -- and only families the declared
       shape admits are looked at. The row says the family was RECOGNISED
       rather than declared, because the two are not the same warrant and this
       page keeps those apart everywhere else. */
    if(!propsOf(st.rel).length) continue;
    for(const f of famsFor(propsOf(st.rel))){
      let done = false;
      for(const m of f.members) if(take({fam:f.fam, member:m[0]}, "read")){ done = true; break; }
      if(done) break;
    }
  }

  /* A SHAPE CLASS ON A SHARED LINE.

     Everything above asks the question of a mechanism's own term, because a
     term has a relation and a relation says what the reader is. That is the
     common case and it is not the only one: a shape function can be written
     once and TAPPED by several mechanisms, which is how the two-channel model
     is built -- one credibility curve read by the firm-specific lift and by
     vulnerability reduction, one cost curvature read by all three costs.

     Declaring the class on one tap leaves the other taps at the default
     shape, so the enumeration would be a statement about a class the model is
     not in. Declaring it on the tap and having the others read the tap makes
     switching one mechanism off switch the shared curve off with it, which is
     a different model and breaks the ablation. So the class goes on the
     shared line, and this is what finds it.

     Two differences from the pass above, and both are about having no
     relation to ask. The family has to be DECLARED -- `family` and `member`
     on the line -- because there are no shape properties to narrow a search
     to, and guessing across every member of every family is not recognition.
     And the reader is read off the line: every name the line uses is tried,
     and the one whose member expression matches this line's own tree exactly
     is the reader. Nothing is approximated; a line matching no member under
     any of its names is left without a class and the row says so. */
  for(const st of M.steps){
    if(out[st.lhs]) continue;
    const c = claim[st.lhs];
    if(!c) continue;
    const f = famByName(c.fam);
    const m = f && f.members.find(x => x[0] === c.member);
    if(!m) continue;
    let got;
    try{ got = bareParts(rpnTree(st.rpn), cs); }catch(e){ continue; }
    if(!got.key) continue;
    for(const reader of (st.uses || [])){
      /* A declared parameter brings its own range; a local that another line
         writes is on the unit interval by construction, because every member
         of every declared family maps [0, 1] onto [0, 1]. */
      const k = (M.params || []).find(p => varName(p) === reader);
      const box = k === undefined ? [0, 1] : abnd(k);
      let want;
      try{
        want = bareParts(rpnTree(readExpr(formExpr(m[1], reader, box),
          new Set([reader])).rpn), null);
      }catch(e){ continue; }
      if(!want.key || want.key !== got.key) continue;
      out[st.lhs] = {fam:f.fam, member:m[0], reader, scale:got.scale,
                     how:"named", shared:true};
      break;
    }
  }
  return out;
}
// the member with whatever scale the line carried in front of it
const memberSrc = (src, cur, box) => cur && cur.scale
  ? cur.scale + " * (" + formExpr(src, cur.reader, box) + ")"
  : formExpr(src, cur.reader, box);
/* THE CLASSES SURVIVE A RELOAD NOW.

   famsOf is called in one place: the moment arithmetic is taken. Restoring a
   kept body -- on a reload, or on switching scenario -- put the lines back and
   left this empty, so step 3.1 drew no form rows and step 4.1 offered every
   slot with no running member and the whole vocabulary admitted. The declared
   class was reported wider than it is, and the point estimate every robustness
   row is stated against came back blank. Checked in the page against the
   worked example, which carries five terms that ARE family members.

   Recovered on demand rather than on a fourth call site, and asked at most
   once per kept body: a body with no recognisable member is a fact about the
   body, not something to recompute on every render. */
let FAMTRIED = "";
function famRecover(){
  const A = ARITH.kept;
  if(!A || !(A.lines || []).length) return;
  const sig = String(A.sig || "") + "|" + A.lines.length;
  if(FAMTRIED === sig) return;
  FAMTRIED = sig;
  try{
    const M = keptModel();
    if(M) ARITH.fam = famsOf(M, A.lines);
  /* computation inside a render: a body that will not read has no classes,
     and step 3.1 says so on its own rows. Recorded as well, because this
     runs on a scenario load where nobody is watching that step. */
  }catch(e){ noteFail("reading the form classes back", e); }
}
/* The shared-line classes, as [lhs, record] pairs. 20-expset.js needs to
   ENUMERATE them rather than look one up, and asking it to reach into
   ARITH.fam for that put a name in it that it does not import -- which the
   scanner's reachability pass said so within the hour of my adding it. */
function famShared(){
  if(!Object.keys(ARITH.fam || {}).length) famRecover();
  return Object.entries(ARITH.fam || {}).filter(([, c]) => c && c.shared);
}
const famOf = t => {
  if(!Object.keys(ARITH.fam || {}).length) famRecover();
  return (ARITH.fam || {})[t] || null;
};

/* Rewrite one line of the text, leaving every other line where it was. This
   is the same surface as the typing, so a form picked here and a form typed
   by hand are the same object afterwards. */
function setLineForm(term, famName, member, reader){
  const f = famByName(famName);
  const m = f && f.members.find(x => x[0] === member);
  if(!m) return;
  const rel = carriedRelations().find(x => "t_" + mechNames(carriedRelations()).get(x.id) === term);
  const want = term + " = " + formExpr(m[1], reader, rel ? abnd(rel.from) : null);
  const lines = String(ARITH.text != null ? ARITH.text : arithToText()).split("\n");
  let done = false;
  for(let i = 0; i < lines.length; i++){
    const g = ALINE.exec(lines[i].replace(/#.*$/, ""));
    if(g && g[1] === term){ lines[i] = want; done = true; break; }
  }
  if(!done) lines.push(want);
  ARITH.text = lines.join("\n");
  ARITH.fam = Object.assign({}, ARITH.fam || {});
  ARITH.fam[term] = {fam:famName, member, reader, how:"picked"};
  takeArith(parseArith(ARITH.text), true);
}

/* Three of the six shape properties are a sign on a derivative, and a sign
   on a derivative is provable. Twenty-one points saying a term is concave is
   evidence; an interval evaluation of its second derivative over the declared
   box that never reaches above zero is a proof. Where the method shrugs, the
   sweep still answers and the row says which it got -- sound and incomplete
   means undecided is a verdict and not a failure. */
const SHAPE_D = {increasing:[1, 1], concave:[2, -1], convex:[2, 1]};
function proveShape(M, r, term, prop, opt){
  const sd = SHAPE_D[prop];
  if(!sd || !M.params.includes(r.from)) return null;
  let ino;
  try{ ino = inlineOutcome(M, term); }catch(e){ return null; }
  if(ino.err) return null;
  const x = varName(r.from);
  let node = ino.tree;
  for(let i = 0; i < sd[0]; i++){
    node = dTree(node, x);
    if(node.t === "nd") return null;
    node = simp(node);
  }
  /* The box, and whose it is. proveShape read abnd() for every parameter
     and never asked bdec(), so a sign signed over the 0-to-1 default came
     back as "proved over the whole DECLARED box" -- on the same screen as a
     parameter table saying the bound was never declared. The proof is sound
     either way; what is not declared is its SCOPE, and scope-plus-proposition
     is the output unit, so the row has to say which box it spoke over. Third
     time this rule has turned up: bdec, the endpoint properties, and now the
     proof layer this is here to keep honest. */
  const box = {}, dflt = [];
  for(const k of M.params){
    box[varName(k)] = abnd(k);
    if(!bdec(k) && hasVar(node, varName(k))) dflt.push(varName(k));
  }
  for(const c of M.consts) box[c.name] = wbnd(c);
  const pts = M.consts.filter(c => !wdec(c) && hasVar(node, c.name)).map(c => c.name);
  const v = proveSign(node, box, sd[1], opt || {depth:7, boxes:220});
  return {node, v, dflt, pts};
}

/* What the declarations ask of this one term, answered against what is
   written for it, where the reader is free enough to sweep. */
function lineCheck(M, r, term, opt){
  const out = {rows:[], ys:null, xs:null};
  if(!M || !M.steps.some(s => s.lhs === term)) return out;
  if(!M.params.includes(r.from)){
    /* Not unanswered, though: where a family is recorded, the form class row
       runs every member on its own over the box its reader is declared on.
       Saying only "not swept" under-reported an obligation that something on
       the same sheet had just answered. */
    out.rows.push({ok:true, skip:true, n:"not swept",
      why:varName(r.from) + " is written by something rather than free" +
        (famOf(term) ? ", so the form class row below answers the same obligation member by member"
          : " — pick a family on its row and every member is run on its own instead")});
    return out;
  }
  const w = asweep(M, r.from, term, 24);
  out.xs = w.xs; out.ys = w.ys;
  const props = propsOf(r);
  if(!props.length) out.rows.push({ok:true, skip:true, n:"no shape declared",
    why:"nothing is asked of it, so nothing can fail"});
  for(const p of props){
    const pr = proveShape(M, r, term, p, opt);
    if(pr && pr.v.verdict === "proved"){
      out.rows.push({ok:true, proved:true, n:p, dflt:pr.dflt.length,
        why:(pr.dflt.length
          ? "proved over " + pr.dflt.join(", ") + " on this page's 0 to 1 default, which is " +
            "not a bound anybody declared — declare it on step 3.1 and the scope is yours"
          : "proved over the whole declared box, not sampled") +
          (pr.pts.length ? ". Its weights are points rather than intervals, so it is proved AT " +
            "them and not over them" : "")});
      continue;
    }
    if(pr && pr.v.verdict === "disproved"){
      out.rows.push({ok:false, n:p,
        why:"disproved: the sign is wrong everywhere the method could reach"});
      continue;
    }
    const v = shapeVerdict(p, w);
    out.rows.push({ok:v.ok, skip:!!v.skip, n:p,
      why:v.ok ? (pr ? "held at 24 points; the proof was inconclusive on " +
            (100 * pr.v.openShare).toFixed(0) + "% of the box"
          : "held over the declared range, at 24 points")
        : v.why});
  }
  return out;
}


export { BCMDLOG, BCMDS, CTG, DEPCAP, FAMALIAS, FAMCORPUS, FAMTRIED, FORMLIB, FORM_ENDS, FORM_PROPS, PLH, PLW, SBAR, SHAPE_D, addFamily, allFams, bareParts, bufCan, bufConstNames, bufDiffNames, bufGuessHTML, bufHTML, bufImport, bufRowHTML, bufRun, bufSample, bufScript, bufSeed, bufSplitTarget, bufVerdictHTML, ctRowsHTML, depsHTML, depsOf, famByName, famLoad, famOf, famRecover, famSave, famShared, famsFor, famsOf, formExpr, keptPlot, lineCheck, memberSrc, needLab, plateHTML, plotBoarded, plotWorth, proveShape, readBox, scoreRowsHTML, setLineForm, sweepUnit, unnamedNums, xfam };

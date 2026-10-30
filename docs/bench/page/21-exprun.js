/* AMG bench, page script: running the set step 4.1 declares.
   One shared global scope, loaded in order. See page/README.md.

   20-expset.js declares the set and sizes it, and step 4.1 said in so many
   words that nothing ran it: the page reported "3,125 combinations" and then
   derived at one of them, which makes the robustness of every finding an
   accident of which member happened to be written. This runs it.

   WHAT IT DOES. For each combination in the declared set, every slot's line is
   rewritten to the member that combination picks, the model is rebuilt from
   the rewritten lines, and every proposition on the board is re-signed over
   the same declared box. What comes back is a tally per proposition: how many
   combinations its conclusion survived, and which members break it.

   TWO DIMENSIONS, KEPT APART. The box and the class are different questions. A
   conclusion can be proved on the whole declared box at the written member and
   fail at a third of the members, or hold at every member on a box a tenth the
   size. Reporting one number is how a result that holds for 100 of 100 forms
   gets called robust while the parameter setting breaks it a third of the
   time. So a row that has been run carries both, in the same words a result
   returned from somebody else's engine carries them.

   WHY THE SEARCH IS SHALLOWER HERE. The single derivation on step 3.2 gets the
   full proof effort, because it is one question. This is that question times
   the size of the set, so each combination gets a bounded search and an
   undecided verdict is cheap: the tally counts a combination as breaking the
   conclusion only where it answers something else, and names the ones it could
   not settle separately. A conclusion is never recorded as surviving a
   combination the page did not settle. */
import { hesc } from "../core/safe.js";
import { SEARCH } from "../core/rank.js";
import { EXP, EXPCAP, expEnum, expLabel, expSize } from "../core/expset.js";
import { dTree, hasVar, mmResolve, proveSign, simp } from "../core/kernel.js";
import { xrunStale, xrunWord } from "../core/verdict.js";
import { ARITH, abnd, buildArith, classSpec, wbnd } from "./08-ask.js";
import { BOARD, boardKept, boardSave, xlog } from "./05-explore.js";
import { expSlotsNow } from "./20-expset.js";
import { famOf, memberSrc } from "./10-depends.js";
;
import { inlineOutcome } from "./09-derive.js";
import { varName } from "./11-classes.js";

const XRUN = {rows:null, at:"", err:"", busy:false, set:"", label:"",
  ran:0, of:0, undec:0, turn:0, sig:"", outside:0, big:0};
/* The largest set this runs, matching the enumeration's own cap so that the
   two cannot disagree. A set larger than this is REFUSED rather than run in
   part: the cross product is enumerated in order, so its first n combinations
   are a prefix and not a sample, and a tally over a prefix reads as a
   measurement while being an artefact of which slot was listed first. On the
   worked example the first 240 of 3,125 all carried the default member in the
   leading slots and every proposition came back holding at 240 of 240, where
   the two ends of the same class break one of them. Declaring a seeded sample
   is the way to run a subset, and it reproduces. */
const XRUNCAP = EXPCAP;
/* WHAT A RUN COSTS IS COMBINATIONS TIMES PROPOSITIONS, not combinations. Nine
   thousand combinations over two propositions is half a second; the same class
   over forty is twenty times the work. So the budget is in signings, and a
   model carrying more on its board is held to the same WAIT rather than to the
   same count. At the measured rate -- about fifty signings a millisecond --
   this is a few seconds at worst. */
const XRUNWORK = 400000;
/* Per-combination proof effort, which is the kernel's own default. It was
   bounded at depth 6 over 120 boxes to keep the wait down, and that was
   measured and dropped: on the worked example's class the shallower search
   turned eight combinations the full one PROVES into a reported sign change,
   which is not a cheaper answer but a different and wrong one. */
const XRUNEFF = {};

/* The same box the single derivation reads, so a tally over the class is a
   tally of the same question rather than a different one. */
function xrunBox(M){
  const box = {};
  for(const k of M.params) box[varName(k)] = abnd(k);
  for(const c of M.consts) box[c.name] = wbnd(c);
  return box;
}

/* xrunWord(), xrunClause() and xrunStale() are core/verdict.js now, beside
   lineSays(), which asks the same question of a derived line. */

/* One outcome against one parameter, on one rebuilt model. The corners are
   resolved before differentiating, as everywhere else: a ceiling that does not
   bind on the declared box is not a corner on it. */
function xrunSign(M, box, y, x){
  const ino = inlineOutcome(M, y);
  if(ino.err) return {err:ino.err};
  const mr = mmResolve(ino.tree, box);
  if(!hasVar(mr.tree, x)) return {verdict:"flat", dir:0, share:1};
  const d = simp(dTree(mr.tree, x));
  if(d.t === "nd") return {err:mr.open.length ? "a corner crosses the box" : (d.why || "no derivative")};
  const up = proveSign(d, box, +1, XRUNEFF);
  if(up.verdict === "flat") return {verdict:"flat", dir:0, share:1};
  const dn = proveSign(d, box, -1, XRUNEFF);
  const dir = up.share >= dn.share ? 1 : -1;
  const best = dir === 1 ? up : dn;
  return {verdict:best.verdict, dir, share:best.share, fail:best.failShare};
}

/* The kept lines with every slot rewritten to this combination's member.
   Textual and then parsed, which is what the form rows on step 3.1 do through
   respec and what picking a member by hand does to the text. The scale in
   front of a line travels with it, because swapping a member has to swap the
   member and not the level. */
function xrunSpec(spec, combo, slots){
  const by = new Map();
  for(const m of (combo || [])){
    const s = slots.find(x => x.term === m.term);
    /* A COMPOSITION SLOT IS ALREADY A WHOLE LINE and must not go through
       memberSrc, which rescales a shape member over its reader's declared
       range. core/compose.js wrote this one from the outcome's own terms, with
       whatever capped it still capping it, so it is substituted as it
       stands. */
    if(s && s.comp){ by.set(m.term, m.src); continue; }
    const cur = famOf(m.term);
    if(!cur) continue;
    by.set(m.term, memberSrc(m.src, cur, (s && s.box) || [0, 1]));
  }
  return {constants:spec.constants,
    lines:spec.lines.map(l => by.has(l.lhs) ? {lhs:l.lhs, rhs:by.get(l.lhs), why:l.why} : l),
    checks:spec.checks};
}

/* Every proposition on the board, over every combination of the declared set.

   The propositions come from the BOARD and not from the whole derivation: the
   board is what somebody would stand behind, and reading six stated
   conclusions against the class is the question. A row that came back from
   somewhere else says nothing this page can re-sign, so it is listed and not
   counted. */
function xrunGo(){
  XRUN.err = ""; XRUN.rows = null;
  const spec = classSpec();
  if(!spec){ XRUN.err = "no arithmetic was kept on step 3.1, so there is nothing to re-sign"; return; }
  /* A SHAPE SLOT NEEDS A RECOGNISED FAMILY; a composition slot does not have
     one and never did. The filter was written when every slot was a shape, and
     it silently dropped the composition slots the moment they existed -- so
     the set reported its size with them in it and ran without them. */
  const slots = expSlotsNow().filter(s => s.comp || famOf(s.term));
  if(!slots.length){
    XRUN.err = "no slot carries a recognised family, so every combination would be the same model";
    return; }
  const o = {pick:EXP.pick, n:EXP.n, seed:EXP.seed};
  const combos = expEnum(slots, EXP.set, o);
  const want = expSize(slots, EXP.set, o);
  if(!combos.length){ XRUN.err = "the declared set is empty"; return; }
  if(combos.length > XRUNCAP || combos.length < want){
    XRUN.err = "the declared set is " + want + " combinations and this enumerates at most " +
      XRUNCAP + ". The first " + XRUNCAP + " of a cross product are a prefix and not a " +
      "sample of it, so a tally over them would be an artefact of which slot was listed " +
      "first \u2014 nothing is reported instead. Declare a seeded sample of the size you want " +
      "and the run reproduces.";
    /* AND THE WAY OUT IS A BUTTON, not only a sentence. The refusal names the
       fix and a reader had to go and perform it: pick the set, type a size,
       press run. A class grows past the cap for an ordinary reason -- the
       worked example's did the moment the composition became an axis, 3,125 to
       9,375 -- so the state is common enough to deserve one press. */
    XRUN.big = want;
    return; }
  XRUN.big = 0;
  const stated = boardKept().filter(r => r.y && r.x && r.says && r.src !== "tool");
  const outside = boardKept().filter(r => !(r.y && r.x && r.says && r.src !== "tool"));
  if(!stated.length){
    XRUN.err = "nothing on the board is a proposition this page signed, so there is nothing to read against the class";
    return; }
  /* AND WHETHER IT IS AFFORDABLE, asked in signings rather than in
     combinations. Refused the same way a set over the enumeration ceiling is,
     and with the same way out, because to a reader the two are one thing: the
     set is bigger than this page will run, and a seeded sample of it will. */
  if(combos.length * stated.length > XRUNWORK){
    XRUN.err = "the declared set is " + want + " combinations and the board carries " +
      stated.length + " proposition" + (stated.length === 1 ? "" : "s") + ", which is " +
      (combos.length * stated.length).toLocaleString("en") + " signs to settle \u2014 more " +
      "than this page will do in one press. Declare a seeded sample of the size you want " +
      "and the run reproduces.";
    XRUN.big = want;
    return; }

  const base = buildArith(spec);
  if(!base.steps.length){ XRUN.err = "the kept arithmetic no longer reads"; return; }
  const box = xrunBox(base);
  /* THREE STATES, ALL THREE COUNTED. A combination either agrees, or it is
     decided the other way, or the search could not settle it -- and the third
     is not the second. `turn` used to be implied by subtraction, which left
     every reader of a tally to do the arithmetic and let the page report
     "holds at 1000 of 3125" for a conclusion that nothing in the class
     contradicts. On the worked example 1,000 combinations agree, 2,125 are
     undecided and NOT ONE turns; the old number read as 68% failure. */
  const rows = stated.map(r => ({y:r.y, x:r.x, says:r.says, text:r.text,
    held:0, of:0, undec:0, turn:0, broke:[]}));
  const run = combos;
  for(const combo of run){
    let M;
    try{ M = buildArith(xrunSpec(spec, combo, slots)); }catch(e){ continue; }
    if(!M.steps.length) continue;
    const lab = combo.map(m => m.name).join("/");
    for(let i = 0; i < rows.length; i++){
      const got = xrunSign(M, box, rows[i].y, rows[i].x);
      const word = xrunWord(got);
      rows[i].of++;
      if(word === rows[i].says) rows[i].held++;
      else if(!word){ rows[i].undec++; if(rows[i].broke.length < 8) rows[i].broke.push({lab, says:"not settled"}); }
      else { rows[i].turn++; if(rows[i].broke.length < 8) rows[i].broke.push({lab, says:word}); }
    }
  }
  XRUN.rows = rows;
  XRUN.set = EXP.set;
  XRUN.label = expLabel(slots, EXP.set, o);
  XRUN.ran = run.length;
  XRUN.of = expSize(slots, EXP.set, o);
  XRUN.undec = rows.reduce((t, r) => t + r.undec, 0);
  XRUN.turn = rows.reduce((t, r) => t + r.turn, 0);
  XRUN.sig = (ARITH.kept && ARITH.kept.sig) || "";
  XRUN.outside = outside.length;
  XRUN.at = new Date().toISOString().slice(0, 16).replace("T", " ");

  /* THE TALLY GOES ON THE ROW. A board row already carries what was proved and
     over which box; this is the other half, and it travels with the scenario
     the way the rest of the row does. Written in the same shape a result
     returned from another engine carries, so a derived row and a returned one
     can be read side by side. */
  for(const r of rows){
    const b = BOARD.rows.find(z => z.y === r.y && z.x === r.x);
    if(!b) continue;
    b.forms = {held:r.held, of:r.of, undec:r.undec, turn:r.turn, set:XRUN.set,
      label:XRUN.label, sig:XRUN.sig, at:XRUN.at};
  }
  boardSave();
  xlog("expset", "Ran the declared set",
    XRUN.label + " · " + rows.length + " proposition" + (rows.length === 1 ? "" : "s") +
    " re-signed over " + XRUN.ran + " combination" + (XRUN.ran === 1 ? "" : "s"));
}



/* The largest seeded sample the page offers, which is also the cap on the n
   field: a sample is declared and reproduces, where a prefix does neither. */
const XRUNSAMP = 500;

function xrunHTML(){
  if(XRUN.err) return `<p class="why" style="color:var(--neg)">${hesc(XRUN.err)}</p>` +
    (XRUN.big ? `<div class="cmpacts" style="margin:7px 0 0">
      <button type="button" class="edbtn" id="expSample"
        title="Declares a seeded sample of ${XRUNSAMP} of the ${XRUN.big} combinations and runs it. Seeded, so the same ${XRUNSAMP} come back every time and the tally reproduces.">Declare a seeded sample of ${XRUNSAMP} and run it</button>
      <span class="sp">a sample is declared and reproduces; a prefix is neither</span>
    </div>` : "");
  if(!XRUN.rows) return "";
  const stale = xrunStale({sig:XRUN.sig}, ARITH.kept && ARITH.kept.sig);
  return `<div class="embhd" style="margin-top:12px">
      <span class="ctl-label" id="expSurvive">What survives the set</span>
      <span class="cwy">${hesc(XRUN.label)} · run ${hesc(XRUN.at)}${
        stale ? " · against arithmetic that has since changed" : ""}</span>
    </div>
    <div class="chain">${XRUN.rows.map(r => {
      /* THE CHIP IS AGREEMENT AMONG THE DECIDED, not agreement over the set.
         A combination the search could not settle is not a combination that
         disagreed, and a chip reading 1000/3125 beside a conclusion nothing
         contradicts is the page arguing against its own finding. */
      const dec = r.held + r.turn;
      const cls = !dec ? "gap" : r.turn ? (r.held ? "part" : "gap") : "ok";
      return `<div class="crow">
        <span class="cst ${cls}" title="${dec
          ? r.held + " of the " + dec + " combination(s) the search could decide agree; " +
            r.undec + " could not be decided either way"
          : "the search could decide none of the " + r.of + " combinations"}">${
          dec ? r.held + "/" + dec : "0 decided"}</span>
        <span class="cnm">${hesc(r.y)} in ${hesc(r.x)}<span class="cfl">${
          hesc(r.text || (r.y + " " + r.says + " in " + r.x))}</span></span>
        <span class="cwy">${!dec
          ? `Not one of the ${r.of} combinations could be settled either way. Nothing here
             bears on the class, in either direction — the search is bounded for a run
             this size, and step 3.2's single derivation gets the full effort.`
          : !r.turn
          ? `The same sign on every one of the ${dec} combination${dec === 1 ? "" : "s"} the
             search could decide${r.undec
               ? `. The other ${r.undec} are undecided, which is not the other sign` : ""}.`
          : hesc(r.broke.filter(b => b.says !== "not settled")
              .map(b => b.lab + " → " + b.says).slice(0, 4).join(" · ")) +
            (r.turn > 4 ? " · and more" : "") +
            (r.undec ? ` · ${r.undec} undecided` : "")}</span>
      </div>`; }).join("")}</div>
    ${XRUN.outside ? `<p class="why"><b>${XRUN.outside}</b> row${XRUN.outside === 1 ? "" : "s"}
      on the board ${XRUN.outside === 1 ? "was" : "were"} not re-signed: a result returned from
      another engine, or a line with no direction, is not something this page can run over the
      class. ${XRUN.outside === 1 ? "It keeps" : "They keep"} the warrant ${
      XRUN.outside === 1 ? "it came" : "they came"} with.</p>` : ""}
    <p class="why fold"><span class="inf" tabindex="0" aria-label="more">i</span><span class="infx">Each combination gets a bounded search rather than the full one the
      single derivation gets, because this is that derivation times the size of the set. A
      combination the page could not settle is counted as not settled and never as surviving:
      the tally is a floor on robustness, not an estimate of it.</span></p>`;
}


export { XRUN, XRUNCAP, XRUNEFF, XRUNSAMP, xrunBox, xrunGo, xrunHTML, xrunSign, xrunSpec };

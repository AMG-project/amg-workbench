/* AMG bench, page script: the reviewer, where it reads the page and asks.
   One shared global scope, loaded in order. See page/README.md.

   The checks are core/checks.js. What is left here is the three things that
   cannot be: reviewState(), which reads fourteen of the page's own stores and
   returns the plain object every check takes; reviewBrief(), which quotes the
   guide's summary of where the curation stands; and reviewAsk(), the call out
   to a language model.

   One gatherer, one quoter, one ask. Everything about WHAT the reviewer looks
   for is on the other side of that line. */
import { SCORE } from "../core/rank.js";
import { REVIEW, REVIEW_KINDS, reviewChecks, reviewExposure, reviewPrompt } from "../core/checks.js";
import { ARITH, aiCap, arithSig } from "./08-ask.js";
import { BOARD, ROUNDS, guessTally, guideBrief, passTally, renderGuide, xlog } from "./05-explore.js";
import { BUF } from "./09-derive.js";
import { DEPOSIT } from "./02-modules.js";
import { lastView } from "./13-map.js";
import { noteFail } from "./03-stores.js";
import { openSpace, outcomeVars } from "./11-classes.js";
import { rulesOf } from "./03b-decisions.js";

/* ---- the state the two computed halves read ----------------------------
   Gathered once, explicitly, so that everything below is a pure function of
   a plain object and can be tested without a page. Nothing here decides
   anything; it only reads. */
function reviewState(){
  // computation inside a render: no tally means the panel leaves that row out
  let t = null; try{ t = passTally(); }catch(e){ noteFail("the pass tally", e); }
  const A = (typeof ARITH !== "undefined") ? ARITH.kept : null;
  const E = (lastView && lastView.links) || [];
  const outs = (typeof outcomeVars === "function") ? outcomeVars() : [];
  const kept = (typeof BOARD !== "undefined")
    ? BOARD.rows.filter(r => r.keep) : [];
  const guess = (typeof guessTally === "function") ? guessTally() : {n:0, wrong:0};
  return {
    open:    t ? t.open : 0,
    decls:   t ? t.n : 0,
    unver:   t ? t.unver : 0,
    corpus:  t ? t.corpus : 0,
    space:   (typeof openSpace === "function") ? (openSpace() || null) : null,
    arith:   !!A,
    stale:   !!(A && A.sig && typeof arithSig === "function" && A.sig !== arithSig()),
    fail:    (A && A.run) ? A.run.fail : 0,
    pass:    (A && A.run) ? A.run.pass : 0,
    outs:    outs.length,
    noRule:  outs.filter(k => !((typeof rulesOf === "function" ? rulesOf(k) : []).length)).length,
    arrows:  E.filter(x => x.carried).length,
    corrob:  (lastView && lastView.corrob3 != null) ? lastView.corrob3 : null,
    lines:   (typeof BUF !== "undefined") ? BUF.lines.slice() : [],
    kept,
    rounds:  (typeof ROUNDS !== "undefined") ? ROUNDS.length : 0,
    guess,
    scored:  (typeof SCORE !== "undefined") ? !!SCORE.rule : false,
    deposit: (typeof DEPOSIT !== "undefined") ? DEPOSIT.length : 0,
  };
}

/* ---- the deep pass -----------------------------------------------------
   Everything the computed halves found, plus the state, plus what the
   scholar got wrong, handed over once. */
function reviewBrief(S, checks, expo){
  const L = [];
  L.push("THE STATE OF THE CURATION");
  try{ L.push(guideBrief(9)); }catch(e){ L.push("(unavailable)"); }
  L.push("");
  L.push("WHAT THE PAGE ALREADY COMPUTED, so do not repeat it:");
  for(const c of checks) L.push(`  [${c.sev}] ${c.text} -- ${c.why}`);
  for(const e of expo) L.push(`  [exposure] ${e.text} -- ${e.why}`);
  if(S.kept.length){
    L.push("");
    L.push("THE RETAINED FINDINGS:");
    for(const r of S.kept)
      L.push(`  ${r.text || (r.y + " in " + r.x)} | ${r.verdict}${
        typeof r.share === "number" ? ", on " + (100 * r.share).toFixed(1) + "% of the box" : ""
      } | round ${r.round}${r.guess ? ` | the scholar expected ${r.guess}` : ""}${
        r.agree === false ? " AND WAS WRONG" : ""}`);
  }
  if(S.guess.n) L.push(`\nTHE SCHOLAR HAS BEEN WRONG ${S.guess.wrong} TIMES OUT OF ${S.guess.n} about what a derivative would do.`);
  return L.join("\n").slice(0, 12000);
}

async function reviewAsk(){
  if(REVIEW.busy) return;
  const cap = (typeof aiCap === "function") ? await aiCap() : null;
  if(!cap){ REVIEW.err = "no model is available in this view"; renderGuide(); return; }
  REVIEW.busy = true; REVIEW.err = ""; renderGuide();
  const t0 = Date.now();
  try{
    const S = reviewState(), C = reviewChecks(S), X = reviewExposure(S);
    const r = await cap.json(reviewPrompt(S, C, X, reviewBrief(S, C, X)), {modelTier:"complex"});
    const raw = ((r && r.notes) || []).filter(n => n && n.what);
    const good = raw.filter(n => REVIEW_KINDS.includes(String(n.act || "")))
      .map(n => ({kind:String(n.kind || "spark"), act:String(n.act),
        what:String(n.what), do:String(n.do || "")})).slice(0, 8);
    REVIEW.ideas = good;
    REVIEW.outside = raw.length - good.length;
    REVIEW.at = new Date().toISOString().slice(0, 16).replace("T", " ");
    REVIEW.secs = Math.round((Date.now() - t0) / 100) / 10;
    if(!good.length) REVIEW.err = "nothing came back that names a move";
    else if(typeof xlog === "function")
      xlog("review", "A reading of the whole model",
        good.length + " notes in " + REVIEW.secs + "s, " +
        good.filter(n => n.act === "none").length + " of them not actionable");
  }catch(e){
    REVIEW.err = (e && e.code) ? String(e.code).replace(/_/g, " ")
      : String((e && e.message) || "the reading could not finish");
  }
  REVIEW.busy = false; renderGuide();
}
export { reviewAsk, reviewBrief, reviewState };

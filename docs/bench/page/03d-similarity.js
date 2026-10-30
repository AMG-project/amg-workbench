/* AMG bench, page script: similarity, where the page meets the corpus.
   One shared global scope, loaded in order. See page/README.md.

   The scoring is core/similarity.js and knows nothing about this corpus. What
   is left here is everything that does: the shipped word score read out of
   G.sim, a pair's two construct records looked up in N, which pairs exist in
   the scope now, the shortlist a language model is asked about, and the
   browser store the declaration is kept in.

   The line between the two is "how a pair is scored" against "which pairs
   there are", which is the line a scholar replacing the measure wants. */
import { SIM, simForm, simInputsOf, simKey, simScoreOf } from "../core/similarity.js";
import { G } from "../graph-data.js";
import { N, lsRead, lsWrite } from "./03-stores.js";

const SIMKEY = "purposeSimilarity";

/* G.sim is a list and the formula asks for one pair at a time, so it is read
   into a map once. Rebuilt never: the corpus does not change under the page. */
let SIMW = null;

function simWord(a, b){
  if(!SIMW){
    SIMW = new Map();
    if(typeof G !== "undefined" && G.sim)
      for(const [x, y, s] of G.sim) SIMW.set(simKey(x, y), s);
  }
  const v = SIMW.get(simKey(a, b));
  return v == null ? 0 : v;
}

function simInputs(a, b){
  const look = i => (typeof N !== "undefined" && N.get) ? N.get(i) : null;
  return simInputsOf(look(a), look(b), simWord(a, b));
}

/* Every pair the standing measure scores, in the same shape G.sim has, so
   clusters() reads one list whichever measure is standing.

   The formula scores every pair in scope, which is where it beats the shipped
   list: G.sim carries 1,416 pairs because cluster.py dropped everything under
   0.06, and a pair the wording never scored is exactly the pair a signature
   formula is there to find. Memoised on the measure, the text and the size of
   the scope, because clusters() runs on every render. */
let SIMP = null;

function simPairs(inv){
  if(SIM.m === "mean")
    return ((SIM.out && SIM.out.pairs) || []).map(p => [p.a, p.b, p.s]);
  if(SIM.m !== "form")
    return (typeof G !== "undefined" && G.sim) ? G.sim : [];
  const f = simForm();
  if(!f.rpn) return [];
  const tag = f.src + "|" + inv.size;
  if(SIMP && SIMP.tag === tag) return SIMP.rows;
  const ids = [...inv].sort();
  const rows = [];
  for(let i = 0; i < ids.length; i++)
    for(let j = i + 1; j < ids.length; j++){
      const v = simScoreOf(simInputs(ids[i], ids[j]), f);
      if(v > 0) rows.push([ids[i], ids[j], v]);
    }
  rows.sort((p, q) => q[2] - p[2]);
  SIMP = {tag, rows};
  return rows;
}

function simForget(){ SIMP = null; }

/* What the highest score is under the standing measure, so the slider can say
   what it is cutting rather than leaving the reader to find out by dragging. */
function simTop(inv){
  let top = 0;
  for(const [a, b, s] of simPairs(inv))
    if((!inv || (inv.has(a) && inv.has(b))) && s > top) top = s;
  return top;
}

/* The shortlist a model is asked about. The cheap measure picks it, which is
   the honest division of labour: wording is good at saying which pairs are
   WORTH a judgement and bad at making one. */
function simShortlist(inv, n){
  const out = [];
  if(typeof G !== "undefined" && G.sim)
    for(const [a, b, s] of G.sim)
      if(inv.has(a) && inv.has(b)) out.push({a, b, s});
  out.sort((x, y) => y.s - x.s);
  return out.slice(0, n || 60);
}

function simSave(){
  lsWrite(SIMKEY, {m: SIM.m, crit: SIM.crit, form: SIM.form, out: SIM.out, at: SIM.at});
}

function simLoad(){
  const o = lsRead(SIMKEY);
  if(!o || typeof o !== "object") return;
  if(o.m === "word" || o.m === "form" || o.m === "mean") SIM.m = o.m;
  if(typeof o.crit === "string") SIM.crit = o.crit;
  if(typeof o.form === "string" && o.form.trim()) SIM.form = o.form;
  if(typeof o.at === "string") SIM.at = o.at;
  if(o.out && Array.isArray(o.out.pairs))
    SIM.out = {pairs: o.out.pairs.filter(p => p && p.a && p.b && typeof p.s === "number"),
               refused: Array.isArray(o.out.refused) ? o.out.refused : [],
               at: String(o.out.at || "")};
}


export { SIMKEY, SIMP, SIMW, simForget, simInputs, simLoad, simPairs, simSave, simShortlist, simTop, simWord };

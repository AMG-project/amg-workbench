/* core: how two constructs are scored as similar.

   The corpus ships ONE similarity: an IDF-weighted overlap of the tokens in a
   construct's id and its aliases, computed offline and carried as 1,416
   scored pairs. It measures WORDING, and a merge is a claim about meaning, so
   the bench offers more: four signature agreements read off what the corpus
   records about each construct, a count of the papers they share, and a
   formula over all of it in the kernel's own grammar. A language model may
   propose pairs or groups, and what it proposes is checked against the ids in
   scope before any of it is written.

   What is here is the SCORING: the inputs a pair presents, the formula over
   them, and the two readers that check a proposal. Which pairs exist in a
   corpus, and what the shipped measure says about them, is the page's --
   page/03d-similarity.js. To change how similarity is measured, change this
   file; tests/similarity.test.mjs holds it.

   The inputs arrive as two plain records and a word score; a proposal is
   checked against a set of ids the caller passes. Neither the corpus nor the
   browser store is reachable from here.

   core/ RULE: nothing in this file may use a name declared outside core/.
   scripts/check_bench.py fails the build if one does. */
import { evalRPN, readExpr } from "./kernel.js";

const SIM = {
  m: "word",            // word | form | mean
  crit: "",             // what `mean` judges against, in the scholar's words
  /* Starts as the shipped measure exactly, so choosing this setting changes
     nothing until the scholar writes something. A default that re-merged the
     corpus the moment it was selected would be a decision taken for them --
     and the obvious-looking `0.6 * word + 0.4 * sig` is exactly that: it puts
     6,655 of 12,090 pairs over the default threshold and leaves ONE group,
     because sharing a level and a scale is worth 0.2 on its own. */
  form: "word",
  out: null,            // what came back from `mean`: {pairs, refused, at}
  err: "",
  at: ""                // when `mean` was last asked
};

/* The seven facts a formula may use. Each is a number, each is read off the
   corpus rather than declared, and the list is closed: readExpr refuses
   anything else by name. The gloss is what the page prints beside the box,
   because a name nobody can see the meaning of is not usable. */
const SIMNAMES = [
  ["word",   "the shipped wording score for this pair, 0 if it was never scored"],
  ["level",  "1 if both sit at the same level of analysis"],
  ["scale",  "1 if both are measured on the same kind of scale"],
  ["bearer", "1 if the same thing bears the quantity"],
  ["flow",   "1 if both are a stock, or both a flow"],
  ["sig",    "how much of those four agrees, 0 to 1"],
  ["papers", "how many papers assert both of them"]
];

const SIMSET = new Set(SIMNAMES.map(x => x[0]));

const simKey = (a, b) => a < b ? a + "|" + b : b + "|" + a;

/* The facts, from two construct records. Takes the records and not their ids
   so that it can be run without the page's own index. */
function simInputsOf(x, y, word){
  if(!x || !y) return null;
  const eq = p => (x[p] && y[p] && x[p] === y[p]) ? 1 : 0;
  const level = eq("l"), scale = eq("s"), bearer = eq("b"), flow = eq("f");
  const px = new Set(x.p || []);
  return {word: word || 0, level, scale, bearer, flow,
          sig: (level + scale + bearer + flow) / 4,
          papers: (y.p || []).filter(s => px.has(s)).length};
}

/* The formula, parsed once per text. A parse failure is a message under the
   box and an empty list, never a throw into a render. */
let SIMF = null;

function simForm(){
  if(SIMF && SIMF.src === SIM.form) return SIMF;
  try{
    const r = readExpr(SIM.form, SIMSET);
    SIMF = {src: SIM.form, rpn: r.rpn, uses: r.uses, err: ""};
  }catch(e){
    SIMF = {src: SIM.form, rpn: null, uses: [], err: e.message};
  }
  return SIMF;
}

function simScoreOf(ins, f){
  if(!ins || !f || !f.rpn) return 0;
  const v = evalRPN(f.rpn, ins);
  return (typeof v === "number" && isFinite(v)) ? v : 0;
}

/* How many pairs a model is asked about in one go. Sixty fits a prompt, and
   the shipped list only scores 1,416 pairs in the first place. */
const SIMSTEP = 60;

/* What came back, checked before it is shown. The rule is the one every other
   proposal on this bench is held to: an id that is not in scope is COUNTED,
   not written. A score outside 0 to 1 is clamped rather than refused, because
   the pair is still a judgement and the number is a scale the page set. */
function simTake(r, inv){
  const raw = ((r && r.pairs) || []).filter(x => x && x.a && x.b);
  const kept = [], refused = [];
  const seen = new Set();
  for(const x of raw){
    const a = String(x.a), b = String(x.b);
    if(a === b || !inv.has(a) || !inv.has(b)){ refused.push(a + " / " + b); continue; }
    const k = simKey(a, b);
    if(seen.has(k)) continue;
    seen.add(k);
    const s = Number(x.score);
    if(!isFinite(s)){ refused.push(a + " / " + b); continue; }
    kept.push({a, b, s: Math.max(0, Math.min(1, s)),
               why: String(x.why || "").replace(/\s+/g, " ").trim().slice(0, 240)});
  }
  kept.sort((p, q) => q.s - p.s);
  return {pairs: kept, refused, at: new Date().toISOString().slice(0, 10)};
}

/* Every construct at once, which is the other way to ask the question: not
   "are these two the same" sixty times over, but "which of these name the
   same quantity" once, over the whole scope. One ask instead of two hundred,
   and the answer comes back as GROUPS, which is the shape a merge already
   has on this page.

   A group of twenty is a merge of twenty constructs into one. Past that it is
   almost certainly the model giving up and grouping by topic, so the members
   past the cap are counted rather than written. */
const SIMGCAP = 20;

function simTakeGroups(r, inv){
  const pairs = [], refused = [];
  const seen = new Set();
  let groups = 0;
  for(const g of ((r && r.groups) || [])){
    const ids = [], why = String((g && g.why) || "").replace(/\s+/g, " ").trim().slice(0, 200);
    for(const m of ((g && g.members) || [])){
      const id = String(m);
      if(!inv.has(id)){ refused.push(id); continue; }
      if(ids.length >= SIMGCAP){ refused.push(id); continue; }
      if(!ids.includes(id)) ids.push(id);
    }
    if(ids.length < 2) continue;
    groups++;
    const sc = Math.max(0, Math.min(1, Number(g.score)));
    for(let i = 0; i < ids.length; i++)
      for(let j = i + 1; j < ids.length; j++){
        const k = simKey(ids[i], ids[j]);
        if(seen.has(k)) continue;
        seen.add(k);
        pairs.push({a:ids[i], b:ids[j], s:isFinite(sc) && sc > 0 ? sc : 1, why});
      }
  }
  pairs.sort((p, q) => q.s - p.s);
  return {pairs, refused, groups, at:new Date().toISOString().slice(0, 10)};
}


export { SIM, SIMF, SIMGCAP, SIMNAMES, SIMSET, SIMSTEP, simForm, simInputsOf, simKey, simScoreOf, simTake, simTakeGroups };

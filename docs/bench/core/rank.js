/* core: how a candidate finding is scored and ordered.

   A model this size derives more propositions than anybody will report, so
   something has to say which few are worth standing behind -- and that is a
   judgement about what makes a finding interesting, not a fact about the
   model. Four quantities, a rule over them the scholar can state in their own
   words, the order that falls out, and the three targets a search over the
   declared class can be pointed at.

   Keeping it small and keeping it here is the point. A scholar who disagrees
   with what this bench calls interesting -- who thinks novelty should outrank
   robustness, or that a finding resting on one mechanism is worth more than
   one resting on five -- changes this file and nothing else, and the ranking
   they get is theirs rather than ours.

   Everything arrives as a candidate object. Nothing here reads the page, the
   corpus, or what has been derived, and that was measured rather than assumed:
   these eight declarations import nothing at all, from core/ or from the page.

   core/ RULE: nothing in this file may import from outside core/.
   scripts/check_bench.py fails the build if one does. */

const SCORE = {defn:"", rule:null, prop:[], rows:null, busy:"", err:"", funnel:null, at:""};
const SAXES = [
  ["material",    "clears the minimum effect",
   "the effect is at least as big as the smallest difference the theory is declared to be about"],
  ["novel",       "no relationship already asserts the pair",
   "no relation carried from the literature runs straight from the antecedent to the consequent"],
  ["composition", "it lives in the interaction, not in one mechanism",
   "it survives every mechanism switched off alone and dies when a pair is switched off together"],
  ["robust",      "it survives the weights moving",
   "it still holds with every declared weight at half and at double"],
];
const RULE0 = () => ({weights:{material:1, novel:1, composition:1, robust:1},
  require:[], note:"", unreachable:[], declared:false});
const theRule = () => SCORE.rule || RULE0();

function rankBy(rows, rule){
  const w = rule.weights || {};
  for(const r of rows){
    if(r.skip){ r.total = -1; continue; }
    const need = (rule.require || []).every(a =>
      a === "material" ? r.material.ok : a === "novel" ? r.novel.s >= 1
      : a === "composition" ? r.comp.s >= 1 : r.robust.s >= 1);
    const sum = (+w.material || 0) * r.material.s + (+w.novel || 0) * r.novel.s +
                (+w.composition || 0) * r.comp.s + (+w.robust || 0) * r.robust.s;
    const tot = (+w.material || 0) + (+w.novel || 0) + (+w.composition || 0) + (+w.robust || 0);
    r.total = need ? (tot ? sum / tot : 0) : -1;
    r.ruledOut = !need;
  }
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

const SEARCH = {out:null, target:"proved", busy:false, err:"", at:""};
const STARGETS = [
  ["proved", "the sign is proved over the whole declared box",
   "A configuration in which the selected line's derivative keeps one sign everywhere, so the " +
   "conclusion is about the structure and not about where in the box you stood."],
  ["interaction", "the conclusion lives in an interaction",
   "A configuration in which no single mechanism switched off kills the conclusion but some pair " +
   "does \u2014 the equifinal case, and the one a loop that ablates one at a time reports as " +
   "nothing mattering."],
  ["breaks", "some regularity condition breaks",
   "The adversarial one: a configuration the declarations admit and the conditions refuse. If it " +
   "exists, the class is wider than the theory and the finding is about the declaration."],
];

function lineCandidate(l){
  if(!l || !l.y || !l.x) return null;
  const dir = l.res ? l.res.dir : (l.sim ? l.sim.dir : 0);
  if(!dir) return null;
  return {id:"ws" + l.id, src:"line", form:dir > 0 ? "up" : "down", y:l.y, x:l.x,
    verdict:l.res ? l.res.verdict : "sampled",
    share:l.res ? l.res.share : (l.sim ? l.sim.share : null),
    flip:l.flip || null,
    for:(dir > 0 ? l.y + " rises in " + l.x : l.y + " falls in " + l.x),
    why:l.res ? "From the buffer, carrying the verdict it earned."
      : "From the buffer, sampled rather than proved."};
}

export { SCORE, SAXES, RULE0, theRule, rankBy, SEARCH, STARGETS, lineCandidate };

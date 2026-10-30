/* AMG bench, page script: the declared set, where the page meets it.
   One shared global scope, loaded in order. See page/README.md.

   The set algebra is core/expset.js and knows nothing about this page. What is
   left here is the two halves that cannot move: the browser store the
   declaration is kept in, and expSlotsNow(), which turns the curation --
   carried relations, their mechanism names, the family declared on each --
   into the plain slots core/ takes.

   That join is deliberately one function. Everything a scholar would want to
   change about which combinations get explored is in core/; everything about
   where the slots come from is here. */
import { COMPRULES, compRecompose } from "../core/compose.js";
import { EXP, EXPSETS } from "../core/expset.js";
import { carriedRelations, propsOf } from "./07-grouping.js";
import { famByName, famOf, famShared, famsFor, readBox } from "./10-depends.js";
import { ARITH, buildArith, classSpec, compImplements } from "./08-ask.js";
import { handName, rulesOf } from "./03b-decisions.js";
import { lsRead, lsWrite } from "./03-stores.js";
import { mechNames, outcomeVars, varName } from "./11-classes.js";
const EXPKEY = "purposeExploreSet";

function expSave(){
  lsWrite(EXPKEY, {set:EXP.set, n:EXP.n, seed:EXP.seed, pick:EXP.pick,
    why:EXP.why, name:EXP.name, at:EXP.at});
}
function expLoad(){
  const o = lsRead(EXPKEY);
  if(!o || typeof o !== "object") return;
  if(EXPSETS.some(x => x[0] === o.set)) EXP.set = o.set;
  if(typeof o.n === "number" && o.n > 0) EXP.n = Math.min(500, Math.round(o.n));
  if(typeof o.seed === "number") EXP.seed = o.seed >>> 0;
  if(o.pick && typeof o.pick === "object") EXP.pick = o.pick;
  if(typeof o.why === "string") EXP.why = o.why;
  if(typeof o.name === "string") EXP.name = o.name;
  if(typeof o.at === "string") EXP.at = o.at;
}

/* The slots of the model as it stands, in the shape above. A slot is a
   mechanism with a shape class: the family declared on its row if one is,
   otherwise every member of every family its declared properties admit --
   which is what makes an undeclared class large rather than empty.

   AND NOTHING WHERE NOTHING WAS DECLARED. The sentence above is about a term
   whose curvature nobody fixed, and it was being applied to a term nobody
   said anything about at all: with no class recognised and no shape property
   declared, famsFor([]) admits every family, so the page offered fifteen
   members for an expression it had no reason to think was a shape function.
   The two-channel model is where that showed: its mechanism terms are
   arithmetic over three shared curves -- `delta * cvx` is not a curve from pi
   to anything -- and the page offered eleven slots of fifteen, making the
   declared class 15^11 combinations wide, none of which anybody declared.
   A class is what somebody declared or what the line was recognised as. */
function expSlotsNow(){
  const rels = carriedRelations();
  if(!rels.length) return [];
  const nm = mechNames(rels);
  const out = [];
  for(const r of rels){
    const term = "t_" + nm.get(r.id);
    const cur = famOf(term);
    const props = propsOf(r);
    if(!cur && !props.length) continue;
    const fams = cur ? [famByName(cur.fam)].filter(Boolean) : famsFor(props);
    const members = fams.flatMap(f => (f.members || []).map(m =>
      ({fam:f.fam, name:m[0], src:m[1]})));
    if(!members.length) continue;
    /* The reader's declared range travels with the slot: a member is written
       over a NORMALISED reader, so substituting one at a slot whose reader is
       not on the unit interval needs the range to rescale with. */
    out.push({term, label:handName(r.from) + " \u2192 " + handName(r.to),
              running:(cur && cur.member) || "", box:readBox(r), members});
  }

  /* A SLOT ON A SHARED LINE. A shape function written once and tapped by
     several mechanisms is ONE declaration, not one per tap, and until
     famsOf() learned to see it the set to explore could not either. The class
     is declared rather than searched for -- there are no shape properties on
     a line that is not a relation's -- so there is exactly one family to
     offer, and the reader came off the line itself. */
  /* HOW THE MECHANISMS COMBINE, AS A SLOT OF ITS OWN.

     A shape class is a declaration and so is the composition rule, and until
     now only one of the two could be varied: a conclusion could rest on
     "additive" without anything ever asking what happens if the mechanisms
     multiply instead. The spec listed it as the one search axis that was not
     built, and it is an extension of this machinery rather than a new
     mechanism -- a combination already rewrites each slot's line and
     re-signs every proposition, and this is one more line to rewrite.

     WHICH RULES ARE OFFERED. The ones DECLARED for the outcome, where the
     scholar declared more than one, because declaring two and sweeping both is
     exactly what a class means. Where exactly one is declared the composition
     is settled and there is nothing to explore. Where NONE is declared, all
     five, because an undeclared composition is wide and not narrow -- the same
     rule the shape classes follow.

     An outcome written by one mechanism has no composition at all, and is
     skipped rather than offered with one member. */
  for(const k of outcomeVars()){
    const y = varName(k);
    const terms = rels.filter(r => r.to === k).map(r => "t_" + nm.get(r.id));
    if(terms.length < 2) continue;
    const declared = (rulesOf(k) || []).filter(r => COMPRULES.includes(r));
    const rules = declared.length > 1 ? declared
      : declared.length === 1 ? [] : COMPRULES.slice();
    if(!rules.length) continue;
    const line = (((ARITH.kept || {}).lines || []).find(l => l.lhs === y) || {}).py || "";
    if(!line) continue;
    const members = rules.map(r => ({fam:"composition", name:r,
      src:compRecompose(line, r, terms, "rho")}));
    /* WHICH ONE IS RUNNING is read off the line rather than taken from the
       declaration: a declared rule the written line does not implement is the
       disagreement step 3.1 reports, and reporting it as the running member
       here would hide it. `compImplements` answers structurally. */
    const M = ARITH.kept ? (() => { try{ return buildArith(classSpec()); }
      catch(e){ return null; } })() : null;
    const got = M ? (compImplements(M, k, terms) || []) : [];
    let running = got.find(g => rules.includes(g)) || "";
    /* A LINE THAT IMPLEMENTS NONE OF THE FIVE still has to be in the set, or
       "As written" would run a combination that is not what is written. The
       worked example has one: its outcome is a weighted sum one of whose
       summands holds two terms, which is a sum and not an additive
       composition, and compImplements is right to refuse it. So the line
       itself joins the members under its own name. */
    if(!running){
      running = "as written";
      members.unshift({fam:"composition", name:running, src:line});
    }
    out.push({term:y, kind:"comp",
      label:"how " + handName(k) + " combines its " + terms.length + " mechanisms",
      running, box:[0, 1], members, comp:true});
  }

  const seen = new Set(out.map(x => x.term));
  for(const [lhs, cur] of famShared()){
    if(seen.has(lhs)) continue;
    const f = famByName(cur.fam);
    if(!f) continue;
    const members = (f.members || []).map(m => ({fam:f.fam, name:m[0], src:m[1]}));
    if(!members.length) continue;
    out.push({term:lhs, label:lhs + " \u2014 read off " + cur.reader,
              running:cur.member || "", box:[0, 1], members, shared:true});
  }
  return out;
}

export { EXPKEY, expLoad, expSave, expSlotsNow };

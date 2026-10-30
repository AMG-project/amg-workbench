/* core: how mechanisms combine into an outcome, as one writer.

   Five rules, and they are five different theories of the same mechanism set
   with different predictions and different ablation signatures. Additive says
   each contributes on its own and removing one leaves the rest; multiplicative
   says each is necessary; min is a bottleneck; max is a substitute set; ces is
   between the first two with the elasticity swept. No paper states which, so it
   is declared on step 3.1.

   THE LINE WAS WRITTEN IN TWO PLACES AND IS WRITTEN HERE. `arithSkeleton` put
   an outcome's line together from its terms and the rule declared for it, and
   step 4.1 could not vary the rule at all -- which made the composition the one
   declaration a conclusion could rest on without anything ever asking what
   would happen if it were different. Two writers for one line would be two
   things to keep true, so there is one, and both read it.

   core/ RULE: nothing in this file may import from outside core/.
   scripts/check_bench.py fails the build if one does. */
import { NAMESIN, readExpr, rpnTree, treeText } from "./kernel.js";

const COMPRULES = ["additive", "multiplicative", "min", "max", "ces"];

/* THE COMPOSITION, over term names, as text in the bench grammar.

   `ces` needs a name for the elasticity and SHARES that sum to one. The
   unweighted power mean is not a mean -- two terms in [0, 1] reach 2 at rho = 1
   and 4 at rho = 0.5 -- so an outcome with a declared bound would fail
   `within_bounds` on a line the page wrote for it, for a reason that is not
   the modeller's. Weights summing to one put the result between the smallest
   term and the largest at every rho, which is what makes it a mean. They are
   written as literal decimals because the composition check reads the line
   back and does not recognise a named share: they are visible, and flagged as
   unnamed weights, which is the honest state for a number nobody declared. */
function compWrite(rule, terms, rho){
  const w = (terms || []).slice();
  if(!w.length) return "";
  if(w.length === 1) return w[0];
  const R = rho || "rho";
  if(rule === "multiplicative") return w.join(" * ");
  if(rule === "min" || rule === "max")
    return w.reduce((a, b) => rule + "(" + a + ", " + b + ")");
  if(rule === "ces"){
    const sh = (1 / w.length).toFixed(10).replace(/0+$/, "");
    return "(" + w.map(t => sh + " * " + t + " ** " + R).join(" + ") +
      ") ** (1 / " + R + ")";
  }
  return w.join(" + ");
}

/* A CAP AROUND A COMPOSITION, found so that swapping the rule keeps it.

   An outcome may be written `min(<the composition>, ceil_rights)`, and the cap
   is not part of how the mechanisms combine: it is a separate declaration, and
   dropping it would turn a bounded outcome unbounded and make the whole run
   about a different model. Worse, a `min` is exactly what puts a CORNER in the
   derivative, so losing one changes what the method can decide.

   Detected on the tree rather than on the text: the top node is min or max and
   one of its two arguments mentions none of the terms. That argument is the
   cap, whether it is a bare constant, a number or an expression in the
   weights. Returns null where there is no such wrapper, which is the common
   case. */
function compCap(rhs, terms){
  const T = new Set(terms || []);
  let tree;
  /* A PERMISSIVE SCOPE, built from the text itself. readExpr refuses a name
     the caller did not declare, which is right everywhere it is used to accept
     a line and wrong here: this is reading a line the page already accepted,
     to look at its shape, and it has no business knowing what was declared. */
  try{
    const e = readExpr(String(rhs), new Set(NAMESIN(rhs)));
    tree = rpnTree(e.rpn);
  }catch(err){ return null; }
  /* A CALL IS `t:"f"`, NOT `t:"o"`. min and max come back as function nodes
     from rpnTree, and reading them as operators found no cap anywhere: the
     first version of this returned null for every line and the feature looked
     like it worked because dropping a cap that was never found looks the same
     as there being none. */
  if(!tree || tree.t !== "f" || (tree.v !== "min" && tree.v !== "max")) return null;
  const has = n => {
    if(!n) return false;
    if(n.t === "v") return T.has(n.v);
    if(n.t === "o" || n.t === "f") return has(n.a) || has(n.b);
    return false;
  };
  const a = has(tree.a), b = has(tree.b);
  /* Both sides mention a term, or neither does: either way this min is part of
     the composition rather than a cap on it, and rewriting around it would be
     guessing. */
  if(a === b) return null;
  return {fn:tree.v, cap:treeText(a ? tree.b : tree.a)};
}

/* The outcome's line under a different rule, with whatever capped it still
   capping it.

   THE WEIGHTS ARE NOT CARRIED, and that is sound for the one question this is
   for. A line may read `w_clarity * t_a + w_mission * t_b`, and the rules other
   than additive and ces have no place to put a weight -- the skeleton writes
   none for them either. What step 4.1 does with a rewritten line is RE-SIGN
   every proposition over it, and a positive constant factor cannot change the
   sign of a derivative. So dropping a weight cannot change the answer to the
   question being asked, where dropping a cap could: a cap is a corner.

   A reader who wants the weights varied has the other axis for it -- declare
   the interval on each and interval arithmetic proves the conclusion over all
   of them at once. */
function compRecompose(rhs, rule, terms, rho){
  const body = compWrite(rule, terms, rho);
  if(!body) return String(rhs);
  const cap = compCap(rhs, terms);
  if(!cap) return body;
  return cap.fn + "(" + body + ", " + cap.cap + ")";
}

export { COMPRULES, compCap, compRecompose, compWrite };

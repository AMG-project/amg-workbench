/* core: the registry of named forms, and the tag that says which registry.

   THE REGISTRY EXISTED AND NOTHING COULD CITE IT. Four families with fifteen
   members between them, every member an EXPRESSION in the bench grammar, and
   every robustness claim this bench makes is a claim about those fifteen
   strings. They lived in `core/vocab.js` -- one source, which was the point of
   putting them there -- but they were readable only by something that parses
   JavaScript, and a result that came back saying "sqrt" named a string nothing
   in the file it travelled in could resolve.

   So two things are here.

   THE REGISTRY AS DATA, in the shape the rest of the page already used. Derived
   from VOCAB rather than restated, because a second copy of fifteen expressions
   is a second thing to keep true and a typo in one of them would not throw --
   it would change what a hundred form combinations mean, quietly, and the page
   would report the new number with the same confidence as the old one.
   `schema/forms.json` is generated from this and checked against it, which is
   how an engine in another language reads the same registry without parsing
   this file.

   AND A TAG FOR IT. `formsTag()` is a short deterministic digest over every
   family name, its declared properties and its member expressions, so a result,
   a proof or a deposit can say WHICH registry it was computed over. A
   conclusion that survived 100 form combinations survived a particular hundred,
   and a reader comparing two runs needs to know whether they were the same
   hundred. The hash is written out here rather than taken from the platform
   because `crypto.subtle` is asynchronous and a tag that cannot be read
   synchronously cannot go in a render.

   core/ RULE: nothing in this file may import from outside core/.
   scripts/check_bench.py fails the build if one does. */
import { VOCAB } from "./vocab.js";

/* WHAT THE CORPUS SAYS ABOUT EACH SHAPE, which is not a property of the
   function: how many claims in the purpose corpus state it and how many papers
   do. Carried beside the family so a row can say that a declared class is one
   the literature actually argues for, and kept here rather than in the
   vocabulary because it is a fact about this corpus and the vocabulary is not
   about any corpus. */
const FAMCORPUS = {
  sigmoid: {n:"threshold",  c:21, p:12},
  concave: {n:"saturating", c:4,  p:3},
  convex:  {n:"monotone",   c:25, p:15},
  linear:  {n:"linear",     c:4,  p:2},
};
/* The three families came with the purpose model and were named after its own
   mechanisms -- credibility, saturating, convex_cost -- which made a generic
   vocabulary read as specific to one literature and left the most important
   shape of all missing: there was no LINEAR family, so "no curvature" could not
   be declared and a search over the declared class could never report that
   curvature was not needed. They are named for their shape now, and a curation
   or a model saved under an old name still resolves. */
const FAMALIAS = {credibility:"sigmoid", convex_cost:"convex", saturating:"concave"};

const FORMLIB = ((VOCAB && VOCAB.families) || []).map(f => ({
  fam:f.name, need:f.properties.slice(), corpus:FAMCORPUS[f.name] || null,
  why:f.description, members:f.members.map(m => [m[0], m[1]]),
}));

/* DERIVED, for the same reason FORMLIB is: a property a family declares and
   this list does not carry is SILENTLY DROPPED from a request, so declaring it
   narrows nothing. A hardcoded list here did exactly that -- adding the linear
   family left `linear` out of the filter, so "increasing and linear" matched
   all four families because only `increasing` survived. */
const FORM_PROPS = [...new Set(FORMLIB.flatMap(f => f.need))];
const FORM_ENDS = ["f(0)=0", "f(1)=1"];

/* Which families a declared shape class admits, over the built-in registry
   plus whatever a scholar added. A class is CONJUNCTIVE, so a family serves it
   only where the family's own properties carry every one of them: declare
   increasing and concave and the sigmoids are not offered, which is the point
   of declaring it. */
function formsFor(props, extra){
  const all = FORMLIB.concat(extra || []);
  const want = (props || []).filter(p => FORM_PROPS.includes(p));
  return all.filter(f => want.every(p => f.need.includes(p)));
}
function formByName(n, extra){
  const all = FORMLIB.concat(extra || []);
  return all.find(f => f.fam === n) || all.find(f => f.fam === FAMALIAS[n]) || null;
}
const formCount = extra => FORMLIB.concat(extra || [])
  .reduce((t, f) => t + f.members.length, 0);

/* THE REGISTRY, FLAT, which is what goes in a file and what the tag is taken
   over. Sorted so the tag does not move when the source is reordered, and
   carrying nothing but what an engine needs to run a member: the family, what
   it claims, and the expressions. */
function formsData(){
  return FORMLIB.map(f => ({
    family:f.fam,
    properties:f.need.slice().sort(),
    members:f.members.map(m => ({name:m[0], expr:m[1]}))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).sort((a, b) => a.family.localeCompare(b.family));
}

/* A 32-bit FNV-1a over the canonical registry, as eight hex digits. Not a
   cryptographic digest and not pretending to be one: it answers "is this the
   same registry" and nothing else, which is the question a result file needs
   answered, and it answers it synchronously -- which crypto.subtle cannot, and
   a tag that cannot be read in a render is a tag nothing will carry. */
function fnv1a(s){
  let h = 0x811c9dc5;
  for(let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}
let TAG = "";
function formsTag(){
  if(TAG) return TAG;
  const flat = formsData().map(f => f.family + "[" + f.properties.join(",") + "]" +
    f.members.map(m => m.name + "=" + m.expr).join(";")).join("|");
  TAG = "forms-" + fnv1a(flat).toString(16).padStart(8, "0") + "-" +
    formsData().length + "x" + formCount();
  return TAG;
}

export { FAMALIAS, FAMCORPUS, FORMLIB, FORM_ENDS, FORM_PROPS, fnv1a, formByName,
  formCount, formsData, formsFor, formsTag };

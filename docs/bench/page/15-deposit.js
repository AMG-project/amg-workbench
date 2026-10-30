/* AMG bench, page script 16 of 22: the deposit, and who nominated what.
   One shared global scope, loaded in order. See page/README.md. */
import { EVB, kindOf } from "./12-claims.js";
import { BOARD } from "./05-explore.js";
import { MR } from "../model-report.js";
import { RECORDED, decided, dkey, groups } from "./03b-decisions.js";
import { idOf, lastView } from "./13-map.js";
import { pap, state } from "./03-stores.js";
/* =====================================================================
   STEP FOUR — the worklist.

   Three of step 2.1's four acts need the enumeration to have run: deciding
   which surviving claims are about the theory, setting how large a difference
   has to be, and retiring what fails everywhere. None of that exists yet.

   The fourth act does not wait on a model: "the evaluation can also overturn
   what the first step settled." That is this. The bench already knows enough to
   NOMINATE the decisions a curator owes the corpus — a fold that joined a stock
   to a flow, a relation whose papers do not agree, a notion resting on one
   relayed claim — and each nomination is answered with a verb from the
   vocabulary passes.tsv already uses.

   When the enumeration does land, it drops a survival count per claim id and
   becomes one more nominator here. Nothing below has to change for that.
   ===================================================================== */

// Each nominator reads the current view and returns candidate decisions.
// `key` must be stable across rebuilds, or an answered item would come back.
/* Each nominator says which earlier step produced the item it raises. Nothing
   here is a property of the corpus alone: a fold exists because YOU set a
   tightness, a relation is thin because YOU set a bar. The `from` field is what
   makes step 2.1 the consequence of steps 1.1 to 1.3 rather than a second
   opinion about the same data. */
const APPROACH_L = {st:"statement-centric", ex:"experience-based", dm:"decision-making", "--":"unassigned"};

const EV_L = {asserted:"asserted only", derived:"derived in a model only", estimated:"estimated from data only", reported:"relayed only"};
const STEPOF = {
  0: () => MR.model
    ? `the model \u00b7 ${MR.model.combinations} combinations of ${MR.model.classes.length} declared classes`
    : "the model",
  1: () => `step 1.1 · ${lastView.papersIn} papers in scope` +
           (state.ap !== "all" ? `, ${APPROACH_L[state.ap]} only` : "") +
           (state.minp !== 2 ? `, constructs used by ${state.minp}+ papers` : ""),
  2: () => `step 1.2 · tightness ${state.tight.toFixed(2)}` +
           (groups.size ? `, ${groups.size} merge${groups.size>1?"s":""} by hand` : ""),
  3: () => `step 1.3 · ` + ["Comm","Spec","Evid"].map(b => `${b.toLowerCase()} \u2265 ${state.bar[b]}`).join(", ") +
           (state.ev !== "all" ? `, ${EV_L[state.ev]}` : "") +
           (state.core ? ", largest joined-up set only" : "")
};

/* Step 1.3 can legitimately have nothing to show, and the two reasons call
   for different moves, so neither is left to be guessed at. */
function noArrowsWhy(){
  const AN = lastView.allNodes || [], AL = lastView.allLinks || [];
  const car = AN.filter(n => n.carried);
  if(!AN.length) return "";
  if(!car.length)
    return "no constructs are selected \u2014 go back to step 1.2 and pick some";
  const live = new Set(car.map(n => n.id));
  // d3's forceLink rewrites source and target in place, to node objects, on the
  // arrays lastView holds -- so anything reading them after a refresh has to
  // take the id off whichever of the two it got. Reading the raw field here
  // made every link look as though it joined nothing, and reported a hundred
  // and twenty-two connected constructs as unconnected.
  const end = x => x && x.id !== undefined ? x.id : x;
  if(!AL.some(e => live.has(end(e.source)) && live.has(end(e.target))))
    return `the ${car.length} selected construct${car.length === 1 ? "" : "s"} ` +
      `${car.length === 1 ? "is" : "are"} not joined by any relationship in this corpus \u2014 ` +
      `go back to step 1.2 and add one that connects them`;
  return "";
}

const papersOfNode = n => [...new Set(n.papers || [])];
const papersOfLink = e => [...new Set([...(e.papers || [])])];

const NOMINATORS = [
 {id:"sign", kind:"Papers differ about this arrow", weight:1, from:3,
  why:"More than one sign is asserted here, by more than one paper, with no value every one of them asserts \u2014 and your evidence filter is letting all of them through. Which decision it is depends on what the values are, and the row says which. CONTESTED means they cannot all hold: a direction against a null, or two directions against each other. One of these papers is wrong, and carrying the arrow as settled carries the error into the model. SCOPE DISPUTED means they are nested rather than opposed: a direction, and the same direction said to hold only under a condition. Both can be true, what is unsettled is the domain, and splitting the arrow by scope resolves it where dropping a paper does not. No arrow in this corpus is called positive by one paper and negative by another, so every contested arrow here is a direction against a null or a relation against none at all.",
  verbs:["split","CONFLICT","keep"],
  find: v => v.links.filter(e => ["cx", "sc"].includes(kindOf(e.claims.map(c => ({c})))))
   .map(e => ({
    key:dkey("sign", e.id), target:`${lbl(e.source)} \u2192 ${lbl(e.target)}`,
    members:[], claims:e.claims.map(c => c.id).filter(Boolean), papers:papersOfLink(e),
    nodeIds:[idOf(e.source), idOf(e.target)], linkIds:[e.id],
    detail:EVB[kindOf(e.claims.map(c => ({c})))].toUpperCase() + " \u00b7 " +
      e.claims.map(c => `${c.g} \u2014 ${pap(c.p).a} ${pap(c.p).y}`).join(" \u00b7 ")}))},

 {id:"relayed", kind:"Arrow rests only on relayed relationships", weight:3, from:3,
  why:"Every relationship here is a paper reporting a result it did not produce, and your evidence filter is not excluding them. Corpus-wide, what a relaying paper drops is a null, a condition or a mechanism \u2014 never a positive main effect \u2014 so an arrow standing only on relayed relationships is probably stronger on the map than in the literature.",
  verbs:["keep","retire","CONFLATION"],
  find: v => v.links.filter(e => e.claims.length && e.claims.every(c => c.e === "reported"))
    .map(e => ({key:dkey("relayed", e.id), target:`${lbl(e.source)} \u2192 ${lbl(e.target)}`,
                claims:e.claims.map(c => c.id).filter(Boolean), members:[],
                papers:papersOfLink(e),
                nodeIds:[idOf(e.source), idOf(e.target)], linkIds:[e.id],
                detail:`${e.claims.length} relationship${e.claims.length>1?"s":""}, all relayed`}))},


 /* THE SECOND STREAM: consequences of what a model returned rather than of a
    setting somebody moved, so their `from` is the model and no setting makes
    them stale.

    THESE READ THE SCHOLAR'S OWN BOARD NOW. They read MR.conclusions until 24
    October 2026 -- nine conclusions generated offline from
    models/purpose-two-channel.json and shipped as model-report.js. So a
    scholar who had opened the purpose example, declared their own arithmetic
    and derived their own propositions arrived at step 4.1 and was asked to
    adjudicate a DIFFERENT MODEL'S findings, with no sign on the page that
    they were somebody else's, where it reads as coming from an old run and
    duplicates the validity-domain tests already on the page.
    It is not useful, and the file is not stale -- tests/modelreport.test.mjs holds
    it to a fresh run -- it is simply about a model nobody on this page built.
    MR's relations and bindings are still read at step 2.1, where importing
    that model is the point.

    WHAT IS NOT ASKED ANY MORE, AND WHY. The old second question was whether a
    conclusion that survives does so by less than the smallest difference the
    theory is taken to be about. That needs a MARGIN per conclusion, which
    MR.conclusions carried and a board row does not: the margin is computed in
    the ranking pass at step 3.2, against state.matter, and is not stored when
    a line is taken onto the board. So the question is left unasked rather
    than asked about another model, and this is the note saying so. */

 {id:"turned", kind:"A finding the declared class contradicts somewhere", weight:0, from:0,
  why:"This was proved on the declared box, and then read against the declared class of functional forms, and somewhere in that class the sign comes out the OTHER WAY. That is the one reading that is evidence against the conclusion rather than a limit of the method — a combination the search could not settle is not a combination that disagreed, and those are counted apart and are not here. So the conclusion is a claim about one way of writing the theory down and not about the theory, unless what breaks it should never have been declared, in which case the declaration was wrong and the class should be narrowed and run again.",
  verbs:["implementation","widen","rescope","keep"],
  find: () => (BOARD.rows || []).filter(r => r.keep && r.forms && r.forms.of &&
      (r.forms.turn || Math.max(0, r.forms.of - r.forms.held - (r.forms.undec || 0))) > 0)
    .map(r => {
      const turn = r.forms.turn ||
        Math.max(0, r.forms.of - r.forms.held - (r.forms.undec || 0));
      return {key:dkey("turned", r.id),
        target:r.text || (r.y + " in " + r.x), members:[], claims:[], papers:[],
        nodeIds:[], linkIds:[],
        detail:`${turn} of the ${r.forms.held + turn} combination${
          r.forms.held + turn === 1 ? "" : "s"} the search could decide turn the other way` +
          (r.forms.undec ? `, with ${r.forms.undec} undecided` : "") +
          ` · ${r.forms.label || r.forms.set || ""}`};
    })},

 {id:"unread", kind:"A finding never read against the declared class", weight:1, from:0,
  why:"It was proved over the declared box, which is a statement about the parameters, and nothing has yet asked whether it survives the declared class of functional forms. Those are two different dimensions and a conclusion can be robust to one and fragile to the other, so a finding standing on the first alone is standing on half of what was declared. <b>Run the set</b> on this step is what answers it. This is the commonest state a board is actually in, and until today nothing on the page said so.",
  verbs:["keep", "rescope", "retire"],
  find: () => (BOARD.rows || []).filter(r => r.keep && r.verdict &&
      r.verdict !== "unsigned" && !(r.forms && r.forms.of))
    .map(r => ({key:dkey("unread", r.id),
      target:r.text || (r.y + " in " + r.x), members:[], claims:[], papers:[],
      nodeIds:[], linkIds:[],
      detail:`${r.verdict}${r.share != null
        ? " over " + (100 * r.share).toFixed(1) + "% of the declared box" : ""} · ` +
        `no form class run against it`}))}
];

const lbl = x => String((x && x.label) || x).replace(/-/g, " ");

// A nomination already answered here, or already settled in passes.tsv, is not
// asked again. The match against the record is deliberately loose — it is a
// prompt to look, not an assertion that the two are the same decision.
function recordedFor(item){
  const ids = [...(item.members || []), item.target || ""];
  return RECORDED.filter(r => ids.some(x =>
    x && (r.t.includes(x) || x.includes(r.t.split(" ")[0]))));
}

/* The settings a decision was taken under. An answer given at one tightness is
   not automatically an answer at another, so it is stored with its context and
   flagged when the context no longer holds. */
function context(){
  return {tight:+state.tight.toFixed(2), minp:state.minp, ap:state.ap,
          outlets:state.jr.size, bar:Object.assign({}, state.bar),
          ev:state.ev, sgn:state.sgn, apply:Object.assign({}, state.apply)};
}
const CTX_OF_STEP = {
  1: ["minp", "ap", "outlets"],
  2: ["tight"],
  3: ["bar", "need", "ev", "sgn", "apply"]
};
function staleness(answered, from){
  if(!answered || !answered.ctx) return null;
  const now = context(), was = answered.ctx;
  const watched = CTX_OF_STEP[from] || [];
  const moved = watched.filter(k => was[k] !== now[k]);
  return moved.length ? moved.map(k => `${k} ${was[k]} \u2192 ${now[k]}`).join(", ") : null;
}

function worklist(v){
  /* Nominations are about the handoff, not about the whole map: an arrow between
     two constructs neither of which was selected is nobody's decision.

     Nor is anything you did yourself. Merging two constructs IS the decision to
     merge them, and deselecting one IS the decision to drop it; the pass reads
     both off the state, so asking you to confirm them was a second validation
     of work already done and recorded. What is left below is the opposite case:
     something a setting or the corpus did that you have not ruled on. */
  const carried = {
    nodes: (v.nodes || []).filter(n => n.carried),
    links: (v.links || []).filter(e => e.carried),
    totalNotions: v.totalNotions, isoCount: v.isoCount
  };
  const out = [];
  for(const nom of NOMINATORS){
    let found = [];
    try{ found = nom.find(carried) || []; }catch(e){ found = []; }
    for(const it of found){
      const answered = decided.get(it.key) || null;
      out.push(Object.assign({}, it, {
        nom, answered,
        stale: staleness(answered, nom.from),
        recorded: recordedFor(it)
      }));
    }
  }
  const seen = new Set();
  return out.filter(x => seen.has(x.key) ? false : (seen.add(x.key), true))
            .sort((a,b) => (a.answered?1:0) - (b.answered?1:0) ||
                           a.nom.weight - b.nom.weight);
}

export { APPROACH_L, CTX_OF_STEP, EV_L, NOMINATORS, STEPOF, context, lbl, noArrowsWhy, papersOfLink, papersOfNode, recordedFor, staleness, worklist };

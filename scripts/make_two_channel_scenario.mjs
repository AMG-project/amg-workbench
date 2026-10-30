/** The two-channel model as a scenario the workbench can open.
 *
 *  The model is in the grammar and was not yet a scenario, so the workbench
 *  could not open it. That stood between here and the second demo scenario,
 *  and between the demo's three returned rows and their becoming derived.
 *  Those three rows -- soft governance substituting
 *  between the channels, principal costs sparing B, agency costs hitting both --
 *  are quoted on the first demo's board from scope.json, with no verdict and no
 *  method, because the bench had nothing to derive them from.
 *
 *  This writes the declarations, and the bench does the rest. A scenario carries
 *  decisions, not results: `snapApply` re-derives the propositions from the kept
 *  arithmetic on load, because "the derivation is a function of the
 *  declarations, so a scenario that carries kept arithmetic and shows nothing
 *  derived yet is telling the reader something false about itself".
 *
 *  WHAT IS DECLARED HERE, and what each declaration is answerable to:
 *
 *    the quantities    one per parameter and per outcome, with the model's own
 *                      name, its kind, and bounds where the model states them.
 *                      An outcome carries no bound: the model's A and B are
 *                      differences in value with no declared range, and holding
 *                      arithmetic to a range nobody declared is the failure this
 *                      bench exists to catch.
 *    the box           every parameter over the range the MODEL declares, which
 *                      is [0, 1] throughout. Narrowing it to where the
 *                      contractibility ceilings do not bind would make more of
 *                      the statics prove, and it would also change what the
 *                      declared classes mean: a family member maps the reader's
 *                      declared range onto [0, 1], so a class on the
 *                      credibility curve with pi in [0, 0.4] is a curve that
 *                      saturates at 0.4, which is not this model's. The box is
 *                      the model's and the verdicts are whatever the bench can
 *                      prove over it. A conclusion carrying the region its sign
 *                      was proved on is the thing this bench is for.
 *    the parameters     six, not eleven. A quantity is a parameter here only if
 *                      some mechanism reads it, because a variable the model
 *                      has and no mechanism touches is a number, and the five
 *                      the mechanisms never read are declared as constants at
 *                      the values the published figures were drawn at. Widening
 *                      one back into a parameter is a declaration a scholar can
 *                      make, and the note on each says so.
 *    the mechanisms    eleven, each a claim from what it reads to what it
 *                      writes, carrying the role the model declares. No sign
 *                      where the model declares none: a role is not a sign, and
 *                      `modulates` and `allocates` fix neither.
 *    the classes       three, on the lines that carry them. `eff`, `sat` and
 *                      `cvx` are each written once and read by several
 *                      mechanisms, which is why this could not be declared
 *                      until a shape class could sit on a shared line.
 *    the arithmetic    the grammar's own 62 lines, verbatim. Nothing is
 *                      rewritten: the term names already are the mechanism
 *                      names, which is what the named-mechanism change in
 *                      mechNames() is for.
 *
 *  Usage:  node scripts/make_two_channel_scenario.mjs
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const ART = join(here, "..");
const read = p => JSON.parse(fs.readFileSync(join(ART, p), "utf8"));
const MODEL = read("models/purpose-two-channel.json");
const META = read("models/purpose-two-channel-meta.json");
const FIRST = read("docs/bench/demo/purpose-x-property-rights.amg.json");
const OUT = join(ART, "docs", "bench", "demo", "purpose-two-channel.amg.json");
const AT = new Date().toISOString().slice(0, 10);

/* The model writes A, B, AVp and Vp; the grammar admits lower case only, so
   `outcome_names` carries the mapping. Inverted here, because a mechanism's
   `writes` is in the model's vocabulary and a claim's end has to be a line. */
const LOWER = Object.fromEntries(
  Object.entries(MODEL.outcome_names).map(([low, up]) => [up, low]));

/* WHICH READ AND WHICH WRITE EACH MECHANISM IS CARRIED BY.

   A mechanism reading four quantities does not assert four claims: it asserts
   one about the quantity it is named for, and the exporter's `proposed()` makes
   the same reduction for the same reason. Two things decide the pair here.

   The READ is chosen so that the six parameters are covered between them --
   a quantity only becomes a model variable by being the end of a carried
   relation, so a parameter no claim names is a name the arithmetic cannot use.
   The WRITE is chosen so that all four outcomes are written: A, B, AVp and Vp
   are what the model is about, and an outcome nothing writes is not an outcome.
   Every pair is one of that mechanism's own reads and one of its own writes,
   and the rest are recorded on the claim so the reduction stays visible. */
const CARRIED = {
  purpose_vulnerability_reduction: ["pi", "avp"],
  commitment_credibility: ["fsi_employees", "vp"],
  decision_cost: ["pi", "vp"],
  principal_competence_cost: ["principal_competence", "a"],
  principal_conflict_cost: ["principal_conflict", "a"],
  agent_conflict_cost: ["agent_conflict", "b"],
  contractibility: ["pi", "b"],
  ai_contractibility_shift: ["alpha", "b"],
  ai_agency_cost_reduction: ["alpha", "vp"],
  principal_cost_incidence: ["pi", "a"],
  agency_cost_incidence: ["pi", "b"],
};
/* Held at the point every published figure was drawn at, because no mechanism
   reads them. The three outside options and two of the three firm-specific
   investments: the model carries them, nothing in it moves them. */
const PINNED = {fsi_shareholders: 0.6, fsi_community: 0.6,
  outside_employees: 0.3, outside_shareholders: 0.3, outside_community: 0.3};

/* What each quantity is, in the page's closed vocabulary. `degree` is "a
   normalised position on a designed scale: how much X is done", which is what
   every one of this model's parameters is; the three fsi_ are stocks, because
   a firm-specific investment is accumulated. */
const KINDS = {
  pi: ["degree"], alpha: ["degree"],
  principal_competence: ["degree"], principal_conflict: ["propensity"],
  agent_conflict: ["propensity"],
  fsi_employees: ["stock"], fsi_shareholders: ["stock"], fsi_community: ["stock"],
  outside_employees: ["degree"], outside_shareholders: ["degree"],
  outside_community: ["degree"],
};
const NAMES = {
  pi: "π purpose integration",
  alpha: "α AI intensity",
  principal_competence: "principal competence",
  principal_conflict: "principal conflict",
  agent_conflict: "agent conflict",
  fsi_employees: "firm-specific investment, employees",
  fsi_shareholders: "firm-specific investment, shareholders",
  fsi_community: "firm-specific investment, community",
  outside_employees: "outside options, employees",
  outside_shareholders: "outside options, shareholders",
  outside_community: "outside options, community",
  a: "A  residual rights channel",
  b: "B  control rights channel",
  avp: "AVp  value appropriated",
  vp: "Vp  value created",
};
/* Every outcome is measured against the firm at pi = 0, which makes it a
   difference and makes "zero at the baseline" a fact about the measure rather
   than a finding. The invariant that reads this is the one that checks it. */
const OUT_KINDS = {a: ["value"], b: ["value"], avp: ["value"], vp: ["value"]};

/* A ROLE IS NOT A SIGN. The model declares what each mechanism does to a
   quantity; only two of the six roles fix the direction of the relation on
   their own, and the page's sign vocabulary has no word for "it moves value
   between channels". Left undeclared where the model declares nothing, which
   the page counts as the widest claim rather than as a missing field. */
const SIGN = {dissipates: "negative", generates: "positive", gates: "conditional",
  transfers: "", allocates: "", modulates: ""};
/* Jaccard and Jacoby's types: a mechanism that changes how much another one
   does is their moderated causal type, and the rest are direct. */
const REL = r => (r === "modulates" ? "moderated" : "direct");

/* ---- the quantities ------------------------------------------------------ */
const params = Object.keys(MODEL.parameters).filter(k => !(k in PINNED));
const outs = ["a", "b", "avp", "vp"];
for(const [id, p] of Object.entries(CARRIED)){
  if(!params.includes(p[0])) throw new Error(`${id} is carried by ${p[0]}, not a parameter`);
  if(!outs.includes(p[1])) throw new Error(`${id} writes ${p[1]}, not an outcome`);
}
for(const k of params)
  if(!Object.values(CARRIED).some(p => p[0] === k))
    throw new Error(`no mechanism carries ${k}, so the arithmetic cannot read it`);
for(const o of outs)
  if(!Object.values(CARRIED).some(p => p[1] === o))
    throw new Error(`nothing writes ${o}, so it would not be an outcome`);

const mcon = [...params, ...outs].map(id => ({
  id, name: NAMES[id] || id,
  def: outs.includes(id)
    ? "An outcome of the two-channel model, measured against the same firm at " +
      "pi = 0. Declared by this scenario rather than carried from the corpus."
    : "A parameter of the two-channel model. Declared by this scenario rather " +
      "than carried from the corpus.",
  at: AT,
}));

const vtype = [
  ...params.map(id => {
    const b = MODEL.parameters[id];
    return {id, name: id, kinds: KINDS[id] || ["degree"], aspects: [],
      lo: b[0], hi: b[1], at: AT, bset: true};
  }),
  /* bset false, and that is the declaration: nobody stated a range for a
     difference in value, so `within_bounds` has to skip rather than hold the
     arithmetic to this page's default of 0 to 1. */
  ...outs.map(id => ({id, name: id, kinds: OUT_KINDS[id], aspects: ["difference"],
    lo: null, hi: null, at: AT, bset: false})),
];

/* ---- the mechanisms, as claims ------------------------------------------- */
const mclm = META.mechanisms.map(m => {
  const pair = CARRIED[m.id];
  if(!pair) throw new Error(`${m.id} has no carried pair`);
  const [from, to] = pair;
  if(!m.reads.includes(from))
    throw new Error(`${m.id} does not read ${from}`);
  if(!m.writes.map(w => LOWER[w]).includes(to))
    throw new Error(`${m.id} does not write ${to}`);
  return {id: "xk_" + m.id, from, to,
    g: SIGN[m.role] ?? "", sh: "", def: m.says, name: m.id, at: AT};
});
for(const m of mclm){
  if(!mcon.some(c => c.id === m.from))
    throw new Error(`${m.name} reads ${m.from}, which is not a declared quantity`);
}

/* A claim's own declarations: what kind of relationship it is, what the
   mechanism does, and the shape class. The class is empty on every mechanism
   here BECAUSE the three this model declares are not on mechanism terms: they
   are on the three lines several mechanisms read, which is what `famShared`
   finds. Declaring a shape on the term as well would be declaring it twice. */
const spec = mclm.map(m => {
  const mech = META.mechanisms.find(x => x.id === m.name);
  return ["mx:" + m.id, {rel: REL(mech.role), roles: [mech.role], props: [],
    lo: 0, hi: 1, elo: null, ehi: null,
    note: `Reads ${mech.reads.join(", ")} and writes ${mech.writes.join(", ")}. ` +
      `Carried by ${m.from} \u2192 ${m.to}: a mechanism asserts one claim, about the ` +
      `quantity it is named for, and the rest of what it touches is here rather ` +
      `than split into claims nobody makes.`,
    at: AT}];
});

/* How the mechanisms writing one outcome combine. Additive throughout, and
   that is the model's own arithmetic rather than this page's default: every
   outcome below is a sum of terms. */
const compo = outs.map(id => ({id, rules: ["additive"], at: AT}));

/* ---- the arithmetic ------------------------------------------------------ */
const MECH_IDS = new Set(META.mechanisms.map(m => m.id));
/* Which line carries which declared class. The slot names are the model's
   (`credibility`, `saturating`, `convex_cost`); the lines are where they are
   written. The two lines that write the same shapes at pi = 0 carry no class,
   and do not need one: every member of every family has f(0)=0, so eff_0 and
   sat_0 are zero whichever member is chosen. tests assert that. */
const CLASS_LINE = {eff: "credibility", sat: "saturating", cvx: "convex_cost"};

const lines = [];
for(const raw of MODEL.lines){
  const t = String(raw).replace(/#.*$/, "").trim();
  if(!t) continue;
  const m = /^([a-z][a-z0-9_]*)\s*=\s*(.+)$/.exec(t);
  if(!m) throw new Error("not an assignment: " + raw);
  const lhs = m[1], rhs = m[2].trim();
  const mech = lhs.startsWith("t_") && MECH_IDS.has(lhs.slice(2)) ? lhs.slice(2) : "";
  const slot = CLASS_LINE[lhs];
  const ln = {lhs, py: rhs,
    kind: mech ? "term" : outs.includes(lhs) ? "out" : "local",
    why: mech ? (META.mechanisms.find(x => x.id === mech) || {}).says || "" : "",
    mech};
  if(slot){
    ln.family = MODEL.classes[slot].family;
    ln.member = MODEL.classes[slot].member;
    ln.why = `The ${slot} class, written once and read by every mechanism that ` +
      `needs it. Declared as the ${ln.member} member of the ${ln.family} family.`;
  }
  lines.push(ln);
}
const terms = lines.filter(l => l.kind === "term").length;
if(terms !== META.mechanisms.length)
  throw new Error(`${terms} term lines for ${META.mechanisms.length} mechanisms`);
for(const id of outs)
  if(!lines.some(l => l.lhs === id && l.kind === "out"))
    throw new Error(`no line writes the outcome ${id}`);

const consts = Object.entries({...MODEL.constants, ...PINNED}).map(([name, value]) => ({
  name, value, lo: null, hi: null,
  why: name.startsWith("w_") ? "The stakeholder's weight in the firm's value."
    : name.startsWith("ceil_") ? "How much of what this stakeholder is owed can be " +
      "specified in advance at all, whatever the technology."
    : name.startsWith("chi_") ? "Contractibility: its intercept, and what purpose " +
      "integration and AI intensity each add to it."
    : name in PINNED ? "A parameter of the model that no mechanism reads, held at " +
      "the value every published figure was drawn at. Declaring it a parameter " +
      "again is a decision, and it needs a mechanism that reads it."
    : "",
}));

const arith = {
  consts, hand: true, lines, miss: [], checks: [],
  note: "The two-channel model, in the grammar, as scripts/" +
    "make_two_channel_scenario.mjs writes it from models/purpose-two-channel.json. " +
    "Every line is the model's own: four places where the port diverges from the " +
    "Python it came from are commented in that file, each because a term can be " +
    "switched off and a factor cannot. Three lines carry a declared shape class " +
    "and are read by several mechanisms each, so switching one mechanism off " +
    "leaves the shared curve alone, which is what keeps the ablation about the " +
    "mechanism.",
  /* EMPTY ON PURPOSE. The signature is over the declarations as the page reads
     them, and this file is written outside the page, so a signature invented
     here would be a claim that the arithmetic matches declarations it has
     never been read against. Empty reads as "not stale", which is true: the
     page computes one the first time it keeps a body. */
  sig: "",
  /* And nothing is claimed about the invariants until the page has run them.
     A tally written by the generator would be exactly the thing this bench
     refuses everywhere else: a result nobody produced. */
  run: null,
  at: AT,
};

/* ---- the literature behind it -------------------------------------------
   The two-channel model cannot be built in the void. It is backed on the
   same purpose literature, and what it ADDS is said explicitly as a declared
   construct rather than left implicit.

   He is right, and the fix was cheaper than it looked, because the vocabulary
   this model is about is already in the corpus. Stoelhorst and Vishwanathan
   (2024) is paper 022 of the 52, and the extraction carried their four
   vulnerabilities and both of their rights allocations, with both design
   principles as claims. What was missing is that this scenario pointed at none
   of it: `msel`, `groups` and `dropped` were empty and step 1 said the
   literature was scoped to nothing.

   THE SIX CONSTRUCTS THIS MODEL NEEDS ARE CARRIED BY ONE PAPER EACH, so at the
   threshold of two they are out of scope. The threshold is not moved for them:
   lowering it to one would admit 660 constructs to carry six, and a global
   loosening is a worse declaration than a named exception. They are ADMITTED BY
   NAME instead, which is what `admit` is for and what step 1.1 calls out: "the
   threshold is a convenience for finding what a literature argues about and
   never a judgement".

   WHAT IS STILL NOT IN THE CORPUS, and is therefore declared rather than read:
   the four control costs, which come from a second literature joined at step
   2.1; the fixed-residual margin, reconstructed from what Stoelhorst and
   Vishwanathan distinguish without quantifying; and AI intensity, which no
   paper in either literature carries at all. Each quantity below says which of
   the four it is, in its own definition, so a reader of the file can tell a
   reading off the sources from an addition of this model's own. ----------- */
const GD = (() => {
  const src = fs.readFileSync(join(ART, "docs", "bench", "graph-data.js"), "utf8");
  const one = src.slice(0, src.indexOf("\n"));
  return JSON.parse(one.slice(one.indexOf("{"), one.lastIndexOf("}") + 1));
})();
const NODE = new Map(GD.nodes.map(n => [n.i, n]));
const STREAM = read("docs/bench/demo/governance-control-costs.amg-stream.json");

/* The constructs this model reads, and nothing else. Each is checked against
   the payload rather than trusted: a scenario naming a construct the corpus
   dropped would curate a literature that no longer says what it says. */
/* ONLY WHAT THE MODEL'S OWN QUANTITIES BIND TO. Firm accounting performance
   and perceived work meaningfulness were on this list for a morning and had to
   come off: carrying a construct that several carried claims point at makes it
   an OUTCOME of the model, and this model does not write either of them. They
   are the first demonstration's outcomes. A carried construct is a claim about
   what the model is about, so carrying one the arithmetic never mentions is
   not generosity, it is a model saying it explains something it does not. */
const CARRY = [
  "purpose-integration-work", "costly-public-purpose-commitment",
  "stated-purpose-commitment", "purpose-clarity-factor",
  "purpose-directional-clarity", "purpose-blueprints-for-credible-commitments",
  "purpose-clarity-and-credibility", "firm-specific-investment",
  "shirking-vulnerability", "holdup-vulnerability", "market-power-vulnerability",
  "externality-vulnerability", "firm-vulnerability-to-stakeholder-opportunism",
  "control-rights-allocation", "residual-claim-rights-allocation",
];
for(const id of CARRY)
  if(!NODE.has(id)) throw new Error(`the corpus has no construct ${id}`);

const OUTLETS = GD.journals.map(j => j.f);
/* In scope at the threshold this scenario keeps, which is the shipped default.
   Everything in scope and not carried is dropped by hand, which is what step
   1.2 is: a selection, recorded as what was set aside. */
const MINP = 2;
const ADMIT = CARRY.filter(id => NODE.get(id).n < MINP);
/* EVERY CONSTRUCT THIS MODEL DOES NOT READ, not only the ones in scope at the
   threshold. Dropping the in-scope ones alone left two constructs standing
   whose papers the page counts differently from a raw count of `n`, and they
   arrived as relations wanting terms this model does not have. A selection
   that depends on agreeing with the page about what is in scope is a selection
   with a hole in it. */
const DROP = GD.nodes.filter(n => !CARRY.includes(n.i)).map(n => n.i).sort();

/* AND NO RELATION THE LITERATURE ASSERTS IS CARRIED INTO THE ARITHMETIC, which
   is a declaration and the sharpest one in this scenario. The purpose corpus
   asserts a direct arrow from purpose clarity to accounting performance nine
   times over seven papers, five of them positive and four conditional. This
   model does not take it: it reads the constructs and derives the relation
   through credibility, vulnerability and the two channels. A literature's own
   arrows are what a model like this is meant to explain, so assuming them
   would be assuming the conclusion. They stay in the literature, reported at
   step 1.3, and each is dropped by hand with this as the reason. */
const DROP_CLAIMS = () => KEPT_CLAIMS.map(c => c.id).sort();

/* THE MERGES, each a decision that two names are one quantity. The four
   vulnerabilities are the one worth arguing with: Stoelhorst and Vishwanathan
   cross them on two dimensions and keep them apart on purpose, and merging
   them into one exposure is this model's reduction, not theirs. It is declared
   here so that a reader can refuse it. */
const GROUPS = [
  {id: "tc-purpose", name: "Purpose integration",
   color: "#5f8f6a",
   members: ["purpose-integration-work", "costly-public-purpose-commitment",
     "stated-purpose-commitment"],
   why: "Three names for how much of a purpose is carried into what the firm " +
     "actually does, as against stated. The model's pi."},
  {id: "tc-clarity", name: "Purpose clarity and credibility",
   color: "#8a7fb5",
   members: ["purpose-clarity-factor", "purpose-directional-clarity",
     "purpose-blueprints-for-credible-commitments", "purpose-clarity-and-credibility"],
   why: "What stakeholders can tell about a purpose, and whether they believe " +
     "it. The model's credibility curve reads this."},
  {id: "tc-vuln", name: "Stakeholder vulnerability to opportunism",
   color: "#b5793f",
   members: ["shirking-vulnerability", "holdup-vulnerability",
     "market-power-vulnerability", "externality-vulnerability",
     "firm-vulnerability-to-stakeholder-opportunism"],
   why: "Stoelhorst and Vishwanathan cross four vulnerabilities on information " +
     "and bargaining power, inside and outside the team, and keep them apart " +
     "deliberately. This model needs one exposure, so they are merged, and the " +
     "merge is the reduction a reader is most likely to refuse."},
];
for(const g of GROUPS) for(const m of g.members)
  if(!CARRY.includes(m)) throw new Error(`${g.id} merges ${m}, which is not carried`);

/* THE JOIN, at step 2.1. Each of these has members from both literatures,
   which is what makes it the join rather than a merge inside one: the purpose
   corpus carries what Stoelhorst and Vishwanathan STATE about rights, and the
   second literature carries what Goshen and Squire state about what control
   costs, plus the margin neither of them quantifies. */
const JOINS = [
  {id: "tc-control-channel", name: "Control rights channel  (B)",
   color: "#4f7fa8",
   members: ["control-rights-allocation", "control-rights-delegation",
     "fixed-control-rights-share"],
   why: "The model's B. What a stakeholder holds as a right to decide, how " +
     "much of it is delegated, and how much of what they are owed could be " +
     "written down in advance at all."},
  {id: "tc-residual-channel", name: "Residual rights channel  (A)",
   color: "#a8574f",
   members: ["residual-claim-rights-allocation", "residual-claim-vs-control-locus"],
   why: "The model's A. Rights to what is left after fixed claims are settled, " +
     "and where ownership is located when it is located there."},
];
const SIDE = new Map([...CARRY.map(id => [id, "purpose"]),
  ...STREAM.constructs.map(c => [c.id, "governance"])]);
for(const g of JOINS){
  const sides = new Set(g.members.map(m => SIDE.get(m)));
  if(sides.has(undefined)) throw new Error(`${g.id} joins a construct neither literature carries`);
  if(sides.size < 2) throw new Error(`${g.id} is a merge inside one literature, not a join`);
}

/* The claims the carried constructs leave standing, counted rather than
   asserted: the handoff line on step 1.3 reports this and a number written
   here would be a second answer to the same question. */
const KEPT_CLAIMS = GD.claims.filter(c =>
  c.a.every(x => CARRY.includes(x)) && c.c.every(x => CARRY.includes(x)));

/* Where each of the model's quantities comes from. The page draws `def`, so
   this is where a reader meets the distinction. */
const FROM = {
  pi: ["corpus", ["purpose-integration-work", "costly-public-purpose-commitment",
    "stated-purpose-commitment"]],
  alpha: ["none", []],
  fsi_employees: ["corpus", ["firm-specific-investment"]],
  principal_competence: ["stream", ["principal-competence-cost"]],
  principal_conflict: ["stream", ["principal-conflict-cost"]],
  agent_conflict: ["stream", ["agent-conflict-cost"]],
  a: ["join", ["residual-claim-rights-allocation", "residual-claim-vs-control-locus"]],
  b: ["join", ["control-rights-allocation", "control-rights-delegation",
    "fixed-control-rights-share"]],
  avp: ["none", []],
  vp: ["none", []],
};
const papersOf = ids => [...new Set(ids.flatMap(id =>
  (NODE.get(id) || {}).p || (STREAM.constructs.find(c => c.id === id) || {}).papers || []))];
function provenance(id){
  const [kind, ids] = FROM[id] || ["none", []];
  const names = ids.map(x => `\`${x}\``).join(", ");
  if(kind === "corpus")
    return `Read off the purpose literature: ${names}, carried by ` +
      `${papersOf(ids).length} paper(s) and merged at step 1.2.`;
  if(kind === "stream")
    return `Read off the second literature joined at step 2.1: ${names}, from ` +
      `Goshen and Squire (2017). No paper in the purpose corpus carries it.`;
  if(kind === "join")
    return `Joined at step 2.1 across both literatures: ${names}. The purpose ` +
      `corpus carries what Stoelhorst and Vishwanathan state about rights; the ` +
      `margin between fixed and residual is reconstructed and says so.`;
  return `DECLARED BY THIS MODEL, and carried by no paper in either literature. ` +
    `Nothing was read off the sources for it, which is the honest state and not ` +
    `a gap in the curation.`;
}

/* AND ONTO EVERY QUANTITY. Written here rather than where mcon is built,
   because the provenance needs the payload and the payload is read above. */
for(const c of mcon)
  c.def = (outs.includes(c.id)
    ? "An outcome of the two-channel model, measured against the same firm at pi = 0. "
    : "A parameter of the two-channel model. ") + provenance(c.id);

/* ---- the scenario -------------------------------------------------------- */
const scen = {
  format: "amg-scenario", v: 1,
  bench: FIRST.bench, corpus: FIRST.corpus,
  at: new Date().toISOString(),
  name: "Purpose, two channels",
  snap: {
    /* Opens on step 1.1, which is now a step that has something to show:
       a scenario that curates no literature and opens on the model gives a
       reader a closed model and no account of where any of it came from. */
    stage: 1,
    /* THE SAME LITERATURE AS THE FIRST DEMONSTRATION, at the same threshold,
       with the six constructs this model needs admitted by name because one
       paper each carries them. Everything in scope and not carried is dropped,
       which is what step 1.2 is. */
    jr: OUTLETS, ap: "all", minp: MINP, admit: ADMIT, tight: 0.15,
    mcon, mclm, vtype, compo, spec, arith,
    xinv: [], xtest: [], xfam: [], msel: [], comp: [],
    groups: GROUPS.map(g => ({id: g.id, name: g.name, color: g.color,
      members: g.members.slice()})),
    dropped: {c: DROP, k: DROP_CLAIMS()}, apart: [], decided: [],
    /* THE SECOND LITERATURE, and the join. Each is curated on its own terms:
       the purpose corpus at a threshold of two, the governance papers at one,
       because a two-paper literature in which most constructs appear once has
       nothing to find at two. Both declarations travel with the literature
       they are about. */
    lits: {
      at: "purpose",
      join: {a: "purpose", b: "governance"},
      joins: {
        groups: JOINS.map(g => ({id: g.id, name: g.name, color: g.color,
          members: g.members.slice()})),
        apart: [],
      },
      union: false,
      /* THE PURPOSE LITERATURE'S OWN DECISIONS, and not only the page's top
         level copy of them. Taking a literature installs its block-1 record,
         so a scenario that names two literatures and leaves the shipped one's
         record empty hands the page nothing to install and leaves whatever the
         browser had: on a fresh browser that is the seeded demo curation, and
         the model then reads constructs this scenario never carried. */
      main: {add: null, dec: {jr: OUTLETS, ap: "all", minp: MINP, admit: ADMIT,
        tight: 0.15, collapse: false,
        bar: {Comm: 0, Spec: 0, Evid: 0},
        need: {Comm: {}, Spec: {}, Evid: {}},
        apply: {Comm: "dim", Spec: "dim", Evid: "dim"},
        ev: "all", sgn: "all", core: false, hideIso: false,
        groups: GROUPS.map(g => ({id: g.id, name: g.name, color: g.color,
          members: g.members.slice()})),
        dropped: {c: DROP, k: DROP_CLAIMS()}, apart: []}},
      list: [{
        id: "governance",
        name: STREAM.name,
        base: STREAM,
        dec: {jr: ["Columbia Law Review", "Journal of Management and Governance"],
          ap: "all", minp: 1, admit: [], tight: 0.15, collapse: false,
          bar: {Comm: 0, Spec: 0, Evid: 0},
          need: {Comm: {}, Spec: {}, Evid: {}},
          apply: {Comm: "dim", Spec: "dim", Evid: "dim"},
          ev: "all", sgn: "all", core: false, hideIso: false,
          groups: [],
          /* AND ITS ARROWS ARE NOT CARRIED EITHER, for the reason the purpose
             literature's are not: this model declares its own mechanisms over
             the constructs both literatures supply, and takes no relation from
             either as a term. Goshen and Squire's four control costs and their
             sum are the vocabulary; how they trade against each other is what
             the model's arithmetic says and what the derivation is about. */
          dropped: {c: [], k: STREAM.claims.map(c => c.id).sort()}, apart: []},
        at: AT,
      }],
    },
    board: {rows: [], seq: 0}, guess: {}, sim: null,
    exp: {set: "all", n: 24, seed: 7, pick: {}, why: "", name: ""},
    folders: [],
  },
  provenance: [], rounds: [],
  /* WHAT WAS DECIDED, IN ORDER, and who decided it. Every row here is a
     judgement somebody has to answer for, which is why the threshold exception
     and the four-way merge are separate entries rather than one line about the
     curation. */
  log: [
    {n: 1, kind: "scope", text: "The literature, scoped",
      detail: `${OUTLETS.length} outlets, every tradition, a threshold of ` +
        `${MINP} papers. ${ADMIT.length} construct(s) admitted by name below it, ` +
        `because one paper each carries them and this model is about them: ` +
        `${ADMIT.join(", ")}`,
      at: new Date().toISOString().slice(11, 16), stage: 1},
    {n: 2, kind: "select", text: "The constructs, selected",
      detail: `${CARRY.length} carried, ${DROP.length} in scope and set aside, ` +
        `${GROUPS.length} merges. The merge of ${GROUPS[2].members.length} ` +
        `vulnerabilities into one exposure is this model's reduction and not the ` +
        `paper's`,
      at: new Date().toISOString().slice(11, 16), stage: 2},
    {n: 3, kind: "carry", text: "The relationships, weighed",
      detail: `${KEPT_CLAIMS.length} claims stand between the carried ` +
        `constructs, from ${new Set(KEPT_CLAIMS.map(c => c.p)).size} papers. No ` +
        `bar is raised: this literature is read for what it states and the ` +
        `scoring is reported rather than used to drop anything`,
      at: new Date().toISOString().slice(11, 16), stage: 3},
    {n: 4, kind: "pass", text: "A second literature, joined",
      detail: `${STREAM.papers.length} papers, ${STREAM.constructs.length} ` +
        `constructs, ${STREAM.claims.length} claims, scoped at a threshold of ` +
        `one on its own terms. ${JOINS.length} joins, each with members from ` +
        `both sides`,
      at: new Date().toISOString().slice(11, 16), stage: 4},
    {n: 5, kind: "arith", text: "The model, declared",
      detail: `${lines.length} lines, ${terms} mechanisms, three declared classes, ` +
        `${params.length} parameters over the ranges the model declares. ` +
        `${Object.values(FROM).filter(f => f[0] === "none").length} of ` +
        `${Object.keys(FROM).length} quantities are carried by no paper in ` +
        `either literature and say so`,
      at: new Date().toISOString().slice(11, 16), stage: 5},
  ],
};

fs.writeFileSync(OUT, JSON.stringify(scen, null, 1) + "\n");
console.log(`${OUT.slice(OUT.indexOf("docs/"))}: ${CARRY.length} constructs carried of ` +
  `${GD.nodes.length} (${ADMIT.length} admitted below the threshold, ${DROP.length} set ` +
  `aside), ${KEPT_CLAIMS.length} claims, ${GROUPS.length} merges, ${JOINS.length} joins ` +
  `with a second literature of ${STREAM.papers.length} papers`);
console.log(`${OUT.slice(OUT.indexOf("docs/"))}: ${lines.length} lines (${terms} terms, ` +
  `${lines.filter(l => l.kind === "out").length} outcomes, ` +
  `${lines.filter(l => l.family).length} with a declared class), ` +
  `${mcon.length} quantities, ${mclm.length} mechanisms, ` +
  `${consts.length} constants · ${Math.round(JSON.stringify(scen).length / 1024)} KB`);

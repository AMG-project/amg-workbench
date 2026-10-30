/* AMG bench, page script 9 of 22: asking an LLM: the seven prompts and the tree rendering.
   One shared global scope, loaded in order. See page/README.md. */
import { alcg, asamples, asweep, checkArith, runAt } from "../core/invariants.js";
import { renderInsp } from "./13-map.js";
import { COM } from "./22-communities.js";
import { ATOL, afin, amono, apeak } from "../core/curve.js";
import { COMPRULES, compWrite } from "../core/compose.js";
import { hesc } from "../core/safe.js";
import { SAXES, SCORE } from "../core/rank.js";
import { ANAME, ANARY, NUM, OP, PREC, evalRPN, flatProd, flatSum, isN, negOf, readExpr, rpnTree, same, simp } from "../core/kernel.js";
import { EXP, expTake } from "../core/expset.js";
import { SIM, SIMSTEP, simTake, simTakeGroups } from "../core/similarity.js";
import { ASPECTS, KINDS, ROLES, handName, rulesOf, vtype } from "./03b-decisions.js";
import { G } from "../graph-data.js";
import { N, lsDrop, lsRead, lsWrite, pap } from "./03-stores.js";
import { BOARD, PASSPROPS, guideBrief, passBrief, passGaps, xlog } from "./05-explore.js";
import { runScorer, xtest } from "./09-derive.js";
import { XJOINA, carriedRelations, carriedVars, propsOf, rolesOf, vAspects, vKinds, xdefn, xspace, xstreams, xwordScore } from "./07-grouping.js";
import { arithBrief, arithFail, formRows, keptBrief, mechNames, outcomeVars, substituteSets, varName } from "./11-classes.js";
import { expSave, expSlotsNow } from "./20-expset.js";
import { famsFor, famsOf, formExpr } from "./10-depends.js";
import { inScope } from "./03c-corpus.js";
import { provTake } from "./17-scenarios.js";
import { refresh } from "./14-boot.js";
import { renderPanel } from "./06-wiring.js";
import { simForget, simSave, simShortlist } from "./03d-similarity.js";
/* ------------------------------------------------- asking an LLM, on step 3.1

   The one place in the bench where something is proposed rather than counted,
   and the rule from the proposal's own section 5.1 governs it: the LLM
   proposes, the model disposes. Nothing here is ever applied on its own. A
   proposal arrives labelled, with its reason, and is accepted by a click or
   dismissed -- because the value of a hallucination is that it faces an
   execution test the thing that produced it does not control, and that is only
   true if a human put it in front of the test deliberately.

   The viewer's own account pays and consent is asked once, which is why this
   runs on a click and never on load. Where the capability is absent -- a reader
   who has not granted it, a page opened outside claude.ai -- the buttons are
   not drawn and the step works exactly as it did. */
/* THE READINGS, by finding id. Not stored in the browser and not in the
   scenario by itself: a reading accepted onto a row becomes that row's note,
   which is where it travels. What is here is the proposal. */
const READ = {out:[], outside:0, at:""};
const AI = {cap:undefined, via:"", busy:"", err:"", raw:"", at:"", comp:[], cond:[], roles:[],
  outside:0, rule:null};
/* What went wrong, where it was asked. AI.err has been set on every failure
   path since the first prompt and NOTHING EVER SHOWED IT: a refusal, a rate
   limit or an answer in prose left the button going back to its label and the
   page saying nothing at all. Which is the worst possible behaviour on a first
   live call, because it is indistinguishable from the feature not existing. */
function aiErrHTML(what){
  if(AI.at !== what || !AI.err) return "";
  return `<p class="why" style="color:var(--neg)"><b>The ask came back empty.</b> ${
    hesc(AI.err)}${AI.raw ? ` It began: <code>${hesc(AI.raw.slice(0, 240))}</code>` : ""} —
    asking again is safe, and nothing on this page changed.</p>`;
}
/* The host's model, whichever it is.

   `window.claude.use("sample")` is the mechanism this host offers and the only
   one wired, so on claude.ai the answer comes from Claude. The interface says
   "an LLM" rather than naming it, and that is not a euphemism: the capability
   promises no model id -- which is why `provTake` keeps the field present and
   empty rather than guessing -- and nothing after this point depends on which
   model answered. The proposal is parsed against the declared ids and the
   closed vocabularies, what falls outside is counted rather than written, and
   the same parser takes a line typed by hand or pasted back from Mathematica.

   That is the whole of the accessibility argument the call asks for. A model
   that cannot be reached cannot be checked; a model whose answers are all
   checked anyway can be swapped for one that can. */
/* A KEY OF YOUR OWN, AND ONLY WHERE THERE IS NO OTHER WAY.
   ==========================================================================

   Published as an artifact on claude.ai, the host answers
   window.claude.use("sample") and there is nothing to set up: that path is
   tried first and a key is neither asked for nor used. Everywhere else --
   a clone served from a static host, a file opened locally, a fork somebody
   else is running -- the host answers nothing, and until now that meant the
   twelve asks simply were not there. Which is the accessibility gate the
   call itself sets: infrastructure other researchers cannot reach is
   infrastructure they cannot check.

   WHERE THE KEY LIVES. In this browser, under one localStorage key of its
   own, and nowhere else. It is NOT in `state`, so it is not in the scenario,
   not in any export, and not in the decision record -- which records the
   prompt and the answer of every ask and never the credential behind it.
   It is sent to api.anthropic.com and to nothing else. Removing it is one
   button and takes effect at once.

   The direct-browser header is required: without it the browser's preflight
   is refused, by design, so that a key cannot be put in a page by accident. */
const AKEY = "amg.apikey";
const keyGet = () => String(lsRead(AKEY) || "");
const keyHas = () => !!keyGet();
function keySet(k){
  k = String(k || "").trim();
  if(k) lsWrite(AKEY, k); else lsDrop(AKEY);
  AI.cap = undefined; AI.via = "";     // resolved again on the next render
  return keyHas();
}

/* The first JSON object in a reply. A model asked for JSON mostly returns
   JSON, and sometimes returns it inside a fence or after a sentence; the
   host capability does this unwrapping and a key-backed one has to do it
   too, or every ask would fail on a well-formed answer. */
function firstJSON(t){
  t = String(t || "");
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  if(fence) t = fence[1];
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if(i < 0 || j <= i) throw new Error("the answer carried no JSON object");
  return JSON.parse(t.slice(i, j + 1));
}

/* THE SAME TWO FUNCTIONS the host capability offers, so nothing downstream
   can tell which one answered -- which is the property that makes the model
   replaceable rather than merely unnamed. */
const AMODEL = "claude-sonnet-5-5";
function keyCap(){
  return {
    json: async (q, opts) => {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "content-type":"application/json",
          "x-api-key":keyGet(),
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({model:AMODEL, max_tokens:8000,
          messages:[{role:"user", content:String(q)}]}),
        signal:(opts && opts.signal) || undefined,
      });
      if(!r.ok){
        let why = "";
        try{ const e = await r.json(); why = (e && e.error && e.error.message) || ""; }catch(x){}
        /* The status is the actionable part and the key is never in it. */
        throw new Error(r.status === 401 ? "the key was refused (401)"
          : r.status === 429 ? "rate limited (429) \u2014 wait and ask again"
          : `the API answered ${r.status}${why ? ": " + why : ""}`);
      }
      const o = await r.json();
      const text = (o.content || []).filter(c => c.type === "text")
        .map(c => c.text).join("");
      return firstJSON(text);
    },
    limits: async () => ({images:false}),
  };
}

/* THE HOST FIRST, ALWAYS. A key is the fallback and never the preference:
   on claude.ai the host answers and the key is not read at all. */
async function aiCap(){
  if(AI.cap !== undefined) return AI.cap;
  let host = null;
  try{ host = await (window.claude && window.claude.use
    ? window.claude.use("sample") : null); }catch(e){ host = null; }
  if(host){ AI.cap = host; AI.via = "host"; }
  else if(keyHas()){ AI.cap = keyCap(); AI.via = "key"; }
  else { AI.cap = null; AI.via = ""; }
  return AI.cap;
}
// what the model is, in the bench's own vocabulary, small enough to send
function aiBrief(){
  const rels = carriedRelations(), nm = mechNames(rels);
  const outs = outcomeVars();
  const L = [];
  for(const k of outs){
    L.push(`OUTCOME ${varName(k)} ("${handName(k)}")` +
      (vKinds(k).length ? ` kind=${vKinds(k).join("|")}` : "") +
      (vAspects(k).length ? ` aspect=${vAspects(k).join("|")}` : ""));
    for(const r of rels.filter(x => x.to === k))
      L.push(`  <- ${varName(r.from)} ("${handName(r.from)}")` +
        ` role=${rolesOf(r).join("|") || "undeclared"}` +
        ` shape=${propsOf(r).join("+") || "unconstrained"}` +
        ` evidence=${r.papers ? r.papers + " papers" : r.src}`);
  }
  const plain = carriedVars().filter(k => !outs.includes(k));
  if(plain.length) L.push(`PARAMETERS (nothing writes these): ${
    plain.map(varName).slice(0, 40).join(", ")}`);
  return L.join("\n").slice(0, 14000);
}

/* THE VOCABULARIES A PAPER IS READ INTO. Taken from what the corpus itself
   uses, so a paper added here is comparable with the fifty-two that were
   extracted rather than sitting in a vocabulary of its own. Anything outside
   them is counted and refused by name, like every other proposal. */
const PVOC = {
  level:  ["firm", "individual", "field", "team"],
  scale:  ["ordinal", "ratio", "binary", "interval", "nominal"],
  flow:   ["s", "f"],
  sign:   ["positive", "negative", "none", "conditional", "categorical", "inverted-U"],
  evid:   ["asserted", "reported", "derived", "estimated"],
  kind:   ["theory", "qualitative", "quantitative", "review", "formal"],
  tradition: ["st", "ex", "dm", "--"],
};

const AIQ = {
  /* READING A PAPER INTO THE CORPUS'S OWN SHAPE.
     -----------------------------------------------------------------------
     The extraction that built the shipped corpus ran offline over full
     texts; this is the same job asked of one paper at a time, in the
     browser, from whatever the scholar could give it -- a PDF's text, a
     DOI's metadata, or words pasted in.

     The prompt is strict about three things, because they are what make an
     added paper usable rather than merely present: every construct carries
     the seven fields a node has, every claim names its ends by construct id,
     and the scope sentence is the PAPER'S OWN words or the word unstated.
     It is told to invent nothing it was not given, and that a short input
     yields few claims rather than confident ones. */
  paper: (meta, text) => `You are reading one paper into a curated corpus of management research
on corporate purpose, so that its constructs and claims can be compared with fifty-two
papers already in it. Return JSON and nothing else.

WHAT YOU HAVE BEEN GIVEN
${meta.doi ? "DOI: " + meta.doi + "\n" : ""}${meta.title ? "Title: " + meta.title + "\n" : ""}${
meta.authors ? "Authors: " + meta.authors + "\n" : ""}${meta.year ? "Year: " + meta.year + "\n" : ""}${
meta.journal ? "Journal: " + meta.journal + "\n" : ""}${meta.url ? "URL: " + meta.url + "\n" : ""}
TEXT (${text.length} characters; this may be an abstract, a part of the paper, or the whole of it):
${text.slice(0, 60000)}

WHAT TO RETURN
{"paper": {"a": "first author's surname", "y": "YYYY", "j": "short journal abbreviation",
           "jf": "the journal's full name", "ti": "the title", "d": "the DOI or \"\"",
           "t": one of ${JSON.stringify(PVOC.kind)},
           "ap": one of ${JSON.stringify(PVOC.tradition)} —
                 st if the paper treats purpose as what a firm DECLARES,
                 ex if as what members FEEL, dm if as what GUIDES CHOICES,
                 "--" if it does none of those},
 "constructs": [{"i": "a-lower-case-hyphenated-id", "n": "the construct in plain words",
                 "l": one of ${JSON.stringify(PVOC.level)},
                 "s": one of ${JSON.stringify(PVOC.scale)},
                 "f": "s" for a stock (an accumulated level) or "f" for a flow (a rate),
                 "b": "who or what bears it, in two or three words",
                 "d": "the paper's own definition, or your summary of how it uses the term"}],
 "claims": [{"a": ["construct id"], "c": ["construct id"], "g": one of ${JSON.stringify(PVOC.sign)},
             "e": one of ${JSON.stringify(PVOC.evid)},
             "t": "the claim in one sentence, as the paper makes it",
             "sc": "the population, setting or period the paper STATED this holds for, in its own words — or exactly: unstated"}]}

RULES
1. Every id in a claim's "a" or "c" must be an id you listed under "constructs". A claim
   naming anything else is dropped before the scholar sees it.
2. "e" is how the paper came to the claim, not how sure it is: asserted = argued,
   reported = cited from elsewhere, derived = followed from a model, estimated = measured.
3. "sc" is the paper's own restriction, quoted or closely paraphrased. If the paper states
   none, the value is the single word unstated. Do not invent one, and do not write "N/A".
4. Return only what this text supports. Two claims read from an abstract is a correct
   answer; twelve invented from a title is not.
5. No commentary, no markdown fence. JSON only.`,
  /* A CLASSIFICATION OF A LITERATURE, READ OUT OF A PAPER THAT PROPOSES ONE.
     Two asks and not one, deliberately. The first reads the scheme; the second
     applies it to this corpus. Keeping them apart is what makes the scheme
     inspectable before fifty-two papers are sorted by it -- and it means a
     reader who disagrees with the reading can stop after the first. */
  scheme: (meta, text) => `A review of a literature sometimes proposes a way of SORTING that
literature: two or more traditions, schools or approaches that its papers fall into. Read the
one this paper proposes. Return JSON and nothing else.

WHAT YOU HAVE BEEN GIVEN
${meta.doi ? "DOI: " + meta.doi + "\n" : ""}${meta.title ? "Title: " + meta.title + "\n" : ""}${
meta.authors ? "Authors: " + meta.authors + "\n" : ""}${meta.year ? "Year: " + meta.year + "\n" : ""}${
meta.journal ? "Journal: " + meta.journal + "\n" : ""}
TEXT (${text.length} characters; this may be an abstract, a part of the paper, or the whole of it):
${text.slice(0, 60000)}

WHAT TO RETURN
{"name": "the scheme in a few words, as the paper would put it",
 "cite": "author (year), journal — short, as a citation would appear",
 "what": "the one question the scheme sorts papers BY, in under twelve words,
          beginning with a word like how or which or whether",
 "traditions": [{"code": "a short lower-case tag of two to four letters",
                 "label": "the tradition's name, as the paper names it",
                 "why": "what a paper in this tradition does, in one sentence"}]}

RULES
1. Between two and six traditions. A scheme with one is not a classification, and a scheme
   with more than six cannot be read off a filter.
2. The scheme must be the PAPER'S, not yours. If the paper reviews a literature without
   proposing a way of sorting it, return {"traditions": []} and nothing will be written.
3. "code" is a tag, not an abbreviation of the label you happen to like: it appears in a
   record and has to be stable, so keep it short and unambiguous between the traditions.
4. Do not include a tradition for papers the scheme does not place. The filter always
   carries one of those and it is not the paper's to name.
5. No commentary, no markdown fence. JSON only.`,
  /* The second ask: the scheme against the corpus. The papers go in as the
     page holds them -- title, outlet, year, and the paper-level theses the
     extraction recorded, which is the only thing here that says what a paper
     ARGUES rather than what it is called. */
  assign: (scheme, papers) => `A management scholar is applying a classification read out of
one paper to a corpus of ${papers.length} others. Assign each paper to one tradition. Return
JSON and nothing else.

THE CLASSIFICATION${scheme.name ? "\n" + scheme.name : ""}${scheme.cite ? " — " + scheme.cite : ""}
It sorts papers by: ${scheme.what}
${scheme.traditions.map(t => `  ${t.code}  ${t.label}${t.why ? " — " + t.why : ""}`).join("\n")}
  --  the scheme does not place this paper

THE PAPERS
${papers.map(p => `${p.id}
  ${p.ti}${p.jf ? " · " + p.jf : ""}${p.y ? " · " + p.y : ""}${
  p.says && p.says.length ? "\n  argues: " + p.says.slice(0, 3).join(" / ") : ""}`).join("\n")}

WHAT TO RETURN
{"assign": [{"paper": "the id exactly as given above",
             "code": one of ${JSON.stringify(
  scheme.traditions.map(t => t.code).concat(["--"]))},
             "why": "the phrase in the title or the argument that put it there, under
                     fifteen words"}]}

RULES
1. One row per paper, using the id exactly as given. A row naming anything else is counted
   and discarded before the scholar sees it.
2. Use "--" wherever the scheme genuinely does not place the paper. A classification that
   places every paper in a literature it was not written about is the failure to avoid here,
   and a large number of "--" is a finding about the scheme rather than a failure of yours.
3. Assign on what the paper ARGUES where that is given, and on the title only where it is
   not.
4. You are not being asked whether the classification is a good one. The scholar decides
   that by looking at what it did.
5. No commentary, no markdown fence. JSON only.`,
  comp: () => `You are helping a management scholar build a formal model out of a curated
literature. Below is every outcome quantity in the model, the mechanisms that write it, the
role each mechanism has been declared to play, and the class of functional shapes it will be
run over.

Propose, for each outcome, how its mechanisms combine. Choose from exactly these five:
  additive        independent contributions; removing one leaves the rest
  multiplicative  each is necessary; take any to zero and the outcome is zero
  min             a bottleneck; the smallest binds
  max             a substitute set; the best is enough
  ces             between additive and multiplicative, elasticity swept

Propose more than one where the theory genuinely does not settle it -- that is a class and
the enumeration will run all of them. Say nothing about outcomes where you have no reason.

Reason from the construct names and the declared roles, not from what sounds plausible in
general. One sentence each, naming what in the data decided it.

${aiBrief()}

Return ONLY JSON: {"proposals":[{"outcome":"<the varName>","rules":["additive"],"why":"<one sentence>"}]}`,

  /* The only prompt that asks for something the page cannot check afterwards.
     A role is not in any paper and no arithmetic refutes it, so what this asks
     for is a proposal the scholar reads — which is why it is told to say why
     in the literature's own terms and forbidden to invent anything. */
  /* The join. The candidates come off a similarity score over wording, which is
     weak on this corpus -- 26 pairs cross the two streams and the closest is
     0.16 -- so what is asked for here is the thing a word score cannot do:
     read both definitions and say whether they measure the same quantity. The
     answer is a proposal and the curator disposes, like every other one. */
  /* IT USED TO BE HANDED TWELVE PAIRS AND FORBIDDEN TO PROPOSE ANY, which
     made the whole call nearly pointless: the twelve were chosen by a
     similarity over WORDING whose best score on this corpus is 0.165, so the
     reader-by-meaning could only confirm or deny what a word match had
     already found. 120 x 37 is 4,440 possible pairs and it saw twelve of
     them -- a quarter of one per cent, filtered on a signal barely above
     noise, which is the opposite of asking by meaning.

     It gets both lists now and proposes the pairs itself. The wording score
     survives as a DATUM printed beside each proposal, where it is worth
     something: a pair proposed with no score at all is a pair the old gate
     could never have surfaced, and that is a measurable payoff rather than a
     claim about one. The discipline is unchanged -- every id is checked
     against the two streams before anything is shown, and whatever falls
     outside them is COUNTED rather than written. */
  join: () => {
    const L = xstreams();
    const line = i => "  " + i + "\n     " +
      (xdefn(i).slice(0, 240) || "(no definition recorded)");
    return `You are helping a scholar decide whether two literatures are measuring the same
quantity under different names.

Below are TWO COMPLETE LISTS of constructs, each with the definition the curation recorded.
LIST A is a corpus on corporate purpose. LIST B is a stream on property and decision rights.

Your job is to propose which constructs in A and B are THE SAME QUANTITY -- so that a model
would carry one variable rather than two. You choose the pairs. Nothing has been pre-filtered
for you.

What is NOT the same quantity: two constructs that are merely related; one that causes the
other; one that is a component or a special case of the other; two that share words. A pair
that shares no vocabulary at all but measures the same thing is exactly what this is for, and
a pair that shares a word but measures different things is the error to avoid.

Expect FEW. These two literatures mostly do not name the same things, and proposing many would
be the wrong answer. Propose at most 15, fewer if fewer are real, and none at all if none are.
An empty list is a good answer and is reported as one.

For each pair give: the exact id from A, the exact id from B, the name the joined quantity
should carry in lower-case words a scholar would recognise, and one sentence saying what makes
them the same measurement rather than two related ones.

LIST A -- corporate purpose (${L.cur.length} constructs)
${L.cur.map(line).join("\n")}

LIST B -- property and decision rights (${L.rights.length} constructs)
${L.rights.map(line).join("\n")}

Use the ids exactly as written above. Anything that is not an id from A paired with an id from
B is discarded and counted.

Return ONLY JSON:
{"joins":[{"a":"<id from A>","b":"<id from B>","name":"<joined name>","why":"<one sentence>"}]}`;
  },
  /* Every construct at once. The pair question asked sixty times is sixty
     judgements and two hundred asks; this is one ask and one reading, and it
     reaches pairs no wording score would ever have put on a shortlist. */
  similall: () => {
    const vis = G.nodes.filter(inScope);
    const rows = vis.map(n => `  ${n.i}  [${[n.l, n.s, n.b, n.f === "f" ? "flow" : "stock"]
      .filter(Boolean).join(" / ")}]  ${String(n.d || "").replace(/\s+/g, " ").trim().slice(0, 220)}`)
      .join("\n");
    return `You are helping a management scholar curate a literature. Below is every construct
they are carrying, with its level, scale, bearer, whether it is a stock or a flow, and the
definition the corpus recorded.

Group the ones that are THE SAME QUANTITY under different names.

${SIM.crit.trim()
  ? "Group them against the scholar's own criteria, which override any default you would\notherwise apply:\n\n  " + SIM.crit.trim().replace(/\n/g, "\n  ")
  : `Two constructs belong in one group when ONE INSTRUMENT could measure both. Constructs
that are strongly related, or that cause one another, or that belong to the same topic, do
NOT belong in one group. Same word with a different bearer or at a different level is a
different quantity.`}

Most constructs belong in no group at all. A group of more than a handful is almost always a
topic rather than a quantity, and will be refused.

The constructs:

${rows}

Return JSON only:
{"groups":[{"members":["<id>","<id>"],"score":0.0,"why":"<what one instrument would measure>"}]}

Use the ids exactly as written. Score each group from 0 to 1 for how sure you are. Leave out
every construct that belongs in no group.`;
  },

  /* Step 1.2's measure, when the scholar has chosen meaning over wording. The
     shortlist is picked by the wording score, which is the honest division:
     wording is good at saying which pairs are WORTH a judgement and bad at
     making one. What comes back is checked against the ids in scope before it
     is shown -- a pair naming a construct that is not on the page is counted,
     not written. */
  simil: () => {
    const inv = new Set(G.nodes.filter(inScope).map(n => n.i));
    const sig = i => { const n = N.get(i) || {};
      return [n.l, n.s, n.b, n.f === "f" ? "flow" : "stock"].filter(Boolean).join(" / "); };
    const def = i => { const n = N.get(i) || {};
      return String(n.d || "").replace(/\s+/g, " ").trim().slice(0, 320); };
    const rows = simShortlist(inv, SIMSTEP).map((p, k) =>
      `${k + 1}.
  A  ${p.a}  [${sig(p.a)}]
     ${def(p.a)}
  B  ${p.b}  [${sig(p.b)}]
     ${def(p.b)}`).join("\n\n");
    return `You are helping a management scholar decide which constructs in a curated literature
are THE SAME QUANTITY and should be merged into one.

${SIM.crit.trim()
  ? "Judge each pair against the scholar's own criteria, which are these and which override any\ndefault you would otherwise apply:\n\n  " + SIM.crit.trim().replace(/\n/g, "\n  ")
  : `Judge each pair on whether ONE INSTRUMENT could measure both. Two constructs that are
strongly related, or that cause one another, or that belong to the same literature, are NOT
the same quantity. Same word, different bearer or different level is not the same quantity
either.`}

Score each pair from 0 to 1, where 1 means they are the same quantity under one name and 0
means merging them would destroy a distinction the literature is making. Give one short reason
per pair, in the scholar's terms, naming what decided it.

The pairs, each with its level, scale, bearer and whether it is a stock or a flow, and its
definition as the corpus recorded it:

${rows}

Return JSON only:
{"pairs":[{"a":"<id exactly as given>","b":"<id exactly as given>","score":0.0,"why":"..."}]}

Use the ids exactly as written above. Score every pair you were given. Do not invent pairs.`;
  },

  /* Step 4.1's set, proposed as a reviewer would: not "run everything" but
     "the answer turns on this slot, so sweep it and hold the rest". What
     comes back is a TAILORED set the scholar then edits, and a member no
     slot admits is counted rather than written. */
  expset: () => {
    const slots = expSlotsNow();
    const M = ARITH.prop ? ARITH.prop.M : keptModel();
    const rows = slots.map(s =>
      `  ${s.term}   ${s.label}
     written at: ${s.running || "nothing written"}
     admits ${s.members.length} members: ${s.members.map(m => m.name + " (" + m.fam + ")").join(", ")}`).join("\n\n");
    const eqs = M ? M.steps.map(x => "  " + x.lhs + " = " + (x.py || x.src || "")).join("\n")
      : "  (no arithmetic is kept yet)";
    return `You are reviewing a formal model a management scholar built out of a curated
literature, in the way a careful referee would. The model runs over a CLASS of functional
forms, not one form: each mechanism was declared a shape class, and the class has members.

The arithmetic as it stands:

${eqs}

The mechanisms and the members each one admits:

${rows}

The whole cross product is ${slots.reduce((t, s) => t * s.members.length, 1)} combinations,
which is more than anybody will read. Say which combinations are worth running, and why.

A good answer does NOT say "run them all". It names the slot or slots the conclusion is most
likely to turn on, and says what would change if it turned out otherwise. A referee's version
of this is: "the result rests on the cost mechanism being concave; show me what happens when
it is convex."

Return JSON only:
{"name":"<a short name for this set>",
 "why":"<two or three sentences: what this set is testing and what a failure would mean>",
 "picks":[{"term":"<exactly as given above>","members":["<member name exactly as given>"]}]}

Name only members that appear in the lists above. A slot you leave out keeps all of its
members, which multiplies the set, so leave one out only when you mean that.`;
  },

  roles: g => `You are helping a management scholar turn a curated literature into a formal
model. Below are the declarations the corpus could not supply. You are PROPOSING; the scholar
accepts, edits or discards, and the page records which of the two of you chose each one.

A relation's ROLE is what the antecedent DOES to the consequent. No paper in this corpus
states one, so this is a modelling decision and the page cannot check it. Use this
vocabulary and nothing outside it:
${ROLES.map(([k, lab, long]) => "  " + k + "  (\"" + lab + "\")  -- " + long).join("\n")}

A relation's SHAPE CLASS is what its functional form is committed to. Propose only what the
literature's own statements support, and leave it empty where they support nothing. From
this list only:
${PASSPROPS.join("   ")}

A QUANTITY's KIND is what sort of thing it is. From this list only:
${KINDS.map(([k, long]) => "  " + k + "  -- " + long).join("\n")}
Its ASPECT is "level" if it is measured absolutely, or "difference" if it is measured
against a baseline and is therefore zero there by construction.

Propose more than one kind where the construct genuinely admits more: these are CLASSES, and
the enumeration runs every member. A narrower class you cannot defend is worse than a wider
one you can.

${passBrief(g)}

Answer only for the ids listed above, in those exact ids. Do not invent relations,
quantities, roles, shapes or kinds; anything outside the vocabularies is discarded and
counted. One short sentence of why for each role, in the literature's own terms.

Return ONLY JSON:
{"roles":[{"rel":"<id>","role":"","props":[],"why":""}],
 "quantities":[{"var":"<id>","kinds":[],"aspect":"level","why":""}]}`,

  /* The one prompt that reads a RECORD rather than a model. It is given the
     gate as a hard bound and the answer is filtered against it anyway, because
     a suggestion about step 3.2 to somebody whose arithmetic is unwritten is
     the exact failure the computed list was built to avoid. */
  /* `guide` was here: one prompt that read the RECORD rather than the model
     and suggested what to do next. page/19-review.js replaced it with
     reviewPrompt(), which reads the same record, is reachable
     from the review panel, and counts what came back outside its own
     vocabulary. Two prompts for one job is how they come to disagree, so this
     one is gone rather than left unreachable. */
  cond: () => `You are helping a management scholar state the REGULARITY CONDITIONS a formal
model has to satisfy. Below is its structure.

Six are already derived from what was declared and must NOT be restated: zero at the baseline
for difference-aspect quantities, staying inside declared bounds, shares summing to one,
propensities in the unit interval, conservation under a transfer role, and monotonicity where a
shape class says increasing.

Propose what those do not reach: an ordering between two outcomes, a quantity that must vanish
when another does, the sign of a comparative static, a single peak the theory predicts. Put each
in one of the four forms this page can RUN:
  nonneg  an expression that stays at or above zero at every sampled point — give expr
  up      a quantity that must rise in a named parameter                   — give y and x
  down    a quantity that must fall in a named parameter                   — give y and x
  peak    a quantity with a single peak inside a parameter's range         — give y and x

If a condition the theory genuinely implies cannot be put in one of those four, give it with
form "stated" and say what it is in words. It will be kept and written into the exported file,
and the page will say plainly that it is not checked here. Do NOT bend a condition into a form
it does not fit: a check that passes because it was reshaped is worse than one nobody ran.

An expression may use the names below, + - * / **, min, max, exp, log, round brackets and plain
decimals. Nothing else exists.

${arithBrief()}

Return ONLY JSON: {"proposals":[{"for":"<lower_snake_case_name>","form":"nonneg","expr":"vp - vs","y":"","x":"","why":"<one sentence saying what would falsify it>"}]}`,

  /* NAMING THE CLUSTERS. Manual, and the only ask on this bench whose button
     says why it is manual: the prompt carries every member's full definition,
     which on a neighbourhood of this size is twenty thousand characters, and
     nothing about a name needs to be recomputed when a slider moves.

     What it is NOT asked is which clusters are good. The clustering is a
     computation over declared ties and a reader handed its own hypothesis
     comes back confirming it, so this is asked for a name and a sentence over
     a grouping already fixed. Every proposal is matched to a cluster id that
     exists; anything else is counted rather than written. */
  cluname: () => {
    const cls = (COM.out && COM.out.clusters) || [];
    const defOf = i => String((N.get(i) || {}).d || "").replace(/\s+/g, " ").slice(0, 420);
    return `You are helping a management scholar read a curated literature. Constructs that
appear together in the same papers have been grouped into clusters by a community-detection
run over declared ties, and the grouping is SETTLED: you are not asked whether it is right.

What each cluster needs is a NAME a reader would recognise and one sentence saying what the
constructs in it have in common. The name goes on a map and in a list, so it is two to five
words, lower case except for proper nouns, and it names the quantity or the theme rather than
describing the cluster ("stated purpose and its clarity", not "a cluster of purpose
constructs").

A cluster is a READING and not yet a claim that these measure one quantity. If accepting it
as one quantity would be wrong -- because the constructs sit at different levels of analysis,
or because they are about the same topic rather than the same thing -- say so in the sentence.
That is the most useful thing you can tell the scholar here, and the levels are given below.

${cls.map((c, k) => `CLUSTER ${k + 1}  id: ${c.id}
  levels: ${(c.levels || []).join(", ") || "unrecorded"}
  papers behind more than one member: ${(c.papers || []).slice(0, 4)
    .map(([p, n]) => `${(pap(p) || {}).a || p} ${(pap(p) || {}).y || ""} (${n} of ${
      c.members.length})`).join("; ") || "none"}
${(c.ids || c.members).map(i => `  - ${i}: ${defOf(i) || "no definition recorded"}`).join("\n")}`).join("\n\n")}

Return ONLY JSON, one entry per cluster id above and no others:
{"clusters":[{"id":"<the id exactly as given>","name":"<two to five words>","why":"<one sentence: what these have in common, and whether merging them as one quantity would be wrong>"}]}`;
  },

  /* READING THE FINDINGS, IN WORDS.
     ----------------------------------------------------------------------
     The automatic mode has to let somebody who does not work in formal
     models read the candidate findings without going to the
        formula. She/he can see the formula and full derivation if needed."
       "For the notes/annotations, I suggest that we can ask the LLM to write
        them and the user can modify."

     Those are one ask, not two. Both want a derived result turned into a
     sentence somebody can read without opening an expression, and the only
     difference is where the sentence lands: the automatic tab on step 3.2
     shows it, and a board row takes it as the first draft of a note the
     scholar then edits.

     WHAT IT IS GIVEN AND WHAT IT IS NOT. It gets the verdict, the share of
     the declared box, the share of the declared class, the parameters and
     their declared ranges, and the mechanism statements the expression rests
     on. It does NOT get asked whether the finding is true -- that was settled
     by interval arithmetic before this is called, and a reader handed its own
     hypothesis comes back confirming it. It is asked to say what a proved
     sign MEANS for the quantity, in the corpus's own words, and to say so
     about the UNDECIDED share rather than rounding it away: a share the
     method could not settle is not a share where the sign fails, and that is
     the single thing a non-modeller is most likely to get wrong. */
  read: () => {
    const rows = (BOARD.rows || []).filter(r => r.keep);
    const bx = (ARITH.kept && ARITH.kept.box) || {};
    const mech = ((ARITH.kept && ARITH.kept.lines) || [])
      .filter(l => l.kind === "term" && l.why);
    return `You are helping a management scholar read what a formal model turned out to
imply. The model is CLOSED and the results below were PROVED or REFUSED before you were
asked: interval arithmetic decides a sign over a declared box or declines to, and you are
not being asked whether any of this is right. You are being asked what it MEANS.

Who is reading. Somebody who curated this literature and does not write formal models. They
should not have to open an expression to know what was found, though they can. So: no
symbols, no variable names unless the name is the construct's own words, no talk of
derivatives. Say what rises with what, over what range, and what the model could not settle.

THE ONE THING TO GET RIGHT. A share of the box the method could not decide is NOT a share
where the sign fails. Interval arithmetic is sound and incomplete: it proves a sign or
declines, and never guesses. If a finding holds on three quarters of the declared box, the
other quarter is undecided and the honest sentence says so. Writing "it fails for the rest"
would be the one error that matters here.

THE PARAMETERS, with the range each was declared over:
${Object.keys(bx).length ? Object.entries(bx).map(([k, v]) =>
  `  ${k.replace(/_/g, " ")}: ${v[0]} to ${v[1]}`).join("\n") : "  none declared"}

THE MECHANISMS the arithmetic rests on, in the words they were declared with:
${mech.length ? mech.map(l => `  ${String(l.lhs).replace(/^t_/, "").replace(/_/g, " ")}: ${
  String(l.why).slice(0, 220)}`).join("\n") : "  none recorded"}

THE FINDINGS:
${rows.map((r, i) => `${i + 1}. id: ${r.id}
   statement: ${r.text || (r.y + " in " + r.x)}
   quantity: ${String(r.y).replace(/_/g, " ")} · moved: ${String(r.x).replace(/_/g, " ")}
   verdict: ${r.verdict || r.says || "no verdict from this page"}${
     r.method ? " (" + r.method + ")" : ""}${r.src && r.src !== "auto"
     ? " \u00b7 returned from " + r.src + " rather than proved here" : ""}${
     r.why ? "\n   provenance: " + String(r.why).slice(0, 200) : ""}
   proved over: ${r.share == null ? "not recorded" :
     (100 * r.share).toFixed(1) + "% of the declared box" +
     (r.open ? ", " + (100 * r.open).toFixed(1) + "% UNDECIDED" : "")}
   over the declared class of shapes: ${r.forms && r.forms.of
     ? (r.forms.turn ? r.forms.held + " of " + (r.forms.held + r.forms.turn) +
         " combinations the search could decide agree, " + r.forms.turn + " turn the other way"
       : r.forms.held + " of " + r.forms.of + " agree, " +
         (r.forms.undec || 0) + " could not be decided either way")
     : "never read against the class"}`).join("\n")}

Return ONLY JSON, one entry per id above and no others:
{"read":[{"id":"<the id exactly as given>","says":"<two or three sentences: what it means for the quantity, over what range, in plain words>","mind":"<one sentence: what it does NOT establish, naming the undecided share or the unread class where there is one>"}]}`;
  },

  arith: () => `You are helping a management scholar build a formal model out of a curated
literature. Every declaration below was made by hand. What is missing is the one thing no
declaration fixes, which is the arithmetic.

Write it. One assignment per line, in a grammar that is valid Python AND JavaScript at once,
because the page runs it and checks it before anybody believes it:

  names        lower_snake_case. In scope: the parameters below, any constant you declare, and
               any line you have already written. Nothing else exists -- no attribute access,
               no quotes, no brackets but round ones, no conditionals.
  operators    + - * / **  and the comma inside a call. Parenthesise a leading minus before
               ** : write -(x ** 2), never -x ** 2.
  functions    min(a, b)  max(a, b)  exp(a)  log(a)  and nothing else.
  numbers      decimals with a leading digit: 0.5, never .5.

Write exactly one line per TERM the brief names, named exactly as it names it, reading the
parameter it is declared to read. Then exactly one line per OUTCOME, named exactly as the brief
names it, combining its own terms the way its composition is declared:
  additive  they add    multiplicative  they multiply    min  the smallest binds
  max  the largest carries    ces  between the two, as a weighted power mean

What each declared word requires of your expression. The brief marks every term with the
shape words that were declared for it, and these six are the only ones that can be:
  f(0)=0       zero where its reader sits at the bottom of its declared range
  f(1)=1       one at the top of that range, so swapping a form moves the shape and not
               the scale -- which is what lets a broken obligation be attributed
  increasing   rises in what it reads, everywhere in the reader's range
  concave      rises with a falling slope -- diminishing returns
  convex       rises with a rising slope -- a compounding cost
  sigmoid      changes curvature exactly once: slow, then rapid, then saturating
And the six role words, which say how a term enters the outcome it writes:
  generates    enters positively: it creates value that was not there
  dissipates   enters negatively: a cost, charged against the outcome
  transfers    conserved -- what it adds to one quantity it takes from another
  allocates    an allocation rule: it splits a quantity over parties or channels
  gates        lies in [0, 1] and MULTIPLIES the term it acts on, which the brief names
  modulates    multiplies the term it acts on, unbounded -- an interaction
A term whose shape is unconstrained is yours to choose. Say what you chose and why, in one
sentence that names what in the declarations decided it.

Where the brief lists FORM FAMILIES for a term, a member of one is the better answer than
an expression of your own: the page can then run the WHOLE family against your model and
report whether the conclusion holds for the class or only for the line you wrote. Name it --
"family" and "member" beside the line -- and a constant in front is allowed. Name a family
only if the line really is that member: a class the line is not in is worse than no class.

A CLASS OF ONE IS A CLAIM, AND IT IS THE STRONGEST ONE HERE. The "linear" family holds a
single member, so naming it pins the shape exactly: it asserts that there is no curvature,
rather than declining to assert any. If the declarations and the corpus say nothing about
the curvature of a term, the WEAKER answer is the family whose properties you are willing
to assert, with the member you think likeliest named inside it; the page then reads every
conclusion against all of its members and reports the share that agree. Name "linear" where
proportionality is the content of the claim -- an allocation rule splitting a quantity pro
rata is exactly that -- and say so in the reason. Do not reach for it as the modest answer
to "nothing is known", because in this vocabulary it is the least modest answer available.

EVERY MEMBER READS X ON [0, 1]. So X is not the reader itself unless the reader's declared
range IS [0, 1]: where the brief gives a parameter some other range, write
((reader - lo) / (hi - lo)) in place of X. Substituting the raw reader breaks f(0)=0 and
f(1)=1 -- the two properties the family claims -- and the page will say so.

Give every weight a name as a constant, and give each one the INTERVAL it should be run over
as well as a value: "lo" and "hi", the range over which you would still expect the model to
behave as the declarations say. That interval is what lets a conclusion be proved over the
weights rather than merely at the ones you picked, and nothing in the corpus fixes a weight,
so the range is a judgement and it should be a wide one rather than a flattering one. Keep the
weights few, and keep every outcome inside its declared bounds everywhere in the box.

${arithBrief()}

For each invariant already agreed to, give a check the page can run:
  nonneg  an expression that must stay >= 0 at every sampled point  -- give expr
  up      a quantity that must rise in a parameter                  -- give y and x
  down    a quantity that must fall in a parameter                  -- give y and x
  peak    a quantity with a single interior peak in a parameter     -- give y and x

Return ONLY JSON:
{"constants":[{"name":"k_credibility","value":2.0,"lo":0.5,"hi":5.0,"why":"<one sentence>"}],
 "lines":[{"lhs":"t_pi_to_vp","rhs":"pi ** 0.5","family":"saturating","member":"sqrt","why":"<one sentence>"}],
 "checks":[{"for":"<the invariant name>","form":"nonneg","expr":"vp - vs","y":"","x":"","why":"<what would falsify it>"}],
 "note":"<one sentence: what this arithmetic commits to that the declarations did not>"}${arithFail()}`,

  /* THE PREDICTIONS. Named in two buttons on step 3.2 and never written, so
     AIQ[what]() was undefined and both calls threw a TypeError inside the try
     -- caught, reported as "could not ask", indistinguishable from the
     capability not being there. Which is the failure mode this file already
     complains about one screen above.

     What it asks for is CANDIDATES, in the four forms this page can run,
     because every one of them is run against the arithmetic before it is
     ranked. What it does not ask for is which of them matters: an answer
     handed its own hypothesis comes back confirmed. */
  predict: () => `You are helping a management scholar find out what their formal model
PREDICTS. Below are the declarations it was built from and the arithmetic that was written
against them and kept.

Propose predictions the model makes that are not already stated in it. Each one has to be in
one of the four forms this page can RUN, because each will be run against the arithmetic
before the scholar sees it:
  up      a quantity rises in a named parameter        -- give y and x
  down    a quantity falls in a named parameter        -- give y and x
  peak    a quantity has a single peak inside a range  -- give y and x
  nonneg  an expression stays at or above zero         -- give expr

y has to be a quantity the arithmetic writes. x has to be one of the free parameters. An
expression may use the names below, + - * / **, min, max, exp, log, round brackets and plain
decimals, and nothing else exists.

Worth proposing: an ordering between two outcomes that no single mechanism settles; a quantity
that turns rather than rises; a comparison between what two stakeholders get; something that
depends on two mechanisms at once. Not worth proposing: a restatement of a relation the model
already carries as an arrow, which is a confirmation and will score as one; and anything you
cannot put in one of the four forms, because it cannot be run and will be listed as not run.

Do NOT rank them, score them, or say which are important. That is computed here against
criteria the scholar declares, precisely so that it is not computed by you. Propose a dozen or
more and let the ranking do the triage.

${arithBrief()}
${keptBrief()}

Return ONLY JSON:
{"proposals":[{"for":"<the prediction as a short phrase>","form":"up","y":"","x":"","expr":"",
  "why":"<one sentence: what in the model's structure makes you expect it>"}]}`,

  /* THE CRITERIA COMPILER. A rule is a declaration, so it is shown before it
     applies, and the one thing it must not do is quietly round a criterion
     onto the nearest thing a browser can compute. The unreachable list is the
     honest part of the answer and the prompt says so twice. */
  defn: () => `A management scholar is ranking candidate predictions from their own formal
model. They have written, in prose, what they want the ranking to favour. Compile it into
weights.

WHAT THEY WROTE, VERBATIM:
${(SCORE.defn || "").slice(0, 1800)}

The ranking is arithmetic over exactly four quantities. These are the four this page can
compute about a candidate, and there is nothing else available to it:
${SAXES.map(([a, lab, long]) => "  " + a + "  -- " + long).join("\n")}

Give each a weight from 0 to 3. Zero means what they wrote gives it no role; do not spread
weight onto a quantity they never mentioned. Put a name in "require" only where they said a
candidate failing it should be ruled out altogether rather than ranked lower.

Then the part that matters most. List, in their own words, every part of what they wrote that
NONE of those four quantities reaches. Do not approximate it onto the nearest one, do not drop
it, and do not pad the list with things the four do cover. Scholars name criteria like
interestingness, relevance, novelty, surprise, policy bite or theoretical contribution; most
of those are only partly reachable by four numbers a browser computes, so where that is the
case, weight the part that is reachable and put the rest in the list verbatim. The page prints
that list beside the ranking and says plainly that those parts did not affect it, which is the
only honest thing it can do with a criterion it cannot compute. A short list that is true is
worth more than an empty one.

Return ONLY JSON:
{"weights":{"material":1,"novel":2,"composition":3,"robust":0},
 "require":["material"],
 "note":"<one sentence, addressed to them, saying what this rule now favours>",
 "unreachable":["<a phrase from what they wrote>"]}`,
};

/* ONE MARK, WHEREVER A MODEL IS USED.
   ==========================================================================

   Fifteen controls on this bench call a language model and nothing visible
   said which. Their labels named it six different ways or not at all -- "ask
   an LLM to write it", "ask a reviewer which to run", "suggest mergers",
   "compile it", "the 20 closest", "read it through" -- and a reader could not
   tell that "ask a reviewer" or "compile it" leaves the page at all. The
   bench's whole argument is that a model proposes and the page checks, so
   where the model acts is the one thing a reader must always be able to see.

   A four-pointed sparkle, because it is the mark most software now uses for
   this and readers know it without a legend. Inline SVG with currentColor, so
   it takes the colour of whatever it sits in and works in both themes; not an
   emoji and not a font character, which render differently on every platform.

   It is here rather than in core/ because it is presentation, and here rather
   than anywhere else in page/ because this is the module that owns the model
   capability. One small icon marks every task a model assists with, and it
   is the same icon everywhere.

   The screen reader gets the same information the sighted reader gets, which
   is why the sparkle is hidden from it and a phrase is not. */
const aiMark = (say) => `<svg class="aim" viewBox="0 0 16 16" aria-hidden="true"` +
  `><path fill="currentColor" d="M8 0C8.6 4.6 11.4 7.4 16 8C11.4 8.6 8.6 11.4 8 16C7.4 11.4 4.6 8.6 0 8C4.6 7.4 7.4 4.6 8 0Z"/></svg>` +
  `<span class="sr-only">${say === undefined ? "uses AI: " : say + ". "}</span>`;

/* Every tooltip on a control that calls a model ends with this, so the terms
   are stated wherever the mark appears rather than once in a legend. */
const AITIP = " Uses the language model this host provides; nothing it returns " +
  "is kept until you accept it.";

async function aiAsk(what){
  const cap = await aiCap();
  if(!cap) return;
  AI.busy = what; AI.err = ""; AI.raw = ""; AI.at = what; renderPanel();
  try{
    /* roles is the one prompt that takes an argument: the gaps it is being
       asked to fill. Every other AIQ entry reads the model itself. */
    const q = what === "roles" ? AIQ.roles(passGaps()) : AIQ[what]();
    const r = await cap.json(q, {modelTier:"complex", cache:false});
    /* Kept whether or not it is applied: what the page was told is part of what
       the page did, and `AI.raw` only ever recorded a FAILURE. */
    provTake(what, q, r);
    // the arithmetic comes back as assignments and not as proposals, and is run
    // before it is shown -- the verdicts arrive on the same row as the offer
    if(what === "arith"){ takeArith(r); AI.busy = ""; renderPanel(); return; }
    /* Predictions are not applied to anything, so nothing needs guarding and
       nothing is accepted one at a time: the ranking IS the triage, and a
       candidate that scores badly has already been answered. */
    /* Joins are proposals about the curation, so none of them is applied: each
       row gets a Join button and the scholar presses it or does not. Only the
       pairs that were asked about are kept. */
    /* Similarity judgements are not applied to anything either: they become
       the measure the slider thresholds, and the merges still happen where
       they always did. The scholar can move the slider to nothing and lose
       every one of them. */
    /* The reviewer's set is a proposal about what to run, so it is taken as a
       TAILORED set and the scholar still edits it member by member. */
    if(what === "expset"){
      const slots = expSlotsNow();
      const got = expTake(r, slots);
      EXP.out = got;
      if(Object.keys(got.pick).length){
        EXP.set = "tailored"; EXP.pick = got.pick;
        EXP.why = got.why; EXP.name = got.name; EXP.at = got.at;
      }else{
        AI.err = "nothing it proposed names a mechanism and a member this model has";
      }
      expSave(); AI.busy = ""; renderPanel(); return;
    }
    /* The names are proposals, accepted one at a time like every other, and
       matched by the cluster id. An id this clustering does not hold is
       counted and not written -- the same rule the join and the roles are
       held to. */
    if(what === "read"){
      const have = new Set((BOARD.rows || []).map(r => r.id));
      const raw = ((r && r.read) || []).filter(x => x && x.id);
      const out = []; let outside = 0;
      const seen = new Set();
      for(const x of raw){
        const id = String(x.id);
        if(!have.has(id) || seen.has(id)){ outside++; continue; }
        seen.add(id);
        out.push({id, says:String(x.says || "").replace(/\s+/g, " ").trim().slice(0, 700),
                  mind:String(x.mind || "").replace(/\s+/g, " ").trim().slice(0, 400)});
      }
      READ.out = out; READ.outside = outside;
      READ.at = new Date().toISOString().slice(0, 16).replace("T", " ");
      if(!out.length) AI.err = "nothing it returned names a finding on this board";
      AI.busy = ""; renderPanel(); return;
    }
    if(what === "cluname"){
      const have = new Set(((COM.out && COM.out.clusters) || []).map(c => c.id));
      const raw = ((r && r.clusters) || []).filter(x => x && x.id);
      const out = []; let outside = 0;
      const seen = new Set();
      for(const x of raw){
        const id = String(x.id);
        if(!have.has(id) || seen.has(id)){ outside++; continue; }
        seen.add(id);
        out.push({id, name:String(x.name || "").replace(/\s+/g, " ").trim().slice(0, 60),
                  why:String(x.why || "").replace(/\s+/g, " ").trim().slice(0, 300)});
      }
      COM.ai = {out, outside, at:new Date().toISOString().slice(0, 16).replace("T", " ")};
      if(!out.length) AI.err = "nothing it returned names a cluster this clustering holds";
      AI.busy = ""; renderPanel(); renderInsp(); return;
    }
    if(what === "similall"){
      const inv = new Set(G.nodes.filter(inScope).map(n => n.i));
      SIM.out = simTakeGroups(r, inv);
      SIM.at = SIM.out.at;
      simForget(); simSave();
      AI.busy = ""; renderPanel(); refresh(); return;
    }
    if(what === "simil"){
      const inv = new Set(G.nodes.filter(inScope).map(n => n.i));
      SIM.out = simTake(r, inv);
      SIM.at = SIM.out.at;
      simForget(); simSave();
      AI.busy = ""; renderPanel(); refresh(); return;
    }
    if(what === "join"){
      /* THE SECOND GATE WAS HERE and it was the worse of the two: even a
         pair the reader proposed was thrown away unless the wording score
         had already found it. What a proposal is checked against now is the
         thing that actually constrains it -- A must be an id in the purpose
         stream, B an id in the rights stream, and neither already joined.
         A pair outside that is counted, not written, which is the same rule
         every other proposal on this bench is held to. */
      const L = xstreams();
      const A = new Set(L.cur), B = new Set(L.rights);
      const raw = ((r && r.joins) || []).filter(x => x && x.a && x.b);
      const seen = new Set();
      const good = [];
      for(const x of raw){
        let a = String(x.a), b = String(x.b);
        /* the two lists are labelled, but a reader may still answer in the
           other order, and that is a transposition rather than an error */
        if(B.has(a) && A.has(b)){ const t = a; a = b; b = t; }
        if(!A.has(a) || !B.has(b)) continue;
        const k = a + "|" + b;
        if(seen.has(k)) continue;
        seen.add(k);
        good.push({a, b, same:true, name:String(x.name || ""),
          why:String(x.why || ""), word:xwordScore(a, b)});
      }
      XJOINA.out = good;
      XJOINA.outside = raw.length - good.length;
      XJOINA.asked = xspace().n;
      XJOINA.at = new Date().toISOString();
      /* An empty answer is a RESULT here and the prompt says so, because on
         these two literatures it is the likely one. Reporting it as an error
         would teach a curator to keep asking until something came back. */
      XJOINA.err = raw.length === 0
        ? "nothing was proposed \u2014 on these two literatures that is the likely answer, not a failure"
        : (good.length ? "" : "every pair proposed fell outside the two streams");
      AI.busy = ""; renderPanel(); return;
    }
    if(what === "predict"){
      SCORE.prop = ((r && r.proposals) || []).filter(x => x && x.form).slice(0, 30)
        .map((x, i) => Object.assign({id:"p" + i}, x));
      if(!SCORE.prop.length) AI.err = "nothing proposed"; else runScorer();
      AI.busy = ""; renderPanel(); return;
    }
    /* A rule is a declaration -- it changes the ranking -- so it is shown
       before it applies, like every other declaration on this bench. */
    /* THE DECLARATIONS THE CORPUS COULD NOT SUPPLY. Two vocabularies on the
       relation side and two on the quantity side, all closed, and the answer
       is held to every one of them: a role, a shape class, a kind or an aspect
       outside its list is counted and dropped rather than written. Nothing is
       applied here; each surviving proposal gets a row and a button. */
    if(what === "roles"){
      const relIds = new Set(carriedRelations().map(x => String(x.id)));
      const varIds = new Set(carriedVars().map(String));
      const take = [];
      let outside = 0;
      for(const x of ((r && r.roles) || [])){
        const id = String((x && x.rel) || "");
        if(!relIds.has(id)){ outside++; continue; }
        const role = ROLES.some(z => z[0] === x.role) ? String(x.role) : "";
        const props = (x.props || []).filter(p => PASSPROPS.includes(p)).map(String);
        outside += ((x.props || []).length - props.length) + ((x.role && !role) ? 1 : 0);
        if(!role && !props.length) continue;
        take.push({id:"roles" + take.length, rel:id, role, props,
          why:String((x && x.why) || "").slice(0, 300)});
      }
      for(const x of ((r && r.quantities) || [])){
        const id = String((x && x.var) || "");
        if(!varIds.has(id)){ outside++; continue; }
        const kinds = (x.kinds || []).filter(k => KINDS.some(z => z[0] === k)).map(String);
        const asp = ASPECTS.some(z => z[0] === x.aspect) ? String(x.aspect) : "";
        outside += ((x.kinds || []).length - kinds.length) + ((x.aspect && !asp) ? 1 : 0);
        if(!kinds.length && !asp) continue;
        take.push({id:"roles" + take.length, qty:id, kinds, aspect:asp,
          why:String((x && x.why) || "").slice(0, 300)});
      }
      AI.roles = take;
      AI.outside = outside;
      if(!take.length) AI.err = outside
        ? outside + " proposal(s) came back and every one named something outside the " +
          "declared ids or the closed vocabularies"
        : "nothing proposed";
      AI.busy = ""; renderPanel(); return;
    }
    if(what === "defn"){
      const w = (r && r.weights) || {};
      SCORE.prop0 = null;
      AI.rule = {id:"r0", weights:{material:+w.material || 0, novel:+w.novel || 0,
        composition:+w.composition || 0, robust:+w.robust || 0},
        require:((r && r.require) || []).filter(a => SAXES.some(x => x[0] === a)),
        note:String((r && r.note) || ""),
        unreachable:((r && r.unreachable) || []).map(String).slice(0, 6)};
      AI.busy = ""; renderPanel(); return;
    }
    const got = (r && r.proposals) || [];
    AI[what] = got.filter(x => x && (x.outcome || x.check || x.form)).slice(0, 24)
      .map((x, i) => Object.assign({id:what + i}, x));
    if(!AI[what].length) AI.err = "nothing proposed";
  }catch(e){
    // never retried in a loop: a refusal is a refusal and a rate limit is a wait
    AI.err = (e && e.code) ? e.code.replace(/_/g, " ") : "could not ask";
    // the capability hands back whatever text it had when it gave up; it is
    // the only evidence of what the model actually said
    AI.raw = String((e && e.text) || "").replace(/\s+/g, " ").trim();
  }
  AI.busy = ""; renderPanel();
}

/* An invariant that was proposed and accepted. Kept apart from the derived ones
   because its warrant is different: those follow from a declaration, this one
   followed from a suggestion somebody agreed with, and the file says so. */
const xinv = new Map();
function xsaveLocal(){ lsWrite("purposeExtraInv", [...xinv.values()]); }
function xloadLocal(){
  const v = lsRead("purposeExtraInv");
  if(v) v.forEach(x => xinv.set(x.id, x));
}

/* ---------------------------------------------------------------------------
   The arithmetic.

   Everything else on step 3.1 declares what the model is ABOUT. This is the
   one thing that follows from no declaration, and the bench used to stop here
   and hand over a file with NotImplementedError in the middle of it.

   It does not stop here now, and it does not take an answer on trust either.
   A proposal arrives as assignments in a grammar that is valid Python and
   JavaScript at once -- names, + - * / **, min, max, exp, log, numbers, round
   brackets. Every token is checked against that grammar and against a scope
   built from the declarations; then the expression is turned into postfix and
   walked by hand. Nothing is compiled and nothing is evaluated, so what runs
   can only be arithmetic over names that were declared, and the page needs no
   eval -- which a published artifact may not have.

   Then it RUNS, here, over a fixed sample of the declared parameter box, and
   the invariants from the block above run against what came back. The
   verdicts are on the row with the offer. Asking again sends the failures
   back, which is the iteration the loop is drawn around: declare, run, read
   what broke, declare again.

   One member of the class and not the class: the enumeration over the
   declared form families is the kernel's job, on step 3.2. What runs here is
   enough to find arithmetic that cannot be right. */
/* The grammar moved to kernel.js, loaded above, so that something other than a
   browser can run it and so that it can be TESTED: until it came out, the only
   automated check on this file was that it parsed. ATOK, ANAME, APREC, ANARY,
   ARIGHT, readExpr and evalRPN come off the global scope from there. */

/* What the proposal is held to: every mechanism the curation carries needs a
   term of its own, every outcome needs a line, and a name that is not one of
   those or a declared parameter does not exist. A line that fails any of that
   is refused and named rather than repaired. */
function buildArith(a){
  const rels = carriedRelations(), nm = mechNames(rels), outs = outcomeVars();
  const vars = carriedVars(), written = new Set(rels.map(r => r.to));
  const params = vars.filter(k => !written.has(k));
  const scope = new Set(params.map(varName));
  const consts = ((a && a.constants) || [])
    .filter(c => c && ANAME.test(String(c.name)) && isFinite(+c.value) &&
      !scope.has(String(c.name)) && !ANARY[String(c.name)])
    .slice(0, 40)
    .map(c => ({name:String(c.name), value:+c.value, why:String(c.why || ""),
      lo:isFinite(+c.lo) ? +c.lo : null, hi:isFinite(+c.hi) ? +c.hi : null}));
  for(const c of consts) scope.add(c.name);
  const want = new Map();
  for(const r of rels) want.set("t_" + nm.get(r.id), {kind:"term", rel:r});
  for(const k of outs) want.set(varName(k), {kind:"out", key:k});
  /* DEPENDENCY ORDER. The grammar's scope rule is strict -- a line reading a
     name written further down is refused by name -- and the order lines
     arrive in is mechanical rather than a judgement. The arith prompt asks
     for every term and then every outcome, which is the wrong order the
     moment a term reads an outcome, and the demo's own seeded model has one:
     a correct answer lost two of five lines and was blamed for it.

     Sorting is not repair. Nothing is rewritten and nothing is renamed: a
     line whose names do not exist, or one in a cycle, cannot be placed and
     is left at the end to be refused for the real reason. */
  const NAMESOF = src => (String(src == null ? "" : src).match(/[a-z][a-z0-9_]*/g) || [])
    .filter(x => !ANARY[x]);
  const inOrder = [], left = ((a && a.lines) || []).slice(0, 90), seen = new Set(scope);
  for(let moved = true; left.length && moved; ){
    moved = false;
    for(let i = 0; i < left.length; i++){
      if(!NAMESOF(left[i] && left[i].rhs).every(x => seen.has(x))) continue;
      const ln = left.splice(i, 1)[0]; i--;
      inOrder.push(ln); seen.add(String((ln && ln.lhs) || "").trim()); moved = true;
    }
  }
  for(const ln of left) inOrder.push(ln);

  const steps = [], bad = [];
  for(const ln of inOrder){
    const lhs = String((ln && ln.lhs) || "").trim();
    if(!ANAME.test(lhs) || ANARY[lhs] || scope.has(lhs)){
      bad.push({lhs:lhs || "(unnamed)", why:scope.has(lhs)
        ? "already the name of a parameter, a constant or an earlier line"
        : "not a usable name"});
      continue;
    }
    let e;
    try{ e = readExpr(ln && ln.rhs, scope); }
    catch(err){ bad.push({lhs, why:err.message}); continue; }
    scope.add(lhs);
    const w = want.get(lhs) || {kind:"local"};
    steps.push({lhs, rpn:e.rpn, py:e.py, uses:e.uses, kind:w.kind, rel:w.rel,
      key:w.key, why:String((ln && ln.why) || "")});
  }
  const miss = [...want.keys()].filter(k => !steps.some(s => s.lhs === k));
  /* THE DECLARATIONS RIDE ON THE MODEL.

     core/invariants.js is held to what the curation says -- a quantity's
     name and bounds, its kinds and aspects, a relation's roles and shape
     properties, the carried variables, the mechanism names, the substitute
     sets -- and it cannot reach into this page for any of it. So the model
     carries them, as ten thin bindings. Nothing about the shape is clever:
     it is the same move reviewState() makes for the reviewer and the slot
     list makes for the exploration set, which is the third time it has been
     the right answer here.

     The win is that a test can hand core/invariants.js a model whose
     declarations it chose, and the file cannot ask a question the model did
     not carry. */
  const decl = {
    name:varName, bounds:abnd, bounded:bdec,
    kinds:vKinds, aspects:vAspects,
    roles:rolesOf, props:propsOf,
    vars:carriedVars, mech:mechNames, substitutes:substituteSets,
  };
  return {consts, steps, bad, miss, params, rels, nm, outs, decl,
    terms:new Map(rels.map(r => [r.id, "t_" + nm.get(r.id)]))};
}

/* Whether anybody declared the interval, as against this page defaulting it.
   An obligation nobody took on is not one the arithmetic can break, and a
   bound is the one declaration a bulk action cannot honestly make: the corpus
   records a scale for every construct and never a range. */
const bdec = k => !!(vtype.get(k) || {}).bset;
/* A weight was the only thing on this bench that stayed a point rather than
   becoming a class. The generated file's own docstring calls them the
   thinnest thing in it, and the one real failure the workflow test found was
   a weight doubling out of its outcome's bound. Declare the interval and
   interval arithmetic proves a proposition over the WEIGHTS, not merely at
   the ones that happened to be proposed. */
const wbnd = c => (c && c.lo != null && c.hi != null && c.lo < c.hi)
  ? [c.lo, c.hi] : [c.value, c.value];
const wdec = c => !!(c && c.lo != null && c.hi != null && c.lo < c.hi);
const abnd = k => { const v = vtype.get(k) || {};
  return [v.lo != null ? +v.lo : 0, v.hi != null ? +v.hi : 1]; };




/* Kept arithmetic. Held apart from the declarations because its warrant is
   different again: a declaration is the modeller's, an accepted invariant is a
   judgement they agreed with, and this is a proposal that survived being run. */
const ARITH = {prop:null, kept:null, text:null, edit:true, fam:{}, err:""};
/* What the enumeration over family members last returned, keyed by term.
   Declared here because takeArith clears it and a const declared further
   down would be in its temporal dead zone on the first restore from
   storage. */
const CLS = {at:"", rows:{}};
const arithSig = () => {
  const rels = carriedRelations(), nm = mechNames(rels);
  const w = new Set(rels.map(r => r.to));
  /* The DECLARATIONS belong in here too, and did not. The signature caught a
     mechanism being added and missed a role being changed — and it is the
     role, the shape class and the combination rule that liveInvariants() reads.
     So changing one left a kept run reporting pass and fail against invariants
     nobody was deriving any more, with nothing on screen to say so. */
  const dec = rels.map(r => r.id + ":" + rolesOf(r).join("+") + ":" +
      propsOf(r).slice().sort().join("+")).sort().join(",") + "|" +
    carriedVars().map(k => k + ":" + vKinds(k).slice().sort().join("+") + ":" +
      vAspects(k).slice().sort().join("+")).sort().join(",") + "|" +
    outcomeVars().map(k => k + ":" + rulesOf(k).slice().sort().join("+")).sort().join(",");
  return rels.map(r => nm.get(r.id)).sort().join(",") + "|" +
    outcomeVars().map(varName).sort().join(",") + "|" +
    carriedVars().filter(k => !w.has(k)).map(varName).sort().join(",") + "|" + dec;
};
function asaveLocal(){
  if(ARITH.kept) lsWrite("purposeArith", ARITH.kept);
  else lsDrop("purposeArith");
}
function aloadLocal(){
  const v = lsRead("purposeArith");
  if(v) ARITH.kept = v;
}

/* The arithmetic, typed rather than asked for.

   The same grammar, the same checks, the same verdicts: the bench has never
   cared who proposed a thing, only whether it survives being run. Two reasons
   it has to exist. It is the only route to a runnable model where the
   sampling capability is absent, which the call's accessibility gate makes a
   requirement and not a courtesy -- until now, no capability meant no model.
   And it is where a modeller who knows the form writes it instead of
   accepting one.

   It doubles as line-level iteration. Editing one line of the text and
   checking it again keeps the other four, which asking again never did. */
const ALINE = /^\s*([a-z][a-z0-9_]{0,71})\s*=\s*(.+?)\s*$/;
const AWGT = /^(-?\d+(?:\.\d+)?)(?:\s+in\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\s*)?$/;
function requiredNames(){
  const rels = carriedRelations(), nm = mechNames(rels), out = new Set();
  for(const r of rels) out.add("t_" + nm.get(r.id));
  for(const k of outcomeVars()) out.add(varName(k));
  return out;
}
function parseArith(text){
  const need = requiredNames(), constants = [], lines = [];
  for(const raw of String(text || "").split("\n")){
    const t = raw.replace(/#.*$/, "").trim();
    if(!t) continue;
    const m = ALINE.exec(t);
    // no equals sign at all: hand it on so the builder refuses it by name
    if(!m){ lines.push({lhs:"(not a line)", rhs:t, why:""}); continue; }
    const w = AWGT.exec(m[2]);
    // a bare number is a weight, unless the name is one the model requires
    if(w && !need.has(m[1]))
      constants.push({name:m[1], value:+w[1],
        lo:w[2] != null ? +w[2] : null, hi:w[3] != null ? +w[3] : null,
        why:"typed by hand"});
    else lines.push({lhs:m[1], rhs:m[2], why:""});
  }
  return {constants, lines, checks:[], note:"Written by hand on this page."};
}
function arithToText(){
  const p = ARITH.prop, a = ARITH.kept;
  const src = p ? {c:p.M.consts, l:p.M.steps} : a ? {c:a.consts, l:a.lines} : null;
  if(!src) return arithSkeleton();
  const L = [];
  for(const c of (src.c || []))
    L.push(c.name + " = " + c.value + (wdec(c) ? " in [" + c.lo + ", " + c.hi + "]" : ""));
  if((src.c || []).length) L.push("");
  for(const x of (src.l || [])) L.push(x.lhs + " = " + (x.py || x.rhs || ""));
  return L.join("\n");
}
/* Something that runs on the first check rather than a blank page: every
   term is its own reader and every outcome adds its terms up. It is a
   placeholder and a bad model, and it is honest about which lines the
   declarations require. */
function arithSkeleton(){
  const rels = carriedRelations(), nm = mechNames(rels);
  // the families it used, so the rows show where each line came from
  const fam = {}, pre = [];
  const HEAD = ["# one line per mechanism, then one per outcome.",
                "# a bare number is a weight, and may declare the range it runs over:",
                "#    k_half = 0.5 in [0.2, 1.0]",
                ""];
  const L = [];
  // a name for the elasticity, if a ces composition needs one
  const taken = new Set(carriedVars().map(varName));
  const RHO = taken.has("rho") ? "rho_ces" : "rho";
  /* Order matters: a term reading an outcome cannot be written before that
     outcome is. Emit whatever is ready, repeatedly, which is a topological
     sort and which the first version was not -- it put every term first and
     two lines of its own skeleton were refused. */
  const outs = outcomeVars(), have = new Set(carriedVars().filter(k =>
    !rels.some(r => r.to === k)).map(varName));
  const leftR = rels.slice(), leftO = outs.slice();
  for(let pass = 0; pass < 12 && (leftR.length || leftO.length); pass++){
    for(let i = leftR.length - 1; i >= 0; i--){
      const r = leftR[i];
      if(!have.has(varName(r.from))) continue;
      /* A member of the family the declaration admits, not the identity.
         Identity is increasing and it is not concave, so the old skeleton
         broke its own shape obligations on the first check -- a starting
         point should pass. */
      /* A declared shape gets a member of a family that carries it. NOTHING
         declared gets the identity, because famsFor([]) admits every family
         and taking its first one writes a logistic for a mechanism nobody
         has said anything about -- a default standing in for a declaration,
         which is the failure this bench exists to catch. Nothing declared
         also means nothing can break, so the identity is safe here in a way
         it is not once a shape is on the row. */
      const t = "t_" + nm.get(r.id), fams = propsOf(r).length ? famsFor(propsOf(r)) : [];
      if(fams.length){
        L.push(t + " = " + formExpr(fams[0].members[0][1], varName(r.from), abnd(r.from)));
        fam[t] = {fam:fams[0].fam, member:fams[0].members[0][0], reader:varName(r.from)};
      }else L.push(t + " = " + varName(r.from));
      have.add(t); leftR.splice(i, 1);
    }
    for(let i = leftO.length - 1; i >= 0; i--){
      const k = leftO[i];
      const w = rels.filter(x => x.to === k).map(x => "t_" + nm.get(x.id));
      if(!w.length || !w.every(t => have.has(t))) continue;
      /* The composition that was DECLARED, not always a sum. The first
         skeleton added the terms up whatever the chips said, so ticking
         multiplicative and starting from the skeleton broke the composition
         test on the skeleton's own line -- and a starting point should pass
         its own declarations, which is the only reason it is worth having. */
      const rule = (rulesOf(k) || [])[0] || "additive";
      /* ONE WRITER, in core/compose.js, because step 4.1 varies the rule now
         and two writers for one line would be two things to keep true. The
         note about why `ces` needs shares that sum to one is there with it. */
      if(rule === "ces" && w.length > 1 && !pre.length)
        pre.push(RHO + " = 2  # the elasticity. An interval here makes it a" +
          " class, but interval arithmetic cannot carry a variable exponent, so step 3.2" +
          " will shrug on anything downstream of it.", "");
      L.push(varName(k) + " = " + compWrite(rule, w, RHO));
      have.add(varName(k)); leftO.splice(i, 1);
    }
  }
  // anything left is in a cycle, which the grammar cannot express at all
  for(const r of leftR) L.push("# t_" + nm.get(r.id) + " reads " + varName(r.from) +
    ", which nothing can write first \u2014 the carried relations loop here");
  for(const k of leftO) L.push("# " + varName(k) + " is in that loop too");
  ARITH.fam = fam;
  return HEAD.concat(pre, L).join("\n");
}

function takeArith(r, byHand){
  const arr = x => Array.isArray(x) ? x : [];
  const a = {constants:arr(r && r.constants), lines:arr(r && r.lines),
    checks:arr(r && r.checks), note:String((r && r.note) || "").slice(0, 400)};
  if(!a.lines.length){
    ARITH.prop = null;
    /* What came back, named. "nothing was written" is true and useless: the
       answer that produces it is usually a well-formed object under other
       keys, and the first live call is not the place to be guessing. */
    const keys = (r && typeof r === "object") ? Object.keys(r).slice(0, 8) : [];
    const msg = keys.length
      ? 'nothing usable came back — it had ' + keys.join(", ") +
        ', and this page reads "lines": a list of {lhs, rhs}'
      : "nothing was written";
    if(byHand) ARITH.err = msg; else AI.err = msg;
    return;
  }
  ARITH.err = "";
  a.hand = !!byHand;
  const M = buildArith(a);
  /* A family is recorded for a line only where the line IS that member with
     its own reader substituted, whoever named it. Claiming a class and
     writing something else would make the enumeration a statement about a
     class the line is not in, which is worse than not enumerating at all.
     A constant in front is tolerated, because scaling preserves every shape
     the class declares -- compImplements tolerates it for the same reason. */
  ARITH.fam = famsOf(M, a.lines);
  let run = null, err = "";
  if(!M.steps.length) err = "nothing in it got past the grammar";
  else try{ run = checkArith(M, a); }
  catch(e){ err = "could not run it: " + (e && e.message ? e.message : "unknown"); }
  // the members were enumerated against a model that no longer exists
  CLS.rows = {}; CLS.at = "";
  ARITH.prop = {a, M, run, err};
  /* AN ACT IS ITS OWN DECISION. Writing the arithmetic yourself and checking
     it IS the decision to use it, so a further press saying "yes, the thing I
     just wrote" is a doubled decision and this page has a rule against those.
     It also stranded the run: Keep lives on a verdict row in the specification
     and "run them" lives in the conditions below, with nothing to say that one
     waits on the other, so the honest answer to pressing it was a message
     about a state rather than about anything anybody had decided.

     Two things are still held back as proposals. What the page could not run
     -- a refused line, a declared name never written -- because the reason is
     on the proposal row and nowhere else. And what BROKE an obligation,
     because keeping that is a real decision and the button says so.

     Asked-for arithmetic is never kept by itself: it was proposed by
     something else, and accept-or-dismiss is how everything proposed enters
     this file. */
  if(byHand && M.steps.length && !M.bad.length && !M.miss.length && run && !run.fail)
    arithKeep();
  // what was asked for seeds the editor; what was typed is already there
  if(!byHand) ARITH.text = arithToText();
}
/* The kept arithmetic as a model. Every row in the specification used to
   read ARITH.prop.M, so the moment a body stopped being a proposal the
   equations, the curves, the shape verdicts and the member strips all went
   blank -- which is what auto-keeping would have cost if it did not have
   this. Cached on the lines, because every row asks for it. */
let KEPTM = null, KEPTSIG = "";
function keptModel(){
  const sp = (typeof classSpec === "function") ? classSpec() : null;
  if(!sp) return null;
  // the declarations are in the key too: buildArith reads the carried set
  const sig = JSON.stringify(sp.lines) + "|" + JSON.stringify(sp.constants) + "|" + arithSig();
  if(KEPTM && KEPTSIG === sig) return KEPTM;
  try{ KEPTM = buildArith(sp); }catch(e){ KEPTM = null; }
  KEPTSIG = sig;
  return KEPTM && KEPTM.steps.length ? KEPTM : null;
}
function arithKeep(){
  const p = ARITH.prop;
  if(!p) return;
  ARITH.kept = {
    consts:p.M.consts, hand:!!(p.a && p.a.hand),
    /* THE VERIFIED CLASS TRAVELS WITH THE LINE. famsOf() has just checked that
       a line claiming a family really IS that member with its own reader
       substituted, and the result was being dropped here: a kept body carried
       no family at all, so the exploration set found no slot to offer and the
       class could not be enumerated over a model the page had itself written.
       What is recorded is what was VERIFIED, never what the answer claimed. */
    lines:p.M.steps.map(s => {
      const v = (ARITH.fam || {})[s.lhs];
      const ln = {lhs:s.lhs, py:s.py, kind:s.kind, why:s.why,
        mech:s.kind === "term" && s.rel ? p.M.nm.get(s.rel.id) : ""};
      if(v && v.fam && v.member){ ln.family = v.fam; ln.member = v.member; }
      return ln;
    }),
    miss:p.M.miss, note:p.a.note, checks:p.a.checks, sig:arithSig(),
    run:p.run ? {pass:p.run.pass, fail:p.run.fail, skip:p.run.skip,
      rows:p.run.rows.map(x => ({k:x.k, n:x.n, verdict:x.verdict, why:x.why}))} : null,
    at:new Date().toISOString().slice(0, 10)};
  xlog("arith", "Arithmetic kept", p.M.steps.length + " lines" +
    (p.run ? ", holding " + p.run.pass + " of " + (p.run.pass + p.run.fail) + " invariants" : ""));
  ARITH.prop = null;
  KEPTSIG = "";
  asaveLocal();
}


/* ---------------------------------------------------------------------------
   The declared classes, read back as obligations.

   Step 3.1 declares classes and until now nothing enumerated one. This does.
   Two kinds of class, and they are read differently:

   CONJUNCTIVE -- a shape class. Every member of "increasing and concave" is
   both, so the body has to be both, and a member it violates is a failure.

   DISJUNCTIVE -- a kind, an aspect, a role. The quantity is ONE of the kinds
   admitted, so the body only has to be consistent with one of them, and which
   ones it is consistent with is the informative answer rather than a verdict.

   Nothing re-runs the model per combination, because it does not have to. The
   model does not change across a kind class; only what the kind obliges it to
   do changes. A combination fails exactly when one of its members' obligations
   fails, so the product is never walked and the answer is still exact. */
const CTOL = 1e-7;
const d2of = ys => { const d = [];
  for(let i = 2; i < ys.length; i++) d.push(ys[i] - 2 * ys[i - 1] + ys[i - 2]);
  return d; };

function shapeVerdict(prop, w){
  const ys = w.ys, n = ys.length;
  const sc = Math.max(1e-9, Math.max.apply(null, ys) - Math.min.apply(null, ys));
  if(prop === "increasing"){
    const d = amono(ys, true);
    return d.worst < -CTOL * sc
      ? {ok:false, why:`it falls by ${Math.abs(d.worst).toFixed(4)} past ${w.xs[d.at].toFixed(2)}`}
      : {ok:true};
  }
  if(prop === "concave" || prop === "convex"){
    const d2 = d2of(ys), lim = CTOL * sc;
    const bad = prop === "concave" ? d2.filter(x => x > lim) : d2.filter(x => x < -lim);
    return bad.length
      ? {ok:false, why:`the curvature runs the other way at ${bad.length} of ${d2.length} points`}
      : {ok:true};
  }
  if(prop === "sigmoid"){
    const d2 = d2of(ys), lim = CTOL * sc;
    let flips = 0, last = 0;
    for(const x of d2){
      const g = x > lim ? 1 : x < -lim ? -1 : 0;
      if(g && last && g !== last) flips++;
      if(g) last = g;
    }
    return flips === 1 ? {ok:true}
      : {ok:false, why:`the curvature changes sign ${flips} time${flips === 1 ? "" : "s"}, and a sigmoid changes it once`};
  }
  if(prop === "f(0)=0") return Math.abs(ys[0]) <= 1e-9 ? {ok:true}
    : {ok:false, why:`it is ${ys[0].toFixed(4)} where its reader sits at the low bound`};
  if(prop === "f(1)=1") return Math.abs(ys[n - 1] - 1) <= 1e-6 ? {ok:true}
    : {ok:false, why:`it reaches ${ys[n - 1].toFixed(4)} at the top of the range, not one`};
  return {ok:true, skip:true};
}

function roleVerdict(role, M, r, term, w, mid, base){
  if(role === "gates"){
    const lo = Math.min.apply(null, w.ys), hi = Math.max.apply(null, w.ys);
    return (lo < -CTOL || hi > 1 + CTOL)
      ? {ok:false, why:`it runs ${lo.toFixed(3)} to ${hi.toFixed(3)}, outside the unit interval a gate sits in`}
      : {ok:true};
  }
  if(role === "generates" || role === "dissipates"){
    const y = varName(r.to);
    const moves = base[y] - runAt(M, mid.p, new Set([term]))[y];
    if(!(Math.abs(moves) > 1e-12))
      return {ok:false, why:"it contributes nothing at all to what it writes"};
    return (role === "generates" ? moves > 0 : moves < 0) ? {ok:true}
      : {ok:false, why:`it ${moves > 0 ? "adds" : "takes away"} ${Math.abs(moves).toFixed(4)}, and ${role} says the other way`};
  }
  return {ok:true, skip:true, why:role === "transfers"
    ? "conservation is over a pair of quantities and the role names one half of it"
    : "nothing numeric separates it from the others here"};
}

function kindVerdict(kind, k, runs){
  const vals = runs.map(r => r.S[varName(k)]).filter(afin);
  if(!vals.length) return {ok:false, why:"it never came back a number"};
  const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  if(kind === "propensity" || kind === "share")
    return (lo < -CTOL || hi > 1 + CTOL)
      ? {ok:false, why:`it runs ${lo.toFixed(3)} to ${hi.toFixed(3)}, and a ${kind} lies in [0, 1]`}
      : {ok:true};
  if(kind === "cost") return lo < -CTOL
    ? {ok:false, why:`it reaches ${lo.toFixed(3)}, and a cost is a magnitude that gets subtracted`}
    : {ok:true};
  return {ok:true, skip:true, why:"carries no numeric obligation that separates it from the rest"};
}

/* A test written as a predicate over the numbers, whether it came from step
   3.2's invariants or was asked for here. The four forms are the ones a
   browser can actually answer. */
function runPredicate(M, c, runs, off){
  const scope = new Set([...M.params.map(varName), ...M.consts.map(x => x.name),
    ...M.steps.map(s => s.lhs)]);
  const form = String((c && c.form) || "");
  if(form === "nonneg"){
    const e = readExpr(c.expr, scope);
    let worst = Infinity, at = "";
    for(const r of runs){
      const v = evalRPN(e.rpn, r.S);
      if(!afin(v)) throw new Error("it is not a number at " + r.tag);
      if(v < worst){ worst = v; at = r.tag; }
    }
    return worst < -CTOL
      ? {ok:false, why:`it reaches ${worst.toFixed(4)} at ${at}`}
      : {ok:true, why:`its lowest value over ${runs.length} points is ${worst.toFixed(4)}`};
  }
  if(form === "up" || form === "down" || form === "peak"){
    const xk = carriedVars().find(k => varName(k) === String(c.x)), yk = String(c.y);
    if(!xk || !M.params.includes(xk)) throw new Error(String(c.x) + " is not a free parameter here");
    if(!M.steps.some(s => s.lhs === yk)) throw new Error(yk + " is not something the arithmetic writes");
    const w = asweep(M, xk, yk, 20, off);
    if(w.ys.some(v => !afin(v))) throw new Error("the sweep returned something that is not a number");
    if(form === "peak"){
      const pk = apeak(w.ys);
      return pk.ok ? {ok:true, why:`one peak, at ${w.xs[pk.hi].toFixed(2)}, strictly inside the range`}
        : {ok:false, why:pk.why};
    }
    const d = amono(w.ys, form === "up");
    return d.worst < -CTOL
      ? {ok:false, why:`it runs the other way by ${Math.abs(d.worst).toFixed(4)} past ${w.xs[d.at].toFixed(2)}`}
      : {ok:true, why:"held over 21 points with the others at their midpoints"};
  }
  throw new Error("the form is not one this page can run");
}

/* Which composition rule an outcome's line actually implements.

   Structural, not sampled: the answer is exact and needs no tolerance. It is
   a test of SHAPE rather than of equality, because a weighted sum is still
   additive -- 0.5 * t_a + 0.5 * t_b aggregates additively and is not equal to
   t_a + t_b. So: a sum each of whose parts involves exactly one term is
   additive; a single product containing every term once is multiplicative; a
   nest of min or max over the terms is that.

   ces is read by cesParts below. It was the one chip you could tick and never
   satisfy: offered on every outcome, checked by nothing, and reported as
   "matches none of the five rules" when the line was a perfectly good power
   mean. */
function compImplements(M, k, terms){
  const st = M.steps.find(x => x.lhs === varName(k));
  if(!st) return null;
  let tree;
  try{ tree = simp(rpnTree(st.rpn)); }catch(e){ return null; }
  const T = new Set(terms), out = [];

  const parts = []; flatSum(tree, 1, parts);
  let addOK = parts.length > 0;
  const used = new Map();
  for(const p of parts){
    const f = []; flatProd(p.n, f);
    const ts = f.filter(g => g && g.t === "v" && T.has(g.v)).map(g => g.v);
    const rest = f.filter(g => g && !(g.t === "n") && !(g.t === "v" && T.has(g.v)));
    if(ts.length !== 1 || rest.length){ addOK = false; break; }
    used.set(ts[0], (used.get(ts[0]) || 0) + 1);
  }
  if(addOK && terms.every(t => used.get(t) === 1)) out.push("additive");

  const f2 = []; flatProd(tree, f2);
  const ts2 = [], rest2 = [];
  for(const g of f2){
    if(!g || g.t === "n") continue;            // a scale constant in front
    let base = g;
    while(base.t === "o" && base.v === "**" && isN(base.b)) base = base.a;
    if(base.t === "v" && T.has(base.v)) ts2.push(base.v); else rest2.push(g);
  }
  if(!rest2.length && ts2.length === terms.length &&
     terms.every(t => ts2.filter(x => x === t).length === 1)) out.push("multiplicative");

  for(const fn of ["min", "max"]){
    const got = new Set();
    const walk = n => {
      if(!n) return false;
      if(n.t === "v"){ got.add(n.v); return T.has(n.v); }
      if(n.t === "f" && n.v === fn) return walk(n.a) && walk(n.b);
      return false;
    };
    if(terms.length > 1 && walk(tree) && terms.every(t => got.has(t))) out.push(fn);
  }
  if(cesParts(tree, T, terms)) out.push("ces");
  return out;
}

/* ces, structurally. A power mean: every term raised to ONE shared exponent,
   those summed, and the sum raised to that exponent's reciprocal. additive is
   the case rho = 1 and multiplicative is the limit as rho goes to zero, which
   is what the chip means by "between the two".

   Nothing here needs the elasticity's VALUE, and that is the point. What makes
   a rule a constant-elasticity rule is that one exponent is shared by every
   term and the outer one inverts it; the value is a weight like any other and
   belongs in the parameter table, where an interval on it is what lets a
   proposition be proved over the elasticity rather than at it.

   Exact, like the other four: the reciprocal is read off the tree, either as
   1 / rho however it was bracketed, or as two numeric exponents whose product
   is one. A third spelling of the same mean is not recognised and the verdict
   says so rather than guessing. */
function cesParts(tree, T, terms){
  const f0 = []; flatProd(tree, f0);
  const core = f0.filter(g => g && g.t !== "n");     // a scale constant in front is fine
  if(core.length !== 1) return null;
  const pw = core[0];
  if(!(pw.t === "o" && pw.v === "**")) return null;
  const parts = []; flatSum(pw.a, 1, parts);
  if(parts.length < 2) return null;
  let ex = null; const used = new Map();
  for(const p of parts){
    if(p.sign < 0) return null;
    const f = []; flatProd(p.n, f);
    let tn = null; const rest = [];
    for(const g of f){
      if(!g || g.t === "n") continue;               // a weight on the term is fine
      if(tn === null && g.t === "o" && g.v === "**" && g.a.t === "v" && T.has(g.a.v)){
        tn = g.a.v;
        if(ex === null) ex = g.b; else if(!same(ex, g.b)) return null;
      }else rest.push(g);
    }
    if(!tn || rest.length) return null;
    used.set(tn, (used.get(tn) || 0) + 1);
  }
  if(!ex || !terms.every(t => used.get(t) === 1)) return null;
  if(same(pw.b, OP("/", NUM(1), ex))) return {ex};
  if(isN(pw.b) && isN(ex) && Math.abs(pw.b.v * ex.v - 1) < 1e-12) return {ex};
  return null;
}

/* Every obligation the declarations carry, answered against one model. */
function suiteAt(M){
  const out = [], vn = varName;
  const pts = asamples(M, 21);
  const runs = pts.map(x => ({tag:x.tag, S:runAt(M, x.p, null)}));
  const mid = pts[2], base = runAt(M, mid.p, null);
  const push = o => { out.push(o); return o; };
  const ALLK = KINDS.map(x => x[0]);

  for(const k of M.outs){
    const b = abnd(k), vals = runs.map(r => r.S[vn(k)]);
    const bad = vals.filter(v => afin(v) && (v < b[0] - CTOL || v > b[1] + CTOL));
    push({k:"bounds:" + vn(k), n:handName(k), group:"bounds",
      cls:bdec(k) ? `[${b[0]}, ${b[1]}]` : "none declared",
      ok:bdec(k) ? (!bad.length && vals.every(afin)) : true, skip:!bdec(k),
      why:!bdec(k) ? "no bound was declared for it, and the 0 to 1 is this page's default"
        : !vals.every(afin) ? "it is not always a number"
        : bad.length ? `it reaches ${Math.max.apply(null, bad.map(Math.abs)).toFixed(3)}, outside the declared bound`
        : `inside the declared bound at all ${runs.length} points`});

    const kinds = vKinds(k).length ? vKinds(k) : ALLK;
    const fit = [], miss = [];
    for(const kd of kinds){
      const v = kindVerdict(kd, k, runs);
      (v.ok ? fit : miss).push(v.ok ? kd : `${kd} — ${v.why}`);
    }
    push({k:"kind:" + vn(k), n:handName(k), cls:kinds.join(" | "), group:"kinds",
      ok:fit.length > 0, disj:true,
      why:(fit.length ? `consistent with ${fit.join(", ")}` : "consistent with none of them") +
        (miss.length ? `; not with ${miss.join("; ")}` : "")});

    const asp = vAspects(k).length ? vAspects(k) : ASPECTS.map(x => x[0]);
    const af = [], am = [];
    for(const a of asp){
      if(a !== "difference"){ af.push(a); continue; }
      const z = base && Math.abs(runs[0].S[vn(k)] || 0) <= 1e-9;
      (z ? af : am).push(z ? a : `difference — it is ${(+runs[0].S[vn(k)]).toFixed(4)} at the baseline`);
    }
    push({k:"aspect:" + vn(k), n:handName(k), cls:asp.join(" | "), group:"aspects",
      ok:af.length > 0, disj:true,
      why:(af.length ? `consistent with ${af.join(", ")}` : "consistent with neither") +
        (am.length ? `; not with ${am.join("; ")}` : "")});
  }

  for(const r of M.rels){
    const term = M.terms.get(r.id);
    if(!M.steps.some(s => s.lhs === term)) continue;
    const sweepable = M.params.includes(r.from);
    const w = sweepable ? asweep(M, r.from, term, 20) : null;

    const props = propsOf(r);
    if(props.length){
      if(!w) push({k:"shape:" + term, n:term, cls:props.join("+"), group:"shapes",
        ok:true, skip:true, why:`not swept: ${vn(r.from)} is written by something rather than free`});
      else{
        const broke = [];
        for(const p of props){ const v = shapeVerdict(p, w); if(!v.ok) broke.push(`${p} — ${v.why}`); }
        push({k:"shape:" + term, n:term, cls:props.join("+"), group:"shapes",
          ok:!broke.length,
          why:broke.length ? broke.join("; ")
            : `every member of the class is ${props.join(" and ")}, and so is this over 21 points`});
      }
    }

    const roles = rolesOf(r);
    if(roles.length){
      const fit = [], miss = [];
      for(const ro of roles){
        const v = roleVerdict(ro, M, r, term, w || {ys:[0]}, mid, base);
        (v.ok ? fit : miss).push(v.ok ? ro : `${ro} — ${v.why}`);
      }
      push({k:"role:" + term, n:term, cls:roles.join(" | "), group:"roles",
        ok:fit.length > 0, disj:true,
        why:(fit.length ? `consistent with ${fit.join(", ")}` : "consistent with none of them") +
          (miss.length ? `; not with ${miss.join("; ")}` : "")});
    }
  }

  /* The one declaration this step exists to make, and until now the only one
     the specification tests did not test: you could tick additive, write a
     product, and get a clean sheet. */
  for(const k of M.outs){
    const terms = M.rels.filter(r => r.to === k).map(r => M.terms.get(r.id))
      .filter(t => M.steps.some(x => x.lhs === t));
    if(!terms.length) continue;
    const impl = compImplements(M, k, terms);
    if(impl === null) continue;
    const rs = rulesOf(k), hit = impl.filter(x => rs.includes(x));
    /* One mechanism writes it, so the five rules are the same line and the
       declaration is untested rather than satisfied. It read as BROKEN for
       min, max and ces, which is a verdict about arithmetic nobody can write
       differently. */
    const solo = terms.length === 1;
    const ces = rs.includes("ces") && hit.includes("ces")
      ? " Its elasticity is a weight like any other: declare an interval for it in the parameter" +
        " table and step 3.2 proves over the class rather than at one member of it." : "";
    const cesmiss = rs.includes("ces") && !impl.includes("ces")
      ? " ces is read structurally \u2014 one shared exponent on every term, summed, and the sum" +
        " raised to its reciprocal, as in (t_a ** rho + t_b ** rho) ** (1 / rho). Another" +
        " spelling of the same mean is not recognised here." : "";
    push({k:"composition:" + vn(k), n:handName(k), group:"composition",
      cls:rs.length ? rs.join(" | ") : "none declared",
      ok:rs.length ? (solo || hit.length > 0) : true, skip:!rs.length || solo,
      disj:rs.length > 1,
      why:(solo
        ? "one mechanism writes it, so additive, multiplicative, min, max and ces are the " +
          "same line here and nothing in the arithmetic can tell them apart"
        : !rs.length
        ? "nothing is declared for it, so the line is whatever it says" +
          (impl.length ? " — which is " + impl.join(" and ") : "")
        : hit.length
        ? "the line is " + hit.join(" and ") + ", which is " +
          (rs.length === 1 ? "what you declared" : "one of the " + rs.length + " you declared")
        : impl.length
        ? "the line is " + impl.join(" and ") + ", and you declared " + rs.join(" or ")
        : "the line matches none of the five rules, so what it does is whatever it says and no declaration fixes it")
      + "." + (solo ? "" : ces + cesmiss)});
  }

  const extra = [...(ARITH.kept && ARITH.kept.checks || []).map(c => ({c, src:"agreed on step 3.1"})),
                 ...[...xtest.values()].map(c => ({c, src:"asked for here"}))];
  for(const {c, src} of extra.slice(0, 24)){
    const nm = String((c && (c.for || c.name)) || "test").slice(0, 60);
    try{
      const v = runPredicate(M, c, runs);
      push({k:"test:" + nm, n:nm, cls:src, group:"tests", ok:v.ok, why:v.why});
    }catch(e){
      push({k:"test:" + nm, n:nm, cls:src, group:"tests", ok:true, skip:true,
        why:"not run: " + (e && e.message ? e.message : "unknown")});
    }
  }
  return out;
}

/* The run. The weights get swept one at a time rather than as a product:
   three settings each over six weights is a number nobody reads, and the
   first weight that breaks something is what you came for. */
const CT = {rows:null, sweeps:null, at:"", err:"", busy:false, n:0};
function classSpec(){
  const A = ARITH.kept;
  if(!A || !(A.lines || []).length) return null;
  return {constants:(A.consts || []).map(c =>
      ({name:c.name, value:c.value, why:c.why, lo:c.lo, hi:c.hi})),
    lines:(A.lines || []).map(l => ({lhs:l.lhs, rhs:l.py, why:l.why})), checks:A.checks || []};
}
function runClassTests(){
  CT.err = ""; CT.rows = null; CT.sweeps = null;
  const spec = classSpec();
  if(!spec){ CT.err = ARITH.prop
    ? "a model is proposed in the specification above and has not been kept — Keep it on its row there and this runs against it"
    : "there is no arithmetic to run yet — write it in the specification above, or ask for it, and check it";
    return; }
  const M = buildArith(spec);
  if(!M.steps.length){ CT.err = "the kept arithmetic no longer reads against these declarations"; return; }
  /* Once, not per weight sweep. The sweeps re-run suiteAt twice per weight,
     and enumerating fourteen members inside each of those is a wait nobody
     asked for -- the form class is a property of the forms and the weights
     are not in it. */
  CT.rows = suiteAt(M).concat(formRows(M));
  const sweeps = [];
  for(const c of spec.constants) for(const f of [0.5, 2]){
    const alt = {constants:spec.constants.map(d =>
      d.name === c.name ? {name:d.name, value:d.value * f, why:d.why} : d),
      lines:spec.lines, checks:spec.checks};
    const M2 = buildArith(alt);
    if(!M2.steps.length) continue;
    const was = new Map(CT.rows.map(r => [r.k, r.ok]));
    for(const r2 of suiteAt(M2))
      if(!r2.ok && !r2.skip && was.get(r2.k))
        sweeps.push({k:r2.k, n:r2.n, c:c.name, f, why:r2.why});
  }
  CT.sweeps = sweeps;
  CT.n = spec.constants.length;
  CT.at = new Date().toISOString().slice(0, 16).replace("T", " ");
}



/* ---------------------------------------------------------------------------
   Derivation.

   Everything above this samples. A sweep over 21 points is evidence that a
   term is increasing; it is not a proof, and a term can dip between two of
   them. What follows derives instead, and it is only possible because the
   grammar is five operators and four functions wide: + - * / **, min, max,
   exp, log. That set
   is closed under differentiation except at min and max, which have corners.

   Three pieces, in order of what they buy:

   1. SYMBOLIC DIFFERENTIATION gives the derivative as an EXPRESSION rather
      than a number. Most of what a formal paper calls a proposition is a
      statement about that expression, so this alone is most of the distance.
   2. INTERVAL ARITHMETIC evaluates an expression over a box and returns an
      interval guaranteed to contain every value it takes there. If that
      interval sits above zero the expression is positive EVERYWHERE on the
      box -- proved, not sampled. It is sound and incomplete: it never lies,
      and it can fail to decide, which is why a verdict here has three values
      and not two. Bisecting the box and recursing turns a shrug into a
      region, and the region is the scope condition, derived rather than
      stated.
   3. THE IMPLICIT FUNCTION THEOREM gives the comparative static on a
      threshold without solving for the threshold. Where the first derivative
      vanishes it defines a threshold, and the threshold's derivative in a
      weight is minus the cross partial over the second derivative -- both of
      which are derivatives of something already in hand. The sign of that is
      what a formal paper reports, and it is available even where the
      threshold has no closed form at all.

   What none of it does is make the arithmetic true. What gets proved has the
   form "given these declarations, this follows". The arithmetic was proposed
   and kept because it survived some checks, not derived from any theory, and
   a formula reads as more authoritative than an interval -- so the condition
   travels with the result everywhere below. */

/* The tree, the calculus and the interval layer moved to kernel.js, loaded
   above, for the reason the grammar did: this is where the bench's central
   claim lives -- that a sign is PROVED over a declared box and not sampled --
   and it had no test on it at all. What stayed here is what touches the page:
   treeHTML and treeTex render, the three exports write for other tools,
   inlineOutcome needs the model, and mmWhy writes prose about a crossing. */

function treeHTML(n, p){
  p = p || 0;
  if(!n) return "?";
  if(n.t === "nd") return `<i class="mu">undefined</i>`;
  if(n.t === "n") return `<span class="mn">${+(+n.v).toFixed(6)}</span>`;
  if(n.t === "v") return `<i class="mv">${hesc(n.v)}</i>`;
  if(n.t === "u") return "\u2212" + treeHTML(n.a, 3);
  if(n.t === "f"){
    if(n.v === "exp") return `<i class="mv">e</i><sup>${treeHTML(n.a, 0)}</sup>`;
    if(n.v === "log") return `<span class="mu">ln</span>(${treeHTML(n.a, 0)})`;
    return `<span class="mu">${n.v}</span>(${treeHTML(n.a, 0)}, ${treeHTML(n.b, 0)})`;
  }
  if(n.v === "/") return `<span class="frac"><span class="fnum">${
    treeHTML(n.a, 0)}</span><span class="fden">${treeHTML(n.b, 0)}</span></span>`;
  if(n.v === "**") return treeHTML(n.a, 5) + `<sup>${treeHTML(n.b, 0)}</sup>`;
  const q = PREC[n.v];
  if(n.v === "+" && negOf(n.b)){
    const s2 = treeHTML(n.a, q) + " \u2212 " + treeHTML(negOf(n.b), q + 1);
    return q < p ? "(" + s2 + ")" : s2;
  }
  const op = n.v === "*" ? " \u00b7 " : " " + n.v + " ";
  const s3 = treeHTML(n.a, q) + op + treeHTML(n.b, q + 1);
  return q < p ? "(" + s3 + ")" : s3;
}



export { AI, AIQ, AITIP, ALINE, AMODEL, PVOC, ARITH, AWGT, CLS, CT, CTOL, KEPTM, KEPTSIG, READ, abnd, aiAsk, aiBrief, aiCap, aiMark, keyGet, keyHas, keySet, aiErrHTML, aloadLocal, arithKeep, arithSig, arithSkeleton, arithToText, asaveLocal, bdec, buildArith, cesParts, classSpec, compImplements, d2of, keptModel, kindVerdict, parseArith, requiredNames, roleVerdict, runClassTests, runPredicate, shapeVerdict, suiteAt, takeArith, treeHTML, wbnd, wdec, xinv, xloadLocal, xsaveLocal };

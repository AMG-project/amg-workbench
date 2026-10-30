/* AMG bench, page script 3 of 22: MODULES, DEPOSIT and CHAIN -- what the track is made of.
   One shared global scope, loaded in order. See page/README.md. */
import { ARITH } from "./08-ask.js";
import { PROPS } from "./09-derive.js";
import { derivedClaims, resultsFile } from "./05-explore.js";
import { exportDerived, exportModel, exportPass, exportResults, exportScen, passText } from "./16-worklists.js";
import { modelPy } from "./11-classes.js";
import { scenFile } from "./17-scenarios.js";
/* =====================================================================
   MODULES — the property-rights statics page is contained here.

   The first version of this tool opened on a formal model of purpose
   integration and property-rights channels. That is step 1.2 of the
   generator, not step 1.1, and reading it first made the bench look like
   an argument about governance rather than an instrument for curating a
   literature. It is therefore OFF.

   To put it back: set `statics.on` to true. Nothing else references it.
   To delete it for good: remove this block and the ghost-card branch in
   renderTrack() that reads MODULES.statics.
   ===================================================================== */
const MODULES = {
  statics: {
    on: true,
    href: "statics/index.html",
    label: "Comparative statics",
    blurb: "One panel per free parameter of whatever model the chain closed, with the share of the declared class that moves the same way."
  }
};

/* What has to exist between the declarations step 3.1 hands on and a model
   whose output lands on step 3.1. Twelve of the thirteen are built. The one
   that is not is the arithmetic, and it is partial rather than missing: step
   3.2 proposes a body, runs it and checks it, and what no interface can do is
   warrant it. Counted rather than asserted -- the list below is the count. */
/* The five decisions a deposit makes, and none of it is built. Kept as data beside
   CHAIN because it is the same device: a list that counts itself, so a gap is
   stated rather than left to be inferred from an absence. */
const DEPOSIT = [
  {n:"The address", f:"a repository, and an archive that mints a DOI",
   w:"Two different jobs. A Git host carries the code and the history and lets somebody open an issue against it; an archive pins one state to an identifier that still resolves in ten years. Zenodo does the second from the first in one step; OSF does both, less sharply. The call asks for infrastructure others have a reasonable chance of accessing, which rules out anything sitting behind a licence."},
  {n:"The material", f:"the relationships travel, the papers do not",
   w:"The corpus is 52 articles somebody else owns. The material is what was read off them — 1080 relationships, 422 constructs, the scale and bearer recorded for each — with an identifier per paper so a replicator obtains the texts themselves. Not a limitation to apologise for: the claim table is the reusable object and the PDFs never were."},
  {n:"The licence", f:"code and claim table are different objects",
   w:"Something permissive for anything executable, and a data licence for the table, which is a database and not a program. The common failure runs in both directions — a permissive licence over somebody else's extracted text, or a restrictive one over the part that was meant to be reused."},
  {n:"The transcripts", f:"step 3.1's exchanges",
   w:"The arithmetic was proposed by a language model and the rows say what happened when it ran. Shipping the exchange makes the run replayable without being paid for twice, and makes the proposal auditable by somebody who thinks it was wrong. Withholding it turns the model's provenance from a record into a claim."},
  {n:"The version", f:"a version, not a link",
   w:"A curation is not one thing: it is whatever state the declarations were in when a conclusion was read off them, and the history on this page exists because that state moves. Without a version in the citation, a reader who disagrees cannot tell whether they are disagreeing with the same object."},
];

/* The action model, as the files it is made of.

   Step 4.2 shares a building block, and a building block is not one artefact:
   every step leaves something, and a reader who disagrees with a conclusion
   wants the step the disagreement is about rather than the whole of it. So each
   part is addressable, and the last row is all of them at once -- which is what
   a citation should pin to.

   `has()` is asked each render rather than computed once: four of these exist
   only after step 3.1 has kept an arithmetic, and a row that offered a download
   of nothing would be worse than a row that says it has nothing. The four rows
   for steps 1.1 to 2.1 share one file, because what those steps produce IS the
   decision record -- a scope, a merge, a weighting and a join are decisions and
   nothing else. Saying that once is more honest than four rows pretending to
   four files. */
/* `at` is the step a part comes out of, or the first and last of a range, as
   the step numbers the page itself uses -- never a written-out label. These
   held the strings "1-4", "5", "6", "6" and "1-8", which were the step
   numbers of an older arrangement AND strings at that, so stepNo() found no
   block for any of them and all five rows on step 4.2 read "STEP 1.1". */
const PARTS = [
  {k:"pass", at:[1, 4], n:"Every decision taken, in order",
   f:"passes.tsv · the decision record",
   w:`A scope, a merge, a weighting and a join are decisions and nothing else, so what steps
      1.1 to 2.1 produce is this one file: every judgement with its date, its target and its
      reason, in the vocabulary <code>index/passes.tsv</code> already uses.`,
   has:() => true, run:btn => exportPass(btn),
   file:"passes.tsv", text:() => passText()},
  {k:"model", at:5, n:"The action model, as a Python file",
   f:"curated_model.py · declarations and arithmetic",
   w:`The declared classes and the kept arithmetic, as a file <code>check_contract()</code> can
      read. It is the only part that is executable on its own.`,
   has:() => !!(typeof ARITH !== "undefined" && ARITH.kept), run:btn => exportModel(btn),
   file:"curated_model.py", text:() => modelPy()},
  {k:"results", at:6, n:"The propositions, with the region each holds on",
   f:"results-*.json · amg-result, versioned",
   w:`Every signed conclusion with the share of the declared box its sign was proved on, the
      method that settled it, and the stamps saying which bench and which corpus.`,
   has:() => !!(typeof PROPS !== "undefined" && PROPS.out &&
     PROPS.out.props.some(x => !x.err)), run:btn => exportResults(btn),
   file:"results.json", text:() => resultsFile()},
  {k:"claims", at:6, n:"The conclusions as relationship rows",
   f:"derived-claims.tsv · readable back into a corpus",
   w:`The same conclusions in the shape a claim table takes, so a curation can read back what a
      model derived and weigh it beside what papers assert. This is the row that closes the
      loop.`,
   has:() => !!(typeof PROPS !== "undefined" && PROPS.out &&
     PROPS.out.props.some(x => !x.err)), run:btn => exportDerived(btn),
   file:"derived-claims.tsv", text:() => derivedClaims()},
  {k:"scen", at:[1, 8], n:"All of it, as one project file",
   f:"*.amg.json · amg-scenario, versioned",
   w:`Every decision on every step, every answer a model proposed and a scholar accepted with
      the prompt that asked for it, the rounds and the log. A replay reads this instead of
      calling a model, which is what makes the run reproducible rather than merely described.
      <b>This is the one a citation should pin to.</b>`,
   has:() => true, run:btn => exportScen(btn),
   file:"scenario.amg.json", text:() => scenFile()},
];

const CHAIN = [
  {s:"ok", n:"State what the model needs", f:"step 3.1 · Quantities",
   w:"The model's quantity written in the corpus's own vocabulary — a degree, at firm level, on an ordered scale, bounded. It used to be nowhere, so the binding was left hunting for the least-bad fit among whatever step 1.2 had produced."},
  {s:"ok", n:"Bind a construct to a quantity", f:"step 3.1 · Quantities",
   w:"Was ten entries hand-written in a build script with a note each. It is a decision taken in the open now, with the signature the corpus recorded printed beside the choice."},
  {s:"ok", n:"Check the binding is commensurable", f:"the page above",
   w:"Its third section: the constructs nearest each quantity, the seeds shaded, more pulled in as the tightness loosens, and a signature in red wherever one sits at a different level of analysis from the seed."},
  {s:"ok", n:"Say what each relation does", f:"step 3.1 · Mechanisms",
   w:"One of six roles. The literature almost never states it, and without it a relation can become a term but never a mechanism — so it could never be switched off, and ablation is the test the method runs."},
  {s:"ok", n:"Declare which mechanisms substitute", f:"step 3.1 · Substitutes",
   w:"Before the run, not after it. Any two writing the same quantity are proposed; disable either of a substituting pair alone and nothing moves, so a loop that has not been told reports that neither mattered."},
  {s:"ok", n:"Declare the class of forms", f:"step 3.1 · Edit, on a relationship",
   w:"In the kernel's own property vocabulary, so what is declared here is what check_family() verifies against members rather than a named function somebody settled upon."},
  {s:"ok", n:"Say how the mechanisms combine", f:"step 3.1 · Composition",
   w:"Additive, multiplicative and min are three different theories of the same mechanism set, with different predictions and different ablation signatures. No paper states which, so it is declared here — as a class, swept like the shapes."},
  {s:"ok", n:"Say what must be true of the result", f:"step 3.1 · Invariants",
   w:"Derived from what was already declared rather than asked for: an aspect of difference implies zero at the baseline, a transfer implies conservation, a share implies adding up. Predicates over behaviour, not over source, which is what lets the arithmetic stay in a file and still be held to the declarations."},
  {s:"part", n:"Write the arithmetic", f:"step 3.1 \u00b7 The arithmetic",
   w:"The one thing no declaration fixes. A body is proposed in a grammar that is arithmetic and nothing else, walked rather than compiled, run over a fixed sample of the declared box, and held to the invariants \u2014 and the file carries what held and what did not. Partial rather than built, because what survives being run is still not what anybody argued for."},
  {s:"ok", n:"Enumerate the class", f:"core/scope-run.js · tests/scope.test.mjs",
   w:"100 form combinations × 24 parameter settings, seed 7, kept apart so a conclusion robust to one and fragile to the other is reported as such."},
  {s:"ok", n:"Write the conclusions as predicates", f:"core/scope-run.js · SCOPE_CLAIMS",
   w:"Nine of them, each a function that can fail, which is what makes a conclusion testable rather than asserted."},
  {s:"part", n:"Put one relationship to every model", f:"the tool went with the engine",
   w:"It caught a real one while it existed: a relationship written against a derived convenience reported 0 of 24, which looks exactly like a robust failure and was a portability bug. The script imported the Python engine and went when it did, and there is one model here now — so this is the row that says what a second one would need, and the finding stands whether or not the instrument does."},
  {s:"ok", n:"Report back into the bench", f:"scripts/export_bench_model.py",
   w:"The relations, the conclusions and the scope grid, as model-report.js — which is what step 2.1 imports and step 3.1 runs."},
];

export { CHAIN, DEPOSIT, MODULES, PARTS };

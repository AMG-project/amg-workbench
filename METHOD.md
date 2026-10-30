# The method, specified

*What a conforming run of the Action Model Generator is, written so that it can be followed by other software, or by hand, and produce an action model somebody else can check.*

This specifies the **procedure**. [`schema/AMG-FORMAT.md`](schema/AMG-FORMAT.md) specifies the **file** a run produces. Neither depends on the workbench in this repository: that is one implementation, and the point of writing both down is that it should not be the only one.

---

## 1. What a run is

A run takes the relationships a literature publishes and produces a formal model of them, together with the conclusions that follow and the region each conclusion holds on.

It has eight steps in four phases. The steps are ordered because each hands the next a stated quantity, and a run that takes them out of order is not a shorter run but a different one: a model closed before the constructs are settled is a model of something nobody named.

A run is **not** a derivation of truth about the world. It establishes how far a conclusion survives a declared class of functional forms and a declared region of parameters. That is a statement about a model.

## 2. The invariants

These hold at every step. An implementation that breaks one is not a faster implementation of this method; it is a different method, and the conclusions it produces do not mean what conclusions from this one mean.

**I1. Nothing is defaulted silently.** Every choice the literature leaves open is either declared, with who declared it and when, or shown as undecided and counted. A default that cannot be distinguished from a decision is the failure this method exists to prevent.

**I2. A proposal is parsed before it is seen.** Where a language model is asked for anything, what it returns is checked against the declared identifiers and the closed vocabularies first. What falls outside them is counted and not written. Nothing a model proposes takes effect without a human act, and the record says which of the two chose each declaration.

**I3. A sign is proved or refused, never sampled into a verdict.** Undecided is a verdict and is reported as one, with the share of the declared region that could not be settled. An implementation may sample to explore; it may not report a sampled result as a proved one.

**I4. A conclusion carries its region.** No signed proposition travels without the part of the declared space its sign was established on.

**I5. A conclusion carries the class it was read against.** A robustness claim is meaningless without the set of form combinations it quantifies over, and that set is **declared before** the findings are read against it. A set chosen after seeing the results is not a robustness check.

**I6. What comes from outside is recorded, not promoted.** A result returned by another engine is re-derived in this method's own grammar before it may be called proved. One that cannot be re-derived is kept with its provenance and marked unverified. This applies identically to a computer algebra system, a colleague's script, and a language model.

**I7. The denominator travels.** Retained findings are reported against the number derived, and against the number that arrived from somewhere other than this model's own derivation. Reporting a retained set alone is the file-drawer problem.

**I8. Refusal is by name.** Whatever cannot be warranted is refused with the reason, in the vocabulary of the thing refused. Nothing is approximated into a form that fits, and nothing is dropped silently.

**I9. A run is replayable from its own record.** The prompts asked and the answers accepted travel with the run, so that a reader can re-read it rather than re-ask it, and without access to whatever model was used.

**I10. The corpus is cited even where it cannot travel.** Published articles are usually somebody else's copyright. What was read off them travels; each source is identified so the reading can be performed again by whoever obtains them.

## 3. The steps

Each is given as what it **decides**, what must be **declared**, what must be **refused**, and what it **hands on**. Numbering is the method's, and an implementation should keep it, because a conclusion is cited against the step that produced it.

### Phase 1 — Build the core model

**1.1 Scope the literature.** *Decides* which published work counts as this literature. *Declares* the frame: the outlets in scope, the traditions admitted, and the threshold below which a construct is not carried forward. *Refuses* to infer the frame from the corpus: a source whose outlet nobody admitted stays in the corpus and out of scope rather than disappearing. *Hands on* a set of sources and the relationships read from them, each traceable to the source it came from.

**1.2 Select the constructs.** *Decides* which named quantities the model will carry, and which named quantities are the same quantity. *Declares* each merge, by hand. *Refuses* to merge on a similarity score: a score may propose, and the decision that two constructs measure one thing is the scholar's, because it changes how much evidence every statement between them has. *Hands on* the constructs with their signatures — level, scale, bearer, stock or flow.

**1.3 Weigh the relationships.** *Decides* which relationships are carried, and on what evidence. *Declares* the bars: what a relationship must satisfy on specification, commensurability and evidence, and whether failing a bar fades a relationship or removes it. *Refuses* to resolve disagreement among sources by counting: where the sources behind a relation assert different signs, the relation carries all of them. *Hands on* the relations with the relationships under them, each with its sign, its basis, its verbatim quote and the scope its own source stated.

### Phase 2 — Join streams of literature

**2.1 Join other literatures.** *Decides* which constructs from different bodies of work are one construct. *Declares* each join, and files it with neither side. *Refuses* to curate two literatures together: each is scoped, selected and weighed on its own terms first, because a frame applied to a body of work it was not chosen for is not a frame. *Hands on* one construct set spanning the literatures joined.

### Phase 3 — Explore

**3.1 Operationalize the model.** *Decides* what each quantity is, what each relationship may do, the range of each parameter, and the arithmetic that closes the model. *Declares* a class of functional forms for each relationship, with the properties defining membership, checked numerically on every member. *Refuses* a form outside a declared family, a role outside the vocabulary, an arithmetic that does not read against the declarations, and any quantity whose kind or bounds nobody set. *Hands on* a closed model and the class it admits.

**3.2 Derive the findings.** *Decides* which conclusions the scholar stands behind. *Declares*, before deriving, what the scholar expects — and the expectation is closed once the derivation is run, because one recorded afterwards is worth nothing. *Refuses* to settle a sign by trial; to retain anything automatically; and to call proved a result that came from elsewhere and cannot be re-derived here. *Hands on* the retained findings, each with its verdict, its region and the share that could not be settled.

*Within 3.2, optionally, a finding is taken to data.* This decides nothing about the model. It *declares* which measured variable stands in for which construct, which is a measurement decision and belongs to the scholar. It *refuses* to choose that variable, and refuses to mark what comes back as verified. It *hands on* a recorded result, attributed and unverified, sitting beside the proof rather than over it. There are eight steps and this is not a ninth: a measurement is not a stage of the method, and treating it as one would imply that a run without data is incomplete.

### Phase 4 — Finalize

**4.1 Finalize the findings.** *Decides* the class of form combinations the findings are read against. *Declares* that set before running it. *Refuses* to merge the combinations that contradict a finding with those the search could not settle, because those are different facts. *Hands on* each retained finding with its validity domain and its class tally.

**4.2 Share the action model.** *Decides* where the work goes, what travels, under what licence, whether the exchanges with any model travel, and what a citation pins to. *Declares* all five, each with the day it was made. *Refuses* to ship what a declaration withheld, in every file including the report. *Hands on* the action model as one file, conforming to `AMG-FORMAT.md`, with the material it points into beside it.

## 4. What a conforming implementation must refuse

Restated as a checklist, because these are the places where an implementation under pressure will be tempted.

- A sign reported as proved that was obtained by sampling.
- A robustness figure without the class it quantifies over.
- A conclusion without the region it holds on.
- A retained set without its denominator.
- A merge, a bar or a bound applied without a record of who set it.
- A proposal from a model applied without a human act.
- A result from another engine called proved without re-derivation.
- A verbatim span shipped where a declaration withheld it.
- A refusal expressed as an empty result rather than as a reason.
- A quantity whose scope was stated by its source and silently generalised.

## 5. What the method does not do

It does not establish that a proposition is true of organizations. It does not weigh parsimony against plausibility. It does not quantify over which families of functional form exist to be declared from, which is the judgement that remains most completely the modeller's. It does not decide whether two sources that assert different signs disagree, because that depends on whether their stated populations overlap and nothing in the method reads a population from a sentence.

Each of those is a boundary rather than a defect, and an implementation should say so where a reader would otherwise assume otherwise.

## 6. Telling a conforming run from a non-conforming one

A run conforms if its action model can be read against `AMG-FORMAT.md` **and** the following can be answered from the file alone:

1. How many propositions were derived, and how many retained?
2. For each retained finding: which bounds did somebody declare, and which are defaults?
3. For each retained finding: over what region does the sign hold, and what share was not settled?
4. For each retained finding: which sources stand behind it, what did each assert, and what scope did each state?
5. For each declaration: who made it, the scholar or a model?[^1]
6. What was withheld, and on whose declaration?
7. What does the run say it does not establish?

A file that cannot answer all seven describes a run that did not conform, whatever software produced it.

[^1]: Question 5 was not answerable from the file alone until this document was written. Invariant I2 was implemented — the decision record carries, per declaration, which of the two chose it — but the action model's own declaration list distinguished only *declared* from *default*, so a reviewer reading the report without the record beside it could not tell a scholar's declaration from an accepted proposal. Writing the specification is what found it, which is the argument for writing one: a specification that matched its only implementation would be describing that implementation rather than specifying a method. Each declaration now carries `who` as well as `by`, and the report states the split under every finding.

# The action model, as a format

*`amg-report` v1. The specification of the file this instrument exists to produce, written so somebody who has never seen the workbench can read one, check one, or write a producer for one.*

Machine contract: [`report.schema.json`](report.schema.json). Prose twin: `REPORT.md`, rendered from the same object. Reference implementation: `docs/bench/core/report.js`, about 400 lines, which depends on nothing outside `core/`.

---

## 1. What it is for

Everything else this workbench writes is a part. A result in one file, its certificate in another, the claims underneath it in a third, the decisions that produced all of it in a fourth. Assembling those into an argument is work, and leaving that work to a reviewer is how a format fails at the only job it has.

This is the whole argument in one object, limited to the findings somebody decided to stand behind.

Two readers are served by one object. A reviewer reads `REPORT.md`. A machine reads `report.json`. Neither is a summary of the other: they are the same content at two depths, and where they differ it is only that the prose says what a list of several hundred interval enclosures amounts to while the data carries the enclosures.

## 2. The one test of the format

A reader must be able to walk this, in one direction, without opening a second file:

> the sentence → the derivative as an expression → the box, with **which bounds somebody declared and which are defaults** → the certificate, every sub-box with its interval enclosure → the mechanisms it rests on, **and the ones it does not** → the relations under those mechanisms → the claims under those relations → the papers, their verbatim quotes, and **the scope each paper stated** → any empirical test, with the measurement decision behind it

If a link in that walk needs another file, the format has failed. Everything in §3 follows from this sentence.

## 3. Six properties, and why each is in the format rather than left to a producer

**It embeds rather than references.** The deposit already ships the result, the certificate and the literature as separate files, and this repeats them. The duplication is deliberate: the alternative is a reviewer auditing one finding with five files open. It is made safe rather than tolerated, because a conforming producer must **hand the generator the objects the standalone files are written from** rather than rebuilding them. The embedded copy cannot drift from the original because it is the original.

**It carries its denominator.** `selection` reports how many propositions the model derived against how many are reported. Reporting the retained set without the number it was drawn from is the file-drawer problem. Two populations are kept apart, because a board may hold findings the model never derived — returned from an outside engine, or arrived with another scholar's model — and counting those against the derivation produces a denominator smaller than its numerator. A producer that cannot compute `derived` must omit the report rather than guess it.

**It names the defaults.** `scope.declared` and `scope.defaulted` are separate lists. A sign proved over a bound nobody set is proved against an obligation nobody took on, and in any format that merges the two the reader cannot tell. This is the smallest field in the specification and the one most worth refusing to drop.

**It presents dissent and refuses to adjudicate it.** Where the claims under a relation assert different signs, each claim appears with the scope its own paper stated, verbatim, and `reading` says plainly that nothing here judges whether the populations overlap. A tally cannot tell a contradiction from a scope difference: two papers asserting different signs may be about populations that never meet, and two asserting the same sign may differ on shape, magnitude and bearer. Agreement gets the same treatment, because *n* papers agreeing is not corroboration until a reader can see whether they measured the same thing. `agree` means *every claim asserts one sign*, nothing more, and the field is named for what it measures rather than what a reader might want it to mean.

**It is bound by the withholding declarations.** The report carries verbatim spans. Where the depositor declared that those do not travel, each claim carries `quote_withheld` in place of `quote` and the report says at the top that it did so. A producer that ships the quotes anyway leaks exactly what the depositor withheld, and the fact that the leak is inside a different file is no defence.

**It says how to regenerate itself.** `provenance.regenerate` carries the command, and `provenance` carries the bench, the corpus and the **registry of forms**. A robustness figure that does not say which registry it was read against is not checkable, so that field is required rather than optional.

## 4. Modularity

One module per retained finding, each self-contained by §2, so a scholar building on one finding can take that module alone. A deposit may carry the report whole or split one file per finding; both are conforming.

## 5. What a conforming producer must not do

- **Must not** report a retained set without `selection.derived`.
- **Must not** merge declared bounds with defaulted ones.
- **Must not** emit a verdict on whether papers agree beyond the sign tally.
- **Must not** carry quotes where a declaration withheld them.
- **Must not** mark anything returned from outside as verified. `empirical.verified_here` is always false.
- **Must not** omit `limits`. A format that makes it optional will see it omitted.

## 6. Generalizability: audited 25 October 2026

The format is specified for any literature and any model. This section records the audit rather than asserting the result, because the first draft failed it in two places.

**Two defects found and fixed.** The schema described one field by citing this project's own corpus (*"in the shipped corpus 380 of 1,080 state no scope"*), which reads as definitional in a document that defines a format; it now states the property without the numbers. And the reference producer wrote *"The 52 articles are other people's copyright"* into every report, which would have said 52 over a corpus of any size; it is counted from the corpus now.

**What was checked and is clean.**

| | |
|---|---|
| Vocabulary | No field name, enum or required value names a construct, a theory, a journal or a discipline. `outcome`, `parameter`, `mechanism`, `relation`, `claim`, `paper`, `scope` are the vocabulary, and each is a role in an argument rather than a thing in one literature. |
| Numbers | No count, threshold or magnitude in the specification comes from this project. The one example in §2 of the schema is a shape, not a figure. |
| Signs and bases | `sign` and `basis` are free strings, not enums, so a corpus with a different sign vocabulary is representable without amending the format. |
| Method | `certificate.method` is a string. Interval arithmetic is what this instrument happens to use; a producer that proves its signs another way says so in that field and conforms. |
| Scale | The format has no cap on findings, claims, boxes or papers. Nothing assumes a corpus is small or a model is. |
| Subject matter | Removing the shipped corpus and substituting another requires no change to the schema or to `core/report.js`. |

**One honest dependency.** `selection.rule` defaults to a sentence naming this instrument's own step numbering. That is a statement about the producer rather than about any literature, and a different producer supplies its own. It is noted here rather than removed, because a default that describes the only producer there is would otherwise look like a property of the format.

**What this audit cannot establish.** That the format is adequate to a literature we have not tried it on. It establishes only that nothing in it is *about* corporate purpose, which is a weaker and checkable claim. The stronger one needs a second literature and is named as a risk in the proposal.

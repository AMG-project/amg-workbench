# Ethics, access, and what this does with your data

Written for a reader deciding whether this is responsible infrastructure, not
only whether it works. Everything below is a property of the code in this
repository, with the file or the check that holds it.

## Nobody needs a key, an account, or a particular vendor

The workbench is a static page. Serve the directory, open the page, and all
eight steps work: the corpus is in the page, the engine is in the page, the
proofs run in the browser. There is no back end, no API key and no sign-in.

Where the page offers to fill something in, **what answers is whatever model the
host provides** — on claude.ai that is Claude, and the page cannot name it,
because the capability it asks does not say. It is written as "an LLM"
throughout because nothing downstream depends on which one it is: every answer
is parsed against the declared ids and the closed vocabularies before it is
shown, anything outside them is counted rather than written, and the same path
accepts an answer typed in by hand or returned by Mathematica. On a host that
offers no model, those buttons are absent and everything else is unchanged.

That is a deliberate response to the call's accessibility gate. A result that
can only be reproduced by somebody with the same paid model is not reproducible,
so nothing load-bearing here depends on one.

## Nothing is uploaded

Every decision lives in `localStorage`, in that browser, on that device. Clear
the site data and it is gone; nobody else can see it. There is no telemetry, no
analytics and no outbound request except the one that asks the host's model a
question you pressed a button to ask.

Two ways out, both chosen by you. **Export as a file** writes the scenario to
your disk and works everywhere. **Save to the workbench** puts it in the host's
own document store, where a co-author can open it; it exists only on a host that
offers one, and the button is absent otherwise.

## A file somebody else wrote is treated as hostile

The exchange format is the point of the thing, and it is also the attack
surface. On 23 October 2026 two payloads in a schema-valid scenario file ran
script in the page that opened it. Both are closed, and the durable part is the
test: `tests/hostile.mjs` opens a scenario carrying a tagged payload in each of
fifteen free-text fields, walks all eight steps, presses sixteen controls, and
fails by naming the field if any of it executes or reaches the markup raw. It
runs in `make check`.

The three answers are kept apart on purpose, because they are not the same
problem: text is escaped, a colour reaching a style attribute is **checked**
against a closed set because escaping would still let it say anything CSS can
say, and a number is coerced and named as not a number if it is not one.
`docs/bench/core/safe.js`, and [REFUSALS.md](REFUSALS.md) for the rest.

## Every model call is recorded, and the record travels

A scenario carries the prompt that asked for each proposal, the answer that came
back, which of the two of you accepted it, and when. That is what makes a run
replayable rather than merely described: `data/transcripts/` is deliberately
**not** gitignored, so a reader replays the recorded calls with no API key of
their own.

The provenance is per declaration, not per session. A reader of a finished model
can see which declarations a human chose, which a model proposed and a human
accepted, and which the page defaulted — and the last of those is always marked,
because a default is never a declaration.

## What is not in this repository, and why

The curation behind the corpus — the construct registry, the claim table, the
papers and the record of every merge — lives in a separate repository. The
full texts it was built from are licensed and cannot be redistributed, so they
are not committed anywhere, here or there.

What ships in this repository is derived and citable: construct ids, the
signature each paper recorded, claim ids with their sign and epistemic status,
paper ids, and the counts. Every relationship traces to the paper that asserted it by
id, so a reader with library access can check any of them. The corpus file is
stamped with the commit it was built from, so a number in a paper can be tied to
a build.

Licence: MIT, in `LICENSE`.

## Judgement is left where it belongs

**Merging is done by hand.** The unit here is the nanopublication's, and that
format rests on a registry giving every concept one identifier; this literature
has none. So merging two constructs is the only operation that changes how much
evidence a statement has, and it does not only raise it: merged harder, 22 of
152 statements carry more than one paper, and harder still, 7 of 29, because
collapsing two constructs can delete the statement between them instead of
pooling it. That is the argument for a curator and against a threshold, and the
page makes it where the decision is taken.

**The bench proposes and checks; it does not conclude.** Nothing returned from
outside is called proved. A conclusion carries the region of the declared space
its sign was proved on, and where the arithmetic cannot decide, the row says so
rather than reporting the direction it was leaning.

## What could still go wrong

- **A plausible declaration that is wrong.** A model can propose a bound, a
  shape class or a combination rule that parses, passes every check and is not
  what the literature says. The page cannot tell. What it can do, and does, is
  record who chose it and show what rests on it: the review names the
  declarations every retained finding depends on, so a set of six findings
  resting on one choice reads as six wide and one deep.
- **A conclusion read without its region.** The bench always carries the share
  of the box a sign was proved on; a reader quoting the sentence and dropping
  the share has a stronger claim than the model made. The LaTeX export dropped
  the declared box for a while, which is exactly that failure, in the one export
  that goes into a manuscript. It is fixed and tested.
- **The corpus is one scoping decision.** 52 papers chosen by a protocol in the
  review repository. A different scoping gives a different model, and the
  scoping is a step in the method rather than a given, which is why it is step
  1.1 and not a configuration file.

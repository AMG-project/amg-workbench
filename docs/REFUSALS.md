# What the bench will not do

A tool that always answers is easy to build and hard to trust. This is the list
of places where this one declines instead, each with the check that keeps it
declining. Every check named here runs in `make check`.

The list is here because it is the part of the design that is hardest to see
from the outside and the part most worth reviewing. A reader who wants to know
what the bench adds over running the model himself should read this rather than
the feature list.

## A file somebody else wrote is untrusted input

The scenario format exists to be exchanged: a scholar deposits one, another
opens it, and every free-text field in it was written by somebody else.

| | |
|---|---|
| A scenario file cannot run script in the page that opens it | `core/safe.js`, and `tests/hostile.mjs` opens a schema-valid scenario carrying a tagged payload in each of fifteen fields, walks all eight steps and presses sixteen controls. Two of those payloads **did** execute before 23 October 2026 |
| A colour from a file is checked, not escaped | Escaping would leave it able to say anything CSS can say, `url()` included, without ever closing the quote. `cssColor()` admits three or six hex digits or a bare CSS name and falls back visibly |
| A number from a file is coerced or named as not a number | `numText()`. `numText(null)` prints "not a number", not "0": a weight nobody declared must not read as one they did |

## A default is never a declaration

| | |
|---|---|
| The arithmetic is not held to a bound nobody declared | `within_bounds` reports **skip**, and says the 0-to-1 beside each outcome is the page's default. Holding arithmetic to a default is how a decision nobody took becomes a result. `core/invariants.js` |
| The default scoring rule does not read as one somebody wrote | `RULE0().declared === false`. `core/rank.js` |
| Step 4.1 will not invent a declared class | With no class recognised and no shape property declared, the page used to offer every member of every family — fifteen per mechanism, and 15¹¹ combinations on one of the two models that ship here. It now says no mechanism carries a shape class yet, and why. `page/20-expset.js` |
| An agreed check that cannot be evaluated is recorded as skipped, not as held | `core/invariants.js`, asserted in `tests/invariants.test.mjs` |

## What a verdict is allowed to say

| | |
|---|---|
| A derivative that never leaves zero is neither up nor down | It has its own verdict, `flat`. A weak sign test passes both directions, and the tie-break used to go to whichever was asked first. `core/verdict.js` |
| A partial verdict counts as a sign change only where there is a counter-example | `partial` covers two different answers: boxes proved and boxes refuted, which is a turn, and boxes proved and boxes the search ran out of budget on, which is silence. Only the first has a witness. `vTurned` |
| A tally names the set it ran over | "32 of 32" over the two ends and over the whole class are different sentences. `xrunClause` |
| A tally computed against arithmetic that has since changed says so | `xrunStale`. A number about a model you no longer have is worth flagging rather than recomputing silently |
| Nothing returned from outside is called proved | A result from your own tool, a dataset or another engine carries the warrant `returned` and is drawn as unverified, because the page did not run it |

## The arithmetic

| | |
|---|---|
| A derivative whose expression has a corner inside the declared box is refused, by name | `min()` and `max()` are resolved where one side provably dominates the box — 13 of the 15 corners in the two-channel model resolve that way — and where the two cross there is no single branch to differentiate. The row says which corner, what its difference encloses in, and whether cutting along one name can separate it or another has to be held first. `tests/scenario-twochannel.mjs` asserts the refusal, and the section below follows what happens next |
| A variable exponent returns no enclosure rather than a wrong one | `tests/calculus.test.mjs` |
| An expression longer than 400 characters is refused for being long, not for a token | `core/kernel.js`, asserted by name |
| A line reading a name written further down is refused by name | The grammar's scope rule is strict. Lines are sorted into dependency order first, and a line in a cycle is left where it is and refused for the real reason |
| Past its cap the class search declines to search rather than searching badly | `tests/lattice.test.mjs` |
| An inlined outcome over 4,000 nodes is refused, and the row says which outcome | `page/09-derive.js`. See [SCALE.md](SCALE.md) for what that cap means in practice |

## A proposal from a language model

The workbench proposes and checks; it does not conclude.

| | |
|---|---|
| Every proposal is parsed against the declared ids and the closed vocabularies before it is shown | Anything outside them is **counted** rather than written, and the count is shown. `expTake` returns its refused list; the same rule holds for merges, declarations, rankings and reviews |
| A duplicate mechanism name is made unique rather than left to fail the contract downstream | `mechNames` |
| The record says which of the two of you chose each declaration | And the prompt that asked for it travels in the scenario |
| The model is never named | The page asks the host for whatever model it provides. Nothing downstream depends on which one it is, which is the property that matters: infrastructure other researchers cannot reach is infrastructure they cannot check |

## The build

| | |
|---|---|
| Nothing under `core/` may import from outside it | `make scan` fails the build. Verified by breaching it on purpose |
| A binding to a construct id the registry does not have stops the build | `scripts/export_bench_model.py` |
| A mechanism missing any of its five fields stops it too | A mechanism with no reads would be reported as a relation the corpus cannot support, which reads as a finding about the literature when it is a hole in a file |
| Every browser store is written and read through one helper, and every key written is read | 22 stores checked by `make scan`. The fix for one writer and one reader was a defect; the check is what keeps it fixed |
| Any visible change to the page that the snapshot did not expect fails the build | `tests/pagewalk.mjs`: eight steps, 234 controls, 21 scripted acts, diffed against a recorded snapshot. Re-recording it is a deliberate act with its own target |

## What happens after a refusal

A refusal that leaves you nowhere is a dead end, so the corner case is worth
following to the end. **The derivation refuses; splitting is a command.** Step
3.2's working surface takes the line that carries the corner and cuts it at the
crossing, and each side is then an expression with no corner in it, which
differentiates exactly.

Measured on the two-channel model, with α held at the point the published
figures were drawn at and the cut at π = 0.5822, where contractibility meets
the shareholders' ceiling:

| | |
|---|---|
| ∂B/∂agent_conflict | **proved on both sides**: agency costs take from the control channel, below the ceiling and above it |
| ∂B/∂π | proved on 91 of the 204 sub-boxes above the crossing, undecided below |
| ∂B/∂α, ∂A/∂agent_conflict | still undecided. Splitting removes the corner; it does not make interval arithmetic decide an expression it cannot decide |

So one of the three conclusions the first demo carries from an external engine
is derivable here, and the other two are not yet. That is a better answer than
the one this file gave yesterday, which was that a corner could not be split at
all.

**And until today the bench refused to recommend the split on this model.**
Whether one cut can separate a crossing depends on how many dimensions its two
sides vary over, and the advice counted how many *names* they mention: six, for
a crossing that is a line in π, because four of them are declared constants and
one was a parameter held at a point. The page said it was a surface and that
splitting was right to refuse. A declared interval of width zero is a constant
and not an unknown, which the SymPy export has always said; `mmDims` applies
that rule where it changes what a reader is told to do, and
`tests/calculus.test.mjs` holds the three cases: one dimension splits, two do
not, and pinning one of two makes it one again.

## Where this is still weaker than it should be

- **The automatic pass does not split for you.** It refuses, names the crossing, says which name to cut along or which to hold first, and leaves the cut to the scholar. Doing it automatically would mean choosing the region a conclusion is reported over, which is the one choice this bench does not make on anybody's behalf.
- **`min` and `max` are the only non-smooth operators in the grammar**, so the above is the whole of this class, but it is the class that matters for any model with a cap or a floor in it.
- **A declared shape class on a shared line is not written back** when the page keeps a body, only when a scenario file carries it. A scholar who declares one by hand and keeps the arithmetic gets it recognised rather than declared, and the row says which.

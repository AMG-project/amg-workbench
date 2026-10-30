# Replacing a part

The claim this repository makes about its own shape is that a scholar who
disagrees with one of its judgements can change that judgement, alone, and see
what moves. This is that, done, with the commands and the numbers.

`docs/bench/core/` is twelve files and 2,735 lines. Nothing in it touches the
DOM, reads the corpus, or uses a name declared outside it, and `make scan`
fails the build if one does. Every file runs under `node --test`. So the loop
below needs no browser, no server and no page state, and takes about twenty
seconds.

## The judgement

A curve sampled at 201 points is never exactly monotone. Every shape verdict on
this bench therefore reads against a tolerance, and that tolerance is a
judgement about how much arithmetic noise is not a theoretical claim. It is one
constant, `ATOL`, in `docs/bench/core/curve.js`:

```js
const ATOL = 1e-9;
```

Suppose you think that is too strict for a series read at this resolution: a
channel dipping by a billionth is not a channel going negative.

## The change

```diff
--- a/docs/bench/core/curve.js
+++ b/docs/bench/core/curve.js
-const ATOL = 1e-9;
+const ATOL = 1e-2;
```

## What moves

```sh
node --test tests/*.test.mjs        # all 164, about twenty seconds
```

**160 pass. Four fail, in three files, and every one of them is about what you
changed.**

The file's own test goes first, by name:

```
✖ the tolerance is slack for arithmetic, not for theory
  AssertionError: and the tolerance is stated rather than tuned
```

That test exists because the constant is a declaration and not a dial, and it
is the first thing that tells you so.

Then the hundred form combinations, which name the claim whose verdict moved:

```
✖ the nine claims hold where scope.json says they hold, over the forms
  AssertionError: mb_single_peaked: 90/100 want 90/100
    interior_optimum: 100/100 want 100/100
    mb_starts_at_origin: 74/100 want 74/100
    channels_non_negative: 95/100 want 73/100      <-- yours
    residual_exhausted_first: 100/100 want 100/100
    ...
  actual: [ 'channels_non_negative' ]
```

Neither channel being negative up to the optimum holds at 73 of the hundred
declared form combinations under the strict tolerance and at 95 under yours.
Twenty-two combinations turn on the difference, and the other eight claims are
untouched. The run fails against `docs/showcase-a/scope.json` because that file
is a frozen reference produced under the strict tolerance, which is what a
frozen reference is for: it does not quietly agree with you.

And the fourth is the one worth noticing:

```
✖ every conclusion in the file is the conclusion the model reaches now
```

`docs/bench/model-report.js` is generated, the page reads it at step 2.1, and
it carries the same nine conclusions. Your tolerance changes what the model
reports about itself, and the test that guards the generated file says so
instead of letting the page show a number produced under a rule nobody is using
any more. `make model-report` regenerates it.

## What that tells you, and what you do next

The twenty-two combinations are the answer to a real question: how much of this
model's non-negativity result is about the model and how much is about a
tolerance nobody discussed. You now have both numbers and can report either,
with the constant stated.

If you keep the change, the reference moves with it: re-derive and re-record,
and say in the paper which tolerance the numbers are under. If you drop it, you
have measured what it was worth. Either way the bench did not choose for you,
and the choice is one line in one file.

## The other files, and what each one decides

| Change this | To change | Held by |
|---|---|---|
| `core/curve.js` | the slack every shape verdict reads against, and what counts as single-peaked | `tests/curve.test.mjs`, `tests/scope.test.mjs` |
| `core/rank.js` | what makes a finding worth reporting: four quantities, how they weigh, and which are gates rather than scores | `tests/rank.test.mjs` |
| `core/similarity.js` | when two constructs from different papers are the same quantity | `tests/similarity.test.mjs` |
| `core/expset.js` | which combinations of a declared class get explored, and how a set is sized before it runs | `tests/expset.test.mjs` |
| `core/checks.js` | what the reviewer looks for, and what it calls an exposure | `tests/review.test.mjs` |
| `core/invariants.js` | what the arithmetic must satisfy to be kept at all | `tests/invariants.test.mjs` |
| `core/verdict.js` | what a proof verdict means in words, and when a partial result counts as a turn | `tests/verdict.test.mjs` |
| `core/export.js` | the dialects a finding is handed over in: SymPy, Mathematica, LaTeX | `tests/export.test.mjs` |
| `core/scope-run.js` | the nine claims the two-channel model is held to, as predicates that can fail | `tests/scope.test.mjs` |
| `core/kernel.js` | the grammar, the interval arithmetic, the differentiation and the proof | `tests/kernel.test.mjs`, `tests/calculus.test.mjs` |

## One thing this document found

`core/curve.js` used to open by saying that the two-channel model's
`mb_single_peaked` *is* `apeak()`, so changing the tolerance here moved that
verdict too. Writing the worked example above is how that turned out to be
false twice over: `core/scope-run.js` had the tolerance written out as a
literal, so editing this file moved nothing at all in the class run; and
`apeak()` asks for more than the model's own predicate does, because it also
requires the series to rise to its peak.

The tolerance is now imported from one place, which is what makes the numbers
above true. The number itself did not change, so no verdict moved when it was
fixed. A promise about replaceability that nobody exercises is a promise that
quietly stops holding.

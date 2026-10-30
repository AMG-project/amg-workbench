# `page/` — the bench's own modules

Thirty-one ES modules, loaded by `bench.html`. They are the sections the file
already named when it was one 12,520-line block; the split made those names
into files, and the conversion to modules on 23 October 2026 made the
dependencies between them explicit instead of implicit.

## The contract, which is not obvious from reading any one file

**A module sees only what it imports.** That is new, and it is the whole point.
Until 23 October these were classic scripts in one shared global scope: a name
declared in `03-stores.js` was visible in `17-scenarios.js` without being
imported, a name declared twice anywhere was a collision, and a script that
failed to parse declared *nothing* — so the page rendered with whole features
missing and no error you would notice. Three such failures got through in a
single day. Now an import that does not resolve is a load-time error, two files
may each declare the same name, and `scripts/check_bench.py` checks that every
import resolves instead of that every name is declared somewhere.

**Nothing runs while a file loads.** Every statement that used to — nineteen
store restores, the scenario restore, the d3 wiring, the seeded demo, the
shared store — is a function, and `boot()` in `14-boot.js` calls them in order.
`bench.html` calls `boot()` once, and that is the only thing it calls.

So **the order of the files, and the order of the imports inside one, does not
matter.** That is checked rather than hoped for: reversing every file's import
list leaves `make check` green and the page walk identical. It is worth keeping
true, because the import graph has a cycle through 23 of these files, and in a
cyclic graph evaluation order comes from import order — so a single `const`
that reads another module while this one evaluates would make the order
load-bearing again. Sorting the imports for readability found exactly one
(`DEMO_GROUPS`, reading `GHUE`) and it is a function now.

**Nothing assigns to a name another file declares.** There were sixteen. An
import can be mutated and never rebound, so each became a setter in the file
that owns the state (`mapSet`, `dbSetAll`, `dragSet`) or a hook list
(`onRefresh`, which replaced `17-scenarios.js` wrapping `refresh`).

**Strict mode is automatic.** A module is strict whether it says so or not, so
the `"use strict"` directives these files carried are gone. The two data files,
`graph-data.js` and `model-report.js`, are each one `const` holding data and
are the only files left without it.

## Before you edit

Run `python3 scripts/check_bench.py`. It follows the page's own `src=`, parses
each script alone in the semantics the browser gives it, then parses all of them
joined as a module — where a duplicate top-level binding is an error, which is
the one point worth being stricter than the browser about. It is in
`make bench-test`.

## What is here

| | |
|---|---|
| `00-worked-example.js` | the step-eight worked example, wrapped so it owns nothing |
| `01-mr-fallback.js` | the guard for a page served without `model-report.js` |
| `02-modules.js` | `MODULES`, `DEPOSIT`, `CHAIN` — what the track is made of |
| `03-stores.js` | the browser's own store, and the page's state |
| `03b-decisions.js` | what the curator decided: carrying, full texts, answers, domains |
| `03c-corpus.js` | the opening, the scope, the folding, and the corpus listed |
| `04-stages.js` | the four stages, and the chevrons that walk them |
| `05-explore.js` | the exploring phase: the four methods, rounds, propositions |
| `06-wiring.js` | the flow, and every control wired to it |
| `07-grouping.js` | grouping constructs, and what a model would be made of |
| `08-ask.js` | asking an LLM: the seven prompts, and the tree rendering |
| `09-derive.js` | the dialects a modeller already runs, and the propositions |
| `10-depends.js` | what a conclusion actually rests on |
| `11-classes.js` | the declared class, enumerated |
| `12-claims.js` | relationship lists, the relationship editor, and typing a construct |
| `13-map.js` | the map, the axes, the inspector and the tally |
| `14-boot.js` | boot — the statements that start the page |
| `15-deposit.js` | the deposit, and who nominated what |
| `16-worklists.js` | the worklists, names forced apart, and the pass |
| `17-scenarios.js` | scenarios, provenance, and the three exchange formats |
| `18-workspace.js` | step six's workspace: the rail, the filter, combinations, out to R |
| `19-review.js` | the reviewer: what contradicts, what the findings rest on, a reading |
| `20-expset.js` | the declared set of form combinations, where the page meets it |
| `21-exprun.js` | running that set, and the tally per proposition |
| `22-communities.js` | clusters around one construct |
| `23-exchange.js` | the proof, the stream, the record and one declared relation, as files |
| `24-import.js` | what step 1.1 brings in: the statistics, a search export, a classification |
| `25-notebook.js` | the notebook: an order, the reading between the parts, and the file |
| `26-deposit.js` | the deposit: five declarations, and one archive with a digest per file |
| `27-streams.js` | more than one literature, each curated on its own, and their union |

`core/` is one level up, and it is a LAYER rather than a shelf for the files
that happen not to need a browser. Nothing in it may IMPORT from outside it,
and `scripts/check_bench.py` fails the build when one does.

The reason is in `make modules-map`: the files in this directory are a single
strongly connected component, so a scholar who wants to improve how similarity
is scored, or which form combinations get explored, cannot take that part out
without taking the other thirty and the browser with them.
A file under `core/` can be read on its own, tested on its own, and replaced
on its own. A file here cannot, and that is the honest difference between the
two directories.

So the question for a new piece of work is not where it fits in the load
order. It is whether it needs the page. If it does not, it belongs in `core/`
with a test beside it.

`18-workspace.js` and `19-review.js` are the page scripts that also run under
`node --test`, in `tests/workspace.test.mjs` and `tests/review.test.mjs`. It earns that by having almost nothing in it that
draws: the folder predicates, the filter, the guards on a combination, what
makes a line a candidate, and both halves of the trip out to R are functions
over a line object. The test injects the globals the file resolves at call time
— `BUF`, `bufLab`, `bufPush`, `OP`, `simp` — which is what one shared scope
gives it in the browser anyway, and fakes only the browser store. New page
code that computes should follow it rather than the files around it.

## What the dependency graph says

`python3 scripts/page_deps.py --cycles --misplaced` measures what these files
borrow from each other. It is worth running before moving anything, and the
first thing it taught was about itself: the first version counted a
declaration by its column rather than its brace depth, so
`00-worked-example.js` -- which wraps its whole body in `stxInit()` precisely
so that what it declares is **not** global -- read as exporting fifteen names
into the shared scope.

The second thing it taught is the one that matters here. Splitting
`03-stores.js`, which declared 133 names and was borrowed from by seventeen
of twenty files, into three coherent files took the largest file in the
codebase from 1,291 lines to 212 — and took the number of mutually dependent
file pairs **up**, from 50 to 56.

That is not a failed refactor; it is the measurement telling the truth. In one
shared global scope there are no boundaries to strengthen, so splitting a file
moves edges from inside it to across it. What it buys is real and it is not
coupling: three files you can read, named for what is in them, instead of one
you cannot. Coupling only comes down when a module boundary actually exists,
which means the ESM port — and the number to watch when that happens is this
one.

# Scale, and where it stops

Measured on this corpus and this hardware, with every cap written out. Numbers
here are what the repository produces today; the commands that produce them are
beside each one so they can be checked rather than believed.

## What it holds now

| | | |
|---|---|---|
| papers | 52 | the scoped purpose literature |
| constructs | 1,026 | each carrying the papers that use it and the signature they recorded: level, scale, bearer, stock or flow. **604** are carried by a single relationship, so nothing in the corpus corroborates them; they are in the registry and marked rather than left out |
| relationships | 1,080 | one paper's assertion that one construct acts on another, with its sign, form and owning theory. Every one is drawable; **207** have a box at both ends at the default paper threshold of two, and step 1.3 reports the trade at each setting |
| meta-claims | 290 | what a paper says about the field rather than about the world |
| responds-to edges | 73 | one paper answering another's relationship |
| similarity pairs | 1,416 | scored, for the merge proposals |
| outlets | 12 | |
| the page | 57 ES modules, 33,052 lines besides the corpus | 18 files and 4,144 lines of that is `core/`, which carries the engine and every judgement |
| the corpus in the page | 1,572 KB | `docs/bench/graph-data.js`, stamped with the review commit it was built from |

`node --input-type=module -e "import {G} from './docs/bench/graph-data.js'; console.log(Object.keys(G).map(k => k + ' ' + (G[k].length ?? Object.keys(G[k]).length)).join('\n'))"`

## What the checks cost

| | |
|---|---|
| `make check`, end to end | **about 100 seconds** on an M-series laptop: 237 node tests, two static scanners, four headless Chrome runs |
| the node tests alone | about 20 seconds, and 22,000 of the assertions in them are enclosure checks: 11 expressions, 2,000 sampled points each, every point inside the interval the engine computed for it |
| the joint class run | 2,400 evaluations of nine predicates over a 62-line model, about 19 seconds. 100 form combinations × 24 parameter points |
| the page walk | eight steps, 234 controls, 21 scripted acts |

## What grows with what

**The corpus scales the drawing, not the proof.** Everything the page draws is
filtered and laid out from `graph-data.js` in the browser; doubling the corpus
doubles that work and changes nothing downstream, because a model carries only
the relations a curator selected.

**The proof is bounded by expression size, not by corpus size.** A conclusion is
one outcome's expression, inlined, differentiated and enclosed over a box. What
costs is the depth of the model's own arithmetic: the two-channel model is 62
lines and its largest outcome inlines to 4,187 nodes and simplifies to 356. A
corpus of 5,000 papers would not change that number.

**The class run is forms × points, and it is declared before it runs.** That is
the one place where a scholar can ask for something expensive, so the size is
reported exactly before anything is evaluated: three shape classes of five,
five and four members is 100 combinations, and seven classes of fifteen would be
170 million. The page prints the number and the enumeration is capped; the size
itself is always exact.

## Every cap, and what it does when you reach it

| Cap | Value | Why there, and what happens |
|---|---|---|
| expression length | 400 characters | Refused for being long, by name, rather than failing on a token somewhere inside it |
| lines in one arithmetic body | 90 | The sort into dependency order is over this list; a model needing more is a model that should be composed from parts. The two that ship here are 8 and 62 lines |
| declared constants | 40 | |
| nodes in an inlined outcome | 4,000 | Measured **after** simplification, because substituting every line into every later line duplicates bulk that collapses: 4,187 nodes becomes 356. Over the cap, that one outcome reports and the others still derive |
| enumerated form combinations | 4,000 | `EXPCAP`. The enumeration stops; the **size** is computed exactly without enumerating, so the number you are told is the real one |
| sampled points per sweep | 201 | The resolution the published figures were drawn at. `scope.json` records it, so a run at another resolution is a different run and says so |
| parameter points in the frozen grid | 24, seed 7 | A declaration, not a shuffle: the same seed and slots give the same combinations on any machine |
| relationship links for corpus support | 3 | A composition longer than two intermediaries is not a relation the literature states. Without the cap the first run returned eight-step chains through constructs with nothing to do with the relation |
| what one dependency view will trace | 24 | `DEPCAP` |
| the class search | 4,000 configurations | Past it, it declines to search rather than searching badly |

## Where it stops

- **A corner inside the box.** `min` and `max` are resolved where one side provably dominates and refused where the two cross. Any model with a cap or a floor that binds inside its declared box has conclusions this bench will not sign. That is the live limit, and [REFUSALS.md](REFUSALS.md) says what it looks like.
- **One curation at a time.** The page holds one scenario open; scenarios are switched, not compared side by side. Comparing two is an export and a diff.
- **One literature in the repository.** The procedure is not specific to purpose, and the second scenario that ships here is a model declared with no literature behind it, which is the evidence for that. A second corpus is a second build of the review repository, not a change to this one.
- **No back end, by choice.** Everything is in the browser and in `localStorage`, so a scenario is a file you export or a document in the host's own store. That is what makes it runnable by anybody with a static server, and it is why there is no shared workspace.

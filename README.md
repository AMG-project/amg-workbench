# AMG Workbench

**Turn a literature into a formal model, and find out what it entails.**

A research stream is a few hundred papers asserting a few hundred relationships, and no two of them quite agree on what their terms mean. This workbench walks you from one of those streams to a formal model of it in eight steps, declaring every choice the literature left open rather than defaulting it, and giving each conclusion the region of that declared space its sign was proved on.

It runs in a browser. Nothing is uploaded, there is no back end and no sign-in, and the corpus ships inside the page.

## Open it

**Nothing needs installing.** Copy these three lines into a terminal:

```sh
git clone https://github.com/AMG-project/amg-workbench.git
cd amg-workbench
python3 -m http.server -d docs/bench 8000
```

Then open **http://localhost:8000/bench.html**, and press `Ctrl-C` in the terminal when you are done.

Double-clicking `bench.html` will not work: a browser refuses to load a page built this way straight off the disk, which is why it has to be served. [INSTALL.md](INSTALL.md) is the longer version.

## What to look at first

**Open a demo project** from the menu on the start page. Either one is a finished run, and both open on the first step, so you see the work before the findings. Then walk the chevrons across the top, four phases over eight steps:

- **Build the core model.** Scope the literature, then select the constructs and the relationships with the most support.
- **Join streams of literature.** Bring in constructs and relationships from another research stream, and decide which of them name the same quantity.
- **Explore.** Operationalize the model and derive what it entails. Each finding carries the share of the declared space its sign was proved on, and a finding with no single sign says so rather than rounding into one.
- **Finalize.** See where each finding holds, set aside the ones that do not, and package the run for somebody else to build on.

Three guided tours walk the real page on a copy, so your own work is untouched.

## Connecting a language model

The workbench uses one for the reading and the drafting: taking a paper into the corpus, proposing which constructs are the same quantity, drafting a model, generating the checks a set of declarations implies, ranking findings against criteria you write. Every control that uses one carries a small sparkle. There are two ways to give it one.

**Paste a key.** Open **"An LLM, if you want one"** on the start page and paste an Anthropic API key. It stays in this browser and nowhere else: not in a project file, an export or a decision record. Requests go to `api.anthropic.com` and no other address, billed to your own account, and one button removes the key. Whatever the model proposes is shown to you before it is applied, and the record says which of you chose.

**Or publish it on Claude.** Open this repository with Claude Code and ask it to publish `docs/bench/bench.html` as an artifact with the rest of `docs/bench/` alongside it. The page then asks its host for a model instead of asking you for a key, so there is nothing to set up and that section is not drawn at all. The artifact stays private until you share the link.

## What is in here

| | |
|---|---|
| `docs/bench/` | the workbench: one page and the modules it loads |
| `docs/bench/core/` | the engine. Arithmetic, intervals, differentiation, proof. No DOM, no corpus, no page state, and `make scan` fails the build if a file reaches outside it |
| `docs/bench/graph-data.js` | the corpus, as the page reads it: 1,026 constructs, 1,080 relationships, 52 papers |
| `models/`, `cli/`, `schema/` | models in the kernel's grammar, the command line over the same kernel, the published formats |
| `tests/`, `scripts/` | 237 node tests, and the generators for everything generated |

The curation itself, with the construct registry and the record of every merge, is in a separate repository, because it carries licensed full texts that cannot be redistributed. What the page needs of it ships inside the page as `graph-data.js`, stamped with the commit it was built from.

## For developers

No package.json, no lockfile, no build step. Node 22 or later and a system `python3`; the browser checks also want Chrome.

```sh
make check        # everything CI runs, about a hundred seconds
make standalone   # the same, on a copy holding nothing but the tracked files
node cli/amg.mjs  # the same engine without a browser; lists its eight commands
node cli/amg.mjs derive docs/bench/demo/purpose-two-channel.amg.json
```

`make standalone` is the one to run if you are deciding whether to trust this: it copies what `git` tracks into an empty directory, with no corpus beside it and no history, and runs the whole suite there.

Two things on step 3.2 cannot happen in a browser, so `amg bridge` runs them on your machine instead. What comes back is **marked unverified**, because the page did not run it. [docs/REFUSALS.md](docs/REFUSALS.md) lists everything the bench declines to do.

## Ethics and licence

[docs/ETHICS.md](docs/ETHICS.md): no gated model, nothing uploaded, a scenario file treated as untrusted input, and every model call recorded. The code is MIT, in [LICENSE](LICENSE).

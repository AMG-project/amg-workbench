# Running the workbench

Nothing needs installing, and there is no account to make. The workbench is a
static page: you serve a directory and open it. Everything happens in your
browser, and nothing you do is uploaded.

## What you need

- **A browser.** Any current one.
- **A static server**, to serve the page. The page is ES modules, so a browser
  refuses to load it over `file://` — opening `bench.html` by double-clicking
  it will not work. Python ships one, and so does Node.
- **Node 22 or later**, only if you want the command line or the test suite.
  The page itself needs neither.

## Get it and open it

```sh
git clone https://github.com/AMG-project/amg-workbench.git
cd amg-workbench
python3 -m http.server -d docs/bench 8000
```

Then open **http://localhost:8000/bench.html**.

If you have Node rather than Python, `npx serve docs/bench` does the same job.

You land on a start page. **Purpose and property rights** opens a finished
project — 52 papers curated, a model declared and closed, findings derived and
drawn over the regions they hold on — which is the quickest way to see what the
instrument does. **New project** starts you on the same corpus with nothing
decided. Three guided tours walk the real page; they run on a copy, so your own
work is untouched.

## The LLM is optional

Nothing in the chain needs one. The literature, the curation, every choice you
make, the arithmetic, the derivation and every proof run with no model at all,
and the workbench is fully usable that way.

Seventeen controls *offer* one, each marked with a sparkle: reading a paper into
the corpus, proposing merges, suggesting how relationships combine, drafting a
reading of a finding, ranking findings on criteria you write. Everything a model
proposes is parsed against the declared vocabulary and shown to you before it is
applied — you accept or refuse it by name, and the record says which of you
chose.

Where there is no model, those controls are simply absent. Nothing else changes.

## If you want one: the API key

On the start page, under **An LLM, if you want one**, there is a field for an
**Anthropic API key** (`sk-ant-...`) and a **Use this key** button. That section
appears only when no model is already available.

- The key goes into **your browser's own storage** and nowhere else.
- It is **not** part of a project, so it is in no export, no project file and no
  decision record.
- Requests go to `api.anthropic.com` and to no other address, as
  `claude-sonnet-5-5`, one request per ask.
- Asks are billed to your own Anthropic account at their rates.
- **Remove the key** with one button on the same page; it takes effect at once.

Get a key from the [Anthropic console](https://console.anthropic.com/). You do
not need one to evaluate the workbench.

## Running it inside Claude

Published as an artifact on claude.ai, the page asks its host for a model
instead of asking you for a key — so the seventeen controls work with no key and
no setup, and the key field does not appear at all. This is the easiest way to
hand the workbench to somebody who should not have to think about any of the
above.

To publish your own copy, open the repository with Claude Code and ask it to
publish `docs/bench/bench.html` as an artifact with the rest of `docs/bench/`
alongside it. Artifacts are private to you until you share the link.

## Without a browser

The same engine runs on the command line, over the two projects that ship here:

```sh
node cli/amg.mjs check  docs/bench/demo/purpose-x-property-rights.amg.json
node cli/amg.mjs curate docs/bench/demo/purpose-two-channel.amg.json
node cli/amg.mjs derive docs/bench/demo/purpose-two-channel.amg.json
```

`node cli/amg.mjs` on its own lists the eight commands.

## Checking it yourself

```sh
make check        # everything CI runs, about seventy seconds. Needs Chrome.
make standalone   # the same, on a copy holding nothing but the tracked files
```

The second is the one that matters if you are deciding whether to trust this: it
copies what `git` tracks into an empty directory, with no corpus beside it and
no history, and runs the whole suite there.

---

[README.md](README.md) says what the workbench is and what it will not do.
[METHOD.md](METHOD.md) specifies the method, so a different implementation can
be held to it.

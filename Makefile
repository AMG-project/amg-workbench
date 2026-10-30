# Entry points for the artifact. `make check` is what CI runs, and what a
# reviewer runs to see whether this repository does what it says.
#
# There is one engine now. `docs/bench/core/kernel.js` runs in the page and under
# node, the command line loads the same file, and nothing here needs Python
# beyond what ships with a system install: the two checks written in it use
# the standard library only. The Python engine this project ran until
# 23 October 2026 is at the tag `drystone-final`, and what it produced is
# frozen in docs/showcase-a, with a README saying so.

NODE ?= node
PY   ?= python3

.PHONY: check test bench-test walk smoke scan help deps hostile annotate clusters reading modules-map modules-trial \
        model-report twochannel scenarios standalone ask demo exchange imports forms streams

help:   ## The targets, with what they do.
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*## /\t/' | expand -t 14

check: test scan walk hostile twochannel scenarios annotate clusters reading exchange imports streams models bridge smoke  ## Everything. This is CI.
	@echo "--- all checks passed"

# Every .test.mjs under tests/: the kernel and its roughly 22,000 interval
# enclosure assertions, the schemas, the command line, the workbench's own
# modules, the two-channel port against the values drystone left behind, and
# the nine claims over the declared class and the parameter points.
test:   ## The node tests.
	$(NODE) --test tests/*.test.mjs

bench-test: test   ## Kept as a name older notes use.

# Two scanners over the page, in standard-library Python. check_bench reads
# every module alone, checks that each browser store is written and read
# through the helper, that every import resolves, that nothing under core/
# imports from outside it, and that every control the page wires exists.
# page_deps draws what depends on what.
#
# The page became ES modules on 23 October 2026, so the scanner's two
# shared-scope questions -- is every name declared somewhere, is any name
# declared twice -- no longer mean anything and are gone. A module sees only
# what it imports, and a missing import is a load-time error rather than
# something that waits for a render.
scan:   ## The page's own static checks.
	$(PY) scripts/check_bench.py

deps:   ## What each page script depends on.
	$(PY) scripts/page_deps.py

# The ground that got the page to ES modules (notes/41 M6, notes/43). Neither
# is part of `check`, and both have now DONE THEIR JOB: the page is modules, so
# modules-map reads its own import statements back as load-time work and
# reports nonsense. They are the other session's tools and they are left for
# that session to retire or to teach about modules -- see notes/43.
#
# What replaced them for checking the conversion: `node tests/pagewalk.mjs
# --docs DIR` walks any copy of the page against this one's snapshot, which is
# how the module page was shown to draw identically before the flip landed.
modules-map:   ## What a conversion to ES modules takes, file by file.
	$(PY) scripts/module_map.py

modules-trial:   ## Convert a copy of the page to modules, load it, say what throws.
	@d=$$(mktemp -d) && $(PY) scripts/module_map.py --emit "$$d" >/dev/null \
	  && $(NODE) scripts/module_trial.mjs "$$d"; s=$$?; rm -rf "$$d"; exit $$s

# Renders all eight steps in headless Chrome, inventories every control, runs
# twenty-one scripted acts and diffs the result against a recorded snapshot.
# `make walk-update` re-records it, which is a deliberate act.
walk:   ## The page walk, against its snapshot.
	$(NODE) tests/pagewalk.mjs

walk-update:   ## Re-record the page walk snapshot.
	$(NODE) tests/pagewalk.mjs --update

# A note on a proposition is the one thing on a board row that is not computed,
# so nothing else in the suite can catch it going dead: it has no verdict to
# disagree with and no number to come out wrong. This presses the button.
annotate:   ## A scholar's note on a finding, end to end.
	$(NODE) tests/annotate.mjs

# The engine has its own unit tests. This is the half a scholar touches, and
# the only check on the Clusters layout that means anything: it asserts where
# the constructs actually sit on the diagram, not what the panel says.
clusters:   ## Clusters around one construct, end to end.
	$(NODE) tests/clusters.mjs

# The automatic mode: a derivation read in words, with a host that answers. It
# checks the PROMPT as well as the page, because the one thing a non-modeller
# will get wrong is reading an undecided share as a failure, and the only place
# that can be prevented is in what the page asks for.
reading:   ## Step 3.2's reading, end to end.
	$(NODE) tests/reading.mjs

# The four exchange formats with producers on the page: one finding with its
# certificate, the literature as material, the decision record as JSON, and one
# declared relation. Each is written by the real page and validated against its
# own schema, which is stronger than an example a human wrote: an example cannot
# drift from a producer, and a producer can drift from its schema. It also
# re-checks the certificate's own claim -- that every enclosure said to carry
# the sign does carry it and the boxes cover the declared box -- because that is
# the half a reader with no access to this bench would check.
exchange:  ## The exchange formats, written by the page and held to their schemas.
	$(NODE) tests/exchange.mjs

# What step 1.1 brings in from outside, with the outside stubbed. A check that
# called a live index would fail when somebody else's service was down and
# would spend a shared budget every time the suite ran, so `fetch` is replaced
# and what is held to account is what the page SENDS -- the DOIs of the corpus
# and nothing else, no address, no key unless one was typed -- and what it does
# with what comes back.
imports:  ## The statistics, the CSV and the classification, with the network stubbed.
	$(NODE) tests/imports.mjs

# The registry of named forms, written out as a file an engine in another
# language can read. core/forms.js is the source and derives it from
# core/vocab.js; this publishes it. tests/forms.test.mjs fails when the file and
# the module disagree, so regenerating it is part of changing a form rather than
# a thing to remember.
forms:  ## Regenerate schema/forms.json from core/forms.js.
	$(NODE) scripts/forms_json.mjs

# Two literatures, curated apart and joined. The properties it holds are the
# ones the architecture could lose without anything throwing: that G is the
# active literature in block 1 and the union from block 2 on, that each
# literature's decisions follow it across every switch, that the union carries
# what each literature DREW rather than its whole payload, and that a merge
# across two of them is filed with the scenario rather than with whichever one
# happened to be active.
streams:  ## More than one literature, each curated on its own.
	$(NODE) tests/streams.mjs

# Reads another scholar's action model in BESIDE this one -- the opposite act
# to opening a scenario, which replaces this curation with that one. Drives the
# two files that ship: the worked example into an empty bench, where every one
# of its statements places and nothing is declared until a click; and the
# two-channel model into the worked example, where every one of its statements
# is refused because it was asserted by hand in the session that made it.
models:  ## Another model, read in beside this one.
	$(NODE) tests/models.mjs

# Starts `amg bridge` -- which serves the page as well as running its jobs --
# and drives the page it is serving: the two controls that are greyed without
# it go live without a reload, a real regression runs in R and in Python over a
# fixture whose coefficient is known, and both have to recover it. What comes
# back is still recorded-and-unverified, the script that ran is the one the
# download button writes, and every refusal fires. Skips itself, with a line
# saying so, where neither Rscript nor python3 is installed.
bridge:  ## The local runtime, driven from the page it serves.
	$(NODE) tests/bridge.mjs

# Opens a scenario that carries a tagged payload in every free-text field the
# format holds, walks all eight steps, presses what cannot navigate, and fails
# if any of it ran or reached the markup unescaped. The format exists to be
# exchanged, so the file somebody else wrote is untrusted input.
hostile:  ## A scenario file cannot run script in the page that opens it.
	$(NODE) tests/hostile.mjs

# Opens the second demo in the real page: the two-channel model, declared on
# its own terms with no literature curated. Asserts that the eleven mechanisms
# arrive with nothing missing, that the three classes on the shared lines are
# the hundred form combinations scope.json reports, that the statics about
# value created are proved -- and that the two rights channels are refused by
# name at the contractibility cap, which is the honest state of this model on
# this bench and the thing that would change if the kernel learned to split a
# min() crossing.
twochannel:  ## The two-channel model opens, and the bench says what it can prove.
	$(NODE) tests/scenario-twochannel.mjs

# The toggle beside the scenario name, which the page walk cannot see because
# the walk inventories the panel and this lives in the header. One scenario on
# a first visit, the worked example on and off and on again without the page
# making a second copy of it, and nothing leaking between the example and the
# reader's own workbench.
scenarios:  ## Switching between the examples and the workbench.
	$(NODE) tests/scenarios.mjs

smoke:  ## The other pages still draw.
	$(NODE) tests/pagesmoke.mjs

# WHAT A STRANGER GETS. Copies the tracked files -- and only those -- into an
# empty directory with no corpus beside it, no drafts, no history, no .venv,
# and runs the whole suite there. Every claim this repository makes about
# itself is a claim about that directory and not about this one, and until
# 24 October 2026 nothing had ever checked the difference. Not part of `check`,
# because it runs `check`.
# THE ASK, WITH SOMEBODY ON THE OTHER SIDE OF THE DOOR. Every prompt on this
# bench goes through window.claude.use("sample"), and nothing downstream
# depends on which model is behind it -- so a harness can be the host. capture
# writes out the prompt the page would send; replay answers it from
# docs/run/answers/ and reports what the page did with the answer. Not part of
# `check`: the answers are a record of a run, not a fixture.
# The curated demonstration, rebuilt by running the loop rather than by hand.
# tests/ask-build.mjs opens the example, asks the four declaring prompts in
# the chain's own order, applies what comes back, derives, retains what was
# derived and writes the page's own export -- provenance, rounds and log
# included. NOT part of `check`: it rewrites a committed file, and a reference
# that moves on every build is not a reference.
# From the BASE every time. Building from the last build compounds: a board
# row carries the tally it was given, and a second pass over its own output
# inherits a tally computed against a body that no longer exists. The base is
# the hand-curated scenario as it stood before any of this ran.
demo:  ## Rebuild the curated demonstration by running the loop over the base.
	cp docs/bench/demo/purpose-x-property-rights.base.json \
	   docs/bench/demo/purpose-x-property-rights.amg.json
	$(NODE) tests/ask-build.mjs --out docs/bench/demo/purpose-x-property-rights.amg.json

ask:  ## Capture the page's prompts, then answer them from the recorded run.
	$(NODE) tests/ask-capture.mjs
	$(NODE) tests/ask-replay.mjs

standalone:  ## Run every check on a copy holding nothing but the tracked files.
	@d=$$(mktemp -d) && git ls-files -z | tar --null -cf - -T - | tar -xf - -C "$$d" \
	  && echo "--- $$(find $$d -type f | wc -l | tr -d ' ') tracked files, nothing else" \
	  && $(MAKE) -C "$$d" check; s=$$?; rm -rf "$$d"; exit $$s

# docs/bench/model-report.js, which step 2.1 imports and step 3.1 runs over:
# what the model returned, and what the corpus has behind each relation it
# uses. NOT part of `check`, because the corpus half reads ../purpose-review,
# which is a separate repository — so this is the target to run when the corpus
# is rebuilt, and nothing else here depends on having it.
#
# The model half needs only this repository, and tests/modelreport.test.mjs
# checks the committed file against a fresh run of it, which is what stops the
# generated file drifting from the model it reports on. For a while there was no
# producer at all: P6 removed the Python engine and this script with it.
model-report:  ## Regenerate docs/bench/model-report.js (needs ../purpose-review).
	$(PY) scripts/export_bench_model.py

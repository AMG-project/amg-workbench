# Running the explain step blind

The loop's language model must not know what we expect it to find. This
conversation contains the pre-registered expectations and the mechanisms we
already know drive which outcomes; an explanation produced with that in context
is a lookup, and the provenance record would show it.

So the explain step is split across two sessions.

## 1. Generate the run sheet

```sh
cd artifact
make unhide   # macOS only, see the Makefile
.venv/bin/python scripts/run_sheet.py make \
  --model purpose --outcomes pi_star,A,B --top 3 --candidates 4 --base-n 128 \
  --fix fsi_employees=0.6,fsi_shareholders=0.6,fsi_community=0.6,\
outside_employees=0.3,outside_shareholders=0.3,outside_community=0.3
```

Writes `docs/run/RUN_SHEET.md` and `docs/run/config.json`.

**Why `--fix`.** Firm-specific investment dominates the variance of every outcome
and pushes principal quality below the detector's floor: without it, no
`principal_*` effect is reported at all. Holding it constant is ordinary
experimental design, and the held values are recorded in the config, because
which parameters were pinned is part of what any finding is conditional on.

## 2. Answer it in a clean session

Open a **new** Claude Code session — or any model you want to compare — with no
context from this project. Load only `RUN_SHEET.md`. It tells the session not to
read source code or search the repository, and asks each prompt independently.

Save the answers as `docs/run/responses.json`:

```json
{
  "responses": {"1": "<the JSON it produced>", "2": "…", "3": "…"},
  "recognised": "no"
}
```

The `recognised` field is not a formality. It asks whether the model recognised
the model from published literature — a benchmark that recovers a known result is
only evidence if the answer was not already known to the model answering.

## 3. Bring the answers back

```sh
.venv/bin/python scripts/run_sheet.py ingest docs/run/responses.json --llm claude-opus-5
```

This re-runs the sweep from the same seed, regenerates the prompts, and **checks
they hash to what the sheet contained** — answers to different questions must not
be recorded as answers to these. It then tests every explanation by ablation and
writes a provenance record per outcome to `docs/run/investigations/`.

## Running it against several models

The point of recording is that this is cheap to repeat. Run the same sheet
through Claude, ChatGPT and an open-weights model, ingest each with a different
`--llm`, and the difference between them is a **replication rate** — a reported
result about how much the method depends on which model does the explaining.

## What the run sheet currently asks

Three outcomes, with every detected driver of each:

| | outcome | drivers |
|---|---|---|
| 1 | `A` — the residual channel | α lowers it; principal competence and conflict raise it |
| 2 | `B` — the control channel | principal conflict raises it; α raises it; agent conflict lowers it |
| 3 | `pi_star` — the optimal level of purpose | principal competence raises it; agent conflict lowers it; principal conflict raises it; α does not move it |

Prompt 3 is the one to watch. Both principal-quality parameters raise the optimum,
and a sweep run on 1 September 2026, before any of this loop existed, looked for the
interior optimum our own pre-registration expected and found none: every parameter is
monotone in π*, and α moves it by +0.003 across its whole range. Whether a blind model
notices that the two push the same way *for opposite reasons* is the closest thing we
have to a real test of the method.

#!/usr/bin/env python3
"""Build `docs/bench/model-report.js`: what the model said, and what the corpus
has behind each relation it uses.

The bench is a curation page and does not run the model. What it needs is the
model's *output*, as data, so step four can adjudicate conclusions without the
enumeration engine being carried into it. Two halves:

    the model half    scripts/model_report.mjs, which builds the model from
                      models/purpose-two-channel.json and asks the nine claims
                      in docs/bench/core/scope-run.js. It returns the declared
                      classes, every conclusion's survival over the 100
                      combinations with the members that break it named, and a
                      margin where the conclusion has a scalar at all. The same
                      construction is held to scope.json's numbers by
                      tests/scope.test.mjs, so the model half is checked
                      against what drystone reported and not merely recomputed.

    the corpus half   for each relation the model uses, whether the corpus
                      asserts it. Computed here from index/claims.tsv: a direct
                      claim, a path of claims, or nothing.

MECHANISM METADATA -- what a mechanism says, reads, writes and does -- is in
models/purpose-two-channel-meta.json, beside the model's own prose. It used to
be read out of drystone's `purpose.py` with `ast`; that file is gone and the
metadata was recovered from it verbatim, checked field by field against the
report it had produced. The grammar carries the arithmetic
and names the mechanisms; it does not say what they mean.

WHAT THIS NEEDS: python3, node, and the corpus at ../purpose-review. The model
half needs neither the corpus nor anything outside this repository, which is
why tests/modelreport.test.mjs can check it on its own.

BINDINGS ARE A DECLARATION, NOT A LOOKUP. Which corpus construct a model
variable *is* cannot be computed -- the model's pi is a degree where the corpus
offers a flow, a stock, a binary and a field-level stock, and choosing among
them is a curator's decision of the same kind as a merge. The table below is
that decision, written down so it can be argued with. It belongs in a block
file once blocks exist.

Usage:  python3 scripts/export_bench_model.py
"""

from __future__ import annotations

import collections
import csv
import json
import subprocess
import sys
from pathlib import Path

ART = Path(__file__).resolve().parent.parent
META_JSON = ART / "models" / "purpose-two-channel-meta.json"
REPORT_MJS = ART / "scripts" / "model_report.mjs"
SCOPE_JSON = ART / "docs" / "showcase-a" / "scope.json"
OUT = ART / "docs" / "bench" / "model-report.js"
INDEX = ART.parent / "purpose-review" / "corpus" / "index"

# ---- the declaration ------------------------------------------------------
# One entry per model variable: the corpus constructs it could be, and why that
# is a decision. An empty candidate list is a finding, not an omission.
BIND = {
    "pi": {
        "label": "π  purpose integration",
        "ids": [
            "stated-purpose-commitment",
            "purpose-realization-in-practice",
            "costly-public-purpose-commitment",
            "values-based-purpose-commitment-intensity",
            "purpose-integration-work",
        ],
        "note": "Five candidates and no clean match. The model treats π as a firm-level "
        "degree; the corpus offers a firm-level stock, two firm-level flows, a binary "
        "and a field-level stock over a population of firms.",
    },
    "alpha": {
        "label": "α  AI intensity",
        "ids": [
            "measurement-and-accountability-technology",
            "information-communication-technology-diffusion",
            "ai-based-decoupling-detection",
        ],
        "note": "None of the three is AI intensity in a firm's operations. All three sit "
        "at field level: an institutional setting, an economy, a research community.",
    },
    "principal_competence": {
        "label": "principal competence",
        "ids": ["board-governance-expertise-staffing", "principal-mission-motivation"],
        "note": "One is the board's expertise, the other a principal's motivation. The "
        "model's variable is the first; the second is closer to principal_conflict.",
    },
    "principal_conflict": {
        "label": "principal conflict",
        "ids": ["shareholder-primacy-logic-dominance"],
        "note": "Field level, and about an institutional order rather than about this "
        "firm's principals deciding against others' interests.",
    },
    "agent_conflict": {
        "label": "agent conflict",
        "ids": [
            "executive-short-term-performance-prioritization",
            "executive-decision-myopia",
            "managerial-shareholder-value-orientation",
        ],
        "note": "Three plausible candidates at three different levels: a firm-level flow, "
        "an individual-level stock and a firm-level stock.",
    },
    "fsi": {
        "label": "firm-specific investment",
        "ids": ["firm-specific-investment"],
        "note": "The one clean binding in the model. Two papers, firm level, borne by the "
        "stakeholder, exactly as the model reads it.",
    },
    "A": {
        "label": "A  residual rights channel",
        "ids": ["residual-control-rights-allocation"],
        "note": "In the registry and used by no claim. A binding to a name, not to a finding.",
    },
    "B": {
        "label": "B  control rights channel",
        "ids": ["fixed-control-rights-allocation", "control-rights-allocation"],
        "note": "The first is used by no claim; the second is Stoelhorst and Vishwanathan's "
        "own, and nominal where the model needs a share.",
    },
    "Vp": {"label": "Vp  value created", "ids": [], "note": "", "same_as": "AVp"},
    "AVp": {
        "label": "AVp  value appropriated",
        "ids": [
            "firm-accounting-performance",
            "firm-overall-performance",
            "firm-equilibrium-profit",
        ],
        "note": "The best attested quantity in the corpus: firm-accounting-performance alone "
        "carries claims from fourteen papers.",
    },
}

# The mechanism signature reads `fsi_employees` and so on; one binding covers them.
PREFIX = {"fsi_employees": "fsi", "fsi_shareholders": "fsi", "fsi_community": "fsi"}

# How many claims may be chained before a path stops being evidence for the
# relation. Three is a declared choice, not a derived one: two intermediaries is
# a composition a reader can check, and the first run without a cap returned
# eight-step chains through constructs that have nothing to do with the relation.
PATH_CAP = 3


FIELDS = ("id", "says", "reads", "writes", "role")


def mechanisms() -> list[dict]:
    """The model's mechanisms, in the order it declares them.

    Every field is required rather than defaulted. A mechanism with no `reads`
    would be reported as a relation the corpus cannot support, which reads as a
    finding about the literature when it is a hole in this file.
    """
    meta = json.loads(META_JSON.read_text(encoding="utf-8"))
    out = []
    for m in meta.get("mechanisms", ()):
        missing = [f for f in FIELDS if f not in m]
        if missing:
            sys.exit(f"{m.get('id', '(unnamed)')} in {META_JSON.name} has no {missing}")
        out.append({f: m[f] for f in FIELDS})
    if not out:
        sys.exit(f"no mechanisms in {META_JSON.name}")
    return out


def corpus():
    """Construct signatures, the claim edges, and which papers use each construct."""
    rows = lambda name: list(csv.DictReader((INDEX / name).open(), delimiter="\t"))
    cs = {r["id"]: r for r in rows("constructs.tsv")}
    edges = collections.defaultdict(set)
    papers = collections.defaultdict(set)
    claims = collections.defaultdict(list)
    for c in rows("claims.tsv"):
        ante = [x.strip() for x in c["antecedent"].split("|") if x.strip()]
        cons = [x.strip() for x in c["consequent"].split("|") if x.strip()]
        for a in ante:
            papers[a].add(c["paper"])
            for b in cons:
                edges[a].add(b)
                claims[(a, b)].append(
                    {"id": c["claim"], "sign": c["sign"], "basis": c["epistemic_status"]}
                )
        for b in cons:
            papers[b].add(c["paper"])
    return cs, edges, papers, claims


def shortest(edges, src: set[str], dst: set[str]) -> list[str] | None:
    seen, back = set(src), {}
    q = collections.deque(src)
    while q:
        u = q.popleft()
        if u in dst and u not in src:
            path = [u]
            while path[-1] in back:
                path.append(back[path[-1]])
            return list(reversed(path))
        for v in edges[u]:
            if v not in seen:
                seen.add(v)
                back[v] = u
                q.append(v)
    return None


def ids_for(name: str) -> list[str]:
    """The constructs bound to one model variable, following `same_as`."""
    b = BIND.get(PREFIX.get(name, name))
    if b is None:
        return []
    if b.get("same_as"):
        return ids_for(b["same_as"])
    return b.get("ids", [])


def status(edges, claims, papers, reads: list[str], writes: list[str]):
    """arrow, path or unsupported, for one mechanism."""
    src = {i for r in reads for i in ids_for(r)}
    dst = {i for w in writes for i in ids_for(w)}
    if not src or not dst:
        why = "no construct is bound to " + ("the antecedent" if not src else "the consequent")
        return {"kind": "unsupported", "why": why}
    direct = [(a, b, c) for (a, b), cl in claims.items() if a in src and b in dst for c in cl]
    if direct:
        return {
            "kind": "arrow",
            "claims": [
                {"id": c["id"], "sign": c["sign"], "basis": c["basis"], "from": a, "to": b}
                for a, b, c in direct
            ],
        }
    p = shortest(edges, src, dst)
    if p and len(p) - 1 <= PATH_CAP:
        return {"kind": "path", "steps": len(p) - 1, "path": p}
    if p:
        return {
            "kind": "unsupported",
            "why": f"the shortest chain of claims joining the bound constructs is "
            f"{len(p) - 1} steps long, through {' -> '.join(p[1:-1][:3])}; a composition "
            f"that long is not a relation the literature states",
        }
    # A construct can be in the registry and in no claim. Saying so is worth more
    # than "no path": the binding is to a name the literature never asserts about.
    silent = sorted(i for i in src | dst if not papers.get(i))
    why = "no claim and no path joins the bound constructs"
    if silent:
        why += (
            "; "
            + ", ".join(silent)
            + (" carries" if len(silent) == 1 else " carry")
            + " no claim at all"
        )
    return {"kind": "unsupported", "why": why}


# What a mechanism's role implies about the sign of the claim it would make.
# This is an INFERENCE and is labelled as one wherever it is shown: the model
# declares what a mechanism does to a quantity, not what a paper would have to
# assert for the mechanism to be warranted. Reconstructing that assertion is the
# point -- it is the sentence someone would have to go and find, or test.
ROLE_SIGN = {
    "dissipates": ("negative", "the mechanism destroys value, so the claim behind it is a cost"),
    "modulates": (
        "unspecified",
        "the mechanism changes how much another one does, so its own sign is not fixed",
    ),
    "gates": (
        "conditional",
        "below a threshold the mechanism does nothing, so the claim is a condition and not a slope",
    ),
    "allocates": (
        "redistributive",
        "the mechanism moves value between channels rather than changing the total",
    ),
}


def proposed(rel: dict, cs: dict, papers: dict) -> dict | None:
    """The claim the corpus would need for this relation, written in its own ids.

    One claim per relation, from the mechanism's first read to its first write,
    because a mechanism reading four quantities does not assert four claims -- it
    asserts one about the quantity it is named for. The rest are listed so the
    reduction is visible rather than silent.
    """

    # An endpoint the corpus draws is preferred over one it only registers. A
    # reconstructed claim is a sentence someone could go and verify, and a claim
    # about a construct no paper asserts anything about cannot be verified -- so
    # principal conflict is reconstructed against the firm's accounting result
    # rather than against a rights channel that carries no claims. What was
    # passed over is listed, so the reduction stays visible.
    def pick(names: list[str]) -> list[str]:
        out = [i for n in names for i in ids_for(n)[:1]]
        drawn = [i for i in out if papers.get(i)]
        return (drawn + [i for i in out if i not in drawn]) if drawn else out

    reads, writes = pick(rel["reads"]), pick(rel["writes"])
    if not reads or not writes:
        return None
    a, b = reads[0], writes[0]
    sign, why = ROLE_SIGN.get(rel["role"], ("unspecified", ""))
    return {
        "from": a,
        "to": b,
        "sign": sign,
        "inferred_from": f"role: {rel['role']} \u2014 {why}",
        "also_reads": reads[1:],
        "also_writes": writes[1:],
        "on_map": {"from": a in cs and bool(papers.get(a)), "to": b in cs and bool(papers.get(b))},
    }


def with_scope(data: dict) -> dict:
    """Merge the parameter and joint columns in, and check the form column agrees.

    `model_report.mjs` enumerates the declared classes of functional form at one
    parameter setting -- sheet 1, the point every published figure was drawn at.
    That is one of three questions `make scope` keeps apart, and on its own it
    misreports: soft_governance_raises_B survives every form at the reported
    setting and six of twenty-four parameter samples break it, so a page showing
    only the form column calls it robust. Varying parameters is implemented once,
    in Python against the canonical model; this reads that result rather than
    reimplementing the sweep over the JS port, which would give the bench numbers
    differing from SCOPE.md by sampling noise.

    The form column is computed on both sides and must agree. It is the one
    cross-check available between the two implementations, so a disagreement
    stops the build rather than being merged over.
    """
    if not SCOPE_JSON.is_file():
        for c in data["conclusions"]:
            c["scope"] = None
        return data
    sc = json.loads(SCOPE_JSON.read_text(encoding="utf-8"))
    by_id = {c["id"]: c for c in sc["claims"]}
    for c in data["conclusions"]:
        got = by_id.get(c["id"])
        if got is None:
            c["scope"] = None
            continue
        if (got["forms"]["held"], got["forms"]["of"]) != (c["survives"], c["of"]):
            sys.exit(
                f"{c['id']}: the two implementations disagree about the form column - "
                f"model_report.mjs says {c['survives']}/{c['of']}, "
                f"scope.json says {got['forms']['held']}/{got['forms']['of']}"
            )
        c["scope"] = {k: got[k] for k in ("forms", "params", "joint")}
        c["scope"]["kind"] = got["kind"]
        c["scope"]["first_failure"] = got["first_failure"]
    data["scope_grid"] = sc["grid"]
    return data


def main() -> None:
    if not INDEX.is_dir():
        sys.exit(f"no corpus index at {INDEX}")
    half = subprocess.run(
        ["node", str(REPORT_MJS)], cwd=ART, capture_output=True, text=True, check=False
    )
    if half.returncode:
        sys.exit("model_report.mjs failed:\n" + (half.stderr or half.stdout))
    data = json.loads(half.stdout)

    cs, edges, papers, claims = corpus()
    for key, b in BIND.items():
        b["bound"] = [
            {
                "id": i,
                "papers": len(papers.get(i, ())),
                "signature": "/".join(
                    cs[i][f] for f in ("level", "scale", "stock_or_flow", "bearer")
                )
                if i in cs
                else None,
            }
            for i in b.get("ids", [])
        ]
        missing = [i for i in b.get("ids", []) if i not in cs]
        if missing:
            sys.exit(f"{key} is bound to ids that are not in the registry: {missing}")

    data = with_scope(data)
    data["bindings"] = BIND
    data["relations"] = [
        {
            **m,
            "corpus": status(edges, claims, papers, m["reads"], m["writes"]),
            "proposes": proposed(m, cs, papers),
        }
        for m in mechanisms()
    ]

    text = (
        "/* Generated by scripts/export_bench_model.py. Do not edit; regenerate.\n"
        "   The model half comes from scripts/model_report.mjs, over the grammar in\n"
        "   models/purpose-two-channel.json; the corpus half from\n"
        "   purpose-review/corpus/index, which is not part of this repository.\n"
        "   tests/modelreport.test.mjs checks the model half of this file against a\n"
        "   fresh run, so it cannot go stale here unnoticed. */\n"
        "const MR=" + json.dumps(data, sort_keys=True, separators=(",", ":")) + ";\n"
        # THE EXPORT IS PART OF THE FILE. The page loads this as an ES module, so a
        # regenerated copy without the export line takes every panel that reads MR
        # off the page -- and the emitter predates the conversion, so it wrote one
        # that would have. Found by regenerating and reading the diff.
        "\n/* A module now, like everything else the page loads. One line, because the\n"
        "   file is one `const` holding data: nothing in it runs, which is also why it\n"
        "   is one of the two files still not in strict mode. */\n"
        "export { MR };\n"
    )
    OUT.write_text(text, encoding="utf-8")

    kinds = collections.Counter(r["corpus"]["kind"] for r in data["relations"])
    survive = sum(1 for c in data["conclusions"] if c["survives"] == c["of"])
    joint = sum(
        1 for c in data["conclusions"] if (c.get("scope") or {}).get("joint", {}).get("universal")
    )
    grid = data.get("scope_grid")
    print(
        f"{OUT.relative_to(ART)}: {len(data['relations'])} relations "
        f"({', '.join(f'{v} {k}' for k, v in kinds.most_common())}) · "
        f"{len(data['conclusions'])} conclusions, {survive} survive all "
        f"{data['model']['combinations']} forms"
        + (
            f", {joint} survive the joint grid ({grid['forms']}×{grid['samples']})"
            if grid
            else " · NO scope.json: the parameter dimension is missing, run make scope"
        )
        + f" · {len(text) // 1024} KB"
    )


if __name__ == "__main__":
    main()

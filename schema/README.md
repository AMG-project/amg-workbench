# Exchange formats

**The one that matters most has its own specification: [AMG-FORMAT.md](AMG-FORMAT.md), the action model as a file.** It is what this instrument exists to produce; the rest below are its parts and the record of how it was made.

Eight objects leave this bench, and until these schemas existed none of them had a
published shape. A format nobody can read against is not an exchange format; it
is a habit.

A ninth file here describes something else: not an object that leaves, but the messages that pass between the page and `amg bridge`, the local runtime that runs its scripts in R or Python. It is published for one reason, which is that somebody should be able to write a different bridge.

| file | object | produced by |
|---|---|---|
| `scenario.schema.json` | **a curation** — every decision, every accepted proposal, the rounds and the record, and any other scholar's action model read in beside it | the Menu, `Export scenario` |
| `record.schema.json` | **the decision record** — every judgement with its date, its target, the identifiers it was taken against and the reason | the decision record, `Export the record as JSON` |
| `stream.schema.json` | **a literature** — the constructs with their signatures, the claims with their quotes and scores, the papers as metadata, the declarations on top | the decision record, `Export the stream` |
| `relation.schema.json` | **a declared relation** — one arrow with its signature, its class of forms, its scope, what it rests on and what it leaves open | the declaration dialog on step 3.1, `Export this relation` |
| `result.schema.json` | **a result** — a proposition with its scope, its method and its provenance | step 3.2, `results-*.json`, and step 4.2 |
| `forms.schema.json` | **the registry of named forms** — the classes of functional form every robustness number was read against, with the tag that identifies it | `make forms`, from `docs/bench/core/forms.js` |
| `deposit.schema.json` | **a deposit** — the five decisions step 4.2 asks for, with the day each was made, as the manifest-of-record inside the archive | step 4.2, `Write the deposit` |
| `proof.schema.json` | **one finding with its certificate** — the derivative, the box, and every sub-box the search split into with its interval enclosure | step 3.2, `Export with its proof` on a retained finding |
| `report.schema.json` | **an action model** — every retained finding with its warrant underneath it: the box and who declared each bound, the certificate, the claims and the scope each paper stated, any empirical test, and the denominator it was drawn from | step 4.2, `REPORT.md` and `report.json` |
| `bridge.schema.json` | **the local runtime's three messages** — what the bridge can do, a script to run, and what the runtime wrote | `amg bridge`, and the page it serves |

Each carries `format` and `v`. A reader checks both before anything else: a
file from a later version is refused rather than half-read.

**The record and the stream are halves of one thing.** A reader holding only the
record has a list of judgements about objects they do not have. The stream is
the objects. Neither is forkable alone.

**The papers do not travel.** Fifty-two articles are other people's copyright,
so the stream carries what was read off them — the claims with their verbatim
spans, the constructs with their signatures — and an identifier per paper so a
replicator obtains the texts. That is not a limitation to apologise for: the
claim table is the reusable object and it is the part nobody else has.

**Why the forms registry is one of these.** Every robustness number this bench
reports is a claim about fifteen expressions. A conclusion that survived a
hundred form combinations survived a *particular* hundred, and until the
registry had a published shape and a tag, nothing that left the page said
which. A result, a proof and a deposit all carry `forms`, and a deposit carries
the registry itself by value rather than by reference — a bundle that names the
forms without carrying them asks a reader to find the right version of this
bench before they can check anything.

**Why a proof as well as a result.** A result says what the method concluded. A
reader who wants to know whether to believe it can trust the page or rebuild the
model; neither is checking. Branch and bound leaves a certificate behind whether
anybody writes it down or not, so the proof file is that list of boxes with an
enclosure each, and the conclusion follows from two facts a reader can verify
without this bench: every enclosure said to carry the sign does carry it, and
the boxes cover the declared box. `covers` is the second fact as a number,
computed from the written boxes rather than asserted.

**Two things that leave and are not in this table.** `curated_model.py` is a Python
file, and `derived-claims.tsv` is a TSV in the columns `index/claims.tsv` already
uses — both are formats somebody else published, and giving either a schema of
our own would be inventing a second one. `results-*.json` carries an
`amg-results` wrapper around an array of `amg-result`, and it is the elements
that are validated, because the wrapper is a list.

The schemas are JSON Schema 2020-12. Two tests hold them to reality.
`../tests/schema.test.mjs` validates the real scenario the bench produced and
the relation and result examples. `../tests/exchange.mjs` opens the page, writes
a proof, a stream, a record and a relation, and validates each against its own
schema — which is the stronger check, because an example cannot drift from a
producer and a producer can drift from its schema.

Both use the checker in `../cli/schema.mjs`, which covers the subset used here:
`type`, `required`, `properties`, `items`, `enum`, `const`, `minimum`,
`minItems`, `additionalProperties`, `oneOf` and `$ref` to `$defs`. It is not a
general validator and says so, because a validator that silently passes what it
does not understand is worse than none.

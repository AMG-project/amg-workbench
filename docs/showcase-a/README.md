# Frozen reference values

These were produced by `drystone`, the Python engine the project ran until
23 October 2026, and they are now the acceptance tests for the ports that
replaced it. The engine is gone from the working tree; it is reachable at the
tag `drystone-final`, and the scripts that wrote these files are in that
commit under `artifact/scripts/`.

| File | What it holds | What now checks against it |
|---|---|---|
| `scope.json` | the nine claims of the two-channel model, held of 100 form combinations and of 2,400 form × parameter points, with the combinations that break each one | `tests/scope.test.mjs` |
| `scope-points.json` | the 24 parameter points `scope.json`'s joint counts are taken over, drawn with Python's `random.Random(7)` and therefore not reproducible outside Python | `tests/scope.test.mjs` |
| `rights-golden.json` | the three-channel model: 68 cases, the published claim-extension ladder, and the identity that collapses it onto the two-channel model | nothing yet — the three-channel model is not ported. See `notes/39` P4 |
| `two-channel-golden.json` | 415 cases of the two-channel model, ablations included | `tests/twochannel.test.mjs` |
| `../bench/model-report.js` | the mechanism metadata and conclusions step 2.1 imports | the page reads it; `tests/scope.test.mjs` reproduces its conclusions from the grammar |
| `grid.*`, `sheet1.*`, `sheets23.*` | the figures of the showcase | nothing; they are the record of what was shown |

`SCOPE.md` and `FIDELITY.md` are the prose that goes with them, written when
the model was validated against the source sketches.

**Do not regenerate these.** A reference that moves is not a reference. If a
port disagrees with one of them, the port is what to look at first; if the
reference turns out to be wrong, say so in a note and leave the file, so the
disagreement stays legible.

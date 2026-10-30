/* The declared set, run.

   The acceptance test: over the whole class of the two-channel
   model, each of the nine claims matches `scope.json` -- the form dimension
   (held of 100) and the joint one (held of 2,400 = 100 forms x 24 points).

   Those numbers were produced by drystone. Matching them from the kernel
   grammar, with the forms read out of the page's own vocabulary, is what
   makes the Python engine removable. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../docs/bench/core/scope-run.js";
import { BOUNDS, POINTS, combinations, makeRun } from "../scripts/two-channel-run.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const read = p => JSON.parse(fs.readFileSync(join(here, "..", p), "utf8"));

const WANT = read("docs/showcase-a/scope.json");

/* The model itself -- the hundred combinations, and a run for any one of them
   -- is built in scripts/two-channel-run.mjs, because scripts/model_report.mjs
   needs the same construction and two copies of it is how a test and the file
   it vouches for come to disagree. What is asserted here is the numbers. */
const COMBOS = combinations();

test("the declared class is the hundred combinations drystone reported", () => {
  assert.equal(COMBOS.length, WANT.grid.forms);
  assert.equal(POINTS.points.length, WANT.grid.samples);
});

test("the nine claims hold where scope.json says they hold, over the forms", () => {
  const got = S.scopeRun(makeRun, COMBOS, [POINTS.points[0]], BOUNDS, {});
  const rows = [];
  for(const r of got){
    const w = WANT.claims.find(c => c.id === r.id);
    assert.ok(w, `scope.json has no ${r.id}`);
    rows.push(`${r.id}: ${r.forms.held}/${r.forms.of} want ${w.forms.held}/${w.forms.of}`);
  }
  const wrong = got.filter(r => {
    const w = WANT.claims.find(c => c.id === r.id);
    return r.forms.held !== w.forms.held || r.forms.of !== w.forms.of;
  });
  assert.deepEqual(wrong.map(r => r.id), [], rows.join("\n  "));
});

test("and jointly, over forms and parameter points together", () => {
  const got = S.scopeRun(makeRun, COMBOS, POINTS.points, BOUNDS, {});
  const rows = got.map(r => {
    const w = WANT.claims.find(c => c.id === r.id);
    return `${r.id}: ${r.joint.held}/${r.joint.of} want ${w.joint.held}/${w.joint.of}`;
  });
  const wrong = got.filter(r => {
    const w = WANT.claims.find(c => c.id === r.id);
    return r.joint.held !== w.joint.held;
  });
  assert.deepEqual(wrong.map(r => r.id), [], rows.join("\n  "));
});

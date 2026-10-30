/* core: what a sampled series says about its own shape.

   These four are the vocabulary half the bench's claims are stated in, and
   they had no test. The two-channel model's `mb_single_peaked` IS apeak() and
   its `monotone_in` is amono(), so the verdicts those claims carry are
   whatever this file says they are.

   What matters is the tolerance and the edges, not the happy path. A curve
   sampled at twenty-one points is never exactly monotone, so a check that
   demanded it would fail on arithmetic rather than on theory — and one that
   tolerated too much would pass a series that visibly turns. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../docs/bench/core/curve.js";

const up = n => Array.from({length: n}, (_, i) => i / (n - 1));
const peak = n => up(n).map(x => 4 * x * (1 - x));

test("a number is a number, and nothing else is", () => {
  assert.equal(C.afin(0), true);
  assert.equal(C.afin(-1e300), true);
  for (const v of [NaN, Infinity, -Infinity, null, undefined, "1", "", [], {}, true])
    assert.equal(C.afin(v), false, `afin admitted ${JSON.stringify(v)}`);
});

test("monotone says HOW BADLY it goes the wrong way, and where", () => {
  assert.deepEqual(C.amono(up(21), true), {worst: 0, at: -1},
    "a rising series never goes the wrong way, and `at` is -1 for nowhere");
  assert.deepEqual(C.amono(up(21).slice().reverse(), false), {worst: 0, at: -1});
  /* One step back, in the middle. The worst is the size of that step and `at`
     is the index it happened at, which is what lets a row name the place. */
  const dip = up(5).slice(); dip[2] = dip[1] - 0.1;
  const d = C.amono(dip, true);
  assert.ok(d.worst < 0 && d.at === 2, JSON.stringify(d));
  /* [0, .25, .5, .75, 1] with the middle pulled to .15: the step into it is
     .15 - .25 = -0.1, and that is the worst. */
  assert.ok(Math.abs(d.worst + 0.1) < 1e-9, `worst was ${d.worst}`);
  /* Flat is not a violation in either direction: a plateau is not a fall. */
  assert.deepEqual(C.amono([1, 1, 1], true), {worst: 0, at: -1});
  assert.deepEqual(C.amono([1, 1, 1], false), {worst: 0, at: -1});
  /* A series of one has nothing to compare. */
  assert.deepEqual(C.amono([1], true), {worst: 0, at: -1});
  assert.deepEqual(C.amono([], true), {worst: 0, at: -1});
});

test("a peak has to be INTERIOR, and must not turn back up", () => {
  const p = C.apeak(peak(21));
  assert.equal(p.ok, true);
  assert.equal(p.hi, 10, "and it says where the peak is");

  /* Monotone rising: the maximum is at the end, so there is no peak. The
     claim this refuses is `interior_optimum`, which is exactly the point. */
  const rising = C.apeak(up(21));
  assert.equal(rising.ok, false);
  assert.match(rising.why, /at an end of the range/);
  assert.equal(C.apeak(up(21).slice().reverse()).ok, false, "nor at the start");

  /* Rises, falls, rises again. A single-peakedness check that let this
     through would call a two-humped curve single-peaked. */
  const twice = peak(21).slice();
  /* A SECOND HUMP LOWER THAN THE FIRST, which is the case that matters: make
     it higher and the peak simply moves to the end, and `apeak` refuses it
     for being at an end rather than for turning back up. */
  for (let i = 17; i < 21; i++) twice[i] = twice[i - 1] + 0.05;
  const t = C.apeak(twice);
  assert.equal(t.ok, false);
  assert.match(t.why, /rises again after the peak/);

  /* And one that dips on the way up. */
  const dip = peak(21).slice(); dip[4] = dip[3] - 0.2;
  const d = C.apeak(dip);
  assert.equal(d.ok, false);
  assert.match(d.why, /falls before the peak/);
});

test("the tolerance is slack for arithmetic, not for theory", () => {
  /* Floating-point wobble below ATOL must not read as a violation: a curve
     sampled at twenty-one points is never exactly monotone, and a check that
     demanded it would fail on arithmetic. */
  const wobble = up(21).map((y, i) => y + (i % 2 ? C.ATOL / 4 : -C.ATOL / 4));
  assert.equal(C.apeak(peak(21).map((y, i) => y + (i % 2 ? C.ATOL / 4 : 0))).ok, true,
    "noise under the tolerance should not break single-peakedness");
  assert.ok(C.amono(wobble, true).worst > -C.ATOL,
    "nor should it register as going the wrong way");
  /* And a real step, ten times the tolerance, must read as one. */
  const real = peak(21).slice(); real[3] = real[2] - 10 * C.ATOL;
  assert.equal(C.apeak(real).ok, false,
    "a fall ten times the tolerance is a fall");
  assert.equal(C.ATOL, 1e-9, "and the tolerance is stated rather than tuned");
});

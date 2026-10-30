/* THE CERTIFICATE BUILDER, which every proof this bench writes now goes
   through.

   It was inside `page/23-exchange.js` while the page was the only thing that
   wrote a certificate. `amg report` writes one from a scenario file, and two
   implementations of a proof format are two proof formats, so it moved to
   `core/certify.js` and both call it.

   What is asserted here is the two facts a certificate's conclusion rests on,
   which are also the two a reader checks:

     every leaf said to carry the sign carries it, read off the enclosure
       rather than off which list the box came from; and
     the leaves cover the declared box, because a list that does not tile the
       region it claims is not a proof of anything about that region.

   tests/exchange.mjs checks the same two properties on what the page
   actually writes. This checks them on the builder, over cases small enough
   to work out by hand.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { dTree, readExpr, rpnTree, simp } from "../docs/bench/core/kernel.js";
import { certify } from "../docs/bench/core/certify.js";

const d = (src, wrt, names) =>
  simp(dTree(rpnTree(readExpr(src, new Set(names)).rpn), wrt));

test("a derivative that is constant and positive certifies in one leaf", () => {
  /* d(a*b)/da is b, which over b in [1,2] is [1,2]: positive everywhere, so
     the search never has to split. */
  const C = certify(d("a * b", "a", ["a", "b"]), { a: [0, 1], b: [1, 2] });
  assert.ok(!C.err, C.err);
  assert.equal(C.dir, 1);
  assert.equal(C.best.verdict, "proved");
  assert.equal(C.certificate.leaves, 1);
  assert.equal(C.certificate.covers, 1);
  assert.deepEqual(C.certificate.split[0].enclosure, [1, 2]);
  assert.equal(C.certificate.split[0].holds, "with the sign");
});

test("the leaves cover the declared box, and every claimed sign is in its enclosure", () => {
  /* A derivative that changes sign inside the box, so the search must split
     and some leaves fall each way. d(a*a*b - a)/da = 2ab - 1, which over
     a,b in [0,1] runs from -1 to +1. */
  const C = certify(d("a * a * b - a", "a", ["a", "b"]), { a: [0, 1], b: [0, 1] });
  assert.ok(!C.err, C.err);
  assert.ok(C.certificate.leaves > 1, "a sign that turns inside the box certified in one leaf");
  /* Within a tolerance, because each leaf's share is rounded to six places
     and there can be hundreds of them. tests/exchange.mjs allows the same
     drift on what the page writes. */
  assert.ok(Math.abs(C.certificate.covers - 1) < 1e-4,
    `the leaves cover ${C.certificate.covers} of the box, not all of it`);
  for (const leaf of C.certificate.split) {
    if (!leaf.enclosure) { assert.ok(leaf.unbounded, "a leaf has neither an enclosure nor a reason"); continue; }
    const [lo, hi] = leaf.enclosure;
    assert.ok(lo <= hi, "an enclosure runs backwards");
    /* The claim each leaf makes has to be true of its own enclosure. This is
       the check a reader of the file performs, done here on the producer. */
    if (leaf.holds === "with the sign")
      assert.ok(C.dir > 0 ? lo >= 0 : hi <= 0,
        `a leaf claims the sign and its enclosure [${lo}, ${hi}] does not carry it`);
    if (leaf.holds === "against the sign")
      assert.ok(C.dir > 0 ? hi <= 0 : lo >= 0,
        `a leaf claims against the sign and its enclosure [${lo}, ${hi}] does not`);
    if (leaf.holds === "flat") assert.ok(lo <= 0 && hi >= 0);
  }
});

test("an enclosure that is not a number is reported as unbounded, never as null", () => {
  /* Interval arithmetic returns the whole line where it cannot bound an
     expression: a zero in a denominator here. JSON has no infinity and
     JSON.stringify turns both ends into null, which reads as a missing value
     rather than an unbounded one. This cost a run once: 64 of 133 leaves came
     out as null pairs and the file failed its own schema. */
  const C = certify(d("1 / a", "a", ["a"]), { a: [0, 1] });
  assert.ok(!C.err, C.err);
  const loose = C.certificate.split.filter(l => l.unbounded);
  assert.ok(loose.length, "no leaf over a box containing a pole came back unbounded");
  for (const l of loose) assert.ok(!("enclosure" in l), "an unbounded leaf also carries an enclosure");
  assert.ok(JSON.stringify(C.certificate).indexOf("null") < 0,
    "a null reached the certificate, where a reader cannot tell it from a missing value");
});

test("a ceiling whose branches cross inside the box is refused, by name", () => {
  /* The refusal that matters, and the one the shipped demonstration meets:
     where a min or max changes which branch binds inside the declared box
     there is no single branch to differentiate, so there is nothing to
     certify. It is refused with the reason rather than certified over one
     branch and quietly wrong on the other. The worked example carries two
     findings in exactly this state. */
  /* Handed the tree directly rather than its derivative, because that is
     where the guard sits: `proofOf` runs the same check on the inlined
     outcome before it differentiates, and `certify` runs it on whatever it
     is given. Either way nothing is certified over a branch that does not
     hold across the box. */
  const t = rpnTree(readExpr("min(a, b)", new Set(["a", "b"])).rpn);
  const C = certify(t, { a: [0, 1], b: [0, 1] });
  assert.ok(C.err, "a ceiling crossing inside the box was certified anyway");
  assert.match(C.err, /min|max|cross|split/i);
});

test("the certificate names its own method, so a reader knows what produced it", () => {
  const C = certify(d("a * b", "a", ["a", "b"]), { a: [0, 1], b: [1, 2] });
  assert.match(C.certificate.method, /interval/i);
  assert.equal(typeof C.certificate.boxes, "number");
  assert.equal(typeof C.certificate.leaves, "number");
});

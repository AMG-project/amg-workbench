"use strict";
/* THE CERTIFICATE, BUILT ONCE.
   ==========================================================================

   A certificate is the list of sub-boxes a branch-and-bound search split a
   declared box into, each with the interval enclosure of the derivative over
   it. It is what makes a proved sign recheckable by somebody who does not
   have this page: the conclusion follows from two facts about the list, and
   both are facts a reader can verify.

     every enclosure said to carry the sign does carry it, and
     the boxes cover the declared box.

   WHY IT IS HERE AND NOT IN THE PAGE. It was in `page/23-exchange.js`, where
   `proofOf` is, and that was fine while the page was the only thing that
   wrote one. `amg report` has to write the same certificate from a scenario
   file, and two implementations of a proof format is two proof formats. This
   takes the pair a caller already has -- the derivative as a tree, and the
   box -- and returns the certificate. The page supplies them from its live
   model; the command line supplies them from a scenario. Neither can produce
   a different answer, because there is one answer.

   What stays with each caller is everything around it: which finding this is
   about, what it rests on, which declarations were in force. Those are
   different questions and they have different sources. ================ */
import { ivalTree, mmResolve, mmWhy, proveSign } from "./kernel.js";

const r6 = x => Math.round(x * 1e6) / 1e6;
const vol = (b, names) => names.reduce((t, v) =>
  t * Math.max(0, (b[v] || [0, 0])[1] - (b[v] || [0, 0])[0]), 1);
const bound = b => {
  const o = {};
  for(const k of Object.keys(b)) o[k] = [r6(b[k][0]), r6(b[k][1])];
  return o;
};

/* How many leaves a certificate may carry before the file says it is a
   report of a search rather than a certificate of one. A list that was
   truncated and does not say so is the worst of both. */
const PROOFCAP = 1200;

/* `tree` is the derivative, `box` the declared region. Returns the split and
   what it amounts to, or an error naming what could not be resolved. */
function certify(tree, box){
  const dr = mmResolve(tree, box);
  if(dr.open.length) return {err:mmWhy(dr, box)};

  const up = proveSign(dr.tree, box, +1, {}), dn = proveSign(dr.tree, box, -1, {});
  const dir = up.verdict === "flat" ? 0 : up.share >= dn.share ? 1 : -1;
  const best = dir === -1 ? dn : up;
  const names = Object.keys(box);
  const all = vol(box, names);

  /* THE THREE ARRAYS proveSign RETURNS ARE THE LEAVES of the search, so every
     one gets its enclosure written out. `holds` is read off the enclosure and
     the claimed direction rather than off which array the box came from: the
     two agree, and writing the derived one means a reader checking the file
     is checking the claim and not the bookkeeping.

     AN ENCLOSURE THAT IS NOT A NUMBER IS STILL A FACT. Interval arithmetic
     returns the whole line for an expression it cannot bound over a box -- a
     zero in a denominator, a non-integer power of something that may be
     negative -- and such a leaf is undecided for a reason that has nothing to
     do with the box being wide. Writing it as [-Infinity, Infinity] is not an
     option: JSON has no infinity and JSON.stringify turns both ends into
     null, which reads as a missing value rather than an unbounded one. So the
     field is absent and `unbounded` says why. This cost a run: 64 of 133
     leaves came out as null pairs and the file failed its own schema. */
  const leaf = (b, fell) => {
    const iv = ivalTree(dr.tree, b);
    const o = {box:bound(b), holds:fell, share:r6(vol(b, names) / (all || 1))};
    if(isFinite(iv[0]) && isFinite(iv[1])) o.enclosure = [r6(iv[0]), r6(iv[1])];
    else o.unbounded = true;
    return o;
  };
  const split = [];
  for(const b of best.proved) split.push(leaf(b, dir === 0 ? "flat" : "with the sign"));
  for(const b of best.failed) split.push(leaf(b, "against the sign"));
  for(const b of best.open)   split.push(leaf(b, "not settled"));

  return {
    dir, best, resolved:dr.tree,
    certificate:{
      method:"branch and bound over interval enclosures, splitting the widest name",
      boxes:best.boxes || 0,
      leaves:split.length,
      covers:r6(split.reduce((t, s) => t + s.share, 0)),
      ...(split.length > PROOFCAP ? {truncated_at:PROOFCAP} : {}),
      ...(best.witness ? {witness:best.witness} : {}),
      split:split.slice(0, PROOFCAP)
    }
  };
}

export { PROOFCAP, bound, certify, r6, vol };

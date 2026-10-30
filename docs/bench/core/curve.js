/* core: what a sampled series says about its own shape.

   Four things, and they are the vocabulary half the bench's claims are stated
   in. Is this a number at all. Does the series ever go the wrong way, and by
   how much at worst. Does it rise to an interior maximum and fall away
   without turning back up. And the tolerance all three read against, because
   a curve sampled at twenty-one points is never exactly monotone and a check
   that demanded it would fail on arithmetic rather than on theory.

   `monotone_in`, the invariant that holds a declared-increasing term to its
   declaration, IS amono(). The nine claims in core/scope-run.js read ATOL from
   here, so a scholar who thinks 1e-9 is the wrong slack for a series sampled
   at 201 points changes one constant and the verdicts move with it: at 1e-2,
   `channels_non_negative` goes from holding at 73 of the 100 declared form
   combinations to holding at 95. docs/REPLACING-A-PART.md walks that.

   What apeak() is NOT is the model's own `mb_single_peaked`. That one asks
   only that the series never turns back up after its peak; this one also
   requires it to rise to the peak, which is the stronger test and the one a
   shape class is held to. The two were described here as the same thing until
   the worked example above was written, and they are not.

   Nothing here knows what a model is. A series of numbers goes in and a
   verdict about its shape comes out.

   core/ RULE: nothing in this file may import from outside core/.
   scripts/check_bench.py fails the build if one does. */

const ATOL = 1e-9;
const afin = v => typeof v === "number" && isFinite(v);

function amono(ys, up){
  let worst = 0, at = -1;
  for(let i = 1; i < ys.length; i++){
    const d = up ? ys[i] - ys[i - 1] : ys[i - 1] - ys[i];
    if(d < worst){ worst = d; at = i; }
  }
  return {worst, at};
}
function apeak(ys){
  let hi = 0;
  for(let i = 1; i < ys.length; i++) if(ys[i] > ys[hi]) hi = i;
  if(hi === 0 || hi === ys.length - 1) return {ok:false, hi, why:"the peak is at an end of the range"};
  const a = amono(ys.slice(0, hi + 1), true), b = amono(ys.slice(hi), false);
  if(a.worst < -ATOL) return {ok:false, hi, why:"it falls before the peak"};
  if(b.worst < -ATOL) return {ok:false, hi, why:"it rises again after the peak"};
  return {ok:true, hi};
}

export { ATOL, afin, amono, apeak };

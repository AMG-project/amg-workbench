/* core: what a proof verdict MEANS, in words.

   The engine returns one of five verdicts over a box -- proved, disproved,
   partial, flat, undecided -- and every part of the page that says anything
   about a finding has to turn that into a sentence, a label, a word that can
   be compared with what the scholar expected, or a tally over a declared
   class. Those rules were spread across four files, and every verdict
   defect this bench has had lived in that spread:

     - a derivative that is identically zero was reported as proved to RISE,
       and proved to fall, because a weak sign test passes both and the
       tie-break went to the first. There is a `flat` verdict now and it is
       its own word here.
     - a `partial` verdict was reported as a sign change wherever it appeared.
       It covers two different answers: boxes proved and boxes REFUTED, which
       is a turn, and boxes proved and boxes the search ran out of budget on,
       which is a proof over part of the range and silence over the rest. Only
       the first has a counter-example. Step 4.1's class run marked eight form
       combinations as turning where the full search proves them.
     - a tally read "32 of 32" without naming the set it ran over, and "32 of
       32" over the two ends and over the whole class are different sentences.

   One place, because a rule with four homes has four readings. Nothing here
   knows what a page is: every function takes the result, the line or the
   tally and returns a string. tests/verdict.test.mjs holds the rules.

   core/ RULE: nothing in this file may use a name declared outside core/.
   scripts/check_bench.py fails the build if one does. */
"use strict";

/* THE WITNESS IS WHAT MAKES A PARTIAL VERDICT A TURN. proveSign names a
   counter-example when it finds one and leaves it null when it ran out of
   budget, so the question "did the sign change" has exactly one honest
   answer and it is not the verdict field. Two shapes carry it, because the
   page records a derivation and the class run records a sign separately:
   `witness` on a derived line, `fail` (the share of refuted boxes) on a run.
   Either one above zero is a counter-example. */
const vTurned = r => !!r && (!!r.witness || +r.fail > 0);

/* The four words an expectation is offered in, and the two more a derivation
   can answer with. A scholar is asked to say `up`, `down`, `turns` or `none`
   BEFORE deriving; `flat` and "" are answers nothing in that list predicts,
   and both are kept rather than folded into one, because "it does not move"
   is a result and "not settled" is the absence of one. */
const GUESSLAB = {up:"rises", down:"falls", turns:"turns", none:"no view",
  flat:"does not move"};

/* THE BADGE WORD, AND THE ONE PLACE THAT CHOOSES IT.
   -------------------------------------------------------------------------
   This was VLAB, a flat map that called every partial verdict a turn, which
   is the mistake this file was written to stop: a turn needs a
   counter-example, and a partial without one is a proof over part of the box
   and silence over the rest. The worked example's P1 showed TURNS beside its
   own sentence saying no counter-example was found in the rest of the range.

   `turned` is the caller's answer to "was a counter-example found", because
   the two things that can answer it have different shapes: a derived line or
   a class run carries the evidence, so vTurned(r) reads it; a retained
   finding on the board does not keep the witness, but it keeps the word the
   line said at the time, so says === "turns" is its answer.

   An empty verdict is a row nothing has decided yet -- a line that came back
   from an outside tool and has not been re-derived here. It gets a word
   rather than an empty badge.

   Two words were chosen over what the old map said. "undecided" rather than
   "not settled", because it is the word the page's own explanations, the
   report and the proposal all use. "flat" rather than "does not move",
   because a badge is a name and a sentence is a sentence: vSay below still
   writes "does not move with X at all". */
const VWORD = {proved:"proved", disproved:"disproved", flat:"flat",
  undecided:"undecided", sampled:"sampled"};
function vWord(verdict, turned){
  if(verdict === "partial") return turned ? "turns" : "partial";
  if(!verdict) return "no verdict";
  return VWORD[verdict] || verdict;
}

/* THE KEY THE BADGE IS DRAWN BY, which is the word with the space taken out
   of it. One class per verdict and the stylesheet owns the colour, so no file
   under page/ chooses a verdict's colour any more than it chooses its word.
   An empty verdict is not a verdict: it keeps the outlined state badge the
   page uses for "unsigned", "checked" and "refused", because nothing has
   decided it and a filled badge would say something had. */
const vKey = (verdict, turned) => verdict ? vWord(verdict, turned).replace(/ /g, "") : "";

/* THE PROPOSITION, AS A SENTENCE.
   -------------------------------------------------------------------------
   The declared box has to appear in three different grammatical places and it
   was written one way for all of them. "for every X in [0.00, 1.00]" reads
   correctly after a verb and nowhere else, so a partial verdict came out as
   "rises with purpose clarity factor over 75.0% of FOR EVERY purpose clarity
   factor in [0.00, 1.00]", and a disproved one as "does not rise anywhere for
   every X in [0.00, 1.00]". The three forms are named here, and each branch
   below takes the one its own grammar wants.

   `em` is how the caller emphasises a name: the page wraps it in <b>, a test
   leaves it alone, an export strips it. Nothing here knows what a page is. */
function vBox(x, bx){
  if(!bx) return {over:"over the range declared for it",
    of:"the range declared for it", at:"in the range declared for it"};
  const r = "[" + (+bx[0]).toFixed(2) + ", " + (+bx[1]).toFixed(2) + "]";
  return {over:"for every " + x + " in " + r, of:"its declared range, " + r, at:"in " + r};
}

/* One sentence per verdict, and the only place that writes any of them.
   `sh` and `op` are already-formatted shares, because how a share is rounded
   is the caller's business and differs between the list and the board. */
function vSay(o, em){
  em = em || (t => t);
  const Y = em(o.y), X = em(o.x), B = vBox(o.x, o.bx);
  const seg = o.seg
    ? ", restricted to " + o.seg[0] + " in [" + (+o.seg[1]).toFixed(3) +
      ", " + (+o.seg[2]).toFixed(3) + "]" : "";
  const rise = o.dir > 0 ? "rises with" : "falls as";
  /* "does not RISES with" -- the disproved branch negates the verb, so it
     needs the bare form and not the third person the other branches use. */
  const bare = o.dir > 0 ? "rise with" : "fall as";
  const tail = o.dir > 0 ? "" : " rises";
  switch(o.verdict){
    case "proved":
      return Y + " " + rise + " " + X + tail + ", " + B.over + seg + ".";
    case "disproved":
      return Y + " does " + em("not") + " " + bare + " " + X + tail +
        " anywhere " + B.at + seg + ".";
    case "partial":
      return Y + " " + rise + " " + X + " over " + em(o.sh) + " of " + B.of + seg +
        (o.turnAt != null
          ? ", and the sign turns near " + o.x + " = " + (+o.turnAt).toFixed(3) + "."
          : ", and the rest of the range is " + em("not settled") +
            " \u2014 no counter-example was found in it.");
    case "flat":
      return Y + " does " + em("not move") + " with " + X + " at all, " + B.over + seg + ".";
    default:
      /* A TURN READ OFF THE CURVE, where the proof could not sign one. The
         shape is sampled and the sentence says both halves: what the proof
         did not settle, and what the curve does on the slice that was read.
         Never "proved" -- the word is the reading's own. */
      if(o.shape && o.shape.kind){
        const how = ", on a " + em("sampled") + " sweep of " + (o.shape.n || 81) +
          " points with the other parameters at their midpoints; the sign over " +
          B.of + seg + " is not settled by proof.";
        if(o.shape.at != null)
          return Y + " " + (o.shape.kind === "peak" ? "peaks" : "bottoms out") + " in " + X +
            " near " + o.x + " = " + (+o.shape.at).toFixed(3) + how;
        return Y + " " + (o.shape.kind === "rises" ? "rises with" : "falls as") + " " + X +
          (o.shape.kind === "rises" ? "" : " rises") + " at every point read" + how;
      }
      return "the sign of " + Y + " in " + X + " is not settled over " + B.of + seg +
        " \u2014 " + em(o.op) + " of it is undecided.";
  }
}

/* What a derived line says, in the words an expectation can be compared with.
   A line that was sampled rather than proved says the sampled thing, and says
   so on its own row; here it answers up or down like any other, because the
   comparison with what somebody expected is about the direction and the row
   is where the method is named. */
function lineSays(l){
  if(!l) return "";
  if(l.res){
    if(l.res.verdict === "partial") return vTurned(l.res) ? "turns" : "";
    if(l.res.verdict === "flat") return "flat";
    if(l.res.verdict === "proved") return l.res.dir > 0 ? "up" : "down";
    if(l.res.verdict === "disproved") return l.res.dir > 0 ? "down" : "up";
    return "";                                 // undecided answers nothing
  }
  return l.sim ? (l.sim.dir > 0 ? "up" : "down") : "";
}

/* The same question asked of one combination in a class run, where the result
   is a bare sign rather than a line. The two read the witness the same way,
   which is the point of their being in one file. */
function xrunWord(r){
  if(!r || r.err) return "";
  if(r.verdict === "partial") return vTurned(r) ? "turns" : "";
  if(r.verdict === "flat") return "flat";
  if(r.verdict === "proved") return r.dir > 0 ? "up" : "down";
  if(r.verdict === "disproved") return r.dir > 0 ? "down" : "up";
  return "";
}

/* The second dimension of a finding, in one clause: how many combinations of
   the declared class its conclusion survived, and WHICH SET that was. A
   finding carries two numbers -- the share of the declared box its sign was
   proved on, and this -- and a tally that does not name its set reads as the
   stronger of the two claims it could be making.

   `sets` is core/expset.js's EXPSETS, passed rather than reached for, so this
   file can be read without it. */
function xrunClause(f, sets){
  if(!f || !f.of) return "";
  const row = (sets || []).find(x => x[0] === f.set);
  const nm = row ? row[1] : String(f.set || "");
  const where = nm ? " (" + String(nm).toLowerCase() + ")" : "";
  const combo = n => n + " form combination" + (n === 1 ? "" : "s");
  const undec = f.undec || 0;
  /* AGREEMENT IS AMONG THE DECIDED, AND COVERAGE IS SAID SEPARATELY.
     This reported held over the whole set, which conflates two facts that
     point opposite ways. On the worked example 1,000 combinations agree,
     2,125 could not be settled, and NOT ONE turns the sign -- and the old
     clause rendered that as "holds at 1000 of 3125", which a reader takes for
     68% failure. What it described was a conclusion nothing in the class
     contradicts, over the third of the class a bounded search could reach.
     The box dimension has always said "the rest is not the other sign"; this
     is the same rule on the class dimension. Without it, a count of the
     tests a finding "fails" implies it is unsupported when nothing in the
     class contradicted it at all. */
  const turn = typeof f.turn === "number" ? f.turn
    : Math.max(0, f.of - f.held - undec);     // tallies written before turn was counted
  const dec = f.held + turn;
  if(!dec)
    return "undecided on every one of the " + combo(f.of) + where +
      ", so nothing here bears on the class either way";
  if(!turn && !undec) return "holds on every one of the " + combo(f.of) + where;
  if(!turn)
    return "holds on every one of the " + combo(dec) + " the search could decide, of " +
      f.of + where + "; the other " + undec + " are undecided, not contrary";
  return "holds on " + f.held + " of the " + combo(dec) + " the search could decide, of " +
    f.of + where + "; " + turn + " turn the other way" +
    (undec ? "; " + undec + " undecided" : "");
}

/* Whether a tally was computed against the arithmetic that is kept now. A
   tally against a body somebody has since rewritten is a number about a model
   that no longer exists, and saying so is cheaper than recomputing it.

   The current signature is an ARGUMENT. Reading the page's kept arithmetic
   from here is exactly the reach the core/ rule exists to refuse, and the
   caller has it anyway. */
const xrunStale = (f, sig) => !!f && !!f.sig && !!sig && f.sig !== sig;


export { GUESSLAB, VWORD, lineSays, vBox, vKey, vSay, vTurned, vWord, xrunClause, xrunStale, xrunWord };

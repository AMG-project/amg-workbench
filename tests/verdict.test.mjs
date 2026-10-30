/* core: what a verdict means, in words.

   One file for the rules, and these are the three that were wrong when they
   were spread across four. Each assertion here is a defect that shipped:

   1. A derivative identically zero is `flat`, which is neither up nor down.
      The engine's weak sign test passes both directions for it and the
      tie-break went to "rises", so `B rises with principal competence` was
      returned for a quantity B does not move with at all.
   2. A `partial` verdict is a turn only where a counter-example was found.
      It covers boxes proved and boxes REFUTED -- a turn -- and boxes proved
      and boxes the search ran out of budget on, which is a proof over part of
      the range and silence over the rest. Step 4.1's class run reported eight
      form combinations as turning where the full search proves them.
   3. A tally names its set. "32 of 32" over the two ends and over the whole
      class are different sentences.

   The witness is read from two shapes, because a derived line records one and
   a class run records the refuted share instead, and the rule has to be the
   same rule. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../docs/bench/core/expset.js";
import * as V from "../docs/bench/core/verdict.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

test("a partial verdict is a turn only where a counter-example was found", () => {
  /* The two shapes the counter-example arrives in. */
  assert.equal(V.xrunWord({verdict:"partial", fail:0.4, dir:1}), "turns");
  assert.equal(V.xrunWord({verdict:"partial", fail:0, dir:1}), "",
    "proved on part of the box and unsettled on the rest is not a sign change");
  assert.equal(V.lineSays({res:{verdict:"partial", witness:{x:0.5}, dir:1}}), "turns");
  assert.equal(V.lineSays({res:{verdict:"partial", witness:null, dir:1}}), "",
    "a derived line reports the turn nobody found in the same way");
  assert.equal(V.vTurned({fail:0}), false);
  assert.equal(V.vTurned({witness:{}}), true);
});

test("a derivative that never leaves zero is neither up nor down", () => {
  assert.equal(V.xrunWord({verdict:"flat", dir:0}), "flat");
  assert.equal(V.lineSays({res:{verdict:"flat", dir:0}}), "flat");
  /* And it is comparable with what the scholar expected, which is why it is a
     word rather than an empty string: somebody who said it would rise was
     wrong, and the board can say so. */
  assert.equal(V.GUESSLAB.flat, "does not move");
  assert.equal(V.VWORD.flat, "flat");
});

test("the plain verdicts, and the ones that answer nothing", () => {
  assert.equal(V.xrunWord({verdict:"proved", dir:1}), "up");
  assert.equal(V.xrunWord({verdict:"proved", dir:-1}), "down");
  assert.equal(V.xrunWord({verdict:"disproved", dir:1}), "down");
  assert.equal(V.xrunWord({verdict:"undecided"}), "");
  assert.equal(V.xrunWord({err:"a corner crosses the box"}), "");
  assert.equal(V.xrunWord(null), "");
  assert.equal(V.lineSays(null), "");
  assert.equal(V.lineSays({res:{verdict:"undecided", dir:1}}), "");
  assert.equal(V.lineSays({sim:{dir:-1}}), "down", "a sampled line still says a direction");
});

test("the tally names the set it was run over", () => {
  const c = V.xrunClause({held:32, of:32, undec:0, set:"ends"}, E.EXPSETS);
  assert.match(c, /every one of the 32/);
  assert.match(c, /two ends/, "a tally that does not name its set is ambiguous");
  /* AGREEMENT AMONG THE DECIDED, never over the whole set. A conclusion that
     nothing contradicts and that a bounded search could reach on a third of
     the class is not a conclusion that failed two thirds of its tests, and
     reporting held over `of` said exactly that. The worked example ships this
     case: 1,000 agree, 2,125 undecided, 0 turned. */
  const cov = V.xrunClause({held:1000, of:3125, undec:2125, turn:0, set:"all"}, E.EXPSETS);
  assert.match(cov, /holds on every one of the 1000 form combinations the search could decide/);
  assert.match(cov, /of 3125 \(everything\); the other 2125 are undecided, not contrary/);
  assert.doesNotMatch(cov, /1000 of 3125/,
    "the share of the whole set reads as failure and is never the headline");
  /* Nothing undecided and nothing turned is the clean case, and it should say
     so in the fewest words. */
  assert.match(V.xrunClause({held:125, of:125, undec:0, turn:0, set:"all"}, E.EXPSETS),
    /^holds on every one of the 125 form combinations \(everything\)$/);
  /* A combination that turns the sign is the third state, and the only one
     that is evidence against the conclusion. */
  assert.match(V.xrunClause({held:100, of:125, undec:5, turn:20, set:"all"}, E.EXPSETS),
    /holds on 100 of the 120 form combinations the search could decide, of 125 \(everything\); 20 turn the other way; 5 undecided/);
  /* Nothing decided at all: the demonstration ships two rows in this state,
     and the sentence has to refuse to be read either way. */
  assert.match(V.xrunClause({held:0, of:3125, undec:3125, turn:0, set:"all"}, E.EXPSETS),
    /undecided on every one of the 3125 form combinations \(everything\), so nothing here bears on the class either way/);
  /* A tally written before `turn` was counted still has to read correctly,
     which means falling back to subtraction rather than to zero. */
  assert.match(V.xrunClause({held:100, of:125, undec:5, set:"all"}, E.EXPSETS),
    /20 turn the other way/);
  assert.equal(V.xrunClause({held:0, of:0}, E.EXPSETS), "", "nothing run, nothing claimed");
  assert.equal(V.xrunClause(null, E.EXPSETS), "");
  /* The set list is PASSED, not reached for, so this file reads on its own --
     and without it the clause names the raw key rather than nothing, because
     an unnamed set is the ambiguity this clause exists to remove. */
  assert.equal(V.xrunClause({held:1, of:1, set:"written"}, null),
    "holds on every one of the 1 form combination (written)");
});

test("a tally against a body that has since changed says so", () => {
  assert.equal(V.xrunStale({sig:"abc"}, "abc"), false);
  assert.equal(V.xrunStale({sig:"def"}, "abc"), true);
  assert.equal(V.xrunStale({}, "abc"), false, "a tally with no signature cannot be stale");
  assert.equal(V.xrunStale({sig:"abc"}, null), false, "nothing kept, nothing to be stale against");
});

/* THE BADGE WORD. The worked example's P1 is a partial verdict with no
   counter-example: its own sentence says the rest of the range is not
   settled, and its badge said TURNS. Three more rows came back from an
   outside tool with no verdict at all and showed an empty badge. */
test("a partial verdict is a turn only where something turned", () => {
  assert.equal(V.vWord("partial", false), "partial");
  assert.equal(V.vWord("partial", true), "turns");
  assert.equal(V.vWord("proved", false), "proved");
  assert.equal(V.vWord("disproved", false), "disproved");
  assert.equal(V.vWord("flat", false), "flat");
  assert.equal(V.vWord("sampled", false), "sampled");
  /* A row nothing has decided says so, rather than drawing an empty box. */
  assert.equal(V.vWord("", false), "no verdict");
  assert.equal(V.vWord(undefined, false), "no verdict");
  /* The board does not keep the witness; it keeps the word the line said,
     which is the same answer written down at the time. This is the call the
     page makes, with the demonstration's own P1 fields. */
  const p1 = {verdict:"partial", says:"", share:0.75};
  assert.equal(V.vWord(p1.verdict, p1.says === "turns"), "partial",
    "a partial row without says:\"turns\" must never read \"turns\"");
  const turned = {verdict:"partial", says:"turns"};
  assert.equal(V.vWord(turned.verdict, turned.says === "turns"), "turns");
});

/* THE PROPOSITION, AS A SENTENCE. The declared box has to appear in three
   grammatical places and was written one way for all of them, so a partial
   verdict read "rises with purpose clarity factor over 75.0% of FOR EVERY
   purpose clarity factor in [0.00, 1.00]". Every branch is built here and
   read for that and for its neighbours. */
test("every verdict's sentence reads as English", () => {
  const base = {y:"firm accounting performance", x:"purpose clarity factor",
    dir:1, bx:[0, 1], sh:"75.0%", op:"25.0%"};
  const say = o => V.vSay(Object.assign({}, base, o));
  const all = ["proved", "disproved", "partial", "flat", "undecided", ""]
    .map(verdict => say({verdict}))
    .concat([say({verdict:"partial", turnAt:0.5822}),
             say({verdict:"proved", dir:-1}),
             say({verdict:"proved", seg:["pi", 0, 0.5822]}),
             say({verdict:"disproved", bx:null}),
             say({verdict:"partial", bx:null}),
             say({verdict:"undecided", bx:null})]);
  for(const t of all){
    assert.ok(!/ of for /.test(t), "ran two box phrases together: " + t);
    assert.ok(!/anywhere for every/.test(t), "disproved reads as a universal: " + t);
    assert.ok(!/not rises|not falls/.test(t), "negated the inflected verb: " + t);
    assert.ok(!/\s{2,}/.test(t), "double space: " + t);
    assert.ok(/[.]$/.test(t), "no full stop: " + t);
  }
  assert.equal(say({verdict:"proved"}),
    "firm accounting performance rises with purpose clarity factor, " +
    "for every purpose clarity factor in [0.00, 1.00].");
  assert.equal(say({verdict:"proved", dir:-1}),
    "firm accounting performance falls as purpose clarity factor rises, " +
    "for every purpose clarity factor in [0.00, 1.00].");
  assert.equal(say({verdict:"disproved"}),
    "firm accounting performance does not rise with purpose clarity factor " +
    "anywhere in [0.00, 1.00].");
  assert.equal(say({verdict:"partial"}),
    "firm accounting performance rises with purpose clarity factor over 75.0% of " +
    "its declared range, [0.00, 1.00], and the rest of the range is not settled " +
    "— no counter-example was found in it.");
  assert.equal(say({verdict:"partial", turnAt:0.5822}),
    "firm accounting performance rises with purpose clarity factor over 75.0% of " +
    "its declared range, [0.00, 1.00], and the sign turns near " +
    "purpose clarity factor = 0.582.");
  assert.equal(say({verdict:"flat"}),
    "firm accounting performance does not move with purpose clarity factor at all, " +
    "for every purpose clarity factor in [0.00, 1.00].");
  assert.equal(say({verdict:"undecided"}),
    "the sign of firm accounting performance in purpose clarity factor is not settled " +
    "over its declared range, [0.00, 1.00] — 25.0% of it is undecided.");
  /* A line restricted to part of one variable's range says so, after the box
     and not inside it: the two name different variables. */
  assert.match(say({verdict:"proved", seg:["pi", 0, 0.5822]}),
    /\[0\.00, 1\.00\], restricted to pi in \[0\.000, 0\.582\]\.$/);
  /* No box declared: every form falls back to naming it rather than printing
     an empty bracket. */
  assert.match(say({verdict:"proved", bx:null}), /over the range declared for it\.$/);
  assert.match(say({verdict:"disproved", bx:null}), /anywhere in the range declared for it\.$/);
  assert.match(say({verdict:"partial", bx:null}), /over 75\.0% of the range declared for it,/);
  /* The caller decides how a name is emphasised, and nothing here knows. */
  assert.match(V.vSay({...base, verdict:"flat"}, w => "<b>" + w + "</b>"),
    /<b>firm accounting performance<\/b> does <b>not move<\/b> with/);
});

/* The class the badge is coloured by is the word with the space taken out,
   so a word and its colour cannot come apart. An empty verdict has no key,
   because nothing has decided it and a filled badge would say something had. */
test("the badge key follows the word", () => {
  assert.equal(V.vKey("proved", false), "proved");
  assert.equal(V.vKey("disproved", false), "disproved");
  assert.equal(V.vKey("partial", false), "partial");
  assert.equal(V.vKey("partial", true), "turns");
  assert.equal(V.vKey("undecided", false), "undecided");
  assert.equal(V.vKey("sampled", false), "sampled");
  assert.equal(V.vKey("", false), "");
  assert.equal(V.vKey(undefined, true), "");
  assert.equal(V.vKey("flat", false), "flat");
  for(const v of ["proved", "disproved", "partial", "flat", "undecided"])
    assert.ok(!/\s/.test(V.vKey(v, false)), "a key with a space in it is not a class: " + v);
});

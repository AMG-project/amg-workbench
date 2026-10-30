/* The workspace: step six's list, its folders, its filter, and the two trips
   a line can take outside the browser.

   Every one of these was a browser-only behaviour until this file existed,
   which is the same gap the lattice tests closed: the folder predicates
   decide what a scholar sees, the combine guards decide what gets made, and
   the R script is the only thing on this bench that leaves it as a document
   somebody else runs. None of that needs a DOM, so none of it should have
   needed a page to be checked.

   The module is loaded with the globals it reads at CALL time injected first
   -- BUF, bufLab, bufFind, bufPush, OP, simp -- which is what a classic
   script in one shared scope resolves against anyway. Nothing is stubbed that
   computes: OP and simp are the real kernel's. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* THE REAL MODULES, not twelve faked globals.

   This file used to install `BUF`, `bufPush`, `bufFind`, `bufLab`, `lsRead`,
   `lsWrite`, `lineSays`, `GUESS`, `BOARD`, `gkey`, `hesc` and `noteFail` on
   globalThis and then require the file under test, because a classic script
   resolves those names off the shared scope at call time. A module resolves
   them through imports, so the fakes were simply ignored -- and that is an
   improvement: what runs here now is the page's own buffer, its own store
   helpers and its own verdict rules, so a test that passes says the wiring
   works and not that the fakes agreed with each other.

   Dynamic import, because `localStorage` has to exist before the graph
   evaluates and a static import is hoisted above every statement in the file.

   The browser store is faked and nothing else is: the test still says WHAT
   gets persisted -- the folders and the open one, deliberately not the lines.
   A buffer restored from an earlier session would carry verdicts proved
   against declarations that may have changed since. */
const STORE = {};
globalThis.localStorage = {
  getItem: k => (k in STORE ? STORE[k] : null),
  setItem: (k, v) => { STORE[k] = String(v); },
  removeItem: k => { delete STORE[k]; }
};

const W = await import("../docs/bench/page/18-workspace.js");
/* lineCandidate() is core/rank.js now: what makes a line worth standing
   behind is a judgement about findings, not about the workspace that holds
   them. tests/rank.test.mjs covers the rest of that file. */
const R = await import("../docs/bench/core/rank.js");
const D = await import("../docs/bench/page/09-derive.js");
const K = await import("../docs/bench/core/kernel.js");
const BUF = D.BUF;
const bufPush = D.bufPush;

/* A line, as the buffer makes them. The ids come off a counter of this
   file's own, and the buffer's own counter is pushed well clear of it, so a
   line bufPush makes can never collide with one the test wrote -- which it
   did, and sent a combination looking up the wrong operand. */
let fixt = 0;
const line = o => Object.assign({src: "auto", cmd: "", y: "", x: "", stated: false,
  id: "T" + (++fixt), tree: K.VAR("a"), text: "a"}, o);
function seed(...ls){
  BUF.lines.length = 0; BUF.sel = ""; BUF.err = "";
  for(const l of ls) BUF.lines.push(l);
  return BUF.lines;
}
const reset = () => { W.WS.own.length = 0; W.WS.fold = ""; W.WS.q = ""; W.WS.err = ""; };

test("a kind folder asks how the line got here, a state folder what is known", () => {
  reset();
  seed(
    line({cmd: "diff", y: "welfare", x: "clarity", res: {verdict: "proved", dir: 1, share: 1, open: 0, boxes: 3}}),
    line({cmd: "diff", y: "welfare", x: "cost", res: {verdict: "partial", dir: -1, share: 0.4, open: 0, boxes: 9}}),
    line({cmd: "write", src: "hand"}),
    line({cmd: "inline", y: "welfare"}),
    line({cmd: "diff", bad: "max has a corner inside the range", tree: null}),
  );
  assert.equal(W.wsCount(""), 5, "everything is in All lines");
  assert.equal(W.wsCount("k:diff"), 3, "three commands were diff, including the one that failed");
  assert.equal(W.wsCount("k:hand"), 1);
  assert.equal(W.wsCount("k:inline"), 1);
  assert.equal(W.wsCount("k:bad"), 1);
  assert.equal(W.wsCount("s:proved"), 1);
  assert.equal(W.wsCount("s:partial"), 1);
  /* The two trees are INDEPENDENT, which is the whole reason there are two:
     a derivative can be proved, unsigned or refused, and a proved line can
     have come from anywhere. */
  assert.equal(W.wsCount("s:unsigned"), 2, "the written line and the outcome, not the refused one");
  assert.equal(W.wsCount("s:stated"), 0);
  /* A folder nothing matches reports zero rather than being absent: a rail
     that hid its empty folders would stop being a map of the possibilities. */
  assert.equal(W.wsCount("s:scored"), 0);
  assert.equal(W.wsCount("k:comb"), 0);
});

test("an unknown folder id shows everything rather than nothing", () => {
  reset();
  seed(line({}), line({}));
  /* The rail is persisted and the folder vocabulary is not. A saved folder
     from an older page must not silently empty the list. */
  assert.equal(W.wsCount("k:nosuchkind"), 2);
  assert.equal(W.wsCount("zzz"), 2);
});

test("the filter reads what the row shows, and every word has to match", () => {
  reset();
  seed(
    line({cmd: "diff", y: "welfare", x: "clarity", note: "the derivative, as an expression"}),
    line({cmd: "diff", y: "profit", x: "clarity", note: "nothing here"}),
  );
  W.WS.q = "welfare";
  assert.equal(W.wsLines().length, 1);
  W.WS.q = "WELFARE CLARITY";
  assert.equal(W.wsLines().length, 1, "case does not matter and both words must hit");
  W.WS.q = "welfare profit";
  assert.equal(W.wsLines().length, 0, "two words on two different rows match neither");
  W.WS.q = "expression";
  assert.equal(W.wsLines().length, 1, "the note is searched too");
  W.WS.q = "";
  assert.equal(W.wsLines().length, 2);
});

test("the filter and the folder compose, and the bar can say so", () => {
  reset();
  seed(
    line({cmd: "diff", y: "welfare", x: "clarity", res: {verdict: "proved", dir: 1, share: 1, open: 0, boxes: 1}}),
    line({cmd: "diff", y: "profit", x: "clarity"}),
    line({cmd: "write", src: "hand", note: "welfare by hand"}),
  );
  W.WS.fold = "k:diff"; W.WS.q = "welfare";
  assert.equal(W.wsLines().length, 1, "the hand line matches the filter and not the folder");
  assert.equal(W.wsFoldName("k:diff"), "Derivatives");
  assert.equal(W.wsFoldName(""), "everything");
});

test("a folder of the scholar's is named, unique, and filing is by hand", () => {
  reset();
  seed(line({}), line({}));
  W.wsAdd("substitution path");
  assert.equal(W.WS.own.length, 1);
  assert.equal(W.WS.err, "");
  W.wsAdd("  ");
  assert.equal(W.WS.own.length, 1, "a folder needs a name");
  assert.match(W.WS.err, /name/);
  W.wsAdd("Substitution Path");
  assert.equal(W.WS.own.length, 1, "the same name in different case is the same folder");
  W.wsAdd("complements path");
  assert.equal(W.WS.own.length, 2);
  assert.notEqual(W.WS.own[0].id, W.WS.own[1].id);
  /* NOTHING is filed automatically. A computed folder is a question asked of
     the line; an own folder is a decision, and the page does not take it. */
  assert.equal(W.wsCount("f:" + W.WS.own[0].id), 0);
  assert.equal(W.wsCount("f:none"), 2);
  W.wsFile(BUF.lines[0].id, W.WS.own[0].id);
  assert.equal(W.wsCount("f:" + W.WS.own[0].id), 1);
  assert.equal(W.wsCount("f:none"), 1);
});

test("deleting a folder unfiles its lines and does not delete them", () => {
  reset();
  seed(line({}), line({}));
  W.wsAdd("a path");
  const id = W.WS.own[0].id;
  W.wsFile(BUF.lines[0].id, id);
  W.WS.fold = "f:" + id;
  W.wsDel(id);
  assert.equal(W.WS.own.length, 0);
  assert.equal(BUF.lines.length, 2, "the lines stay on the buffer");
  assert.equal(BUF.lines[0].fold, "", "and they are unfiled");
  assert.equal(W.WS.fold, "", "the view falls back rather than showing a folder that is gone");
});

test("combining two lines is refused for the reasons that make it meaningless", () => {
  reset();
  const a = line({cmd: "diff", y: "welfare", x: "clarity", tree: K.VAR("a")});
  const b = line({cmd: "diff", y: "profit", x: "clarity", tree: K.VAR("b")});
  const noexpr = line({tree: null, text: ""});
  const seg = line({cmd: "diff", y: "welfare", x: "clarity", tree: K.VAR("c"),
    seg: ["clarity", 0, 0.5]});
  seed(a, b, noexpr, seg);

  W.wsCombine(a.id, "+", a.id);
  assert.match(BUF.err, /one line twice/);
  W.wsCombine(a.id, "+", noexpr.id);
  assert.match(BUF.err, /no expression/);
  W.wsCombine(a.id, "+", seg.id);
  assert.match(BUF.err, /different parts of the range/,
    "two lines proved on different parts of a range are about different places");
  W.wsCombine(a.id, "^", b.id);
  assert.match(BUF.err, /unknown operator/);
  W.wsCombine("nope", "+", b.id);
  assert.match(BUF.err, /pick two lines/);
  assert.equal(BUF.lines.length, 4, "not one of those made a line");
});

test("a combination is an expression, unsigned, and says what it is not", () => {
  reset();
  const a = line({cmd: "diff", y: "welfare", x: "clarity", tree: K.VAR("a")});
  const b = line({cmd: "diff", y: "profit", x: "clarity", tree: K.VAR("b")});
  seed(a, b);
  W.wsCombine(a.id, "+", b.id);
  assert.equal(BUF.err, "");
  assert.equal(BUF.lines.length, 3);
  const c = BUF.lines[2];
  assert.equal(c.cmd, "comb");
  assert.deepEqual(c.of, [a.id, b.id]);
  assert.equal(c.text, "a + b");
  assert.equal(c.x, "clarity", "both were in the same parameter, so it carries it");
  assert.equal(c.y, "", "and it is about no outcome, because an operator is not a proposition");
  assert.ok(!c.res && !c.stated, "it arrives with nothing proved about it");
  assert.match(c.note, /not yet about anything/);

  /* Different parameters: the line still gets made, and the note says the
     two were in different parameters rather than pretending otherwise. */
  const d = line({cmd: "diff", y: "welfare", x: "cost", tree: K.VAR("d")});
  BUF.lines.push(d);
  W.wsCombine(a.id, "*", d.id);
  const e = BUF.lines[BUF.lines.length - 1];
  assert.equal(e.x, "");
  assert.match(e.note, /different parameters/);
  assert.equal(e.text, "a * d");
});

test("a hand line in a combination makes the combination a hand line", () => {
  reset();
  const a = line({cmd: "write", src: "hand", tree: K.VAR("a")});
  const b = line({cmd: "diff", y: "y", x: "x", src: "auto", tree: K.VAR("b")});
  seed(a, b);
  W.wsCombine(a.id, "-", b.id);
  /* Provenance is not laundered by an operator. A derived line and a written
     one combine into something a reader has to be told was partly written. */
  assert.equal(BUF.lines[2].src, "hand");
});

test("a line is a candidate only once it says a direction", () => {
  reset();
  assert.equal(R.lineCandidate(line({tree: K.VAR("a")})), null, "no pair of quantities");
  assert.equal(R.lineCandidate(line({y: "welfare", x: "clarity"})), null,
    "a pair but nothing proved or sampled, so no direction to score");
  const up = R.lineCandidate(line({y: "welfare", x: "clarity",
    res: {verdict: "proved", dir: 1, share: 1, open: 0, boxes: 2}}));
  assert.equal(up.form, "up");
  assert.equal(up.verdict, "proved");
  assert.equal(up.src, "line");
  const down = R.lineCandidate(line({y: "welfare", x: "cost",
    sim: {dir: -1, share: 0.98, draws: 400}}));
  assert.equal(down.form, "down");
  assert.equal(down.verdict, "sampled", "a sampled line is a candidate and says it was sampled");
  assert.match(down.why, /sampled rather than proved/);
});

test("the R script carries what was proved, and says what it cannot do", () => {
  reset();
  const l = line({cmd: "diff", y: "welfare", x: "clarity",
    tree: K.VAR("a"), text: "a",
    res: {verdict: "proved", dir: 1, share: 1, open: 0, boxes: 7},
    bx: {clarity: [0.1, 0.9]}});
  const r = W.exportRline(l);
  assert.match(r, /sign \+/);
  assert.match(r, /clarity in \[0\.1000, 0\.9000\]/);
  assert.match(r, /EXPECTED <- "\+"/);
  assert.match(r, /library\(boot\)/);
  assert.match(r, /AMG-DATA/);
  /* The two sentences that have to be in it. The model is conditional on
     declarations and a regression is conditional on a sample, so neither is
     a verdict on the other -- and the script says so rather than leaving a
     reader to assume a p-value tested the arithmetic. */
  assert.match(r, /That is not a test of the/);
  assert.match(r, /the sign is what is bootstrapped/);
  /* Nothing is guessed: a column standing in for a construct is the
     scholar's measurement decision and the script leaves it empty. */
  assert.match(r, /OUTCOME {2}<- ""/);
  assert.match(r, /CONTROLS <- character\(0\)/);
  assert.ok(!/stats::lm\(f, data = d\)\s*$/.test(r));
  /* No turning point was proved, so no quadratic is offered. */
  assert.ok(!/vertex/.test(r), "a linear model proved monotone gets no quadratic");
});

test("a proved turning point adds the quadratic, and the derived interval to read it against", () => {
  reset();
  const l = line({cmd: "diff", y: "welfare", x: "clarity", tree: K.VAR("a"), text: "a",
    res: {verdict: "partial", dir: 1, share: 0.42, open: 0, boxes: 31},
    flip: [0.3125, 0.3438], bx: {clarity: [0, 1]}});
  const r = W.exportRline(l);
  assert.match(r, /I\(", DRIVER, "\^2\)/);
  assert.match(r, /vertex/);
  assert.match(r, /\[0\.3125, 0\.3438\]/,
    "the derived interval travels with the test, because a vertex with nothing to compare it to is a number");
});

test("what comes back from data is recorded, parsed, and never believed", () => {
  reset();
  const l = line({y: "welfare", x: "clarity"});
  seed(l);
  W.wsDataIn(l.id, "");
  assert.match(BUF.err, /nothing pasted/);
  assert.equal(l.data, undefined);
  W.wsDataIn("nope", "AMG-DATA x agrees=yes n=10");
  assert.match(BUF.err, /select a line/);
  W.wsDataIn(l.id, "x".repeat(601));
  assert.match(BUF.err, /longer than a result line/);
  assert.equal(l.data, undefined, "none of those recorded anything");

  W.wsDataIn(l.id, "AMG-DATA dwelfare/dclarity  sign=+  b=0.0412  p=0.0038  n=1240  agrees=yes");
  assert.equal(BUF.err, "");
  assert.equal(l.data.agrees, "yes");
  assert.equal(l.data.n, 1240);
  assert.match(l.data.at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  /* It lands as data on the line and NOT as a verdict: nothing it says
     touches res, sim or stated, because the page did not run it. */
  assert.equal(l.res, undefined);
  assert.equal(l.sim, undefined);
  assert.equal(l.stated, false);
  /* And it files itself into the data folder, which is how a scholar finds
     every line they have taken outside. */
  assert.equal(W.wsCount("k:data"), 1);

  W.wsDataIn(l.id, "AMG-DATA something  agrees=no  n=88");
  assert.equal(l.data.agrees, "no", "a later result replaces the earlier one");
  W.wsDataIn(l.id, "AMG-DATA something with no verdict in it");
  assert.equal(l.data.agrees, "unknown");
  assert.equal(l.data.n, null);
});

test("the rail persists and the buffer does not, and the store says which", () => {
  reset();
  seed(line({cmd: "diff", y: "welfare", x: "clarity",
    res: {verdict: "proved", dir: 1, share: 1, open: 0, boxes: 4}}));
  W.wsAdd("substitution path");
  W.wsFile(BUF.lines[0].id, W.WS.own[0].id);
  W.WS.fold = "f:" + W.WS.own[0].id;
  W.wsSave();
  /* Read back the way the page reads it. The fake is a real localStorage --
     it holds strings -- so poking STORE directly would be asserting about the
     fake's shape rather than about what was persisted. */
  const saved = JSON.parse(STORE["purposeWorkspace"]);
  assert.deepEqual(Object.keys(saved).sort(), ["fold", "own", "seq"]);
  assert.equal(saved.own.length, 1);
  assert.equal(saved.own[0].name, "substitution path");
  /* No lines, and that is the decision rather than an omission: a verdict
     restored from a previous session was proved against declarations that
     may have moved, and the whole bench rebuilds its model per command to
     avoid exactly that. Work that is meant to survive a reload leaves by
     the deposit, which carries the declarations it was proved against. */
  assert.ok(!("lines" in saved));

  /* And it reads back. A folder vocabulary that saved and did not load is
     the bug that took a week to find on the full-text store. */
  W.WS.own.length = 0; W.WS.fold = ""; W.WS.seq = 0;
  W.wsLoad();
  assert.equal(W.WS.own.length, 1);
  assert.equal(W.WS.own[0].name, "substitution path");
  assert.equal(W.WS.fold, saved.fold);
  assert.equal(W.WS.seq, saved.seq);
});

test("a saved folder with no id is dropped rather than crashing the rail", () => {
  reset();
  /* Written as localStorage holds it, a string, because that is what the page
     will read. */
  STORE["purposeWorkspace"] = JSON.stringify(
    {own: [{name: "no id"}, {id: "F9", name: "fine"}], seq: 9, fold: "f:F9"});
  W.WS.own.length = 0;
  W.wsLoad();
  assert.equal(W.WS.own.length, 1);
  assert.equal(W.WS.own[0].id, "F9");
  assert.equal(W.WS.seq, 9, "and the counter does not reissue an id that is already out");
});

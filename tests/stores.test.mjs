/* The failure recorder.

   23 catch blocks across the page swallowed their error whole, and the storage helpers that did record theirs recorded them to the
   console, which a reviewer opening the workbench will not look at. "The page
   works and nothing is being saved" was the one failure nobody could see from
   the screen.

   The property that matters most here is the quiet one: with nothing failing,
   the status line renders NOTHING. That is what keeps a normal run, and the
   page walk's snapshot, unchanged -- and it is the property a well-meaning
   edit would break first by rendering "0 problems". */

import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/* The page's own globals, as the browser would have them. 03-stores.js reads
   the corpus at load time -- G.claims, G.nodes, G.papers, G.journals -- which
   is itself one of the load-time statements this is about. An empty
   corpus is enough: nothing under test touches it. */
globalThis.G = {claims: [], nodes: [], papers: {}, journals: [],
  approaches: {}, cyears: {}};
globalThis.hesc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const STORE = new Map();
let fail = null;
globalThis.localStorage = {
  getItem: k => (fail === "read" ? (() => { throw new Error("blocked"); })()
    : STORE.has(k) ? STORE.get(k) : null),
  setItem: (k, v) => { if(fail === "write") throw new Error("quota exceeded");
    STORE.set(k, String(v)); },
  removeItem: k => { if(fail === "drop") throw new Error("blocked"); STORE.delete(k); }
};

/* DYNAMIC import, after the globals above are in place. A static `import` is
   HOISTED: the whole graph evaluates before any statement here runs, so a
   global a test installs would arrive after the code reading it had loaded.
   Under `require` the order was the other way about. */
const S = await import("../docs/bench/page/03-stores.js");
const reset = () => { S.LSFAIL.length = 0; S.FAILSEEN.clear(); fail = null; };

test("nothing failed, so the status line is not there at all", () => {
  reset();
  assert.equal(S.failBar(), "",
    "an empty status line is what keeps a normal run unchanged");
  assert.equal(S.LSFAIL.length, 0);
});

test("a failure is recorded, and the console is warned once per place", () => {
  reset();
  const warned = [];
  const was = console.warn;
  console.warn = m => warned.push(String(m));
  try {
    S.noteFail("carry/state", new Error("refused"));
    S.noteFail("carry/state", new Error("refused"));
    S.noteFail("carry/state", new Error("refused again"));
    S.noteFail("groups/g1", new Error("offline"));
  } finally { console.warn = was; }
  assert.equal(S.LSFAIL.length, 4, "every failure is kept");
  assert.deepEqual(warned.length, 2,
    "the console is told once per place, or a failing render fills it");
  assert.match(warned[0], /carry\/state failed — refused/);
  assert.match(warned[1], /groups\/g1 failed — offline/);
});

test("the status line counts every failure and lists each place once", () => {
  reset();
  S.noteFail("carry/state", new Error("refused"));
  S.noteFail("carry/state", new Error("refused"));
  S.noteFail("the worklist", new Error("boom"));
  const h = S.failBar();
  assert.match(h, /<b>3<\/b> things/, "it counts failures, not places");
  assert.equal((h.match(/<li>/g) || []).length, 2, "and lists each place once");
  assert.match(h, /The rest of the page is working/);
});

test("a reason is escaped, because it can carry a name from a file", () => {
  reset();
  S.noteFail("loading <img src=x onerror=alert(1)>", new Error("<b>no</b>"));
  const h = S.failBar();
  assert.doesNotMatch(h, /<img/, "an unescaped reason is script in the page");
  assert.doesNotMatch(h, /<b>no<\/b>/);
  assert.match(h, /&lt;img/);
});

test("the storage helpers never throw, and route through the recorder", () => {
  reset();
  assert.equal(S.lsWrite("k", {a: 1}), true);
  assert.deepEqual(S.lsRead("k"), {a: 1});
  assert.equal(S.lsRead("absent"), undefined, "absent and unreadable are alike");
  assert.equal(S.LSFAIL.length, 0);

  fail = "write";
  assert.equal(S.lsWrite("k2", {a: 1}), false, "it reports the failure, it does not throw");
  fail = "read";
  assert.equal(S.lsRead("k"), undefined);
  fail = "drop";
  assert.equal(S.lsDrop("k"), false);
  fail = null;
  assert.equal(S.LSFAIL.length, 3);
  /* lsFail keeps `what` and `key` apart, because callers of LSFAIL read them,
     and it also fills `where` so the status line can name the place. */
  assert.deepEqual(S.LSFAIL.map(f => f.what + " " + f.key),
    ["write k2", "read k", "drop k"]);
  assert.deepEqual(S.LSFAIL.map(f => f.where),
    ["write k2", "read k", "drop k"]);
  assert.match(S.failBar(), /<b>3<\/b> things/);
});

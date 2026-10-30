/* core: making an untrusted value safe to put in the page.

   Three answers, and the test exists to hold the difference between them.
   Escaping is right for text. It is NOT right for a colour, which could still
   say anything CSS can say without ever closing the quote, so a colour is
   checked. And it is not right for a number, which was never text, so a
   weight is coerced and says so when it is not one.

   The end-to-end check is tests/hostile.mjs: a real scenario carrying a
   tagged payload in each of fifteen fields, opened by the real page. This is
   the unit underneath it. */

import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../docs/bench/core/safe.js";

test("escaping closes every way out of a text or attribute position", () => {
  assert.equal(S.hesc('<img src=x onerror="a">'),
    "&lt;img src=x onerror=&quot;a&quot;&gt;");
  /* The ampersand goes FIRST or the entities it writes get re-escaped, which
     is the classic order bug in a hand-rolled escaper. */
  assert.equal(S.hesc("&lt;"), "&amp;lt;");
  assert.equal(S.hesc('a" onload="b'), "a&quot; onload=&quot;b");
  assert.equal(S.hesc(null), "", "absent is empty, not the string null");
  assert.equal(S.hesc(undefined), "");
  assert.equal(S.hesc(0), "0", "and a falsy number is still that number");
  assert.equal(S.hesc(false), "false");
});

test("a colour is checked rather than escaped, because escaping is not enough", () => {
  assert.equal(S.cssColor("#4f7fa8"), "#4f7fa8");
  assert.equal(S.cssColor("#ABC"), "#ABC");
  assert.equal(S.cssColor("tomato"), "tomato");
  assert.equal(S.cssColor("TOMATO"), "tomato");
  /* Everything a file could put there instead. None of these is made safe by
     escaping: each stays inside the quotes and still says something. */
  for (const bad of ['red" onload="x',
                     "url(http://elsewhere/track.png)",
                     "expression(alert(1))",
                     "red;position:fixed;inset:0;z-index:99999",
                     "#12345",            // five digits is not a hex colour
                     "#1234567",
                     "rgb(1,2,3)",        // a function, however harmless
                     "", "   ", "a-very-long-identifier-indeed-beyond-twenty"])
    assert.equal(S.cssColor(bad), "currentColor", `admitted ${JSON.stringify(bad)}`);
  assert.equal(S.cssColor("url(x)", "#000"), "#000", "and the fallback is the caller's");
  assert.equal(S.cssColor(null), "currentColor");
});

test("a number is coerced, and says so when it is not one", () => {
  assert.equal(S.numText(0.5), "0.5");
  assert.equal(S.numText("0.5"), "0.5", "a numeric string is a number, not markup");
  assert.equal(S.numText(0), "0");
  assert.equal(S.numText(1e-12), "1e-12");
  assert.equal(S.numText(0.123456, 2), "0.12");
  /* The case that has executed in a page: a weight's value carrying markup. */
  assert.equal(S.numText('1</span><img src=x onerror="a">'), "not a number");
  assert.equal(S.numText(NaN), "not a number");
  assert.equal(S.numText(Infinity), "not a number",
    "an infinite weight is not a number this page can print");
  /* ABSENT IS NOT ZERO, which is what writing this test found: `+null` is 0
     and finite, so a weight nobody declared printed as "0" -- a value the
     model never had, shown as one it did. */
  assert.equal(S.numText(null), "not a number");
  assert.equal(S.numText(undefined), "not a number");
  assert.equal(S.numText(""), "not a number");
  assert.equal(S.numText(false), "not a number");
  assert.equal(S.numText(0), "0", "but a real zero is still a real zero");
});

test("nothing here can carry markup out, whatever goes in", () => {
  const nasty = ['<img src=x onerror="X">', '"><script>X</script>', "javascript:X",
                 "</style><svg onload=X>", "&#60;img&#62;"];
  for (const v of nasty) {
    assert.doesNotMatch(S.hesc(v), /[<>]/, `hesc let a bracket through: ${v}`);
    assert.doesNotMatch(S.cssColor(v), /[<>"'()]/, `cssColor let something through: ${v}`);
    assert.doesNotMatch(S.numText(v), /[<>]/, `numText let a bracket through: ${v}`);
  }
});

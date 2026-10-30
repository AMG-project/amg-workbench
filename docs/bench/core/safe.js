/* core: making an untrusted value safe to put in the page.

   The scenario format exists to be exchanged. A scholar deposits one, another
   opens it, and every free-text field in it -- a group's name and colour, a
   weight's value, a proposition's sentence, a reviewer's reason -- was written
   by somebody else and ends up interpolated into the reader's markup. Two
   of those have run script in the page that opened the file.

   Three answers, and the difference between them is the point:

   ESCAPE where the value is text. hesc() turns the five characters that can
   leave a text or attribute position into entities, and that is the whole of
   what is needed for a name, a note or a sentence.

   CHECK where escaping would not be enough. A colour reaching
   `style="background:…"` cannot be made safe by escaping: it would still be
   able to say anything CSS can say, `url()` included, without ever closing
   the quote. cssColor() admits three or six hex digits or a bare CSS name and
   falls back visibly.

   COERCE where the value is not text at all. A weight is a number everywhere
   that computes with it, and the panels that printed it took the raw field,
   so a string sat in the markup unescaped. numText() prints a number or says
   it is not one.

   Here rather than beside the corpus, where all three used to live: a reader
   asking "what stops a file from running script in my page" should not have
   to find the answer inside the module that loads the construct index.
   tests/safe.test.mjs holds these, and tests/hostile.mjs is the end-to-end
   check -- a real scenario, with a tagged payload in each of fifteen fields,
   opened by the real page.

   core/ RULE: nothing in this file may import from outside core/.
   scripts/check_bench.py fails the build if one does. */

function hesc(x){ return String(x == null ? "" : x)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
/* A COLOUR FROM A FILE, AND WHY ESCAPING IS NOT THE ANSWER TO IT.

   A group carries its own colour and a group travels in a scenario, so the
   value reaching `style="background:…"` came out of a file somebody else
   wrote. Escaping would stop it closing the attribute and would still leave
   it able to say anything CSS can say, which includes `url(…)` and a
   position that covers the page. A colour is a closed set of shapes, so this
   checks rather than escapes: three or six hex digits, or one of the names
   the page itself uses. Anything else gets the default, which is a visible
   answer rather than a silent one. */
const HEXCOL = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function cssColor(v, fallback){
  const s = String(v == null ? "" : v).trim();
  if(HEXCOL.test(s)) return s;
  if(/^[a-z]{3,20}$/i.test(s)) return s.toLowerCase();   // a bare CSS name
  return fallback || "currentColor";
}
/* A NUMBER FROM A FILE. A weight's value is a number in every path that
   computes with it -- buildArith coerces and drops what is not finite -- and
   the panels that PRINT it took the raw field, so a string sat in the markup
   unescaped. Printed through this instead, which cannot carry markup at all. */
function numText(v, dp){
  /* ABSENT IS NOT ZERO. `+null`, `+""` and `+false` are all 0 and all finite,
     so a weight nobody declared printed as "0" -- a value the model never
     had, shown as one it did. This page's rule is that a default is never a
     declaration, and a blank reading as zero is the same mistake in smaller
     type. Found by writing the test for this file. */
  if(v == null || v === "" || typeof v === "boolean") return "not a number";
  const n = +v;
  if(!Number.isFinite(n)) return "not a number";
  return dp == null ? String(n) : n.toFixed(dp);
}

export { hesc, HEXCOL, cssColor, numText };

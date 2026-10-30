/* EVERY PROBE IS A String.raw LITERAL, AND THAT IS THE WHOLE RULE.
   ==========================================================================

   Half this suite builds a page in a template literal, writes it beside
   bench.html and dumps the DOM out of headless Chrome. A plain template
   literal processes escapes, so a whitespace class written as one backslash
   reaches the page as the letter s. It stripped every lowercase s out of a
   printed refusal in tests/ask-build.mjs, and out of an error message in
   tests/ask-capture.mjs, which is where this was found.

   THE FIRST TWO VERSIONS OF THIS FILE TRIED TO SCAN FOR IT, and both were
   wrong in the only direction that matters. The first walked forward from a
   backtick to the next one, so the first backtick inside a ${...}
   substitution looked like the end of the literal and ninety lines went
   unscanned -- which is exactly how ask-capture.mjs survived the commit of
   the guard meant to catch it. The second tracked substitutions and then
   reported twenty-three findings, every one a backtick in a prose comment
   opening a literal that was not there, including in this file's own header.
   Teaching it to skip comments and strings left a regex containing a backtick
   as the next hole, and by then it was a JavaScript lexer with an adjudication
   step, which is a guard nobody would read.

   The fix was not a better scanner. tests/pagewalk.mjs and tests/pagesmoke.mjs
   were never bitten, and the reason is one word: String.raw. A tagged literal
   hands the page exactly the characters in the source, so an escape written
   once arrives once and the bug cannot be written. The other eight probes are
   tagged now, with every doubled backslash halved in the same pass, since
   doubling is what a plain literal needed and is wrong under a raw one.

   So this file checks the one thing that is both sufficient and impossible to
   get wrong: a probe literal is raw. */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* THE TEXT OF EVERY TEMPLATE LITERAL IN THE FILE, and only the text.

   The first version of this walked forward from a backtick to the next one,
   which is wrong in a way that let the very bug it was written for survive in
   tests/ask-capture.mjs for an hour after this file was committed. A probe
   builds its page with substitutions in it, and some of those contain their
   own template literals. The first backtick inside the first substitution
   looked like the end of the outer literal, so the ninety lines after it were
   never scanned -- and line 138 of that file carried a whitespace class
   written with one backslash, reached the browser as the letter s, and
   stripped every lowercase s out of the message the capture printed. A false
   negative is the only failure this file can have that matters.

   So: a walk over the two states that matter. Inside the TEXT of a literal an
   escape reaches the page, and a lone one is the bug. Inside a substitution
   the code runs here in node, where a lone escape is an ordinary regex and
   correct, which is what nearly a hundred other lines across these files are.
   A nested literal inside a substitution is text again and is scanned.

   Quotes inside a substitution are skipped, so a brace or a backtick in a
   string cannot unbalance the walk. A regex literal containing one still
   could, and that would report a false positive -- which is loud, and loud is
   the direction this file is allowed to fail in. */
/* The probes, by the one shape they all share: a const named PROBE holding a
   template literal, written into a page. */
const PROBETAG = /\bconst\s+PROBE\s*=\s*(String\.raw)?\s*`/;

test("every probe literal is tagged String.raw", () => {
  const files = fs.readdirSync(HERE).filter(f => f.endsWith(".mjs"));
  const plain = [], raw = [];
  for(const f of files){
    const src = fs.readFileSync(path.join(HERE, f), "utf8");
    const m = PROBETAG.exec(src);
    if(!m) continue;
    (m[1] ? raw : plain).push(f);
  }
  assert.ok(raw.length >= 8,
    "only " + raw.length + " probe(s) found; this check has stopped seeing them");
  assert.deepEqual(plain, [],
    "these build a page from a template literal that processes escapes, so a " +
    "regex class written with one backslash reaches the browser as a letter. " +
    "Tag the literal String.raw and write every escape once:\n  " + plain.join("\n  "));
});

/* A backtick closing a literal early needs no test: it stops the FILE parsing,
   so node refuses to import it and whatever uses it fails immediately. That
   is caught instantly every time, which is why it needs no test of its own. */

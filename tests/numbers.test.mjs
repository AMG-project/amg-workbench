/* THE NUMBERS IN THE PROSE, AGAINST THE PAYLOAD THEY ARE ABOUT.
   ==========================================================================

   Every number the PAGE shows is computed from graph-data.js when the page
   renders, so it cannot drift. Every number in a DOCUMENT is typed, and on 24
   October 2026 four of them were wrong at once: the registry floor moved from
   two claims to one, and README, SCALE, REPORT and the proposal went on saying
   422 constructs and 593 drawn claims. They were corrected only because
   somebody went looking.

   Worse, one of them was not stale but FALSE. The proposal said 32 claims
   cannot be drawn because an arrow has one end, and the map draws 41 claims
   with more than one antecedent. Nothing mechanical catches a false sentence.
   What this file catches is the narrower thing that is mechanical: a count
   that no longer matches the corpus it is a count of.

   HOW A CLAIM IS WRITTEN HERE. Each row names a file, a regular expression
   whose capture groups are the figures, and what those figures should be. The
   expression has to name the quantity in WORDS so it cannot match a different
   number on the same line -- which is why they read "1,026 constructs" and
   not "([\d,]+)". A row whose file is absent is skipped rather than failed,
   because `make standalone` copies the artifact and not the proposal, and the
   artifact's own documents are the ones that have to be right there.

   A row whose expression matches nothing is a FAILURE, not a skip: the usual
   cause of a pattern that stops matching is somebody rewriting the sentence
   around the number, and that is exactly when the number wants checking.
*/

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { G } from "../docs/bench/graph-data.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(HERE, "..");
const ROOT = path.join(ART, "..");

/* ---- what the corpus actually is -------------------------------------- */

const N = new Map(G.nodes.map(n => [n.i, n]));
const papersOf = n => (n.p || []).length;
/* In scope at a paper threshold of m, by the page's own rule in
   03c-corpus.js: a construct is drawn when at least m papers use it. */
const shownAt = m => new Set(G.nodes.filter(n => papersOf(n) >= m).map(n => n.i));
/* Drawn by the builder's rule: at least one name on each side survives. */
const drawnIn = set => G.claims.filter(c =>
  (c.a || []).some(e => set.has(e)) && (c.c || []).some(e => set.has(e))).length;
/* What the map ends up DRAWING at a threshold is smaller than what is in
   scope, because a construct no arrow touches is hidden. The two numbers the
   documents quote for a floor of one are the drawn ones, measured in the
   browser, so they are not recomputed here -- only the ones this file can
   derive are checked, and the rest are named below as unchecked. */

const COUNT = {
  papers:      Object.keys(G.papers).length,
  constructs:  G.nodes.length,
  claims:      G.claims.length,
  once:        G.nodes.filter(n => (n.n || 0) <= 1).length,
  atTwo:       shownAt(2).size,
  claimsAtTwo: drawnIn(shownAt(2)),
  meta:        G.meta.length,
  edges:       G.edges.length,
  outlets:     G.journals.length,
  noScope:     G.claims.filter(c => {
                 const s = String(c.sc || "").trim();
                 return !s || /^unstated$/i.test(s);
               }).length,
};

/* ---- what the documents say -------------------------------------------- */

const SAYS = [
  /* ONE README ROW, NOT THREE. Its "what to look at first" section named the
     registry size and the count at a threshold of two; both went when the
     section was made general, so that it describes the eight steps rather
     than one demo's corpus. What is left is the line in the file table, which
     is where a reader looks for the size of the payload anyway. Four rows
     were added to SCALE.md below to keep this file's floor met on evidence
     rather than by lowering it. */
  ["artifact/README.md", /as the page reads it: ([\d,]+) constructs, ([\d,]+) (?:claims|relationships), (\d+) papers/,
   ["constructs", "claims", "papers"]],
  /* The README's own scale paragraph went when the file was cut back for a
     reader rather than a maintainer; docs/SCALE.md is where those numbers
     live now, and its rows below are what hold them. */
  ["artifact/docs/SCALE.md", /\| constructs \| ([\d,]+) \|/, ["constructs"]],
  ["artifact/docs/SCALE.md", /\*\*([\d,]+)\*\* are carried by a single (?:claim|relationship)/, ["once"]],
  ["artifact/docs/SCALE.md", /\| (?:claims|relationships) \| ([\d,]+) \|/, ["claims"]],
  ["artifact/docs/SCALE.md", /\*\*([\d,]+)\*\* have a box at both ends at the default paper threshold/,
   ["claimsAtTwo"]],
  ["artifact/docs/SCALE.md", /\| papers \| (\d+) \|/, ["papers"]],
  ["artifact/docs/SCALE.md", /\| meta-claims \| ([\d,]+) \|/, ["meta"]],
  ["artifact/docs/SCALE.md", /\| responds-to edges \| ([\d,]+) \|/, ["edges"]],
  ["artifact/docs/SCALE.md", /\| outlets \| (\d+) \|/, ["outlets"]],
  ["proposal/ActionModel-4.md", /read into ([\d,]+) constructs and ([\d,]+) (?:claims|relationships)/,
   ["constructs", "claims"]],
  ["proposal/ActionModel-4.md", /at two papers or more the map draws ([\d,]+) constructs and ([\d,]+) (?:claims|relationships)/,
   ["atTwo", "claimsAtTwo"]],
  ["proposal/ActionModel-4.md", /found ([\d,]+) constructs carried by a single (?:claim|relationship), and ([\d,]+) of the ([\d,]+) (?:claims|relationships) state no scope/,
   ["once", "noScope", "claims"]],
  ["REPORT.md", /([\d,]+) (?:claims|relationships) read off (\d+) articles/, ["claims", "papers"]],
  ["REPORT.md", /\(([\d,]+) constructs and ([\d,]+) (?:claims|relationships) at two papers/, ["atTwo", "claimsAtTwo"]],
  /* THE SPECIFICATION IS IN THIS TABLE NOW. It was left out while the session
     that wrote this file was asked not to edit it, and the note below recorded
     that its construct and claim counts were stale -- which they no longer are.
     A note that something wants checking is not a check. Its "1,049 constructs
     in the registry" is deliberately NOT here: the registry is
     purpose-review/corpus/index, which holds 1,049, and the payload carries the
     1,026 of them a surviving claim names. Two different counts of two
     different things, and mapping one onto the other would make this file
     report a correct sentence as wrong. */
  ["appendix/TECHNICAL-SPECIFICATION.md",
   /At the default threshold the workbench draws ([\d,]+) constructs and ([\d,]+) (?:claims|relationships)/,
   ["atTwo", "claimsAtTwo"]],
  ["appendix/TECHNICAL-SPECIFICATION.md", /the scope is unstated for ([\d,]+)/,
   ["noScope"]],
  ["appendix/TECHNICAL-SPECIFICATION.md", /^(\d+) papers, ([\d,]+) (?:claims|relationships),/m,
   ["papers", "claims"]],
];

const num = s => +String(s).replace(/,/g, "");

test("every count a document states matches the corpus it is a count of", () => {
  const bad = [], seen = [];
  for(const [rel, rx, keys] of SAYS){
    /* TWO LAYOUTS. In the repository this file sits at artifact/tests, so a
       document is at <repo>/<rel>. `make standalone` copies the artifact's
       tracked files into an empty directory WITHOUT the artifact/ prefix, so
       the same document is at <copy>/<rel minus artifact/>. Resolving only the
       first made every row miss there and the run failed with "only 0 counts
       were found" -- which the standalone check surfaced the moment this file
       became tracked and therefore copied. */
    const tries = [path.join(ROOT, rel)];
    if(rel.startsWith("artifact/")) tries.push(path.join(ART, rel.slice(9)));
    const p = tries.find(x => fs.existsSync(x));
    if(!p) continue;                             // standalone has no proposal/
    const src = fs.readFileSync(p, "utf8");
    const m = rx.exec(src);
    if(!m){
      bad.push(`${rel}: nothing matches ${rx} any more. If the sentence was ` +
        `rewritten, the number in it wants checking and this row wants updating.`);
      continue;
    }
    keys.forEach((k, i) => {
      const got = num(m[i + 1]);
      seen.push(`${rel} ${k}`);
      if(got !== COUNT[k])
        bad.push(`${rel}: says ${k} is ${m[i + 1]}, and the payload has ${
          COUNT[k].toLocaleString("en")}`);
    });
  }
  assert.ok(seen.length >= 8,
    "only " + seen.length + " count(s) were found to check, so this file has " +
    "stopped seeing the documents");
  assert.deepEqual(bad, [], "\n  " + bad.join("\n  "));
});

/* WHAT THIS FILE CANNOT CHECK, said here rather than left to be assumed:

   - The two figures for a paper threshold of one (660 constructs and 922
     arrows) are what the MAP draws after the isolated constructs are hidden,
     which is a measurement in a browser and not a count over the payload.
     tests/clusters.mjs and the page walk exercise that path; the numbers in
     the prose are from a run at a 1440px canvas.
   - The specification's "1,049 constructs in the registry" is not checked and
     must not be: the registry is purpose-review/corpus/index, which holds
     1,049 constructs, and docs/bench/graph-data.js carries the 1,026 of them a
     surviving claim names. Two counts of two different things. The rest of
     that paragraph IS checked -- it
     said 422 and 593 where the answer was 156 and 207, and was corrected
     because somebody went looking.
   - Nothing here can catch a sentence that is false rather than stale. The
     proposal's claim that an arrow has one end was both grammatical and
     wrong, and it took somebody asking what the block meant. */

/* THE SCHOLAR'S NOTE ON A PROPOSITION, END TO END.
   ==========================================================================

   Everything on a board row at step 3.2 is computed: the verdict, the share
   of the declared box, the share of the declared class, the round, what the
   scholar expected before deriving. What none of it carries is the reading --
   a sign proved over three quarters of a box means something to the person
   who declared the box, and the method has no way to say what.

   So a row takes a note. This walks the worked example to step 3.2, presses
   the button on the first proposition, types, saves, and then checks the three
   things that make a note worth having rather than a textarea:

     it is marked as the scholar's and not mixed into the computed text,
     it is stamped, so a note written before the model moved can be told
       from one written after,
     it travels in the scenario file, which is what another scholar opens.

   Run:  node tests/annotate.mjs
*/

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "docs");
const BENCH = path.join(DOCS, "bench");
const NOTE = "Proved over three quarters of the box. The quarter it misses is " +
  "where clarity is high and mission low, which is a configuration none of our " +
  "own cases contains.";

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
  {stdio:"ignore"});
const file = path.join(BENCH, "__anno.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 700));
  const page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  /* NO BACKTICKS AND NO SINGLE BACKSLASH ESCAPES BELOW. This is a template
     literal: a backtick closes it, and an unrecognised escape collapses to
     the character itself, which is how a whitespace class once reached the
     page as the letter s. */
  const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const o = {};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  try{
    const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(6000); }
    B.state.stage = 6; B.renderPanel(); await nap(1800);
    B.state.stage = 6; B.renderPanel(); await nap(1200);
    o.buttons = document.querySelectorAll("#pbody [data-bnote]").length;
    o.rows = (B.BOARD.rows || []).length;
    const b = document.querySelector("#pbody [data-bnote]");
    if(!b) throw new Error("no proposition on the board carries a note button");
    o.label = b.textContent.trim();
    b.click(); await nap(700);
    const box = document.querySelector("#pbody [data-bnotebox]");
    if(!box) throw new Error("pressing the note button opened no editor");
    box.value = ${JSON.stringify(NOTE)};
    box.dispatchEvent(new Event("input", {bubbles:true}));
    const sv = document.querySelector("#pbody [data-bnotesave]");
    if(!sv) throw new Error("the editor has no way to save");
    sv.click(); await nap(900);
    /* MARKED, not merged: the note has to be in an element of its own that
       says whose it is, or a reader cannot tell it from the computed text. */
    const el = document.querySelector("#pbody .banno");
    o.marked = !!el;
    o.mark = el ? (el.querySelector("b") || {}).textContent || "" : "";
    o.text = el ? el.textContent.replace(/[ \t\n\r]+/g, " ").trim() : "";
    const row = (B.BOARD.rows || []).find(r => r.anno);
    o.stored = row ? String(row.anno) : "";
    o.stamp = row ? String(row.annoAt || "") : "";
    const f = B.scenFile ? JSON.parse(B.scenFile()) : null;
    const rows = (f && f.snap && f.snap.board && f.snap.board.rows) || [];
    o.inFile = rows.filter(r => r.anno === ${JSON.stringify(NOTE)}).length;
    /* And removable. A note nobody can take back is a note nobody writes. */
    const b2 = document.querySelector("#pbody [data-bnote]");
    if(b2){ b2.click(); await nap(600); }
    const del = document.querySelector("#pbody [data-bnotedel]");
    o.deletable = !!del;
    if(del){ del.click(); await nap(700); }
    o.afterDelete = (B.BOARD.rows || []).filter(r => r.anno).length;
  }catch(e){ o.FATAL = String(e && e.message || e); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=180000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__anno.html`],
    {encoding:"utf8", maxBuffer:128 * 1024 * 1024});
  const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
  if(!m) throw new Error("the probe produced nothing; chrome said: " +
    String(r.stderr || "").slice(0, 400));
  out = JSON.parse(m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
} finally {
  try{ fs.unlinkSync(file); }catch(e){}
  srv.kill();
}

const fail = [];
const want = (ok, why) => { if(!ok) fail.push(why); };
if(out.FATAL) fail.push(out.FATAL);
else {
  want(out.buttons === out.rows,
    `${out.buttons} note buttons for ${out.rows} propositions — every row takes one`);
  /* THE DEMONSTRATION SHIPS A NOTE ON EVERY FINDING now: step 3.2's reading
     tab drafts them and the build applies them, so the button on a row that
     already has one reads "Edit note". The first version of this test asserted
     "Note" and failed the moment the demonstration carried readings. */
  want(out.label === "Edit note",
    `the button reads "${out.label}" on a finding the demonstration ships a note for`);
  want(out.marked, "the saved note is not in an element of its own");
  want(/your note/i.test(out.mark),
    `the note is not attributed: its mark reads "${out.mark}"`);
  want(out.stored === NOTE, "the note stored is not the note typed");
  want(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(out.stamp),
    `the note carries no usable stamp: "${out.stamp}"`);
  want(out.inFile === 1, "the note does not travel in the scenario file");
  want(out.deletable, "a saved note offers no way to remove it");
  want(out.afterDelete === out.rows - 1,
    "deleting one note left " + out.afterDelete + " of " + out.rows +
    " findings carrying one; the other " + (out.rows - 1) + " are the demonstration's " +
    "own and should be untouched");
}

if(fail.length){
  console.error("annotation: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
console.log(`annotation: a note rewritten on 1 of ${out.rows} propositions — attributed to the ` +
  `scholar, stamped ${out.stamp}, carried in the scenario file, and removable`);

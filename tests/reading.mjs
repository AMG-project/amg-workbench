/* THE AUTOMATIC MODE: A DERIVATION, READ IN WORDS.
   ==========================================================================

   Step 3.2 opens on the reading rather than on the working list, so that
   somebody who curated a literature and does not write formal models can see
   what the model turned out to imply without opening an expression. The
   expression and the derivation are behind a fold on each row, not absent.

   WHAT THIS CHECKS, and why each one is here rather than taken on trust.

   The verdict is NOT delegated. Interval arithmetic proved or refused every
   finding before anything was asked, and the row keeps the verdict and both
   shares beside the prose rather than instead of it -- a reading that
   replaced the numbers would be the formula hidden rather than explained.

   The prompt forbids the one error that matters. A share of the box the
   method could not settle is not a share where the sign fails, and that is
   exactly what a non-modeller will assume. So the test reads the prompt that
   was actually sent and fails if that instruction is not in it.

   And a reading is a DRAFT. Accepting one writes it into that finding's note,
   where it is the scholar's, with the record saying a model drafted it and
   who took it.

   Run:  node tests/reading.mjs
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
const SAYS = "Firms that state a clearer purpose earn more, over the whole range the " +
  "scholar declared, and the gain is strongest at the low end.";
const MIND = "It does not establish anything about the quarter of the range the method " +
  "could not settle.";

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
  {stdio:"ignore"});
const file = path.join(BENCH, "__reading.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 700));
  let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  /* THE HOST, answering the one ask this exercises. It returns a reading per
     finding id it finds in the prompt, which is also how the test gets hold
     of the prompt to check what the page told it. */
  const HOST = `<script>
window.__sent = [];
window.claude = { use: async function(n){
  if(n !== "sample") return null;
  return {
    json: async function(q){
      window.__sent.push(String(q));
      var ids = [];
      var re = /id: (b[0-9]+)/g, m;
      while((m = re.exec(String(q)))) ids.push(m[1]);
      return {read: ids.map(function(id){
        return {id:id, says:${JSON.stringify(SAYS)}, mind:${JSON.stringify(MIND)}}; })};
    },
    limits: async function(){ return {images:false}; }
  };
} };
</script>\n`;
  const h = page.indexOf("<script");
  page = page.slice(0, h) + HOST + page.slice(h);
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
    B.state.stage = 6; B.renderPanel(); await nap(2500);
    o.tabs = [...document.querySelectorAll("#pbody [data-der]")].map(b =>
      b.textContent.trim() + (b.getAttribute("aria-selected") === "true" ? "*" : ""));
    o.workHidden = !!(document.getElementById("derPanel") || {}).hidden;
    o.rows = document.querySelectorAll("#pbody .readrow").length;
    o.verdicts = document.querySelectorAll(
      "#pbody .readrow .vd, #pbody .readrow > .cst").length;
    o.folds = document.querySelectorAll("#pbody .rdmore").length;
    o.nums = [...document.querySelectorAll("#pbody .rdnums")]
      .filter(e => /declared box/.test(e.textContent || "")).length;
    o.kept = (B.BOARD.rows || []).filter(r => r.keep).length;
    const ask = document.querySelector('#pbody [data-ai="read"]');
    if(!ask) throw new Error("no way to ask for a reading");
    ask.click(); await nap(2600);
    /* NORMALISED. The prompt wraps, so an instruction can be split across a
       newline: the first version of this test looked for an exact phrase and
       failed on "is NOT a share\nwhere the sign fails". */
    o.sent = String((window.__sent || [])[0] || "").replace(/[ \t\n\r]+/g, " ");
    o.read = B.READ.out.length;
    o.said = ((document.querySelector("#pbody .rdsay") || {}).textContent || "").trim();
    o.minds = document.querySelectorAll("#pbody .rdmind").length;
    o.takes = document.querySelectorAll("#pbody [data-rdtake]").length;
    const t = document.querySelector("#pbody [data-rdtake]");
    t.click(); await nap(1400);
    const row = (B.BOARD.rows || []).find(r => r.anno);
    o.note = row ? String(row.anno) : "";
    o.left = B.READ.out.length;
    const f = JSON.parse(B.scenFile());
    o.inFile = ((f.snap.board && f.snap.board.rows) || []).filter(r => r.anno).length;
    o.logged = (f.log || []).filter(x => /drafted by an LLM/.test(JSON.stringify(x))).length;
    /* what the Findings tab holds, measured where it is */
    o.read0 = {board:document.querySelectorAll("#pbody [data-bkeep]").length,
               proofs:document.querySelectorAll("#pbody [data-bproof]").length,
               pilots:document.querySelectorAll("#pbody .edbtn.off .pil").length,
               cands:document.querySelectorAll("#pbody .fnd").length};
    /* and the expressions are still one click away */
    document.querySelector('#pbody [data-der="work"]').click(); await nap(1400);
    o.work = {lines:document.querySelectorAll("#pbody .bline").length,
              reads:document.querySelectorAll("#pbody .readrow").length};
  }catch(e){ o.FATAL = String(e && e.message || e); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=240000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__reading.html`],
    {encoding:"utf8", maxBuffer:128 * 1024 * 1024});
  const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
  if(!m || !m[1].trim()) throw new Error("the probe produced nothing; chrome said: " +
    String(r.stderr || "").slice(0, 600));
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
  /* Two tabs: the first is the whole of what the step produces, in words,
     and the second the expressions. The property under test is that the step
     opens on the words. */
  want(out.tabs.length === 2 && out.tabs[0] === "Findings*",
    "step 3.2 should open on the findings, in words: " + JSON.stringify(out.tabs));
  want(out.workHidden, "the working list is showing behind the reading");
  want(out.rows === out.kept,
    out.rows + " reading rows for " + out.kept + " retained findings");
  want(out.verdicts === out.rows && out.folds === out.rows,
    "every row carries its verdict and a way to the expression: " +
    out.verdicts + " verdicts, " + out.folds + " folds, " + out.rows + " rows");
  want(out.nums >= 1,
    "no row states the share of the declared box, so the reading replaced the numbers " +
    "rather than explaining them");
  /* THE INSTRUCTION THAT MATTERS, read off the prompt that was actually sent. */
  want(/not a share where the sign fails/i.test(out.sent),
    "the prompt does not tell the model that an undecided share is not a failure");
  want(/sound and incomplete/i.test(out.sent),
    "the prompt does not say the method is sound and incomplete");
  want(/not being asked whether any of this is right/i.test(out.sent),
    "the prompt does not withhold the verdict from the model");
  want(out.read === out.rows,
    out.read + " readings came back for " + out.rows + " findings");
  want(out.said === SAYS, "the reading on screen is not the reading returned");
  want(out.minds === out.read,
    "not every reading says what it does not establish: " + out.minds + " of " + out.read);
  want(out.takes === out.read, "a reading cannot be accepted onto its finding");
  want(out.note.indexOf(SAYS) === 0 && out.note.indexOf(MIND) > 0,
    "the accepted note is not the reading plus what it does not establish: " +
    JSON.stringify(out.note.slice(0, 80)));
  want(out.left === out.read - 1, "accepting one did not take it off the list");
  want(out.inFile >= 1, "the accepted note does not travel in the scenario");
  want(out.logged === 1,
    "the record does not say the note was drafted by a model and taken by the scholar");
  /* The board moved to the Findings tab with the readings, because what you
     stood behind belongs beside what the model turned out to imply. The
     Derivation tab keeps the way ONTO it, on every line. */
  want(out.read0 && out.read0.board > 0,
    "the findings tab does not show what was retained");
  want(out.work && out.work.reads === 0, "the derivation tab still draws the readings");
  /* The per-finding export was greyed with a pilot chip until the format
     existed. It writes amg-proof now, one certificate per retained finding,
     and tests/exchange.mjs holds the file to its schema. What matters here is
     that every retained row offers it and none of them still says pilot. */
  want(out.read0 && out.read0.proofs === out.read0.board,
    "the per-finding proof export is offered on " + (out.read0 || {}).proofs +
    " of " + (out.read0 || {}).board + " retained findings");
  want(out.read0 && out.read0.pilots === 0,
    "a control on the findings tab is still greyed and marked as a pilot");
}

if(fail.length){
  console.error("reading: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
console.log("reading: step 3.2 opens on " + out.rows + " findings read in words, each with " +
  "its verdict and the expression behind a fold · the prompt withholds the verdict and " +
  "forbids calling an undecided share a failure · a draft accepted onto a finding " +
  "becomes its note, recorded as drafted by a model and taken by the scholar");

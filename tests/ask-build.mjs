/* THE LOOP, RUN ONCE, IN ONE SESSION.
   ==========================================================================

   tests/ask-replay.mjs MEASURES: it matches an answer to a call by the
   prompt's own text, so an answer cannot be replayed into a state it was not
   written for, and nothing is applied. That is the right discipline for a
   measurement and the wrong one for building, because every acceptance
   changes the model and therefore changes the next prompt.

   This BUILDS. It answers by the name of the ask rather than by the text of
   the prompt, applies what comes back, and goes on to the next one, which is
   what a scholar does in an afternoon. The prompt it was actually given is
   recorded, so the record says what was asked in the state it was asked in
   rather than what some earlier run was asked.

   Say so when reporting it: a run that answers by name is a construction, not
   a measurement, and the two must not be quoted as the same thing.

   Run:  node tests/ask-build.mjs [--out FILE]
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
const ANSWERS = path.join(DOCS, "run", "answers", "worked");

/* The order is the chain's own: say what the quantities and relations ARE,
   then how the mechanisms writing an outcome combine, then write the
   arithmetic those two allow, then the conditions it has to satisfy. Asking
   in any other order asks about a model that does not exist yet. */
const ORDER = ["roles", "comp", "arith", "cond"];

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

export async function build(chrome){
  const answers = {};
  for(const what of ORDER){
    const f = path.join(ANSWERS, what + ".json");
    if(fs.existsSync(f)) answers[what] = fs.readFileSync(f, "utf8");
  }
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
    {stdio:"ignore"});
  const file = path.join(BENCH, "__build.html");
  try{
    await new Promise(r => setTimeout(r, 700));
    let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
    const HOST = `<script>
window.__answers = ${JSON.stringify(answers)};
window.__log = [];
window.claude = {
  use: async function(name){
    if(name !== "sample") return null;
    return {
      json: async function(q, opts){
        var what = window.__asking || "";
        var a = window.__answers[what];
        window.__log.push({what:what, chars:String(q).length, answered:!!a, prompt:String(q)});
        if(!a){ var e = new Error("no answer written for " + what); e.code = "no_answer"; throw e; }
        return JSON.parse(a);
      },
      limits: async function(){ return {images:false}; }
    };
  }
};
</script>\n`;
    const head = page.indexOf("<script");
    page = page.slice(0, head) + HOST + page.slice(head);

    /* The readings are read here and injected, because the probe runs in the
     page and the answers live on disk. Stamped with the build's own time, so
     a rebuilt demonstration does not pretend the notes were written now. */
  let READS = null;
  try{ READS = JSON.parse(fs.readFileSync(path.join(ANSWERS, "read.json"), "utf8")); }
  catch(e){ READS = null; }
  /* WHICH FINDINGS THE SCHOLAR DOES NOT STAND BEHIND. Retaining is one
     decision and standing behind what was retained is another, and the
     demonstration has to exercise both or step 4.1 ships every row it ever
     derived. Named by outcome and parameter, because the board's own ids are
     assigned at build time and would not survive a rebuild. */
  let ASIDE = null;
  try{ ASIDE = JSON.parse(fs.readFileSync(path.join(ANSWERS, "aside.json"), "utf8")); }
  catch(e){ ASIDE = null; }
  const STAMP = new Date().toISOString().slice(0, 16).replace("T", " ");
  const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const out = {steps:[]};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  const press = async (what, stage) => {
    B.state.stage = stage; B.renderPanel(); await nap(700);
    B.state.stage = stage; B.renderPanel(); await nap(400);
    if(what === "defn"){
      const box = document.getElementById("defbox");
      if(box && !box.value.trim()){
        box.value = "Rank by whether the sign is proved rather than sampled.";
        box.dispatchEvent(new Event("input", {bubbles:true}));
        box.dispatchEvent(new Event("blur", {bubbles:true}));
        await nap(600);
      }
    }
    window.__asking = what;
    const b = document.querySelector('[data-ai="' + what + '"]');
    if(!b || b.disabled){ out.steps.push({what, pressed:false}); return; }
    b.click();
    await nap(2000);
    /* Accept everything it offered. Each kind of proposal has its own button
       because each writes somewhere different. */
    const sel = "#pbody [data-aiok], #pbody [data-airole], #pbody [data-akeep]";
    let took = 0;
    for(let round = 0; round < 40; round++){
      const one = document.querySelector(sel);
      if(!one) break;
      one.click(); took++;
      await nap(260);
    }
    out.steps.push({what, pressed:true, accepted:took,
      kept: B.ARITH && B.ARITH.kept ? (B.ARITH.kept.lines || []).length : 0});
  };
  try{
    window.confirm = () => true; window.prompt = () => null; window.alert = () => {};
    const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(5000); }
    if(B.AI) B.AI.cap = undefined;
    /* ROLES FIRST, because a range is declared on a quantity and a quantity
       reaches the model through a kind. Then the ranges, because the
       arithmetic prompt reads them and the body's signature is taken over
       them: declaring one after a body is kept makes that body stale against
       its own declarations, which is what tests/demo.test.mjs caught. */
    await press("roles", 5);
    /* DECLARE EVERY RANGE THE FINDINGS WILL REST ON. A quantity that reached
       the model through an accepted KIND has a kind and no bounds, and the
       page is explicit that its default is not a declaration: a sign proved
       over it is proved over a range nobody claimed. tests/demo.test.mjs
       refuses a demonstration that does that, which is how this step came to
       be here. Declared through the dialog a scholar declares through. */
    B.state.stage = 5; B.renderPanel(); await nap(700);
    let bounded = 0;
    for(const b3 of [...document.querySelectorAll("#pbody [data-vt]")]){
      b3.click(); await nap(400);
      const lo = document.getElementById("varlo"), hi = document.getElementById("varhi");
      const save = document.getElementById("varsave");
      if(lo && hi && save){
        lo.value = "0"; hi.value = "1";
        lo.dispatchEvent(new Event("input", {bubbles:true}));
        hi.dispatchEvent(new Event("input", {bubbles:true}));
        save.click(); bounded++;
        await nap(300);
      }
      const cx = document.getElementById("varcancel");
      if(cx && document.getElementById("vardlg") &&
         document.getElementById("vardlg").open){ cx.click(); await nap(150); }
    }
    out.bounded = bounded;
    for(const what of ${JSON.stringify(ORDER.filter(x => x !== "roles"))}){
      /* THE OTHER HALF OF STEP 3.1 HAS TO BE OPEN FIRST. The arithmetic and
         the conditions are drawn by closeBodyHTML, which the step includes
         only while the arithmetic tab is the one showing; with the
         mechanisms tab open neither control is in the DOM at all. Both asks
         came back NOT ASKED because of it, so the recorded arithmetic was
         never applied and the rebuild wrote its own instead -- eight lines
         where the run being rebuilt had ten. Press the tab a reader presses. */
      if(what === "arith" || what === "cond"){
        const tab = document.querySelector('[data-dec="arith"]');
        if(tab){ tab.click(); await nap(1400); }
      }
      await press(what, 5);
    }
    /* Then derive, which is what all of it was for. */
    B.state.stage = 6; B.renderPanel(); await nap(900);
    const d = document.querySelector("#pbody [data-derive]");
    if(d){ d.click(); await nap(4000); }
    const ALL = B.PROPS && B.PROPS.out ? B.PROPS.out.props : [];
    const P = ALL.filter(x => !x.err);
    /* THE REFUSALS ARE THE POINT, so they are not filtered away. A derivative
       the page declines to sign carries its reason instead of a verdict. */
    /* TWO BACKSLASHES, NOT ONE. This line lives inside a template literal,
       where an unrecognised escape collapses to the character itself, so a
       whitespace class written with one backslash reaches the page as the
       letter s and strips every lowercase s from the text. It printed the
       refusal as "min( tated_purpo e_commitment * mea urement..." before
       anybody read it closely. Writing this comment with a backtick in it closed the literal the
       same way: no backticks in here either. */
    out.refused = ALL.filter(x => x.err).map(x => ({y:x.y, x:x.x,
      why:String(x.err).replace(/\s+/g, " ").slice(0, 240)}));
    out.derived = P.length;
    out.verdicts = {};
    for(const p of P) out.verdicts[p.verdict || "none"] =
      (out.verdicts[p.verdict || "none"] || 0) + 1;
    out.shares = P.map(p => ({y:p.y, x:p.x, v:p.verdict,
      share: typeof p.share === "number" ? Math.round(p.share * 100) / 100 : null,
      /* A partial covers two different things: boxes proved and boxes REFUTED,
         which is a turn and has a witness, and boxes proved and boxes the
         search ran out of budget on, which is silence. */
      open: typeof p.open === "number" ? Math.round(p.open * 100) / 100 : null,
      turned: !!p.turned, why: String(p.why || p.note || "").slice(0, 220)}))
      .slice(0, 30);
    /* RETAIN WHAT WAS DERIVED. A finding nobody stands behind is not a
       finding, and the board is where standing behind one is recorded. */
    /* ONE CLICK PER FINDING, NOT THIRTY ON THE FIRST ONE. data-btake stays on
       the button after it is pressed -- the label turns into "Update what you
       kept" -- so taking the first match repeatedly pressed one row thirty
       times and left the other twelve off the board. It looked like it was
       working while the board came pre-filled from the base; it stopped
       looking like it the moment the base stopped carrying derived rows. */
    const takeIds = [...document.querySelectorAll("#pbody [data-btake]")]
      .map(b2 => b2.dataset.btake);
    let took = 0;
    for(const id of takeIds){
      const b2 = document.querySelector('#pbody [data-btake="' + id + '"]');
      if(!b2) continue;
      b2.click(); took++; await nap(300);
    }
    out.retained = took;
    /* AND THE ONES IT DOES NOT STAND BEHIND, set aside through the control a
       reader presses rather than by writing keep:false into the file. */
    const ASIDE = ${JSON.stringify(ASIDE)};
    out.aside = 0;
    for(const a of ((ASIDE && ASIDE.aside) || [])){
      const row = (B.BOARD.rows || []).find(r2 => (r2.y + "|" + r2.x) === a.id);
      if(!row) continue;
      const bt = document.querySelector('#pbody [data-bkeep="' + row.id + '"]');
      if(bt){ bt.click(); out.aside++; await nap(300); }
      else if(row.keep !== false){ row.keep = false; out.aside++; }
    }
    B.renderPanel(); await nap(500);
    B.renderPanel(); await nap(600);
    /* READ THE FINDINGS AGAINST THE DECLARED CLASS. A row that was proved
       over one combination of forms and never read against the rest carries
       half a verdict, and tests/demo.test.mjs says so. The slots exist now
       because the kept lines carry the family the page verified. */
    B.state.stage = 7; B.renderPanel(); await nap(900);
    const run = document.getElementById("expRun");
    if(run && !run.disabled){
      run.click();
      for(let i = 0; i < 90; i++){
        await nap(1000);
        if(B.XRUN && !B.XRUN.busy) break;
      }
      await nap(800);
    }
    out.xrun = B.XRUN ? {rows:(B.XRUN.rows || []).length, err:String(B.XRUN.err || "")} : null;
    /* THE READINGS, AS NOTES ON THE FINDINGS. The notes are model-drafted
       and the scholar edits them; for the demonstration they are written
       with the rest of the run. So they come from the answers
       directory like every other answer in this loop, and they are applied
       through the same field a note typed by hand goes into -- a draft
       accepted is the scholar's, which is what the record says.

       Keyed by quantity and parameter rather than by row id: an id is handed
       out in the order the board filled, which is an artefact of the build,
       while the pair names the finding. */
    out.notes = 0;
    const READS = ${JSON.stringify(READS)};
    const STAMP = ${JSON.stringify(STAMP)};
    if(READS && READS.read){
      for(const x of READS.read){
        const parts = String(x.id).split("|");
        const row = (B.BOARD.rows || []).find(r =>
          String(r.y) === parts[0] && String(r.x) === parts[1]);
        if(!row) continue;
        row.anno = (x.says + (x.mind ? " What it does not establish: " + x.mind : ""))
          .slice(0, 900);
        row.annoAt = STAMP;
        out.notes++;
      }
      if(out.notes && B.boardSave) B.boardSave();
    }
    /* AND IT OPENS WHERE A READER SHOULD START. The curation is the first
       thing this demonstrates; the findings are what it demonstrates it for. */
    B.state.stage = 1; B.renderPanel(); await nap(700);
    out.board = B.BOARD ? (B.BOARD.rows || []).length : 0;
    /* The page's own export, so the harness writes the file the page writes:
       the snapshot, the provenance, the rounds and the log. */
    out.file = B.scenFile ? B.scenFile() : null;
    out.snap = B.snapNow ? B.snapNow() : null;
  }catch(e){ out.FATAL = String(e && e.message || e);
    out.stack = String(e && e.stack || "").slice(0, 500); }
  out.log = (window.__log || []).map(l => ({what:l.what, chars:l.chars, answered:l.answered}));
  out.prompts = (window.__log || []).map(l => ({what:l.what, q:l.prompt}));
  document.getElementById("__out").textContent = JSON.stringify(out);
})();</script>`;
    fs.writeFileSync(file, page + PROBE);
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=240000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__build.html`],
      {encoding:"utf8", maxBuffer:256 * 1024 * 1024});
    const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
    if(!m) throw new Error("the probe produced nothing; chrome said: " +
      String(r.stderr || "").slice(0, 400));
    return JSON.parse(m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  } finally {
    try{ fs.unlinkSync(file); }catch(e){}
    srv.kill();
  }
}

if(process.argv[1] && process.argv[1].endsWith("ask-build.mjs")){
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  const got = await build(chrome);
  if(got.FATAL){ console.error("the probe threw:", got.FATAL); console.error(got.stack); process.exit(1); }
  for(const s of got.steps)
    console.log(`${s.what.padEnd(7)} ${s.pressed ? "asked" : "NOT ASKED"}` +
      (s.pressed ? `, ${s.accepted} accepted, arithmetic kept: ${s.kept}` : ""));
  console.log(`\nderived ${got.derived} proposition(s): ` +
    Object.entries(got.verdicts || {}).map(([k, v]) => `${v} ${k}`).join(", "));
  for(const p of (got.shares || []))
    console.log(`  ${String(p.v).padEnd(9)} proved ${p.share === null ? "  - " :
      String(p.share).padStart(4)}` +
      (p.open !== null ? ` undecided ${String(p.open).padStart(4)}` : "") +
      (p.turned ? " TURNED" : "") + `  d${p.y}/d${p.x}` +
      (p.why ? `\n              ${p.why}` : ""));
  for(const r of (got.refused || []))
    console.log(`  REFUSED            d${r.y}/d${r.x}\n              ${r.why}`);
  console.log(`\nretained ${got.retained} finding(s); the board now holds ${got.board}`);
  if(got.bounded != null) console.log(`declared a range on ${got.bounded} quantity/quantities`);
  if(got.xrun) console.log(`the declared set ran: ${got.xrun.rows} row(s)` +
    (got.xrun.err ? ` — ${got.xrun.err}` : ""));
  const i = process.argv.indexOf("--out");
  if(i > 0 && process.argv[i + 1] && got.file){
    /* The page used to suffix a slot built from a file with " (example)", and
       a file carrying that would have come back as "(example) (example)". It
       names the slot outright now, so this only cleans an older file. */
    const o = JSON.parse(got.file);
    o.name = String(o.name || "").replace(/\s*\(example\)$/, "");
    /* WHAT THIS PAGE DERIVED COMES FIRST. The three rows the bridge returned
       were in the base before the loop ran, so they led the board and every
       reader -- the notebook's part picker included -- met a row with no
       verdict, no share and no region before meeting one with all three. The
       order is presentation and not content: the rows, their ids and their
       keep flags are untouched. */
    const B = o.snap && o.snap.board;
    if(B && Array.isArray(B.rows))
      B.rows = [...B.rows.filter(r => r.src !== "tool"),
                ...B.rows.filter(r => r.src === "tool")];
    fs.writeFileSync(process.argv[i + 1], JSON.stringify(o, null, 1) + "\n");
    console.log(`scenario written to ${process.argv[i + 1]}`);
  }
}

/* THE SECOND DEMO, OPENED BY THE REAL PAGE.
   ==========================================================================

   tests/twochannel-scenario.test.mjs holds the file to the model it claims to
   be, under node. This holds the BENCH to it: a scenario is a set of
   declarations for a page to act on, and whether the page acts on them the
   way the file intends cannot be read off the file.

   Four things are asserted, and the third and fourth are the ones worth
   having.

     it opens          no error while loading, nothing thrown rendering, and
                       the eleven mechanisms arrive as relations with nothing
                       missing. A scenario whose relations want terms the
                       arithmetic does not write is a model the page reports as
                       incomplete, which is how the first version of this file
                       arrived: the corpus is beside the page whatever a
                       scenario says, and three statements the default view
                       admits came in carrying terms this model has no lines
                       for.
     the class         three slots, on the three lines several mechanisms read
                       each, and 5 x 5 x 4 = the hundred combinations
                       docs/showcase-a/scope.json reports. Every one of them
                       is a DECLARED class on a shared line, which is the thing
                       that could not be declared at all until famsOf learned
                       to look at a line that is not a mechanism's own term.
     it derives        the propositions come back, and the ones about value
                       created are proved over the whole declared box.
     and it refuses    the two rights channels are NOT proved, and the row says
                       why: `min(chi_0 + chi_pi * pi + chi_alpha * alpha, 1)`
                       crosses inside the declared box, so there is no single
                       branch to differentiate. That is the honest state of
                       this model on this bench, it is what stands between the
                       three rows the first demo quotes from drystone and their
                       becoming derived, and it is asserted here so that it
                       changes visibly rather than quietly.

   Run:  node tests/scenario-twochannel.mjs
*/

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const DOCS = path.join(ROOT, "docs");
const BENCH = path.join(DOCS, "bench");
const SCEN = path.join(BENCH, "demo", "purpose-two-channel.amg.json");
const SCOPE = JSON.parse(fs.readFileSync(
  path.join(DOCS, "showcase-a", "scope.json"), "utf8"));

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

export async function openTwoChannel(chrome){
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
    {stdio:"ignore"});
  const file = path.join(BENCH, "__twochannel.html");
  try{
    await new Promise(r => setTimeout(r, 700));
    let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
    const CATCH = `<script>window.__errs=[];` +
      `addEventListener("error",e=>window.__errs.push(e.message));</script>\n`;
    const head = page.indexOf("<script");
    page = page.slice(0, head) + CATCH + page.slice(head);

    /* The scenario is handed to the page as data and opened through the same
       snapApply the menu uses, rather than by clicking the menu: the click
       path is a fetch, and this harness is about what the declarations do. */
    const PROBE = String.raw`
<pre id="__out"></pre>
<script id="__scen" type="application/json">${
  fs.readFileSync(SCEN, "utf8").replace(/</g, "\u003c").replace(/[\u2028\u2029]/g, "")}</script>
<script>(function(){ (async () => {
  const out = {threw:{}};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  /* WAIT FOR THE HOOK RATHER THAN GUESS AT IT. This read a fixed 900ms after
     load, which is the same number tests/hostile.mjs uses and was long enough
     every time it was run on its own. Inside "make check" it is the third
     headless run in a row, and once in a while the page had not finished
     evaluating 39 modules and 886KB of corpus data by then: window.__bench was
     not there yet, every name came back undefined, and the failure read as
     "snapApply is not a function", which says nothing about what went wrong.
     Polling for the one name this probe cannot work without turns a flake into
     either a pass or a sentence. */
  let B = {};
  for(let i = 0; i < 150; i++){
    B = window.__bench || {};
    if(typeof B.snapApply === "function") break;
    await nap(100);
  }
  const {BUF, PROPS, buildArith, classSpec, expSlotsNow, famOf, lastView,
         renderPanel, snapApply, state, varName} = B;
  try{
    if(typeof snapApply !== "function")
      throw new Error("window.__bench never offered snapApply: the page did not " +
        "finish loading within 15 seconds, or the hook has lost a name");
    window.confirm = () => true; window.prompt = () => null; window.alert = () => {};
    /* THE SIGNPOST, IN BOTH OF ITS STATES. This page is loaded fresh here and
       nothing is declared in it yet, which is exactly when the two finished
       examples are offered; the walk does not reach the header, so this is
       where it is checked. */
    const bar = document.getElementById("openbar");
    out.signpost = {before: !!bar && !bar.hidden,
      offers: [...document.querySelectorAll("#openbar button")].map(b => b.id),
      /* And the Menu, because what left the start page has to still be
         reachable from somewhere. */
      menu: [...document.querySelectorAll("#scenMenu button")].map(b => b.id)};
    snapApply(JSON.parse(document.getElementById("__scen").textContent).snap);
    await nap(500);
    /* WALKED, NOT JUMPED. lastView is what carries the corpus statements and
       it is rebuilt by the page's own refresh, not by renderPanel, so a model
       read before one still holds the previous view's relations -- a property
       of this probe and not of the scenario, and it took an hour to tell apart
       the first time.
       One click on the first navigation button was enough while this scenario
       curated no literature: with no outlet in scope nothing was in view, so
       there was nothing for a stale view to be stale about. The scenario
       carries a curation now, and reading the arithmetic before the
       steps that produce the statements have rendered reports the relations of
       whatever the browser held before -- on a fresh browser, the seeded demo's
       two bridges, which this model has no term for. So the steps are walked in
       order, which is also what a reader does. */
    for(const st of [1, 2, 3, 4, 5]){
      state.stage = st;
      try{ renderPanel(); }catch(e){ out.threw["step" + st] = String(e.message); }
      await nap(260);
    }
    if(typeof B.refresh === "function") B.refresh();
    await nap(400);

    const M = buildArith(classSpec());
    out.model = {steps:M.steps.length, bad:M.bad.slice(0, 6), miss:M.miss.slice(0, 8),
      params:M.params.map(varName).sort(), outs:M.outs.map(varName).sort(),
      mechanisms:[...M.terms.values()].sort(),
      kinds:M.steps.reduce((a, s) => { a[s.kind] = (a[s.kind] || 0) + 1; return a; }, {})};

    out.classes = {};
    for(const k of ["eff", "sat", "cvx"]) out.classes[k] = famOf(k) || null;

    const slots = expSlotsNow();
    out.slots = slots.map(s => ({term:s.term, members:(s.members || []).length,
      running:s.running, shared:!!s.shared}));
    out.product = slots.reduce((t, s) => t * Math.max(1, (s.members || []).length), 1);

    state.stage = 6;
    try{ renderPanel(); }catch(e){ out.threw.derive = String(e.message); }
    await nap(300);
    const btn = [...document.querySelectorAll("#pbody button")]
      .find(b => /derive/i.test(b.textContent || ""));
    if(!btn) throw new Error("step 4 offers nothing that derives");
    btn.click();
    await nap(5000);
    out.props = ((PROPS || {}).out || {}).props
      ? PROPS.out.props.map(p => ({y:p.y, x:p.x, verdict:p.verdict, dir:p.dir,
          share:p.share, err:String(p.err || "").slice(0, 140)}))
      : null;
    out.buf = BUF ? (BUF.lines || []).length : null;
    for(const n of [5, 6, 7]){
      state.stage = n;
      try{ renderPanel(); }catch(e){ out.threw["step " + n] = String(e.message); }
      await nap(120);
    }
    out.signpost.after = !!bar && !bar.hidden;
    /* And the button does what it says. Last, because it opens the other
       scenario and everything above is already measured. */
    const go = document.getElementById("openDemo");
    if(go){
      go.click();
      await nap(2500);
      out.signpost.opened = !!(window.__bench.ARITH || {}).kept;
    }
  }catch(e){ out.FATAL = String(e && e.message || e);
    out.stack = String(e && e.stack || "").slice(0, 600); }
  if(window.__errs && window.__errs.length) out.loadErrors = window.__errs.slice(0, 6);
  document.getElementById("__out").textContent = JSON.stringify(out);
})(); })();</script>`;
    fs.writeFileSync(file, page + PROBE);
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=120000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__twochannel.html`],
      {encoding:"utf8", maxBuffer:64 * 1024 * 1024});
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

if(process.argv[1] && process.argv[1].endsWith("scenario-twochannel.mjs")){
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  const got = await openTwoChannel(chrome);
  const fail = [];
  if(got.FATAL){ console.error("the probe threw:", got.FATAL); console.error(got.stack); process.exit(1); }
  if(got.loadErrors) fail.push("the page threw while opening it: " + got.loadErrors.join(" · "));
  for(const [k, v] of Object.entries(got.threw || {})) fail.push(`${k} threw: ${v}`);

  const M = got.model || {};
  if(M.steps !== 62) fail.push(`${M.steps} lines placed, not the model's 62`);
  if((M.bad || []).length) fail.push("lines refused: " + JSON.stringify(M.bad));
  if((M.miss || []).length) fail.push("relations with no term: " + M.miss.join(", "));
  if((M.kinds || {}).term !== 11) fail.push(`${(M.kinds || {}).term} terms, not eleven`);
  if((M.kinds || {}).out !== 4) fail.push(`${(M.kinds || {}).out} outcomes, not four`);
  if((M.params || []).length !== 6) fail.push("parameters: " + (M.params || []).join(", "));

  for(const [k, c] of Object.entries(got.classes || {})){
    if(!c) fail.push(`${k} carries no class, so its declaration did not arrive`);
    else if(c.how !== "named") fail.push(`${k}'s class is ${c.how}, not declared`);
    else if(!c.shared) fail.push(`${k} is not read as a shared line`);
  }
  const shared = (got.slots || []).filter(s => s.shared);
  if(shared.length !== 3) fail.push(`${shared.length} shared slots, not three`);
  if(got.product !== SCOPE.grid.forms)
    fail.push(`the declared class is ${got.product} combinations, not scope.json's ${SCOPE.grid.forms}`);

  const props = got.props || [];
  const proved = props.filter(p => p.verdict === "proved");
  if(!props.length) fail.push("nothing derived");
  if(proved.length < 5) fail.push(`${proved.length} proved, which is fewer than this model gives`);
  /* Value created has no ceiling in it, so its statics are provable; the two
     rights channels have, and the row has to SAY so. */
  if(!proved.some(p => p.y === "vp" && p.x === "alpha" && p.dir > 0))
    fail.push("value created is no longer proved to rise in AI intensity");
  const blocked = props.filter(p => (p.y === "a" || p.y === "b") && /min\(/.test(p.err));
  if(!blocked.length)
    fail.push("the rights channels no longer report the min() crossing. If the kernel " +
      "learned to split a crossing, this test is what has to change -- and the three " +
      "rows the first demo quotes from drystone can become derived.");

  /* The first thing a reader meets, and the last thing checked. */
  const sp = got.signpost || {};
  if(!sp.before) fail.push("the page does not offer its two examples when nothing is declared");
  /* TWO BUTTONS, not three, because the two-channel
     model and the purpose project are both examples and two near-identical
     buttons make a reader guess. `openModel` is in the Menu under the demo
     projects, which is where this harness now expects it. */
  for(const id of ["openNew", "openDemo"])
    if(!(sp.offers || []).includes(id)) fail.push(`the start page has no ${id} button`);
  if((sp.offers || []).includes("openModel"))
    fail.push("openModel is back on the start page, where two examples made a reader guess");
  if(!(sp.menu || []).includes("scenModel"))
    fail.push("the Menu has no scenModel button, so the two-channel model is unreachable");
  if(sp.after) fail.push("the signpost is still shown after a model was declared");
  if(sp.opened === false) fail.push("pressing Open the worked example declared nothing");

  if(fail.length){
    console.error("the two-channel scenario did not open as it declares itself:\n");
    for(const f of fail) console.error("  " + f);
    process.exit(1);
  }
  console.log(`two-channel scenario: ${M.steps} lines, ${(M.kinds || {}).term} mechanisms, ` +
    `${shared.length} declared classes over ${got.product} form combinations, ` +
    `${props.length} propositions (${proved.length} proved, ${blocked.length} refused ` +
    `at the contractibility cap)`);
}

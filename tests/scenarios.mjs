/* THE TWO WAYS IN, AND THE WAY BACK.
   ==========================================================================

   The toggle beside the scenario name has two states -- the worked example, or
   your own workbench with the literature drawn and nothing declared -- and the
   page walk cannot see it, because the walk inventories the panel and this
   lives in the header. So it is checked here, against the real page.

   What is asserted is the contract a reader assumes and a page of this shape
   does not keep by itself:

     one seed            a first visit has ONE scenario, the reader's own.
                         There used to be a second, a starting point for the
                         two-channel model, which cluttered the menu for
                         everybody who never opened it -- and what it was a
                         starting point for now ships as a finished scenario.
     a slot, not a copy  opening an example twice does not make two of them.
                         It used to: a reader who looked ten times had ten
                         scenarios with one name between them.
     and nothing leaks   switching to the example and back leaves the workbench
                         as it was, with nothing declared in it, because they
                         are two scenarios and not two views of one.

   Run:  node tests/scenarios.mjs
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

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

export async function switching(chrome){
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
    {stdio:"ignore"});
  const file = path.join(BENCH, "__scenarios.html");
  try{
    await new Promise(r => setTimeout(r, 700));
    let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
    const CATCH = `<script>window.__errs=[];` +
      `addEventListener("error",e=>window.__errs.push(e.message));</script>\n`;
    /* WHAT THE STORE LOOKED LIKE BEFORE TODAY, seeded before the page's own
       modules run, because migration code nobody exercises is what breaks on
       somebody else's machine. Three of these four rows are the page's own
       making: the second seed it no longer writes, and two copies of one
       example from pressing a menu button twice. The fourth is the reader's,
       and has to come through untouched. */
    const LEGACY = JSON.stringify({active: "s_old_work", list: [
      {id: "s_old_work", name: "Worked example", at: "", snap: {stage: 1}},
      {id: "s_old_seed2", name: "Stoelhorst & Vishwanathan \u2014 what the model needs",
       at: "", snap: {stage: 1, msel: ["mr:contractibility"], dropped: {c: ["x"], k: []}}},
      {id: "s_old_d1", name: "Purpose \u00d7 property rights (demo)", at: "",
       snap: {stage: 1, arith: {lines: [1, 2, 3, 4, 5, 6, 7, 8]}, vtype: [1, 2, 3, 4, 5, 6, 7]}},
      {id: "s_old_d2", name: "Purpose \u00d7 property rights (demo)", at: "",
       snap: {stage: 1, arith: {lines: [1, 2, 3, 4, 5, 6, 7, 8]}, vtype: [1, 2, 3, 4, 5, 6, 7]}},
      {id: "s_mine", name: "My own run", at: "", snap: {stage: 3}},
    ]});
    const SEED = `<script>try{localStorage.setItem("purposeScenarios",${
      JSON.stringify(LEGACY)});}catch(e){}</script>\n`;
    const head = page.indexOf("<script");
    page = page.slice(0, head) + CATCH + SEED + page.slice(head);

    const PROBE = String.raw`
<pre id="__out"></pre>
<script>(function(){ (async () => {
  const out = {steps:[], threw:{}};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 150; i++){
    B = window.__bench || {};
    if(typeof B.snapApply === "function") break;
    await nap(100);
  }
  const {ARITH} = B;
  const menu = () => document.getElementById("scenMenu");
  const rows = () => [...document.querySelectorAll("#scenList [data-scen]")];
  const named = n => rows().find(b =>
    (b.querySelector(".scennm").textContent || "").trim() === n);
  const active = () => rows().find(x => x.classList.contains("on")) || null;
  const here = () => { const b = active();
    return b ? (b.querySelector(".scennm").textContent || "").trim() : null; };
  const onDemo = () => { const b = active();
    return b ? /purpose-x-property-rights/.test(b.getAttribute("data-from") || "") : null; };
  const pickDemo = async () => {
    if(menu()) menu().open = true;
    await nap(200);
    const b = rows().find(x => /purpose-x-property-rights/.test(x.getAttribute("data-from") || ""));
    if(!b) throw new Error("the menu lists no scenario built from the demo file");
    b.click();
    await nap(2600);
  };
  const pickMine = async () => {
    if(menu()) menu().open = true;
    await nap(200);
    const b = rows().find(x => !x.hasAttribute("data-from"));
    if(!b) throw new Error("the menu lists no scenario of the reader's own");
    b.click();
    await nap(2600);
  };
  const pick = async n => {
    if(menu()) menu().open = true;
    await nap(200);
    const b = named(n);
    if(!b) throw new Error('no scenario called "' + n + '" in the menu; it holds: ' +
      JSON.stringify(rows().map(x => (x.querySelector(".scennm").textContent || "").trim())));
    b.click();
    await nap(2600);
  };
  const look = where => {
    out.steps.push({where,
      on: onDemo(),
      label: here(),
      scenarios: rows().map(b => (b.querySelector(".scennm").textContent || "").trim()),
      declared: !!(ARITH && ARITH.kept)});
  };
  try{
    window.confirm = () => true; window.prompt = () => null; window.alert = () => {};
    if(typeof B.snapApply !== "function")
      throw new Error("window.__bench never offered snapApply: the page did not finish loading");
    await nap(400);
    look("a first visit");
    /* Opened, left, and opened again. The point is unchanged: the second
       opening must find the slot that is already there rather than making a
       second one. */
    { const dm = document.getElementById("scenDemo");
      if(menu()) menu().open = true;
      await nap(200);
      const egs = document.getElementById("scenEgs");
      if(egs) egs.click();
      await nap(200);
      if(!dm) throw new Error("there is no way to open the worked example");
      dm.click(); await nap(2600);
      look("the example, opened");
      await pickMine();
      look("back to the workbench");
      await pickDemo();
      look("the example again");
    }
    /* And the other example, from the menu, which must also be a slot. */
    const m = document.getElementById("scenModel");
    if(m){ m.click(); await nap(2600); look("the model, from the menu");
           m.click(); await nap(2600); look("the model again"); }
  }catch(e){ out.FATAL = String(e && e.message || e);
    out.stack = String(e && e.stack || "").slice(0, 600); }
  if(window.__errs && window.__errs.length) out.loadErrors = window.__errs.slice(0, 6);
  document.getElementById("__out").textContent = JSON.stringify(out);
})(); })();</script>`;
    fs.writeFileSync(file, page + PROBE);
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=120000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__scenarios.html`],
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

if(process.argv[1] && process.argv[1].endsWith("scenarios.mjs")){
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  const got = await switching(chrome);
  if(got.FATAL){ console.error("the probe threw:", got.FATAL); console.error(got.stack); process.exit(1); }
  const fail = [];
  if(got.loadErrors) fail.push("the page threw while loading: " + got.loadErrors.join(" · "));
  const at = where => got.steps.find(s => s.where === where) || {};

  /* THE MIGRATION. Five rows went in: the reader's old workbench, the second
     seed the page no longer writes, two identical copies of one example, and
     one scenario of the reader's own. What should come out is three -- the two
     theirs, untouched, and ONE adopted example slot. */
  const first = at("a first visit");
  const names = first.scenarios || [];
  if(names.length !== 3)
    fail.push(`the old store of five became ${names.length}, not three: ${names.join(" / ")}`);
  for(const keep of ["Worked example", "My own run"])
    if(!names.includes(keep)) fail.push(`${keep} is the reader's and was removed`);
  if(names.some(n => /Stoelhorst/.test(n)))
    fail.push("the second seed survived, and nothing was ever declared in it");
  if(names.filter(n => /property rights/.test(n)).length !== 1)
    fail.push("the two identical copies of one example did not collapse into one");
  if(!names.some(n => /property rights \(example\)$/.test(n)))
    fail.push("the surviving copy was not adopted as the example's slot");
  if(first.on !== false) fail.push("a first visit opens on the example rather than the reader's own");
  if(first.declared) fail.push("the reader's own workbench came back with something in it");

  const on = at("the example, opened");
  if(on.on !== true) fail.push("opening the example did not make it the scenario in use");
  if(!on.declared) fail.push("the example opened and declared nothing");
  if(!on.label) fail.push("nothing is ticked while the example is open");
  if((on.scenarios || []).length !== 3)
    fail.push(`opening the example left ${(on.scenarios || []).length} scenarios, not three`);

  const back = at("back to the workbench");
  if(back.on !== false) fail.push("picking the reader's own did not leave the example");
  if(back.declared) fail.push("the workbench came back with the example's model still in it");
  if((back.scenarios || []).length !== 3)
    fail.push("coming back changed the number of scenarios");

  const again = at("the example again");
  if(!again.declared || again.on !== true) fail.push("the example did not reopen");
  if((again.scenarios || []).length !== 3)
    fail.push(`opening it twice made ${(again.scenarios || []).length} scenarios: a slot, not a copy`);

  const mod = at("the model, from the menu"), mod2 = at("the model again");
  if(mod.where && (mod.scenarios || []).length !== 4)
    fail.push(`the second example made ${(mod.scenarios || []).length} scenarios, not four`);
  if(mod2.where && (mod2.scenarios || []).length !== 4)
    fail.push(`opening the second example twice made ${(mod2.scenarios || []).length}`);

  if(fail.length){
    console.error("switching between the examples and the workbench is not what it says:\n");
    for(const f of fail) console.error("  " + f);
    console.error("\n  what the page did, step by step:");
    for(const s of got.steps)
      console.error(`    ${s.where}: toggle ${s.on ? "on" : "off"}, ` +
        `${(s.scenarios || []).length} scenario(s) [${(s.scenarios || []).join(" / ")}]` +
        `, ${s.declared ? "a model is declared" : "nothing declared"}`);
    process.exit(1);
  }
  console.log(`scenarios: a store of five from before today became ${names.length} ` +
    `(the reader's two, and one adopted slot), the example toggled on and off and on ` +
    `again without being copied, and ${(mod2.scenarios || mod.scenarios || []).length} ` +
    `in the menu after both examples have been opened twice`);
}

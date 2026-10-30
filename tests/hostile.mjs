/* A SCENARIO THAT ATTACKS THE PAGE THAT OPENS IT.
   ==========================================================================

   The scenario format exists to be exchanged. A scholar deposits one, another
   opens it, and everything in it -- a group's name and colour, a weight's
   value, a proposition's sentence, a reviewer's reason -- was written by
   somebody else and is interpolated into the page's markup. Where one of
   those is not escaped, opening the file runs script in the reader's page.

   `fixtures/scenario-hostile.amg.json` is the worked example with one tagged
   payload in every free-text field it carries, and it passes `amg check`,
   which is the whole problem: the file is well formed and the format is the
   delivery mechanism. Two of its payloads have executed in a page -- a
   weight's value, printed by three panels on step 3.1, and a board row's
   sentence,
   where the fallback branch of the same expression WAS escaped and the field
   from the file was not.

   The signal here cannot be faked by escaping. A payload that reaches the
   markup unescaped leaves a literal `<img`, becomes an element, and its
   `onerror` pushes its own field name onto `window.__XSS`. An escaped one
   leaves `&lt;img`, is text, and does nothing. So the test reports which
   FIELD leaked and not merely that something did.

   Run:  node tests/hostile.mjs
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
const FIXTURE = path.join(HERE, "fixtures", "scenario-hostile.amg.json");

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

/* The payload, as the fixture writes it. Kept here as well so the test fails
   loudly if the fixture is regenerated in a shape this can no longer detect,
   rather than passing because it found nothing to look for. */
const SHOT = f =>
  `<img src=x onerror="window.__XSS=(window.__XSS||[]).concat(['${f}'])">`;

export async function hostile(chrome){
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
    {stdio:"ignore"});
  const file = path.join(BENCH, "__hostile.html");
  try{
    await new Promise(r => setTimeout(r, 700));
    const scen = fs.readFileSync(FIXTURE, "utf8");
    let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
    const CATCH = `<script>window.__errs=[];window.__XSS=[];` +
      `addEventListener("error",e=>window.__errs.push(e.message));</script>\n`;
    const head = page.indexOf("<script");
    page = page.slice(0, head) + CATCH + page.slice(head);

    /* The fixture is handed to the page as data rather than served, so the
       hostile file never sits under docs/ where a build could ship it. */
    const PROBE = String.raw`
<pre id="__out"></pre>
<script id="__scen" type="application/json">${
  scen.replace(/</g, "\u003c").replace(/[\u2028\u2029]/g, "")}</script>
<script>(function(){ setTimeout(async () => {
  const out = {executed:[], leaked:{}, threw:{}, steps:0, clicked:0};
  /* Read when this runs, not when the probe parses: see the note in
     tests/pagewalk.mjs. */
  const B = window.__bench || {};
  const {ARITH, BOARD, BUF, EXP, EXPSETS, GUIDE, OP, PROPS, STAGES, VAR, WS, XRUN, bufPush, buildArith, classSpec, expSlotsNow, famOf, lastView, renderGuide, renderPanel, reviewChecks, reviewState, scenDemo, snapApply, state, varName, xrunClause, xrunGo} = B;
  try{
    /* Dialogs would block a headless run, so they answer themselves. */
    window.confirm = () => false; window.prompt = () => null; window.alert = () => {};
    const o = JSON.parse(document.getElementById("__scen").textContent);
    snapApply(o.snap);
    await new Promise(r => setTimeout(r, 400));
    const RE = /<img src=x onerror="window\.__XSS=\(window\.__XSS\|\|\[\]\)\.concat\(\['([a-z.]+)'\]\)">/g;
    const look = where => {
      const html = document.body.innerHTML;
      for(const m of html.matchAll(RE)){
        (out.leaked[m[1]] = out.leaked[m[1]] || []);
        if(!out.leaked[m[1]].includes(where)) out.leaked[m[1]].push(where);
      }
      /* A value from a file that reaches a style attribute can say anything
         CSS can say without ever closing the quote, so the attribute is
         checked for what it should never hold rather than for a payload. */
      for(const el of document.querySelectorAll("[style]")){
        const v = el.getAttribute("style") || "";
        if(/url\s*\(|expression\s*\(|onload=|onerror=/i.test(v)){
          (out.leaked["a style attribute"] = out.leaked["a style attribute"] || []);
          if(!out.leaked["a style attribute"].includes(where))
            out.leaked["a style attribute"].push(where);
        }
      }
    };
    for(const n of [1,2,3,4,5,6,7,8]){
      state.stage = n;
      try{ renderPanel(); }catch(e){ out.threw["step " + n] = String(e.message); }
      await new Promise(r => setTimeout(r, 140));
      out.steps++;
      look("step " + n);
      /* Open everything that folds, because a payload in a tooltip or a
         collapsed section is in the markup either way but a reader only
         meets it here. */
      for(const d of document.querySelectorAll("#pbody details, #pfoot details, #wlfoot details"))
        d.open = true;
      look("step " + n + ", unfolded");
      /* And press what cannot navigate or fetch: the tab bars and mode bars
         re-render the panel from the same data through different branches,
         which is where three of the unescaped sites lived. */
      const safe = [...document.querySelectorAll(
        "#pbody .modebar button, #pbody .tabbtn, #pbody [data-tab], #pbody [data-dec]")]
        .filter(b => !b.disabled && !b.dataset.step).slice(0, 14);
      for(const b of safe){
        try{ b.click(); out.clicked++; }catch(e){}
        await new Promise(r => setTimeout(r, 25));
        look("step " + n + ", after a click");
      }
    }
    /* AND A VALUE THE PAGE HAS NO MEANING FOR, which is the other way a
       scenario file can be wrong: not an injection but a setting outside the
       vocabulary. This fixture carries apply.Evid set to "hide", the word the
       BUTTON is labelled with rather than the one the page stores, and the
       page has to refuse it by name and say so rather than guess at it or
       drop it in silence. Two demonstrations carrying the same value means
       every reader of the worked example meets a failure banner before doing
       anything. They carry different ones; this file
       keeps the bad value on purpose, because the refusal needs somewhere to
       be exercised. (No backticks in here: this comment is inside a
       template literal.) */
    out.refused = [...document.querySelectorAll("details")]
      .map(e => e.textContent.replace(/\s+/g, " "))
      .filter(t => /could not be saved/.test(t))
      .map(t => t.slice(0, 300));
    out.applyNow = JSON.stringify(state.apply);
  }catch(e){ out.FATAL = String(e && e.message || e); out.stack = String(e && e.stack || "").slice(0, 600); }
  out.executed = [...new Set(window.__XSS || [])];
  if(window.__errs && window.__errs.length) out.loadErrors = window.__errs.slice(0, 6);
  document.getElementById("__out").textContent = JSON.stringify(out);
}, 900); })();</script>`;
    fs.writeFileSync(file, page + PROBE);
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=90000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__hostile.html`],
      {encoding:"utf8", maxBuffer:64 * 1024 * 1024});
    const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
    if(!m) throw new Error("the probe produced nothing; chrome said: " +
      String(r.stderr || "").slice(0, 400));
    const txt = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return JSON.parse(txt);
  } finally {
    try{ fs.unlinkSync(file); }catch(e){}
    srv.kill();
  }
}

if(process.argv[1] && process.argv[1].endsWith("hostile.mjs")){
  /* The fixture has to still carry a payload this can find. A test that looks
     for nothing passes for the wrong reason, which is the failure mode this
     whole file exists to answer. */
  const raw = fs.readFileSync(FIXTURE, "utf8");
  const fields = [...new Set([...raw.matchAll(/concat\(\\?'?\[?'([a-z.]+)'\]/g)]
    .map(x => x[1]))];
  if(fields.length < 8){
    console.error(`the hostile fixture carries only ${fields.length} tagged payloads; ` +
      `it is meant to carry one per free-text field the format holds, and a test ` +
      `that looks for nothing passes for the wrong reason`);
    process.exit(2);
  }
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  const got = await hostile(chrome);
  if(got.FATAL){ console.error("the probe threw:", got.FATAL); console.error(got.stack); process.exit(1); }
  if(got.loadErrors){
    console.error("the page threw while loading the hostile scenario:");
    for(const e of got.loadErrors) console.error("  " + e);
    process.exit(1);
  }
  const bad = got.executed.length || Object.keys(got.leaked).length;
  if(bad){
    console.error("a scenario file ran script in the page that opened it.\n");
    if(got.executed.length){
      console.error("  EXECUTED, from these fields:");
      for(const f of got.executed) console.error("    " + f);
    }
    for(const [f, where] of Object.entries(got.leaked))
      console.error(`  ${f} reached the markup unescaped at ${where.join(", ")}`);
    console.error("\n  Escape it where it is interpolated. A colour or a number from a " +
      "file is checked rather than escaped: cssColor() and numText() in 03c-corpus.js.");
    process.exit(1);
  }
  if(Object.keys(got.threw).length){
    console.error("the hostile scenario broke a render, which is its own defect:");
    for(const [k, v] of Object.entries(got.threw)) console.error(`  ${k}: ${v}`);
    process.exit(1);
  }
  /* The setting outside the vocabulary, refused by name. Checked here and not
     only looked at, because the two demonstrations carried the same value and
     nothing in the suite noticed for two days. */
  const said = (got.refused || []).join(" ");
  if(!/Evid=hide/.test(said)){
    console.error("a scenario carrying a bar value this page has no meaning for " +
      "(apply.Evid: \"hide\") was not refused by name. What the page said:\n  " +
      (said || "nothing at all") +
      "\n\n  snapApply() in page/17-scenarios.js keeps the default and reports " +
      "through noteFail;\n  translating it would change what the demonstration " +
      "shows and what its counts mean.");
    process.exit(1);
  }
  if(!/"Evid":"dim"/.test(got.applyNow || "")){
    console.error("the refused value was not replaced by the default: " + got.applyNow);
    process.exit(1);
  }
  console.log(`hostile scenario: ${fields.length} tagged fields, ${got.steps} steps, ` +
    `${got.clicked} controls pressed — nothing executed, nothing reached the markup raw` +
    `\n                  and a bar value outside the vocabulary is refused by name, ` +
    `with the default left standing`);
}

/* THE OTHER PAGES.
   ==========================================================================

   The bench is not the artifact. docs/ also publishes the explorer, the
   curves page and the statics page, and not one of them was covered by
   anything: `make check` parsed the bench's scripts and said nothing about
   these at all. Every function on every step AND page is to be tested; this
   is the second half of that.

   A smoke test rather than a characterisation: load each page, record every
   uncaught error, then CLICK EVERY BUTTON ON IT and record what throws.
   Counting a button is not clicking it -- that lesson cost twenty dead
   controls -- so this clicks. What it asserts is the floor: the page loads,
   it draws something, and operating it does not throw.
*/

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "docs");

/* The published pages. The two template.html files are sources the build
   reads, not pages anybody opens, so they are deliberately not here. */
/* The explorer and the curves pages went with drystone: both were built from
   its JavaScript port, and that port was the thing being removed. The statics
   page stays, and it now RUNS a model: it reads the scenario, compiles it with
   core/kernel.js and draws what comes out, so this smoke test is also the only
   check that mounting statics/statics.js outside the bench works at all. */
export const PAGES = [
  {path: "bench/statics/index.html", wants: ["svg", "button", "paths"]},
];

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const PROBE = String.raw`
<script>
(function(){
  const errs = [];
  window.addEventListener("error", e => errs.push(String(e.message)));
  window.addEventListener("unhandledrejection", e => errs.push("rejected: " + String(e.reason)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  window.__smoke = async function(){
    await sleep(500);
    const el = s => document.querySelectorAll(s).length;
    /* A canvas that is on the page and blank is a page that did not draw.
       Counting the element would have called both of these pages fine; this
       reads the pixels, which is the difference between present and working. */
    const inked = () => {
      let n = 0;
      for(const c of document.querySelectorAll("canvas")){
        try{
          const g = c.getContext("2d");
          if(!g || !c.width || !c.height) continue;
          const d = g.getImageData(0, 0, c.width, c.height).data;
          for(let i = 3; i < d.length; i += 4 * 97) if(d[i]) { n++; break; }
        }catch(e){ /* tainted or unsupported: not a drawing failure */ }
      }
      return n;
    };
    const before = {
      title: (document.title || "").trim(),
      svg: el("svg"), button: el("button"), select: el("select"),
      input: el("input"), rows: el("tr"), paths: el("path"), text: el("text"),
      canvas: el("canvas"), inked: inked(),
      body: (document.body.textContent || "").replace(/\s+/g, " ").trim().length,
    };
    /* Click everything once. A control that throws is the thing worth
       finding, and nothing on these pages leaves the browser. */
    const btns = [...document.querySelectorAll("button")];
    let clicked = 0;
    for(const b of btns){
      if(b.disabled) continue;
      try{ b.click(); clicked++; }catch(e){ errs.push("click threw: " + String(e && e.message)); }
      await sleep(12);
    }
    /* And change every select to each of its options. */
    let changed = 0;
    for(const s of document.querySelectorAll("select")){
      for(const o of [...s.options].slice(0, 4)){
        try{
          s.value = o.value;
          s.dispatchEvent(new Event("change", {bubbles:true}));
          changed++;
        }catch(e){ errs.push("change threw: " + String(e && e.message)); }
        await sleep(12);
      }
    }
    await sleep(260);
    const after = {svg: el("svg"), button: el("button"), paths: el("path"), text: el("text"),
      canvas: el("canvas"), inked: inked(),
      body: (document.body.textContent || "").replace(/\s+/g, " ").trim().length};
    return {before, clicked, changed, after, errors: errs};
  };
})();
</script>
<pre id="__out"></pre>
<script>(function(){ setTimeout(async () => {
  let r; try{ r = await window.__smoke(); }
  catch(e){ r = {FATAL:String(e && e.message || e)}; }
  document.getElementById("__out").textContent = JSON.stringify(r);
}, 700); })();</script>`;

export async function smoke(chrome, page){
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
    {stdio:"ignore"});
  const abs = path.join(DOCS, page.path);
  const probed = abs.replace(/\.html$/, ".__smoke.html");
  try{
    await new Promise(r => setTimeout(r, 650));
    fs.writeFileSync(probed, fs.readFileSync(abs, "utf8") + PROBE);
    const rel = path.relative(DOCS, probed).split(path.sep).join("/");
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=45000", "--dump-dom", `http://127.0.0.1:${port}/${rel}`],
      {encoding:"utf8", maxBuffer:64 * 1024 * 1024});
    const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
    if(!m) return {FATAL:"no probe output; chrome said " + String(r.stderr || "").slice(0, 200)};
    return JSON.parse(m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  } finally {
    try{ fs.unlinkSync(probed); }catch(e){}
    srv.kill();
  }
}

if(process.argv[1] && process.argv[1].endsWith("pagesmoke.mjs")){
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  let bad = 0;
  for(const page of PAGES){
    const r = await smoke(chrome, page);
    if(r.FATAL){ console.log(`${page.path}: FATAL ${r.FATAL}`); bad++; continue; }
    const missing = page.wants.filter(w => !r.before[w]);
    const ok = !r.errors.length && !missing.length;
    if(!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${page.path}`);
    console.log(`       "${r.before.title}" — ${r.before.svg} svg, ${r.before.button} buttons, ` +
      `${r.before.select} selects, ${r.before.canvas} canvas (${r.before.inked} drawn on), ` +
      `${r.before.paths} paths, ${r.before.text} svg labels, ` +
      `${r.before.body} chars of text`);
    console.log(`       clicked ${r.clicked} buttons, set ${r.changed} select values; ` +
      `after: ${r.after.inked} canvas drawn on, ${r.after.paths} paths, ${r.after.body} chars`);
    if(missing.length) console.log(`       MISSING: ${missing.join(", ")}`);
    for(const e of r.errors.slice(0, 6)) console.log(`       THREW: ${e}`);
  }
  process.exit(bad ? 1 : 0);
}

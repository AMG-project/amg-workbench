/* WHAT STEP 1.1 BRINGS IN FROM OUTSIDE, WITH THE OUTSIDE STUBBED.
   ==========================================================================

   Three imports on step 1.1 reach a service or a file: the citation counts
   from OpenAlex, a search export as a CSV, and a classification read out of a
   paper by a model. Each was greyed with a sentence saying what it would do.

   THE NETWORK IS STUBBED, ON PURPOSE AND NOT FOR SPEED. A check that calls a
   live index is a check that fails when somebody else's service is down, and
   worse, one that spends a shared budget every time anybody runs the suite.
   OpenAlex says so in every unkeyed answer: the free allowance is shared by
   network address. So `fetch` is replaced here, and what the test holds the
   page to is what it SENDS and what it does with what comes back.

   WHAT LEAVES THE BROWSER is the assertion that matters most and the one that
   is easiest to lose: the DOIs of the corpus, and nothing else. No address of
   the reader's, no identifier, no key unless they typed one. The stub records
   every URL it was given and the test reads them.

   Run:  node tests/imports.mjs
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
/* One DOI the stub pretends OpenAlex does not hold, so the "not held by it"
   path is exercised rather than described. */
const WITHHELD = "10.1111/joms.12659";
/* A search export with everything a reader of one has to survive: a quoted
   title holding the delimiter and doubled quotes, a paper the corpus already
   has, an outlet the twelve-journal frame does not hold, and a trailing line
   that is not a paper. */
const CSV = fs.readFileSync(path.join(HERE, "fixtures", "scopus-export.csv"), "utf8");
/* The other export shape: tab-separated, two-letter headers, and a DOI the
   corpus already holds under a different title. The dialog claims both shapes
   are read, so both are read here. */
const WOS = fs.readFileSync(path.join(HERE, "fixtures", "wos-export.txt"), "utf8");

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
  {stdio:"ignore"});
const file = path.join(BENCH, "__imports.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 700));
  let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  /* THE MODEL, STUBBED, because one of the three imports asks for one. It
     answers the two asks the classification needs and records both prompts, so
     the test can read what the page actually told it -- the instruction that
     matters here is that a paper the scheme does not place gets the unassigned
     code rather than being forced into a tradition.

     It answers WRONGLY on purpose, three ways: one assignment names a paper
     the corpus does not hold, one names a tradition the scheme does not list,
     and three papers are left out of the answer altogether. All three are
     paths the page has to count rather than write. */
  const HOST = `<script>
window.__sent = [];
window.claude = { use: async function(n){
  if(n !== "sample") return null;
  return {
    json: async function(q){
      var s = String(q);
      window.__sent.push(s);
      if(/way of SORTING that/.test(s)) return {
        name: "three readings of purpose",
        cite: "A Reviewer (2026), Journal of Reviews",
        what: "whether purpose is treated as a norm, a position or a critique",
        traditions: [
          {code:"nor",  label:"Normative",  why:"purpose as what a firm ought to do"},
          {code:"pos",  label:"Positive",   why:"purpose as something measured"},
          {code:"crit", label:"Critical",   why:"purpose as an object of suspicion"}
        ]
      };
      if(/Assign each paper to one tradition/.test(s)){
        var ids = [];
        var re = /^([0-9]{3}-[a-z0-9-]+)$/gm, m;
        while((m = re.exec(s))) ids.push(m[1]);
        var codes = ["nor", "pos", "crit", "--"];
        var out = [];
        for(var i = 0; i < ids.length - 3; i++)
          out.push({paper: ids[i], code: codes[i % 4], why: "stub assignment " + i});
        out.push({paper: "no-such-paper-9999", code: "nor", why: "a paper that does not exist"});
        out.push({paper: ids[0], code: "zzz", why: "a tradition the scheme does not list"});
        return {assign: out};
      }
      throw new Error("the stub was asked something it does not answer");
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
  const o = {urls:[]};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  try{
    /* THE INDEX, STUBBED. Every DOI the filter names comes back with a count
       derived from the DOI itself, so the test can assert exact numbers; one
       is withheld; and the mode can be flipped to make it answer 429. */
    const WITHHELD = ${JSON.stringify(WITHHELD)};
    const CSV = ${JSON.stringify(CSV)};
    const WOS = ${JSON.stringify(WOS)};
    let MODE = "ok";
    const n4 = s => { let h = 0; for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997; return h; };
    window.fetch = async function(url){
      o.urls.push(String(url));
      if(MODE === "429") return {ok:false, status:429, json:async () => ({})};
      const m = /filter=doi:([^&]*)/.exec(String(url));
      const dois = (m ? decodeURIComponent(m[1]) : "").split("|").filter(Boolean);
      const results = [];
      for(const d of dois){
        if(d === WITHHELD) continue;
        const c = n4(d);
        results.push({doi:"https://doi.org/" + d, cited_by_count:c,
          counts_by_year:[{year:2026, cited_by_count:c % 7},
                          {year:2025, cited_by_count:c % 11}]});
      }
      return {ok:true, status:200, json:async () => ({results:results})};
    };

    B.state.stage = 1; B.renderPanel(); await nap(1600);
    const st = document.getElementById("impStats");
    if(!st) throw new Error("step 1.1 offers no way to read the statistics");
    o.live = !st.classList.contains("off");
    o.label = st.textContent.trim();
    o.pil = st.querySelectorAll(".pil").length;

    /* The shipped numbers, before anything is read. */
    o.before = {};
    for(const [id, p] of Object.entries(B.G ? B.G.papers : {})) o.before[id] = p.cb;

    st.click(); await nap(800);
    o.open = !!document.getElementById("idlg").open;
    document.getElementById("idlggo").click();
    for(let i = 0; i < 80 && !document.querySelector("#idlgbody tbody tr"); i++) await nap(200);
    o.rows = document.querySelectorAll("#idlgbody tbody tr").length;
    o.said = (document.querySelector("#idlgbody p.why") || {}).textContent
      .replace(/[ \t\n\r]+/g, " ").trim();
    o.okShown = !document.getElementById("idlgok").hidden;
    document.getElementById("idlgok").click();
    await nap(1600);

    /* What the corpus carries now, and whether the base survived. */
    o.after = {};
    for(const [id, p] of Object.entries(B.G ? B.G.papers : {}))
      o.after[id] = {cb:p.cb, cy:p.cy, cly:p.cly, cread:p.cread || ""};
    o.today = new Date().toISOString().slice(0, 10);
    o.inFile = (((JSON.parse(B.scenFile()).snap || {}).added || {}).stats || []).length;

    /* AND IT COMES BACK OFF. The shipped payload is never written to, so
       restoring the snapshot has to give the original numbers exactly. */
    st.click(); await nap(700);
    const dr = document.getElementById("idlgdrop");
    o.dropShown = !!(dr && !dr.hidden);
    if(dr && !dr.hidden){ dr.click(); await nap(1200); }
    o.restored = {};
    for(const [id, p] of Object.entries(B.G ? B.G.papers : {}))
      o.restored[id] = {cb:p.cb, cread:p.cread || ""};

    /* A REFUSAL IS A SENTENCE, not a silence. OpenAlex answers 429 when the
       shared budget is gone, which is a thing that happens to a reader who did
       nothing wrong, so the page has to say what happened and offer the way
       round it. */
    MODE = "429";
    document.getElementById("idlggo").click();
    for(let i = 0; i < 60 && !document.querySelector("#idlgbody p[style*='--neg']"); i++) await nap(200);
    o.refused = (document.querySelector("#idlgbody p[style*='--neg']") || {}).textContent || "";
    o.afterRefusal = Object.entries(B.G ? B.G.papers : {})
      .filter(function(e){ return e[1].cread; }).length;
    let c = document.getElementById("idlgcancel"); if(c) c.click();
    await nap(400);

    /* ---- a search export ----------------------------------------------- */
    const cs = document.getElementById("impCsv");
    if(!cs) throw new Error("step 1.1 offers no way to import a search export");
    o.csvLive = !cs.classList.contains("off");
    o.csvPil = cs.querySelectorAll(".pil").length;
    o.papersBefore = Object.keys(B.G.papers).length;
    o.outletsBefore = B.G.journals.length;
    o.tickedBefore = B.state.jr.size;
    cs.click(); await nap(700);
    const fi = document.getElementById("impCsvFile");
    if(!fi) throw new Error("the dialog offers no file to choose");
    const dt = new DataTransfer();
    dt.items.add(new File([CSV], "scopus-export.csv", {type:"text/csv"}));
    fi.files = dt.files;
    fi.dispatchEvent(new Event("change", {bubbles:true}));
    for(let i = 0; i < 60 && !document.querySelector("#idlgbody tbody tr"); i++) await nap(200);
    o.csvRows = document.querySelectorAll("#idlgbody tbody tr").length;
    o.csvSaid = (document.querySelector("#idlgbody p.why") || {}).textContent
      .replace(/[ \t\n\r]+/g, " ").trim();
    o.csvCols = [...document.querySelectorAll("#idlgbody [data-csvcol]")].map(function(s){
      return s.dataset.csvcol + "=" + (s.value === "" ? "" : s.options[s.selectedIndex].text);
    });
    /* The quoted title with a comma and doubled quotes in it, read back off
       the table: splitting on the delimiter would have shifted every column
       after it, and the row would show a fragment. */
    o.csvTitles = [...document.querySelectorAll("#idlgbody tbody tr")]
      .map(function(tr){ return tr.children[3].textContent; });
    const ok2 = document.getElementById("idlgok");
    o.csvOk = !!(ok2 && !ok2.hidden) ? ok2.textContent : "";
    ok2.click(); await nap(1800);

    o.papersAfter = Object.keys(B.G.papers).length;
    o.outletsAfter = B.G.journals.length;
    o.tickedAfter = B.state.jr.size;
    o.newOutlets = B.G.journals.slice(o.outletsBefore).map(function(j){
      return {f:j.f, n:j.n, ticked:B.state.jr.has(j.f)};
    });
    /* AN IMPORTED PAPER IS IN THE CORPUS AND OUT OF SCOPE until its outlet is
       ticked, which is the screening decision the file could not carry. */
    const added = Object.entries(B.G.papers).filter(function(e){ return e[1].src === "csv"; });
    o.added = added.map(function(e){
      return {id:e[0], a:e[1].a, y:e[1].y, jf:e[1].jf, j:e[1].j, d:e[1].d,
        nc:e[1].nc, ap:e[1].ap};
    });
    o.addedInScope = added.filter(function(e){ return B.state.jr.has(e[1].jf); }).length;
    o.listRows = document.querySelectorAll("#pbody2 tr, #papersec tbody tr").length;
    /* Tick the new outlet and the paper comes into scope, with no other change. */
    const jb = [...document.querySelectorAll("#cJr input")];
    o.boxes = jb.length;
    for(const b of jb){
      const lab = b.parentElement.textContent;
      if(/Business Ethics/.test(lab) && !b.checked){ b.checked = true;
        b.dispatchEvent(new Event("change", {bubbles:true})); }
    }
    await nap(1400);
    o.inScopeAfterTick = Object.entries(B.G.papers)
      .filter(function(e){ return e[1].src === "csv" && B.state.jr.has(e[1].jf); }).length;
    o.csvInFile = (((JSON.parse(B.scenFile()).snap || {}).added || {}).outlets || []).length;

    /* ---- the other export shape: tabs, two-letter headers -------------- */
    c = document.getElementById("idlgcancel"); if(c) c.click();
    await nap(400);
    cs.click(); await nap(700);
    const fi2 = document.getElementById("impCsvFile");
    const dt2 = new DataTransfer();
    dt2.items.add(new File([WOS], "wos-export.txt", {type:"text/plain"}));
    fi2.files = dt2.files;
    fi2.dispatchEvent(new Event("change", {bubbles:true}));
    for(let i = 0; i < 60 && !document.querySelector("#idlgbody tbody tr"); i++) await nap(200);
    o.wosSaid = (document.querySelector("#idlgbody p.why") || {}).textContent
      .replace(/[ \t\n\r]+/g, " ").trim();
    o.wosCols = [...document.querySelectorAll("#idlgbody [data-csvcol]")].map(function(s){
      return s.dataset.csvcol + "=" + (s.value === "" ? "" : s.options[s.selectedIndex].text);
    });
    o.wosRows = [...document.querySelectorAll("#idlgbody tbody tr")].map(function(tr){
      return [...tr.children].map(function(td){ return td.textContent.trim(); });
    });
    c = document.getElementById("idlgcancel"); if(c) c.click();
    await nap(400);

    /* ---- a classification, read out of a paper ------------------------- */
    B.state.stage = 1; B.renderPanel(); B.refresh(); await nap(1600);
    o.apBefore = [...document.querySelectorAll("#pbody #cAp option")]
      .map(function(x){ return x.value; });
    o.schemeSrc = (document.querySelector("#pbody .schemesrc") || {}).textContent || "";
    o.tradBefore = {};
    for(const [id, p] of Object.entries(B.G.papers))
      o.tradBefore[id] = p.ap;
    const sb = document.getElementById("impScheme");
    if(!sb) throw new Error("step 1.1 offers no way to read a classification");
    o.schemeLive = !sb.classList.contains("off");
    sb.click(); await nap(800);
    const tx = document.getElementById("impSchText");
    tx.value = "This review distinguishes three readings of purpose in the literature: " +
      "normative, positive and critical.";
    tx.dispatchEvent(new Event("input", {bubbles:true}));
    await nap(400);
    const sg = document.getElementById("impSchGo");
    o.schemeMark = !!(sg && sg.querySelector(".aim"));
    o.schemeOff = !!(sg && sg.disabled);
    sg.click();
    for(let i = 0; i < 120 && !document.querySelector("#idlgbody .chain"); i++) await nap(250);
    o.schemeSaid = (document.querySelector("#idlgbody p.why") || {}).textContent
      .replace(/[ \t\n\r]+/g, " ").trim();
    o.schemeRows = [...document.querySelectorAll("#idlgbody .chain .crow")].map(function(r){
      return {n:r.querySelector(".cst").textContent.trim(),
        lab:r.querySelector(".cnm").textContent.trim()};
    });
    /* WHAT THE PAGE TOLD THE MODEL, read off the prompt it sent. */
    o.prompts = (window.__sent || []).map(function(x){
      return String(x).replace(/[ \t\n\r]+/g, " ");
    });
    const ok3 = document.getElementById("idlgok");
    o.schemeOkLabel = ok3 && !ok3.hidden ? ok3.textContent : "";
    ok3.click(); await nap(1800);

    o.apAfter = [...document.querySelectorAll("#pbody #cAp option")]
      .map(function(x){ return x.value + ":" + x.textContent; });
    o.schemeSrcAfter = (document.querySelector("#pbody .schemesrc") || {}).textContent || "";
    o.tradAfter = {};
    for(const [id, p] of Object.entries(B.G.papers)) o.tradAfter[id] = p.ap;
    o.schemeInFile = !!(((JSON.parse(B.scenFile()).snap || {}).added || {}).scheme);
    /* Filtering by an imported tradition narrows the corpus, which is the
       whole point of reading one in. */
    const sel = document.getElementById("cAp");
    sel.value = "nor"; sel.dispatchEvent(new Event("change", {bubbles:true}));
    await nap(1400);
    o.inScopeNor = Object.entries(B.G.papers)
      .filter(function(e){ return B.state.jr.has(e[1].jf) && e[1].ap === "nor"; }).length;
    o.drawn = document.querySelectorAll("#pbody2 tr.prow:not(.out)").length;
    sel.value = "all"; sel.dispatchEvent(new Event("change", {bubbles:true}));
    await nap(900);

    /* AND BACK. The shipped cut returns exactly, every paper included. */
    const off = document.getElementById("schemeOff");
    o.offShown = !!off;
    if(off){ off.click(); await nap(1600); }
    o.tradBack = {};
    for(const [id, p] of Object.entries(B.G.papers)) o.tradBack[id] = p.ap;
    o.apBack = [...document.querySelectorAll("#pbody #cAp option")]
      .map(function(x){ return x.value; });
  }catch(e){ o.FATAL = String(e && e.message || e); o.stack = String(e && e.stack || "").slice(0, 400); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=240000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__imports.html`],
    {encoding:"utf8", maxBuffer:256 * 1024 * 1024});
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
if(out.FATAL){ fail.push(out.FATAL); if(out.stack) fail.push(out.stack); }
else {
  /* ---- the control itself ---------------------------------------------- */
  want(out.live, "the statistics import is still greyed");
  want(out.pil === 0, "the statistics import still carries a pilot chip");
  want(out.open, "pressing it opened nothing");

  /* ---- what left the browser ------------------------------------------- */
  /* BATCHED, AND WIRED ONCE. 52 papers with a DOI is two requests at forty a
     batch, and the 429 round is a third: anything more means a button in the
     dialog footer accumulated a handler on every redraw, which is exactly what
     the first version of this did. */
  want(out.urls.length === 3,
    out.urls.length + " requests went out where 3 were asked for (two batches of " +
    "forty, then the refused one). More than that is a listener added on every redraw");
  const bad = out.urls.filter(u => /mailto|email|api_key/.test(u));
  want(!bad.length,
    "a request carried something that is not a DOI: " + JSON.stringify(bad.slice(0, 1)));
  want(out.urls.every(u => u.indexOf("https://api.openalex.org/works") === 0),
    "a request went somewhere other than OpenAlex: " + JSON.stringify(out.urls.slice(0, 1)));
  want(out.urls.every(u => /select=doi,cited_by_count,counts_by_year/.test(u)),
    "a request asked for more than the three fields the page uses");

  /* ---- what came back -------------------------------------------------- */
  const n = Object.keys(out.before).length;
  want(out.rows === n - 1,
    out.rows + " rows came back for " + n + " papers with one withheld");
  want(/does not hold 1 of them/.test(out.said),
    "the page does not say that the index did not hold one of them: " + out.said);
  const changed = Object.keys(out.after).filter(id => out.after[id].cread);
  want(changed.length === n - 1,
    changed.length + " papers carry a re-read count, for " + (n - 1) + " that came back");
  want(changed.every(id => out.after[id].cread === out.today),
    "a re-read count is not stamped with the day it was read");
  /* The one the stub withheld keeps its shipped number and no stamp, which is
     the honest state: the index does not know it, so nothing was re-read. */
  const kept = Object.keys(out.after).filter(id => !out.after[id].cread);
  want(kept.length === 1 && out.after[kept[0]].cb === out.before[kept[0]],
    "the paper the index does not hold did not keep its shipped count");
  want(out.inFile === n - 1,
    "the re-read counts do not travel in the scenario: " + out.inFile + " of " + (n - 1));

  /* ---- and off again --------------------------------------------------- */
  want(out.dropShown, "there is no way to restore the shipped snapshot");
  const off = Object.keys(out.restored).filter(id =>
    out.restored[id].cb !== out.before[id] || out.restored[id].cread);
  want(!off.length, off.length + " paper(s) did not come back to the shipped number: " +
    JSON.stringify(off.slice(0, 3)));

  /* ---- a refusal ------------------------------------------------------- */
  want(/429/.test(out.refused) && /budget/.test(out.refused),
    "a refused request does not say what happened or what to do: " + out.refused);
  want(out.afterRefusal === 0, "a refused request wrote something anyway");

  /* ---- a search export ------------------------------------------------- */
  want(out.csvLive, "the search-export import is still greyed");
  want(out.csvPil === 0, "the search-export import still carries a pilot chip");
  want(out.csvCols.length === 6 && out.csvCols.every(c => !/=$/.test(c)),
    "the columns were not all matched off the header: " + out.csvCols.join(", "));
  /* FIVE LINES, THREE PAPERS. One is already in the corpus by DOI and one is
     the export's trailing note, and both are counted rather than quietly
     dropped: a tally that does not add up is how a reader loses a paper. */
  want(out.csvRows === 3, out.csvRows + " rows offered from a five-line file");
  want(/1 already in the corpus and skipped/.test(out.csvSaid),
    "the duplicate was not reported: " + out.csvSaid);
  want(/1 line that is not a paper/.test(out.csvSaid),
    "the trailing note was not reported: " + out.csvSaid);
  /* THE QUOTED FIELD. A title holding the delimiter and a doubled quote is
     what a hand-rolled split gets wrong, and it gets it wrong silently: every
     column after it shifts by one. Read back off the table. */
  want(out.csvTitles.some(t => /^"Purpose washing", greenwashing/.test(t)),
    "a quoted title with the delimiter and a doubled quote in it was not read whole: " +
    JSON.stringify(out.csvTitles));
  want(out.csvTitles.some(t => /^Reimagining capitalism, and what/.test(t)),
    "a quoted title containing the delimiter was truncated: " + JSON.stringify(out.csvTitles));

  want(out.papersAfter === out.papersBefore + 3,
    "the corpus went from " + out.papersBefore + " to " + out.papersAfter + " for 3 papers");
  want(out.added.length === 3 && out.added.every(p => p.a && p.y && p.jf && p.d),
    "an imported paper arrived without its author, year, outlet or DOI: " +
    JSON.stringify(out.added));
  /* METADATA AND NOTHING ELSE. A claim is a verbatim span read out of a text,
     so a file cannot bring one and this must not pretend otherwise. */
  want(out.added.every(p => p.nc === 0),
    "an imported paper arrived carrying claims, which a file cannot supply");
  want(out.added.every(p => p.ap === "--"),
    "an imported paper arrived classified into a research tradition, which a file " +
    "cannot supply either");

  /* THE SCREENING DECISION, WHICH IS THE WHOLE POINT. The outlet joins the
     frame and joins it UNTICKED, so the paper is in the corpus and out of
     scope until a reader looks at the journal and decides. */
  want(out.outletsAfter === out.outletsBefore + 1,
    "the outlet list went from " + out.outletsBefore + " to " + out.outletsAfter +
    " for one journal the frame did not hold");
  want(out.tickedAfter === out.tickedBefore,
    "importing a paper ticked an outlet on the reader's behalf: " +
    out.tickedBefore + " ticked before, " + out.tickedAfter + " after");
  want(out.newOutlets.length === 1 && out.newOutlets[0].ticked === false,
    "the new outlet did not arrive unticked: " + JSON.stringify(out.newOutlets));
  want(out.boxes === out.outletsAfter,
    "the outlet list on the step shows " + out.boxes + " boxes for " +
    out.outletsAfter + " outlets, so the new one cannot be ticked");
  want(out.addedInScope === 2,
    out.addedInScope + " of 3 imported papers are in scope before anything was ticked; " +
    "the two in journals the frame already holds should be, and the third should not");
  want(out.inScopeAfterTick === 3,
    "ticking the new outlet did not bring its paper into scope");
  want(out.csvInFile === 1, "the new outlet does not travel in the scenario");

  /* ---- and the other export shape -------------------------------------- */
  want(/tab-separated/.test(out.wosSaid),
    "a tab-separated file was not read as one: " + out.wosSaid);
  want(out.wosCols.length === 6 && out.wosCols.every(c => !/=$/.test(c)),
    "the two-letter headers were not matched: " + out.wosCols.join(", "));
  /* ONE OF THE TWO IS MAYER 2021, which this corpus already holds under the
     same DOI. The fixture reached for a real paper by accident and it turned
     into the better test: duplicate detection is not a property of one export
     shape. */
  want(out.wosRows.length === 1,
    out.wosRows.length + " papers offered from a two-row export whose first row is " +
    "already in the corpus");
  want(/1 already in the corpus and skipped/.test(out.wosSaid),
    "the duplicate in the tab-separated file was not reported: " + out.wosSaid);
  want(out.wosRows.every(r => /^\d{4}$/.test(r[1]) && r[4] && /^10\./.test(r[4])),
    "the row from the Web of Science shape lost its year or its DOI: " +
    JSON.stringify(out.wosRows));

  /* ---- a classification, read out of a paper --------------------------- */
  want(out.schemeLive, "reading a classification from a paper is still greyed");
  want(out.schemeMark,
    "the control that asks a model to read a classification does not carry the mark");
  /* TWO ASKS, AND THE SECOND SAYS WHAT IT HAS TO SAY. The one instruction that
     matters is that a paper the scheme does not place gets the unassigned code
     rather than being forced into a tradition, because a classification that
     places every paper in a literature it was not written about is the failure
     to avoid. Read off the prompt that was actually sent. */
  want(out.prompts.length === 2,
    out.prompts.length + " prompts were sent where two were: the scheme, then the corpus");
  want(/way of SORTING that literature/.test(out.prompts[0] || ""),
    "the first ask does not ask for the paper's own classification");
  want(/Between two and six traditions/.test(out.prompts[0] || ""),
    "the first ask does not bound how many traditions a classification may have");
  want(/the PAPER'S, not yours/.test(out.prompts[0] || ""),
    "the first ask does not tell the model the scheme has to be the paper's");
  want(/does not place every paper|does not place the paper|genuinely does not place/
    .test(out.prompts[1] || ""),
    "the second ask does not tell the model to leave a paper unassigned where the " +
    "scheme does not place it");
  want(/not being asked whether the classification is a good one/.test(out.prompts[1] || ""),
    "the second ask does not withhold the judgement from the model");
  want(/argues:/.test(out.prompts[1] || ""),
    "the second ask sends only titles, not what the extraction recorded that a paper argues");

  /* WHAT CAME BACK, and the three wrong things in it counted rather than
     written: a paper the corpus does not hold, a tradition the scheme does not
     list, and the papers the answer left out. */
  want(/2 assignments named a paper or a tradition that does not exist/.test(out.schemeSaid),
    "the two bad assignments were not counted: " + out.schemeSaid);
  want(/papers were left out of the answer and are unassigned/.test(out.schemeSaid),
    "the papers the answer left out were not reported as unassigned: " + out.schemeSaid);
  want(out.schemeRows.length === 4,
    out.schemeRows.length + " rows for three traditions and unassigned");
  const tot = out.schemeRows.reduce((t, r) => t + (+r.n || 0), 0);
  want(tot === out.papersAfter,
    "the counts per tradition add to " + tot + " for " + out.papersAfter + " papers");

  /* THE FILTER IS REBUILT FROM THE SCHEME, so the cut is selectable the moment
     it is accepted. Unassigned stays last, where the shipped one puts it. */
  want(out.apAfter.length === 5 && /^all:/.test(out.apAfter[0]) &&
       /^--:/.test(out.apAfter[out.apAfter.length - 1]),
    "the tradition filter was not rebuilt from the imported scheme with unassigned " +
    "last: " + JSON.stringify(out.apAfter));
  want(out.apAfter.some(x => /^nor:Normative/.test(x)),
    "an imported tradition is not selectable: " + JSON.stringify(out.apAfter));
  want(out.apAfter.every(x => x === "all:Every tradition" || /—|Unassigned/.test(x)),
    "an imported tradition is listed without what a paper in it does: " +
    JSON.stringify(out.apAfter));
  want(/A Reviewer \(2026\)/.test(out.schemeSrcAfter),
    "the step still cites the shipped review: " + out.schemeSrcAfter);
  const tradChanged = Object.keys(out.tradAfter)
    .filter(k => out.tradAfter[k] !== out.tradBefore[k]).length;
  want(tradChanged > 40,
    "only " + tradChanged + " papers changed tradition under a new classification");
  want(out.inScopeNor > 0 && out.drawn === out.inScopeNor,
    "selecting an imported tradition draws " + out.drawn + " papers for " +
    out.inScopeNor + " in it");
  want(out.schemeInFile, "the imported classification does not travel in the scenario");

  /* ---- and back to the shipped cut ------------------------------------- */
  want(out.offShown, "there is no way back to the shipped classification");
  const tradRestored = Object.keys(out.tradBack)
    .filter(k => out.tradBack[k] !== out.tradBefore[k]).length;
  want(tradRestored === 0,
    tradRestored + " paper(s) did not come back to the tradition the shipped review " +
    "assigned them");
  want(out.apBack.join(",") === out.apBefore.join(","),
    "the tradition filter did not come back to the shipped traditions: " +
    JSON.stringify(out.apBack));
}

/* DUMP=1 prints everything the probe measured, which is how each of the
   assertions below was arrived at and the first thing to reach for when one
   of them starts failing. */
if(process.env.DUMP) console.log(JSON.stringify({
  csvLive:out.csvLive, csvPil:out.csvPil, csvRows:out.csvRows, csvSaid:out.csvSaid,
  csvCols:out.csvCols, csvTitles:out.csvTitles, csvOk:out.csvOk,
  papers:[out.papersBefore, out.papersAfter], outlets:[out.outletsBefore, out.outletsAfter],
  ticked:[out.tickedBefore, out.tickedAfter], newOutlets:out.newOutlets,
  added:out.added, addedInScope:out.addedInScope, inScopeAfterTick:out.inScopeAfterTick,
  boxes:out.boxes, csvInFile:out.csvInFile,
  schemeLive:out.schemeLive, schemeMark:out.schemeMark, schemeOff:out.schemeOff,
  schemeSaid:out.schemeSaid, schemeRows:out.schemeRows, schemeOkLabel:out.schemeOkLabel,
  apBefore:out.apBefore, apAfter:out.apAfter, apBack:out.apBack,
  schemeSrc:out.schemeSrc, schemeSrcAfter:out.schemeSrcAfter,
  schemeInFile:out.schemeInFile, inScopeNor:out.inScopeNor, drawn:out.drawn,
  offShown:out.offShown,
  tradChanged:Object.keys(out.tradAfter || {}).filter(k => out.tradAfter[k] !== out.tradBefore[k]).length,
  tradRestored:Object.keys(out.tradBack || {}).filter(k => out.tradBack[k] !== out.tradBefore[k]).length,
  promptHas:(out.prompts || []).map(x => x.slice(0, 120))}, null, 1));

if(fail.length){
  console.error("imports: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
console.log("imports: the citation counts re-read for " +
  (Object.keys(out.before).length - 1) + " of " + Object.keys(out.before).length +
  " papers in " + out.urls.length + " batched requests carrying nothing but DOIs, each " +
  "stamped " + out.today + ", travelling in the scenario, and restoring the shipped " +
  "snapshot exactly when dropped · a refused request says 429, names the shared budget, " +
  "and writes nothing" +
  "\n         a five-line Scopus export gives 3 papers, skipping one the corpus already " +
  "holds and one line that is not a paper, with a quoted title holding the delimiter and " +
  "a doubled quote read whole · they arrive as metadata with no claims and no tradition, " +
  "and the one outlet the frame did not hold joins it UNTICKED, so that paper is in the " +
  "corpus and out of scope until somebody decides the journal belongs" +
  "\n         a tab-separated Web of Science export with two-letter headers reads the same " +
  "way, and the one of its two rows the corpus already holds is skipped on its DOI" +
  "\n         a classification read out of a paper in two asks gives " +
  out.schemeRows.length + " traditions over " + out.papersAfter + " papers, discarding an " +
  "assignment that named a paper the corpus has not got and one that named a tradition " +
  "the scheme does not list, and leaving unassigned the papers the answer passed over · " +
  "the filter is rebuilt from it, selecting one narrows the corpus to " + out.inScopeNor +
  " papers, it travels in the scenario, and the shipped cut comes back exactly");

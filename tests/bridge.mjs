/* THE LOCAL RUNTIME, DRIVEN FROM THE PAGE IT SERVES.
   ==========================================================================

   Every other browser check in this directory starts a static server and
   points Chrome at it. This one starts `amg bridge`, which IS the server, so
   the page under test is the page a scholar would have open: same origin,
   same two controls live, same jobs going to the same R and Python.

   That is the only way to check this feature. The bridge is a contract between
   two programs, and a contract tested from one side is a contract tested
   against its own assumptions. So the test asks the page to do it:

     the page DISCOVERS the bridge on its own, after the first paint, and the
       two controls that were greyed go live without anybody being told to
       reload. If the page shipped them greyed and a reader had to know to look
       somewhere, the feature would not exist for them;
     a REAL REGRESSION runs, in R and then in Python, over a dataset whose
       coefficient is known, and both have to recover its sign with an interval
       that excludes zero. Both write the same AMG-DATA line, because the
       page's own reader parses either and a second format would be a second
       reader;
     the RESULT IS STILL A RETURNED RESULT. It arrives through `wsDataIn`,
       the path a pasted line took, and the row says unverified. A result that
       came over a socket does not get promoted for having travelled further;
     the SCRIPT THAT RAN IS THE SCRIPT THAT TRAVELS. The file the bridge
       executed is the one the download button writes, with the column names
       filled in rather than left blank, which is checked by comparing them;
     and EVERY REFUSAL FIRES. A page on another origin, a dataset named as a
       path, a runtime the bridge has not got, a design route nobody offered.
       Each of those is one line of code in cli/bridge.mjs and each is the
       reason the feature is safe to have at all.

   THE DESIGN ROUTE is driven with a command of this test's own making -- a
   twelve-line script that reads the brief and writes a design -- because
   nothing in CI has a model behind it and the route is about the DIVISION and
   not about the model. What the test holds is that the brief says what was
   proved and tells the command not to report evidence, that what comes back
   is a proposal, and that refusing it writes nothing.

   Run:  node tests/bridge.mjs       (needs Rscript and/or python3; says which)
*/
import { spawn, spawnSync } from "node:child_process";
import net, { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";
/* The same checker the CLI uses, because two copies of a validator is two
   validators. The bridge's three messages are published so somebody can write
   one of these in another language, and a schema no producer is held to is a
   schema that drifts. */
import { validate } from "../cli/schema.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const BENCH = path.join(ROOT, "docs", "bench");
const DATA = path.join(HERE, "fixtures", "bridge-data");
/* The dataset was generated from this, and both runtimes have to find it. */
const TRUE_B = 1.35;

const have = c => { try{ return spawnSync(c, ["--version"], {timeout:8000}).status === 0 ||
  spawnSync(c, ["-V"], {timeout:8000}).status === 0; }catch(e){ return false; } };
const haveR = have("Rscript"), havePy = have("python3");
if(!haveR && !havePy){
  console.log("bridge: neither Rscript nor python3 is installed here, so there is nothing " +
    "for the bridge to run. Skipped.");
  process.exit(0);
}
/* R needs `boot`; Python needs nothing, which is the point of its being there. */
const haveBoot = haveR && spawnSync("Rscript",
  ["-e", 'quit(status = !requireNamespace("boot", quietly = TRUE))'],
  {timeout:30000}).status === 0;

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

/* The design route's command: a script, not a model. It reads the brief and
   writes a design, and it REFUSES if the brief does not carry what the brief
   is supposed to carry -- so the test of the brief is the command's own. */
const AGENT = path.join(HERE, "fixtures", "bridge-agent.mjs");
fs.writeFileSync(AGENT, `#!/usr/bin/env node
/* Stands in for a model, in CI, where there is none. It checks that the brief
   says what was proved and forbids reporting evidence, and writes a design. */
import { readFileSync } from "node:fs";
const brief = readFileSync(0, "utf8");
const want = ["THE PROPOSITION", "THE MODEL IT WAS PROVED FROM", "THE DECLARED RANGES",
  "Do not report evidence", "WHAT WOULD DISAGREE"];
const miss = want.filter(w => !brief.includes(w));
if(miss.length){ console.error("the brief is missing: " + miss.join(", ")); process.exit(2); }
console.log([
  "MEASUREMENT    A survey item on stated purpose, and an index of employee welfare.",
  "               Both commit the researcher to treating a declared purpose as readable",
  "               off a questionnaire, which is the weakest link in the design.",
  "IDENTIFICATION Firms do not choose their purpose at random, so the estimate means",
  "               something only where the choice is plausibly unrelated to welfare.",
  "WHERE TO LOOK  Listed firms in one jurisdiction over a decade.",
  "WHAT WOULD DISAGREE  A null inside a sample with range on the parameter would send",
  "               the scholar back to the declared bound, not to the arithmetic.",
].join("\\n"));
`, {mode:0o755});

const port = await freePort();
const srv = spawn(process.execPath, [path.join(ROOT, "cli", "amg.mjs"), "bridge",
  "--port", String(port), "--data", DATA, "--agent", `"${process.execPath}" "${AGENT}"`,
  "--timeout", "180"], {stdio:["ignore", "pipe", "pipe"]});
let banner = "";
srv.stdout.on("data", d => { banner += d; });
srv.stderr.on("data", d => { banner += d; });

const file = path.join(BENCH, "__bridge.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 2500));
  if(!/AMG bridge on http/.test(banner))
    throw new Error("the bridge did not start: " + banner.slice(0, 600));
  const page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const o = {};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  const setv = (id, v) => { const e = document.getElementById(id);
    if(!e) return id + ": missing";
    e.value = v; e.dispatchEvent(new Event("change", {bubbles:true})); return ""; };
  /* Names the control it could not find, so a missing one is a sentence and
     not a null dereference forty lines from the cause. */
  const hit = id => { const e = document.getElementById(id);
    if(!e) throw new Error("no control #" + id + " on the page; the panel holds: " +
      [...document.querySelectorAll("#pbody .wsbridge [id]")].map(x => x.id).join(", "));
    e.click(); };
  try{
    /* ---- the page found it by itself ---------------------------------- */
    /* boot asks after the first paint, so this waits for the answer rather
       than calling it: a reader does not call anything. */
    for(let i = 0; i < 80; i++){ if(B.BRIDGE && B.BRIDGE.asked) break; await nap(100); }
    for(let i = 0; i < 80; i++){ if(B.BRIDGE && B.BRIDGE.on) break; await nap(100); }
    o.hello = {on:B.BRIDGE.on, runtimes:B.BRIDGE.runtimes, sets:B.BRIDGE.sets.map(s => s.name),
      cols:(B.BRIDGE.sets[0] || {}).columns, design:B.BRIDGE.design, dir:!!B.BRIDGE.dir};

    const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(6000); }
    /* Step 3.2 is stage 6, as tests/exchange.mjs drives it. */
    B.state.stage = 6; B.renderPanel(); await nap(2500);

    /* The two controls that were greyed. Measured on the page, not inferred:
       the pilot chip has to be gone and the panel has to be reachable.
       (No backticks in here: this comment is inside a template literal.) */
    o.greyed = {connect:document.querySelectorAll('#pbody [data-wsconnect]').length,
      agent:document.querySelectorAll('#pbody [data-wsagent]').length};
    const pop = [...document.querySelectorAll("#pbody [data-wspop]")].map(b => b.dataset.wspop);
    o.pops = pop;
    const ev = document.querySelector('#pbody [data-wspop="evidence"]');
    if(!ev) throw new Error("step 3.2 offers no evidence route at all");
    ev.click(); await nap(1600);
    o.panel = !!$("#pbody .wsbridge");
    o.langs = [...document.querySelectorAll("#brLang option")].map(x => x.value);
    o.sets = [...document.querySelectorAll("#brSet option")].map(x => x.value);

    /* ---- it refuses before it runs ------------------------------------ */
    /* A line selected, no columns picked. The refusal has to name the reason
       and not simply disable: a scholar who does not know that a column
       standing in for a construct is their decision is the reader this
       sentence exists for. */
    const line = (B.BUF.lines || []).find(l => l.tree && l.y && l.x && l.res);
    if(!line) throw new Error("the worked example derived no signed line to test");
    B.BUF.sel = line.id; B.renderPanel(); await nap(900);
    o.of = line.y + " / " + line.x;
    hit("brGo"); await nap(600);
    o.noCols = B.BRIDGE.err;

    /* ---- and then it runs, in both ------------------------------------ */
    const ran = {};
    for(const lang of o.langs){
      setv("brLang", lang); await nap(500);
      setv("brSet", "firm-survey.csv"); await nap(500);
      setv("brY", "employee_welfare"); await nap(400);
      setv("brX", "stated_purpose"); await nap(400);
      const ctl = document.querySelector('#pbody [data-brctl="firm_size"]');
      if(ctl){ ctl.click(); await nap(400); }
      /* The script that would run, read before it runs, so the test can hold
         the filled-in columns against the file the download button writes. */
      hit("brSee"); await nap(500);
      const seen = ($("#pbody .brout") || {textContent:""}).textContent;
      hit("brSee"); await nap(300);
      hit("brGo");
      for(let i = 0; i < 300; i++){ if(!B.BRIDGE.busy) break; await nap(500); }
      const l2 = (B.BUF.lines || []).find(l => l.id === line.id);
      ran[lang] = {err:B.BRIDGE.err, out:B.BRIDGE.out,
        script:seen.slice(0, 2600),
        data:l2 && l2.data ? l2.data : null,
        shown:($("#pbody .wsdat") || {textContent:""}).textContent.replace(/\s+/g, " ").trim()};
    }
    o.ran = ran;

    /* ---- the design route --------------------------------------------- */
    B.state.stage = 6; B.renderPanel(); await nap(900);
    const ag = document.querySelector('#pbody [data-wspop="design"]');
    o.designBtn = !!ag;
    if(ag){
      ag.click(); await nap(1400);
      o.brief = B.designBrief ? "" : "";
      const asks = [...document.querySelectorAll("#pbody [data-brask]")];
      o.asks = asks.length;
      if(asks.length){
        asks[0].click();
        for(let i = 0; i < 200; i++){ if(!B.BRIDGE.busy) break; await nap(400); }
        o.proposal = B.BRIDGE.proposal ? {len:B.BRIDGE.proposal.text.length,
          by:B.BRIDGE.proposal.by, has:B.BRIDGE.proposal.text.slice(0, 400)} : null;
        o.designErr = B.BRIDGE.err;
        /* REFUSING WRITES NOTHING, which is the whole of why there are two
           buttons rather than one. Reported and not thrown: a proposal that
           never came back is a verdict for the assertions below, and throwing
           here would lose the reason it did not. */
        if(o.proposal){
          hit("brDrop"); await nap(700);
          o.afterDrop = {proposal:!!B.BRIDGE.proposal,
            onRows:B.BOARD.rows.filter(r => r.design).length};
          /* And then accepted, by name. */
          const again = [...document.querySelectorAll("#pbody [data-brask]")];
          again[0].click();
          for(let i = 0; i < 200; i++){ if(!B.BRIDGE.busy) break; await nap(400); }
          const take = document.getElementById("brTake");
          if(take){ take.click(); await nap(900); }
          const row = B.BOARD.rows.find(r => r.design);
          o.accepted = row ? {by:row.design.by, len:row.design.text.length, at:!!row.design.at} : null;
        /* On the row, in the finalize step, marked as proposed and not merged
           into the scholar's own note. */
          /* On the board, which is where it was accepted and where the
             finding lives. And in the scenario, because a decision that does
             not travel is a decision somebody has to take again. */
          B.renderPanel(); await nap(1400);
          o.onRow = document.querySelectorAll("#pbody .bdesign").length;
          o.inFile = ((JSON.parse(B.scenFile()).snap || {}).board || {rows:[]})
            .rows.filter(function(r){ return r.design; }).length;
          o.onRowMarked = [...document.querySelectorAll("#pbody .bdesign")]
            .every(e => /Not checked here/.test(e.textContent || ""));
        }
      }
    }
    /* ---- the download writes the same script, unfilled ---------------- */
    /* Back to the evidence panel, which is where the download route and its
       language toggle live; the design panel replaced it above. */
    B.state.stage = 6; B.renderPanel(); await nap(1000);
    const ev2 = document.querySelector('#pbody [data-wspop="evidence"]');
    if(ev2){ ev2.click(); await nap(1400); }
    o.dlLangs = [...document.querySelectorAll("#pbody [data-wslang]")].map(b => b.dataset.wslang);
  }catch(e){ o.FATAL = String(e && e.message || e); o.stack = String(e && e.stack || "").slice(0, 500); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=300000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__bridge.html`],
    {encoding:"utf8", maxBuffer:256 * 1024 * 1024});
  const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
  if(!m || !m[1].trim()) throw new Error("the probe produced nothing; chrome said: " +
    String(r.stderr || "").slice(0, 600) + "\nthe bridge said: " + banner.slice(0, 900));
  out = JSON.parse(m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
} finally {
  try{ fs.unlinkSync(file); }catch(e){}
  try{ fs.unlinkSync(AGENT); }catch(e){}
  srv.kill();
}

/* ------------------------------------------------- what the bridge refuses */
/* Asked over the socket rather than through the page, because what is being
   checked is that the page is not the only thing that could reach it. */
const port2 = await freePort();
const srv2 = spawn(process.execPath, [path.join(ROOT, "cli", "amg.mjs"), "bridge",
  "--port", String(port2), "--data", DATA], {stdio:"ignore"});
const refuse = {};
try{
  await new Promise(r => setTimeout(r, 1800));
  const post = async (url, o, headers) => {
    const r = await fetch(`http://127.0.0.1:${port2}${url}`, {method:"POST",
      headers:Object.assign({"content-type":"application/json"}, headers || {}),
      body:JSON.stringify(o)});
    const t = await r.text();
    try{ return {code:r.status, o:JSON.parse(t)}; }catch(e){ return {code:r.status, text:t.trim()}; }
  };
  const mine = {origin:`http://127.0.0.1:${port2}`};
  refuse.noOrigin = await post("/bridge/run", {lang:"r", script:"cat(1)"});
  refuse.badOrigin = await post("/bridge/run", {lang:"r", script:"cat(1)"},
    {origin:"http://somewhere.else"});
  refuse.path = await post("/bridge/run",
    {lang:"r", script:"cat(1)", dataset:"../../../etc/passwd"}, mine);
  refuse.noLang = await post("/bridge/run", {lang:"julia", script:"1"}, mine);
  refuse.noDesign = await post("/bridge/design", {brief:"anything"}, mine);
  refuse.empty = await post("/bridge/run", {lang:"r", script:"   "}, mine);
  refuse.nowhere = await post("/bridge/nowhere", {}, mine);
  const h = await fetch(`http://127.0.0.1:${port2}/bridge/hello`);
  refuse.hello = await h.json();
  /* A HOST NAMING SOMEWHERE ELSE, which is how a request from off this machine
     arrives at a loopback socket: a name that resolves here, used by a page
     that is not here. Refused on the request and not only on the bind.
     Sent over a raw socket because `fetch` will not set Host -- which is also
     why a browser cannot forge one, and why this check is about everything
     that is not a browser. */
  refuse.rebind = await new Promise((ok, no) => {
    const c = net.connect(port2, "127.0.0.1", () => {
      c.write("GET /bridge/hello HTTP/1.1\r\nHost: attacker.example\r\n" +
              "Connection: close\r\n\r\n");
    });
    let buf = "";
    c.on("data", d => { buf += d; });
    c.on("end", () => ok(+(/^HTTP\/1\.[01] (\d+)/.exec(buf) || [])[1] || 0));
    c.on("error", no);
  });
  /* It serves the page, and nothing above docs/. */
  const up = await fetch(`http://127.0.0.1:${port2}/../cli/amg.mjs`);
  refuse.outside = up.status;
  const ok = await fetch(`http://127.0.0.1:${port2}/bench/bench.html`);
  refuse.served = ok.status;
} finally { srv2.kill(); }

/* -------------------------------------------- the messages, against the schema */
const BSCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, "schema", "bridge.schema.json"), "utf8"));
const JOBS = {type:"object", $defs:BSCHEMA.$defs, $ref:"#/$defs/job"};

/* ----------------------------------------------------------------- verdicts */
const fail = [];
const want = (ok, why) => { if(!ok) fail.push(why); };
if(out.FATAL){ fail.push(out.FATAL); if(out.stack) fail.push(out.stack); }
else {
  /* ---- discovery ------------------------------------------------------- */
  want(out.hello.on, "the page did not find the bridge that was serving it");
  want(out.hello.sets.includes("firm-survey.csv"),
    "the bridge did not offer the dataset: " + JSON.stringify(out.hello.sets));
  want((out.hello.cols || []).includes("stated_purpose"),
    "the dataset's columns did not reach the page: " + JSON.stringify(out.hello.cols));
  want(out.hello.design.offered, "the design route was not offered although --agent was given");
  want(out.greyed.connect === 0,
    "the greyed `connect a dataset` control is still on the page with a bridge running");
  want(out.greyed.agent === 0,
    "the greyed `dispatch an agent` control is still on the page with a bridge running");
  want(out.pops.includes("design"), "the agent control did not become a live route");
  want(out.panel, "the bridge's panel does not draw");
  want(out.sets.includes("firm-survey.csv"), "the dataset is not offered in the panel");

  /* ---- it refuses before it runs --------------------------------------- */
  want(/measurement decision/.test(out.noCols || ""),
    "running with no columns picked did not say why: " + out.noCols);

  /* ---- a real regression, in each runtime ------------------------------ */
  for(const lang of Object.keys(out.ran || {})){
    const g = out.ran[lang];
    const skip = lang === "r" && !haveBoot;
    if(skip){
      want(/boot/.test(g.err || "") || g.data,
        "R has no `boot` package here and the refusal did not say so: " + g.err);
      continue;
    }
    want(!g.err, lang + " did not run: " + g.err);
    want(!!g.data, lang + " recorded nothing against the line");
    if(!g.data) continue;
    const b = /b=(-?[\d.eE+]+)/.exec(g.data.text || "");
    want(!!b, lang + " wrote no coefficient: " + g.data.text);
    if(b) want(Math.abs(+b[1] - TRUE_B) < 0.25,
      lang + " recovered " + b[1] + " where the dataset was generated with " + TRUE_B);
    want(/sign=\+/.test(g.data.text), lang + " did not recover the sign: " + g.data.text);
    want(g.data.agrees === "yes" || g.data.agrees === "no",
      lang + " did not record whether the data agrees: " + g.data.agrees);
    want(/Recorded/.test(g.shown) && /[Nn]ot\s+verified here/.test(g.shown),
      lang + "'s result is not shown as recorded-and-unverified: " + g.shown.slice(0, 160));
    want(g.data.ran && g.data.ran.runtime,
      lang + " recorded no provenance for what ran it");
    want(g.data.ran && g.data.ran.columns && g.data.ran.columns.driver === "stated_purpose",
      lang + " did not record which column stood in for the parameter");
    /* THE SCRIPT THAT RAN IS THE SCRIPT THAT TRAVELS. The columns are filled
       in and the dataset is named; everything else is the download's file. */
    want(/stated_purpose/.test(g.script) && /employee_welfare/.test(g.script),
      lang + "'s script did not carry the columns that were picked");
    want(/firm-survey\.csv/.test(g.script), lang + "'s script did not name the dataset");
    want(/firm_size/.test(g.script), lang + "'s script dropped the control that was picked");
    want(/set\.seed\(20261023\)|random\.seed\(20261023\)/.test(g.script),
      lang + "'s script is not seeded, so two runs of it could disagree");
  }

  /* ---- the design route ------------------------------------------------ */
  want(out.designBtn, "the design route has no control");
  want(out.asks > 0, "the design route offered no retained finding to ask about");
  want(out.proposal, "nothing came back from the design route: " + out.designErr);
  if(out.proposal){
    want(/MEASUREMENT/.test(out.proposal.has) && /IDENTIFICATION/.test(out.proposal.has),
      "what came back is not a design: " + out.proposal.has.slice(0, 160));
    want(out.afterDrop && !out.afterDrop.proposal, "refusing a proposal did not clear it");
    want(out.afterDrop && out.afterDrop.onRows === 0,
      "refusing a proposal wrote it to the board anyway");
    want(out.accepted, "accepting a design did not put it on the finding");
    want(out.accepted && out.accepted.at, "an accepted design carries no stamp");
    want(out.onRow > 0, "an accepted design does not draw on the board it was accepted from");
    want(out.inFile > 0, "an accepted design does not travel in the scenario file");
    want(out.onRowMarked,
      "an accepted design draws without saying it was not checked here");
  }
  want((out.dlLangs || []).length === 2,
    "the download route does not offer both languages: " + JSON.stringify(out.dlLangs));
}

/* ---- and the refusals ------------------------------------------------- */
const sawText = (r, rx, why) => want(rx.test(String((r && (r.text ||
  (r.o && (r.o.why || ""))) ) || "")), why + " — it said: " +
  JSON.stringify(r && (r.text || (r.o && r.o.why))).slice(0, 200));
want(refuse.noOrigin.code === 403, "a job with no origin was not refused");
sawText(refuse.noOrigin, /carried no origin/, "the no-origin refusal does not say why");
want(refuse.badOrigin.code === 403, "a job from another origin was not refused");
sawText(refuse.badOrigin, /somewhere\.else/, "the wrong-origin refusal does not name it");
want(refuse.path.o && refuse.path.o.ok === false, "a dataset named as a path was run");
sawText(refuse.path, /no dataset called/, "the path refusal does not say the name is a name");
want(refuse.noLang.o && /no runtime called/.test(refuse.noLang.o.why || ""),
  "an unknown runtime was not refused by name: " + JSON.stringify(refuse.noLang));
want(refuse.noDesign.o && /without --agent/.test(refuse.noDesign.o.why || ""),
  "the design route answered although no command was given: " + JSON.stringify(refuse.noDesign));
want(refuse.empty.o && /no script/.test(refuse.empty.o.why || ""),
  "an empty script was not refused: " + JSON.stringify(refuse.empty));
want(refuse.nowhere.code === 404, "an unknown route did not 404");
want(refuse.hello.format === "amg-bridge" && !refuse.hello.design.offered,
  "a bridge started without --agent said it offers the design route");
want(refuse.outside === 403 || refuse.outside === 404,
  "the bridge served a file outside docs/: " + refuse.outside);
want(refuse.served === 200, "the bridge did not serve the page: " + refuse.served);
want(refuse.rebind === 421,
  "a request whose Host names somewhere else was answered: " + refuse.rebind);

/* Every message the bridge actually sent, held to the published schema. A hello
   from each of the two bridges this test started, a result from each runtime,
   a design, and every refusal -- because a refusal is a message too and the
   field that carries the reason is the one a reader needs most. */
const held = [["hello", refuse.hello]];
if(out.hello && out.hello.on) held.push(["the page's hello", {format:"amg-bridge", v:1,
  runtimes:out.hello.runtimes, design:out.hello.design,
  data:{dir:"x", exists:true, sets:[{name:"firm-survey.csv", bytes:1, columns:out.hello.cols}]},
  limits:{timeout_s:120, output_bytes:1}}]);
for(const k of Object.keys(out.ran || {})) if(out.ran[k].out)
  held.push([k + "'s result", out.ran[k].out]);
for(const k of ["path", "noLang", "noDesign", "empty"])
  if(refuse[k] && refuse[k].o) held.push([k + " refused", refuse[k].o]);
for(const [what, msg] of held){
  const errs = validate(BSCHEMA, msg);
  want(errs.length === 0, what + " does not match schema/bridge.schema.json: " +
    errs.join("; ").slice(0, 300));
}
/* And the job the page sends, which is the one message the PAGE produces. */
if(out.ran) for(const k of Object.keys(out.ran)){
  if(!out.ran[k].script) continue;
  const errs = validate(JOBS, {of:out.of, lang:k, dataset:"firm-survey.csv",
    script:out.ran[k].script});
  want(errs.length === 0, "the job the page sends for " + k +
    " does not match the schema: " + errs.join("; ").slice(0, 200));
}

if(fail.length){
  console.error("bridge: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
const ranLangs = Object.keys(out.ran || {}).filter(k => (out.ran[k].data));
console.log("bridge: the page found the runtime serving it and both greyed controls went live " +
  "without a reload — " + Object.values(out.hello.runtimes).filter(Boolean).length +
  " runtime(s), " + out.hello.sets.length + " dataset, " + (out.hello.cols || []).length +
  " columns offered and none chosen for anybody" +
  "\n        " + (ranLangs.length ? ranLangs.map(k => {
    const d = out.ran[k].data;
    return k + " recovered " + (/b=(-?[\d.eE+]+)/.exec(d.text) || [])[1] + " where the " +
      "fixture was generated with " + TRUE_B + " (" + d.agrees + ")";
  }).join(", and ") : "no runtime ran") +
  ", each through the same recorder a pasted line uses, each marked unverified, and each " +
  "from the same seeded script the download button writes" +
  "\n        a design came back as a proposal, refusing it wrote nothing, accepting it put " +
  "it on the finding stamped with the command that proposed it, and the row says it was " +
  "not checked here" +
  "\n        and it refuses a job with no origin, a job from another origin, a dataset " +
  "named as a path, a runtime it has not got, an empty script, a route it does not have, " +
  "a design nobody offered, a Host naming somewhere else, and a file outside docs/");

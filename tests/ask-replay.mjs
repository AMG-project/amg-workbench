/* THE SAME DOOR, WITH SOMEBODY ON THE OTHER SIDE OF IT.
   ==========================================================================

   tests/ask-capture.mjs records the prompts. This answers them, from files in
   docs/run/answers/, through the capability the page already asks its host
   for -- `window.claude.use("sample")`, then `cap.json(prompt, opts)`. The
   page cannot tell the difference, which is the point: nothing downstream of
   that door depends on which model is behind it.

   What it measures is the three things a prompt with no model at the other
   end cannot tell you:

     the return shape   does the reply parse, and does the page recognise it
     the refusal rate   how much of a proposal falls outside the declared ids
                        and the closed vocabularies, and is counted rather
                        than written
     the parse failure  how often a well-formed answer still yields nothing
                        the page can use

   An answer file is matched to a prompt by the prompt's own text, so an
   answer written for a different model state cannot be replayed into this
   one by accident. That is the same hash discipline the blind protocol uses.

   Run:  node tests/ask-replay.mjs
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
const PROMPTS = path.join(DOCS, "run", "prompts");
const ANSWERS = path.join(DOCS, "run", "answers");

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

/* Every answer that has a prompt beside it. The prompt travels so the page's
   own call can be matched against it rather than against a call order. */
function pairs(sub){
  const A = sub ? path.join(ANSWERS, sub) : ANSWERS;
  const Q = sub ? path.join(PROMPTS, sub) : PROMPTS;
  if(!fs.existsSync(A)) return [];
  return fs.readdirSync(A).filter(f => f.endsWith(".json")).map(f => {
    const what = f.replace(/\.json$/, "");
    const qp = path.join(Q, what + ".txt");
    return {what,
      prompt: fs.existsSync(qp) ? fs.readFileSync(qp, "utf8") : null,
      answer: fs.readFileSync(path.join(A, f), "utf8")};
  }).filter(p => p.prompt);
}

export async function replay(chrome, {accept = false, model = false} = {}){
  const P = pairs(model ? "model" : "worked");
  if(!P.length) throw new Error("no answer in docs/run/answers/ has a prompt beside it");
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
    {stdio:"ignore"});
  const file = path.join(BENCH, "__replay.html");
  try{
    await new Promise(r => setTimeout(r, 700));
    let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");

    const HOST = `<script>
window.__pairs = ${JSON.stringify(P.map(p => ({what:p.what, prompt:p.prompt, answer:p.answer})))};
window.__calls = [];
window.claude = {
  use: async function(name){
    if(name !== "sample") return null;
    return {
      json: async function(q, opts){
        var s = String(q);
        var hit = null;
        for(var i = 0; i < window.__pairs.length; i++)
          if(window.__pairs[i].prompt === s){ hit = window.__pairs[i]; break; }
        if(!hit){
          window.__calls.push({matched:false, chars:s.length});
          var e = new Error("no answer recorded for this prompt");
          e.code = "no_record";
          throw e;
        }
        var parsed = null, bad = "";
        try{ parsed = JSON.parse(hit.answer); }catch(err){ bad = String(err.message); }
        window.__calls.push({matched:true, what:hit.what, chars:s.length,
          json: !bad, parseErr: bad});
        if(bad){ var e2 = new Error("the answer is not JSON"); e2.code = "bad_json";
          e2.text = hit.answer.slice(0, 200); throw e2; }
        return parsed;
      },
      limits: async function(){ return {images:false}; }
    };
  }
};
</script>\n`;
    const head = page.indexOf("<script");
    page = page.slice(0, head) + HOST + page.slice(head);

    const WANT = JSON.stringify(P.map(p => p.what));
    const ACCEPT = accept ? "true" : "false";
    const MODEL = model;
    const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const out = {took:[], errs:[]};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  const want = ${WANT};
  const ACCEPT = ${ACCEPT};
  try{
    window.confirm = () => true; window.prompt = () => null; window.alert = () => {};
    ${MODEL ? `const mb = document.getElementById("scenModel");
    if(mb){ mb.click(); await nap(6000); }` : `const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(5000); }`}
    if(B.AI) B.AI.cap = undefined;
    for(const n of [1, 2, 3, 4, 5, 6, 7, 8]){
      B.state.stage = n; B.renderPanel(); await nap(600);
      B.state.stage = n; B.renderPanel(); await nap(400);
      const here = [...document.querySelectorAll("[data-ai]")].map(b => b.dataset.ai);
      for(const what of here){
        if(!want.includes(what)) continue;
        if(out.took.some(t => t.what === what)) continue;
        /* defn compiles the scholar's own words, and is disabled until there
           are words. The words are part of the recorded run, so they are
           written the same way here as when the prompt was captured. */
        if(what === "defn"){
          const box = document.getElementById("defbox");
          if(box && !box.value.trim()){
            box.value = "What I want ranked first is whether the sign is proved at all " +
              "rather than sampled, and after that I care most about findings that need " +
              "more than one mechanism to hold and that nobody has already asserted. I " +
              "also care whether a board could act on it, which I know you cannot compute.";
            box.dispatchEvent(new Event("input", {bubbles:true}));
            box.dispatchEvent(new Event("blur", {bubbles:true}));
            await nap(700);
          }
        }
        /* Re-queried: a press re-renders, and a node from before it is gone. */
        const b = document.querySelector('[data-ai="' + what + '"]');
        if(!b || b.disabled) continue;
        b.click();
        await nap(1200);
        const A = B.AI || {};
        /* What the page did with it: how many proposals it kept, how many it
           is offering, and whatever it decided to say went wrong. */
        /* Each proposal kind has its own accept button, because each writes
           somewhere different. Counting one selector counted one of them. */
        const ACC = "#pbody [data-aiok], #pbody [data-airole]";
        out.took.push({what, step:n,
          kept: document.querySelectorAll("#pbody .chain.prop .crow").length,
          outside: +(A.outside || 0),
          err: String(A.err || ""),
          offered: document.querySelectorAll(ACC).length,
          rows: [...document.querySelectorAll("#pbody .chain.prop .crow")]
            .map(e => e.textContent.replace(/\s+/g, " ").trim().slice(0, 460))});
        /* The arithmetic is not a proposal: takeArith RUNS it, and the
           verdicts arrive on the row with the offer, so what it did is in
           ARITH rather than in a list of rows to accept. */
        if(what === "arith"){
          const A2 = B.ARITH || {};
          const tk = out.took[out.took.length - 1];
          /* ARITH.prop is {a, M, run, err}: the answer as it arrived, the model
             built from it, what the run said, and why it could not be run. */
          const pr = A2.prop || {};
          tk.arith = {err:String(pr.err || A2.err || ""),
            aiErr:String((B.AI || {}).err || ""),
            sent: pr.a ? (pr.a.lines || []).length : 0,
            parsed: pr.M ? (pr.M.steps || []).length : 0,
            bad: pr.M ? (pr.M.bad || []).map(b => b.lhs + ": " + b.why).slice(0, 6) : [],
            miss: pr.M ? (pr.M.miss || []).slice(0, 6) : [],
            consts: pr.a ? (pr.a.constants || []).length : 0,
            checksSent: pr.a ? (pr.a.checks || []).length : 0,
            run: pr.run || null,
            kept: A2.kept ? ((A2.kept.lines || []).length) : 0,
            fam: A2.fam ? Object.keys(A2.fam).length : 0,
            note: String((pr.a && pr.a.note) || "").slice(0, 200)};
          tk.verdicts = [...document.querySelectorAll("#pbody .crow")]
            .map(e => e.textContent.replace(/\s+/g, " ").trim())
            .filter(x => /held|broke|refused|could not|skip/i.test(x)).slice(0, 12);
        }
        /* ACCEPTING CHANGES THE MODEL, AND THE MODEL IS IN THE PROMPT. The
           first run of this accepted as it went, and the third call never
           matched: the composition and the roles had been declared, so the
           arithmetic prompt was no longer the one that had been answered. The
           host refused it, which is the matching discipline doing its job.
           So nothing is applied unless --accept is passed, and then only one
           prompt is replayed per run. */
        const ok = ACCEPT ? [...document.querySelectorAll(ACC)] : [];
        for(const a of ok){ a.click(); await nap(250); }
        out.took[out.took.length - 1].accepted = ok.length;
        await nap(400);
        out.took[out.took.length - 1].after =
          [...document.querySelectorAll("#pbody .crow")].length;
      }
    }
  }catch(e){ out.FATAL = String(e && e.message || e);
    out.stack = String(e && e.stack || "").slice(0, 400); }
  out.calls = window.__calls || [];
  document.getElementById("__out").textContent = JSON.stringify(out);
})();</script>`;
    fs.writeFileSync(file, page + PROBE);
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=180000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__replay.html`],
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

if(process.argv[1] && process.argv[1].endsWith("ask-replay.mjs")){
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  const accept = process.argv.includes("--accept");
  const model = process.argv.includes("--model");
  const got = await replay(chrome, {accept, model});
  if(accept) console.log("--accept: proposals are being applied, so only the first " +
    "prompt is asked in the state it was captured in\n");
  if(got.FATAL){ console.error("the probe threw:", got.FATAL); console.error(got.stack); process.exit(1); }
  console.log(`${got.calls.length} call(s) reached the host, ${
    got.calls.filter(c => c.matched).length} matched a recorded prompt`);
  for(const t of got.took){
    console.log(`\n${t.what} (step ${t.step})`);
    console.log(`  rows offered     : ${t.kept}` +
      (t.outside ? `, ${t.outside} dropped as outside the declared ids or vocabularies` : ", none dropped"));
    if(t.err) console.log(`  the page says   : ${t.err}`);
    console.log(`  offered to accept: ${t.offered}, accepted: ${t.accepted}`);
    for(const r of t.rows) console.log(`    · ${r}`);
    if(t.arith){
      const a = t.arith;
      console.log(`  lines sent       : ${a.sent}, past the grammar: ${a.parsed}, ` +
        `constants: ${a.consts}, families recognised: ${a.fam}`);
      if(a.run) console.log(`  obligations      : ${a.run.pass} held, ${a.run.fail} broke` +
        (a.run.skip ? `, ${a.run.skip} not run` : ""));
      for(const b of a.bad) console.log(`  REFUSED          : ${b}`);
      if(a.miss.length) console.log(`  never written    : ${a.miss.join(", ")}`);
      if(a.err) console.log(`  the page refused : ${a.err}`);
      if(a.aiErr) console.log(`  the ask says     : ${a.aiErr}`);
      if(a.miss.length) console.log(`  missing          : ${a.miss.join(", ")}`);
      for(const v of (t.verdicts || [])) console.log(`    \u00b7 ${v.slice(0, 160)}`);
    }
  }
  if(got.errs.length) for(const e of got.errs) console.log("ERR " + e);
}

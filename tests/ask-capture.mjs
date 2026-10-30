/* THE ELEVEN PROMPTS, AS THE PAGE WOULD SEND THEM.
   ==========================================================================

   Every ask on this bench goes through one door: `window.claude.use("sample")`
   for the capability, then `cap.json(prompt, opts)` for the answer. Nothing
   downstream depends on which model is behind it, which is the property that
   makes the infrastructure checkable rather than gated -- and the property
   that lets this harness stand in for the host.

   PASS ONE, which is this file: supply the capability, press every ask button
   on every step, and write out the prompt that would have been sent. The
   capability's `json` records and then throws, so nothing is applied and the
   page's own error path is exercised at the same time.

   PASS TWO is tests/ask-replay.mjs: the same capability, answering from a
   file. That is where the three numbers nobody has come from -- the real
   return shape, the share of a proposal discarded as outside the declared
   vocabulary, and the parse-failure rate.

   Run:  node tests/ask-capture.mjs [--eg]      (--eg: inside the worked example)
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
const OUT = path.join(HERE, "..", "docs", "run", "prompts");
/* A prompt carries the model in it, so a prompt from one scenario is not a
   prompt from the other. They are kept apart by directory and matched by
   text, which is what stops an answer crossing between them. */
const WHERE = {eg:"worked", model:"model"};

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

export async function capture(chrome, {eg = true, model = false} = {}){
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
    {stdio:"ignore"});
  const file = path.join(BENCH, "__ask.html");
  try{
    await new Promise(r => setTimeout(r, 700));
    let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");

    /* THE HOST, SUPPLIED BY THE HARNESS. This is the whole contract: one
       function that takes a string and gives back parsed JSON. It goes in
       ahead of the first module, because aiCap() is asked once and remembers
       the answer. */
    const HOST = `<script>
window.__asked = [];
window.claude = {
  use: async function(name){
    if(name !== "sample") return null;
    return {
      json: async function(q, opts){
        window.__asked.push({q:String(q), what:window.__asking || "",
                             opts:opts || null, at:window.__asked.length});
        throw new Error("capture pass: no answer supplied");
      },
      limits: async function(){ return {images:false}; }
    };
  }
};
</script>\n`;
    const head = page.indexOf("<script");
    page = page.slice(0, head) + HOST + page.slice(head);

    const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const out = {pressed:[], steps:{}, errs:[]};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  try{
    window.confirm = () => true; window.prompt = () => null; window.alert = () => {};
    ${model ? `const mb = document.getElementById("scenModel");
    if(mb){ mb.click(); await nap(6000); }` : eg ? `const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(5000); }` : ""}
    out.scenario = (document.getElementById("scenSel") || {}).selectedOptions
      ? document.getElementById("scenSel").selectedOptions[0].textContent : "";
    /* aiCap() is memoised, so it may have been asked before the host existed.
       Clearing it makes the buttons appear on the next render -- but the
       capability resolves ASYNCHRONOUSLY, and until it does every ask button
       is gated out of the markup. This walked the steps immediately after
       clearing it, so steps 1.1 to 2.1 rendered before the promise settled
       and reported no ask sites at all. Three asks looked unreachable for a
       day on the strength of that: simil and similall on step 1.2 and join on
       step 2.1 were never pressed, never captured, and were written up as
       never run. They were never ASKED. (No backticks in this comment: it is
       inside a template literal, and that closes one every time.) */
    if(B.AI) B.AI.cap = undefined;
    B.renderPanel();
    for(let i = 0; i < 100 && !(B.AI && B.AI.cap); i++) await nap(100);
    out.capAfter = !!(B.AI && B.AI.cap);
    for(const n of [1, 2, 3, 4, 5, 6, 7, 8]){
      B.state.stage = n; B.renderPanel(); await nap(700);
      B.state.stage = n; B.renderPanel(); await nap(500);
      const found = [...document.querySelectorAll("[data-ai]")].map(b => b.dataset.ai);
      out.steps[n] = found;
      /* RE-QUERIED BEFORE EACH PRESS. A press re-renders the panel, so every
         other node in a snapshot taken before it is detached from the document
         and its click goes nowhere. */
      for(const what of found){
        if(out.pressed.includes(what)) continue;
        const b = document.querySelector('[data-ai="' + what + '"]');
        if(!b){ out.errs.push(what + ": the button is gone after the last render"); continue; }
        /* defn compiles the scholar's OWN words into weights, so it is
           disabled until there are words. Supplying them is part of asking it,
           not a trick to get round a guard. */
        if(what === "defn" && b.disabled){
          const box = document.getElementById("defbox");
          if(box && !box.value.trim()){
            box.value = "What I want ranked first is whether the sign is proved at all " +
              "rather than sampled, and after that I care most about findings that need " +
              "more than one mechanism to hold and that nobody has already asserted. I " +
              "also care whether a board could act on it, which I know you cannot compute.";
            box.dispatchEvent(new Event("input", {bubbles:true}));
            /* Typing deliberately does not redraw, because the panel is
               innerHTML and a redraw would take the caret with it. The button
               enables on blur, which is also when a person would press it. */
            box.dispatchEvent(new Event("blur", {bubbles:true}));
            await nap(700);
          }
        }
        const b2 = document.querySelector('[data-ai="' + what + '"]') || b;
        window.__asking = what;
        if(b2.disabled){ out.errs.push(what + ": disabled when pressed"); continue; }
        try{ b2.click(); }catch(e){ out.errs.push(what + ": " + e.message); continue; }
        await nap(600);
        /* A press that sends nothing is the interesting case: the prompt could
           not be built from this model's state, and the page says why in
           AI.err. Recording it is how an ask that is merely inapplicable gets
           told apart from one that is broken. */
        out.pressed.push(what);
        /* AI.err is not on the bench hook, so the error is read where a
           reader reads it: off the page. */
        const el = [...document.querySelectorAll("#pbody p.why")]
          .find(e => /came back empty/.test(e.textContent || ""));
        const said = el ? el.textContent.replace(/\s+/g, " ").trim().slice(0, 180) : "";
        if(said) out.said = Object.assign(out.said || {}, {[what]:said});
      }
    }
  }catch(e){ out.FATAL = String(e && e.message || e); out.stack = String(e && e.stack || "").slice(0, 500); }
  out.asked = (window.__asked || []).map(a => ({chars:a.q.length, what:a.what, opts:a.opts}));
  document.getElementById("__out").textContent = JSON.stringify(out);
  /* The prompts themselves go in their own element: they are long, and one of
     them is the whole construct list twice over. */
  const pre = document.createElement("pre");
  pre.id = "__prompts";
  pre.textContent = JSON.stringify((window.__asked || []).map(a => ({what:a.what, q:a.q})));
  document.body.appendChild(pre);
})();</script>`;
    fs.writeFileSync(file, page + PROBE);
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=180000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__ask.html`],
      {encoding:"utf8", maxBuffer:256 * 1024 * 1024});
    const un = t => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
    if(!m) throw new Error("the probe produced nothing; chrome said: " +
      String(r.stderr || "").slice(0, 400));
    const q = /<pre id="__prompts">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
    return {meta:JSON.parse(un(m[1])), prompts:q ? JSON.parse(un(q[1])) : []};
  } finally {
    try{ fs.unlinkSync(file); }catch(e){}
    srv.kill();
  }
}

if(process.argv[1] && process.argv[1].endsWith("ask-capture.mjs")){
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  const model = process.argv.includes("--model");
  const eg = !model && !process.argv.includes("--empty");
  const {meta, prompts} = await capture(chrome, {eg, model});
  const dir = path.join(OUT, model ? WHERE.model : WHERE.eg);
  if(meta.FATAL){ console.error("the probe threw:", meta.FATAL); console.error(meta.stack); process.exit(1); }
  fs.mkdirSync(dir, {recursive:true});
  /* Named by the ask that was in flight, never by position: a press that
     sends nothing used to shift every name after it by one. */
  let n = 0;
  for(const p of prompts){
    fs.writeFileSync(path.join(dir, (p.what || "prompt-" + n) + ".txt"), p.q);
    n++;
  }
  console.log(`scenario: ${meta.scenario || "(none)"}`);
  for(const [step, found] of Object.entries(meta.steps))
    if(found.length) console.log(`  step ${step}: ${found.join(", ")}`);
  console.log(`pressed ${meta.pressed.length}: ${meta.pressed.join(", ")}`);
  console.log(`captured ${n} prompt(s) into docs/run/prompts/${
    model ? WHERE.model : WHERE.eg}/`);
  for(const p of prompts)
    console.log(`  ${(p.what || "?").padEnd(10)} ${String(p.q.length).padStart(7)} chars`);
  if(meta.errs.length) for(const e of meta.errs) console.log("  ERR " + e);
  for(const [k, v] of Object.entries(meta.said || {}))
    console.log(`  ${k.padEnd(10)} sent nothing: ${v}`);
}

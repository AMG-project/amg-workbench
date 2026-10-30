#!/usr/bin/env node
/* Load both copies `module_map.py --emit DIR` wrote -- the page as it is, and
   the page with every script turned into a module -- in headless Chrome, and
   report what each throws while it loads.

   The classic copy is the control. A difference between the two is the
   conversion; anything both report is the page's own and not this tool's
   business. Neither copy is inside the repository, so nothing here can touch
   the page anybody is working on.

   What a module page throws comes one failure at a time: a module that throws
   while it evaluates takes every module that imports it down with it, and
   that is nearly all of them while the import graph is one cycle. So the
   first error is the useful one, and `module_map.py` is what lists the rest
   in advance. Fix what the first error names in the classic source, emit
   again, and the next one surfaces.

   NO NEW DEPENDENCIES, as the page walk: Chrome through --dump-dom, and
   python3's http.server, because modules do not load from file://.

     node scripts/module_trial.mjs DIR        (or: make modules-trial) */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:net";
import { findChrome } from "../tests/pagewalk.mjs";

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "modules", "bench", "bench.html"))) {
  console.error("module_trial: give it the DIR that `module_map.py --emit DIR` wrote");
  process.exit(2);
}

/* Ahead of every script: catch what is thrown, and what fails to load. A
   module that cannot be fetched or linked fires `error` on its <script>, not
   on the window, so the capture phase is the one that sees both. */
const CATCH = `<script>
window.__errs = [];
addEventListener("error", e => {
  const t = e.target;
  if (t && t !== window && t.tagName) {
    __errs.push("did not load: " + (t.src || t.tagName).split("/bench/").pop());
    return;
  }
  const at = e.filename ? " @ " + e.filename.split("/bench/").pop() + ":" + e.lineno : "";
  __errs.push(String(e.message) + at);
}, true);
addEventListener("unhandledrejection", e =>
  __errs.push("unhandled rejection: " + String(e.reason && e.reason.message || e.reason)));
</script>`;

/* After every script, and itself a module so it runs after the others have
   had their turn: what the page managed to draw. */
const REPORT = `<script type="module">
setTimeout(() => {
  const pb = document.getElementById("pbody");
  const r = {
    errors: window.__errs,
    panel: pb ? pb.textContent.replace(/\\s+/g, " ").trim().length : -1,
    controls: document.querySelectorAll("button,select,input,textarea").length,
  };
  const pre = document.createElement("pre");
  pre.id = "__trial";
  pre.textContent = JSON.stringify(r);
  document.body.appendChild(pre);
}, 2500);
</script>`;

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

function prepare(root) {
  /* bench.html is a fragment -- the host wraps it in a document -- so there
     is no <head> to put the catcher in: first and last is what there is. */
  const html = fs.readFileSync(path.join(root, "bench", "bench.html"), "utf8");
  fs.writeFileSync(path.join(root, "bench", "__trial.html"), CATCH + "\n" + html + "\n" + REPORT);
}

async function load(chrome, root) {
  prepare(root);
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", root],
    { stdio: "ignore" });
  try {
    await new Promise(r => setTimeout(r, 700));
    const r = spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=20000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__trial.html`], { encoding: "utf8", timeout: 90000 });
    const m = /<pre id="__trial">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
    if (!m) return { errors: ["no report: the page never reached its last script"], panel: -1, controls: 0 };
    const text = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return JSON.parse(text);
  } finally {
    srv.kill();
  }
}

const chrome = findChrome();
if (!chrome) {
  console.error("module_trial: no Chrome found; set CHROME_PATH");
  process.exit(2);
}
/* One failure is reported once per module tag whose graph reaches it, so the
   same line comes back twenty times: count it rather than print it twenty. */
const show = (label, r) => {
  const n = new Map();
  for (const e of r.errors) n.set(e, (n.get(e) || 0) + 1);
  console.log(`${label}: panel ${r.panel} characters, ${r.controls} controls, ` +
    `${n.size} distinct error${n.size === 1 ? "" : "s"}`);
  for (const [e, k] of [...n].slice(0, 8)) console.log(`    ${e}${k > 1 ? `  (x${k})` : ""}`);
  if (n.size > 8) console.log(`    ... and ${n.size - 8} more`);
};
const classic = await load(chrome, path.join(dir, "classic"));
const modules = await load(chrome, path.join(dir, "modules"));
show("classic", classic);
show("modules", modules);
const same = !modules.errors.length && modules.panel === classic.panel &&
  modules.controls === classic.controls;
console.log(same
  ? "the module copy loads, and draws what the classic one draws"
  : "the module copy does not load as the classic one does yet");
process.exit(same ? 0 : 1);

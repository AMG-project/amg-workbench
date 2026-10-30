/* THE LOCAL RUNTIME, BESIDE THE PAGE.

   Two things on step 3.2 were absent rather than hidden, and both waited on
   the same division. A model may PROPOSE a design, which is a declaration to
   accept or refuse by name. It may not REPORT evidence, because nothing in a
   browser could check that claim. The page therefore wrote the R script and
   stopped: the arithmetic it can prove, it proves; the regression it cannot
   check, it hands over.

   The route for both is a LOCAL RUNTIME and not the browser. A copy of this artifact run beside R or Python
   hands the work to the engine the field already uses, instead of
   reimplementing a regression in a page that could not be held to it. This is
   that runtime, and the division survives it: what comes back from a process
   this page does not control is a RETURNED result, recorded with its
   provenance and marked unverified, exactly as a pasted one was.

   WHAT IT IS. One command that serves `docs/` and answers two more routes
   under `/bridge/`. Serving the page itself is the design and not a
   convenience: the page and the bridge are then ONE ORIGIN, so the page needs
   no cross-origin permission, the bridge needs no CORS header, and a page on
   any other origin cannot reach it at all.

     amg bridge                       serve docs/ and run jobs on 127.0.0.1:8787
     amg bridge --data ./datasets     where the data lives (default ./data)
     amg bridge --port 9000           somewhere else
     amg bridge --agent "claude -p"   offer the design route, through that command
     amg bridge --timeout 240         seconds a job may run (default 120)

   WHAT IT WILL NOT DO, and each refusal is a line of code rather than a
   sentence in a document:

     it binds 127.0.0.1, so nothing off this machine reaches it;
     a POST must carry an Origin of the bridge's own address, so a page served
       from anywhere else is refused even on this machine;
     a dataset is named by its BASENAME and must be a plain .csv or .tsv
       directly inside --data, so no request can read a path;
     a job runs in a fresh temporary directory with a COPY of the dataset, so
       a script that writes files cannot write into the data;
     a job has a timeout and its output is capped;
     the design route does not exist unless --agent named a command, and the
       command is the scholar's, given on this command line. The page never
       names a program to run.

   AND IT PRINTS EVERY JOB IT RUNS. The scholar started this process
   deliberately, in a directory they chose, and it runs their own analysis
   engine as them. The honest guard is not a permission dialog in a browser:
   it is that the terminal says what the browser just asked the machine to do.
*/
import { createReadStream, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync,
         statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(join(here, "..", "docs"));

/* ---------------------------------------------------------- what is installed */
/* Asked once, at start, by running each engine's own version flag. A bridge
   that offered a runtime it does not have would move the failure from here,
   where it is one line in a terminal, into the page, where it is a spinner. */
function version(cmd, args){
  try{
    const r = spawnSync(cmd, args, {encoding:"utf8", timeout:8000});
    if(r.status !== 0) return null;
    return String(r.stdout || r.stderr || "").split("\n")[0].trim().slice(0, 80) || cmd;
  }catch(e){ return null; }
}
const RUNTIMES = {
  r:      {cmd:"Rscript", probe:["--version"], ext:".R",  lang:"R"},
  python: {cmd:"python3",  probe:["-V"],       ext:".py", lang:"Python"},
};

/* ------------------------------------------------------------- the data shelf */
/* The header row and the size, which is what a scholar needs to choose two
   columns, and nothing else. The bridge does not read the data: a dataset's
   values are the scholar's, the page has no business holding them, and a
   column standing in for a construct is a measurement decision that no
   preview would help with. */
const DATAEXT = new Set([".csv", ".tsv"]);
function headerOf(p){
  try{
    const fd = readFileSync(p, {encoding:"utf8", flag:"r"}).slice(0, 8192);
    const line = fd.split(/\r?\n/)[0] || "";
    const sep2 = (line.match(/\t/g) || []).length > (line.match(/,/g) || []).length ? "\t" : ",";
    return line.split(sep2).map(s => s.replace(/^"|"$/g, "").trim()).filter(Boolean).slice(0, 200);
  }catch(e){ return []; }
}
function shelf(dir){
  if(!existsSync(dir)) return [];
  const out = [];
  for(const n of readdirSync(dir)){
    if(!DATAEXT.has(extname(n).toLowerCase())) continue;
    const p = join(dir, n);
    let st;
    try{ st = statSync(p); }catch(e){ continue; }
    if(!st.isFile()) continue;
    out.push({name:n, bytes:st.size, columns:headerOf(p)});
  }
  return out.sort((a, b) => a.name < b.name ? -1 : 1);
}
/* A NAME AND NOT A PATH. The one check that makes the shelf a shelf: whatever
   the page sends is matched against what the directory actually holds, so a
   request cannot describe a file, only pick one. */
const pick = (dir, name) => shelf(dir).find(d => d.name === String(name || "")) || null;

/* ------------------------------------------------------------------- a job run */
const CAP = 262144;                       // what comes back, capped
function runJob(spec, env){
  const rt = RUNTIMES[spec.lang];
  if(!rt) return {ok:false, why:`no runtime called "${spec.lang}" — this bridge offers r and python`};
  if(!env.have[spec.lang]) return {ok:false,
    why:`${rt.lang} is not installed where this bridge runs: ${rt.cmd} did not answer`};
  const script = String(spec.script || "");
  if(!script.trim()) return {ok:false, why:"the job carried no script"};
  if(script.length > 200000) return {ok:false, why:"that script is larger than this bridge will run"};

  let data = null;
  if(spec.dataset){
    data = pick(env.data, spec.dataset);
    if(!data) return {ok:false,
      why:`no dataset called "${spec.dataset}" in ${env.data} — this bridge offers ` +
          (shelf(env.data).map(d => d.name).join(", ") || "nothing")};
  }
  /* A FRESH DIRECTORY WITH A COPY. The script may write whatever it likes and
     the data it was pointed at is not the scholar's file. */
  const work = mkdtempSync(join(tmpdir(), "amg-bridge-"));
  const t0 = Date.now();
  try{
    const file = join(work, "job" + rt.ext);
    writeFileSync(file, script);
    if(data) writeFileSync(join(work, data.name), readFileSync(join(env.data, data.name)));
    say(`  run   ${rt.cmd} job${rt.ext}` + (data ? `  with ${data.name}` : "") +
        `  (${script.split("\n").length} lines, cwd ${work})`);
    const r = spawnSync(rt.cmd, [file], {cwd:work, encoding:"utf8",
      timeout:env.timeout * 1000, maxBuffer:CAP * 4});
    const ms = Date.now() - t0;
    if(r.error && r.error.code === "ETIMEDOUT") return {ok:false, ms,
      why:`${rt.lang} did not finish inside ${env.timeout}s and was stopped`};
    if(r.error) return {ok:false, ms, why:`${rt.cmd}: ${r.error.message}`};
    const out = String(r.stdout || "").slice(0, CAP);
    const err = String(r.stderr || "").slice(0, CAP);
    /* THE LINE THE PAGE READS, pulled out here rather than in the page, so
       the two scripts can only ever agree about it. Both runtimes write it in
       the same shape and the page's own reader parses either. */
    const line = (out.match(/^AMG-DATA .*$/m) || [""])[0];
    say(`  ${r.status === 0 ? "done " : "fail "} exit ${r.status}, ${ms}ms` +
        (line ? `\n        ${line}` : ""));
    return {ok:r.status === 0, ms, stdout:out, stderr:err, line,
      ...(typeof r.status === "number" ? {code:r.status} : {}),
      ran:{runtime:rt.lang, version:env.have[spec.lang], dataset:data ? data.name : "",
           bytes:data ? data.bytes : 0}};
  }catch(e){
    return {ok:false, ms:Date.now() - t0, why:String((e && e.message) || e)};
  }finally{
    try{ rmSync(work, {recursive:true, force:true}); }catch(e){}
  }
}

/* ------------------------------------------------------------ the design route */
/* A BRIEF OUT, PROSE BACK, AND NOTHING ELSE. The command is the scholar's,
   named on the command line, and it is handed a brief on standard input. What
   it writes is a PROPOSAL: the page offers it to be accepted by name or
   refused, and it never enters the arithmetic. That is the whole of the
   division the greyed control named, and the reason this route can exist at
   all now -- the proposing happens somewhere the page does not control, so
   the page is not in a position to pass it off as anything else. */
function runAgent(brief, env){
  if(!env.agent) return {ok:false,
    why:"this bridge was started without --agent, so it offers no design route"};
  const t0 = Date.now();
  const parts = env.agent.match(/"[^"]*"|'[^']*'|\S+/g).map(s => s.replace(/^["']|["']$/g, ""));
  say(`  ask   ${env.agent}  (${String(brief).length} chars of brief on stdin)`);
  const r = spawnSync(parts[0], parts.slice(1), {input:String(brief), encoding:"utf8",
    timeout:env.timeout * 1000, maxBuffer:CAP * 4});
  const ms = Date.now() - t0;
  if(r.error && r.error.code === "ETIMEDOUT") return {ok:false, ms,
    why:`the command did not finish inside ${env.timeout}s and was stopped`};
  if(r.error) return {ok:false, ms, why:`${parts[0]}: ${r.error.message}`};
  const out = String(r.stdout || "").slice(0, CAP);
  say(`  ${r.status === 0 ? "done " : "fail "} exit ${r.status}, ${ms}ms, ${out.length} chars back`);
  return {ok:r.status === 0 && !!out.trim(), ms, text:out,
    ...(typeof r.status === "number" ? {code:r.status} : {}),
    stderr:String(r.stderr || "").slice(0, 4096),
    ran:{command:parts[0], at:new Date().toISOString()},
    why:r.status === 0 ? "" : "the command exited " + r.status};
}

/* ------------------------------------------------------------- serving the page */
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml",
  ".png":"image/png", ".jpg":"image/jpeg", ".ico":"image/x-icon",
  ".woff2":"font/woff2", ".txt":"text/plain; charset=utf-8",
  ".csv":"text/csv; charset=utf-8", ".tsv":"text/tab-separated-values; charset=utf-8",
  ".map":"application/json; charset=utf-8"};
function serveFile(req, res, url){
  let p = decodeURIComponent(url.split("?")[0]);
  if(p.endsWith("/")) p += "index.html";
  /* Resolved, then checked to be inside docs/. A path is not trusted because
     it looks harmless; it is trusted because of where it landed. */
  const f = resolve(join(DOCS, p));
  if(f !== DOCS && !f.startsWith(DOCS + sep)) return end(res, 403, "outside docs/");
  if(!existsSync(f) || !statSync(f).isFile()) return end(res, 404, "no such file");
  res.writeHead(200, {"content-type":TYPES[extname(f).toLowerCase()] || "application/octet-stream",
    "content-length":statSync(f).size, "cache-control":"no-store"});
  createReadStream(f).pipe(res);
}
const end = (res, code, text) => {
  res.writeHead(code, {"content-type":"text/plain; charset=utf-8", "cache-control":"no-store"});
  res.end(text + "\n");
};
const json = (res, code, o) => {
  const b = Buffer.from(JSON.stringify(o), "utf8");
  res.writeHead(code, {"content-type":"application/json; charset=utf-8",
    "content-length":b.length, "cache-control":"no-store"});
  res.end(b);
};
const body = req => new Promise((ok, no) => {
  let n = 0; const parts = [];
  req.on("data", c => { n += c.length;
    if(n > 1048576){ no(new Error("the request is larger than this bridge will read")); req.destroy(); }
    else parts.push(c); });
  req.on("end", () => ok(Buffer.concat(parts).toString("utf8")));
  req.on("error", no);
});

const say = (...a) => console.log(...a);

/* --------------------------------------------------------------------- the main */
export function bridge(argv){
  const flag = (n, d) => { const i = argv.indexOf("--" + n);
    return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
  const port = +flag("port", 8787);
  const data = resolve(flag("data", "./data"));
  const agent = flag("agent", "");
  const timeout = Math.max(5, Math.min(1800, +flag("timeout", 120)));

  const have = {};
  for(const k of Object.keys(RUNTIMES)) have[k] = version(RUNTIMES[k].cmd, RUNTIMES[k].probe);
  const env = {data, agent, timeout, have};
  const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);

  /* A RUNTIME THIS BRIDGE HAS NOT GOT IS ABSENT AND NOT NULL. Absence is the
     statement; null is a field holding a non-answer, and schema/bridge.schema.json
     would have to allow a type for it that means nothing. The page reads either
     as falsy, so the only difference is whether the message says a true thing. */
  const hello = () => ({format:"amg-bridge", v:1,
    runtimes:Object.fromEntries(Object.keys(RUNTIMES)
      .filter(k => have[k]).map(k => [k, have[k]])),
    data:{dir:data, exists:existsSync(data), sets:shelf(data)},
    design:{offered:!!agent, command:agent ? agent.split(/\s+/)[0] : ""},
    limits:{timeout_s:timeout, output_bytes:CAP},
    at:new Date().toISOString()});

  const srv = createServer(async (req, res) => {
    const url = req.url || "/";
    /* NOTHING OFF THIS MACHINE, checked on the request and not only on the
       bind: a Host header naming something else is how a request from
       elsewhere arrives at a loopback socket. */
    const host = String(req.headers.host || "");
    if(host !== "" && !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host))
      return end(res, 421, "this bridge answers 127.0.0.1 only");

    if(!url.startsWith("/bridge/")) return serveFile(req, res, url);
    if(url === "/bridge/hello" && req.method === "GET") return json(res, 200, hello());

    if(req.method !== "POST") return end(res, 405, "POST");
    /* ONE ORIGIN. The page this bridge serves is same-origin, so its POST
       carries this exact Origin. Anything else is a page somewhere else
       driving somebody's machine, and it is refused by name. */
    const org = String(req.headers.origin || "");
    if(!origins.has(org)) return end(res, 403,
      "a job must come from the page this bridge serves — " +
      (org ? `that request came from ${org}` : "that request carried no origin"));

    let spec;
    try{ spec = JSON.parse(await body(req)); }
    catch(e){ return end(res, 400, "the job is not JSON: " + ((e && e.message) || "")); }

    if(url === "/bridge/run"){
      say(`\n[${new Date().toISOString().slice(11, 19)}] ${spec.of || "a job"}`);
      return json(res, 200, Object.assign({format:"amg-bridge-result", v:1,
        of:String(spec.of || "")}, runJob(spec, env)));
    }
    if(url === "/bridge/design"){
      say(`\n[${new Date().toISOString().slice(11, 19)}] a design asked for ${spec.of || "a finding"}`);
      return json(res, 200, Object.assign({format:"amg-bridge-design", v:1,
        of:String(spec.of || "")}, runAgent(spec.brief, env)));
    }
    return end(res, 404, "this bridge answers /bridge/hello, /bridge/run and /bridge/design");
  });

  srv.on("error", e => {
    console.error("amg bridge: " + ((e && e.message) || e) +
      (e && e.code === "EADDRINUSE" ? `\n  something already listens on ${port}; try --port` : ""));
    process.exit(1);
  });
  srv.listen(port, "127.0.0.1", () => {
    const sets = shelf(data);
    say(`\nAMG bridge on http://127.0.0.1:${port}/bench/bench.html`);
    say(`  R         ${have.r || "not installed — the R route will be refused by name"}`);
    say(`  Python    ${have.python || "not installed — the Python route will be refused by name"}`);
    say(`  data      ${data}${existsSync(data) ? "" : "  (no such directory yet)"}`);
    for(const d of sets) say(`            ${d.name}  ${d.bytes} bytes, ${d.columns.length} columns`);
    if(!sets.length) say(`            nothing yet — put a .csv or .tsv there and reload the page`);
    say(`  design    ${agent ? agent : "not offered — start with --agent \"<command>\" to offer it"}`);
    say(`  limits    ${timeout}s per job, ${CAP} bytes of output`);
    say(`\nThis runs ${[have.r && "R", have.python && "Python"].filter(Boolean).join(" and ") ||
      "nothing"} on this machine, as you, when the page in your browser asks.`);
    say(`Every job is printed here before it runs. Ctrl-C when you are done.\n`);
  });
  return srv;
}

if(process.argv[1] && /bridge\.mjs$/.test(process.argv[1])) bridge(process.argv.slice(2));

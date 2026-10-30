/* ANOTHER SCHOLAR'S MODEL, READ IN BESIDE THIS ONE.
   ==========================================================================

   Reading a scenario file in already existed and does the opposite thing: it
   REPLACES this curation with that one. Holding a second model next to yours
   is what a reader of a published action model actually wants, and it is the
   half the Menu control was greyed for.

   The two files this repository ships are the two cases worth driving, and
   they are different cases rather than the same one twice:

     THE WORKED EXAMPLE read into an empty bench. It was declared over the
       corpus that ships, so every statement it declares is a statement this
       page can find, and the whole of its model has to arrive: the
       declarations, the quantities, the arithmetic, the conclusions. Adopting
       one declaration has to write it into this page's own with the model it
       came from on it -- and adopting is the ONLY thing that writes, so the
       count of declared statements before the first click has to be zero;
     THE TWO-CHANNEL MODEL read into the worked example. Its constructs are
       bound to this corpus, but its DECLARATIONS are about
       its own quantity names -- pi, alpha, a, b -- and those are not construct
       ids in anybody's corpus. So most of what it declares is still about
       names this corpus has not got, and those have to be REFUSED by name,
       which is the case that makes the feature honest: a page that placed them
       anyway would be inventing a statement nobody made.

   AND A CONCLUSION IS NEVER ADOPTED. There is no control for it, and the test
   asserts there is none: taking a verdict without its proof is the one thing
   this bench will not do. What the conclusions are for is the disagreement,
   so the test also reads the two-channel model's findings in and checks that
   where both models retained something about one pair, the row says whether
   they agree.

   Run:  node tests/models.mjs
*/
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";
import { validate } from "../cli/schema.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "docs");
const BENCH = path.join(DOCS, "bench");
const SCEN = JSON.parse(fs.readFileSync(
  path.join(HERE, "..", "schema", "scenario.schema.json"), "utf8"));

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
  {stdio:"ignore"});
const file = path.join(BENCH, "__models.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 700));
  const page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const o = {};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  const get = async u => (await fetch(u, {cache:"no-store"})).json();
  try{
    const demo = await get("demo/purpose-x-property-rights.amg.json");
    const chan = await get("demo/purpose-two-channel.amg.json");

    /* ---- the worked example, into an empty bench ----------------------- */
    /* Nothing is declared here, which is what makes the count afterwards
       mean something: every declaration on this page came from an adoption.
       (No backticks in here: this comment is inside a template literal.) */
    o.mineBefore = {spec:0, vtype:0};
    const got = B.impRead(demo);
    o.read = got.err ? {err:got.err} : {name:got.name, kind:got.kind,
      counts:got.counts, why:got.why,
      from:got.from, arithLines:got.arith ? got.arith.lines.length : 0,
      firstDecl:got.decls[0], firstVar:got.vtypes[0], firstFind:got.findings[0]};
    if(got.err) throw new Error("the worked example would not read: " + got.err);

    /* EVERY ONE OF ITS STATEMENTS HAS TO PLACE, because it was declared over
       the corpus this page carries. A refusal here would mean the placing is
       broken rather than that two literatures differ. */
    o.placed = got.decls.map(function(d){
      const at = B.impPlace(d.statement);
      return {s:d.statement, err:at.err || "", id:at.id || "", moved:!!at.moved};
    });

    const id = B.impAdd(got);
    B.state.stage = 5; B.renderPanel(); await nap(2200);
    o.panel = !!document.querySelector("#pbody .impanel");
    o.tabs = [...document.querySelectorAll("#pbody [data-imtab]")].map(b => b.dataset.imtab);
    o.declBtns = document.querySelectorAll("#pbody [data-imdecl]").length;
    o.nope = document.querySelectorAll("#pbody .imrow.nope").length;
    /* Before any click: this page's own declarations, which must be none. */
    o.mineBefore = {spec:[...B.SPEC.keys()].length, vtype:[...B.VTYPE.keys()].length};

    /* ---- adopting one, by name ----------------------------------------- */
    const b1 = document.querySelector("#pbody [data-imdecl]");
    if(!b1) throw new Error("no declaration is offered for adoption");
    o.took = b1.dataset.imdecl;
    b1.click(); await nap(1400);
    const which = B.IMPM.list.get(id);
    o.afterDecl = {
      mine:[...B.SPEC.keys()].length,
      took:which.took.slice(),
      marked:document.querySelectorAll("#pbody .imrow.took").length,
      /* The stamp, which is the one thing about an adopted declaration that
         cannot be recomputed from the declaration. */
      stamped:(function(){
        for(const [k, v] of B.SPEC) if(v && v.from)
          return {statement:k, model:v.from.model, their:v.from.statement,
            roles:(v.roles || []).slice(), props:(v.props || []).slice()};
        return null; })()};

    /* The quantities tab, and one adopted from it. */
    const vt = document.querySelector('#pbody [data-imtab="vars"]');
    vt.click(); await nap(1200);
    const b2 = document.querySelector("#pbody [data-imvar]");
    o.varBtns = document.querySelectorAll("#pbody [data-imvar]").length;
    if(b2){ b2.click(); await nap(1200); }
    o.afterVar = {mine:[...B.VTYPE.keys()].length,
      took:B.IMPM.list.get(id).took.slice(),
      stamped:(function(){
        for(const v of B.VTYPE.values()) if(v && v.from)
          return {id:v.id, model:v.from.model, kinds:(v.kinds || []).slice(),
            lo:v.lo, hi:v.hi};
        return null; })()};

    /* ---- their arithmetic, into the editor and not applied -------------- */
    const at = document.querySelector('#pbody [data-imtab="arith"]');
    at.click(); await nap(1200);
    o.arithShown = (document.querySelector("#pbody .imarith") || {textContent:""})
      .textContent.trim().split("\n").filter(Boolean).length;
    o.arithKeptBefore = !!(B.ARITH && B.ARITH.kept);
    const ab = document.querySelector("#pbody [data-imarith]");
    o.arithBtn = !!ab;
    if(ab){ ab.click(); await nap(1600); }
    o.inEditor = {
      text:(B.ARITH.text || "").split("\n").filter(Boolean).length,
      /* NOT RUN. Putting it in the editor must not have kept it: the scholar
         presses the editor's own button, which parses it. */
      kept:!!B.ARITH.kept,
      box:!!document.getElementById("abox")};

    /* ---- the conclusions, read-only -------------------------------------- */
    const ft = document.querySelector('#pbody [data-imtab="finds"]');
    ft.click(); await nap(1200);
    o.finds = document.querySelectorAll("#pbody .imrow").length;
    /* NO CONTROL ADOPTS ONE, which is the assertion. */
    o.findBtns = document.querySelectorAll("#pbody .imlist button").length;
    o.findText = (document.querySelector("#pbody .imlist") || {textContent:""})
      .textContent.replace(/\s+/g, " ").slice(0, 400);

    /* ---- and it travels --------------------------------------------------- */
    o.inFile = (JSON.parse(B.scenFile()).snap || {}).models || null;

    /* ---- the two-channel model, into the worked example ------------------- */
    /* Declared on its own terms over no literature, so most of what it says is
       about names this corpus has not got. Those are the refusals. */
    const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(6500); }
    const g2 = B.impRead(chan);
    o.read2 = g2.err ? {err:g2.err} : {name:g2.name, counts:g2.counts, why:g2.why};
    if(!g2.err){
      o.placed2 = g2.decls.map(function(d){
        const a = B.impPlace(d.statement);
        return {s:d.statement, err:a.err || ""};
      });
      const id2 = B.impAdd(g2);
      B.state.stage = 5; B.renderPanel(); await nap(2200);
      o.nope2 = document.querySelectorAll("#pbody .imrow.nope").length;
      o.rows2 = document.querySelectorAll("#pbody .imrow").length;
      /* It retained nothing, so the conclusions tab has to say that rather
         than draw an empty box. */
      const ft2 = document.querySelector('#pbody [data-imtab="finds"]');
      if(ft2){ ft2.click(); await nap(1400); }
      o.noFinds = (document.querySelector("#pbody .imlist") || {textContent:""})
        .textContent.replace(/\s+/g, " ").trim().slice(0, 140);

      /* ---- TWO MODELS DISAGREEING ABOUT ONE PAIR ----------------------- */
      /* Neither file that ships disagrees with the other -- one of them
         retained nothing at all -- so the comparison is driven with a copy of
         the worked example carrying one verdict flipped. The thing under test
         is the comparison and not the two demonstrations. */
      const flip = JSON.parse(JSON.stringify(demo));
      const rows0 = flip.snap.board.rows.filter(function(r){ return r.keep && r.y && r.x; });
      rows0[0].verdict = rows0[0].verdict === "proved" ? "disproved" : "proved";
      o.flipped = {pair:rows0[0].y + " / " + rows0[0].x, now:rows0[0].verdict};
      const g3 = B.impRead(flip);
      B.impAdd(g3);
      B.renderPanel(); await nap(1800);
      const ft3 = document.querySelector('#pbody [data-imtab="finds"]');
      if(ft3){ ft3.click(); await nap(1400); }
      const rows = [...document.querySelectorAll("#pbody .imrow")];
      o.said = rows.map(r => r.textContent.replace(/\s+/g, " "))
        .map(t => /You disagree/.test(t) ? "disagree"
          : /Yours agrees/.test(t) ? "agree"
          : /retained nothing about this pair/.test(t) ? "nothing" : "?");
      o.clash = document.querySelectorAll("#pbody .imrow.clash").length;
      /* Removing it leaves what was adopted from it alone, which the panel
         says and this checks. */
      const dr = document.querySelector("#pbody [data-impdrop]");
      const wasSpec = [...B.SPEC.keys()].length, wasN = B.IMPM.list.size;
      if(dr){ dr.click(); await nap(1200); }
      o.afterDrop = {models:B.IMPM.list.size, was:wasN,
        spec:[...B.SPEC.keys()].length, specWas:wasSpec};
    }
    /* ---- a file carrying no model at all ---------------------------------- */
    o.empty = B.impRead({name:"nothing", snap:{stage:1}}).err || "";
    o.notJson = B.impRead("a string").err || "";
    o.notOurs = B.impRead({format:"amg-result", v:1}).err || "";
  }catch(e){ o.FATAL = String(e && e.message || e); o.stack = String(e && e.stack || "").slice(0, 500); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=240000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__models.html`],
    {encoding:"utf8", maxBuffer:256 * 1024 * 1024});
  const m = /<pre id="__out">([\s\S]*?)<\/pre>/.exec(r.stdout || "");
  if(!m || !m[1].trim()) throw new Error("the probe produced nothing; chrome said: " +
    String(r.stderr || "").slice(0, 700));
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
  /* ---- the whole model arrives ----------------------------------------- */
  const g = out.read;
  want(!g.err, "the worked example would not read: " + g.err);
  want(g.kind === "scenario", "it was not read as a scenario: " + g.kind);
  want(g.counts.decls > 0, "no declaration arrived");
  want(g.counts.vtypes > 0, "no quantity arrived");
  want(g.counts.lines > 0, "no arithmetic arrived");
  want(g.counts.findings > 0, "no retained finding arrived");
  want(g.from.corpus, "it did not say which corpus it was declared over");
  want(!g.why.length, "something was refused reading a file this bench wrote: " +
    (g.why || []).join("; "));

  /* ---- declared over this corpus, so all of it places ------------------ */
  const no = (out.placed || []).filter(x => x.err);
  want(no.length === 0, no.length + " of " + (out.placed || []).length +
    " statements from a model declared over THIS corpus could not be placed: " +
    JSON.stringify(no.slice(0, 3)));
  want(out.panel, "the panel does not draw");
  want((out.tabs || []).join(",") === "decls,vars,arith,finds",
    "the panel's tabs are not the four parts of a model: " + JSON.stringify(out.tabs));
  want(out.declBtns > 0, "no declaration is offered for adoption");
  want((out.placed || []).some(x => /^mr:/.test(x.s)) &&
    (out.placed || []).some(x => x.s.includes(">")),
    "the worked example was expected to declare over both a corpus arrow and a " +
    "relation of the imported model, and the test saw only one kind: " +
    JSON.stringify((out.placed || []).map(x => x.s)));

  /* ---- nothing is adopted by arriving ---------------------------------- */
  want(out.mineBefore.spec === 0 && out.mineBefore.vtype === 0,
    "reading a model in declared something on this page before anybody adopted " +
    "anything: " + JSON.stringify(out.mineBefore));

  /* ---- and adopting one writes it, stamped ----------------------------- */
  const a = out.afterDecl || {};
  want(a.mine === 1, "adopting one declaration left " + a.mine + " on this page");
  want((a.took || []).length === 1, "the model does not record which was adopted: " +
    JSON.stringify(a.took));
  want(a.marked === 1, "the adopted row is not marked as adopted");
  want(a.stamped, "an adopted declaration carries no record of where it came from");
  if(a.stamped){
    want(/property|purpose|imported|model/i.test(a.stamped.model),
      "the stamp does not name the model: " + a.stamped.model);
    want(!!a.stamped.their, "the stamp does not say which of their statements it was");
    want((a.stamped.roles || []).length + (a.stamped.props || []).length > 0,
      "the adopted declaration carries neither a role nor a property");
  }
  const v = out.afterVar || {};
  want(out.varBtns > 0, "no quantity is offered for adoption");
  want(v.mine === 1, "adopting one quantity left " + v.mine + " typed on this page");
  want((v.took || []).length === 2, "the second adoption is not on the record: " +
    JSON.stringify(v.took));
  want(v.stamped && v.stamped.model,
    "an adopted quantity carries no record of where it came from");

  /* ---- their arithmetic goes to the editor and is NOT run -------------- */
  want(out.arithShown > 0, "their arithmetic does not draw");
  want(out.arithBtn, "there is no way to put their arithmetic in the editor");
  want(out.inEditor.text > 0, "their arithmetic did not reach the editor");
  want(out.inEditor.box, "the editor is not open after their arithmetic went into it");
  want(out.inEditor.kept === false,
    "putting another model's arithmetic in the editor KEPT it — it has to go through " +
    "the parser a scholar presses, not round it");

  /* ---- a conclusion is never adopted ----------------------------------- */
  want(out.finds > 0, "their conclusions do not draw");
  want(out.findBtns === 0,
    "the conclusions tab offers " + out.findBtns + " button(s): a conclusion is a claim " +
    "about THEIR model and adopting one would be taking a result without its proof");

  /* ---- it travels ------------------------------------------------------- */
  want(Array.isArray(out.inFile) && out.inFile.length === 1,
    "the model read in does not travel in the scenario file");
  if(Array.isArray(out.inFile)){
    const errs = validate({$defs:SCEN.$defs || {}, type:"object",
      properties:{models:SCEN.properties.snap.properties.models}}, {models:out.inFile});
    want(errs.length === 0, "what travels does not match the scenario schema: " +
      errs.join("; ").slice(0, 300));
    want((out.inFile[0].took || []).length === 2,
      "the adoptions do not travel: " + JSON.stringify((out.inFile[0] || {}).took));
  }

  /* ---- the other model, over a corpus it was not declared on ----------- */
  const g2 = out.read2 || {};
  want(!g2.err, "the two-channel model would not read: " + g2.err);
  want(out.placed2 && out.placed2.some(x => x.err),
    "a model whose declarations name its own quantities placed every statement " +
    "against the purpose corpus, which cannot be right");
  want((out.placed2 || []).filter(x => x.err)
    .every(x => /has not got|asserted by hand|carries no relation/.test(x.err)),
    "a refusal does not say why: " + JSON.stringify((out.placed2 || [])
      .filter(x => x.err).slice(0, 2)));
  /* THE TWO-CHANNEL MODEL IS DECLARED ENTIRELY BY HAND, which is why it is the
     right second file: every one of its statements is a relation that exists
     only in the session that asserted it, and the refusal has to say that
     rather than "this corpus has not got it", which would be true of a
     construct and is not true of this. */
  want((out.placed2 || []).every(x => /asserted by hand/.test(x.err || "")),
    "a model declared entirely by hand was not refused on those grounds: " +
    JSON.stringify((out.placed2 || []).slice(0, 2)));
  want(out.nope2 > 0, "nothing is drawn as unplaceable, although some of it is");
  want(/retained no finding/.test(out.noFinds || ""),
    "a model that retained nothing does not say so on its conclusions tab: " +
    JSON.stringify(out.noFinds));
  want((out.said || []).length > 0, "their conclusions did not draw beside the example's");
  want((out.said || []).every(x => x !== "?"),
    "a conclusion row says nothing about whether the two models agree: " +
    JSON.stringify(out.said));
  want((out.said || []).filter(x => x === "disagree").length === 1,
    "flipping one of their verdicts gave " +
    (out.said || []).filter(x => x === "disagree").length +
    " disagreement(s) where one was due: " + JSON.stringify(out.said));
  want((out.said || []).filter(x => x === "agree").length ===
    (out.said || []).length - 1,
    "the findings that were not flipped do not read as agreeing: " +
    JSON.stringify(out.said));
  want(out.clash === 1, "the disagreement is not marked on the row: " + out.clash);

  /* ---- removing it leaves what was adopted ----------------------------- */
  const d = out.afterDrop || {};
  want(d.models === d.was - 1, "removing one of " + d.was + " models left " +
    d.models + " on the page");
  want(d.spec === d.specWas,
    "removing a model changed this page's own declarations from " + d.specWas +
    " to " + d.spec + " — an adoption is yours once you make it");

  /* ---- and what it refuses --------------------------------------------- */
  want(/carries no model/.test(out.empty),
    "a scenario with no model in it was read as one: " + out.empty);
  want(/not an object/.test(out.notJson), "a string was read as a model: " + out.notJson);
  want(/neither a scenario/.test(out.notOurs),
    "a results file was read as a model: " + out.notOurs);
}

if(fail.length){
  console.error("models: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
const pl = out.placed || [], p2 = (out.placed2 || []);
console.log("models: the worked example reads in beside an empty bench as " +
  out.read.counts.decls + " declarations, " + out.read.counts.vtypes + " quantities, " +
  out.read.counts.lines + " lines of arithmetic and " + out.read.counts.findings +
  " retained findings, every one of its " + pl.length + " statements placed against the " +
  "corpus it was declared over, and NOTHING declared on this page until a click" +
  "\n        adopting one declaration and one quantity writes exactly those two, each " +
  "stamped with the model it came from and the statement it was there; their arithmetic " +
  "goes to the editor unparsed, so the scholar runs it rather than the page keeping it" +
  "\n        the two-channel model, whose declarations name its own quantities and not this corpus's constructs, places " +
  p2.filter(x => !x.err).length + " of its " + p2.length + " statements against the " +
  "purpose corpus and refuses all " + p2.filter(x => x.err).length +
  " by name, because every one of them is a relation that exists only in the session " +
  "that asserted it, and its conclusions tab says it retained none" +
  "\n        a copy of the worked example with one verdict flipped reads as " +
  out.clash + " disagreement and " +
  (out.said || []).filter(x => x === "agree").length + " agreements about the same " +
  "pairs, which is two models over one question and marked as that rather than as an error" +
  "\n        a conclusion is offered no control at all, removing a model leaves every " +
  "adoption where it is, and what was read in travels in the scenario");

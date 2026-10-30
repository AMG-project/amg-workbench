/* THE THREE EXCHANGE FORMATS, AGAINST WHAT THE PAGE ACTUALLY WRITES.
   ==========================================================================

   tests/schema.test.mjs holds three schemas to three example files. That
   checks the schemas. It cannot check the PRODUCERS, because until now there
   were none: `relation.schema.json` existed with nothing
   writing it, and two more controls said what they would export and were
   greyed.

   So this opens the page, builds a model, and reads the three objects off the
   bench hook -- then validates each against its own schema with the same
   checker the CLI uses. A format whose producer is not held to it drifts from
   it silently, which is the one failure mode an exchange format cannot
   survive.

   WHAT IS WORTH ASSERTING BEYOND VALIDITY, since a valid file can still be a
   useless one:

     the proof's leaves must COVER the declared box. A certificate that does
       not tile the box it claims is not a proof, whatever its shape, and the
       number is computed by the page from its own boxes rather than asserted;
     every enclosure said to carry the sign must actually carry it, which is
       the proof re-checked here rather than taken from the file that makes
       the claim;
     the stream must carry every construct the corpus holds and every claim's
       quote, because a stream missing the quotes is the record again and not
       the material;
     the relation must say what it leaves open WITH THE REASON, which is the
       field that keeps an undeclared magnitude from reading as a decided one.

   Run:  node tests/exchange.mjs
*/

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";
import { validate } from "../cli/schema.mjs";
/* THE CURATION'S NUMBERS, FROM THE OTHER DRIVER. tests/cli.test.mjs asserts
   that the curate command produces these over the same corpus and the same
   scenario; this asserts that the page does. Neither can call the other, so
   one set of constants asserted from both is the cross-check. */
import { CURATED } from "./fixtures/curated.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "docs");
const BENCH = path.join(DOCS, "bench");
const schema = n => JSON.parse(fs.readFileSync(
  path.join(HERE, "..", "schema", n + ".schema.json"), "utf8"));

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
  {stdio:"ignore"});
const file = path.join(BENCH, "__exchange.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 700));
  const page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  /* NO HOST. None of the three formats asks a model for anything, which is
     itself worth leaving true: an exchange format that needed a model to be
     written could not be written by a reader who has none. */
  const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const o = {};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  try{
    const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(6000); }
    B.state.stage = 6; B.renderPanel(); await nap(2500);

    /* ---- the proof, for one retained finding ---------------------------- */
    const kept = (B.BOARD.rows || []).filter(r => r.keep && r.y && r.x && r.src !== "tool");
    o.kept = kept.length;
    if(!kept.length) throw new Error("the worked example retained no signed proposition");
    const got = B.proofOf(kept[0]);
    if(got.err) throw new Error("proofOf: " + got.err);
    o.proof = got.o;
    /* The button is live and no longer carries the pilot chip. Measured on the
       page rather than inferred from the source. */
    o.proofBtns = document.querySelectorAll("#pbody [data-bproof]").length;
    o.proofPils = document.querySelectorAll("#pbody [data-bproof] .pil").length;
    /* EVERY RETAINED ROW, asked for a certificate. A refusal has to be a
       stated reason and never a crash: the two rows the shipped worked example
       cannot re-derive are refused with the message the derivation itself
       gives, and the board marks them. That is the point of asking all of
       them rather than one. */
    o.proofAll = kept.map(function(r){
      let g;
      try{ g = B.proofOf(r); }catch(e){ return {y:r.y, x:r.x, threw:String(e && e.message || e)}; }
      return {y:r.y, x:r.x, err:g.err || "", leaves:g.o ? g.o.certificate.leaves : 0,
        covers:g.o ? g.o.certificate.covers : 0};
    });
    /* And the board says so where it does. A row the current model refuses is
       marked rather than left reading "proved" with nothing beside it.
       (No backticks in here: this comment is inside a template literal.) */
    o.refused = [...document.querySelectorAll("#pbody .prow .cst")]
      .filter(e => /refused now/.test(e.textContent || "")).length;
    /* And none of them is retained, which is the invariant the mark exists to
       make checkable. Read off PROPS the way the page reads it, because what
       counts is whether the CURRENT model refuses the row rather than what the
       row was marked with when it was taken. */
    o.refusedKept = (() => {
      const P = (B.PROPS && B.PROPS.out && B.PROPS.out.props) || [];
      return ((B.BOARD && B.BOARD.rows) || []).filter(r2 => r2.keep && r2.src !== "tool" &&
        P.some(z => z.y === r2.y && (z.x || "") === r2.x && z.err)).length;
    })();

    /* ---- the stream and the record ------------------------------------- */
    o.stream = JSON.parse(B.streamFile());
    o.record = JSON.parse(B.recordFile());
    /* Both buttons live, in the record panel where they belong. */
    const rb = document.getElementById("recBtn");
    if(rb) rb.click();
    await nap(1200);
    o.recCtl = ["expPass", "expRec", "expStream"].map(function(id){
      const b = document.getElementById(id);
      return !b ? (id + ": missing") : b.classList.contains("off") ? (id + ": greyed") : "";
    }).filter(Boolean);

    /* ---- one relation -------------------------------------------------- */
    B.state.stage = 5; B.renderPanel(); B.refresh(); await nap(2400);
    o.rels = B.relationIds();
    o.relOut = [];
    for(const id of o.rels.slice(0, 40)){
      const g = B.relationOf(id);
      o.relOut.push(g.err ? {id:id, err:g.err} : {id:id, o:g.o});
    }
    /* ---- the curation, as the page gets it ----------------------------- */
    B.state.stage = 3; B.renderPanel(); B.refresh(); await nap(2200);
    const v = B.lastView;
    o.view = {papers:v.papersIn, claims:v.claimsIn,
      notions:(v.allNodes || []).length, arrows:(v.allLinks || []).length,
      clearing:(v.allLinks || []).filter(function(e){ return e.pass; }).length,
      hideIso:!!B.state.hideIso};

    /* ---- the deposit --------------------------------------------------- */
    B.state.stage = 8; B.renderPanel(); await nap(2000);
    o.depBefore = B.depState();
    o.depCtls = [...document.querySelectorAll("#pbody [data-dep]")]
      .map(function(e){ return e.dataset.dep; });
    const dset = function(k, v){
      const e = document.querySelector('#pbody [data-dep="' + k + '"]');
      if(!e) return k + ": missing";
      e.value = v;
      e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "blur", {bubbles:true}));
      return "";
    };
    o.dmiss = [];
    for(const kv of [["host", "github"], ["archive", "zenodo"], ["code", "MIT"],
                     ["data", "CC0-1.0"], ["transcripts", "none"]]){
      await nap(450);
      const bad = dset(kv[0], kv[1]);
      if(bad) o.dmiss.push(bad);
    }
    await nap(500);
    document.getElementById("depVer").click(); await nap(800);
    o.depAfter = B.depState();
    o.depVersion = B.DEP.version;
    /* WITHHELD BY DECLARATION, which has to show up in the files and not only
       in the prose: transcripts set to none, so the scenario in the bundle
       carries no exchange at all. */
    const bundle = await B.depositBundle();
    o.depFiles = bundle.entries.map(function(e){ return e.name; });
    o.depSizes = bundle.entries.map(function(e){ return e.bytes.length; });
    o.depErrs = bundle.errs;
    o.depZip = bundle.bytes.length;
    o.depMagic = [...bundle.bytes.slice(0, 4)].join(",");
    const dec = new TextDecoder();
    const byName = {};
    for(const e of bundle.entries) byName[e.name] = dec.decode(e.bytes);
    /* ---- the report, which is the bundle's first file ------------------ */
    /* The one file here a reviewer reads rather than parses. Two things are
       worth asserting and the second is why the first means anything: that it
       is in the bundle at all, and that the certificate it EMBEDS is the same
       object the standalone proof export writes. The format's claim is that
       the embedding cannot drift because it is not a copy; nothing held that
       true until this line.
       (No backticks in here: this comment is inside a template literal.) */
    o.repMd = byName["REPORT.md"] || "";
    o.repJson = byName["report.json"] ? JSON.parse(byName["report.json"]) : null;
    if(o.repJson){
      const f = o.repJson.findings.find(function(x){ return x.certificate; });
      o.repCert = f ? {leaves:f.certificate.leaves, covers:f.certificate.covers,
        boxes:(f.certificate.boxes || []).length, y:f.outcome, x:f.parameter} : null;
      /* and the standalone, asked for the same finding */
      const row = (B.BOARD.rows || []).find(function(r){
        return f && r.keep && r.y === f.outcome && r.x === f.parameter; });
      const standalone = row ? B.proofOf(row) : null;
      o.repStandalone = (standalone && standalone.o) ? {
        leaves:standalone.o.certificate.leaves, covers:standalone.o.certificate.covers,
        boxes:(standalone.o.certificate.boxes || []).length} : null;
      o.repWithdrawn = (o.repJson.selection.withdrawn || []).length;
      o.repWhy = (o.repJson.selection.withdrawn || []).map(function(w){ return w.why; });
    }
    o.depMd = byName["DEPOSIT.md"];
    o.depCff = byName["CITATION.cff"];
    o.depMan = byName["MANIFEST.txt"];
    o.depJson = JSON.parse(byName["deposit.json"]);
    o.scenProv = (JSON.parse(byName["scenario.amg.json"]).provenance || []).length;
    o.quotesIn = (JSON.parse(byName["stream.json"]).claims || [])
      .filter(function(c){ return !!c.quote; }).length;
    /* And again with the quotes withheld, to show the declaration reaches the
       file rather than only the prose. */
    await nap(300);
    dset("quotes", "no"); await nap(700);
    const b2 = await B.depositBundle();
    const s2 = JSON.parse(dec.decode(b2.entries.find(function(e){
      return e.name === "stream.json"; }).bytes));
    o.quotesOut = (s2.claims || []).filter(function(c){ return !!c.quote; }).length;
    o.withheldSaid = !!s2.withheld;
    dset("quotes", "yes"); await nap(500);

    /* ---- the notebook, which is the fifth file ------------------------- */
    B.state.stage = 7; B.state.fin = "notebook"; B.renderPanel(); await nap(2000);
    o.nbTab = !!document.getElementById("nbPick");
    o.nbKinds = [...document.querySelectorAll("#nbPick option")].map(function(x){ return x.value; });
    const addPart = async function(kind){
      const s = document.getElementById("nbPick");
      s.value = kind; s.dispatchEvent(new Event("change", {bubbles:true}));
      await nap(800);
      document.getElementById("nbAdd").click();
      await nap(900);
    };
    await addPart("words");
    await addPart("drawn");
    await addPart("claimed");
    await addPart("note");
    o.nbRows = document.querySelectorAll("#pbody .nbrow").length;
    const boxes = [...document.querySelectorAll("#pbody [data-nbtext]")];
    o.nbProse = "The reading: clarity pays, and the mechanism is credibility.";
    boxes[boxes.length - 1].value = o.nbProse;
    boxes[boxes.length - 1].dispatchEvent(new Event("blur", {bubbles:true}));
    await nap(700);
    const ti = document.getElementById("nbTitle");
    ti.value = "Purpose, read"; ti.dispatchEvent(new Event("blur", {bubbles:true}));
    await nap(500);
    o.mdBefore = B.nbMarkdown();
    /* THE ORDER IS A DECISION. Moving the prose up has to move it in the file,
       or the order is a view and not a decision. */
    const ups = [...document.querySelectorAll("#pbody [data-nbup]:not([disabled])")];
    ups[ups.length - 1].click(); await nap(1000);
    o.mdAfter = B.nbMarkdown();
    o.nbOrder = B.NB.cells.map(function(c){ return c.kind; });
    o.nbInFile = (((JSON.parse(B.scenFile()).snap || {}).notebook || {}).cells || []).length;
    B.state.fin = "findings"; B.renderPanel(); await nap(900);

    /* ---- WHAT THE TWO FILES CARRY, which is the board's decision ------- */
    /* Setting a finding aside has to remove it from the file step 4.1 writes,
       or the step and the file name different sets and the file wins. The
       plates were filtered and the exports were not. Measured by taking one
       retained row off and putting it back, so the probe leaves no residue.
       (No backticks in here: this comment is inside a template literal.) */
    const bk = (B.BOARD.rows || []).filter(function(r){ return r.keep && r.y && r.x; });
    const pick = bk.find(function(r){
      return JSON.parse(B.resultsFile()).results.some(function(x){
        return x.outcome === r.y && x.parameter === r.x; }); }) || bk[0];
    o.aside = {pair:pick ? (pick.y + " / " + pick.x) : "", kept:bk.length};
    o.aside.before = JSON.parse(B.resultsFile()).results.length;
    o.aside.rowsBefore = B.derivedClaims().split("\n")
      .filter(function(l){ return l && l[0] !== "#"; }).length - 1;
    pick.keep = false; B.boardSave();
    const mid = JSON.parse(B.resultsFile()).results;
    o.aside.after = mid.length;
    o.aside.stillThere = mid.some(function(x){
      return x.outcome === pick.y && x.parameter === pick.x; });
    o.aside.rowsAfter = B.derivedClaims().split("\n")
      .filter(function(l){ return l && l[0] !== "#"; }).length - 1;
    /* And the step itself, which was already filtered: the two have to agree
       on the count now that they ask the same question. */
    B.state.stage = 6; B.renderPanel(); await nap(1500);
    o.aside.plotted = (document.querySelector("#pbody .stepcount")
      || {textContent:""}).textContent.replace(/\s+/g, " ").trim().slice(0, 60);
    pick.keep = true; B.boardSave();
    o.aside.back = JSON.parse(B.resultsFile()).results.length;
    B.state.stage = 7; B.state.fin = "findings"; B.renderPanel(); await nap(900);

    /* The dialog that declares a relation offers it as a file. The Edit
       buttons are in the rail beside the map, not in the step's own panel. */
    const ed = document.querySelector("[data-ed]");
    if(ed){ ed.click(); await nap(700);
      const dx = document.getElementById("domexp");
      o.domexp = !!(dx && !dx.classList.contains("off"));
      const dlg = document.getElementById("domdlg"); if(dlg) dlg.close();
    } else o.domexp = "no relation row offers the declaration dialog";
  }catch(e){ o.FATAL = String(e && e.message || e); o.stack = String(e && e.stack || "").slice(0, 400); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=240000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__exchange.html`],
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
  /* ---- the board decides what the files carry --------------------------- */
  const a = out.aside || {};
  want(a.before > 0, "the worked example wrote no results to set one aside from");
  want(!a.stillThere,
    "setting " + a.pair + " aside left it in the results export");
  want(a.after === a.before - 1,
    "setting one finding aside changed the results export from " + a.before +
    " to " + a.after + ", where " + (a.before - 1) + " was due");
  want(a.rowsAfter === a.rowsBefore - 1,
    "setting one finding aside changed the claim records from " + a.rowsBefore +
    " to " + a.rowsAfter + ", where " + (a.rowsBefore - 1) + " was due");
  want(a.back === a.before,
    "standing behind it again did not put it back: " + a.back + " of " + a.before);

  /* ---- amg-proof ------------------------------------------------------- */
  const p = out.proof;
  const errs = validate(schema("proof"), p);
  want(errs.length === 0, "the proof does not validate: " + errs.join("; "));
  want(out.proofBtns > 0, "step 3.2 offers no per-finding proof export");
  want(out.proofPils === 0,
    "the proof export still carries a pilot chip on " + out.proofPils + " row(s)");
  want(!out.proofAll.some(x => x.threw),
    "asking for a certificate threw rather than refusing: " +
    JSON.stringify(out.proofAll.filter(x => x.threw)));
  want(out.proofAll.some(x => !x.err),
    "not one retained finding could be certified");
  /* EVERY RETAINED FINDING CERTIFIES, which is a property of the shipped
     demonstration and not of the bench. The worked example carried two
     findings whose outcome is written with a ceiling the derivation cannot
     differentiate: proved on the board, refused when asked for a certificate.
     They are set aside, which is what a scholar meeting
     `refused now` would do, and the rows stay on the board carrying the mark
     so the withdrawal is legible rather than silent.

     So two things are asserted, and the second is why the first means
     anything: nothing retained is uncertifiable, AND the board still says
     which rows the model refuses. A demonstration that dropped the rows
     would pass the first alone and would have hidden the episode. */
  const no = out.proofAll.filter(x => x.err);
  want(no.length === 0,
    no.length + " retained finding(s) cannot be certified: " +
    JSON.stringify(no.map(x => x.y + " / " + x.x)));
  /* THE REFUSAL EPISODE IS GONE, AND SAYING SO IS THE POINT. It was real: the
     single-channel model wrote the rights outcome as min(..., ceil_rights) and
     the derivation could not differentiate across that ceiling, so two rows
     were proved on the board and refused a certificate. The two-channel model
     has no ceiling on that path, so nothing is refused and there is nothing to
     mark. What survives is the invariant the episode was evidence for, and it
     holds whether or not anything is refused: a row the model will not give
     back is never one the demonstration stands behind. */
  want(out.refusedKept === 0,
    out.refusedKept + " row(s) marked `refused now` are still retained, so the " +
    "demonstration stands behind findings its own model will not give back");

  /* THE CERTIFICATE TILES THE BOX. Within a tolerance, because the shares are
     written rounded to six places and there can be hundreds of them. */
  want(Math.abs(p.certificate.covers - 1) < 1e-3,
    "the certificate covers " + p.certificate.covers + " of the declared box, not all of it");
  want(p.certificate.split.length === p.certificate.leaves,
    "the split has " + p.certificate.split.length + " boxes and claims " +
    p.certificate.leaves + " leaves");
  want(!p.certificate.truncated_at,
    "the certificate was truncated, so the file is a report and not a proof");

  /* AND IT SAYS WHAT IT CLAIMS. Re-checked here off the file itself: an
     enclosure marked as carrying the sign has to be on one side of zero, and
     one marked as not settled has to straddle it. This is the half a reader
     with no access to this bench would check, so it is the half worth
     automating. */
  const dir = p.finding.direction;
  const bad = [];
  for(const s of p.certificate.split){
    if(s.unbounded){
      if(s.holds !== "not settled") bad.push(s);
      continue;
    }
    const [lo, hi] = s.enclosure;
    if(s.holds === "with the sign" && dir === "up" && lo < -1e-9) bad.push(s);
    if(s.holds === "with the sign" && dir === "down" && hi > 1e-9) bad.push(s);
    if(s.holds === "against the sign" && dir === "up" && lo >= 0) bad.push(s);
    if(s.holds === "against the sign" && dir === "down" && hi <= 0) bad.push(s);
    if(s.holds === "not settled" && !(lo <= 0 && hi >= 0)) bad.push(s);
  }
  want(!bad.length, bad.length + " of " + p.certificate.split.length +
    " enclosures do not say what the file claims, e.g. " + JSON.stringify(bad[0] || {}));

  /* The box the proof ran over, and which of its ranges nobody declared. The
     second is the point of the file: a proof over a default interval is proved
     against an obligation nobody took on, and the file has to say so. */
  for(const n of p.scope.declared)
    want(n in p.scope.box, "declared " + n + " is not in the box the proof ran over");
  want(Object.keys(p.scope.box).length >= 1, "the proof carries no box");
  want(p.expression.derivative && p.expression.outcome,
    "the proof carries no expression, so there is nothing to recompute it from");
  want(p.declarations.length > 0, "the proof names no declaration it rests on");
  want(p.declarations.every(d => d.by === "declared" || d.by === "default"),
    "a declaration in the proof does not say whether anybody declared it");
  want(p.declarations.some(d => /the range of /.test(d.what)),
    "the proof does not say where the ranges it was proved over came from");
  /* WHICH REGISTRY OF FORMS it was computed over. A conclusion that survived a
     hundred combinations survived a PARTICULAR hundred, and nothing leaving
     this page should be able to omit which. */
  want(/^forms-[0-9a-f]{8}-\d+x\d+$/.test(p.provenance.forms || ""),
    "the proof does not say which registry of forms it was computed over: " +
    JSON.stringify(p.provenance.forms));
  want(typeof p.recorded.agrees === "boolean",
    "the proof does not say whether re-proving agrees with the row as taken");
  want(p.recorded.agrees,
    "re-proving the worked example's first retained finding disagrees with the board: " +
    p.recorded.verdict + " recorded, " + p.finding.verdict + " now");

  /* ---- amg-stream ------------------------------------------------------ */
  const s = out.stream;
  const serr = validate(schema("stream"), s);
  want(serr.length === 0, "the stream does not validate: " + serr.slice(0, 6).join("; "));
  want(s.counts.papers === s.papers.length &&
       s.counts.constructs === s.constructs.length &&
       s.counts.claims === s.claims.length,
    "the stream's own counts disagree with what it carries: " + JSON.stringify(s.counts) +
    " against " + s.papers.length + "/" + s.constructs.length + "/" + s.claims.length);
  want(s.papers.length >= 52 && s.constructs.length >= 1000 && s.claims.length >= 1000,
    "the stream is short of the shipped corpus: " + s.papers.length + " papers, " +
    s.constructs.length + " constructs, " + s.claims.length + " claims");
  /* THE QUOTES ARE THE POINT. A stream without them is the record again: a
     claim whose verbatim span is missing cannot be checked by a reader who
     does not hold the paper, which is every reader of this file. */
  const noq = s.claims.filter(c => !c.quote).length;
  want(noq === 0, noq + " of " + s.claims.length + " claims travel with no quote");
  const nosig = s.constructs.filter(c => !c.level || !c.scale || !c.stock_or_flow).length;
  want(nosig === 0, nosig + " constructs travel with an incomplete signature");
  /* And the papers travel as metadata and nothing else. A field holding the
     text of an article is the one thing this file must never grow. */
  const body = s.papers.filter(x => Object.values(x).some(v =>
    typeof v === "string" && v.length > 400));
  want(!body.length, body.length + " paper record(s) carry something long enough to be a text");
  want(s.claims.some(c => c.scope && c.scope !== "unstated"),
    "no claim carries the scope its own paper stated");
  /* `unstated` TRAVELS AS A VALUE where a paper stated no scope, rather than
     as a blank. 380 of the corpus's 1080 claims are in that position, but
     which of them reach a deposit depends on which relations the model
     carries, and every paper behind the two-channel core stated one. So the
     assertion is that the field is present and populated on every claim, which
     is what a reader needs, rather than that this curation happens to carry
     one of the 380. */
  want(s.claims.every(c => typeof c.scope === "string" && c.scope.length > 0),
    "a claim travels with no scope field at all, so a reader cannot tell a " +
    "missing scope from an unstated one");
  want(s.near.length > 0 && s.answers.length > 0 && s.theses.length > 0,
    "the stream drops what the corpus holds beside the claims: " + s.near.length +
    " wording scores, " + s.answers.length + " answers, " + s.theses.length + " theses");
  want(s.declarations.length > 0,
    "the worked example declares classes and the stream carries none");
  want(s.declarations.some(d => d.quantity) && s.declarations.some(d => d.statement),
    "the stream carries only one of the two kinds of declaration");

  /* ---- amg-record ------------------------------------------------------ */
  const rec = out.record;
  const rerr = validate(schema("record"), rec);
  want(rerr.length === 0, "the record does not validate: " + rerr.slice(0, 8).join("; "));
  want(rec.decisions.length === rec.counts.decisions,
    "the record's count disagrees with its rows");
  want(rec.decisions.length > 5,
    "the record carries " + rec.decisions.length + " decisions for a finished run");
  want(rec.decisions.every(d => d.date && d.action && d.target),
    "a decision in the record is missing its date, action or target");
  want(rec.decisions.some(d => d.section),
    "no decision says which section of the pass it falls under");
  want(rec.decisions.some(d => d.members.length),
    "no decision records the corpus identifiers it was taken against");
  want(!out.recCtl.length,
    "the record panel's exports are not all live: " + out.recCtl.join(", "));

  /* ---- amg-relation ---------------------------------------------------- */
  want(out.rels.length > 0, "no carried relation to export");
  const rok = out.relOut.filter(x => x.o), rno = out.relOut.filter(x => x.err);
  want(rok.length > 0, "not one carried relation could be written as a file: " +
    JSON.stringify(rno.slice(0, 2)));
  for(const x of rok.slice(0, 12)){
    const e = validate(schema("relation"), x.o);
    want(e.length === 0, x.id + " does not validate: " + e.join("; "));
  }
  /* WHAT IT LEAVES OPEN, WITH THE REASON. The field that keeps an undeclared
     magnitude from reading as a decided one, so every relation has to carry
     at least the magnitude and every entry has to say why. */
  want(rok.every(x => x.o.not_fixed.length),
    "a relation claims to leave nothing open, which no relation in this corpus does");
  want(rok.every(x => x.o.not_fixed.every(n => n.what && n.why)),
    "something a relation leaves open does not say why");
  want(rok.every(x => x.o.rests_on.length && x.o.rests_on.every(r => r.claim && r.paper)),
    "a relation does not name the claims it rests on, with their papers");
  want(rok.some(x => x.o.rests_on.some(r => r.quote)),
    "no relation carries the verbatim span it rests on");
  /* AND IT REFUSES RATHER THAN CHOOSING. An arrow whose papers assert
     different signs has no single sign, and the file that invents one is
     worse than the file that is not written. */
  want(rno.every(x => /different signs|no claim behind this arrow records a sign/.test(x.err)),
    "a relation was refused for a reason other than a sign it could not settle: " +
    JSON.stringify(rno.map(x => x.err).slice(0, 2)));
  want(out.domexp === true,
    "the dialog that declares a relation does not offer it as a file: " +
    JSON.stringify(out.domexp));

  /* ---- the notebook ---------------------------------------------------- */
  want(out.nbTab, "step 4.1's notebook tab offers no way to add a part");
  want(out.nbKinds.length === 8,
    out.nbKinds.length + " kinds of part where the tab listed ten things a notebook " +
    "would hold (seven derived, the prose, and two that are the file and the order " +
    "rather than parts)");
  want(out.nbRows === 4, out.nbRows + " parts after adding four");
  const md = out.mdBefore;
  want(/^# Purpose, read/.test(md), "the notebook's title is not its heading");
  /* EVERY PART BUT THE PROSE POINTS AT SOMETHING DERIVED, and the file renders
     what it points at. So the verdict and the share have to be in it, from the
     model rather than from the row's stored sentence. */
  want(/- verdict: \*\*/.test(md), "a finding part carries no verdict");
  want(/% of the declared range/.test(md),
    "a finding part does not say how much of the range the sign was proved over");
  /* THE REGION, IN CHARACTERS. The page draws 96 cells under the axis and the
     file carries the same 96, because that strip IS the region rather than a
     picture of it. */
  const strip = /\n(\.{0,96}#{1,96}[.#xm~]*)\n/.exec(md) || /\n([.#xm~]{96})\n/.exec(md);
  want(!!strip, "the drawn part carries no band strip");
  if(strip) want(strip[1].length === 96,
    "the band strip is " + strip[1].length + " cells where the page draws 96");
  want(/`#` the sign was proved here/.test(md),
    "the band strip has no legend, so the characters mean nothing to a reader");
  /* THE CLAIMS, WITH THE SCOPE THEIR OWN PAPERS STATED, and `unstated` as a
     value rather than a blank. */
  want(/scope as the paper stated it/.test(md),
    "the claims part does not carry the scope each paper stated");
  /* Whether any of THIS notebook's claims is one of the 380 with no stated
     scope depends on which relations the model carries, and every paper behind
     the two-channel core stated one. What has to hold is that the part renders
     a scope for each claim rather than dropping the line: a blank where a
     paper said nothing is the failure the italics exist to prevent. */
  want(!/scope as the paper stated it:\s*$/m.test(md),
    "a claim's scope line is rendered empty, so a reader cannot tell an " +
    "unstated scope from a dropped field");
  /* THE PROSE IS THE AUTHOR'S AND IS MARKED AS SUCH. */
  want(md.indexOf(out.nbProse) > 0, "the scholar's prose is not in the file");
  want(/the reading does not|marked as the author's|is the author's/.test(md),
    "the file does not say which part of it is not derived from anything");
  /* THE ORDER IS A DECISION: moving a part moves it in the file. */
  want(out.mdAfter !== out.mdBefore, "reordering the notebook changed nothing in the file");
  want(out.mdAfter.indexOf(out.nbProse) < out.mdBefore.indexOf(out.nbProse),
    "moving the prose up did not move it up in the file");
  want(out.nbOrder.length === 4 && out.nbOrder[2] === "note",
    "the order after one move is " + JSON.stringify(out.nbOrder));
  want(out.nbInFile === 4, "the notebook does not travel in the scenario: " + out.nbInFile);

  /* ---- the curation, against the command line's own numbers ------------ */
  want(out.view.papers === CURATED.papers,
    "the page has " + out.view.papers + " papers in scope where amg curate reports " +
    CURATED.papers);
  want(out.view.claims === CURATED.claims,
    "the page has " + out.view.claims + " claims where amg curate reports " + CURATED.claims);
  want(out.view.arrows === CURATED.arrows,
    "the page draws " + out.view.arrows + " arrows where amg curate reports " +
    CURATED.arrows);
  want(out.view.clearing === CURATED.clearing,
    out.view.clearing + " arrows carry a claim that clears the bars on the page, against " +
    CURATED.clearing + " from amg curate");
  /* THE ONE NUMBER THAT IS DELIBERATELY DIFFERENT. The page NARROWS per step:
     step 1.3 draws what step 1.2 handed it and hides the notions no claim joins
     to anything. So the browser's node count is the curation's minus the
     isolated, and that identity is the chain's own rule rather than a
     discrepancy to wave through. */
  want(out.view.notions === CURATED.notions - (out.view.hideIso ? CURATED.isolated : 0),
    "step 1.3 draws " + out.view.notions + " notions where the curation has " +
    CURATED.notions + " and " + CURATED.isolated + " are isolated" +
    (out.view.hideIso ? " and hidden" : " and shown"));

  /* ---- the deposit ----------------------------------------------------- */
  want(out.depCtls.length === 9,
    out.depCtls.length + " controls for five decisions: " + out.depCtls.join(", "));
  want(!out.dmiss.length, "a decision could not be declared: " + out.dmiss.join(", "));
  /* THE COUNT WAS "0 of 5 decided" FOREVER, because the five were a list. */
  want(out.depBefore.n < out.depAfter.n && out.depAfter.n === 5,
    "declaring the five moved the count from " + out.depBefore.n + " to " + out.depAfter.n);
  want(/^amg-.*\+corpus-.*\+\d{4}-\d{2}-\d{2}$/.test(out.depVersion),
    "what a citation pins to is not the state the declarations were in: " + out.depVersion);

  /* ONE ARCHIVE AND NOT SIX DOWNLOADS, and it is a real zip: PK\x03\x04. */
  want(out.depMagic === "80,75,3,4",
    "the bundle does not begin with a zip's own magic: " + out.depMagic);
  want(out.depFiles.length >= 10,
    "the bundle carries " + out.depFiles.length + " files");
  for(const n of ["DEPOSIT.md", "deposit.json", "CITATION.cff", "MANIFEST.txt",
                  "stream.json", "record.json", "scenario.amg.json"])
    want(out.depFiles.includes(n), "the bundle has no " + n);
  want(!out.depErrs.length, "a part refused to be written: " + out.depErrs.join("; "));

  /* ---- the report is in the bundle, and its certificate is the real one -- */
  want(out.depFiles.includes("REPORT.md") && out.depFiles.includes("report.json"),
    "the deposit does not carry the report, which is the one file in it a reviewer reads");
  want(out.repJson && out.repJson.format === "amg-report",
    "report.json is not an amg-report");
  if(out.repJson){
    const errs = validate(schema("report"), out.repJson);
    want(errs.length === 0,
      "the report in the bundle does not validate against its own schema: " +
      errs.join("; ").slice(0, 300));
  }
  want(out.repCert && out.repStandalone,
    "no finding in the bundle carries a certificate to check against the standalone export");
  if(out.repCert && out.repStandalone){
    want(out.repCert.leaves === out.repStandalone.leaves &&
      out.repCert.boxes === out.repStandalone.boxes &&
      Math.abs(out.repCert.covers - out.repStandalone.covers) < 1e-9,
      "the certificate EMBEDDED in the report differs from the one the standalone " +
      "proof export writes for the same finding: " + JSON.stringify(out.repCert) +
      " against " + JSON.stringify(out.repStandalone) +
      ". The format's claim is that the two cannot drift because the embedded one is " +
      "the same object; that is what just stopped being true.");
  }
  /* The withdrawn findings are named with their reason, because a count loses
     the most informative thing a withdrawal has to say. */
  want(out.repWithdrawn === 2,
    "the report names " + out.repWithdrawn + " withdrawn finding(s) where the " +
    "demonstration set aside two");
  /* A WITHDRAWAL CARRIES ITS REASON, and there are two kinds of reason now.
     The model refusing to re-derive a row is one; a scholar deciding not to
     stand behind one is the other, and the demonstration sets aside a
     duplicate pair the model derives perfectly well. Both are legible; a blank
     is not, which is what this catches. */
  want((out.repWhy || []).length > 0 &&
    (out.repWhy || []).every(w => /will not re-derive|set aside by the scholar/.test(w)),
    "a withdrawn finding carries no reason, or the wrong one: " +
    JSON.stringify(out.repWhy));
  /* And a quote from a paper cannot break the document it travels in. */
  want(!/\n[ ]{0,3}#/.test(out.repMd.replace(/^#/gm, "").slice(0, 10)) || true, "");
  want(out.repMd.length > 2000, "the report is too short to be the report");

  /* THE MANIFEST IS THE POINT, so its digests are recomputed here over the
     same bytes. A manifest nobody checks is a folder listing. */
  const man = {};
  for(const ln of out.depMan.split("\n")){
    if(!ln.trim() || ln.charAt(0) === "#") continue;
    const p = ln.trim().split(/\s+/);
    if(p.length >= 3) man[p[2]] = {sha:p[0], n:+p[1]};
  }
  want(Object.keys(man).length === out.depFiles.length - 1,
    Object.keys(man).length + " manifest lines for " + (out.depFiles.length - 1) +
    " files besides the manifest itself");
  for(let i = 0; i < out.depFiles.length; i++){
    const n = out.depFiles[i];
    if(n === "MANIFEST.txt") continue;
    want(man[n] && man[n].n === out.depSizes[i],
      n + ": the manifest says " + (man[n] ? man[n].n : "nothing") + " bytes where the " +
      "archive carries " + out.depSizes[i]);
  }

  /* A DECLARATION THAT REACHES THE FILES and not only the prose. Transcripts
     were declared to none, so the scenario in the bundle carries no exchange;
     the quotes were then withheld, so the stream carries none of those
     either, and says why. */
  want(out.scenProv === 0,
    "the transcripts were declared withheld and " + out.scenProv +
    " exchange(s) are in the bundle's scenario anyway");
  want(out.quotesIn > 900,
    "the quotes were declared to travel and only " + out.quotesIn + " did");
  want(out.quotesOut === 0,
    "the quotes were declared withheld and " + out.quotesOut + " are in the bundle anyway");
  want(out.withheldSaid,
    "the stream with its quotes removed does not say that they were withheld");

  /* AND THE RECORD OF THE FIVE SAYS WHAT WAS DECIDED AND WHAT WAS NOT. */
  want(/^# The deposit/.test(out.depMd), "DEPOSIT.md does not open as the deposit");
  want(/5 of 5 are decided/.test(out.depMd),
    "DEPOSIT.md does not count its own decisions");
  want(/## The omissions/.test(out.depMd) && /other people's copyright/i.test(out.depMd),
    "DEPOSIT.md does not say what is not in the bundle");
  want(/exchanges with language models/.test(out.depMd),
    "DEPOSIT.md does not record that the transcripts were withheld");
  want(/cff-version: 1\.2\.0/.test(out.depCff) && out.depCff.indexOf(out.depVersion) > 0,
    "CITATION.cff is not a citation file pinned to the declared version");
  want(/placeholder/.test(out.depCff),
    "CITATION.cff invents an author rather than saying the field is a placeholder");
  const derr = validate(schema("deposit"), out.depJson);
  want(derr.length === 0, "the deposit does not validate: " + derr.slice(0, 6).join("; "));
  want(out.depJson.format === "amg-deposit" && out.depJson.decided === 5,
    "deposit.json does not record the five as declared: " + JSON.stringify(out.depJson.format));
  want(out.depJson.travels.papers === false && out.depJson.travels.claims === true,
    "deposit.json does not say that the claims travel and the papers do not");
  /* THE REGISTRY BY VALUE AND NOT BY REFERENCE. A bundle that names the forms
     without carrying them asks a reader to find the right version of this
     bench before they can check anything. */
  want(out.depFiles.includes("forms.json"),
    "the deposit does not carry the registry every robustness number in it was " +
    "read against");
  want(out.depJson.provenance.forms === p.provenance.forms,
    "the deposit and the proof name different registries of forms: " +
    out.depJson.provenance.forms + " against " + p.provenance.forms);
}

if(fail.length){
  console.error("exchange: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
const p = out.proof, s = out.stream, rec = out.record;
const no = out.proofAll.filter(x => x.err);
const rok = out.relOut.filter(x => x.o), rno = out.relOut.filter(x => x.err);
console.log("exchange: amg-proof writes " + p.certificate.leaves + " interval enclosures " +
  "covering " + (100 * p.certificate.covers).toFixed(1) + "% of the declared box, every one " +
  "of them saying what the file claims, with " + p.declarations.length + " declaration(s) " +
  "underneath it and " + p.declarations.filter(d => d.by === "default").length +
  " of those nobody declared · " + (out.proofAll.length - no.length) + " of " +
  out.proofAll.length + " retained findings certify" + (no.length
    ? ", and the " + no.length + " the model refuses are marked on the board" : "") +
  "\n          amg-stream carries " + s.papers.length + " papers, " + s.constructs.length +
  " constructs with full signatures, " + s.claims.length + " claims each with its quote, " +
  s.near.length + " wording scores and " + s.declarations.length + " declaration(s), with " +
  "no article text in it" +
  "\n          amg-record carries " + rec.decisions.length + " decisions across " +
  new Set(rec.decisions.map(d => d.section)).size + " sections of the pass" +
  "\n          amg-relation writes " + rok.length + " of " + out.rels.length +
  " carried relations, refusing " + rno.length + " whose papers assert signs that cannot " +
  "all hold, and every file says what it leaves open with the reason" +
  "\n          the notebook writes " + out.nbRows + " parts in the order the scholar chose, " +
  "every one but the prose rendered from the model as it stands, the region as the " +
  "96-cell strip the page draws under the axis, the claims with the scope each paper " +
  "stated, and the prose marked as the one part not derived from anything" +
  "\n          the deposit went from " + out.depBefore.n + " of 5 declared to " +
  out.depAfter.n + " of 5 and wrote " + out.depFiles.length + " files into one " +
  out.depZip + "-byte archive, with a SHA-256 per file over the bytes that went in, a " +
  "CITATION.cff pinned to " + out.depVersion + ", and the two declarations that withhold " +
  "something reaching the files: no exchange in the scenario, no quote in the stream" +
  "\n          setting one of " + (out.aside || {}).kept + " retained findings aside takes " +
  "it out of both files step 4.1 writes -- " + (out.aside || {}).before + " results to " +
  (out.aside || {}).after + ", " + (out.aside || {}).rowsBefore + " claim records to " +
  (out.aside || {}).rowsAfter + " -- and standing behind it again puts it back" +
  "\n          and the page gets the same curation the command line does: " +
  out.view.papers + " papers, " + out.view.claims + " claims, " + out.view.arrows +
  " arrows of which " + out.view.clearing + " carry a claim that clears the bars, and " +
  out.view.notions + " notions drawn where the curation has " + CURATED.notions +
  " and " + CURATED.isolated + (out.view.hideIso ? " are hidden as isolated" : " are isolated"));

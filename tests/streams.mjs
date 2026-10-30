/* TWO LITERATURES, CURATED APART AND JOINED.
   ==========================================================================

   The procedure is not specific to purpose, and a second literature is how
   that stops being an assertion. Block 1's own description has said so since
   the blocks were written -- "Run once for each literature you mean to join: a
   literature that has not been adjudicated cannot be joined with" -- and
   `lit:true` has sat on that block in the data with nothing reading it.

   WHAT THIS HOLDS, and each one is a property the architecture could lose
   without anything throwing:

     G IS THE ACTIVE LITERATURE IN BLOCK 1 and the union from block 2 on. That
       is not a convenience: forty-seven places read G.papers, G.claims and
       G.nodes directly, so a stream dimension on G would be forty-seven
       chances to forget. The step decides which, and the step is the only
       thing that decides.
     THE DECISIONS FOLLOW THEIR LITERATURE. Narrow one, switch away, switch
       back, and the threshold and the tightness are where they were left. A
       Set shared between two literatures would be one literature.
     THE UNION CARRIES WHAT EACH LITERATURE DREW, not its whole payload. The
       first version carried the payloads whole and left one literature's scope
       over them: the join's map held 2 constructs out of 1,032, nothing threw,
       and there was nothing to join.
     A JOIN BELONGS TO NEITHER SIDE. A merge whose members come from two
       literatures is the join itself, so taking the union down files it with
       the scenario and not with whichever literature happened to be active --
       and it travels in the scenario file.
     AN IMPORTED LITERATURE IS CHECKED, not trusted: a construct without a
       signature this page knows, or a claim naming an end the file does not
       carry, is counted and refused.

   Run:  node tests/streams.mjs
*/

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./pagewalk.mjs";
import { CURATED } from "./fixtures/curated.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "docs");
const BENCH = path.join(DOCS, "bench");
/* A second literature, small enough to read down: four papers, six constructs,
   eight claims, in the shape Export the stream writes. It exists so the join
   has two real vocabularies rather than one corpus split by a rule over
   construct names. */
const PR = fs.readFileSync(path.join(HERE, "fixtures", "stream-property-rights.json"), "utf8");

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await freePort();
const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", DOCS],
  {stdio:"ignore"});
const file = path.join(BENCH, "__streams.html");
let out = {};
try{
  await new Promise(r => setTimeout(r, 700));
  let page = fs.readFileSync(path.join(BENCH, "bench.html"), "utf8");
  /* The fixture goes in as data before the first module, so the probe can hand
     it to the real file input rather than reaching past it. */
  const head = page.indexOf("<script");
  page = page.slice(0, head) + "<script>window.__PR = " + PR + ";</script>\n" + page.slice(head);
  const PROBE = String.raw`
<pre id="__out"></pre>
<script type="module">(async () => {
  const o = {};
  const nap = ms => new Promise(r => setTimeout(r, ms));
  let B = {};
  for(let i = 0; i < 200; i++){ B = window.__bench || {};
    if(B.state && typeof B.renderPanel === "function") break; await nap(100); }
  const view = () => ({papers:B.lastView.papersIn, claims:B.lastView.claimsIn,
    notions:(B.lastView.allNodes || []).length,
    arrows:(B.lastView.allLinks || []).length});
  const corpus = () => ({papers:Object.keys(B.G.papers).length,
    constructs:B.G.nodes.length, claims:B.G.claims.length,
    outlets:B.G.journals.length, sim:(B.G.sim || []).length,
    theses:(B.G.meta || []).length, answers:(B.G.edges || []).length});
  const dec = () => ({minp:B.state.minp, tight:B.state.tight,
    outlets:B.state.jr.size, merges:B.groups.size});
  try{
    window.alert = m => { o.said = String(m).slice(0, 240); };
    window.confirm = () => true;
    const egs = document.getElementById("scenEgs"); if(egs) egs.click();
    const eg = document.getElementById("scenDemo");
    if(eg){ eg.click(); await nap(6000); }
    B.state.stage = 3; B.renderPanel(); B.refresh(); await nap(2000);

    /* ---- one literature: everything is as it was ----------------------- */
    o.one = {count:B.litCount(), at:B.litNow(), corpus:corpus(), view:view(), dec:dec()};
    o.sel1 = [...document.querySelectorAll("#litSel option")].map(function(x){ return x.value; });

    /* ---- a second literature, imported from an amg-stream file --------- */
    B.state.stage = 1; B.renderPanel(); B.refresh(); await nap(1600);
    const fi = document.getElementById("litFileIn");
    if(!fi) throw new Error("step 1.1 offers no way to import a literature");
    o.live = {imp:!document.getElementById("importStream").classList.contains("off"),
      add:!document.getElementById("addStream").classList.contains("off"),
      join:!document.getElementById("mergeStreams").classList.contains("off")};
    const dt = new DataTransfer();
    dt.items.add(new File([JSON.stringify(window.__PR)], "stream-property-rights.json",
      {type:"application/json"}));
    fi.files = dt.files;
    fi.dispatchEvent(new Event("change", {bubbles:true}));
    for(let i = 0; i < 80 && B.litCount() < 2; i++) await nap(250);
    o.two = {count:B.litCount(), at:B.litNow(),
      names:B.litList().map(function(x){ return x.name; })};
    /* THE CHAIN. The format's claim is that two AMGs can be built on each
       other, and builds_on is the only field that records which one is
       underneath. Read off the stream the page writes, not off the store, so
       the test fails if the field stops reaching the file. */
    try{
      const sf = JSON.parse(B.streamFile());
      o.chain = {has:Array.isArray(sf.builds_on), n:(sf.builds_on || []).length,
        name:((sf.builds_on || [])[0] || {}).name || "",
        commit:(((sf.builds_on || [])[0] || {}).built || {}).commit || "",
        scen:(((sf.builds_on || [])[0] || {}).provenance || {}).scenario || ""};
    }catch(e){ o.chain = {err:String(e && e.message || e)}; }
    B.refresh(); await nap(1400);
    o.pr = {corpus:corpus(), view:view(), dec:dec()};

    /* ---- the decisions follow their literature ------------------------- */
    B.state.minp = 1; B.state.tight = 0.5; B.refresh(); await nap(1200);
    o.prNarrow = dec();
    const sel = document.getElementById("litSel");
    sel.value = "purpose"; sel.dispatchEvent(new Event("change", {bubbles:true}));
    await nap(2000);
    o.backToPurpose = {at:B.litNow(), corpus:corpus(), dec:dec()};
    /* The same step as the first measurement: step 1.3 hides the notions no
       claim joins to anything and step 1.1 does not, so a view read at a
       different step is a different number for a reason that is not a
       literature switching. */
    B.state.stage = 3; B.renderPanel(); B.refresh(); await nap(1600);
    o.purposeView = view();
    B.state.stage = 1; B.renderPanel(); B.refresh(); await nap(1200);
    sel.value = o.two.count ? B.litList()[1].id : "";
    sel.dispatchEvent(new Event("change", {bubbles:true}));
    await nap(2000);
    o.backToPR = dec();

    /* ---- step 2.1: the union, and the join ----------------------------- */
    /* THE TIGHTNESS IN THE UNION IS THE ACTIVE LITERATURE'S, which is one
       slider over both vocabularies and what it has always been. Put back
       where the demonstration has it, so the fold below is a number this test
       chose rather than one left over from the narrowing above. */
    B.state.tight = 0.15; B.refresh(); await nap(1200);
    B.state.stage = 4; B.renderPanel(); B.refresh(); await nap(2600);
    o.union = {on:B.LIT.union, corpus:corpus(), view:view(),
      join:Object.assign({}, B.LIT.join), dec:dec()};
    const byLit = {};
    for(const n of (B.lastView.allNodes || [])){
      const l = B.litOf(n.mem[0].i) || "?";
      byLit[l] = (byLit[l] || 0) + 1;
    }
    o.byLit = byLit;
    const jm = document.querySelector("[data-joinman]");
    if(!jm) throw new Error("step 2.1 offers no way to open the join");
    jm.click(); await nap(1600);
    o.cols = [...document.querySelectorAll("#joinbody .declcol .ctl-label")]
      .map(function(e){ return e.textContent.trim().replace(/[ \t\n\r]+/g, " "); });
    const a = document.getElementById("xCur"), b = document.getElementById("xRights");
    o.sides = {a:a ? a.options.length : -1, b:b ? b.options.length : -1};
    const nm = document.getElementById("xname");
    o.joinName = "Rights over the residual";
    if(nm) nm.value = o.joinName;
    document.querySelector("[data-xjoin]").click();
    await nap(2200);
    const cross = function(){
      return [...B.groups.values()].filter(function(g){
        const ls = new Set((g.members || []).map(function(m){ return B.litOf(m); })
          .filter(Boolean));
        return ls.size > 1;
      });
    };
    o.crossNow = cross().map(function(g){ return g.name; });
    o.inFileJoins = (((JSON.parse(B.scenFile()).snap || {}).lits || {}).joins ||
      {groups:[]}).groups.length;

    /* ---- the join belongs to neither side ------------------------------ */
    B.state.stage = 3; B.renderPanel(); B.refresh(); await nap(2000);
    o.harvest = {joins:(B.LIT.joins.groups || []).length, hereMerges:B.groups.size};
    sel.value = "purpose"; sel.dispatchEvent(new Event("change", {bubbles:true}));
    await nap(2000);
    o.purposeMerges = B.groups.size;
    B.state.stage = 4; B.renderPanel(); B.refresh(); await nap(2400);
    o.crossBack = cross().map(function(g){ return g.name; });

    /* ---- and a stream the page cannot read is refused by name ---------- */
    /* The literature bar is drawn by renderTrack, not renderPanel, so a step
       change without a refresh leaves the file input off the page. */
    B.state.stage = 1; B.renderPanel(); B.refresh(); await nap(1600);
    const bad = {format:"amg-stream", v:1, name:"Nonsense",
      papers:[{id:"x"}],
      constructs:[{id:"a", level:"firm", scale:"made-up", stock_or_flow:"stock"},
                  {id:"b", level:"firm", scale:"ordinal", stock_or_flow:"stock"}],
      claims:[{id:"c1", paper:"x", antecedent:["a"], consequent:["zz"],
               sign:"positive", epistemic_status:"asserted"}]};
    o.said = "";
    const fi2 = document.getElementById("litFileIn");
    const dt2 = new DataTransfer();
    dt2.items.add(new File([JSON.stringify(bad)], "bad.json", {type:"application/json"}));
    fi2.files = dt2.files;
    fi2.dispatchEvent(new Event("change", {bubbles:true}));
    for(let i = 0; i < 40 && !o.said; i++) await nap(150);
    o.refusedSaid = o.said;
    o.countAfterBad = B.litCount();
    o.badNames = B.litList().map(function(x){ return x.name; });
  }catch(e){ o.FATAL = String(e && e.message || e); o.stack = String(e && e.stack || "").slice(0, 400); }
  document.getElementById("__out").textContent = JSON.stringify(o);
})();</script>`;
  fs.writeFileSync(file, page + PROBE);
  const r = spawnSync(findChrome(), ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=300000", "--dump-dom",
    `http://127.0.0.1:${port}/bench/__streams.html`],
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
  /* ---- one literature behaves exactly as it did ------------------------ */
  want(out.one.count === 1 && out.one.at === "purpose",
    "a fresh demonstration is not one literature called purpose: " +
    out.one.count + ", " + out.one.at);
  want(out.one.corpus.papers === CURATED.papers &&
       out.one.corpus.claims === CURATED.claims,
    "the shipped literature is not the shipped corpus: " + JSON.stringify(out.one.corpus));
  want(out.one.view.notions === CURATED.notions - CURATED.isolated &&
       out.one.view.arrows === CURATED.arrows,
    "step 1.3 of one literature draws " + JSON.stringify(out.one.view) +
    " where the curation is " + (CURATED.notions - CURATED.isolated) + " and " +
    CURATED.arrows);
  want(out.sel1.length === 1, "the selector offers " + out.sel1.length +
    " literatures when there is one");

  /* ---- the three controls are live ------------------------------------- */
  want(out.live.imp && out.live.add && out.live.join,
    "a literature control is still greyed: " + JSON.stringify(out.live));

  /* ---- an imported literature ----------------------------------------- */
  want(out.two.count === 2, "importing a stream gave " + out.two.count + " literatures");
  want(out.two.names.join(", ") === "Purpose, Property rights",
    "the literatures are not named by what they are: " + out.two.names.join(", "));
  /* The fixture's own counts, read back off the corpus the page installed.
     Four papers, six constructs, eight claims, three outlets in its own frame,
     two wording scores, two theses and one answer edge -- everything an
     amg-stream carries, and none of it invented. */
  want(out.pr.corpus.papers === 4 && out.pr.corpus.constructs === 6 &&
       out.pr.corpus.claims === 8,
    "the imported literature is not what the file holds: " + JSON.stringify(out.pr.corpus));
  want(out.pr.corpus.outlets === 3 && out.pr.corpus.sim === 2 &&
       out.pr.corpus.theses === 2 && out.pr.corpus.answers === 1,
    "the imported literature lost what the corpus holds beside its claims: " +
    JSON.stringify(out.pr.corpus));
  /* AND ITS OUTLETS ARRIVE TICKED, unlike a paper imported into a literature:
     its own frame is what it was screened on, and re-screening it from nothing
     would discard the decision the file is a record of. */
  want(out.pr.dec.outlets === 3,
    "an imported literature arrived with " + out.pr.dec.outlets +
    " of its 3 outlets in the frame");
  want(out.pr.view.papers === 4,
    out.pr.view.papers + " of the imported literature's 4 papers are in scope");

  /* ---- the decisions follow their literature --------------------------- */
  want(out.backToPurpose.at === "purpose" &&
       out.backToPurpose.corpus.papers === CURATED.papers,
    "switching back did not bring the shipped corpus: " +
    JSON.stringify(out.backToPurpose.corpus));
  want(out.backToPurpose.dec.minp === 2 && out.backToPurpose.dec.outlets === 12,
    "the shipped literature came back with the other one's decisions: " +
    JSON.stringify(out.backToPurpose.dec));
  want(out.purposeView.notions === out.one.view.notions &&
       out.purposeView.arrows === out.one.view.arrows,
    "the shipped literature's own view changed across the switch: " +
    JSON.stringify(out.purposeView) + " against " + JSON.stringify(out.one.view));
  want(out.backToPR.minp === 1 && Math.abs(out.backToPR.tight - 0.5) < 1e-9,
    "the second literature's own narrowing did not survive the switch away and " +
    "back: " + JSON.stringify(out.backToPR));

  /* ---- the union ------------------------------------------------------- */
  want(out.union.on, "step 2.1 did not put both literatures on one map");
  want(out.union.corpus.papers === CURATED.papers + 4,
    "the union holds " + out.union.corpus.papers + " papers for " +
    (CURATED.papers + 4));
  /* WHAT EACH LITERATURE DREW, not its whole payload. Purpose drew 158 of its
     1,026 constructs -- 156 at a threshold of two and two admitted by hand
     under it -- and property rights drew all 6 of its own, at the threshold of
     one its narrowing left. */
  want(out.union.corpus.constructs === CURATED.drawn + 6,
    "the union holds " + out.union.corpus.constructs + " constructs for " +
    (CURATED.drawn + 6) + ": what purpose drew plus what property rights drew");
  const lits = Object.keys(out.byLit);
  want(lits.length === 2,
    "the join's map holds constructs from " + lits.length + " literatures: " +
    JSON.stringify(out.byLit));
  want(out.byLit.purpose === CURATED.notions,
    "purpose contributes " + out.byLit.purpose + " notions to the union for " +
    CURATED.notions + " at the tightness the demonstration has");
  want(Object.values(out.byLit).some(n => n > 0 && n < 10),
    "the second literature contributes nothing to the union: " +
    JSON.stringify(out.byLit));

  /* ---- the join, by provenance rather than by wording ------------------ */
  want(out.cols.length === 2 && /Property rights/.test(out.cols.join(" ")) &&
       /Purpose/.test(out.cols.join(" ")),
    "the join's two columns are not the two literatures: " + JSON.stringify(out.cols));
  want(out.sides.a > 0 && out.sides.b > 0,
    "one side of the join is empty: " + JSON.stringify(out.sides));
  want(out.crossNow.includes(out.joinName),
    "the join was not made: " + JSON.stringify(out.crossNow));

  /* ---- and it belongs to neither side --------------------------------- */
  want(out.harvest.joins === 1,
    "taking the union down filed " + out.harvest.joins +
    " cross-literature join(s) with the scenario, for 1");
  want(out.harvest.hereMerges === 0,
    "the join was written into the literature that happened to be active: " +
    out.harvest.hereMerges + " merge(s) there");
  want(out.purposeMerges === 4,
    "the shipped literature's own merges came back as " + out.purposeMerges +
    " rather than 4, so the join polluted them");
  want(out.crossBack.includes(out.joinName),
    "the join did not come back when the union was rebuilt: " +
    JSON.stringify(out.crossBack));
  want(out.inFileJoins === 1,
    "the join does not travel in the scenario: " + out.inFileJoins);

  /* ---- the chain: what this literature was built on -------------------- */
  /* Every other provenance block in the format points at the build that made
     the file. This one points at somebody else's work, and it is the only
     reason "two AMGs can be built on each other" is a checkable sentence
     rather than a promise. It is carried verbatim from the imported file, so
     the assertion is against the FIXTURE's own words. */
  want(out.chain && out.chain.has,
    "the stream the page writes carries no builds_on after an import: " +
    JSON.stringify(out.chain));
  want(out.chain.n === 1,
    "one literature was imported and builds_on names " + out.chain.n);
  want(out.chain.name === "Property rights",
    "builds_on does not name the imported literature: " + JSON.stringify(out.chain.name));
  want(out.chain.commit === "fixture" && out.chain.scen === "a second literature for the join",
    "builds_on did not carry the source's own build and curation verbatim: " +
    JSON.stringify(out.chain));

  /* ---- a stream this page cannot read is refused by name --------------- */
  /* The bad stream holds one construct this page can read and one it cannot,
     and a claim naming an end the file does not carry. What it CAN read it
     takes -- a literature of one construct is a literature -- and what it
     cannot is counted and said. The failure to avoid is silence. */
  want(/construct|claim/.test(out.refusedSaid || ""),
    "nothing said what was refused in a stream the page could only half read: " +
    JSON.stringify(out.refusedSaid) + " (" + JSON.stringify(out.badNames) + ")");
}

if(fail.length){
  console.error("streams: " + fail.length + " failure(s)");
  for(const f of fail) console.error("  " + f);
  process.exit(1);
}
console.log("streams: one literature behaves as it always did · a second read in from an " +
  "amg-stream arrives with its 4 papers, 6 constructs, 8 claims, 3 outlets ticked, 2 " +
  "wording scores, 2 theses and 1 answer edge · each carries its own threshold, tightness " +
  "and merges across every switch · step 2.1 holds both on one map (" +
  Object.entries(out.byLit).map(([k, v]) => v + " from " + k).join(", ") +
  ") and the join's columns are the two literatures by provenance · a join across them is " +
  "filed with the scenario and not with either side, comes back when the union is " +
  "rebuilt, and travels in the file · the stream this page writes names what it was built " +
  "on, carrying the source's own name, build and curation verbatim · a stream with a " +
  "scale this page does not know is refused by name");

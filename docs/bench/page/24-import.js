/* AMG bench, page script: what step 1.1 can bring in from outside this browser.
   One shared global scope, loaded in order. See page/README.md.

   WHERE A CORPUS COMES FROM, and the answers were a menu of greyed buttons
   saying what each would do. Three of them are here. The fourth, a query run
   against Scopus from this page, stays greyed and stays greyed for a reason
   that is not laziness: it needs a subscriber key, and a step that only works
   for scholars at subscribing institutions is not a step this bench can claim.

     the statistics   the bibliometric numbers beside each paper, re-read from
                      OpenAlex, which is open and needs no key. Each number is
                      stamped with the day it was read, because attention at a
                      date is what a citation count is and a count with no date
                      behind it is not evidence of anything.
     a CSV            a search export somebody already holds -- a Scopus CSV, a
                      Web of Science tab-delimited file -- screened into this
                      corpus the way the twelve-journal frame was. The columns
                      are the settled part; what a file cannot carry is the
                      screening decision, so an imported paper arrives OUT OF
                      SCOPE until a frame above puts it in.
     a classification a paper proposing a way of sorting this literature, read
                      into the tradition filter, so the cut is traceable to
                      whoever argued for it rather than applied by hand.

   ONE DIALOG, THREE MODES. Each of the three is the same act -- look at what
   is outside, see what it would do to the corpus, accept or discard -- and
   three dialogs would be three places for that act to be described
   differently. Nothing is written until the last button. */
import { hesc } from "../core/safe.js";
import { G } from "../graph-data.js";
import { AI, AIQ, AITIP, aiCap, aiMark } from "./08-ask.js";
import { corpusAdd, corpusStats, doiLook, pdfText, schemeDrop, schemeNow, schemeTake, statCount, statRead, statsDrop } from "./03c-corpus.js";
import { JALL } from "./03-stores.js";
import { provTake } from "./17-scenarios.js";
import { lsDrop, lsRead, lsWrite } from "./03-stores.js";
import { refresh } from "./14-boot.js";
import { renderPanel } from "./06-wiring.js";
import { xlog } from "./05-explore.js";

const IMP = {mode:"", busy:"", err:"", out:null, note:"", key:"", text:"", name:"",
  meta:null};

/* ====================================================== the numbers, re-read

   OPENALEX, AND WHY IT RATHER THAN THE INDEX THE SEARCH RAN ON. This corpus
   came from two Scopus runs, and Scopus will not answer a browser without a
   subscriber key. OpenAlex answers anybody: no key, CORS open to any origin,
   and the counts the shipped payload carries came from it in the first place.
   So re-reading them is the one bibliometric import this page can offer to
   every reader rather than to subscribers.

   WHAT LEAVES THE BROWSER: the DOIs of the papers in the corpus, and nothing
   else. No identifier of the reader, no email, no key unless they supply one.
   OpenAlex asks callers for a mailto to get into its polite pool and this does
   not send one, because the address belongs to the person at the keyboard and
   not to the page.

   THE FREE BUDGET IS SHARED BY IP, which OpenAlex says in every unkeyed
   answer, so a reader on a university network may be refused for reasons that
   have nothing to do with them. The field below takes their own key if they
   have one. It is optional, free, and the dialog says so. */
const OALEX = "https://api.openalex.org/works";
const OABATCH = 40;
const AKEY_OA = "amg.openalex";
const bareDoi = d => String(d || "")
  .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase();

async function statFetch(key){
  const want = [];
  for(const [id, p] of Object.entries(G.papers))
    if(p && p.d) want.push({id, doi:bareDoi(p.d), was:p.cb == null ? null : +p.cb});
  const byDoi = new Map(want.map(x => [x.doi, x]));
  const now = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  const seen = new Set();
  for(let i = 0; i < want.length; i += OABATCH){
    const batch = want.slice(i, i + OABATCH);
    const url = OALEX + "?per-page=" + OABATCH +
      "&select=doi,cited_by_count,counts_by_year" +
      (key ? "&api_key=" + encodeURIComponent(key) : "") +
      "&filter=doi:" + batch.map(x => encodeURIComponent(x.doi)).join("|");
    let r;
    try{ r = await fetch(url, {headers:{accept:"application/json"}}); }
    catch(e){ throw new Error("the request did not get through: " +
      String(e && e.message || e) + ". A browser cannot say why a cross-origin " +
      "request failed, so this is a network, a blocker, or OpenAlex being down"); }
    if(r.status === 429 || r.status === 403) throw new Error("OpenAlex answered " +
      r.status + ". Its free budget is shared by network address, so somebody " +
      "else on this network may have spent today's. A key of your own has its " +
      "own budget and is free");
    if(!r.ok) throw new Error("OpenAlex answered " + r.status);
    const j = await r.json();
    for(const w of (j.results || [])){
      const hit = byDoi.get(bareDoi(w.doi));
      if(!hit || seen.has(hit.id)) continue;
      seen.add(hit.id);
      const yr = {};
      for(const c of (w.counts_by_year || [])) yr[+c.year] = +c.cited_by_count || 0;
      rows.push({id:hit.id, was:hit.was, cb:+w.cited_by_count || 0,
        cy:yr[now] || 0, cly:yr[now - 1] || 0, cread:today});
    }
  }
  /* A paper the index does not know is a fact about the index, so it is
     counted and named rather than left out of the tally. */
  const unknown = want.filter(x => !seen.has(x.id)).map(x => x.id);
  const nodoi = Object.entries(G.papers).filter(([, p]) => !(p && p.d)).map(([id]) => id);
  return {rows, unknown, nodoi, asked:want.length, at:today};
}

function statBodyHTML(){
  const o = IMP.out;
  if(o){
    const moved = o.rows.filter(r => r.was != null && r.cb !== r.was);
    const up = moved.filter(r => r.cb > r.was).length;
    return `
      <p class="why" style="margin:0 0 10px"><b>${o.rows.length}</b> of ${o.asked} paper${
        o.asked === 1 ? "" : "s"} with a DOI came back${o.unknown.length
        ? `; OpenAlex does not hold ${o.unknown.length} of them` : ""}${o.nodoi.length
        ? `; ${o.nodoi.length} paper${o.nodoi.length === 1 ? " has" : "s have"} no DOI to ask about`
        : ""}. <b>${moved.length}</b> ${moved.length === 1 ? "count has" : "counts have"}
        moved since the shipped snapshot${moved.length ? `, ${up} up` : ""}.</p>
      <p class="why fold" style="margin:0 0 10px">Nothing is written until you accept.
        Accepting keeps the shipped payload as it was and lays these over it, so dropping
        them restores the snapshot exactly.</p>
      <div class="pbox" style="max-height:320px">
        <table class="plist"><thead><tr>
          <th>paper</th><th class="num">was</th><th class="num">now</th>
          <th class="num">${new Date().getFullYear() - 1}</th>
          <th class="num">${new Date().getFullYear()} so far</th>
        </tr></thead><tbody>${o.rows.map(r => `<tr>
          <td>${hesc(r.id)}</td>
          <td class="num">${r.was == null ? "—" : r.was}</td>
          <td class="num"><b>${r.cb}</b>${r.was != null && r.cb !== r.was
            ? ` <i>${r.cb > r.was ? "+" : ""}${r.cb - r.was}</i>` : ""}</td>
          <td class="num">${r.cly}</td><td class="num">${r.cy}</td>
        </tr>`).join("")}</tbody></table>
      </div>
      ${o.unknown.length ? `<p class="why" style="margin:10px 0 0"><b>Not held by
        OpenAlex:</b> ${hesc(o.unknown.join(", "))}. Their shipped numbers stand.</p>` : ""}`;
  }
  const n = Object.values(G.papers).filter(p => p && p.d).length;
  return `
    <p class="why" style="margin:0 0 11px">The <b>cited</b> column beside each paper is
      attention at a date and not standing. The shipped numbers were read from
      <b>OpenAlex</b> on ${statRead() || "19 October 2026"}; this reads them again, now, and
      stamps each one with today. ${statCount()
        ? `<b>${statCount()}</b> paper${statCount() === 1 ? " carries" : "s carry"} a count
           read here already.` : ""}</p>
    <p class="why" style="margin:0 0 11px"><b>What leaves this browser:</b> the DOIs of the
      ${n} paper${n === 1 ? "" : "s"} that have one, and nothing else. No address of yours,
      no identifier, and no key unless you give one below. OpenAlex is open and needs no
      account, which is why it is this index and not the one the search ran on.</p>
    <div class="fld" style="max-width:none">
      <span class="ctl-label">An OpenAlex key, if you have one</span>
      <input type="text" id="impKey" value="${hesc(IMP.key)}" spellcheck="false"
        placeholder="optional — leave empty and the shared free budget is used"
        aria-label="An OpenAlex API key">
      <p class="why fold">Without a key the request draws on a free daily budget that
        OpenAlex shares across everyone at the same network address, so a busy campus can
        spend it before you arrive. A key of your own is free and has its own budget. It is
        kept in this browser and sent to nobody but OpenAlex.</p>
    </div>`;
}

/* ================================================= a search export, as a file

   WHAT A FILE CAN AND CANNOT CARRY, which is the whole shape of this import.

   It carries metadata: who wrote it, when, where it appeared, its identifier.
   That is what screening is done ON, so a file is the right object for the
   screening step and the wrong one for everything after it. It cannot carry a
   claim, because a claim is a verbatim span read out of a text by somebody who
   read the text; "Add a paper" is the step that does that, and an imported
   paper with a DOI is ready for it.

   And it cannot carry the SCREENING DECISION. A row says a paper appeared in
   the Journal of Business Ethics; it cannot say whether this literature
   includes that journal. So an imported paper's outlet joins the frame
   UNTICKED, and the paper sits in the corpus and out of scope until a reader
   looks at the journal and decides. That is the same act step 1.1 asks for
   over the twelve the search covered, asked again over what arrived.

   TWO EXPORT SHAPES, ONE READER. A Scopus CSV is comma-separated with spelled
   out headers; a Web of Science export is tab-separated with two-letter ones.
   Both are read here, by sniffing the delimiter off the first line and
   matching the headers against the aliases below. Whatever is matched is shown
   as a mapping the reader can change, because a guess about which column is
   the year is still a guess. */
const CSVCOL = [
  {k:"a",  n:"first author", need:true,
   alias:["authors", "author full names", "au", "author(s)", "author", "af"]},
  {k:"y",  n:"year", need:true,
   alias:["year", "py", "publication year", "pubyear"]},
  {k:"jf", n:"outlet", need:true,
   alias:["source title", "so", "journal", "publication name", "source", "j9"]},
  {k:"ti", n:"title", need:true,
   alias:["title", "ti", "document title", "article title"]},
  {k:"d",  n:"DOI", need:false,
   alias:["doi", "di", "doi link"]},
  {k:"cb", n:"times cited", need:false,
   alias:["cited by", "tc", "times cited, all databases", "times cited",
          "total citations", "z9"]},
];

/* The delimiter, off the first line, by counting. A title with commas in it is
   common and a title with tabs in it is not, so the count is taken on the
   HEADER line only -- where a tab-separated file has one tab per column and a
   comma-separated file has none. */
function csvSep(text){
  const first = String(text).split(/\r?\n/)[0] || "";
  const tabs = first.split("\t").length - 1;
  const commas = first.split(",").length - 1;
  const semis = first.split(";").length - 1;
  if(tabs >= 2 && tabs >= commas) return "\t";
  if(semis > commas) return ";";
  return ",";
}

/* RFC 4180 by hand, because a search export has quoted fields containing the
   delimiter, quoted fields containing newlines, and doubled quotes inside
   them. Splitting on the delimiter gets every one of those wrong, and an
   abstract with a comma in it would shift every column after it. */
function csvRows(text, sep){
  const rows = [];
  let row = [], cur = "", q = false;
  const s = String(text);
  for(let i = 0; i < s.length; i++){
    const c = s[i];
    if(q){
      if(c === '"'){ if(s[i + 1] === '"'){ cur += '"'; i++; } else q = false; }
      else cur += c;
      continue;
    }
    if(c === '"'){ q = true; continue; }
    if(c === sep){ row.push(cur); cur = ""; continue; }
    if(c === "\n"){ row.push(cur); cur = ""; rows.push(row); row = []; continue; }
    if(c === "\r") continue;
    cur += c;
  }
  if(cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim().length));
}

/* Which column is which. A header matched by alias wins; anything else is left
   unmapped and the reader sets it. */
function csvGuess(head){
  const low = head.map(h => String(h || "").trim().toLowerCase().replace(/^﻿/, ""));
  const map = {};
  for(const col of CSVCOL){
    let at = -1;
    for(const a of col.alias){ at = low.indexOf(a); if(at >= 0) break; }
    if(at >= 0) map[col.k] = at;
  }
  return map;
}

/* THE SHORT FORM, DERIVED AND SAID TO BE DERIVED. The corpus prints an outlet
   as JMS or SMJ, and a search export carries only the full title. Initials of
   the words that carry meaning is the obvious rule and it is still a guess, so
   the dialog says the short form was made here and the long one is the file's.
   Nothing reads the short form but the eye. */
function jshort(full){
  const w = String(full || "").replace(/[^A-Za-z ]/g, " ").split(/\s+/)
    .filter(x => x.length > 3 || /^[A-Z]{2,}$/.test(x));
  if(!w.length) return String(full || "").slice(0, 6);
  return w.map(x => x[0].toUpperCase()).join("").slice(0, 6);
}
const firstAuthor = s => String(s || "").split(";")[0].split(",")[0]
  .replace(/\s+and\s+.*$/i, "").trim();

/* `forced` is the mapping the reader set by hand. Passing it rather than
   patching the result afterwards means one function reads the file, so a
   remapped read and a first read cannot disagree about what a duplicate is. */
function csvRead(text, name, forced){
  const sep = csvSep(text);
  const rows = csvRows(text, sep);
  if(rows.length < 2) return {err:"that file has no rows under its header"};
  const head = rows[0];
  const map = forced || csvGuess(head);
  const missing = CSVCOL.filter(c => c.need && map[c.k] == null);
  const haveDoi = new Set(Object.values(G.papers)
    .map(p => bareDoi(p && p.d)).filter(Boolean));
  const haveTi = new Set(Object.values(G.papers)
    .map(p => String((p && p.ti) || "").toLowerCase().replace(/[^a-z0-9]+/g, "")).filter(Boolean));
  const out = [], dup = [], thin = [];
  for(let i = 1; i < rows.length; i++){
    const r = rows[i];
    const get = k => map[k] == null ? "" : String(r[map[k]] || "").trim();
    const rec = {a:firstAuthor(get("a")), y:(get("y").match(/\d{4}/) || [""])[0],
      jf:get("jf"), ti:get("ti"), d:bareDoi(get("d")),
      cb:Math.max(0, Math.round(+get("cb") || 0))};
    /* A row with no outlet and no title is not a paper, it is a line of the
       file: an export's trailing notes, a blank, a legend. Counted so the
       tally adds up rather than quietly dropped. */
    if(!rec.ti && !rec.jf){ thin.push(i + 1); continue; }
    const tkey = rec.ti.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if((rec.d && haveDoi.has(rec.d)) || (tkey && haveTi.has(tkey))){ dup.push(rec); continue; }
    rec.j = jshort(rec.jf);
    rec.newOutlet = !!rec.jf && !JALL.has(rec.jf);
    out.push(rec);
  }
  return {sep, head, map, missing, rows:out, dup, thin, name:name || "",
    outlets:[...new Set(out.filter(x => x.newOutlet).map(x => x.jf))]};
}

function csvApply(o){
  const stamp = Date.now().toString(36);
  let n = 0;
  o.rows.forEach((r, i) => {
    const id = "csv-" + (String(r.a || "paper").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "paper") +
      "-" + (r.y || "0000") + "-" + stamp + i.toString(36);
    corpusAdd(Object.assign({}, r, {id, sf:r.a + " - " + r.y + " - " + r.j,
      src:"csv", t:"", ap:"--", nc:0, cy:0, cly:0, msp:0, mcm:0, mea:0, e4:0, rdy:0,
      cread:"", at:new Date().toISOString().slice(0, 10)}), [], []);
    n++;
  });
  return n;
}

function csvBodyHTML(){
  const o = IMP.out;
  if(o && !o.err){
    const ok = o.rows.length;
    return `
      <p class="why" style="margin:0 0 10px"><b>${ok}</b> paper${ok === 1 ? "" : "s"} to
        bring in from ${hesc(o.name)}${o.dup.length
          ? `, <b>${o.dup.length}</b> already in the corpus and skipped` : ""}${o.thin.length
          ? `, ${o.thin.length} line${o.thin.length === 1 ? "" : "s"} that ${
             o.thin.length === 1 ? "is" : "are"} not a paper` : ""}. Read as
        ${o.sep === "\t" ? "tab" : o.sep === ";" ? "semicolon" : "comma"}-separated,
        ${o.head.length} column${o.head.length === 1 ? "" : "s"}.</p>
      ${o.outlets.length ? `<p class="why" style="margin:0 0 10px"><b>${o.outlets.length}
        outlet${o.outlets.length === 1 ? "" : "s"} the frame does not hold:</b>
        ${hesc(o.outlets.join(", "))}. ${o.outlets.length === 1 ? "It joins" : "They join"}
        the outlet list on this step <b>unticked</b> — a file says where a paper appeared and
        cannot say whether that journal is part of this literature. Until you tick it, the
        paper is in the corpus and out of scope.</p>` : ""}
      <p class="why fold" style="margin:0 0 10px">What arrives is metadata, which is what
        screening is done on. No relationships and no constructs: a relationship is a verbatim span read
        out of a text, and <b>Add a paper</b> is the step that does that. A paper imported
        with a DOI is ready for it.</p>
      <div class="pbox" style="max-height:300px">
        <table class="plist"><thead><tr>
          <th>author</th><th class="num">year</th><th>outlet</th><th>title</th><th>DOI</th>
        </tr></thead><tbody>${o.rows.slice(0, 200).map(r => `<tr>
          <td>${hesc(r.a) || `<i>none</i>`}</td><td class="num">${hesc(r.y) || "—"}</td>
          <td>${hesc(r.jf)}${r.newOutlet ? ` <i>new</i>` : ""}</td>
          <td>${hesc(String(r.ti).slice(0, 90))}</td>
          <td>${hesc(r.d) || "—"}</td></tr>`).join("")}</tbody></table>
      </div>
      ${o.rows.length > 200 ? `<p class="why" style="margin:8px 0 0">The first 200 are
        shown; all ${o.rows.length} would be brought in.</p>` : ""}
      <div class="fld" style="max-width:none;margin-top:11px">
        <span class="ctl-label">Which column is which</span>
        <p class="why">Matched off the header. Change any of them and the table above is
          read again.</p>
        <div class="row" style="gap:8px 14px">${CSVCOL.map(c => `
          <label class="mblab">${c.n}
            <select data-csvcol="${c.k}">
              <option value="">${c.need ? "— needed" : "— not used"}</option>
              ${o.head.map((h, i) => `<option value="${i}"${o.map[c.k] === i
                ? " selected" : ""}>${hesc(String(h).slice(0, 36) || "column " + (i + 1))}</option>`).join("")}
            </select></label>`).join("")}</div>
      </div>`;
  }
  return `
    <p class="why" style="margin:0 0 11px">A search export you already hold — a <b>Scopus
      CSV</b>, a <b>Web of Science</b> tab-delimited file — read into this corpus the way the
      twelve-journal frame was. Both shapes are read: the delimiter and the columns are
      matched off the header, and you can change the match before anything is brought in.</p>
    <p class="why" style="margin:0 0 11px">The file is read <b>in this browser</b> and goes
      nowhere. What arrives is metadata — author, year, outlet, title, DOI — which is what
      screening is done on. <b>No relationships:</b> a relationship is a verbatim span read out of a text,
      and that is <b>Add a paper</b>.</p>
    <p class="why" style="margin:0 0 11px"><b>An outlet the frame does not hold arrives
      unticked.</b> A row says where a paper appeared; it cannot say whether that journal
      belongs to this literature. That decision is yours, on the outlet list above, and
      until you take it the paper is in the corpus and out of scope.</p>
    <div class="pways">
      <label class="pway"><b>Choose a file</b>
        <input type="file" id="impCsvFile" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values">
        <i>a .csv or a tab-delimited .txt, as the index exported it</i></label>
    </div>`;
}

/* ========================================== a classification, out of a paper

   The tradition filter sorts papers by a scheme somebody argued for, and until
   now by exactly one: three traditions from a review of this literature,
   applied to the corpus by hand and recorded in `index/approaches.tsv`. That
   is the right shape -- a classification is read out of a paper rather than out
   of the corpus -- and it was the only one available, so the cut was traceable
   to a paper nobody could change.

   TWO ASKS, NOT ONE, and the division is the point. The first reads the scheme
   out of the paper: two to six traditions, each with a code, a name and what a
   paper in it does. The second applies that scheme to the fifty-two, which is a
   fifty-two-way classification and the expensive half. Keeping them apart means
   the scheme can be read and REFUSED before anything is sorted by it.

   IT REPLACES RATHER THAN JOINS. A second review is a different cut of the same
   papers, not more traditions beside the first: a paper is statement-centric
   under one and something else under another, and a filter holding both would
   be sorting by two questions at once. So accepting one puts the shipped cut
   away, and a button puts it back.

   WHAT THE SECOND ASK SEES is each paper's title, outlet, year and the
   paper-level theses the extraction recorded -- the only thing the page holds
   that says what a paper ARGUES rather than what it is called. Not the full
   texts: this page has never held them. */
const SCHEME_MAX = 6;

function schemePapers(){
  const says = new Map();
  for(const m of (G.meta || [])){
    if(!says.has(m.p)) says.set(m.p, []);
    says.get(m.p).push(m.t);
  }
  return Object.entries(G.papers).map(([id, p]) => ({id,
    ti:p.ti || id, jf:p.jf || "", y:p.y || "", says:says.get(id) || []}));
}

/* What came back, checked against the scheme's own list before it is shown.
   A code outside it or a paper the corpus does not hold is counted and
   discarded, which is the path every other proposal on this bench goes
   through. */
function schemeTakeAsk(r, papers){
  const s = r && r.scheme ? r.scheme : r;
  const ts = [];
  const seen = new Set(["--"]);
  for(const t of ((s && s.traditions) || [])){
    const code = String((t && t.code) || "").trim().toLowerCase().slice(0, 12);
    const label = String((t && t.label) || "").trim();
    if(!code || !label || seen.has(code)) continue;
    seen.add(code);
    ts.push({code, label, why:String((t && t.why) || "").trim()});
    if(ts.length >= SCHEME_MAX) break;
  }
  return {name:String((s && s.name) || "").trim(),
    cite:String((s && s.cite) || "").trim(),
    what:String((s && s.what) || "").trim() || "how a paper treats the subject",
    traditions:ts, seen};
}
function assignTake(r, scheme, papers){
  const have = new Set(papers.map(p => p.id));
  const codes = new Set(scheme.traditions.map(t => t.code).concat(["--"]));
  const at = new Map();
  let refused = 0;
  const why = new Map();
  for(const a of ((r && r.assign) || [])){
    const id = String((a && a.paper) || "").trim();
    const code = String((a && a.code) || "").trim().toLowerCase();
    if(!have.has(id) || !codes.has(code)){ refused++; continue; }
    at.set(id, code);
    why.set(id, String((a && a.why) || "").trim().slice(0, 120));
  }
  /* A paper the answer left out is unassigned, which is a value and not a
     blank: the scheme did not place it, and saying so is the honest state. */
  const missed = papers.filter(p => !at.has(p.id)).length;
  for(const p of papers) if(!at.has(p.id)) at.set(p.id, "--");
  return {at, why, refused, missed};
}

function schemeBodyHTML(){
  const o = IMP.out;
  if(o && o.scheme){
    const s = o.scheme, at = o.at;
    const by = {};
    for(const [, c] of at) by[c] = (by[c] || 0) + 1;
    return `
      <div class="pmeta">
        <span><b>${hesc(s.name) || "a classification"}</b><i>${hesc(s.cite) ||
          "no citation given"}</i></span>
        <span class="pchars">sorts papers by ${hesc(s.what)}</span>
      </div>
      <p class="why" style="margin:10px 0"><b>${s.traditions.length}</b> tradition${
        s.traditions.length === 1 ? "" : "s"}, applied to <b>${at.size}</b> paper${
        at.size === 1 ? "" : "s"}${o.refused
          ? `. <b>${o.refused}</b> assignment${o.refused === 1 ? "" : "s"} named a paper or a
             tradition that does not exist and ${o.refused === 1 ? "was" : "were"} discarded`
          : ""}${o.missed
          ? `. ${o.missed} paper${o.missed === 1 ? " was" : "s were"} left out of the answer
             and ${o.missed === 1 ? "is" : "are"} unassigned` : ""}.</p>
      <div class="chain">${s.traditions.concat([{code:"--",
        label:"Unassigned", why:"the scheme does not place these"}]).map(t => `
        <div class="crow">
          <span class="cst ${by[t.code] ? "ok" : "gap"}">${by[t.code] || 0}</span>
          <span class="cnm">${hesc(t.label)}<span class="cfl">${hesc(t.code)}</span></span>
          <span class="cwy">${hesc(t.why || "")}</span>
        </div>`).join("")}</div>
      <p class="why fold" style="margin:10px 0 0">Accepting this <b>replaces</b> the cut the
        corpus shipped with: a second review is a different cut of the same papers, not more
        traditions beside the first. The shipped one goes back with one button on the
        step.</p>
      <div class="pbox" style="max-height:260px;margin-top:10px">
        <table class="plist"><thead><tr>
          <th>paper</th><th>tradition</th><th>what put it there</th>
        </tr></thead><tbody>${[...at].slice(0, 200).map(([id, c]) => `<tr>
          <td>${hesc(String((G.papers[id] || {}).ti || id).slice(0, 70))}</td>
          <td>${hesc(c === "--" ? "unassigned"
            : (s.traditions.find(t => t.code === c) || {}).label || c)}</td>
          <td>${hesc(o.why.get(id) || "")}</td></tr>`).join("")}</tbody></table>
      </div>`;
  }
  const cur = schemeNow();
  return `
    <p class="why" style="margin:0 0 11px">The tradition filter sorts these papers by a
      classification somebody argued for, and a classification is read out of a <b>paper</b>
      rather than out of the corpus. The one standing is ${cur
        ? `<b>${hesc(cur.name) || "one read in here"}</b>` : `the shipped cut, three
        traditions from a review of this literature, applied by hand and recorded in
        <code>index/approaches.tsv</code>`}.</p>
    <p class="why" style="margin:0 0 11px">Reading in another is <b>two asks</b>. The first
      reads the scheme out of the paper: between two and ${SCHEME_MAX} traditions, each with
      a name and what a paper in it does. The second applies it to the
      ${Object.keys(G.papers).length} papers here, on their titles, outlets and what the
      extraction recorded that each one argues. You see both before anything changes.</p>
    <p class="why" style="margin:0 0 11px">It <b>replaces</b> the current cut rather than
      joining it, and one button on the step puts the shipped one back.</p>
    <div class="pways">
      <label class="pway"><b>A PDF</b>
        <input type="file" id="impSchPdf" accept="application/pdf,.pdf">
        <i>read in this browser; the file goes nowhere</i></label>
      <label class="pway"><b>A DOI</b>
        <input type="text" id="impSchDoi" placeholder="10.xxxx/xxxxx" spellcheck="false">
        <i>looked up at Crossref, which gives metadata and not a paper</i></label>
    </div>
    <div class="fld" style="max-width:none;margin-top:9px">
      <span class="ctl-label">Or the text itself</span>
      <textarea class="defbox" id="impSchText" rows="5"
        placeholder="paste the part of the paper that sets out the classification">${
        hesc(IMP.text || "")}</textarea>
    </div>
    ${IMP.meta ? `<div class="pmeta" style="margin-top:9px">
      <span><b>${hesc(IMP.meta.title || "untitled")}</b><i>${
        hesc([IMP.meta.authors, IMP.meta.year, IMP.meta.journal]
          .filter(Boolean).join(" · "))}</i></span>
      <span class="pchars">${(IMP.text || "").length} characters to read</span>
    </div>` : ""}
    <!-- THE ASK LIVES IN THE BODY AND NOT IN THE FOOTER, for the reason every
         other ask on this page does: it carries data-ai and the mark, which
         is what scripts/check_bench.py reads to know that a control calling a
         model says so. A generic footer button could not carry either. -->
    <div class="cmpacts" style="margin:11px 0 0">
      <button type="button" class="edbtn" id="impSchGo" data-ai="scheme"
        ${(IMP.text || "").trim() && AI.cap ? "" : "disabled"}
        title="Two asks. The first reads the scheme out of this text; the second applies it to the ${
          Object.keys(G.papers).length} papers here, on their titles and what each one argues. You see both before anything changes.${AITIP}">${aiMark()}${
        IMP.busy ? hesc(IMP.busy) + "…" : "Read the classification"}</button>
      ${!AI.cap ? `<span class="sp">no model is reachable from this page</span>` : ""}
    </div>`;
}

/* ============================================================ the dialog */
/* WHETHER THERE IS ANYTHING TO ACCEPT, asked in one place because two places
   would disagree: the button's own state and the handler behind it. A CSV read
   with a column unmapped has rows and must not be accepted -- every row would
   arrive missing the field nothing was pointing at. */
function impReady(){
  const o = IMP.out;
  if(!o || o.err) return false;
  if(IMP.mode === "csv") return !(o.missing || []).length && !!(o.rows || []).length;
  if(IMP.mode === "scheme") return !!(o.scheme && o.scheme.traditions.length >= 2 && o.at);
  return !!(o.rows || []).length;
}

function impShow(mode){
  const d = document.getElementById("idlg");
  if(!d) return;
  if(IMP.mode !== mode){ IMP.out = null; IMP.err = ""; IMP.note = ""; }
  IMP.mode = mode;
  if(!IMP.key) IMP.key = String(lsRead(AKEY_OA) || "");
  impDraw(); impWire();
  if(!d.open) d.showModal();
  /* THE CAPABILITY IS ASKED ONCE AND ANSWERS LATER. aiCap() is async, so a
     render that asked it directly would read a Promise -- always truthy -- and
     offer an ask on a page with no model behind it. Everything above reads
     AI.cap, the resolved value, and this is what makes sure it is resolved:
     the dialog redraws when the answer arrives. */
  if(AI.cap === undefined) aiCap().then(() => { impDraw(); impWire(); });
}

const IMPHEAD = {
  stats:["Read the statistics again", "the bibliometric numbers, from OpenAlex"],
  csv:["Import from a search export", "a Scopus CSV or a Web of Science file"],
  scheme:["Read a classification from a paper", "two asks: the scheme, then the corpus"],
};

function impDraw(){
  const b = document.getElementById("idlgbody");
  const h = document.getElementById("idlgh");
  const w = document.getElementById("idlgwhat");
  const go = document.getElementById("idlggo");
  const ok = document.getElementById("idlgok");
  if(!b) return;
  const head = IMPHEAD[IMP.mode] || ["Import", ""];
  if(h) h.textContent = head[0];
  if(w) w.textContent = IMP.busy ? IMP.busy + "…" : head[1];
  b.innerHTML = (IMP.mode === "stats" ? statBodyHTML()
    : IMP.mode === "csv" ? csvBodyHTML()
    : IMP.mode === "scheme" ? schemeBodyHTML() : "") +
    (IMP.err ? `<p class="why" style="color:var(--neg);margin:11px 0 0">${hesc(IMP.err)}</p>` : "") +
    (IMP.note ? `<p class="why" style="margin:11px 0 0">${hesc(IMP.note)}</p>` : "");
  if(go){
    /* ONLY THE STATISTICS USE THIS. The CSV reads itself when a file is chosen
       -- choosing the file IS pressing it -- and the classification's ask lives
       in the body, where it can carry data-ai and the mark that says a model
       is behind it. */
    go.hidden = !!IMP.out || IMP.mode !== "stats";
    go.disabled = !!IMP.busy;
    go.textContent = IMP.busy ? "reading…" : "Read the counts";
  }
  if(ok){
    ok.hidden = !impReady();
    ok.textContent = IMP.mode === "csv"
      ? "Add " + ((IMP.out && IMP.out.rows) || []).length + " to the corpus"
      : IMP.mode === "scheme" ? "Sort the corpus by this"
      : "Accept these counts";
  }
  const dr = document.getElementById("idlgdrop");
  if(dr) dr.hidden = !(IMP.mode === "stats" && statCount() && !IMP.out);
}

/* TWO WAYS OF ATTACHING, AND THE DIFFERENCE IS NOT COSMETIC.

   The dialog's BODY is innerHTML, so every redraw throws its nodes away and
   with them any listener on one: a control in there has to be wired again, and
   addEventListener is right because there is nothing left to accumulate on.

   The FOOTER is not redrawn. Its buttons are in the markup, they survive every
   redraw, and addEventListener on one of them adds a second handler rather
   than replacing the first. The first version of this file did that: pressing
   Read once, after five redraws, sent five rounds of requests to OpenAlex, and
   the test caught it by counting the URLs the stub was handed -- ten where two
   were asked for. So the footer is wired through onclick, which replaces.

   pdlgWire() in 03c-corpus.js had the same shape and is fixed with it. */
function impWire(){
  const on = (id, ev, fn) => { const e = document.getElementById(id);
    if(e) e.addEventListener(ev, fn); };
  const once = (id, fn) => { const e = document.getElementById(id);
    if(e) e.onclick = fn; };
  const redraw = () => { impDraw(); impWire(); };
  /* THROUGH THE HELPER, like every other store on this page: it is the one
     place that can report a browser refusing to keep anything, which is what
     a private window does. The field still works for this one read either
     way, because the value is in IMP and not only in the store. */
  on("impKey", "change", ev => {
    IMP.key = String(ev.target.value || "").trim();
    if(IMP.key) lsWrite(AKEY_OA, IMP.key); else lsDrop(AKEY_OA);
  });
  /* ---- a classification, where the paper comes from -------------------- */
  on("impSchText", "input", ev => {
    IMP.text = String(ev.target.value || "");
    const g = document.getElementById("impSchGo");
    if(g) g.disabled = !IMP.text.trim() || !AI.cap;
  });
  on("impSchDoi", "change", async ev => {
    const d = String(ev.target.value || "").trim();
    if(!d) return;
    IMP.busy = "looking it up at Crossref"; IMP.err = ""; redraw();
    try{
      const r = await doiLook(d);
      if(r.err) IMP.err = r.err;
      else { IMP.meta = r.meta; if(r.text) IMP.text = r.text; }
    }catch(e){ IMP.err = "Crossref did not answer: " + String(e && e.message || e); }
    IMP.busy = ""; redraw();
  });
  on("impSchPdf", "change", async ev => {
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    IMP.busy = "reading the PDF"; IMP.err = ""; redraw();
    try{
      IMP.text = await pdfText(f);
      IMP.meta = Object.assign({}, IMP.meta || {}, {title:f.name.replace(/\.pdf$/i, "")});
    }catch(e){ IMP.err = "that PDF could not be read: " + String(e && e.message || e); }
    IMP.busy = ""; redraw();
  });

  /* The classification's two asks, on the button in the body. Found by id
     rather than by its data-ai attribute, because check_bench.py reads that
     attribute out of the raw source to find controls that call a model, and a
     SELECTOR naming one looks to it like a control with no mark. */
  const sa = document.getElementById("impSchGo");
  if(sa) sa.addEventListener("click", async ev => {
    ev.preventDefault();
    {
      const box = document.getElementById("impSchText");
      if(box && box.value.trim()) IMP.text = box.value;
      const cap = await aiCap();
      if(!cap){ IMP.err = "no model is reachable from this page"; return redraw(); }
      IMP.err = ""; IMP.out = null;
      /* TWO ASKS IN SEQUENCE, each recorded with the prompt that asked for it.
         The second is not sent if the first produced no scheme: there is
         nothing to sort by, and asking anyway would spend a call to be told
         so. */
      IMP.busy = "reading the classification"; redraw();
      let sch = null;
      try{
        const q = AIQ.scheme(IMP.meta || {}, IMP.text);
        const r = await cap.json(q, {modelTier:"complex", cache:false});
        provTake("scheme", q, r);
        sch = schemeTakeAsk(r);
      }catch(e){ IMP.err = "the ask came back empty: " + String(e && e.message || e); }
      if(!IMP.err && (!sch || sch.traditions.length < 2)){
        IMP.err = "that paper does not propose a way of sorting a literature, or not one " +
          "this could read: " + ((sch && sch.traditions.length) || 0) + " tradition(s) came " +
          "back and a classification needs two. Nothing has been written.";
      }
      if(IMP.err){ IMP.busy = ""; return redraw(); }
      IMP.busy = "sorting " + Object.keys(G.papers).length + " papers by it"; redraw();
      try{
        const papers = schemePapers();
        const q2 = AIQ.assign(sch, papers);
        const r2 = await cap.json(q2, {modelTier:"complex", cache:false});
        provTake("assign", q2, r2);
        const got = assignTake(r2, sch, papers);
        IMP.out = {scheme:sch, at:got.at, why:got.why, refused:got.refused,
          missed:got.missed};
      }catch(e){ IMP.err = "the scheme was read and the sorting came back empty: " +
        String(e && e.message || e) + ". Nothing has been written."; }
      IMP.busy = ""; return redraw();
    }
  });

  once("idlggo", async ev => {
    ev.preventDefault();
    const f = document.getElementById("impKey");
    if(f) IMP.key = String(f.value || "").trim();
    IMP.busy = "asking OpenAlex"; IMP.err = ""; IMP.note = ""; redraw();
    try{ IMP.out = await statFetch(IMP.key); }
    catch(e){ IMP.err = String(e && e.message || e); }
    IMP.busy = ""; redraw();
  });
  /* ---- the CSV, which reads itself when a file is chosen ---------------- */
  on("impCsvFile", "change", async ev => {
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    IMP.busy = "reading the file"; IMP.err = ""; IMP.note = ""; redraw();
    try{
      IMP.text = await f.text();
      IMP.name = f.name;
      const got = csvRead(IMP.text, f.name);
      if(got.err){ IMP.err = got.err; IMP.out = null; }
      else if(got.missing.length){
        /* READ IT ANYWAY and say what is missing, because the mapping selects
           are in the result view: refusing the file would hide the one control
           that fixes it. */
        IMP.out = got;
        IMP.err = "no column matched " + got.missing.map(c => c.n).join(" or ") +
          ". Set it below and the table is read again.";
      }
      else IMP.out = got;
    }catch(e){ IMP.err = "that file could not be read: " + String(e && e.message || e); }
    IMP.busy = ""; redraw();
  });
  /* A column set by hand re-reads the whole file, so the table and the
     duplicate count are always what would actually be brought in. */
  document.querySelectorAll("#idlgbody [data-csvcol]").forEach(sel =>
    sel.addEventListener("change", () => {
      if(!IMP.text) return;
      const map = {};
      document.querySelectorAll("#idlgbody [data-csvcol]").forEach(s2 => {
        if(s2.value !== "") map[s2.dataset.csvcol] = +s2.value;
      });
      const re = csvRead(IMP.text, IMP.name, map);
      IMP.out = re.err ? null : re;
      IMP.err = re.err ? re.err : re.missing.length
        ? "no column is set for " + re.missing.map(c => c.n).join(" or ") + "." : "";
      redraw();
    }));

  once("idlgok", ev => {
    ev.preventDefault();
    if(!impReady()) return;
    if(IMP.mode === "scheme"){
      const o = IMP.out;
      const got = schemeTake(o.scheme, [...o.at]);
      xlog("corpus", "Read a classification in from a paper",
        (o.scheme.name || "a classification") + (o.scheme.cite ? " · " + o.scheme.cite : "") +
        " · " + o.scheme.traditions.length + " traditions, " + o.at.size +
        " paper" + (o.at.size === 1 ? "" : "s") + " sorted by it" +
        (o.refused ? ", " + o.refused + " assignment(s) discarded" : "") +
        " — it replaces the shipped cut and one button puts that back");
      IMP.out = null; IMP.text = ""; IMP.meta = null;
      if(got && got.err) IMP.err = got.err;
      const d0 = document.getElementById("idlg"); if(d0) d0.close();
      renderPanel(); refresh();
      return;
    }
    if(IMP.mode === "csv"){
      const o = IMP.out;
      const n = csvApply(o);
      xlog("corpus", "Imported a search export",
        n + " paper" + (n === 1 ? "" : "s") + " from " + (o.name || "a file") +
        (o.dup.length ? ", " + o.dup.length + " already held and skipped" : "") +
        (o.outlets.length ? ", " + o.outlets.length + " new outlet" +
          (o.outlets.length === 1 ? "" : "s") + " added to the frame unticked (" +
          o.outlets.join(", ") + ")" : "") +
        " — metadata only, out of scope until an outlet is ticked");
      IMP.out = null; IMP.text = ""; IMP.name = "";
      const d = document.getElementById("idlg"); if(d) d.close();
      renderPanel(); refresh();
      return;
    }
    const was = IMP.out;
    const n = corpusStats(was.rows);
    xlog("corpus", "Re-read the citation counts",
      n + " paper" + (n === 1 ? "" : "s") + " re-read from OpenAlex on " + was.at +
      (was.unknown.length ? ", " + was.unknown.length + " not held by it" : "") +
      " — attention at a date, laid over the shipped snapshot and reversible");
    IMP.out = null;
    IMP.note = n + " count" + (n === 1 ? "" : "s") + " applied, stamped " + was.at;
    const d = document.getElementById("idlg"); if(d) d.close();
    renderPanel(); refresh();
  });
  once("idlgdrop", ev => {
    ev.preventDefault();
    const n = statsDrop();
    if(n) xlog("corpus", "Restored the shipped citation snapshot",
      n + " re-read count" + (n === 1 ? "" : "s") + " dropped");
    redraw();
    renderPanel(); refresh();
  });
  once("idlgcancel", ev => {
    ev.preventDefault();
    IMP.out = null; IMP.err = "";
    const d = document.getElementById("idlg"); if(d) d.close();
  });
}

export { CSVCOL, IMP, OABATCH, csvRead, csvRows, csvSep, impDraw, impShow, impWire,
  statFetch };

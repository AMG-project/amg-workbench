/* AMG bench, page script: the deposit — what leaves, on what terms, at what address.
   One shared global scope, loaded in order. See page/README.md.

   EVERYTHING ABOVE HAPPENS IN A BROWSER TAB AND DIES WITH IT. The call rules
   out work that cannot be reproduced by others, which makes the last decision a
   curation takes not a modelling decision at all: what leaves, on what terms,
   at an address somebody can cite.

   Step 4.2 set that down as five decisions and said none of it was built. The
   five were right and they were a list, so the step counted "0 of 5 decided"
   forever. What was missing was not an argument. It was the two halves of
   making a decision: somewhere to record it, and something that comes out when
   it is recorded.

   SO FOUR OF THE FIVE ARE DECLARATIONS, in the same shape as every other
   declaration on this bench -- a closed list where the choice is closed, free
   text where it is not, each one carrying who made it and when, travelling in
   the scenario, and reversible. The fifth, what can travel, is not a free
   choice: 52 articles are other people's copyright. It is stated, and the one
   part of it that IS a choice -- whether the verbatim spans go with the claims
   -- is a declaration like the others.

   AND THE THING THAT COMES OUT IS ONE FILE. A deposit of six downloads is six
   chances to ship five of them, so the parts, the record of the five decisions,
   a CITATION.cff and a manifest with a SHA-256 per file go into one zip. The
   zip writer is here, uncompressed, about seventy lines: a store-only archive
   is the format's own simplest case, every tool reads it, and adding a
   compressor would mean carrying one.

   THE MANIFEST IS THE POINT OF THE BUNDLE. A deposit nobody can check is a
   folder. Each part is listed with its size and its digest, computed over the
   bytes that went in, so a reader can verify that what they downloaded is what
   was deposited without trusting this page or the archive it came from. */
import { BENCH, CORPUS, PROV, scenCur } from "./17-scenarios.js";
import { DEPOSIT, PARTS } from "./02-modules.js";
import { boardKept, xlog } from "./05-explore.js";
/* The report is written by page/31-report.js over core/report.js; this only
   says where it goes in the bundle. */
import { reportData, reportMarkdown } from "./31-report.js";
import { G } from "../graph-data.js";
import { VOCAB } from "../core/vocab.js";
import { formsData, formsTag } from "../core/forms.js";
import { lsRead, lsWrite } from "./03-stores.js";
import { recordRows, streamFile } from "./23-exchange.js";
import { NB, nbMarkdown } from "./25-notebook.js";
import { saveText, stamp } from "./16-worklists.js";

/* ------------------------------------------------- the five, as declarations */
/* CLOSED LISTS WHERE THE CHOICE IS CLOSED. A licence is not free text: a
   permissive licence over somebody else's extracted text and a restrictive one
   over the part meant to be reused are the two common failures, and both are
   failures of PICKING, so the picking is from a list with the consequence
   written beside each. */
const CODELIC = [
  ["MIT", "permissive, two paragraphs, no patent grant"],
  ["Apache-2.0", "permissive with an explicit patent grant and a notice requirement"],
  ["BSD-3-Clause", "permissive, and forbids using the authors' names to endorse"],
  ["GPL-3.0-or-later", "anything built on it must ship under the same terms"],
];
const DATALIC = [
  ["CC0-1.0", "the table enters the public domain; nothing is asked in return"],
  ["CC-BY-4.0", "reuse with attribution. Note that a database is not obviously a creative work, which is what makes the next one exist"],
  ["ODbL-1.0", "written for databases: attribution, share-alike, and no technical locks"],
  ["CDLA-Permissive-2.0", "written for data in the same register as a permissive code licence"],
];
const HOSTS = [
  ["github", "GitHub", "carries the code and the history, and lets somebody open an issue against it"],
  ["gitlab", "GitLab", "the same jobs, self-hostable"],
  ["codeberg", "Codeberg", "the same jobs, non-profit"],
  ["none", "none yet", "the deposit is written and has nowhere to sit"],
];
const ARCHIVES = [
  ["zenodo", "Zenodo", "mints a DOI from a release on a Git host in one step, and keeps the state behind it"],
  ["osf", "OSF", "does both jobs, less sharply: a project page and a registration"],
  ["dataverse", "Dataverse", "an institutional archive, where one is available"],
  ["none", "none yet", "nothing mints an identifier, so a citation can only pin to a link"],
];
/* WHETHER THE EXCHANGES SHIP, and the two answers are not symmetrical.
   Shipping makes the run replayable without being paid for twice and makes a
   proposal auditable by somebody who thinks it was wrong. Withholding turns
   the record of how the model was built into a claim about it. */
const TRANSCRIPTS = [
  ["all", "all of them", "every prompt and every answer that was accepted, in full"],
  ["prompts", "the prompts only", "what was asked, without what came back: enough to re-ask, not enough to audit"],
  ["none", "none", "the record of how the model was built becomes a claim about it"],
];

const DEP = {
  host:"", repo:"", archive:"", doi:"",
  code:"", data:"", quotes:"yes", transcripts:"",
  version:"", at:{},
};
const DEPKEY = "purposeDeposit";
const DEPFIELDS = ["host", "repo", "archive", "doi", "code", "data", "quotes",
  "transcripts", "version"];

function depSave(){ lsWrite(DEPKEY, Object.assign({}, DEP)); }
function depLoad(){
  const v = lsRead(DEPKEY);
  if(!v || typeof v !== "object") return;
  depTake(v);
}
const depSnap = () => DEPFIELDS.some(k => DEP[k] && DEP[k] !== "yes")
  ? Object.assign({}, DEP) : null;
function depTake(o){
  for(const k of DEPFIELDS) DEP[k] = "";
  DEP.quotes = "yes"; DEP.at = {};
  if(!o) return;
  for(const k of DEPFIELDS) if(typeof o[k] === "string") DEP[k] = o[k].slice(0, 300);
  if(o.at && typeof o.at === "object") DEP.at = Object.assign({}, o.at);
}
function depSet(k, v){
  if(!DEPFIELDS.includes(k)) return false;
  DEP[k] = String(v == null ? "" : v).slice(0, 300);
  DEP.at[k] = new Date().toISOString().slice(0, 10);
  depSave();
  return true;
}

/* THE FIVE, AND WHETHER EACH IS DECIDED. The second is decided by stating it
   and choosing the one thing in it that is a choice; the other four need a
   value. `0 of 5 decided` was the honest count for a list; this is the honest
   count for a declaration. */
function depState(){
  const got = [
    !!(DEP.host && DEP.archive) && !(DEP.host === "none" && DEP.archive === "none"),
    !!DEP.quotes,
    !!(DEP.code && DEP.data),
    !!DEP.transcripts,
    !!DEP.version,
  ];
  return {got, n:got.filter(Boolean).length, of:DEPOSIT.length};
}
const depDone = () => depState().n === DEPOSIT.length;

/* A VERSION THE PAGE CAN PROPOSE, because what a citation has to pin to is not
   a name somebody invents: it is the state the declarations were in when a
   conclusion was read off them. Bench, corpus and the day, which is the
   coarsest thing that identifies that state, and the scholar can write
   anything over it. */
const depVersion = () => "amg-" + String(BENCH.v || "0").replace(/[^\w.]+/g, "") +
  "+corpus-" + String((CORPUS && CORPUS.commit) || "unknown").slice(0, 12) +
  "+" + new Date().toISOString().slice(0, 10);

/* --------------------------------------------------------------- the files */
const lab = (list, k) => (list.find(x => x[0] === k) || [, k])[1];
const why = (list, k) => (list.find(x => x[0] === k) || [, , ""])[2] || "";

function citationCff(){
  const cur = scenCur() || {};
  const L = ["cff-version: 1.2.0",
    "message: \"If you use this action model, cite the version you used.\"",
    "title: " + q(cur.name || "An action model"),
    "type: dataset",
    "version: " + q(DEP.version || depVersion()),
    "date-released: " + new Date().toISOString().slice(0, 10)];
  if(DEP.doi) L.push("doi: " + q(DEP.doi));
  if(DEP.repo) L.push("repository-code: " + q(DEP.repo));
  L.push("license: " + q(DEP.code || "see DEPOSIT.md"));
  L.push("abstract: " + q("An action model built on this bench: a curated literature, " +
    "the declarations made over it, the arithmetic, and the conclusions with the region " +
    "each holds on. " + Object.keys(G.papers).length + " papers, " + G.claims.length +
    " relationships, " + boardKept().length + " retained findings."));
  L.push("authors:");
  L.push("  - name: " + q("the curator of " + (cur.name || "this project")));
  L.push("# The author block is a placeholder: this page does not know who you are and");
  L.push("# does not ask. Fill it in before depositing.");
  return L.join("\n") + "\n";
}
/* YAML needs quoting it cannot be guessed at. Double quotes, with the two
   characters that break a double-quoted scalar escaped, which is the whole of
   the rule for this subset. */
const q = s => '"' + String(s == null ? "" : s)
  .replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ") + '"';

function depositMd(){
  const cur = scenCur() || {};
  const st = depState();
  const L = ["# The deposit", "",
    "*" + (cur.name || "a project") + " · " + (DEP.version || depVersion()) +
    " · written " + new Date().toISOString().slice(0, 16).replace("T", " ") + "*", "",
    "Everything this model was built from happened in a browser tab. The five " +
    "decisions below are what makes it survive that, and each is a declaration with " +
    "the day it was made. " + st.n + " of " + st.of + " are decided.", ""];
  const rows = [
    ["The address", DEP.host || DEP.archive
      ? lab(HOSTS, DEP.host || "none") + (DEP.repo ? " — " + DEP.repo : "") +
        ", archived at " + lab(ARCHIVES, DEP.archive || "none") +
        (DEP.doi ? " — " + DEP.doi : "")
      : "not decided",
     DEPOSIT[0].w],
    ["The material",
     "the relationships travel, the papers do not" +
     (DEP.quotes === "yes" ? ", and the verbatim spans travel with them"
      : ", and the verbatim spans are withheld"),
     DEPOSIT[1].w],
    ["The licence", DEP.code || DEP.data
      ? "code: " + (DEP.code || "not decided") + " · data: " + (DEP.data || "not decided")
      : "not decided",
     DEPOSIT[2].w],
    ["The transcripts",
     DEP.transcripts ? lab(TRANSCRIPTS, DEP.transcripts) + " — " +
       why(TRANSCRIPTS, DEP.transcripts) : "not decided",
     DEPOSIT[3].w],
    ["The version", DEP.version || "not decided", DEPOSIT[4].w],
  ];
  rows.forEach((r, i) => {
    L.push("## " + (i + 1) + ". " + r[0]);
    L.push("");
    L.push("**" + r[1] + "**" + (DEP.at[DEPFIELDS[i]] ? "" : ""));
    L.push("");
    L.push(String(r[2]).replace(/<[^>]*>/g, ""));
    L.push("");
  });
  L.push("## The bundle", "");
  for(const f of depFiles()) L.push("- `" + f.name + "` — " + f.what);
  L.push("");
  L.push("`MANIFEST.txt` carries a SHA-256 for each of them, computed over the bytes " +
    "that went in, so a reader can check that what they have is what was deposited " +
    "without trusting this page or the archive it came from.");
  L.push("");
  L.push("## The omissions", "");
  L.push("- **The 52 articles.** Other people's copyright. Each relationship names the paper it " +
    "was read from and every paper carries an identifier, so a replicator obtains the " +
    "texts themselves.");
  if(DEP.quotes !== "yes")
    L.push("- **The verbatim spans.** Withheld by the decision above, which means a reader " +
      "cannot check a claim against its source without obtaining the paper first.");
  if(DEP.transcripts === "none")
    L.push("- **The exchanges with language models.** Withheld by the decision above. The " +
      "record of how this model was built is therefore a claim about it rather than a " +
      "record of it.");
  else if(DEP.transcripts === "prompts")
    L.push("- **The models' answers.** Only the prompts travel, which is enough to " +
      "re-ask and not enough to audit.");
  return L.join("\n") + "\n";
}

function depositJson(){
  const cur = scenCur() || {};
  const st = depState();
  return JSON.stringify({
    format:"amg-deposit", v:1,
    version:DEP.version || depVersion(),
    decided:st.n, of:st.of,
    where:{host:DEP.host || "", repository:DEP.repo || "",
      archive:DEP.archive || "", doi:DEP.doi || ""},
    travels:{claims:true, constructs:true, signatures:true,
      quotes:DEP.quotes === "yes", papers:false,
      note:"The papers are other people's copyright. Each relationship names the paper it was " +
        "read from, so a replicator obtains the texts."},
    licence:{code:DEP.code || "", data:DEP.data || ""},
    transcripts:DEP.transcripts || "",
    counts:{papers:Object.keys(G.papers).length, constructs:G.nodes.length,
      claims:G.claims.length, findings:boardKept().length,
      exchanges:PROV.length, notebook:NB.cells.length},
    declared_on:Object.assign({}, DEP.at),
    provenance:{bench:BENCH.v, corpus:(CORPUS && CORPUS.commit) || "",
      scenario:cur.name || "", forms:formsTag(), at:new Date().toISOString()},
  }, null, 1);
}

/* WHAT GOES IN, AND THE TWO THINGS THE DECISIONS CHANGE ABOUT IT. The
   transcripts are in the scenario file, so withholding them means rewriting
   that file rather than leaving one out; the quotes are in the stream. Both are
   done by building the text and then taking the part out, because the alternative
   is a second producer per format and those drift. */
function depFiles(){
  const out = [];
  /* THE REPORT FIRST, because it is the one file here a reviewer reads rather
     than parses, and the only one that holds the whole argument in one place.
     Everything after it is material the report points into or the record of
     how the curation got there. */
  out.push({name:"REPORT.md",
    what:"the action model, reported: every retained finding with its warrant underneath",
    text:() => reportMarkdown()});
  out.push({name:"report.json",
    what:"the same, as data, with every interval enclosure the prose summarises",
    text:() => reportData()});
  out.push({name:"DEPOSIT.md", what:"the five decisions, with the reason for each",
    text:() => depositMd()});
  out.push({name:"deposit.json", what:"the same, as data",
    text:() => depositJson()});
  out.push({name:"CITATION.cff", what:"the version a citation pins to",
    text:() => citationCff()});
  /* THE REGISTRY OF FORMS, by value and not by reference. Every robustness
     number in this bundle is a claim about fifteen expressions, and a deposit
     that names them without carrying them asks a reader to find the right
     version of this bench before they can check anything. */
  out.push({name:"forms.json",
    what:"the classes of functional form every robustness number here was read against",
    text:() => JSON.stringify({format:"amg-forms", v:1, tag:formsTag(),
      properties:VOCAB.properties.slice(), families:formsData()}, null, 1)});
  for(const p of PARTS){
    if(!p.has() || !p.text) continue;
    out.push({name:p.file, what:p.f,
      text:() => p.k === "scen" ? scenForDeposit() : p.text()});
  }
  out.push({name:"stream.json",
    what:"the literature as material: constructs with their signatures, relationships with " +
      (DEP.quotes === "yes" ? "their quotes" : "their quotes withheld") + " and scores",
    text:() => streamForDeposit()});
  out.push({name:"record.json", what:"every decision this curation took, as data",
    text:() => JSON.stringify({format:"amg-record", v:1,
      decisions:recordRows()}, null, 1)});
  if(NB.cells.length) out.push({name:"notebook.md",
    what:"the findings in the order the curator chose, with the reading between them",
    text:() => nbMarkdown()});
  return out;
}
function streamForDeposit(){
  if(DEP.quotes === "yes") return streamFile();
  const o = JSON.parse(streamFile());
  for(const c of (o.claims || [])) c.quote = "";
  o.withheld = "The verbatim spans were withheld by the deposit's second decision. A " +
    "relationship cannot be checked against its source without obtaining the paper.";
  return JSON.stringify(o, null, 1);
}
function scenForDeposit(){
  const t = PARTS.find(p => p.k === "scen");
  const src = t ? t.text() : "{}";
  if(DEP.transcripts === "all" || !DEP.transcripts) return src;
  const o = JSON.parse(src);
  if(Array.isArray(o.provenance)){
    if(DEP.transcripts === "none") o.provenance = [];
    else for(const p of o.provenance) p.answer = "";
  }
  o.withheld = DEP.transcripts === "none"
    ? "Every exchange with a language model was withheld by the deposit's fourth decision."
    : "The answers were withheld by the deposit's fourth decision; the prompts travel.";
  return JSON.stringify(o, null, 1);
}

/* ------------------------------------------------------------------ the zip */
/* A STORE-ONLY ARCHIVE, which is the format's own simplest case: a local
   header and the bytes for each entry, then a central directory, then an end
   record. Every tool reads it. Adding a compressor would mean carrying one, and
   this bundle is text that an archive will store compressed anyway.

   The crc table is built once and the whole thing is bytes rather than
   strings, because a deposit has to be byte-identical to its own digest. */
let CRCT = null;
function crcTable(){
  if(CRCT) return CRCT;
  CRCT = new Uint32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    CRCT[n] = c >>> 0;
  }
  return CRCT;
}
function crc32(b){
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for(let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const utf8 = s => new TextEncoder().encode(String(s == null ? "" : s));

function zipStore(entries){
  const parts = [], dir = [];
  let at = 0;
  const u16 = v => [v & 0xFF, (v >>> 8) & 0xFF];
  const u32 = v => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
  for(const e of entries){
    const name = utf8(e.name), body = e.bytes;
    const crc = crc32(body);
    /* No date in the header, deliberately: a zip whose bytes change because the
       clock moved cannot be checked against a digest somebody wrote down. */
    const loc = [].concat([0x50, 0x4B, 0x03, 0x04], u16(20), u16(0x0800), u16(0), u16(0),
      u16(0), u32(crc), u32(body.length), u32(body.length), u16(name.length), u16(0));
    parts.push(new Uint8Array(loc), name, body);
    dir.push({name, crc, size:body.length, at});
    at += loc.length + name.length + body.length;
  }
  const cen = [];
  let dirLen = 0;
  for(const d of dir){
    const h = [].concat([0x50, 0x4B, 0x01, 0x02], u16(20), u16(20), u16(0x0800), u16(0),
      u16(0), u16(0), u32(d.crc), u32(d.size), u32(d.size), u16(d.name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(d.at));
    cen.push(new Uint8Array(h), d.name);
    dirLen += h.length + d.name.length;
  }
  const end = new Uint8Array([].concat([0x50, 0x4B, 0x05, 0x06], u16(0), u16(0),
    u16(dir.length), u16(dir.length), u32(dirLen), u32(at), u16(0)));
  const all = parts.concat(cen, [end]);
  const total = all.reduce((t, x) => t + x.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for(const x of all){ out.set(x, o); o += x.length; }
  return out;
}

/* THE MANIFEST, over the bytes that went in. SHA-256 through the browser's own
   digest, which every browser that can run this page has. */
async function sha256(b){
  if(!(window.crypto && window.crypto.subtle)) return "";
  const h = await window.crypto.subtle.digest("SHA-256", b);
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function depositBundle(){
  const want = depFiles();
  const entries = [];
  const errs = [];
  for(const f of want){
    let t = "";
    try{ t = f.text(); }
    catch(e){ errs.push(f.name + ": " + (e && e.message || e)); continue; }
    entries.push({name:f.name, what:f.what, bytes:utf8(t)});
  }
  const L = ["# MANIFEST — " + (DEP.version || depVersion()),
    "# One line per file: SHA-256, bytes, name. Computed over the bytes in this",
    "# archive, so a reader can check what they have against what was deposited",
    "# without trusting the page that wrote it or the archive it came from.",
    "#", "# shasum -a 256 -c MANIFEST.txt   (after stripping these comments)", "#"];
  for(const e of entries)
    L.push((await sha256(e.bytes)) + "  " + String(e.bytes.length).padStart(9) + "  " + e.name);
  if(errs.length){
    L.push("#");
    L.push("# " + errs.length + " part(s) could not be written and are not in this archive:");
    for(const e of errs) L.push("#   " + e);
  }
  entries.push({name:"MANIFEST.txt", what:"a digest per file", bytes:utf8(L.join("\n") + "\n")});
  return {bytes:zipStore(entries), entries, errs};
}

/* The anchor path rather than saveText, because this is bytes. The downloads
   capability is tried first and a refusal falls through, which is the same
   contract saveText keeps for text. */
async function saveBytes(bytes, name, btn){
  const say = m => { if(btn){ const was = btn.innerHTML; btn.textContent = m;
    setTimeout(() => { btn.innerHTML = was; }, 2600); } };
  try{
    const cap = await (window.claude && window.claude.use
      ? window.claude.use("downloads") : null);
    if(cap){ await cap.save({filename:name, data:bytes}); say("saved"); return true; }
  }catch(e){ /* declined or unavailable: the anchor below still offers it */ }
  try{
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([bytes], {type:"application/zip"}));
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("saved");
    return true;
  }catch(e){ say("could not save it"); return false; }
}

async function exportDeposit(btn){
  const cur = scenCur() || {};
  const slug = String(cur.name || "action-model").replace(/[^\w.-]+/g, "-").toLowerCase();
  const got = await depositBundle();
  await saveBytes(got.bytes, `${slug}-deposit-${stamp()}.zip`, btn);
  const st = depState();
  xlog("deposit", "Wrote the deposit",
    got.entries.length + " files in one archive, " + got.bytes.length + " bytes, " +
    st.n + " of " + st.of + " decisions declared" +
    (DEP.quotes === "yes" ? ", quotes travel" : ", quotes withheld") +
    (DEP.transcripts ? ", transcripts: " + DEP.transcripts : "") +
    (got.errs.length ? ", " + got.errs.length + " part(s) refused" : ""));
  return got;
}

export { ARCHIVES, CODELIC, DATALIC, DEP, DEPFIELDS, HOSTS, TRANSCRIPTS,
  citationCff, crc32, depDone, depFiles, depLoad, depSave, depSet, depSnap,
  depState, depTake, depVersion, depositBundle, depositJson, depositMd,
  exportDeposit, saveBytes, zipStore };

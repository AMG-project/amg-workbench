/* AMG bench, page script 4 of 22: state, persistence, the opening, and the corpus listed.
   One shared global scope, loaded in order. See page/README.md. */
import { hesc } from "../core/safe.js";
import { G } from "../graph-data.js";
import { okPaper } from "./03c-corpus.js";

/* ------------------------------------------ the browser's own store */
/* Sixteen stores keep state in this browser, and each one used to write its
   own four lines: a try, a JSON.stringify, a setItem, and an empty catch.

   The duplication was the smaller half of the problem. Every one of those
   catches discarded the reason, so a store that had stopped persisting was
   indistinguishable from a store with nothing in it yet -- which is how the
   attached full texts went a week unwritten while the page reported no errors
   at all. The same four copied lines are also what gave two different stores
   the same pair of function names.

   One writer, one reader, one remover, and a list of what failed. Storage can
   legitimately be unavailable -- a private window, blocked site data, a full
   quota -- and the bench has to keep working, so these never throw. They do
   not stay quiet either: LSFAIL keeps every failure with its reason and the
   console is told once, because "the page works and nothing is being saved" is
   the one failure a curator cannot see from the screen. */
/* An (i) and the text behind it. The text is the icon's sibling rather than
   its child, so the hover target stays a 15px circle and the markup inside
   survives without being escaped into an attribute. */
const INFI = `<span class="inf" tabindex="0" aria-label="more">i</span>`;
const infold = h => INFI + `<span class="infx">` + h + `</span>`;

/* ONE PLACE A FAILURE IS RECORDED, AND IT IS ON THE PAGE.

   The storage helpers below already did the right thing and kept their
   failures in a list. Two problems with that. The list was only about
   storage, while 23 other catch blocks across the page swallowed their error
   whole. And the record went to the console, which a reviewer opening the
   workbench will not look at -- so "the page works and nothing is being
   saved" stayed the one failure nobody can see from the screen.

   noteFail is that list for everything. `where` is a short stable label
   ("write purposeBoard", "the worklist", "carry/state"), because the console
   is warned once per `where` and a render that fails on every pass would
   otherwise fill it. LSFAIL stays the array and lsFail stays a caller, so
   nothing that reads either changes.

   failBar() renders NOTHING while nothing has failed, which is what keeps a
   normal run -- and the page walk's snapshot -- unchanged. */
const LSFAIL = [];
const FAILSEEN = new Set();
function noteFail(where, e){
  const why = String((e && e.message) || e || "no reason given");
  LSFAIL.push({what:"", key:String(where), where:String(where), why,
    at:new Date().toISOString().slice(11, 16)});
  if(LSFAIL.length > 200) LSFAIL.shift();
  if(!FAILSEEN.has(String(where))){
    FAILSEEN.add(String(where));
    if(typeof console !== "undefined" && console.warn)
      console.warn(`bench: ${where} failed \u2014 ${why}`);
  }
}
function lsFail(what, key, e){
  noteFail(what + " " + key, e);
  const last = LSFAIL[LSFAIL.length - 1];
  if(last){ last.what = what; last.key = key; }
}
/* The status line. Empty until something has failed, and then one sentence
   that opens into the list. Nothing here is a panel: it is the line that
   says the page is not saving, where a curator will see it. */
function failBar(){
  if(!LSFAIL.length) return "";
  const n = LSFAIL.length;
  const seen = [];
  for(const f of LSFAIL) if(!seen.some(x => x.where === f.where)) seen.push(f);
  return `<details class="failbar"><summary><b>${n}</b> thing${n === 1 ? "" : "s"}
    could not be saved, loaded or drawn. The rest of the page is working.</summary>
    <ul>${seen.slice(0, 12).map(f =>
      `<li><b>${hesc(f.where)}</b> \u2014 ${hesc(f.why)}${f.at ? " (" + hesc(f.at) + ")" : ""}</li>`
    ).join("")}${seen.length > 12 ? `<li>and ${seen.length - 12} more</li>` : ""}</ul>
    </details>`;
}
/* true if it was written. The only caller that acts on the answer is hsave(),
   which sheds the oldest history and tries once more. */
function lsWrite(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e){ lsFail("write", key, e); return false; }
}
/* The parsed value, or undefined for absent, unreadable or unparsable -- which
   a caller treats alike: it has nothing, so it keeps the default it started
   with. */
function lsRead(key){
  try{ const raw = localStorage.getItem(key);
       return raw == null ? undefined : JSON.parse(raw); }
  catch(e){ lsFail("read", key, e); return undefined; }
}
function lsDrop(key){
  try{ localStorage.removeItem(key); return true; }
  catch(e){ lsFail("drop", key, e); return false; }
}
/* ---------------------------------------------------------------- state */
const LVL   = {field:"--steel", firm:"--ink", team:"--ochre", individual:"--ind"};
const LRANK = {field:0, firm:1, team:2, individual:3};
const LORDER = ["field","firm","team","individual"];
/* There is no "institutional" level in the corpus: `field` is the one that
   does that work (51 constructs), and the word "institutional" appears only
   inside bearers — "the corporation as an institutional order",
   "institutional-setting". Adding one would be a coding decision, not a
   display decision, so it is not made here. */
const LNOTE = {field:"field / society", firm:"firm", team:"team", individual:"individual"};

/* A construct's cost and anchor, averaged over the claims that touch it.
   Claims carry these; constructs do not, so it is computed once here. */
const KQ = (() => {
  const acc = new Map();
  G.claims.forEach(c => [...(c.a || []), ...(c.c || [])].forEach(i => {
    const r = acc.get(i) || {k:0, q:0, s:0, m:0, n:0};
    r.k += c.sp + c.cm; r.q += c.ea; r.s += c.sp; r.m += c.cm; r.n++; acc.set(i, r); }));
  const out = new Map();
  acc.forEach((r, i) => out.set(i,
    {k:r.k / r.n, q:r.q / r.n, s:r.s / r.n, m:r.m / r.n}));
  return out;
})();
/* The year a construct first appears in the corpus. Papers carry years;
   constructs do not, so it is the earliest paper that uses it. */
const YEAR = (() => {
  const out = new Map();
  G.nodes.forEach(n => {
    const ys = (n.p || []).map(sl => +((G.papers[sl] || {}).y)).filter(y => y > 1900);
    if(ys.length) out.set(n.i, Math.min(...ys));
  });
  return out;
})();
/* Cited attention standing behind a construct: the citations of the papers
   that use it, summed. A paper counts once for each construct it names, which
   is the point — the question is how much citation weight is behind this
   quantity, not how many citations the corpus has. */
/* Citations behind a CONSTRUCT, not behind a claim: take the distinct papers
   in which the construct appears at all, in scope, and add their citation
   counts. Each paper counts once however many claims it makes with the
   construct, and a paper counts for every construct it names. It reads as
   "how much cited attention stands behind this quantity". */
const citeOf = (n, f) => {
  const ps = new Set(n.mem.flatMap(m => (N.get(m.i) || {}).p || []));
  let t = 0;
  ps.forEach(sl => { const p = G.papers[sl]; if(p && okPaper(sl)) t += (p[f] || 0); });
  return t;
};

const yearOf = n => {
  const vs = n.mem.map(m => YEAR.get(m.i)).filter(Boolean);
  return vs.length ? Math.min(...vs) : null;
};

/* Arrows touching a construct, at the current scope. Rebuilt by build(). */
const DEG = new Map();

const kqOf = (n, f) => {
  const vs = n.mem.map(m => KQ.get(m.i)).filter(Boolean).map(r => r[f]);
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
};

/* Each X axis is a reading of the same constructs. They are alternatives, not
   settings: which one you pick is a question about the literature. */
/* One set of readings, usable on either axis. A reading is either a number
   (a scale) or a category (columns or bands); nothing else is needed. Which
   one you put on which axis is the question you are asking of the corpus. */
/* The two calendar years the citation counts refer to, named by the data
   rather than written into the interface, so they do not go stale. */
const CY = Object.assign({now:new Date().getFullYear(), last:new Date().getFullYear() - 1},
                         G.cyears || {});

/* THE CLUSTER READING, filled in by page/22-communities.js.

   AXES lives in this file and the clustering cannot: 22-communities reads
   this file, so nothing here may read it back. The entry therefore carries a
   hook rather than an import, and `cats` is mutated in place so that the
   array AXES holds stays the array AXES holds. */
const COMAX = {cats:[], of:() => null, label:c => c};
const AXES = {
  none:   {label:"nothing",
           why:"No constraint on this axis — the force settles it, and a position along it means nothing."},
  level:  {label:"level of analysis", cat:LORDER, catOf:n => n.level,
           catLabel:c => LNOTE[c],
           why:"Field or society, then firm, team, individual. A merge across two of these is the error the bench exists to make visible: reaching a firm-level quantity from an individual-level one needs a composition rule the literature does not supply. The corpus has no institutional level — field does that work."},
  com:    {label:"cluster", cat:COMAX.cats, catOf:n => COMAX.of(n),
           catLabel:c => COMAX.label(c),
           why:"Which cluster a construct fell into, from the clustering declared in the inspector. Nothing is read here until a clustering has been run, and it is a READING rather than a merge: the members stay separate constructs and the model does not change."},
  ap:     {label:"research tradition", cat:["st","ex","dm","--"], catOf:n => n.ap,
           catLabel:c => (G.approaches[c] && G.approaches[c].l) || "unassigned",
           why:"Which of the three traditions the papers using the construct work in, read from Durand & Huynh (2024). Categories, not a scale: decision-making is not further along than statement-centric."},
  year:   {label:"year", of:yearOf, lo:null, hi:null,
           why:"The year of the earliest paper in the corpus to use the construct. Low is what the literature arrived with; high is what it coined while writing about purpose — and something coined in 2023 has had no time to be picked up, so a high position is not yet evidence of anything."},
  cites:  {label:"number of citations", of:n => citeOf(n, "cb"), lo:0, sq:true,
           why:"Not the citations of a relationship \u2014 of the <b>construct</b>: take every paper in scope that uses it, count each paper once however many relationships it makes with it, and add their citation counts. From OpenAlex, 19 October 2026. It reads as attention, not standing: a construct scores high either because many papers use it or because one very highly cited paper happens to name it, and the plot cannot tell you which. Scopus and Web of Science carry counts too, but their records are licensed and cannot be redistributed, so the shipped number is the open one, and it runs lower than Google Scholar and higher than Crossref."},
  citesLY:{label:`citations in ${CY.last}`, of:n => citeOf(n, "cly"), lo:0, sq:true,
           why:`The same sum over the construct's papers, restricted to ${CY.last} \u2014 the last complete calendar year, exactly as OpenAlex reports it, with nothing interpolated. A complete year is the fair comparison: it separates what the field is using now from what was used once and is still being counted.`},
  citesYr:{label:`citations in ${CY.now} so far`, of:n => citeOf(n, "cy"), lo:0, sq:true,
           why:`The same sum over the construct's papers, restricted to ${CY.now} to date — the sharpest recency reading and the noisiest. A partial year is a small sample and indexing lag undercounts the most recent weeks, so read it beside ${CY.last} rather than on its own.`},
  papers: {label:"number of papers", of:n => n.papers.length, lo:1, sq:true,
           why:"How many papers in scope use the construct, on a square-root scale because the distribution is long-tailed. High means the field has converged on a name; low means one paper coined it and nothing has been compared against it since."},
  claims: {label:"number of relationships", of:n => n.nc, lo:1, sq:true,
           why:"How many extracted relationships touch the construct. Not the same reading as the number of papers: one empirical paper can carry a dozen relationships about one quantity, which makes it load-bearing within a study without making it shared."},
  degree: {label:"arrows touching it", of:n => DEG.get(n.id) || 0, lo:0, sq:true,
           why:"How many relations run to or from the construct at the current scope. This is what centrality means here: a construct nothing points at cannot be reached from the rest of a model, whatever its standing in the literature."},
  spec:   {label:"specification settled", unit:"of 4", of:n => 4 - kqOf(n, "s"), lo:0, hi:4,
           why:"Averaged over the relationships that touch it: what the papers left you to decide about the FORM of the relation — no functional form, several antecedents with no combination rule, a moderator, no direction at all. High blocks a modeller; an empiricist can choose a specification and defend it."},
  comm:   {label:"commensurability settled", unit:"of 4", of:n => 4 - kqOf(n, "m"), lo:0, hi:4,
           why:"Averaged over the relationships that touch it: how far the two constructs a relationship joins already agree on <b>level of analysis, units of measurement and time structure</b> — the same level, no aggregation rule owed, no stock paired with a flow, no unordered scale. This is the one that blocks a modeller and an empiricist alike, and the commonest defect here: only 23% of relationships are clean on all four."},
  evid:   {label:"evidence", unit:"of 4", of:n => kqOf(n, "q"), lo:0, hi:4,
           why:"Averaged over the relationships that touch it: a point each for carrying a magnitude, being estimated from the paper's own data, being first-hand rather than relayed, and stating where it holds. High is what an empiricist can build on; a modeller can work from an asserted relation and say so."},
  settled:{label:"settled, both", unit:"of 8", of:n => 8 - kqOf(n, "k"), lo:0, hi:8,
           why:"Specification and commensurability added — how much the papers settled before you have to invent anything. Eight means the relationship could be written down as it stands."}
};

/* Pairs worth looking at, so the two menus are not twelve-by-twelve guesswork.
   Each is a question, and the name is the short form of it. */
/* HOW THE MAP IS LAID OUT, which is a different question from what the axes
   read. Network is what the map already does with both axes set to nothing:
   the axis pull drops to 0.045 and the arrow springs take over. It is a
   LAYOUT rather than a pair of axis values, so that going back to Axes
   restores the axes the scholar had rather than the word "none".

   Clusters is Task 3's and the slot is here so the choice is visible as
   something coming rather than absent. */
const LAYOUTS = [
  ["axes", "Axes", "Two readings of the constructs, one on each axis, chosen in the menus below."],
  ["network", "Network", "No axes. Arrows pull linked constructs together and everything else pushes apart, so what the picture shows is which constructs are joined rather than how they score."],
  ["clusters", "Clusters", "Groups of constructs that share papers and arrows, drawn in their own regions. Not built yet."]
];
const PRESETS = [
  /* THE OPENING VIEW, AS A PRESET. Step 1.2 opens on papers against level and
     that matched none of the six, so under the new rule the step would have
     opened on Manual with every menu showing, which is the opposite of what
     was asked for. */
  {k:"bylevel",     n:"Shared, by level", x:"papers", y:"level",
   why:"How many papers use each construct, at each level of analysis. Merging is safest within one row: two constructs at different levels are not measuring the same kind of thing."},
  {k:"modellable",  n:"Ready to model", x:"spec",    y:"comm",
   why:"The two settled scores against each other. The top-right corner is what could be written down with nothing invented — 27 relationships of 1080, 2.5%. That emptiness is the finding."},
  {k:"evidence",    n:"Ready to test",  x:"comm",    y:"evid",
   why:"What stands behind a relationship, against whether the two constructs it joins are commensurable. The top-right corner is what an empiricist could use as it stands, and the corpus puts almost nothing there at firm level."},
  {k:"established", n:"Shared and cited", x:"papers",  y:"cites",
   why:"Shared across papers and cited. The top right is what the field agrees it is talking about; everything else is one team's vocabulary."},
  {k:"dynamism",    n:"Hot avenues", x:"year",    y:"citesLY",
   why:`What the field is paying attention to in ${CY.last}. Top right: new and already cited, the avenues moving now. Top left: old and still cited, the classics. Bottom right: new and not cited yet, which says nothing yet, because it has had no time.`},
  /* The label stays "Connected vs shared", which names the two axes; the
     reading under it is the one that says more than the label does. */
  {k:"central",     n:"Connected vs shared", x:"degree",  y:"papers",
   why:"Whether a construct does work in an argument or only gets named. Many papers but few arrows: a label the field uses without saying what it causes or what causes it. Many arrows but few papers: a mechanism only one team relies on. Top right: shared and connected, the backbone of the literature."},
  {k:"disciplinary",n:"Tradition by level of analysis", x:"ap",    y:"level",
   why:"Tradition against level of analysis. Shows whether the three traditions are arguing about the same thing or working at different levels and passing each other."}
];
const APC   = {st:"--ap-st", ex:"--ap-ex", dm:"--ap-dm", "--":"--ap-x"};
const TONE  = {pos:"--pos", neg:"--neg", nul:"--faint", amb:"--ochre"};
const cssv  = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* EVERY CONSTRUCT BY ID, AND IT HAS TO BE REBUILT WHEN THE CORPUS CHANGES.

   This was built once while the file loaded, which was right while there was
   one corpus that never moved. It is not any more: corpusApply() rebuilds
   G.nodes from the shipped payload plus whatever was added, and the map went
   on holding the shipped ones alone -- so a construct read in from a paper or
   a search export was missing from twenty-one readers of this map. Nothing
   threw. A cluster whose representative was an added construct drew with no
   definition, and step 1.2's ranking put it where it puts a name the registry
   does not hold, which is exactly what it was not.

   Mutated rather than rebound, because fifteen files import this binding and
   an import cannot be reassigned. nRebuild() is called by corpusApply(). */
const N     = new Map();
function nRebuild(){
  N.clear();
  for(const n of (G.nodes || [])) N.set(n.i, n);
  return N.size;
}
nRebuild();
const JALL  = new Set(G.journals.map(j => j.f));
const pap   = s => G.papers[s] || {a:s, y:"", j:"", jf:"", d:""};

const state = {
  stage: 1,
  // 1 — scope
  jr: new Set(JALL), ap:"all", minp: 2,
  // 2 — one notion
  tight: 0.15, tool:"explore", collapse:false,
  // 3 — keep what a model can carry
  ev:"all", sgn:"all", core:false, hideIso:true,
  // each bar decides for itself what happens to a claim that fails it
  apply: {Comm:"dim", Spec:"dim", Evid:"dim"},
  // how many of the important components each bar asks for, and the standing
  // of each component within it
  bar:  {Comm:0, Spec:0, Evid:0},
  need: {Comm:{}, Spec:{}, Evid:{}},
  // which of the model's relations are handed to step 2.1, and the smallest
  // difference the theory is taken to be about
  msel: new Set(), matter: 0, recOpen: false,
  // composed relations: how many links a chain may use, and what each link must
  // have behind it. One hop is off -- only what a paper actually joins.
  hops: 1, solid: "estimated", comp: new Set(),
  // which collapsed sign-blocks are expanded. A view, not a decision.
  clOpen: new Set(),
  // pairs whose full relationship taxonomy is unfolded for declaring
  relOpen: new Set(),
  // what is typed into the constructs filter. A view, not a decision.
  cq: "",
  // which half of step 3.1 is open: the quantities or the mechanisms. A view.
  dec: "vars",
  // construct ids admitted by hand although they are under the threshold
  admit: new Set(),
  // each step asks its own decisions; these are the folds on those lists
  /* CLOSED BY DEFAULT. What is flagged at a step is a consequence of a setting
     the scholar has not ruled on, which is worth having and is not the step's
     own work -- open on arrival it is the last thing on step 1.3 and reads
     as a list of outstanding chores. */
  wlOpen: {1:false, 2:false, 3:false}, wgtOpen: true, floorOpen: false,
  /* THE MAP, ON STEP 2.1 ONLY. That step's work is choosing what a model is
     assembled from, and the diagram beside it is there to check the choice
     rather than to make it: "the map should be
     hidden by default for the step 2. It is distracting." */
  mapOn: false,
  // view
  focus:null, hops:1, pinned:null,
  // the map's two axes: level of analysis down the left, and one of several
  // readings of a construct across the bottom
  /* THE MAP OPENS ON ITS CLUSTERS. The axes it would otherwise read are kept
     rather than replaced, so the first of the seven score readings restores
     the view this shipped with. */
  xAxis:"papers", yAxis:"level", layout:"clusters", cBy:"ap", sBy:"claims",
  /* Which half of step 4.1 is showing: the findings, or the notebook they
     would be written up in. A view, not a decision. */
  fin:"findings",
  /* Which half of step 3.2 is showing: the reading, or the working list. The
     reading is the default, so somebody who does not write models meets words
     rather than a buffer. */
  der:"read", rankOpen:false,
  pSort:{k:"y", d:-1}, axBold:true, papersOpen:true, hoffOpen:false, selOpen:true
};
const picked = new Set();   // construct ids chosen by hand, pending a group


export { APC, AXES, citeOf, COMAX, cssv, CY, DEG, failBar, FAILSEEN, INFI, infold, JALL, KQ, kqOf, LAYOUTS, LNOTE, LORDER, LRANK, lsDrop, LSFAIL, lsFail, lsRead, lsWrite, LVL, N, noteFail, nRebuild, pap, picked, PRESETS, state, TONE, YEAR, yearOf };

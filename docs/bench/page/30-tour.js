"use strict";
/* GUIDED TOURS, OVER THE PURPOSE PROJECT.
   ==========================================================================

   A tour loads the demonstration and shows, on the areas of the screen
   themselves, what the scholar should pay attention to. Three of them, not
   five.

   THREE, NOT FIVE. The chain has three acts and the five tours cut across
   them. Three walks cover all four personas with no gap. The
   refusals tour is gone as a walk and survives as the subject of four stops,
   which is where a refusal belongs: it is a property of a derivation, not a
   separate journey.

   WHAT A STOP DOES NOW. It used to move the page to a step and circle one
   control. Three things were added, and each is why the scripts read as they
   do:

     SEVERAL AREAS, EACH LABELLED. The eye should go to the slider, then to
       the count it changes, then to the line that carries the count forward.
       One hole cannot say that.
     THE TOUR PRESSES REAL CONTROLS (`does`). A caption claiming a refusal is
       weaker than the refusal on screen.
     SOME PRESSES ARE THE READER'S (`yours`). The control is ringed, the
       caption says what will happen, and the tour waits. A reader who pressed
       Derive themselves knows where it is.

   WHAT A TOUR IS. The real page, dimmed, with the marks cut out of the dim so
   the controls under them are legible AND clickable, and a caption beside
   them. The tour moves the page with `state.stage` and `renderPanel()` -- the
   same door every test drives it through -- so nothing is mocked and nothing
   is a screenshot. Press through it and the workbench is in the state the last
   stop left it in, which is the point: a tour that reset would be a video.

   WHY OVER THE PURPOSE PROJECT. Every stop has to point at something real. On
   an empty workbench most of these controls are absent or disabled, and a tour
   that circles an empty panel teaches nothing. So opening a tour opens that
   project first, and WAITS for it rather than guessing at how long it takes.

   THE ANCHORS ARE CHECKED. Every selector below -- in `look`, in `does` and in
   `yours` -- is one the page must actually draw; `scripts/check_bench.py`
   fails the build when one names nothing, for the same reason it already fails
   on a wired control that does not exist. A tour pointing at a control that
   was renamed is worse than no tour. ================================= */
import { hesc } from "../core/safe.js";
import { aiMark } from "./08-ask.js";

/* A stop. `stage` is the step and `fin`/`dec` the tabs two steps open on, set
   before the render rather than after, so the control is there when the marks
   go looking for it.

   `look` is the areas, in reading order: the first is the subject and the rest
   are what it bears on. `lab` is the two or three words pinned beside each.
   `does` is a selector the TOUR presses before the caption appears. `yours` is
   one the READER presses, with `then` saying what will happen. */
const TOURS = [
  {id:"core", name:"Build the core model",
   why:"Start from a literature, choose its constructs, and keep the relationships of interest.",
   stops:[
    /* ---- 1.1 Scope the literature ------------------------------------- */
    {stage:1, ai:true,
     look:[{at:"#papersec", lab:"52 papers on corporate purpose"},
           {at:"#impMenu", lab:"bring in another"},
           {at:"#addPaper", lab:"an LLM reads a paper you give it"},
           {at:"#addPaper .aim", lab:"this mark: an LLM works here"}],
     say:"<b>The purpose literature is already loaded: 52 papers from twelve journals.</b> These papers can be loaded in bulk with a csv file or one by one (PDF, DOI or pasted test). A LLM extracts its constructs and relationships for you to accept. This mark shows wherever an LLM works. Also note that, for this tour, you are working a copy of the data and that your changes will not be stored. So feel free to play with it!"},

    {stage:1,
     look:[{at:"#cAp", lab:"research tradition"},
           {at:"#cJr", lab:"outlets"},
           {at:"#impScheme", lab:"or read a classification out of a paper"}],
     say:"<b>You decide the literature the AMG will be based on.</b> Outlets fix which discipline's conversation this is. The papers can be classified in terms of traditions (using an LLM for the classification)."},

    {stage:1, does:"#hoff", unless:"#hoffbox:not([hidden])",
     look:[{at:"#hoff", lab:"what goes forward"},
           {at:"#hoffbox", lab:"the papers and their constructs"},
           {at:".canvas", lab:"all of it on the map, worked on next"}],
     next:{at:"#pfoot .stepbtn.fwd", then:"Select the constructs. The tour follows you."},
     say:"For each step, the selected items (e.g., papers, constructs, relationships) are gathered to be transferred to the next step."},

    /* ---- 1.2 Select the constructs ------------------------------------ */
    /* THE THRESHOLD OPENS THIS STEP, because it decides what the step is
       working on. It belongs here rather than on 1.1: it counts constructs,
       and 1.1 counts papers. 1,026 is every construct the extraction found, which
       is what a threshold of one keeps, and the table beside the slider says
       so as the reader drags it. */
    {stage:2,
     look:[{at:"#cMinp", lab:"how many papers must name a construct"},
           {at:"#minpTab", lab:"what each setting would keep"},
           {at:".canvas", lab:"the set every merge is made from"}],
     yours:{at:"#cMinp", then:"At 1, the 156 constructs become all 1,026 the extraction " +
       "found. The tour puts it back at 2 when you move on."},
     undo:["#cMinp"],
     say:"<b>This threshold decides the minimum number of papers in which a construct needs to appear to remain visible.</b> Note that rare constructs can also be added back manually. This filter is only here to help you select the relevant constructs."},

    {stage:2, does:"[data-clpreset]", unless:".combox",
     look:[{at:"#pbody .presets", lab:"nine readings"},
           {at:"[data-clpreset]", lab:"clusters"},
           {at:"[data-manual]", lab:"or your own axes"}],
     say:"<b>The workbench proposes different ways to plot the constructs to reflect different readings.</b> For instance, clusters groups the constructs the same papers use together. Hot avenues show the constructs that are the most present in recent research. Manual lets you choose the axes yourself."},

    {stage:2,
     look:[{at:".combox [data-comres]", lab:"how tight"},
           {at:".combox [data-comrun]", lab:"compute"}],
     yours:{at:".combox [data-comrun]", then:"Move the slider, then press Compute. Higher " +
       "gives more, smaller clusters."},
     undo:[".combox [data-comres]"],
     say:"<b>Clusters are only proposals.</b> There are only here to help navigate the list of constructs"},

    {stage:2, ai:true,
     look:[{at:".combox [data-comopen]", lab:"see the proposed ones"},
           {at:"[data-ai=cluname]", lab:"an LLM names them"}],
     yours:{at:".combox [data-comopen]", then:"Rename a cluster, move a construct, or " +
       "accept one as a merge. Close the list to go on."},
     say:"<b>You decide the clusters: rename them, move a construct between them, accept one as a merge.</b> An LLM can propose a name and a sentence for each."},

    {stage:2,
     cycle:{every:3000, end:"[data-clpreset]", items:[
       {at:"[data-clpreset]", lab:"Clusters"},
       {at:"[data-preset=bylevel]", lab:""},
       {at:"[data-preset=modellable]", lab:""},
       {at:"[data-preset=evidence]", lab:""},
       {at:"[data-preset=established]", lab:""},
       {at:"[data-preset=dynamism]", lab:""},
       {at:"[data-preset=central]", lab:""},
       {at:"[data-preset=disciplinary]", lab:""},
       {at:"[data-manual]", lab:"Manual"}]},
     look:[{at:"#pbody .presets", lab:"now showing"},
           {at:".canvas", lab:"the map redraws"}],
     say:"<b>You can explore the other plot options.</b> Each one redraws the map."},

    {stage:2, fs:true,
     look:[{at:"#zFS", lab:"full screen"},
           {at:".canvas", lab:"click a construct"},
           {at:"#fsInspBtn", lab:"the Inspector"},
           {at:"#fsInsp", lab:"its papers"}],
     yours:{at:"#zFS", then:"Click a construct, then open the Inspector: its papers are " +
       "listed there. Drag one construct onto another to merge them."},
     say:"<b>Constructs can be inspected on the map.</b> Click one to read the papers behind it; drag one onto another to merge them."},

    {stage:2, does:"#hoff", unless:"#hoffbox:not([hidden])",
     look:[{at:"#hoff", lab:"the constructs you selected"},
           {at:"#hoffbox", lab:"with your merges"}],
     next:{at:"#pfoot .stepbtn.fwd", then:"Weigh the relationships."},
     say:"<b>The constructs you selected, with their merges, will be transferred to the next step.</b>"},

    /* ---- 1.3 Weigh the relationships ---------------------------------- */
    {stage:3,
     look:[{at:"#pbody .comps", lab:"can both ends be compared?"},
           {at:"#pbody .minbar", lab:"how much is enough"},
           {at:"#barsets", lab:"or a ready-made set of all three"}],
     say:"<b>Filters allow you to select the most robust findings.</b> Commensurability asks whether the constructs linked by a relationship can be compared; specification, whether the relationship says enough to be modelled; evidence, what empirical support stands behind it."},

    {stage:3,
     look:[{at:"#clfoot .wlhead", lab:"relationships for the next step"},
           {at:"#clfoot .cgall:not(:checked)", lab:"tick one"},
           {at:"#clfoot .sup", lab:"the papers behind it"},
           {at:"#clfoot .evb", lab:"agreed, contested, one paper"}],
     yours:{at:"#clfoot .cgall:not(:checked)", then:"It joins the basket. The tour takes " +
       "it back out when you move on."},
     undo:["#clfoot .cgall"],
     say:"<b>This is the selection of relationships.</b>"},

    {stage:3, set:{at:"#cHops", value:"2"},
     look:[{at:"#clfoot section.cmpd", lab:"proposed, not asserted"},
           {at:"#clfoot .cpick", lab:"tick one"},
           {at:"#cHops", lab:"links a path may use"}],
     yours:{at:"#clfoot .cpick", then:"It is carried as an indirect relation."},
     undo:["#cHops", "#clfoot .cpick"],
     say:"<b>Some constructs can be only indirectly related (through mediators).</b> They need to be manually selected."},

    {stage:3,
     look:[{at:"#hoff", lab:"the constructs and the arrows between them"}],
     next:{at:"#pfoot .stepbtn.fwd", then:"Join other literatures. This is where the next " +
       "tour starts."},
     say:"<b>The core model is the outcome of the first phase. It includes the constructs you kept and the relationships between them.</b>"}]},

  {id:"explore", name:"Join and explore",
   why:"Bring in another AMG, operationalize the model, and derive what it implies.",
   stops:[
    /* ---- 2.1 Join other literatures ----------------------------------- */
    /* ANCHORED ON WHAT STEP 2.1 DRAWS, which is not where the button for it
       lives. `#impAmg` sits in the selected-construct
       rail, and that rail is not raised on step 2.1 in the Purpose project: a
       walk through 1.1 to 2.1 leaves it with no rectangle, so a ring on it
       would be a ring on nothing. The import menu IS on the step, and it is
       where another AMG comes from, so the stop makes its point there until
       the button is drawn where it was meant to be. */
    {stage:4,
     look:[{at:"#impMenu", lab:"import another AMG, or a literature"},
           {at:"#importStream", lab:"a second literature, scoped first"},
           {at:"#hoff", lab:"what the join hands on"}],
     say:"<b>Now, you can, if you want, import another stream of literature</b> (already packaged as an AMG, you can repeat the steps to build it). For this demo, here it is the property-rights model. Its section holds every construct that model uses, including purpose constructs it shares with yours."},

    {stage:4, ai:true,
     look:[{at:"#blkfoot .chain", lab:"joined so far"},
           {at:"[data-joinman]", lab:"merge by hand"},
           {at:"[data-ai=join]", lab:"an LLM proposes pairs"},
           {at:"#hoff", lab:"what goes forward"}],
     next:{at:"#pfoot .stepbtn.fwd", then:"Operationalize the model."},
     say:"<b>The two streams of literature name the same thing differently.</b> Prosocial purpose commitment joins three purpose constructs with one from property rights, and each keeps its literature's colour. You can merge them if you judge that it is appropriate."},

    /* ---- 3.1 Operationalize the model --------------------------------- */
    {stage:5, ai:true,
     look:[{at:"#decTabVars", lab:"what each variable is"},
           {at:"#decTabMech", lab:"the shape of each relationship"},
           {at:"#decTabAr", lab:"the arithmetic, by hand"},
           {at:"#passGo", lab:"fill it all in"}],
     say:"<b>The constructs and relationships need to be operationalize now.</b> ‘Fill it in for me’ asks an LLM for help for the dimensions that are not already specified in the literature. You need to validate the propositions. This project is already filled in, so it is not pressed here."},

    {stage:5, dec:"vars",
     look:[{at:"[data-vt]", lab:"edit one"},
           {at:"[data-setcomp]", lab:"how an outcome combines"}],
     yours:{at:"[data-vt]", then:"Tick a second kind and the model runs over both. Cancel " +
       "leaves it as it was."},
     say:"<b>Each variable is typed, and you can admit several types at once.</b> You declare a class of specifications and the workbench will test all the combinations. How an outcome combines its mechanisms (they add, they multiply, the smallest binds) should be declared too."},

    {stage:5, dec:"mech",
     look:[{at:"[data-fam]", lab:"choose a form"},
           {at:"#pbody .crow", lab:"what it looks like"}],
     yours:{at:"[data-fam]", then:"The curve and the formula change with it. The tour puts " +
       "it back when you move on."},
     undo:["[data-fam]"],
     say:"<b>Each relationship can take several forms, and you declare the family it belongs to.</b> Some were set from existing literature. Pick another member here and see how it changes."},

    {stage:5, dec:"mech",
     look:[{at:"[data-fams]", lab:"families of forms"}],
     yours:{at:"[data-fams]", then:"Close it to go on."},
     say:"<b>The families are pre-defined.</b> Increasing, concave, sigmoid and the rest: every robustness check later runs over the families you declare here."},

    {stage:5, dec:"arith", ai:true,
     look:[{at:"[data-aedit]", lab:"write it yourself"},
           {at:"[data-ai=arith]", lab:"or ask for a draft"},
           {at:"#hoff", lab:"what is still open"}],
     next:{at:"#pfoot .stepbtn.fwd", then:"Derive the findings."},
     say:"<b>The arithmetic can be written by hand or drafted by an LLM, and either way it is checked against your declarations.</b>"},

    /* ---- 3.2 Derive the findings -------------------------------------- */
    {stage:6, der:"read",
     look:[{at:"[data-der=read]", lab:"automated"},
           {at:"[data-der=work]", lab:"by hand"},
           {at:"#pbody .fnds", lab:"candidate findings"},
           {at:"[data-derat]", lab:"how it was derived"}],
     say:"<b>Findings can be automatically generated: the workbench derives what follows from the core model and its operationalization, and lists the candidates.</b> Proved means that the findings are valid across the whole range of parameters. Partial means they are only valid on a part of it (reported)."},

    {stage:6, der:"read", ai:true,
     look:[{at:"[data-ai=read]", lab:"read them in words"},
           {at:"#pbody .fnsay", lab:"a reading"},
           {at:"[data-ai=predict]", lab:"suggest more"}],
     say:"<b>An LLM can put each finding into plain sentences, and suggest more predictions to test.</b>"},

    {stage:6, der:"read",
     look:[{at:"#keptSec", lab:"what you stand behind"},
           {at:"#pbody .prow.off", lab:"set aside"}],
     say:"<b>Retained findings are the only ones that are included in the AMG.</b> Two are set aside: the two vulnerabilities were declared alike, so the discretionary channel answers them alike and keeping both would put one result on the board twice. The rows stay where they are, so the withdrawal is visible rather than silent."},

    {stage:6, der:"work",
     look:[{at:"#pbody .bline", lab:"each line, worked by hand"},
           {at:"[data-dex=wolfram]", lab:"to Mathematica"},
           {at:"[data-dex=tex]", lab:"or LaTeX, SymPy"},
           {at:"#pbody [data-wspop=evidence]", lab:"or to your data, in R or Python"}],
     yours:{at:"[data-dex=wolfram]", then:"Downloads the propositions as a Mathematica " +
       "file. What your tool sends back can be read in as a new line."},
     say:"<b>Derivation can be also manual: every line can be differentiated, simplified, signed or split by hand.</b> Any of it can go to Mathematica, SymPy or LaTeX for a more formal derivation, or to R or Python to test against data."},

    {stage:6, ai:true,
     look:[{at:"#gfab", lab:"suggestions"},
           {at:"#guide", lab:"computed on the fly"},
           {at:"#gAsk", lab:"simulate a review"}],
     yours:{at:"#gfab", then:"Checks from your project as it stands, and a review on request."},
     say:"<b>Suggestions are computed on the fly from your project: what contradicts, what a finding rests on, what remain undecided.</b> On request, an LLM reads the whole project as a reviewer would and suggests what to improve."}]},

  {id:"finalize", name:"Finalize and share",
   why:"Test where each finding holds, play with the model, and package the AMG for others.",
   stops:[
    /* ---- 4.1 Finalize the findings ------------------------------------ */
    {stage:7, fin:"findings",
     look:[{at:"[data-fin=findings]", lab:"the findings"},
           {at:"[data-fin=notebook]", lab:"or a notebook, in your order"},
           {at:"#hoff", lab:"what the AMG will carry"}],
     say:"<b>This is the final set of findings: the findings retained for the AMG, each tested and drawn where it holds.</b> Robustness checks come first, then the findings, then the model to play with."},

    {stage:7, ai:true,
     look:[{at:"#expSlots", lab:"each relationship's possible forms"},
           {at:"[data-expset]", lab:"which combinations"},
           {at:"#expRun", lab:"run the set"},
           {at:"[data-ai=expset]", lab:"an LLM suggests which"}],
     yours:{at:"#expRun", then:"It refuses: the class is 9,375 combinations and a run takes " +
       "4,000, and the first 4,000 are not a fair sample. It offers a seeded sample instead."},
     say:"<b>Robustness first: does each finding remain valid when the relationships take their other declared forms?</b> You choose which combinations to test before you see any result."},

    {stage:7,
     look:[{at:"#pbody .plate", lab:"the curve, and where it holds"},
           {at:"#pbody .plkey", lab:"the key"},
           {at:"#pbody .crow.arow", lab:"what was not settled"}],
     say:"<b>Each finding is drawn over the range where they are proved: its validity domain.</b> What the method could not settle is listed underneath, with the share left open."},

    {stage:7,
     look:[{at:"#stxhost", lab:"one variable at a time"},
           {at:"#stxSurvive", lab:"a quick robustness check"}],
     yours:{at:"#stxhost input[type=range]", then:"Every panel redraws: what the push does " +
       "to each outcome."},
     undo:["#stxhost input[type=range]"],
     say:"<b>Push one variable and watch every outcome move.</b> Hold the others where you " +
       "like, change a relationship's form, and the panels below check the sign over " +
       "sampled combinations as you go."},

    {stage:7,
     look:[{at:"#hoff", lab:"what goes into the AMG"},
           {at:"#worklist", lab:"what is still open"}],
     next:{at:"#pfoot .stepbtn.fwd", then:"Share the action model."},
     say:"<b>These findings, with their domains and what they leave open, are what the AMG " +
       "carries.</b> The gaps travel with the results."},

    /* ---- 4.2 Share the action model ----------------------------------- */
    {stage:8,
     look:[{at:"#depFiles", lab:"every file, the report first"},
           {at:"#pbody .chain", lab:"any part on its own"}],
     say:"<b>The AMG is listed in full: the report, the model, the findings, the decision " +
       "record, the literature and the whole project.</b> Each part can also be downloaded " +
       "on its own."},

    {stage:8,
     look:[{at:"#depDecs", lab:"five decisions"}],
     say:"<b>How it is shared is the authors' call: where it lives, the licence, whether " +
       "the LLM exchanges travel, the version a citation pins.</b> A decision can be left " +
       "open, and the deposit then says so on every page."},

    {stage:8,
     look:[{at:"#depGo", lab:"write the deposit"}],
     yours:{at:"#depGo", then:"One archive, with a checksum per file so a reader can check " +
       "what they have."},
     say:"<b>One file a reviewer can open and check.</b> Writing it downloads the archive. " +
       "It is the reader's press, never the tour's."},

    {stage:8, does:"#scenMenu > summary", unless:"#scenMenu[open]",
     look:[{at:"#scenMenu .menupop", lab:"everything you do to a project"},
           {at:"#scenSave", lab:"a file anyone can rerun"},
           {at:"#recBtn", lab:"the decision record"},
           {at:"#scenList", lab:"your projects"}],
     say:"<b>The Menu, top left, holds your projects.</b> Start one, duplicate it, import " +
       "an AMG, export a project as a file anyone can rerun, and read the decision record " +
       "or the history of every move."},

    {stage:8,
     look:[{at:"#goHome", lab:"the start page"}],
     say:"<b>This tour ran on a copy of Purpose and property rights, and your own work " +
       "is untouched.</b> The workbench's name, top left, takes you back to the " +
       "start page."}]}
];

/* Running state. Nothing here is stored: a tour is a thing you are in the
   middle of, and a half-finished one is not a decision worth remembering
   across a reload. `did` remembers whether the reader took this stop's own
   press, so the card can say so rather than keep asking. */
const TOUR = {on:"", at:0, did:false, over:false};
/* AND THE END OF ONE IS A STOP OF ITS OWN. Pressing Done used to put the card
   away, switch the reader back and drop the tour's copy in one go, which left
   somebody who had just finished thirteen stops standing in a project they had
   not opened with nothing said about where the tour went. `over` is the tour
   finished and still on screen: no marks, no dim, one card asking whether to
   carry on from the step they are standing in or go back to the start page. */
const tourOver = () => !!(TOUR.on && TOUR.over);
const tourNow = () => TOURS.find(t => t.id === TOUR.on) || null;
const tourStop = () => { const t = tourNow(); return t ? t.stops[TOUR.at] : null; };
const tourLooks = s => (s && s.look) || [];

/* EVERY MARK'S RECTANGLE, read off what the page actually laid out rather than
   off a remembered position. A mark whose target is not drawn is left out
   rather than guessed at: the caption still applies, and a ring around nothing
   is worse than one ring fewer. */
function tourRects(){
  const s = tourStop();
  if(!s) return [];
  const out = [];
  for(const m of tourLooks(s)){
    let el = null;
    try{ el = document.querySelector(m.at); }catch(e){ el = null; }
    if(!el || !el.getBoundingClientRect) continue;
    const r = el.getBoundingClientRect();
    if(!r.width && !r.height) continue;
    const pad = 7;
    const x = r.left - pad, y = r.top - pad;
    const w = r.width + pad * 2, h = r.height + pad * 2;
    /* OFF THE SCREEN IS NOT DRAWN, rather than drawn against the edge. The
       rectangle used to be clamped into the viewport, which was invisible
       while nothing moved after the measuring; now that the marks follow the
       reader's own scrolling, a control scrolled above the fold came out as a
       ring the full height of the page. */
    if(x + w <= 0 || y + h <= 0) continue;
    if(x >= window.innerWidth || y >= window.innerHeight) continue;
    out.push({lab:m.lab || "", el, x, y, w, h});
  }
  return out;
}

/* THE DIM, WITH HOLES IN IT. One path covering the viewport, then one
   rectangle per mark wound the other way, and `evenodd` makes each of those a
   hole. A box-shadow spread can only cut one, which is what this page did
   while a stop had one target. The layer takes no pointer events, so the
   control under a hole is not only legible but pressable -- which is what
   `yours` needs. */
const pathOf = (rects, w, h) => {
  let d = `M0 0H${w}V${h}H0Z`;
  for(const r of rects)
    d += `M${r.x} ${r.y}V${r.y + r.h}H${r.x + r.w}V${r.y}Z`;
  return d;
};

/* A6. A MODAL DIALOG SITS ABOVE EVERYTHING, WHATEVER THE Z-INDEX.
   ==========================================================================

   Every dialog on this page opens with `showModal()`, which puts it in the
   browser's top layer and makes the rest of the document inert. A card at
   body level is then drawn UNDER it and its buttons cannot be pressed at all,
   so a stop that sends the reader into the clusters list, the quantity editor
   or the families of forms would strand them there with no way to go on.

   So while a dialog is open the whole overlay moves inside it, and moves back
   when it closes. Measuring happens after the move, because a rectangle taken
   against the old parent is a rectangle in the wrong place. */
function tourHost(){
  const host = document.getElementById("tourhost");
  if(!host) return;
  const dlg = document.querySelector("dialog[open]");
  const want = dlg || document.body;
  if(host.parentElement !== want) want.appendChild(host);
  host.classList.toggle("indlg", !!dlg);
}

/* SCROLLED FIRST, THEN MEASURED. The subject used to be scrolled into view at
   the END of the paint, smoothly, which moved the page AFTER every rectangle
   had been taken: the marks are in viewport coordinates, so they then sat
   wherever the content used to be -- a ring around an empty strip of page, a
   hundred pixels above the control it named. Instant and first, so what is
   measured is what the reader will be looking at. */
function tourLead(){
  const s = tourStop();
  if(!s) return;
  let lead = null;
  const first = tourLooks(s)[0];
  try{ lead = first ? document.querySelector(first.at) : null; }catch(e){ lead = null; }
  if(lead && lead.scrollIntoView) lead.scrollIntoView({block:"center"});
}

/* A10. THE RINGS FOLLOW THE PAGE.
   ==========================================================================

   Everything the overlay draws is in viewport coordinates, because that is
   what `getBoundingClientRect` gives and what a fixed layer wants. So a reader
   who scrolled -- to read the rest of a long panel, to reach a control below
   the fold, or just to look around -- took the page out from under every ring,
   and the rings stayed where the content had been. The card too: it is placed
   in the gaps between the marks, and those gaps move.

   Locking the page would be the cheap answer and the wrong one. Several stops
   name a list taller than the window, and some hand over a control the reader
   has to scroll to reach. So the overlay measures again instead, on every
   scroll and every resize, one paint per frame.

   Placing is separate from the scroll above for the same reason: a repaint
   that dragged the page back to the stop's subject would make the rest of the
   step unreadable. The tour moves the page when it ARRIVES at a stop; after
   that the page is the reader's. */
const CARD = {spot:-1};
/* MEASURED IN THE HANDLER, not a frame later. Two earlier builds of this
   waited on `requestAnimationFrame` -- the obvious way to coalesce, and both
   of them dropped marks: the first held a flag and returned while a frame was
   pending, so one frame the browser never served left every later scroll
   discarded for the rest of the tour, and the second, which cancelled and
   asked again, still rode on frames arriving. A browser already fires scroll
   about once per frame, and the work here is four rectangles and four divs, so
   there is nothing to coalesce and nothing to wait for. Every read happens
   before any write, which is what keeps it off the layout treadmill. */
function tourTrack(){
  if(!tourNow()) return;
  tourPlace();
}
/* `scroll` does not bubble, so the listener is a capturing one on the window:
   the panel, the map and the clusters list each scroll in a box of their own,
   and a ring around something inside one of them has to follow that box and
   not the document. Registered once, for the whole life of the page, and it
   does nothing at all while no tour is running. */
function tourFollow(){
  addEventListener("scroll", tourTrack, {capture:true, passive:true});
  addEventListener("resize", () => { CARD.spot = -1; tourTrack(); });
}

function tourPlace(){
  tourHost();
  /* THE CLOSING CARD RINGS NOTHING. It is about the tour rather than about
     anything on the page, so it takes the middle of the screen -- which is
     what the stylesheet does for a card with no inline position -- and the
     page behind it is left undimmed, because one of the two answers it offers
     is to carry on working in what is behind it. */
  if(tourOver()) return;
  const back = document.getElementById("tourback");
  const cut = document.getElementById("tourcutp");
  const marks = document.getElementById("tourmarks");
  const card = document.getElementById("tourcard");
  if(!back || !card || !marks) return;
  const s = tourStop();
  if(!s) return;
  const W = window.innerWidth, H = window.innerHeight;
  const rects = tourRects();
  if(cut){
    cut.setAttribute("d", pathOf(rects, W, H));
    back.classList.toggle("cut", rects.length > 0);
  }
  /* A ring per mark, and its label above it where there is room. The first is
     the subject of the stop and is drawn solid; the rest are what it bears on
     and are drawn quieter, so a reader knows where to look first. */
  marks.innerHTML = rects.map((r, i) => `<div class="tourmark${i ? " tm2" : ""}"
      style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"
      >${r.lab ? `<span class="tourlab${r.y < 34 ? " tlbelow" : ""}">${
        hesc(r.lab)}</span>` : ""}</div>`).join("");

  /* THE CARD GOES WHERE NO MARK IS. It used to sit under the one hole; with
     several it has to clear all of them, so each of the four corners is scored
     by how much mark area it would cover and the best one wins. */
  const cw = card.offsetWidth || 400, ch = card.offsetHeight || 150, m = 12;
  const spots = [
    {x:m, y:H - ch - m}, {x:W - cw - m, y:H - ch - m},
    {x:m, y:m}, {x:W - cw - m, y:m},
  ];
  const over = p => rects.reduce((t, r) => {
    const ox = Math.max(0, Math.min(p.x + cw, r.x + r.w) - Math.max(p.x, r.x));
    const oy = Math.max(0, Math.min(p.y + ch, r.y + r.h) - Math.max(p.y, r.y));
    return t + ox * oy;
  }, 0);
  let best = 0, bestOver = Infinity;
  for(let i = 0; i < spots.length; i++){
    const o = over(spots[i]);
    if(o < bestOver){ bestOver = o; best = i; }
  }
  /* AND IT STAYS IN THAT CORNER. The marks move while the reader scrolls, so
     scoring the four afresh every frame sent the card hopping from corner to
     corner mid-scroll, which is worse than a ring passing behind it. The
     corner chosen on arriving at the stop is kept until a mark actually lands
     on the card: a fifth of it covered is enough to move. */
  if(CARD.spot >= 0 && over(spots[CARD.spot]) < cw * ch * 0.2) best = CARD.spot;
  CARD.spot = best;
  card.style.left = Math.max(m, spots[best].x) + "px";
  card.style.top = Math.max(m, spots[best].y) + "px";
}

/* ARRIVING AT A STOP: move the page to it, then draw. */
function tourPaint(){ tourLead(); tourPlace(); }

/* WHAT THE TOUR PRESSES ITSELF. A stop's `does` runs before its caption shows,
   because the caption is about the state the press produces. Wrapped, because
   a control that is absent is a reason to show the stop without it rather than
   to stop the tour. */
/* A3. GIVE AN INPUT A VALUE. A click does nothing to a range, so `does`
   cannot drag a slider; this writes the value and fires the two events the
   page listens for, in the order a browser fires them. */
function tourSet(s){
  if(!s || !s.set) return;
  let el = null;
  try{ el = document.querySelector(s.set.at); }catch(e){ el = null; }
  if(!el) return;
  el.value = String(s.set.value);
  el.dispatchEvent(new Event("input", {bubbles:true}));
  el.dispatchEvent(new Event("change", {bubbles:true}));
}

/* A4. WHAT A STOP CHANGED IS PUT BACK WHEN THE READER LEAVES IT.
   ==========================================================================

   A stop hands the reader a threshold to drag or a claim to tick, and the
   stops after it quote numbers. Without this, a reader who drags the
   threshold to 1 meets three later captions that are now wrong about the
   project in front of them -- and the tour would be teaching them to distrust
   it. So every target a stop names is read before the stop runs and written
   back when the reader leaves, whoever changed it: the reader, or the tour's
   own press.

   Recorded as `value` or `checked`, which is what the page's own handlers
   read. Nothing is restored that nobody moved, so a stop the reader skipped
   fires no events. */
const UNDO = [];
function tourMark(s){
  UNDO.length = 0;
  for(const sel of (s && s.undo) || []){
    let els = [];
    try{ els = [...document.querySelectorAll(sel)]; }catch(e){ els = []; }
    for(const el of els)
      UNDO.push({el, value:el.value, checked:el.checked});
  }
}
function tourRestore(){
  for(const u of UNDO){
    if(!u.el || !u.el.isConnected) continue;
    const moved = u.el.type === "checkbox" || u.el.type === "radio"
      ? u.el.checked !== u.checked : u.el.value !== u.value;
    if(!moved) continue;
    if(u.el.type === "checkbox" || u.el.type === "radio") u.el.checked = u.checked;
    else u.el.value = u.value;
    u.el.dispatchEvent(new Event("input", {bubbles:true}));
    u.el.dispatchEvent(new Event("change", {bubbles:true}));
  }
  UNDO.length = 0;
}

/* A2. A SLIDESHOW STOP. Nine ready-made readings of one literature is a thing
   to watch rather than a list to read, so the tour presses each in turn and
   says which one is showing. Pause stops it where it is; leaving the stop
   presses `end` so the step is left as it opened. */
const CYC = {t:0, i:0, on:false};
function tourCycleStop(){
  if(CYC.t) clearTimeout(CYC.t);
  CYC.t = 0; CYC.on = false; CYC.i = 0;
}
function tourCycleEnd(s){
  tourCycleStop();
  if(!s || !s.cycle || !s.cycle.end) return;
  let el = null;
  try{ el = document.querySelector(s.cycle.end); }catch(e){ el = null; }
  if(el && el.click) el.click();
}
function tourCycleTick(){
  const s = tourStop();
  if(!s || !s.cycle || !CYC.on) return;
  const items = s.cycle.items || [];
  if(!items.length) return;
  const it = items[CYC.i % items.length];
  let el = null;
  try{ el = document.querySelector(it.at); }catch(e){ el = null; }
  if(el && el.click) el.click();
  CYC.i++;
  const card = document.getElementById("tourcard");
  if(card) card.outerHTML = tourCardHTML();
  requestAnimationFrame(() => { tourPaint(); tourWire(); });
  if(CYC.i >= items.length){ CYC.on = false; return; }
  CYC.t = setTimeout(tourCycleTick, s.cycle.every || 3000);
}
/* What the slideshow is showing, in the item's own words and the button's own
   tooltip: a reader watching nine maps go past needs to be told which is
   which, and the page already says it on the control. */
function tourCycleNow(s){
  const items = (s.cycle && s.cycle.items) || [];
  if(!items.length) return "";
  const it = items[Math.max(0, Math.min(items.length - 1, CYC.i - 1))];
  let el = null;
  try{ el = document.querySelector(it.at); }catch(e){ el = null; }
  const tip = el ? (el.getAttribute("title") || "") : "";
  const lab = it.lab || (el ? (el.textContent || "").trim() : "");
  return `<p class="tourcyc"><b>${hesc(lab)}</b>${tip ? " " + hesc(tip) : ""}
    <span class="tourcycn">${Math.min(items.length, Math.max(1, CYC.i))} of ${
      items.length}</span></p>`;
}

const onScreen = sel => {
  let el = null;
  try{ el = document.querySelector(sel); }catch(e){ return false; }
  if(!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  return !!(r.width || r.height);
};
/* A PRESS THAT REVEALS RUNS ONCE; A PRESS THAT CHANGES RUNS EVERY TIME. Three
   stops in a row open the same panel, and the control that opens it also
   closes it: pressed on each, the second stop shut what the first had opened
   and the third opened it again, so two of the three marked nothing. `unless`
   names what the press is for, and the press is skipped when it is already on
   screen. A stop with no `unless` -- taking every outlet out of scope, say --
   is doing something rather than revealing something, and always runs. */
function tourDoes(s){
  if(!s || !s.does) return;
  if(s.unless && onScreen(s.unless)) return;
  let el = null;
  try{ el = document.querySelector(s.does); }catch(e){ el = null; }
  if(el && el.click) el.click();
}

/* AND WHAT THE READER PRESSES. The ring is already drawn and the control is
   already reachable through the hole; this only notices the press, so the card
   can stop asking and the marks can be measured against what the press
   changed. One listener, replaced on every paint. */
function tourWatch(){
  /* Nothing is being asked for on the closing card, and the last stop's own
     control must not still be listening: pressing it would take a reader who
     has finished the tour on to a stop that is not there. */
  if(tourOver()) return;
  const s = tourStop();
  /* The slideshow's own Pause, wired here because the card is rewritten on
     every tick and a handler set at render time would be left behind. */
  { const pb = document.getElementById("tourPause");
    if(pb && s && s.cycle) pb.onclick = () => {
      if(CYC.on){ tourCycleStop(); }
      else { CYC.on = true; tourCycleTick(); }
      const c = document.getElementById("tourcard");
      if(c){ c.outerHTML = tourCardHTML(); tourPaint(); tourWire(); }
    }; }
  if(!s || !(s.yours || s.next)) return;
  const ask = s.yours || s.next;
  let el = null;
  try{ el = document.querySelector(ask.at); }catch(e){ el = null; }
  if(!el) return;
  const seen = () => {
    TOUR.did = true;
    /* A press on the step's forward button has already moved the page. The
       tour follows it to its own next stop WITHOUT driving: driving would
       render the step a second time and, where the next stop names a tab,
       would take the reader off the one they just landed on. */
    if(s.next && NEXTGO){ setTimeout(() => NEXTGO(), 260); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const c = document.getElementById("tourcard");
      if(c) c.outerHTML = tourCardHTML();
      tourPaint(); tourWire();
    }));
  };
  el.addEventListener("click", seen, {once:true});
  el.addEventListener("change", seen, {once:true});
}

/* Moving the page to where the stop is, then drawing. The render is async in
   effect -- the panel is rebuilt and the browser lays it out -- so the paint
   waits a frame rather than measuring rectangles that are about to change. */
/* LEAVING A STOP, which happens on Next, on Back, and on Leave the tour. What
   the stop changed goes back, its slideshow stops and whatever it opened is
   closed. Ordered: the slideshow's `end` press is itself a change, so it runs
   before the restore rather than after it. */
function tourLeave(){
  const s = tourStop();
  if(s) tourCycleEnd(s);
  tourRestore();
}

function tourGo(i, drive){
  const t = tourNow();
  if(!t) return;
  const was = TOUR.at;
  if(TOUR.at !== i) tourLeave();
  TOUR.at = Math.max(0, Math.min(t.stops.length - 1, i));
  if(TOUR.at !== was){ TOUR.did = false; CARD.spot = -1; }
  const s = t.stops[TOUR.at];
  if(drive) drive(s);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    /* Read before anything writes, so the record is of the step as the reader
       met it rather than as the stop left it. */
    tourMark(s);
    tourSet(s);
    tourDoes(s);
    if(s.cycle){ CYC.i = 0; CYC.on = true;
      setTimeout(tourCycleTick, 420); }
    /* A BEAT, NOT A FRAME, after the tour's own press, and then a second one.
       What a press opens is drawn by a render the page schedules for itself,
       and measuring two frames later caught the panel before it had the panel
       in it: the stop came up marking the button it had just pressed and
       nothing it opened. Painting twice is cheap and idempotent, and it is the
       difference between a stop that works on a fast machine and one that
       works. */
    const draw = () => { tourPaint(); tourWire(); };
    if(s.does){ setTimeout(draw, 260); setTimeout(draw, 820); }
    else requestAnimationFrame(draw);
  }));
}

/* WHAT COMES AFTER THIS TOUR, and where the reader came from. Both are the
   page's to answer -- one is the project list, the other is the order of
   TOURS -- so the page hands them in, the way it hands in the buttons. */
let BACK = () => null;
const tourOnBack = fn => { BACK = fn; };
const NEXTTOUR = () => {
  const i = TOURS.findIndex(t => t.id === TOUR.on);
  return i >= 0 && i + 1 < TOURS.length ? TOURS[i + 1] : null;
};

/* WHAT IS SAID AT THE END, and the two ways out of it. Three buttons at most:
   carry on in the step the last stop left them in, go back to the project they
   were in before the tour, and go back to the start page. The second is only
   offered when there is one -- a reader who came straight off the start page
   was in nothing before. The next tour keeps its own line in the footer, where
   it was on the last stop. */
function tourOverHTML(){
  const t = tourNow();
  if(!t) return "";
  const back = BACK();
  const nx = NEXTTOUR();
  return `<div class="tourcard tourover" id="tourcard" role="dialog"
      aria-label="${hesc(t.name)}: the end of the tour">
      <div class="tourhd"><span class="tourn">${hesc(t.name)}</span>
        <span class="tourct">done</span></div>
      <p class="toursay"><b>That is the whole of it.</b> You are standing in the step the
        last stop left you on, in the tour's own copy of Purpose and property rights. Carry on
        from here and the copy stays open under its own name, so everything the tour touched is
        still there to poke at.</p>
      <div class="touracts">
        <button type="button" id="tourStay">Carry on from here</button>
        ${back ? `<button type="button" id="tourBack">Back to ${hesc(back.name)}</button>`
          : ""}
        <button type="button" id="tourHome">The start page</button>
      </div>
      ${nx ? `<p class="tourfoot tournext">Next:
        <button type="button" class="tourgo" id="tourMore">${hesc(nx.name)}</button></p>`
        : ""}
      <p class="tourfoot">${back
        ? "Leaving puts you back in " + hesc(back.name) + " and drops the copy."
        : "Going back to the start page drops the copy."} Your own work is untouched
        either way.</p>
    </div>`;
}

function tourCardHTML(){
  const t = tourNow();
  if(!t) return "";
  if(TOUR.over) return tourOverHTML();
  const s = t.stops[TOUR.at];
  const n = t.stops.length;
  const last = TOUR.at + 1 === n;
  /* A1. `next` IS A `yours` THAT MOVES THE PAGE. The reader presses the step's
     own forward button, the footer's own handler takes them to the next step,
     and the tour follows rather than driving the page a second time. */
  const ask = s.yours || s.next;
  const yours = ask && !TOUR.did
    ? `<p class="tourask"><b>Your turn.</b> Press the ringed control. ${hesc(ask.then)}</p>`
    : ask ? `<p class="tourask tdone">Done. ${hesc(ask.then)}</p>` : "";
  /* A9. The mark, where the stop is about a control an LLM is behind. Drawn
     whether or not a model is reachable, because the caption says what one
     does where there is one. */
  return `<div class="tourcard" id="tourcard" role="dialog" aria-label="${hesc(t.name)}">
      <div class="tourhd"><span class="tourn">${hesc(t.name)}</span>
        <span class="tourct">${TOUR.at + 1} of ${n}</span></div>
      <p class="toursay">${s.ai ? aiMark("an LLM works here") : ""}${s.say}</p>
      ${s.cycle ? tourCycleNow(s) : ""}
      ${yours}
      <div class="touracts">
        <button type="button" id="tourPrev"${TOUR.at ? "" : " disabled"}>Back</button>
        <button type="button" id="tourNext">${TOUR.at + 1 === n ? "Done" : "Next"}</button>
        ${s.cycle ? `<button type="button" id="tourPause">${
          CYC.on ? "Pause" : "Play"}</button>` : ""}
        <button type="button" id="tourX" class="tourx">${
          BACK() ? "Back to " + hesc(BACK().name) : "Leave the tour"}</button>
      </div>
      ${last && NEXTTOUR() ? `<p class="tourfoot tournext">Next:
        <button type="button" class="tourgo" id="tourMore">${
          hesc(NEXTTOUR().name)}</button></p>` : ""}
      <p class="tourfoot">This is a copy of Purpose and property rights, and your own work is
        untouched.</p>
    </div>`;
}

function tourHTML(){
  if(!tourNow()) return "";
  if(TOUR.over) return tourCardHTML();
  return `<div class="tourback" id="tourback"><svg class="tourcut" aria-hidden="true"
      ><path id="tourcutp" fill-rule="evenodd"></path></svg></div>
    <div class="tourmarks" id="tourmarks" aria-hidden="true"></div>
    ${tourCardHTML()}`;
}

/* The card's own three buttons, wired wherever the card was last written: it
   is rewritten when the reader takes a stop's press, so wiring at render time
   alone would leave a dead Next behind. 06-wiring.js owns what they do and
   hands them in. */
let WIRE = null;
/* How the tour advances when the READER moved the page. 06-wiring.js owns
   what "advance" means and hands it in, for the same reason it hands in the
   card's buttons. */
let NEXTGO = null;
const tourOnWire = (fn, go) => { WIRE = fn; if(go) NEXTGO = go; };
const tourWire = () => { if(WIRE) WIRE(); tourWatch(); };

/* The three, on the start page under the two buttons. A list and not cards,
   because a reader choosing among three jobs reads down them. */
function tourPickHTML(){
  return `<h3 class="obh">Or take a tour</h3>
    <p class="why" style="margin:0 0 10px">Three walks through the workbench, one per
      phase, on a copy of the purpose project. Each one marks the areas it is talking about
      and hands you the work each one asks for: drag the threshold, compute the clusters,
      tick a relationship, run the robustness check. Your own project is not touched, and one tour
      leads to the next.</p>
    <div class="obbox"><ul class="tourlist">${TOURS.map(t => `<li>
      <button type="button" class="tabbtn" data-tour="${hesc(t.id)}">${hesc(t.name)}</button>
      <span>${hesc(t.why)}</span></li>`).join("")}</ul></div>`;
}

const tourOn = () => !!TOUR.on;
function tourStart(id){ TOUR.on = id; TOUR.at = 0; TOUR.did = false; TOUR.over = false;
  CARD.spot = -1; }
/* FINISHING IS NOT LEAVING. What the last stop changed goes back and its
   slideshow stops, the way it would on Next -- but the tour stays named, so
   the closing card can say which one it was and the reader decides what
   happens to the copy. */
function tourDone(){ tourLeave(); TOUR.over = true; }
function tourEnd(){ tourLeave(); TOUR.on = ""; TOUR.at = 0; TOUR.did = false;
  TOUR.over = false; CARD.spot = -1; }

export { NEXTTOUR, TOUR, TOURS, tourDone, tourEnd, tourFollow, tourGo, tourHTML, tourLeave,
  tourNow, tourOn, tourOnBack, tourOnWire, tourOver, tourPaint, tourPickHTML, tourStart,
  tourStop, tourWire };

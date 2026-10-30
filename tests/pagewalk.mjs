/* THE PAGE WALK: a characterisation harness for the bench.
   ==========================================================================

   Tests to ensure that nothing breaks come before modularising the code;
   that order is the only safe one. The bench is 16,500 lines of classic
   scripts sharing one global scope, and three kinds of bug get through every
   check that parsing can make: a control wired to a selector that matched nothing, a property
   list that silently dropped what it did not carry, a vocabulary transcribed
   a third time. `node --check` parses them happily. The scope checker parses
   them happily. Only driving the page finds them.

   So this drives the page. It renders every step, inventories every control,
   records which of them a listener was actually attached to, and runs a
   scripted sequence of real clicks through the chain. The result is one JSON
   document -- a SNAPSHOT -- which is committed. A refactor that changes
   nothing a user can see leaves the snapshot identical; a refactor that
   breaks something changes it, and the diff names what.

   NO NEW DEPENDENCIES. It drives headless Chrome through --dump-dom with a
   probe appended to a copy of the page, which is the same technique the
   session has been verifying with by hand. puppeteer would be nicer and
   would also be a package, a lockfile and a download on a submission whose
   second gate is that other researchers can run it.

   Run:  node tests/pagewalk.mjs            compare against the snapshot
         node tests/pagewalk.mjs --update    write a new one
*/

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const DOCS = path.join(ROOT, "docs");
const BENCH = path.join(DOCS, "bench");
const SNAP = path.join(HERE, "pagewalk.snapshot.json");

/* Chrome, wherever it is. Absent is not a failure: the snapshot is a
   developer check and a CI box without a browser should say so rather than
   fail a build over it. */
export function findChrome(){
  const cands = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for(const c of cands) if(fs.existsSync(c)) return c;
  for(const n of ["google-chrome", "chromium", "chromium-browser"]){
    const r = spawnSync("which", [n], {encoding:"utf8"});
    if(r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

const freePort = () => new Promise(res => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

/* ---- the probe -----------------------------------------------------------
   Runs inside the page. Everything it reports has to be STABLE across runs:
   no timestamps, no random ids, no wall-clock durations, or the snapshot
   diffs against itself. */
const PROBE = String.raw`
<script>
(function(){
  /* which elements actually got a listener -- the only way to tell a live
     control from one whose selector matches nothing */
  const AEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(t, f, o){
    if(this instanceof Element && /^(click|change|input|keydown|toggle|submit)$/.test(t))
      this.__w = (this.__w || 0) + 1;
    return AEL.call(this, t, f, o);
  };
  /* THE PAGE'S NAMES. Declared here, where the probe's helpers can see them,
     and ASSIGNED when the walk runs. The page hands them over through
     window.__bench, because a module's bindings are not global and this probe
     is a classic script appended to the page.

     Assigned late, which is the thing that caught me twice: a classic script
     executes as it is parsed and module scripts are deferred until after
     parsing, so at parse time the hook does not exist. On the classic page it
     did -- every script had already run -- so an eager read worked there and
     failed on the module copy. Shadowing the globals here is deliberate: it
     means an incomplete hook fails rather than falling through to them. */
  let ARITH, BOARD, BUF, EXP, EXPSETS, GUIDE, OP, PROPS, STAGES, VAR, WS, XRUN, bufPush, buildArith, classSpec, expSlotsNow, famOf, xrunBox, renderGuide, renderPanel, reviewChecks, reviewState, scenDemo, snapApply, snapBlank, state, varName, xrunClause, xrunGo;
  /* READ LIVE, NEVER CAPTURED. Everything else destructured below is an
     object this walk holds a reference to and the page mutates in place.
     lastView is not: refresh() REASSIGNS it, so a copy taken once at the
     start is the view the page booted with, for every step and every act.
     That was invisible while the page booted into the same blank project
     this walk sets up, and wrong the moment it booted into anything else --
     every per-step count was the boot state wearing the step's label.
     (No backticks in here: this comment is inside a template literal.) */
  const view = () => (window.__bench || {}).lastView;
  const THREW = [];
  window.addEventListener("error", e => THREW.push(String(e.message)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => String(s == null ? "" : s)
    .replace(/\s+/g, " ")
    .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/g, "<when>")
    .replace(/\d{4}-\d{2}-\d{2}/g, "<date>")
    .replace(/\b\d+(\.\d+)?\s?ms\b/g, "<ms>")
    .replace(/\b\d+(\.\d+)?s\b/g, "<s>")
    .trim();

  /* one control, as a stable record */
  function ctl(e){
    const d = {};
    for(const a of e.attributes) if(a.name.startsWith("data-")) d[a.name.slice(5)] = true;
    return {
      t: e.tagName.toLowerCase(),
      id: e.id || "",
      d: Object.keys(d).sort().join(","),
      cls: (e.className && typeof e.className === "string"
            ? e.className.split(/\s+/).filter(Boolean).sort().join(" ") : ""),
      dis: !!e.disabled || e.getAttribute("aria-disabled") === "true",
      w: (e.__w || 0) > 0,
      lab: norm(e.tagName === "SELECT" ? "(" + e.options.length + " options)"
        : (e.textContent || e.placeholder || e.value || "")).slice(0, 56),
    };
  }
  const where = () => {
    const o = {};
    /* blkfoot is the second panel host: a step whose work belongs under its
       building blocks renders there instead of in pbody. Leaving it out made
       the walk blind to every control on step 2.1 the moment they moved. */
    /* The step row carries the LITERATURE bar beside the step chevrons: the
       selector that says which literature steps 1.1 to 1.3 are reading, and
       the menu that imports, adds, renames and removes one. Leaving it out
       made the walk blind to the whole of that surface the moment it existed,
       which is the same hole blkfoot was. */
    for(const host of ["pbody", "phead", "pfoot", "blkfoot", "wlfoot", "clfoot",
                       "steprow", "guide", "pimp"]){
      const el = document.getElementById(host);
      if(!el) continue;
      const cs = [...el.querySelectorAll("button,select,textarea,input,a[data-stage]")].map(ctl);
      if(cs.length || el.textContent.trim()) o[host] = cs;
    }
    return o;
  };
  const headings = () => [...document.querySelectorAll(
    "#pbody .sectn, #pbody .ctl-label, #blkfoot .sectn, #blkfoot .ctl-label")]
    .map(e => norm(e.textContent)).filter(Boolean).slice(0, 40);

  /* HIDDEN MEANS HIDDEN, CHECKED ON EVERY STEP.
     ------------------------------------------------------------------------
     A class that sets display beats the hidden attribute, and that silence is
     what let three things stay on the page while the JavaScript believed it
     had put them away. The walk could not see it: it reads the DOM, and the
     DOM was right -- the attribute was there. So the walk now asks the
     BROWSER what each of them computes, which is the only place the two
     disagree.

     This never enters the snapshot. A re-record would otherwise bury it, and
     the whole point is that it cannot be buried. */
  const shownHidden = () => [...document.querySelectorAll("[hidden]")]
    .filter(e => e.getAttribute("hidden") !== "until-found")
    .filter(e => getComputedStyle(e).display !== "none")
    .map(e => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") +
      (e.className && typeof e.className === "string"
        ? "." + e.className.split(/\s+/).filter(Boolean).join(".") : ""))
    .slice(0, 12);

  /* ONE CIRCLE PER HEADING. Three tooltips for the quantities on step 3.1
     are two too many, and the worst case was
     four in a row under step 3.2's "What the method rests on", each hiding a
     different paragraph with nothing to tell them apart. tightenNotes merges a
     run of folded notes into the circle already on the line; this is what
     stops a second one coming back. */
  const manyInf = () => {
    const bad = [];
    for(const h of document.querySelectorAll(
      "#pbody .ctl-label, #pbody .sectn, #pbody .secti, #pbody summary, " +
      "#pbody h3, #pbody h4, #pbody label, #pbody .lgloss")){
      const n = h.querySelectorAll(".inf").length;
      if(n > 1) bad.push(norm(h.textContent).slice(0, 58) + " \u00d7" + n);
    }
    return [...new Set(bad)];
  };
  async function go(n){
    state.stage = n; renderPanel(); await sleep(260);
    const s = STAGES.find(x => x.n === n);
    let count = "";
    try{ count = norm(String(s.count(view())).replace(/<[^>]+>/g, "")); }catch(e){ count = "THREW"; }
    return {
      n, title: norm(s.title), key: s.key,
      count,
      done: (() => { try{ return !!s.done(); }catch(e){ return "THREW"; } })(),
      headings: headings(),
      manyInf: manyInf(),
      controls: where(),
      empties: [...document.querySelectorAll("#pbody .empty")].map(e => norm(e.textContent).slice(0, 90)),
      errors: [...document.querySelectorAll("#pbody .bufmsg, #pbody [style*='--neg']")]
        .map(e => norm(e.textContent).slice(0, 90)).filter(Boolean),
      shown: shownHidden(),
    };
  }

  window.__walk = async function(){
    ({ARITH, BOARD, BUF, EXP, EXPSETS, GUIDE, OP, PROPS, STAGES, VAR, WS, XRUN, bufPush, buildArith, classSpec, expSlotsNow, famOf, xrunBox, renderGuide, renderPanel, reviewChecks, reviewState, scenDemo, snapApply, snapBlank, state, varName, xrunClause, xrunGo} = window.__bench || {});
    if(!STAGES) return {FATAL:"window.__bench is empty or short of a name: the " +
      "page did not hand its own names over, so there is nothing to walk"};
    const out = {steps: [], acts: [], threw: THREW};
    /* THE START PAGE IS WHERE A FRESH BROWSER LANDS, and it is instead of the
       work rather than above it: the chain, the panel and the map are not
       drawn while it is up. So the walk starts the way a scholar does, by
       pressing a way in -- which also exercises that button. */
    /* THE START PAGE NEVER MENTIONS STEPS: not in the four phases, not
       anywhere on it. A reader arriving has not met the chain yet, and a step
       number before that is a reference to something they have not seen.
       Read with textContent so a closed Menu counts, and with every title and
       aria-label inside, because a tooltip is text a reader can meet. The step
       chevrons inside the workbench keep their numbers, so #steprow is out. */
    { const seen = [];
      for(const id of ["openbar", "blockrow", "goHome", "scenMenu"]){
        const e = document.getElementById(id);
        if(!e) continue;
        seen.push(e.textContent || "");
        for(const x of [e, ...e.querySelectorAll("[title], [aria-label]")]){
          if(x.getAttribute("title")) seen.push(x.getAttribute("title"));
          if(x.getAttribute("aria-label")) seen.push(x.getAttribute("aria-label"));
        }
      }
      const bad = [];
      for(const t of seen){
        for(const m of String(t).match(/[^.!?]*(\bsteps?\b|\b\d\.\d\b)[^.!?]*/gi) || [])
          bad.push(norm(m).slice(0, 110));
      }
      if(bad.length) return {FATAL:"the start page names a step, which a reader " +
        "arriving has not met yet:\n  " + [...new Set(bad)].slice(0, 12).join("\n  ")}; }
    { const e = document.getElementById("openNew") || document.getElementById("openEmpty");
      if(e) e.click(); else return {FATAL:"no way in from the start page"}; }
    await sleep(500);
    /* THE DOOR IS EMPTY, and that is recorded rather than assumed: New project
       means no literature at all, so nothing is in scope until the scholar
       says what this is about. */
    out.newProject = {outlets:[...(state.jr || [])].length,
      papers:(view() && view().papersIn) ?? null};
    /* AND THE WALK NEEDS SOMETHING TO MEASURE. What follows is every step as
       it opens WITH NOTHING DECIDED, which needs a literature in view: on an
       empty project every step after the first draws an empty panel and the
       snapshot would record the absence rather than the page. */
    snapApply(snapBlank());
    /* OUT AND BACK THROUGH THE WORDMARK, because the counts every step prints
       come off lastView and only refresh() rebuilds it; renderPanel alone
       redraws the panel around a view computed before the snapshot landed.
       The wordmark is the reader's own way out and back, and its handler runs
       the full refresh, so the walk takes the path rather than reaching past
       it for a function the page does not expose. */
    { const h = document.getElementById("goHome");
      if(h){ h.click(); await sleep(350); h.click(); await sleep(450); } }
    /* 1 -- every step as it opens, with nothing done */
    for(const s of STAGES) out.steps.push(await go(s.n));
    /* 2 -- the guide, which is its own surface */
    GUIDE.open = true; renderGuide(); await sleep(200);
    out.guide = {
      sections: [...document.querySelectorAll("#guide .gsec h4")].map(e => norm(e.textContent)),
      controls: [...document.querySelectorAll("#guide button")].map(ctl),
    };
    GUIDE.open = false; renderGuide();
    /* 3 -- a scripted walk, the paths a scholar actually takes. Each act
       records what it changed, so a refactor that breaks the WIRING rather
       than the markup still shows up. */
    const act = async (name, fn) => {
      let err = "";
      try{ await fn(); }catch(e){ err = String(e && e.message || e); }
      await sleep(220);
      /* The hidden guard again, after every act. go() only sees a step as it
         opens, and the axis menus do not exist until a layout with axes is
         chosen -- which only an act does. Carried on the act's own name, so a
         failure says which gesture drew the thing. */
      for(const sel of shownHidden()) (out.shown = out.shown || []).push(name + ": " + sel);
      out.acts.push({name, err, lines: BUF.lines.length,
        signed: BUF.lines.filter(x => x.res).length,
        stated: BUF.lines.filter(x => x.stated).length,
        board: BOARD.rows.length, kept: BOARD.rows.filter(r => r.keep).length,
        folders: WS.own.length, fold: WS.fold, pop: WS.pop,
        checks: (typeof reviewChecks === "function")
          ? reviewChecks(reviewState()).map(c => c.k).join(",") : "",
      });
    };
    const click = sel => { const e = document.querySelector(sel);
      if(!e) throw new Error("no such control: " + sel);
      if(e.disabled) throw new Error("disabled: " + sel);
      e.click(); };

    /* FULL SCREEN ON THE MAP, which is the one view control with an effect a
       walk can measure: the svg is capped at 680px by size() and that cap is
       exactly what the button lifts. Headless Chrome refuses the Fullscreen
       API, so this exercises the CSS fallback -- which is also the path the
       claude.ai host takes, because the page runs there inside an iframe.
       Asserted rather than merely pressed, because a button that enters a
       state nothing checks is how the chips on the statics page came to be
       dead for a week.

       NO BACKTICKS AND NO DOLLAR-BRACE IN HERE: this block lives inside the
       PROBE template literal, so a backtick closes it and an interpolation is
       evaluated out here with the wrong variables in scope. Plain
       concatenation, every time. This trap is easy to fall into. */
    let fsWas = 0;
    await go(1);
    await act("the map goes full screen", async () => {
      const svg = document.getElementById("g");
      fsWas = Math.round(svg.getBoundingClientRect().height);
      click("#zFS");
      await sleep(900);
      const now = Math.round(svg.getBoundingClientRect().height);
      if(!(now > fsWas))
        throw new Error("the svg is " + now + "px and was " + fsWas + "px, so no taller");
      if(!document.querySelector("#fsFiltBody #pbody"))
        throw new Error("the step's own controls did not come with it");
      if(!document.querySelector("#fsInspBody .card.insp"))
        throw new Error("the inspector did not come with it");
      if(!document.getElementById("fsFilters").hidden)
        throw new Error("the filters pane should arrive closed, or the view is not immersive");
      if(document.getElementById("fsbar").hidden)
        throw new Error("the pane buttons are hidden, so the filters cannot be reached");
    });
    await act("the filters open over the map and still work", async () => {
      click("#fsFiltBtn");
      await sleep(300);
      const sl = document.getElementById("cMinp");
      if(!sl || !sl.closest("#fsFilters"))
        throw new Error("the threshold is not inside the pane");
      sl.value = "3"; sl.dispatchEvent(new Event("input", {bubbles:true}));
      await sleep(800);
      if(state.minp !== 3) throw new Error("the threshold did not take");
      state.minp = 2; sl.value = "2"; sl.dispatchEvent(new Event("input", {bubbles:true}));
      await sleep(600);
    });
    await act("and comes back", async () => {
      click("#zFS");
      await sleep(900);
      const now = Math.round(document.getElementById("g").getBoundingClientRect().height);
      if(now !== fsWas)
        throw new Error("the svg is " + now + "px and should be back to " + fsWas + "px");
      if(!document.querySelector("#panel #pbody"))
        throw new Error("the step's controls did not go back into the panel");
      if(!document.querySelector(".rail .card.insp"))
        throw new Error("the inspector did not go back into the rail");
      if(!document.getElementById("fsbar").hidden)
        throw new Error("the pane buttons are still showing outside full screen");
    });

    /* THE PLOT BLOCK ON STEP 1.2: presets first, Manual last, and a layout
       without axes that really has none. Asserted on the MAP and not only in
       the panel: changing the menus and leaving the diagram drawing its own
       axes is the failure to catch, because then the layout read as Network in one place
       and as Axes in the other. No backticks or interpolation in here. */
    await go(2);
    await act("step 1.2 opens on a preset, not on the menus", async () => {
      const pres = [...document.querySelectorAll("#pbody [data-preset]")];
      if(pres.length !== 7) throw new Error("expected 7 presets, found " + pres.length);
      const lit = pres.filter(b => b.getAttribute("aria-pressed") === "true");
      if(lit.length !== 1 || lit[0].textContent.trim() !== "Shared, by level")
        throw new Error("the opening view is not lit as a preset");
      if(document.querySelectorAll("#pbody [data-ax]").length)
        throw new Error("the menus show before Manual is opened");
      const last = [...document.querySelectorAll("#pbody .presets button")].pop();
      if(!last || last.textContent.trim() !== "Manual")
        throw new Error("Manual is not the last button");
    });
    await act("Manual opens the layout choice and the menus", async () => {
      click("#pbody [data-manual]");
      await sleep(400);
      const ax = [...document.querySelectorAll("#pbody [data-ax]")].map(e => e.dataset.ax);
      if(ax.join(",") !== "xAxis,yAxis,cBy,sBy")
        throw new Error("the four menus are not all there: " + ax.join(","));
      const lay = [...document.querySelectorAll("#pbody [data-layout]")];
      if(lay.length !== 3) throw new Error("expected three layouts");
      const cl = document.querySelector("#pbody [data-layout='clusters']");
      if(!cl || !cl.disabled) throw new Error("Clusters should be present and disabled");
    });
    await act("Network takes the axes off the map, and keeps them", async () => {
      const hadX = state.xAxis, hadY = state.yAxis;
      click("#pbody [data-layout='network']");
      await sleep(1400);
      if(document.querySelectorAll("#g line.axr, #g line.axc").length)
        throw new Error("the map is still drawing axis lines");
      if(!document.getElementById("xSelWrap").hidden)
        throw new Error("the map still shows an axis menu that governs nothing");
      if([...document.querySelectorAll("#pbody [data-ax]")].some(e => e.dataset.ax === "xAxis"))
        throw new Error("the panel still shows the X menu");
      if(state.xAxis !== hadX || state.yAxis !== hadY)
        throw new Error("the layout overwrote the axes instead of ignoring them");
      click("#pbody [data-layout='axes']");
      await sleep(1400);
      if(state.xAxis !== hadX || state.yAxis !== hadY)
        throw new Error("going back to Axes did not restore the axes");
      if(!document.querySelectorAll("#g line.axr, #g line.axc").length)
        throw new Error("the axes did not come back");
    });
    await act("a preset closes Manual and lights itself", async () => {
      click("#pbody [data-preset='central']");
      await sleep(900);
      if(document.querySelector("#pbody .manbox")) throw new Error("Manual stayed open");
      const lit = [...document.querySelectorAll("#pbody [data-preset][aria-pressed='true']")];
      if(lit.length !== 1 || lit[0].dataset.preset !== "central")
        throw new Error("the preset pressed is not the one lit");
      if(state.layout !== "axes") throw new Error("a preset must put the layout back on axes");
    });

    await go(6);
    await act("derive on an empty model", () => click("#pbody [data-derive]"));
    await act("seed the list by hand", () => {
      BUF.lines.length = 0; BUF.seq = 0;
      bufPush({cmd:"diff", y:"welfare", x:"clarity", tree:OP("*", VAR("a"), VAR("clarity")),
        res:{verdict:"proved", dir:1, share:1, open:0, boxes:4}, bx:{clarity:[0.1,0.9]},
        rests:{base:{v:"proved"}, nterm:2, idle:[],
          used:[{lhs:"t_gain", rel:{}, now:"flat"}, {lhs:"t_cost", rel:{}, now:"flat"}],
          reads:[{n:"clarity", dec:true}, {n:"delta", dec:false}],
          rule:{n:2, rules:[], live:true}}});
      bufPush({cmd:"diff", y:"welfare", x:"cost", tree:OP("-", VAR("b"), VAR("cost")),
        res:{verdict:"partial", dir:-1, share:0.42, open:0, boxes:31}, flip:[0.31,0.34],
        rests:{base:{v:"partial"}, nterm:2, idle:[],
          used:[{lhs:"t_gain", rel:{}, now:"flat"}],
          reads:[{n:"cost", dec:true}], rule:{n:1, rules:[], live:false}}});
      bufPush({cmd:"write", src:"hand", tree:VAR("c")});
      renderPanel();
    });
    /* THE TWO TABS ON STEP 3.2, and the door between them. Plain words are
       the default now, so every control on the working list is behind a tab
       the walk has to open -- and "how was this derived" is the one path a
       reader who stays in words ever takes out of them. */
    await act("step 3.1 keeps its code behind a third tab", async () => {
      state.stage = 5; renderPanel();
      await sleep(400);
      if(document.querySelector("#pbody .arith"))
        throw new Error("the arithmetic is drawn before the tab is opened");
      const t = document.querySelector("#pbody [data-dec='arith']");
      if(!t) throw new Error("no Arithmetic tab");
      t.click();
      await sleep(500);
      if(!document.querySelector("#pbody .arith, #pbody [data-aedit]"))
        throw new Error("the Arithmetic tab draws no arithmetic");
      state.stage = 6; renderPanel();
      await sleep(400);
    });
    await act("step 3.2 opens on the findings, in words", async () => {
      state.der = "read"; renderPanel();
      await sleep(400);
      if(!document.querySelector("#pbody .helpstrip"))
        throw new Error("no help strip on the Findings tab");
      const n = document.querySelectorAll("#pbody .fnd").length;
      if(!n) throw new Error("no candidate findings drawn");
      if(document.querySelector("#pbody .fnds .meq"))
        throw new Error("a formula is drawn among the findings");
      if(!document.querySelector("#pbody [data-btake]"))
        throw new Error("no way to keep a finding from the Findings tab");
    });
    await act("how was this derived opens the line on Derivation", async () => {
      const b = document.querySelector("#pbody [data-derat]");
      if(!b) throw new Error("no derivation link on a finding");
      const want = b.dataset.derat;
      b.click();
      await sleep(500);
      if(state.der !== "work") throw new Error("it did not switch to Derivation");
      if(BUF.sel !== want) throw new Error("it did not select that line");
      if(!document.querySelector('#pbody [data-bsel="' + want + '"]'))
        throw new Error("the line is not on the Derivation tab");
    });
    await act("the ranking criteria open from the help strip", async () => {
      state.der = "read"; renderPanel();
      await sleep(400);
      if(document.querySelector("#pbody #defbox"))
        throw new Error("the criteria box is drawn before it is opened");
      click("#pbody [data-rankopen]");
      await sleep(400);
      if(!document.querySelector("#pbody #defbox"))
        throw new Error("the criteria box did not open");
      click("#pbody [data-rankopen]");
      await sleep(300);
      state.der = "work"; renderPanel();
      await sleep(300);
    });
    await act("open the commands menu", () => click("#pbody [data-wsmenu='cmds'] summary"));
    await act("open add-a-line", () => click("#pbody [data-wsmenu='add'] summary"));
    await act("filter to derivatives", () => click("#pbody [data-wsfold='k:diff']"));
    await act("filter to proved", () => click("#pbody [data-wsfold='s:proved']"));
    await act("clear the filter", () => click("#pbody [data-wsclr]"));
    await act("make a folder", () => {
      document.querySelector("#wsnewn").value = "a path";
      click("#pbody [data-wsadd]");
    });
    await act("file a line into it", () => {
      const s = document.querySelector("#pbody .bufchain .wsfs");
      s.value = WS.own[0].id; s.dispatchEvent(new Event("change", {bubbles:true}));
    });
    await act("select the second line", () => click("#pbody .bufchain .bline:nth-child(2)"));
    await act("combine two lines", () => {
      BUF.sel = BUF.lines[0].id; renderPanel();
      const b = document.querySelector("#wscb"); if(b) b.value = BUF.lines[2].id;
      click("#pbody [data-wscomb]");
    });
    await act("open the evidence panel", () => click("#pbody [data-wspop='evidence']"));
    await act("record a result from data", () => {
      BUF.sel = BUF.lines[0].id; renderPanel();
      const t = document.querySelector("#wsdin");
      t.value = "AMG-DATA x sign=+ n=1240 agrees=yes";
      t.dispatchEvent(new Event("input", {bubbles:true}));
      click("#pbody [data-wsdin]");
    });
    /* THE DOWNLOAD ROUTE'S LANGUAGE, and the control that is greyed without a
       local runtime. Both live inside the evidence panel, which the step's own
       inventory cannot see because it is taken before anything is opened, so
       they are pressed here instead. tests/bridge.mjs is where they are
       exercised with a runtime behind them; what this holds is that they are
       on the page at all for a reader who has none. */
    await act("the script in Python instead", () => click("#pbody [data-wslang='python']"));
    await act("and back to R", () => click("#pbody [data-wslang='r']"));
    await act("a dataset needs the bridge", () => click("#pbody [data-wsconnect]"));
    await act("open the search panel", () => click("#pbody [data-wspop='search']"));
    await act("open the score panel", () => click("#pbody [data-wspop='score']"));
    await act("put a line on the board", () => click("#pbody [data-btake]"));
    await act("set it aside", () => click("#pbody [data-bkeep]"));
    await act("stand behind it again", () => click("#pbody [data-bkeep]"));
    await go(7);
    await act("step seven reads the board", () => {});
    /* THE NOTEBOOK, which is step 4.1's second tab and therefore invisible to
       go(): a step is inventoried as it opens and this one opens on the
       findings. The three things that make it a notebook rather than a list of
       what one would hold -- the order, the prose, the file -- are all here. */
    await act("the notebook tab opens", () => click("#pbody [data-fin='notebook']"));
    await act("add a finding in words", () => click("#pbody #nbAdd"));
    await act("add a second part", () => {
      const s = document.getElementById("nbPick");
      s.value = "claimed"; s.dispatchEvent(new Event("change", {bubbles:true}));
    });
    await act("and it is added", () => click("#pbody #nbAdd"));
    await act("add the scholar's own prose", () => {
      const s = document.getElementById("nbPick");
      s.value = "note"; s.dispatchEvent(new Event("change", {bubbles:true}));
    });
    await act("and it is added too", () => click("#pbody #nbAdd"));
    await act("the order is the scholar's", () => click("#pbody [data-nbup]:not([disabled])"));
    await act("back to the findings", () => click("#pbody [data-fin='findings']"));
    await go(4);
    await act("step four, merger suggestions", () => {});
    await go(5);
    await act("step five, the declarations", () => {});

    /* THE WORKED EXAMPLE, OPENED. Everything above walks a fresh page, so
       nothing here ever saw the state a reader arrives in: a scenario loaded
       from a file, with a kept body, a board and a declared class. That is
       where the demo's two refused lines had been hiding -- its body named
       seven mechanisms where its own curation carries five, so the outcome
       three of its "proved" rows were about was not written at all, and no
       check in the repository could see it because buildLines infers a free
       parameter for any name nothing writes. Only the page's own builder,
       which has the curation, refuses it.

       Last, because loading a scenario replaces every store. */
    try{
      const got = await scenDemo();
      if(got.err) out.demo = {err:got.err};
      else {
        snapApply(got.o.snap);
        await sleep(600);
        await go(8);
        const spec = classSpec();
        const M = spec ? buildArith(spec) : null;
        /* A SHAPE SLOT HAS A FAMILY AND A COMPOSITION SLOT DOES NOT. This
           filter was written when every slot was a shape, and it silently
           dropped the composition slots the moment they existed -- so the
           snapshot would have recorded the set without the one axis that had
           just been added to it. The same filter in page/21-exprun.js had the
           same hole. */
        const slots = (typeof expSlotsNow === "function" ? expSlotsNow() : [])
          .filter(x => x.comp || famOf(x.term));
        /* A SEEDED SAMPLE RATHER THAN THE WHOLE CLASS. The demo declares two
           composition rules for one outcome, and the moment composition became
           an axis its class went from 3,125 combinations to 9,375 -- past the
           4,000 the page will run, because the first 4,000 of a cross product
           are a prefix and not a sample of it. So the walk declares the sample
           the page itself recommends, which is also what the button beside
           that refusal does. */
        EXP.set = "sample"; EXP.n = 500; EXP.seed = 7;
        if(typeof xrunGo === "function") xrunGo();
        /* AND THE COMPOSITION ON ITS OWN. Every shape slot held at the member
           that is written and only the composition swept, which is the one
           question the declared set could not ask while the composition was
           not an axis. On this demo it answers: the outcome's sign holds as written and
           additive, and the search cannot settle it under ces -- a power mean
           has a variable exponent and interval arithmetic cannot carry one.
           Recorded here because a decorative axis and a working one look the
           same in a size. */
        const comp = (() => {
          const sl = (typeof expSlotsNow === "function" ? expSlotsNow() : [])
            .filter(x => x.comp || famOf(x.term));
          if(!sl.some(x => x.comp)) return {none:"no outcome declares a composition class"};
          const pick = {};
          for(const x of sl) pick[x.term] = x.comp
            ? x.members.map(m => m.name) : [x.running || x.members[0].name];
          const was = {set:EXP.set, pick:EXP.pick};
          EXP.set = "tailored"; EXP.pick = pick;
          try{ xrunGo(); }catch(e){ /* reported through XRUN.err below */ }
          const got = {err:XRUN.err, ran:XRUN.ran,
            rows:(XRUN.rows || []).map(r => r.y + " in " + r.x + ": " + r.held + "/" +
              r.of + (r.undec ? " +" + r.undec + " unsettled" : "") +
              (r.turn ? " +" + r.turn + " turned" : ""))};
          EXP.set = was.set; EXP.pick = was.pick;
          EXP.n = 500; EXP.seed = 7;
          try{ xrunGo(); }catch(e){ /* back to the sampled run the record holds */ }
          return got;
        })();
        out.demo = {
          lines: (ARITH.kept && ARITH.kept.lines || []).length,
          bad: M ? M.bad.map(x => x.lhs) : ["no body"],
          miss: M ? M.miss : [],
          params: M ? M.params.map(varName).sort() : [],
          fam: Object.keys(ARITH.fam || {}).length,
          slots: slots.map(x => x.term + " @ " + (x.running || "-") + " of " + x.members.length)
                      .sort(),
          set: EXP.set,
          props: ((PROPS.out && PROPS.out.props) || [])
            .map(x => x.y + " in " + x.x + ": " + (x.err ? "ERR" : x.verdict)).sort(),
          board: BOARD.rows.map(r => (r.src || "auto") + " " + (r.verdict || "-") +
            " " + (r.forms ? xrunClause(r.forms, EXPSETS) : "-")),
          comp,
          /* THE CURATION AS THE BROWSER SEES IT HERE, which is not the same
             as a clean load of the demonstration: this walk arrives after
             thirty acts and with the known state where the body names a
             mechanism the curation does not carry. Recorded because it is what
             this path produces. The page-against-command-line comparison is in
             tests/cli.test.mjs and tests/exchange.mjs, both of which assert the
             same numbers from a clean load. */
          viewHere: view() ? {papersIn:view().papersIn, claimsIn:view().claimsIn,
            allNodes:(view().allNodes || []).length,
            allLinks:(view().allLinks || []).length,
            pass:(view().allLinks || []).filter(e => e.pass).length} : null,
          /* THE BOX THE TALLY RAN OVER. A tally without it is not
             interpretable, and a tally that moves when nothing about the model
             moved is a leak -- which is exactly how the first composition
             measurement here came back 59/500 where a clean page gave
             119/500. */
          box: M ? Object.keys(xrunBox(M)).sort().map(k =>
            k + "=[" + xrunBox(M)[k].map(v => +(+v).toFixed(4)).join(",") + "]") : [],
          run: {err:XRUN.err, ran:XRUN.ran, of:XRUN.of,
            rows:(XRUN.rows || []).map(r => r.y + " in " + r.x + ": " +
              r.held + "/" + r.of + (r.undec ? " +" + r.undec + " unsettled" : "")).sort()}
        };
      }
    }catch(e){ out.demo = {threw:String(e && e.message || e)}; }
    return out;
  };
})();
</script>`;

/* `docs` is a parameter so the same walk can be run against a COPY of the
   page: `--docs /tmp/emit/modules` walks the converted module page and diffs
   it against this snapshot, which is how the conversion is checked before it
   is applied. Nothing about the probe changes -- it reaches the page through
   window.__bench either way, which is what that hook is for. */
export async function walk(chrome, docs){
  const dir = docs || DOCS;
  const bench = path.join(dir, "bench");
  const port = await freePort();
  const srv = spawn("python3", ["-m", "http.server", String(port), "--directory", dir],
    {stdio:"ignore"});
  const probeFile = path.join(bench, "__pagewalk.html");
  try{
    await new Promise(r => setTimeout(r, 700));
    let page = fs.readFileSync(path.join(bench, "bench.html"), "utf8");
    /* Catch what the page throws while it LOADS, before anything is walked.
       A script that refers at its top level to a global a later script
       declares dies at that line: every declaration
       below it vanished, and the page still rendered because the panel is
       rebuilt on the first click. check_bench cannot see it -- the name IS
       declared, just later -- and the walk could not either, because by the
       time it runs everything has loaded. So the listener goes in ahead of
       the first script, and the walk reports what it caught. */
    const CATCH = `<script>window.__errs=[];` +
      `addEventListener("error",e=>window.__errs.push(e.message+" @ "+` +
      `String(e.filename||"").split("/").pop()+":"+e.lineno));</script>\n`;
    const head = page.indexOf("<script");
    page = head < 0 ? CATCH + page : page.slice(0, head) + CATCH + page.slice(head);
    fs.writeFileSync(probeFile, page + PROBE + `
<pre id="__out"></pre>
<script>(function(){ setTimeout(async () => {
  let r; try{ r = await window.__walk(); }
  catch(e){ r = {FATAL:String(e && e.message || e), stack:String(e && e.stack || "")}; }
  if(window.__errs && window.__errs.length) r.loadErrors = window.__errs.slice(0, 8);
  document.getElementById("__out").textContent = JSON.stringify(r);
}, 900); })();</script>`);
    /* ONE RETRY, AND ONLY WHEN CHROME RETURNED NOTHING AT ALL. A browser that
       fails to start under load is not a page that changed, and a red build
       nobody can reproduce is the one a reviewer remembers. This never hides a
       difference: a probe that ran and disagrees is compared, not re-run. */
    const run = () => spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox",
      "--virtual-time-budget=60000", "--dump-dom",
      `http://127.0.0.1:${port}/bench/__pagewalk.html`],
      {encoding:"utf8", maxBuffer:64 * 1024 * 1024});
    const got = /<pre id="__out">([\s\S]*?)<\/pre>/;
    let r = run();
    if(!got.test(r.stdout || "")){
      console.error("  chrome produced nothing; trying once more");
      r = run();
    }
    const m = got.exec(r.stdout || "");
    if(!m) throw new Error("the probe produced nothing, twice; chrome said: " +
      String(r.stderr || "").slice(0, 400));
    const txt = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return JSON.parse(txt);
  } finally {
    try{ fs.unlinkSync(probeFile); }catch(e){}
    srv.kill();
  }
}

export const readSnapshot = () =>
  fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, "utf8")) : null;
export const writeSnapshot = s =>
  fs.writeFileSync(SNAP, JSON.stringify(s, null, 1) + "\n");

/* What the old snapshot showed and the new one does not: a heading, a control
   id, or a whole host. Headings are compared on their first clause, because
   the note behind the (i) travels with them and rewording a note is not a
   removal. */
function vanished(want, got){
  const out = [];
  const head = t => String(t).split(/\u00a0|\si[A-Z]/)[0].trim().slice(0, 60);
  for(const w of (want.steps || [])){
    const g = (got.steps || []).find(x => x.n === w.n);
    if(!g){ out.push(`step ${w.n} is gone from the walk entirely`); continue; }
    const now = new Set((g.headings || []).map(head));
    for(const h of (w.headings || []))
      if(!now.has(head(h))) out.push(`step ${w.n}: the section "${head(h)}" no longer draws`);
    for(const host of Object.keys(w.controls || {})){
      const was = (w.controls[host] || []).map(c => c.id || c.d || c.lab || "?");
      const has = new Set(((g.controls || {})[host] || []).map(c => c.id || c.d || c.lab || "?"));
      for(const id of was)
        if(!has.has(id)) out.push(`step ${w.n}: ${host} no longer has the control "${id}"`);
    }
  }
  return out;
}

if(process.argv[1] && process.argv[1].endsWith("pagewalk.mjs")){
  const chrome = findChrome();
  if(!chrome){ console.error("no chrome found; set CHROME_PATH"); process.exit(2); }
  const di = process.argv.indexOf("--docs");
  const got = await walk(chrome, di > 0 ? process.argv[di + 1] : null);
  if(got.FATAL){ console.error("the walk threw:", got.FATAL); console.error(got.stack); process.exit(1); }
  if(got.loadErrors){
    console.error("the page threw while loading, which no other check sees:");
    for(const e of got.loadErrors) console.error("  " + e);
    process.exit(1);
  }
  /* THE HIDDEN GUARD, BEFORE ANYTHING ELSE AND OUTSIDE THE SNAPSHOT. It is
     lifted off the record first, so neither the comparison nor a re-record
     ever sees it: a check that --update can overwrite is not a check. */
  const drawn = [];
  for(const st of (got.steps || [])){
    for(const sel of (st.shown || [])) drawn.push(`step ${st.n}: ${sel}`);
    delete st.shown;
  }
  for(const sel of (got.shown || [])) drawn.push(`act ${sel}`);
  delete got.shown;
  if(drawn.length){
    console.error(`${drawn.length} element(s) are marked hidden and still drawn. ` +
      `A class that sets display beats the hidden attribute:`);
    for(const d of drawn.slice(0, 20)) console.error("  " + d);
    if(drawn.length > 20) console.error(`  and ${drawn.length - 20} more`);
    console.error("\nbench.css carries [hidden]:not([hidden=\"until-found\"])" +
      "{display:none!important} for exactly this.");
    process.exit(1);
  }
  if(process.argv.includes("--update")){
    /* A RE-RECORD THAT SILENTLY DROPS A SECTION IS HOW A DEFECT GETS BURIED.
       A block on step 1.3 that begins rendering nothing at all shows up as a
       heading gone from the walk; a reflexive `make walk-update` then
       overwrites the heading, and the one check that caught it has its
       evidence destroyed by the next command. ADDING a heading or a
       control is ordinary work and goes through. REMOVING one needs saying,
       because the usual cause is something that stopped drawing. */
    const want = readSnapshot();
    const gone = want ? vanished(want, got) : [];
    if(gone.length && !process.argv.includes("--accept-removals")){
      console.error(`this re-record would REMOVE ${gone.length} thing(s) the page used ` +
        `to show:`);
      for(const g of gone.slice(0, 24)) console.error("  " + g);
      if(gone.length > 24) console.error(`  and ${gone.length - 24} more`);
      console.error("\nIf a section stopped drawing, that is the defect and this would " +
        "hide it.\nIf the removal is the change you made, re-run with --accept-removals.");
      process.exit(1);
    }
    writeSnapshot(got);
    console.log(`snapshot written: ${got.steps.length} steps, ` +
      `${got.steps.reduce((n, s) => n + Object.values(s.controls).flat().length, 0)} controls, ` +
      `${got.acts.length} acts` + (gone.length ? `, ${gone.length} removal(s) accepted` : ""));
  } else {
    const want = readSnapshot();
    if(!want){ console.error("no snapshot yet — run with --update"); process.exit(2); }
    const a = JSON.stringify(want, null, 1), b = JSON.stringify(got, null, 1);
    if(a === b){ console.log("page walk: identical to the snapshot"); process.exit(0); }
    const al = a.split("\n"), bl = b.split("\n");
    let shown = 0;
    for(let i = 0; i < Math.max(al.length, bl.length) && shown < 40; i++)
      if(al[i] !== bl[i]){ console.log(`  line ${i}:\n    was  ${al[i]}\n    now  ${bl[i]}`); shown++; }
    console.error("page walk DIFFERS from the snapshot");
    process.exit(1);
  }
}

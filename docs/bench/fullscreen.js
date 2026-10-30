/* FULL SCREEN, FOR A DIAGRAM AND NOTHING ELSE ON THE PAGE.
   ==========================================================================

   Three diagrams want it: the map, each comparative-statics panel and each
   dependence plate. One helper rather than three, and it lives here rather
   than under `core/` because it touches the DOM, and rather than under `page/`
   because `statics/index.html` loads the statics module on its own and
   importing anything from `page/` would pull the whole page graph behind it.
   It imports nothing.

   TWO MODES, CHOSEN WHEN THE BUTTON IS PRESSED. The page is served two ways:
   by a local server, where the Fullscreen API works, and by the claude.ai
   host, where it runs in an iframe and the API works only if that iframe
   allows it. So the real API is tried and a CSS fallback covers the window
   when it is refused. Nothing here assumes which it got; `fsReal()` says.

   WHAT THE BROWSER HIDES. In real full screen only the full-screen element
   and its descendants are drawn. Anything the diagram needs that lives
   elsewhere -- the hover tooltip at body level, the controls that filter what
   the diagram shows -- has to move inside first. `adopt` does that and
   remembers where each node came from, down to which sibling it sat before,
   so leaving puts the page back exactly as it was.

   FULL SCREEN IS A VIEW AND NOT A DECISION. Nothing here is written to the
   scenario, the history or the browser store. */

const SHEET = new URL("./fullscreen.css", import.meta.url).href;
let sheeted = false;
function sheet(){
  if(sheeted || document.querySelector(`link[href="${SHEET}"]`)) return;
  sheeted = true;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = SHEET;
  document.head.appendChild(l);
}

const FS = {el:null, css:false, opts:null, keyed:null, changed:null, back:[], busy:false};

const FSLAB = ["Full screen", "Exit full screen"];

/* Where a node was, so it can go back. nextSibling rather than an index,
   because the list it came from may have been rewritten while it was away --
   `renderPanel` rewrites the panel on every step change, and it rewrites the
   body wherever that body happens to be living. */
function adopt(nodes, into){
  for(const n of nodes){
    if(!n || !n.parentNode) continue;
    FS.back.push({node:n, parent:n.parentNode, before:n.nextSibling});
    into.appendChild(n);
  }
}
function giveBack(){
  /* Last first, so a group of siblings adopted together goes back in order. */
  for(let i = FS.back.length - 1; i >= 0; i--){
    const b = FS.back[i];
    try{
      if(b.before && b.before.parentNode === b.parent) b.parent.insertBefore(b.node, b.before);
      else b.parent.appendChild(b.node);
    }catch(e){ /* the parent is gone; the node stays where it is rather than throwing */ }
  }
  FS.back = [];
}

const fsOn = el => FS.el === el;
const fsAny = () => !!FS.el;
const fsReal = () => !!FS.el && !FS.css;

/* `adopt` runs BEFORE the request, because a node moved in afterwards is a
   node the browser spent a frame not drawing. `onEnter` runs after, because
   what it is for is re-laying a diagram to a size that only exists once the
   element is full screen. */
async function fsEnter(el, opts){
  sheet();
  FS.el = el; FS.opts = opts || {}; FS.css = false; FS.back = [];
  adopt(FS.opts.adopt || [], el);
  /* THE REAL API NEEDS TRANSIENT ACTIVATION, so ask whether there is any
     before asking for full screen. Without this the promise from a
     programmatic click neither resolves nor rejects promptly, and the fallback
     waits behind it: a panel measured 900ms after the press had the chart
     class and no full-screen class at all, intermittently. Testing the
     activation makes the branch deterministic -- a person clicking gets the
     real thing, a test gets the CSS path, and an iframe that does not allow
     full screen reports fullscreenEnabled false and gets it too. */
  /* AND A GUIDED TOUR TAKES THE CSS PATH, whoever pressed the button. The
     browser's own full screen draws `el` and its subtree and nothing else, so
     the tour's backdrop, its rings and its card -- all of them at body level
     -- vanish at exactly the moment a stop is telling the reader to go and
     explore the map. The CSS path is the same picture with the rest of the
     page still in the document, so the overlay's fixed positioning works
     unchanged. */
  const canReal = !!(document.fullscreenEnabled && el.requestFullscreen &&
    !(opts && opts.css) &&
    (!navigator.userActivation || navigator.userActivation.isActive));
  let real = false;
  if(canReal){
    try{ await el.requestFullscreen(); real = !!document.fullscreenElement; }
    catch(e){ real = false; }
  }
  if(!real){
    FS.css = true;
    el.classList.add("fsfix");
    document.documentElement.classList.add("fslock");
  }
  el.classList.add("fson");
  /* ESC HAS A JOB ON THIS PAGE ALREADY: it clears the selection, the focus and
     the pinned construct. In CSS mode the first Esc leaves full screen and
     must do nothing else, so this listener captures and stops it. In real full
     screen the browser handles Esc itself and never delivers the key, which is
     why this branch tests for the CSS mode rather than for the key alone. */
  FS.keyed = ev => {
    if(ev.key !== "Escape" || !FS.css || !FS.el) return;
    ev.preventDefault(); ev.stopPropagation();
    fsExit();
  };
  window.addEventListener("keydown", FS.keyed, true);
  /* The browser can leave full screen without us: Esc, F11, a tab switch.
     Without this the page keeps the class and the adopted nodes. */
  FS.changed = () => { if(!document.fullscreenElement && !FS.css && FS.el) fsExit(); };
  document.addEventListener("fullscreenchange", FS.changed);
  if(FS.opts.onEnter) try{ FS.opts.onEnter(el); }catch(e){}
  return true;
}

async function fsExit(){
  if(!FS.el || FS.busy) return false;
  FS.busy = true;
  const el = FS.el, opts = FS.opts || {};
  try{
    if(FS.keyed) window.removeEventListener("keydown", FS.keyed, true);
    if(FS.changed) document.removeEventListener("fullscreenchange", FS.changed);
    el.classList.remove("fson", "fsfix");
    document.documentElement.classList.remove("fslock");
    giveBack();
    if(!FS.css && document.fullscreenElement){
      try{ await document.exitFullscreen(); }catch(e){}
    }
    FS.el = null; FS.css = false; FS.opts = null; FS.keyed = null; FS.changed = null;
    if(opts.onExit) try{ opts.onExit(el); }catch(e){}
  } finally { FS.busy = false; }
  return true;
}

async function fsToggle(el, opts){
  if(!el) return false;
  if(FS.el === el) return fsExit();
  if(FS.el) await fsExit();
  return fsEnter(el, opts);
}

/* A button that carries its own state, so three call sites do not each
   reimplement the label and the aria. */
function fsMark(btn, el){
  if(!btn) return;
  const on = fsOn(el);
  btn.textContent = FSLAB[on ? 1 : 0];
  btn.setAttribute("aria-pressed", on ? "true" : "false");
}

export { FSLAB, fsAny, fsExit, fsMark, fsOn, fsReal, fsToggle };

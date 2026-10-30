/* core: the curation, over the corpus that ships with the page.

   The command line ran the method from step 3.1 onward and said so: "What it
   deliberately does NOT do: run steps one to four. Those are curation, they
   need the corpus." Half of that was true. Rebuilding the corpus needs
   `purpose-review/`, which is outside the published repository; READING it does
   not, because `docs/bench/graph-data.js` ships with the page and holds every
   paper, claim, construct and wording score. What was missing was not the data
   but that the curation lived in functions reading a browser store.

   So the four questions steps 1.1 to 1.3 answer are in core/curate.js, each
   taking its decisions as plain data, and the page and `amg curate` both ask
   them. This holds the answers to the corpus as shipped.

   WHY THESE NUMBERS AND NOT OTHERS. They are the ones the page prints on step
   1.1 at its own defaults, so a change here that does not change the page is a
   change in two places that has to be deliberate -- and a change that DOES
   change the page shows up in the page walk as well, which is the pair of nets
   this extraction needed before it was safe to make.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { G } from "../docs/bench/graph-data.js";
import { BARS, COMPONENTS, barScore, claimKept, claimPasses, curate,
  foldNodes, nodeInScope, paperInScope, papersInScope } from "../docs/bench/core/curate.js";

/* The page's own defaults, as the decisions object core/ takes: every outlet
   in the frame, every tradition, a construct drawn once two papers in scope
   name it, the tightness the slider opens at, and no bar raised. */
const base = () => ({
  outlets:new Set(G.journals.map(j => j.f)), tradition:"all",
  minp:2, admit:new Set(),
  tight:0.15, collapse:false, apart:new Set(), groups:[],
  bar:{Comm:0, Spec:0, Evid:0},
  need:{Comm:{}, Spec:{}, Evid:{}},
  apply:{},
});

test("the corpus as shipped, at the page's own defaults", () => {
  const r = curate(G, base());
  assert.deepEqual(r.papers, {in:52, of:52});
  assert.equal(r.claims.of, 1080);
  assert.equal(r.claims.in, 1080);
  /* 1,026 constructs were extracted and 156 are DRAWN: a construct is drawn
     once two papers in scope name it, and the gap between those two numbers is
     the single most important fact about this literature. */
  assert.equal(r.constructs.of, 1026);
  assert.equal(r.constructs.drawn, 156);
  assert.equal(r.constructs.notions, 139);
  assert.equal(r.constructs.merged, 17);
  assert.equal(r.constructs.isolated, 17);
  assert.equal(r.arrows.all, 164);
  /* Two of the seventeen merges put two levels of analysis under one name,
     which is the error this bench exists to make visible rather than a number
     to be pleased about. */
  assert.equal(r.crossing, 2);
});

test("the threshold is what decides how much of the corpus is drawn", () => {
  const at = m => curate(G, Object.assign(base(), {minp:m})).constructs.drawn;
  assert.equal(at(1), 1026);
  assert.equal(at(2), 156);
  assert.equal(at(3), 52);
  assert.equal(at(4), 30);
  /* And raising it by one costs more than half of what is left, every time,
     which is why the step reports the cost rather than only the setting. */
  assert.ok(at(3) < at(2) / 2);
});

test("an admitted construct is drawn under the threshold", () => {
  const under = G.nodes.find(n => n.p.length === 1);
  assert.ok(under, "the corpus has no construct named by one paper");
  const d = base();
  assert.equal(nodeInScope(under, d, () => true), false);
  d.admit = new Set([under.i]);
  assert.equal(nodeInScope(under, d, () => true), true,
    "admitting a construct by hand did not draw it");
});

test("the tightness is what folds two names into one notion", () => {
  const at = t => curate(G, Object.assign(base(), {tight:t})).constructs;
  /* At the top of the range nothing merges: every pair of names is two
     quantities until a score says otherwise. */
  assert.equal(at(1).merged, 0);
  assert.equal(at(1).notions, at(1).drawn);
  assert.ok(at(0.15).merged > at(0.5).merged,
    "loosening the tightness did not merge more");
});

test("a pair forced apart outranks any score", () => {
  const d = base();
  const r0 = curate(G, d);
  /* Find a pair the fold actually put together at this tightness, and forbid
     it. One fewer merge, and nothing else moves. */
  const pair = (G.sim || []).find(p => p[2] >= d.tight &&
    r0.of.get(p[0]) && r0.of.get(p[0]) === r0.of.get(p[1]));
  assert.ok(pair, "the fold merged nothing at the default tightness");
  const d2 = Object.assign(base(), {apart:new Set([[pair[0], pair[1]].sort().join("|")])});
  const r1 = curate(G, d2);
  assert.ok(r1.constructs.notions > r0.constructs.notions,
    "forcing a merged pair apart did not separate them");
  assert.equal(r1.constructs.drawn, r0.constructs.drawn,
    "forcing a pair apart changed what is drawn, which it must not");
});

test("a merge by hand is honoured only where merges are collapsed", () => {
  const two = G.nodes.filter(n => n.p.length >= 3).slice(0, 2).map(n => n.i);
  const g = [{id:"g1", name:"by hand", members:two}];
  const open = foldNodes(G.nodes, G.sim, Object.assign(base(), {groups:g}));
  const shut = foldNodes(G.nodes, G.sim, Object.assign(base(), {groups:g, collapse:true}));
  /* Until they are collapsed a hand merge is a BOUNDARY on the map and not one
     node, which is the page's own distinction and travels with the fold. */
  assert.ok(shut.cl.size < open.cl.size,
    "collapsing a hand merge did not fold its members into one notion");
  assert.equal(shut.of.get(two[0]), shut.of.get(two[1]));
});

test("the three bars score twelve components, and two of them are costs", () => {
  assert.deepEqual(BARS, ["Comm", "Spec", "Evid"]);
  assert.equal(BARS.reduce((t, b) => t + COMPONENTS[b].items.length, 0), 12);
  assert.equal(COMPONENTS.Comm.cost, true);
  assert.equal(COMPONENTS.Spec.cost, true);
  assert.equal(COMPONENTS.Evid.cost, false);
  /* A COST flag records a problem, so a claim satisfies that component by NOT
     carrying it. Getting this backwards would invert two bars out of three and
     nothing about the shape of the output would look wrong. */
  const bad = {cmf:["crosses levels"], spf:[], eaf:[]};
  const good = {cmf:[], spf:[], eaf:[]};
  assert.equal(barScore(bad, "Comm", {}).have, 3);
  assert.equal(barScore(good, "Comm", {}).have, 4);
  const got = {cmf:[], spf:[], eaf:["first-hand"]};
  assert.equal(barScore(got, "Evid", {}).have, 1);
});

test("a required component refuses a claim whatever the slider says", () => {
  const c = {cmf:["crosses levels"], spf:[], eaf:["first-hand", "scope stated"]};
  const d = Object.assign(base(), {bar:{Comm:0, Spec:0, Evid:0}});
  assert.equal(claimPasses(c, d), true, "nothing required, nothing demanded");
  d.need = {Comm:{lvl:"req"}, Spec:{}, Evid:{}};
  assert.equal(claimPasses(c, d), false,
    "a claim that crosses levels passed a bar that requires it not to");
  d.need = {Comm:{lvl:"ign"}, Spec:{}, Evid:{}};
  assert.equal(claimPasses(c, d), true,
    "ignoring the component did not stop it refusing");
});

test("filter removes and fade does not", () => {
  const c = {cmf:["crosses levels"], spf:[], eaf:[]};
  const d = Object.assign(base(), {bar:{Comm:4, Spec:0, Evid:0}});
  assert.equal(claimPasses(c, d), false, "it should fail a bar set to four");
  d.apply = {Comm:"fade"};
  assert.equal(claimKept(c, d), true, "a faded claim was removed");
  d.apply = {Comm:"filter"};
  assert.equal(claimKept(c, d), false, "a filtered claim was kept");
});

test("raising the bars costs claims, and the step says how many", () => {
  const at = b => curate(G, Object.assign(base(), {bar:{Comm:b, Spec:b, Evid:b}}));
  assert.equal(at(0).claims.clearing, 1080);
  assert.equal(at(1).claims.clearing, 943);
  assert.equal(at(2).claims.clearing, 483);
  assert.equal(at(3).claims.clearing, 60);
  assert.equal(at(4).claims.clearing, 22);
  /* Which is the finding: at three of four on every bar this literature has
     sixty claims left out of a thousand and eighty. */
  assert.ok(at(3).claims.clearing < at(0).claims.clearing / 10);
});

test("the tradition filter narrows the corpus and not the extraction", () => {
  const r = curate(G, Object.assign(base(), {tradition:"st"}));
  assert.equal(r.papers.in, 10);
  assert.equal(r.papers.of, 52);
  assert.ok(r.constructs.drawn < 20,
    "ten papers drew " + r.constructs.drawn + " constructs at a threshold of two");
  /* `--` is a value and not a blank: a paper the review did not place is a
     fact about the review. */
  const un = papersInScope(G, Object.assign(base(), {tradition:"--"}));
  assert.ok(un.length > 0, "no paper is unassigned, which this corpus is not");
  assert.ok(un.every(id => G.papers[id].ap === "--"));
});

test("an outlet outside the frame takes its papers with it", () => {
  const one = G.journals[0].f;
  const r = curate(G, Object.assign(base(), {outlets:new Set([one])}));
  assert.equal(r.papers.in, G.journals[0].c,
    "the outlet list's own count disagrees with what the scope test returns");
  assert.ok(r.papers.in < 52);
  assert.equal(paperInScope({jf:"A Journal Nobody Searched", ap:"st"},
    {outlets:new Set([one]), tradition:"all"}), false);
});

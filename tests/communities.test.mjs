/* THE CLUSTERING, AND THE THREE THINGS THAT MAKE IT USABLE.
   ==========================================================================

   A clustering that depends on a seed, or on the order the caller happened to
   hold its nodes in, cannot be reproduced by anybody else -- and the call this
   artifact is built for rules out work that cannot. So the first test is not
   about quality at all: it is that shuffling the input changes nothing.

   The second is the failure the method exists to survive. A hub's
   neighbourhood is close to a star: with the hub left out, the spokes have
   almost no arrows among them. Measured on the shipped payload, the three
   constructs the demonstration merges as firm performance have 24 neighbours
   with SEVEN arrows between them, touching 11 of the 24, so thirteen have no
   arrow to any other neighbour and arrows alone leave eighteen pieces.
   Shared papers carry what the arrows do not: 73 of the 276 possible pairs
   appear in the same paper, and exactly one neighbour shares a paper with
   nobody.

   Eight arrows and 23 pieces over a hub of seven ids and a
   registry floor of two claims. Both have since changed -- the demonstration
   merges three ids, and the floor is one -- so the numbers here are this
   payload's and the shape of the finding is the note's.

   The third is the result itself, on the real corpus, so that a change to the
   engine cannot quietly change what a scholar is shown.
*/

import test from "node:test";
import assert from "node:assert/strict";
import { communities } from "../docs/bench/core/communities.js";
import { G } from "../docs/bench/graph-data.js";

const HUB = ["firm-accounting-performance", "firm-overall-performance",
             "stock-market-index-outperformance"];

/* The neighbourhood of a merged construct, and the ties the page builds by
   default: one per shared paper, one per direct arrow between two
   neighbours, with the hub itself left out of both. */
function hood(hubIds){
  const hub = new Set(hubIds);
  const N = new Map(G.nodes.map(n => [n.i, n]));
  const nbr = new Set();
  for(const c of G.claims) for(const a of (c.a || [])) for(const b of (c.c || [])){
    if(a === b) continue;
    const ha = hub.has(a), hb = hub.has(b);
    if(ha !== hb) nbr.add(ha ? b : a);
  }
  const S = [...nbr].sort();
  const inS = new Set(S);
  const papers = [], arrows = [];
  for(let i = 0; i < S.length; i++) for(let j = i + 1; j < S.length; j++){
    const pi = new Set((N.get(S[i]) || {p:[]}).p);
    const sh = ((N.get(S[j]) || {p:[]}).p).filter(p => pi.has(p)).length;
    if(sh) papers.push([S[i], S[j], sh]);
  }
  for(const c of G.claims) for(const a of (c.a || [])) for(const b of (c.c || []))
    if(inS.has(a) && inS.has(b) && a !== b) arrows.push([a, b, 1]);
  return {ids:S, papers, arrows};
}

test("the order the caller holds its nodes in changes nothing", () => {
  const {ids, papers, arrows} = hood(HUB);
  const pairs = papers.concat(arrows);
  const a = communities(ids, pairs, {resolution:1});
  /* Reversed ids, reversed pairs, and the pairs' own ends swapped: three
     orderings a caller could plausibly hand over. */
  const b = communities(ids.slice().reverse(),
    pairs.slice().reverse().map(p => [p[1], p[0], p[2]]), {resolution:1});
  assert.deepEqual(b.clusters, a.clusters, "the clustering is order-dependent");
  assert.deepEqual(b.lone, a.lone);
});

test("on a star with the hub left out, every spoke is its own cluster", () => {
  const {ids, arrows} = hood(HUB);
  /* ARROWS ONLY. This is the measurement that rules community detection out
     as the whole answer: the neighbourhood of a hub is not a community
     structure until something other than arrows ties it together. */
  const r = communities(ids, arrows, {resolution:1});
  assert.equal(r.n, 24, "the demonstration's merge should have 24 neighbours");
  assert.equal(r.clusters.length, 18,
    "arrows alone gave " + r.clusters.length + " clusters over 24 spokes; eighteen is " +
    "what this payload's seven internal arrows allow, and a number far below it would " +
    "mean the star was being clustered rather than reported as one");
  assert.equal(r.lone.length, 13,
    "thirteen of the 24 have no arrow to any other neighbour and should be reported untied");
  /* And a bare star, written out, to say the same thing without the corpus. */
  const s = communities(["a", "b", "c", "d", "e"], []);
  assert.deepEqual(s.clusters, [["a"], ["b"], ["c"], ["d"], ["e"]]);
  assert.equal(s.lone.length, 5);
});

test("shared papers carry what the arrows do not, and the result is fixed", () => {
  const {ids, papers, arrows} = hood(HUB);
  assert.equal(papers.length, 73,
    "shared-paper ties on this neighbourhood: " + papers.length);
  assert.ok(papers.length > arrows.length * 10,
    "the whole method rests on co-occurrence carrying more than the arrows do: " +
    papers.length + " paper ties against " + arrows.length + " arrows");
  const r = communities(ids, papers.concat(arrows), {resolution:1});
  /* FULL LOUVAIN, which is local moving AND aggregation. The prototype
     ran the first phase alone and reported six clusters, the smallest of them
     a pair; aggregation folds that pair into the group of six it was already
     tied to, giving eight. The difference is the whole reason the engine runs
     the second phase. */
  assert.equal(r.clusters.length, 5,
    "expected five clusters at resolution 1, got " + r.clusters.length);
  assert.deepEqual(r.clusters.map(c => c.length), [8, 6, 5, 4, 1]);
  assert.deepEqual(r.clusters[1], ["clarity-only-index", "management-quality-factor",
    "nondiscrimination-factor", "purpose-as-employee-belief",
    "purpose-camaraderie-factor", "purpose-clarity-factor"],
    "the survey-factor cluster is one paper's own instrument and should hold together");
  assert.deepEqual(r.clusters[4], ["purpose-coordinated-organizational-action"],
    "the one neighbour sharing no paper with any other should stand alone");
  /* A higher resolution wants more and smaller communities. That it responds
     at all is what makes the slider a control rather than an ornament. */
  const hi = communities(ids, papers.concat(arrows), {resolution:2.5});
  assert.ok(hi.clusters.length > r.clusters.length,
    "resolution 2.5 gave " + hi.clusters.length + " clusters against " +
    r.clusters.length + " at 1, so the resolution does nothing");
});

test("the rungs are a hierarchy, not a list of unrelated runs", () => {
  /* Louvain's second phase treats each community as one node and runs the
     first again, so the passes ARE nested: a community at one rung is a union
     of communities at the rung below. That is what makes a level control
     meaningful rather than decorative -- moving down it subdivides what you
     were looking at instead of showing you a different clustering. Measured
     here on the whole map rather than on a neighbourhood, because that is
     where the levels are for. */
  const vis = G.nodes.filter(n => (n.p || []).length >= 2);
  const ids = vis.map(n => n.i);
  const pairs = [];
  for(let i = 0; i < vis.length; i++){
    const pi = new Set(vis[i].p);
    for(let j = i + 1; j < vis.length; j++){
      let sh = 0;
      for(const p of vis[j].p) if(pi.has(p)) sh++;
      if(sh) pairs.push([vis[i].i, vis[j].i, sh]);
    }
  }
  const r = communities(ids, pairs, {resolution:1});
  assert.ok(r.ladder.length >= 2,
    "one rung only, so there is no hierarchy to offer: " + r.ladder.length);
  assert.deepEqual(r.clusters, r.ladder[r.ladder.length - 1],
    "`clusters` must stay the coarsest rung, or everything reading it changes meaning");
  for(let k = 0; k + 1 < r.ladder.length; k++){
    for(const coarse of r.ladder[k + 1]){
      const held = new Set(coarse);
      for(const fine of r.ladder[k]){
        const inside = fine.filter(x => held.has(x)).length;
        assert.ok(inside === 0 || inside === fine.length,
          "rung " + k + " cluster [" + fine.join(",") + "] is split across rung " +
          (k + 1) + ", so the rungs are not nested");
      }
    }
    assert.ok(r.ladder[k].length > r.ladder[k + 1].length,
      "rung " + (k + 1) + " is no coarser than rung " + k);
  }
  /* Every construct appears exactly once at every rung. */
  for(const L of r.ladder)
    assert.equal(L.reduce((n, c) => n + c.length, 0), ids.length,
      "a rung does not account for every construct exactly once");
});

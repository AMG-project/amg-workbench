/* COMMUNITIES IN A WEIGHTED GRAPH, DETERMINISTICALLY.
   ==========================================================================

   Why this exists, and why the obvious thing does not work. A literature has
   hubs. Measured on this corpus: the three constructs the
   demonstration merges as firm performance have 24 neighbours, every one of
   them an antecedent, and WITH THE HUB LEFT OUT those neighbours have 8
   arrows among them and fall into 23 disconnected pieces. To a method that
   clusters on arrows the neighbourhood is a star, so it either puts every
   spoke in one cluster with the hub or splits them arbitrarily.

   What carries the structure the arrows lack is co-occurrence: 81 pairs of
   those neighbours appear in the same paper. So the caller decides what a tie
   is -- shared papers, direct arrows, wording similarity -- and this file only
   takes the weighted pairs and finds the communities.

   DETERMINISM IS THE POINT, not a nicety. The call this is being built for
   rules out work that cannot be reproduced by others, and a clustering that
   depends on a random seed or on object key order cannot be. So: nodes are
   sorted before they are indexed, every candidate community is considered in
   ascending index order, a move is taken only on a strict improvement, and
   there is no random number anywhere. The same pairs give the same clusters
   on any machine, in any browser, in any order the caller happens to hold
   them.

   FULL LOUVAIN, not the local-moving phase alone. Local moving settles nodes
   into communities; aggregation then treats each community as one node and
   runs the whole thing again, which is what lets small communities join into
   larger ones that the first pass cannot see. An earlier prototype ran
   the first phase only, so its table is the first level of this.

   The resolution multiplies the null model: above 1 it wants more and smaller
   communities, below 1 fewer and larger. */
"use strict";

const EPS = 1e-12;

/* One level of the algorithm, over an integer-indexed weighted graph.
   `adj[i]` is a Map of j -> w for j != i. `self[i]` is the weight inside i,
   which is zero at the first level and the community's internal weight after
   an aggregation. Returns the community index of each node, relabelled from 0
   in order of the smallest member, so two runs cannot differ by a permutation. */
function level(adj, self, res){
  const n = adj.length;
  const k = adj.map((m, i) => {
    let s = 2 * (self[i] || 0);
    for(const w of m.values()) s += w;
    return s;
  });
  const m2 = k.reduce((s, x) => s + x, 0);
  const com = Array.from({length:n}, (_, i) => i);
  const tot = k.slice();
  if(m2 <= 0) return com;
  let moved = true, pass = 0;
  while(moved && pass++ < 200){
    moved = false;
    for(let i = 0; i < n; i++){
      const ci = com[i];
      tot[ci] -= k[i];
      /* The weight i has into each neighbouring community. i's own self-loop
         travels with it whatever it joins, so it is the same addend for every
         candidate and is left out of the comparison. */
      const kin = new Map();
      for(const [j, w] of adj[i]) kin.set(com[j], (kin.get(com[j]) || 0) + w);
      let best = ci, bg = (kin.get(ci) || 0) - res * tot[ci] * k[i] / m2;
      /* ASCENDING COMMUNITY INDEX, and a strict improvement. Two candidates
         of equal gain go to the lower index, which is the whole of the
         tie-breaking rule. */
      const cands = [...kin.keys()].sort((a, b) => a - b);
      for(const c of cands){
        if(c === ci) continue;
        const g = kin.get(c) - res * tot[c] * k[i] / m2;
        if(g > bg + EPS){ bg = g; best = c; }
      }
      com[i] = best;
      tot[best] += k[i];
      if(best !== ci) moved = true;
    }
  }
  /* Relabel by the smallest member, so the numbering is a fact about the
     input and not about the order the loop happened to settle. */
  const first = new Map();
  for(let i = 0; i < n; i++) if(!first.has(com[i])) first.set(com[i], i);
  const order = [...first.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]);
  const re = new Map(order.map((c, i) => [c, i]));
  return com.map(c => re.get(c));
}

/* Collapse each community into one node: inter-community weights summed, and
   each community's internal weight kept as its self-loop so the next level
   still knows how tightly it is held together. */
function fold(adj, self, com){
  const K = Math.max(0, ...com) + 1;
  const nadj = Array.from({length:K}, () => new Map());
  const nself = new Array(K).fill(0);
  for(let i = 0; i < com.length; i++){
    nself[com[i]] += (self[i] || 0);
    for(const [j, w] of adj[i]){
      if(j < i) continue;                  // each undirected pair once
      const a = com[i], b = com[j];
      if(a === b) nself[a] += w;
      else{
        nadj[a].set(b, (nadj[a].get(b) || 0) + w);
        nadj[b].set(a, (nadj[b].get(a) || 0) + w);
      }
    }
  }
  return {adj:nadj, self:nself};
}

/* THE DOOR. `ids` is any iterable of node identifiers; `pairs` is a list of
   [a, b, weight] with weight > 0, in any order, duplicates summed. Returns
   the clusters as arrays of ids, largest first and ties by first member, plus
   the ids that have no tie to anything else. */
function communities(ids, pairs, opts){
  const res = opts && isFinite(+opts.resolution) ? +opts.resolution : 1;
  const S = [...new Set([...ids].map(String))].sort();
  const at = new Map(S.map((s, i) => [s, i]));
  let adj = S.map(() => new Map());
  for(const p of (pairs || [])){
    const a = at.get(String(p[0])), b = at.get(String(p[1])), w = +p[2];
    if(a === undefined || b === undefined || a === b || !isFinite(w) || w <= 0) continue;
    adj[a].set(b, (adj[a].get(b) || 0) + w);
    adj[b].set(a, (adj[b].get(a) || 0) + w);
  }
  const lone = S.filter((s, i) => adj[i].size === 0);
  let self = S.map(() => 0);
  let map = S.map((s, i) => i);              // original node -> current super-node
  let K = S.length;
  /* THE LADDER, NOT JUST THE TOP OF IT.
     ----------------------------------------------------------------------
     Louvain's second phase treats each community as one node and runs the
     first again, so the passes ARE a hierarchy: every community at one rung
     is a union of communities at the rung below. This kept only the last
     mapping and threw the rest away, which meant a scholar could have the
     coarsest reading and nothing between it and one-construct-per-cluster.
     Each rung is kept, finest first, and `clusters` is the top so that a
     caller that wants only the coarsest reading is unaffected.

     What is wanted is the whole map clustered with nested levels, and the
     cohesiveness set by hand. The rungs are that, and they are free:
     the whole ladder comes out of one run, so moving between them costs
     nothing and only the ties and the resolution need recomputing. */
  const groupsOf = m => {
    const by = new Map();
    S.forEach((s, i) => {
      const c = m[i];
      if(!by.has(c)) by.set(c, []);
      by.get(c).push(s);
    });
    const out = [...by.values()].map(x => x.slice().sort());
    out.sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return out;
  };
  const ladder = [];
  for(let depth = 0; depth < 20; depth++){
    const com = level(adj, self, res);
    const k = Math.max(-1, ...com) + 1;
    if(k >= K) break;                        // nothing collapsed, so nothing more to find
    map = map.map(i => com[i]);
    ladder.push(groupsOf(map));
    const f = fold(adj, self, com);
    adj = f.adj; self = f.self; K = k;
    if(K <= 1) break;
  }
  if(!ladder.length) ladder.push(groupsOf(map));
  return {clusters:ladder[ladder.length - 1], ladder, lone, n:S.length, resolution:res};
}

export { communities };

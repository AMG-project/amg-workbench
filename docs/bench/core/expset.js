/* core: which form combinations a declared class contains.

   A declared class is a cross product. Three mechanisms whose shape classes
   admit fifteen members each is 3,375 combinations, and the page ran whatever
   it ran without the scholar ever choosing, which makes the coverage behind a
   robustness claim an accident of what was cheap. So the set is declared
   first and the results come second, and each of the seven ways to pick one
   reports its own size before anything runs: the size is what decides whether
   a claim about the class is a claim about the class.

   Nothing here draws, reads the corpus, or knows what a mechanism is. A slot
   arrives as plain data -- {term, label, running, box, members} -- and turning
   the curation into that is the page's job, in page/20-expset.js. To change
   WHICH combinations get explored, change this file; tests/expset.test.mjs
   holds it to its sizes.

   core/ RULE: nothing in this file may use a name declared outside core/.
   scripts/check_bench.py fails the build if one does. */
"use strict";

const EXP = {
  set: "all",            // written | ends | families | oat | sample | all | tailored
  /* THE WHOLE CLASS, unless the scholar narrows it. It was "written" --
     one combination of the nine thousand the worked example declares -- so a
     reader who touched nothing got a step whose job is robustness reporting
     a single point. The declaration still has to be made before the run and
     is still saved with the project; what changed is which way it defaults,
     and narrowing is now the deliberate act rather than widening. */
  n: 24,                 // how many, for `sample`
  seed: 7,               // and with which seed, so it reproduces
  pick: {},              // term -> [member names], for `tailored`
  why: "",               // what a reviewer said about the set it proposed
  name: "",              // what the scholar called it
  out: null,             // what came back from a reviewer, before it was taken
  err: "",
  at: ""
};
/* HOW MANY COMBINATIONS ARE ENUMERATED AT MOST. The SIZE is always exact;
   this bounds the list a run walks. It was 4,000, chosen without measuring,
   and it refused the worked example's own class of 9,375 -- so the step whose
   job is to read a finding against the whole declared class could not do it
   on the project this page ships. Measured since: 500 combinations over two
   propositions settle in under 20ms in a headless browser, which puts the
   whole class at well under a second. This number is where building the list
   itself starts to cost memory worth minding; what bounds a run in practice
   is the WORK in page/21-exprun.js, because cost is combinations times
   propositions and not combinations. */
const EXPCAP = 50000;

const EXPSETS = [
  ["written",  "As written",      "one combination — every mechanism at the member you wrote"],
  ["ends",     "The two ends",    "the first and last member of each slot: brackets a family when the property is monotone in curvature"],
  ["families", "One per family",  "one member of every family a slot admits: a change of shape rather than of degree"],
  ["oat",      "One at a time",   "everything at the written member, one slot swept: this is what names the declaration a conclusion depends on"],
  ["sample",   "A seeded sample", "n combinations, drawn with a stated seed, so the run reproduces"],
  ["all",      "Everything",      "the whole cross product — what you report"],
  ["tailored", "Tailored",        "members picked per slot, by you or proposed by a reviewer"]
];

/* A slot's members, as plain data, so the enumeration can be tested without
   the page: {term, label, running, members:[{fam, name, src}]}. */
const expMembers = s => (s && s.members) || [];
const expNames = s => expMembers(s).map(m => m.name);

/* The member each slot sits at when nothing else is said: what is written,
   or the first member the slot admits. */
function expBase(slots){
  return slots.map(s => {
    const ms = expMembers(s);
    return ms.find(m => m.name === s.running) || ms[0] || null;
  });
}

/* Which members each slot contributes under a given set. The enumeration
   below is the cross product of these, except for `oat`, which is a star and
   not a product. */
function expLanes(slots, kind, opts){
  const o = opts || {};
  return slots.map(s => {
    const ms = expMembers(s);
    if(!ms.length) return [];
    if(kind === "ends")
      return ms.length < 2 ? [ms[0]] : [ms[0], ms[ms.length - 1]];
    if(kind === "families"){
      const seen = new Set(), out = [];
      for(const m of ms) if(!seen.has(m.fam)){ seen.add(m.fam); out.push(m); }
      return out;
    }
    if(kind === "tailored"){
      const want = (o.pick || {})[s.term];
      if(!want || !want.length) return ms;
      const keep = ms.filter(m => want.includes(m.name));
      return keep.length ? keep : ms;
    }
    return ms;                       // written, oat, sample, all
  });
}

/* How many combinations the set holds. Exact, and computed without building
   them -- the whole point of asking is to find out before you wait. */
function expSize(slots, kind, opts){
  const o = opts || {};
  if(!slots.length) return 0;
  if(kind === "written") return 1;
  if(kind === "oat"){
    const n = slots.reduce((t, s) => t + Math.max(0, expMembers(s).length - 1), 0);
    return 1 + n;
  }
  const lanes = expLanes(slots, kind, o);
  const prod = lanes.reduce((t, l) => t * Math.max(1, l.length), 1);
  if(kind === "sample") return Math.min(prod, Math.max(1, o.n || 1));
  return prod;
}

/* A seeded generator, so `sample` is a declaration and not a shuffle. The
   same seed and the same slots give the same combinations on any machine. */
function expRand(seed){
  let x = (seed >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296; };
}

/* The combinations themselves, each an array of {term, fam, name, src} in
   slot order. Capped at EXPCAP so that choosing `all` on a large class
   cannot freeze the page before the size has been read. */
function expEnum(slots, kind, opts){
  const o = opts || {};
  if(!slots.length) return [];
  const base = expBase(slots);
  const row = ms => ms.map((m, i) => m ? {term:slots[i].term, fam:m.fam, name:m.name, src:m.src} : null);
  if(kind === "written") return base.every(Boolean) ? [row(base)] : [];

  if(kind === "oat"){
    const out = base.every(Boolean) ? [row(base)] : [];
    slots.forEach((s, i) => {
      for(const m of expMembers(s)){
        if(base[i] && m.name === base[i].name) continue;
        const ms = base.slice(); ms[i] = m;
        if(ms.every(Boolean)) out.push(row(ms));
      }
    });
    return out.slice(0, EXPCAP);
  }

  const lanes = expLanes(slots, kind, o);
  if(lanes.some(l => !l.length)) return [];
  if(kind === "sample"){
    const rnd = expRand(o.seed == null ? 7 : o.seed);
    const want = Math.min(expSize(slots, kind, o), EXPCAP);
    const seen = new Set(), out = [];
    let guard = want * 40 + 200;
    while(out.length < want && guard-- > 0){
      const ms = lanes.map(l => l[Math.floor(rnd() * l.length)]);
      const k = ms.map(m => m.name).join("|");
      if(seen.has(k)) continue;
      seen.add(k); out.push(row(ms));
    }
    return out;
  }

  let out = [[]];
  for(const l of lanes){
    const next = [];
    for(const head of out) for(const m of l){
      if(next.length >= EXPCAP) break;
      next.push(head.concat([m]));
    }
    out = next;
    if(out.length >= EXPCAP) break;
  }
  return out.map(row).slice(0, EXPCAP);
}

/* One line saying what the set is, for the row, the record and the export.
   A set nobody can name is a set nobody can report. */
function expLabel(slots, kind, opts){
  const o = opts || {};
  const n = expSize(slots, kind, o);
  const of = slots.reduce((t, s) => t * Math.max(1, expMembers(s).length), 1);
  const nm = (EXPSETS.find(x => x[0] === kind) || [, kind])[1];
  return `${nm} — ${n} of ${of} combination${of === 1 ? "" : "s"}` +
    (kind === "sample" ? `, seed ${o.seed == null ? 7 : o.seed}` : "");
}

/* What a reviewer proposed, checked against the members that exist. A term
   the model does not have, or a member a slot does not admit, is COUNTED and
   not written -- the rule every proposal on this bench is held to. */
function expTake(r, slots){
  const by = new Map(slots.map(s => [s.term, new Set(expNames(s))]));
  const pick = {}, refused = [];
  for(const p of ((r && r.picks) || [])){
    const t = String((p && p.term) || "");
    if(!by.has(t)){ refused.push(t || "(no term)"); continue; }
    const ok = [];
    for(const m of ((p && p.members) || [])){
      const nm = String(m);
      if(by.get(t).has(nm)) ok.push(nm); else refused.push(t + " / " + nm);
    }
    if(ok.length) pick[t] = ok;
  }
  return {pick, refused,
    why: String((r && r.why) || "").replace(/\s+/g, " ").trim().slice(0, 600),
    name: String((r && r.name) || "").replace(/\s+/g, " ").trim().slice(0, 80),
    at: new Date().toISOString().slice(0, 10)};
}


export { EXP, EXPCAP, EXPSETS, expBase, expEnum, expLabel, expLanes, expMembers, expNames, expRand, expSize, expTake };

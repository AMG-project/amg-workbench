#!/usr/bin/env node
/* The method, without the interface.

   Everything the page does to a model after step six is arithmetic over a
   declared box, and none of it needs a browser. A scenario file carries every
   decision; kernel.js runs outside one; the schemas say what a result is. This
   is the three of them joined, so an agent -- or a replication, or a CI job --
   can drive the method directly.

   An agent driving it is ONE MORE PROPOSER and gets no more trust for it: the
   grammar still refuses by name, the box is still the declared one, and a
   verdict still says which method settled it.

   THE CURATION IS HERE TOO. "It needs the corpus" is half right: rebuilding
   one needs
   `purpose-review/`, which is outside the published repository and always will
   be. READING the one that ships does not: `docs/bench/graph-data.js` carries
   every paper, relationship, construct and wording score, and a scenario file carries
   every decision taken over them. What was missing was that the curation lived
   in functions reading a browser store, and core/curate.js is those functions
   with their decisions passed in -- the same ones the page calls, so the two
   cannot drift.

   What still cannot be done from here: EXTRACT. Turning a paper into relationships
   needs the paper and a model, and neither is in this repository.

     amg check   <scenario.json>     the file against its schema, and what it holds
     amg curate  <scenario.json>     steps 1.1 to 1.3 over the shipped corpus
     amg forms                       the registry of named forms, and its tag
     amg show    <scenario.json>     the declarations, the arithmetic, the rounds
     amg derive  <scenario.json>     every outcome against every parameter
     amg export  <scenario.json>     the propositions as amg-results JSON
     amg report  <scenario.json>     the action model as one auditable file
     amg bridge                      serve the page and run its jobs in R or Python

   THE BRIDGE IS THE OTHER DIRECTION. Everything above reads a scenario and
   reports; `bridge` serves the page and answers it, so the two things step 3.2
   had to leave absent -- looking at a dataset, asking a model for a design --
   happen in a runtime beside the browser rather than inside it. cli/bridge.mjs
   says what it refuses and why.
*/
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import * as K from "../docs/bench/core/kernel.js";
import { G } from "../docs/bench/graph-data.js";
import { BARS, COMPONENTS, curate } from "../docs/bench/core/curate.js";
import { formCount, formsData, formsTag } from "../docs/bench/core/forms.js";
import { certify } from "../docs/bench/core/certify.js";
import { report, reportMd } from "../docs/bench/core/report.js";
import { validate } from "./schema.mjs";
import { bridge } from "./bridge.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = n => JSON.parse(readFileSync(join(here, "..", "schema", `${n}.schema.json`), "utf8"));

const read = p => JSON.parse(readFileSync(resolve(p), "utf8"));
const say = (...a) => console.log(...a);
const die = m => { console.error("amg: " + m); process.exit(1); };

/* The scenario's own bounds, by model name. `bset` is the page's record of
   whether anybody DECLARED the interval, and it travels because a proof over a
   default is proved against an obligation nobody took on. */
function boundsOf(snap) {
  const b = {}, declared = new Set();
  for (const v of snap.vtype || []) {
    if (!v || !v.name) continue;
    b[v.name] = [Number(v.lo ?? 0), Number(v.hi ?? 1)];
    if (v.bset) declared.add(v.name);
  }
  return { b, declared };
}

/* ONE LITERATURE'S CURATION, REPORTED. Pulled out of `curate` when a scenario
   could carry more than one of them: the same report, run per literature, over
   that literature's own payload and its own decisions. */
function curate1(sc, d, payload, label) {
  const r = curate(payload, d);
  say(`\n## ${label}`);
  say(`  scope        ${d.outlets.size} outlet(s) in the frame, ` +
      `${d.tradition === "all" ? "every tradition" : d.tradition}` +
      `, a construct drawn once ${d.minp} paper(s) in scope name it` +
      (d.admit.size ? `, ${d.admit.size} admitted by hand under it` : ""));
  say(`  papers       ${r.papers.in} of ${r.papers.of}`);
  say(`  claims       ${r.claims.in} of ${r.claims.of}, ${r.claims.clearing} clearing every bar`);
  say(`  constructs   ${r.constructs.drawn} drawn of ${r.constructs.of} extracted`);
  say(`  notions      ${r.constructs.notions} at a tightness of ${d.tight.toFixed(2)}` +
      ` (${r.constructs.merged} folded in)` +
      (r.crossing ? `, ${r.crossing} of them across more than one level of analysis` : ""));
  say(`  arrows       ${r.arrows.clearing} of ${r.arrows.all} carry a relationship that clears the bars`);
  say(`  isolated     ${r.constructs.isolated} notion(s) no relationship joins to anything`);
  return r;
}

/* A literature other than the one that ships: its decisions live on its own
   record rather than at the top of the snapshot. The shapes are the same, so
   the adapter is the same two lines twice rather than a second reader. */
function decisionsOfLit(x) {
  const d = x.dec || {};
  const APPLYV = ["dim", "filter"];
  const apply = {};
  for (const [k, v] of Object.entries(d.apply || {}))
    if (APPLYV.includes(v)) apply[k] = v;
  return {
    outlets:new Set(d.jr || (x.base && x.base.journals || []).map(j => j.f)),
    tradition:d.ap || "all",
    minp:d.minp == null ? 2 : Number(d.minp),
    admit:new Set(d.admit || []),
    tight:d.tight == null ? 0.15 : Number(d.tight),
    collapse:!!d.collapse,
    apart:new Set(d.apart || []),
    groups:d.groups || [],
    bar:d.bar || {Comm:0, Spec:0, Evid:0},
    need:d.need || {Comm:{}, Spec:{}, Evid:{}},
    apply,
    ev:d.ev || "all", sgn:d.sgn || "all",
    pairs:(x.base && x.base.sim) || [],
  };
}

/* THE SCENARIO'S CURATION DECISIONS, as the object core/curate.js takes. The
   page assembles the same object from its nine stores; this assembles it from
   one file. Neither can diverge, because there is one implementation of each
   question behind both.

   `apply` is validated here for the same reason the page validates it: a bar
   either fades what fails it (`dim`) or filters it out (`filter`), and the
   demonstration that ships with the page carries `hide` -- the word the button
   is labelled with. An unknown value is refused and the default stands rather
   than being guessed at. */
function decisionsOf(sc) {
  const sn = sc.snap || {};
  const APPLYV = ["dim", "filter"];
  const apply = {};
  for (const [k, v] of Object.entries(sn.apply || {}))
    if (APPLYV.includes(v)) apply[k] = v;
  return {
    outlets:new Set(sn.jr || (G.journals || []).map(j => j.f)),
    tradition:sn.ap || "all",
    minp:sn.minp == null ? 2 : Number(sn.minp),
    admit:new Set(sn.admit || []),
    tight:sn.tight == null ? 0.15 : Number(sn.tight),
    collapse:!!sn.collapse,
    apart:new Set(sn.apart || []),
    groups:sn.groups || [],
    bar:sn.bar || {Comm:0, Spec:0, Evid:0},
    need:sn.need || {Comm:{}, Spec:{}, Evid:{}},
    apply,
    ev:sn.ev || "all", sgn:sn.sgn || "all",
  };
}

function modelOf(sc) {
  const a = sc.snap && sc.snap.arith;
  if (!a || !(a.lines || []).length)
    die("that scenario has no kept arithmetic — step six was never closed in it");
  const M = K.buildLines({ constants: a.consts || [], lines: a.lines });
  if (M.bad.length)
    die("the kept arithmetic no longer reads:\n  " +
        M.bad.map(x => `${x.lhs}: ${x.why}`).join("\n  "));
  const { b, declared } = boundsOf(sc.snap);
  return { M, box: K.boxFrom(M, b), declared, lines: a.lines };
}

/* One outcome against one parameter, settled the same way the page settles it:
   resolve any corner the box decides, differentiate, then enclose. */
function derive1(M, box, y, x) {
  const t = K.inlineTree(M.steps, y);
  if (!t) return { y, x, err: "could not write it out in free parameters" };
  const mr = K.mmResolve(t, box);
  if (!mr.ok) return { y, x, err: "a min or max crosses inside the box; split it first" };
  if (!K.hasVar(mr.tree, x)) return null;
  const d = K.simp(K.dTree(mr.tree, x));
  if (d.t === "nd") return { y, x, err: d.why || "not differentiable here" };
  const up = K.proveSign(d, box, 1, {}), dn = K.proveSign(d, box, -1, {});
  /* An enclosure that never leaves zero passes both tests, so the tie would
     be broken toward "rises". A flat result has no direction. */
  if (up.verdict === "flat")
    return { y, x, dir: 0, d, verdict: "flat", share: up.share, boxes: up.boxes };
  const best = up.share >= dn.share ? up : dn;
  return { y, x, dir: up.share >= dn.share ? 1 : -1, d,
           verdict: best.verdict, share: best.share, boxes: best.boxes,
           witness: best.witness };
}

function deriveAll(sc) {
  const { M, box, declared } = modelOf(sc);
  const outs = M.steps.filter(s => s.kind === "out").map(s => s.lhs);
  const use = outs.length ? outs : M.steps.slice(-1).map(s => s.lhs);
  const out = [];
  for (const y of use)
    for (const x of M.params) {
      const r = derive1(M, box, y, x);
      if (r) out.push(r);
    }
  return { M, box, declared, props: out };
}

const sentence = (r, box) => {
  const bx = box[r.x];
  const over = bx ? `for every ${r.x} in [${(+bx[0]).toFixed(2)}, ${(+bx[1]).toFixed(2)}]`
                  : "over the range declared for it";
  const rise = r.dir > 0 ? "rises with" : "falls as";
  if (r.verdict === "flat") return `${r.y} does not move with ${r.x} at all, ${over}.`;
  if (r.verdict === "proved") return `${r.y} ${rise} ${r.x}${r.dir > 0 ? "" : " rises"}, ${over}.`;
  if (r.verdict === "disproved") return `${r.y} does not ${rise} ${r.x} anywhere ${over}.`;
  if (r.verdict === "partial")
    return `${r.y} ${rise} ${r.x} over ${(r.share * 100).toFixed(1)}% of ${over}.`;
  return `the sign of ${r.y} in ${r.x} is not settled ${over}.`;
};

const CMD = {
  check(file) {
    const sc = read(file);
    const errs = validate(schema("scenario"), sc);
    if (errs.length) { errs.forEach(e => say("  " + e)); die(`${errs.length} problem(s)`); }
    say(`ok — ${sc.format} v${sc.v}, written ${(sc.at || "").slice(0, 10)} on bench ${(sc.bench || {}).v}`);
    say(`     corpus ${sc.corpus ? sc.corpus.commit + " of " + sc.corpus.at : "UNSTAMPED"}`);
    const a = sc.snap && sc.snap.arith;
    say(`     ${(sc.snap.vtype || []).length} quantities, ${(sc.snap.spec || []).length} relations declared`);
    say(`     arithmetic ${a ? a.lines.length + " lines" : "not kept"}` +
        `, ${(sc.rounds || []).length} round(s), ${(sc.provenance || []).length} accepted answer(s)`);
    if (a) {
      const { M } = modelOf(sc);
      say(`     reads back: ${M.steps.length} steps, ${M.params.length} free parameters` +
          (M.bad.length ? `, ${M.bad.length} refused` : ""));
    }
  },

  /* STEPS 1.1 TO 1.3, over the corpus that ships with the page and the
     decisions a scenario carries. The point is not that a reader can browse
     here: it is that they can check that the numbers a paper states are the
     numbers its scenario produces, in one command, with no browser. */
  curate(file) {
    const sc = read(file);
    /* MORE THAN ONE LITERATURE, where the scenario carries them. Each is
       curated on its own and reported on its own, because that is what block 1
       running once per literature means -- and a reader checking a paper's
       numbers against its scenario needs them per literature, not summed. */
    const lits = (sc.snap && sc.snap.lits) || null;
    const extra = lits ? (lits.list || []).filter(x => x && x.base) : [];
    if (extra.length) {
      say(`# ${sc.name || "scenario"} — ${extra.length + 1} literatures, each curated on its own`);
      const joins = ((lits.joins || {}).groups || []).length;
      say(`  ${joins} merge(s) across them, which is what step 2.1 produces` +
          (joins ? "" : " — nothing joined yet"));
      if (lits.union)
        say("  Exported while step 2.1 held both on one map, so the scenario's own state is");
      say(lits.union
        ? "  that union's. Each literature's own decisions are below, off its own record."
        : "  Each literature's own decisions are below, off its own record.");
      /* THE SHIPPED LITERATURE'S OWN DECISIONS, which are on its record and not
         at the top of the snapshot. While the union stands the page's own state
         is the union's permissive scope -- every outlet, a threshold of one --
         and reading that as a literature's decisions reported the shipped one
         as having drawn all 1,026 of its constructs. The snapshot says which
         it is; this reads the record either way. */
      const md = (lits.main || {}).dec;
      curate1(sc, md ? decisionsOfLit({dec:md, base:G}) : decisionsOf(sc), G,
        "Purpose (ships with the page)");
      for (const x of extra)
        curate1(sc, decisionsOfLit(x), x.base, x.name || x.id);
      say("\n## what this cannot do");
      say("  EXTRACT. Turning a paper into relationships needs the paper and a model, and");
      say("  neither is in this repository. What ships is what was read off them.");
      return;
    }
    const d = decisionsOf(sc);
    const r = curate(G, d);
    say(`# ${sc.name || "scenario"} — the curation, over the corpus this repository ships`);
    say(`  corpus ${G.built ? G.built.commit + " of " + G.built.at : "unstamped"}` +
        `, scenario stamped ${sc.corpus ? sc.corpus.commit : "UNSTAMPED"}`);
    if (sc.corpus && G.built && sc.corpus.commit !== G.built.commit)
      say(`  NOTE: this scenario was curated against corpus ${sc.corpus.commit} and the` +
          ` payload here is ${G.built.commit}. The numbers below are this payload's.`);
    say("\n## step 1.1 — what is in scope");
    say(`  outlets      ${d.outlets.size} of ${G.journals.length} in the frame`);
    say(`  tradition    ${d.tradition === "all" ? "every tradition" : d.tradition}`);
    say(`  threshold    a construct is drawn once ${d.minp} paper(s) in scope name it` +
        (d.admit.size ? `, and ${d.admit.size} admitted by hand under it` : ""));
    say(`  papers       ${r.papers.in} of ${r.papers.of}`);
    say(`  claims       ${r.claims.in} of ${r.claims.of} come off them`);
    say(`  constructs   ${r.constructs.drawn} drawn of ${r.constructs.of} extracted`);
    say("\n## step 1.2 — what is one notion");
    say(`  tightness    ${d.tight.toFixed(2)}` +
        (d.apart.size ? `, ${d.apart.size} pair(s) forced apart` : "") +
        (d.groups.length ? `, ${d.groups.length} merge(s) by hand` : "") +
        (d.collapse ? ", drawn as one node each" : ", drawn as boundaries"));
    say(`  notions      ${r.constructs.notions}, from ${r.constructs.drawn} constructs` +
        ` (${r.constructs.merged} folded in)`);
    say(`  crossing     ${r.crossing} merge(s) put more than one level of analysis` +
        ` under one name` + (r.crossing ? " — the error this bench exists to show" : ""));
    say(`  isolated     ${r.constructs.isolated} notion(s) no relationship joins to anything`);
    say("\n## step 1.3 — what clears the bars");
    for (const b of BARS)
      say(`  ${b.padEnd(12)} at ${(d.bar[b] || 0)} of ` +
          `${COMPONENTS[b].items.length}` +
          `, failing relationships are ${(d.apply[b] || "dim") === "filter" ? "removed" : "faded"}`);
    say(`  claims       ${r.claims.clearing} of ${r.claims.in} clear every bar` +
        `, ${r.claims.kept} survive the filters`);
    say(`  arrows       ${r.arrows.clearing} of ${r.arrows.all} carry a relationship that clears them`);
    say("\n## what this cannot do");
    say("  EXTRACT. Turning a paper into relationships needs the paper and a model, and");
    say("  neither is in this repository. What ships is what was read off them.");
  },

  /* THE REGISTRY, PRINTED. Every robustness number this bench reports is a
     claim about these expressions, and an engine in another language needs to
     read them rather than be told about them. `schema/forms.json` is the same
     thing as a file; this is it at a glance, with the tag a result cites. */
  forms() {
    say(`# the registry of named forms — ${formsTag()}`);
    say(`  ${formsData().length} families, ${formCount()} members, every one an` +
        ` expression in the bench grammar with X for what the term reads`);
    for (const f of formsData()) {
      say(`\n## ${f.family}   [${f.properties.join(", ")}]`);
      for (const m of f.members) say(`  ${m.name.padEnd(14)} ${m.expr}`);
    }
    say("\n  The grammar is + - * / ** and exp log min max, and nothing else, so the");
    say("  same string runs in the page, under node, and in any engine that implements");
    say("  eight operators. Every member is normalised at both ends ON PURPOSE:");
    say("  otherwise swapping one moves magnitude and shape at once, and a failed");
    say("  proposition cannot be attributed to either.");
    say(`\n  schema/forms.json is this as data; a result, a proof or a deposit cites`);
    say(`  ${formsTag()} to say which registry it was computed over.`);
  },

  show(file) {
    const sc = read(file);
    const { M, box, declared } = modelOf(sc);
    say(`# ${sc.name || "scenario"} — bench ${(sc.bench || {}).v}`);
    say("\n## the box");
    for (const [k, v] of Object.entries(box))
      say(`  ${k.padEnd(52)} [${v[0]}, ${v[1]}]${declared.has(k) ? "" : "   (not declared)"}`);
    say("\n## the arithmetic");
    for (const s of M.steps) say(`  ${s.lhs} = ${s.py}`);
    if ((sc.rounds || []).length) {
      say("\n## rounds");
      for (const r of sc.rounds)
        say(`  ${r.n}. ${Object.keys(r.props || {}).length} propositions off ${r.lines} lines`);
    }
  },

  derive(file) {
    const sc = read(file);
    const { box, declared, props } = deriveAll(sc);
    /* One mark per verdict, because "settled" was counting an undecided
       result as settled and giving a flat one the question mark. A derivative
       that is identically zero is the most decided answer available. */
    const MARK = {proved:"✓", disproved:"✗", partial:"~", flat:"=", undecided:"?"};
    const tally = {};
    for (const r of props) {
      if (r.err) { say(`  —  ∂${r.y}/∂${r.x}: ${r.err}`); tally.unreadable = (tally.unreadable || 0) + 1; continue; }
      tally[r.verdict] = (tally[r.verdict] || 0) + 1;
      say(`  ${MARK[r.verdict] || "?"}  ${sentence(r, box)}`);
      const und = [...K.treeNames(r.d, box)].filter(v => box[v] && box[v][0] !== box[v][1] && !declared.has(v));
      if (und.length) say(`       over ${und.length} range(s) nobody declared: ${und.join(", ")}`);
    }
    const ORDER = ["proved", "disproved", "flat", "partial", "undecided", "unreadable"];
    say(`\n${ORDER.filter(k => tally[k]).map(k => tally[k] + " " + k).join(", ") ||
      "nothing derivable"}. Exact method only: the CLI proves or shrugs.`);
  },

  export(file, out) {
    const sc = read(file);
    const { box, declared, props } = deriveAll(sc);
    const results = props.filter(r => !r.err).map((r, i) => ({
      format: "amg-result", v: 1, id: "r" + (i + 1),
      sentence: sentence(r, box),
      outcome: r.y, parameter: r.x,
      direction: r.verdict === "flat" ? "none" : r.dir > 0 ? "up" : "down",
      verdict: r.verdict, share: +Number(r.share).toFixed(6),
      scope: { box, declared: [...declared].filter(d => d in box) },
      method: { kind: "exact", boxes: r.boxes },
      rests_on: { mechanisms: [] },
      ...(r.witness ? { witness: r.witness } : {}),
      provenance: { bench: (sc.bench || {}).v || "", corpus: (sc.corpus || {}).commit || "",
                    scenario: sc.name || "", at: new Date().toISOString() }
    }));
    const bad = results.flatMap(r => validate(schema("result"), r));
    if (bad.length) die("the CLI wrote results its own schema refuses:\n  " + bad.join("\n  "));
    const text = JSON.stringify({ format: "amg-results", v: 1, bench: sc.bench,
      corpus: sc.corpus, at: new Date().toISOString(), results }, null, 1);
    if (out) { writeFileSync(resolve(out), text); say(`wrote ${results.length} result(s) to ${out}`); }
    else say(text);
  },
};

/* The one command that is not a report over a scenario: it serves the page and
   waits. It takes flags rather than a file, so it is dispatched before the
   argument handling the other six share. */
if (process.argv[2] === "bridge") { bridge(process.argv.slice(3)); }
else {

/* THE REPORT, FROM A SCENARIO, which is what makes the line every report
   prints about itself true. `core/report.js` is the generator and the page
   calls it with live state; this calls it with a parsed file. The certificate
   is `core/certify.js`'s on both sides, so the two documents are the same
   document rather than two programs' opinions of one.

   WHAT THIS ROUTE CANNOT DO, and says rather than fakes: the relationships behind a
   finding are joined through the page's own dependency walk, which needs the
   model's mechanism terms resolved against the corpus. Here the evidence is
   read from the scenario's own record where it carries one, and is empty
   otherwise. An empty evidence list is legible; a wrong one is not. */
CMD.report = (f, out) => {
  const sc = read(f);
  const { box, declared, props } = deriveAll(sc);
  const snap = sc.snap || {};
  const rows = ((snap.board || {}).rows || []);
  const kept = rows.filter(r => r.keep && r.y && r.x);
  const findings = kept.map(r => {
    const p = props.find(z => z.y === r.y && (z.x || "") === r.x);
    const C = (p && !p.err && p.d) ? certify(p.d, box) : null;
    return {
      y: r.y, x: r.x, text: r.text, verdict: r.verdict, src: r.src,
      round: r.round, at: r.at, anno: r.anno, annoAt: r.annoAt,
      design: r.design, data: r.data,
      expression: (C && !C.err) ? "" : "",
      result: {
        sentence: r.text || "", outcome: r.y, parameter: r.x,
        direction: p && p.dir > 0 ? "up" : p && p.dir < 0 ? "down" : "",
        verdict: (p && p.verdict) || r.verdict || "",
        ...(p && typeof p.share === "number" ? { share: p.share } : {}),
        scope: { box, declared: [...declared].filter(n => n in box) },
        rests_on: {}
      },
      ...((C && !C.err) ? { proof: { expression: "", certificate: C.certificate,
        declarations: [] } } : {}),
      evidence: []
    };
  });
  const rep = report({
    title: (sc.name ? sc.name + ", reported" : "An action model, reported"),
    bench: sc.bench, corpus: sc.corpus, scenario: sc.name || "",
    forms: formsTag(),
    regenerate: "amg report " + f,
    derived: props.filter(p => !p.err).length,
    boardRows: rows.length,
    findings,
    withdrawn: rows.filter(r => !r.keep && r.y && r.x).map(r => {
      const p = props.find(z => z.y === r.y && (z.x || "") === r.x);
      return { y: r.y, x: r.x, text: r.text,
        why: (p && p.err) ? "the model as it stands will not re-derive it: " + p.err
                          : "set aside by the scholar" };
    }),
    corpusNote: "The articles are other people's copyright and do not travel. Each is " +
      "cited with its identifier in the stream beside this file, so the extraction can " +
      "be run again by anyone who obtains them, on the same terms as any replication."
  });
  const bad = validate(schema("report"), rep);
  if (bad.length) die("the CLI wrote a report its own schema refuses:\n  " + bad.join("\n  "));
  const text = out && /\.json$/.test(out) ? JSON.stringify(rep, null, 1) : reportMd(rep);
  if (out) { writeFileSync(resolve(out), text);
    say(`wrote ${rep.findings.length} finding(s) to ${out}`); }
  else say(text);
};

const [cmd, file, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "help" || cmd === "--help") {
  say(readFileSync(fileURLToPath(import.meta.url), "utf8")
    .split("\n").slice(1).filter(l => l.startsWith(" ") || l.includes("amg "))
    .join("\n").split("*/")[0]);
  process.exit(cmd ? 0 : 1);
}
if (!CMD[cmd]) die(`no such command "${cmd}" — try check, curate, forms, show, derive, export, report, bridge`);
/* `forms` is about the bench and not about a curation, so it is the one command
   that takes no file. */
if (!file && cmd !== "forms") die(`${cmd} needs a scenario file`);
const oi = rest.indexOf("--out");
CMD[cmd](file, oi >= 0 ? rest[oi + 1] : null);

}

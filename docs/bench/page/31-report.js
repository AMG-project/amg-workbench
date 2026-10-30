"use strict";
/* THE REPORT, FROM THE PAGE'S LIVE STATE.
   ==========================================================================

   `core/report.js` is the generator and knows nothing about this page: it
   takes a payload and returns the object. This marshals what it needs out of
   the board, the derivation and the corpus, which is the half that cannot
   live under `core/` because all three are page state.

   The split is the point. The command line will call the same generator with
   a scenario file, and the two reports have to be the same document or the
   claim that this file can be regenerated is a claim about two programs.

   WHAT THIS FILE IS CAREFUL ABOUT.

   It does not rebuild a result or a certificate. `resultOf` writes the
   standalone `amg-result` and `proofOf` writes the standalone `amg-proof`,
   and this hands those same objects to the generator, so the embedded copy
   IS the standalone one and the two cannot drift.

   It honours the withholding. Step 4.2's material decision governs verbatim
   spans, and this report carries them. A deposit that declared quotes do not
   travel and then shipped them inside the report would leak exactly what the
   scholar said it would not. ================================= */
import { report, reportMd } from "../core/report.js";
import { BOARD, boardKept, brefused, resultOf } from "./05-explore.js";
import { G } from "../graph-data.js";
import { BUF, PROPS } from "./09-derive.js";
import { proofOf } from "./23-exchange.js";
import { nbDeps } from "./25-notebook.js";
import { carriedClaims } from "./12-claims.js";
import { DEP } from "./26-deposit.js";
import { BENCH, CORPUS, scenCur } from "./17-scenarios.js";
import { formsTag } from "../core/forms.js";
import { litSources } from "./27-streams.js";

/* The claims standing behind one finding, grouped by the relation they are
   about. The join is the notebook's -- a finding's dependencies name the
   relations, and the corpus's claims hang off those -- lifted here because
   two readers of one corpus should not disagree about what it says. */
function evidenceFor(r){
  const d = nbDeps(r);
  const want = new Set((d && d.used ? d.used : [])
    .filter(u => u.rel).map(u => String(u.rel.id)));
  const by = new Map();
  for(const x of carriedClaims()){
    const k = String((x.e || {}).id || "");
    if(want.size && !want.has(k)) continue;
    if(!by.has(k)) by.set(k, {e:x.e, cl:[]});
    by.get(k).cl.push(x.c);
  }
  const lab = n => String((n && (n.label || n.name || n.id)) || n || "");
  return [...by.values()].map(g => ({
    relation:{from:lab(g.e.source), to:lab(g.e.target)},
    claims:g.cl.map(c => ({
      paper:String(c.p || ""), sign:String(c.g || ""), basis:String(c.e || ""),
      shape:String(c.sh || ""), quote:String(c.t || ""), scope:String(c.sc || "unstated")
    }))
  }));
}

/* Everything the generator asks for, read off the page once. */
function reportInput(){
  const cur = scenCur() || {};
  const P = PROPS.out || {props:[]};
  const kept = boardKept().filter(r => r.y && r.x);
  /* The rows taken onto the board and then set aside, with the reason where
     the page knows one. `brefused` is a lookup against the derivation the
     model gives now, so a finding the arithmetic has moved under says so. */
  const withdrawn = (BOARD.rows || []).filter(r => !r.keep && r.y && r.x).map(r => ({
    y:r.y, x:r.x, text:r.text,
    why:(brefused(r) || "").trim()
      ? "the model as it stands will not re-derive it: " + brefused(r)
      : "set aside by the scholar"
  }));
  const findings = kept.map(r => {
    /* The line this row was taken from, where it is still on the buffer: the
       expression and the proof need it. A row whose line is gone still
       reports; it loses the certificate and says so. */
    const l = (BUF.lines || []).find(z => z.y === r.y && z.x === r.x && z.res);
    let result = null, proof = null;
    if(l){ try{ result = resultOf(l, 1); }catch(e){ result = null; } }
    try{ const g = proofOf(r); proof = (g && !g.err) ? g.o : null; }catch(e){ proof = null; }
    return {
      y:r.y, x:r.x, text:r.text, verdict:r.verdict, src:r.src, round:r.round, at:r.at,
      anno:r.anno, annoAt:r.annoAt, design:r.design, data:r.data,
      expression:(l && l.text) || (proof && proof.expression) || "",
      result:result || {sentence:r.text, outcome:r.y, parameter:r.x,
        verdict:r.verdict, scope:{box:{}, declared:[]}, rests_on:{}},
      /* WHAT IT RESTS ON, COMPUTED RATHER THAN REMEMBERED. `resultOf` reads
         `l.rests`, which exists only where somebody ran that command, so a
         report asked for before anybody did said "no mechanism recorded" on a
         finding whose evidence join had just found two relations under it.
         One module cannot say both. `nbDeps` computes the dependencies on
         demand and is already what the evidence below is grouped by, so the
         two halves of this module now come from one answer. */
      rests:(() => { const d = nbDeps(r); return d && !d.err ? d : null; })(),
      proof,
      evidence:evidenceFor(r)
    };
  });
  return {
    title:(cur.name ? cur.name + ", reported" : "An action model, reported"),
    bench:BENCH, corpus:CORPUS, scenario:cur.name || "",
    forms:formsTag(),
    /* Every literature this one was built on, as that literature's own file
       named itself. Absent rather than empty where nothing was imported. */
    builds_on:litSources(),
    regenerate:"amg report " + (cur.name || "scenario").replace(/[^\w]+/g, "-").toLowerCase() +
      ".amg.json",
    derived:(P.props || []).filter(p => !p.err).length,
    boardRows:(BOARD.rows || []).length,
    findings, withdrawn,
    /* THE DECLARATION BINDS THE REPORT. `no` on the verbatim spans means the
       quotes do not travel, and this is the file that would otherwise carry
       them into the deposit. */
    quotes:DEP.quotes !== "no",
    decisions:{host:DEP.host || "", archive:DEP.archive || "", code:DEP.code || "",
      data:DEP.data || "", transcripts:DEP.transcripts || "", version:DEP.version || ""},
    /* COUNTED, NOT WRITTEN. This sentence was "the 52 articles" until the
       format was audited for generalisability: a report over somebody else's
       literature would have said 52 about a corpus of any size. */
    corpusNote:((G.papers || []).length || "The") + " article" +
      ((G.papers || []).length === 1 ? " is" : "s are") + " other people's copyright and " +
      "do not travel. Each is cited with its identifier in the stream beside this file, so " +
      "the extraction can be run again by anyone who obtains them, on the same terms as " +
      "any replication."
  };
}

const reportNow = () => report(reportInput());
const reportMarkdown = () => reportMd(reportNow());
const reportData = () => JSON.stringify(reportNow(), null, 1);

export { evidenceFor, reportData, reportInput, reportMarkdown, reportNow };

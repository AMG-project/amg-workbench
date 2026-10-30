/* AMG bench, page script: the formats this bench produces and could not write.
   One shared global scope, loaded in order. See page/README.md.

   THREE CONTROLS SAID WHAT THEY WOULD EXPORT AND WERE GREYED, and each of the
   three was greyed for the same reason: the material existed and the FORMAT
   did not. A button that says what it would carry and does not carry it is a
   promise with nothing behind it, so the three formats are written here and the
   buttons are live.

   What makes them worth separating from the five exports already on step 4.2:
   those five are the whole of a curation, and these three are a UNIT of one.
   A reader who disagrees with a conclusion wants the conclusion, not the
   session; a second bench that wants this literature wants the corpus, not the
   decisions taken on it; and a modeller who wants one arrow wants the arrow
   with its warrant. Each is addressable on its own, which is what the step 4.2
   note means by a building block.

     amg-proof     one finding with the certificate that settled it, so the
                   proof can be CHECKED rather than taken. Every sub-box the
                   branch-and-bound split into, with the enclosure of the
                   derivative over it and which way that enclosure fell. A
                   reader with interval arithmetic and no trust in this page can
                   recompute every line of it.
     amg-stream    the literature as another bench would import it: every
                   construct with the signature the corpus recorded, every
                   claim with its quote and its three scores, and the
                   declarations made on top. The record is what was DECIDED;
                   this is what the decisions were made about, and the two
                   together are what make a curation forkable.
     amg-relation  one arrow with its signature, its sign, its declared class,
                   its scope, what it rests on, and what it deliberately leaves
                   open. The schema existed with nothing
                   writing it.

   Each is written against a schema under `schema/`, and `tests/schema.test.mjs`
   holds the producers to them. That ordering matters: a format whose only
   specification is the code that writes it cannot be read by anything else,
   which is the whole of what an exchange format is for. */
import { dTree, hasVar, mmResolve, mmWhy, simp, treeText } from "../core/kernel.js";
import { PROOFCAP, bound, certify, r6, vol } from "../core/certify.js";
import { formsTag } from "../core/forms.js";
import { abnd, arithSig, bdec, wbnd } from "./08-ask.js";
import { BENCH, CORPUS, scenCur } from "./17-scenarios.js";
import { G } from "../graph-data.js";
import { SPEC0, compo, rulesOf, spec, specSet, vtype } from "./03b-decisions.js";
import { bufModel, inlineOutcome } from "./09-derive.js";
import { carriedVars } from "./07-grouping.js";
import { depsOf, famsFor } from "./10-depends.js";
import { isAdded, okPaper } from "./03c-corpus.js";
import { lbl } from "./15-deposit.js";
import { passText, saveText, stamp } from "./16-worklists.js";
import { statementsInPlay } from "./12-claims.js";
import { varName } from "./11-classes.js";
import { passWho, xlog } from "./05-explore.js";
import { litSources } from "./27-streams.js";

/* ============================================================== amg-proof

   WHY A CERTIFICATE AND NOT A VERDICT.

   Every other export on this page says what the method concluded. A reader who
   wants to know whether to believe it has two options: trust the page, or
   rebuild the model and re-run the proof. Neither is checking.

   Branch and bound leaves a certificate behind whether anybody writes it down
   or not. It splits the declared box until each piece is decided, and a piece
   is decided by one interval evaluation of the derivative over it. So the proof
   IS a list of boxes with an enclosure each, and the conclusion follows from
   the list by two facts a reader can check without this page: every enclosure
   claimed to carry the sign does carry it, and the boxes cover the declared box
   with nothing left over.

   `covers` is that second fact as a number. It is computed from the written
   boxes rather than asserted, and it is in the file so that a reader who
   recomputes it and gets something else knows the file is wrong rather than
   wondering whether they are.

   RE-PROVED AT EXPORT, not read off the row. A board row records what the
   verdict said when it was taken, which is the record and stays the record.
   But the certificate for that verdict was discarded at the time, and the only
   honest way to produce one now is to prove it again against the arithmetic as
   it stands -- then say whether the two agree. `recorded.agrees` is false where
   the model has moved under a finding, which is a thing worth knowing and worth
   knowing from the file rather than from the page that wrote it. */

/* The box as the single derivation narrows it: every declared name the
   derivative actually reads, plus the parameter whether it occurs or not. The
   same rule as the sign command in 10-depends.js, because a proof over a wider
   box is a different proof. */
function proofBox(d, x, lbox){
  const box = {};
  for(const n of Object.keys(lbox)) if(hasVar(d, n)) box[n] = lbox[n];
  if(x && lbox[x] && !box[x]) box[x] = lbox[x];
  return box;
}


/* Which declarations this finding stands on, each with WHO MADE IT and when.

   `by` says whether anybody set it; `who` says which of them did. The two are
   different questions and only the first was being answered: a reviewer
   reading an action model could not tell a scholar's declaration from an
   accepted model proposal, although the page has known the difference all
   along. Writing METHOD.md is what found it -- invariant I2 says the record
   says which of the two chose each declaration, and the record did while the
   file did not.

   The list is not "every declaration in the model". It is the ones the
   conclusion reads: the range of each name the derivative mentions, the shape
   class and role of each mechanism switching off alone moves the verdict, the
   combination rule where the outcome has more than one live term, and the
   quantity records for the two ends. A declaration nothing reads is not part of
   this proof and saying it was would overstate what the file carries.

   `by` is the warrant and not the author's name: `declared` where somebody set
   it, `default` where the page's own interval stood in. That distinction is the
   one this bench exists to make, so it travels in every file that leaves it. */
function proofDecls(d, deps, y, x, consts){
  const out = [];
  const seen = new Set();
  const vt = k => vtype.get(k) || {};
  for(const k of carriedVars()){
    const n = varName(k);
    if(!hasVar(d, n) && n !== x) continue;
    if(seen.has(n)) continue;
    seen.add(n);
    const v = vt(k), b = abnd(k);
    out.push({what:"the range of " + n, value:"[" + r6(b[0]) + ", " + r6(b[1]) + "]",
      by:bdec(k) ? "declared" : "default", who:passWho("b:" + k), at:v.at || ""});
    if(v.kind || v.aspect) out.push({what:"what sort of quantity " + n + " is",
      value:[v.kind, v.aspect].filter(Boolean).join(", "), by:"declared",
      who:passWho("k:" + k), at:v.at || ""});
  }
  for(const u of (deps.used || [])){
    if(!u.rel) continue;
    const s = spec.get(u.rel.id) || {};
    const nm = String(u.lhs).replace(/^t_/, "").replace(/_/g, " ");
    out.push({what:"the shape class of " + nm,
      value:(s.props || []).length ? (s.props || []).join(" + ") : "nothing declared",
      by:(s.props || []).length ? "declared" : "default",
      who:passWho("p:" + u.rel.id), at:s.at || ""});
    const roles = (s.roles && s.roles.length) ? s.roles : (s.role ? [s.role] : []);
    out.push({what:"what " + nm + " does", value:roles.join(" or ") || "nothing declared",
      by:roles.length ? "declared" : "default",
      who:passWho("r:" + u.rel.id), at:s.at || ""});
  }
  const yk = carriedVars().find(k => varName(k) === y);
  if(yk && deps.rule && deps.rule.live){
    const c = compo.get(yk) || {};
    const rs = rulesOf(yk);
    out.push({what:"how the mechanisms writing " + y + " combine",
      value:rs.join(" or ") || "nothing declared",
      by:rs.length ? "declared" : "default", at:c.at || ""});
  }
  for(const c of consts || [])
    if(hasVar(d, c.name)) out.push({what:"the weight " + c.name,
      value:"[" + r6(wbnd(c)[0]) + ", " + r6(wbnd(c)[1]) + "]",
      by:(c.lo != null && c.hi != null && c.lo < c.hi) ? "declared" : "default", at:""});
  return out;
}

function proofOf(r){
  if(!r || !r.y || !r.x)
    return {err:"that row is not a derivative of an outcome in a named parameter, so there is no sign to certify"};
  if(r.src === "tool")
    return {err:"this row came back from another engine. It keeps the warrant it arrived with, " +
      "and this page cannot write a certificate for a proof it did not run"};
  const m = bufModel();
  if(m.err) return {err:m.err};
  const M = m.M, lbox = m.box;
  const ino = inlineOutcome(M, r.y);
  if(ino.err) return {err:ino.err};
  const f0 = mmResolve(ino.tree, lbox);
  if(f0.open.length) return {err:mmWhy(f0, lbox)};
  if(!hasVar(f0.tree, r.x))
    return {err:r.y + " does not read " + r.x + " under the arithmetic kept now, so there is " +
      "nothing to differentiate. The model has moved under this finding."};
  const d = simp(dTree(f0.tree, r.x));
  if(d.t === "nd")
    return {err:d.why || "the derivative is not one this page can take"};
  const box = proofBox(d, r.x, lbox);
  if(!Object.keys(box).length)
    return {err:"no declared name occurs in that derivative, so there is no box to prove it over"};
  /* THE CERTIFICATE IS core/certify.js's NOW. It was here, which was right
     while the page was the only thing that wrote one; `amg report` writes the
     same certificate from a scenario file, and two implementations of a proof
     format is two proof formats. What stays here is everything around it:
     which finding this is about, what it rests on, which declarations were in
     force. Those have different sources on each side. */
  const C = certify(d, box);
  if(C.err) return {err:C.err};
  const {dir, best} = C;
  const split = C.certificate.split;

  const l = {y:r.y, x:r.x, tree:d, res:{dir, verdict:best.verdict, share:best.share}};
  let deps = {};
  try{ deps = depsOf(l) || {}; }catch(e){ deps = {err:String(e && e.message || e)}; }
  if(deps.err) deps = {used:[], idle:[], reads:[], nterm:0, rule:{n:0, rules:[], live:false}};

  const cur = scenCur() || {};
  const o = {
    format:"amg-proof", v:1,
    id:(r.id || "b") + "-" + r.y + "-in-" + r.x,
    finding:{
      sentence:r.text || "",
      outcome:r.y, parameter:r.x,
      direction:dir > 0 ? "up" : dir < 0 ? "down" : "flat",
      verdict:best.verdict,
      share:r6(best.share),
      settled:r6(1 - (best.openShare || 0)),
    },
    expression:{
      grammar:"the bench grammar: + - * / ** and exp log min max, one name per declared quantity",
      outcome:treeText(f0.tree),
      derivative:treeText(C.resolved),
    },
    scope:{
      box:bound(box),
      declared:carriedVars().filter(k => bdec(k) && box[varName(k)]).map(varName),
    },
    certificate:C.certificate,
    rests_on:{
      mechanisms:(deps.used || []).map(u => String(u.lhs).replace(/^t_/, "")),
      idle:(deps.idle || []).map(u => String(u.lhs).replace(/^t_/, "")),
      mechanism_count:deps.nterm || 0,
      combination_rule:(deps.rule && deps.rule.live) ? (deps.rule.rules || []).join(" or ") : "",
    },
    declarations:proofDecls(d, deps, r.y, r.x, M.consts),
    recorded:{
      verdict:r.verdict || "", share:typeof r.share === "number" ? r6(r.share) : null,
      at:r.at || "", signature:r.sig || "",
      agrees:(r.verdict || "") === best.verdict,
    },
    /* WHICH REGISTRY OF FORMS, because a conclusion that survived a hundred
       combinations survived a PARTICULAR hundred and nothing that left this
       page said which. core/forms.js. */
    provenance:{bench:BENCH.v, corpus:(CORPUS && CORPUS.commit) || "",
      scenario:cur.name || "", arithmetic:arithSig(), forms:formsTag(),
      at:new Date().toISOString()},
  };
  if(r.forms) o.declared_class = {
    set:r.forms.set || "", label:r.forms.label || "",
    held:r.forms.held || 0, of:r.forms.of || 0,
    undecided:r.forms.undec || 0, turned:r.forms.turn || 0,
    at:r.forms.at || "", signature:r.forms.sig || "",
  };
  if(best.witness) o.certificate.witness = bound(
    Object.fromEntries(Object.keys(best.witness).map(k => [k, [best.witness[k], best.witness[k]]])));
  return {o};
}

/* The one error state worth a word on the button: a proof that cannot be
   rebuilt. Everything else is a file. */
async function exportProof(r, btn){
  const got = proofOf(r);
  if(got.err){
    if(btn){ const was = btn.innerHTML;
      btn.textContent = "cannot be rebuilt";
      btn.title = got.err;
      setTimeout(() => { btn.innerHTML = was; }, 3200); }
    return;
  }
  const slug = String(r.y + "-in-" + r.x).replace(/[^\w]+/g, "-").toLowerCase();
  const out = await saveText(JSON.stringify(got.o, null, 1),
    `proof-${slug}-${stamp()}.json`, "application/json", btn);
  xlog("export", "Exported one finding with its proof",
    (r.text || r.y + " in " + r.x).slice(0, 110) + " — " +
    got.o.certificate.leaves + " enclosure" + (got.o.certificate.leaves === 1 ? "" : "s") +
    " covering " + (100 * got.o.certificate.covers).toFixed(1) + "% of the declared box" +
    (got.o.recorded.agrees ? "" : ", and the verdict has moved since the row was taken"));
  return out;
}

/* ============================================================= amg-stream

   THE MATERIAL, NOT THE DECISIONS.

   `passes.tsv` says what this curation decided. It is useless on its own: a
   reader holding it has a list of judgements about objects they do not have. So
   the other half is the corpus as the page holds it -- every construct with the
   signature the extraction recorded, every claim with its verbatim span and its
   three scores, the papers as metadata, and the two relations between claims
   that the corpus carries and no arrow shows (what answers what, and what two
   constructs the wording scores call close).

   WHAT TRAVELS AND WHAT CANNOT, which is step 4.2's second decision made here
   rather than deferred. The 52 articles are other people's copyright and do not
   travel; what was read off them does, with an identifier per paper so a
   replicator obtains the texts. That is not a limitation to apologise for: the
   claim table is the reusable object, and it is the thing nobody else has.

   The declared classes travel too, because a stream that arrives stripped of
   them would ask a second reader to declare again what somebody already
   declared, with no way of knowing it had been done. They are marked as
   declarations and never as corpus: the corpus records what a paper said. */

function streamPapers(){
  const out = [];
  for(const [id, p] of Object.entries(G.papers)) out.push({
    id, authors:p.a || "", year:p.y || "", journal:p.j || "",
    journal_full:p.jf || "", doi:p.d || "", title:p.ti || "",
    kind:p.t || "", tradition:p.ap || "",
    claims:p.nc || 0,
    /* Attention at a date and not standing, which is why the date is in the
       field name. A count with nothing saying when it was read is not
       evidence of anything. */
    cited:p.cb == null ? null : p.cb, cited_read:"2026-10-19",
    full_text:!!p.e4,
    /* Whether the filters above have this paper in view RIGHT NOW. Carried
       because a stream is the material and the material includes what the
       scope decision was taken against: a reader who imports this and sees
       every paper in scope would not know a scope had been set. */
    in_scope:okPaper(id),
    added_here:isAdded(id),
  });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function streamConstructs(){
  return G.nodes.map(n => ({
    id:n.i, level:n.l || "", scale:n.s || "", bearer:n.b || "",
    stock_or_flow:n.f === "f" ? "flow" : "stock",
    papers:(n.p || []).slice(), definition:n.d || "",
    added_here:isAdded(n.i),
  })).sort((a, b) => a.id.localeCompare(b.id));
}

function streamClaims(){
  return G.claims.map(c => ({
    id:c.id, paper:c.p || "",
    antecedent:(c.a || []).slice(), consequent:(c.c || []).slice(),
    sign:c.g || "", epistemic_status:c.e || "",
    quote:c.t || "",
    shape:c.sh || "unspecified", shape_basis:c.sb || "unspecified",
    scope:c.sc || "unstated",
    scores:{specification:c.sp == null ? null : c.sp,
      commensurability:c.cm == null ? null : c.cm,
      evidence:c.ea == null ? null : c.ea},
    flags:{specification:(c.spf || []).slice(),
      commensurability:(c.cmf || []).slice(), evidence:(c.eaf || []).slice()},
    added_here:isAdded(c.id),
  })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/* The declarations made on top of the corpus, each saying what it is a
   declaration ABOUT. A shape class with no statement behind it would arrive as
   a free-floating assertion. */
function streamDeclared(){
  const out = [];
  for(const {e, rows} of statementsInPlay(false)){
    const v = spec.get(e.id);
    if(!v || !specSet(v)) continue;
    const row = {statement:e.id,
      from:String((e.source && e.source.label) || e.source || ""),
      to:String((e.target && e.target.label) || e.target || ""),
      relationship:v.rel || "",
      roles:(v.roles && v.roles.length) ? v.roles.slice() : (v.role ? [v.role] : []),
      moderates:v.target || "",
      properties:(v.props || []).slice(),
      range:[+v.lo, +v.hi],
      note:v.note || "", at:v.at || "",
      rests_on:rows.map(r => r.c.id).filter(Boolean)};
    /* ABSENT RATHER THAN NULL. A declared estimate that nobody declared is not
       an estimate of null: the field is simply not there, and a reader
       checking for one gets the right answer either way. */
    if(v.elo != null || v.ehi != null) row.estimate = [v.elo, v.ehi];
    out.push(row);
  }
  for(const [k, v] of vtype) out.push({quantity:k, name:v.name || "",
    kind:v.kind || "", aspect:v.aspect || "",
    range:[v.lo == null ? null : +v.lo, v.hi == null ? null : +v.hi],
    range_declared:!!v.bset, at:v.at || ""});
  return out;
}

function streamFile(){
  const cur = scenCur() || {};
  return JSON.stringify({
    format:"amg-stream", v:1,
    name:"purpose",
    what:"A literature as this bench holds it: the constructs and relationships read off " +
      "the papers, the papers as metadata, and the declarations made on top. The papers " +
      "themselves do not travel; each relationship names the paper it was read from so a " +
      "replicator obtains the text.",
    built:G.built || null,
    /* The literatures this one was built on, each as its own file named
       itself. A second bench importing this one inherits the chain. */
    ...(litSources().length ? {builds_on:litSources()} : {}),
    counts:{papers:Object.keys(G.papers).length, constructs:G.nodes.length,
      claims:G.claims.length, declarations:streamDeclared().length},
    papers:streamPapers(),
    constructs:streamConstructs(),
    claims:streamClaims(),
    /* Two relations BETWEEN CLAIMS, which no arrow on the map shows and which a
       second bench would otherwise have to rediscover: what a claim answers,
       refines or contradicts, and the wording scores that put two constructs
       near each other. The second is what the tightness slider reads. */
    answers:(G.edges || []).map(e => ({from:e.f, to:e.t, kind:e.k})),
    near:(G.sim || []).map(s => ({a:s[0], b:s[1], score:s[2]})),
    /* Paper-level theses, the part of a paper no arrow can hold. Carried
       because dropping them is how a corpus comes to look as though a
       literature consists of relations. */
    theses:(G.meta || []).map(m => ({paper:m.p, says:m.t})),
    declarations:streamDeclared(),
    provenance:{bench:BENCH.v, corpus:(CORPUS && CORPUS.commit) || "",
      scenario:cur.name || "", at:new Date().toISOString()},
  }, null, 1);
}

async function exportStream(btn){
  const r = await saveText(streamFile(), `stream-purpose-${stamp()}.json`,
    "application/json", btn);
  xlog("export", "Exported the literature as a stream",
    Object.keys(G.papers).length + " papers, " + G.nodes.length + " constructs, " +
    G.claims.length + " relationships with their quotes, and " + streamDeclared().length +
    " declaration(s) — the material the record was a record of");
  return r;
}

/* ============================================================= amg-record

   THE DECISION RECORD, AS SOMETHING A MACHINE CAN READ.

   `passes.tsv` is the file a curator reads and the one `index/passes.tsv` is in
   the shape of, and it stays. What it did not have was a published shape, so
   anything reading it had to guess which columns it carried and what the
   comment lines meant.

   DERIVED FROM THE TEXT rather than built beside it. passText() is the one
   generator; this parses its rows back. Two generators for one record would be
   two things to keep true, and the record is the last place to want a
   divergence. The section headings in the text become a field, so the JSON
   carries something the TSV only implies. */
function recordRows(){
  const rows = [];
  let section = "";
  for(const ln of passText().split("\n")){
    if(!ln.trim()) continue;
    if(ln.charAt(0) === "#"){
      const m = /^#\s*--\s*(.+?)\s*-+$/.exec(ln);
      if(m) section = m[1].replace(/\s*\(\d+( of \d+[^)]*)?\)\s*$/, "").trim();
      continue;
    }
    const p = ln.split("\t");
    if(p.length < 3) continue;
    rows.push({date:p[0], action:p[1], target:p[2],
      members:String(p[3] || "").split(";").map(x => x.trim()).filter(Boolean),
      reason:String(p[4] || "").trim(), section});
  }
  return rows;
}

function recordFile(){
  const rows = recordRows();
  const cur = scenCur() || {};
  const by = {};
  for(const r of rows) by[r.action] = (by[r.action] || 0) + 1;
  return JSON.stringify({
    format:"amg-record", v:1,
    what:"Every judgement this curation took, with its date, its target, the corpus " +
      "identifiers it was taken against and the reason given. The same rows as " +
      "passes.tsv, which is the shape index/passes.tsv uses; this is that record with " +
      "a published schema. It says what was DECIDED and not what about: the material " +
      "is the stream.",
    at:new Date().toISOString(),
    counts:Object.assign({decisions:rows.length}, by),
    decisions:rows,
    provenance:{bench:BENCH.v, corpus:(CORPUS && CORPUS.commit) || "",
      scenario:cur.name || "", at:new Date().toISOString()},
  }, null, 1);
}

async function exportRecord(btn){
  const rows = recordRows();
  const r = await saveText(recordFile(), `record-${stamp()}.json`, "application/json", btn);
  xlog("export", "Exported the decision record as JSON",
    rows.length + " decision(s), the same rows as passes.tsv against schema/record.schema.json");
  return r;
}

/* =========================================================== amg-relation

   ONE ARROW, WITH ITS WARRANT.

   The schema existed and nothing wrote it, which
   made it the clearest case of a format with no producer: the unit this bench
   claims to produce, unproducible. A model is a set of these plus the identity
   that joins them, so a relation that cannot leave on its own cannot be reused
   on its own either.

   THREE THINGS IT REFUSES TO INVENT.

   A sign the papers do not agree on. `sign` is one value in the schema, and
   where two papers assert different ones the honest file is no file: the
   decision that resolves it is step 2.1's, by name, and writing one sign would
   bury the disagreement in a format a reader trusts. So it refuses and says
   which signs it found.

   A signature the merge does not share. A merged construct can span levels,
   scales and bearers; where its members disagree the field carries the
   representative's value and `not_fixed` says the merge spans more than one,
   because a reader building on this needs to know that the composition rule
   between them was never declared.

   A magnitude. One paper in this corpus reports an effect with a number for
   any given pair, usually none does, and `not_fixed` says which it is with the
   reason. That field is the whole difference between a relation that leaves
   something open and one that has had something left out of it. */
const SIGLAB = {s:"stock", f:"flow"};

/* Every carried relation, by the identifier the declaration dialog uses. The
   harness needs it to ask for all of them; so would a command line. */
const relationIds = () => statementsInPlay(false).map(x => x.e.id);

function relationOf(id){
  const hit = statementsInPlay(false).find(x => x.e.id === id);
  if(!hit) return {err:"no carried relation with that identifier is in play"};
  const {e, rows} = hit;
  const v = Object.assign({}, SPEC0(), spec.get(id) || {});
  const signs = [...new Set(rows.map(r => r.c.g).filter(Boolean))];
  if(signs.length > 1) return {err:"the papers behind this arrow assert " + signs.length +
    " different signs (" + signs.join(", ") + "), and a relation carries one. Which it is " +
    "is step 2.1's decision — split the arrow by scope, or record the conflict — and " +
    "writing one of them here would bury the disagreement in a file a reader trusts"};
  const sign = signs[0] || "";
  if(!sign) return {err:"no relationship behind this arrow records a sign, so there is nothing to declare"};

  /* The two ends, each with the signature the extraction recorded. A merged
     end reports its representative member and says where the members differ. */
  const sideOf = x => {
    const node = (x && x.mem) ? x : null;
    const mem = node ? node.mem : [];
    const m0 = mem[0] || {};
    const many = k => [...new Set(mem.map(z => z[k]).filter(Boolean))];
    return {side:{id:String((x && x.id) || x), label:lbl(x),
      signature:{level:m0.l || "", bearer:m0.b || "",
        scale:m0.s || "ordinal", stock_or_flow:SIGLAB[m0.f] || "stock"}},
      members:mem.map(z => z.i),
      spans:{level:many("l"), scale:many("s"), bearer:many("b"), flow:many("f")}};
  };
  const A = sideOf(e.source), B = sideOf(e.target);

  const fam = (v.props || []).length ? famsFor(v.props) : [];
  const members = [];
  for(const f of fam) for(const m of (f.members || []))
    members.push({name:f.fam + ":" + m[0], expr:m[1]});

  const scopes = [...new Set(rows.map(r => r.c.sc).filter(s => s && s !== "unstated"))];
  const est = rows.filter(r => r.c.v);
  const roles = (v.roles && v.roles.length) ? v.roles : (v.role ? [v.role] : []);

  const notFixed = [];
  if(!est.length) notFixed.push({what:"the magnitude",
    why:"no relationship behind this arrow reports an effect with a number, so the class admits " +
      "every member consistent with what was declared rather than one being sized here"});
  if(!(v.props || []).length) notFixed.push({what:"the class of forms",
    why:"nothing was declared on step 3.1, so the widest class stands: every member of " +
      "every family. That is the honest reading of a relationship that states no form, and it " +
      "is not the same as a narrow one"});
  else if(members.length > 1) notFixed.push({what:"which member",
    why:"no paper states a functional form; the " + members.length + " members the " +
      "declaration admits are enumerated rather than one being chosen here"});
  if(!roles.length) notFixed.push({what:"what the antecedent does to the consequent",
    why:"no paper in this corpus states a role. Nothing on this page can check one " +
      "either, so it is left undeclared rather than guessed"});
  for(const side of [A, B]){
    if(side.spans.level.length > 1) notFixed.push({
      what:"the level of " + side.side.label,
      why:"the merge behind it spans " + side.spans.level.join(" and ") + ", and the " +
        "composition rule between them was never declared. The signature above is the " +
        "representative member's"});
    if(side.spans.flow.length > 1) notFixed.push({
      what:"whether " + side.side.label + " is a stock or a flow",
      why:"the merge behind it holds both"});
  }
  if(!scopes.length) notFixed.push({what:"where it holds",
    why:"no relationship behind this arrow states a scope. In this corpus 380 of 1080 state " +
      "nothing, which is a finding about the literature and not a gap in this record"});

  const o = {
    format:"amg-relation", v:1,
    id:String(id),
    from:A.side, to:B.side,
    sign,
    forms:{properties:(v.props || []).slice()},
    scope:{stated:scopes.join(" | ") || "unstated"},
    rests_on:rows.map(r => ({claim:r.c.id, paper:r.c.p || "", quote:r.c.t || ""}))
      .filter(x => x.claim),
    not_fixed:notFixed,
  };
  if(roles.length === 1) o.role = roles[0];
  if(members.length) o.forms.members = members;
  if(fam.length === 1) o.forms.family = fam[0].fam;
  if(v.lo < v.hi) o.scope.box = {[String(A.side.id).replace(/-/g, "_")]:[+v.lo, +v.hi]};
  if(est.length){
    const x = est[0];
    o.estimate = {value:x.c.v, paper:x.c.p || "", claim:x.c.id};
  }
  return {o};
}

async function exportRelation(id, btn){
  const got = relationOf(id);
  if(got.err){
    if(btn){ const was = btn.innerHTML;
      btn.textContent = "cannot be written";
      btn.title = got.err;
      setTimeout(() => { btn.innerHTML = was; }, 4000); }
    return;
  }
  const slug = String(got.o.from.label + "-to-" + got.o.to.label)
    .replace(/[^\w]+/g, "-").toLowerCase();
  const r = await saveText(JSON.stringify(got.o, null, 1),
    `relation-${slug}-${stamp()}.json`, "application/json", btn);
  xlog("export", "Exported one declared relation",
    got.o.from.label + " → " + got.o.to.label + " · " + got.o.sign + " · " +
    got.o.rests_on.length + " relationship(s) under it, " + got.o.not_fixed.length +
    " thing(s) it leaves open with the reason");
  return r;
}

export { PROOFCAP, exportProof, exportRecord, exportRelation, exportStream, proofOf,
  recordFile, recordRows, relationIds, relationOf, streamFile };

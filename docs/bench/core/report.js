"use strict";
/* THE REPORT: AN ACTION MODEL AS ONE AUDITABLE FILE.
   ==========================================================================

   A complete report of the action model, limited to the retained findings,
   transparent and reproducible, modular. The file a reviewer audits and
   another scholar builds on.

   WHAT THE DEPOSIT WAS MISSING. It ships twelve files and a reader has to
   assemble the argument from them: the result here, its certificate there, the
   claims under it in a third, the decisions in a fourth. The instrument's
   claim is that a literature becomes a checkable object, and a zip of parts is
   not that object.

   THE SPINE, which is the whole test of this format. A reviewer has to walk
   one direction without stopping:

     the sentence -> the derivative as an expression -> the box, with WHICH
     bounds somebody declared and which are defaults -> the certificate, every
     sub-box with its enclosure -> the mechanisms it rests on AND the ones it
     does not -> the relations under those mechanisms -> the claims under
     those relations -> the papers, their verbatim quotes, and the scope each
     paper STATED -> any empirical test with the measurement decision behind
     it.

   If a link in that chain needs a second file, the module has failed. So the
   report EMBEDS rather than references, and the duplication is made safe
   rather than tolerated: this generator does not rebuild a result or a
   certificate, it is HANDED the objects the standalone files are written from
   and puts them inside. The copy cannot drift from the original because it is
   the original.

   WHY IT TAKES EVERYTHING AS ARGUMENTS. `core/` may use no name declared
   outside it, which is what lets a reader replace one of these files alone.
   The page has the live state and the command line has a scenario, and both
   call this with the same shapes. One generator, two callers: the same
   arrangement as `core/curate.js`, and the reason this report can say the
   command that regenerates it.

   WHAT IT WILL NOT DO. It does not decide whether two papers disagree. Where
   the claims under a relation assert different signs, it gives each with the
   scope its own paper stated and says that nothing here judges whether the
   populations overlap. A count cannot tell a contradiction from a scope
   difference, and neither can this. ================================ */

/* The claims under one relation, read for agreement. Not adjudicated: the
   signs are tallied, the scopes are carried verbatim, and the sentence that
   comes back says what is in front of the reader rather than what to
   conclude from it. */
function readRelation(rel, claims, opts){
  const o = opts || {};
  const sign = new Map();
  for(const c of claims) sign.set(c.sign || "no sign",
    (sign.get(c.sign || "no sign") || 0) + 1);
  const papers = [...new Set(claims.map(c => c.paper).filter(Boolean))];
  const scoped = claims.filter(c => c.scope && !/^unstated$/i.test(c.scope));
  const one = sign.size === 1;
  /* THE READING, and it is deliberately short of a verdict. Five papers
     agreeing is not corroboration until somebody can see whether they
     measured the same thing, and the page cannot read a scope sentence. */
  const reading = one
    ? (papers.length === 1
        ? "One paper, one sign. Nothing here corroborates it."
        : papers.length + " papers assert the same sign. " +
          (scoped.length === claims.length
            ? "Each states a scope, below; whether those populations are the same is not something this report decides."
            : (claims.length - scoped.length) + " of " + claims.length +
              " state no scope at all, so whether they are about the same population cannot be read off the corpus."))
    : "The signs differ: " + [...sign.entries()].map(([k, n]) => n + " " + k).join(", ") +
      ". That is not necessarily a disagreement. Two papers can assert " +
      "different signs about populations that do not overlap, and two " +
      "asserting the same sign can differ on shape, magnitude and bearer. " +
      "The scopes each paper stated are below, verbatim; this report does not " +
      "judge whether they meet.";
  return {
    from:String(rel.from || ""), to:String(rel.to || ""),
    claims:claims.length, papers:papers.length,
    signs:Object.fromEntries(sign),
    agree:one,
    unscoped:claims.length - scoped.length,
    reading,
    /* The sources, which is what a number cannot replace. A quote is withheld
       where the deposit's material decision withheld it, and the withholding
       is stated on the row rather than leaving a blank. */
    rows:claims.map(c => ({
      paper:String(c.paper || ""), sign:String(c.sign || ""),
      basis:String(c.basis || ""), shape:String(c.shape || ""),
      scope:(c.scope && !/^unstated$/i.test(c.scope)) ? String(c.scope) : "unstated",
      ...(o.quotes === false
        ? {quote_withheld:true}
        : {quote:String(c.quote || "")})
    }))
  };
}

/* One retained finding, with everything the spine asks for. `result` and
   `proof` arrive already built: this puts them together and adds what neither
   carries on its own. */
function reportFinding(f, i, opts){
  const o = opts || {};
  const r = f.result || {};
  const p = f.proof || null;
  const box = (r.scope && r.scope.box) || {};
  const declared = new Set((r.scope && r.scope.declared) || []);
  const names = Object.keys(box);
  const out = {
    id:"f" + (i + 1),
    sentence:String(r.sentence || f.text || ""),
    outcome:String(r.outcome || f.y || ""),
    parameter:String(r.parameter || f.x || ""),
    direction:String(r.direction || ""),
    verdict:String(r.verdict || f.verdict || ""),
    ...(typeof r.share === "number" ? {share:r.share} : {}),
    /* WHEN THE SENTENCE AND THE NUMBER DISAGREE, SAY SO. The sentence is what
       the row said when it was taken; the share beside it may have been
       derived again just now, over bounds that have moved since. Printing
       both in one paragraph without a word is how a document contradicts
       itself: this was found by generating the same report from the page and
       from a scenario and reading them side by side, where one said 75.0% in
       its sentence and 37.5% in its verdict. What a row said when it was
       taken is the record, so neither is overwritten and the disagreement is
       reported as the fact it is. */
    ...((() => {
      const said = /(\d+(?:\.\d+)?)%/.exec(String(f.text || ""));
      if(!said || typeof r.share !== "number") return {};
      const now = +(100 * r.share).toFixed(1), then = +said[1];
      return Math.abs(now - then) < 0.05 ? {} : {restated:{then, now}};
    })()),
    /* THE PART A SHARE DOES NOT SAY. Proved on three quarters of a box is a
       different claim from proved on all of it, and the quarter it could not
       settle is not the other sign. */
    ...(typeof r.share === "number" ? {undecided:+(1 - r.share).toFixed(6)} : {}),
    expression:String(f.expression || (p && p.expression) || ""),
    scope:{
      box,
      declared:names.filter(n => declared.has(n)),
      /* Named, because a sign proved over a bound nobody declared is a sign
         proved against an obligation nobody took on. */
      defaulted:names.filter(n => !declared.has(n)),
      ...((r.scope && r.scope.region) ? {region:r.scope.region} : {})
    },
    ...(r.method ? {method:r.method} : {}),
    rests_on:{
      /* The computed answer wins over the remembered one: a result carries
         what was asked for at the time, and the dependencies can be worked
         out from the model whenever they are wanted. */
      mechanisms:(f.rests && f.rests.used ? f.rests.used.map(u => u.lhs || u.name || String(u))
        : ((r.rests_on || {}).mechanisms) || []),
      idle:(f.rests && f.rests.idle ? f.rests.idle.map(u => u.lhs || u.name || String(u))
        : ((r.rests_on || {}).idle) || []),
      combination_rule:((r.rests_on || {}).combination_rule) || ""
    },
    evidence:(f.evidence || []).map(e => readRelation(e.relation, e.claims, o)),
    /* CARRIED THROUGH, NOT RESHAPED. This is the certificate the standalone
       proof export writes, and renaming a field here would be the drift the
       format says cannot happen. `split` is the list of leaves and `boxes` is
       a count of the cells visited; both are the proof's own names. */
    ...(p && p.certificate ? {certificate:Object.assign({}, p.certificate)} : {}),
    declarations:(p && p.declarations) || [],
    provenance:{
      src:String(f.src || ""), round:+f.round || 0, at:String(f.at || "")
    }
  };
  if(f.anno) out.note = {text:String(f.anno), at:String(f.annoAt || ""), by:"the scholar"};
  if(f.design) out.design = {text:String(f.design.text || ""),
    by:String(f.design.by || ""), at:String(f.design.at || ""), checked:false};
  /* THE EMPIRICAL TEST, with the thing a reviewer would contest. Which column
     stood in for which construct is a measurement decision and the result
     line alone is not auditable without it. */
  if(f.data) out.empirical = {
    line:String(f.data.text || ""),
    agrees:String(f.data.agrees || "unknown"),
    n:f.data.n == null ? null : +f.data.n,
    at:String(f.data.at || ""),
    verified_here:false,
    ...(f.data.ran ? {ran:f.data.ran} : {})
  };
  return out;
}

/* The whole thing. Nothing is computed here that a caller could not have
   computed; what this adds is that it is all in one place and in one order. */
function report(input){
  const d = input || {};
  const o = {quotes:d.quotes !== false};
  const kept = (d.findings || []);
  const derived = +d.derived || 0;
  const rep = {
    format:"amg-report", v:1,
    title:String(d.title || "An action model"),
    at:String(d.at || new Date().toISOString()),
    provenance:{
      bench:String((d.bench || {}).v || d.bench || ""),
      corpus:String((d.corpus || {}).commit || d.corpus || ""),
      scenario:String(d.scenario || ""),
      forms:String(d.forms || ""),
      /* So a reader can run the command and compare what comes back. */
      regenerate:String(d.regenerate || "")
    },
    /* WHAT THIS ONE WAS BUILT ON. The format's whole claim is that two AMGs
       can be compared and built on, and until this field there was nothing in
       any file that said which one was underneath. Every other provenance
       block points inward, at the build that made this file; this is the only
       one that points at somebody else's work. Omitted rather than empty,
       because an empty list reads as "built on nothing checked" where the
       truth is "nothing was imported". */
    ...((d.builds_on || []).length ? {builds_on:d.builds_on} : {}),
    /* THE DENOMINATOR. Seven findings reported without saying twenty-three
       were derived is the file-drawer problem, and this instrument exists to
       refuse it. The rule that selected them is the scholar's and is stated
       rather than inferred. */
    /* LIKE FOR LIKE, which the first version of this was not. The derivation
       counts what THIS model produced; the board can also hold findings that
       arrived from somewhere else -- returned from an outside engine, or
       carried in with another scholar's model -- and counting those against
       the derivation gave a denominator smaller than its numerator. The two
       populations are reported apart, because a reader should know that three
       of six reported findings were not derived here at all. */
    selection:{
      derived,
      retained:kept.length,
      derived_here:kept.filter(f => f.src !== "tool").length,
      from_elsewhere:kept.filter(f => f.src === "tool").length,
      set_aside:Math.max(0, (+d.boardRows || kept.length) - kept.length),
      /* NAMED, NOT COUNTED. "2 set aside" loses the most informative thing a
         withdrawal has to say. In the shipped demonstration both were
         withdrawn because the model will no longer re-derive them, which is a
         statement about the limits of the arithmetic and belongs in a report
         about what the arithmetic established. */
      withdrawn:(d.withdrawn || []).map(w => ({
        outcome:String(w.y || ""), parameter:String(w.x || ""),
        sentence:String(w.text || ""),
        why:String(w.why || "withdrawn by the scholar, with no reason recorded")
      })),
      rule:String(d.rule || "Retained by hand on step 3.2. Nothing reaches the board automatically.")
    },
    findings:kept.map((f, i) => reportFinding(f, i, o)),
    appendix:{
      ...(d.decisions ? {decisions:d.decisions} : {}),
      ...(d.formsRegistry ? {forms:d.formsRegistry} : {}),
      corpus_note:String(d.corpusNote || "")
    },
    limits:String(d.limits ||
      "This reports how far each conclusion survives a declared class of " +
      "functional forms and a declared region of parameters. That is a " +
      "statement about a model and not about firms. The judgements that " +
      "remain the modeller's are the declared class, the bounds, and which " +
      "families of form exist to be declared from; the last is not quantified " +
      "over at all.")
  };
  if(!o.quotes) rep.withheld = {quotes:true,
    why:"The scholar declared at step 4.2 that verbatim spans do not travel. " +
      "Each relationship below carries its paper, sign, basis and stated scope; the " +
      "quote is withheld rather than absent."};
  return rep;
}

/* ---------------------------------------------------- the prose it reads as */
/* The same object, for the other reader. The data twin carries every interval
   enclosure; this carries what they amount to, because a hundred and
   thirty-three of them are not something anybody reads. Nothing is said here
   that the object does not hold: if a sentence below has no field behind it,
   that is a defect and not a flourish. */
const pc = x => typeof x === "number" ? (100 * x).toFixed(1) + "%" : "unrecorded";
/* ANYTHING FROM A PAPER OR A SCHOLAR, ON ITS WAY INTO MARKDOWN. A verbatim
   quote is somebody else's text and this file is a document: a backtick opens
   a code span, a pipe ends a cell, a leading hash starts a heading, and a
   newline ends the bullet the quote was inside. Collapsed and escaped here
   rather than trusted, for the same reason the page escapes a scenario's
   free-text fields: the material is the point of the format and the format
   must survive it. Used on quotes, scopes, notes, titles and sentences, and
   never on this file's own prose. */
const md = x => String(x == null ? "" : x)
  .replace(/\s+/g, " ")
  .replace(/([\\`*_[\]<>|#])/g, "\\$1")
  .trim();
/* AND THE OTHER HALF, because the two are not the same job. Inside a code
   span nothing is interpreted, so a name in backticks needs no escaping and
   escaping it is worse than not: a reader sees the backslashes. What a code
   span cannot survive is a backtick of its own, so that is the one character
   this replaces. */
const mdc = x => String(x == null ? "" : x).replace(/\s+/g, " ").replace(/`/g, "'").trim();

function mdFinding(f, n){
  const L = [];
  L.push("## Finding " + n + ". " + md(f.sentence || f.outcome + " in " + f.parameter));
  L.push("");
  L.push("**" + (f.verdict || "no verdict") + "**" +
    (f.share != null ? ", on " + pc(f.share) + " of the declared box" : "") +
    (f.undecided ? ", with " + pc(f.undecided) + " it could not settle either way" : "") +
    ". Derivative of `" + mdc(f.outcome) + "` with respect to `" + mdc(f.parameter) + "`.");
  L.push("");
  if(f.restated){
    L.push("> **The sentence above and the verdict beside it do not agree.** The sentence " +
      "was written when the finding was taken and says " + f.restated.then + "%. The " +
      "verdict was derived from the model as it stands now and says " + f.restated.now +
      "%. Neither is overwritten: what a row said when it was taken is the record, and " +
      "the arithmetic has moved under it since. The certificate below is of the " +
      "derivation just run.");
    L.push("");
  }
  /* Indented four spaces, which is a code block: nothing inside one is
     interpreted, so the expression needs no escaping and must not get any. */
  if(f.expression){ L.push("    " + String(f.expression).replace(/\s+/g, " ")); L.push(""); }

  L.push("### The box it was proved over");
  L.push("");
  const names = Object.keys(f.scope.box || {});
  if(!names.length) L.push("*No box recorded.*");
  for(const k of names){
    const b = f.scope.box[k] || [];
    L.push("- `" + mdc(k) + "` in [" + b[0] + ", " + b[1] + "] \u2014 " +
      (f.scope.declared.includes(k) ? "**declared**" : "*left at the default*"));
  }
  L.push("");
  if(f.scope.defaulted.length)
    L.push("*" + f.scope.defaulted.length + " of " + names.length + " bounds were not " +
      "declared. A sign proved over a bound nobody set is proved against an " +
      "obligation nobody took on.*");
  else L.push("*Every bound above was declared.*");
  L.push("");
  /* WHO CHOSE EACH ONE, which "declared" does not say. A scholar's own
     declaration and a model's proposal that somebody accepted are different
     warrants and read identically without this. */
  const by = {};
  for(const dcl of (f.declarations || [])) if(dcl.who) by[dcl.who] = (by[dcl.who] || 0) + 1;
  const wlab = {hand:"the scholar", claude:"a model, and accepted",
    corpus:"read off the sources", open:"undecided"};
  const parts = Object.keys(by).filter(k => wlab[k]).map(k => by[k] + " " + wlab[k]);
  if(parts.length){
    L.push("Of the " + (f.declarations || []).length + " declarations this proof reads: " +
      parts.join(", ") + ".");
    L.push("");
  }
  if(f.scope.region && f.scope.region.cuts && f.scope.region.cuts.length){
    L.push("**Where it holds**, derived rather than asserted: " +
      f.scope.region.cuts.map(c => "`" + mdc(c.name) + "`" +
        (c.lo != null ? " \u2265 " + c.lo : "") +
        (c.hi != null ? " \u2264 " + c.hi : "")).join(" and ") + ".");
    L.push("");
  }

  L.push("### The certificate");
  L.push("");
  if(!f.certificate) L.push("*No certificate: the model as it stands will not re-derive this.*");
  else {
    L.push("The search split the box into **" + (f.certificate.leaves || 0) + "** sub-boxes and " +
      "proved the sign on each. They cover **" + pc(f.certificate.covers) + "** of the " +
      "declared box" + (f.certificate.method ? ", by " + f.certificate.method : "") + ".");
    L.push("");
    L.push("*Every enclosure is in `report.json` beside this file. Each says the " +
      "derivative's range over one sub-box, and a reader can recheck the sign on " +
      "each without this page.*");
  }
  L.push("");

  L.push("### What it rests on");
  L.push("");
  if(f.rests_on.mechanisms.length)
    L.push("Mechanisms: " + f.rests_on.mechanisms.map(x => "`" + mdc(x) + "`").join(", ") + ".");
  else L.push("*No mechanism recorded.*");
  if(f.rests_on.idle.length){
    L.push("");
    L.push("Indifferent to: " + f.rests_on.idle.map(x => "`" + mdc(x) + "`").join(", ") +
      ". The model carries these and this finding does not use them.");
  }
  L.push("");

  L.push("### What the papers claimed");
  L.push("");
  if(!f.evidence.length)
    L.push("*No relationship in this corpus stands behind the mechanisms this finding rests " +
      "on, which is itself worth saying.*");
  for(const e of f.evidence){
    L.push("**" + md(e.from) + " \u2192 " + md(e.to) + "** \u2014 " + e.claims + " relationship" +
      (e.claims === 1 ? "" : "s") + " from " + e.papers + " paper" +
      (e.papers === 1 ? "" : "s") + ".");
    L.push("");
    L.push(e.reading);
    L.push("");
    for(const c of e.rows){
      L.push("- **" + md(c.paper || "no paper") + "** \u00b7 " + md(c.sign || "no sign") +
        " \u00b7 " + md(c.basis || "no basis") + (c.shape ? " \u00b7 " + md(c.shape) : ""));
      if(c.quote_withheld) L.push("    - *quote withheld by declaration*");
      else if(c.quote) L.push("    - \u201c" + md(c.quote) + "\u201d");
      L.push("    - scope, as its own paper stated it: " +
        (c.scope === "unstated" ? "*unstated*" : md(c.scope)));
    }
    L.push("");
  }

  if(f.empirical){
    L.push("### Taken to data");
    L.push("");
    L.push("    " + String(f.empirical.line).replace(/\s+/g, " "));
    L.push("");
    const ran = f.empirical.ran || {};
    L.push("Run in **" + (ran.runtime || "an engine this report does not name") + "**" +
      (ran.version ? " (" + ran.version + ")" : "") +
      (ran.dataset ? " over `" + ran.dataset + "`" : "") + ", " +
      (f.empirical.n != null ? f.empirical.n + " complete cases, " : "") +
      "and it **" + (f.empirical.agrees === "yes" ? "agrees"
        : f.empirical.agrees === "no" ? "disagrees" : "neither agrees nor disagrees") +
      "** with the sign proved above.");
    L.push("");
    if(ran.columns) L.push("**The measurement decision**, which is the part to contest: `" +
      (ran.columns.outcome || "?") + "` stood in for the outcome and `" +
      (ran.columns.driver || "?") + "` for the parameter" +
      ((ran.columns.controls || []).length
        ? ", controlling for " + ran.columns.controls.map(c => "`" + c + "`").join(", ")
        : ", with no controls") + ".");
    L.push("");
    L.push("*Not verified here. This page did not run it and cannot see the data. " +
      "It sits beside the proof rather than over it.*");
    L.push("");
  }

  if(f.note){
    L.push("### The scholar's note");
    L.push("");
    L.push("> " + md(f.note.text));
    L.push("");
    L.push("*Written " + (f.note.at || "on an unrecorded day") + ". Not derived from anything.*");
    L.push("");
  }
  if(f.design){
    L.push("### A study design, proposed");
    L.push("");
    for(const line of String(f.design.text).split(/\n/)) L.push("> " + md(line));
    L.push("");
    L.push("*Proposed by `" + f.design.by + "`, accepted " + f.design.at +
      ". Not checked here and part of no verdict.*");
    L.push("");
  }
  L.push("*Provenance: " + (f.provenance.src || "unrecorded") + ", round " +
    f.provenance.round + ", taken " + (f.provenance.at || "on an unrecorded day") + ".*");
  L.push("");
  return L;
}

function reportMd(rep){
  const L = [];
  L.push("# " + md(rep.title));
  L.push("");
  L.push("*An action model, reported. " + rep.findings.length + " retained finding" +
    (rep.findings.length === 1 ? "" : "s") + ", each with the warrant underneath it.*");
  L.push("");
  L.push("| | |");
  L.push("|---|---|");
  L.push("| Bench | " + (rep.provenance.bench || "unrecorded") + " |");
  L.push("| Corpus | " + (rep.provenance.corpus || "unrecorded") + " |");
  L.push("| Scenario | " + md(rep.provenance.scenario || "unnamed") + " |");
  L.push("| Registry of forms | " + (rep.provenance.forms || "unrecorded") + " |");
  L.push("| Written | " + rep.at + " |");
  L.push("");
  L.push("## What was reported, and what was not");
  L.push("");
  const sel = rep.selection;
  L.push("**This model derived " + sel.derived + " proposition" +
    (sel.derived === 1 ? "" : "s") + ". " + sel.derived_here + " of them " +
    (sel.derived_here === 1 ? "is" : "are") + " reported here.**" +
    (sel.set_aside ? " " + sel.set_aside + " further finding" +
      (sel.set_aside === 1 ? " was" : "s were") + " taken onto the board and set aside." : ""));
  if(sel.from_elsewhere){
    L.push("");
    L.push("**" + sel.from_elsewhere + " further finding" +
      (sel.from_elsewhere === 1 ? "" : "s") + " below " +
      (sel.from_elsewhere === 1 ? "was" : "were") + " not derived here.** " +
      (sel.from_elsewhere === 1 ? "It" : "They") + " came back from an outside engine or " +
      "arrived with another scholar's model, and " +
      (sel.from_elsewhere === 1 ? "carries" : "carry") + " that provenance on the finding. " +
      "The count above is of this model's own derivation and does not include " +
      (sel.from_elsewhere === 1 ? "it" : "them") + ".");
  }
  L.push("");
  L.push(md(rep.selection.rule));
  L.push("");
  if((rep.selection.withdrawn || []).length){
    L.push("**What was withdrawn, and why.** A finding taken onto the board and then set " +
      "aside is a decision, and the reason is often the most informative thing about where " +
      "the arithmetic stops.");
    L.push("");
    for(const w of rep.selection.withdrawn)
      L.push("- " + md(w.sentence || (w.outcome + " in " + w.parameter)) + " \u2014 " + md(w.why));
    L.push("");
  }
  L.push("*Reporting the retained findings without the number they were drawn from " +
    "would be the file-drawer problem, which this instrument exists to refuse. The " +
    "denominator is above so a reader can tell selection from discovery.*");
  L.push("");
  if(rep.withheld){
    L.push("**" + rep.withheld.why + "**");
    L.push("");
  }
  if(rep.provenance.regenerate){
    L.push("**To regenerate this file:** `" + rep.provenance.regenerate + "`");
    L.push("");
  }
  L.push("---");
  L.push("");
  rep.findings.forEach((f, i) => L.push(...mdFinding(f, i + 1)));
  L.push("---");
  L.push("");
  L.push("## What this report does not establish");
  L.push("");
  L.push(rep.limits);
  L.push("");
  return L.join("\n");
}

export { readRelation, report, reportFinding, reportMd };

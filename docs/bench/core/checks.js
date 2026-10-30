/* core: the reviewer's checks, over a plain state object.

   What contradicts what, what was defaulted rather than declared, what the
   findings rest on, and how much of the declared space is still open. Every
   check is a function of ONE argument -- the object page/19-review.js builds
   by reading the page -- so each can be run, read and replaced without a
   browser.

   That shape is what makes the reviewer honest as well as testable. A check
   able to reach into the page could quietly ask a different question of a
   different panel; a check that is handed the state can only ask about what
   it was given, and tests/review.test.mjs gives it states it chose.

   To change what the reviewer looks for, change this file.

   core/ RULE: nothing in this file may use a name declared outside core/.
   scripts/check_bench.py fails the build if one does. */
"use strict";

const REVIEW = {at:"", busy:false, err:"", ideas:[], outside:0, secs:0};

/* ---- CHECKS: what contradicts, and what was defaulted -------------------
   Every one of these is a fact with a number in it. None of them is a task:
   the page cannot know which side of a contradiction is the wrong one, which
   is exactly why it is worth saying rather than fixing. */
function reviewChecks(S){
  const out = [];
  const add = (k, sev, text, why) => out.push({k, sev, text, why});

  if(S.stale) add("stale", "bad",
    "the kept arithmetic is stale",
    "a declaration moved after it ran, so every verdict under it answers a question nobody is asking now. Nothing downstream knows that.");

  if(S.fail) add("invariants", "bad",
    `the arithmetic breaks ${S.fail} of ${S.pass + S.fail} conditions it has to satisfy`,
    "either the body is wrong or the declaration it breaks was, and the page cannot tell you which.");

  /* The one worth having. A finding retained in an earlier round was proved
     against declarations that may since have moved, and nothing on the board
     records that -- it goes on reading as proved. */
  const old = S.kept.filter(r => r.round && r.round < S.rounds);
  if(old.length && S.rounds > 1) add("drift", "bad",
    `${old.length} retained finding${old.length === 1 ? " was" : "s were"} proved in an earlier round`,
    `there ${S.rounds === 2 ? "has been one round" : "have been " + S.rounds + " rounds"} since this model was first closed. A finding carries the box it was proved on, not the declarations that produced the box, so one proved two rounds ago may be about a model you no longer have. Derive again and compare.`);

  /* Two retained findings that cannot both hold. */
  const seen = new Map(), clash = [];
  for(const r of S.kept){
    const k = r.y + "|" + r.x, d = /falls/.test(String(r.text || "")) ? -1 : 1;
    if(seen.has(k) && seen.get(k) !== d) clash.push(k);
    else seen.set(k, d);
  }
  if(clash.length) add("contradiction", "bad",
    `${clash.length} pair${clash.length === 1 ? "" : "s"} of retained findings point opposite ways`,
    "the same quantity in the same parameter, retained twice with different signs. One of them is about a model you have changed since, or one of them is wrong.");

  if(S.noRule) add("norule", "soft",
    `${S.noRule} of ${S.outs} outcome${S.outs === 1 ? "" : "s"} ${
      S.noRule === 1 ? "has" : "have"} no combination rule`,
    "additive is being assumed. Additive, multiplicative, min, max and ces are different theories of the same mechanisms and no paper in this corpus states which — so this is a theory nobody declared.");

  if(S.open) add("open", "soft",
    `${S.open} of ${S.decls} declarations are still open`,
    `an undeclared choice admits its whole vocabulary${S.space && S.space.n ? `, and what is left admits ${Number(S.space.n).toLocaleString("en")} distinct models` : ""} — a wider claim than most people mean to make.`);

  if(S.unver) add("unver", "soft",
    `${S.unver} role${S.unver === 1 ? "" : "s"} came from a model and nothing can check ${S.unver === 1 ? "it" : "them"}`,
    "a role is what the antecedent does to the consequent. No paper states one, the page cannot test one, and a conclusion resting on a proposed role rests on a guess somebody accepted.");

  if(S.arrows && S.corrob === 0) add("single", "soft",
    `all ${S.arrows} carried arrows rest on a single paper each`,
    "a statement one paper asserts is a data report; a phenomenon is what several agree on. A model built entirely on reports is a model about this corpus.");

  if(S.kept.length && !S.scored) add("criteria", "soft",
    "no scoring criteria are declared, so all four weigh equally",
    "that is this page's default and not a decision anybody took — and it is doing work, because it is what orders every ranking you have looked at.");

  return out;
}

/* ---- EXPOSURE: what the findings rest on, and how narrowly --------------
   Robustness as a measurement rather than a reassurance.

   WHAT A LINE RESTS ON, in the shape depsOf actually returns. This read
   `rests.on` and `rests.names`, which depsOf has never produced -- so the
   common denominator, the one measurement here that exists nowhere else on
   the bench, silently computed over an empty set and never fired once. It
   was found by writing a fixture for it: inventing the shape is how you
   discover you invented the shape. */
function restNames(r){
  if(!r) return [];
  const out = [];
  for(const u of (r.used || [])) out.push("mechanism " + String(u.lhs).replace(/^t_/, ""));
  for(const q of (r.reads || [])) if(q.dec) out.push("the range of " + q.n);
  if(r.rule && r.rule.live) out.push("the combination rule for " + (r.base ? "it" : "the outcome"));
  return out;
}

function reviewExposure(S){
  const out = [];
  const add = (k, text, why, n) => out.push({k, text, why, n:n == null ? null : n});
  if(!S.kept.length) return out;

  /* THE COMMON DENOMINATOR. Every retained finding is traced back to the
     declarations it rests on, and what matters is the INTERSECTION: a set of
     six findings that all rest on one form choice is six findings wide and
     one choice deep. Nothing else on the bench computes this, because every
     other view is of one finding at a time. */
  const rests = new Map();
  let withRests = 0, undec = [];
  for(const r of S.kept){
    const l = S.lines.find(x => x.y === r.y && x.x === r.x && x.rests);
    if(!l) continue;
    withRests++;
    for(const n of restNames(l.rests)) rests.set(n, (rests.get(n) || 0) + 1);
    for(const q of (l.rests.reads || [])) if(!q.dec) undec.push(q.n);
  }
  if(withRests > 1){
    const all = [...rests.entries()].filter(([, c]) => c === withRests).map(([n]) => n);
    if(all.length) add("denominator",
      `every one of your ${withRests} traced findings rests on the same ${
        all.length === 1 ? "declaration" : all.length + " declarations"}`,
      `${all.slice(0, 4).join(", ")}${all.length > 4 ? " and " + (all.length - 4) + " more" : ""}. Change one and the whole set moves together, so this is ${withRests} findings wide and one decision deep. Widening it is the single most informative thing available.`,
      withRests);
    else add("denominator",
      `your ${withRests} traced findings rest on no declaration in common`,
      "they fail independently, which is the good case and worth saying because it is the one nobody checks.",
      withRests);
  }

  /* THE NARROWEST. A finding proved on a tenth of the box is a finding about
     a corner of it, whatever the sentence says. */
  const share = S.kept.filter(r => typeof r.share === "number").sort((a, b) => a.share - b.share);
  if(share.length && share[0].share < 0.999) add("narrow",
    `the narrowest retained finding holds on ${(100 * share[0].share).toFixed(1)}% of the declared box`,
    `${String(share[0].text || share[0].y + " in " + share[0].x).slice(0, 110)} — which is a claim about part of the space, and the part is the finding. Worth saying out loud in whatever you write.`,
    share[0].share);

  /* WHERE YOU HAVE BEEN WRONG. The thinking-partner signal, and the one the
     page has that no reviewer would: it recorded the expectation BEFORE the
     answer, so it knows. */
  if(S.guess.n) add("wrong",
    `${S.guess.wrong} of ${S.guess.n} expectations you recorded were wrong`,
    S.guess.wrong
      ? "those are the derivations that told you something. One that confirms what you already thought has told you the model is consistent, not that the world is."
      : "nothing has contradicted you yet, which is either a good model or an incurious set of guesses. The second is more common.",
    S.guess.wrong);

  /* "A conclusion proved over a default interval is the failure this bench
     exists to catch" -- depsOf says so in its own comment, and says it per
     conclusion. Nothing aggregated it across the set until here. */
  if(undec.length){
    const u = [...new Set(undec)];
    add("undeclared",
      `${u.length} range${u.length === 1 ? "" : "s"} your findings were proved over ${
        u.length === 1 ? "was" : "were"} never declared`,
      `${u.slice(0, 4).join(", ")}${u.length > 4 ? ` and ${u.length - 4} more` : ""} — the page supplied a default and the proof ran over it, so the finding is conditional on an interval nobody chose. This is the failure the bench exists to catch.`,
      u.length);
  }

  const unscored = S.kept.filter(r => {
    const l = S.lines.find(x => x.y === r.y && x.x === r.x);
    return !l || !l.score;
  }).length;
  if(unscored && S.kept.length) add("unscored",
    `${unscored} of ${S.kept.length} retained findings have never been scored`,
    "the four quantities are computable for any of them, and the one you would publish is not always the one that scores well — which is worth knowing before you choose.",
    unscored);

  return out;
}

const REVIEW_KINDS = ["declaration", "search", "derivation", "none"];

/* The brief is passed as TEXT rather than built here. It quotes the guide's
   own summary of where the curation stands, which only the page can read, and
   the layer rule refused the call -- correctly: a prompt that reaches into the
   page cannot be read, tested or replaced on its own, and the caller has the
   brief already. */
function reviewPrompt(S, checks, expo, brief){
  return `You are a senior colleague reviewing a formal model somebody is building from a
curated literature. Not a cheerleader and not an assistant: a reviewer, of the kind whose
comments are hard to answer and worth answering.

The bench this model is built on proves things by interval arithmetic over a declared box, so
everything below is conditional on DECLARATIONS the scholar made -- bounds, functional form
classes, combination rules, roles. Where a declaration is wrong the proof is sound and the
finding is still wrong, and that is where the interesting failures live.

${String(brief == null ? "" : brief)}

Give the scholar lines of attack. Three kinds are useful and a fourth is not:

  SPARK        something the model could be made to say that nobody has asked it. A
               relationship worth deriving, a comparative static nobody took, an outcome
               nobody wrote out.
  ROBUSTNESS   a declaration that is probably load-bearing and should be widened or moved,
               with what you expect to break. Name the declaration.
  INCONSISTENCY  something in the state above that does not sit with something else in it.
               Not the ones already listed -- those are computed and the scholar can see them.

Each one MUST name what to do, as one of:
  "declaration"  -- change a declared bound, form class, role or combination rule. Say which.
  "search"       -- walk the declared class looking for a named property. Say which property.
  "derivation"   -- derive a specific quantity in a specific parameter. Say which pair.
If a thought names none of those it is an opinion, and this page does not print opinions: mark
it "none" and it will be shown separately as something you could not make actionable.

Be specific to THIS model. A comment that would apply to any formal model is not worth the
scholar's time. Say "the X bound is doing too much work" rather than "consider sensitivity
analysis". Where you disagree with a choice, say so plainly.

At most 8. Fewer, sharper, is better.

Return ONLY JSON:
{"notes":[{"kind":"spark|robustness|inconsistency","act":"declaration|search|derivation|none",
"what":"<the thought, one or two sentences>","do":"<the specific move>"}]}`;
}


export { REVIEW, REVIEW_KINDS, restNames, reviewChecks, reviewExposure, reviewPrompt };

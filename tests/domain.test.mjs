/* A domain of validity must not erase the rest of the declaration.

   The last of the defects recorded in the specification's section 5.3. A
   declared relation's record holds more than the domain dialog edits -- SPEC0
   gives rel, roles, props, lo, hi, elo, ehi, note, and specSet() also tests
   `role`, which an older record or an imported model carries, and `target`, a
   moderator's. The dialog edits six of them and rebuilt the record from
   scratch, carrying `rel` forward by hand and dropping ROLES, ROLE and TARGET
   without a word.

   So declaring a domain erased the roles somebody had declared for that
   relation, and the moderator it was declared to run through, every time.
   Nothing said so, and the next thing to read the record simply saw a
   relation with no roles.

   The dialog needs a browser; the merge does not, which is why it is a
   function. */

import { test } from "node:test";
import assert from "node:assert/strict";

/* 12-claims.js reads localStorage through the helper at call time, and its
   import graph is eager, so the fake goes in before the dynamic import. */
const STORE = {};
globalThis.localStorage = {
  getItem: k => (k in STORE ? STORE[k] : null),
  setItem: (k, v) => { STORE[k] = String(v); },
  removeItem: k => { delete STORE[k]; },
};
const C = await import("../docs/bench/page/12-claims.js");

/* A record as the rest of the bench writes one: two roles, a moderator
   target, and a `role` left over from an older shape. */
const BEFORE = {
  rel: "r1",
  roles: ["transfers", "increases"],
  role: "transfers",
  target: "stakeholder-voice",
  props: ["increasing"],
  lo: 0, hi: 1, elo: null, ehi: null,
  note: "declared from Durand 2023, table 2",
  at: "2026-10-01",
};
/* And what the dialog hands over: the six fields it edits, and nothing else. */
const EDITED = {
  props: ["increasing", "concave"],
  lo: 0.2, hi: 0.8, elo: 0.3, ehi: 0.5,
  note: "narrowed after the second round",
  at: "2026-10-23",
};

test("what the dialog edits, it changes", () => {
  const d = C.domMerge(BEFORE, EDITED);
  assert.deepEqual(d.props, ["increasing", "concave"]);
  assert.equal(d.lo, 0.2);
  assert.equal(d.hi, 0.8);
  assert.equal(d.elo, 0.3);
  assert.equal(d.ehi, 0.5);
  assert.equal(d.note, "narrowed after the second round");
  assert.equal(d.at, "2026-10-23");
});

test("what it does not edit, it keeps — which is the defect", () => {
  const d = C.domMerge(BEFORE, EDITED);
  assert.deepEqual(d.roles, ["transfers", "increases"],
    "declaring a domain used to erase the roles declared for the relation");
  assert.equal(d.role, "transfers",
    "and the single role an older record or an imported model carries");
  assert.equal(d.target, "stakeholder-voice",
    "and the moderator the relation was declared to run through");
  assert.equal(d.rel, "r1", "the statement it is about was the one field kept by hand");
});

test("a relation with nothing declared yet gets exactly what was edited", () => {
  for (const empty of [undefined, null, {}]) {
    const d = C.domMerge(empty, EDITED);
    assert.deepEqual(d, Object.assign({}, EDITED),
      "no field is invented for a record that had none");
  }
});

test("the merge does not mutate what it was given", () => {
  const was = JSON.parse(JSON.stringify(BEFORE));
  const d = C.domMerge(BEFORE, EDITED);
  assert.deepEqual(BEFORE, was, "the stored record is replaced, not edited in place");
  assert.notEqual(d, BEFORE);
});

test("an edit may clear a field, and clearing is not dropping", () => {
  /* The dialog writes null for an empty estimate box. That has to reach the
     record as null rather than falling back to the old value, or a scholar
     cannot withdraw an estimate they entered. */
  const d = C.domMerge(BEFORE, Object.assign({}, EDITED, {elo: null, ehi: null}));
  assert.equal(d.elo, null);
  assert.equal(d.ehi, null);
  const e = C.domMerge(BEFORE, Object.assign({}, EDITED, {note: ""}));
  assert.equal(e.note, "", "and an emptied reason is an emptied reason");
});

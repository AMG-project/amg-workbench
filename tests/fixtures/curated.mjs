/* THE CURATION'S NUMBERS, ASSERTED FROM BOTH DRIVERS.

   `amg curate` runs steps 1.1 to 1.3 over the corpus this repository ships and
   the decisions the demonstration scenario carries; the page runs the same
   questions through the same functions in core/curate.js, with its own stores
   as the decisions. Neither can call the other, so one set of numbers is
   asserted from both: tests/cli.test.mjs from the command line and
   tests/exchange.mjs from the real browser. If either moves, one of them fails,
   and the pair of failures says which driver moved.

   They live in a fixture rather than in one of the two test files, because a
   test file importing a test file runs its tests a second time.
*/
export const CURATED = {
  papers: 52, claims: 1080, extracted: 1026,
  /* 156 are drawn at a threshold of two, and the demonstration admits five more
     by hand UNDER it -- which is the threshold being a convenience and the
     admission being a decision. Three of the five are the control-rights
     channel and the two vulnerabilities Stoelhorst and Vishwanathan's only
     claim about it names: one paper each, so the floor would hide the one
     relationship in this corpus with a control-rights channel on either end.
     Three pairs are also forced apart, because the fold at 0.15 takes
     control rights for claim rights and one vulnerability for the other. */
  drawn: 161, notions: 142, isolated: 17, crossing: 2,
  arrows: 173, clearing: 143, claimsClearing: 943,
};

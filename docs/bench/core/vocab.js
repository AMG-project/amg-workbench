/* The vocabularies, in one place, because they were in two.

   What sort of quantity a construct is, what a relation does, what a shape
   class commits to, how mechanisms combine, and the families a term can be
   drawn from. All of it was declared once in `bench.html` and again in
   `src/docs/bench/vocab.js`, transcribed by hand, with nothing checking that the
   two still said the same thing.

   This file is the source. The page loads it as a module and reads the
   vocabularies off it; `tests/vocab.test.mjs` evaluates every family member
   over its whole range and holds it to the properties its own family declares,
   so a typo in one of the fifteen expressions fails the suite rather than
   quietly changing what a hundred form combinations mean.

   THE FAMILIES LEAVE THIS FILE AS DATA. `core/forms.js` derives the registry
   from what is here and gives it a tag; `make forms` publishes it as
   `schema/forms.json`, which is how an engine in another language reads the
   same fifteen expressions without parsing JavaScript, and a result, a proof
   and a deposit all cite the tag so a reader knows which registry a robustness
   number was computed over.

   The family MEMBERS are written as expressions in the bench's own grammar,
   with X for what the term reads. That is deliberate: a member stated as a
   Python lambda cannot be checked against the page, and a member stated in the
   grammar can be run by both. `sqrt` is `X ** 0.5`, `cbrt` is `X ** (1 / 3)`,
   `log1p(4x)/log1p(4)` is `log(1 + 4 * X) / log(5)` -- the same function, said
   in the eight operators the whole bench is built on. */
"use strict";
const VOCAB = {
 "kinds": [
  [
   "stock",
   "an accumulated quantity — knowledge, firm-specific investment",
   ""
  ],
  [
   "rate",
   "a per-period proportion governing a process",
   ""
  ],
  [
   "share",
   "a fraction of a whole, summing to one across a set",
   ""
  ],
  [
   "degree",
   "a normalised position on a designed scale: how much X is done",
   ""
  ],
  [
   "propensity",
   "an actor's inclination, in [0, 1]",
   ""
  ],
  [
   "cost",
   "a subtracted quantity",
   ""
  ],
  [
   "value",
   "a benefit quantity",
   ""
  ],
  [
   "threshold",
   "a level at which behaviour changes",
   ""
  ],
  [
   "diversity",
   "a dispersion measure",
   ""
  ]
 ],
 "aspects": [
  [
   "level",
   "measured absolutely",
   ""
  ],
  [
   "difference",
   "measured against a baseline, so zero there by construction — which is a fact about the measure, not a finding",
   ""
  ]
 ],
 "roles": [
  [
   "generates",
   "adds to",
   "a positive direct effect: it creates value or stock that was not there"
  ],
  [
   "dissipates",
   "subtracts from",
   "a cost: it destroys value, or charges against it"
  ],
  [
   "transfers",
   "moves between",
   "conserved — one holder's gain is another's loss, and the total is unchanged"
  ],
  [
   "allocates",
   "divides across",
   "an allocation rule: it splits a quantity over parties or channels"
  ],
  [
   "gates",
   "enables",
   "moderation as a necessary condition — below a threshold the other mechanism does nothing"
  ],
  [
   "modulates",
   "scales",
   "moderation as magnitude — an interaction: it changes how much another mechanism does"
  ]
 ],
 "compositions": [
  [
   "additive",
   "they add",
   "independent contributions — each adds its own term, and removing one leaves the rest"
  ],
  [
   "multiplicative",
   "they multiply",
   "each is necessary — take any one to zero and the outcome is zero"
  ],
  [
   "min",
   "the smallest binds",
   "a bottleneck — the outcome is held down by whichever mechanism gives least"
  ],
  [
   "max",
   "the largest carries",
   "a substitute set — the best one is enough and the others are slack"
  ],
  [
   "ces",
   "between the two",
   "constant elasticity: additive and multiplicative are its limits, and the elasticity is swept rather than chosen"
  ]
 ],
 "shape_props": {
  "monotone": [
   "increasing"
  ],
  "threshold": [
   "sigmoid"
  ],
  "saturating": [
   "increasing",
   "concave"
  ],
  "linear": [
   "increasing"
  ],
  "inverted-U": [],
  "categorical": []
 },
 "properties": [
  "increasing",
  "concave",
  "convex",
  "sigmoid",
  "f(0)=0",
  "f(1)=1"
 ],
 "families": [
  {
   "name": "linear",
   "description": "Proportional: each increment adds exactly as much as the one before it. One member, because linear is a point in form-space and not a family — and it is here because it is the baseline the others are claims against. Without it the declared class cannot contain 'no curvature', so a search over the class can never report that curvature was not needed.",
   "properties": [
    "f(0)=0",
    "f(1)=1",
    "increasing",
    "linear"
   ],
   "members": [
    [
     "proportional",
     "X"
    ]
   ]
  },
  {
   "name": "concave",
   "description": "Diminishing returns: the first increment buys the most and each further one buys less. Increasing and concave throughout — the saturating shapes.",
   "properties": [
    "f(0)=0",
    "f(1)=1",
    "increasing",
    "concave"
   ],
   "members": [
    [
     "exponential",
     "(1 - exp(-2 * X)) / (1 - exp(-2))"
    ],
    [
     "sqrt",
     "X ** 0.5"
    ],
    [
     "cbrt",
     "X ** (1 / 3)"
    ],
    [
     "log",
     "log(1 + 4 * X) / log(5)"
    ],
    [
     "hyperbolic",
     "2 * X / (1 + X)"
    ]
   ]
  },
  {
   "name": "convex",
   "description": "Accelerating: the first increment is close to free and each further one costs more. Increasing and convex throughout.",
   "properties": [
    "f(0)=0",
    "f(1)=1",
    "increasing",
    "convex"
   ],
   "members": [
    [
     "quadratic",
     "X * X"
    ],
    [
     "cubic",
     "X ** 3"
    ],
    [
     "quartic",
     "X ** 4"
    ],
    [
     "exponential",
     "(exp(2 * X) - 1) / (exp(2) - 1)"
    ]
   ]
  },
  {
   "name": "sigmoid",
   "description": "S-shaped: slow, then rapid, then levelling off. A threshold rather than a proportion. Declare it when little happens until some level is reached and little more happens after it.",
   "properties": [
    "f(0)=0",
    "f(1)=1",
    "increasing",
    "sigmoid"
   ],
   "members": [
    [
     "logistic",
     "(1 / (1 + exp(-11 * (X - 0.4))) - 1 / (1 + exp(4.4))) / (1 / (1 + exp(-6.6)) - 1 / (1 + exp(4.4)))"
    ],
    [
     "smoothstep",
     "X * X * (3 - 2 * X)"
    ],
    [
     "smootherstep",
     "X ** 3 * (X * (6 * X - 15) + 10)"
    ],
    [
     "algebraic",
     "X ** 3 / (X ** 3 + (1 - X) ** 3)"
    ],
    [
     "logistic_late",
     "(1 / (1 + exp(-8 * (X - 0.55))) - 1 / (1 + exp(4.4))) / (1 / (1 + exp(-3.6)) - 1 / (1 + exp(4.4)))"
    ]
   ]
  }
 ]
};


export { VOCAB };

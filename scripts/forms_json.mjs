/* The registry of named forms, as a file an engine in another language reads.

   `docs/bench/core/forms.js` is the source and derives it from
   `core/vocab.js`, which is where the fifteen member expressions live. This
   writes it out as JSON, because a registry readable only by something that
   parses JavaScript is not a shared registry -- and "one shared registry of
   named forms for both engines" was the gap the specification recorded under
   Engines.

   `tests/forms.test.mjs` fails when the file and the module disagree, so
   regenerating it is part of changing a form rather than a thing to remember.

   Run:  node scripts/forms_json.mjs        (or `make forms`)
*/
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formsData, formsTag, formCount } from "../docs/bench/core/forms.js";
import { VOCAB } from "../docs/bench/core/vocab.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "schema", "forms.json");
const body = {
  format: "amg-forms", v: 1,
  tag: formsTag(),
  what: "The classes of functional form this bench enumerates over. A member is an " +
    "EXPRESSION in the bench grammar with X for what the term reads, so an engine in any " +
    "language can run it; the grammar is + - * / ** and exp log min max, and nothing else. " +
    "Every member is normalised at both ends on purpose: otherwise swapping one moves " +
    "magnitude and shape at once, and a failed proposition cannot be attributed to either.",
  properties: VOCAB.properties.slice(),
  families: formsData(),
  counts: {families: formsData().length, members: formCount()},
};
writeFileSync(out, JSON.stringify(body, null, 1) + "\n");
console.log(`schema/forms.json — ${body.tag}, ${body.counts.families} families, ` +
  `${body.counts.members} members`);

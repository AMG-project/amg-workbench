/* AMG bench, page script 1 of 22: the comparative statics shown on step 7.

   THIS FILE USED TO BE A SECOND MODEL.

   310 lines of it: three families of functional forms, three stakeholders with
   their weights, three comparative statics and the arithmetic to run them, all
   written out here in JavaScript -- and the same thing again in
   statics/index.html, and the markup for both again in a <template> in
   bench.html. Three copies of one model, none of them the model the eight
   steps declare, and nothing holding any of them to the others.

   What is here now is the mount. statics/statics.js reads the scenario, builds
   it with core/kernel.js -- the same grammar step 3.2 compiles with -- and
   draws whatever comes out, so the picture on step 7 is of the model you are
   actually working on. When nothing has been declared yet it falls back to the
   finished example the bench ships, which is what this section was always for.
*/
"use strict";
import { mount } from "../statics/statics.js";

/* `snap` is the scenario as it stands, handed over rather than read back out
   of the store: the store is written on a change and this is read on a render,
   and the two are not the same instant. */
const stxInit = (host, snap) => mount(host, {snap, chrome:false});

export { stxInit };

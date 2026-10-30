/* The front door, kept honest.

   A reviewer's first five minutes decide more about this repository than any
   file in it, and they spend those five minutes in README.md doing exactly
   what it says. So what it says has to be true, and the two ways it goes
   wrong are both silent: a path that was renamed, and a command that stopped
   working because the thing it ran was deleted.

   Both of those were live when this file was written. The README pointed at an
   `index/` directory that is not in this repository -- the corpus moved into
   the page and into the review repository months ago. And .github/workflows/
   ci.yml still ran `uv sync`, ruff and pytest against a Python engine that
   had been removed, so two of its three jobs could not have passed: a red CI on a
   submission whose first gate is reproducibility is worse than no CI.

   Neither was found by a test, because no test read the documentation. This
   one does.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const at = p => join(ROOT, p);
const slurp = p => fs.readFileSync(at(p), "utf8");

const DOCS = ["README.md", ...fs.readdirSync(at("docs"))
  .filter(f => f.endsWith(".md")).map(f => "docs/" + f)];

/* `core/safe.js` and `page/20-expset.js` are how every comment in this
   repository refers to those two directories, so the documentation says it the
   same way. Both live under docs/bench/. */
const resolve = p => fs.existsSync(at(p)) ? p
  : /^(core|page)($|\/)/.test(p) ? "docs/bench/" + p : p;

/* EVERY MARKDOWN FILE, NOT ONLY THE FRONT ONES. A link that leaves this
   directory resolves here, where the artifact sits beside the drafts and the
   corpus, and 404s the moment this directory is published on its own, which is
   what it exists for. One did: docs/run/HOW_TO_RUN.md pointed three levels up
   at a note in the private working repository. */
const mdFiles = (dir = ".") => fs.readdirSync(at(dir), {withFileTypes:true})
  .flatMap(e => {
    if(e.name.startsWith(".") || e.name === "node_modules") return [];
    const p = dir === "." ? e.name : dir + "/" + e.name;
    return e.isDirectory() ? mdFiles(p) : (e.name.endsWith(".md") ? [p] : []);
  });

test("no document links out of this repository", () => {
  const docs = mdFiles();
  /* The floor is on the FILES, not the links: what this would miss is a walk
     that stopped descending, and a document is allowed to carry no links. */
  assert.ok(docs.length >= 10,
    `the walk found ${docs.length} markdown files; it should reach every directory`);
  for(const doc of docs){
    const src = slurp(doc), dir = dirname(doc);
    const links = [...src.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1])
      .filter(t => !/^(https?:|#|mailto:)/.test(t));
    for(const t of links){
      const rel = join(dir, t.split("#")[0]);
      assert.ok(!rel.startsWith(".."), `${doc} links to ${t}, which is outside this ` +
        `repository: it resolves here and 404s wherever this is published on its own`);
      assert.ok(fs.existsSync(at(rel)), `${doc} links to ${t}, which is not here`);
    }
  }
});

test("the documentation names no file that is not here", () => {
  for(const doc of DOCS){
    const src = slurp(doc), dir = dirname(doc);
    /* Backticked paths: anything with a slash in it that is not a URL, a glob
       or a command line. A bare filename is skipped, because `kernel.js` is a
       name and `docs/bench/core/kernel.js` is a path. */
    const ticked = [...src.matchAll(/`([^`\n]+)`/g)].map(m => m[1])
      .filter(t => t.includes("/") && !/[\s*:]|^https?|^\.\.|^\//.test(t));
    for(const t of ticked){
      const p = resolve(t.replace(/[.,)]+$/, "").replace(/\/$/, ""));
      assert.ok(fs.existsSync(at(p)), `${doc} names \`${t}\`, which is not here`);
    }
    /* And every relative markdown link, which is the one a reader clicks. */
    const links = [...src.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1])
      .filter(t => !/^(https?:|#|mailto:)/.test(t));
    for(const t of links){
      const p = join(dir, t.split("#")[0]);
      assert.ok(fs.existsSync(at(p)), `${doc} links to ${t}, which is not here`);
    }
  }
});

test("every make target the documentation tells you to run exists", () => {
  const mk = slurp("Makefile");
  const targets = new Set([...mk.matchAll(/^([a-z][a-z-]*):/gm)].map(m => m[1]));
  /* Backticked only: that is the form a reader copies, and "does not make
     interval arithmetic decide" is a sentence rather than a command. */
  for(const doc of DOCS)
    for(const m of slurp(doc).matchAll(/`make ([a-z][a-z-]*)[^`]*`/g))
      assert.ok(targets.has(m[1]), `${doc} says \`make ${m[1]}\`, which is not a target`);
  /* The ones the README leads with, by name, because they are the cold start. */
  for(const t of ["check", "scan", "model-report"])
    assert.ok(targets.has(t), `the Makefile has no ${t} target`);
});

test("CI runs this repository's own checks, and nothing it no longer has", () => {
  const ci = slurp(".github/workflows/ci.yml");
  const mk = slurp("Makefile");
  const targets = new Set([...mk.matchAll(/^([a-z][a-z-]*):/gm)].map(m => m[1]));
  const runs = [...ci.matchAll(/make ([a-z][a-z-]*)/g)].map(m => m[1]);
  assert.ok(runs.length, "the workflow runs no make target at all");
  for(const t of runs)
    assert.ok(targets.has(t), `CI runs \`make ${t}\`, which is not a target`);
  /* THE SPECIFIC ROT. drystone and its packaging are gone; a workflow still
     running any of this would be red on every push, and a red CI is the worst
     cold start a reproducibility gate can meet. Comments are stripped first:
     the file explains what it used to do, and saying so is not doing it. */
  const live = ci.split("\n").filter(l => !/^\s*#/.test(l)).join("\n");
  for(const gone of ["uv sync", "uv run", "pytest", "ruff", "pyproject", "setup-uv"])
    assert.ok(!live.includes(gone),
      `CI runs ${gone}, which this repository does not have any more`);
});

test("every file under core/ is loaded by a test, which the README claims", () => {
  /* The claim is "every file runs under node --test, so one of them can be
     read, tested and replaced on its own". It was true of eleven of the twelve:
     core/vocab.js held the fifteen member expressions every class run
     substitutes and no test imported it. */
  const tests = fs.readdirSync(at("tests")).filter(f => f.endsWith(".mjs"))
    .map(f => slurp("tests/" + f)).join("\n");
  for(const f of fs.readdirSync(at("docs/bench/core")).filter(f => f.endsWith(".js")))
    assert.ok(tests.includes("core/" + f), `no test loads core/${f}`);
});

test("the two scenarios the README tells a reader to open are openable", () => {
  const named = [...slurp("README.md").matchAll(/docs\/bench\/demo\/([\w.-]+\.json)/g)]
    .map(m => m[1]);
  assert.ok(named.length >= 1, "the README names no scenario to open");
  for(const f of new Set(named)){
    const o = JSON.parse(slurp("docs/bench/demo/" + f));
    assert.equal(o.format, "amg-scenario", `${f} is not a scenario file`);
    assert.equal(o.v, 1, `${f} is version ${o.v}`);
    assert.ok(o.snap && o.snap.stage, `${f} carries no decisions`);
  }
  /* Both of them, and the menu offers exactly these. */
  const page = slurp("docs/bench/bench.html");
  for(const id of ["scenDemo", "scenModel"])
    assert.ok(page.includes(`id="${id}"`), `the page has no ${id} control`);
});

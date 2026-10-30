#!/usr/bin/env python3
"""Parse every script the bench loads, together and apart.

A classic script that fails to parse is not a partial failure: nothing it
declares exists, and the page renders with whole functions silently missing.
That has happened four times now -- a deleted array element took its closing
bracket with it, a probe redeclared a global, a save/load pair was declared
twice eleven thousand lines apart, and the interval layer was published both
inline and in kernel.js -- and every time the page looked almost right.

The last two got through an earlier version of THIS script, which is the reason
it now looks the way it does. It had two blind spots:

    it read only inline blocks     so a name declared both inline and in an
                                   external script was invisible to it, which
                                   is what shipped a page whose whole 12,520
                                   line block never parsed

    it checked as a .js file       which is script semantics, where a duplicate
                                   top-level FUNCTION declaration is perfectly
                                   legal and the later one silently wins

So: follow the page's own `src=` for local files, and check the joined text as a
module, where a duplicate top-level binding is a SyntaxError. Classic scripts
really do share one global lexical scope, so concatenating them in document
order is faithful; module semantics are stricter than the browser's on exactly
the point worth being strict about, and in this codebase a redeclaration has
never once been intentional.

Three passes, because they catch different faults:

    each script alone     a malformed file, which is what an edit breaks
    all of them joined    a name declared twice in the scope they share
    RECORDED vs disk      a decision the page claims was taken

Usage:  python3 scripts/check_bench.py [path]   (default docs/bench/bench.html)
"""

from __future__ import annotations

import csv
import os
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath

ART = Path(__file__).resolve().parent.parent
PAGE = Path(sys.argv[1]) if len(sys.argv) > 1 else ART / "docs" / "bench" / "bench.html"
PASSES = ART.parent / "purpose-review" / "corpus" / "index" / "passes.tsv"
SCRIPT = re.compile(r"<script([^>]*)>(.*?)</script>", re.DOTALL)
SRC = re.compile(r'\bsrc\s*=\s*"([^"]+)"')


def sources(page: Path) -> list[tuple[str, str]]:
    """Every script the page runs, in the order it runs them.

    A CDN script is somebody else's scope to get wrong, and d3 is an IIFE, so
    only local files are followed. A missing one is a failure in itself: the
    page names it and the browser would have tried to fetch it.
    """
    html = page.read_text(encoding="utf-8")
    out: list[tuple[str, str]] = []
    for m in SCRIPT.finditer(html):
        src = SRC.search(m.group(1))
        if src is None:
            line = html.count("\n", 0, m.start()) + 1
            out.append((f"{page.name}:{line} (inline)", m.group(2)))
        elif not src.group(1).startswith(("http://", "https://", "//")):
            f = page.parent / src.group(1)
            if not f.is_file():
                sys.exit(f"{page.name} loads {src.group(1)}, which is not on disk")
            out.append((src.group(1), f.read_text(encoding="utf-8")))
    return out


def recorded(src: str) -> str | None:
    """The decisions the page shows as already taken must be the ones on file.

    `RECORDED` is pasted into the page rather than generated, so it can drift
    from index/passes.tsv without anything saying so -- and a bench that tells a
    curator a decision was already settled when it was not is worse than one
    that says nothing. Compared on date, action and target; the reason text is
    allowed to be edited on either side.

    Read from the joined sources rather than from bench.html, because the array
    now lives in page/03-stores.js and looking only at the page would have
    quietly stopped checking anything.
    """
    if not PASSES.is_file():
        return None  # split-out repo: the page's copy is all there is
    m = re.search(r"const RECORDED = (\[.*?\]);\n", src, re.DOTALL)
    if not m:
        return "no RECORDED array in any of the page's scripts -- has it been renamed?"
    try:
        page = {(r["d"], r["a"], r["t"]) for r in json.loads(m.group(1))}
    except Exception as exc:  # noqa: BLE001 - the message is the point
        return f"RECORDED does not parse as JSON: {exc}"
    with PASSES.open(encoding="utf-8") as fh:
        disk = {(r["date"], r["action"], r["target"]) for r in csv.DictReader(fh, delimiter="\t")}
    if page == disk:
        return None
    out = [
        f"RECORDED and {PASSES.name} disagree ({len(page)} rows in the page, {len(disk)} on disk)"
    ]
    for d in sorted(disk - page):
        out.append(f"  on disk only: {' · '.join(d)}")
    for d in sorted(page - disk):
        out.append(f"  in the page only: {' · '.join(d)}")
    return "\n".join(out)


# `lsWrite("k", v)` / `lsRead(k)` / `lsDrop("k")` -- the key is either a literal
# or a SHOUTED constant, and both forms are compared as written, so a constant
# needs no resolving: SCEN_KEY read is SCEN_KEY written.
LSCALL = re.compile(r'\bls(Write|Read|Drop)\(\s*(?:"([^"]+)"|([A-Z_][A-Z0-9_]*))')


def bare(src: str) -> str:
    """The source with its comments taken out, so prose about localStorage does
    not read as a call to it."""
    src = re.sub(r"/\*[\s\S]*?\*/", " ", src)
    return re.sub(r"(?m)^\s*//.*$", " ", src)


def lskeys(scripts: list[tuple[str, str]]) -> tuple[set[str], set[str], list[str]]:
    """The keys written, the keys read, and every direct touch of localStorage."""
    write: set[str] = set()
    read: set[str] = set()
    direct: list[str] = []
    for name, src in scripts:
        body = bare(src)
        for m in re.finditer(r"\blocalStorage\s*\.\s*(\w+)", body):
            direct.append(f"{name}: localStorage.{m.group(1)}")
        for verb, literal, const in LSCALL.findall(body):
            (read if verb == "Read" else write).add(literal or const)
    return write, read, direct


def stores(scripts: list[tuple[str, str]]) -> str | None:
    """Every browser store goes through lsWrite/lsRead, and every key pairs up.

    There were sixteen stores, each writing its own try/stringify/setItem with
    an empty catch. Two of them ended up with the same pair of function names
    eleven thousand lines apart, and for a week the full-text store's save
    wrote the families store instead -- silently, because the catch discarded
    the reason. The fix was one writer and one reader; this is what keeps it
    that way.

    Two things are checked. Nothing but the helper may touch localStorage
    directly, because the old shape is what invited the collision. And every
    key written must also be read, and every key read must also be written: a
    store written and never read is data thrown away, and one read and never
    written is a default that can never become anything else.
    """
    write, read, direct = lskeys(scripts)
    out = []
    # ONE READER FROM OUTSIDE, AND IT ONLY READS. statics/statics.js is mounted
    # by two documents: this page, and statics/index.html, which loads no page
    # script at all. It cannot reach the helper without dragging 886KB of
    # corpus into a page that draws a model, so it reads the scenario store
    # itself -- and a read is not what the one-writer rule was made for. It may
    # not write: that is checked here rather than trusted.
    OUTSIDE = "statics/statics.js: localStorage."
    wrong = [d for d in direct if d.startswith(OUTSIDE) and not d.endswith("getItem")]
    if wrong:
        out.append("statics/statics.js may read the store and not write it:")
        out.extend("  " + d for d in wrong)
    direct = [d for d in direct if not d.startswith(OUTSIDE)]
    # setItem in lsWrite, getItem in lsRead, removeItem in lsDrop, and no more.
    if len(direct) != 3:
        out.append(
            f"localStorage is touched {len(direct)} times; only the three calls inside "
            f"the helper may touch it directly:"
        )
        out.extend("  " + d for d in direct)
    if not write and not read:
        out.append("no lsWrite/lsRead calls at all -- has the helper been renamed?")
    out += [
        f'store "{k}" is written and never read -- that data is thrown away'
        for k in sorted(write - read)
    ]
    out += [
        f'store "{k}" is read and never written -- it can only ever be the default'
        for k in sorted(read - write)
    ]
    return "\n".join(out) if out else None


def parses(src: str, suffix: str) -> str | None:
    """None if node can parse it, else the first lines of why."""
    with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False, encoding="utf-8") as fh:
        fh.write(src)
        tmp = Path(fh.name)
    try:
        r = subprocess.run(
            ["node", "--check", str(tmp)], capture_output=True, text=True, check=False
        )
        if not r.returncode:
            return None
        out = [ln for ln in (r.stderr or "").splitlines() if ln.strip()][:5]
        # macOS resolves the temp dir, so stderr's path is not str(tmp): match
        # the basename and take whatever path led to it.
        return re.sub(r"\S*" + re.escape(tmp.name), "<joined>", "\n".join(out))
    finally:
        tmp.unlink(missing_ok=True)


MARK = "/* ===== %s ===== */"


def blame(joined: str, names: list[str], why: str) -> str:
    """Turn a line number in the concatenation into the file it belongs to."""
    m = re.search(r"<joined>:(\d+)", why)
    if not m:
        return ""
    want, lines = int(m.group(1)), joined.split("\n")
    seen = "?"
    for i, line in enumerate(lines[:want], 1):
        for n in names:
            if line == MARK % n:
                seen = n
    return f"  -- in {seen}\n"


# A NAME NOTHING DECLARES.
#
# The scope pass above catches a name declared TWICE, which is what killed
# version 20. It cannot see a name declared ZERO times, which is what killed
# version 37: a commit meant to delete one function deleted the span around
# it, took eighteen declarations with it -- ROUNDS, NOISE, MTH, simSign and
# the rest -- and every one of them was still referenced. The page parsed
# perfectly, `make check` was green, and step six threw the moment it
# rendered. Both failures are the same shape: one shared global scope, where
# a reference is only resolved when the line runs.
#
# This is the cheap half of the answer -- the expensive half is tests/
# pagewalk.mjs, which drives the page. It is deliberately conservative: a
# name declared ANYWHERE at any nesting level counts as declared, so this
# reports only names that exist nowhere at all. That is the class that
# matters and it carries no false positives.
DECL = re.compile(r"(?:^|[\s;{(,])(?:const|let|var|function\s*\*?|class)\s+([A-Za-z_$][\w$]*)")
USE = re.compile(r"(?<![.\w$])([A-Za-z_$][\w$]*)\s*(?=[([.=,;)\]}]|$)", re.MULTILINE)
# Everything a browser hands a classic script, plus what this page loads.
HOSTED = {
    # real browser globals the page reads bare. innerWidth and innerHeight
    # were missing, and the reachability check found them rather than a bug.
    "innerWidth",
    "innerHeight",
    "window",
    "document",
    "console",
    "localStorage",
    "sessionStorage",
    "navigator",
    "location",
    "history",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "requestAnimationFrame",
    "fetch",
    "Math",
    "JSON",
    "Object",
    "Array",
    "String",
    "Number",
    "Boolean",
    "Date",
    "RegExp",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "Promise",
    "Error",
    "TypeError",
    "RangeError",
    "SyntaxError",
    "Symbol",
    "Proxy",
    "Reflect",
    "BigInt",
    "Intl",
    "Infinity",
    "NaN",
    "undefined",
    "null",
    "true",
    "false",
    "this",
    "arguments",
    "globalThis",
    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",
    "encodeURIComponent",
    "decodeURIComponent",
    "alert",
    "confirm",
    "prompt",
    "structuredClone",
    "queueMicrotask",
    "AbortController",
    "Blob",
    "File",
    "FileReader",
    "URL",
    "URLSearchParams",
    "FormData",
    "Image",
    "Event",
    "CustomEvent",
    "CSS",
    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
    "matchMedia",
    "scrollTo",
    "EventTarget",
    "Element",
    "Node",
    "NodeList",
    "HTMLElement",
    "SVGElement",
    "DOMParser",
    "Uint8Array",
    "Uint32Array",
    "Int32Array",
    "Float64Array",
    "ArrayBuffer",
    "TextEncoder",
    "TextDecoder",
    "module",
    "exports",
    "require",
    "process",
    "d3",
    "performance",
    "crypto",
    "getComputedStyle",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "return",
    "function",
    "var",
    "let",
    "const",
    "new",
    "typeof",
    "instanceof",
    "in",
    "of",
    "delete",
    "void",
    "throw",
    "try",
    "catch",
    "finally",
    "class",
    "extends",
    "super",
    "yield",
    "await",
    "async",
    "static",
    "get",
    "set",
    "from",
    "as",
    "default",
    "export",
    "import",
}


def code_only(src: str) -> str:
    """Just the code: comments gone, string bodies gone, and -- the part that
    matters here -- template literals reduced to their ${...} expressions.

    Without this last step the page reads as thousands of undeclared names,
    because almost all of it is HTML inside backticks: `data-wspop=` and
    `yours to declare` both look like identifiers to a regex. A scanner is
    the only honest way to tell the code in a template from the text."""
    out: list[str] = []
    i, n = 0, len(src)
    tmpl: list[int] = []  # depth of {} inside each open ${ }
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if not tmpl or tmpl[-1] >= 0:  # in code (or inside a ${ })
            if c == "/" and nxt == "/":
                while i < n and src[i] != "\n":
                    i += 1
                continue
            if c == "/" and nxt == "*":
                i = src.find("*/", i + 2)
                i = n if i < 0 else i + 2
                out.append(" ")
                continue
            if c in "\"'":
                q, i = c, i + 1
                while i < n and src[i] != q:
                    i += 2 if src[i] == "\\" else 1
                i += 1
                out.append(" 0 ")
                continue
            # A REGEX LITERAL, which is the one token that cannot be told
            # from division without context. Getting this wrong is not
            # cosmetic: /"/g inside a template expression made the scanner
            # read the quote as a string start and lose the next six hundred
            # characters, which hid two real declarations and reported them
            # as missing. A slash opens a regex when what precedes it cannot
            # end an expression.
            if c == "/":
                prev = "".join(out).rstrip()
                tok = re.search(r"[A-Za-z_$][\w$]*$", prev)
                opens = (
                    not prev
                    or prev[-1] in "(,=:[!&|?{};+-*%~^<>"
                    or (
                        tok
                        and tok.group(0)
                        in {
                            "return",
                            "typeof",
                            "case",
                            "in",
                            "of",
                            "new",
                            "delete",
                            "void",
                            "throw",
                            "do",
                            "else",
                            "yield",
                            "await",
                        }
                    )
                )
                if opens:
                    i += 1
                    while i < n and src[i] != "/":
                        if src[i] == "\\":
                            i += 1
                        elif src[i] == "[":  # a class may hold an unescaped /
                            while i < n and src[i] != "]":
                                i += 2 if src[i] == "\\" else 1
                        i += 1
                    i += 1
                    while i < n and src[i] in "gimsuyd":
                        i += 1
                    out.append(" 0 ")
                    continue
            if c == "`":
                tmpl.append(-1)  # -1 == in template text
                i += 1
                out.append(" ")
                continue
            if tmpl and tmpl[-1] >= 0:
                if c == "{":
                    tmpl[-1] += 1
                elif c == "}":
                    tmpl[-1] -= 1
                    if tmpl[-1] == 0:
                        tmpl[-1] = -1  # back to template text
                        i += 1
                        out.append(" ")
                        continue
            out.append(c)
            i += 1
            continue
        # inside template TEXT
        if c == "\\":
            i += 2
            continue
        if c == "`":
            tmpl.pop()
            i += 1
            out.append(" ")
            continue
        if c == "$" and nxt == "{":
            tmpl[-1] = 1
            i += 2
            out.append(" ")
            continue
        i += 1
    return "".join(out)


def _decl_names(part: str, decl: set[str]) -> None:
    """Every name a declarator list binds: `a = 1, b = 2` binds two."""
    depth = 0
    buf = ""
    for ch in part:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if depth == 0 and ch == ",":
            decl.add(buf.split("=")[0].strip().strip("{}[] "))
            buf = ""
        else:
            buf += ch
    decl.add(buf.split("=")[0].strip().strip("{}[] "))


WIRED = re.compile(r"\[data-([a-z0-9]+)\]")
# A bare attribute is still a rendered attribute: `<button data-axbold>`
# carries no `=` and reads as dead wiring if you insist on one.
RENDERED = re.compile(r"(?<!\[)\bdata-([a-z0-9]+)(?=[\s=\">}/]|$)")


def dead_wiring(scripts: list[tuple[str, str]]) -> str | None:
    """Selectors that wire a control the page no longer renders.

    The mirror of the bug that killed the Join buttons, and just as quiet: a
    querySelectorAll that matches nothing is not an error, so wiring left
    behind by a rename or a move costs nothing until somebody reads it and
    believes it. Four of these were already here."""
    wired: dict[str, str] = {}
    rendered: set[str] = set()
    for name, src in scripts:
        b = bare(src)
        for m in WIRED.finditer(b):
            wired.setdefault(m.group(1), name)
        rendered |= set(RENDERED.findall(b))
    dead = {k: v for k, v in wired.items() if k not in rendered}
    if not dead:
        return None
    rows = "\n".join(
        f"  data-{k}  -- wired in {v}, rendered nowhere" for k, v in sorted(dead.items())
    )
    return f"{len(dead)} selector(s) wire a control that does not exist:\n{rows}"


def decls_of(b: str) -> set[str]:
    """Every name one file's code declares, at any nesting level.

    Lifted out of undeclared() unchanged so that layers() can ask the same
    question per file. Two passes reading declarations differently is two
    answers, and the one that matters here is which LAYER a name belongs to.
    """
    decl: set[str] = set()
    if True:
        decl |= set(DECL.findall(b))
        # `const PLW = 520, PLH = 132, PLL = 44` declares three names and the
        # pattern above sees one. Six of this page's constants are written
        # that way and every one of them read as undeclared.
        for m in re.finditer(
            r"(?:^|[\s;{(])(?:const|let|var)\s+([^;]{0,400}?)(?=;|$)", b, re.DOTALL
        ):
            # `const lines = xs.map(l => {` has no semicolon until well past
            # the `const` inside its own body, so the capture swallows it and
            # the inner names are never seen. Splitting on the nested keyword
            # and resetting the bracket depth is what gets them back.
            for part in re.split(r"\b(?:const|let|var)\s+", m.group(1)):
                _decl_names(part, decl)

        # `verbs.map(vb => ...)` binds vb with no parentheses at all
        decl |= set(re.findall(r"(?<![.\w$])([A-Za-z_$][\w$]*)\s*=>", b))
        # parameters, catch bindings, for-of bindings and object keys all
        # introduce names, and missing one would be a false positive
        # A PARAMETER LIST, and not every parenthesis before a brace.
        # `if(v < b[0] - ATOL || v > b[1] + ATOL){` is a condition, and
        # reading it as a parameter list declared ATOL -- so a module using it
        # without importing it looked fine, and the check meant to catch
        # exactly that passed. The keywords are excluded by name.
        for m in re.finditer(r"\(([^()]*)\)\s*(?:=>|\{)", b):
            # what sits immediately before the paren decides what it is
            lead = b[max(0, m.start() - 10):m.start()]
            if re.search(r"(?<![.\w$])(?:if|while|for|switch|catch|with)\s*$", lead):
                continue
            for piece in re.split(r"[{}\[\],:=\s.]+", m.group(1)):
                if re.fullmatch(r"[A-Za-z_$][\w$]*", piece or ""):
                    decl.add(piece)
        decl |= set(re.findall(r"(?:catch|for)\s*\(\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)", b))
        decl |= set(re.findall(r"(?m)^\s*([A-Za-z_$][\w$]*)\s*:", b))
        decl |= set(re.findall(r"[{,]\s*([A-Za-z_$][\w$]*)\s*[,}]", b))
        for m in re.finditer(r"(?:const|let|var)\s*[{\[]([^}\]]*)[}\]]\s*(?:=|of\b|in\b)", b):
            for piece in re.split(r"[,:\s]+", m.group(1)):
                if re.fullmatch(r"[A-Za-z_$][\w$]*", piece or ""):
                    decl.add(piece)
    return decl


# ---------------------------------------------------------------------------
# THE LAYER RULE.
#
# `docs/bench/core/` is the lower layer: the grammar and its proof, the closed
# vocabularies, and the parts of the method that compute rather than draw.
# Nothing in it may use a name declared outside it.
#
# The rule is what makes the layer worth having, and the reason is not
# tidiness. `make modules-map` reports that all 23 files under `page/` are one
# strongly connected component -- a scholar who wants to improve how similarity
# is scored, or which form combinations get explored, cannot take that part out
# without taking the other twenty-two and the browser with them. A file that
# obeys this rule can be read on its own, tested under node on its own, and
# replaced on its own, which is the whole of what "improvable one part at a
# time" means.
#
# Checked here rather than left to the eventual conversion to ES modules,
# because a rule enforced on the classic page holds whether that conversion
# ever happens. The DOM and the host are allowed: a core file may call
# JSON.parse or Math.min. The page's own names are not.
CORE = "core/"


# An import statement, wherever it sits. NOT anchored to a line start: the
# conversion puts every import of a file on ONE line separated by semicolons,
# and an anchored pattern saw only the first of them -- which left this rule
# reading one import per file and passing almost everything.
IMPORT = re.compile(r'(?:^|;)\s*import\s+(?:[^"\';]*?\s+from\s+)?["\']([^"\']+)["\']',
                    re.M)


def resolve_dep(name: str, spec: str) -> str:
    """A relative specifier, as a path relative to docs/bench.

    normpath and nothing else. An earlier version stripped "./" from the
    joined path to tidy it, which also ate the dot in "../" -- so
    `core/../page/03-stores.js` became `core/.page/03-stores.js`, still
    started with `core/`, and the layer rule reported no breach for a core
    file importing the page. The rule passed because it was asking the wrong
    string.
    """
    joined = (PurePosixPath(name).parent / spec).as_posix()
    return os.path.normpath(joined).replace("\\", "/")


def imports_of(name: str, src: str) -> list[str]:
    """Every module one file imports, as a path relative to docs/bench."""
    return [resolve_dep(name, m.group(1)) for m in IMPORT.finditer(src)
            if m.group(1).startswith(".")]


def layers(scripts: list[tuple[str, str]]) -> str | None:
    """Nothing under core/ may IMPORT from outside core/.

    The rule the directory exists for, and the page being modules is what lets
    it be read off the imports rather than inferred from which file happens to
    declare a name. core/ is the layer a scholar can replace one file of: it
    can be read on its own, tested under node on its own, and swapped on its
    own, and every one of those stops being true the moment a file in it
    reaches into the page.

    The two data files are outside core/ and outside the rule's reach on
    purpose: a core file that imported the corpus would be coupled to one
    corpus, so the corpus is passed in.
    """
    core = [(n, s) for n, s in scripts if n.startswith(CORE)]
    if not core:
        return "no file under core/ -- the lower layer is the point, so its absence is the failure"
    bad: list[str] = []
    for n, src in core:
        for dep in imports_of(n, src):
            if not dep.startswith(CORE):
                bad.append(f"  {n} imports {dep}")
    if not bad:
        return None
    return (
        f"{len(bad)} breach(es) of the layer rule:\n" + "\n".join(bad) + "\n"
        "  A file under core/ that imports from outside it cannot be read, "
        "tested or replaced on its own, which is the whole of what core/ is "
        "for.\n  Either the thing imported belongs in core/ too, or the core "
        "file is asking its caller for something the caller should pass in."
    )


# Every control that can call a language model, by how it is written in the
# markup. aiMark() draws the sparkle; it goes before the label.
ASKS = re.compile(r'data-ai="[a-z]+"|id="passGo"|id="gAsk"|id="addPaper"|data-wsagent')


def ai_marked(scripts: list[tuple[str, str]]) -> str | None:
    """Every control that calls a model carries the mark that says so.

    Fifteen controls on this bench ask a language model and nothing visible
    said which; their labels named it six different ways or not at all, and a
    reader could not tell that "compile it" or "ask a reviewer" leaves the
    page. The mark is the one thing that says where the model acts, so a
    control that loses it lies by omission -- and no other check sees it,
    because a button with the right id and the right label is a button the
    page walk is happy with.

    Read here rather than in the walk because the walk runs without a model
    and these controls are not drawn at all then, so the walk's version of
    this check would pass by finding nothing.
    """
    bad: list[str] = []
    for n, src in scripts:
        for m in ASKS.finditer(src):
            end = src.find("</button>", m.end())
            if end < 0:
                bad.append(f"  {n}: {m.group(0)} is not inside a button")
                continue
            # The mark may sit before the attribute (a label-first template)
            # or after it, so the whole element is read.
            start = src.rfind("<button", 0, m.start())
            if start < 0 or "aiMark()" not in src[start:end]:
                line = src.count("\n", 0, m.start()) + 1
                bad.append(f"  {n}:{line}  {m.group(0)}")
    if not bad:
        return None
    return (
        f"{len(bad)} control(s) call a model and do not carry the mark:\n" + "\n".join(bad) +
        "\n  aiMark() in page/08-ask.js draws it, and it goes before the label. The bench's "
        "argument\n  is that a model proposes and the page checks, so where the model acts "
        "has to be visible."
    )


VERDICTS = ("proved", "disproved", "partial", "undecided", "flat", "turns", "region")


def verdict_words(scripts: list[tuple[str, str]]) -> str | None:
    """No file under page/ may turn a verdict into a word of its own.

    The verdict is what this bench is for, and five places under page/ each
    chose their own words and colours for the same five of them. On the worked
    example one line read REGION in the derived list, TURNS among the retained
    findings and PARTIAL in the settled-share chart, on one step, and
    `undecided` was drawn in red in two of them on a page whose own text says
    undecided is a verdict rather than a failure.

    What that looks like in code is a verdict compared with a string and a
    LABEL produced from the comparison, on one line. core/verdict.js is where
    those words live; a page file asks it. Comparing a verdict in order to
    pick a CLASS, a branch or a number is ordinary and is not matched here --
    only a comparison whose result is a word a reader sees.
    """
    words = "|".join(VERDICTS)
    cmp = re.compile(r'===\s*[\'"](?:' + words + r')[\'"]')
    lab = re.compile(r'[\'"](?:' + words + r')[\'"]')
    # The RAW source, not code_only(): that drops string bodies, and the words
    # ARE the string bodies. Comment lines are skipped by hand instead.
    #
    # The test is in two parts, because comparing a verdict is ordinary and
    # only LABELLING from the comparison is not. A line is refused when it
    # compares against a verdict word, and a verdict word is still left on it
    # once every such comparison is struck out, and there is a ternary to have
    # produced it. So `sp.verdict === "proved" ? 1 : -1` passes -- it produces
    # a number -- and `verdict === "partial" ? ["part", "region"]` does not.
    bad: list[str] = []
    for n, src in scripts:
        if not n.startswith("page/"):
            continue
        for i, line in enumerate(src.splitlines(), 1):
            head = line.lstrip()
            if head.startswith(("*", "//", "/*")) or "?" not in line:
                continue
            code = line[:line.find("//")] if "//" in line else line
            if not cmp.search(code):
                continue
            if lab.search(cmp.sub("", code)):
                bad.append(f"  {n}:{i}  {head[:88]}")
    if not bad:
        return None
    return (
        f"{len(bad)} place(s) under page/ turn a verdict into a word:\n" + "\n".join(bad) +
        "\n  core/verdict.js owns those words: vWord(verdict, turned) returns the word "
        "and\n  vKey() the class the colour is chosen by. A second copy is how one finding "
        "came\n  to read REGION, TURNS and PARTIAL on one step."
    )


# Any identifier, except after a dot and except an object key. Wider than USE
# on purpose: see the note in unimported().
REACH = re.compile(r"(?<![.\w$'\"])([A-Za-z_$][\w$]*)(?!\s*:)(?![\w$])")
KEYWORDS = set("""await break case catch class const continue debugger default delete do else
enum export extends false finally for function if implements import in instanceof interface
let new null package private protected public return static super switch this throw true try
typeof var void while with yield async of from as get set undefined NaN Infinity arguments
constructor prototype length name value key type id""".split())


SCENSCHEMA = ART / "schema" / "scenario.schema.json"
PROVKIND = re.compile(r'provTake\(\s*"([a-z]+)"')


def exchange_kinds(scripts: list[tuple[str, str]]) -> str | None:
    """Every exchange the page records is a kind the scenario schema names.

    A scenario carries each accepted answer with the prompt that asked for it,
    and `what` says which prompt. The schema lists those kinds as an enum, and
    the list had seven of them while the page recorded eleven -- so a scenario
    that used the join or the similarity prompt was written by the workbench and
    then rejected by its own format, which is the third of the defects the
    specification's section 5.3 recorded. Every prompt added since would have
    made it worse.

    The kinds come from two places and both are read: a control's `data-ai`
    attribute, which 08-ask.js passes straight through, and the handful of calls
    that name their own. A kind in the schema and not in the page is fine -- a
    prompt can be retired -- so only the other direction fails.
    """
    if not SCENSCHEMA.is_file():
        return None
    try:
        doc = json.loads(SCENSCHEMA.read_text(encoding="utf-8"))
        # provenance is an array of $defs/accepted, so the enum is one hop away
        enum = set(doc["$defs"]["accepted"]["properties"]["what"]["enum"])
    except Exception as exc:  # noqa: BLE001 - the message is the point
        return f"{SCENSCHEMA.name}: cannot read the exchange kinds: {exc}"
    used: set[str] = set()
    for _, src in scripts:
        used |= set(re.findall(r'data-ai="([a-z]+)"', src))
        used |= set(PROVKIND.findall(src))
    missing = sorted(used - enum)
    if not missing:
        return None
    return (
        f"{len(missing)} exchange kind(s) the page records and the scenario schema does "
        f"not name:\n  " + ", ".join(missing) +
        f"\n  Add them to properties.provenance.items.properties.what.enum in "
        f"{SCENSCHEMA.name}.\n  Otherwise a scenario this workbench wrote is refused by "
        "its own format."
    )


GREYED = re.compile(r'aria-disabled="true"')


NPROMPT = re.compile(r"^  ([a-z][a-zA-Z]*): *(?:\(|function|[a-z]+ *=>)", re.M)
SAYSN = re.compile(r"(\b[A-Z][a-z]+|\b\d+)\s+(?:controls|places)\s+<i>offer</i>\s+one")
WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
         "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
         "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
         "nineteen": 19, "twenty": 20}


def ask_count(scripts: list[tuple[str, str]]) -> str | None:
    """The page's own copy says how many places offer a model. It has to be right.

    Three numbers were in circulation and all three were defensible, which is
    why nobody noticed they disagreed: the proposal said twelve points, the
    specification fifteen prompts, and this file counted seventeen controls.
    They measure three things -- a point on the chain can send several prompts
    (`passGo` sends three), a prompt can be reached from two controls, and one
    control hands its brief to a command through the bridge rather than to the
    host's model at all.

    None of that is a defect. Writing a number on the page that nothing counts
    is, because the page said twelve while seventeen controls carried the mark,
    and a reader who counts is the reader this bench is built for.

    So the page states the number this file already computes, and this refuses
    a page whose copy and whose controls disagree. The prompt registry is
    counted too and printed, because it is the other number the documentation
    quotes and it should come from the same place.
    """
    ask = next((src for n, src in scripts if n.endswith("08-ask.js")), "")
    i = ask.find("const AIQ = {")
    prompts = len(NPROMPT.findall(ask[i:ask.find("\n};", i)])) if i >= 0 else 0
    n = sum(len(ASKS.findall(src)) for _, src in scripts)
    said = [m for _, src in scripts for m in SAYSN.finditer(src)]
    if not said:
        return ("no page copy says how many controls offer a model. One sentence on the "
                "start page\n  should, and this check keeps it true; see modelSetupHTML().")
    bad = []
    for m in said:
        got = WORDS.get(m.group(1).lower(), None)
        if got is None:
            try:
                got = int(m.group(1))
            except ValueError:
                got = -1
        if got != n:
            bad.append(f"  the page says {m.group(1)!r} where {n} control(s) carry the mark")
    if bad:
        return ("the page's own count of where a model can be asked is wrong:\n" +
                "\n".join(bad) +
                "\n  Three numbers are in play and they are not the same thing: "
                f"{prompts} prompts in AIQ,\n  {n} controls carrying the mark, and the "
                "points on the chain a reader would group\n  them into. The page states "
                "the control count, because that is the one this file counts.")
    return None


# Every selector a stop names, whoever presses it. `at:` covers a mark inside
# `look`, the control handed to the reader in `yours` or `next`, and each item
# of a `cycle`; `does`, `unless`, `end` and the strings in an `undo` list are
# bare and need naming here or they would go unchecked.
TOURAT = re.compile(
    r"""\b(?:at|does|unless|end):\s*(?:"([^"]+)"|'([^']+)')""")
# `undo:["a", "b"]` is a list of bare selectors with no key on each one, so it
# is read as a whole and then split.
TOURUNDO = re.compile(r"""\bundo:\s*\[([^\]]*)\]""")
TOURSTR = re.compile(r""""([^"]+)"|'([^']+)'""")
# One per stop, which is what the count should say: a stop marks several
# areas now, so counting selectors would report four times the walk.
TOURSAY = re.compile(r"""\bsay:\s*["']""")
SELPART = re.compile(r'#([A-Za-z][\w-]*)|\.([A-Za-z][\w-]*)|\[([\w-]+)(?:=([^\]]+))?\]')


def tour_anchors(scripts: list[tuple[str, str]]) -> str | None:
    """Every stop in a guided tour points at something the page draws.

    A tour circles one real control and says what it is for. A stop whose
    selector matches nothing leaves the reader looking at a dimmed page with a
    caption about a button that is not there, which is worse than no tour --
    and nothing else would catch it, because the selector is a string and the
    page walk does not run the tours.

    So each `at:` is taken apart and every id, class and attribute in it has
    to appear somewhere in the page's own source. That is weaker than asking
    whether it draws at that moment, which only a browser can answer, and it
    is enough for the failure that actually happens: a control is renamed and
    the tour still names the old one.
    """
    pool = "\n".join(src for _, src in scripts) + "\n" + PAGE.read_text(encoding="utf-8")
    bad: list[str] = []
    for n, src in scripts:
        if not n.endswith("30-tour.js"):
            continue
        sels: list[str] = []
        for m in TOURAT.finditer(src):
            sels.append(m.group(1) or m.group(2))
        for m in TOURUNDO.finditer(src):
            for q in TOURSTR.finditer(m.group(1)):
                sels.append(q.group(1) or q.group(2))
        for whole in sels:
            for sel in whole.split(","):
                sel = sel.strip()
                parts = SELPART.findall(sel)
                if not parts:
                    bad.append(f"  {sel!r} is not a selector this check can read")
                    continue
                for ident, cls, attr, val in parts:
                    if ident and f'id="{ident}"' not in pool:
                        bad.append(f"  {sel!r} names #{ident}, which no page file draws")
                    if cls and f'"{cls}' not in pool and f" {cls}" not in pool:
                        bad.append(f"  {sel!r} names .{cls}, which no page file draws")
                    if attr and attr not in pool:
                        bad.append(f"  {sel!r} names [{attr}], which no page file draws")
    if not bad:
        return None
    return ("a guided tour points at something the page does not draw:\n" +
            "\n".join(sorted(set(bad))) +
            "\n  page/30-tour.js holds the stops. Rename the stop or restore the control.")


def greyed_marked(scripts: list[tuple[str, str]]) -> str | None:
    """Every control that is greyed says so on itself, in one word.

    The bench's own rule, written beside the chip's styles: "These controls are
    the shape of the method rather than the method, and a reader finding that
    out by pressing one is worse than a word that tells them first."

    It was followed by six controls out of fourteen. The other eight were faint
    grey with the explanation reachable only by hovering -- which is invisible
    on a touch screen and invisible to anybody who does not hover over a thing
    that looks disabled. And the six used two words for one state.

    What is checked is only that a greyed control carries the chip. WHICH word
    is on it is the author's: `not built` and `needs a key` are different facts
    and a reader should be told which one applies.
    """
    bad: list[str] = []
    for n, src in scripts:
        for m in GREYED.finditer(src):
            end = src.find("</button>", m.end())
            start = src.rfind("<button", 0, m.start())
            if end < 0 or start < 0:
                continue          # not a button: a select option, say
            if 'class="pil"' not in src[start:end]:
                line = src.count("\n", 0, m.start()) + 1
                bad.append(f"  {n}:{line}")
    if not bad:
        return None
    return (
        f"{len(bad)} greyed control(s) do not say so on themselves:\n" + "\n".join(bad) +
        '\n  <span class="pil">not built</span> after the label. A reader who finds out '
        "by pressing one\n  is worse off than one told first, and a hover does not reach a "
        "touch screen."
    )


def unimported(scripts: list[tuple[str, str]]) -> str | None:
    """Every name a module uses, it declares, imports, or gets from the host.

    THIS IS THE CHECK THE CONVERSION NEEDED AND I TOOK AWAY. The classic page
    was checked by "every name is declared somewhere", pooling declarations
    across all 38 files -- which for modules is meaningless, so it went. But
    its module form is not meaningless at all, it is stricter, and dropping it
    cost two real bugs in one afternoon:

      core/invariants.js used afin, amono and apeak after they moved to
      core/curve.js, with no import. checkArith was broken outright, and
      neither the page walk nor the hostile scenario noticed, because nothing
      either of them does calls it.

      page/12-claims.js called inPicked(), which is a function-LOCAL inside
      13-map.js. It never resolved, on a module page or a classic one, so the
      branch threw whenever the group tool was live and a card was drawn. The
      pooled check could not see it by construction: it counted declarations
      at every nesting level, so "declared somewhere" was true.

    The second is the point. Per module, a name has to be reachable from HERE,
    and a thing declared inside somebody else's function is not.
    """
    NAMED = re.compile(r'(?:^|;)\s*import\s*\{([^}]*)\}\s*from', re.M)
    BARE = re.compile(r'(?:^|;)\s*import\s+([A-Za-z_$][\w$]*)\s+from', re.M)
    # `import * as K from "..."` binds K. The scanner knew the other two forms
    # and not this one, so the first module to use it was reported as reaching
    # for a name nobody declares.
    STAR = re.compile(r'(?:^|;)\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from', re.M)
    bad: list[str] = []
    for name, src in scripts:
        body = code_only(src)
        have = decls_of(body) | set(HOSTED)
        for m in NAMED.finditer(src):
            for piece in m.group(1).split(","):
                n = piece.strip().split(" as ")[-1].strip()
                if n:
                    have.add(n)
        for m in BARE.finditer(src):
            have.add(m.group(1))
        for m in STAR.finditer(src):
            have.add(m.group(1))
        # A WIDER PATTERN THAN USE, which only matches a name followed by one
        # of ( [ . = , ; ) ] } -- so a name read in an arithmetic or a
        # comparison hides from it. `b[0] - ATOL ||` is one, and ATOL was
        # missing its import.
        for n in sorted({m.group(1) for m in REACH.finditer(body)} - have - KEYWORDS):
            bad.append(f"  {name} uses {n}, and neither declares nor imports it")
    if not bad:
        return None
    return (
        f"{len(bad)} name(s) a module cannot reach:\n" + "\n".join(bad) + "\n"
        "  A module sees only what it imports. If the name is another module's, "
        "import it; if it is nested inside a function over there, it was never "
        "reachable and the call has to be rewritten."
    )


def resolves(scripts: list[tuple[str, str]]) -> str | None:
    """Every name a module imports is exported by the file it comes from.

    This replaces the shared-scope passes. A classic page resolved a global
    when the line RAN, so a missing name parsed and then threw on render, and
    the checks for it were "every name is declared somewhere" and "nothing is
    declared twice". Neither question means anything now: a module sees only
    what it imports, two modules may each declare the same name, and a missing
    import is a load-time error rather than a render-time one. What matters
    instead is that each import resolves.
    """
    have: dict[str, set[str]] = {}
    EXPORT = re.compile(r"^export\s*\{([^}]*)\}", re.M)
    for n, src in scripts:
        names: set[str] = set()
        for m in EXPORT.finditer(src):
            for piece in m.group(1).split(","):
                piece = piece.strip().split(" as ")[-1].strip()
                if piece:
                    names.add(piece)
        for m in re.finditer(r"^export\s+(?:async\s+)?(?:function\s+\*?|const\s+|let\s+|var\s+|class\s+)([A-Za-z_$][\w$]*)", src, re.M):
            names.add(m.group(1))
        have[n] = names
    # as with IMPORT: not anchored, because the imports share a line
    NAMED = re.compile(r'(?:^|;)\s*import\s*\{([^}]*)\}\s*from\s*["\']([^"\']+)["\']', re.M)
    bad: list[str] = []
    for n, src in scripts:
        for m in NAMED.finditer(src):
            p = m.group(2)
            if not p.startswith("."):
                continue
            dep = resolve_dep(n, p)
            if dep not in have:
                bad.append(f"  {n} imports from {dep}, which the page does not load")
                continue
            for piece in m.group(1).split(","):
                want = piece.strip().split(" as ")[0].strip()
                if want and want not in have[dep]:
                    bad.append(f"  {n} imports {want} from {dep}, which does not export it")
    if not bad:
        return None
    return (f"{len(bad)} import(s) that do not resolve:\n" + "\n".join(bad) +
            "\n  A module sees only what it imports, so this is a load-time "
            "error rather than something that waits for a render.")


def undeclared(scripts: list[tuple[str, str]]) -> str | None:
    """Names the page uses that nothing anywhere declares."""
    code = [(name, code_only(src)) for name, src in scripts]
    decl: set[str] = set()
    for _, b in code:
        decl |= decls_of(b)

    missing: dict[str, str] = {}
    for name, b in code:
        for m in USE.finditer(b):
            n = m.group(1)
            if n in decl or n in HOSTED:
                continue
            missing.setdefault(n, name)
    if not missing:
        return None
    rows = "\n".join(f"  {n}  -- used in {w}" for n, w in sorted(missing.items()))
    return (
        f"{len(missing)} name(s) the page uses and nothing declares:\n{rows}\n"
        "  A classic script resolves a global when the line RUNS, so this "
        "parses and then throws on render."
    )


def main() -> None:
    if not PAGE.is_file():
        sys.exit(f"no page at {PAGE}")
    scripts = sources(PAGE)
    if not scripts:
        sys.exit(f"{PAGE.name}: no scripts found -- has the page changed shape?")

    bad: list[str] = []

    # Each on its own, in the semantics the browser gives it: a classic script.
    for name, src in scripts:
        why = parses(src, ".mjs")   # each one is a module now
        if why:
            bad.append(f"{name} does not parse:\n  " + why.replace("\n", "\n  "))

    # THE SHARED-SCOPE PASSES ARE GONE, because the scope is gone. The page is
    # ES modules: a name declared in one file is not visible in another, two
    # files may each declare the same name without clashing, and a name
    # nothing provides is a load-time error rather than something that waits
    # for a render. So "nothing is declared twice" and "every name is declared
    # somewhere" have been replaced by one question that does mean something
    # for modules -- does every import resolve -- in resolves() below.
    joined = "\n".join(MARK % n + "\n" + s for n, s in scripts)

    drift = recorded(joined)
    if drift:
        bad.append(drift)

    stale = stores(scripts)
    if stale:
        bad.append(stale)

    breach = layers(scripts)
    if breach:
        bad.append(breach)

    unresolved = resolves(scripts)
    if unresolved:
        bad.append(unresolved)

    unreachable = unimported(scripts)
    if unreachable:
        bad.append(unreachable)

    dead = dead_wiring(scripts)
    if dead:
        bad.append(dead)

    reworded = verdict_words(scripts)
    if reworded:
        bad.append(reworded)

    unmarked = ai_marked(scripts)
    if unmarked:
        bad.append(unmarked)

    unsaid = greyed_marked(scripts)
    if unsaid:
        bad.append(unsaid)

    unnamed = exchange_kinds(scripts)
    if unnamed:
        bad.append(unnamed)

    miscount = ask_count(scripts)
    if miscount:
        bad.append(miscount)

    lost = tour_anchors(scripts)
    if lost:
        bad.append(lost)

    if bad:
        print("\n\n".join(bad), file=sys.stderr)
        sys.exit(f"{PAGE.name} would not run: {len(bad)} failure(s)")

    tail = f"; RECORDED matches {PASSES.name}" if PASSES.is_file() else ""
    print(f"{PAGE.name}: {len(scripts)} modules parse{tail}")
    kept = set().union(*lskeys(scripts)[:2])
    print(f"{PAGE.name}: {len(kept)} browser stores, each written and read through the helper")
    print(f"{PAGE.name}: every import resolves, every name is reachable, "
          f"every control it wires exists")
    ncore = sum(1 for n, _ in scripts if n.startswith(CORE))
    print(f"{PAGE.name}: {ncore} file(s) under {CORE} import nothing from outside it")
    print(f"{PAGE.name}: no file under page/ turns a verdict into a word of its own")
    nask = sum(len(ASKS.findall(src)) for _, src in scripts)
    print(f"{PAGE.name}: {nask} control(s) can call a model, each carrying the mark")
    ngrey = sum(len(GREYED.findall(src)) for _, src in scripts)
    print(f"{PAGE.name}: {ngrey} control(s) are greyed, each saying so on itself")
    print(f"{PAGE.name}: every exchange it records is a kind the scenario schema names")
    ask = next((src for n, src in scripts if n.endswith("08-ask.js")), "")
    i = ask.find("const AIQ = {")
    nprompt = len(NPROMPT.findall(ask[i:ask.find(chr(10) + "};", i)])) if i >= 0 else 0
    print(f"{PAGE.name}: {sum(len(ASKS.findall(src)) for _, src in scripts)} control(s) "
          f"offer a model over {nprompt} prompt(s), and the page says so in its own words")
    ntour = sum(len(TOURSAY.findall(src)) for n, src in scripts if n.endswith("30-tour.js"))
    nmark = sum(len(TOURAT.findall(src)) for n, src in scripts if n.endswith("30-tour.js"))
    if ntour:
        print(f"{PAGE.name}: {ntour} guided-tour stop(s) over {nmark} anchor(s), each "
              f"pointing at a control "
              f"this page draws")


if __name__ == "__main__":
    main()

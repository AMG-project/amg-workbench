#!/usr/bin/env python3
"""What converting the bench's page scripts to ES modules would take, measured.

The page is one shared global scope across the scripts bench.html loads: a
name declared in one file is visible in every other without an import. A
module has none of that. It sees only what it imports, it cannot assign a
binding it imported, and the files run in the order of the import graph
rather than the order of the script tags. This measures each of those on the
page as it stands, so the conversion can be planned from a list rather than
discovered one thrown error at a time.

Per file:

    imports     the names it reads that another file declares, and from where
    load-time   what its top-level statements read from other files while the
                page loads -- the reads that throw when the other module has
                not run yet
    writes      names declared in another file that it assigns, which an import
                forbids
    typeof      guards against a name not existing yet; on an import that has
                not run yet they throw instead of answering

For the page: the cycles in the import graph, the order a module page would
evaluate in, and the load-time reads that order breaks.

--emit DIR writes two COPIES of docs/bench into DIR, never into the
repository: classic/ as it is, and modules/ converted mechanically -- every
local script imports what it reads and exports its top-level names, and every
script tag becomes a module. scripts/module_trial.mjs loads both in headless
Chrome and reports what each throws. `make modules-trial` runs the two.
Neither is part of `make check`: the converted copy is expected to fail until
the conversion work is done, and how it fails is the measurement.

The scanner is check_bench.py's with one change, that it keeps the layout so
every finding carries its line. Before reporting anything, the two are
compared on every file, and this refuses to run if they disagree about which
names the code contains.

--check is the same tracer turned on the page as it is: it fails when
something run while the page loads reads a name only a later script declares,
which is the failure commit 451c7c5 found three times in a day and no other
check could see. A `typeof` guard on the later file counts as handled.

Run:  python3 scripts/module_map.py [--json | --check | --emit DIR]
"""

from __future__ import annotations

import argparse
import bisect
import importlib.util
import json
import os
import re
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
ART = HERE.parent
BENCH = ART / "docs" / "bench"
PAGE = BENCH / "bench.html"
PROBE_FILE = ART / "tests" / "pagewalk.mjs"

_spec = importlib.util.spec_from_file_location("cb", HERE / "check_bench.py")
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

LOAD, MAYBE, LATER = 0, 1, 2
MODE = {LOAD: "load", MAYBE: "maybe", LATER: "later"}

CONTROL = {"if", "for", "while", "switch", "catch", "with"}
KEYWORDS = {
    "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in",
    "instanceof", "let", "new", "return", "super", "switch", "this", "throw", "try", "typeof",
    "var", "void", "while", "with", "yield", "async", "await", "of", "static", "get", "set",
    "null", "true", "false", "undefined", "NaN", "Infinity", "arguments",
}
# A function handed to one of these runs before the call returns.
SYNC_CALLEES = {
    "forEach", "map", "filter", "reduce", "reduceRight", "some", "every", "find",
    "findIndex", "findLast", "findLastIndex", "flatMap", "sort", "from", "replace",
    "replaceAll", "Promise",
}
# ...and to these, after the page has loaded, so not while modules evaluate.
LATER_CALLEES = {
    "then", "catch", "finally", "addEventListener", "removeEventListener", "setTimeout",
    "setInterval", "requestAnimationFrame", "queueMicrotask", "onSnapshot", "on",
}
ASSIGN = {"=", "+=", "-=", "*=", "/=", "%=", "**=", "<<=", ">>=", ">>>=", "&=", "|=", "^=",
          "&&=", "||=", "??="}
# After one of these, a newline cannot end the statement...
CONT_PREV = ASSIGN | {
    "(", "[", "{", ",", ".", "?.", "?", ":", "=>", "+", "-", "*", "/", "%", "**", "&&", "||",
    "??", "!", "~", "<", ">", "<=", ">=", "==", "===", "!=", "!==", "&", "|", "^", "<<", ">>",
    ">>>", "...", "typeof", "new", "delete", "void", "in", "instanceof", "of", "await", "case",
}
# ...and before one of these it does not either.
CONT_NEXT = ASSIGN | {
    ".", "?.", "(", "[", "?", ":", ",", ")", "]", "}", "=>", "+", "-", "*", "/", "%", "**",
    "&&", "||", "??", "<", ">", "<=", ">=", "==", "===", "!=", "!==", "&", "|", "^", "<<", ">>",
    ">>>", "in", "instanceof", "of",
}

TOKEN = re.compile(
    r"(?P<id>[A-Za-z_$][\w$]*)"
    r"|(?P<num>\d[\w.]*|\.\d\w*)"
    r"|(?P<p>>>>=|\.\.\.|===|!==|\*\*=|<<=|>>=|>>>|&&=|\|\|=|\?\?=|=>|==|!=|<=|>=|&&|\|\||\?\?"
    r"|\?\.(?!\d)|\+\+|--|\+=|-=|\*=|/=|%=|&=|\|=|\^=|\*\*|<<|>>|[{}()\[\];,.<>+\-*/%&|^!~?:=@#])"
)
NAME = re.compile(r"[A-Za-z_$][\w$]*")


# --------------------------------------------------------------- the scanner


def blank(src: str) -> str:
    """check_bench.code_only, keeping the layout.

    The same states and the same regex rule. What it removes becomes spaces
    with newlines kept, so a position here is the same position in the source.
    A string or a regex leaves `0` where it began, so it still reads as a
    value. A template leaves `0` for its text and turns each ${ } into ( ),
    so `a${b}c` reads as the expression `0( b)`: one value, with the code
    inside it visible."""
    out = list(src)
    n = len(src)

    def wipe(a: int, b: int) -> None:
        for k in range(a, min(b, n)):
            if out[k] != "\n":
                out[k] = " "

    def before(i: int) -> tuple[str, str]:
        """The last character of code before i, and the word it ends, if any."""
        k = i - 1
        while k >= 0 and out[k] in " \t\r\n":
            k -= 1
        if k < 0:
            return "", ""
        j = k
        while j >= 0 and (out[j].isalnum() or out[j] in "_$"):
            j -= 1
        return out[k], "".join(out[j + 1 : k + 1])

    i = 0
    tmpl: list[int] = []
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if not tmpl or tmpl[-1] >= 0:
            if c == "/" and nxt == "/":
                j = src.find("\n", i)
                j = n if j < 0 else j
                wipe(i, j)
                i = j
                continue
            if c == "/" and nxt == "*":
                j = src.find("*/", i + 2)
                j = n if j < 0 else j + 2
                wipe(i, j)
                i = j
                continue
            if c in "\"'":
                j = i + 1
                while j < n and src[j] != c:
                    j += 2 if src[j] == "\\" else 1
                j += 1
                wipe(i, j)
                out[i] = "0"
                i = j
                continue
            if c == "/":
                last, word = before(i)
                if not last or last in "(,=:[!&|?{};+-*%~^<>" or word in {
                    "return", "typeof", "case", "in", "of", "new", "delete", "void", "throw",
                    "do", "else", "yield", "await",
                }:
                    j = i + 1
                    while j < n and src[j] != "/":
                        if src[j] == "\\":
                            j += 1
                        elif src[j] == "[":
                            while j < n and src[j] != "]":
                                j += 2 if src[j] == "\\" else 1
                        j += 1
                    j += 1
                    while j < n and src[j] in "gimsuyd":
                        j += 1
                    wipe(i, j)
                    out[i] = "0"
                    i = j
                    continue
            if c == "`":
                tmpl.append(-1)
                out[i] = "0"
                i += 1
                continue
            if tmpl and tmpl[-1] >= 0:
                if c == "{":
                    tmpl[-1] += 1
                elif c == "}":
                    tmpl[-1] -= 1
                    if tmpl[-1] == 0:
                        tmpl[-1] = -1
                        out[i] = ")"
                        i += 1
                        continue
            i += 1
            continue
        # template text
        if c == "\\":
            wipe(i, i + 2)
            i += 2
            continue
        if c == "`":
            tmpl.pop()
            out[i] = " "
            i += 1
            continue
        if c == "$" and nxt == "{":
            tmpl[-1] = 1
            out[i], out[i + 1] = "(", " "
            i += 2
            continue
        if out[i] != "\n":
            out[i] = " "
        i += 1
    return "".join(out)


def agrees(name: str, src: str) -> str | None:
    """None if this scanner and check_bench's see the same names in src."""
    a, b = NAME.findall(blank(src)), NAME.findall(cb.code_only(src))
    if a == b:
        return None
    k = next((k for k, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
    return f"{name}: the scanners part at name {k}: {a[k : k + 4]} here, {b[k : k + 4]} there"


# ---------------------------------------------------------------- one script


@dataclass
class Item:
    kind: str  # function | class | decl | stmt
    names: list[str]
    start: int
    end: int
    line: int
    text: str


@dataclass
class Read:
    name: str
    line: int
    mode: int
    item: int
    guard: bool  # the operand of a typeof
    guarded: bool = False  # inside code that a typeof on this name guards
    runs_in: int = -1  # the function whose call runs it; -1 is the top level
    maybe: bool = False  # inside a callback that may run then, or later
    call: bool = False  # the name is called right here
    local: bool = False  # a name declared inside a function here, not a file's
    guards: tuple[str, ...] = ()  # names whose typeof guards this read


@dataclass
class Script:
    name: str  # as bench.html loads it: page/03-stores.js, kernel.js, or bench.html:401 (inline)
    src: str
    path: Path | None
    toks: list[tuple[str, str, int]] = field(default_factory=list)
    lines: list[int] = field(default_factory=list)
    items: list[Item] = field(default_factory=list)
    top: dict[str, str] = field(default_factory=dict)  # name -> function | class | const | let | var
    reads: list[Read] = field(default_factory=list)
    writes: list[tuple[str, int]] = field(default_factory=list)
    strict: bool = False
    runs: dict[int, list[Read]] = field(default_factory=dict)  # function -> what its call runs
    named: dict[str, list[int]] = field(default_factory=dict)  # name -> functions bound to it
    top_fn: dict[str, int] = field(default_factory=dict)  # top-level name -> its function

    def line(self, i: int) -> int:
        return bisect.bisect_right(self.lines, self.toks[i][2]) + 1

    def t(self, i: int) -> str:
        return self.toks[i][1] if 0 <= i < len(self.toks) else ""


def analyse(s: Script) -> None:
    code = blank(s.src)
    s.lines = [m.start() for m in re.finditer("\n", code)]
    s.toks = [
        ("id" if m.lastgroup == "id" else m.lastgroup, m.group(), m.start())
        for m in TOKEN.finditer(code)
    ]
    head = s.src.lstrip()
    while head.startswith("/*"):
        head = head[head.find("*/") + 2 :].lstrip()
    s.strict = head.startswith(('"use strict"', "'use strict'"))
    T, N = s.t, len(s.toks)

    match: dict[int, int] = {}
    parent = [-1] * N
    stack: list[int] = []
    pairs = {")": "(", "]": "[", "}": "{"}
    for i, (_, t, _) in enumerate(s.toks):
        parent[i] = stack[-1] if stack else -1
        if t in "([{":
            stack.append(i)
        elif t in pairs:
            if not stack or T(stack[-1]) != pairs[t]:
                sys.exit(f"{s.name}:{s.line(i)}: unbalanced {t!r}; the scanner lost its place")
            o = stack.pop()
            match[o], match[i] = i, o
            parent[i] = stack[-1] if stack else -1
    if stack:
        sys.exit(f"{s.name}:{s.line(stack[-1])}: {T(stack[-1])!r} never closes")

    def newline(a: int, b: int) -> bool:
        return "\n" in code[s.toks[a][2] : s.toks[b][2]]

    def ends(a: int, b: int) -> bool:
        """Does a newline between tokens a and b end the statement?"""
        if not newline(a, b) or T(a) in CONT_PREV:
            return False
        return T(b) not in CONT_NEXT

    def end_expr(k: int) -> int:
        """The first token after the expression that starts at k."""
        j = k
        while j < N:
            t = T(j)
            if t in "([{":
                j = match[j] + 1
                if j < N and ends(j - 1, j):
                    return j
                continue
            if t in (")", "]", "}", ",", ";"):
                return j
            if j + 1 < N and ends(j, j + 1):
                return j + 1
            j += 1
        return N

    # --- declarations: every token that binds a name rather than reading one
    binds: set[int] = set()
    init_of: dict[int, str] = {}  # first token of an initializer -> the name it is bound to

    def decl_list(k: int) -> tuple[int, list[int]]:
        """Mark the bindings of the const/let/var at k: its last token, and them."""
        own: list[int] = []
        j = k + 1
        while j < N:
            if s.toks[j][0] == "id":
                own.append(j)
                j += 1
            elif T(j) in ("{", "["):
                own += [
                    x for x in range(j + 1, match[j])
                    if s.toks[x][0] == "id" and T(x + 1) != ":" and T(x - 1) not in (".", "?.")
                ]
                j = match[j] + 1
            else:
                break
            if T(j) == "=":
                if s.toks[j - 1][0] == "id":
                    init_of[j + 1] = T(j - 1)
                j = end_expr(j + 1)
            if T(j) == ",":
                j += 1
                continue
            break
        binds.update(own)
        return (j if T(j) == ";" else j - 1), own

    for i in range(N):
        t = T(i)
        if t in ("const", "let", "var"):
            decl_list(i)
        elif t == "class" and i + 1 < N and s.toks[i + 1][0] == "id" and T(i + 1) != "extends":
            binds.add(i + 1)
        elif t == "catch" and T(i + 1) == "(":
            binds.update(x for x in range(i + 2, match[i + 1]) if s.toks[x][0] == "id")

    # --- functions: where each body is, and when it runs
    regions: list[tuple[int, int, int, str | None]] = []  # from, to, role, name
    methods: set[int] = set()
    class_body: set[int] = set()
    for i in range(N):
        if T(i) == "class":
            j = i + 1
            while j < N and T(j) != "{":
                j = match[j] + 1 if T(j) in "([" else j + 1
            if j < N:
                class_body.add(j)

    def role(start: int, end: int) -> int:
        """When a function expression running from start to end is called."""
        q = start - 1
        after = end + 1
        if T(after) == "(":
            return -1  # called on the spot
        e = parent[start]
        if e >= 0 and T(e) == "(":
            if q == e and T(after) == ")" and match.get(e) == after and T(after + 1) == "(":
                return -1  # (function(){ ... })()
            if T(q) in ("(", ","):
                callee = e - 1
                if s.toks[callee][0] == "id" and T(callee) not in KEYWORDS | {"function"}:
                    if T(callee) in LATER_CALLEES:
                        return LATER
                    return -1 if T(callee) in SYNC_CALLEES else MAYBE
                if T(callee) in (")", "]"):
                    return MAYBE
        return LATER

    for i in range(N):
        t = T(i)
        if t == "{" and i in class_body:
            regions.append((i, match[i], LATER, None))
            continue
        if t == "=>":
            if T(i - 1) == ")":
                pstart = match[i - 1]
                binds.update(x for x in range(pstart + 1, i - 1) if s.toks[x][0] == "id")
            else:
                pstart = i - 1
                binds.add(pstart)
            start = pstart - 1 if T(pstart - 1) == "async" else pstart
            if T(i + 1) == "{":
                end = match[i + 1]
            else:
                end = end_expr(i + 1) - 1
            regions.append((pstart, end, role(start, end), init_of.get(start)))
            continue
        if t != "{" or T(i - 1) != ")":
            continue
        o = match[i - 1]
        k = o - 1
        if T(k) in CONTROL:
            continue
        binds.update(x for x in range(o + 1, i - 1) if s.toks[x][0] == "id" and T(x + 1) != ":")
        if T(k) == "function":
            start = k
        elif s.toks[k][0] == "id" and T(k - 1) == "function":
            binds.add(k)
            start = k - 1
        elif s.toks[k][0] == "id" and T(k - 1) == "*" and T(k - 2) == "function":
            binds.add(k)
            start = k - 2
        else:  # name(...) { -- a method in an object or a class
            methods.add(k)
            regions.append((o, match[i], LATER, None))
            continue
        if T(start - 1) == "async":
            start -= 1
        top_level_decl = T(start) == "function" or T(start + 1) == "function"
        declared = top_level_decl and T(start - 1) in ("", ";", "}", "{") and parent[start] < 0
        nested_decl = top_level_decl and T(start - 1) in (";", "}", "{") and parent[start] >= 0
        name = T(k) if T(k) != "function" else None
        if declared or nested_decl:
            regions.append((o, match[i], LATER, name))
        else:
            regions.append((o, match[i], role(start, match[i]), init_of.get(start, name)))

    regions.sort(key=lambda r: (r[0], -r[1]))
    mode = [LOAD] * N
    inner = [-1] * N  # innermost region of each token
    rmode: list[int] = []
    rparent: list[int] = []
    open_: list[int] = []
    ri = 0
    for i in range(N):
        while open_ and regions[open_[-1]][1] < i:
            open_.pop()
        while ri < len(regions) and regions[ri][0] == i:
            outer = rmode[open_[-1]] if open_ else LOAD
            r = regions[ri][2]
            rparent.append(open_[-1] if open_ else -1)
            rmode.append(outer if r == -1 else max(outer, r))
            open_.append(ri)
            ri += 1
        inner[i] = open_[-1] if open_ else -1
        mode[i] = rmode[inner[i]] if open_ else LOAD

    # The function whose CALL runs a region's code: itself, unless it is run on
    # the spot (an IIFE, a forEach callback) or maybe on the spot (a callback
    # to something this cannot classify), in which case its enclosing one.
    runs_in: list[int] = []
    maybe_in: list[bool] = []
    for r, (_, _, role_, name) in enumerate(regions):
        up = rparent[r]
        if role_ == LATER:
            runs_in.append(r)
            maybe_in.append(False)
        else:
            runs_in.append(runs_in[up] if up >= 0 else -1)
            maybe_in.append(role_ == MAYBE or (up >= 0 and role_ != LATER and maybe_in[up]))
        if name:
            s.named.setdefault(name, []).append(r)
            if up < 0:
                s.top_fn[name] = r

    rdecl: list[set[str]] = [set() for _ in regions]
    for b in binds:
        if inner[b] >= 0:
            rdecl[inner[b]].add(T(b))

    def local(i: int) -> bool:
        r = inner[i]
        while r >= 0:
            if T(i) in rdecl[r]:
                return True
            r = rparent[r]
        return False

    # --- the top level, statement by statement
    def stmt_end(i: int) -> int:
        first = T(i)
        j = i
        while j < N:
            t = T(j)
            if t in "([{":
                m = match[j]
                head = t == "(" and T(j - 1) in CONTROL
                block = t == "{" and (
                    T(j - 1) in (")", "else", "try", "finally", "do") or first == "{"
                )
                if block and first in ("if", "for", "while", "try", "switch", "do", "{"):
                    nxt = T(m + 1)
                    if nxt in ("else", "catch", "finally") or (first == "do" and nxt == "while"):
                        j = m + 1
                        continue
                    if first != "do":
                        return m
                if not head and m + 1 < N and ends(m, m + 1):
                    return m
                j = m + 1
                continue
            if t == ";":
                return j
            if t == "else":
                j += 1
                continue
            if j + 1 < N and ends(j, j + 1):
                return j
            j += 1
        return N - 1

    i = 0
    while i < N:
        t = T(i)
        if t == "function" or (t == "async" and T(i + 1) == "function"):
            k = i + 1 if t == "function" else i + 2
            k += 1 if T(k) == "*" else 0
            body = match[k + 1] + 1
            kind, names, end = "function", [T(k)], match[body]
        elif t == "class":
            j = i + 1
            while T(j) != "{":
                j += 1
            kind, names, end = "class", [T(i + 1)], match[j]
        elif t in ("const", "let", "var"):
            end, own = decl_list(i)
            kind, names = "decl", [T(b) for b in own]
        else:
            kind, names, end = "stmt", [], stmt_end(i)
            if not any(s.toks[x][0] == "id" for x in range(i, end + 1)):
                i = end + 1  # a directive, or an empty statement
                continue
        line = s.line(i)
        text = s.src.splitlines()[line - 1].strip() if s.src else ""
        s.items.append(Item(kind, names, i, end, line, text[:90]))
        for n in names:
            s.top[n] = kind if kind != "decl" else t
        i = end + 1

    # `if (typeof X !== "undefined") { ... X ... }` and `typeof X === "function"
    # && X()`: the reads of X that a typeof guards. On a classic page that is a
    # correct guard against a later script; on a module page the typeof itself
    # throws when X is an import that has not run yet.
    failing = [False] * N  # inside a catch body: runs only when something threw
    for c in range(N):
        if T(c) == "catch":
            b = match[c + 1] + 1 if T(c + 1) == "(" else c + 1
            if T(b) == "{":
                for x in range(b, match[b] + 1):
                    failing[x] = True
    spans: list[tuple[int, int, str]] = []
    for g in range(N - 1):
        if T(g) != "typeof" or s.toks[g + 1][0] != "id":
            continue
        e = parent[g]
        while e >= 0 and T(e) == "(" and T(e - 1) != "if":
            e = parent[e]
        if e >= 0 and T(e) == "(" and T(e - 1) == "if":
            close = match[e]
            end = match[close + 1] if T(close + 1) == "{" else end_expr(close + 1)
        else:
            end = end_expr(g) - 1
        spans.append((g, end, T(g + 1)))

    item_of = [0] * N
    for k, it in enumerate(s.items):
        for x in range(it.start, it.end + 1):
            item_of[x] = k

    for i, (kind, t, _) in enumerate(s.toks):
        if kind != "id" or t in KEYWORDS or i in binds or i in methods:
            continue
        if T(i - 1) in (".", "?."):
            continue
        if T(i + 1) == ":" and T(i - 1) in ("{", ",") and T(parent[i]) == "{":
            continue
        r = inner[i]
        where = runs_in[r] if r >= 0 else -1
        maybe = (maybe_in[r] if r >= 0 else False) or failing[i]
        guards = tuple(n for a, b, n in spans if a < i <= b and not (a + 1 == i))
        if local(i):
            if T(i + 1) == "(" and t in s.named:
                s.runs.setdefault(where, []).append(
                    Read(t, s.line(i), mode[i], item_of[i], False, runs_in=where,
                         maybe=maybe, call=True, local=True, guards=guards)
                )
            continue
        if T(i + 1) in ASSIGN or T(i + 1) in ("++", "--") or (
            T(i - 1) in ("++", "--") and s.toks[i - 2][0] != "id" and T(i - 2) not in (")", "]")
        ):
            s.writes.append((t, s.line(i)))
        rd = Read(t, s.line(i), mode[i], item_of[i], T(i - 1) == "typeof",
                  runs_in=where, maybe=maybe, call=T(i + 1) == "(", guards=guards)
        s.reads.append(rd)
        s.runs.setdefault(where, []).append(rd)


def load(page: Path) -> list[Script]:
    out = []
    for name, src in cb.sources(page):
        why = agrees(name, src)
        if why:
            sys.exit("module_map: " + why)
        path = None if "(inline)" in name else page.parent / name
        s = Script(name, src, path)
        analyse(s)
        out.append(s)
    return out


# ------------------------------------------------------------------ the page


def tarjan(nodes: list[str], deps: dict[str, list[str]]) -> list[list[str]]:
    index: dict[str, int] = {}
    low: dict[str, int] = {}
    on: set[str] = set()
    st: list[str] = []
    out: list[list[str]] = []

    def go(v: str) -> None:
        index[v] = low[v] = len(index)
        st.append(v)
        on.add(v)
        for w in deps[v]:
            if w not in index:
                go(w)
                low[v] = min(low[v], low[w])
            elif w in on:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = st.pop()
                on.discard(w)
                comp.append(w)
                if w == v:
                    break
            out.append(sorted(comp, key=nodes.index))

    for v in nodes:
        if v not in index:
            go(v)
    return out


def measure(scripts: list[Script]) -> dict:
    order = [s.name for s in scripts]
    pos = {n: k for k, n in enumerate(order)}
    owner: dict[str, str] = {}
    kind: dict[str, str] = {}
    clash = []
    for s in scripts:
        for n, k in s.top.items():
            if n in owner:
                clash.append(f"{n}: {owner[n]} and {s.name}")
            owner[n], kind[n] = s.name, k

    files = {}
    deps: dict[str, list[str]] = {}
    for s in scripts:
        imp: dict[str, set[str]] = {}
        for r in s.reads:
            o = owner.get(r.name)
            if o and o != s.name and r.name not in s.top:
                imp.setdefault(o, set()).add(r.name)
        deps[s.name] = sorted(imp, key=pos.get)
        loadtime = []
        for k, it in enumerate(s.items):
            got = sorted(
                {
                    (r.name, owner[r.name], kind[r.name], r.mode, r.guard)
                    for r in s.reads
                    if r.item == k and r.mode < LATER and r.name in owner
                    and owner[r.name] != s.name and r.name not in s.top
                }
            )
            if got or it.kind == "stmt":
                loadtime.append({
                    "line": it.line, "kind": it.kind, "text": it.text,
                    "reads": [
                        {"name": n, "from": o, "is": kd, "when": MODE[m], "typeof": g}
                        for n, o, kd, m, g in got
                    ],
                })
        writes = sorted(
            {(n, ln, owner[n]) for n, ln in s.writes if n in owner and owner[n] != s.name
             and n not in s.top}
        )
        files[s.name] = {
            "declares": len(s.top),
            "strict": s.strict,
            "imports": {o: sorted(ns) for o, ns in sorted(imp.items(), key=lambda x: pos[x[0]])},
            "loadtime": loadtime,
            "writes": [{"name": n, "line": ln, "declared_in": o} for n, ln, o in writes],
        }
    for s in scripts:
        used = set()
        for f in files.values():
            used.update(f["imports"].get(s.name, []))
        files[s.name]["exported_used"] = sorted(used)

    # The order a module page evaluates in: each tag in turn, depth first
    # through its imports, a module already started being skipped.
    evaluated: list[str] = []
    seen: set[str] = set()

    def visit(m: str) -> None:
        if m in seen:
            return
        seen.add(m)
        for d in deps[m]:
            visit(d)
        evaluated.append(m)

    for m in order:
        visit(m)
    epos = {m: k for k, m in enumerate(evaluated)}

    # What each script's evaluation runs: its top level, and -- followed through
    # every call made on the way, into other files too -- the bodies of the
    # functions it calls. A read the tracer reaches is a read made while that
    # script is evaluating, whichever file it is written in.
    by = {s.name: s for s in scripts}

    def trace(start: Script) -> list[dict]:
        out = []
        seen: set[tuple[str, int]] = set()
        todo: list[tuple[Script, int, tuple[str, ...], bool, frozenset[str]]] = [
            (start, -1, (), False, frozenset())
        ]
        while todo:
            f, r, chain, maybe, safe = todo.pop()
            if (f.name, r) in seen:
                continue
            seen.add((f.name, r))
            for rd in f.runs.get(r, []):
                mb = maybe or rd.maybe
                # `typeof X` asks whether X's FILE has run, so it guards all of it
                ok = safe | {owner[g] for g in rd.guards if g in owner}
                step = chain + (f"{rd.name}() @ {f.name}:{rd.line}",)
                if rd.local:
                    for rr in f.named.get(rd.name, []):
                        todo.append((f, rr, step, mb, ok))
                    continue
                o = f.name if rd.name in f.top else owner.get(rd.name)
                if o is None:
                    continue
                out.append({"name": rd.name, "from": o, "is": kind[rd.name], "maybe": mb,
                            "typeof": rd.guard, "guarded": o in ok,
                            "at": f"{f.name}:{rd.line}", "via": chain})
                if rd.call and o in by and rd.name in by[o].top_fn and o not in ok:
                    todo.append((by[o], by[o].top_fn[rd.name], step, mb, ok))
        return out

    breaks = []
    classic = []
    for s in scripts:
        hit: set[tuple[str, str, str]] = set()
        for x in trace(s):
            o = x["from"]
            if o == s.name or (x["at"], x["name"], o) in hit:
                continue
            hit.add((x["at"], x["name"], o))
            when = "maybe" if x["maybe"] else "load"
            if pos[o] > pos[s.name] and not x["typeof"] and not x["guarded"]:
                classic.append({"while": s.name, **x, "when": when})
            if epos[o] > epos[s.name] and x["is"] != "function" and not x["guarded"]:
                breaks.append({"while": s.name, **x, "when": when})
    probe = PROBE_FILE.read_text(encoding="utf-8") if PROBE_FILE.is_file() else ""
    got = re.search(r"const PROBE = String\.raw`\s*<script>(.*?)</script>`;", probe, re.S)
    walk_reads: list[str] = []
    if got:
        w = Script("tests/pagewalk.mjs (probe)", got.group(1), None)
        analyse(w)
        walk_reads = sorted({r.name for r in w.reads if r.name in owner})

    return {
        "page": str(PAGE.relative_to(ART)),
        "scripts": order,
        "clashes": clash,
        "files": files,
        "cycles": [c for c in tarjan(order, deps) if len(c) > 1],
        "module_order": evaluated,
        "module_breaks": breaks,
        "classic_breaks": classic,
        "walk_reads": walk_reads,
    }


# ------------------------------------------------------------------- report


def report(m: dict) -> str:
    F = m["files"]
    L = [f"# What a conversion to ES modules takes — `{m['page']}`", ""]
    L.append(
        "Generated by `scripts/module_map.py`; regenerate rather than edit. "
        "Reads marked *maybe* sit inside a function handed to a call this tool cannot "
        "classify, so they may or may not run while the page loads."
    )
    L.append("")
    nimp = sum(len(ns) for f in F.values() for ns in f["imports"].values())
    nstmt = sum(1 for f in F.values() for it in f["loadtime"] if it["kind"] == "stmt")
    nwr = sum(len(f["writes"]) for f in F.values())
    ntype = sum(
        1 for f in F.values() for it in f["loadtime"] for r in it["reads"] if r["typeof"]
    )
    L += [
        "## The page",
        "",
        f"- {len(m['scripts'])} scripts, {sum(f['declares'] for f in F.values())} top-level names",
        f"- {nimp} imports a module page would need",
        f"- {nstmt} top-level statements that run while the page loads",
        f"- {nwr} assignments to a name another file declares",
        f"- {ntype} `typeof` guards on another file's name, evaluated while loading",
        f"- not strict today: {', '.join(n for n, f in F.items() if not f['strict']) or 'none'}",
        f"- cycles in the import graph: "
        + ("; ".join(f"{len(c)} files ({c[0]} … {c[-1]})" for c in m["cycles"]) or "none"),
        f"- names declared twice: {', '.join(m['clashes']) or 'none'}",
        f"- load-time reads that break the CLASSIC page today: {len(m['classic_breaks'])}",
        "",
    ]
    for c in m["classic_breaks"]:
        L.append(f"  - while {c['while']}: `{c['name']}` at {c['at']} ({c['when']})")
    br = m["module_breaks"]
    L += [
        "## If every tag became a module today",
        "",
        "Evaluation order, depth first through the imports: "
        + " → ".join(f"`{x.split('/')[-1]}`" for x in m["module_order"]),
        "",
        f"{sum(1 for b in br if b['when'] == 'load')} reads, made while a module is "
        "evaluating, of a binding whose module has not run yet: each throws. "
        f"{sum(1 for b in br if b['when'] == 'maybe')} more sit in a callback this cannot "
        "classify. A read reached through a call says which call, so the fix can go where "
        "the call is. Functions are hoisted, so calling one early is not on this list; what "
        "its body reads is.",
        "",
        "| while evaluating | reads | declared in | first at | through | reads like it | when |",
        "|---|---|---|---|---|---|---|",
    ]
    rows: dict[tuple, list[dict]] = {}
    for b in br:
        hop = b["via"][0] if b["via"] else "top level"
        rows.setdefault((b["when"], b["while"], hop, b["from"]), []).append(b)
    for (when, w, hop, frm), bs in sorted(rows.items()):
        names = sorted({("typeof " if b["typeof"] else "") + b["name"] for b in bs})
        L.append(
            f"| {w.split('/')[-1]} | `{'`, `'.join(names[:4])}`{' …' if len(names) > 4 else ''} | "
            f"{frm.split('/')[-1]} | {bs[0]['at']} | {hop} | {len(bs)} | {when} |"
        )
    L += [
        "",
        "## What the page walk reads directly",
        "",
        "The walk's probe (`tests/pagewalk.mjs`) is a classic script that calls these page "
        "names. On a module page none of them is global, so the page has to hand them to "
        "the walk, for example as one test hook object:",
        "",
        ", ".join(f"`{n}`" for n in m["walk_reads"]),
        "",
        "## Per file",
        "",
    ]
    for name in m["scripts"]:
        f = F[name]
        L.append(f"### `{name}`")
        L.append("")
        L.append(
            f"{f['declares']} top-level names, {len(f['exported_used'])} used elsewhere; "
            f"{'strict' if f['strict'] else '**not strict**'}."
        )
        if f["imports"]:
            L.append("")
            L.append("Imports:")
            for o, ns in f["imports"].items():
                L.append(f"- from `{o}` ({len(ns)}): {', '.join(ns)}")
        lt = [it for it in f["loadtime"] if it["reads"] or it["kind"] == "stmt"]
        if lt:
            L.append("")
            L.append("Runs while loading:")
            for it in lt:
                rs = ", ".join(
                    f"{'typeof ' if r['typeof'] else ''}{r['name']}"
                    f"{' (maybe)' if r['when'] == 'maybe' else ''} ← {r['from'].split('/')[-1]}"
                    for r in it["reads"]
                )
                L.append(f"- line {it['line']} ({it['kind']}): `{it['text'][:70]}`"
                         + (f" — reads {rs}" if rs else ""))
        if f["writes"]:
            L.append("")
            L.append("Assigns another file's name (an import cannot be assigned):")
            for w in f["writes"]:
                L.append(f"- line {w['line']}: `{w['name']}` ← {w['declared_in']}")
        L.append("")
    return "\n".join(L)


# --------------------------------------------------------------------- emit


def emit(scripts: list[Script], m: dict, out: Path) -> None:
    out = out.resolve()
    repo = ART.parent
    if out == repo or repo in out.parents:
        sys.exit("module_map: --emit writes a copy, and refuses to write inside the repository")
    ignore = shutil.ignore_patterns("* 2", "* 2.*", "* 3", "* 3.*", "__pagewalk.html", ".DS_Store")
    for sub in ("classic", "modules"):
        dst = out / sub / "bench"
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(BENCH, dst, ignore=ignore)
    root = out / "modules" / "bench"

    def imports(name: str, frm: Path) -> str:
        lines = []
        for o, ns in m["files"][name]["imports"].items():
            rel = os.path.relpath(BENCH / o, frm).replace(os.sep, "/")
            rel = rel if rel.startswith(".") else "./" + rel
            lines.append(f"import {{ {', '.join(ns)} }} from \"{rel}\";")
        return " ".join(lines)

    html = PAGE.read_text(encoding="utf-8")
    for s in scripts:
        if s.path is None:
            continue
        rel = s.path.relative_to(BENCH)
        body = imports(s.name, s.path.parent)
        names = sorted(s.top)
        text = (body + " " if body else "") + s.src  # line numbers stay the source's
        if names:
            text += f"\nexport {{ {', '.join(names)} }};\n"
        (root / rel).write_text(text, encoding="utf-8")
        html = html.replace(f'<script src="{s.name}">', f'<script type="module" src="{s.name}">')
    for s in scripts:
        if s.path is None:
            body = imports(s.name, BENCH)
            html = html.replace(f"<script>{s.src}</script>",
                                f"<script type=\"module\">\n{body}\n{s.src}</script>")
    (root / "bench.html").write_text(html, encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--json", action="store_true", help="the measurement as JSON")
    ap.add_argument("--emit", metavar="DIR", help="write classic/ and modules/ copies into DIR")
    ap.add_argument("--check", action="store_true",
                    help="fail if a load-time read reaches a script that loads later")
    a = ap.parse_args()
    scripts = load(PAGE)
    m = measure(scripts)
    if a.check:
        bad = [c for c in m["classic_breaks"] if c["when"] == "load"]
        for c in bad:
            via = " → ".join(c["via"]) or "top level"
            print(f"while {c['while']} loads: {c['name']} at {c['at']} is declared in "
                  f"{c['from']}, which loads later (through {via})")
        if bad:
            sys.exit(1)
        print(f"{PAGE.name}: nothing run while loading reads a script that loads later")
        return
    if a.emit:
        emit(scripts, m, Path(a.emit))
        print(f"module_map: wrote {a.emit}/classic/bench and {a.emit}/modules/bench")
        return
    print(json.dumps(m, indent=1) if a.json else report(m))


if __name__ == "__main__":
    main()

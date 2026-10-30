#!/usr/bin/env python3
"""What each of the bench's page scripts declares, and what it borrows.

The page is one shared global scope across twenty files, so "module" means
only "file" and nothing enforces a boundary. Cross dependencies are easy to
accumulate and hard to see. This measures them rather than guessing: for each
file, the names it declares, and for every other file, how many of those it
uses. The result is a directed graph, and the things worth seeing in it are
the hubs, the cycles, and the names declared in one file that only another
file uses.

Reuses the scanner from check_bench.py, which is the part that had to be
right for the undeclared-name check and is just as necessary here: a regex
over source that is nine tenths HTML-in-template-literals measures nothing.

Run: python3 scripts/page_deps.py [--cycles] [--misplaced]
"""

import importlib.util
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("cb", HERE / "check_bench.py")
cb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cb)

PAGE = HERE.parent / "docs" / "bench" / "bench.html"


def declared(code: str) -> set[str]:
    """What this file offers the SHARED scope: declarations at brace depth 0.

    Column position is not depth. 00-worked-example.js wraps its whole body in
    stxInit() precisely so that the N, L, S and build it declares are NOT
    globals -- and its body is written flush left, so a `^const` pattern reads
    every one of them as a global and reports fifteen files borrowing from it.
    A measurement tool that lies about the thing it measures is worse than no
    tool, so this counts braces."""
    out: set[str] = set()
    depth = 0
    for line in code.split("\n"):
        stripped = line.lstrip()
        if depth == 0:
            m = re.match(r"(?:const|let|var|function\s*\*?|class)\s+([A-Za-z_$][\w$]*)", stripped)
            if m:
                out.add(m.group(1))
            m2 = re.match(r"(?:const|let|var)\s+(.*)$", stripped)
            if m2 and "=" in m2.group(1):
                cb._decl_names(m2.group(1).rstrip(";"), out)
        depth += line.count("{") - line.count("}")
        depth += line.count("(") - line.count(")")
        depth += line.count("[") - line.count("]")
        depth = max(0, depth)
    return {n for n in out if n and re.fullmatch(r"[A-Za-z_$][\w$]*", n)}


def main() -> None:
    scripts = [(n, s) for n, s in cb.sources(PAGE) if n.startswith("page/")]
    code = {n: cb.code_only(s) for n, s in scripts}
    owns = {n: declared(c) for n, c in code.items()}
    owner = {}
    for n, names in owns.items():
        for nm in names:
            owner.setdefault(nm, n)

    uses: dict[str, dict[str, set[str]]] = {}
    for n, c in code.items():
        here = {}
        for m in cb.USE.finditer(c):
            nm = m.group(1)
            src = owner.get(nm)
            if src and src != n:
                here.setdefault(src, set()).add(nm)
        uses[n] = here

    print("file                       declares  borrows from  borrowed by")
    print("-" * 72)
    borrowed = {n: 0 for n in owns}
    for n, d in uses.items():
        for src in d:
            borrowed[src] += 1
    for n in sorted(owns):
        short = n.replace("page/", "")
        print(f"{short:<26} {len(owns[n]):>8} {len(uses[n]):>13} {borrowed[n]:>12}")

    print("\nthe hubs -- names borrowed by the most files:")
    pull: dict[str, set[str]] = {}
    for n, d in uses.items():
        for src, names in d.items():
            for nm in names:
                pull.setdefault(nm, set()).add(n)
    for nm, who in sorted(pull.items(), key=lambda kv: -len(kv[1]))[:14]:
        home = owner[nm].replace("page/", "")
        print(f"  {nm:<18} {len(who):>2} files   (declared in {home})")

    if "--cycles" in sys.argv:
        print("\nmutual dependencies -- two files that each borrow from the other:")
        seen = set()
        for a, d in uses.items():
            for b in d:
                if a in uses.get(b, {}) and (b, a) not in seen:
                    seen.add((a, b))
                    sa, sb = a.replace("page/", ""), b.replace("page/", "")
                    print(f"  {sa:<22} <-> {sb:<22}  ({len(d[b])} <- -> {len(uses[b][a])} names)")
        print(f"  {len(seen)} mutual pairs")

    if "--misplaced" in sys.argv:
        print("\ndeclared in one file and used only by one OTHER file:")
        for nm, home in sorted(owner.items()):
            who = pull.get(nm, set())
            if len(who) == 1:
                there = next(iter(who))
                pat = r"(?<![.\w$])" + re.escape(nm) + r"\b"
                used_at_home = len(re.findall(pat, code[home])) > 1
                if not used_at_home:
                    sh, st = home.replace("page/", ""), there.replace("page/", "")
                    print(f"  {nm:<20} {sh} -> {st}")


if __name__ == "__main__":
    main()

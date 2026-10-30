/* core: handing a finding to a tool the modeller already runs.

   A proposition proved on this bench is an expression, a direction and a box,
   and the reader who has to be convinced by it works in LaTeX, SymPy or
   Mathematica. So each of those gets the finding in its own dialect: two
   renderings of the expression tree beside the kernel's own, and three scripts
   that carry what was proved, the box it was proved over, and -- the part that
   makes them honest -- what the bench did NOT do, so nobody mistakes a
   re-derivation for a confirmation.

   Export is one-way and safe. Nothing here evaluates anything or calls out: it
   builds text from a tree. Adding a fourth dialect means adding one function
   here and nothing anywhere else, which is the reason it is a file.

   core/ RULE: nothing in this file may use a name declared outside core/.
   scripts/check_bench.py fails the build if one does. */
import { PREC, negOf, treeText } from "./kernel.js";

function treeSym(n, p, D){
  p = p || 0;
  if(!n || n.t === "nd") return "None";
  if(n.t === "n") return String(+(+n.v).toFixed(10));
  if(n.t === "v") return n.v;
  if(n.t === "u") return "(-" + treeSym(n.a, 3, D) + ")";
  if(n.t === "f"){
    const f = D.fn[n.v] || n.v;
    return f + D.ob + treeSym(n.a, 0, D) + (n.b ? ", " + treeSym(n.b, 0, D) : "") + D.cb;
  }
  if(n.t === "o" && n.v === "+" && negOf(n.b)){
    const q0 = PREC["+"];
    const s0 = treeSym(n.a, q0, D) + " - " + treeSym(negOf(n.b), q0 + 1, D);
    return q0 < p ? "(" + s0 + ")" : s0;
  }
  const q = PREC[n.v], op = n.v === "**" ? D.pow : n.v;
  const s = n.v === "**"
    ? treeSym(n.a, q + 1, D) + op + treeSym(n.b, q, D)
    : treeSym(n.a, q, D) + " " + op + " " + treeSym(n.b, q + 1, D);
  return q < p ? "(" + s + ")" : s;
}

const DSYM = {pow:"**", ob:"(", cb:")",
  fn:{exp:"sp.exp", log:"sp.log", min:"sp.Min", max:"sp.Max"}};

// Mathematica calls with square brackets, and a round one would be a product
const DWOL = {pow:"^", ob:"[", cb:"]",
  fn:{exp:"Exp", log:"Log", min:"Min", max:"Max"}};

const bufLab = l => !l ? "?"
  : l.cmd === "inline" ? l.y
  : (l.y && l.x) ? "∂" + l.y + " / ∂" + l.x
  : l.cmd === "write" ? "a line of yours"
  : l.cmd === "import" ? "from your tool"
  : l.cmd === "comb" ? "a combination" + (l.x ? " in " + l.x : "")
  : l.id;

function treeTex(n, p){
  p = p || 0;
  if(!n) return "?";
  if(n.t === "nd") return "\\text{undefined}";
  if(n.t === "n") return String(+(+n.v).toFixed(6));
  if(n.t === "v") return "\\mathit{" + String(n.v).replace(/_/g, "\\_") + "}";
  if(n.t === "u") return "-" + treeTex(n.a, 3);
  if(n.t === "f"){
    if(n.v === "exp") return "e^{" + treeTex(n.a, 0) + "}";
    if(n.v === "log") return "\\ln\\!\\left(" + treeTex(n.a, 0) + "\\right)";
    return "\\" + n.v + "\\!\\left(" + treeTex(n.a, 0) + ", " + treeTex(n.b, 0) + "\\right)";
  }
  if(n.v === "/") return "\\frac{" + treeTex(n.a, 0) + "}{" + treeTex(n.b, 0) + "}";
  if(n.v === "**") return treeTex(n.a, 5) + "^{" + treeTex(n.b, 0) + "}";
  const q = PREC[n.v];
  if(n.v === "+" && negOf(n.b)){
    const s2 = treeTex(n.a, q) + " - " + treeTex(negOf(n.b), q + 1);
    return q < p ? "\\left(" + s2 + "\\right)" : s2;
  }
  const s = treeTex(n.a, q) + (n.v === "*" ? " \\cdot " : " " + n.v + " ") + treeTex(n.b, q + 1);
  return q < p ? "\\left(" + s + "\\right)" : s;
}

function exportSympy(P){
  const nm = [...new Set(P.names)];
  // sp.symbols takes a space-separated string and returns a tuple, so the
  // left of the assignment needs commas. Running the export is how that got
  // found: it reads fine and does not parse.
  const names = nm.join(" "), lhs = nm.join(", ");
  const L = [];
  L.push(`"""Derived by the AMG Workbench on ${new Date().toISOString().slice(0, 10)}.`);
  L.push(``);
  L.push(`Everything below was produced from the declarations on the bench and is`);
  L.push(`conditional on them. The arithmetic was proposed and kept because it survived`);
  L.push(`the checks there, not derived from any theory, so what follows has the form`);
  L.push(`"given these declarations, this follows".`);
  L.push(``);
  L.push(`Run it and SymPy will redo the differentiation and print it, then try for`);
  L.push(`stationary points. Paste a result back into the bench and it is parsed`);
  L.push(`against the same grammar and checked by interval over the box before it`);
  L.push(`counts as anything.`);
  L.push(``);
  L.push(`One warning, found by running this rather than by reading it: sp.solve does`);
  L.push(`not time out and does not report that there is no closed form. On a`);
  L.push(`transcendental model -- nested logistics, a CES exponent -- it simply does`);
  L.push(`not return. The derivative is the part worth having, so it is printed and`);
  L.push(`flushed first and the solve is given a wall clock.`);
  L.push(`"""`);
  L.push(`import signal`);
  L.push(``);
  L.push(`import sympy as sp`);
  L.push(``);
  L.push(`${lhs} = sp.symbols("${names}", real=True)`);
  L.push(``);
  L.push(`BOX = {`);
  for(const [k, b] of Object.entries(P.box)) L.push(`    "${k}": (${b[0]}, ${b[1]}),`);
  L.push(`}`);
  L.push(``);
  /* A declared interval of width zero is a constant, and leaving it as a free
     symbol asks SymPy to solve a harder problem than the curator posed -- it
     doubled the printed derivative here, 794 characters against 444. */
  const pin = Object.entries(P.box).filter(([, b]) => +b[0] === +b[1]);
  L.push(`# Declared as an interval of width zero, so a constant and not an unknown.`);
  L.push(`PINNED = {${pin.map(([k, b]) => `${k}: ${b[0]}`).join(", ")}}`);
  L.push(``);
  L.push(`SOLVE_SECONDS = 20`);
  L.push(``);
  L.push(``);
  L.push(`class Slow(Exception):`);
  L.push(`    pass`);
  L.push(``);
  L.push(``);
  L.push(`def ring(signum, frame):`);
  L.push(`    raise Slow()`);
  L.push(``);
  L.push(``);
  L.push(`def stationary(d, x):`);
  L.push(`    """Stationary points, or an honest word about why there are none to be had."""`);
  L.push(`    try:`);
  L.push(`        signal.signal(signal.SIGALRM, ring)`);
  L.push(`    except (AttributeError, ValueError):`);
  L.push(`        # SIGALRM is POSIX. Skipping beats hanging.`);
  L.push(`        print("  solve skipped: no alarm on this platform", flush=True)`);
  L.push(`        return`);
  L.push(`    signal.alarm(SOLVE_SECONDS)`);
  L.push(`    try:`);
  L.push(`        print("  stationary points:", sp.solve(sp.Eq(d, 0), x), flush=True)`);
  L.push(`    except Slow:`);
  L.push(`        print(f"  no closed form: solve did not return in {SOLVE_SECONDS}s", flush=True)`);
  L.push(`    except Exception as e:  # noqa: BLE001 - the message is the point`);
  L.push(`        print("  no closed form:", e, flush=True)`);
  L.push(`    finally:`);
  L.push(`        signal.alarm(0)`);
  L.push(``);
  for(const pr of P.props){
    if(pr.err) continue;
    L.push(`# ${pr.y} as a function of ${pr.x}`);
    L.push(`f_${pr.y} = (${treeSym(pr.f, 0, DSYM)}).subs(PINNED)`);
    L.push(`d_${pr.y}_${pr.x} = sp.simplify(sp.diff(f_${pr.y}, ${pr.x}))`);
    L.push(`print("d ${pr.y} / d ${pr.x} =", d_${pr.y}_${pr.x}, flush=True)`);
    L.push(`# the bench got: ${treeText(pr.d1)}`);
    L.push(`# and proved its sign on ${(100 * pr.share).toFixed(1)}% of the declared box`);
    L.push(`stationary(d_${pr.y}_${pr.x}, ${pr.x})`);
    L.push(``);
  }
  return L.join("\n");
}
function exportWolfram(P){
  const L = ["(* Derived by the AMG Workbench on " +
    new Date().toISOString().slice(0, 10) + ".",
    "   Conditional on the declarations made on the bench. *)", ""];
  for(const [k, b] of Object.entries(P.box))
    L.push(`(* ${k} in [${b[0]}, ${b[1]}] *)`);
  L.push("");
  for(const pr of P.props){
    if(pr.err) continue;
    const dom = Object.entries(P.box)
      .map(([k, b]) => `${b[0]} <= ${k} <= ${b[1]}`).join(" && ");
    L.push(`f${pr.y} = ${treeSym(pr.f, 0, DWOL)};`);
    L.push(`d = Simplify[D[f${pr.y}, ${pr.x}]]`);
    L.push(`(* the bench got ${treeText(pr.d1)} *)`);
    L.push(`Reduce[d > 0 && ${dom}, ${pr.x}]`);
    L.push(`Solve[d == 0, ${pr.x}]`);
    L.push("");
  }
  return L.join("\n");
}
function exportPropTex(P){
  const L = ["% Derived by the AMG Workbench on " +
    new Date().toISOString().slice(0, 10) + ".",
    "% Conditional on the declarations made on the bench.", ""];
  /* THE BOX, WRITTEN OUT. Each proposition below says it holds "on the whole
     declared box" and this is the only place that says what the box is.
     Without it the strongest claim the bench makes -- that a conclusion
     carries the region of the declared space its sign was proved on --
     arrives in somebody's paper as an unqualified sign. The SymPy and
     Mathematica scripts printed the ranges all along; this one did not, which
     is the export that goes into the paper. */
  const bx = Object.entries(P.box || {});
  if(bx.length){
    L.push(`% The declared box. Every proposition below is conditional on it.`);
    L.push(`\\begin{align*}`);
    for(const [k, b] of bx)
      L.push(`  \\mathit{${k.replace(/_/g, "\\_")}} &\\in [${
        (+b[0]).toFixed(4)}, ${(+b[1]).toFixed(4)}]${
        +b[0] === +b[1] ? ` && \\text{(held at a point)}` : ``} \\\\`);
    L.push(`\\end{align*}`);
    L.push(``);
  }
  let i = 0;
  for(const pr of P.props){
    if(pr.err) continue;
    i++;
    L.push(`\\begin{proposition}`);
    L.push(`  $\\dfrac{\\partial \\mathit{${pr.y.replace(/_/g, "\\_")}}}{\\partial \\mathit{${
      pr.x.replace(/_/g, "\\_")}}} = ${treeTex(pr.d1)}$,`);
    if(pr.verdict === "flat"){
      L.push(`  which is identically zero on the declared box: ${
        pr.y.replace(/_/g, "\\_")} does not move with ${pr.x.replace(/_/g, "\\_")} at all.`);
    } else {
    L.push(`  which is ${pr.dir === 1 ? "positive" : pr.dir === -1 ? "negative" : "of mixed sign"}` +
      (pr.verdict === "proved"
        ? ` on the whole declared box.`
        : pr.verdict === "partial"
        ? ` on ${(100 * pr.share).toFixed(1)}\\% of the declared box` +
          (pr.flip ? `, with a sign change enclosed in $[${pr.flip[0].toFixed(4)}, ${
            pr.flip[1].toFixed(4)}]$.` : `.`)
        : ` though interval arithmetic did not decide it here.`));
    }
    if(pr.cs && pr.cs.length){
      L.push(`  At the stationary point, $\\partial ${pr.x.replace(/_/g, "\\_")}^{*} / \\partial ` +
        `\\mathit{${pr.cs[0].k.replace(/_/g, "\\_")}} = ${treeTex(pr.cs[0].e)}$` +
        (pr.cs[0].sign ? `, which is ${pr.cs[0].sign > 0 ? "positive" : "negative"} on the box.` : `.`));
    }
    L.push(`\\end{proposition}`);
    L.push(``);
  }
  if(!i) L.push("% nothing was derivable: see the bench for why");
  return L.join("\n");
}


export { DSYM, DWOL, bufLab, exportPropTex, exportSympy, exportWolfram, treeSym, treeTex };

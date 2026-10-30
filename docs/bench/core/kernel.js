/* The grammar, on its own, so something other than a browser can run it.

   This is the whole of what the bench will accept as arithmetic: eight
   operators, four functions, numbers, declared lowercase names and round
   brackets. Nothing is compiled and nothing is evaluated, so the page needs no
   `eval` -- which a published artifact may not have -- and a wrong expression
   is refused BY NAME rather than repaired.

   It lived inside bench.html, where the only automated check on it was that
   the file parsed. It is one file now, loaded by the page as a plain script
   and required by `tests/kernel.test.mjs` in Node, so there is one copy and it
   is tested. No DOM, no page state, no imports: that is what made it movable
   and it is what has to stay true.

   Generated from nothing: this file is the source. bench.html loads it. */
"use strict";
const ATOK = /\s*(?:(\d+(?:\.\d+)?)|([a-z][a-z0-9_]*)|(\*\*|[-+*/(),]))/g;
// "t_" plus a mechanism name, and mechNames() cuts those back to 54
const ANAME = /^[a-z][a-z0-9_]{0,71}$/;
const APREC = {"+":1, "-":1, "*":2, "/":2, "**":4};
const ANARY = {min:2, max:2, exp:1, log:1};
const ARIGHT = {"**":true};

function readExpr(src, scope){
  const s = String(src == null ? "" : src);
  if(!s.trim()) throw new Error("nothing on the right of the equals sign");
  if(s.length > 400) throw new Error("longer than 400 characters");
  const tk = []; let at = 0, m;
  ATOK.lastIndex = 0;
  while((m = ATOK.exec(s))){
    if(m.index !== at) break;
    at = ATOK.lastIndex;
    if(m[1] != null) tk.push({t:"n", v:+m[1]});
    else if(m[2] != null){
      if(ANARY[m[2]]) tk.push({t:"f", v:m[2], a:ANARY[m[2]]});
      else if(scope.has(m[2])) tk.push({t:"v", v:m[2]});
      else throw new Error('"' + m[2] + '" is not a declared name');
    }else tk.push({t:"o", v:m[3]});
  }
  if(s.slice(at).trim())
    throw new Error('cannot read "' + s.slice(at).trim().slice(0, 20) + '"');
  // infix to postfix, so that what is walked is a list and never a string
  const out = [], ops = [], uses = new Set();
  let prev = null;
  for(const x of tk){
    if(x.t === "n") out.push(x);
    else if(x.t === "v"){ out.push(x); uses.add(x.v); }
    else if(x.t === "f") ops.push(x);
    else if(x.v === "(") ops.push({t:"p"});
    else if(x.v === ","){
      while(ops.length && ops[ops.length - 1].t !== "p") out.push(ops.pop());
      if(!ops.length) throw new Error("a comma outside a call");
    }else if(x.v === ")"){
      while(ops.length && ops[ops.length - 1].t !== "p") out.push(ops.pop());
      if(!ops.length) throw new Error("unbalanced brackets");
      ops.pop();
      if(ops.length && ops[ops.length - 1].t === "f") out.push(ops.pop());
    }else{
      // a minus with nothing to its left is a sign and not a subtraction, and
      // it binds looser than ** so that -(x ** 2) is what -x ** 2 would mean
      // in Python -- the JavaScript spelling of which is a syntax error, which
      // is why the prompt asks for the brackets
      const un = (x.v === "-" || x.v === "+") &&
        (!prev || (prev.t === "o" && prev.v !== ")"));
      if(un) ops.push({t:"u", v:x.v, p:3});
      else{
        const px = APREC[x.v], rx = !!ARIGHT[x.v];
        while(ops.length){
          const top = ops[ops.length - 1];
          if(top.t === "p" || top.t === "f") break;
          const pt = top.t === "u" ? top.p : APREC[top.v];
          if(pt > px || (pt === px && !rx)) out.push(ops.pop()); else break;
        }
        ops.push(x);
      }
    }
    prev = x;
  }
  while(ops.length){
    const top = ops.pop();
    if(top.t === "p") throw new Error("unbalanced brackets");
    out.push(top);
  }
  // arity, by walking the depth the stack would reach
  let d = 0;
  for(const x of out){
    if(x.t === "n" || x.t === "v") d++;
    else if(x.t === "u"){ if(d < 1) throw new Error("a sign with nothing after it"); }
    else if(x.t === "f"){
      if(d < x.a) throw new Error(x.v + "() was given the wrong number of arguments");
      d -= x.a - 1;
    }else{
      if(d < 2) throw new Error("an operator with nothing to work on");
      d--;
    }
  }
  if(d !== 1) throw new Error("not a single expression");
  return {rpn:out, py:s.trim().replace(/\s+/g, " "), uses};
}

function evalRPN(rpn, S){
  const st = [];
  for(const x of rpn){
    if(x.t === "n") st.push(x.v);
    else if(x.t === "v"){ const v = S[x.v]; st.push(typeof v === "number" ? v : NaN); }
    else if(x.t === "u"){ const a = st.pop(); st.push(x.v === "-" ? -a : a); }
    else if(x.t === "f"){
      if(x.a === 2){ const b = st.pop(), a = st.pop();
        st.push(x.v === "min" ? Math.min(a, b) : Math.max(a, b)); }
      else{ const a = st.pop(); st.push(x.v === "exp" ? Math.exp(a) : Math.log(a)); }
    }else{
      const b = st.pop(), a = st.pop();
      st.push(x.v === "+" ? a + b : x.v === "-" ? a - b : x.v === "*" ? a * b
        : x.v === "/" ? a / b : Math.pow(a, b));
    }
  }
  return st.length === 1 ? st[0] : NaN;
}


/* ---------------------------------------------------------------------- */
/* THE TREE, THE CALCULUS, AND THE INTERVAL LAYER.

   Everything above reads an expression; everything below reasons about one.
   A tree is built, differentiated, simplified, and then enclosed: interval
   arithmetic evaluates it over a box and returns a range guaranteed to contain
   every value it takes there, so a range above zero means the sign is PROVED
   on that box rather than sampled at points of it.

   That is the bench's central claim and it had no test on it, which is why
   this is here. It is sound and INCOMPLETE on purpose: it never lies and it
   can shrug, because the dependency problem widens a bound wherever a name
   occurs twice. `undecided` is a verdict, not a bug.

   Still in the page, because they touch it: treeHTML and treeTex render, the
   SymPy/Mathematica/LaTeX exports write for other tools, inlineOutcome needs
   the model, and mmWhy writes prose about a crossing. */

const NUM = v => ({t:"n", v:+v});
const VAR = v => ({t:"v", v});
const OP  = (v, a, b) => ({t:"o", v, a, b});
const NEG = a => ({t:"u", v:"-", a});
const FN  = (v, a, b) => ({t:"f", v, a, b, n:b ? 2 : 1});
const ZERO = NUM(0), ONE = NUM(1);
const isN = (x, v) => x && x.t === "n" && (v === undefined || x.v === v);
/* The positive counterpart of a term that reads as negative, or null. Only
   for printing: a + (-b) and a - b are the same tree and one of them is
   English. */
function negOf(n){
  if(!n) return null;
  if(n.t === "u") return n.a;
  if(n.t === "n" && n.v < 0) return NUM(-n.v);
  if(n.t === "o" && (n.v === "*" || n.v === "/")){
    const a = negOf(n.a);
    if(a) return isN(a, 1) && n.v === "*" ? n.b : OP(n.v, a, n.b);
  }
  return null;
}

/* The postfix list the grammar walker builds, read back as a tree so it can
   be differentiated. Nothing new is admitted here: the tree can only hold
   what readExpr already let through. */
function rpnTree(rpn){
  const st = [];
  for(const x of rpn){
    if(x.t === "n") st.push(NUM(x.v));
    else if(x.t === "v") st.push(VAR(x.v));
    else if(x.t === "u"){ const a = st.pop(); st.push(x.v === "-" ? NEG(a) : a); }
    else if(x.t === "f"){
      if(x.a === 2){ const b = st.pop(), a = st.pop(); st.push(FN(x.v, a, b)); }
      else { const a = st.pop(); st.push(FN(x.v, a)); }
    }else{ const b = st.pop(), a = st.pop(); st.push(OP(x.v, a, b)); }
  }
  return st.length === 1 ? st[0] : null;
}
const keyOf = n => !n ? "?" : n.t === "n" ? "#" + n.v : n.t === "v" ? n.v
  : n.t === "u" ? "-(" + keyOf(n.a) + ")"
  : n.t === "f" ? n.v + "(" + keyOf(n.a) + (n.b ? "," + keyOf(n.b) : "") + ")"
  : "(" + keyOf(n.a) + n.v + keyOf(n.b) + ")";
const same = (a, b) => keyOf(a) === keyOf(b);
const hasVar = (n, x) => !n ? false : n.t === "v" ? n.v === x
  : n.t === "n" ? false : hasVar(n.a, x) || hasVar(n.b, x);
const sizeOf = n => !n ? 0 : 1 + sizeOf(n.a) + sizeOf(n.b);

/* ---- which branch of a min or max binds, on a box ---------------------

   min and max have corners, and a corner has no derivative. That is true
   only ON THE SET WHERE THE ARGUMENTS CROSS. Everywhere else max(a, b) IS a,
   or IS b, and differentiating whichever one binds is EXACT -- not a
   subgradient, not a smoothing, not an approximation of any kind.

   So the question "is this differentiable" is the wrong one. The right one is
   "does either argument dominate on the box", and interval arithmetic answers
   it with the machinery already here: enclose a - b over the box, and a sign
   that excludes zero settles which branch binds everywhere on it.

   Three outcomes, and all three are informative:

     resolved   one argument dominates over every declared value. The kink is
                outside the declared range, max disappears from the expression,
                and everything downstream runs as if it had never been there.
                That a substitute set has a determinate winner over the range
                the theory is about is a finding in itself.
     open       the arguments cross inside the box. The crossing is WHERE THE
                BINDING MECHANISM SWITCHES, which is the most theoretically
                loaded point in a substitutes model -- so it is a scope
                condition to be located, not an obstacle. Split the box there
                and each side differentiates exactly.
     nested     a min inside a max resolves bottom-up, because resolving the
                inner one narrows the enclosure of the outer one's arguments.

   This is why the answer to "max is not differentiable" is not to replace
   max. A softmax or a high-elasticity CES would make the page stop
   complaining by changing the model, and the complaint is the model. */
function mmResolve(n, box){
  const open = [], bound = [];
  const walk = node => {
    if(!node || node.t === "n" || node.t === "v" || node.t === "nd") return node;
    const a = walk(node.a), b = node.b ? walk(node.b) : node.b;
    if(node.t === "f" && (node.v === "min" || node.v === "max") && b){
      const d = simp(OP("+", a, NEG(b)));
      const iv = ivalTree(d, box);
      /* strictly, because an enclosure that touches zero does not exclude a
         crossing at the touching point, and a derivative claimed there would
         be the one thing this whole layer exists not to do */
      const first = node.v === "max" ? iv[0] > 0 : iv[1] < 0;
      const second = node.v === "max" ? iv[1] < 0 : iv[0] > 0;
      if(first || second){
        bound.push({fn:node.v, keep:first ? a : b, drop:first ? b : a, d});
        return first ? a : b;
      }
      open.push({fn:node.v, a, b, d, iv});
      return Object.assign({}, node, {a, b});
    }
    const c = Object.assign({}, node); c.a = a; if(node.b) c.b = b;
    return c;
  };
  const tree = walk(n);
  return {tree, open, bound, ok:!open.length};
}
/* What to tell somebody whose expression still has a corner in it. */
/* The declared names an expression actually moves with. */
function treeNames(n, box){
  return Object.keys(box).filter(v => hasVar(n, v));
}
/* Whether a crossing can be cut by one axis at all. Where both arguments move
   with names other than the one being cut, the set where they are equal is a
   surface rather than a point, and no single cut separates it. */
/* A NAME WITH NO WIDTH IS NOT A DIMENSION.

   The set where two sides of a min() are equal is a surface in as many
   dimensions as the two sides vary over, and that is what decides whether one
   cut can separate it. `treeNames` answers a different question -- which names
   of the box the expression mentions -- and the two came apart badly on the
   first real model with a ceiling in it: the crossing
   `chi_0 + chi_pi * pi + chi_alpha * alpha` against `ceil_shareholders`
   mentions six names, four of them declared constants and one a parameter the
   scholar had pinned to a point. Every one of those is a number. The crossing
   was a line in pi, and the page told the reader it was a surface and that
   splitting was right to refuse.

   A declared interval of width zero is a constant and not an unknown -- the
   SymPy export says so in its own comment -- and this is the same rule applied
   where it changes the advice. A name the box does not mention at all is left
   in, because a free symbol could be anything. */
const mmDims = (n, box) => treeNames(n, box || {})
  .filter(v => !box || !box[v] || +box[v][0] !== +box[v][1]);

function mmSpread(o, box, x){
  const ns = new Set(mmDims(o.a, box).concat(mmDims(o.b, box)));
  ns.delete(x);
  return [...ns];
}
function mmWhy(r, box){
  const o = r.open[0];
  const ns = [...new Set(mmDims(o.a, box || {}).concat(mmDims(o.b, box || {})))];
  const head = o.fn + "(" + treeText(o.a) + ", " + treeText(o.b) + ") is undecided on the " +
    "declared box: the two cross inside it, so there is no single branch to differentiate. " +
    "Their difference encloses in [" + o.iv[0].toPrecision(3) + ", " +
    o.iv[1].toPrecision(3) + "].";
  if(ns.length === 1)
    return head + " SPLIT it along " + ns[0] + ", which is the only name either side moves " +
      "with: the crossing is located by bisection and each side of it differentiates exactly.";
  if(ns.length > 1)
    return head + " The two sides move with " + ns.slice(0, 4).join(" and ") + ", so the set " +
      "where they are equal is a SURFACE and not a point. One cut cannot separate a surface, " +
      "and split is right to refuse. Two ways on. SUBSTITUTE all but one of those to a value " +
      "and split along what is left, which gives a result that holds at those values and says " +
      "so on the row. Or go back to step six and compose this outcome with CES rather than " +
      o.fn + ": CES has no corner in it at all, and for a substitute set driven by several " +
      "parameters it is the practical answer.";
  return head + " Neither side moves with a declared name, which should not be possible.";
}
/* ---- differentiation ------------------------------------------------- */
function dTree(n, x){
  if(!n) return ZERO;
  if(n.t === "n") return ZERO;
  if(n.t === "v") return n.v === x ? ONE : ZERO;
  if(n.t === "u") return NEG(dTree(n.a, x));
  if(n.t === "f"){
    if(n.v === "exp") return OP("*", FN("exp", n.a), dTree(n.a, x));
    if(n.v === "log") return OP("/", dTree(n.a, x), n.a);
    // min and max have corners, and a corner has no derivative. Saying so is
    // the honest result; a subgradient would be a guess about which side.
    return {t:"nd", why:n.v + "() is not differentiable where its arguments cross"};
  }
  const a = n.a, b = n.b, da = dTree(a, x), db = dTree(b, x);
  if(da.t === "nd") return da;
  if(db.t === "nd") return db;
  if(n.v === "+") return OP("+", da, db);
  if(n.v === "-") return OP("-", da, db);
  if(n.v === "*") return OP("+", OP("*", da, b), OP("*", a, db));
  if(n.v === "/") return OP("/", OP("-", OP("*", da, b), OP("*", a, db)), OP("**", b, NUM(2)));
  if(n.v === "**"){
    // the ordinary case: a constant exponent, which is every one the bench
    // has produced so far
    if(!hasVar(b, x)) return OP("*", OP("*", b, OP("**", a, OP("-", b, ONE))), da);
    return OP("*", OP("**", a, b),
      OP("+", OP("*", db, FN("log", a)), OP("/", OP("*", b, da), a)));
  }
  return ZERO;
}

/* ---- simplification -------------------------------------------------- */
/* Differentiation is the easy half. Without this the quotient rule returns
   ((k+x)*1 - x*1)/(k+x)**2 and nobody reads that; with it the same thing
   comes back as k/(k+x)**2, which is a sentence about diminishing returns. */
function flatSum(n, sign, out){
  if(!n) return;
  if(n.t === "o" && n.v === "+"){ flatSum(n.a, sign, out); flatSum(n.b, sign, out); return; }
  if(n.t === "o" && n.v === "-"){ flatSum(n.a, sign, out); flatSum(n.b, -sign, out); return; }
  if(n.t === "u"){ flatSum(n.a, -sign, out); return; }
  out.push({sign, n});
}
function flatProd(n, out){
  if(n && n.t === "o" && n.v === "*"){ flatProd(n.a, out); flatProd(n.b, out); return; }
  out.push(n);
}
// a term as a number times the rest of it, so that x and 3*x collect together
function splitCoef(n){
  const f = []; flatProd(n, f);
  let c = 1; const rest = [];
  for(const g of f){ if(isN(g)) c *= g.v; else rest.push(g); }
  if(!rest.length) return {c, n:null};
  let r = rest[0];
  for(let i = 1; i < rest.length; i++) r = OP("*", r, rest[i]);
  return {c, n:r};
}
/* Powers of the same thing above and below the line cancel. Only numeric
   exponents, and nothing is cancelled that could be zero -- x/x stays, since
   it is not 1 at the origin and this bench has been bitten once already by a
   default standing in for a declaration. */
function powParts(n, out, sign){
  const f = []; flatProd(n, f);
  for(const g of f){
    if(isN(g)){ out.k *= sign > 0 ? g.v : 1 / g.v; continue; }
    let base = g, e = 1;
    while(base.t === "o" && base.v === "**" && isN(base.b)){ e *= base.b.v; base = base.a; }
    const key = keyOf(base);
    const cur = out.m.get(key) || {base, e:0};
    cur.e += sign * e; out.m.set(key, cur);
  }
}
function cancel(a, b){
  const out = {k:1, m:new Map()};
  powParts(a, out, 1); powParts(b, out, -1);
  const up = [], dn = [];
  for(const {base, e} of out.m.values()){
    if(Math.abs(e) < 1e-12) continue;
    const t = Math.abs(e) === 1 ? base : OP("**", base, NUM(Math.abs(e)));
    (e > 0 ? up : dn).push(t);
  }
  const build = l => l.length ? l.reduce((x, y) => OP("*", x, y)) : null;
  let num = build(up), den = build(dn);
  const k = out.k;
  if(!num) num = NUM(k); else if(k !== 1) num = k === -1 ? NEG(num) : OP("*", NUM(k), num);
  return den ? OP("/", num, den) : num;
}
function simp1(n, lite){
  if(!n || n.t === "n" || n.t === "v" || n.t === "nd") return n;
  if(n.t === "u"){
    const a = simp1(n.a, lite);
    if(isN(a)) return NUM(-a.v);
    if(a.t === "u") return a.a;
    const pos = negOf(a);
    if(pos) return pos;
    return NEG(a);
  }
  if(n.t === "f"){
    const a = simp1(n.a, lite), b = n.b ? simp1(n.b, lite) : null;
    if(n.v === "exp" && isN(a, 0)) return ONE;
    if(n.v === "log" && isN(a, 1)) return ZERO;
    if(isN(a) && b && isN(b)) return NUM(n.v === "min" ? Math.min(a.v, b.v) : Math.max(a.v, b.v));
    if(isN(a) && !b) return NUM(n.v === "exp" ? Math.exp(a.v) : Math.log(a.v));
    return FN(n.v, a, b);
  }
  let a = simp1(n.a, lite), b = simp1(n.b, lite);
  const v = n.v;
  if(v === "*" || v === "+" || v === "-"){
    // one pass over the whole sum, so that (k+x) - x loses the x
    if(v === "+" || v === "-"){
      if(lite) return OP(v, a, b);   // reading, not running: leave the sum as written
      const terms = []; flatSum(OP(v, a, b), 1, terms);
      const by = new Map();
      let konst = 0;
      for(const t of terms){
        const sp = splitCoef(t.n);
        if(!sp.n){ konst += t.sign * sp.c; continue; }
        const k = keyOf(sp.n);
        const cur = by.get(k) || {c:0, n:sp.n};
        cur.c += t.sign * sp.c; by.set(k, cur);
      }
      const parts = [];
      for(const {c, n:nn} of by.values()){
        if(Math.abs(c) < 1e-14) continue;
        parts.push(c === 1 ? nn : c === -1 ? NEG(nn) : OP("*", NUM(c), nn));
      }
      if(Math.abs(konst) > 1e-14) parts.unshift(NUM(konst));
      parts.sort((x, y) => (x.t === "u" ? 1 : 0) - (y.t === "u" ? 1 : 0));
      if(!parts.length) return ZERO;
      let r = parts[0];
      for(let i = 1; i < parts.length; i++) r = OP("+", r, parts[i]);
      return r;
    }
    const f = []; flatProd(OP("*", a, b), f);
    let c = 1; const rest = [];
    for(const g of f){
      if(isN(g)){ c *= g.v; if(c === 0) return ZERO; }
      else rest.push(g);
    }
    if(!rest.length) return NUM(c);
    let r = rest[0];
    for(let i = 1; i < rest.length; i++) r = OP("*", r, rest[i]);
    return c === 1 ? r : c === -1 ? NEG(r) : OP("*", NUM(c), r);
  }
  if(v === "/"){
    if(isN(b, 1)) return a;
    if(isN(a, 0)) return ZERO;
    if(isN(a) && isN(b) && b.v !== 0) return NUM(a.v / b.v);
    // (X/Y) / (U/V) is (X*V) / (Y*U), and without this the implicit function
    // theorem returns a quotient of quotients nobody reads
    if(lite) return OP("/", a, b);
    if(a.t === "o" && a.v === "/") return simp1(OP("/", a.a, OP("*", a.b, b)));
    if(b.t === "o" && b.v === "/") return simp1(OP("/", OP("*", a, b.b), b.a));
    return cancel(a, b);
  }
  if(v === "**"){
    if(isN(b, 1)) return a;
    if(isN(b, 0)) return ONE;
    if(isN(a, 1)) return ONE;
    if(isN(a) && isN(b)) return NUM(Math.pow(a.v, b.v));
    return OP("**", a, b);
  }
  return OP(v, a, b);
}
/* How much simplification to keep. Full is what the arithmetic runs on; the
   lighter settings are for reading, because the unsimplified chain rule shows
   which term came from where and a fully collected one does not. Nothing
   below changes what is evaluated -- only what is shown. */
const SIMPL = [["raw", "the chain rule, verbatim"],
               ["light", "identities and constants folded, nothing collected"],
               ["full", "collected and cancelled"]];
function simp(n, lite){
  let cur = n, k = keyOf(n);
  for(let i = 0; i < 14; i++){
    cur = simp1(cur, lite);
    const k2 = keyOf(cur);
    if(k2 === k) break;
    k = k2;
  }
  return cur;
}

/* ---- printing -------------------------------------------------------- */
const PREC = {"+":1, "-":1, "*":2, "/":2, "**":4};
function treeText(n, p){
  p = p || 0;
  if(!n) return "?";
  if(n.t === "nd") return "undefined";
  if(n.t === "n") return String(+(+n.v).toFixed(6));
  if(n.t === "v") return n.v;
  if(n.t === "u") return (p > 3 ? "(" : "") + "-" + treeText(n.a, 3) + (p > 3 ? ")" : "");
  if(n.t === "f") return n.v + "(" + treeText(n.a, 0) + (n.b ? ", " + treeText(n.b, 0) : "") + ")";
  const q = PREC[n.v];
  // a + (-b) reads as a - b, and ** binds right so its left side is the one
  // that needs the brackets
  if(n.v === "+" && negOf(n.b)){
    const s2 = treeText(n.a, q) + " - " + treeText(negOf(n.b), q + 1);
    return q < p ? "(" + s2 + ")" : s2;
  }
  const s = n.v === "**"
    ? treeText(n.a, q + 1) + " ** " + treeText(n.b, q)
    : treeText(n.a, q) + " " + n.v + " " + treeText(n.b, q + 1);
  return q < p ? "(" + s + ")" : s;
}
/* Rendered rather than typeset. KaTeX would need its own stylesheet and its
   own fonts from a CDN, which this artifact does not load and the call's
   accessibility gate is a reason not to want: a page that needs a third
   party to show its own equations is a page that stops showing them when
   that party is unreachable. The subset here is small enough to draw --
   fractions, powers, exp, log, products -- so it is drawn. */

const IV = (a, b) => [Math.min(a, b), Math.max(a, b)];
const IBAD = [-Infinity, Infinity];
function ivalTree(n, box){
  if(!n || n.t === "nd") return IBAD;
  if(n.t === "n") return [n.v, n.v];
  if(n.t === "v") return box[n.v] || IBAD;
  if(n.t === "u"){ const a = ivalTree(n.a, box); return [-a[1], -a[0]]; }
  if(n.t === "f"){
    const a = ivalTree(n.a, box);
    if(n.v === "exp") return [Math.exp(a[0]), Math.exp(a[1])];
    if(n.v === "log") return a[0] <= 0 ? [-Infinity, a[1] > 0 ? Math.log(a[1]) : Infinity]
      : [Math.log(a[0]), Math.log(a[1])];
    const b = ivalTree(n.b, box);
    return n.v === "min" ? [Math.min(a[0], b[0]), Math.min(a[1], b[1])]
                         : [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  }
  const a = ivalTree(n.a, box), b = ivalTree(n.b, box);
  if(n.v === "+") return [a[0] + b[0], a[1] + b[1]];
  if(n.v === "-") return [a[0] - b[1], a[1] - b[0]];
  if(n.v === "*"){
    const p = [a[0]*b[0], a[0]*b[1], a[1]*b[0], a[1]*b[1]].filter(x => !isNaN(x));
    return p.length ? [Math.min.apply(null, p), Math.max.apply(null, p)] : IBAD;
  }
  if(n.v === "/"){
    if(b[0] <= 0 && b[1] >= 0) return IBAD;      // a zero in the denominator
    const r = [1 / b[1], 1 / b[0]];
    const p = [a[0]*r[0], a[0]*r[1], a[1]*r[0], a[1]*r[1]].filter(x => !isNaN(x));
    return p.length ? [Math.min.apply(null, p), Math.max.apply(null, p)] : IBAD;
  }
  if(n.v === "**"){
    if(b[0] !== b[1]) return IBAD;               // only a fixed exponent here
    const e = b[0];
    if(a[0] < 0 && e !== Math.round(e)) return IBAD;
    const c = [Math.pow(a[0], e), Math.pow(a[1], e)].filter(x => !isNaN(x));
    if(!c.length) return IBAD;
    // an even power over an interval straddling zero bottoms out at zero
    const lo = (a[0] < 0 && a[1] > 0 && e === Math.round(e) && e % 2 === 0)
      ? 0 : Math.min.apply(null, c);
    return [lo, Math.max.apply(null, c)];
  }
  return IBAD;
}

/* Branch and bound. The whole box first; where that is inconclusive, bisect
   the widest dimension and ask again. What comes back is a partition, and the
   partition is the scope condition. */
function proveSign(n, box0, want, opt){
  const o = opt || {}, maxDepth = o.depth || 9, maxBoxes = o.boxes || 400;
  const vars = Object.keys(box0);
  const proved = [], failed = [], open = [], zero = [];
  let seen = 0, witness = null;
  const sgn = iv => want > 0 ? (iv[0] >= -1e-12 ? 1 : iv[1] < 0 ? -1 : 0)
                             : (iv[1] <= 1e-12 ? 1 : iv[0] > 0 ? -1 : 0);
  /* AN ENCLOSURE THAT NEVER LEAVES ZERO IS NOT A SIGN. The test above is
     weak on purpose -- a derivative that is mathematically positive can
     enclose a shade below zero, and throwing that away would lose most of
     what interval arithmetic can honestly deliver -- but weak means it
     passes `want > 0` and `want < 0` alike for a derivative that is
     identically zero, and "rises with" is then returned for a quantity the
     outcome does not move with at all. The two-channel model has one:
     principal costs are shielded off the control channel, so d B / d
     principal_competence simplifies to 0, and both directions came back
     proved over the whole box with a share of 1.
     Counted separately so that `share` means what it meant before. */
  const flat = iv => iv[0] >= -1e-12 && iv[1] <= 1e-12;
  const vol = b => vars.reduce((t, v) => t * Math.max(1e-12, b[v][1] - b[v][0]), 1);
  const all = vol(box0);
  const walk = (box, d) => {
    if(seen++ > maxBoxes){ open.push(box); return; }
    const iv = ivalTree(n, box), s = sgn(iv);
    if(s === 1){ proved.push(box); if(flat(iv)) zero.push(box); return; }
    if(s === -1){
      failed.push(box);
      if(!witness){ witness = {}; for(const v of vars) witness[v] = (box[v][0] + box[v][1]) / 2; }
      return;
    }
    if(d >= maxDepth){ open.push(box); return; }
    let wv = vars[0], ww = -1;
    for(const v of vars){ const w = box[v][1] - box[v][0]; if(w > ww){ ww = w; wv = v; } }
    const mid = (box[wv][0] + box[wv][1]) / 2;
    const L = Object.assign({}, box), R = Object.assign({}, box);
    L[wv] = [box[wv][0], mid]; R[wv] = [mid, box[wv][1]];
    walk(L, d + 1); walk(R, d + 1);
  };
  walk(box0, 0);
  const pv = proved.reduce((t, b) => t + vol(b), 0) / all;
  const fv = failed.reduce((t, b) => t + vol(b), 0) / all;
  const zv = zero.reduce((t, b) => t + vol(b), 0) / all;
  return {proved, failed, open, witness, boxes:seen, zero,
    share:pv, failShare:fv, zeroShare:zv, openShare:Math.max(0, 1 - pv - fv),
    verdict:zv > 0.999999 ? "flat"
      : pv > 0.999999 ? "proved" : fv > 0.999999 ? "disproved"
      : (pv > 0 || fv > 0) ? "partial" : "undecided"};
}

/* The whole arithmetic as one expression in the free parameters, so that it
   can be differentiated. Each assignment is substituted into the ones after
   it, which is exact and can swell, so the size is capped and the cap is
   reported rather than silently truncating. */

function locateFlip(d1, box, x){
  let lo = box[x][0], hi = box[x][1];
  const at = (a, b) => { const bb = Object.assign({}, box); bb[x] = [a, b];
    const iv = ivalTree(d1, bb);
    return iv[0] >= 0 ? 1 : iv[1] <= 0 ? -1 : 0; };
  const s0 = at(lo, lo), s1 = at(hi, hi);
  if(!s0 || !s1 || s0 === s1) return null;
  for(let i = 0; i < 40 && hi - lo > 1e-9; i++){
    const m = (lo + hi) / 2;
    if(at(m, m) === s0) lo = m; else hi = m;
  }
  return [lo, hi];
}

/* ---------------------------------------------------------------------- */
/* A MODEL FROM LINES ALONE.

   `buildArith` in the page needs the curation: which relations are carried,
   which quantities are outcomes, what each is called. A kept arithmetic does
   not. Its lines already say what they are, every name in them is either
   written by another line, declared as a constant, or a free parameter, and
   that is enough to order them, read them and run them.

   Which is what lets something outside a browser do it. The ordering below is
   the page's, moved rather than rewritten: the grammar's scope rule is strict,
   a line reading a name written further down is refused BY NAME, and the order
   lines arrive in is mechanical rather than a judgement. Sorting is not repair
   -- nothing is renamed, and a line in a cycle is left at the end to be refused
   for the real reason. */
const NAMESIN = src => (String(src == null ? "" : src).match(/[a-z][a-z0-9_]*/g) || [])
  .filter(x => !ANARY[x]);
function buildLines(a){
  const lines = ((a && a.lines) || []).slice(0, 200);
  const consts = ((a && a.constants) || [])
    .filter(c => c && ANAME.test(String(c.name)) && isFinite(+c.value) && !ANARY[String(c.name)])
    .map(c => ({name:String(c.name), value:+c.value, why:String(c.why || ""),
      lo:isFinite(+c.lo) ? +c.lo : null, hi:isFinite(+c.hi) ? +c.hi : null}));
  const written = new Set(lines.map(l => String((l && l.lhs) || "").trim()));
  const cn = new Set(consts.map(c => c.name));
  /* A free parameter is a name something READS and nothing writes. Inferred
     rather than declared, because a file of lines is all there is here. */
  const params = [...new Set(lines.flatMap(l => NAMESIN(l.rhs != null ? l.rhs : l.py)))]
    .filter(n => !written.has(n) && !cn.has(n)).sort();
  const scope = new Set([...params, ...cn]);

  const inOrder = [], left = lines.slice(), seen = new Set(scope);
  for(let moved = true; left.length && moved; ){
    moved = false;
    for(let i = 0; i < left.length; i++){
      const rhs = left[i] && (left[i].rhs != null ? left[i].rhs : left[i].py);
      if(!NAMESIN(rhs).every(x => seen.has(x))) continue;
      const ln = left.splice(i, 1)[0]; i--;
      inOrder.push(ln); seen.add(String((ln && ln.lhs) || "").trim()); moved = true;
    }
  }
  for(const ln of left) inOrder.push(ln);

  const steps = [], bad = [], run = new Set(scope);
  for(const ln of inOrder){
    const lhs = String((ln && ln.lhs) || "").trim();
    const rhs = ln && (ln.rhs != null ? ln.rhs : ln.py);
    if(!ANAME.test(lhs) || ANARY[lhs] || run.has(lhs)){
      bad.push({lhs:lhs || "(unnamed)", why:run.has(lhs)
        ? "already the name of a parameter, a constant or an earlier line"
        : "not a usable name"});
      continue;
    }
    let e;
    try{ e = readExpr(rhs, run); }
    catch(err){ bad.push({lhs, why:err.message}); continue; }
    run.add(lhs);
    steps.push({lhs, rpn:e.rpn, py:e.py, uses:e.uses,
      kind:String((ln && ln.kind) || "local"), why:String((ln && ln.why) || "")});
  }
  return {consts, params, steps, bad};
}
/* One name written out in the free parameters and the constants, which is the
   form that can be differentiated. Substitution and not evaluation: every local
   is replaced by its own tree, so what comes back is still an expression. */
function inlineTree(steps, name){
  const by = new Map(steps.map(s => [s.lhs, s]));
  if(!by.has(name)) return null;
  const made = new Map();
  const build = (n, seen) => {
    const s = by.get(n);
    if(!s) return null;
    if(seen.has(n)) return null;                 // a cycle the grammar let through
    if(made.has(n)) return made.get(n);
    const sub = t => {
      if(!t || t.t === "n") return t;
      if(t.t === "v"){
        if(!by.has(t.v)) return t;
        const r = build(t.v, new Set([...seen, n]));
        return r || t;
      }
      const c = Object.assign({}, t);
      if(t.a) c.a = sub(t.a);
      if(t.b) c.b = sub(t.b);
      return c;
    };
    const out = sub(rpnTree(s.rpn));
    made.set(n, out);
    return out;
  };
  return build(name, new Set());
}
/* The box a verdict runs over: a declared interval where there is one, and the
   point value where a constant has none. Same rule as the page's. */
function boxFrom(model, bounds){
  const box = {};
  for(const p of model.params) box[p] = (bounds && bounds[p]) ? bounds[p].slice() : [0, 1];
  for(const c of model.consts)
    box[c.name] = (c.lo != null && c.hi != null && c.lo < c.hi) ? [c.lo, c.hi] : [c.value, c.value];
  return box;
}


/* ---- the ablation lattice -------------------------------------------------

   The one piece of this bench with a claim of its own behind it. `REPORT.md`
   §3 lists it as ours and says it is absent from AblateCell and the Contagion
   Tensor protocol: social mechanisms substitute, so disabling them ONE AT A
   TIME reports that neither mattered. In this corpus that is not a worry about
   the domain but a count -- 82 consequents carry two or more distinct causes
   from two or more independent papers, covering 397 of 1080 claims.

   It lived in the page, where nothing could test it, and it had never once
   returned `pair` -- because both seeded scenarios declare no substitutes, so
   the equifinal case it exists for had never arisen. A contribution with no
   executable instance behind it is a sentence in a proposal.

   The predicate is an ARGUMENT and not a dependency. `holds(off)` answers
   whether the prediction still holds with that set of mechanisms switched off,
   and the page passes its own -- four forms, a monotone sweep, a collapse
   check. What is here is only the search, which is the part with the claim on
   it: singletons first, because a prediction that dies when one mechanism is
   switched off is that mechanism's prediction and there is nothing to look for
   in the pairs; pairs after, bounded, because the lattice over all subsets is
   not worth walking and pairs and triples are where equifinality shows. */
function ablate(terms, holds, opt){
  const o = opt || {}, cap = o.cap || 20;
  if(holds(null) !== true)
    return {k:"fails", lab:"does not hold", s:0,
      why:"it does not hold of the model as it stands, so there is nothing to attribute"};
  const singles = terms.filter(t => holds(new Set([t])) === false);
  if(singles.length)
    return {k:"single", lab:"one mechanism", s:0.3, off:singles,
      why:"switching off " + singles.slice(0, 3).join(" or ") +
        " alone kills it, so it belongs to " +
        (singles.length === 1 ? "that mechanism" : "those mechanisms") +
        " rather than to the model"};
  if(terms.length > cap)
    return {k:"capped", lab:"not searched", s:0, skip:true,
      why:terms.length + " mechanisms is " + (terms.length * (terms.length - 1) / 2) +
        " pairs, past the cap this page searches"};
  const pairs = [];
  for(let i = 0; i < terms.length; i++)
    for(let j = i + 1; j < terms.length; j++)
      if(holds(new Set([terms[i], terms[j]])) === false)
        pairs.push(terms[i] + " + " + terms[j]);
  if(pairs.length)
    return {k:"pair", lab:"an interaction", s:1, off:pairs,
      why:"it survives every mechanism switched off alone and dies under " +
        pairs.slice(0, 2).join(", ") + " \u2014 which is exactly what a loop that ablates " +
        "one at a time reports as nothing mattering"};
  return {k:"none", lab:"no mechanism", s:0,
    why:"no mechanism or pair of mechanisms changes it, so it is about the parameters " +
      "and not about anything the curation carries"};
}

/* Run a kept arithmetic at one point, with a set of mechanisms switched off.

   `model.params` are names, `model.consts` are {name, value}, and each step of
   `model.steps` is {lhs, kind, rpn}. A term switched off evaluates to zero
   rather than being removed, because the lines that read it still have to run:
   that is what ablation MEANS here, and it is why the composition rule decides
   what one-at-a-time ablation can see. Under `additive` a zeroed term moves
   the outcome; under `max` a zeroed slack term does not. */
function runModel(model, point, off){
  const S = Object.create(null);
  for(const k of model.params) S[k] = point[k];
  for(const c of model.consts || []) S[c.name] = c.value;
  for(const st of model.steps){
    let v = evalRPN(st.rpn, S);
    if(off && st.kind === "term" && off.has(st.lhs)) v = 0;
    S[st.lhs] = v;
  }
  return S;
}

/* A sweep of `y` as `x` runs across its bound, everything else held at the
   middle of its own. The sweep is what a collapse is detected from: ablate a
   mechanism out of the path and the curve goes flat, which is weakly
   increasing and therefore passes "y rises in x" while asserting nothing. */
function sweepModel(model, x, y, bounds, n, off){
  const b = (bounds && bounds[x]) || [0, 1], xs = [], ys = [];
  for(let i = 0; i <= (n || 20); i++){
    const p = Object.create(null);
    for(const k of model.params){
      const c = (bounds && bounds[k]) || [0, 1];
      p[k] = k === x ? b[0] + (b[1] - b[0]) * i / (n || 20) : (c[0] + c[1]) / 2;
    }
    xs.push(p[x]);
    ys.push(runModel(model, p, off || null)[y]);
  }
  return {xs, ys};
}


/* ---- a bounded search over the configurations a declaration admits --------

   What a declaration admits is a product: one family member per term, one
   combination rule per outcome. On the worked example that is already in the
   tens of thousands, and on the eleven-mechanism model it is more than anything
   will walk. So a search, with a target stated before it runs and a cap, and
   the honest report of what it covered.

   NOT agents, and the reason is the bench's whole argument. What makes this
   worth having is that the machine proposes and a checker disposes; a search
   that reported its own successes would be the Potemkin village the editors
   name. So this takes a `test` it does not supply and cannot see inside, walks
   configurations in a deterministic order, and reports three things: what
   satisfied the target, how many it tried, and whether it got to the end. A
   search that found nothing after 400 configurations and a search that found
   nothing in a class of 12 are different answers, and the difference is the
   part a reader needs.

   The order is lexicographic over the axes as given, which makes a run
   reproducible: the same declaration searched twice reports the same thing in
   the same order, and a cap that bites bites in the same place. */
function searchClass(axes, test, opt){
  const o = opt || {}, cap = o.cap || 400, want = o.want || 1;
  const live = (axes || []).filter(a => a && (a.choices || []).length);
  const total = live.reduce((n, a) => n * a.choices.length, 1);
  if(!live.length) return {found:[], tried:0, total:0, exhausted:true,
    why:"nothing is declared as a class, so there is no space to search"};

  const found = [], at = live.map(() => 0);
  let tried = 0, exhausted = false, err = "";
  for(;;){
    if(tried >= cap) break;
    const config = {};
    live.forEach((a, i) => { config[a.name] = a.choices[at[i]]; });
    tried++;
    let r;
    try{ r = test(config); }
    catch(e){ err = err || String((e && e.message) || e); r = null; }
    if(r && r.ok) found.push({config, why:String(r.why || "")});
    if(found.length >= want) break;
    /* odometer */
    let i = live.length - 1;
    while(i >= 0 && ++at[i] >= live[i].choices.length){ at[i] = 0; i--; }
    if(i < 0){ exhausted = true; break; }
  }
  return {found, tried, total, exhausted, err,
    axes:live.map(a => ({name:a.name, n:a.choices.length})),
    why:found.length
      ? `found ${found.length} after ${tried} of ${total} configurations`
      : exhausted
        ? `nothing in the whole class satisfies it: ${total} configuration` +
          (total === 1 ? "" : "s") + " searched, all of them"
        : `nothing in the first ${tried} of ${total} configurations, which is where the cap ` +
          `stopped it \u2014 not an answer about the class, only about what was looked at`};
}


export { ANAME, ANARY, APREC, ARIGHT, ATOK, FN, IBAD, IV, NAMESIN, NEG, NUM, ONE, OP, PREC, SIMPL, VAR, ZERO, ablate, boxFrom, buildLines, cancel, dTree, evalRPN, flatProd, flatSum, hasVar, inlineTree, isN, ivalTree, keyOf, locateFlip, mmResolve, mmSpread, mmWhy, negOf, powParts, proveSign, readExpr, rpnTree, runModel, same, searchClass, simp, simp1, sizeOf, splitCoef, sweepModel, treeNames, treeText };

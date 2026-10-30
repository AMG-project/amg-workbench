/* THE TOURS' WORDS, OUT AND BACK.
   ==========================================================================

   Every sentence a reader sees in a guided tour lives in page/30-tour.js
   beside the selectors that place it, which is right for the engine and
   wrong for editing prose: the words are broken across string
   concatenations and wrapped in code. This writes them out as one flat
   file, one field per line, and reads that file back in.

   The selectors, the presses and the undo lists never appear here. Only
   text a reader reads: a tour's name and why, a stop's caption, the label
   on each mark, and the sentence that says what a press will do.

   Out:  node scripts/tour_text.mjs --out tour-text.md
   Back: node scripts/tour_text.mjs --in  tour-text.md
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, "..", "docs", "bench", "page", "30-tour.js");

/* A field's value, read as JavaScript writes it: one or more quoted pieces
   joined by `+`, possibly over several lines. Returns the text and the exact
   span it occupied, so putting it back is a splice and nothing else moves. */
function readField(src, from, key){
  const re = new RegExp("\\b" + key + "\\s*:\\s*", "g");
  re.lastIndex = from;
  const m = re.exec(src);
  if(!m) return null;
  let i = m.index + m[0].length, out = "", first = true;
  for(;;){
    while(i < src.length && /[\s+]/.test(src[i])) i++;
    const q = src[i];
    if(q !== '"' && q !== "'"){ if(first) return null; break; }
    first = false;
    let j = i + 1, s = "";
    while(j < src.length){
      if(src[j] === "\\"){ s += src[j] + src[j + 1]; j += 2; continue; }
      if(src[j] === q) break;
      s += src[j++];
    }
    out += s; i = j + 1;
    let k = i;
    while(k < src.length && /\s/.test(src[k])) k++;
    if(src[k] !== "+") break;
    i = k + 1;
  }
  return {text: out, start: m.index + m[0].length, end: i};
}

/* Where each stop begins, so a field is read inside its own stop. */
function stopSpans(src){
  const tours = [];
  const tre = /\{id:"([a-z]+)",\s*name:/g;
  let m;
  while((m = tre.exec(src))) tours.push({id: m[1], at: m.index});
  for(let i = 0; i < tours.length; i++)
    tours[i].end = i + 1 < tours.length ? tours[i + 1].at : src.length;
  for(const t of tours){
    t.stops = [];
    const sre = /\{stage:\d/g;
    sre.lastIndex = t.at;
    let s;
    while((s = sre.exec(src)) && s.index < t.end) t.stops.push(s.index);
    t.stops.forEach((at, i) => {
      t.stops[i] = {at, end: i + 1 < t.stops.length ? t.stops[i + 1] : t.end};
    });
  }
  return tours;
}

const esc = s => s.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();

function out(file){
  const src = fs.readFileSync(SRC, "utf8");
  const tours = stopSpans(src);
  const L = [];
  L.push("# The guided tours, in words");
  L.push("");
  L.push("Edit the text to the right of each `=`. Keep every `[tag]` line and every");
  L.push("key exactly as it is: the importer matches on them. A line may hold HTML");
  L.push("(`<b>bold</b>`) and nothing else. Blank lines and `#` lines are ignored.");
  L.push("");
  for(const t of tours){
    const nm = readField(src, t.at, "name"), why = readField(src, t.at, "why");
    L.push("---");
    L.push("");
    L.push(`[tour ${t.id}]`);
    L.push(`name = ${esc(nm ? nm.text : "")}`);
    L.push(`why  = ${esc(why ? why.text : "")}`);
    L.push("");
    t.stops.forEach((sp, i) => {
      const n = i + 1;
      const say = readField(src, sp.at, "say");
      L.push(`[stop ${t.id}.${n}]`);
      L.push(`say = ${esc(say ? say.text : "")}`);
      /* Every mark's label, in the order they are drawn. */
      const look = src.slice(sp.at, sp.end);
      const lm = look.match(/look\s*:\s*\[/);
      if(lm){
        let k = sp.at + lm.index + lm[0].length, n2 = 0;
        for(;;){
          const lab = readField(src, k, "lab");
          const nextStop = look.indexOf("say:", lm.index);
          if(!lab || lab.start > sp.at + nextStop) break;
          n2++;
          L.push(`mark ${n2} = ${esc(lab.text)}`);
          k = lab.end;
        }
      }
      const then = readField(src, sp.at, "then");
      if(then && then.start < sp.end) L.push(`press = ${esc(then.text)}`);
      L.push("");
    });
  }
  fs.writeFileSync(file, L.join("\n"));
  const stops = tours.reduce((a, t) => a + t.stops.length, 0);
  console.log(`wrote ${file}: ${tours.length} tours, ${stops} stops, ` +
    `${L.filter(x => /^(say|mark \d+|press|name|why) /.test(x)).length} lines of text`);
}

function back(file){
  const txt = fs.readFileSync(file, "utf8");
  let src = fs.readFileSync(SRC, "utf8");
  const tours = stopSpans(src);
  /* Parsed into a map first, so a malformed file changes nothing. */
  const want = new Map();
  let cur = null;
  for(const line of txt.split(/\r?\n/)){
    const h = line.match(/^\[(tour|stop)\s+([a-z]+)(?:\.(\d+))?\]\s*$/);
    if(h){ cur = h[1] === "tour" ? {t: h[2]} : {t: h[2], s: +h[3]}; continue; }
    const kv = line.match(/^(name|why|say|press|mark \d+)\s*=\s*(.*)$/);
    if(!kv || !cur) continue;
    const key = cur.s ? `${cur.t}.${cur.s}.${kv[1]}` : `${cur.t}.${kv[1]}`;
    want.set(key, kv[2].trim());
  }
  /* Applied from the END of the file backwards, so every span stays valid. */
  const edits = [];
  for(const t of tours){
    for(const [k, f] of [["name", "name"], ["why", "why"]]){
      const got = want.get(`${t.id}.${k}`);
      const fd = readField(src, t.at, f);
      if(got != null && fd && fd.text !== got) edits.push({...fd, got});
    }
    t.stops.forEach((sp, i) => {
      const n = i + 1;
      const say = readField(src, sp.at, "say");
      const g = want.get(`${t.id}.${n}.say`);
      if(g != null && say && say.text !== g) edits.push({...say, got: g});
      const look = src.slice(sp.at, sp.end);
      const lm = look.match(/look\s*:\s*\[/);
      if(lm){
        let k = sp.at + lm.index + lm[0].length, n2 = 0;
        for(;;){
          const lab = readField(src, k, "lab");
          const stopAt = look.indexOf("say:", lm.index);
          if(!lab || lab.start > sp.at + stopAt) break;
          n2++;
          const g2 = want.get(`${t.id}.${n}.mark ${n2}`);
          if(g2 != null && lab.text !== g2) edits.push({...lab, got: g2});
          k = lab.end;
        }
      }
      const then = readField(src, sp.at, "then");
      const g3 = want.get(`${t.id}.${n}.press`);
      if(then && then.start < sp.end && g3 != null && then.text !== g3)
        edits.push({...then, got: g3});
    });
  }
  edits.sort((a, b) => b.start - a.start);
  for(const e of edits){
    const lit = JSON.stringify(e.got);
    src = src.slice(0, e.start) + lit + src.slice(e.end);
  }
  fs.writeFileSync(SRC, src);
  console.log(`read ${file}: ${edits.length} line(s) changed in page/30-tour.js`);
}

const a = process.argv;
const oi = a.indexOf("--out"), ii = a.indexOf("--in");
if(oi > 0) out(a[oi + 1] || "tour-text.md");
else if(ii > 0) back(a[ii + 1] || "tour-text.md");
else console.log("node scripts/tour_text.mjs --out <file> | --in <file>");

// Builds the vocabulary voice list: one entry per unique (Arabic, transliteration) pair,
// with the text sent to the voice respelled to follow the transliteration.
// usage: node scripts/vocab-voice-jobs.mjs <out.json>   then batch with scripts/split-batch.py
import fs from 'fs';
import { pronounce } from './pronounce.mjs';
const dir='content/courses/abv-vol1/chapters/';
const out=[];const seen=new Map();
const walk=(o)=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o=='object'){if(o.type==='vocab')for(const v of o.items){const k=v.ar+'|'+v.translit;if(seen.has(k))seen.get(k).ids.push(v.id);else{const j={key:k,ids:[v.id],ar:v.ar,translit:v.translit,voice:pronounce(v.ar,v.translit)};seen.set(k,j);out.push(j)}}Object.values(o).forEach(walk)}};
for(const f of fs.readdirSync(dir).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})))walk(JSON.parse(fs.readFileSync(dir+f)));
const clean = (s) => s.replace(/\s*\([^)]*\)/g, '').replace(/…|\.\.\./g, '').trim();
for (const j of out) {
  const A = clean(j.ar).split(/\s*\/\s*/), T = clean(j.translit).split(/\s*\/\s*/);
  let parts;
  if (A.length === T.length) parts = A.map((a, i) => pronounce(a, T[i]));
  else if (A.length === 1 && T.length > 1) parts = T.map((t) => pronounce(A[0], t)); // قدّيش: ʾaddēsh / qaddēsh
  else parts = A.map((a) => pronounce(a, T.join(' ')));
  parts = parts.map((p, i) => (/ẓ/.test(T[i] ?? T[0]) && !/ظ/.test(p) ? p.replace('ص', 'ز') : p)); // ẓghīr
  j.voice = parts.join('، ').replace(/أِ/g, 'إ').replace(/ـ/g, '');
  j.masculineOnly = /\(ـ?ة\)|\(e\)|\(a\)/.test(j.ar + j.translit);
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(out.length, 'unique words');

// Idempotent structural clean-up of transcribed chapter JSON.
// Never changes curriculum wording — only moves/reshapes fields.
//   node scripts/normalize-content.mjs
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('content/courses/abv-vol1/chapters');
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const write = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d, null, 1) + '\n');
const exists = (f) => fs.existsSync(path.join(dir, f));

// 1. Chapter 1's opener (pp. 25–27) was transcribed with the front matter; it belongs to Chapter 1.
if (exists('front.json') && exists('ch1.json')) {
  const front = read('front.json');
  const ch1 = read('ch1.json');
  const i = front.lessons.findIndex((l) => l.id === 'ch1-opener');
  if (i >= 0) {
    const [opener] = front.lessons.splice(i, 1);
    if (!ch1.lessons.some((l) => l.id === 'ch1-opener')) ch1.lessons.unshift(opener);
    const pages = ch1.lessons.flatMap((l) => l.source?.pages ?? []);
    ch1.source.pages = [Math.min(...pages), Math.max(...pages)];
    write('front.json', front);
    write('ch1.json', ch1);
    console.log('moved ch1-opener into ch1.json');
  }
}

// 2. Per-blank answers: `blankAnswers` (alternatives per blank) → answers[].blanks
const product = (lists) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
for (const f of fs.readdirSync(dir).filter((f) => /^ch\d.*\.json$/.test(f))) {
  const ch = read(f);
  let n = 0;
  for (const l of ch.lessons)
    for (const b of l.blocks)
      for (const it of b.items ?? []) {
        if (Array.isArray(it.blankAnswers) && it.blankAnswers.length) {
          const per = it.blankAnswers.map((x) => (Array.isArray(x) ? x : [x]));
          const combos = product(per).map((combo) => combo.map((c) => ({ ar: c.ar ?? null, translit: c.translit ?? null })));
          it.answers = it.answers?.length ? it.answers : [];
          // keep the key text exactly as printed in answers[0]; attach per-blank fills to it
          if (it.answers[0]) it.answers[0].blanks ??= combos[0];
          // further combinations of per-blank alternatives become additional approved answers
          for (const combo of combos.slice(it.answers[0] ? 1 : 0)) {
            it.answers.push({
              ar: combo.map((c) => c.ar ?? '').join(' … '),
              translit: combo.every((c) => c.translit) ? combo.map((c) => c.translit).join(' … ') : null,
              blanks: combo,
            });
          }
          delete it.blankAnswers;
          n++;
        }
      }
  if (n) {
    write(f, ch);
    console.log(`${f}: normalised ${n} multi-blank items`);
  }
}

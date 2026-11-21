// Plans the "In the Car" listening episodes: one per lesson that has recorded audio
// (vocabulary banks and comics), in book order. Writes the episode scripts and the list of
// English narration lines that still need a voice.
// usage: node scripts/episodes/plan.mjs <out_dir>
import fs from 'node:fs';
const OUT = process.argv[2];
const C = 'content/courses/abv-vol1';
const course = JSON.parse(fs.readFileSync(`${C}/course.json`, 'utf8'));
const chapterFiles = Object.fromEntries(fs.readdirSync(`${C}/chapters`).map((f) => [f.replace('.json', ''), JSON.parse(fs.readFileSync(`${C}/chapters/${f}`, 'utf8'))]));
const chapters = course.chapters.map((id) => chapterFiles[id]).filter(Boolean);
const comics = Object.fromEntries(fs.readdirSync(`${C}/comics`).map((f) => { const c = JSON.parse(fs.readFileSync(`${C}/comics/${f}`, 'utf8')); return [c.id, c]; }));

/** English as a speaker would say it: the singular cue for a singular Arabic word, no symbols. */
export function speakableEnglish(en) {
  const FIX = { 'woman; wife / women; wives': 'woman; wife' };
  let s = (FIX[en] ?? en).replace(/…|\.\.\./g, '').replace(/’/g, "'").trim();
  s = s.replace(/\((m\.?\s*sg\.?|m\.)\)/gi, ', masculine').replace(/\((f\.?\s*sg\.?|f\.)\)/gi, ', feminine').replace(/\(pl\.?\)/gi, ', plural');
  s = s.replace(/\((s|es|ren)\)/g, ''); // brother(s) → brother: only the singular is voiced
  // grammar notes in brackets are not part of the cue: "angry (with / at)", "my mother (my mom)"
  const PREP = /^(with|at|by|from|of|about|for|in|to|on|because)$/i;
  s = s.replace(/\s*\(([^)]*)\)/g, (m, inner) => {
    const words = inner.split(/[\s\/]+/).filter(Boolean);
    return words.every((w) => PREP.test(w)) || /^my\b/i.test(inner.trim()) ? '' : m;
  });
  const plural = (a, b) => {
    const A = a.toLowerCase(), B = b.toLowerCase();
    if (A === B) return false;
    if (B.replace(/s(?=-)/, '') === A) return true; // daughters-in-law
    return (/(s|men|ren|ies|ves|people)$/.test(B) && B.startsWith(A.slice(0, 3))) || /^(people|men|women|wives|children)$/.test(B);
  };
  s = s.split(/\s*;\s*/).map((part) => {
    const opts = part.split(/\s*\/\s*/).filter((o, i, all) => !(all.length > 1 && /^my\b/i.test(o)) && !(i > 0 && all.slice(0, i).some((p) => plural(p, o))));
    return opts.reduce((acc, o, i) => (i === 0 ? o : acc + (/[?!.]$/.test(acc) ? ' ' : ', ') + o), '');
  }).join('; ');
  s = s.replace(/\s*\(([^)]*)\)/g, ', $1').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/;\s*also /gi, '; ').trim();
  return s;
}
const titleSay = (t) => t.replace(/’/g, "'").replace(/&/g, 'and').replace(/\s*—.*$/, '').replace(/:/g, ':').trim();

const english = new Map(); // text → key
const say = (text) => { const t = text.trim(); if (!english.has(t)) english.set(t, `en${english.size + 1}`); return { type: 'en', key: english.get(t), text: t }; };

const episodes = [];
for (const ch of chapters) {
  for (const lesson of ch.lessons ?? []) {
    const vocabBlocks = lesson.blocks.filter((b) => b.type === 'vocab');
    const comicBlocks = lesson.blocks.filter((b) => b.type === 'comic');
    if (!vocabBlocks.length && !comicBlocks.length) continue;
    const ep = { id: `ep-${lesson.id}`, lessonId: lesson.id, chapter: ch.number, title: lesson.title, sections: [] };
    const intro = [say(`Chapter ${ch.number}. ${titleSay(lesson.title)}.`)];
    ep.sections.push({ title: 'Introduction', parts: intro });
    // vocabulary banks; the one-word question-word tables are played as one set
    const banks = [];
    for (const b of vocabBlocks) {
      if (b.items.length === 1 && banks.length && banks[banks.length - 1].single) { banks[banks.length - 1].items.push(...b.items); continue; }
      banks.push({ heading: b.items.length === 1 && /\?/.test(b.heading ?? '') ? 'Question Words' : titleSay(b.heading ?? lesson.title), items: [...b.items], single: b.items.length === 1 });
    }
    banks.forEach((bank, i) => {
      const parts = [];
      if (i === 0) parts.push(say('Listen to the English, then say it in Arabic. Then listen, and repeat.'));
      parts.push(say(`${bank.heading}.`));
      for (const v of bank.items) parts.push({ type: 'vocab', id: v.id, ar: v.ar, translit: v.translit, cue: say(speakableEnglish(v.en)) });
      ep.sections.push({ title: bank.heading, parts });
    });
    for (const cb of comicBlocks) {
      const comic = comics[cb.comicId];
      if (!comic) continue;
      const lines = comic.panels.flatMap((p) => p.lines);
      const counts = {};
      for (const l of lines) if (!/ and /i.test(l.speaker)) counts[l.speaker] = (counts[l.speaker] ?? 0) + 1;
      const you = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const name = titleSay(comic.title.en);
      ep.sections.push({ title: `${name}: the whole scene`, parts: [say(`${name}. First, listen to the whole scene.`), ...lines.map((l) => ({ type: 'line', id: l.id, speaker: l.speaker }))] });
      ep.sections.push({ title: `${name}: repeat each line`, parts: [say('Now repeat each line after you hear it.'), ...lines.map((l) => ({ type: 'line', id: l.id, speaker: l.speaker, repeat: true }))] });
      ep.sections.push({ title: `${name}: you are ${you}`, parts: [say(`Now you are ${you}. Say ${you}'s lines in the pauses.`), ...lines.map((l) => ({ type: 'line', id: l.id, speaker: l.speaker, yours: l.speaker === you }))] });
    }
    ep.sections.push({ title: 'End', parts: [say("That's the end of this lesson.")] });
    episodes.push(ep);
  }
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/episodes-plan.json`, JSON.stringify(episodes, null, 1));
fs.writeFileSync(`${OUT}/english.json`, JSON.stringify([...english].map(([text, key]) => ({ key, text })), null, 1));
console.log(episodes.length, 'episodes;', english.size, 'English lines');

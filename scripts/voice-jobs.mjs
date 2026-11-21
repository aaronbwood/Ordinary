// Lists the comic lines to voice: id, voice, the text sent to the voice model.
// The bubble text is shown on screen. When the printed dialogue line has the
// same words with fuller vowel marks, that fuller text is what gets voiced.
//   node scripts/voice-jobs.mjs <comicId> [--missing]
import fs from 'node:fs';
import { pronounce } from './pronounce.mjs';
import { vocalize } from './vocalize.mjs';
const course = 'content/courses/abv-vol1';
const cast = JSON.parse(fs.readFileSync(`${course}/audio/cast.json`, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(`${course}/audio/manifest.json`, 'utf8'));
const have = new Set(manifest.recordings.map((r) => r.key));
const [comicId, flag] = process.argv.slice(2);
const comic = JSON.parse(fs.readFileSync(`${course}/comics/${comicId}.json`, 'utf8'));
const dialogues = {};
for (const f of JSON.parse(fs.readFileSync(`${course}/course.json`, 'utf8')).chapters) {
  const ch = JSON.parse(fs.readFileSync(`${course}/chapters/${f}.json`, 'utf8'));
  for (const l of ch.lessons) for (const b of l.blocks) if (b.type === 'dialogue') dialogues[b.id] = b;
}
const strip = (s) => (s ?? '').replace(/[ً-ْٰـ‎‏]/g, '').replace(/[إأآ]/g, 'ا').replace(/[.,،!؟?…:"“”'\s]+/g, ' ').trim();
const jobs = [];
for (const p of comic.panels)
  for (const l of p.lines) {
    if (flag === '--missing' && have.has(l.id)) continue;
    const d = dialogues[l.dialogueId ?? comic.dialogueId];
    const dl = d && l.dialogueLine != null ? d.lines[l.dialogueLine] : null;
    const end = (x) => (x.trim().match(/[.!؟?…]+$/) ?? [''])[0];
    // same words: use the fuller vowel marks of the dialogue, but keep the bubble's own end punctuation
    const text = dl?.ar && strip(dl.ar) === strip(l.ar) ? dl.ar.trim().replace(/[.!؟?…]+$/, '') + end(l.ar) : l.ar;
    const v = cast.characters[l.speaker];
    // performance direction (eleven_v4 audio tag), never shown on screen
    const tr = l.translit ?? dl?.translit;
    const spoken = tr ? vocalize(pronounce(text, tr), tr) : text; // consonants and vowels follow the transliteration
    const prompt = l.direction ? `${l.direction} ${spoken}` : spoken;
    jobs.push({ id: l.id, speaker: l.speaker, voiceId: v?.voiceId ?? null, text: prompt, chars: prompt.length });
  }
console.log(JSON.stringify(jobs, null, 1));
console.error(`${jobs.length} lines, ${jobs.reduce((n, j) => n + j.chars, 0)} characters, missing voices: ${jobs.filter((j) => !j.voiceId).map((j) => j.speaker).join(', ') || 'none'}`);

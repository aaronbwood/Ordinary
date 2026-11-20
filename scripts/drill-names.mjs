// Gives every exercise a `drillName` (the drill's name as the book uses it),
// so multi-part drills are grouped under one name. Idempotent; an existing
// drillName is never overwritten, so the author can edit it in the JSON.
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('content/courses/abv-vol1/chapters');
const OVERRIDES = {
  'ch4-fanb-drill': 'FANB Conjunctions Drill',
  'ch4-oys-drill': 'OYS Conjunctions Drill',
};
const DISCUSSION = /let.s talk about|your turn|make it your own/i;

for (const f of fs.readdirSync(dir).filter((f) => /^ch\d.*\.json$/.test(f))) {
  const file = path.join(dir, f);
  const ch = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const l of ch.lessons) {
    const drillHeading = l.blocks.find((b) => b.type === 'text' && /drill/i.test(b.heading ?? ''))?.heading;
    for (const b of l.blocks) {
      if (b.type !== 'exercise' || b.drillName) continue;
      const t = (b.title ?? '').trim();
      let name;
      if (OVERRIDES[l.id]) name = OVERRIDES[l.id];
      else if (DISCUSSION.test(t)) name = 'Dialogue Discussion';
      else if (/^(section|part)\b/i.test(t)) name = drillHeading ?? l.title;
      else {
        const m = t.match(/^(.*?)\s*(?:[—:–-]\s*)?(?:Part|Section)\s+[\w\d]+\b/i);
        name = m && m[1] ? m[1].replace(/[\s—:–-]+$/, '') : t;
      }
      b.drillName = name;
    }
  }
  fs.writeFileSync(file, JSON.stringify(ch, null, 1) + '\n');
}

// p.82 "Practice Drill" (Sound–Image–Feeling Loop), transcribed from the page image.
const ch2f = path.join(dir, 'ch2.json');
const ch2 = JSON.parse(fs.readFileSync(ch2f, 'utf8'));
const med = ch2.lessons.find((l) => l.id === 'ch2-vocab-meditation');
const src = { designId: 'DAHaz00vw2w', pages: [82] };
const rows = [
  ['restaurant', 'مطعم', 'ma-t\'am', ['ma', 't\'am'], 'See hot food; smell cooking; hear plates and conversation; feel warmth.'],
  ['school', 'مدرسة', 'madrase', ['mad', 'ra', 'se'], 'See a building and hallway; hear a bell; feel yourself walking in.'],
  ['airport', 'مطار', 'matār', ['ma', 'tār'], 'See a runway; hear engines; feel movement and excitement.'],
  ['notebook', 'دفتر', 'daftar', ['daf', 'tar'], 'Feel the cover and pages; hear paper turn; see yourself writing.'],
  ['key', 'مفتاح', 'miftāḥ', ['mif', 'tāḥ'], 'Feel cool metal; hear it jingle; see it unlock a door.'],
];
if (!med.blocks.some((b) => b.id === 'ch2-vb-sifl-practice')) {
  med.blocks.push(
    {
      type: 'vocab',
      id: 'ch2-vb-sifl-practice',
      heading: 'Practice Drill — Sound–Image–Feeling Loop',
      items: rows.map(([en, ar, translit, syllables, cue], i) => ({ id: `v-ch2-sifl-${i + 1}`, ar, translit, en, syllables, notes: cue, page: 82 })),
      source: { ...src, note: 'Transcribed from the p.82 infographic (text is part of the image). Syllables are the book\'s "Chant (on beats)" column.' },
    },
    {
      type: 'exercise',
      id: 'ch2-ex-sifl-practice',
      exerciseType: 'vocab-recall',
      drillName: 'Sound–Image–Feeling Practice Drill',
      title: 'Sound–Image–Feeling Practice Drill',
      instructions: 'Try these words using the Sound–Image–Feeling Loop and metronome practice.',
      mode: 'drill',
      source: src,
      items: rows.map(([en, ar, translit, , cue], i) => ({
        id: `ch2-ex-sifl-practice-${i + 1}`,
        prompt: { en, note: cue },
        answers: [{ ar, translit }],
        model: { ar, translit, en },
        tags: ['vocab', 'sifl'],
        source: src,
      })),
    },
  );
  fs.writeFileSync(ch2f, JSON.stringify(ch2, null, 1) + '\n');
}

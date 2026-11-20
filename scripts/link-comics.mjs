// Adds a {type:"comic"} block to each comic's lesson, right after its dialogue
// (or first comic image block). Idempotent.
import fs from 'node:fs';
import path from 'node:path';
const course = 'content/courses/abv-vol1';
const meta = JSON.parse(fs.readFileSync(`${course}/course.json`, 'utf8'));
const comics = fs.readdirSync(`${course}/comics`).map((f) => JSON.parse(fs.readFileSync(`${course}/comics/${f}`, 'utf8')));
for (const f of meta.chapters) {
  const file = `${course}/chapters/${f}.json`;
  const ch = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  for (const c of comics) {
    const l = ch.lessons.find((x) => x.id === c.lessonId);
    if (!l || l.blocks.some((b) => b.type === 'comic' && b.comicId === c.id)) continue;
    const ids = c.dialogueIds ?? [c.dialogueId];
    let at = -1;
    l.blocks.forEach((b, i) => { if (b.type === 'dialogue' && ids.includes(b.id)) at = i; });
    if (at < 0) at = l.blocks.findIndex((b) => b.type === 'image' && b.kind === 'comic');
    l.blocks.splice(at + 1, 0, { type: 'comic', id: `comic-${c.id}`, comicId: c.id, title: c.title?.en, source: c.source });
    changed = true;
    console.log(`linked ${c.id} → ${f}/${l.id}`);
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(ch, null, 1) + '\n');
}

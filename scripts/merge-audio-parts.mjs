// Merges audio/parts/*.json into audio/manifest.json (later parts replace
// earlier entries with the same key). Skips entries whose file is missing.
import fs from 'node:fs';
const dir = 'content/courses/abv-vol1/audio';
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
const byKey = new Map(manifest.recordings.map((r) => [r.key, r]));
let added = 0, missing = [];
for (const f of fs.readdirSync(`${dir}/parts`).filter((f) => f.endsWith('.json')).sort()) {
  for (const r of JSON.parse(fs.readFileSync(`${dir}/parts/${f}`, 'utf8')).recordings ?? []) {
    if (!fs.existsSync(`public/${r.src}`)) { missing.push(r.key); continue; }
    byKey.set(r.key, r);
    added++;
  }
}
manifest.recordings = [...byKey.values()];
fs.writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
console.log(`merged ${added}; manifest now ${manifest.recordings.length}; missing files: ${missing.join(', ') || 'none'}`);

"""Assemble the "In the Car" episodes into single audio files (normal and slow pace).

usage: python3 -I scripts/episodes/build.py <plan.json> <en_words_dir> <en_map.json> <vocab_words_dir> <vocab_jobs.json> <out_dir> <episodes.json>

Normal pace: English cue, 3 s to answer, the Arabic, 3 s to repeat.
Slow pace:   English cue, 5 s to answer, the Arabic twice, 5 s to repeat.
Comics: the whole scene; then each line with a pause to repeat it; then a role-play where a
soft tone marks your turn and the pause is long enough to say your line.
"""
import json, os, subprocess, sys, math, struct
plan_p, en_dir, en_map_p, voc_dir, voc_jobs_p, out_dir, manifest_p = sys.argv[1:8]
RATE = 24000
plan = json.load(open(plan_p)); en_map = json.load(open(en_map_p))
voc_file = {}
for j in json.load(open(voc_jobs_p)):
    for i in j['ids']: voc_file[i] = os.path.join(voc_dir, j['ids'][0] + '.mp3')
os.makedirs(out_dir, exist_ok=True)
cache = {}
def pcm(path):
    if path not in cache:
        cache[path] = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'fatal', '-i', path, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
                                      '-f', 's16le', '-ac', '1', '-ar', str(RATE), '-'], capture_output=True, check=True).stdout
    return cache[path]
def silence(sec): return b'\x00\x00' * int(RATE * sec)
def tone():
    n = int(RATE * 0.18); out = bytearray()
    for k in range(n):
        env = math.sin(math.pi * k / n)  # soft in and out
        v = int(3500 * env * (math.sin(2 * math.pi * 660 * k / RATE) * 0.7 + math.sin(2 * math.pi * 990 * k / RATE) * 0.3))
        out += struct.pack('<h', v)
    return bytes(out)
def dur(b): return len(b) / 2 / RATE
def en_clip(text):
    return pcm(os.path.join(en_dir, en_map[text] + '.mp3'))
def line_clip(line_id): return pcm(f'public/audio/abv-vol1/{line_id}.mp3')

episodes_out = []
for ep in plan:
    rec = {'id': ep['id'], 'lessonId': ep['lessonId'], 'chapter': ep['chapter'], 'title': ep['title']}
    for pace in ('normal', 'slow'):
        slow = pace == 'slow'
        buf = bytearray(); sections = []
        def add(b): buf.extend(b)
        for sec in ep['sections']:
            sections.append({'title': sec['title'], 'start': round(dur(buf), 2)})
            for part in sec['parts']:
                t = part['type']
                if t == 'en':
                    add(en_clip(part['text'])); add(silence(0.9))
                elif t == 'vocab':
                    ar = pcm(voc_file[part['id']])
                    add(en_clip(part['cue']['text'])); add(silence(5.0 if slow else 3.0))
                    add(ar)
                    if slow: add(silence(1.5)); add(ar)
                    add(silence(5.0 if slow else 3.0))
                elif t == 'line':
                    c = line_clip(part['id']); d = dur(c)
                    if part.get('repeat'):
                        add(c); add(silence(max(5.0, d * 1.5 + 2.0) if slow else max(3.0, d + 1.0)))
                    elif 'yours' in part and part['yours']:
                        add(tone()); add(silence(max(5.0, d * 1.5 + 2.0) if slow else max(3.0, d * 1.2 + 1.0)))
                    else:
                        add(c); add(silence(0.9 if slow else 0.6))
            add(silence(1.2))
        wav = os.path.join(out_dir, f"{ep['id']}-{pace}.raw")
        open(wav, 'wb').write(bytes(buf))
        mp3 = os.path.join(out_dir, f"{ep['id']}-{pace}.mp3")
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'fatal', '-y', '-f', 's16le', '-ar', str(RATE), '-ac', '1', '-i', wav,
                        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', str(RATE), '-ac', '1', '-b:a', '48k',
                        '-metadata', f"title={ep['title']}", '-metadata', 'artist=Ordinary Day Arabic', '-metadata', f"album=Chapter {ep['chapter']}", mp3], check=True)
        os.remove(wav)
        rec[pace] = {'src': f"audio/abv-vol1/episodes/{ep['id']}-{pace}.mp3", 'duration': round(dur(buf), 1), 'sections': sections}
    episodes_out.append(rec)
    print(f"{ep['id']}: normal {rec['normal']['duration'] / 60:.1f} min, slow {rec['slow']['duration'] / 60:.1f} min")
json.dump({'note': 'In the Car episodes, one per lesson that has recorded audio, in book order. Built by scripts/episodes/build.py; English narration and cues are a generated voice (Aaron) awaiting review.', 'episodes': episodes_out}, open(manifest_p, 'w'), ensure_ascii=False, indent=1)

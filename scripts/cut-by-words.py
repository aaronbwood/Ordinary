"""Cut a batch recording into one file per line using the word timestamps of its transcript.

usage: python3 -I scripts/cut-by-words.py <batch.mp3> <words.json> <out_dir> <name=text> ...
The transcript's words follow the prompt, so line k is the next len(text.split()) words.
Leading [style direction] words are skipped. Each cut runs from just before the line's first
word to just after its last word, never past the midpoint of the gap to the neighbouring line,
so a cue can no longer end up with the wrong item even when the voice barely pauses.
Writes <name>.mp3 files and prints one QA line per item (expected text vs transcript words).
"""
import json, os, re, subprocess, sys
src, words_p, out_dir = sys.argv[1:4]
items = [a.split('=', 1) for a in sys.argv[4:]]
words = [w for w in json.load(open(words_p))['words'] if w.get('type', 'word') == 'word']
# drop [style direction] tags wherever they are (comic lines carry one per line)
kept, intag = [], False
for w in words:
    t = w['text']
    if not intag and t.startswith('['): intag = True
    if intag:
        if t.rstrip(',.!?').endswith(']'): intag = False
        continue
    kept.append(w)
words = kept
need = sum(len(t.replace('_', ' ').split()) for _, t in items)
if len(words) != need:
    sys.exit(f'FAIL {os.path.basename(src)}: transcript has {len(words)} words, prompt has {need}')
spans, k = [], 0
for name, t in items:
    n = len(t.replace('_', ' ').split())
    ws = words[k:k + n]; k += n
    spans.append((name, t.replace('_', ' '), ws[0]['start'], ws[-1]['end'], ' '.join(w['text'] for w in ws)))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
os.makedirs(out_dir, exist_ok=True)
strip = lambda s: re.sub(r'[\W_]+', '', s)
bad = 0
for idx, (name, text, a, b, heard) in enumerate(spans):
    lo = (spans[idx - 1][3] + a) / 2 if idx else 0.0
    hi = (b + spans[idx + 1][2]) / 2 if idx + 1 < len(spans) else dur
    start, end = max(lo, a - 0.12), min(hi, b + 0.18)
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'fatal', '-y', '-ss', f'{start:.3f}', '-to', f'{end:.3f}', '-i', src,
                    '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse,adelay=120,apad=pad_dur=0.25',
                    '-ac', '1', '-ar', '44100', '-b:a', '128k', os.path.join(out_dir, name + '.mp3')], check=True)
    ok = strip(heard) == strip(text)
    bad += not ok
    if not ok: print(f'  MISMATCH {name}: expected "{text}" / transcript "{heard}"')
print(f'{os.path.basename(src)}: {len(spans)} cut, {bad} text mismatches')

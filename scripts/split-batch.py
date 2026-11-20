"""Split one generated batch recording (words separated by pauses) into one file per word.

usage: python3 -I scripts/split-batch.py <batch.mp3> <out_dir> <name=text> <name=text> ...
Chooses the N-1 cut points among the detected pauses so that pauses are long AND
each piece's length fits the length of its text (a comma inside a two-part entry
such as "أدّيش، قدّيش" makes a pause too, so pause length alone is not enough).
Prints a line per batch; with --dry it only reports the chosen segment lengths.
"""
import math, re, subprocess, sys, os
args = [a for a in sys.argv[1:] if a != '--dry']
dry = '--dry' in sys.argv
src, out_dir, items = args[0], args[1], [a.split('=', 1) for a in args[2:]]
names = [n for n, _ in items]
HARAKAT = re.compile(r'[ً-ْٰـ،.؟?!\s]')
weights = [max(1, len(HARAKAT.sub('', t))) + 1.5 for _, t in items]  # +1.5: fixed onset/offset per word

log = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-nostats', '-i', src, '-af', 'silencedetect=n=-40dB:d=0.15', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
h, m, sec = re.search(r'Duration: (\d+):(\d+):([\d.]+)', log).groups()
dur = 3600 * int(h) + 60 * int(m) + float(sec)
starts = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', log)]
ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)] + [dur]
sil = [(max(0, s), e) for s, e in zip(starts, ends)]
lead = sil[0][1] if sil and sil[0][0] <= 0.05 else 0.0
tail = sil[-1][0] if sil and sil[-1][1] >= dur - 0.05 else dur
gaps = [(s, e) for s, e in sil if s > 0.05 and e < dur - 0.05]
N = len(names)
if len(gaps) < N - 1:
    sys.exit(f'FAIL {src}: {len(gaps)} pauses for {N} words')
speech = tail - lead - sum(e - s for s, e in gaps)
rate = speech / sum(weights)
pts = [(lead, lead)] + gaps + [(tail, tail)]  # pts[0]=start, pts[-1]=end; a segment runs from pts[a].end to pts[b].start
G = len(pts)
# DP: best[k][g] = best score placing word k ending at cut point g
NEG = -1e18
best = [[NEG] * G for _ in range(N + 1)]
back = [[-1] * G for _ in range(N + 1)]
best[0][0] = 0.0
for k in range(1, N + 1):
    for g in range(1, G):
        if k == N and g != G - 1: continue
        if k < N and g == G - 1: continue
        for a in range(g):
            if best[k - 1][a] == NEG: continue
            # speech inside the segment = span minus internal pauses
            span = pts[g][0] - pts[a][1]
            inner = sum(pts[i][1] - pts[i][0] for i in range(a + 1, g))
            seg = max(0.05, span - inner)
            fit = abs(math.log(seg / (weights[k - 1] * rate)))
            gap_bonus = (pts[g][1] - pts[g][0]) if g != G - 1 else 0
            inner_pen = sum(pts[i][1] - pts[i][0] for i in range(a + 1, g))
            sc = best[k - 1][a] - 2.0 * fit + 3.0 * gap_bonus - 3.0 * inner_pen
            if sc > best[k][g]:
                best[k][g], back[k][g] = sc, a
cuts, g = [], G - 1
for k in range(N, 0, -1):
    a = back[k][g]; cuts.append((a, g)); g = a
cuts.reverse()
segs = [(pts[a][1], pts[b][0]) for a, b in cuts]
worst = max(abs(math.log(max(0.05, b - a - sum(pts[i][1] - pts[i][0] for i in range(x + 1, y))) / (w * rate)))
            for (a, b), (x, y), w in zip(segs, cuts, weights))
merged = sum(y - x - 1 for x, y in cuts)
print(f'{os.path.basename(src)}: {N} words, {len(gaps)} pauses, {merged} pause(s) kept inside words, worst fit x{math.exp(worst):.1f}')
if dry:
    for n, (a, b) in zip(names, segs): print(f'   {n} {b - a:.2f}s')
    sys.exit()
os.makedirs(out_dir, exist_ok=True)
for name, (a, b) in zip(names, segs):
    a, b = max(0, a - 0.06), min(dur, b + 0.08)
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'fatal', '-y', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', src,
                    '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse,adelay=120,apad=pad_dur=0.25',
                    '-ac', '1', '-ar', '44100', '-b:a', '128k', os.path.join(out_dir, name + '.mp3')], check=True)

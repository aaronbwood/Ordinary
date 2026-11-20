"""Cut exported comic pages into panels (right-to-left reading order).

usage: python3 -I scripts/cut-comic-panels.py <pages_dir> <out_dir> <manifest.json>
Each page pNNN.png -> pNNN-K.webp, K = 1.. in reading order (rows top→bottom,
panels right→left). Writes a manifest with each panel's box for auditing.
"""
import json, sys, os
import numpy as np
from PIL import Image

pages_dir, out_dir, manifest_path = sys.argv[1:4]
os.makedirs(out_dir, exist_ok=True)

def runs(mask, min_len):
    """[(start, end)] of True runs at least min_len long."""
    out, start = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and start is None: start = i
        if not v and start is not None:
            if i - start >= min_len: out.append((start, i))
            start = None
    return out

manifest = {}
for name in sorted(os.listdir(pages_dir)):
    if not name.endswith('.png'): continue
    page = name[1:-4]
    im = Image.open(os.path.join(pages_dir, name)).convert('RGB')
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), axis=0)
    content = np.abs(a - bg).sum(axis=2) > 60
    # horizontal bands of content separated by near-empty rows
    row_fill = content.mean(axis=1)
    bands = runs(row_fill > 0.05, int(h * 0.08))
    panels = []
    for (y0, y1) in bands:
        col_fill = content[y0:y1].mean(axis=0)
        cols = runs(col_fill > 0.05, int(w * 0.12))
        for (x0, x1) in sorted(cols, key=lambda c: -c[0]):  # right to left
            panels.append((x0, y0, x1, y1))
    manifest[page] = []
    for k, (x0, y0, x1, y1) in enumerate(panels, 1):
        crop = im.crop((x0, y0, x1, y1))
        if crop.width > 900:
            crop = crop.resize((900, round(crop.height * 900 / crop.width)), Image.LANCZOS)
        fn = f'p{page}-{k}.webp'
        crop.save(os.path.join(out_dir, fn), 'WEBP', quality=82)
        manifest[page].append({'file': fn, 'box': [int(x0), int(y0), int(x1), int(y1)]})
    print(page, len(panels), [p[2]-p[0] for p in panels][:3], [p[3]-p[1] for p in panels][:3])

json.dump(manifest, open(manifest_path, 'w'), indent=1)

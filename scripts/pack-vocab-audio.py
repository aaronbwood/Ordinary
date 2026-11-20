"""Pack the per-word vocabulary recordings into one audio file per chapter.

usage: python3 -I scripts/pack-vocab-audio.py <words_dir> <out_dir> <offsets.json>
The artifact host allows ~500 files per version, so 533 separate word files do not fit.
Each word keeps its own lead-in and tail silence; offsets.json maps word file name ->
{file, start, end} in seconds, which the manifest uses (AudioRecording.start/end).
"""
import json, os, subprocess, sys, wave, tempfile
words_dir, out_dir, offsets_path = sys.argv[1:4]
os.makedirs(out_dir, exist_ok=True)
RATE = 44100
groups = {}
for f in sorted(os.listdir(words_dir)):
    if f.endswith('.mp3'):
        groups.setdefault(f.split('-')[1], []).append(f)  # v-ch3-... -> ch3
offsets = {}
with tempfile.TemporaryDirectory() as tmp:
    for ch, files in groups.items():
        pcm, pos = bytearray(), 0
        for f in files:
            raw = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'fatal', '-i', os.path.join(words_dir, f),
                                  '-f', 's16le', '-ac', '1', '-ar', str(RATE), '-'], capture_output=True, check=True).stdout
            n = len(raw) // 2
            offsets[f[:-4]] = {'file': f'vocab-{ch}.mp3', 'start': round(pos / RATE, 3), 'end': round((pos + n) / RATE, 3)}
            pcm += raw; pos += n
        wav = os.path.join(tmp, ch + '.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(bytes(pcm))
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'fatal', '-y', '-i', wav, '-ac', '1', '-ar', str(RATE), '-b:a', '128k',
                        os.path.join(out_dir, f'vocab-{ch}.mp3')], check=True)
        print(f'vocab-{ch}.mp3: {len(files)} words, {pos / RATE:.1f}s')
json.dump(offsets, open(offsets_path, 'w'), indent=1)

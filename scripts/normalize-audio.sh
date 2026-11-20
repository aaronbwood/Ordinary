#!/usr/bin/env bash
# Evens out loudness across recordings so no character sounds quieter/farther
# than another: measure integrated loudness (EBU R128), apply the exact gain to
# reach -16 LUFS, and catch peaks with a limiter (-1.5 dBFS). Mono 44.1 kHz MP3.
#   scripts/normalize-audio.sh public/audio/abv-vol1/*.mp3
set -euo pipefail
measure() { ffmpeg -hide_banner -nostats -i "$1" -af loudnorm=print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p' | python3 -c 'import json,sys;print(json.load(sys.stdin)["input_i"])'; }
for f in "$@"; do
  before=$(measure "$f")
  for pass in 1 2; do
    cur=$(measure "$f")
    gain=$(python3 -c "print(round(-16 - float('$cur'), 2))")
    tmp="${f%.mp3}.norm.mp3"
    ffmpeg -hide_banner -loglevel error -y -i "$f" -af "volume=${gain}dB,alimiter=limit=0.84:level=false" -ac 1 -ar 44100 -b:a 128k "$tmp"
    mv "$tmp" "$f"
  done
  echo "$(basename "$f"): $before -> $(measure "$f") LUFS"
done

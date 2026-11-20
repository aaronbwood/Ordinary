#!/usr/bin/env bash
# Evens out loudness across recordings so no character sounds quieter/farther
# than another: two-pass EBU R128 loudnorm to -16 LUFS, mono, 44.1 kHz MP3.
#   scripts/normalize-audio.sh public/audio/abv-vol1/*.mp3
set -euo pipefail
for f in "$@"; do
  m=$(ffmpeg -hide_banner -nostats -i "$f" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  ii=$(echo "$m" | python3 -c 'import json,sys;print(json.load(sys.stdin)["input_i"])')
  tp=$(echo "$m" | python3 -c 'import json,sys;print(json.load(sys.stdin)["input_tp"])')
  lra=$(echo "$m" | python3 -c 'import json,sys;print(json.load(sys.stdin)["input_lra"])')
  th=$(echo "$m" | python3 -c 'import json,sys;print(json.load(sys.stdin)["input_thresh"])')
  tmp="${f%.mp3}.norm.mp3"
  ffmpeg -hide_banner -loglevel error -y -i "$f" -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$ii:measured_TP=$tp:measured_LRA=$lra:measured_thresh=$th:linear=true" -ac 1 -ar 44100 -b:a 128k "$tmp"
  mv "$tmp" "$f"
  echo "$(basename "$f"): $ii LUFS -> -16"
done

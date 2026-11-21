# Source audio (not served by the app)

The single clips the published audio is built from, kept so episodes and chapter files can be rebuilt.

- `vocab-words/` — one levelled file per unique vocabulary word (Aaron's voice); `index.json` lists
  each word's vocab ids and the respelled text the voice read. Packed into `public/audio/abv-vol1/vocab-ch*.mp3`
  by `scripts/pack-vocab-audio.py`.
- `narration-en/` — English cues and narration for the In the Car episodes (Aaron's voice); `index.json`
  maps each English line to its file.

Rebuild the episodes:

```
node scripts/episodes/plan.mjs /tmp/ep
python3 -I scripts/episodes/build.py /tmp/ep/episodes-plan.json audio-src/narration-en audio-src/narration-en/index.json \
  audio-src/vocab-words audio-src/vocab-words/index.json public/audio/abv-vol1/episodes content/courses/abv-vol1/audio/episodes.json
```
then re-encode each episode with `ffmpeg -i in.mp3 -c:a libmp3lame -q:a 8 -ac 1 -ar 24000 out.mp3` (variable bitrate keeps the long pauses small).
All of this audio is a generated voice awaiting review.

# Voicing a comic (ElevenLabs)

1. **Directions.** For every line in `content/courses/abv-vol1/comics/<comicId>.json`, add
   `"direction": "[tag]"` — one or two plain English eleven_v4 audio tags chosen from the panel
   art (view the panel image) and the story context, e.g. `[warmly]`, `[excited]`, `[curious]`,
   `[teasing]`, `[worried]`, `[gently]`, `[tired]`, `[laughs softly]`, `[surprised]`, `[proudly]`,
   `[casually]`, `[reassuring]`. Describe how the line is spoken, not actions. Keep it natural and
   conversational, never theatrical. Do not change any other field.
2. **Prompts.** `node scripts/voice-jobs.mjs <comicId>` prints, per line: id, speaker, voiceId and the
   exact prompt text to send (direction + the text to voice). Use exactly that text and voiceId.
3. **Generate.** One ElevenLabs flow per comic (`creative_create_flow`), then one
   `creative_generate_speech` call per line with `model_id: "eleven_v4"`, `generations_count: 1`,
   that flow_id, voice_id and prompt. Never call a generation twice for the same line (it charges
   again); if one fails, report it instead of retrying. Poll `creative_get_flow_run_status` until
   all_completed or has_failures.
4. **Download.** `curl -sS -o public/audio/abv-vol1/<lineId>.mp3 "<content_url>"` for each line.
5. **Loudness.** `scripts/normalize-audio.sh public/audio/abv-vol1/<comicPrefix>-*.mp3`.
6. **Register.** Write `content/courses/abv-vol1/audio/parts/<comicId>.json`:
   `{ "recordings": [ { "key": "<lineId>", "src": "audio/abv-vol1/<lineId>.mp3",
   "status": "generated-candidate", "speaker": "...", "voice": "<voiceName from cast.json>",
   "model": "eleven_v4", "direction": "[tag]" } ] }`. Do not edit audio/manifest.json.

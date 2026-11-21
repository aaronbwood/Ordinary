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

## Pronunciation follows the transliteration

`scripts/voice-jobs.mjs` passes every line through `scripts/pronounce.mjs` before it is
voiced. The screen keeps the printed Arabic; only the text sent to the voice changes:
- ق → أ/ء where the transliteration has ʾ (qahwe is ʾahwe), kept where it has q
- ذ → ز/د and ث → ت/س where the transliteration has z/d or t/s (ذوقك → زوءك, الثّالث → التّالت)
- a word-initial bare ا becomes إ/أُ by the transliteration's vowel (امي → إمّي, "immi")
- where bubble and dialogue have the same words, the dialogue's fuller vowel marks are used

## Vocabulary words

Every vocabulary word is voiced in Aaron's own voice (see `vocabulary` in `audio/cast.json`).

1. `node scripts/vocab-voice-jobs.mjs vocab-jobs.json` lists each unique word once (the same word on
   two pages shares one file) and builds the text the voice reads, respelled with
   `scripts/pronounce.mjs` so it follows the transliteration (قهوة → أهوة for ʾahwe, صغير → زغير for ẓghīr).
   Entries written "kbīr(e)" are voiced in the masculine form only; "āh / naʿam" is voiced as both words.
2. Words are generated 14 per request, one per line, which costs far less than one request per word.
3. `python3 -I scripts/split-batch.py batch.mp3 out/ id=text …` cuts each batch into one file per word.
   It picks the cut points by matching pause length *and* each piece's length to its text, because a comma inside
   a two-part entry also makes a pause. Check any word it reports as a poor fit and re-record that word alone.
4. Level the files with `scripts/normalize-audio.sh`, pack them into one file per chapter with
   `scripts/pack-vocab-audio.py` (the published app may hold only ~500 files), then list them in `audio/parts/vocab.json` and the manifest
   (`kind: "vocab"`, keyed by vocabulary id, with `start`/`end` of the word inside its chapter file).

## In the Car episodes

One audio episode per lesson that has recorded audio (vocabulary banks and comics), in book order, in two paces.
English cues come from the book's glosses, cleaned up for speaking by `scripts/episodes/plan.mjs` (singular only,
grammar notes in brackets dropped), and are voiced by Aaron. `scripts/episodes/build.py` assembles each episode
into one file; the app's player (`src/audio/episodePlayer.ts`) uses a real media element and the Media Session API,
so it keeps playing with the phone locked and responds to car and headphone buttons. See `audio-src/README.md`.

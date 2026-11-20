# Ordinary Day Arabic

An interactive, speaking-first app version of **Arabic Before Verbs — Volume One** (Southern Levantine / Palestinian-Jordanian Arabic) by Aaron Wood.

The curriculum comes from the author's Canva designs. The app adds interaction: holding to speak, feedback, full-sentence models, rhythm practice, an illustrated apartment, and spaced review.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (add --host to open it on a phone on the same network)
npm test             # answer-checking, timeline and review tests, plus "every key accepts its own answer"
npm run validate-content   # schema/ID/blank checks; regenerates review-flags.md
npm run build && npm run preview
```

Speech recording needs a secure context, either `localhost` or HTTPS.

## What's in it

| Area | Where |
|---|---|
| Home (an older Lebanese home), resume, course list | `src/pages/Home.tsx`, `src/components/HouseArt.tsx` |
| Chapters → lessons → blocks, in book order, with links back to Canva pages | `src/pages/CourseMap.tsx`, `src/pages/LessonView.tsx` |
| Practice: hold <kbd>Space</kbd> or the mic button, release to submit, immediate feedback, retry, replay, transcript correction, missed items requeued | `src/components/ExercisePlayer.tsx`, `src/components/SpeakControl.tsx` |
| Dialogues: read and listen line by line; role-play with feedback held until the exchange ends, then up to 3 corrections and a repeat | `src/components/DialoguePlayer.tsx` |
| Rhythm mode: Web Audio metronome, count-in, prepare/respond/reveal beats, tempo and window sliders, easier/harder, pause/restart/replay, full-sentence models between rounds | `src/pages/RhythmView.tsx`, `src/lib/metronome.ts` |
| Apartment walkthrough: guided comic panels (RTL), then Explore / Identify / Find / Describe / Place / Review across entrance → living room → balcony | `src/pages/ApartmentView.tsx`, `src/components/SceneArt.tsx`, `content/courses/abv-vol1/scenes/apartment.json` |
| Spaced review (Leitner boxes) of items already practised | `src/pages/ReviewView.tsx`, `src/lib/review.ts` |
| Saved progress per course (place, completed lessons/activities, item results, review schedule) | `src/state/progress.ts` (localStorage) |

## Content system

Curriculum is JSON in `content/courses/<courseId>/`, separate from the UI. The format is documented in [`docs/CONTENT_FORMAT.md`](docs/CONTENT_FORMAT.md).

- **Fixing an answer:** edit the item's `answers` / `model` in `chapters/chN.json`.
- **Adding a recording:** put the file in `public/audio/abv-vol1/` and add an entry to `audio/manifest.json` with `status` set to `teacher`, `native-reviewed` or `generated-candidate`.
- **Adding a course:** add `content/courses/<id>/course.json` and its chapters. Volume Two (`abv-vol2`) is registered as a separate future course and keeps separate progress.
- **Auditing:** every lesson, block and item carries `source: { designId, pages }` pointing back to the Canva design. `review-flags.md` lists every suspected source error, missing answer and composed sentence for teacher review.

**Canonical source:** Canva "Volume 1 - Meal Ticket" (`DAHaz00vw2w`, 437 pp.). Its page numbers match the printed page numbers.

## Honest limits of this version

- **No model recordings yet.** The audio manifest is empty, so every model shows "No approved recording yet". You can opt in to the device's Arabic text-to-speech voice in Settings; it is clearly labelled as unreviewed and not a dialect model.
- **Speech-to-text** uses the browser's Speech Recognition (`ar-JO`) where available, mainly Chrome and Edge. Elsewhere students can still record, replay and compare themselves, or type. Low-confidence transcripts are marked *unclear*, not wrong.
- **Pronunciation is not scored.** Answer checking compares words with the approved key, after loose normalisation of harakat, hamza seats, proclitic spacing and transliteration diacritics.
- **Book illustrations and comics** are referenced and described from their Canva pages but are not embedded as images yet.
- **Apartment sentences:** apart from the book's own p.192 example, the walkthrough sentences were composed from Chapter 3 vocabulary and are flagged `needs-review`.

# Brief: build a new app in the style of "Ordinary Day Arabic"

Paste this whole document into a new chat. It describes the look, the structure and the working
rules of an existing language-learning web app, so a new app can be built to feel and behave the same way.
Replace the subject matter with the new app's content; keep the aesthetic, the interaction patterns and the
rules about honesty.

---

## 1. What the existing app is

A mobile-first web app that turns a printed course book (Levantine Arabic, Palestinian–Jordanian dialect) into
interactive lessons. Everything comes from the author's own book; the app adds practice, audio, progress
tracking and spaced review. It is a single-page app that works offline once loaded and needs no server or login.

Its character: **an older Lebanese family home**. Each section of the app is a room in that house:
- The vocabulary room is **the kitchen** (المَطْبَخ, il-maṭbakh).
- The comics room is **the guest room** (غُرْفِة الضُّيوف, ghurfet iḍ-ḍyūf).
- The apartment walkthrough is a comic-style tour of rooms.

The room names are shown in the target language first, with transliteration and English underneath.

---

## 2. Aesthetic

### Mood
Limestone walls, lime plaster, dark carved wood, olive trees, terracotta pots and floor tiles, faded blue
shutters, patterned cement tiles, and afternoon shade.

- **Warm and quiet:** never neon, glossy or "gamified".
- **Soft surfaces:** cards look like plaster panels with a soft inner highlight and a faint warm shadow.
- **Arches:** headers of important cards use an arch shape: the top corners are fully rounded, the bottom
  corners only slightly.
- **Tile pattern:** a subtle patterned-tile background (an SVG diamond and dots) is used sparingly behind
  hero areas.
- **Dark mode:** a candle-lit version of the same house (dark wood, warm ink), not a cold grey.

### Design tokens (copy these exactly)
```css
:root {
  --limestone: #ece2cf;   /* page background */
  --plaster:   #f7f1e5;   /* bars, inputs, chips */
  --plaster-2: #fbf8f1;   /* cards */
  --shade:     #e2d5bd;   /* hover, neutral badges, progress track */
  --wood:      #7a5236;
  --wood-dark: #553824;
  --olive:     #66743a;   /* secondary action, progress fill */
  --olive-soft:#e3e6cf;
  --terracotta:#b0603d;   /* primary action, active nav item */
  --terracotta-soft:#f3dccf;
  --blue:      #4c6c84;   /* links, focus ring, selected chip */
  --blue-soft: #dbe5ec;
  --ink:   #2c241d;  --ink-2: #5d5145;  --ink-3: #8a7c6c;   /* text: primary / secondary / muted */
  --line:  #d8c9ae;                                          /* all borders */
  --ok:   #4f7a3a; --ok-soft:   #e1ecd6;
  --warn: #a8742a; --warn-soft: #f5e7cc;
  --bad:  #a34a33; --bad-soft:  #f4dcd3;
  --card-shadow: 0 1px 0 rgba(255,255,255,.7) inset, 0 2px 10px rgba(80,55,30,.08);
  --radius: 14px;
  --arch: 999px 999px 14px 14px;
  --font-en: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-ar: 'Noto Naskh Arabic', 'Geeza Pro', serif;   /* swap for the new app's script font */
  --ar-size: 1.9rem;                                     /* target-language text is BIG */
  --tile: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23e8dcc6'/%3E%3Cpath d='M24 4 L44 24 L24 44 L4 24Z' fill='none' stroke='%23c9b28d' stroke-width='1.2'/%3E%3Ccircle cx='24' cy='24' r='6' fill='%23b0603d' fill-opacity='.18'/%3E%3Ccircle cx='0' cy='0' r='6' fill='%234c6c84' fill-opacity='.16'/%3E%3Ccircle cx='48' cy='0' r='6' fill='%234c6c84' fill-opacity='.16'/%3E%3Ccircle cx='0' cy='48' r='6' fill='%234c6c84' fill-opacity='.16'/%3E%3Ccircle cx='48' cy='48' r='6' fill='%234c6c84' fill-opacity='.16'/%3E%3C/svg%3E");
}
/* Dark ("candle-lit") values, applied under prefers-color-scheme: dark and [data-theme='dark'] */
--limestone:#26201a; --plaster:#2f2821; --plaster-2:#362e26; --shade:#1e1914;
--wood:#b98a62; --wood-dark:#d6aa80; --olive:#a7b674; --olive-soft:#343826;
--terracotta:#d98a64; --terracotta-soft:#42291e; --blue:#8fb1c9; --blue-soft:#243440;
--ink:#f2e9da; --ink-2:#cdbfab; --ink-3:#9e8f7c; --line:#4a3f33;
--ok:#9cc47f; --ok-soft:#2b3a22; --warn:#e0b061; --warn-soft:#3d3020; --bad:#e08a72; --bad-soft:#43251d;
--card-shadow: 0 2px 10px rgba(0,0,0,.3);
```

### Component patterns
- **Page:** a `--limestone` background and a centred column at most 860px wide, with 16px side padding and
  120px of bottom padding so content clears the bottom bar.
- **Top bar:** sticky, translucent plaster (`color-mix` 92% plus an 8px backdrop blur) with a hairline bottom
  border. It holds the app name on the left and a settings button on the right; on desktop the main
  navigation links sit in the bar too.
- **Bottom navigation (phone):** fixed, plaster background with a top hairline, one icon above each label.
  Labels are 0.72rem; the active tab is terracotta and semi-bold. It respects `env(safe-area-inset-bottom)`.
  Up to 7 tabs fit at 400px wide.
- **Card:** `--plaster-2` background, 1px `--line` border, 14px radius, `--card-shadow`, 16px padding.
- **Arch card:** the page or room header (see Mood) with 34px top padding. It shows the target-language title
  big, then transliteration in italic, then the English title and a one-line description.
- **Buttons:** pill-shaped (radius 999px) and at least 44px tall.
  - **Primary:** terracotta with white text.
  - **Secondary:** olive with white text.
  - **Default:** plaster with a line border.
  - **Ghost:** transparent.
  - **Small:** 34px tall.
  - Icon and text sit together with a 6px gap.
- **Chips (filters, tabs):** small pills; the selected one is `--blue-soft` with a `--blue` border.
- **Badges:** tiny pills (0.7rem) in soft status colours: ok, warn, bad, blue or neutral.
- **Focus:** a 3px `--blue` outline with a 2px offset, on everything keyboard-reachable.
- **Progress bar:** 6px tall, a `--shade` track and an `--olive` fill.
- **Text:** body is Inter with line-height 1.55.
  - **Target-language text:** always the largest thing in a card, set right-to-left where relevant, with line-height 1.9.
  - **Transliteration:** italic in `--ink-2`.
  - **English:** `--ink-2`, usually hidden behind a "Show English" toggle.
  - **Eyebrow labels:** uppercase, 0.72rem, letter-spaced, `--ink-3`.
- **Grids:** `repeat(auto-fill, minmax(min(100%, 200px), 1fr))`, which collapses to one column on phones with
  no horizontal scroll.
- **Icons:** simple 24px line icons (stroke 2, round caps) drawn as inline SVG paths, with no icon library.
- **Illustrations:** warm, painterly comic panels with a heavy dark border under each panel image.

---

## 3. Information architecture

These tabs, in this order, are the pattern to reuse:

| Tab | What it is |
|---|---|
| Home | Continue where you left off, today's review count, the house illustration |
| Lessons | The course map: chapters, then lessons, then blocks, in book order, with progress |
| Words (the kitchen) | Every vocabulary bank by chapter. Play a word, play a whole bank, open metronome practice for a bank, search |
| Drills | Every exercise, grouped by chapter and then by the book's own drill name |
| Comics (the guest room) | Every comic as a panel-by-panel reader |
| Rhythm | Metronome practice: syllable-by-syllable vocabulary, and call-and-response ("Speaker–Responder") |
| Review | Spaced review of everything studied so far |

Plus Settings, reached from the top bar: script size, transliteration on by default, English on by default,
allow generated voices, and theme.

Routing is hash-based (`#/c/<course>/l/<lesson>`, `#/c/<course>/words`…) so the app works from any static
host, including a single published HTML file.

---

## 4. Functionality to reproduce

### Lessons and content blocks
A lesson is an ordered list of blocks taken from the book:
- text
- vocab (a bank of words)
- examples
- table
- callout
- dialogue
- comic
- scene (the walkthrough)
- exercise

Each block keeps a **source reference** to the exact book page it came from, shown as a small "Book p. 51 ↗" link.

### Exercises
Interactive versions of every exercise type in the book:
- fill in the blank
- multiple choice
- matching
- ordering
- translate to the target language
- speak the answer
- Speaker–Responder
- dialogue role-play

Rules:
- **Scripts and blanks:** show the target script first. Transliteration and English are reveal/hide aids,
  and the transliteration shows the *same* blank as the script.
- **Feedback timing:** drills give immediate feedback; dialogues and role-play defer it to the end.
- **Verdicts:** answer checking returns one of `correct | close | incorrect | unclear | no-key`.
  - **unclear:** the recogniser heard nothing usable, or had low confidence. It is never shown as "wrong".
  - **no-key:** the book has no answer key for this item, so the app says so instead of inventing one.
- **Matching:**
  - Normalise script and transliteration (vowel marks, letter variants, direction marks, spacing of
    attached prefixes).
  - Accept any of the recogniser's alternative transcripts.
  - Accept every slash-separated option the book allows.
- **Answer keys:** the book's keys are the truth. Suspected errors are *flagged* for the author, never silently fixed.

### Speaking
- **Recording:** hold Space, or a big mic button on phones, and release to submit. Keyboard shortcuts are off
  while a text field has focus.
- **Text fallback:** there is always a typed-answer fallback.
- **Self-replay:** the student's own recording can be replayed next to the model.
- **Recognition:** the browser's speech recognition is used only to read *what* was said. The app never
  claims to score pronunciation.

### Audio
- **Recording rank:** a teacher recording beats a reviewed native recording, which beats a generated candidate voice.
- **Labelling:** generated audio is always labelled "Generated voice — awaiting review" until the author approves it.
- **Manifest:** `audio/manifest.json` maps a key (item id or normalised text) to `{src, status, speaker, start?, end?}`.
- **Clips inside longer files:** one file can hold many clips. `start` and `end` let one file per chapter hold
  hundreds of words, which keeps the published file count low.
- **Playback:** the player seeks to `start` and stops just before `end`, polling every 25ms because the
  browser's `timeupdate` event is too coarse.
- **Model sentences:** "Play the complete correct sentence" is available after answering.

### Comics
- **Data:** a comic is a list of panels, each panel an image plus its lines (speaker, script,
  transliteration, English, an emotion direction).
- **Reader:**
  - **Navigation:** panel by panel, read in the target language's direction.
  - **Audio:** each line can be played, or the whole scene played through.
  - **Role-play:** "speak as a character" plays everyone else and waits for you on your lines.
- **Bubble text:** must be checked word-for-word against the source artwork.

### Metronome ("Rhythm")
- **Vocabulary mode:**
  - Choose a chapter, then a bank (all banks are visible, not hidden in a dropdown).
  - Practise 8 words at a time.
  - Syllables come from the transliteration and get one click each, then the whole word is said in one
    smooth flow. The default tempo is the book's 60–80 BPM.
- **Speaker–Responder mode:** the prompt is played, then the student answers on the beat. Tempo 70–90 BPM.
- **Audio:** the metronome uses the Web Audio API, with clicks scheduled ahead of time, not `setInterval`.

### Progress and review
- **Progress:** stored in `localStorage`: completed lessons, completed activities, the last lesson visited.
  Every read and write is wrapped in try/catch, so the app still works if storage is blocked.
- **Spaced review:** Leitner boxes; a wrong answer goes back to box 1.
- **"Later in the book":** a badge decided by *chapter*, never by lesson index. A new student should never see
  Chapter 1 marked as "later".

### Walkthrough scene
An illustrated, clickable place (an apartment) whose objects each link to a vocabulary item. It is placed
inside the lesson whose grammar it practises, not as a separate section.

---

## 5. Content system (keep content out of code)

```
content/courses/<course-id>/
  course.json            title, language, dialect, chapter list
  chapters/<ch>.json     lessons → blocks (each with source page refs, flags)
  comics/<comic>.json    panels, lines, speakers, directions, image paths
  scenes/<scene>.json    walkthrough objects with vocab refs
  audio/manifest.json    recordings (key → src, status, speaker, start/end)
  audio/cast.json        which voice plays which character
public/comics/<course>/  panel images (webp, max 900px wide)
public/audio/<course>/   mp3s, levelled to −16 LUFS
```

- **Loading:** content is loaded with `import.meta.glob`. A second course (for example Volume Two) is a new
  folder, never mixed into the first.
- **Validation:** a validation script plus vitest tests check that every exercise's own approved answers pass
  its own checker.

---

## 6. Tech stack

- **Framework:** Vite, React 18 and TypeScript, with no UI library. All styles are one hand-written CSS file
  built on the tokens above.
- **Fonts:** self-hosted with `@fontsource` (Inter plus the target script's font).
- **Tests:** vitest for logic (answer checking, syllables, review scheduling), and Playwright screenshots at
  phone width (400×860) for visual checks.
- **Audio tools:** ffmpeg. Loudness is measured with `loudnorm`, then exact gain plus a limiter is applied,
  in two passes.

---

## 7. Rules the new app should keep

1. **Never fabricate:** no invented textbook content, recordings, playback or assessment results. If something
   is missing, show "No approved recording yet" or "No answer key in the book".
2. **The source is the truth:** preserve order, wording, answer keys and progression. Edit only *working copies*
   of source designs, never the originals.
3. **Generated voices are candidates:** label them until a human approves them, and never present them as
   native speakers.
4. **Pronunciation follows the transliteration:** when a voice model would read the script in a standard or
   wrong dialect, respell only the text *sent to the voice* so it matches the transliteration (for example ق
   read as a glottal stop). Keep the printed text unchanged on screen.
5. **Distinct, fitting voices:** each comic character has its own voice and an emotion direction per line.
   All files are loudness-matched so nobody sounds far away.
6. **Accessibility:**
   - Tap targets are at least 44px.
   - Focus is visible.
   - Text is never smaller than 0.7rem.
   - Script size is adjustable.
   - Contrast holds in both themes.
   - There is no horizontal scroll at phone width.

---

## 8. Practical lessons from building it

- **Comma pauses:** generating speech many words per request is about 5× cheaper than one request per word.
  But a comma inside a two-part entry ("x، y") also makes a pause, so split by matching pause length *and*
  expected word length, then re-record any outlier on its own.
- **Short clips:** these measure quieter after levelling, which is acceptable.
- **File limits:** static hosts can cap the number of files per publish or version, so pack small audio files
  into per-chapter files with offsets.
- **Grouping:** one-word tables in the book (each question word on its own) read better grouped as one set.
- **Extraction checks:** check extracted text against the source artwork, not against a neighbouring copy (a
  comic's bubble can differ from the dialogue page).

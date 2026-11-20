# Ordinary Day Arabic — Curriculum Content Format

Curriculum lives in `content/courses/<courseId>/` as JSON, separate from the app
code. You can correct an answer, swap a recording, or add a course (e.g. Volume
Two) without touching the interface.

```
content/courses/abv-vol1/
  course.json            course metadata + ordered chapter list + Canva sources
  chapters/front.json    front matter, introduction, pronunciation
  chapters/ch1.json … ch5.json
  chapters/glossary.json conversational-expressions + vocabulary glossaries
  scenes/apartment.json  apartment walkthrough scene data
  audio/manifest.json    approved recordings (teacher / native / generated-candidate)
  review-flags.md        generated list of suspected source errors / missing answers
```

## Source references (audit trail)

Every chapter, lesson, block, exercise and exercise item carries a `source`:

```json
{ "designId": "DAHaz00vw2w", "pages": [44, 45] }
```

`designId` is the Canva design (Volume One canonical = **"Volume 1 - Meal Ticket"
`DAHaz00vw2w`**). `pages` are Canva page numbers (1-based). In this design the
Canva page number equals the printed page number.

## Fidelity rules

1. **Verbatim.** Arabic, transliteration and English are copied exactly from Canva
   — including ʾ ʿ ṣ ḍ ṭ ẓ ḥ ā ī ū ē ō, shadda and any vowel marks. Do not
   normalise, "correct", or convert colloquial to MSA.
2. **No invention.** Nothing is written that is not in the source. If an exercise
   has no answer in the source, `answers` is `[]` and the item gets a flag
   `{ "kind": "missing-answer" }`.
3. **Flag, don't fix.** Suspected typos, mismatched Arabic/transliteration, or
   answer-key conflicts get `{ "kind": "suspected-error", "note": "…" }`; the
   source text is left untouched.
4. **Teacher-approved alternatives** that appear in the source (e.g. "or …",
   slashes, parentheses in the key) become additional entries in `answers`.

## Chapter file

```jsonc
{
  "id": "ch1",
  "number": 1,
  "titleAr": "شو اسمك؟",
  "titleTranslit": "shū ismak?",
  "titleEn": "What's Your Name?",
  "source": { "designId": "DAHaz00vw2w", "pages": [28, 74] },
  "lessons": [ /* Lesson */ ]
}
```

## Lesson

A lesson is one textbook section (Chapter Introduction, 1.1, Vocabulary Bank,
Putting It All Together, Final Translation Drill, Dialogue Discussion …), in
book order.

```jsonc
{
  "id": "ch1-1-1",            // unique, stable
  "code": "1.1",               // book section number or null
  "title": "Greetings & Basics",
  "kind": "intro|vocab|grammar|drill|dialogue|review|reference",
  "source": { "designId": "DAHaz00vw2w", "pages": [36, 39] },
  "blocks": [ /* Block */ ]
}
```

## Blocks (in book order)

| type        | fields |
|-------------|--------|
| `text`      | `heading?`, `paragraphs: string[]` (English explanation, verbatim; inline Arabic allowed) |
| `callout`   | `heading?`, `text` (tips, notes, "Say it out loud" boxes, cultural notes) |
| `examples`  | `heading?`, `items: Phrase[]` |
| `vocab`     | `id`, `heading`, `items: VocabItem[]` |
| `table`     | `heading?`, `columns: string[]`, `rows: string[][]` (verbatim cells) |
| `dialogue`  | `id`, `title`, `context?`, `lines: DialogueLine[]` |
| `image`     | `description` (what the illustration/comic shows), `caption?`, `kind: "illustration"|"comic"|"diagram"` |
| `exercise`  | see Exercise |

Every block has `source`.

```jsonc
// Phrase
{ "ar": "مرحبا", "translit": "marḥaba", "en": "Hello", "note": "optional" }

// VocabItem
{ "id": "v-ch1-marhaba", "ar": "مرحبا", "translit": "marḥaba", "en": "hello",
  "notes": "optional", "plural": { "ar": "…", "translit": "…" }, "gender": "m|f|null" }

// DialogueLine
{ "speaker": "Ahmad", "ar": "…", "translit": "…", "en": "…" }
```

## Exercise

```jsonc
{
  "type": "exercise",               // block type is always "exercise"
  "id": "ch1-ex-basics-drill",
  "exerciseType": "translate-to-arabic | translate-to-english | fill-blank | vocab-recall |
           transform | multiple-choice | matching | listening | speaker-responder |
           dialogue-roleplay | rhythm | discussion",
  "title": "Basics & Greetings Drill",
  "instructions": "verbatim instructions",
  "mode": "drill | conversation",   // drill = immediate feedback; conversation = after turn
  "source": { "designId": "DAHaz00vw2w", "pages": [40, 43] },
  "answerKeySource": { "designId": "DAHaz00vw2w", "pages": [43] },  // if separate
  "items": [ /* ExerciseItem */ ]
}
```

```jsonc
// ExerciseItem
{
  "id": "ch1-ex-basics-drill-1",
  "prompt": { "en": "What's your name? (to a man)", "ar": null, "translit": null },
  // fill-blank only: the Arabic sentence split around the blank(s), logical order
  "segments": [ { "text": "شو " }, { "blank": true } ],
  "translitSegments": [ { "text": "shū " }, { "blank": true } ],
  // approved answers (for fill-blank: just the blank's content)
  "answers": [ { "ar": "اسمك", "translit": "ismak" } ],
  // the complete correct Arabic response that is played/shown after success
  "model": { "ar": "شو اسمك؟", "translit": "shū ismak?", "en": "What's your name?" },
  "choices": [ /* multiple-choice/matching only: Phrase[] */ ],
  "explanation": "optional verbatim note from the key",
  "tags": ["greetings", "pronoun-suffix"],
  "flags": [ { "kind": "missing-answer|suspected-error|ambiguous", "note": "…" } ],
  "source": { "designId": "DAHaz00vw2w", "pages": [41] }
}
```

Speaker–responder items use `prompt` for the speaker line and `model` for the
expected response. Dialogue role-play exercises reference a `dialogueId` and a
`role` (speaker name) the student plays.

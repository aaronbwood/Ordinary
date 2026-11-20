# Comic format

Comics live in `content/courses/<course>/comics/<id>.json`. Panel images are cut
from the Canva page exports by `scripts/cut-comic-panels.py` into
`public/comics/<course>/p<page>-<n>.webp`, numbered in reading order
(rows top→bottom, panels right→left).

```jsonc
{
  "id": "ch1-tahas-cafe",
  "title": { "ar": "…", "translit": "…", "en": "Taha's Café" },
  "chapterId": "ch1",
  "lessonId": "ch1-putting-it-together",   // lesson the comic belongs to
  "dialogueId": "ch1-dlg-tahas-cafe",      // printed dialogue it illustrates
  "source": { "designId": "DAHaz00vw2w", "pages": [68, 69] },
  "characters": [
    { "name": "Taha", "description": "café owner; dark curly hair, beard, black shirt, green apron" }
  ],
  "panels": [
    {
      "id": "p68-1",
      "image": "comics/abv-vol1/p68-1.webp",
      "page": 68,
      "lines": [
        {
          "id": "ch1-tahas-cafe-1",
          "speaker": "Taha",
          "ar": "السلام عليكم!",              // EXACTLY as printed in the bubble
          "translit": "Is-salām ʿalēkum!",     // as printed in the bubble, else from the dialogue
          "en": "Peace be upon you!",          // from the printed dialogue
          "dialogueLine": 0,                    // index in the dialogue's lines[], or null
          "textFrom": "bubble",                 // "bubble" or "dialogue" for translit/en origin
          "direction": "[warmly]",              // optional performance direction for the voice (never shown)
          "flags": [ { "kind": "suspected-error", "note": "Bubble has هاي هي; dialogue has هاي هيّ" } ]
        }
      ],
      "caption": null                           // narration box text, if any
    }
  ]
}
```

Rules
- The bubble text is the source for what students see and hear in the comic
  (author's decision). Copy it verbatim, including harakat and punctuation.
- Where a bubble differs from the printed dialogue line, keep the bubble text and
  add a flag describing the difference. Never change either text.
- Panels with no speech keep `lines: []`.
- Several bubbles in one panel → several lines, in reading order (right/top first).

// Text normalisation used ONLY for comparing a student's response with approved
// answers. Displayed text is never normalised — the source spelling is shown.

const HARAKAT = /[ً-ْٰـۡ]/g; // tanwin, fatha…sukun, dagger alif, tatweel
const PUNCT = /[.,!?؟،؛:;"'“”‘’()\[\]{}«»\-–—…/\\|*_~]/g;

export function hasArabic(s: string | null | undefined): boolean {
  return !!s && /[؀-ۿ]/.test(s);
}

/** Loose Arabic normalisation for matching speech-recognition / typed input. */
const BIDI = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function normalizeArabic(s: string): string {
  return s
    .normalize('NFC')
    .replace(BIDI, '')
    .replace(HARAKAT, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    // single-letter proclitics (و ب ل ف ك) written apart from their word: join them
    .replace(/(^| )([وبلفك]) (?=\S)/g, '$1$2')
    // لـ + الـ is written لل
    .replace(/(^| )(و?)لال/g, '$1$2لل')
    .trim();
}

/** Loose transliteration normalisation (typed answers in Latin script). */
export function normalizeTranslit(s: string): string {
  return s
    .replace(BIDI, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip macrons, dots below, etc.
    .replace(/[ʾʿʼʻ'’‘`]/g, '')
    .replace(/[-‐]/g, ' ')
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Word-level diff: which expected words are missing / which given words are extra. */
export function wordDiff(expected: string, given: string) {
  const e = expected.split(' ').filter(Boolean);
  const g = given.split(' ').filter(Boolean);
  const missing = e.filter((w) => !g.includes(w));
  const extra = g.filter((w) => !e.includes(w));
  return { missing, extra };
}

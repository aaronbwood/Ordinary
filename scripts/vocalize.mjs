// Fully vowels an Arabic line from its transliteration, so a voice model reads the vowels the
// book's transliteration gives instead of guessing. Used only for the text sent to the voice.
// Aligns the Arabic letters with the transliteration (ignoring spaces, hyphens and punctuation),
// then writes fatha/kasra/damma/sukun/shadda from the transliteration's vowels and doubled consonants.
// ō and ē (Levantine long vowels with no Arabic mark) are left unmarked. Falls back to the input
// unchanged when the alignment is poor.

const HARAKAT = /[ً-ْٰـ]/g;
const FATHA = 'َ', KASRA = 'ِ', DAMMA = 'ُ', SUKUN = 'ْ', SHADDA = 'ّ';

// transliteration consonant → Arabic letters it can stand for
const CONS = {
  b: 'بپ', p: 'بپ', t: 'تطثة', ṭ: 'طت', th: 'ث', j: 'جچ', g: 'جقگ', ḥ: 'ح', kh: 'خ', d: 'دضذ', ḍ: 'ضد', dh: 'ذ',
  r: 'ر', z: 'زذظ', ẓ: 'ظزضص', s: 'سصث', ṣ: 'صس', sh: 'ش', ch: 'چ', ʿ: 'ع', gh: 'غ', f: 'فڤ', v: 'ڤف', q: 'ق',
  k: 'كک', l: 'ل', m: 'م', n: 'ن', h: 'هة', w: 'و', y: 'يى', ʾ: 'ءأإؤئقآ',
};
const VOW = { a: 'a', e: 'i', i: 'i', o: 'u', u: 'u', ā: 'A', ē: 'E', ī: 'I', ō: 'O', ū: 'U' };

function tokenizeTranslit(tr) {
  const s = tr.toLowerCase().normalize('NFC').replace(/[’']/g, 'ʾ').replace(/[ʻ‘]/g, 'ʿ').replace(/-/g, ''); // ish-shams → ishshams: the doubled sh is a shadda
  const out = [];
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2);
    let c = null;
    if (['th', 'kh', 'dh', 'sh', 'gh', 'ch'].includes(two)) c = two;
    else if (CONS[s[i]]) c = s[i];
    if (c) {
      // doubled consonant (shsh, ll, ʾʾ) → one geminate unit
      const next = s.slice(i + c.length, i + 2 * c.length);
      if (next === c) { out.push({ k: 'C', c, gem: true }); i += 2 * c.length; continue; }
      out.push({ k: 'C', c }); i += c.length; continue;
    }
    if (VOW[s[i]]) { out.push({ k: 'V', v: VOW[s[i]] }); i++; continue; }
    i++; // spaces, hyphens, punctuation
  }
  return out;
}

const isLetter = (ch) => /[ء-يپچڤگک]/.test(ch);

/** cost of matching Arabic letter `a` with translit unit `u` (Infinity = impossible) */
function matchCost(a, u, initial) {
  if (u.k === 'C') {
    if (CONS[u.c].includes(a)) return 0;
    if (a === 'آ' && u.c === 'ʾ') return 0;
    return Infinity;
  }
  // long vowels written with a letter
  if (u.v === 'A' && 'اىآ'.includes(a)) return 0;
  if ((u.v === 'I' || u.v === 'E') && a === 'ي') return 0;
  if ((u.v === 'U' || u.v === 'O') && a === 'و') return 0;
  if ('ae'.includes(u.v) || u.v === 'a' || u.v === 'i') { if (a === 'ة' || a === 'ى') return 0.1; }
  // initial alif / hamza carrying a short vowel
  if ('اأإ'.includes(a) && 'aiu'.includes(u.v)) return initial ? 0.2 : (a === 'ا' && u.v === 'a' ? 0.3 : Infinity);
  if (a === 'ا' && u.v === 'A') return 0;
  return Infinity;
}

export function vocalize(ar, tr) {
  // keep the word Allah as written: the reading is fixed
  if (/^\s*الله\s*$/.test(ar.replace(HARAKAT, ''))) return ar;
  const base = ar.replace(HARAKAT, '');
  // tanween written in the book (أهلًا) is kept: it carries the final -n
  const tanween = new Map(); { let bi = -1; for (const ch of ar) { if (/[\u064B-\u064D]/.test(ch)) { if (bi >= 0) tanween.set(bi, ch); } else if (!HARAKAT.test(ch)) bi++; HARAKAT.lastIndex = 0; } }
  const letters = [];
  for (let i = 0; i < base.length; i++) if (isLetter(base[i])) letters.push(i);
  const U = tokenizeTranslit(tr);
  const n = letters.length, m = U.length;
  const initialAt = letters.map((p) => p === 0 || !isLetter(base[p - 1]));
  const finalAt = letters.map((p) => p === base.length - 1 || !isLetter(base[p + 1]));
  if (!n || !m) return ar;
  // DP: D[i][j] best cost aligning first i letters with first j units
  const INF = 1e9;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
  const B = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
  D[0][0] = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    const d = D[i][j]; if (d >= INF) continue;
    if (i < n && j < m) { const c = matchCost(base[letters[i]], U[j], initialAt[i]); if (c < INF && d + c < D[i + 1][j + 1]) { D[i + 1][j + 1] = d + c; B[i + 1][j + 1] = 1; } }
    if (j < m) { const c = U[j].k === 'V' ? (U[j].v === U[j].v.toLowerCase() ? 0 : 0.6) : 1.5; if (d + c < D[i][j + 1]) { D[i][j + 1] = d + c; B[i][j + 1] = 2; } }
    if (i < n) { const a = base[letters[i]]; const c = a === 'ا' || a === 'ل' || a === 'و' || a === 'ي' || a === 'ه' ? 0.8 : 2; if (d + c < D[i + 1][j]) { D[i + 1][j] = d + c; B[i + 1][j] = 3; } }
  }
  if (D[n][m] > Math.max(3, n * 0.25)) { vocalize.failed = true; return ar; } // poor alignment: leave as is
  vocalize.failed = false;
  // backtrack → for each letter, the unit it matched (or null), and units in between
  const match = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const b = B[i][j];
    if (b === 1) { match[i - 1] = j - 1; i--; j--; } else if (b === 2) j--; else i--;
  }
  const marks = new Array(n).fill('');
  for (let li = 0; li < n; li++) {
    const ui = match[li]; if (ui === null) continue;
    const u = U[ui]; const a = base[letters[li]];
    if (u.k === 'V') { if (initialAt[li] && 'اأإ'.includes(a) && 'aiu'.includes(u.v)) marks[li] = { a: FATHA, i: KASRA, u: DAMMA }[u.v]; continue; }
    let mk = u.gem ? SHADDA : '';
    // vowel after this consonant: next unit (if it isn't matched to a consonant letter)
    const nu = U[ui + 1];
    const nextLetterMatch = li + 1 < n ? match[li + 1] : null;
    if (finalAt[li]) {
      // a word's last letter: a following short vowel is this word's own final vowel (inta) unless the
      // next word's first letter carries it (min il-…)
      if (nu && nu.k === 'V' && 'aiu'.includes(nu.v) && match[li + 1] !== ui + 1 && a !== 'ة' && a !== 'ه') mk += { a: FATHA, i: KASRA, u: DAMMA }[nu.v];
      marks[li] = mk; continue;
    }
    if (nu && nu.k === 'V') {
      if ('aiu'.includes(nu.v)) mk += { a: FATHA, i: KASRA, u: DAMMA }[nu.v];
      else if (nu.v === 'A') mk += FATHA;
      else if (nu.v === 'I') mk += KASRA;
      else if (nu.v === 'U') mk += DAMMA;
      // ō / ē: no mark
    } else if (nu && nu.k === 'C' && li + 1 < n && !u.gem) {
      mk += SUKUN;
    }
    if (a === 'ة') mk = '';
    marks[li] = mk;
    void nextLetterMatch;
  }
  let out = '';
  let li = 0;
  const allah = /الله/g; let am; const keep = new Set();
  while ((am = allah.exec(base))) for (let k = am.index; k < am.index + 4; k++) keep.add(k);
  for (let i = 0; i < base.length; i++) {
    out += base[i];
    if (li < n && letters[li] === i) { if (tanween.has(i)) out += tanween.get(i); else if (!keep.has(i)) out += marks[li] || ''; li++; }
  }
  return out;
}

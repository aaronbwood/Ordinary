// Splits a transliterated word into syllables for one-syllable-per-click
// metronome practice (SIFL, p.82). This is a beat guide generated from the
// book's transliteration; a vocab item may override it with `syllables`.

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ā', 'ē', 'ī', 'ō', 'ū', 'á', 'é', 'í', 'ó', 'ú']);
const DIGRAPHS = ['sh', 'kh', 'gh', 'th', 'dh'];

function units(word: string): string[] {
  const s = word.normalize('NFC');
  const out: string[] = [];
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2).toLowerCase();
    if (DIGRAPHS.includes(two)) {
      out.push(s.slice(i, i + 2));
      i += 2;
      continue;
    }
    // a letter followed by combining marks (ṣ written as s + dot below)
    let j = i + 1;
    while (j < s.length && /[̀-ͯ]/.test(s[j])) j++;
    out.push(s.slice(i, j));
    i = j;
  }
  return out;
}

const isV = (u: string) => VOWELS.has(u.normalize('NFD')[0].toLowerCase()) && !/[̣̱]/.test(u.normalize('NFD'));

export function syllabifyWord(word: string): string[] {
  const u = units(word.replace(/[^\p{L}\p{M}ʾʿ'’]/gu, ''));
  if (!u.length) return [];
  // merge doubled vowels (aa → one long nucleus)
  const nuclei: number[] = [];
  u.forEach((x, i) => {
    if (isV(x) && !(i > 0 && isV(u[i - 1]))) nuclei.push(i);
  });
  if (nuclei.length <= 1) return [u.join('')];
  const cuts: number[] = [];
  for (let k = 0; k < nuclei.length - 1; k++) {
    let a = nuclei[k] + 1;
    while (a < u.length && isV(u[a])) a++; // end of this vowel run
    const b = nuclei[k + 1]; // start of next vowel
    const cons = b - a;
    // one consonant starts the next syllable; with a cluster the first stays behind
    cuts.push(cons <= 1 ? a : b - 1);
  }
  const out: string[] = [];
  let start = 0;
  for (const c of cuts) {
    out.push(u.slice(start, c).join(''));
    start = c;
  }
  out.push(u.slice(start).join(''));
  return out.filter(Boolean);
}

/** Syllables of a whole phrase, keeping word boundaries ("il-bēt" → ["il", "bēt"]). */
export function syllabify(translit: string): string[] {
  return translit
    .split(/[\s\-‐/]+/)
    .filter(Boolean)
    .flatMap(syllabifyWord);
}

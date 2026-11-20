// Builds the text sent to the voice model so pronunciation follows the
// book's transliteration (the screen still shows the printed Arabic).
//   ق  → أ/ء where the transliteration has ʾ (urban Palestinian-Jordanian), kept where it has q
//   ذ  → ز / د and ث → ت / س where the transliteration has z/d or t/s
//   word-initial bare ا → إ / أ / أُ by the transliteration's first vowel (امي → إمي "immi")
const HARAKAT = /[ً-ْٰ]/;
const PREFIX = /^(و|ب|ل|ف|ه|ع)?(ال|ل)?/; // clitics before the stem

function respellWord(ar, tr) {
  if (!tr) return ar;
  const t = tr.toLowerCase();
  let out = '';
  const chars = [...ar];
  const stemStart = (ar.match(PREFIX)?.[0] ?? '').length;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === 'ق' && !t.includes('q') && /[ʾ'’]/.test(t)) {
      // at the start of the stem write أ, elsewhere ء
      out += i <= stemStart ? 'أ' : 'ء';
    } else if (c === 'ذ' && !/(dh|ð)/.test(t)) {
      out += /z/.test(t) ? 'ز' : /d/.test(t) ? 'د' : c;
    } else if (c === 'ث' && !/th/.test(t)) {
      out += /t/.test(t) ? 'ت' : /s/.test(t) ? 'س' : c;
    } else if (c === 'ا' && i === 0 && !ar.startsWith('ال') && !HARAKAT.test(chars[1] ?? '') && /^[iu]/.test(t.replace(/^[^a-zāīūēō]+/, ''))) {
      out += t.replace(/^[^a-zāīūēō]+/, '')[0] === 'i' ? 'إ' : 'أُ';
    } else out += c;
  }
  return out;
}

export function pronounce(ar, translit) {
  if (!translit) return ar;
  const aw = ar.split(/\s+/).filter(Boolean);
  const tw = translit.split(/\s+/).filter(Boolean);
  if (aw.length === tw.length) return aw.map((w, i) => respellWord(w, tw[i])).join(' ');
  // word counts differ: apply the whole-line rule for ق only
  if (!/q/i.test(translit) && /[ʾ'’]/.test(translit)) return ar.replace(/(^|\s|ال|هال|بال|وال)ق/g, '$1أ').replace(/ق/g, 'ء');
  return ar;
}

// Answer checking. Deliberately separate from speech recognition (src/speech)
// and from pronunciation (not assessed in this version).

import type { Answer, ExerciseItem, Segment } from '../content/types';
import { hasArabic, levenshtein, normalizeArabic, normalizeTranslit, wordDiff } from './arabic';

export type Verdict = 'correct' | 'close' | 'incorrect' | 'unclear' | 'no-key';

export interface CheckResult {
  verdict: Verdict;
  matched?: Answer;
  closest?: Answer;
  missing?: string[];
  extra?: string[];
  note?: string;
}

export interface ResponseInput {
  text: string;
  via: 'speech' | 'typed';
  confidence?: number; // speech recogniser confidence 0..1 when available
}

/** Threshold below which a speech transcript is treated as unreliable, not wrong. */
export const UNCLEAR_CONFIDENCE = 0.45;

/** Build the complete set of acceptable full responses for an item. */
export function acceptableResponses(item: ExerciseItem): Answer[] {
  const answers = item.answers ?? [];
  if (item.segments?.some((s) => s.blank)) {
    // Fill-blank: accept the blank alone OR the full completed sentence.
    const full: Answer[] = answers.map((a) => ({
      ar: a.ar ? fillSegments(item.segments!, a.blanks?.length ? a.blanks.map((b) => b.ar ?? '') : a.ar) : null,
      translit:
        a.translit && item.translitSegments
          ? fillSegments(item.translitSegments, a.blanks?.length ? a.blanks.map((b) => b.translit ?? '') : a.translit)
          : null,
    }));
    return [...answers, ...full];
  }
  const list = [...answers];
  if (item.model && (item.model.ar || item.model.translit) && !answers.length) {
    // model is the approved complete response when no separate answers list exists
    list.push({ ar: item.model.ar ?? null, translit: item.model.translit ?? null });
  }
  return list;
}

/** Split an answer into per-blank fills. Uses `blanks` when the key provides them. */
export function blankFills(segments: Segment[], fill: string | string[]): string[] {
  if (Array.isArray(fill)) return fill;
  const n = segments.filter((s) => s.blank).length;
  if (fill.includes('|')) return fill.split(/\s*\|\s*/);
  // whole answer in the first blank; remaining blanks empty (joined text stays correct)
  return [fill, ...Array(Math.max(0, n - 1)).fill('')];
}

export function fillSegments(segments: Segment[], fill: string | string[]): string {
  const fills = blankFills(segments, fill);
  let i = 0;
  // adjacent blanks with no text between them are separate words
  return segments
    .map((s, k) => (s.blank ? (k > 0 && segments[k - 1].blank ? ' ' : '') + (fills[i++] ?? '') : s.text ?? ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The complete correct sentence to show and play after an attempt. */
export function completeModel(item: ExerciseItem, matched?: Answer) {
  if (item.model?.ar || item.model?.translit) return item.model;
  const a = matched ?? item.answers?.[0];
  if (item.segments && a?.ar) {
    return {
      ar: fillSegments(item.segments, a.blanks?.length ? a.blanks.map((b) => b.ar ?? '') : a.ar),
      translit:
        item.translitSegments && a.translit
          ? fillSegments(item.translitSegments, a.blanks?.length ? a.blanks.map((b) => b.translit ?? '') : a.translit)
          : null,
      en: item.prompt?.en ?? null,
    };
  }
  return a ? { ar: a.ar ?? null, translit: a.translit ?? null, en: item.prompt?.en ?? null } : null;
}

export function checkResponse(item: ExerciseItem, input: ResponseInput): CheckResult {
  const text = input.text.trim();
  if (input.via === 'speech') {
    if (!text) return { verdict: 'unclear', note: 'No speech was recognised.' };
    if (input.confidence != null && input.confidence > 0 && input.confidence < UNCLEAR_CONFIDENCE) {
      // Low recogniser confidence: do not mark wrong; let the student retry/correct.
      const r = compare(item, text);
      if (r.verdict === 'correct') return r;
      return { ...r, verdict: 'unclear', note: 'The recording was unclear, so it was not marked wrong.' };
    }
  }
  if (!text) return { verdict: 'incorrect', note: 'No answer given.' };
  return compare(item, text);
}

/**
 * Check a submission that may carry several recogniser alternatives; the best
 * verdict wins (correct > close > incorrect), so recogniser spelling choices
 * don't count against the student.
 */
export function checkSubmission(
  item: ExerciseItem,
  sub: { text: string; via: 'speech' | 'typed'; confidence?: number; alternatives?: string[] },
  target: 'ar' | 'en' = 'ar',
): CheckResult {
  if (target === 'en') return compareEnglish(item, sub.text);
  const texts = [sub.text, ...(sub.alternatives ?? [])].filter((t, i, a) => t && a.indexOf(t) === i);
  if (!texts.length) return checkResponse(item, { text: '', via: sub.via, confidence: sub.confidence });
  const order: Verdict[] = ['correct', 'close', 'unclear', 'incorrect', 'no-key'];
  let best: CheckResult | null = null;
  for (const t of texts) {
    const r = checkResponse(item, { text: t, via: sub.via, confidence: t === sub.text ? sub.confidence : undefined });
    if (!best || order.indexOf(r.verdict) < order.indexOf(best.verdict)) best = r;
    if (r.verdict === 'correct') break;
  }
  return best!;
}

function normEn(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function compareEnglish(item: ExerciseItem, text: string): CheckResult {
  const opts = [...(item.answers ?? []).map((a) => a.en), item.model?.en].filter(Boolean) as string[];
  if (!opts.length) return { verdict: 'no-key', note: 'No approved English answer in the source yet.' };
  const g = normEn(text);
  if (!g) return { verdict: 'incorrect', note: 'No answer given.' };
  let best = { d: Infinity, e: '' };
  for (const o of opts.flatMap((o) => o.split(/\s+\/\s+/))) {
    // accept with or without the parenthetical part of the key
    for (const e of [normEn(o), normEn(o.replace(/\(.*?\)/g, ''))]) {
      if (e === g) return { verdict: 'correct', matched: { en: o } };
      const d = levenshtein(e, g);
      if (d < best.d) best = { d, e: o };
    }
  }
  return { verdict: best.d / Math.max(best.e.length, 1) <= 0.2 ? 'close' : 'incorrect', closest: { en: best.e } };
}

function compare(item: ExerciseItem, text: string): CheckResult {
  const options = acceptableResponses(item);
  if (!options.length) return { verdict: 'no-key', note: 'No approved answer in the source yet.' };

  const arabic = hasArabic(text);
  const given = arabic ? normalizeArabic(text) : normalizeTranslit(text);
  let best: { a: Answer; d: number; exp: string } | null = null;

  for (const a of options) {
    const raw = arabic ? a.ar : a.translit;
    if (!raw) continue;
    // a key may contain alternatives separated by " / "
    for (const alt of raw.split(/\s+\/\s+|\s+or\s+/)) {
      const exp = arabic ? normalizeArabic(alt) : normalizeTranslit(alt);
      if (!exp) continue;
      if (exp === given) return { verdict: 'correct', matched: a };
      const d = levenshtein(exp, given);
      if (!best || d < best.d) best = { a, d, exp };
    }
  }
  if (!best) {
    return {
      verdict: 'no-key',
      note: arabic
        ? 'No approved Arabic-script answer to compare with.'
        : 'No approved transliteration to compare with. Try answering in Arabic script.',
    };
  }
  const { missing, extra } = wordDiff(best.exp, given);
  const ratio = best.d / Math.max(best.exp.length, 1);
  const verdict: Verdict = best.d <= 2 || ratio <= 0.15 ? 'close' : 'incorrect';
  return { verdict, closest: best.a, missing, extra };
}

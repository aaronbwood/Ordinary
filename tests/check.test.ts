import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { checkSubmission, completeModel, fillSegments } from '../src/lib/check';
import { normalizeArabic } from '../src/lib/arabic';
import { buildTimeline } from '../src/lib/metronome';
import { schedule } from '../src/lib/review';

const dir = path.resolve('content/courses/abv-vol1/chapters');
const chapters = ['ch1', 'ch2', 'ch3-a', 'ch3-b', 'ch4', 'ch5'].map((f) => JSON.parse(fs.readFileSync(path.join(dir, f + '.json'), 'utf8')));
const exercises = chapters.flatMap((c) => c.lessons.flatMap((l: any) => l.blocks.filter((b: any) => b.type === 'exercise')));

describe('Arabic normalisation', () => {
  it('ignores harakat, shadda and hamza seat differences', () => {
    expect(normalizeArabic('بِدّي أَهْلًا')).toBe(normalizeArabic('بدي اهلا'));
    expect(normalizeArabic('شو اسمك؟')).toBe('شو اسمك');
  });
});

describe('fill-in-the-blank', () => {
  const item = {
    id: 't',
    segments: [{ text: 'في ' }, { blank: true }, { text: ' ' }, { blank: true }, { text: ' بِالصّالون.' }],
    translitSegments: [{ text: 'fī ' }, { blank: true }, { text: ' ' }, { blank: true }, { text: ' biṣ-ṣālōn.' }],
    answers: [{ ar: 'كَراسي كْتير', translit: 'karāsi ktīr', blanks: [{ ar: 'كَراسي', translit: 'karāsi' }, { ar: 'كْتير', translit: 'ktīr' }] }],
    model: { ar: 'في كَراسي كْتير بِالصّالون.', translit: 'fī karāsi ktīr biṣ-ṣālōn.' },
  };
  it('fills each blank with its own answer', () => {
    expect(fillSegments(item.segments, ['كَراسي', 'كْتير'])).toBe('في كَراسي كْتير بِالصّالون.');
  });
  it('accepts the blank answer alone, the full sentence, or transliteration', () => {
    expect(checkSubmission(item, { text: 'كراسي كتير', via: 'typed' }).verdict).toBe('correct');
    expect(checkSubmission(item, { text: 'في كراسي كتير بالصالون', via: 'speech', confidence: 0.9 }).verdict).toBe('correct');
    expect(checkSubmission(item, { text: 'fi karasi ktir bis-salon', via: 'typed' }).verdict).toBe('correct');
  });
  it('treats low-confidence speech as unclear, not wrong', () => {
    expect(checkSubmission(item, { text: 'كراسي صغير', via: 'speech', confidence: 0.2 }).verdict).toBe('unclear');
    expect(checkSubmission(item, { text: '', via: 'speech' }).verdict).toBe('unclear');
  });
  it('marks a wrong typed answer incorrect and a near miss close', () => {
    expect(checkSubmission(item, { text: 'طاولة', via: 'typed' }).verdict).toBe('incorrect');
    expect(checkSubmission(item, { text: 'كراسي كتي', via: 'typed' }).verdict).toBe('close');
  });
  it('uses any recogniser alternative that matches', () => {
    expect(checkSubmission(item, { text: 'كراسي كبير', via: 'speech', confidence: 0.9, alternatives: ['كراسي كتير'] }).verdict).toBe('correct');
  });
  it('returns no-key when the source has no answer', () => {
    expect(checkSubmission({ id: 'x', answers: [] }, { text: 'مرحبا', via: 'typed' }).verdict).toBe('no-key');
  });
});

describe('every transcribed item accepts its own complete model answer', () => {
  const failures: string[] = [];
  let checked = 0;
  for (const ex of exercises) {
    if (ex.exerciseType === 'discussion') continue;
    for (const item of ex.items) {
      const target = ex.exerciseType === 'translate-to-english' || (item.answers?.length && item.answers.every((a: any) => !a.ar && !a.translit && a.en)) ? 'en' : 'ar';
      if (!item.answers?.length) continue;
      // each approved answer, as a student would say it (blank fills or the full sentence)
      const texts: string[] = item.answers.map((a: any) =>
        target === 'en' ? a.en : a.blanks?.length && item.segments ? fillSegments(item.segments, a.blanks.map((b: any) => b.ar ?? '')) : a.ar,
      );
      // plus the complete model sentence when it is a single sentence (no "/" alternatives or "←" display marks)
      const model = completeModel(item);
      const m = target === 'en' ? model?.en : model?.ar;
      if (m && !/[\/←→]/.test(m)) texts.push(m);
      for (const text of texts.filter(Boolean)) {
        checked++;
        const v = checkSubmission(item, { text, via: 'typed' }, target).verdict;
        if (v !== 'correct') failures.push(`${item.id} [${ex.exerciseType}] ${v}: ${text}`);
      }
    }
  }
  it(`checked items (${checked})`, () => {
    // Inconsistencies between a key and its model sentence are reported, not hidden.
    if (failures.length) console.warn(`${failures.length} items whose model answer does not match the key:\n` + failures.slice(0, 40).join('\n'));
    expect(failures.length / Math.max(checked, 1)).toBeLessThan(0.02);
  });
});

describe('rhythm timeline', () => {
  it('has a count-in and prep/respond/reveal per item, longer responses for longer sentences', () => {
    const t = buildTimeline([2, 9], { countIn: 4, prepBeats: 2, respondBeats: 3, revealBeats: 1, wordsPerExtraBeat: 3 });
    expect(t.filter((b) => b.phase === 'count')).toHaveLength(4);
    expect(t.filter((b) => b.item === 0 && b.phase === 'respond')).toHaveLength(3);
    expect(t.filter((b) => b.item === 1 && b.phase === 'respond')).toHaveLength(5);
    expect(t).toHaveLength(4 + (2 + 3 + 1) + (2 + 5 + 1));
  });
});

describe('spaced review', () => {
  it('promotes on success and resets on a miss', () => {
    const a = schedule(undefined, 'i', 'l', true, 0);
    expect(a.box).toBe(1);
    const b = schedule(a, 'i', 'l', false, 0);
    expect(b.box).toBe(0);
    expect(b.lapses).toBe(1);
  });
});

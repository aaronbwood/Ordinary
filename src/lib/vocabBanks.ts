import type { Course, SourceRef, VocabItem } from '../content/types';
import { flatLessons } from '../content/loader';

export interface VocabBank {
  key: string; // the vocab block id (or a merged id for grouped one-word banks)
  memberKeys: string[]; // the vocab block ids it covers
  heading: string;
  chapter: number;
  chapterTitle?: string;
  chapterTitleAr?: string;
  lessonId: string;
  lessonTitle: string;
  lessonIndex: number;
  items: VocabItem[];
  source?: SourceRef;
}

/**
 * Every vocabulary bank in the course, in book order. The book prints each question word
 * (mīn, shū, wēn…) as its own one-word table; consecutive one-word tables in the same
 * lesson are shown together as one bank so they can be practised as a set.
 */
export function vocabBanks(course: Course): VocabBank[] {
  const out: VocabBank[] = [];
  for (const r of flatLessons(course)) {
    let run: VocabBank | null = null;
    r.lesson.blocks.forEach((b: any, i: number) => {
      if (b.type !== 'vocab') return; // notes between the one-word tables don't break the group
      const items = (b.items as VocabItem[]).filter((v) => v.ar);
      if (!items.length) return;
      const base: VocabBank = {
        key: b.id ?? `${r.lesson.id}:${i}`,
        memberKeys: [b.id ?? `${r.lesson.id}:${i}`],
        heading: b.heading ?? r.lesson.title,
        chapter: r.chapter.number,
        chapterTitle: r.chapter.titleEn,
        chapterTitleAr: r.chapter.titleAr,
        lessonId: r.lesson.id,
        lessonTitle: r.lesson.title,
        lessonIndex: r.index,
        items,
        source: b.source,
      };
      if (items.length === 1) {
        if (run) { run.items.push(...items); run.memberKeys.push(base.key); return; }
        run = { ...base, key: `${base.key}+`, memberKeys: [base.key], heading: groupHeading(base.heading), items: [...items] };
        out.push(run);
        return;
      }
      run = null;
      out.push(base);
    });
  }
  return out;
}

function groupHeading(first: string) {
  // "Who? — mīn | مين" → "Question Words"
  return /\?/.test(first) ? 'Question Words' : first;
}

/** The bank a link points at: by its own key or by any vocab block it covers. */
export function findBank<T extends { key: string; memberKeys: string[] }>(banks: T[], key: string | null | undefined): T | undefined {
  if (!key) return undefined;
  return banks.find((b) => b.key === key) ?? banks.find((b) => b.memberKeys.includes(key));
}

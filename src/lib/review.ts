// Spaced review (Leitner boxes) over items the student has already studied.

export interface ReviewCard {
  itemId: string;
  lessonId: string;
  box: number; // 0..5
  due: number; // epoch ms
  lapses: number;
  lastVerdict?: string;
}

const DAY = 24 * 60 * 60 * 1000;
export const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];

export function schedule(card: ReviewCard | undefined, itemId: string, lessonId: string, correct: boolean, now = Date.now()): ReviewCard {
  const c: ReviewCard = card ?? { itemId, lessonId, box: 0, due: now, lapses: 0 };
  if (correct) {
    const box = Math.min(c.box + 1, INTERVALS.length - 1);
    return { ...c, box, due: now + INTERVALS[box], lastVerdict: 'correct' };
  }
  // missed: back to box 0, due again within the session
  return { ...c, box: 0, due: now + 60 * 1000, lapses: c.lapses + 1, lastVerdict: 'incorrect' };
}

export function dueCards(cards: Record<string, ReviewCard>, now = Date.now()): ReviewCard[] {
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.box - b.box || a.due - b.due);
}

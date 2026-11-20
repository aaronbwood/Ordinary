import { useSyncExternalStore } from 'react';
import { schedule, type ReviewCard } from '../lib/review';

// Progress is stored per course so Volume Two never mixes with Volume One.

export interface ItemResult {
  attempts: number;
  correct: number;
  last: string; // verdict
  at: number;
}

export interface CourseProgress {
  lastLessonId?: string;
  lastPath?: string;
  completedLessons: Record<string, number>;
  completedActivities: Record<string, number>; // exercise ids, scene tasks, rhythm rounds
  items: Record<string, ItemResult>;
  review: Record<string, ReviewCard>;
}

export interface Settings {
  showTranslit: boolean;
  showEnglish: boolean;
  autoPlayModel: boolean;
  allowGeneratedVoice: boolean; // browser TTS, unreviewed — off by default
  arabicSize: number; // rem
}

const DEFAULT_SETTINGS: Settings = {
  showTranslit: true,
  showEnglish: false,
  autoPlayModel: true,
  allowGeneratedVoice: false,
  arabicSize: 1.9,
};

const empty = (): CourseProgress => ({ completedLessons: {}, completedActivities: {}, items: {}, review: {} });

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress lives for this session only */
  }
}

const listeners = new Set<() => void>();
const cache = new Map<string, any>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const pKey = (courseId: string) => `oda:progress:${courseId}`;
const S_KEY = 'oda:settings';

export function getProgress(courseId: string): CourseProgress {
  const k = pKey(courseId);
  if (!cache.has(k)) cache.set(k, load(k, empty()));
  return cache.get(k);
}

function setProgress(courseId: string, fn: (p: CourseProgress) => CourseProgress) {
  const k = pKey(courseId);
  const next = fn(getProgress(courseId));
  cache.set(k, next);
  save(k, next);
  emit();
}

export function useProgress(courseId: string) {
  return useSyncExternalStore(subscribe, () => getProgress(courseId));
}

export function getSettings(): Settings {
  if (!cache.has(S_KEY)) cache.set(S_KEY, load(S_KEY, DEFAULT_SETTINGS));
  return cache.get(S_KEY);
}
export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings);
}
export function updateSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch };
  cache.set(S_KEY, next);
  save(S_KEY, next);
  emit();
}

export const progress = {
  visit(courseId: string, lessonId: string, path: string) {
    setProgress(courseId, (p) => ({ ...p, lastLessonId: lessonId, lastPath: path }));
  },
  setPath(courseId: string, path: string) {
    setProgress(courseId, (p) => ({ ...p, lastPath: path }));
  },
  completeLesson(courseId: string, lessonId: string) {
    setProgress(courseId, (p) => ({ ...p, completedLessons: { ...p.completedLessons, [lessonId]: Date.now() } }));
  },
  completeActivity(courseId: string, activityId: string) {
    setProgress(courseId, (p) => ({
      ...p,
      completedActivities: { ...p.completedActivities, [activityId]: Date.now() },
    }));
  },
  recordItem(courseId: string, itemId: string, lessonId: string, verdict: string) {
    // 'unclear' and 'no-key' do not count as right or wrong
    if (verdict === 'unclear' || verdict === 'no-key') return;
    const correct = verdict === 'correct';
    setProgress(courseId, (p) => {
      const prev = p.items[itemId] ?? { attempts: 0, correct: 0, last: '', at: 0 };
      return {
        ...p,
        items: {
          ...p.items,
          [itemId]: { attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0), last: verdict, at: Date.now() },
        },
        review: { ...p.review, [itemId]: schedule(p.review[itemId], itemId, lessonId, correct) },
      };
    });
  },
  reset(courseId: string) {
    setProgress(courseId, () => empty());
  },
};

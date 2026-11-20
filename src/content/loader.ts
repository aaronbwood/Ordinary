import type { Block, Chapter, Course, CourseMeta, Exercise, Lesson, Scene, AudioRecording } from './types';

const courseFiles = import.meta.glob('../../content/courses/*/course.json', { eager: true, import: 'default' });
const chapterFiles = import.meta.glob('../../content/courses/*/chapters/*.json', { eager: true, import: 'default' });
const sceneFiles = import.meta.glob('../../content/courses/*/scenes/*.json', { eager: true, import: 'default' });
const audioFiles = import.meta.glob('../../content/courses/*/audio/manifest.json', { eager: true, import: 'default' });

const BLOCK_TYPES = new Set(['text', 'callout', 'examples', 'vocab', 'table', 'dialogue', 'image', 'exercise', 'scene']);

function courseIdOf(path: string) {
  return path.split('/courses/')[1].split('/')[0];
}

/** Accept both `{type:"exercise", exerciseType}` and legacy `{type:"fill-blank"}`. */
function normalizeBlock(b: any): Block {
  if (!BLOCK_TYPES.has(b.type) || (b.type === 'exercise' && !b.exerciseType && b.items)) {
    if (b.items && !BLOCK_TYPES.has(b.type)) {
      return { ...b, type: 'exercise', exerciseType: b.type } as Exercise;
    }
  }
  if (b.type === 'exercise') return { ...b, items: b.items ?? [] } as Exercise;
  return b as Block;
}

function mergeChapterParts(parts: Chapter[]): Chapter {
  const [first, ...rest] = parts;
  const lessons: Lesson[] = [...first.lessons];
  for (const p of rest) {
    for (const l of p.lessons) {
      const prev = lessons[lessons.length - 1];
      if (l.continuationOf && prev && (prev.code === l.continuationOf || prev.continues)) {
        lessons[lessons.length - 1] = { ...prev, blocks: [...prev.blocks, ...l.blocks], continues: false };
      } else lessons.push(l);
    }
  }
  const pages = parts.flatMap((p) => p.source?.pages ?? []);
  return {
    ...first,
    source: first.source ? { ...first.source, pages: [Math.min(...pages), Math.max(...pages)] } : undefined,
    lessons,
  };
}

function buildCourse(meta: CourseMeta): Course {
  const byId = new Map<string, Chapter[]>();
  const order: string[] = [];
  for (const fileId of meta.chapters) {
    const raw = chapterFiles[`../../content/courses/${meta.id}/chapters/${fileId}.json`] as Chapter | undefined;
    if (!raw) continue;
    const ch: Chapter = {
      ...raw,
      lessons: (raw.lessons ?? []).map((l) => ({ ...l, blocks: (l.blocks ?? []).map(normalizeBlock) })),
    };
    if (!byId.has(ch.id)) {
      byId.set(ch.id, []);
      order.push(ch.id);
    }
    byId.get(ch.id)!.push(ch);
  }
  return { ...meta, chapterData: order.map((id) => mergeChapterParts(byId.get(id)!)) };
}

export const courses: Course[] = Object.entries(courseFiles)
  .map(([, m]) => buildCourse(m as CourseMeta))
  .sort((a, b) => a.id.localeCompare(b.id));

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function getScene(courseId: string, sceneId: string): Scene | undefined {
  return sceneFiles[`../../content/courses/${courseId}/scenes/${sceneId}.json`] as Scene | undefined;
}

export function getAudioManifest(courseId: string): AudioRecording[] {
  const m = audioFiles[`../../content/courses/${courseId}/audio/manifest.json`] as
    | { recordings: AudioRecording[] }
    | undefined;
  return m?.recordings ?? [];
}

export function getGlossary(courseId: string): any {
  return chapterFiles[`../../content/courses/${courseId}/chapters/glossary.json`];
}

// ---------- helpers over a course ----------
export interface LessonRef {
  chapter: Chapter;
  lesson: Lesson;
  index: number; // global order in course
}

export function flatLessons(course: Course): LessonRef[] {
  const out: LessonRef[] = [];
  for (const chapter of course.chapterData) for (const lesson of chapter.lessons) out.push({ chapter, lesson, index: out.length });
  return out;
}

export function findLesson(course: Course, lessonId: string): LessonRef | undefined {
  return flatLessons(course).find((r) => r.lesson.id === lessonId);
}

export function exercisesOf(lesson: Lesson): Exercise[] {
  return lesson.blocks.filter((b): b is Exercise => b.type === 'exercise');
}

/** All exercises from lessons up to and including `uptoIndex` (respects book progression). */
export function exercisesUpTo(course: Course, uptoIndex: number) {
  return flatLessons(course)
    .filter((r) => r.index <= uptoIndex)
    .flatMap((r) => exercisesOf(r.lesson).map((ex) => ({ ex, ref: r })));
}

export function canvaUrl(designId: string, page?: number) {
  return `https://www.canva.com/design/${designId}/view${page ? `#${page}` : ''}`;
}

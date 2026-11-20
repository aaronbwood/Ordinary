import { useMemo, useState } from 'react';
import { exercisesOf, flatLessons, getCourse } from '../content/loader';
import { useProgress } from '../state/progress';
import { Ar, ProgressBar } from '../components/common';
import { DrillPreview, TYPE_LABEL } from './LessonView';

type Filter = 'recall' | 'all';
const RECALL = new Set(['fill-blank', 'multiple-choice', 'transform', 'translate-to-arabic', 'vocab-recall', 'speaker-responder', 'rhythm']);

/** Every drill in the book, in book order, grouped by chapter. */
export function DrillsView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  const [filter, setFilter] = useState<Filter>('recall');

  const groups = useMemo(() => {
    if (!course) return [];
    return course.chapterData
      .map((ch) => ({
        ch,
        drills: flatLessons(course)
          .filter((r) => r.chapter.id === ch.id)
          .flatMap((r) => exercisesOf(r.lesson).map((ex) => ({ ex, lesson: r.lesson })))
          .filter(({ ex }) => filter === 'all' || RECALL.has(ex.exerciseType ?? '')),
      }))
      .filter((g) => g.drills.length);
  }, [course, filter]);

  if (!course) return <div className="notice">Course not found.</div>;
  const total = groups.reduce((n, g) => n + g.drills.length, 0);
  const sentences = groups.reduce((n, g) => n + g.drills.reduce((m, d) => m + d.ex.items.length, 0), 0);

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">{course.title}</div>
        <h1 style={{ margin: 0 }}>Drills</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {total} drills · {sentences} sentences, in the order they appear in the book. Say every answer out loud.
        </p>
      </div>
      <div className="row" role="group" aria-label="Which drills">
        <button className={`chip ${filter === 'recall' ? 'on' : ''}`} aria-pressed={filter === 'recall'} onClick={() => setFilter('recall')}>Recall drills</button>
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Include translation & discussion</button>
      </div>

      {groups.map(({ ch, drills }) => {
        const done = drills.filter((d) => p.completedActivities[d.ex.id]).length;
        return (
          <section key={ch.id} className="card stack">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <div>
                <div className="eyebrow">Chapter {ch.number}</div>
                <h2 style={{ margin: 0 }}>{ch.titleEn}</h2>
              </div>
              {ch.titleAr && <Ar size="md">{ch.titleAr}</Ar>}
            </div>
            <div className="row small muted" style={{ gap: 10, flexWrap: 'nowrap' }}>
              <div style={{ flex: 1 }}><ProgressBar value={done / drills.length} /></div>
              {done}/{drills.length} done
            </div>
            <ul className="lesson-list">
              {drills.map(({ ex, lesson }) => {
                const res = ex.items.map((i) => p.items[i.id]).filter(Boolean);
                const right = res.filter((r) => r.last === 'correct').length;
                return (
                  <li key={ex.id}>
                    <a href={`#/c/${courseId}/l/${lesson.id}/x/${ex.id}`} style={{ alignItems: 'flex-start' }}>
                      <span className={`dot ${p.completedActivities[ex.id] ? 'done' : ''}`} style={{ marginTop: 6 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontWeight: 500 }}>{ex.title}</strong>
                        <span className="small muted" style={{ display: 'block' }}>
                          {lesson.code ? `${lesson.code} · ` : ''}{TYPE_LABEL[ex.exerciseType ?? ''] ?? 'Practice'} · {ex.items.length} items
                          {res.length ? ` · ${right}/${ex.items.length} right last time` : ''}
                          {ex.source?.pages?.[0] ? ` · p. ${ex.source.pages[0]}` : ''}
                        </span>
                        <DrillPreview ex={ex} count={1} compact />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

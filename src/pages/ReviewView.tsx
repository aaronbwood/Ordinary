import { useMemo, useState } from 'react';
import type { Exercise, ExerciseItem } from '../content/types';
import { exercisesOf, flatLessons, getCourse } from '../content/loader';
import { dueCards } from '../lib/review';
import { useProgress } from '../state/progress';
import { ExercisePlayer } from '../components/ExercisePlayer';

/** Spaced review over items the student has already attempted (never unseen material). */
export function ReviewView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  const [session, setSession] = useState<{ item: ExerciseItem; exercise: Exercise; lessonId: string }[] | null>(null);

  const index = useMemo(() => {
    const m = new Map<string, { item: ExerciseItem; exercise: Exercise; lessonId: string }>();
    if (!course) return m;
    for (const r of flatLessons(course))
      for (const ex of exercisesOf(r.lesson)) for (const item of ex.items) m.set(item.id, { item, exercise: ex, lessonId: r.lesson.id });
    return m;
  }, [course]);

  if (!course) return <div className="notice">Course not found.</div>;
  const due = dueCards(p.review).filter((c) => index.has(c.itemId));
  const struggling = Object.entries(p.items)
    .filter(([id, r]) => index.has(id) && r.last !== 'correct')
    .map(([id]) => id);

  if (session) {
    return (
      <div className="stack">
        <button className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setSession(null)}>← Review home</button>
        <ExercisePlayer
          courseId={courseId}
          lessonId="review"
          exercise={session[0].exercise}
          items={session}
          title="Review"
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card arch-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">The balcony · Review</div>
        <h1>{due.length ? `${due.length} item${due.length === 1 ? '' : 's'} ready for review` : 'Nothing due right now'}</h1>
        <p className="muted">Review brings back items you have already practised, spaced out over days. Missed items return sooner.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" disabled={!due.length} onClick={() => setSession(due.slice(0, 20).map((c) => index.get(c.itemId)!))}>
            Start review
          </button>
          <button className="btn" disabled={!struggling.length} onClick={() => setSession(struggling.slice(0, 20).map((id) => index.get(id)!))}>
            Difficult items ({struggling.length})
          </button>
        </div>
      </div>
      <div className="small muted">
        Total practised: {Object.keys(p.items).length} · in review: {Object.keys(p.review).length}
      </div>
    </div>
  );
}

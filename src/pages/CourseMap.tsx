import { exercisesOf, getCourse } from '../content/loader';
import { useProgress } from '../state/progress';
import { Ar, ProgressBar, SourceLink } from '../components/common';

export function CourseMap({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  if (!course) return <div className="notice">Course “{courseId}” not found.</div>;
  if (course.status !== 'available') return <div className="notice">{course.title} is a separate future course and is not available yet.</div>;

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">{course.dialect}</div>
        <h1>{course.title}</h1>
        {course.subtitle && <p className="muted" style={{ margin: 0 }}>{course.subtitle}</p>}
        {course.canonicalSource && (
          <div className="small muted">
            Source: <SourceLink source={{ designId: course.canonicalSource.designId }} /> “{course.canonicalSource.title}”
          </div>
        )}
      </div>
      {course.chapterData.map((ch) => {
        const done = ch.lessons.filter((l) => p.completedLessons[l.id]).length;
        return (
          <details key={ch.id} className="card" open={ch.lessons.some((l) => l.id === p.lastLessonId) || (!p.lastLessonId && ch.number === 1)}>
            <summary>
              <div className="row" style={{ justifyContent: 'space-between', display: 'inline-flex', width: 'calc(100% - 24px)' }}>
                <div>
                  <div className="eyebrow">{ch.number ? `Chapter ${ch.number}` : 'Before we begin'}</div>
                  <strong>{ch.titleEn}</strong>
                  {ch.titleTranslit && <span className="translit small"> · {ch.titleTranslit}</span>}
                </div>
                {ch.titleAr && <Ar size="md">{ch.titleAr}</Ar>}
              </div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={ch.lessons.length ? done / ch.lessons.length : 0} />
              </div>
            </summary>
            <ul className="lesson-list" style={{ marginTop: 8 }}>
              {ch.lessons.map((l) => {
                const ex = exercisesOf(l);
                return (
                  <li key={l.id}>
                    <a href={`#/c/${courseId}/l/${l.id}`}>
                      <span className={`dot ${p.completedLessons[l.id] ? 'done' : ''}`} aria-label={p.completedLessons[l.id] ? 'complete' : 'not complete'} />
                      <span className="code">{l.code ?? ''}</span>
                      <span style={{ flex: 1 }}>{l.title}</span>
                      {ex.length > 0 && <span className="badge blue">{ex.length} practice</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

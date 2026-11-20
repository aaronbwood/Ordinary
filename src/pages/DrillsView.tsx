import { useMemo } from 'react';
import type { Exercise, Lesson } from '../content/types';
import { flatLessons, getCourse } from '../content/loader';
import { useProgress } from '../state/progress';
import { Ar, ProgressBar } from '../components/common';
import { TYPE_LABEL } from './LessonView';
import { Icon } from '../components/icons';

interface Part {
  ex: Exercise;
  lesson: Lesson;
}
interface Drill {
  name: string;
  parts: Part[];
  scene?: { lesson: Lesson; id: string; title: string };
}

/** Every drill in the book: chapter first, then each drill by name, parts underneath. */
export function DrillsView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);

  const chapters = useMemo(() => {
    if (!course) return [];
    const lessons = flatLessons(course);
    return course.chapterData
      .map((ch) => {
        const drills: Drill[] = [];
        for (const r of lessons.filter((x) => x.chapter.id === ch.id)) {
          for (const b of r.lesson.blocks) {
            if (b.type === 'exercise') {
              const name = b.drillName ?? b.title ?? 'Drill';
              const last = drills[drills.length - 1];
              if (last && !last.scene && last.name === name) last.parts.push({ ex: b, lesson: r.lesson });
              else drills.push({ name, parts: [{ ex: b, lesson: r.lesson }] });
            } else if (b.type === 'scene') {
              drills.push({ name: b.title ?? 'Apartment walkthrough', parts: [], scene: { lesson: r.lesson, id: b.id, title: b.title ?? '' } });
            }
          }
        }
        return { ch, drills };
      })
      .filter((x) => x.drills.length);
  }, [course]);

  if (!course) return <div className="notice">Course not found.</div>;
  const total = chapters.reduce((n, c) => n + c.drills.filter((d) => !d.scene).length, 0);
  const currentChapter = course.chapterData.find((ch) => ch.lessons.some((l) => l.id === p.lastLessonId))?.id;

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">{course.title}</div>
        <h1 style={{ margin: 0 }}>Drills</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          All {total} drills, chapter by chapter, in book order. Say every answer out loud.
        </p>
      </div>

      {chapters.map(({ ch, drills }) => {
        const exs = drills.flatMap((d) => d.parts.map((x) => x.ex));
        const done = exs.filter((e) => p.completedActivities[e.id]).length;
        return (
          <details key={ch.id} className="card" open={currentChapter ? currentChapter === ch.id : ch.number === 1}>
            <summary>
              <div className="row" style={{ justifyContent: 'space-between', display: 'inline-flex', width: 'calc(100% - 24px)', flexWrap: 'nowrap' }}>
                <div>
                  <div className="eyebrow">Chapter {ch.number}</div>
                  <strong style={{ fontSize: '1.1rem' }}>{ch.titleEn}</strong>
                  <div className="small muted">{drills.filter((d) => !d.scene).length} drills</div>
                </div>
                {ch.titleAr && <Ar size="md">{ch.titleAr}</Ar>}
              </div>
              <div style={{ marginTop: 8 }}><ProgressBar value={exs.length ? done / exs.length : 0} /></div>
            </summary>

            <ol className="drill-index">
              {drills.map((d, i) =>
                d.scene ? (
                  <li key={`scene-${i}`} className="drill-row scene">
                    <a href={`#/c/${courseId}/l/${d.scene.lesson.id}/scene/${d.scene.id}`}>
                      <span className="dot" />
                      <span className="drill-name">{d.name}</span>
                      <span className="small muted">{d.scene.lesson.code ? `${d.scene.lesson.code} · ` : ''}apartment</span>
                    </a>
                  </li>
                ) : (
                  <li key={`${d.name}-${i}`} className="drill-row">
                    <DrillRow courseId={courseId} drill={d} />
                  </li>
                ),
              )}
            </ol>
          </details>
        );
      })}
    </div>
  );
}

function DrillRow({ courseId, drill }: { courseId: string; drill: Drill }) {
  const p = useProgress(courseId);
  const items = drill.parts.reduce((n, x) => n + x.ex.items.length, 0);
  const first = drill.parts[0];
  const allDone = drill.parts.every((x) => p.completedActivities[x.ex.id]);
  const page = first.ex.source?.pages?.[0];
  const type = TYPE_LABEL[first.ex.exerciseType ?? ''] ?? 'Practice';
  const metronome =
    first.ex.exerciseType === 'speaker-responder'
      ? `#/c/${courseId}/rhythm?mode=sr`
      : first.ex.id === 'ch2-ex-sifl-practice'
        ? `#/c/${courseId}/rhythm?mode=vocab&bank=ch2-vb-sifl-practice`
        : null;
  const single = drill.parts.length === 1;
  return (
    <div>
      <a href={`#/c/${courseId}/l/${first.lesson.id}/x/${first.ex.id}`}>
        <span className={`dot ${allDone ? 'done' : ''}`} />
        <span className="drill-name">{drill.name}</span>
        <span className="small muted" style={{ whiteSpace: 'nowrap' }}>
          {items}{page ? ` · p.${page}` : ''}
        </span>
      </a>
      <div className="drill-meta small muted">
        {first.lesson.code ? `${first.lesson.code} · ` : ''}
        {type}
        {!single && ` · ${drill.parts.length} parts`}
        {metronome && (
          <a className="chip" style={{ marginInlineStart: 8 }} href={metronome}>
            <Icon name="metronome" size={12} /> metronome
          </a>
        )}
      </div>
      {!single && (
        <ul className="drill-parts">
          {drill.parts.map(({ ex, lesson }) => (
            <li key={ex.id}>
              <a href={`#/c/${courseId}/l/${lesson.id}/x/${ex.id}`}>
                <span className={`dot ${p.completedActivities[ex.id] ? 'done' : ''}`} />
                <span style={{ flex: 1, minWidth: 0 }}>{partLabel(ex.title ?? '', drill.name)}</span>
                <span className="small muted">{ex.items.length}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Prepositions & Locatives Drill — Part 2: Stand-Alone…" → "Part 2: Stand-Alone…" */
function partLabel(title: string, name: string) {
  const t = title.startsWith(name) ? title.slice(name.length).replace(/^[\s—:–-]+/, '') : title;
  return t || title;
}

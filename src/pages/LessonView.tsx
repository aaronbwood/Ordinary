import { useEffect } from 'react';
import type { Block, Exercise } from '../content/types';
import { findLesson, flatLessons, getCourse } from '../content/loader';
import { progress, useProgress, useSettings } from '../state/progress';
import { Ar, AidToggles, Flags, PhraseView, SourceLink } from '../components/common';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { Icon } from '../components/icons';

const TYPE_LABEL: Record<string, string> = {
  'translate-to-arabic': 'Translate & say',
  'translate-to-english': 'Understand',
  'fill-blank': 'Fill the blank',
  'vocab-recall': 'Vocabulary recall',
  transform: 'Transform',
  'multiple-choice': 'Choose',
  matching: 'Match',
  listening: 'Listening',
  'speaker-responder': 'Speaker–responder',
  'dialogue-roleplay': 'Role-play',
  rhythm: 'Rhythm drill',
  discussion: 'Discussion',
};

export function LessonView({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  useSettings();
  const ref = course && findLesson(course, lessonId);
  useEffect(() => {
    if (ref) progress.visit(courseId, lessonId, `/c/${courseId}/l/${lessonId}`);
  }, [courseId, lessonId, !!ref]);
  if (!course || !ref) return <div className="notice">Lesson not found.</div>;
  const { chapter, lesson, index } = ref;
  const all = flatLessons(course);
  const prev = all[index - 1];
  const next = all[index + 1];
  const done = !!p.completedLessons[lesson.id];

  return (
    <article className="stack">
      <div>
        <a className="small" href={`#/c/${courseId}`}>← {chapter.number ? `Chapter ${chapter.number}: ${chapter.titleEn}` : chapter.titleEn}</a>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <h1 style={{ margin: 0 }}>
            {lesson.code ? <span className="muted">{lesson.code} </span> : null}
            {lesson.title}
          </h1>
          <SourceLink source={lesson.source} />
        </div>
      </div>
      <AidToggles />

      {lesson.blocks.map((b, i) => (
        <section className="lesson-block" key={i}>
          <BlockView block={b} courseId={courseId} lessonId={lesson.id} />
        </section>
      ))}

      <div className="callout say">
        <strong>Say everything out loud.</strong> Read each Arabic line aloud before you move on.
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        {prev ? <a className="btn" href={`#/c/${courseId}/l/${prev.lesson.id}`}><Icon name="back" /> Previous</a> : <span />}
        <button
          className={`btn ${done ? '' : 'olive'}`}
          onClick={() => {
            progress.completeLesson(courseId, lesson.id);
            if (next) window.location.hash = `/c/${courseId}/l/${next.lesson.id}`;
          }}
        >
          {done ? '✓ Completed' : 'Mark complete'}{next ? ' & continue' : ''}
        </button>
      </div>
    </article>
  );
}

function BlockView({ block: b, courseId, lessonId }: { block: Block; courseId: string; lessonId: string }) {
  switch (b.type) {
    case 'text':
      return (
        <div>
          {b.heading && <h2>{b.heading}</h2>}
          {b.paragraphs.map((t, i) => (
            <p key={i} dir="auto">{t}</p>
          ))}
        </div>
      );
    case 'callout':
      return (
        <div className={`callout ${/out loud|say/i.test(b.heading ?? '') ? 'say' : ''}`}>
          {b.heading && <strong>{b.heading}. </strong>}
          <span dir="auto">{b.text}</span>
        </div>
      );
    case 'examples':
      return (
        <div className="card">
          {b.heading && <h3>{b.heading}</h3>}
          {b.items.map((it, i) => (
            <PhraseView key={i} phrase={it} courseId={courseId} audioKeys={[]} />
          ))}
        </div>
      );
    case 'vocab':
      return (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>{b.heading ?? 'Vocabulary'}</h3>
            <SourceLink source={b.source} />
          </div>
          <div className="vocab-grid" style={{ marginTop: 10 }}>
            {b.items.map((v) => (
              <div className="vocab-card" key={v.id}>
                <PhraseView phrase={v} courseId={courseId} audioKeys={[v.id]} size="md" />
                {v.plural?.ar && (
                  <div className="small muted">
                    pl. <Ar size="sm">{v.plural.ar}</Ar> {v.plural.translit && <span className="translit">{v.plural.translit}</span>}
                  </div>
                )}
                {v.notes && <div className="small muted" style={{ textAlign: 'left' }}>{v.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    case 'table':
      return (
        <div className="card">
          {b.heading && <h3>{b.heading}</h3>}
          <div className="table-wrap">
            <table className="src">
              <thead>
                <tr>{b.columns.map((c, i) => <th key={i} dir="auto">{c}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} dir="auto" className={/[؀-ۿ]/.test(c) ? 'ar ar-sm' : ''}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case 'dialogue':
      return <DialoguePlayer courseId={courseId} lessonId={lessonId} id={b.id} title={b.title} context={b.context} lines={b.lines} source={b.source} />;
    case 'image':
      return (
        <figure className="card" style={{ margin: 0 }}>
          <div className="eyebrow">{b.kind === 'comic' ? 'Comic' : b.kind === 'diagram' ? 'Diagram' : 'Illustration'} from the book</div>
          {b.src ? <img src={b.src} alt={b.description} style={{ width: '100%', borderRadius: 8 }} /> : <p className="small muted">{b.description}</p>}
          {b.caption && <figcaption dir="auto">{b.caption}</figcaption>}
          <SourceLink source={b.source} />
        </figure>
      );
    case 'exercise':
      return <ExerciseCard ex={b} courseId={courseId} lessonId={lessonId} />;
    default:
      return null;
  }
}

function ExerciseCard({ ex, courseId, lessonId }: { ex: Exercise; courseId: string; lessonId: string }) {
  const p = useProgress(courseId);
  const done = p.completedActivities[ex.id];
  const flagged = ex.items.filter((i) => i.flags?.length).length;
  return (
    <div className="card" style={{ borderInlineStart: '4px solid var(--terracotta)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">{TYPE_LABEL[ex.exerciseType ?? ''] ?? 'Practice'}</div>
          <h3 style={{ margin: 0 }}>{ex.title ?? 'Practice'}</h3>
        </div>
        <SourceLink source={ex.source} />
      </div>
      {ex.instructions && <p className="small muted" dir="auto">{ex.instructions}</p>}
      <div className="row">
        <a className="btn primary" href={`#/c/${courseId}/l/${lessonId}/x/${ex.id}`}>
          <Icon name="mic" size={16} /> {done ? 'Practise again' : 'Practise aloud'} · {ex.items.length}
        </a>
        {done && <span className="badge ok">Done</span>}
        {flagged > 0 && <span className="badge warn">{flagged} flagged for review</span>}
      </div>
      <Flags flags={ex.items.length === 0 ? [{ kind: 'missing-answer', note: 'No items transcribed' }] : undefined} />
    </div>
  );
}

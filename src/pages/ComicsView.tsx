import { flatLessons, getCourse, listComics } from '../content/loader';
import { resolveSource } from '../audio/audio';
import { useProgress, useSettings } from '../state/progress';
import { Ar } from '../components/common';

/** غرفة الضيوف — every comic in the course, in book order. */
export function ComicsView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  useSettings();
  if (!course) return <div className="notice">Course not found.</div>;
  const lessons = flatLessons(course);
  const order = (lessonId: string) => lessons.find((r) => r.lesson.id === lessonId)?.index ?? 999;
  const comics = listComics(courseId).sort((a, b) => order(a.lessonId) - order(b.lessonId));
  const reachedIdx = Math.max(-1, ...lessons.filter((r) => p.completedLessons[r.lesson.id] || r.lesson.id === p.lastLessonId).map((r) => r.index));
  // a comic is "later" only if its chapter comes after the chapter the student has reached (at least Chapter 1)
  const reachedChapter = Math.max(1, lessons.find((r) => r.index === reachedIdx)?.chapter.number ?? 1);

  return (
    <div className="stack">
      <div className="card arch-card" style={{ textAlign: 'center' }}>
        <Ar size="lg">غُرْفِة الضُّيوف</Ar>
        <div className="translit small">ghurfet iḍ-ḍyūf · the guest room</div>
        <h1 style={{ marginTop: 6 }}>Comics</h1>
        <p className="muted" style={{ margin: 0 }}>Every comic in the book. Read panel by panel, listen to the whole scene, or speak as one of the characters.</p>
      </div>

      <div className="comic-shelf">
        {comics.map((c) => {
          const ref = lessons.find((r) => r.lesson.id === c.lessonId);
          const lines = c.panels.flatMap((pn) => pn.lines);
          const voiced = lines.filter((l) => resolveSource(courseId, l, [l.id]) !== 'unavailable').length;
          const speakers = [...new Set(lines.map((l) => l.speaker))].filter((s) => !/ and /i.test(s));
          const played = speakers.filter((s) => p.completedActivities[`comic:${c.id}:${s}`]);
          const later = !!ref && ref.chapter.number > reachedChapter;
          return (
            <a key={c.id} className="comic-tile" href={`#/c/${courseId}/l/${c.lessonId}/comic/${c.id}`}>
              <img src={`${import.meta.env.BASE_URL}${c.panels[0]?.image}`} alt="" loading="lazy" />
              <div className="comic-tile-body">
                <div className="eyebrow">Chapter {ref?.chapter.number}{ref?.chapter.titleAr ? ` · ${ref.chapter.titleAr}` : ''}</div>
                <strong>{c.title.en}</strong>
                {c.title.ar && <Ar size="sm">{c.title.ar}</Ar>}
                <div className="small muted">{c.panels.length} panels · {speakers.join(', ')}</div>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  {voiced === lines.length && lines.length ? <span className="badge warn">Voiced · awaiting review</span> : voiced ? <span className="badge warn">{voiced}/{lines.length} lines voiced</span> : <span className="badge">Not voiced yet</span>}
                  {played.length > 0 && <span className="badge ok">Played as {played.join(', ')}</span>}
                  {later && <span className="badge">Later in the book</span>}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

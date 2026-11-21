import { courses, flatLessons, getCourse } from '../content/loader';
import { useProgress } from '../state/progress';
import { dueCards } from '../lib/review';
import { HouseArt } from '../components/HouseArt';
import { ProgressBar } from '../components/common';
import { Icon } from '../components/icons';
import { DEFAULT_COURSE } from '../App';

export function Home() {
  const course = getCourse(DEFAULT_COURSE);
  const p = useProgress(DEFAULT_COURSE);
  if (!course) return <div className="notice">Volume One content is not loaded.</div>;
  const lessons = flatLessons(course);
  const last = lessons.find((r) => r.lesson.id === p.lastLessonId);
  const firstOpen = lessons.find((r) => !p.completedLessons[r.lesson.id]) ?? lessons[0];
  const resume = last ?? firstOpen;
  const done = Object.keys(p.completedLessons).length;
  const due = dueCards(p.review).length;
  const c = course.id;

  return (
    <div className="stack">
      <div className="house sun">
        <HouseArt />
      </div>

      <div className="card arch-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">{course.title}</div>
        {resume ? (
          <>
            <h1 style={{ marginTop: 4 }}>{last ? 'Welcome back' : 'Come in, sit down'}</h1>
            <p className="muted" style={{ margin: '0 0 10px' }}>
              {last ? 'Pick up where you left off:' : 'Start at the beginning:'}{' '}
              <strong>
                {resume.chapter.number ? `Chapter ${resume.chapter.number} · ` : ''}
                {resume.lesson.code ? `${resume.lesson.code} ` : ''}
                {resume.lesson.title}
              </strong>
            </p>
            <a className="btn primary" href={p.lastPath && last ? `#${p.lastPath}` : `#/c/${c}/l/${resume.lesson.id}`}>
              {last ? 'Resume' : 'Begin'}
            </a>
            <div style={{ maxWidth: 360, margin: '14px auto 0' }}>
              <ProgressBar value={lessons.length ? done / lessons.length : 0} />
              <div className="small muted" style={{ marginTop: 4 }}>
                {done} of {lessons.length} sections complete
              </div>
            </div>
          </>
        ) : (
          <p>No lessons yet.</p>
        )}
      </div>

      <a className="card car-cta" href={`#/c/${c}/listen`}>
        <Icon name="car" size={28} />
        <span>
          <strong>Listen in the car</strong>
          <span className="small muted" style={{ display: 'block' }}>Whole lessons as audio, hands-free</span>
        </span>
      </a>

      <div className="rooms">
        <a className="room" href={`#/c/${c}`}>
          <span className="ar">المَكْتَب</span>
          <strong>Lessons</strong>
          <small>Read, listen and practise chapter by chapter</small>
        </a>
        <a className="room" href={`#/c/${c}/words`}>
          <span className="ar">المَطْبَخ</span>
          <strong>Vocabulary</strong>
          <small>Every vocabulary bank in the book, with audio and the metronome</small>
        </a>
        <a className="room" href={`#/c/${c}/drills`}>
          <span className="ar">الصّالون</span>
          <strong>Drills</strong>
          <small>Every fill-in-the-blank and recall drill, in book order</small>
        </a>
        <a className="room" href={`#/c/${c}/comics`}>
          <span className="ar">غُرْفِة الضُّيوف</span>
          <strong>Comics</strong>
          <small>Every comic in the book, read, heard and acted out</small>
        </a>
        <a className="room" href={`#/c/${c}/rhythm`}>
          <span className="ar">الحوش</span>
          <strong>Rhythm</strong>
          <small>Drill aloud to a steady beat</small>
        </a>
        <a className="room" href={`#/c/${c}/review`}>
          <span className="ar">البَلْكونِة</span>
          <strong>Review{due ? ` · ${due}` : ''}</strong>
          <small>{due ? `${due} item${due === 1 ? '' : 's'} ready to review` : 'Nothing due right now'}</small>
        </a>
      </div>

      <div className="card">
        <div className="eyebrow">Courses</div>
        {courses.map((co) => (
          <div key={co.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
            <div>
              <strong>{co.title}</strong>
              {co.subtitle && <div className="small muted">{co.subtitle}</div>}
            </div>
            {co.status === 'available' ? (
              <a className="btn small" href={`#/c/${co.id}`}>Open</a>
            ) : (
              <span className="badge">Coming later</span>
            )}
          </div>
        ))}
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>Say everything out loud. Every ordinary moment is practice.</p>
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import { getCourse, getEpisodes } from '../content/loader';
import { Ar } from '../components/common';
import { Icon } from '../components/icons';
import { currentSection, next, pause, playEpisode, prev, seek, setAutoNext, setList, setPace, skip, toggle, useCarPlayer } from '../audio/episodePlayer';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** بالسيّارة — In the Car: whole lessons as audio episodes that play straight through, hands-free. */
export function ListenView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const episodes = useMemo(() => getEpisodes(courseId), [courseId]);
  const st = useCarPlayer();
  useEffect(() => { setList(episodes, course?.title ?? ''); }, [episodes, course]);
  if (!course) return <div className="notice">Course not found.</div>;
  const ep = st.index >= 0 ? st.list[st.index] : undefined;
  const chapters = [...new Set(episodes.map((e) => e.chapter))];
  const total = (pace: 'normal' | 'slow') => Math.round(episodes.reduce((n, e) => n + e[pace].duration, 0) / 60);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0 }}>Listen in the car</h1>
        <span><Ar size="sm">بالسَّيّارة</Ar> <span className="translit small">bis-sayyāra</span></span>
      </div>
      <div className="card car-player" aria-label="Player">
        <div className="eyebrow">{ep ? `Chapter ${ep.chapter}` : 'Nothing playing yet'}</div>
        <h2 className="car-title">{ep?.title ?? 'Press play to start at the beginning'}</h2>
        <div className="car-section">{currentSection() ?? ' '}</div>
        <input
          className="car-progress"
          type="range"
          min={0}
          max={Math.max(1, st.duration)}
          step={1}
          value={Math.min(st.time, st.duration || 0)}
          onChange={(e) => seek(+e.target.value)}
          aria-label="Position in episode"
          disabled={!ep}
        />
        <div className="row small muted" style={{ justifyContent: 'space-between' }}>
          <span>{mmss(st.time)}</span>
          <span>{mmss(st.duration)}</span>
        </div>
        <div className="car-controls">
          <button className="car-btn" onClick={prev} aria-label="Previous episode"><Icon name="prev" size={30} /></button>
          <button className="car-btn" onClick={() => skip(-15)} aria-label="Back 15 seconds"><span className="car-skip">−15</span></button>
          <button className="car-btn big" onClick={toggle} aria-label={st.playing ? 'Pause' : 'Play'}>
            <Icon name={st.playing ? 'pause' : 'play'} size={44} />
          </button>
          <button className="car-btn" onClick={() => skip(15)} aria-label="Forward 15 seconds"><span className="car-skip">+15</span></button>
          <button className="car-btn" onClick={next} aria-label="Next episode"><Icon name="next" size={30} /></button>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 8 }} role="radiogroup" aria-label="Pace">
          <button role="radio" aria-checked={st.pace === 'normal'} className={`chip big-chip ${st.pace === 'normal' ? 'on' : ''}`} onClick={() => setPace('normal')}>Normal · 3 s pauses</button>
          <button role="radio" aria-checked={st.pace === 'slow'} className={`chip big-chip ${st.pace === 'slow' ? 'on' : ''}`} onClick={() => setPace('slow')}>Slow · 5 s pauses, Arabic twice</button>
        </div>
        <label className="row small" style={{ justifyContent: 'center' }}>
          <input type="checkbox" checked={st.autoNext} onChange={(e) => setAutoNext(e.target.checked)} /> Keep going into the next episode
        </label>
      </div>

      <div className="notice small" role="note">
        <strong>Before you drive:</strong> choose an episode and press play. After that you don't need the screen: it keeps playing when the phone is locked, and your car's or headphones' play, pause and skip buttons work.
      </div>

      <p className="small muted" style={{ margin: 0 }}>
        Each lesson is an audio episode that plays straight through. You hear the English, say it in Arabic in the pause, then hear the Arabic and repeat it. Comics play as a scene, then line by line, then as a role-play where a soft tone marks your turn.
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        {episodes.length} episodes · about {total('normal')} minutes at normal pace, {total('slow')} at slow. English cues are in Aaron's voice; all voices are generated and awaiting review.
      </p>

      {chapters.map((n) => (
        <section key={n} className="stack" aria-label={`Chapter ${n}`}>
          <h2 style={{ margin: 0 }}>Chapter {n}</h2>
          {episodes.map((e, i) => (e.chapter !== n ? null : (
            <div key={e.id} className={`card episode-row ${i === st.index ? 'on' : ''}`}>
              <button className="btn icon" onClick={() => (i === st.index && st.playing ? pause() : playEpisode(i))} aria-label={i === st.index && st.playing ? `Pause ${e.title}` : `Play ${e.title}`}>
                <Icon name={i === st.index && st.playing ? 'pause' : 'play'} />
              </button>
              <div className="episode-meta">
                <strong>{e.title}</strong>
                <span className="small muted">{Math.round(e[st.pace].duration / 60)} min · {e[st.pace].sections.filter((s) => !/^(Introduction|End)$/.test(s.title)).map((s) => s.title).join(' · ')}</span>
              </div>
              <a className="btn small ghost" href={`${import.meta.env.BASE_URL}${e[st.pace].src}`} download aria-label={`Download ${e.title}`}>Save</a>
            </div>
          )))}
        </section>
      ))}
      <p className="small muted">Lessons without recordings yet (grammar explanations, example sentences, Speaker–Responder drills) aren't in the episodes until their Arabic is recorded.</p>
    </div>
  );
}

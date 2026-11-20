import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Comic, ComicLine } from '../content/types';
import { findLesson, getComic, getCourse } from '../content/loader';
import { playPhrase, playUrl, resolveSource, stopAudio } from '../audio/audio';
import { checkSubmission, type CheckResult } from '../lib/check';
import { progress, useSettings } from '../state/progress';
import { Ar, AidToggles, AudioSourceBadge, Flags, SourceLink } from '../components/common';
import { SpeakControl, type Submission } from '../components/SpeakControl';
import { Icon } from '../components/icons';

type Mode = 'read' | 'listen' | 'role';

const SPEAKER_COLORS = ['var(--blue)', 'var(--terracotta)', 'var(--olive)', 'var(--wood)', '#7a5a8c'];

/**
 * Panel-by-panel comic reader. Reading order is right to left; each panel shows
 * its bubble lines as text with the character's voice. Role-play: the student
 * speaks one character's lines; feedback comes at the end of the comic.
 */
export function ComicView({ courseId, lessonId, comicId }: { courseId: string; lessonId: string; comicId: string }) {
  const course = getCourse(courseId);
  const comic = getComic(courseId, comicId);
  const ref = course ? findLesson(course, lessonId) : undefined;
  const [mode, setMode] = useState<Mode>('read');
  const [role, setRole] = useState<string | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (comic) progress.visit(courseId, lessonId, `/c/${courseId}/l/${lessonId}/comic/${comicId}`);
  }, [courseId, lessonId, comicId, !!comic]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopAudio(), []);

  const speakers = useMemo(() => {
    const names: string[] = [];
    comic?.panels.forEach((p) => p.lines.forEach((l) => !names.includes(l.speaker) && names.push(l.speaker)));
    return names;
  }, [comic]);

  if (!comic) return <div className="notice">This comic hasn't been added yet.</div>;
  const color = (s: string) => SPEAKER_COLORS[Math.max(0, speakers.indexOf(s)) % SPEAKER_COLORS.length];

  return (
    <div className="stack">
      {ref && (
        <a className="small" href={`#/c/${courseId}/l/${lessonId}`}>
          ← Chapter {ref.chapter.number} · {ref.lesson.title}
        </a>
      )}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">Comic</div>
          <h1 style={{ margin: 0 }}>{comic.title.en}</h1>
          {comic.title.ar && <Ar size="md">{comic.title.ar}</Ar>}
        </div>
        <SourceLink source={comic.source} />
      </div>

      <div className="modes" role="tablist" aria-label="How to read">
        <button role="tab" aria-selected={mode === 'read'} className={`chip ${mode === 'read' ? 'on' : ''}`} onClick={() => { setMode('read'); setI(0); }}>Read panel by panel</button>
        <button role="tab" aria-selected={mode === 'listen'} className={`chip ${mode === 'listen' ? 'on' : ''}`} onClick={() => { setMode('listen'); setI(0); }}>Listen all the way through</button>
        {speakers.filter((s) => !/ and /i.test(s)).map((s) => (
          <button key={s} role="tab" aria-selected={mode === 'role' && role === s} className={`chip ${mode === 'role' && role === s ? 'on' : ''}`} onClick={() => { setMode('role'); setRole(s); setI(0); }}>
            Speak as {s}
          </button>
        ))}
      </div>

      {mode === 'role' && role ? (
        <RolePlay key={role} courseId={courseId} lessonId={lessonId} comic={comic} role={role} color={color} />
      ) : (
        <Reader courseId={courseId} comic={comic} i={i} setI={setI} autoplay={mode === 'listen'} color={color} />
      )}
      <AidToggles />
    </div>
  );
}

function PanelImage({ comic, index, dim }: { comic: Comic; index: number; dim?: boolean }) {
  const p = comic.panels[index];
  return (
    <div className="comic-frame" style={{ opacity: dim ? 0.85 : 1 }}>
      <img src={`${import.meta.env.BASE_URL}${p.image}`} alt={`Panel ${index + 1} of ${comic.panels.length}`} />
      <span className="comic-num">{index + 1} / {comic.panels.length}</span>
    </div>
  );
}

function LineView({ courseId, line, color, active }: { courseId: string; line: ComicLine; color: (s: string) => string; active?: boolean }) {
  const s = useSettings();
  const [en, setEn] = useState(false);
  const src = resolveSource(courseId, line, [line.id]);
  return (
    <div className={`comic-line ${active ? 'active' : ''}`} style={{ borderInlineStartColor: color(line.speaker) }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <button className="btn small icon" style={{ width: 36, minHeight: 36 }} aria-label={`Play ${line.speaker}'s line`} disabled={src === 'unavailable'} onClick={() => playPhrase(courseId, line, [line.id])}>
          <Icon name={src === 'unavailable' ? 'speaker-off' : 'speaker'} size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div className="comic-speaker" style={{ color: color(line.speaker) }}>{line.speaker}</div>
          <Ar size="lg">{line.ar}</Ar>
        </div>
      </div>
      {line.translit && s.showTranslit && <div className="translit small">{line.translit}</div>}
      {line.en && (s.showEnglish || en) ? <div className="en small">{line.en}</div> : line.en ? <button className="chip" onClick={() => setEn(true)}>English</button> : null}
      <Flags flags={line.flags} />
    </div>
  );
}

function Reader({ courseId, comic, i, setI, autoplay, color }: { courseId: string; comic: Comic; i: number; setI: (n: number) => void; autoplay: boolean; color: (s: string) => string }) {
  const panel = comic.panels[i];
  const [activeLine, setActiveLine] = useState(-1);
  const playing = useRef(0);
  const last = i === comic.panels.length - 1;

  const go = useCallback((n: number) => {
    stopAudio();
    setActiveLine(-1);
    setI(Math.max(0, Math.min(comic.panels.length - 1, n)));
  }, [comic.panels.length, setI]);

  // Listen mode: play each line of the panel in turn, then move on.
  useEffect(() => {
    if (!autoplay) return;
    const run = ++playing.current;
    const lines = panel.lines;
    const step = (k: number) => {
      if (run !== playing.current) return;
      if (k >= lines.length) {
        if (!last) setTimeout(() => run === playing.current && go(i + 1), lines.length ? 700 : 1600);
        return;
      }
      setActiveLine(k);
      const src = playPhrase(courseId, lines[k], [lines[k].id], () => setTimeout(() => step(k + 1), 350));
      if (src === 'unavailable') setTimeout(() => step(k + 1), 1800);
    };
    const t = setTimeout(() => step(0), 400);
    return () => { clearTimeout(t); playing.current++; };
  }, [autoplay, i]); // eslint-disable-line react-hooks/exhaustive-deps

  // Right-to-left: the left arrow moves forward.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') go(i + 1);
      if (e.key === 'ArrowRight') go(i - 1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [i, go]);

  return (
    <div className="stack">
      <PanelImage comic={comic} index={i} />
      <div className="stack" style={{ gap: 8 }}>
        {panel.caption && <p className="small muted" dir="auto" style={{ fontStyle: 'italic', margin: 0 }}>{panel.caption}</p>}
        {panel.lines.map((l, k) => <LineView key={l.id} courseId={courseId} line={l} color={color} active={k === activeLine} />)}
        {!panel.lines.length && !panel.caption && <p className="small muted" style={{ margin: 0 }}>No speech in this panel. Describe what you see out loud.</p>}
      </div>
      <div className="comic-nav" dir="rtl">
        <button className="btn primary" disabled={last} onClick={() => go(i + 1)} aria-label="Next panel">
          التالي <Icon name="back" size={16} />
        </button>
        <div className="comic-dots" aria-hidden="true">
          {comic.panels.map((_, k) => <span key={k} className={k === i ? 'on' : k < i ? 'seen' : ''} />)}
        </div>
        <button className="btn" disabled={i === 0} onClick={() => go(i - 1)} aria-label="Previous panel">
          <Icon name="arrow" size={16} /> السابق
        </button>
      </div>
      <div className="small muted" style={{ textAlign: 'center' }}>
        Comics read right to left. Say every line out loud. <AudioSourceBadge source={resolveSource(courseId, panel.lines[0] ?? null, [panel.lines[0]?.id])} />
      </div>
    </div>
  );
}

function RolePlay({ courseId, lessonId, comic, role, color }: { courseId: string; lessonId: string; comic: Comic; role: string; color: (s: string) => string }) {
  const steps = useMemo(() => comic.panels.flatMap((p, pi) => p.lines.map((l) => ({ pi, l }))), [comic]);
  const [k, setK] = useState(0);
  const [turns, setTurns] = useState<Record<string, { sub: Submission; result: CheckResult }>>({});
  const [repeat, setRepeat] = useState<string[] | null>(null);
  const cur = repeat ? steps.find((s) => s.l.id === repeat[0]) : steps[k];
  const mine = (l: ComicLine) => l.speaker === role || l.speaker.split(/ and /i).includes(role);
  const finished = !cur || (!!repeat && !repeat.length);
  useEffect(() => {
    if (finished) progress.completeActivity(courseId, `comic:${comic.id}:${role}`);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // partner lines play automatically, then advance
  useEffect(() => {
    if (!cur || repeat || mine(cur.l)) return;
    let done = false;
    const next = () => { if (!done) { done = true; setK((x) => x + 1); } };
    const src = playPhrase(courseId, cur.l, [cur.l.id], () => setTimeout(next, 300));
    const t = src === 'unavailable' ? setTimeout(next, 2200) : undefined;
    return () => { done = true; if (t) clearTimeout(t); };
  }, [k, repeat]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (sub: Submission) => {
    if (!cur) return;
    const result = checkSubmission({ id: cur.l.id, answers: [{ ar: cur.l.ar, translit: cur.l.translit }], model: cur.l }, sub);
    progress.recordItem(courseId, cur.l.id, lessonId, result.verdict);
    setTurns((t) => ({ ...t, [cur.l.id]: { sub, result } }));
    if (repeat) setRepeat(repeat.slice(1).length ? repeat.slice(1) : null);
    else setK((x) => x + 1);
  };

  if (finished) {
    const myLines = steps.filter((s) => mine(s.l));
    const fixes = myLines.filter((s) => turns[s.l.id] && turns[s.l.id].result.verdict !== 'correct').slice(0, 3);
    return (
      <div className="stack">
        <div className="feedback correct">
          <div className="verdict">You played {role} all the way through</div>
          <div className="small">{myLines.filter((s) => turns[s.l.id]?.result.verdict === 'correct').length} of {myLines.length} of your lines matched the comic.{fixes.length ? ' The most useful lines to repeat:' : ''}</div>
        </div>
        {fixes.map(({ l, pi }) => (
          <div key={l.id} className="model-line">
            <div className="row" style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <img src={`${import.meta.env.BASE_URL}${comic.panels[pi].image}`} alt="" style={{ width: 84, borderRadius: 6 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <LineView courseId={courseId} line={l} color={color} />
                <div className="small muted">
                  You said: <span dir="auto">{turns[l.id].sub.text || '—'}</span>
                  {turns[l.id].sub.audioUrl && <button className="chip" onClick={() => playUrl(turns[l.id].sub.audioUrl!)}>▶ mine</button>}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="row">
          {fixes.length > 0 && <button className="btn primary" onClick={() => setRepeat(fixes.map((f) => f.l.id))}>Repeat these lines</button>}
          <button className="btn" onClick={() => { setTurns({}); setRepeat(null); setK(0); }}><Icon name="replay" /> Play it again</button>
        </div>
      </div>
    );
  }

  if (!cur) return null;
  const isMine = mine(cur.l);
  return (
    <div className="stack">
      <PanelImage comic={comic} index={cur.pi} />
      {isMine ? (
        <>
          <div className="comic-line active" style={{ borderInlineStartColor: color(cur.l.speaker) }}>
            <div className="comic-speaker" style={{ color: color(cur.l.speaker) }}>Your line ({cur.l.speaker})</div>
            <div className="small muted">Read your bubble aloud{cur.l.en ? ` — “${cur.l.en}”` : ''}</div>
          </div>
          <SpeakControl key={cur.l.id + (repeat ? 'r' : '')} onSubmit={submit} hint="Say your line — feedback comes at the end" />
        </>
      ) : (
        <LineView courseId={courseId} line={cur.l} color={color} active />
      )}
    </div>
  );
}

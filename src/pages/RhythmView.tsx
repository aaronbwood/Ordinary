import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise, ExerciseItem, Phrase } from '../content/types';
import { exercisesOf, flatLessons, getCourse, type LessonRef } from '../content/loader';
import { buildTimeline, Metronome, type Beat } from '../lib/metronome';
import { completeModel } from '../lib/check';
import { progress, useProgress, useSettings } from '../state/progress';
import { stopAudio } from '../audio/audio';
import { Ar, AudioButton, SegmentsAr, SegmentsTranslit, SourceLink } from '../components/common';
import { Icon } from '../components/icons';

const PRODUCTION = ['rhythm', 'speaker-responder', 'vocab-recall', 'translate-to-arabic', 'fill-blank', 'transform'];

interface RItem {
  id: string;
  cue: Phrase;
  segments?: ExerciseItem['segments'];
  translitSegments?: ExerciseItem['translitSegments'];
  model: Phrase;
  words: number;
}

interface DrillSource {
  id: string;
  label: string;
  lesson: LessonRef;
  items: RItem[];
  source?: Exercise['source'];
  rhythmNative: boolean;
}

function toRItem(item: ExerciseItem): RItem | null {
  const model = completeModel(item);
  if (!model?.ar) return null;
  return {
    id: item.id,
    cue: item.prompt ?? {},
    segments: item.segments,
    translitSegments: item.translitSegments,
    model,
    words: model.ar.split(/\s+/).length,
  };
}

export function RhythmView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  const s = useSettings();

  // Only material the student has reached in the book.
  const lessons = useMemo(() => (course ? flatLessons(course) : []), [course]);
  const reached = useMemo(() => {
    const idx = lessons.filter((r) => p.completedLessons[r.lesson.id] || r.lesson.id === p.lastLessonId).map((r) => r.index);
    return idx.length ? Math.max(...idx) : -1;
  }, [lessons, p]);

  const drills: DrillSource[] = useMemo(() => {
    const out: DrillSource[] = [];
    for (const r of lessons) {
      if (r.index > reached) break;
      for (const ex of exercisesOf(r.lesson)) {
        if (!PRODUCTION.includes(ex.exerciseType ?? '')) continue;
        const items = ex.items.map(toRItem).filter(Boolean) as RItem[];
        if (items.length)
          out.push({
            id: ex.id,
            label: `${r.chapter.number ? `Ch ${r.chapter.number} · ` : ''}${r.lesson.code ? r.lesson.code + ' ' : ''}${ex.title ?? r.lesson.title}`,
            lesson: r,
            items,
            source: ex.source,
            rhythmNative: ex.exerciseType === 'rhythm',
          });
      }
      for (const b of r.lesson.blocks) {
        if (b.type !== 'vocab') continue;
        const items = b.items
          .filter((v) => v.ar && v.en)
          .map((v) => ({ id: v.id, cue: { en: v.en }, model: { ar: v.ar, translit: v.translit, en: v.en }, words: v.ar!.split(/\s+/).length }));
        if (items.length)
          out.push({ id: `vocab:${r.lesson.id}:${b.heading}`, label: `${r.chapter.number ? `Ch ${r.chapter.number} · ` : ''}${b.heading ?? 'Vocabulary'}`, lesson: r, items, source: b.source, rhythmNative: false });
      }
    }
    return out.sort((a, b) => Number(b.rhythmNative) - Number(a.rhythmNative));
  }, [lessons, reached]);

  const [drillId, setDrillId] = useState<string>('');
  const drill = drills.find((d) => d.id === drillId) ?? drills[0];
  const [level, setLevel] = useState<'easier' | 'harder'>('easier');
  const [bpm, setBpm] = useState(72);
  const [countIn, setCountIn] = useState(4);
  const [prep, setPrep] = useState(4);
  const [respond, setRespond] = useState(4);
  const [reveal, setReveal] = useState(2);
  const [autoFit, setAutoFit] = useState(true);
  const [count, setCount] = useState(8);
  const [roundItems, setRoundItems] = useState<RItem[]>([]);
  const [status, setStatus] = useState<'setup' | 'running' | 'paused' | 'finished'>('setup');
  const [beatIdx, setBeatIdx] = useState(-1);
  const metro = useRef<Metronome | null>(null);
  const timeline = useRef<Beat[]>([]);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (level === 'easier') { setBpm(66); setPrep(4); setRespond(4); }
    else { setBpm(84); setPrep(2); setRespond(4); }
  }, [level]);

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    metro.current?.close();
  }, []);

  if (!course) return <div className="notice">Course not found.</div>;

  const pickItems = () => {
    if (!drill) return [];
    let pool = drill.items;
    if (level === 'easier') {
      const short = pool.filter((i) => i.words <= 4);
      if (short.length >= 3) pool = short;
    }
    return pool.slice(0, count === 0 ? pool.length : count);
  };

  const run = async (items: RItem[]) => {
    stopAudio();
    setRoundItems(items);
    timeline.current = buildTimeline(items.map((i) => i.words), {
      countIn, prepBeats: prep, respondBeats: respond, revealBeats: reveal, wordsPerExtraBeat: autoFit ? 3 : 0,
    });
    metro.current = metro.current ?? new Metronome();
    await metro.current.start(timeline.current, bpm);
    setStatus('running');
    const tick = () => {
      const pos = metro.current!.position();
      const i = Math.floor(pos);
      if (i >= timeline.current.length) {
        setStatus('finished');
        setBeatIdx(-1);
        progress.completeActivity(courseId, `rhythm:${drill?.id}`);
        return;
      }
      setBeatIdx(i);
      raf.current = requestAnimationFrame(tick);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  };

  const pause = async () => { await metro.current?.pause(); setStatus('paused'); };
  const resume = async () => { await metro.current?.resume(); setStatus('running'); };
  const stop = () => {
    metro.current?.stop();
    if (raf.current) cancelAnimationFrame(raf.current);
    setStatus('setup');
    setBeatIdx(-1);
  };

  if (!drills.length) {
    return (
      <div className="card arch-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">The courtyard · Rhythm</div>
        <h1>Rhythm practice opens as you study</h1>
        <p className="muted">Rhythm rounds only use material you've already reached in the book. Open a lesson with a drill first.</p>
        <a className="btn primary" href={`#/c/${courseId}`}>Go to lessons</a>
      </div>
    );
  }

  const beat = beatIdx >= 0 ? timeline.current[beatIdx] : null;
  const cur = beat && beat.item >= 0 ? roundItems[beat.item] : null;
  // visible pulse for the current phase
  const phaseBeats = beat ? Array.from({ length: beat.phaseLength }, (_, k) => k) : [];

  if (status !== 'setup' && status !== 'finished') {
    return (
      <div className="stack">
        <div className="card metro-stage tiles" style={{ minHeight: 340 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">{bpm} BPM</span>
            <span className="small muted">{cur ? `${beat!.item + 1} / ${roundItems.length}` : ''}</span>
          </div>
          <div className={`phase ${beat?.phase ?? ''}`}>
            {beat?.phase === 'count' ? 'Get ready' : beat?.phase === 'prep' ? 'Read the cue' : beat?.phase === 'respond' ? 'Say it now' : beat?.phase === 'reveal' ? 'Check' : ''}
          </div>
          <div className="beats" aria-hidden="true">
            {phaseBeats.map((k) => (
              <span key={k} className={`beat ${beat?.phase === 'respond' ? 'respond' : ''} ${k === beat?.beatInPhase ? 'on' : ''}`} />
            ))}
          </div>
          <div style={{ minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            {beat?.phase === 'count' && <div style={{ fontSize: '3rem', fontWeight: 600 }}>{beat.phaseLength - beat.beatInPhase}</div>}
            {cur && (
              <>
                {cur.segments?.some((x) => x.blank) ? (
                  <>
                    <SegmentsAr segments={cur.segments} />
                    {cur.translitSegments && s.showTranslit && <SegmentsTranslit segments={cur.translitSegments} />}
                  </>
                ) : cur.cue.en && !cur.cue.ar ? (
                  <div style={{ fontSize: '1.4rem', fontWeight: 500 }}>{cur.cue.en}</div>
                ) : (
                  cur.cue.ar && <Ar size="xl">{cur.cue.ar}</Ar>
                )}
                {beat!.phase === 'reveal' && (
                  <div className="model-line" style={{ marginTop: 6 }}>
                    <Ar size="lg">{cur.model.ar}</Ar>
                    {cur.model.translit && s.showTranslit && <div className="translit">{cur.model.translit}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="sticky-actions">
          {status === 'running' ? (
            <button className="btn" onClick={pause}><Icon name="pause" /> Pause</button>
          ) : (
            <button className="btn primary" onClick={resume}><Icon name="play" /> Resume</button>
          )}
          <button className="btn" onClick={() => run(roundItems)}><Icon name="replay" /> Restart</button>
          <button className="btn ghost" onClick={stop}>Stop</button>
        </div>
        <p className="small muted" style={{ textAlign: 'center' }}>
          Answer aloud during the green beats. Prompts move on their own — no need to press anything. Model audio is saved for the end of the round so it never breaks the beat.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card arch-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">The courtyard · Rhythm</div>
        <h1>Practise in rhythm</h1>
        <p className="muted" style={{ margin: 0 }}>A steady beat, a short count-in, then cue → answer aloud → check, again and again.</p>
      </div>

      {status === 'finished' && (
        <div className="card">
          <h2>Round complete</h2>
          <p className="small muted">Listen to the full sentences, say each once more, then go again.</p>
          {roundItems.map((it) => (
            <div key={it.id} className="phrase">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <AudioButton courseId={courseId} phrase={it.model} keys={[it.id]} compact />
                <Ar size="md">{it.model.ar}</Ar>
              </div>
              {it.model.translit && <div className="translit small">{it.model.translit}</div>}
            </div>
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={() => run(roundItems)}><Icon name="replay" /> Replay round</button>
            <button className="btn" onClick={() => run(pickItems())}>New round</button>
          </div>
        </div>
      )}

      <div className="card stack">
        <label className="range">
          <span className="small">Drill (from lessons you've reached)</span>
          <select value={drill?.id} onChange={(e) => setDrillId(e.target.value)} style={{ minHeight: 44, borderRadius: 10, padding: '0 8px', background: 'var(--plaster)', border: '1px solid var(--line)' }}>
            {drills.map((d) => (
              <option key={d.id} value={d.id}>{d.rhythmNative ? '♩ ' : ''}{d.label} ({d.items.length})</option>
            ))}
          </select>
        </label>
        {drill && <SourceLink source={drill.source} />}
        <div className="row">
          <button className={`chip ${level === 'easier' ? 'on' : ''}`} onClick={() => setLevel('easier')}>Easier</button>
          <button className={`chip ${level === 'harder' ? 'on' : ''}`} onClick={() => setLevel('harder')}>Harder</button>
          <span className="small muted">Easier favours short items with more time; harder is faster with less preparation.</span>
        </div>
        <Slider label={`Tempo: ${bpm} BPM`} min={40} max={140} value={bpm} onChange={setBpm} />
        <Slider label={`Count-in: ${countIn} beats`} min={2} max={8} value={countIn} onChange={setCountIn} />
        <Slider label={`Preparation: ${prep} beats`} min={1} max={8} value={prep} onChange={setPrep} />
        <Slider label={`Response window: ${respond} beats${autoFit ? ' + more for longer sentences' : ''}`} min={2} max={12} value={respond} onChange={setRespond} />
        <Slider label={`Show answer: ${reveal} beats`} min={0} max={4} value={reveal} onChange={setReveal} />
        <label className="row small"><input type="checkbox" checked={autoFit} onChange={(e) => setAutoFit(e.target.checked)} /> Add a beat for every 3 extra words</label>
        <label className="row small">
          Items per round
          <select value={count} onChange={(e) => setCount(+e.target.value)}>
            <option value={5}>5</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={0}>All</option>
          </select>
        </label>
        <button className="btn primary" onClick={() => run(pickItems())}><Icon name="play" /> Start round</button>
      </div>
    </div>
  );
}

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (n: number) => void }) {
  return (
    <label className="range">
      <span className="small">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

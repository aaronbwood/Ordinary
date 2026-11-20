import { useEffect, useMemo, useRef, useState } from 'react';
import type { Phrase, VocabItem } from '../content/types';
import { exercisesOf, flatLessons, getCourse } from '../content/loader';
import { Metronome, type Beat } from '../lib/metronome';
import { expandOptions, speakerResponderPlan, vocabPlan, type Seg, type SRPair, type VocabWord } from '../lib/rhythmPlans';
import { progress, useProgress, useSettings } from '../state/progress';
import { stopAudio } from '../audio/audio';
import { Ar, AudioButton, SourceLink } from '../components/common';
import { Icon } from '../components/icons';
import { syllabify } from '../lib/syllables';
import { findBank, vocabBanks } from '../lib/vocabBanks';

type Mode = 'sr' | 'vocab';

function hashQuery(): URLSearchParams {
  const q = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(q);
}

interface Bank {
  key: string;
  memberKeys: string[];
  label: string;
  heading: string;
  chapter: number;
  lessonIndex: number;
  words: VocabWord[];
  source?: { designId: string; pages?: number[] };
}

export function RhythmView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  const s = useSettings();
  const q = hashQuery();
  const [mode, setMode] = useState<Mode>(q.get('mode') === 'sr' ? 'sr' : 'vocab');

  const lessons = useMemo(() => (course ? flatLessons(course) : []), [course]);
  const reached = useMemo(() => {
    const idx = lessons.filter((r) => p.completedLessons[r.lesson.id] || r.lesson.id === p.lastLessonId).map((r) => r.index);
    return idx.length ? Math.max(...idx) : -1;
  }, [lessons, p]);

  // Speaker–Responder exchanges (Solo Practice, p.40), every slash option practised
  const srSets = useMemo(() => {
    const out: { id: string; title: string; lessonId: string; pairs: SRPair[]; source?: any }[] = [];
    for (const r of lessons)
      for (const ex of exercisesOf(r.lesson)) {
        if (ex.exerciseType !== 'speaker-responder') continue;
        const pairs: SRPair[] = [];
        for (const it of ex.items) {
          if (!it.prompt?.ar) continue;
          const responses = (it.answers?.length ? it.answers : it.model ? [it.model] : []).flatMap((a) => expandOptions(a as Phrase));
          for (const sp of expandOptions(it.prompt))
            for (const rs of responses) pairs.push({ id: `${it.id}:${pairs.length}`, title: (it as any).title, speaker: sp, responder: { ...rs, en: it.model?.en } });
        }
        out.push({ id: ex.id, title: ex.title ?? 'Speaker–Responder', lessonId: r.lesson.id, pairs, source: ex.source });
      }
    return out;
  }, [lessons]);

  // Every vocabulary bank in the book, in book order
  const banks: Bank[] = useMemo(() => {
    if (!course) return [];
    return vocabBanks(course)
      .map((b) => ({
        key: b.key,
        memberKeys: b.memberKeys,
        heading: b.heading,
        label: `Ch ${b.chapter} · ${b.heading}`,
        chapter: b.chapter,
        lessonIndex: b.lessonIndex,
        source: b.source,
        words: b.items.filter((v) => v.ar && v.translit).map((v) => ({ id: v.id, ar: v.ar!, translit: v.translit!, en: v.en, syllables: (v as any).syllables })),
      }))
      .filter((b) => b.words.length);
  }, [course]);
  const chapters = useMemo(() => [...new Set(banks.map((b) => b.chapter))], [banks]);
  // "later" only for chapters after the one the student has reached (at least Chapter 1)
  const reachedChapter = Math.max(1, lessons.find((r) => r.index === reached)?.chapter.number ?? 1);

  const defaultBank = findBank(banks, q.get('bank'))?.key ?? [...banks].reverse().find((b) => b.lessonIndex <= reached)?.key ?? banks[0]?.key;
  const [bankKey, setBankKey] = useState(defaultBank ?? '');
  const bank = banks.find((b) => b.key === bankKey) ?? banks[0];
  const [chapterSel, setChapterSel] = useState<number>(bank?.chapter ?? 1);
  const [chunk, setChunk] = useState(0);
  const CHUNK = 8;
  useEffect(() => setChunk(0), [bankKey]);

  const [srId, setSrId] = useState(srSets[0]?.id ?? '');
  const srSet = srSets.find((x) => x.id === srId) ?? srSets[0];
  const [srChunk, setSrChunk] = useState(0);
  const SR_CHUNK = 5;

  // Book tempos: Speaker–Responder 70–90 BPM; vocabulary 60–80 BPM.
  const [bpmSR, setBpmSR] = useState(80);
  const [bpmV, setBpmV] = useState(66);
  const [repeats, setRepeats] = useState(2);
  const [reverse, setReverse] = useState(true);
  const [passes, setPasses] = useState(2);

  const [status, setStatus] = useState<'setup' | 'running' | 'paused' | 'finished'>('setup');
  const [beatIdx, setBeatIdx] = useState(-1);
  const metro = useRef<Metronome | null>(null);
  const plan = useRef<{ segs: Seg[]; beats: Beat[] }>({ segs: [], beats: [] });
  const raf = useRef<number | null>(null);
  const roundItems = useRef<{ mode: Mode; pairs?: SRPair[]; words?: VocabWord[] }>({ mode: 'vocab' });

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    metro.current?.close();
  }, []);

  if (!course) return <div className="notice">Course not found.</div>;

  const words = bank ? bank.words.slice(chunk * CHUNK, chunk * CHUNK + CHUNK) : [];
  const pairs = srSet ? srSet.pairs.slice(srChunk * SR_CHUNK, srChunk * SR_CHUNK + SR_CHUNK) : [];

  const run = async (m: Mode) => {
    stopAudio();
    if (m === 'sr') {
      roundItems.current = { mode: 'sr', pairs };
      plan.current = speakerResponderPlan(pairs, { countIn: 4, repeats, reverse, restBeats: 2 });
    } else {
      roundItems.current = { mode: 'vocab', words };
      plan.current = vocabPlan(words, { countIn: 4, showBeats: 2, syllablePasses: passes });
    }
    window.scrollTo(0, 0);
    metro.current = metro.current ?? new Metronome();
    await metro.current.start(plan.current.beats, m === 'sr' ? bpmSR : bpmV);
    setStatus('running');
    const tick = () => {
      const i = Math.floor(metro.current!.position());
      if (i >= plan.current.beats.length) {
        setStatus('finished');
        setBeatIdx(-1);
        progress.completeActivity(courseId, m === 'sr' ? `rhythm:sr:${srSet?.id}:${srChunk}` : `rhythm:vocab:${bank?.key}:${chunk}`);
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

  // ---------------- running ----------------
  if (status === 'running' || status === 'paused') {
    const beat = beatIdx >= 0 ? plan.current.beats[beatIdx] : null;
    const seg = beat?.seg != null ? plan.current.segs[beat.seg] : null;
    return (
      <div className="stack">
        <div className="card metro-stage tiles" style={{ minHeight: 360 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">{roundItems.current.mode === 'sr' ? bpmSR : bpmV} BPM</span>
            <span className="small muted">{seg && seg.item >= 0 ? `${seg.item + 1} / ${(roundItems.current.pairs ?? roundItems.current.words ?? []).length}` : ''}</span>
          </div>
          <Pulse beat={beat} />
          {seg?.kind === 'count' && <div style={{ fontSize: '3rem', fontWeight: 600 }}>{beat!.phaseLength - beat!.beatInPhase}</div>}
          {seg && seg.kind !== 'count' && roundItems.current.mode === 'sr' && (
            <SRStage pair={roundItems.current.pairs![seg.item]} seg={seg} beat={beat!} showTranslit={s.showTranslit} />
          )}
          {seg && seg.kind !== 'count' && roundItems.current.mode === 'vocab' && (
            <VocabStage word={roundItems.current.words![seg.item]} seg={seg} />
          )}
        </div>
        <div className="sticky-actions">
          {status === 'running' ? (
            <button className="btn" onClick={pause}><Icon name="pause" /> Pause</button>
          ) : (
            <button className="btn primary" onClick={resume}><Icon name="play" /> Resume</button>
          )}
          <button className="btn" onClick={() => run(roundItems.current.mode)}><Icon name="replay" /> Restart</button>
          <button className="btn ghost" onClick={stop}>Stop</button>
        </div>
        <p className="small muted" style={{ textAlign: 'center' }}>
          {roundItems.current.mode === 'sr'
            ? 'Say both parts yourself. LOUD lines in a clear, confident voice; SOFT lines more quietly — soft does not mean silently. Let the beat land on the consonants.'
            : 'One syllable on each click, then the whole word in one smooth flow. Picture it, hear it, feel it.'}
        </p>
      </div>
    );
  }

  // ---------------- setup / finished ----------------
  return (
    <div className="stack">
      <div className="card arch-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">الحوش · Metronome practice</div>
        <h1>Practise to the beat</h1>
        <p className="muted" style={{ margin: 0 }}>The two metronome methods from the book: encoding new vocabulary, and the Speaker–Responder solo practice.</p>
      </div>

      <div className="row" role="tablist" aria-label="Method">
        <button role="tab" aria-selected={mode === 'vocab'} className={`chip ${mode === 'vocab' ? 'on' : ''}`} onClick={() => { setMode('vocab'); setStatus('setup'); }}>
          Vocabulary · Sound–Image–Feeling
        </button>
        <button role="tab" aria-selected={mode === 'sr'} className={`chip ${mode === 'sr' ? 'on' : ''}`} onClick={() => { setMode('sr'); setStatus('setup'); }}>
          Speaker–Responder · solo practice
        </button>
      </div>

      {status === 'finished' && <RoundSummary courseId={courseId} items={roundItems.current} onReplay={() => run(roundItems.current.mode)} />}

      {mode === 'vocab' && bank && (
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Vocabulary banks</h2>
            <SourceLink source={{ designId: 'DAHaz00vw2w', pages: [82] }} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Metronome Practice (p.82): set a slow, comfortable tempo (about 60–80 beats per minute), say one syllable on each click, repeat slowly until it feels natural, then say the whole word in one smooth flow.
          </p>
          <div className="row" role="tablist" aria-label="Chapter">
            {chapters.map((n) => (
              <button key={n} role="tab" aria-selected={chapterSel === n} className={`chip ${chapterSel === n ? 'on' : ''}`} onClick={() => setChapterSel(n)}>
                Chapter {n}
              </button>
            ))}
          </div>
          <div className="bank-list" aria-label={`Chapter ${chapterSel} vocabulary banks`}>
            {banks.filter((b) => b.chapter === chapterSel).map((b) => {
              const chunks = Math.ceil(b.words.length / CHUNK);
              const done = Array.from({ length: chunks }).filter((_, i) => p.completedActivities[`rhythm:vocab:${b.key}:${i}`]).length;
              return (
                <button key={b.key} className={`bank-chip ${b.key === bank.key ? 'on' : ''}`} aria-pressed={b.key === bank.key} onClick={() => setBankKey(b.key)}>
                  <span>{b.heading}</span>
                  <span className="small muted">{b.words.length} words{done ? ` · ${done}/${chunks} ✓` : ''}{b.chapter > reachedChapter ? ' · later in the book' : ''}</span>
                </button>
              );
            })}
          </div>
          <h3 style={{ margin: '4px 0 0' }}>{bank.label}</h3>
          <div className="row" aria-label="Words">
            {Array.from({ length: Math.ceil(bank.words.length / CHUNK) }).map((_, i) => (
              <button key={i} className={`chip ${chunk === i ? 'on' : ''}`} onClick={() => setChunk(i)}>
                {i * CHUNK + 1}–{Math.min(bank.words.length, (i + 1) * CHUNK)}
                {p.completedActivities[`rhythm:vocab:${bank.key}:${i}`] ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <div className="vocab-grid">
            {words.map((w) => (
              <div key={w.id} className="vocab-card">
                <Ar size="md">{w.ar}</Ar>
                <span className="translit">{(w.syllables?.length ? w.syllables : syllabify(w.translit)).join(' · ')}</span>
                {w.en && <span className="en">{w.en}</span>}
              </div>
            ))}
          </div>
          <Slider label={`Tempo: ${bpmV} BPM (book: 60–80)`} min={40} max={120} value={bpmV} onChange={setBpmV} />
          <Slider label={`Syllable passes per word: ${passes}`} min={1} max={4} value={passes} onChange={setPasses} />
          <p className="small muted" style={{ margin: 0 }}>The syllable beats are worked out from the book's transliteration.</p>
          <button className="btn primary" onClick={() => run('vocab')}><Icon name="play" /> Start</button>
        </div>
      )}

      {mode === 'sr' && srSet && (
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>{srSet.title}</h2>
            <SourceLink source={{ designId: 'DAHaz00vw2w', pages: [40] }} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            The Speaker–Responder Method (p.40): Speaker loud, Responder soft, then reverse the roles. Start around 70–90 BPM. If you are alone, say both parts yourself. Every option after a slash is practised.
          </p>
          <div className="row">
            {Array.from({ length: Math.ceil(srSet.pairs.length / SR_CHUNK) }).map((_, i) => (
              <button key={i} className={`chip ${srChunk === i ? 'on' : ''}`} onClick={() => setSrChunk(i)}>
                {i * SR_CHUNK + 1}–{Math.min(srSet.pairs.length, (i + 1) * SR_CHUNK)}
                {p.completedActivities[`rhythm:sr:${srSet.id}:${i}`] ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <div>
            {pairs.map((pr) => (
              <div key={pr.id} className="sr-preview">
                <div className="sr-row speaker"><span className="sr-tag">Speaker</span><Ar size="md">{pr.speaker.ar}</Ar></div>
                <div className="sr-row responder"><span className="sr-tag">Responder</span><Ar size="md">{pr.responder.ar}</Ar></div>
              </div>
            ))}
          </div>
          <Slider label={`Tempo: ${bpmSR} BPM (book: 70–90)`} min={40} max={140} value={bpmSR} onChange={setBpmSR} />
          <Slider label={`Repeat each pair: ${repeats}×`} min={1} max={4} value={repeats} onChange={setRepeats} />
          <label className="row small">
            <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} /> Round 2 — reverse practice (speaker soft, responder loud)
          </label>
          <button className="btn primary" onClick={() => run('sr')}><Icon name="play" /> Start</button>
        </div>
      )}
      {mode === 'sr' && !srSet && <div className="notice">No Speaker–Responder drill in this course.</div>}
    </div>
  );
}


function Pulse({ beat }: { beat: Beat | null }) {
  if (!beat) return <div className="beats" />;
  return (
    <div className="beats" aria-hidden="true">
      {Array.from({ length: Math.min(beat.phaseLength, 12) }).map((_, k) => (
        <span key={k} className={`beat ${k === beat.beatInPhase ? 'on' : ''} ${beat.soft ? 'soft' : ''}`} />
      ))}
    </div>
  );
}

function SyllableLine({ syl, active }: { syl: string[]; active: number }) {
  return (
    <div className="syl-line translit">
      {syl.map((x, i) => (
        <span key={i} className={i === active ? 'syl on' : 'syl'}>{x}</span>
      ))}
    </div>
  );
}

function SRStage({ pair, seg, beat, showTranslit }: { pair: SRPair; seg: Seg; beat: Beat; showTranslit: boolean }) {
  const speakerActive = seg.role === 'speaker';
  const responderActive = seg.role === 'responder';
  const round = seg.round ?? 1;
  const vol = (role: 'speaker' | 'responder') => (round === 1 ? (role === 'speaker' ? 'Loud' : 'Soft') : role === 'speaker' ? 'Soft' : 'Loud');
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className={`phase ${round === 1 ? 'prep' : 'respond'}`}>Round {round} · {round === 1 ? 'Normal' : 'Reverse practice'}</div>
      {pair.title && <div className="small muted">{pair.title}</div>}
      {(['speaker', 'responder'] as const).map((role) => {
        const ph = role === 'speaker' ? pair.speaker : pair.responder;
        const active = role === 'speaker' ? speakerActive : responderActive;
        const loud = vol(role) === 'Loud';
        return (
          <div key={role} className={`sr-line ${role} ${active ? 'active' : ''} ${loud ? 'loud' : 'soft'}`}>
            <div className="sr-tag">{role === 'speaker' ? 'Speaker' : 'Responder'} ({vol(role)})</div>
            <Ar size={loud ? 'xl' : 'lg'}>{ph.ar}</Ar>
            {showTranslit && ph.translit && (active ? <SyllableLine syl={seg.syllables ?? []} active={beat.beatInPhase} /> : <div className="translit small">{ph.translit}</div>)}
          </div>
        );
      })}
      {seg.kind === 'rest' && <div className="small muted">…and again</div>}
    </div>
  );
}

function VocabStage({ word, seg }: { word: VocabWord; seg: Seg }) {
  const syl = seg.syllables ?? [];
  return (
    <div className="stack" style={{ gap: 6, alignItems: 'center' }}>
      <div className={`phase ${seg.kind === 'whole' ? 'reveal' : 'prep'}`}>
        {seg.kind === 'show' ? 'See it · picture it' : seg.kind === 'syllable' ? 'One syllable per click' : seg.kind === 'whole' ? 'The whole word, one smooth flow' : '…'}
      </div>
      <Ar size="xl">{word.ar}</Ar>
      <SyllableLine syl={syl} active={seg.kind === 'syllable' ? seg.syllableIndex ?? -1 : seg.kind === 'whole' ? -2 : -1} />
      {seg.kind === 'whole' && <div className="translit" style={{ fontWeight: 600 }}>{word.translit}</div>}
      {word.en && <div className="en">{word.en}</div>}
    </div>
  );
}

function RoundSummary({ courseId, items, onReplay }: { courseId: string; items: { mode: Mode; pairs?: SRPair[]; words?: VocabWord[] }; onReplay: () => void }) {
  return (
    <div className="card">
      <h2>Round complete</h2>
      <p className="small muted">Listen to the full models, say each once more out loud, then go again.</p>
      {items.mode === 'sr'
        ? items.pairs?.map((pr) => (
            <div key={pr.id} className="phrase">
              {[pr.speaker, pr.responder].map((ph, i) => (
                <div key={i} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <AudioButton courseId={courseId} phrase={ph} compact />
                  <Ar size="md">{ph.ar}</Ar>
                </div>
              ))}
            </div>
          ))
        : items.words?.map((w) => (
            <div key={w.id} className="phrase">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <AudioButton courseId={courseId} phrase={w} keys={[w.id]} compact />
                <Ar size="md">{w.ar}</Ar>
              </div>
              <div className="translit small">{w.translit}</div>
            </div>
          ))}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={onReplay}><Icon name="replay" /> Replay round</button>
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

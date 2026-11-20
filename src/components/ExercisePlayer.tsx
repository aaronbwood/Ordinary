import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Exercise, ExerciseItem, Phrase } from '../content/types';
import { checkSubmission, completeModel, type CheckResult } from '../lib/check';
import { playPhrase, playUrl, resolveSource, type PlaybackSource } from '../audio/audio';
import { progress, useSettings } from '../state/progress';
import { SpeakControl, type Submission } from './SpeakControl';
import { Ar, AidToggles, AudioSourceBadge, Flags, ProgressBar, SegmentsAr, SegmentsTranslit, SourceLink } from './common';
import { Icon } from './icons';

export type ItemOutcome = { item: ExerciseItem; result: CheckResult; sub: Submission };

/** Which language the student answers in, by exercise type. */
export function answerTarget(ex: Exercise, item?: ExerciseItem): 'ar' | 'en' {
  if (ex.exerciseType === 'translate-to-english') return 'en';
  // keys that only contain English labels (e.g. "Plural — Definite") are answered in English
  const a = item?.answers ?? [];
  if (a.length && a.every((x) => !x.ar && !x.translit && x.en)) return 'en';
  return 'ar';
}

const VERDICT_TEXT: Record<string, string> = {
  correct: 'Correct',
  close: 'Almost — check the highlighted words',
  incorrect: 'Not quite',
  unclear: "We couldn't hear that clearly",
  'no-key': 'Answer recorded — not graded',
};

export function ExercisePlayer({
  courseId,
  lessonId,
  exercise,
  items: itemsOverride,
  onDone,
  title,
}: {
  courseId: string;
  lessonId: string;
  exercise: Exercise;
  items?: { item: ExerciseItem; exercise: Exercise; lessonId: string }[];
  onDone?: (outcomes: ItemOutcome[]) => void;
  title?: string;
}) {
  const initial = useMemo(
    () => itemsOverride ?? exercise.items.map((item) => ({ item, exercise, lessonId })),
    [itemsOverride, exercise, lessonId],
  );
  const [queue, setQueue] = useState(initial);
  const [pos, setPos] = useState(0);
  const [outcomes, setOutcomes] = useState<ItemOutcome[]>([]);
  const [current, setCurrent] = useState<{ result: CheckResult; sub: Submission } | null>(null);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const done = pos >= queue.length;

  useEffect(() => {
    setQueue(initial);
    setPos(0);
    setOutcomes([]);
    setCurrent(null);
  }, [initial]);

  const entry = queue[pos];

  const submit = useCallback(
    (sub: Submission) => {
      if (!entry) return;
      // Open discussion questions are not graded; the book's reference answers are shown instead.
      const result: CheckResult =
        entry.exercise.exerciseType === 'discussion'
          ? { verdict: 'no-key', note: 'Open discussion — compare what you said with the reference below.' }
          : checkSubmission(entry.item, sub, answerTarget(entry.exercise, entry.item));
      setCurrent({ result, sub });
      progress.recordItem(courseId, entry.item.id, entry.lessonId, result.verdict);
    },
    [entry, courseId],
  );

  const next = () => {
    if (!entry || !current) return;
    const outcome = { item: entry.item, result: current.result, sub: current.sub };
    setOutcomes((o) => [...o, outcome]);
    // Missed items come back once at the end of the set.
    if ((current.result.verdict === 'incorrect' || current.result.verdict === 'close') && !retried.has(entry.item.id)) {
      setRetried((s) => new Set(s).add(entry.item.id));
      setQueue((q) => [...q, entry]);
    }
    setCurrent(null);
    setPos((p) => p + 1);
  };

  useEffect(() => {
    if (done && queue.length) {
      if (!itemsOverride) progress.completeActivity(courseId, exercise.id);
      onDone?.(outcomes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!queue.length) return <div className="notice">This exercise has no items in the source.</div>;

  if (done) {
    const firstTry = outcomes.filter((o, i) => outcomes.findIndex((x) => x.item.id === o.item.id) === i);
    const right = firstTry.filter((o) => o.result.verdict === 'correct').length;
    return (
      <div className="card stack" style={{ textAlign: 'center' }}>
        <div className="eyebrow">{title ?? exercise.title}</div>
        <h2>
          Done — {right} of {firstTry.length} on the first try
        </h2>
        <p className="muted">Missed items have been added to your review. Say everything out loud one more time.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => { setQueue(initial); setPos(0); setOutcomes([]); setRetried(new Set()); }}>
            <Icon name="replay" /> Practise again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="practice">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">{title ?? entry.exercise.title ?? 'Practice'}</div>
          <div className="small muted">
            {Math.min(pos + 1, queue.length)} / {queue.length}
            {pos >= initial.length && ' · second try'}
          </div>
        </div>
        <SourceLink source={entry.item.source ?? entry.exercise.source} />
      </div>
      <ProgressBar value={pos / queue.length} />
      {entry.exercise.instructions && pos === 0 && <p className="small muted" style={{ margin: 0 }}>{entry.exercise.instructions}</p>}

      <ItemPrompt courseId={courseId} exercise={entry.exercise} item={entry.item} answered={!!current} />

      {!current ? (
        <SpeakControl key={entry.item.id + pos} onSubmit={submit} answerScript={answerTarget(entry.exercise, entry.item)} />
      ) : (
        <Feedback
          courseId={courseId}
          item={entry.item}
          exercise={entry.exercise}
          result={current.result}
          sub={current.sub}
          onRetry={() => setCurrent(null)}
          onCorrectTranscript={(text) => submit({ text, via: 'typed' })}
          onNext={next}
        />
      )}
      <AidToggles />
    </div>
  );
}

export function ItemPrompt({ courseId, exercise, item, answered }: { courseId: string; exercise: Exercise; item: ExerciseItem; answered: boolean }) {
  const s = useSettings();
  const [revealEn, setRevealEn] = useState(false);
  const [revealTr, setRevealTr] = useState(false);
  useEffect(() => {
    setRevealEn(false);
    setRevealTr(false);
  }, [item.id]);
  const t = exercise.exerciseType;
  const p = item.prompt ?? {};
  const showTr = s.showTranslit || revealTr;
  const showEn = s.showEnglish || revealEn;

  // Fill-in-the-blank: Arabic sentence with blank is primary; transliteration shows the same blank.
  if (item.segments?.some((x) => x.blank)) {
    return (
      <div className="card prompt-card tiles-soft">
        <SegmentsAr segments={item.segments} />
        {item.translitSegments && showTr && (
          <div style={{ marginTop: 6 }}>
            <SegmentsTranslit segments={item.translitSegments} />
          </div>
        )}
        {/* the book's English sentence is the cue for the blank; it does not reveal the Arabic */}
        {p.en && <div className="en" style={{ marginTop: 6 }}>{p.en}</div>}
        <HintChips hasTr={!!item.translitSegments && !s.showTranslit} hasEn={false} onTr={() => setRevealTr(true)} onEn={() => setRevealEn(true)} />
        <Flags flags={item.flags} />
      </div>
    );
  }

  // English → Arabic production: the English cue is the prompt; Arabic is never shown before answering.
  if (t === 'translate-to-arabic' || t === 'vocab-recall' || (!p.ar && p.en)) {
    return (
      <div className="card prompt-card">
        <div className="eyebrow">Say it in Arabic</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 500 }}>{p.en ?? p.translit}</div>
        {p.note && <div className="small muted">{p.note}</div>}
        <Flags flags={item.flags} />
      </div>
    );
  }

  // Arabic prompt (speaker-responder, transform, listening, translate-to-english, multiple-choice …)
  const listening = t === 'listening';
  const src = resolveSource(courseId, p, [item.id + ':prompt']);
  return (
    <div className="card prompt-card">
      {t === 'speaker-responder' && <div className="eyebrow">Respond</div>}
      {t === 'transform' && <div className="eyebrow">Transform</div>}
      {t === 'translate-to-english' && <div className="eyebrow">Say it in English</div>}
      {listening && (
        <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <button className="btn olive" disabled={src === 'unavailable'} onClick={() => playPhrase(courseId, p, [item.id + ':prompt'])}>
            <Icon name="speaker" /> Listen
          </button>
          <AudioSourceBadge source={src} />
        </div>
      )}
      {(!listening || src === 'unavailable' || answered) && p.ar && <Ar size="xl">{p.ar}</Ar>}
      {p.translit && showTr && <div className="translit">{p.translit}</div>}
      {p.en && showEn && t !== 'translate-to-english' && <div className="en">{p.en}</div>}
      <HintChips hasTr={!!p.translit && !s.showTranslit} hasEn={!!p.en && !s.showEnglish && t !== 'translate-to-english'} onTr={() => setRevealTr(true)} onEn={() => setRevealEn(true)} />
      {item.choices?.length ? <div className="small muted" style={{ marginTop: 8 }}>Choices: {item.choices.map((c) => c.ar ?? c.en).join(' · ')}</div> : null}
      <Flags flags={item.flags} />
    </div>
  );
}

function HintChips({ hasTr, hasEn, onTr, onEn }: { hasTr: boolean; hasEn: boolean; onTr: () => void; onEn: () => void }) {
  if (!hasTr && !hasEn) return null;
  return (
    <div className="aids">
      {hasTr && <button className="chip" onClick={onTr}>Reveal transliteration</button>}
      {hasEn && <button className="chip" onClick={onEn}>Reveal English</button>}
    </div>
  );
}

export function Feedback({
  courseId,
  item,
  exercise,
  result,
  sub,
  onRetry,
  onCorrectTranscript,
  onNext,
}: {
  courseId: string;
  item: ExerciseItem;
  exercise: Exercise;
  result: CheckResult;
  sub: Submission;
  onRetry: () => void;
  onCorrectTranscript: (text: string) => void;
  onNext: () => void;
}) {
  const s = useSettings();
  const model: Phrase | null = completeModel(item, result.matched) ?? null;
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<PlaybackSource>(() => resolveSource(courseId, model, [item.id]));
  const [editing, setEditing] = useState(false);
  const [fix, setFix] = useState(sub.text);
  const play = useCallback(() => {
    setPlaying(true);
    setSrc(playPhrase(courseId, model, [item.id], () => setPlaying(false)));
  }, [courseId, model, item.id]);

  // After a correct answer, play the complete Arabic sentence (if auto-play is on).
  useEffect(() => {
    if (result.verdict === 'correct' && s.autoPlayModel) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter = continue (when not typing)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Enter') { e.preventDefault(); onNext(); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); onRetry(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onNext, onRetry]);

  const v = result.verdict;
  const heard = sub.via === 'speech' ? sub.text : null;
  const noTranscript = sub.via === 'speech' && sub.recognition === 'unavailable';

  return (
    <div className={`feedback ${noTranscript ? 'no-key' : v}`} role="status" aria-live="polite">
      <div className="verdict">
        {v === 'correct' ? '✓ ' : v === 'incorrect' ? '✗ ' : ''}
        {noTranscript ? 'Recorded — compare with the model' : VERDICT_TEXT[v]}
      </div>
      {result.note && <div className="small">{result.note}</div>}

      {heard != null && !noTranscript && (
        <div className="small" style={{ marginTop: 4 }}>
          Heard: <span className="ar ar-sm">{heard || '—'}</span>{' '}
          <button className="chip" onClick={() => setEditing((x) => !x)}>Fix transcript</button>
        </div>
      )}
      {sub.via === 'typed' && <div className="small">You wrote: <span dir="auto">{sub.text}</span></div>}
      {editing && (
        <form className="text-answer" style={{ marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); onCorrectTranscript(fix); }}>
          <input dir="auto" className="ar-input" value={fix} onChange={(e) => setFix(e.target.value)} aria-label="Correct the transcript" />
          <button className="btn small" type="submit">Re-check</button>
        </form>
      )}
      {v === 'close' && (result.missing?.length || result.extra?.length) ? (
        <div className="small" style={{ marginTop: 4 }}>
          {result.missing?.length ? <>Expected: <span className="ar ar-sm mark-missing">{result.missing.join(' ')}</span> </> : null}
          {result.extra?.length ? <>· Not expected: <span className="ar ar-sm">{result.extra.join(' ')}</span></> : null}
        </div>
      ) : null}

      {model && (model.ar || model.translit) && (
        <div className={`model-line ${playing ? 'playing' : ''}`}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <button className="btn small icon" style={{ width: 38 }} onClick={play} aria-label="Replay the complete sentence" disabled={src === 'unavailable'}>
              <Icon name={src === 'unavailable' ? 'speaker-off' : 'replay'} />
            </button>
            {model.ar && <Ar size="lg">{model.ar}</Ar>}
          </div>
          {model.translit && <div className="translit">{model.translit}</div>}
          {model.en && <div className="en small">{model.en}</div>}
          <div style={{ marginTop: 4 }}><AudioSourceBadge source={src} /></div>
        </div>
      )}
      {!model && v === 'no-key' && <div className="small">The approved answer for this item is missing from the source and has been flagged for the teacher.</div>}
      {item.explanation && v !== 'correct' && <div className="small" style={{ marginTop: 4 }}>{item.explanation}</div>}
      <div className="small muted" style={{ marginTop: 6 }}>
        Answer checking compares words with the approved key. Pronunciation is not scored in this version.
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        {sub.audioUrl && (
          <button className="btn small" onClick={() => playUrl(sub.audioUrl!)}>
            <Icon name="play" size={14} /> My recording
          </button>
        )}
        <button className="btn small" onClick={onRetry}>
          <Icon name="replay" size={14} /> Retry <kbd>R</kbd>
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn primary" onClick={onNext} autoFocus>
          Continue <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}

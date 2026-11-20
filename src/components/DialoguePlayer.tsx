import { useMemo, useState } from 'react';
import type { DialogueLine, ExerciseItem } from '../content/types';
import { checkSubmission, type CheckResult } from '../lib/check';
import { playPhrase, playUrl, resolveSource } from '../audio/audio';
import { progress, useSettings } from '../state/progress';
import { SpeakControl, type Submission } from './SpeakControl';
import { Ar, AudioSourceBadge, SourceLink } from './common';
import { Icon } from './icons';
import type { SourceRef } from '../content/types';

const lineId = (dlgId: string, i: number) => `${dlgId}:${i}`;

/**
 * Read mode: line-by-line with audio.
 * Role-play: the student speaks one character's lines. Feedback is held until
 * the whole exchange is finished, then a few useful corrections are offered
 * with a chance to repeat those lines.
 */
export function DialoguePlayer({
  courseId,
  lessonId,
  id,
  title,
  context,
  lines,
  source,
}: {
  courseId: string;
  lessonId: string;
  id: string;
  title?: string;
  context?: string;
  lines: DialogueLine[];
  source?: SourceRef;
}) {
  const speakers = useMemo(() => [...new Set(lines.filter((l) => l.speaker && l.ar).map((l) => l.speaker))], [lines]);
  const [mode, setMode] = useState<'read' | 'role'>('read');
  const [role, setRole] = useState<string | null>(null);
  const s = useSettings();

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">Dialogue</div>
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
        </div>
        <SourceLink source={source} />
      </div>
      {context && <p className="small muted">{context}</p>}
      <div className="row" style={{ margin: '8px 0' }}>
        <button className={`chip ${mode === 'read' ? 'on' : ''}`} onClick={() => setMode('read')}>Read & listen</button>
        {speakers.map((sp) => (
          <button key={sp} className={`chip ${mode === 'role' && role === sp ? 'on' : ''}`} onClick={() => { setMode('role'); setRole(sp); }}>
            Speak as {sp}
          </button>
        ))}
      </div>
      {mode === 'read' ? (
        <div>
          {lines.map((l, i) =>
            !l.speaker || (l as any).narration ? (
              <p key={i} className="small muted" style={{ fontStyle: 'italic', margin: '6px 0' }} dir="auto">{l.en ?? l.ar}</p>
            ) : (
            <div className="dlg-line" key={i}>
              <div className="who">{l.speaker}</div>
              <div className="bubble">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <LinePlay courseId={courseId} line={l} id={lineId(id, i)} />
                  {l.ar && <Ar size="md">{l.ar}</Ar>}
                </div>
                {l.translit && s.showTranslit && <div className="translit small">{l.translit}</div>}
                {l.en && <details><summary className="small muted">English</summary><div className="en small">{l.en}</div></details>}
              </div>
            </div>
            ),
          )}
        </div>
      ) : (
        role && <RolePlay key={role} courseId={courseId} lessonId={lessonId} id={id} lines={lines} role={role} />
      )}
    </div>
  );
}

function LinePlay({ courseId, line, id }: { courseId: string; line: DialogueLine; id: string }) {
  const src = resolveSource(courseId, line, [id]);
  return (
    <button className="btn small icon" style={{ width: 34, minHeight: 34 }} title={src} aria-label="Play line" disabled={src === 'unavailable'} onClick={() => playPhrase(courseId, line, [id])}>
      <Icon name={src === 'unavailable' ? 'speaker-off' : 'speaker'} size={16} />
    </button>
  );
}

function RolePlay({ courseId, lessonId, id, lines, role }: { courseId: string; lessonId: string; id: string; lines: DialogueLine[]; role: string }) {
  const s = useSettings();
  const [pos, setPos] = useState(0);
  const [turns, setTurns] = useState<Record<number, { sub: Submission; result: CheckResult }>>({});
  const [repeat, setRepeat] = useState<number[] | null>(null);
  const [cue, setCue] = useState(false);

  // advance through partner lines automatically (shown), stop on the student's lines
  const myIdx = lines.map((l, i) => (l.speaker === role ? i : -1)).filter((i) => i >= 0);
  const activeList = repeat ?? myIdx;
  const nextMine = activeList.find((i) => i >= pos && !(repeat ? false : turns[i]));
  const finished = repeat ? pos >= activeList.length : nextMine === undefined;
  const currentIdx = repeat ? activeList[pos] : nextMine;

  const asItem = (i: number): ExerciseItem => ({
    id: lineId(id, i),
    model: { ar: lines[i].ar, translit: lines[i].translit, en: lines[i].en },
    answers: [{ ar: lines[i].ar, translit: lines[i].translit }],
  });

  const submit = (sub: Submission) => {
    if (currentIdx === undefined) return;
    const result = checkSubmission(asItem(currentIdx), sub);
    progress.recordItem(courseId, lineId(id, currentIdx), lessonId, result.verdict);
    setTurns((t) => ({ ...t, [currentIdx]: { sub, result } }));
    setCue(false);
    if (repeat) setPos((p) => p + 1);
    else setPos(currentIdx + 1);
  };

  if (finished) {
    const rank = { incorrect: 0, close: 1, unclear: 2, 'no-key': 3, correct: 4 } as const;
    const corrections = myIdx
      .filter((i) => turns[i] && turns[i].result.verdict !== 'correct')
      .sort((a, b) => rank[turns[a].result.verdict] - rank[turns[b].result.verdict])
      .slice(0, 3);
    return (
      <div className="stack">
        <div className="feedback correct">
          <div className="verdict">Exchange finished</div>
          <div className="small">
            {myIdx.filter((i) => turns[i]?.result.verdict === 'correct').length} of {myIdx.length} of your lines matched the script.
            {corrections.length ? ' Here are the most useful lines to repeat:' : ' Nicely done — say it all once more out loud.'}
          </div>
        </div>
        {corrections.map((i) => (
          <div key={i} className="model-line">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <LinePlay courseId={courseId} line={lines[i]} id={lineId(id, i)} />
              <Ar size="md">{lines[i].ar}</Ar>
            </div>
            {lines[i].translit && <div className="translit small">{lines[i].translit}</div>}
            <div className="small muted">
              You said: <span dir="auto">{turns[i].sub.text || '—'}</span>
              {turns[i].sub.audioUrl && (
                <button className="chip" style={{ marginInlineStart: 6 }} onClick={() => playUrl(turns[i].sub.audioUrl!)}>▶ mine</button>
              )}
            </div>
          </div>
        ))}
        <div className="row">
          {corrections.length > 0 && (
            <button className="btn primary" onClick={() => { setRepeat(corrections); setPos(0); }}>
              Repeat these lines
            </button>
          )}
          <button className="btn" onClick={() => { setRepeat(null); setTurns({}); setPos(0); }}>
            <Icon name="replay" /> Whole dialogue again
          </button>
        </div>
      </div>
    );
  }

  const shown = repeat ? [currentIdx!] : lines.map((_, i) => i).filter((i) => i <= currentIdx!);
  return (
    <div>
      {shown.map((i) => {
        const l = lines[i];
        if (!l.speaker || !l.ar) return <p key={i} className="small muted" style={{ fontStyle: 'italic' }} dir="auto">{l.en ?? l.ar}</p>;
        const mine = l.speaker === role;
        const isCurrent = i === currentIdx;
        return (
          <div key={i} className={`dlg-line ${mine ? 'me' : ''}`}>
            <div className="who">{mine ? `You (${l.speaker})` : l.speaker}</div>
            <div className="bubble">
              {mine && isCurrent ? (
                <div>
                  <div className="small muted">Your line{l.en ? `: “${l.en}”` : ''}</div>
                  {cue ? (
                    <>
                      <Ar size="md">{l.ar}</Ar>
                      {l.translit && <div className="translit small">{l.translit}</div>}
                    </>
                  ) : (
                    <button className="chip" onClick={() => setCue(true)}>Show the Arabic cue</button>
                  )}
                </div>
              ) : mine ? (
                <div className="small muted">✓ said · <span dir="auto">{turns[i]?.sub.text || '(recorded)'}</span></div>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <LinePlay courseId={courseId} line={l} id={lineId(id, i)} />
                    <Ar size="md">{l.ar}</Ar>
                  </div>
                  {l.translit && s.showTranslit && <div className="translit small">{l.translit}</div>}
                </>
              )}
            </div>
          </div>
        );
      })}
      {currentIdx !== undefined && (
        <SpeakControl key={`${currentIdx}-${pos}`} onSubmit={submit} hint="Say your line — feedback comes at the end of the exchange" />
      )}
      {currentIdx !== undefined && resolveSource(courseId, lines[currentIdx], [lineId(id, currentIdx)]) === 'unavailable' && (
        <div className="small muted" style={{ textAlign: 'center' }}><AudioSourceBadge source="unavailable" /></div>
      )}
    </div>
  );
}

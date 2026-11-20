import { useState, type ReactNode } from 'react';
import type { Phrase, Segment, SourceRef, Flag } from '../content/types';
import { canvaUrl } from '../content/loader';
import { playPhrase, resolveSource, SOURCE_LABEL, type PlaybackSource } from '../audio/audio';
import { updateSettings, useSettings, type Settings } from '../state/progress';
import { Icon } from './icons';

export function Ar({ children, size = 'lg', className = '' }: { children: ReactNode; size?: 'xl' | 'lg' | 'md' | 'sm'; className?: string }) {
  return (
    <span className={`ar ar-${size} ${className}`} lang="ar" dir="rtl">
      {children}
    </span>
  );
}

/** Renders an Arabic sentence with blank(s). RTL, same order as the source. */
export function SegmentsAr({ segments, fill, size = 'xl' }: { segments: Segment[]; fill?: string[] | null; size?: 'xl' | 'lg' }) {
  const fills = fill ?? [];
  let i = 0;
  return (
    <Ar size={size}>
      {segments.map((s, k) =>
        s.blank ? (
          <span key={k} className="blank">{fills[i++] ?? '   '}</span>
        ) : (
          <span key={k}>{s.text}</span>
        ),
      )}
    </Ar>
  );
}

export function SegmentsTranslit({ segments, fill }: { segments: Segment[]; fill?: string[] | null }) {
  const fills = fill ?? [];
  let i = 0;
  return (
    <span className="translit">
      {segments.map((s, k) =>
        s.blank ? (
          <span key={k} className="blank">{fills[i++] ?? '   '}</span>
        ) : (
          <span key={k}>{s.text}</span>
        ),
      )}
    </span>
  );
}

export function PhraseView({
  phrase,
  courseId,
  audioKeys = [],
  size = 'lg',
  forceAids,
}: {
  phrase: Phrase;
  courseId: string;
  audioKeys?: (string | undefined | null)[];
  size?: 'xl' | 'lg' | 'md';
  forceAids?: boolean;
}) {
  const s = useSettings();
  const [show, setShow] = useState(false);
  const aids = forceAids || show;
  return (
    <div className="phrase">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        {phrase.ar ? <AudioButton courseId={courseId} phrase={phrase} keys={audioKeys} compact /> : <span />}
        {phrase.ar && <Ar size={size}>{phrase.ar}</Ar>}
      </div>
      {phrase.translit && (s.showTranslit || aids) && <div className="translit">{phrase.translit}</div>}
      {phrase.en && (s.showEnglish || aids) && <div className="en">{phrase.en}</div>}
      {phrase.note && <div className="small muted">{phrase.note}</div>}
      {!s.showEnglish && !aids && phrase.en && (
        <button className="chip" onClick={() => setShow(true)}>
          Show English
        </button>
      )}
    </div>
  );
}

export function AudioButton({
  courseId,
  phrase,
  keys = [],
  compact,
  label,
}: {
  courseId: string;
  phrase: Phrase | null | undefined;
  keys?: (string | null | undefined)[];
  compact?: boolean;
  label?: string;
}) {
  useSettings(); // re-render when voice setting changes
  const [playing, setPlaying] = useState(false);
  const [last, setLast] = useState<PlaybackSource | null>(null);
  const src = resolveSource(courseId, phrase, keys);
  const unavailable = src === 'unavailable';
  return (
    <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
      <button
        className={`btn ${compact ? 'small icon' : ''}`}
        style={compact ? { width: 36, minHeight: 36 } : undefined}
        aria-label={unavailable ? 'No approved recording yet' : label ?? 'Play model audio'}
        title={SOURCE_LABEL[src]}
        disabled={unavailable}
        onClick={() => {
          setPlaying(true);
          setLast(playPhrase(courseId, phrase, keys, () => setPlaying(false)));
        }}
      >
        <Icon name={unavailable ? 'speaker-off' : playing ? 'wave' : 'speaker'} />
        {!compact && (label ?? 'Listen')}
      </button>
      {!compact && <AudioSourceBadge source={last ?? src} />}
    </span>
  );
}

export function AudioSourceBadge({ source }: { source: PlaybackSource }) {
  const cls =
    source === 'teacher' || source === 'native-reviewed' ? 'ok' : source === 'unavailable' ? '' : 'warn';
  return <span className={`badge ${cls}`}>{SOURCE_LABEL[source]}</span>;
}

export function SourceLink({ source }: { source?: SourceRef }) {
  if (!source?.designId) return null;
  const pages = source.pages ?? (source.page ? [source.page] : []);
  const label = pages.length ? (pages.length > 1 && pages[0] !== pages[pages.length - 1] ? `pp. ${pages[0]}–${pages[pages.length - 1]}` : `p. ${pages[0]}`) : '';
  return (
    <a className="source-ref" href={canvaUrl(source.designId, pages[0])} target="_blank" rel="noreferrer" title={`Canva design ${source.designId}`}>
      Book {label} ↗
    </a>
  );
}

export function Flags({ flags }: { flags?: Flag[] }) {
  const s = useSettings();
  if (!flags?.length || !s.showReviewFlags) return null;
  return (
    <div className="flag" role="note">
      {flags.map((f, i) => (
        <div key={i}>
          ⚑ {f.kind === 'missing-answer' ? 'Answer not in source — awaiting teacher' : f.kind === 'suspected-error' ? 'Flagged for teacher review' : 'Needs review'}
          {f.note ? `: ${f.note}` : ''}
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function AidToggles() {
  const s = useSettings();
  return <AidTogglesInner s={s} />;
}
function AidTogglesInner({ s }: { s: Settings }) {
  return (
    <div className="aids" role="group" aria-label="Learning aids">
      <button className={`chip ${s.showTranslit ? 'on' : ''}`} aria-pressed={s.showTranslit} onClick={() => updateSettings({ showTranslit: !s.showTranslit })}>
        Transliteration
      </button>
      <button className={`chip ${s.showEnglish ? 'on' : ''}`} aria-pressed={s.showEnglish} onClick={() => updateSettings({ showEnglish: !s.showEnglish })}>
        English
      </button>
      <button className={`chip ${s.autoPlayModel ? 'on' : ''}`} aria-pressed={s.autoPlayModel} onClick={() => updateSettings({ autoPlayModel: !s.autoPlayModel })}>
        Auto-play model
      </button>
    </div>
  );
}

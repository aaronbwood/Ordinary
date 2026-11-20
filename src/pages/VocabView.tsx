import { useMemo, useRef, useState } from 'react';
import { flatLessons, getCourse } from '../content/loader';
import { playPhrase, stopAudio } from '../audio/audio';
import { useProgress, useSettings } from '../state/progress';
import { Ar, PhraseView, SourceLink } from '../components/common';
import { Icon } from '../components/icons';
import { normalizeArabic } from '../lib/arabic';
import { vocabBanks, type VocabBank } from '../lib/vocabBanks';

/** المطبخ (the kitchen) — every vocabulary bank in the book, by chapter. */
export function VocabView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const p = useProgress(courseId);
  useSettings();
  const banks = useMemo(() => (course ? vocabBanks(course) : []), [course]);
  const chapters = useMemo(() => {
    const m = new Map<number, { n: number; title?: string; titleAr?: string; banks: VocabBank[] }>();
    for (const b of banks) {
      if (!m.has(b.chapter)) m.set(b.chapter, { n: b.chapter, title: b.chapterTitle, titleAr: b.chapterTitleAr, banks: [] });
      m.get(b.chapter)!.banks.push(b);
    }
    return [...m.values()];
  }, [banks]);
  const reached = useMemo(() => {
    if (!course) return 1;
    const ls = flatLessons(course);
    const idx = ls.filter((r) => p.completedLessons[r.lesson.id] || r.lesson.id === p.lastLessonId).map((r) => r.index);
    const at = idx.length ? Math.max(...idx) : -1;
    return Math.max(1, ls.find((r) => r.index === at)?.chapter.number ?? 1);
  }, [course, p]);

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const stopRef = useRef(false);

  if (!course) return <div className="notice">Course not found.</div>;

  const q = query.trim().toLowerCase();
  const qa = normalizeArabic(query.trim());
  const matches = (b: VocabBank) =>
    !q ? b.items : b.items.filter((v) => (qa && normalizeArabic(v.ar ?? '').includes(qa)) || (v.translit ?? '').toLowerCase().includes(q) || (v.en ?? '').toLowerCase().includes(q));
  const total = banks.reduce((n, b) => n + b.items.length, 0);

  const playAll = (b: VocabBank) => {
    if (playing === b.key) { stopRef.current = true; stopAudio(); setPlaying(null); return; }
    stopRef.current = false;
    setPlaying(b.key);
    const list = matches(b);
    const next = (i: number) => {
      if (stopRef.current || i >= list.length) { setPlaying((k) => (k === b.key ? null : k)); return; }
      playPhrase(courseId, list[i], [list[i].id], () => setTimeout(() => next(i + 1), 450));
    };
    next(0);
  };

  return (
    <div className="stack">
      <div className="card arch-card" style={{ textAlign: 'center' }}>
        <Ar size="lg">المَطْبَخ</Ar>
        <div className="translit small">il-maṭbakh · the kitchen</div>
        <h1 style={{ marginTop: 6 }}>Vocabulary</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every vocabulary bank in the book, {banks.length} banks and {total} words. Listen to a word, play a whole bank, or learn it with the metronome.
        </p>
      </div>

      <input
        className="input"
        type="search"
        dir="auto"
        placeholder="Find a word (Arabic, transliteration or English)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Find a word"
      />

      {chapters.map((ch) => {
        const shown = ch.banks.map((b) => ({ b, items: matches(b) })).filter((x) => x.items.length);
        if (!shown.length) return null;
        return (
          <section key={ch.n} className="stack" aria-label={`Chapter ${ch.n}`}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ margin: 0 }}>Chapter {ch.n}{ch.title ? ` · ${ch.title}` : ''}</h2>
              {ch.titleAr && <Ar size="sm">{ch.titleAr}</Ar>}
            </div>
            {shown.map(({ b, items }) => {
              const isOpen = !!q || !!open[b.key];
              return (
                <div key={b.key} className="card bank-card">
                  <button className="bank-head" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [b.key]: !o[b.key] }))}>
                    <span className="bank-title">
                      <strong>{b.heading}</strong>
                      <span className="small muted">{items.length} words{b.chapter > reached ? ' · later in the book' : ''}</span>
                    </span>
                    <span aria-hidden="true" className="bank-caret">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="stack" style={{ marginTop: 8 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn small" onClick={() => playAll(b)}>
                          <Icon name={playing === b.key ? 'pause' : 'play'} size={16} /> {playing === b.key ? 'Stop' : 'Play all'}
                        </button>
                        <a className="btn small olive" href={`#/c/${courseId}/rhythm?mode=vocab&bank=${encodeURIComponent(b.key)}`}>
                          <Icon name="metronome" size={16} /> Metronome
                        </a>
                        <a className="btn small ghost" href={`#/c/${courseId}/l/${b.lessonId}`}>Open lesson</a>
                        <SourceLink source={b.source} />
                      </div>
                      <div className="vocab-grid">
                        {items.map((v) => (
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
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
      {q && chapters.every((ch) => ch.banks.every((b) => !matches(b).length)) && <div className="notice">No word matches “{query}”.</div>}
    </div>
  );
}

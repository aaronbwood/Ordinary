// Timelines for the two metronome methods the book teaches:
//  • Speaker–Responder Method (p.40): speaker LOUD / responder SOFT, then the
//    reverse round; the beat lands on the consonants; 70–90 BPM.
//  • Sound–Image–Feeling Loop, Metronome Practice (p.82): one syllable per
//    click, then the whole word in one smooth flow; 60–80 BPM.

import type { Phrase } from '../content/types';
import type { Beat, Phase } from './metronome';
import { syllabify } from './syllables';

export interface Seg {
  kind: 'count' | 'line' | 'syllable' | 'whole' | 'rest' | 'show';
  item: number;
  beats: number;
  role?: 'speaker' | 'responder';
  volume?: 'loud' | 'soft';
  round?: 1 | 2;
  syllables?: string[];
  syllableIndex?: number;
  pass?: number;
}

export interface SRPair {
  id: string;
  title?: string;
  speaker: Phrase;
  responder: Phrase;
}

export interface VocabWord {
  id: string;
  ar: string;
  translit: string;
  en?: string | null;
  syllables?: string[];
}

function toBeats(segs: Seg[]): Beat[] {
  const beats: Beat[] = [];
  segs.forEach((s, seg) => {
    const phase: Phase = s.kind === 'show' ? 'prep' : (s.kind as Phase);
    for (let k = 0; k < s.beats; k++)
      beats.push({ phase, item: s.item, beatInPhase: k, phaseLength: s.beats, seg, soft: s.volume === 'soft' });
  });
  return beats;
}

const lineBeats = (p: Phrase) => Math.max(2, syllabify(p.translit ?? '').length || (p.ar ?? '').split(/\s+/).length * 2);

/** "A / B" alternatives in both scripts → separate phrases ("practice every option"). */
export function expandOptions(p: Phrase): Phrase[] {
  const ar = (p.ar ?? '').split(/\s+\/\s+/);
  const tr = (p.translit ?? '').split(/\s+\/\s+/);
  if (ar.length > 1 && ar.length === tr.length) return ar.map((a, i) => ({ ...p, ar: a, translit: tr[i] }));
  return [p];
}

export function speakerResponderPlan(
  pairs: SRPair[],
  o: { countIn: number; repeats: number; reverse: boolean; restBeats: number },
) {
  const segs: Seg[] = [{ kind: 'count', item: -1, beats: o.countIn }];
  pairs.forEach((pair, item) => {
    const rounds: (1 | 2)[] = o.reverse ? [1, 2] : [1];
    for (const round of rounds)
      for (let pass = 0; pass < o.repeats; pass++) {
        segs.push({ kind: 'line', item, role: 'speaker', volume: round === 1 ? 'loud' : 'soft', round, pass, beats: lineBeats(pair.speaker), syllables: syllabify(pair.speaker.translit ?? '') });
        segs.push({ kind: 'line', item, role: 'responder', volume: round === 1 ? 'soft' : 'loud', round, pass, beats: lineBeats(pair.responder), syllables: syllabify(pair.responder.translit ?? '') });
        if (o.restBeats) segs.push({ kind: 'rest', item, round, pass, beats: o.restBeats });
      }
  });
  return { segs, beats: toBeats(segs) };
}

export function vocabPlan(words: VocabWord[], o: { countIn: number; showBeats: number; syllablePasses: number }) {
  const segs: Seg[] = [{ kind: 'count', item: -1, beats: o.countIn }];
  words.forEach((w, item) => {
    const syl = w.syllables?.length ? w.syllables : syllabify(w.translit);
    segs.push({ kind: 'show', item, beats: o.showBeats, syllables: syl });
    for (let pass = 0; pass < o.syllablePasses; pass++)
      syl.forEach((_, i) => segs.push({ kind: 'syllable', item, beats: 1, syllables: syl, syllableIndex: i, pass }));
    // "One click, one smooth Arabic word."
    segs.push({ kind: 'whole', item, beats: 1, syllables: syl });
    segs.push({ kind: 'rest', item, beats: 1 });
  });
  return { segs, beats: toBeats(segs) };
}

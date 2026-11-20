// Sample-accurate metronome using the Web Audio clock with a look-ahead
// scheduler. The timeline (count-in, prepare, respond, reveal beats) is
// precomputed so prompts advance automatically without key presses.

export type Phase = 'count' | 'prep' | 'respond' | 'reveal' | 'end' | 'line' | 'syllable' | 'whole' | 'rest';

export interface Beat {
  phase: Phase;
  item: number; // -1 for count-in
  beatInPhase: number;
  phaseLength: number;
  /** index into the caller's segment list (what to display on this beat) */
  seg?: number;
  /** quieter click, e.g. under a SOFT line */
  soft?: boolean;
}

export interface TimelineOptions {
  countIn: number;
  prepBeats: number;
  respondBeats: number;
  revealBeats: number;
  /** extra response beats per this many words of the model answer (0 = off) */
  wordsPerExtraBeat: number;
}

export function buildTimeline(itemWordCounts: number[], o: TimelineOptions): Beat[] {
  const beats: Beat[] = [];
  for (let i = 0; i < o.countIn; i++) beats.push({ phase: 'count', item: -1, beatInPhase: i, phaseLength: o.countIn });
  itemWordCounts.forEach((words, item) => {
    const extra = o.wordsPerExtraBeat > 0 ? Math.max(0, Math.ceil(words / o.wordsPerExtraBeat) - 1) : 0;
    const resp = o.respondBeats + extra;
    for (let i = 0; i < o.prepBeats; i++) beats.push({ phase: 'prep', item, beatInPhase: i, phaseLength: o.prepBeats });
    for (let i = 0; i < resp; i++) beats.push({ phase: 'respond', item, beatInPhase: i, phaseLength: resp });
    for (let i = 0; i < o.revealBeats; i++) beats.push({ phase: 'reveal', item, beatInPhase: i, phaseLength: o.revealBeats });
  });
  return beats;
}

export class Metronome {
  ctx: AudioContext | null = null;
  private timer: number | null = null;
  private nextBeat = 0;
  private t0 = 0;
  bpm = 80;
  beats: Beat[] = [];
  volume = 0.6;

  get secondsPerBeat() {
    return 60 / this.bpm;
  }

  async start(beats: Beat[], bpm: number) {
    this.stop();
    this.beats = beats;
    this.bpm = bpm;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = this.ctx ?? new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.t0 = this.ctx.currentTime + 0.15;
    this.nextBeat = 0;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  private schedule() {
    if (!this.ctx) return;
    const ahead = this.ctx.currentTime + 0.12;
    while (this.nextBeat < this.beats.length && this.t0 + this.nextBeat * this.secondsPerBeat < ahead) {
      this.click(this.beats[this.nextBeat], this.t0 + this.nextBeat * this.secondsPerBeat);
      this.nextBeat++;
    }
    if (this.nextBeat >= this.beats.length && this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private click(b: Beat, when: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const accent = b.beatInPhase === 0;
    osc.frequency.value =
      b.phase === 'count' ? (accent ? 1320 : 990)
      : b.phase === 'respond' ? (accent ? 880 : 660)
      : b.phase === 'syllable' || b.phase === 'whole' ? 1000
      : accent ? 1100 : 820;
    osc.type = b.phase === 'respond' ? 'triangle' : 'sine';
    const v =
      this.volume *
      (b.phase === 'syllable' || b.phase === 'whole' ? 0.85 : accent ? 1 : 0.55) *
      (b.phase === 'reveal' || b.phase === 'rest' ? 0.5 : 1) *
      (b.soft ? 0.6 : 1);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.09);
  }

  /** Current beat index (fractional) on the audio clock; -1 before start. */
  position(): number {
    if (!this.ctx) return -1;
    return (this.ctx.currentTime - this.t0) / this.secondsPerBeat;
  }

  async pause() {
    await this.ctx?.suspend();
  }
  async resume() {
    await this.ctx?.resume();
  }
  get paused() {
    return this.ctx?.state === 'suspended';
  }

  stop() {
    if (this.timer != null) clearInterval(this.timer);
    this.timer = null;
    this.beats = [];
  }

  async close() {
    this.stop();
    await this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}

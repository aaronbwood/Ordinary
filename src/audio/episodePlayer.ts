import { useEffect, useState } from 'react';
import type { Episode } from '../content/loader';
import { stopAudio } from './audio';

// One shared <audio> element for the "In the Car" episodes. A real media element (not Web Audio)
// keeps playing with the screen locked and is controlled from the lock screen, Bluetooth and
// car head units through the Media Session API.

export type Pace = 'normal' | 'slow';
interface State { list: Episode[]; index: number; pace: Pace; playing: boolean; time: number; duration: number; autoNext: boolean; courseTitle: string }

const store = (k: string, v?: string) => {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* storage blocked */ }
  return null;
};

const audio: HTMLAudioElement | null = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) audio.preload = 'metadata';
let state: State = {
  list: [], index: -1, pace: (store('car:pace') as Pace) === 'slow' ? 'slow' : 'normal',
  playing: false, time: 0, duration: 0, autoNext: store('car:autoNext') !== 'off', courseTitle: '',
};
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const set = (p: Partial<State>) => { state = { ...state, ...p }; emit(); };

const posKey = (ep: Episode, pace: Pace) => `car:pos:${ep.id}:${pace}`;
const current = () => (state.index >= 0 ? state.list[state.index] : undefined);
const url = (src: string) => `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`;

function updateMediaSession() {
  const ep = current();
  if (!ep || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.title,
    artist: 'Ordinary Day Arabic',
    album: `${state.courseTitle} · Chapter ${ep.chapter}`,
  });
}

if (audio) {
  audio.addEventListener('timeupdate', () => {
    set({ time: audio.currentTime, duration: audio.duration || current()?.[state.pace].duration || 0 });
    const ep = current();
    if (ep && Math.floor(audio.currentTime) % 5 === 0) store(posKey(ep, state.pace), String(audio.currentTime));
  });
  audio.addEventListener('play', () => set({ playing: true }));
  audio.addEventListener('pause', () => set({ playing: false }));
  audio.addEventListener('ended', () => {
    const ep = current();
    if (ep) store(posKey(ep, state.pace), '0');
    if (state.autoNext && state.index < state.list.length - 1) load(state.index + 1, true);
    else set({ playing: false });
  });
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    const h = (a: MediaSessionAction, f: MediaSessionActionHandler) => { try { ms.setActionHandler(a, f); } catch { /* unsupported action */ } };
    h('play', () => play());
    h('pause', () => pause());
    h('previoustrack', () => prev());
    h('nexttrack', () => next());
    h('seekbackward', () => skip(-15));
    h('seekforward', () => skip(15));
  }
}

function load(index: number, autoplay: boolean) {
  if (!audio || index < 0 || index >= state.list.length) return;
  const ep = state.list[index];
  const track = ep[state.pace];
  set({ index, time: 0, duration: track.duration });
  audio.src = url(track.src);
  const resume = Number(store(posKey(ep, state.pace)) ?? 0);
  const seekTo = resume > 5 && resume < track.duration - 10 ? resume : 0;
  if (seekTo) audio.addEventListener('loadedmetadata', () => { audio.currentTime = seekTo; }, { once: true });
  updateMediaSession();
  if (autoplay) { stopAudio(); audio.play().catch(() => set({ playing: false })); }
}

export function setList(list: Episode[], courseTitle: string) {
  if (state.list.length && state.list[0]?.id === list[0]?.id && state.list.length === list.length) return;
  state = { ...state, list, courseTitle };
  emit();
}
export function playEpisode(index: number) {
  if (index === state.index && audio?.src) { play(); return; }
  load(index, true);
}
export function play() {
  if (!audio) return;
  if (state.index < 0) { load(0, true); return; }
  stopAudio();
  audio.play().catch(() => set({ playing: false }));
}
export function pause() { audio?.pause(); }
export function toggle() { state.playing ? pause() : play(); }
export function skip(sec: number) { if (audio) audio.currentTime = Math.max(0, Math.min((audio.duration || 0) - 0.5, audio.currentTime + sec)); }
export function seek(t: number) { if (audio) audio.currentTime = t; }
export function next() { if (state.index < state.list.length - 1) load(state.index + 1, state.playing || true); }
export function prev() {
  if (audio && audio.currentTime > 10) { audio.currentTime = 0; return; }
  if (state.index > 0) load(state.index - 1, true);
}
export function setPace(pace: Pace) {
  if (pace === state.pace) return;
  const wasPlaying = state.playing;
  const ep = current();
  // keep the listener at the same section when switching pace
  let sectionIdx = 0;
  if (ep) ep[state.pace].sections.forEach((s, i) => { if (s.start <= state.time) sectionIdx = i; });
  store('car:pace', pace);
  set({ pace });
  if (ep && audio) {
    const startAt = ep[pace].sections[sectionIdx]?.start ?? 0;
    store(posKey(ep, pace), String(startAt));
    load(state.index, wasPlaying);
  }
}
export function setAutoNext(on: boolean) { store('car:autoNext', on ? 'on' : 'off'); set({ autoNext: on }); }
export function currentSection(): string | undefined {
  const ep = current();
  if (!ep) return undefined;
  let title: string | undefined;
  for (const s of ep[state.pace].sections) if (s.start <= state.time + 0.2) title = s.title;
  return title;
}

export function useCarPlayer() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return state;
}

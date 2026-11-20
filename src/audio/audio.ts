import type { AudioRecording, AudioStatus, Phrase } from '../content/types';
import { normalizeArabic } from '../lib/arabic';
import { getAudioManifest } from '../content/loader';
import { getSettings } from '../state/progress';

// Model audio. Priority: teacher recording > reviewed native recording >
// (opt-in) generated candidate voice. Nothing is ever presented as a model
// recording unless it exists in content/courses/<id>/audio/manifest.json.

export type PlaybackSource = AudioStatus | 'browser-tts-candidate' | 'unavailable';

const RANK: Record<AudioStatus, number> = { teacher: 0, 'native-reviewed': 1, 'generated-candidate': 2 };

export function findRecording(courseId: string, keys: (string | null | undefined)[], ar?: string | null) {
  const manifest = getAudioManifest(courseId);
  const wanted = new Set(keys.filter(Boolean) as string[]);
  if (ar) wanted.add(normalizeArabic(ar));
  const hits = manifest.filter((r: AudioRecording) => wanted.has(r.key) || (ar && normalizeArabic(r.key) === normalizeArabic(ar)));
  return hits.sort((a, b) => RANK[a.status] - RANK[b.status])[0];
}

let current: HTMLAudioElement | null = null;

export function stopAudio() {
  current?.pause();
  current = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

export function arabicVoice(): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === 'undefined') return undefined;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => /ar[-_]JO/i.test(v.lang)) ||
    voices.find((v) => /ar[-_](PS|LB|SY)/i.test(v.lang)) ||
    voices.find((v) => /^ar/i.test(v.lang))
  );
}

/** What would play for this phrase, without playing it. */
export function resolveSource(courseId: string, phrase: Phrase | null | undefined, keys: (string | null | undefined)[] = []): PlaybackSource {
  if (!phrase?.ar) return 'unavailable';
  const rec = findRecording(courseId, keys, phrase.ar);
  if (rec) return rec.status;
  if (getSettings().allowGeneratedVoice && arabicVoice()) return 'browser-tts-candidate';
  return 'unavailable';
}

export function playPhrase(
  courseId: string,
  phrase: Phrase | null | undefined,
  keys: (string | null | undefined)[] = [],
  onEnd?: () => void,
): PlaybackSource {
  stopAudio();
  if (!phrase?.ar) return 'unavailable';
  const rec = findRecording(courseId, keys, phrase.ar);
  if (rec) {
    const url = rec.src.startsWith('http') ? rec.src : `${import.meta.env.BASE_URL}${rec.src.replace(/^\//, '')}`;
    const clip = typeof rec.start === 'number' && typeof rec.end === 'number';
    const a = new Audio(clip ? `${url}#t=${rec.start},${rec.end}` : url);
    current = a;
    let done = false;
    const finish = () => { if (!done) { done = true; onEnd?.(); } };
    a.onended = finish;
    a.onerror = finish;
    if (clip) {
      // play only this clip: seek to its start (if the fragment was ignored) and stop at its end
      a.addEventListener('loadedmetadata', () => { if (Math.abs(a.currentTime - rec.start!) > 0.05) a.currentTime = rec.start!; });
      // each clip ends with ~0.3 s of silence, so stopping a little early never cuts the word;
      // timeupdate fires only every ~250 ms, too coarse, so poll
      const stopAt = rec.end! - 0.15;
      const timer = setInterval(() => {
        if (current !== a) { clearInterval(timer); return; }
        if (a.currentTime >= stopAt) { clearInterval(timer); a.pause(); finish(); }
      }, 25);
    }
    a.play().catch(finish);
    return rec.status;
  }
  const voice = getSettings().allowGeneratedVoice ? arabicVoice() : undefined;
  if (voice) {
    const u = new SpeechSynthesisUtterance(phrase.ar);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    speechSynthesis.speak(u);
    return 'browser-tts-candidate';
  }
  onEnd?.();
  return 'unavailable';
}

export const SOURCE_LABEL: Record<PlaybackSource, string> = {
  teacher: 'Teacher recording',
  'native-reviewed': 'Reviewed native speaker',
  'generated-candidate': 'Generated voice — awaiting dialect review',
  'browser-tts-candidate': 'Device voice — not a dialect model (unreviewed)',
  unavailable: 'No approved recording yet',
};

export function playUrl(url: string) {
  stopAudio();
  const a = new Audio(url);
  current = a;
  a.play().catch(() => undefined);
}

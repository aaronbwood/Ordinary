import { useCallback, useEffect, useRef, useState } from 'react';

// Speech capture = microphone recording (for self-replay) + optional browser
// speech recognition (for a transcript). Recognition is a convenience for
// answer checking only; it does NOT assess pronunciation.

export type CaptureState =
  | 'idle'
  | 'requesting' // asking for mic permission
  | 'recording'
  | 'processing'
  | 'done'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface CaptureResult {
  transcript: string;
  alternatives: { text: string; confidence: number }[];
  confidence: number | undefined;
  audioUrl: string | null;
  recognition: 'ok' | 'none' | 'unavailable' | 'error';
}

const SR: any =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export const speechRecognitionAvailable = !!SR;
export const micAvailable =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export async function micPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    const p = await (navigator as any).permissions?.query({ name: 'microphone' });
    return p?.state ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

let sharedStream: MediaStream | null = null;
export async function requestMic(): Promise<MediaStream> {
  if (sharedStream && sharedStream.getAudioTracks().some((t) => t.readyState === 'live')) return sharedStream;
  sharedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return sharedStream;
}

export function useSpeechCapture(lang = 'ar-JO') {
  const [state, setState] = useState<CaptureState>(micAvailable ? 'idle' : 'unsupported');
  const [result, setResult] = useState<CaptureResult | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const srRef = useRef<any>(null);
  const chunks = useRef<Blob[]>([]);
  const finals = useRef<{ text: string; confidence: number }[]>([]);
  const srDone = useRef<Promise<void> | null>(null);
  const urlRef = useRef<string | null>(null);
  const stopping = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const start = useCallback(async () => {
    if (state === 'recording' || state === 'requesting') return;
    if (!micAvailable) {
      setState('unsupported');
      return;
    }
    stopping.current = false;
    setResult(null);
    setState('requesting');
    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch (e: any) {
      setState(e?.name === 'NotAllowedError' ? 'denied' : 'error');
      return;
    }
    if (stopping.current) {
      // released before permission resolved
      setState('idle');
      return;
    }
    chunks.current = [];
    finals.current = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.start();
    recRef.current = rec;
    startedAt.current = performance.now();

    if (SR) {
      try {
        const sr = new SR();
        sr.lang = lang;
        sr.interimResults = false;
        sr.continuous = true;
        sr.maxAlternatives = 5;
        sr.onresult = (ev: any) => {
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const r = ev.results[i];
            if (!r.isFinal) continue;
            for (let j = 0; j < r.length; j++) finals.current.push({ text: r[j].transcript, confidence: r[j].confidence });
          }
        };
        srDone.current = new Promise<void>((resolve) => {
          sr.onend = () => resolve();
          sr.onerror = () => resolve();
        });
        sr.start();
        srRef.current = sr;
      } catch {
        srRef.current = null;
      }
    }
    setState('recording');
  }, [lang, state]);

  const stop = useCallback(async () => {
    stopping.current = true;
    const rec = recRef.current;
    if (!rec) return;
    recRef.current = null;
    setState('processing');
    const tooShort = performance.now() - startedAt.current < 350;
    const audioDone = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
    // let the recogniser hear the tail of the utterance
    await new Promise((r) => setTimeout(r, 250));
    rec.stop();
    const sr = srRef.current;
    srRef.current = null;
    if (sr) {
      try {
        sr.stop();
      } catch {
        /* already stopped */
      }
    }
    await audioDone;
    if (sr && srDone.current) await Promise.race([srDone.current, new Promise((r) => setTimeout(r, 3000))]);

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' });
    const audioUrl = blob.size && !tooShort ? URL.createObjectURL(blob) : null;
    urlRef.current = audioUrl;

    // Joined transcript of final segments (best alternative per segment) + alternatives
    const alts = [...finals.current].sort((a, b) => b.confidence - a.confidence);
    const best = alts[0];
    setResult({
      transcript: best?.text?.trim() ?? '',
      alternatives: alts,
      confidence: best?.confidence,
      audioUrl,
      recognition: !SR ? 'unavailable' : best ? 'ok' : 'none',
    });
    setState('done');
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setState(micAvailable ? 'idle' : 'unsupported');
  }, []);

  return { state, result, start, stop, reset };
}

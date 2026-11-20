import { useEffect, useRef, useState } from 'react';
import { micAvailable, micPermissionState, requestMic, speechRecognitionAvailable, useSpeechCapture, type CaptureResult } from '../speech/useSpeechCapture';
import { Icon } from './icons';

export interface Submission {
  text: string;
  via: 'speech' | 'typed';
  confidence?: number;
  alternatives?: string[];
  audioUrl?: string | null;
  recognition?: CaptureResult['recognition'];
}

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

/**
 * Hold Space (desktop) or press-and-hold the mic button (touch) to speak;
 * release to submit. Typing is always available as an alternative.
 */
export function SpeakControl({
  onSubmit,
  disabled,
  answerScript = 'ar',
  hint,
  keyboardActive = true,
}: {
  onSubmit: (s: Submission) => void;
  disabled?: boolean;
  answerScript?: 'ar' | 'en';
  hint?: string;
  keyboardActive?: boolean;
}) {
  const cap = useSpeechCapture(answerScript === 'ar' ? 'ar-JO' : 'en-US');
  const [perm, setPerm] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(!micAvailable);
  const holding = useRef(false);
  const submitted = useRef<CaptureResult | null>(null);

  useEffect(() => {
    micPermissionState().then(setPerm);
  }, []);

  // Submit when a capture completes
  useEffect(() => {
    if (cap.state === 'done' && cap.result && submitted.current !== cap.result) {
      submitted.current = cap.result;
      onSubmit({
        text: cap.result.transcript,
        via: 'speech',
        confidence: cap.result.confidence,
        alternatives: cap.result.alternatives.map((a) => a.text),
        audioUrl: cap.result.audioUrl,
        recognition: cap.result.recognition,
      });
    }
    if (cap.state === 'denied') setPerm('denied');
    if (cap.state === 'recording') setPerm('granted');
  }, [cap.state, cap.result, onSubmit]);

  // Spacebar push-to-talk (inactive while typing in a field)
  useEffect(() => {
    if (!keyboardActive || disabled) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (e.repeat || holding.current) return;
      if ((document.activeElement as HTMLElement | null)?.tagName === 'BUTTON') (document.activeElement as HTMLElement).blur();
      holding.current = true;
      cap.start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (!holding.current) return;
      holding.current = false;
      cap.stop();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [cap, keyboardActive, disabled]);

  const press = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    holding.current = true;
    cap.start();
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!holding.current) return;
    holding.current = false;
    cap.stop();
  };

  const stateText: Record<string, string> = {
    idle: hint ?? '',
    requesting: 'Waiting for microphone permission…',
    recording: 'Recording… release to submit',
    processing: 'Processing…',
    done: '',
    denied: 'Microphone access is blocked. You can type your answer, or allow the microphone in your browser settings.',
    unsupported: 'Recording is not available in this browser — type your answer below.',
    error: 'The microphone could not start. Try again, or type your answer.',
  };

  const needsExplain = micAvailable && perm !== 'granted' && perm !== 'denied' && cap.state === 'idle';

  return (
    <div className="speak-zone">
      {needsExplain && (
        <div className="notice small" style={{ maxWidth: 420 }}>
          Speaking practice records your voice so you can replay it, and (where your browser supports it) turns it into text to
          check your answer. Nothing is uploaded by this app; browser speech recognition may be processed by your browser
          provider.
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn small olive"
              onClick={() =>
                requestMic()
                  .then(() => setPerm('granted'))
                  .catch(() => setPerm('denied'))
              }
            >
              Enable microphone
            </button>
          </div>
        </div>
      )}
      {micAvailable && perm !== 'denied' && (
        <>
          <button
            className={`mic ${cap.state === 'recording' ? 'recording' : ''} ${cap.state === 'processing' ? 'processing' : ''}`}
            onPointerDown={press}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={(e) => holding.current && release(e)}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (cap.state === 'recording') cap.stop();
                else cap.start();
              }
            }}
            disabled={disabled || cap.state === 'processing'}
            aria-label={cap.state === 'recording' ? 'Recording — release to submit' : 'Hold to speak'}
            aria-pressed={cap.state === 'recording'}
          >
            <Icon name="mic" size={44} />
          </button>
          <div className="state-line" aria-live="polite">
            {cap.state === 'idle' && !hint ? (
              <>
                Hold <kbd>Space</kbd> or the button to speak · release to submit
              </>
            ) : (
              stateText[cap.state]
            )}
          </div>
          {!speechRecognitionAvailable && (
            <div className="small muted" style={{ textAlign: 'center', maxWidth: 420 }}>
              This browser can record you but cannot transcribe speech. After recording, you'll compare your recording with the
              model yourself, or type what you said.
            </div>
          )}
        </>
      )}
      {perm === 'denied' && <div className="state-line">{stateText.denied}</div>}

      {showType ? (
        <form
          className="text-answer"
          onSubmit={(e) => {
            e.preventDefault();
            if (!typed.trim() || disabled) return;
            onSubmit({ text: typed, via: 'typed' });
            setTyped('');
          }}
        >
          <input
            className={answerScript === 'ar' ? 'ar-input' : ''}
            dir="auto"
            lang={answerScript === 'ar' ? 'ar' : 'en'}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={answerScript === 'ar' ? 'اكتب هون… or type transliteration' : 'Type your answer'}
            aria-label="Type your answer"
            disabled={disabled}
          />
          <button className="btn primary" type="submit" disabled={disabled || !typed.trim()}>
            Check
          </button>
        </form>
      ) : (
        <button className="chip" onClick={() => setShowType(true)}>
          <Icon name="keyboard" size={14} /> Type instead
        </button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { courses } from '../content/loader';
import { progress, updateSettings, useSettings } from '../state/progress';
import { arabicVoice } from '../audio/audio';
import { speechRecognitionAvailable, micAvailable } from '../speech/useSpeechCapture';
import { Ar } from '../components/common';

export function SettingsView() {
  const s = useSettings();
  const voice = arabicVoice();
  return (
    <div className="stack">
      <h1>Settings</h1>
      <div className="card stack">
        <label className="range">
          <span>Arabic text size</span>
          <input type="range" min={1.4} max={2.8} step={0.1} value={s.arabicSize} onChange={(e) => updateSettings({ arabicSize: +e.target.value })} />
          <Ar size="lg">شو اسمك؟</Ar>
        </label>
        <label className="row"><input type="checkbox" checked={s.showTranslit} onChange={(e) => updateSettings({ showTranslit: e.target.checked })} /> Show transliteration by default</label>
        <label className="row"><input type="checkbox" checked={s.showEnglish} onChange={(e) => updateSettings({ showEnglish: e.target.checked })} /> Show English by default</label>
        <label className="row"><input type="checkbox" checked={s.autoPlayModel} onChange={(e) => updateSettings({ autoPlayModel: e.target.checked })} /> Play the complete sentence automatically after a correct answer</label>
      </div>
      <div className="card stack">
        <h2>Audio</h2>
        <p className="small">
          Model audio plays only from approved recordings (teacher or reviewed native speakers) listed in the course audio manifest.
          No recordings have been added yet, so lessons show “No approved recording yet”.
        </p>
        <label className="row">
          <input type="checkbox" checked={s.allowGeneratedVoice} onChange={(e) => updateSettings({ allowGeneratedVoice: e.target.checked })} />
          Use this device's Arabic voice as a temporary stand-in (unreviewed — not Palestinian-Jordanian pronunciation)
        </label>
        <div className="small muted">Device Arabic voice: {voice ? `${voice.name} (${voice.lang})` : 'none found'}</div>
      </div>
      <div className="card stack">
        <h2>Speaking</h2>
        <div className="small">Microphone recording: {micAvailable ? 'available' : 'not available in this browser'}</div>
        <div className="small">Speech-to-text: {speechRecognitionAvailable ? 'available (browser speech recognition, ar-JO)' : 'not available in this browser — you can still record yourself and type answers'}</div>
        <div className="small muted">Pronunciation is not scored in this version; answer checking compares the words you said with the approved answer key.</div>
      </div>
      <div className="card stack">
        <h2>Teacher view</h2>
        <label className="row">
          <input type="checkbox" checked={s.showReviewFlags} onChange={(e) => updateSettings({ showReviewFlags: e.target.checked })} />
          Show review flags (suspected source errors, missing answers, sentences composed for the app)
        </label>
      </div>
      <div className="card stack">
        <h2>Progress</h2>
        {courses.map((c) => (
          <ResetRow key={c.id} id={c.id} title={c.title} />
        ))}
      </div>
    </div>
  );
}

function ResetRow({ id, title }: { id: string; title: string }) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span>{title}</span>
      {asking ? (
        <span className="row">
          <span className="small">Erase all progress?</span>
          <button className="btn small" onClick={() => { progress.reset(id); setAsking(false); }}>Erase</button>
          <button className="btn small ghost" onClick={() => setAsking(false)}>Keep</button>
        </span>
      ) : (
        <button className="btn small" onClick={() => setAsking(true)}>Reset</button>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise, Phrase, Scene, SceneObject, SceneRoom, SceneTask } from '../content/types';
import { flatLessons, getCourse, getScene } from '../content/loader';
import { playPhrase, resolveSource } from '../audio/audio';
import { checkSubmission } from '../lib/check';
import { progress, useProgress, useSettings } from '../state/progress';
import { ObjectArt, RoomBackground, SceneDefs } from '../components/SceneArt';
import { Ar, AidToggles, AudioSourceBadge, Flags, SourceLink } from '../components/common';
import { SpeakControl, type Submission } from '../components/SpeakControl';
import { Feedback } from '../components/ExercisePlayer';
import { Icon } from '../components/icons';

type Mode = 'guided' | 'explore' | 'identify' | 'find' | 'describe' | 'place' | 'review';
const MODES: { id: Mode; label: string; ar?: string }[] = [
  { id: 'guided', label: 'First visit' },
  { id: 'explore', label: 'Explore' },
  { id: 'identify', label: 'Identify' },
  { id: 'find', label: 'Find' },
  { id: 'describe', label: 'Describe' },
  { id: 'place', label: 'Place' },
  { id: 'review', label: 'Review' },
];

const center = (h: { x: number; y: number; w: number; h: number }) => ({ x: h.x + h.w / 2, y: h.y + h.h / 2 });
const inBox = (p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

export function ApartmentView({ courseId }: { courseId: string }) {
  const course = getCourse(courseId);
  const scene = getScene(courseId, 'apartment') as (Scene & { unlocks?: Record<string, string> }) | undefined;
  const p = useProgress(courseId);
  const s = useSettings();
  const [mode, setMode] = useState<Mode>(() => (p.completedActivities['apartment:guided'] ? 'explore' : 'guided'));
  const [roomId, setRoomId] = useState('entrance');
  const [preview, setPreview] = useState(false);

  const reachedIdx = useMemo(() => {
    if (!course) return -1;
    const ls = flatLessons(course);
    const idx = ls.filter((r) => p.completedLessons[r.lesson.id] || r.lesson.id === p.lastLessonId).map((r) => r.index);
    return idx.length ? Math.max(...idx) : -1;
  }, [course, p]);

  if (!course || !scene) return <div className="notice">The apartment scene is not available.</div>;
  const room = scene.rooms.find((r) => r.id === roomId) ?? scene.rooms[0];

  const lockLesson = mode === 'guided' || mode === 'review' ? undefined : scene.unlocks?.[mode];
  const lockRef = lockLesson ? flatLessons(course).find((r) => r.lesson.id === lockLesson) : undefined;
  const locked = !!lockRef && lockRef.index > reachedIdx && !preview;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">The apartment · {room.en}</div>
          <h1 style={{ margin: 0 }}>
            <Ar size="lg">{room.ar}</Ar> <span className="translit small">{room.translit}</span>
          </h1>
        </div>
        <SourceLink source={scene.source} />
      </div>
      <div className="modes" role="tablist" aria-label="Practice mode">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} className={`chip ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {locked ? (
        <div className="card stack">
          <p style={{ margin: 0 }}>
            <strong>{MODES.find((m) => m.id === mode)?.label}</strong> uses language from{' '}
            <a href={`#/c/${courseId}/l/${lockRef!.lesson.id}`}>{lockRef!.lesson.code ? `${lockRef!.lesson.code} ` : ''}{lockRef!.lesson.title}</a>, which you haven't reached yet.
          </p>
          <div className="row">
            <a className="btn primary" href={`#/c/${courseId}/l/${lockRef!.lesson.id}`}>Go to the lesson</a>
            <button className="btn" onClick={() => setPreview(true)}>Preview anyway</button>
          </div>
        </div>
      ) : mode === 'guided' ? (
        <Guided courseId={courseId} scene={scene} onDone={() => { progress.completeActivity(courseId, 'apartment:guided'); setMode('explore'); }} />
      ) : (
        <RoomPlay key={`${room.id}-${mode}`} courseId={courseId} scene={scene} room={room} mode={mode} onRoom={setRoomId} showTranslit={s.showTranslit && mode !== 'review'} />
      )}
      <AidToggles />
      {scene.note && <p className="small muted">{scene.note}</p>}
    </div>
  );
}

/** Comic-style guided first visit: right-to-left panels, room by room. */
function Guided({ courseId, scene, onDone }: { courseId: string; scene: Scene; onDone: () => void }) {
  const s = useSettings();
  const panels = scene.rooms.flatMap((r) => (r.panels ?? []).map((pn) => ({ room: r, pn })));
  const [n, setN] = useState(0);
  const cur = panels[n];
  useEffect(() => {
    if (cur && s.autoPlayModel) playPhrase(courseId, cur.pn.caption, [`scene:${cur.room.id}:${cur.pn.id}`]);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur) return null;
  const focusObj = cur.room.objects.find((o) => o.id === cur.pn.focus);
  const focusDoor = cur.room.doors?.find((d) => `door-${d.to}` === cur.pn.focus);
  const focus = focusObj?.hit ?? focusDoor?.hit;
  const src = resolveSource(courseId, cur.pn.caption, [`scene:${cur.room.id}:${cur.pn.id}`]);
  return (
    <div className="stack">
      <div className="comic" aria-label="Comic panels, read right to left">
        {panels.slice(Math.max(0, n - 1), n + 1).map(({ room, pn }, k, arr) => {
          const i = Math.max(0, n - 1) + k;
          const active = i === n;
          return (
            <div className="panel" key={room.id + pn.id} style={{ opacity: active ? 1 : 0.55 }} aria-current={active}>
              <span className="num">{i + 1}</span>
              <RoomSvg room={room} focus={active ? focus : undefined} zoom={active ? focus : undefined} />
              <div className="cap">
                <Ar size="md">{pn.caption.ar}</Ar>
                {s.showTranslit && <div className="translit small">{pn.caption.translit}</div>}
                {(s.showEnglish || !active) && <div className="en small">{pn.caption.en}</div>}
                {active && <Flags flags={(pn as any).flags} />}
              </div>
              {arr.length === 1 && <></>}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn" disabled={n === 0} onClick={() => setN(n - 1)}><Icon name="back" /> Back</button>
        <span className="row">
          <button className="btn small" disabled={src === 'unavailable'} onClick={() => playPhrase(courseId, cur.pn.caption, [`scene:${cur.room.id}:${cur.pn.id}`])}>
            <Icon name="speaker" size={16} /> Listen
          </button>
          <AudioSourceBadge source={src} />
        </span>
        {n < panels.length - 1 ? (
          <button className="btn primary" onClick={() => setN(n + 1)}>Next <Icon name="arrow" /></button>
        ) : (
          <button className="btn olive" onClick={onDone}>Start exploring</button>
        )}
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>{n + 1} / {panels.length} · Say each caption out loud.</p>
    </div>
  );
}

function sortForDraw(objects: SceneObject[]) {
  const floor = ['rug', 'doormat', 'railing'];
  return [...objects].sort((a, b) => Number(floor.includes(b.art)) - Number(floor.includes(a.art)));
}

function RoomSvg({
  room,
  focus,
  zoom,
  children,
  offsets = {},
  svgRef,
}: {
  room: SceneRoom;
  focus?: { x: number; y: number; w: number; h: number };
  zoom?: { x: number; y: number; w: number; h: number };
  children?: React.ReactNode;
  offsets?: Record<string, { dx: number; dy: number }>;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  // gentle zoom towards the focused object for comic panels
  let vb = '0 0 1000 640';
  if (zoom) {
    const w = 640, h = 410;
    const c = center(zoom);
    const x = Math.max(0, Math.min(1000 - w, c.x - w / 2));
    const y = Math.max(0, Math.min(640 - h, c.y - h / 2));
    vb = `${x} ${y} ${w} ${h}`;
  }
  return (
    <svg viewBox={vb} ref={svgRef} role="img" aria-label={`Illustration: ${room.en}`}>
      <SceneDefs />
      <RoomBackground kind={room.background} />
      {sortForDraw(room.objects).map((o) => {
        const off = offsets[o.id];
        return (
          <g key={o.id} transform={off ? `translate(${off.dx} ${off.dy})` : undefined}>
            <ObjectArt art={o.art} b={o.hit} />
          </g>
        );
      })}
      {focus && <rect x={focus.x - 8} y={focus.y - 8} width={focus.w + 16} height={focus.h + 16} rx="12" fill="none" stroke="#b0603d" strokeWidth="5" strokeDasharray="12 8" />}
      {children}
    </svg>
  );
}

function RoomPlay({
  courseId,
  scene,
  room,
  mode,
  onRoom,
  showTranslit,
}: {
  courseId: string;
  scene: Scene;
  room: SceneRoom;
  mode: Mode;
  onRoom: (id: string) => void;
  showTranslit: boolean;
}) {
  const s = useSettings();
  const isReview = mode === 'review';
  const tasks: { task: SceneTask; room: SceneRoom }[] = useMemo(() => {
    if (isReview) return scene.rooms.flatMap((r) => r.tasks.filter((t) => t.kind === 'identify' || t.kind === 'find' || t.kind === 'describe').map((task) => ({ task, room: r })));
    return room.tasks.filter((t) => t.kind === mode).map((task) => ({ task, room }));
  }, [scene, room, mode, isReview]);
  const [ti, setTi] = useState(0);
  const [label, setLabel] = useState<SceneObject | null>(null);
  const [state, setState] = useState<'ask' | 'right' | 'wrong'>('ask');
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [said, setSaid] = useState<{ sub: Submission; result: ReturnType<typeof checkSubmission> } | null>(null);
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const drag = useRef<{ id: string; sx: number; sy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cur = tasks[ti];
  const taskRoom = cur?.room ?? room;
  useEffect(() => {
    if (cur && cur.room.id !== room.id) onRoom(cur.room.id);
  }, [cur, room.id, onRoom]);

  const success = (model: Phrase) => {
    setState('right');
    if (cur) progress.completeActivity(courseId, `apartment:${cur.task.id}`);
    if (s.autoPlayModel) playPhrase(courseId, model, [cur ? `scene:${cur.task.id}` : '']);
  };

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  };

  const tapObject = (o: SceneObject) => {
    if (mode === 'explore') {
      setLabel(o);
      playPhrase(courseId, { ar: o.ar, translit: o.translit, en: o.en }, [o.vocabRef, `scene:${o.id}`]);
      return;
    }
    if (!cur || state === 'right') return;
    if ((cur.task.kind === 'identify' || cur.task.kind === 'find' || (isReview && cur.task.kind !== 'describe')) && cur.task.targetId) {
      if (o.id === cur.task.targetId) success(cur.task.model);
      else {
        setState('wrong');
        setWrongId(o.id);
        setTimeout(() => setWrongId(null), 700);
      }
    }
  };

  const next = () => {
    setState('ask');
    setSaid(null);
    setOffsets({});
    setTi((i) => (i + 1) % Math.max(tasks.length, 1));
  };

  const target = cur?.task.targetId ? taskRoom.objects.find((o) => o.id === cur.task.targetId) : undefined;
  const describeFocus = (cur?.task.kind === 'describe') && target ? target.hit : undefined;
  const placeObj = cur?.task.kind === 'place' ? taskRoom.objects.find((o) => o.id === cur.task.objectId) : undefined;
  const placeZone = cur?.task.kind === 'place' ? taskRoom.zones?.find((z) => z.id === cur.task.zoneId) : undefined;

  const onDown = (o: SceneObject) => (e: React.PointerEvent) => {
    if (mode !== 'place' || o.id !== placeObj?.id || state === 'right') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e);
    const off = offsets[o.id] ?? { dx: 0, dy: 0 };
    drag.current = { id: o.id, sx: p.x - off.dx, sy: p.y - off.dy };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toSvg(e);
    setOffsets((o) => ({ ...o, [drag.current!.id]: { dx: p.x - drag.current!.sx, dy: p.y - drag.current!.sy } }));
  };
  const onUp = () => {
    if (!drag.current || !placeObj || !placeZone) return;
    const off = offsets[placeObj.id] ?? { dx: 0, dy: 0 };
    const c = center(placeObj.hit);
    drag.current = null;
    if (inBox({ x: c.x + off.dx, y: c.y + off.dy }, placeZone.hit)) success(cur!.task.model);
    else {
      setState('wrong');
      setOffsets({});
    }
  };
  // keyboard/tap alternative for placing: choose a zone
  const placeInto = (zoneId: string) => {
    if (!placeObj || !cur) return;
    const z = taskRoom.zones?.find((x) => x.id === zoneId);
    if (!z) return;
    const c = center(placeObj.hit), zc = center(z.hit);
    setOffsets({ [placeObj.id]: { dx: zc.x - c.x, dy: zc.y - c.y } });
    if (zoneId === cur.task.zoneId) success(cur.task.model);
    else setState('wrong');
  };

  const submitSpeech = (sub: Submission) => {
    if (!cur) return;
    const item = { id: `scene:${cur.task.id}`, answers: cur.task.answers ?? [{ ar: cur.task.model.ar, translit: cur.task.model.translit }], model: cur.task.model };
    const result = checkSubmission(item, sub);
    setSaid({ sub, result });
    if (result.verdict === 'correct') progress.completeActivity(courseId, `apartment:${cur.task.id}`);
  };

  return (
    <div className="stack">
      {mode !== 'explore' && cur && (
        <div className="card prompt-card" style={{ padding: 14 }}>
          <div className="eyebrow">
            {cur.task.kind === 'identify' ? 'Tap the object' : cur.task.kind === 'find' ? 'Find it from the description' : cur.task.kind === 'describe' ? 'Describe aloud' : 'Move the object'} · {ti + 1}/{tasks.length}
          </div>
          {cur.task.prompt.ar && (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn small icon" style={{ width: 36, minHeight: 36 }} aria-label="Listen" disabled={resolveSource(courseId, cur.task.prompt, [`scene:${cur.task.id}:prompt`]) === 'unavailable'} onClick={() => playPhrase(courseId, cur.task.prompt, [`scene:${cur.task.id}:prompt`])}>
                <Icon name="speaker" size={16} />
              </button>
              <Ar size="lg">{cur.task.prompt.ar}</Ar>
            </div>
          )}
          {cur.task.prompt.translit && showTranslit && <div className="translit">{cur.task.prompt.translit}</div>}
          {cur.task.prompt.en && (!cur.task.prompt.ar || (s.showEnglish && !isReview)) && <div className="en">{cur.task.prompt.en}</div>}
          <Flags flags={cur.task.flags} />
        </div>
      )}
      {!cur && mode !== 'explore' && <div className="notice">No {mode} tasks in this room yet. Try another room or mode.</div>}

      <div className="scene-wrap" style={{ position: 'relative' }} onPointerMove={onMove} onPointerUp={onUp}>
        <RoomSvg room={taskRoom} focus={describeFocus ?? (mode === 'place' && placeZone && state !== 'right' ? undefined : undefined)} offsets={offsets} svgRef={svgRef}>
          {mode === 'place' && placeZone && state !== 'right' && (
            <rect x={placeZone.hit.x} y={placeZone.hit.y} width={placeZone.hit.w} height={placeZone.hit.h} rx="10" fill="#66743a" opacity=".0" />
          )}
          {/* doors between rooms */}
          {(mode === 'explore' || mode === 'identify' || mode === 'find' || mode === 'describe' || mode === 'place') &&
            !isReview &&
            taskRoom.doors?.map((d) => (
              <g key={d.to} className="hot" role="button" tabIndex={0} aria-label={`Go to ${d.label.en}`} onClick={() => onRoom(d.to)} onKeyDown={(e) => e.key === 'Enter' && onRoom(d.to)}>
                <rect className="hit" x={d.hit.x} y={d.hit.y} width={d.hit.w} height={d.hit.h} rx="10" />
                <text x={d.hit.x + d.hit.w / 2} y={d.hit.y + d.hit.h / 2} textAnchor="middle" fontFamily="'Noto Naskh Arabic', serif" fontSize="30" fill="#3b2d22" style={{ pointerEvents: 'none' }}>
                  {d.label.ar}
                </text>
                <text x={d.hit.x + d.hit.w / 2} y={d.hit.y + d.hit.h / 2 + 34} textAnchor="middle" fontSize="28" fill="#3b2d22" style={{ pointerEvents: 'none' }}>
                  {d.hit.x > 500 ? '→' : '←'}
                </text>
              </g>
            ))}
          {taskRoom.objects.map((o) => {
            const off = offsets[o.id];
            const draggable = mode === 'place' && o.id === placeObj?.id && state !== 'right';
            const cls = `hot ${state === 'right' && o.id === cur?.task.targetId ? 'found' : ''} ${wrongId === o.id ? 'wrong' : ''}`;
            return (
              <g
                key={o.id}
                className={cls}
                role="button"
                tabIndex={0}
                aria-label={mode === 'explore' ? `${o.en}` : 'object'}
                transform={off ? `translate(${off.dx} ${off.dy})` : undefined}
                onClick={() => tapObject(o)}
                onKeyDown={(e) => e.key === 'Enter' && tapObject(o)}
                onPointerDown={onDown(o)}
                style={draggable ? { cursor: 'grab', touchAction: 'none' } : undefined}
              >
                <rect className="hit" x={o.hit.x} y={o.hit.y} width={o.hit.w} height={o.hit.h} rx="10" style={draggable ? { stroke: '#b0603d', strokeWidth: 5, strokeDasharray: '10 6' } : undefined} />
              </g>
            );
          })}
        </RoomSvg>
        {label && mode === 'explore' && (
          <div className="label-pop" style={{ left: `${(center(label.hit).x / 1000) * 100}%`, top: `${(label.hit.y / 640) * 100}%` }}>
            <Ar size="md">{label.ar}</Ar>
            {s.showTranslit && <div className="translit small">{label.translit}</div>}
            {s.showEnglish && <div className="en small">{label.en}</div>}
          </div>
        )}
      </div>

      {mode === 'explore' && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="small muted" style={{ margin: 0 }}>Tap anything to hear its name. Tap a doorway to move between rooms. Say each word out loud.</p>
          {label && <AudioSourceBadge source={resolveSource(courseId, label, [label.vocabRef, `scene:${label.id}`])} />}
        </div>
      )}

      {mode === 'place' && placeObj && state !== 'right' && (
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>Drag the highlighted object, or choose a spot:</p>
          <div className="row">
            {taskRoom.zones?.map((z) => (
              <button key={z.id} className="btn small" onClick={() => placeInto(z.id)}>
                <span className="ar ar-sm">{z.label.ar}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {cur?.task.kind === 'describe' && !said && state !== 'right' && <SpeakControl key={cur.task.id} onSubmit={submitSpeech} hint="Describe the highlighted object aloud — hold Space or the button" />}
      {said && cur && (
        <Feedback
          courseId={courseId}
          item={{ id: `scene:${cur.task.id}`, answers: cur.task.answers, model: cur.task.model, flags: cur.task.flags }}
          exercise={{ type: 'exercise', id: 'apartment', items: [] } as Exercise}
          result={said.result}
          sub={said.sub}
          onRetry={() => setSaid(null)}
          onCorrectTranscript={(text) => submitSpeech({ text, via: 'typed' })}
          onNext={next}
        />
      )}

      {(state === 'right' || state === 'wrong') && cur && cur.task.kind !== 'describe' && (
        <div className={`feedback ${state === 'right' ? 'correct' : 'incorrect'}`} role="status">
          <div className="verdict">{state === 'right' ? '✓ Yes!' : 'Not that one — look again.'}</div>
          {state === 'right' && (
            <div className="model-line">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <button className="btn small icon" style={{ width: 36 }} aria-label="Replay" disabled={resolveSource(courseId, cur.task.model, [`scene:${cur.task.id}`]) === 'unavailable'} onClick={() => playPhrase(courseId, cur.task.model, [`scene:${cur.task.id}`])}>
                  <Icon name="replay" />
                </button>
                <Ar size="md">{cur.task.model.ar}</Ar>
              </div>
              {showTranslit && <div className="translit small">{cur.task.model.translit}</div>}
              <div className="en small">{cur.task.model.en}</div>
              <AudioSourceBadge source={resolveSource(courseId, cur.task.model, [`scene:${cur.task.id}`])} />
            </div>
          )}
          <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
            {state === 'wrong' && <button className="btn small" onClick={() => { setState('ask'); setOffsets({}); }}>Try again</button>}
            {state === 'right' && <button className="btn primary" onClick={next}>Next <Icon name="arrow" size={16} /></button>}
          </div>
        </div>
      )}
    </div>
  );
}

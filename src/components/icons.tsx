const PATHS: Record<string, string> = {
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zm-7 9a7 7 0 0 0 14 0M12 19v3',
  speaker: 'M4 9v6h4l5 4V5L8 9H4zm12.5 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5z',
  'speaker-off': 'M4 9v6h4l5 4V5L8 9H4zm12 0 5 6m0-6-5 6',
  wave: 'M4 12h2m3-5v10m4-13v16m4-11v6m3-3h1',
  play: 'M7 4v16l13-8z',
  pause: 'M7 4h4v16H7zm6 0h4v16h-4z',
  replay: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  home: 'M3 11 12 3l9 8v10h-6v-6H9v6H3z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0v16',
  door: 'M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h16M14 12h.01',
  metronome: 'M9 3h6l4 18H5zM12 17l4-10',
  review: 'M12 21a9 9 0 1 1 9-9M21 4v5h-5M12 7v5l3 2',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6 6 18',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3 2-1-2-4-2 1-2-1-1-2h-4L8 6 6 7 4 6l-2 4 2 1v2l-2 1 2 4 2-1 2 1 1 2h4l1-2 2-1 2 1 2-4-2-1z',
};

export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} fill={name === 'play' || name === 'pause' ? 'currentColor' : 'none'} />
    </svg>
  );
}

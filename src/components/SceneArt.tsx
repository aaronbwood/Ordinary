// Illustrated apartment art (inline SVG). Each object is drawn inside its hit
// box so the content file controls layout. Style: warm limestone, wood,
// patterned tiles, arched openings — consistent across rooms.

type Box = { x: number; y: number; w: number; h: number };

const WOOD = '#8a5a3a';
const WOOD_D = '#5e3b24';
const LINE = '#3b2d22';
const PLASTER = '#f3ead9';
const BLUE = '#4c6c84';
const OLIVE = '#66743a';
const TERRA = '#b0603d';

export function RoomBackground({ kind }: { kind: string }) {
  if (kind === 'balcony') {
    return (
      <g>
        <defs>
          <linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a9c6d8" />
            <stop offset="1" stopColor="#efe2c6" />
          </linearGradient>
        </defs>
        <rect width="1000" height="640" fill="url(#bsky)" />
        {/* hillside town of limestone houses */}
        <path d="M0 260 Q200 180 420 230 T1000 210 V330 H0Z" fill="#c9b48f" />
        {Array.from({ length: 18 }).map((_, i) => (
          <g key={i} transform={`translate(${30 + i * 55} ${215 + ((i * 37) % 50)})`}>
            <rect width="38" height="30" fill="#efe6d4" stroke="#bfa98a" />
            <rect x="8" y="10" width="7" height="10" rx="3" fill="#7a8fa0" />
            <rect x="22" y="10" width="7" height="10" rx="3" fill="#7a8fa0" />
            {i % 3 === 0 && <path d="M-2 0 L19 -12 L40 0Z" fill={TERRA} />}
          </g>
        ))}
        <path d="M720 300 q8 -70 0 -110 q-8 40 0 110z" fill="#4f5f34" />
        <rect y="330" width="1000" height="310" fill="url(#tileFloor)" />
        <rect y="326" width="1000" height="6" fill="#b9a07a" />
        {/* doorway back inside (left) */}
        <path d="M0 620 V400 a60 60 0 0 1 120 0 V620Z" fill="#2f241b" opacity=".85" />
        {/* plants along railing */}
        {[160, 640, 820, 900].map((x, i) => (
          <g key={x} transform={`translate(${x} 470)`}>
            <path d="M0 40 h50 l-6 46 h-38z" fill={TERRA} />
            <circle cx="25" cy="22" r={26 + (i % 2) * 6} fill={OLIVE} />
            <circle cx="12" cy="14" r="5" fill="#d98a64" />
            <circle cx="36" cy="10" r="5" fill="#e6b85c" />
          </g>
        ))}
      </g>
    );
  }
  const salon = kind === 'salon';
  return (
    <g>
      <rect width="1000" height="640" fill="#efe4cf" />
      {/* limestone courses */}
      {[70, 140, 210, 280, 350].map((y) => (
        <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#d9c7a6" strokeWidth="1.2" opacity=".55" />
      ))}
      {/* floor */}
      <path d="M0 440 H1000 V640 H0Z" fill="url(#tileFloor)" />
      <rect y="434" width="1000" height="8" fill="#b9a07a" />
      {/* light from window */}
      {salon && <path d="M210 70 L390 70 L620 640 L120 640Z" fill="#fff3cf" opacity=".22" />}
      {!salon && (
        <g>
          {/* arched passage to the living room (right) */}
          <path d="M770 480 V220 a70 70 0 0 1 140 0 V480Z" fill="#d9c6a3" />
          <path d="M785 480 V225 a55 55 0 0 1 110 0 V480Z" fill="#f6e7c8" />
          <rect x="800" y="300" width="80" height="60" fill="#c9b48f" opacity=".5" />
          {/* potted plant decor */}
          <g transform="translate(660 360)">
            <path d="M0 70 h60 l-8 50 h-44z" fill={TERRA} />
            <g className="leaf"><path d="M30 70 q-30 -50 -8 -100 q14 50 8 100z" fill={OLIVE} /></g>
            <g className="leaf"><path d="M30 70 q34 -50 10 -96 q-10 52 -10 96z" fill="#7d8c4a" /></g>
          </g>
          {/* ceiling cord */}
          <line x1="500" y1="0" x2="500" y2="30" stroke={LINE} strokeWidth="3" />
        </g>
      )}
      {salon && (
        <g>
          {/* doorway left back to entrance, doorway right to balcony */}
          <path d="M0 480 V200 a40 40 0 0 1 70 0 V480Z" fill="#d9c6a3" />
          <path d="M910 480 V190 a45 45 0 0 1 90 0 V480Z" fill="#bcd3df" />
          <path d="M920 480 V195 a35 35 0 0 1 70 0 V480Z" fill="#cfe0e8" />
          <line x1="955" y1="160" x2="955" y2="480" stroke={WOOD} strokeWidth="4" />
        </g>
      )}
    </g>
  );
}

export function SceneDefs() {
  return (
    <defs>
      <pattern id="tileFloor" width="50" height="50" patternUnits="userSpaceOnUse">
        <rect width="50" height="50" fill="#e4d2b2" />
        <path d="M25 3 47 25 25 47 3 25z" fill="none" stroke="#b9885c" strokeWidth="1.5" />
        <circle cx="25" cy="25" r="6" fill={TERRA} opacity=".55" />
        <circle cx="0" cy="0" r="7" fill={BLUE} opacity=".5" />
        <circle cx="50" cy="0" r="7" fill={BLUE} opacity=".5" />
        <circle cx="0" cy="50" r="7" fill={BLUE} opacity=".5" />
        <circle cx="50" cy="50" r="7" fill={BLUE} opacity=".5" />
      </pattern>
      <pattern id="rugPat" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#9e3f2b" />
        <path d="M12 2 22 12 12 22 2 12z" fill="#d59a55" />
        <circle cx="12" cy="12" r="3" fill="#2f4b5e" />
      </pattern>
    </defs>
  );
}

/** Draw one object in its box. */
export function ObjectArt({ art, b }: { art: string; b: Box }) {
  const { x, y, w, h } = b;
  switch (art) {
    case 'frontDoor':
      return (
        <g>
          <path d={`M${x} ${y + h} V${y + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 V${y + h}Z`} fill={WOOD} stroke={LINE} strokeWidth="3" />
          <path d={`M${x + 14} ${y + h - 14} V${y + w / 2 + 6} a${w / 2 - 14} ${w / 2 - 14} 0 0 1 ${w - 28} 0 V${y + h - 14}Z`} fill="none" stroke={WOOD_D} strokeWidth="3" />
          <line x1={x + w / 2} x2={x + w / 2} y1={y + w / 2} y2={y + h - 14} stroke={WOOD_D} strokeWidth="3" />
          <circle cx={x + w / 2 + 18} cy={y + h * 0.6} r="6" fill="#d4a24c" />
          <circle cx={x + w / 2 - 18} cy={y + h * 0.6} r="6" fill="#d4a24c" />
        </g>
      );
    case 'mirror':
      return (
        <g>
          <path d={`M${x} ${y + h} V${y + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 V${y + h}Z`} fill="#c8a35a" stroke={LINE} strokeWidth="3" />
          <path d={`M${x + 10} ${y + h - 10} V${y + w / 2} a${w / 2 - 10} ${w / 2 - 10} 0 0 1 ${w - 20} 0 V${y + h - 10}Z`} fill="#cfe0e8" />
          <path d={`M${x + 30} ${y + 50} l30 -20 M${x + 30} ${y + 80} l50 -34`} stroke="#fff" strokeWidth="5" opacity=".7" />
        </g>
      );
    case 'entryCabinet':
    case 'tvCabinet':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h - 10} rx="4" fill={WOOD} stroke={LINE} strokeWidth="3" />
          <line x1={x + w / 2} x2={x + w / 2} y1={y + 6} y2={y + h - 16} stroke={WOOD_D} strokeWidth="3" />
          <circle cx={x + w / 2 - 12} cy={y + h / 2} r="4" fill="#d4a24c" />
          <circle cx={x + w / 2 + 12} cy={y + h / 2} r="4" fill="#d4a24c" />
          <rect x={x + 8} y={y + h - 10} width="10" height="10" fill={WOOD_D} />
          <rect x={x + w - 18} y={y + h - 10} width="10" height="10" fill={WOOD_D} />
        </g>
      );
    case 'bulb':
      return (
        <g>
          <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + 40} stroke={LINE} strokeWidth="3" />
          <rect x={x + w / 2 - 9} y={y + 38} width="18" height="12" fill="#8a7c6c" />
          <circle cx={x + w / 2} cy={y + 66} r="20" fill="#ffe9a8" stroke={LINE} strokeWidth="2.5" />
          <circle cx={x + w / 2} cy={y + 66} r="34" fill="#fff3c4" opacity=".35" />
        </g>
      );
    case 'doormat':
      return <rect x={x} y={y} width={w} height={h} rx="8" fill="url(#rugPat)" stroke={LINE} strokeWidth="3" />;
    case 'rug':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="6" fill="url(#rugPat)" stroke={LINE} strokeWidth="3" />
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1={x + 10 + i * ((w - 20) / 11)} x2={x + 10 + i * ((w - 20) / 11)} y1={y + h} y2={y + h + 8} stroke="#d59a55" strokeWidth="2" />
          ))}
        </g>
      );
    case 'sofa':
      return (
        <g>
          <rect x={x + 10} y={y + 20} width={w - 20} height={h - 70} rx="18" fill="#d8c3a0" stroke={LINE} strokeWidth="3" />
          <rect x={x} y={y + h - 70} width={w} height="50" rx="14" fill="#cbb38b" stroke={LINE} strokeWidth="3" />
          <rect x={x - 6} y={y + 40} width="40" height={h - 60} rx="14" fill="#c4aa80" stroke={LINE} strokeWidth="3" />
          <rect x={x + w - 34} y={y + 40} width="40" height={h - 60} rx="14" fill="#c4aa80" stroke={LINE} strokeWidth="3" />
          <rect x={x + 20} y={y + h - 20} width="12" height="20" fill={WOOD_D} />
          <rect x={x + w - 32} y={y + h - 20} width="12" height="20" fill={WOOD_D} />
        </g>
      );
    case 'pillow':
      return (
        <g>
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="14" fill={BLUE} stroke={LINE} strokeWidth="3" />
          <path d={`M${x + 20} ${y + h / 2} h${w - 40}`} stroke="#e8dcc6" strokeWidth="3" strokeDasharray="6 5" />
        </g>
      );
    case 'coffeeTable':
      return (
        <g>
          <ellipse cx={x + w / 2} cy={y + 18} rx={w / 2} ry="18" fill={WOOD} stroke={LINE} strokeWidth="3" />
          <rect x={x + 20} y={y + 22} width="12" height={h - 22} fill={WOOD_D} />
          <rect x={x + w - 32} y={y + 22} width="12" height={h - 22} fill={WOOD_D} />
          {/* coffee cups */}
          <path d={`M${x + w / 2 - 30} ${y + 2} h18 l-3 14 h-12z`} fill={PLASTER} stroke={LINE} strokeWidth="2" />
          <path d={`M${x + w / 2 + 10} ${y + 2} h18 l-3 14 h-12z`} fill={PLASTER} stroke={LINE} strokeWidth="2" />
        </g>
      );
    case 'archWindow':
      return (
        <g>
          <path d={`M${x} ${y + h} V${y + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 V${y + h}Z`} fill={WOOD} stroke={LINE} strokeWidth="3" />
          <path d={`M${x + 10} ${y + h - 10} V${y + w / 2} a${w / 2 - 10} ${w / 2 - 10} 0 0 1 ${w - 20} 0 V${y + h - 10}Z`} fill="#bcd3df" />
          <path d={`M${x + 10} ${y + h - 40} q${w / 4} -40 ${w / 2} -10 q${w / 4} -30 ${w / 2 - 20} 0 V${y + h - 10} H${x + 10}Z`} fill="#8a9a63" opacity=".8" />
          <line x1={x + w / 2} x2={x + w / 2} y1={y + 12} y2={y + h - 10} stroke={WOOD} strokeWidth="5" />
          <line x1={x + 10} x2={x + w - 10} y1={y + h * 0.55} y2={y + h * 0.55} stroke={WOOD} strokeWidth="4" />
          {/* shutters */}
          <rect x={x - 46} y={y + w / 2 - 10} width="42" height={h - w / 2 + 10} fill={BLUE} stroke={LINE} strokeWidth="2" />
          <rect x={x + w + 4} y={y + w / 2 - 10} width="42" height={h - w / 2 + 10} fill={BLUE} stroke={LINE} strokeWidth="2" />
          <rect x={x - 8} y={y + h - 4} width={w + 16} height="10" fill="#cdb894" />
        </g>
      );
    case 'chair':
    case 'balconyChair': {
      const c = art === 'chair' ? WOOD : '#3f5a6c';
      return (
        <g>
          <rect x={x + 10} y={y} width={w - 20} height={h * 0.5} rx="10" fill={c} stroke={LINE} strokeWidth="3" />
          <rect x={x + 18} y={y + 10} width={w - 36} height={h * 0.5 - 20} rx="6" fill="none" stroke={art === 'chair' ? WOOD_D : '#2c4352'} strokeWidth="2" />
          <rect x={x} y={y + h * 0.5} width={w} height="18" rx="5" fill={c} stroke={LINE} strokeWidth="3" />
          <rect x={x + 6} y={y + h * 0.5 + 18} width="10" height={h * 0.5 - 18} fill={WOOD_D} />
          <rect x={x + w - 16} y={y + h * 0.5 + 18} width="10" height={h * 0.5 - 18} fill={WOOD_D} />
        </g>
      );
    }
    case 'tv':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h - 16} rx="8" fill="#2d2a27" stroke={LINE} strokeWidth="3" />
          <rect x={x + 8} y={y + 8} width={w - 16} height={h - 32} rx="4" fill="#4c6c84" />
          <path d={`M${x + 20} ${y + h - 40} l30 -30 l20 18 l26 -34 l36 46z`} fill="#7d93a6" />
          <rect x={x + w / 2 - 20} y={y + h - 16} width="40" height="16" fill="#2d2a27" />
        </g>
      );
    case 'shelf':
      return (
        <g>
          <rect x={x} y={y + h - 14} width={w} height="12" fill={WOOD} stroke={LINE} strokeWidth="2.5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={x + 14 + i * 22} y={y + 8 + (i % 2) * 6} width="18" height={h - 22 - (i % 2) * 6} fill={[OLIVE, TERRA, BLUE, '#c9a65a', OLIVE, TERRA][i]} stroke={LINE} strokeWidth="1.5" />
          ))}
          <path d={`M${x + w - 46} ${y + h - 14} q4 -40 22 -44 q-6 24 18 44z`} fill={OLIVE} />
        </g>
      );
    case 'cafeTable':
      return (
        <g>
          <ellipse cx={x + w / 2} cy={y + 20} rx={w / 2} ry="20" fill="#e9dcc3" stroke={LINE} strokeWidth="3" />
          <rect x={x + w / 2 - 6} y={y + 30} width="12" height={h - 40} fill="#3f5a6c" />
          <rect x={x + w / 2 - 36} y={y + h - 12} width="72" height="10" rx="4" fill="#3f5a6c" />
          <path d={`M${x + w / 2 - 14} ${y + 4} h20 l-3 14 h-14z`} fill={PLASTER} stroke={LINE} strokeWidth="2" />
        </g>
      );
    case 'railing':
      return (
        <g>
          <rect x={x} y={y} width={w} height="10" fill="#3f5a6c" />
          {Array.from({ length: 40 }).map((_, i) => (
            <rect key={i} x={x + 5 + i * 25} y={y + 10} width="5" height={h + 120} fill="#3f5a6c" />
          ))}
        </g>
      );
    default:
      return <rect x={x} y={y} width={w} height={h} fill="#ccc" />;
  }
}

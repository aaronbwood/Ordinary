// Illustrated façade/interior of an older Lebanese home: arched windows,
// shutters, limestone, tiles, plants, a coffee cup on the sill. Pure SVG.

export function HouseArt() {
  return (
    <svg viewBox="0 0 800 340" role="img" aria-label="Inside an old Lebanese home: arched windows with wooden shutters, patterned tiles, plants and a coffee cup">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe4cf" />
          <stop offset="1" stopColor="#e3d3b6" />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bcd3df" />
          <stop offset="1" stopColor="#e9e2cf" />
        </linearGradient>
        <linearGradient id="light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3cf" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
        </linearGradient>
        <pattern id="floor" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#e6d6ba" />
          <path d="M20 2 38 20 20 38 2 20z" fill="none" stroke="#b9885c" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="5" fill="#b0603d" opacity=".55" />
          <circle cx="0" cy="0" r="5" fill="#4c6c84" opacity=".5" />
          <circle cx="40" cy="0" r="5" fill="#4c6c84" opacity=".5" />
          <circle cx="0" cy="40" r="5" fill="#4c6c84" opacity=".5" />
          <circle cx="40" cy="40" r="5" fill="#4c6c84" opacity=".5" />
        </pattern>
      </defs>
      <rect width="800" height="340" fill="url(#wall)" />
      {/* limestone courses */}
      {[40, 80, 120, 160, 200].map((y) => (
        <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="#d6c4a3" strokeWidth="1" opacity=".5" />
      ))}
      {/* three arched windows (triple-arch, typical of old Lebanese houses) */}
      {[250, 350, 450].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 230 V110 a50 50 0 0 1 100 0 V230 Z`} fill="#7a5236" />
          <path d={`M${x + 8} 226 V112 a42 42 0 0 1 84 0 V226 Z`} fill="url(#sky)" />
          {/* distant hills and a cypress */}
          <path d={`M${x + 8} 200 q20 -18 42 -6 q22 -16 42 2 V226 H${x + 8}Z`} fill="#8a9a63" opacity=".7" />
          {i === 1 && <path d={`M${x + 64} 220 q6 -40 0 -62 q-6 22 0 62z`} fill="#55663a" />}
          <line x1={x + 50} x2={x + 50} y1="70" y2="226" stroke="#7a5236" strokeWidth="4" />
          <line x1={x + 8} x2={x + 92} y1="150" y2="150" stroke="#7a5236" strokeWidth="3" />
        </g>
      ))}
      {/* open shutters */}
      <path d="M200 120 h46 v110 h-46z" fill="#4c6c84" />
      {[130, 150, 170, 190, 210].map((y) => <line key={y} x1="204" x2="242" y1={y} y2={y} stroke="#3c586c" strokeWidth="3" />)}
      <path d="M554 120 h46 v110 h-46z" fill="#4c6c84" />
      {[130, 150, 170, 190, 210].map((y) => <line key={y} x1="558" x2="596" y1={y} y2={y} stroke="#3c586c" strokeWidth="3" />)}
      {/* sill */}
      <rect x="236" y="228" width="328" height="12" rx="3" fill="#cdb894" />
      {/* coffee cup + pot on the sill */}
      <g transform="translate(290 212)">
        <path d="M0 0 h16 l-2 14 h-12z" fill="#f7f1e5" stroke="#7a5236" strokeWidth="1.5" />
        <path d="M5 -4 q3 -6 0 -10 M10 -4 q3 -6 0 -10" stroke="#b9a68a" strokeWidth="1.2" fill="none" />
      </g>
      <g transform="translate(316 200)">
        <path d="M2 26 l4 -22 h10 l4 22z" fill="#c08a3a" />
        <path d="M16 6 l14 -6" stroke="#7a5236" strokeWidth="3" />
      </g>
      {/* books */}
      <g transform="translate(470 206)">
        <rect width="10" height="22" fill="#66743a" />
        <rect x="11" y="3" width="9" height="19" fill="#b0603d" />
        <rect x="21" y="1" width="11" height="21" fill="#4c6c84" />
      </g>
      {/* plants */}
      <g transform="translate(120 190)">
        <path d="M10 70 h40 l-6 40 h-28z" fill="#b0603d" />
        <g className="leaf"><path d="M30 70 q-30 -40 -10 -80 q10 40 10 80z" fill="#66743a" /></g>
        <g className="leaf" style={{ animationDelay: '1s' }}><path d="M30 70 q30 -50 12 -90 q-8 50 -12 90z" fill="#7d8c4a" /></g>
        <g className="leaf" style={{ animationDelay: '2s' }}><path d="M30 70 q-50 -10 -46 -50 q26 20 46 50z" fill="#55663a" /></g>
      </g>
      <g transform="translate(640 200)">
        <path d="M6 60 h36 l-5 40 h-26z" fill="#c9a77a" />
        <g className="leaf"><circle cx="24" cy="40" r="26" fill="#66743a" /></g>
        <circle cx="12" cy="32" r="5" fill="#d98a64" />
        <circle cx="34" cy="26" r="5" fill="#d98a64" />
      </g>
      {/* floor */}
      <rect x="0" y="300" width="800" height="40" fill="url(#floor)" />
      <rect x="0" y="296" width="800" height="5" fill="#b9a07a" />
      {/* sunlight */}
      <path d="M250 110 L450 110 L700 340 L330 340Z" fill="url(#light)" />
      <text x="400" y="40" textAnchor="middle" fontFamily="'Noto Naskh Arabic', serif" fontSize="30" fill="#7a5236">أَهْلًا وَسَهْلًا</text>
    </svg>
  );
}

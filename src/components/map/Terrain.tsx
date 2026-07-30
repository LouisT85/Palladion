import { MAP } from '../../game/data'

/** phase du jour ∈ [0,1) : 0–0.08 aube, 0.08–0.55 jour, 0.55–0.68 crépuscule, 0.68–1 nuit */
export function phaseJour(now: number, createdAt: number, dayMs: number): number {
  return ((now - createdAt) % dayMs) / dayMs
}

export function nomPhase(p: number): string {
  if (p < 0.08) return 'Aube'
  if (p < 0.55) return 'Jour'
  if (p < 0.68) return 'Crépuscule'
  return 'Nuit'
}

/** l'horizon : toutes les montagnes reposent exactement sur cette ligne */
const HORIZON = 212

function Arbre({ x, y, t, s = 1 }: { x: number; y: number; t: 'olivier' | 'cypres'; s?: number }) {
  if (t === 'cypres') {
    return (
      <g transform={`translate(${x},${y}) scale(${s})`}>
        <ellipse cx={0} cy={1.5} rx={7} ry={2.2} fill="#000" opacity={0.14} />
        <rect x={-1.5} y={-4} width={3} height={6} fill="#6b4d2e" />
        <path d="M0,-38 C6,-24 7,-12 0,-4 C-7,-12 -6,-24 0,-38Z" fill="#33573a" />
        <path d="M0,-36 C4,-24 4.5,-13 0,-6 C-1.5,-13 -2,-24 0,-36Z" fill="#457a4a" opacity={0.7} />
      </g>
    )
  }
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={0} cy={1.5} rx={10} ry={2.6} fill="#000" opacity={0.14} />
      <path d="M0,0 C-2,-6 -4,-10 -2,-14" stroke="#7a5a35" strokeWidth={3} fill="none" />
      <ellipse cx={-2} cy={-18} rx={12} ry={8} fill="#74875a" />
      <ellipse cx={6} cy={-14} rx={8} ry={6} fill="#8a9c6c" />
      <ellipse cx={-6} cy={-21} rx={6} ry={4} fill="#93a476" opacity={0.9} />
    </g>
  )
}

const ARBRES: { x: number; y: number; t: 'olivier' | 'cypres'; s: number }[] = [
  // bosquet du nord-est, autour du camp de bûcherons
  { x: 892, y: 252, t: 'cypres', s: 1.05 },
  { x: 928, y: 230, t: 'olivier', s: 0.95 },
  { x: 1015, y: 252, t: 'cypres', s: 1.1 },
  { x: 1052, y: 288, t: 'cypres', s: 0.85 },
  { x: 1094, y: 258, t: 'cypres', s: 1 },
  { x: 1012, y: 335, t: 'olivier', s: 1 },
  { x: 1122, y: 300, t: 'olivier', s: 0.9 },
  { x: 1078, y: 352, t: 'cypres', s: 0.9 },
  { x: 1160, y: 342, t: 'olivier', s: 0.8 },
  // sud
  { x: 340, y: 722, t: 'olivier', s: 1 },
  { x: 424, y: 756, t: 'olivier', s: 0.85 },
  { x: 562, y: 732, t: 'cypres', s: 0.9 },
  { x: 662, y: 762, t: 'olivier', s: 1.1 },
  { x: 942, y: 692, t: 'cypres', s: 1 },
  { x: 1052, y: 642, t: 'olivier', s: 1 },
  { x: 1148, y: 712, t: 'cypres', s: 0.85 },
  // ouest
  { x: 62, y: 424, t: 'olivier', s: 0.9 },
  { x: 96, y: 522, t: 'cypres', s: 0.85 },
  { x: 152, y: 372, t: 'olivier', s: 0.75 },
]

const TOUFFES: [number, number][] = [
  [320, 300], [520, 268], [760, 292], [180, 470], [260, 560], [430, 692],
  [700, 700], [860, 640], [1080, 480], [1130, 560], [980, 420], [90, 620],
  [620, 258], [1010, 590],
]

const FLEURS: [number, number, string][] = [
  [370, 280, '#e8e2d2'], [610, 275, '#c0563f'], [820, 640, '#e8e2d2'],
  [230, 520, '#d9a0b0'], [1060, 520, '#e8e2d2'], [500, 715, '#c0563f'],
  [1120, 620, '#d9a0b0'], [140, 560, '#e8e2d2'],
]

export function Terrain({ phase, paisible = true }: { phase: number; paisible?: boolean }) {
  // position du soleil / de la lune sur un arc
  const jour = phase >= 0.02 && phase < 0.62
  const tAstre = jour ? (phase - 0.02) / 0.6 : ((phase + 1 - 0.62) % 1) / 0.4
  const ax = 110 + tAstre * 980
  const ay = 140 - Math.sin(tAstre * Math.PI) * 95

  const crepuscule = phase >= 0.55 && phase < 0.68
  const aube = phase < 0.08

  return (
    <g>
      <defs>
        <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={crepuscule ? '#cd7f4e' : aube ? '#c2a184' : '#8fc0d8'} />
          <stop offset="100%" stopColor={crepuscule ? '#ecc890' : aube ? '#e8d5b0' : '#d8ecec'} />
        </linearGradient>
        <linearGradient id="plaine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bdb47c" />
          <stop offset="100%" stopColor="#a29b66" />
        </linearGradient>
        <linearGradient id="mer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#25607e" />
          <stop offset="55%" stopColor="#3b7f9c" />
          <stop offset="100%" stopColor="#57a3b5" />
        </linearGradient>
        <radialGradient id="halo-soleil">
          <stop offset="0%" stopColor={jour ? '#f8e3a0' : '#e8e4d4'} stopOpacity={0.65} />
          <stop offset="100%" stopColor="#f8e3a0" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="44%" r="72%">
          <stop offset="0%" stopColor="#000" stopOpacity={0} />
          <stop offset="74%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#081020" stopOpacity={0.34} />
        </radialGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0"
          />
        </filter>
      </defs>

      {/* ciel, halo et astre */}
      <rect x={0} y={0} width={MAP.w} height={HORIZON} fill="url(#ciel)" />
      <circle cx={ax} cy={ay} r={64} fill="url(#halo-soleil)" />
      <circle cx={ax} cy={ay} r={jour ? 21 : 15} fill={jour ? '#f6d67c' : '#eae6d6'} />
      {!jour && <circle cx={ax - 6} cy={ay - 3} r={12.5} fill={crepuscule ? '#cd7f4e' : '#20303f'} opacity={0.55} />}

      {/* chaîne lointaine, voilée par la brume */}
      <path
        d={`M0,${HORIZON} L110,152 L205,184 L330,130 L455,178 L575,140 L690,182 L810,144 L930,182 L1050,150 L1200,188 L1200,${HORIZON} Z`}
        fill="#9db0b8"
        opacity={0.75}
      />

      {/* chaîne principale — le mont Ida au centre */}
      <path
        d={`M0,${HORIZON} L80,170 L190,201 L320,144 L420,193 L540,104 L660,191 L780,152 L900,197 L1010,164 L1120,201 L1200,180 L1200,${HORIZON} Z`}
        fill="#7e9280"
      />
      {/* neiges de l'Ida, épousant la pente */}
      <path d="M506,140 L540,104 L574,140 L561,132 L551,141 L540,130 L529,141 L519,132 Z" fill="#eef1ea" />
      <path d="M296,155 L320,144 L344,155 L334,151 L324,157 L312,150 Z" fill="#e6eae2" opacity={0.85} />
      {/* ombres portées des versants */}
      <path d={`M540,104 L660,191 L620,${HORIZON} L540,${HORIZON} Z`} fill="#6d8070" opacity={0.45} />
      <path d={`M320,144 L420,193 L390,${HORIZON} L320,${HORIZON} Z`} fill="#6d8070" opacity={0.35} />

      {/* collines proches, fondues dans la plaine */}
      <path
        d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208 L1200,${HORIZON} Z`}
        fill="#8b9470"
      />

      {/* plaine */}
      <rect x={0} y={HORIZON - 6} width={MAP.w} height={MAP.h - HORIZON + 6} fill="url(#plaine)" />
      <ellipse cx={350} cy={390} rx={270} ry={115} fill="#c7be86" opacity={0.42} />
      <ellipse cx={820} cy={560} rx={310} ry={135} fill="#b1a973" opacity={0.5} />
      <ellipse cx={600} cy={300} rx={340} ry={80} fill="#c2b980" opacity={0.3} />

      {/* mer Égée (angle sud-ouest) : plage puis eau */}
      <path d="M0,584 C120,594 200,642 244,720 C264,760 272,800 272,800 L0,800 Z" fill="#dbc794" />
      <path d="M0,596 C112,606 188,650 228,724 C247,762 254,800 254,800 L0,800 Z" fill="url(#mer)" />
      <path
        d="M6,606 C104,616 172,656 210,724"
        stroke="#a9dbe0"
        strokeWidth={5}
        fill="none"
        opacity={0.4}
        strokeLinecap="round"
      />
      <path d="M20,680 q20,-8 40,0 M46,724 q22,-8 44,0 M22,756 q26,-9 52,0 M88,660 q18,-7 36,0" stroke="#c8e6ea" strokeWidth={2.4} fill="none" opacity={0.75}>
        <animate attributeName="opacity" values="0.75;0.3;0.75" dur="4.5s" repeatCount="indefinite" />
      </path>
      {/* voile au large */}
      <g transform="translate(70,656)" opacity={0.9}>
        <path d="M-7,0 Q0,3 8,0 L5,-2 L-5,-2 Z" fill="#5d4a33" />
        <path d="M0,-2 L0,-12 L7,-3 Z" fill="#efe9db" />
      </g>

      {/* mouettes au-dessus de la baie */}
      {[
        { p: 'M120,600 a80,30 0 1 0 0.1,0', dur: '21s', s: 1 },
        { p: 'M80,680 a55,22 0 1 0 0.1,0', dur: '15s', s: 0.8 },
      ].map((m, i) => (
        <g key={i} opacity={0.85}>
          <animateMotion dur={m.dur} repeatCount="indefinite" path={m.p} />
          <g transform={`scale(${m.s})`} stroke="#f0ede2" strokeWidth={1.5} fill="none" strokeLinecap="round">
            <path d="M-4,0 Q-2,-2.4 0,0 Q2,-2.4 4,0">
              <animate attributeName="d" values="M-4,0 Q-2,-2.4 0,0 Q2,-2.4 4,0;M-4,-1 Q-2,0.6 0,-1 Q2,0.6 4,-1;M-4,0 Q-2,-2.4 0,0 Q2,-2.4 4,0" dur="0.7s" repeatCount="indefinite" />
            </path>
          </g>
        </g>
      ))}

      {/* routes : halo doux puis bande */}
      <path
        d={`M${MAP.w},485 C 1080,470 1000,455 ${MAP.porte.x + 8},${MAP.porte.y + 6}`}
        stroke="#d6c093"
        strokeWidth={27}
        fill="none"
        strokeLinecap="round"
        opacity={0.5}
      />
      <path
        d={`M${MAP.w},485 C 1080,470 1000,455 ${MAP.porte.x + 8},${MAP.porte.y + 6}`}
        stroke="#c9b085"
        strokeWidth={15}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${MAP.porte.x - 40},520 C 500,640 320,690 196,732`}
        stroke="#d6c093"
        strokeWidth={17}
        fill="none"
        strokeLinecap="round"
        opacity={0.45}
      />
      <path
        d={`M${MAP.porte.x - 40},520 C 500,640 320,690 196,732`}
        stroke="#c4ab80"
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
        opacity={0.85}
      />
      <path d="M340,330 C 260,300 210,282 172,264" stroke="#c4ab80" strokeWidth={8} fill="none" opacity={0.6} strokeLinecap="round" />

      {/* placette et sentiers intérieurs */}
      <ellipse cx={585} cy={452} rx={95} ry={38} fill="#c2b380" opacity={0.45} />
      <path d="M890,447 C 780,450 690,452 620,450" stroke="#c4ab80" strokeWidth={10} fill="none" opacity={0.8} strokeLinecap="round" />
      <path d="M560,435 C 510,400 465,365 440,345" stroke="#c4ab80" strokeWidth={7} fill="none" opacity={0.65} strokeLinecap="round" />
      <path d="M545,460 C 500,485 470,505 450,518" stroke="#c4ab80" strokeWidth={7} fill="none" opacity={0.65} strokeLinecap="round" />
      <path d="M620,462 C 660,485 685,500 700,515" stroke="#c4ab80" strokeWidth={7} fill="none" opacity={0.65} strokeLinecap="round" />
      <path d="M610,430 C 645,405 670,380 688,362" stroke="#c4ab80" strokeWidth={6} fill="none" opacity={0.55} strokeLinecap="round" />

      {/* rochers près de la carrière */}
      <g fill="#8f8a7c" stroke="#6e675c" strokeWidth={0.8}>
        <ellipse cx={92} cy={252} rx={24} ry={12} />
        <ellipse cx={130} cy={230} rx={14} ry={8} />
        <ellipse cx={236} cy={224} rx={17} ry={9} />
      </g>

      {/* touffes d'herbe et fleurs */}
      {TOUFFES.map(([x, y], i) => (
        <g key={i} stroke="#8f8a55" strokeWidth={1.6} opacity={0.75} strokeLinecap="round">
          <line x1={x} y1={y} x2={x - 3} y2={y - 6} />
          <line x1={x} y1={y} x2={x} y2={y - 7} />
          <line x1={x} y1={y} x2={x + 3} y2={y - 6} />
        </g>
      ))}
      {FLEURS.map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={1.8} fill={c} />
          <circle cx={x + 5} cy={y + 3} r={1.3} fill={c} opacity={0.8} />
        </g>
      ))}

      {ARBRES.map((a, i) => (
        <Arbre key={i} {...a} />
      ))}

      {/* moutons au pré, au sud des champs */}
      <g>
        {[
          [452, 700, 1],
          [472, 712, 0.85],
          [492, 702, 0.9],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
            <ellipse cx={1} cy={1} rx={5.5} ry={1.6} fill="#241a0c" opacity={0.12} />
            <ellipse cx={0} cy={-3.6} rx={5} ry={3.2} fill="#ece7d8" stroke="#4a3a28" strokeWidth={0.7} />
            <circle cx={5} cy={-4.6} r={1.9} fill="#8c8270" />
            <line x1={-3} y1={-1} x2={-3} y2={0.8} stroke="#4a3a28" strokeWidth={0.9} />
            <line x1={2.6} y1={-1} x2={2.6} y2={0.8} stroke="#4a3a28" strokeWidth={0.9} />
          </g>
        ))}
      </g>

      {/* char à bœufs sur la route de l'est (à l'abri pendant les assauts) */}
      <g opacity={paisible ? 0.95 : 0}>
        <animateMotion dur="30s" repeatCount="indefinite" rotate="auto" path={`M${MAP.porte.x + 14},${MAP.porte.y + 8} C 1000,455 1080,470 ${MAP.w - 6},484`} />
        <ellipse cx={0} cy={2} rx={13} ry={2.4} fill="#241a0c" opacity={0.14} />
        {/* bœuf */}
        <ellipse cx={9} cy={-4} rx={6} ry={3.2} fill="#7d6248" stroke="#4a3a28" strokeWidth={0.8} />
        <circle cx={14.6} cy={-5.6} r={2.1} fill="#6b533c" stroke="#4a3a28" strokeWidth={0.7} />
        <line x1={6} y1={-1.4} x2={6} y2={1} stroke="#4a3a28" strokeWidth={1.1} />
        <line x1={12} y1={-1.4} x2={12} y2={1} stroke="#4a3a28" strokeWidth={1.1} />
        {/* attelage + charrette */}
        <line x1={3} y1={-4} x2={-3} y2={-4.6} stroke="#5d4a33" strokeWidth={1.2} />
        <path d="M-14,-3 L-3,-3 L-4.4,-8.6 L-12.6,-8.6 Z" fill="#93714a" stroke="#4a3a28" strokeWidth={0.9} />
        <circle cx={-8.5} cy={-2} r={3} fill="#8a6a40" stroke="#4a3a28" strokeWidth={0.9} />
        <circle cx={-8.5} cy={-2} r={0.9} fill="#4a3a28" />
        <path d="M-11,-8.6 C-11.4,-11 -9.8,-12.4 -8,-12.4 C-6.2,-12.4 -5,-11 -5.4,-8.6 Z" fill="#cbb289" stroke="#4a3a28" strokeWidth={0.7} />
      </g>

      {/* grain léger sur la plaine */}
      <rect x={0} y={HORIZON - 6} width={MAP.w} height={MAP.h - HORIZON + 6} filter="url(#grain)" opacity={0.9} />
    </g>
  )
}

/** vignettage doux, posé au-dessus de la scène */
export function Vignette() {
  return <rect x={0} y={0} width={MAP.w} height={MAP.h} fill="url(#vignette)" pointerEvents="none" />
}

/** voile de nuit / crépuscule, posé au-dessus de toute la scène */
export function VoileJourNuit({ phase }: { phase: number }) {
  let opacity = 0
  let couleur = '#0c1830'
  if (phase >= 0.68 || phase < 0.03) {
    opacity = 0.38
  } else if (phase >= 0.55 && phase < 0.68) {
    opacity = ((phase - 0.55) / 0.13) * 0.3
    couleur = '#5a2c18'
  } else if (phase >= 0.03 && phase < 0.08) {
    opacity = 0.25 * (1 - (phase - 0.03) / 0.05)
  }
  if (opacity <= 0.01) return null
  return <rect x={0} y={0} width={MAP.w} height={MAP.h} fill={couleur} opacity={opacity} pointerEvents="none" />
}

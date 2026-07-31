import { MAP } from '../../game/data'
import { PAL, alea } from './art'

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

/*
 * ── Arbres volumiques ──────────────────────────────────────────────────────
 * Lumière NW : masse sombre (ombre propre) → demi-teinte → éclat en haut-
 * gauche. Ombre portée au sol décalée vers le SE. Zéro contour noir.
 */
function Arbre({ x, y, t, s = 1 }: { x: number; y: number; t: 'olivier' | 'cypres'; s?: number }) {
  if (t === 'cypres') {
    return (
      <g transform={`translate(${x},${y}) scale(${s})`}>
        {/* ombre portée SE, allongée (arbre haut) */}
        <ellipse cx={7} cy={0.8} rx={10} ry={2.3} fill={PAL.ombrePortee} opacity={0.16} />
        {/* pied du tronc */}
        <path d="M-1.3,-3.5 L1.3,-3.5 L1,1 L-1,1 Z" fill="#5f462d" />
        <path d="M0.2,-3.5 L1.3,-3.5 L1,1 L0.4,1 Z" fill="#463322" />
        {/* flamme : silhouette en ombre propre, croissant demi-teinte, éclat NW */}
        <path d="M0,-38 C6,-24 7,-12 0,-4 C-7,-12 -6,-24 0,-38Z" fill="#2e4a34" />
        <path d="M0,-37.4 C-5.8,-23.5 -5.4,-12.5 -0.4,-5 C-3,-12.5 -2.6,-24 0,-37.4Z" fill="#4a6b42" />
        <path d="M-0.6,-35.5 C-4.6,-24.5 -4.4,-14.5 -1.4,-8 C-2.8,-15 -2.6,-25 -0.6,-35.5Z" fill="#6b8a53" />
        {/* creux d'ombre côté SE */}
        <path d="M1.4,-31 C3.6,-23 3.9,-15 1.6,-8.5 C2.6,-15.5 2.5,-23 1.4,-31Z" fill="#233c29" opacity={0.8} />
      </g>
    )
  }
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* ombre portée SE */}
      <ellipse cx={7.5} cy={1.4} rx={11.5} ry={2.7} fill={PAL.ombrePortee} opacity={0.16} />
      {/* tronc noueux : flanc NW éclairé, flanc SE sombre */}
      <path d="M-2.2,0.6 C-3.4,-4.5 -4.2,-9 -2.4,-13.5 L0.4,-13 C-0.8,-8.5 -0.2,-4 1.4,0.6 Z" fill="#7a5c38" />
      <path d="M0.4,-13 C-0.6,-8.5 0,-4 1.4,0.6 L-0.2,0.6 C-1.2,-4 -1.6,-8.5 -0.8,-12.8 Z" fill="#553f28" />
      <path d="M-2.6,-2 C-3.2,-6.5 -3.4,-10 -2.2,-13" stroke="#9a7a4e" strokeWidth={0.8} fill="none" opacity={0.85} />
      {/* couronne : 3 valeurs + éclat, argenté d'olivier */}
      <ellipse cx={1} cy={-15.5} rx={12.5} ry={7.6} fill="#5c6e4a" />
      <ellipse cx={5.5} cy={-13} rx={6.5} ry={4.2} fill="#4e5f40" />
      <ellipse cx={-2} cy={-17} rx={10.5} ry={6.4} fill="#74875a" />
      <ellipse cx={-4.5} cy={-19.5} rx={7.2} ry={4.4} fill="#8a9c6c" />
      <ellipse cx={-6.8} cy={-21.2} rx={3.9} ry={2.3} fill="#a3b184" />
      <ellipse cx={0.5} cy={-20.8} rx={3.2} ry={1.9} fill="#93a476" opacity={0.9} />
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

/* ── éléments dispersés, générés UNE fois au chargement (déterministe) ────── */

/** vrai si le point tombe dans la mer ou dans l'enceinte du village */
function horsPrairie(x: number, y: number): boolean {
  const surMer = x < 315 && y > 545
  const dansMur = ((x - 575) / 348) ** 2 + ((y - 445) / 210) ** 2 < 1
  return surMer || dansMur
}

const TOUFFES_TOUT: [number, number][] = [...TOUFFES]
{
  const rnd = alea(23)
  for (let i = 0; i < 26; i++) {
    const x = 70 + rnd() * 1080
    const y = 240 + rnd() * 520
    if (!horsPrairie(x, y)) TOUFFES_TOUT.push([x, y])
  }
}
/* trois valeurs par touffe : brins d'ombre, demi-teinte, brin éclairé NW */
const D_TOUFFE_OMBRE = TOUFFES_TOUT.map(([x, y]) => `M${x + 1.4},${y} l2.6,-5 M${x + 0.4},${y} l0.6,-6.4`).join(' ')
const D_TOUFFE_DEMI = TOUFFES_TOUT.map(([x, y]) => `M${x},${y} l-1.6,-6 M${x - 0.8},${y} l-3.4,-4.6`).join(' ')
const D_TOUFFE_CLAIR = TOUFFES_TOUT.map(([x, y]) => `M${x - 0.3},${y - 0.5} l-2.2,-5.8`).join(' ')

const CAILLOUX: { x: number; y: number; r: number; t: number }[] = []
{
  const rnd = alea(31)
  for (let i = 0; i < 60 && CAILLOUX.length < 15; i++) {
    const x = 60 + rnd() * 1080
    const y = 240 + rnd() * 530
    const r = 1.5 + rnd() * 2
    if (!horsPrairie(x, y)) CAILLOUX.push({ x, y, r, t: rnd() })
  }
}

const FLEURS_GROUPES = FLEURS.map(([x, y, c], i) => {
  const rnd = alea(i * 13 + 5)
  const pts = Array.from({ length: 4 }, () => ({
    dx: (rnd() - 0.5) * 12,
    dy: (rnd() - 0.5) * 7,
    r: 1 + rnd() * 0.8,
  }))
  return { x, y, c, pts }
})

/* ── montagnes : sommets (S) et cols (C) de la chaîne principale ──────────── */
// silhouette conservée : M0,212 L80,170 L190,201 L320,144 L420,193 L540,104
//                        L660,191 L780,152 L900,197 L1010,164 L1120,201 L1200,180
const D_CHAINE = `M0,${HORIZON} L80,170 L190,201 L320,144 L420,193 L540,104 L660,191 L780,152 L900,197 L1010,164 L1120,201 L1200,180 L1200,${HORIZON} Z`
/** versants SE à l'ombre : du sommet vers le col droit puis la base */
const FACETTES_OMBRE = [
  `M80,170 L190,201 L164,${HORIZON} L80,${HORIZON} Z`,
  `M320,144 L420,193 L388,${HORIZON} L320,${HORIZON} Z`,
  `M540,104 L660,191 L620,${HORIZON} L540,${HORIZON} Z`,
  `M780,152 L900,197 L866,${HORIZON} L780,${HORIZON} Z`,
  `M1010,164 L1120,201 L1090,${HORIZON} L1010,${HORIZON} Z`,
]
/** arêtes NW frappées par le soleil — un seul path multi-segments */
const D_ARETES_LIT = `M0,${HORIZON} L80,170 M190,201 L320,144 M420,193 L540,104 M660,191 L780,152 M900,197 L1010,164 M1120,201 L1200,180`
/** couloirs rocheux, quelques traits par versant */
const D_COULOIRS =
  'M80,170 L96,196 M320,144 L342,178 M320,144 L306,180 M540,104 L568,158 M540,104 L520,166 M780,152 L802,186 M1010,164 L1030,192'

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
        <linearGradient id="ter-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={crepuscule ? '#b96f3f' : aube ? '#b28d72' : '#7fb4d3'} />
          <stop offset="58%" stopColor={crepuscule ? '#dda368' : aube ? '#d8bc96' : '#abd1da'} />
          <stop offset="100%" stopColor={crepuscule ? '#f0d09a' : aube ? '#ecdcba' : '#ddeee7'} />
        </linearGradient>
        {/* voile de vapeur au ras de l'horizon, derrière les chaînes */}
        <linearGradient id="ter-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9efe6" stopOpacity="0" />
          <stop offset="100%" stopColor="#e9efe6" stopOpacity="0.5" />
        </linearGradient>
        {/* chaîne lointaine : froide et pâle (perspective atmosphérique) */}
        <linearGradient id="ter-loin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9cafb7" />
          <stop offset="100%" stopColor="#bcc9c7" />
        </linearGradient>
        <linearGradient id="ter-mont" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#75897a" />
          <stop offset="100%" stopColor="#93a385" />
        </linearGradient>
        {/* brume au pied des montagnes */}
        <linearGradient id="ter-brume" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7edde" stopOpacity="0" />
          <stop offset="70%" stopColor="#e7edde" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#e7edde" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="ter-colline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7f8d66" />
          <stop offset="100%" stopColor="#aca671" />
        </linearGradient>
        <linearGradient id="ter-plaine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c1b77e" />
          <stop offset="40%" stopColor="#aaa26e" />
          <stop offset="100%" stopColor="#948c5c" />
        </linearGradient>
        {/* assombrissement doux du premier plan (profondeur) */}
        <linearGradient id="ter-prof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c7550" stopOpacity="0" />
          <stop offset="100%" stopColor="#6e6844" stopOpacity="0.22" />
        </linearGradient>
        {/* nappes de prairie aux bords fondus (dégradés radiaux → transparent) */}
        <radialGradient id="ter-nap-olive">
          <stop offset="0%" stopColor="#8c9852" stopOpacity="0.68" />
          <stop offset="65%" stopColor="#8c9852" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#8c9852" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ter-nap-ocre">
          <stop offset="0%" stopColor="#cfa458" stopOpacity="0.6" />
          <stop offset="65%" stopColor="#cfa458" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#cfa458" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ter-nap-paille">
          <stop offset="0%" stopColor="#e9df9e" stopOpacity="0.72" />
          <stop offset="65%" stopColor="#e9df9e" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#e9df9e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ter-nap-vert">
          <stop offset="0%" stopColor="#697a40" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#697a40" stopOpacity="0" />
        </radialGradient>
        {/* mer : profonde au large (coin SW) → turquoise contre la côte */}
        <radialGradient id="ter-mer" cx="0.02" cy="0.92" r="1.25">
          <stop offset="0%" stopColor="#1a465e" />
          <stop offset="45%" stopColor="#2b6884" />
          <stop offset="80%" stopColor="#4899ae" />
          <stop offset="100%" stopColor="#66b7bd" />
        </radialGradient>
        <radialGradient id="ter-halo">
          <stop offset="0%" stopColor={jour ? '#f8e3a0' : '#e8e4d4'} stopOpacity={0.6} />
          <stop offset="100%" stopColor="#f8e3a0" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="ter-vignette" cx="50%" cy="44%" r="72%">
          <stop offset="0%" stopColor="#000" stopOpacity={0} />
          <stop offset="74%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#081020" stopOpacity={0.34} />
        </radialGradient>
        <filter id="ter-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
        </filter>
        {/* clips des chaînes : le modelé flouté reste DANS la silhouette */}
        <clipPath id="ter-clip-chaine">
          <path d={D_CHAINE} />
        </clipPath>
        <clipPath id="ter-clip-loin">
          <path d={`M0,${HORIZON} L110,152 L205,184 L330,130 L455,178 L575,140 L690,182 L810,144 L930,182 L1050,150 L1200,188 L1200,${HORIZON} Z`} />
        </clipPath>
      </defs>

      {/* ── ciel, halo et astre ── */}
      <rect x={0} y={0} width={MAP.w} height={HORIZON} fill="url(#ter-ciel)" />
      <circle cx={ax} cy={ay} r={64} fill="url(#ter-halo)" />
      {jour && <circle cx={ax} cy={ay} r={30} fill="#f8e3a0" opacity={0.35} />}
      <circle cx={ax} cy={ay} r={jour ? 21 : 15} fill={jour ? '#f6d67c' : '#eae6d6'} />
      {jour && <circle cx={ax - 3} cy={ay - 3} r={13} fill="#fbeaae" opacity={0.7} />}
      {!jour && <circle cx={ax - 6} cy={ay - 3} r={12.5} fill={crepuscule ? '#cd7f4e' : '#20303f'} opacity={0.55} />}
      {/* vapeur au ras de l'horizon */}
      <rect x={0} y={132} width={MAP.w} height={HORIZON - 132} fill="url(#ter-haze)" />

      {/* ── chaîne lointaine, voilée par la distance ── */}
      <path
        d={`M0,${HORIZON} L110,152 L205,184 L330,130 L455,178 L575,140 L690,182 L810,144 L930,182 L1050,150 L1200,188 L1200,${HORIZON} Z`}
        fill="url(#ter-loin)"
      />
      {/* modelé fondu, clippé dans la silhouette */}
      <g clipPath="url(#ter-clip-loin)">
        <g filter="url(#a-flou2)">
          <path d="M110,152 L205,184 L188,214 L110,214 Z M330,130 L455,178 L432,214 L330,214 Z M575,140 L690,182 L668,214 L575,214 Z M810,144 L930,182 L908,214 L810,214 Z M1050,150 L1200,188 L1200,214 L1050,214 Z" fill="#8ba0a9" opacity={0.6} />
          <path d="M40,196 L110,152 L110,214 L40,214 Z M255,164 L330,130 L330,214 L255,214 Z M505,164 L575,140 L575,214 L505,214 Z M740,168 L810,144 L810,214 L740,214 Z M985,172 L1050,150 L1050,214 L985,214 Z" fill="#c3d0cc" opacity={0.5} />
        </g>
      </g>

      {/* ── chaîne principale — le mont Ida au centre ── */}
      <path d={D_CHAINE} fill="url(#ter-mont)" />
      {/* modelé des versants : fondu au flou, clippé dans la silhouette */}
      <g clipPath="url(#ter-clip-chaine)">
        <g filter="url(#a-flou2)">
          {/* versants NW éclairés (du col gauche jusqu'à l'aplomb du sommet) */}
          <path d={`M0,${HORIZON + 4} L80,170 L80,${HORIZON + 4} Z`} fill="#9cae8c" opacity={0.6} />
          <path d={`M190,201 L320,144 L320,${HORIZON + 4} L212,${HORIZON + 4} Z`} fill="#9cae8c" opacity={0.6} />
          <path d={`M420,193 L540,104 L540,${HORIZON + 4} L444,${HORIZON + 4} Z`} fill="#a2b48f" opacity={0.65} />
          <path d={`M660,191 L780,152 L780,${HORIZON + 4} L678,${HORIZON + 4} Z`} fill="#9cae8c" opacity={0.55} />
          <path d={`M900,197 L1010,164 L1010,${HORIZON + 4} L916,${HORIZON + 4} Z`} fill="#9cae8c" opacity={0.55} />
          {/* versants SE dans l'ombre */}
          {FACETTES_OMBRE.map((d, i) => (
            <path key={i} d={d} fill="#4e6255" opacity={i === 2 ? 0.66 : 0.52} />
          ))}
          {/* couloirs et contreforts */}
          <path d={D_COULOIRS} stroke="#4e6255" strokeWidth={2.2} fill="none" opacity={0.5} />
          <path d="M320,144 L332,196 M540,104 L552,186 M780,152 L792,200 M1010,164 L1000,204" stroke="#8fa385" strokeWidth={2} fill="none" opacity={0.5} />
          {/* éboulis au creux des cols */}
          <path d="M168,203 q22,5 44,2 M398,196 q22,5 44,1 M638,194 q22,5 44,1 M878,199 q22,5 44,1" stroke="#5f7365" strokeWidth={3} fill="none" opacity={0.4} />
        </g>
        {/* arêtes NW frappées par la lumière, à peine adoucies */}
        <path d={D_ARETES_LIT} stroke="#b4c4a0" strokeWidth={1.7} fill="none" opacity={0.55} filter="url(#a-flou1)" />
        {/* neiges de l'Ida : face NW brillante, face SE bleutée, rochers qui percent */}
        <g filter="url(#a-flou1)">
          <path d="M506,140 L540,104 L574,140 L561,132 L551,141 L540,130 L529,141 L519,132 Z" fill="#e9efe7" />
          <path d="M540,104 L574,140 L561,132 L551,141 L540,130 Z" fill="#bccbc8" />
          <path d="M540,104 L546,112 L540,118 L534,111 Z" fill="#f5f8f2" />
          <path d="M537,114 L530,134 M545,115 L552,133 M540,120 L539,138" stroke="#a9bab6" strokeWidth={0.9} fill="none" opacity={0.8} />
          <path d="M524,131 l4,-2 M556,129 l-5,-2" stroke="#75897a" strokeWidth={1.1} fill="none" opacity={0.7} />
          {/* petit névé du deuxième sommet */}
          <path d="M296,155 L320,144 L344,155 L334,151 L324,157 L312,150 Z" fill="#e2e8de" opacity={0.9} />
          <path d="M320,144 L344,155 L334,151 L324,157 Z" fill="#c2cfca" opacity={0.8} />
        </g>
      </g>

      {/* brume accrochée au pied des versants */}
      <rect x={0} y={186} width={MAP.w} height={HORIZON - 186 + 2} fill="url(#ter-brume)" />

      {/* ── collines proches : deux bandes fondues, crêtes éclairées ── */}
      <path
        d={`M0,208 Q90,193 190,205 Q300,189 420,206 Q560,191 690,206 Q820,193 950,206 Q1080,194 1200,206 L1200,${HORIZON} L0,${HORIZON} Z`}
        fill="#7d8a70"
        opacity={0.9}
      />
      <path
        d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208 L1200,${HORIZON} Z`}
        fill="url(#ter-colline)"
      />
      <path
        d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208`}
        stroke="#b6bb82"
        strokeWidth={1.6}
        fill="none"
        opacity={0.6}
      />
      {/* ombre douce au revers sud des croupes */}
      <g transform="translate(0,5)">
        <path
          d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208`}
          stroke="#6b7852"
          strokeWidth={4}
          fill="none"
          opacity={0.28}
          filter="url(#a-flou2)"
        />
      </g>
      {/* maquis en points sur les pentes */}
      {[
        [138, 203], [312, 202], [548, 205], [772, 202], [962, 200], [1108, 202],
      ].map(([bx, by], i) => (
        <g key={i}>
          <ellipse cx={bx} cy={by} rx={3.4} ry={1.8} fill="#68774f" opacity={0.55} />
          <ellipse cx={bx - 1.2} cy={by - 0.8} rx={1.8} ry={1} fill="#839360" opacity={0.6} />
        </g>
      ))}

      {/* ── plaine : socle en dégradé + nappes multi-tons aux bords doux ── */}
      <rect x={0} y={HORIZON - 6} width={MAP.w} height={MAP.h - HORIZON + 6} fill="url(#ter-plaine)" />
      <rect x={0} y={430} width={MAP.w} height={MAP.h - 430} fill="url(#ter-prof)" />
      {(
        [
          [350, 390, 280, 115, -6, 'olive', 0.9],
          [820, 560, 320, 140, 4, 'ocre', 0.85],
          [600, 300, 340, 85, 0, 'paille', 0.8],
          [160, 300, 160, 62, -10, 'ocre', 0.7],
          [1060, 350, 210, 95, 7, 'olive', 0.75],
          [460, 630, 250, 100, -4, 'paille', 0.65],
          [960, 710, 270, 95, 5, 'olive', 0.6],
          [120, 480, 140, 70, -8, 'olive', 0.6],
          [610, 745, 290, 80, 0, 'ocre', 0.55],
          [1140, 550, 170, 85, 6, 'paille', 0.6],
          [300, 545, 175, 70, -5, 'ocre', 0.5],
          [880, 295, 180, 58, 3, 'vert', 0.55],
          [180, 655, 150, 58, 0, 'vert', 0.4],
          [1090, 660, 150, 62, -6, 'vert', 0.4],
          // petites taches de structure
          [750, 645, 110, 44, 5, 'paille', 0.4],
          [240, 420, 85, 36, 4, 'paille', 0.35],
          [1000, 470, 90, 40, -6, 'ocre', 0.35],
          [420, 295, 70, 28, 0, 'vert', 0.3],
          [660, 560, 80, 32, -5, 'vert', 0.28],
          [540, 690, 90, 36, 6, 'ocre', 0.32],
        ] as [number, number, number, number, number, string, number][]
      ).map(([cx, cy, rx, ry, rot, g, o], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill={`url(#ter-nap-${g})`} opacity={o} />
      ))}

      {/* ── placette et sentiers intérieurs (terre battue, discrets) ── */}
      <ellipse cx={585} cy={452} rx={88} ry={34} fill="#c2b380" opacity={0.22} />
      <ellipse cx={592} cy={450} rx={50} ry={19} fill="#cdbd8a" opacity={0.28} />
      <path d="M890,447 C 780,450 690,452 620,450" stroke="#c8af83" strokeWidth={9} fill="none" opacity={0.55} strokeLinecap="round" />
      <path d="M888,444.5 C 782,447 696,449 624,447.5" stroke="#d6c297" strokeWidth={1.8} fill="none" opacity={0.35} strokeDasharray="18 13 26 9" />
      <path d="M560,435 C 510,400 465,365 440,345" stroke="#c8af83" strokeWidth={6} fill="none" opacity={0.32} strokeLinecap="round" />
      <path d="M545,460 C 500,485 470,505 450,518" stroke="#c8af83" strokeWidth={6} fill="none" opacity={0.32} strokeLinecap="round" />
      <path d="M620,462 C 660,485 685,500 700,515" stroke="#c8af83" strokeWidth={6} fill="none" opacity={0.32} strokeLinecap="round" />
      <path d="M610,430 C 645,405 670,380 688,362" stroke="#c8af83" strokeWidth={5} fill="none" opacity={0.28} strokeLinecap="round" />

      {/* ── routes : zone d'usure large, bande, bords irréguliers, ornières ── */}
      {/* route de l'est (celle du char) */}
      <path d={`M${MAP.w},485 C 1080,470 1000,455 ${MAP.porte.x + 8},${MAP.porte.y + 6}`} stroke="#bfab7e" strokeWidth={32} fill="none" strokeLinecap="round" opacity={0.35} />
      <path d={`M${MAP.w},485 C 1080,470 1000,455 ${MAP.porte.x + 8},${MAP.porte.y + 6}`} stroke="#cbb488" strokeWidth={15} fill="none" strokeLinecap="round" />
      <path d="M1200,480 C 1084,465 1006,450.5 916,446.5" stroke="#dac69a" strokeWidth={3} fill="none" opacity={0.6} strokeDasharray="18 13 26 10" />
      <path d="M1198,490.5 C 1078,475.5 1000,460.5 914,456.5" stroke="#b1976c" strokeWidth={3} fill="none" opacity={0.5} strokeDasharray="22 15 13 18" />
      <path d="M1199,483 C 1081,468 1002,453.4 915,449.4" stroke="#a68b60" strokeWidth={1.4} fill="none" opacity={0.38} strokeDasharray="26 14" />
      <path d="M1199,487.6 C 1080,472.6 1000,457.6 914,453.4" stroke="#a68b60" strokeWidth={1.4} fill="none" opacity={0.38} strokeDasharray="21 17" />
      {/* élargissement devant la porte */}
      <ellipse cx={MAP.porte.x - 2} cy={MAP.porte.y + 6} rx={34} ry={13} fill="#bfab7e" opacity={0.4} />
      <ellipse cx={MAP.porte.x - 1} cy={MAP.porte.y + 5} rx={24} ry={9} fill="#cbb488" opacity={0.8} />

      {/* route du sud, vers la grève */}
      <path d={`M${MAP.porte.x - 40},520 C 500,640 320,690 196,732`} stroke="#bfab7e" strokeWidth={20} fill="none" strokeLinecap="round" opacity={0.3} />
      <path d={`M${MAP.porte.x - 40},520 C 500,640 320,690 196,732`} stroke="#c4ab80" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.9} />
      <path d="M867,516.5 C 503,636 322,686 199,728" stroke="#d4c093" strokeWidth={2.4} fill="none" opacity={0.5} strokeDasharray="20 14 12 18" />
      <path d="M862,524 C 497,644 318,694 194,736" stroke="#ab9166" strokeWidth={2.4} fill="none" opacity={0.45} strokeDasharray="16 12 24 10" />
      <path d="M866,518.4 C 501,638 321,688 197,730" stroke="#a68b60" strokeWidth={1.2} fill="none" opacity={0.32} strokeDasharray="24 15" />
      <path d="M863,521.8 C 498,642 319,692 195,734" stroke="#a68b60" strokeWidth={1.2} fill="none" opacity={0.32} strokeDasharray="19 18" />

      {/* sente de la carrière */}
      <path d="M340,330 C 260,300 210,282 172,264" stroke="#bfab7e" strokeWidth={14} fill="none" opacity={0.3} strokeLinecap="round" />
      <path d="M340,330 C 260,300 210,282 172,264" stroke="#c4ab80" strokeWidth={7} fill="none" opacity={0.65} strokeLinecap="round" />
      <path d="M338,326.5 C 262,297 214,279 176,261.5" stroke="#d4c093" strokeWidth={1.8} fill="none" opacity={0.45} strokeDasharray="12 10 18 8" />

      {/* ── mer Égée (angle sud-ouest) : grève, eau profonde, houle, écume ── */}
      <path d="M0,584 C120,594 200,642 244,720 C264,760 272,800 272,800 L0,800 Z" fill="#dbc794" />
      {/* sable humide le long de l'eau, un seul liseré mouillé */}
      <path d="M0,594 C114,604 190,648 231,722 C249,760 257,800 257,800" stroke="#c3a97b" strokeWidth={8} fill="none" opacity={0.65} filter="url(#a-flou1)" />
      <path d="M0,590.5 C115,600.5 194,645 236,719 C253,758 261,800 261,800" stroke="#eee1b4" strokeWidth={1.8} fill="none" opacity={0.55} />
      {/* eau : radiale profonde → turquoise */}
      <path d="M0,596 C112,606 188,650 228,724 C247,762 254,800 254,800 L0,800 Z" fill="url(#ter-mer)" />
      {/* bandes de houle, dérive lente vers la côte */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 5 4; 0 0" dur="11s" repeatCount="indefinite" />
        <path d="M0,636 C82,646 142,684 176,748" stroke="#4c94a9" strokeWidth={4.5} fill="none" opacity={0.4} filter="url(#a-flou1)">
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="7s" repeatCount="indefinite" />
        </path>
        <path d="M0,682 C58,692 104,724 128,780" stroke="#3f89a0" strokeWidth={4} fill="none" opacity={0.35} filter="url(#a-flou1)">
          <animate attributeName="opacity" values="0.35;0.12;0.35" dur="9s" repeatCount="indefinite" />
        </path>
        <path d="M0,728 C36,736 66,760 80,796" stroke="#357a93" strokeWidth={3.5} fill="none" opacity={0.3} filter="url(#a-flou1)">
          <animate attributeName="opacity" values="0.12;0.3;0.12" dur="8s" repeatCount="indefinite" />
        </path>
      </g>
      {/* écume sur la ligne de côte : liseré brisé, adouci */}
      <path d="M0,598 C110,608 185,651 225,725 C243,762 251,800 251,800" stroke="#f2f8f2" strokeWidth={2.4} fill="none" strokeDasharray="21 7 34 5" opacity={0.8} filter="url(#a-flou1)">
        <animate attributeName="opacity" values="0.8;0.45;0.8" dur="5.5s" repeatCount="indefinite" />
      </path>
      <path d="M0,607 C104,617 176,659 214,729 C231,764 238,800 238,800" stroke="#cfe9e4" strokeWidth={1.5} fill="none" strokeDasharray="14 16 24 12" opacity={0.4} filter="url(#a-flou1)">
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="7.5s" repeatCount="indefinite" />
      </path>
      {/* clapot au large */}
      <path d="M20,680 q20,-8 40,0 M46,724 q22,-8 44,0 M22,756 q26,-9 52,0 M88,660 q18,-7 36,0" stroke="#c8e6ea" strokeWidth={2} fill="none" opacity={0.6} strokeLinecap="round">
        <animate attributeName="opacity" values="0.6;0.25;0.6" dur="4.5s" repeatCount="indefinite" />
      </path>
      {/* rochers côtiers, face NW claire, écume au pied */}
      {(
        [
          [238, 706, 1],
          [98, 599, 0.8],
          [256, 766, 0.9],
        ] as [number, number, number][]
      ).map(([rx, ry, s], i) => (
        <g key={i} transform={`translate(${rx},${ry}) scale(${s})`}>
          <ellipse cx={1.5} cy={1} rx={7} ry={2.6} fill="#183a4a" opacity={0.3} />
          <path d="M-6,1 Q-5,-4.5 -1,-5.5 Q4,-6 6,-1.5 L6.5,1.2 Q0,3 -6,1 Z" fill="#6e6a5c" />
          <path d="M-6,1 Q-5,-4.5 -1,-5.5 Q1.6,-5.8 3,-4.4 Q-1,-4.6 -2.6,-1.8 Q-4.4,0.4 -6,1 Z" fill="#989180" />
          <path d="M-7.5,1.6 Q0,4 7.6,1.8" stroke="#eaf5ef" strokeWidth={1.4} fill="none" opacity={0.75} strokeDasharray="4 3" />
        </g>
      ))}
      {/* voile au large */}
      <g transform="translate(70,656)" opacity={0.92}>
        <ellipse cx={0} cy={0.8} rx={8.5} ry={1.3} fill="#12313f" opacity={0.4} />
        <path d="M-7,0 Q0,3 8,0 L5,-2 L-5,-2 Z" fill="#5d4a33" />
        <path d="M-5,-2 L5,-2 L4.4,-1.1 L-4.4,-1.1 Z" fill="#7d6547" />
        <path d="M0,-2 L0,-12 L7,-3 Z" fill="#efe9db" />
        <path d="M0,-2 L0,-12 L2.2,-9.4 L2.2,-2.6 Z" fill="#d8cfba" />
        <path d="M-14,1.4 q4,1.2 6,0.2" stroke="#cfe9e6" strokeWidth={1} fill="none" opacity={0.5} />
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

      {/* ── rochers près de la carrière : blocs facettés, éclairés au NW ── */}
      {(
        [
          [92, 252, 24, 12],
          [130, 230, 14, 8],
          [236, 224, 17, 9],
        ] as [number, number, number, number][]
      ).map(([rx, ry, w, h], i) => (
        <g key={i} transform={`translate(${rx},${ry})`}>
          <ellipse cx={w * 0.22} cy={h * 0.4} rx={w * 1.04} ry={h * 0.6} fill={PAL.ombrePortee} opacity={0.15} />
          <path d={`M${-w},${h * 0.2} Q${-w * 0.8},${-h} ${-w * 0.15},${-h} Q${w * 0.75},${-h * 0.95} ${w},${h * 0.05} Q${w * 0.3},${h * 0.75} ${-w},${h * 0.2} Z`} fill="#7d7869" />
          <path d={`M${-w},${h * 0.2} Q${-w * 0.8},${-h} ${-w * 0.15},${-h} Q${w * 0.3},${-h * 0.97} ${w * 0.5},${-h * 0.55} Q${-w * 0.2},${-h * 0.5} ${-w * 0.55},${h * 0.05} Z`} fill="#a19a87" />
          <path d={`M${w * 0.28},${-h * 0.6} Q${w * 0.5},${0} ${w * 0.3},${h * 0.5}`} stroke="#5f5a4c" strokeWidth={0.8} fill="none" opacity={0.55} />
        </g>
      ))}

      {/* ── cailloux épars de la plaine ── */}
      {CAILLOUX.map(({ x, y, r, t }, i) => (
        <g key={i}>
          <ellipse cx={x + r * 0.5} cy={y + r * 0.3} rx={r * 1.15} ry={r * 0.5} fill={PAL.ombrePortee} opacity={0.13} />
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.68} fill={t > 0.5 ? '#96907b' : '#8d8672'} />
          <ellipse cx={x - r * 0.3} cy={y - r * 0.25} rx={r * 0.55} ry={r * 0.34} fill="#b3ac95" opacity={0.85} />
        </g>
      ))}

      {/* ── touffes d'herbe à trois valeurs, fleurs par petits groupes ── */}
      <path d={D_TOUFFE_OMBRE} stroke="#6d7245" strokeWidth={1.5} fill="none" opacity={0.75} strokeLinecap="round" />
      <path d={D_TOUFFE_DEMI} stroke="#8f8a55" strokeWidth={1.5} fill="none" opacity={0.8} strokeLinecap="round" />
      <path d={D_TOUFFE_CLAIR} stroke="#b5b271" strokeWidth={1.3} fill="none" opacity={0.85} strokeLinecap="round" />
      {FLEURS_GROUPES.map(({ x, y, c, pts }, i) => (
        <g key={i}>
          {pts.map((p, j) => (
            <circle key={j} cx={x + p.dx} cy={y + p.dy} r={p.r} fill={c} opacity={j === 0 ? 1 : 0.8} />
          ))}
          <circle cx={x + 2} cy={y + 4} r={0.9} fill="#7f8a52" opacity={0.8} />
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
            <ellipse cx={2} cy={1} rx={5.6} ry={1.5} fill={PAL.ombrePortee} opacity={0.15} />
            <line x1={-3} y1={-1} x2={-3} y2={0.9} stroke="#5a4936" strokeWidth={0.9} />
            <line x1={2.6} y1={-1} x2={2.6} y2={0.9} stroke="#5a4936" strokeWidth={0.9} />
            <ellipse cx={0} cy={-3.6} rx={5} ry={3.1} fill="#e7e1d0" />
            <ellipse cx={0.9} cy={-2.4} rx={4.2} ry={1.8} fill="#c9c1aa" opacity={0.8} />
            <ellipse cx={-1.3} cy={-4.7} rx={3.4} ry={1.7} fill="#f4efe2" />
            <circle cx={5} cy={-4.6} r={1.9} fill="#8c8270" />
            <circle cx={4.5} cy={-5.2} r={0.9} fill="#a89e8a" />
            <path d="M6.3,-5.6 l1.2,-0.7" stroke="#8c8270" strokeWidth={0.8} />
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

      {/* grain léger sur toute la peinture */}
      <rect x={0} y={0} width={MAP.w} height={MAP.h} filter="url(#ter-grain)" opacity={0.85} />
    </g>
  )
}

/** vignettage doux, posé au-dessus de la scène */
export function Vignette() {
  return <rect x={0} y={0} width={MAP.w} height={MAP.h} fill="url(#ter-vignette)" pointerEvents="none" />
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

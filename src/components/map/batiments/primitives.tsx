import type { ReactNode } from 'react'

/*
 * Langage graphique commun — inspiré des city-builders classiques :
 *  - volumes en fausse perspective (face avant + deux pans de toit vus de dessus-avant)
 *  - lumière venant du haut-gauche : pans droits assombris, ombres portées vers la droite
 *  - textures par motifs SVG (tuiles, pierre, chaume, sillons, planches, pavés)
 *  - chaque bâtiment est posé sur une aire de sol et entouré d'accessoires
 * Ancre : centre-bas de la structure principale.
 */

export const T = '#4a3a28' // trait commun

/** motifs partagés — à inclure dans le <defs> de chaque SVG utilisant BatimentArt */
export function DefsBatiments() {
  return (
    <>
      <pattern id="p-tuiles" width="10" height="6" patternUnits="userSpaceOnUse">
        <rect width="10" height="6" fill="#b3543f" />
        <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="#8a3f30" strokeWidth="1" />
        <line x1="0" y1="3.5" x2="10" y2="3.5" stroke="#8a3f30" strokeWidth="0.8" opacity="0.7" />
        <line x1="2.5" y1="0" x2="2.5" y2="3" stroke="#8a3f30" strokeWidth="0.7" opacity="0.6" />
        <line x1="7.5" y1="3" x2="7.5" y2="6" stroke="#8a3f30" strokeWidth="0.7" opacity="0.6" />
      </pattern>
      <pattern id="p-tuiles-f" width="10" height="6" patternUnits="userSpaceOnUse">
        <rect width="10" height="6" fill="#93402f" />
        <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="#6e2f23" strokeWidth="1" />
        <line x1="0" y1="3.5" x2="10" y2="3.5" stroke="#6e2f23" strokeWidth="0.8" opacity="0.7" />
        <line x1="2.5" y1="0" x2="2.5" y2="3" stroke="#6e2f23" strokeWidth="0.7" opacity="0.6" />
        <line x1="7.5" y1="3" x2="7.5" y2="6" stroke="#6e2f23" strokeWidth="0.7" opacity="0.6" />
      </pattern>
      <pattern id="p-chaume" width="8" height="7" patternUnits="userSpaceOnUse">
        <rect width="8" height="7" fill="#c4a75d" />
        <line x1="0" y1="3" x2="8" y2="3" stroke="#a3894a" strokeWidth="1.4" opacity="0.7" />
        <line x1="2" y1="0" x2="1.4" y2="3" stroke="#a3894a" strokeWidth="0.8" />
        <line x1="6" y1="3" x2="5.4" y2="7" stroke="#a3894a" strokeWidth="0.8" />
      </pattern>
      <pattern id="p-chaume-f" width="8" height="7" patternUnits="userSpaceOnUse">
        <rect width="8" height="7" fill="#a68b4b" />
        <line x1="0" y1="3" x2="8" y2="3" stroke="#87703b" strokeWidth="1.4" opacity="0.7" />
        <line x1="2" y1="0" x2="1.4" y2="3" stroke="#87703b" strokeWidth="0.8" />
        <line x1="6" y1="3" x2="5.4" y2="7" stroke="#87703b" strokeWidth="0.8" />
      </pattern>
      <pattern id="p-pierre" width="14" height="9" patternUnits="userSpaceOnUse">
        <rect width="14" height="9" fill="#d3cab7" />
        <line x1="0" y1="0.5" x2="14" y2="0.5" stroke="#a89f8c" strokeWidth="0.9" />
        <line x1="0" y1="4.8" x2="14" y2="4.8" stroke="#a89f8c" strokeWidth="0.9" />
        <line x1="4" y1="0" x2="4" y2="4.8" stroke="#a89f8c" strokeWidth="0.8" opacity="0.8" />
        <line x1="10" y1="4.8" x2="10" y2="9" stroke="#a89f8c" strokeWidth="0.8" opacity="0.8" />
      </pattern>
      <pattern id="p-torchis" width="16" height="10" patternUnits="userSpaceOnUse">
        <rect width="16" height="10" fill="#d9c49c" />
        <line x1="0" y1="9.5" x2="16" y2="9.5" stroke="#b59f77" strokeWidth="1" opacity="0.7" />
        <line x1="12" y1="0" x2="12" y2="10" stroke="#8c7350" strokeWidth="1.6" opacity="0.55" />
      </pattern>
      <pattern id="p-bois" width="9" height="12" patternUnits="userSpaceOnUse">
        <rect width="9" height="12" fill="#93714a" />
        <line x1="4.5" y1="0" x2="4.5" y2="12" stroke="#75583a" strokeWidth="1.1" />
        <line x1="0" y1="6" x2="9" y2="6" stroke="#75583a" strokeWidth="0.6" opacity="0.5" />
      </pattern>
      <pattern id="p-champ" width="60" height="5" patternUnits="userSpaceOnUse">
        <rect width="60" height="5" fill="#b98f3f" />
        <line x1="0" y1="1" x2="60" y2="1" stroke="#96702c" strokeWidth="1.8" />
        <line x1="0" y1="3.6" x2="60" y2="3.6" stroke="#cba455" strokeWidth="0.9" opacity="0.8" />
      </pattern>
      <pattern id="p-champ-or" width="60" height="5" patternUnits="userSpaceOnUse">
        <rect width="60" height="5" fill="#d9b545" />
        <line x1="0" y1="1" x2="60" y2="1" stroke="#b39025" strokeWidth="1.6" />
        <line x1="0" y1="3.6" x2="60" y2="3.6" stroke="#eccf72" strokeWidth="0.9" opacity="0.9" />
      </pattern>
      <pattern id="p-paves" width="11" height="8" patternUnits="userSpaceOnUse">
        <rect width="11" height="8" fill="#cfc4a8" />
        <path d="M0,0.5 H11 M0,4.5 H11 M3,0.5 V4.5 M8,4.5 V8" stroke="#b3a88b" strokeWidth="0.8" fill="none" />
      </pattern>
    </>
  )
}

// ── primitives ───────────────────────────────────────────────────────────────
export function OmbreSol({ rx = 30, ry = 9, dx = 7, dy = 3, o = 0.16 }: { rx?: number; ry?: number; dx?: number; dy?: number; o?: number }) {
  return <ellipse cx={dx} cy={dy} rx={rx} ry={ry} fill="#241a0c" opacity={o} />
}

export function Aire({ rx = 40, ry = 13, fill = '#c2ab77', o = 0.55 }: { rx?: number; ry?: number; fill?: string; o?: number }) {
  return <ellipse cx={0} cy={2} rx={rx} ry={ry} fill={fill} opacity={o} />
}

/** bâtiment volumétrique à toit à deux pans (pignon face au joueur) */
export function Batisse({
  w,
  h,
  g,
  prof = 9,
  mur,
  toit = 'tuiles',
  enfants,
}: {
  w: number
  h: number
  g: number
  prof?: number
  mur: string
  toit?: 'tuiles' | 'chaume' | 'bois'
  enfants?: ReactNode
}) {
  const clair = toit === 'tuiles' ? 'url(#p-tuiles)' : toit === 'chaume' ? 'url(#p-chaume)' : 'url(#p-bois)'
  const fonce = toit === 'tuiles' ? 'url(#p-tuiles-f)' : toit === 'chaume' ? 'url(#p-chaume-f)' : 'url(#p-bois)'
  return (
    <g strokeLinejoin="round">
      <path d={`M${-w / 2 - 2},${-h} L0,${-h - g} L0,${-h - g - prof} L${-w / 2 - 2},${-h - prof} Z`} fill={clair} stroke={T} strokeWidth={1} />
      <path d={`M${w / 2 + 2},${-h} L0,${-h - g} L0,${-h - g - prof} L${w / 2 + 2},${-h - prof} Z`} fill={fonce} stroke={T} strokeWidth={1} />
      <path d={`M${-w / 2},0 L${-w / 2},${-h} L0,${-h - g} L${w / 2},${-h} L${w / 2},0 Z`} fill={mur} stroke={T} strokeWidth={1} />
      <path d={`M${w / 2 - 1.5},0 L${w / 2 - 1.5},${-h}`} stroke="#00000022" strokeWidth={3} />
      <line x1={0} y1={-h - g} x2={0} y2={-h - g - prof} stroke={T} strokeWidth={1.4} />
      {enfants}
    </g>
  )
}

/** tour / bâtiment à toit plat, avec épaisseur de dalle visible */
export function Tourelle({ w, h, prof = 7, mur, creneaux }: { w: number; h: number; prof?: number; mur: string; creneaux?: boolean }) {
  return (
    <g strokeLinejoin="round">
      <rect x={-w / 2} y={-h - prof} width={w} height={prof} fill="#e2d9c4" stroke={T} strokeWidth={1} />
      <rect x={-w / 2} y={-h} width={w} height={h} fill={mur} stroke={T} strokeWidth={1} />
      <path d={`M${w / 2 - 1.5},0 L${w / 2 - 1.5},${-h}`} stroke="#00000022" strokeWidth={3} />
      {creneaux &&
        [-w / 2, -w / 6, w / 6].map((x, i) => (
          <rect key={i} x={x + 1} y={-h - prof - 5} width={w / 4.2} height={5} fill={mur} stroke={T} strokeWidth={0.9} />
        ))}
    </g>
  )
}

export function Porte({ w = 7, h = 11, x = 0 }: { w?: number; h?: number; x?: number }) {
  return (
    <g>
      <path d={`M${x - w / 2},0 L${x - w / 2},${-h + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${-h + w / 2} L${x + w / 2},0 Z`} fill="#5d4426" stroke={T} strokeWidth={0.9} />
      <line x1={x} y1={0} x2={x} y2={-h + 1} stroke="#3d2c17" strokeWidth={0.8} />
    </g>
  )
}

export function Fenetre({ x, y, w = 5, h = 6, volets }: { x: number; y: number; w?: number; h?: number; volets?: boolean }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill="#4a3a28" stroke={T} strokeWidth={0.8} />
      {volets && <rect x={x - w / 2 - 3} y={y - h} width={2.6} height={h} fill="#7c9a8e" stroke={T} strokeWidth={0.7} />}
      {volets && <rect x={x + w / 2 + 0.4} y={y - h} width={2.6} height={h} fill="#7c9a8e" stroke={T} strokeWidth={0.7} />}
    </g>
  )
}

export function Colonne({ x, h, w = 4.6, or }: { x: number; h: number; w?: number; or?: boolean }) {
  return (
    <g>
      <rect x={x - w / 2 - 1.2} y={-2.6} width={w + 2.4} height={2.6} fill="#c9c0ab" stroke={T} strokeWidth={0.8} />
      <rect x={x - w / 2} y={-h} width={w} height={h - 2.6} fill="#ece5d2" stroke={T} strokeWidth={0.9} />
      <line x1={x + w / 2 - 1} y1={-3.5} x2={x + w / 2 - 1} y2={-h + 1} stroke="#b8ad94" strokeWidth={1.2} />
      <rect x={x - w / 2 - 1.4} y={-h - 2.8} width={w + 2.8} height={3} fill={or ? '#d9b25a' : '#dcd3be'} stroke={T} strokeWidth={0.9} />
    </g>
  )
}

export function Feu({ x = 0, y = 0, r = 3.5 }: { x?: number; y?: number; r?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill="#e8913c">
        <animate attributeName="r" values={`${r};${r * 1.3};${r}`} dur="0.9s" repeatCount="indefinite" />
      </circle>
      <circle r={r * 0.5} cy={-1} fill="#f5d06c" />
    </g>
  )
}

export function Fumee({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`} fill="#e3ded2">
      <circle r={2.8} opacity={0.65}>
        <animate attributeName="cy" values="0;-16" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="cx" values="0;2.5" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.65;0" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle r={2} opacity={0.5}>
        <animate attributeName="cy" values="0;-13" dur="3.2s" begin="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0" dur="3.2s" begin="1.5s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

export function Amphore({ x = 0, y = 0, c = '#a3673f', s = 1 }: { x?: number; y?: number; c?: string; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-2.4,0 C-3.4,-3 -2.6,-6 -1.4,-7 L-2.2,-8.4 L2.2,-8.4 L1.4,-7 C2.6,-6 3.4,-3 2.4,0 Z" fill={c} stroke={T} strokeWidth={0.7} />
      <path d="M-2,-7.6 q-1.6,-0.8 -1,-2 M2,-7.6 q1.6,-0.8 1,-2" stroke={T} strokeWidth={0.7} fill="none" />
    </g>
  )
}

export function Caisse({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-4} y={-7} width={8} height={7} fill="#a3814f" stroke={T} strokeWidth={0.8} />
      <path d="M-4,-7 L4,0 M4,-7 L-4,0" stroke="#7a5a35" strokeWidth={0.8} />
    </g>
  )
}

export function Sac({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-3,0 C-3.6,-3.4 -2.4,-5.6 0,-5.6 C2.4,-5.6 3.6,-3.4 3,0 Z" fill="#cbb289" stroke={T} strokeWidth={0.7} />
      <path d="M-1.4,-5.4 L1.4,-5.4" stroke={T} strokeWidth={1.1} />
    </g>
  )
}

export function Meule({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-7,0 C-7,-8 7,-8 7,0 Z" fill="#d8bd6e" stroke="#ab8f4a" strokeWidth={0.9} />
      <path d="M-4,-2 q1,-3 3,-4 M1,-1.5 q1.5,-2.5 3.5,-3" stroke="#ab8f4a" strokeWidth={0.7} fill="none" />
    </g>
  )
}

export function Enclos({ pts }: { pts: [number, number][] }) {
  return (
    <g>
      {pts.map(([x, y], i) => {
        const n = pts[i + 1]
        return (
          <g key={i}>
            <line x1={x} y1={y - 6} x2={x} y2={y} stroke="#7a5a35" strokeWidth={1.8} />
            {n && <line x1={x} y1={y - 4.5} x2={n[0]} y2={n[1] - 4.5} stroke="#8a6a40" strokeWidth={1.2} />}
            {n && <line x1={x} y1={y - 1.8} x2={n[0]} y2={n[1] - 1.8} stroke="#8a6a40" strokeWidth={1.2} />}
          </g>
        )
      })}
    </g>
  )
}

export function Charrette({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-9,-4 L9,-4 L7,-9 L-7,-9 Z" fill="#93714a" stroke={T} strokeWidth={0.9} />
      <line x1={9} y1={-5} x2={14} y2={-3} stroke="#75583a" strokeWidth={1.4} />
      <circle cx={-4} cy={-2.5} r={3.4} fill="#8a6a40" stroke={T} strokeWidth={0.9} />
      <circle cx={-4} cy={-2.5} r={1} fill={T} />
      <circle cx={5} cy={-2.5} r={3.4} fill="#8a6a40" stroke={T} strokeWidth={0.9} />
      <circle cx={5} cy={-2.5} r={1} fill={T} />
      <Sac x={-3} y={-8} />
      <Sac x={2} y={-8.6} />
    </g>
  )
}

export function Buisson({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.5} cy={1} rx={5.5} ry={1.6} fill="#241a0c" opacity={0.12} />
      <ellipse cx={-2} cy={-3} rx={4.5} ry={3.4} fill="#6d8253" />
      <ellipse cx={2.5} cy={-2.4} rx={3.8} ry={2.8} fill="#7d9160" />
    </g>
  )
}

export function OlivierMini({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={1} rx={7} ry={2} fill="#241a0c" opacity={0.13} />
      <path d="M0,0 C-1.6,-4 -2.6,-7 -1.2,-10" stroke="#7a5a35" strokeWidth={2.2} fill="none" />
      <ellipse cx={-1} cy={-13} rx={8} ry={5.5} fill="#74875a" />
      <ellipse cx={4} cy={-10} rx={5} ry={3.8} fill="#8a9c6c" />
    </g>
  )
}

export function Chevre({ x = 0, y = 0, c = '#e8e2d2' }: { x?: number; y?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1} cy={0.8} rx={5} ry={1.4} fill="#241a0c" opacity={0.12} />
      <ellipse cx={0} cy={-3.4} rx={4.4} ry={2.6} fill={c} stroke={T} strokeWidth={0.7} />
      <line x1={-3} y1={-1.2} x2={-3} y2={0.6} stroke={T} strokeWidth={1} />
      <line x1={3} y1={-1.2} x2={3} y2={0.6} stroke={T} strokeWidth={1} />
      <circle cx={4.6} cy={-5} r={1.8} fill={c} stroke={T} strokeWidth={0.7} />
      <path d="M5.2,-6.6 q1.4,-1.4 0.6,-2.6" stroke={T} strokeWidth={0.8} fill="none" />
    </g>
  )
}

export function Boeuf({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1} cy={1} rx={7} ry={2} fill="#241a0c" opacity={0.13} />
      <ellipse cx={0} cy={-4.5} rx={6.5} ry={3.6} fill="#7d6248" stroke={T} strokeWidth={0.8} />
      <line x1={-4} y1={-1.4} x2={-4} y2={1} stroke={T} strokeWidth={1.3} />
      <line x1={4} y1={-1.4} x2={4} y2={1} stroke={T} strokeWidth={1.3} />
      <circle cx={6.6} cy={-6.4} r={2.4} fill="#6b533c" stroke={T} strokeWidth={0.8} />
      <path d="M5.4,-8.2 q-1,-1.6 0,-2.4 M7.8,-8.2 q1,-1.6 0,-2.4" stroke={T} strokeWidth={0.9} fill="none" />
    </g>
  )
}

export function Ratelier({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={-6} y1={0} x2={-6} y2={-11} stroke="#7a5a35" strokeWidth={2} />
      <line x1={6} y1={0} x2={6} y2={-11} stroke="#7a5a35" strokeWidth={2} />
      <line x1={-7.5} y1={-10} x2={7.5} y2={-10} stroke="#7a5a35" strokeWidth={1.6} />
      {[-3.6, 0, 3.6].map((lx) => (
        <g key={lx}>
          <line x1={lx} y1={-10} x2={lx + 1.6} y2={1} stroke="#9aa0a8" strokeWidth={1.2} />
          <path d={`M${lx},-10 l0.7,-3 l1.2,2.7 Z`} fill="#c9a441" />
        </g>
      ))}
    </g>
  )
}

export function Banniere({ x = 0, y = 0, h = 14, c = '#b3543f' }: { x?: number; y?: number; h?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={-h} stroke="#5d4a33" strokeWidth={1.8} />
      <path d={`M0,${-h} L12,${-h + 4} L0,${-h + 8} Z`} fill={c} stroke={T} strokeWidth={0.6} />
    </g>
  )
}

/** tente partagée — utilisée par Maisons (niveau 1) et Caserne (niveau 1) */
export function Tente({ x = 0, y = 0, w = 24, h = 15, c = '#c9b696' }: { x?: number; y?: number; w?: number; h?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <OmbreSol rx={w / 2 + 3} ry={4} dx={4} dy={1.5} o={0.14} />
      <path d={`M${-w / 2},0 L0,${-h} L${w / 2},0 Z`} fill={c} stroke={T} strokeWidth={1} />
      <path d={`M0,${-h} L0,0 L${w * 0.22},0 Z`} fill="#5d4a33" opacity={0.85} />
      <path d={`M${-w * 0.28},${-h * 0.45} q3,1.5 6,0`} stroke="#a08a68" strokeWidth={1} fill="none" />
      <line x1={-w / 2} y1={0} x2={-w / 2 - 5} y2={2.5} stroke="#7a5a35" strokeWidth={0.9} />
      <line x1={w / 2} y1={0} x2={w / 2 + 5} y2={2.5} stroke="#7a5a35" strokeWidth={0.9} />
    </g>
  )
}

/** bloc de pierre taillée — utilisé par Carriere et Chantier */
export function Bloc({ x, y, w = 10, h = 7 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w / 2} y={-h} width={w} height={h} fill="#c2bcae" stroke={T} strokeWidth={0.9} />
      <rect x={-w / 2} y={-h - 2.4} width={w} height={2.4} fill="#d8d2c4" stroke={T} strokeWidth={0.8} />
    </g>
  )
}

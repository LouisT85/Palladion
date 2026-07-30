import type { ReactNode } from 'react'
import type { BuildingId } from '../../game/types'

/*
 * Langage graphique commun — inspiré des city-builders classiques :
 *  - volumes en fausse perspective (face avant + deux pans de toit vus de dessus-avant)
 *  - lumière venant du haut-gauche : pans droits assombris, ombres portées vers la droite
 *  - textures par motifs SVG (tuiles, pierre, chaume, sillons, planches, pavés)
 *  - chaque bâtiment est posé sur une aire de sol et entouré d'accessoires
 * Ancre : centre-bas de la structure principale.
 */

const T = '#4a3a28' // trait commun

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
function OmbreSol({ rx = 30, ry = 9, dx = 7, dy = 3, o = 0.16 }: { rx?: number; ry?: number; dx?: number; dy?: number; o?: number }) {
  return <ellipse cx={dx} cy={dy} rx={rx} ry={ry} fill="#241a0c" opacity={o} />
}

function Aire({ rx = 40, ry = 13, fill = '#c2ab77', o = 0.55 }: { rx?: number; ry?: number; fill?: string; o?: number }) {
  return <ellipse cx={0} cy={2} rx={rx} ry={ry} fill={fill} opacity={o} />
}

/** bâtiment volumétrique à toit à deux pans (pignon face au joueur) */
function Batisse({
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
function Tourelle({ w, h, prof = 7, mur, creneaux }: { w: number; h: number; prof?: number; mur: string; creneaux?: boolean }) {
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

function Porte({ w = 7, h = 11, x = 0 }: { w?: number; h?: number; x?: number }) {
  return (
    <g>
      <path d={`M${x - w / 2},0 L${x - w / 2},${-h + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${-h + w / 2} L${x + w / 2},0 Z`} fill="#5d4426" stroke={T} strokeWidth={0.9} />
      <line x1={x} y1={0} x2={x} y2={-h + 1} stroke="#3d2c17" strokeWidth={0.8} />
    </g>
  )
}

function Fenetre({ x, y, w = 5, h = 6, volets }: { x: number; y: number; w?: number; h?: number; volets?: boolean }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill="#4a3a28" stroke={T} strokeWidth={0.8} />
      {volets && <rect x={x - w / 2 - 3} y={y - h} width={2.6} height={h} fill="#7c9a8e" stroke={T} strokeWidth={0.7} />}
      {volets && <rect x={x + w / 2 + 0.4} y={y - h} width={2.6} height={h} fill="#7c9a8e" stroke={T} strokeWidth={0.7} />}
    </g>
  )
}

function Colonne({ x, h, w = 4.6, or }: { x: number; h: number; w?: number; or?: boolean }) {
  return (
    <g>
      <rect x={x - w / 2 - 1.2} y={-2.6} width={w + 2.4} height={2.6} fill="#c9c0ab" stroke={T} strokeWidth={0.8} />
      <rect x={x - w / 2} y={-h} width={w} height={h - 2.6} fill="#ece5d2" stroke={T} strokeWidth={0.9} />
      <line x1={x + w / 2 - 1} y1={-3.5} x2={x + w / 2 - 1} y2={-h + 1} stroke="#b8ad94" strokeWidth={1.2} />
      <rect x={x - w / 2 - 1.4} y={-h - 2.8} width={w + 2.8} height={3} fill={or ? '#d9b25a' : '#dcd3be'} stroke={T} strokeWidth={0.9} />
    </g>
  )
}

function Feu({ x = 0, y = 0, r = 3.5 }: { x?: number; y?: number; r?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill="#e8913c">
        <animate attributeName="r" values={`${r};${r * 1.3};${r}`} dur="0.9s" repeatCount="indefinite" />
      </circle>
      <circle r={r * 0.5} cy={-1} fill="#f5d06c" />
    </g>
  )
}

function Fumee({ x = 0, y = 0 }: { x?: number; y?: number }) {
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

function Amphore({ x = 0, y = 0, c = '#a3673f', s = 1 }: { x?: number; y?: number; c?: string; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-2.4,0 C-3.4,-3 -2.6,-6 -1.4,-7 L-2.2,-8.4 L2.2,-8.4 L1.4,-7 C2.6,-6 3.4,-3 2.4,0 Z" fill={c} stroke={T} strokeWidth={0.7} />
      <path d="M-2,-7.6 q-1.6,-0.8 -1,-2 M2,-7.6 q1.6,-0.8 1,-2" stroke={T} strokeWidth={0.7} fill="none" />
    </g>
  )
}

function Caisse({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-4} y={-7} width={8} height={7} fill="#a3814f" stroke={T} strokeWidth={0.8} />
      <path d="M-4,-7 L4,0 M4,-7 L-4,0" stroke="#7a5a35" strokeWidth={0.8} />
    </g>
  )
}

function Sac({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-3,0 C-3.6,-3.4 -2.4,-5.6 0,-5.6 C2.4,-5.6 3.6,-3.4 3,0 Z" fill="#cbb289" stroke={T} strokeWidth={0.7} />
      <path d="M-1.4,-5.4 L1.4,-5.4" stroke={T} strokeWidth={1.1} />
    </g>
  )
}

function Meule({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-7,0 C-7,-8 7,-8 7,0 Z" fill="#d8bd6e" stroke="#ab8f4a" strokeWidth={0.9} />
      <path d="M-4,-2 q1,-3 3,-4 M1,-1.5 q1.5,-2.5 3.5,-3" stroke="#ab8f4a" strokeWidth={0.7} fill="none" />
    </g>
  )
}

function Enclos({ pts }: { pts: [number, number][] }) {
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

function Charrette({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
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

function Buisson({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.5} cy={1} rx={5.5} ry={1.6} fill="#241a0c" opacity={0.12} />
      <ellipse cx={-2} cy={-3} rx={4.5} ry={3.4} fill="#6d8253" />
      <ellipse cx={2.5} cy={-2.4} rx={3.8} ry={2.8} fill="#7d9160" />
    </g>
  )
}

function OlivierMini({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={1} rx={7} ry={2} fill="#241a0c" opacity={0.13} />
      <path d="M0,0 C-1.6,-4 -2.6,-7 -1.2,-10" stroke="#7a5a35" strokeWidth={2.2} fill="none" />
      <ellipse cx={-1} cy={-13} rx={8} ry={5.5} fill="#74875a" />
      <ellipse cx={4} cy={-10} rx={5} ry={3.8} fill="#8a9c6c" />
    </g>
  )
}

function Chevre({ x = 0, y = 0, c = '#e8e2d2' }: { x?: number; y?: number; c?: string }) {
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

function Boeuf({ x = 0, y = 0 }: { x?: number; y?: number }) {
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

function Ratelier({ x = 0, y = 0 }: { x?: number; y?: number }) {
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

function Banniere({ x = 0, y = 0, h = 14, c = '#b3543f' }: { x?: number; y?: number; h?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={-h} stroke="#5d4a33" strokeWidth={1.8} />
      <path d={`M0,${-h} L12,${-h + 4} L0,${-h + 8} Z`} fill={c} stroke={T} strokeWidth={0.6} />
    </g>
  )
}

// ── AGORA ────────────────────────────────────────────────────────────────────
function Etal({ x = 0, y = 0, c = '#b3543f', s = 1 }: { x?: number; y?: number; c?: string; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <OmbreSol rx={11} ry={3.2} dx={3} dy={1} o={0.13} />
      <rect x={-9} y={-8} width={18} height={8} fill="#c9b696" stroke={T} strokeWidth={0.9} />
      {[-9, -3, 3].map((rx, i) => (
        <rect key={rx} x={rx} y={-14.5} width={6} height={5} fill={i % 2 ? '#ece5d2' : c} stroke={T} strokeWidth={0.7} />
      ))}
      <path d="M-10,-9.5 L10,-9.5" stroke={T} strokeWidth={1} />
      <line x1={-8} y1={0} x2={-8} y2={-9} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={8} y1={0} x2={8} y2={-9} stroke="#7a5a35" strokeWidth={1.6} />
      <Amphore x={-4} y={-8.4} s={0.7} />
      <circle cx={2} cy={-9.6} r={1.6} fill="#c96a52" />
      <circle cx={5} cy={-9.4} r={1.6} fill="#8a9c6c" />
    </g>
  )
}

function Stoa({ w, h = 15 }: { w: number; h?: number }) {
  const cols: number[] = []
  const pas = (w - 10) / Math.max(1, Math.round((w - 10) / 16))
  for (let x = -w / 2 + 5; x <= w / 2 - 4; x += pas) cols.push(x)
  return (
    <g>
      <rect x={-w / 2 - 3} y={-1.8} width={w + 6} height={2.6} fill="#c9c0ab" stroke={T} strokeWidth={0.9} />
      <rect x={-w / 2 + 2} y={-h - 2} width={w - 4} height={h} fill="#e6dfcc" opacity={0.6} />
      {cols.map((x) => (
        <Colonne key={x} x={x} h={h} />
      ))}
      <rect x={-w / 2 - 3} y={-h - 4.6} width={w + 6} height={3.4} fill="#dcd3be" stroke={T} strokeWidth={0.9} />
      <path d={`M${-w / 2 - 4},${-h - 4.6} L${w / 2 + 4},${-h - 4.6} L${w / 2},${-h - 10} L${-w / 2},${-h - 10} Z`} fill="url(#p-tuiles)" stroke={T} strokeWidth={0.9} />
    </g>
  )
}

function Statue({ x = 0, y = 0, or }: { x?: number; y?: number; or?: boolean }) {
  const c = or ? '#d9b25a' : '#e2d9c4'
  return (
    <g transform={`translate(${x},${y})`}>
      <OmbreSol rx={7} ry={2.4} dx={2.5} dy={1} o={0.14} />
      <rect x={-5} y={-6} width={10} height={6} fill="#c9c0ab" stroke={T} strokeWidth={0.9} />
      <path d="M-2.6,-6 L-1.8,-14 L1.8,-14 L2.6,-6 Z" fill={c} stroke={T} strokeWidth={0.8} />
      <circle cx={0} cy={-16} r={2.2} fill={c} stroke={T} strokeWidth={0.8} />
      <line x1={2} y1={-13} x2={5} y2={-17} stroke={c} strokeWidth={1.6} />
    </g>
  )
}

function Agora({ n }: { n: number }) {
  return (
    <g>
      <OmbreSol rx={46} ry={14} dx={8} dy={3} o={0.1} />
      <ellipse cx={0} cy={0} rx={n >= 2 ? 48 : 40} ry={n >= 2 ? 17 : 14} fill={n >= 4 ? '#e8e2d2' : n >= 2 ? 'url(#p-paves)' : '#c9ad74'} stroke={n >= 2 ? '#a89f8c' : '#a68c58'} strokeWidth={1.2} />
      {n === 1 && (
        <g>
          <ellipse cx={-14} cy={-3} rx={9} ry={3.4} fill="#b89a63" opacity={0.8} />
          <ellipse cx={16} cy={4} rx={7} ry={2.6} fill="#d3b87e" opacity={0.8} />
        </g>
      )}
      {n >= 4 && <ellipse cx={0} cy={0} rx={41} ry={13.6} fill="none" stroke="#c9a441" strokeWidth={1.6} strokeDasharray="7 3.5" />}

      <g transform="translate(0,-2)">
        <rect x={-5} y={-7.5} width={10} height={7.5} fill="url(#p-pierre)" stroke={T} strokeWidth={0.9} />
        <rect x={-6} y={-9} width={12} height={2.2} fill="#dcd3be" stroke={T} strokeWidth={0.8} />
        <Feu x={0} y={-11} r={2.6} />
        <Fumee x={0} y={-14} />
      </g>

      {n === 1 && (
        <g>
          <line x1={-26} y1={5} x2={-14} y2={7} stroke="#8a6a40" strokeWidth={3} strokeLinecap="round" />
          <line x1={14} y1={8} x2={26} y2={6} stroke="#8a6a40" strokeWidth={3} strokeLinecap="round" />
          <Amphore x={24} y={-6} />
          <Amphore x={28} y={-4} c="#8c552f" />
          <g transform="translate(-24,-8)">
            <line x1={0} y1={0} x2={0} y2={-12} stroke="#7a5a35" strokeWidth={1.8} />
            <rect x={-4} y={-12} width={8} height={5.5} fill="#e0d9c8" stroke={T} strokeWidth={0.8} />
          </g>
        </g>
      )}
      {n >= 2 && (
        <g>
          <g transform="translate(0,-14)">
            <Stoa w={n >= 3 ? 64 : 48} h={n >= 3 ? 16 : 13} />
          </g>
          <Etal x={-30} y={4} s={0.95} />
          <Etal x={30} y={6} c="#5f7d64" s={0.9} />
          {n >= 3 && <Etal x={0} y={13} c="#7c6a9c" s={0.85} />}
          {n >= 3 && <Statue x={38} y={-8} or={n >= 4} />}
          <Caisse x={-19} y={9} s={0.9} />
          <Sac x={-13.5} y={9.5} />
        </g>
      )}
      {n >= 4 && (
        <g>
          <Feu x={-42} y={-4} r={2.2} />
          <Feu x={42} y={-2} r={2.2} />
          <OlivierMini x={-40} y={12} s={0.8} />
          <OlivierMini x={44} y={13} s={0.7} />
        </g>
      )}
    </g>
  )
}

// ── TEMPLE ───────────────────────────────────────────────────────────────────
function Temple({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <Aire rx={34} ry={11} fill="#b5a678" />
        <OmbreSol rx={26} ry={8} dx={6} />
        <OlivierMini x={16} y={-2} s={1.5} />
        <path d="M13,-22 q4,3 8,0 M14,-17 q3,2.6 6,0" stroke="#c96a52" strokeWidth={1.1} fill="none" />
        <g transform="translate(-8,0)">
          <rect x={-7} y={-9} width={14} height={9} fill="url(#p-pierre)" stroke={T} strokeWidth={1} />
          <rect x={-8.4} y={-11} width={16.8} height={2.6} fill="#dcd3be" stroke={T} strokeWidth={0.9} />
          <Feu x={0} y={-13} r={2.8} />
          <Fumee x={0} y={-16} />
        </g>
        <g>
          <rect x={-27} y={-13} width={4.6} height={13} rx={1.2} fill="#cfc7b5" stroke={T} strokeWidth={0.9} />
          <rect x={-33} y={-10} width={4.2} height={10} rx={1.2} fill="#c2b9a4" stroke={T} strokeWidth={0.9} />
          <circle cx={-24.7} cy={-9.5} r={1} fill="#8c8270" />
        </g>
        <Amphore x={4} y={-1} s={0.85} />
        <Buisson x={-20} y={4} s={0.9} />
      </g>
    )
  }
  const w = n === 2 ? 46 : n === 3 ? 62 : 78
  const hCol = n === 2 ? 15 : n === 3 ? 19 : 23
  const cols = n === 2 ? [-14, 14] : n === 3 ? [-23, -7.5, 7.5, 23] : [-32, -19, -6.5, 6.5, 19, 32]
  return (
    <g>
      <Aire rx={w / 2 + 20} ry={15} fill="#cabf9c" />
      <OmbreSol rx={w / 2 + 10} ry={10} dx={8} />
      <rect x={-w / 2 - 8} y={-3} width={w + 16} height={4} fill="#c9c0ab" stroke={T} strokeWidth={1} />
      <rect x={-w / 2 - 4.5} y={-6} width={w + 9} height={3.4} fill="#d8d1c0" stroke={T} strokeWidth={0.9} />
      {n >= 4 && <rect x={-w / 2 - 12} y={-0.5} width={w + 24} height={2.4} fill="#bdb49d" stroke={T} strokeWidth={0.9} />}
      <g transform="translate(0,-5)">
        <Batisse w={w - 8} h={hCol + 2} g={w * 0.16} prof={8} mur={n >= 4 ? '#f0e9da' : '#e6dfcc'} />
        {n >= 4 && <rect x={-4.5} y={-hCol - 1} width={9} height={hCol - 2} fill="#d9b25a" stroke={T} strokeWidth={0.8} />}
        {n === 3 && <rect x={-4} y={-hCol} width={8} height={hCol - 3} fill="#5d4a33" stroke={T} strokeWidth={0.8} />}
      </g>
      {cols.map((x) => (
        <g key={x} transform="translate(0,-5)">
          <Colonne x={x} h={hCol} />
        </g>
      ))}
      <g transform="translate(0,-5)">
        <rect x={-w / 2 - 3} y={-hCol - 5} width={w + 6} height={3.6} fill="#dcd3be" stroke={T} strokeWidth={1} />
        <path d={`M${-w / 2 - 4},${-hCol - 5} L0,${-hCol - 5 - w * 0.17} L${w / 2 + 4},${-hCol - 5} Z`} fill={n >= 4 ? '#efe7d4' : '#e2dac6'} stroke={T} strokeWidth={1.1} />
        <path d={`M${-w / 2 + 2},${-hCol - 6.5} L0,${-hCol - 6.5 - w * 0.13} L${w / 2 - 2},${-hCol - 6.5}`} fill="none" stroke={n >= 4 ? '#c9a441' : '#b3543f'} strokeWidth={1.4} />
        {n >= 4 && <circle cx={0} cy={-hCol - 5 - w * 0.085} r={2.6} fill="#c9a441" />}
        <path d={`M${-w / 2 - 5},${-hCol - 5} l0,-4 l3,4 Z`} fill="#dcd3be" stroke={T} strokeWidth={0.7} />
        <path d={`M${w / 2 + 5},${-hCol - 5} l0,-4 l-3,4 Z`} fill="#dcd3be" stroke={T} strokeWidth={0.7} />
      </g>
      <g transform="translate(0,8)">
        <rect x={-5} y={-6} width={10} height={6} fill="url(#p-pierre)" stroke={T} strokeWidth={0.9} />
        {n >= 3 && <Feu x={0} y={-8} r={2.2} />}
        <Fumee x={0} y={-10} />
      </g>
      {n >= 3 && (
        <g>
          <Amphore x={-w / 2 - 14} y={4} />
          <Amphore x={-w / 2 - 10} y={6} c="#8c552f" s={0.85} />
          <OlivierMini x={w / 2 + 16} y={4} s={0.9} />
        </g>
      )}
    </g>
  )
}

// ── MAISONS ──────────────────────────────────────────────────────────────────
function Tente({ x = 0, y = 0, w = 24, h = 15, c = '#c9b696' }: { x?: number; y?: number; w?: number; h?: number; c?: string }) {
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

function Maisons({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <Aire rx={40} ry={13} fill="#c0a877" />
        <Tente x={-18} y={0} w={26} h={16} />
        <Tente x={14} y={4} w={22} h={13} c="#bfa988" />
        <g transform="translate(2,-6)">
          <Feu r={3} />
          <line x1={-5} y1={2} x2={0} y2={-6} stroke="#5d4a33" strokeWidth={1.1} />
          <line x1={5} y1={2} x2={0} y2={-6} stroke="#5d4a33" strokeWidth={1.1} />
          <circle cx={0} cy={-5.4} r={2} fill="#4a4642" stroke={T} strokeWidth={0.7} />
        </g>
        <path d="M28,-2 q4,-2.5 8,0 q-4,2.5 -8,0" fill="#b3906b" stroke={T} strokeWidth={0.7} />
        <Amphore x={-34} y={2} s={0.9} />
      </g>
    )
  }
  if (n === 2) {
    return (
      <g>
        <Aire rx={44} ry={14} fill="#c0a877" />
        <g transform="translate(-17,0)">
          <OmbreSol rx={16} ry={5} dx={5} />
          <Batisse w={27} h={13} g={8} mur="url(#p-torchis)" toit="chaume" enfants={<Porte w={6} h={9} />} />
        </g>
        <g transform="translate(18,4)">
          <OmbreSol rx={14} ry={4.6} dx={5} />
          <Batisse w={24} h={11} g={7} mur="url(#p-torchis)" toit="chaume" enfants={<Porte w={5.5} h={8} x={-3} />} />
          <Fenetre x={6} y={-3} w={4} h={4} />
        </g>
        <Enclos pts={[[-38, 8], [-30, 12], [-19, 14], [-8, 13]]} />
        {[-32, -25, -15].map((cx, i) => (
          <g key={i} transform={`translate(${cx},${9 + (i % 2)})`}>
            <ellipse cx={0} cy={-1.6} rx={2.2} ry={1.6} fill={i === 1 ? '#c96a52' : '#ece5d2'} stroke={T} strokeWidth={0.6} />
            <circle cx={1.8} cy={-3} r={0.9} fill={i === 1 ? '#c96a52' : '#ece5d2'} stroke={T} strokeWidth={0.5} />
          </g>
        ))}
        <g transform="translate(34,-2)">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={-1.5 + (i % 2)} y={-2.6 - i * 2.4} width={9} height={2.6} rx={1.3} fill={i % 2 ? '#a3814f' : '#8f6f42'} stroke={T} strokeWidth={0.6} />
          ))}
        </g>
        <Fumee x={-17} y={-25} />
      </g>
    )
  }
  return (
    <g>
      <Aire rx={50} ry={16} fill="#c6b183" />
      <g transform="translate(-26,-2)">
        <OmbreSol rx={16} ry={5.4} dx={5} />
        <Batisse
          w={28}
          h={15}
          g={8}
          mur="url(#p-pierre)"
          enfants={
            <>
              <Porte w={6} h={10} x={-4} />
              <Fenetre x={7} y={-4} volets />
            </>
          }
        />
      </g>
      <g transform="translate(8,4)">
        <OmbreSol rx={15} ry={5} dx={5} />
        <Batisse
          w={26}
          h={13}
          g={7.5}
          mur="#e3d9c2"
          enfants={
            <>
              <Porte w={5.5} h={9} />
              <Fenetre x={-7.5} y={-3} w={4.4} h={5} />
            </>
          }
        />
      </g>
      <g transform="translate(34,-6)">
        <OmbreSol rx={13} ry={4.6} dx={4} />
        <Batisse w={23} h={12} g={7} mur="url(#p-pierre)" enfants={<Porte w={5.4} h={8.6} x={3} />} />
      </g>
      <g>
        <line x1={-8} y1={-26} x2={16} y2={-24} stroke="#e0d9c8" strokeWidth={0.9} />
        <line x1={-8} y1={-26} x2={-8} y2={-12} stroke="#7a5a35" strokeWidth={1.4} />
        <line x1={16} y1={-24} x2={16} y2={-10} stroke="#7a5a35" strokeWidth={1.4} />
        <rect x={-4} y={-25.4} width={4.6} height={6} fill="#7c9a8e" opacity={0.95} />
        <rect x={4} y={-24.8} width={4.2} height={5} fill="#c9a06c" opacity={0.95} />
      </g>
      <Amphore x={-42} y={4} />
      <Amphore x={-38} y={6} c="#8c552f" s={0.85} />
      {n >= 4 && (
        <g>
          <g transform="translate(-30,-22)">
            <OmbreSol rx={14} ry={4.6} dx={4} />
            <Batisse
              w={24}
              h={19}
              g={7}
              mur="#efe7d4"
              enfants={
                <>
                  <Fenetre x={-5} y={-11} volets />
                  <Fenetre x={5.5} y={-11} />
                  <Porte w={5.4} h={8.4} />
                </>
              }
            />
            <rect x={-13} y={-10} width={11} height={1.6} fill="#93714a" stroke={T} strokeWidth={0.7} />
            <path d="M-13,-10 l-6,8" stroke="#93714a" strokeWidth={2.4} />
          </g>
          <g transform="translate(40,10)">
            <line x1={-8} y1={0} x2={-8} y2={-10} stroke="#7a5a35" strokeWidth={1.4} />
            <line x1={6} y1={0} x2={6} y2={-10} stroke="#7a5a35" strokeWidth={1.4} />
            <line x1={-10} y1={-10} x2={8} y2={-10} stroke="#7a5a35" strokeWidth={1.3} />
            <path d="M-10,-10 q9,-4 18,0" stroke="#6d8253" strokeWidth={2.6} fill="none" />
          </g>
          <g transform="translate(52,-12)">
            <Tourelle w={10} h={16} mur="#e3d9c2" />
            <path d="M-5,-23 L0,-28 L5,-23 Z" fill="url(#p-tuiles)" stroke={T} strokeWidth={0.8} />
            <circle cx={0} cy={-12} r={1.4} fill="#4a3a28" />
            <circle cx={-6.5} cy={-29} r={1} fill="#ece5d2" />
          </g>
          <Fumee x={-30} y={-50} />
        </g>
      )}
      {n === 3 && <Fumee x={-26} y={-32} />}
    </g>
  )
}

// ── FERME (les champs s'étendent à l'est, loin de la mer) ────────────────────
function Champ({ x, y, w, h, or, jeunes }: { x: number; y: number; w: number; h: number; or?: boolean; jeunes?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={`M${-w / 2 + 4},${-h / 2} L${w / 2},${-h / 2} L${w / 2 - 4},${h / 2} L${-w / 2},${h / 2} Z`} fill={or ? 'url(#p-champ-or)' : 'url(#p-champ)'} stroke="#8c7136" strokeWidth={1.1} />
      {jeunes &&
        [0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${-w / 2 + 8 + i * (w / 6.5)},${h / 2 - 3} q1,-3 2,-4`} stroke="#7d9160" strokeWidth={1.2} fill="none" />
        ))}
    </g>
  )
}

function Epouvantail({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={-13} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-5.5} y1={-9.5} x2={5.5} y2={-9.5} stroke="#7a5a35" strokeWidth={1.4} />
      <path d="M-2.6,-9.5 L-1.2,-4.5 L1.2,-4.5 L2.6,-9.5 Z" fill="#b3906b" />
      <circle cx={0} cy={-14.6} r={2.4} fill="#d8bd6e" stroke={T} strokeWidth={0.8} />
      <path d="M-2.4,-15.8 L2.4,-15.8 L0,-18.4 Z" fill="#c4a75d" stroke={T} strokeWidth={0.7} />
      <circle cx={4.6} cy={-8.4} r={1.1} fill="#3d3a36" />
    </g>
  )
}

function Ferme({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={30} ry={11} fill="#c0a877" />
      <Champ x={44} y={2} w={54} h={22} or={n >= 3} jeunes={n < 3} />
      {n >= 2 && <Champ x={50} y={-20} w={44} h={15} or={n >= 3} jeunes={n < 3} />}
      {n >= 4 && <Champ x={88} y={-8} w={34} h={26} or />}
      <Epouvantail x={40} y={-4} />

      <g transform="translate(-6,0)">
        <OmbreSol rx={16} ry={5.4} dx={5} />
        {n < 3 ? (
          <Batisse w={26} h={12} g={8} mur="url(#p-torchis)" toit="chaume" enfants={<Porte w={6} h={9} />} />
        ) : (
          <Batisse
            w={34}
            h={16}
            g={9}
            mur="url(#p-pierre)"
            enfants={
              <>
                <Porte w={7} h={11} x={-6} />
                <Fenetre x={8} y={-5} volets />
              </>
            }
          />
        )}
        {n >= 3 && <Fumee x={0} y={-30} />}
      </g>

      {n >= 2 && (
        <g>
          <Enclos pts={[[-38, 6], [-40, 14], [-26, 18], [-16, 12], [-22, 5]]} />
          <Chevre x={-30} y={10} />
          <Chevre x={-23} y={13} c="#cfc7b5" />
        </g>
      )}
      {n >= 3 && (
        <g>
          <g transform="translate(-34,-14)">
            <OmbreSol rx={13} ry={4.4} dx={4} />
            <Batisse w={24} h={11} g={7} mur="url(#p-bois)" enfants={<rect x={-4} y={-8} width={8} height={8} fill="#5d4426" stroke={T} strokeWidth={0.8} />} />
          </g>
          <Boeuf x={16} y={16} />
          <Meule x={-14} y={14} />
          <Meule x={-4} y={17} s={0.8} />
          <Charrette x={20} y={26} s={0.9} />
        </g>
      )}
      {n >= 4 && (
        <g>
          <OlivierMini x={66} y={22} />
          <OlivierMini x={80} y={28} s={0.85} />
          <OlivierMini x={94} y={22} s={0.9} />
          <g transform="translate(-46,-30)">
            <line x1={-6} y1={0} x2={-6} y2={-5} stroke="#7a5a35" strokeWidth={1.8} />
            <line x1={6} y1={0} x2={6} y2={-5} stroke="#7a5a35" strokeWidth={1.8} />
            <g transform="translate(0,-5)">
              <Batisse w={17} h={8} g={5.5} mur="#e3d9c2" toit="chaume" />
            </g>
          </g>
          <Sac x={6} y={10} />
          <Sac x={11} y={12} />
        </g>
      )}
    </g>
  )
}

// ── SCIERIE ──────────────────────────────────────────────────────────────────
function Rondin({ x, y, l = 22, r = 3 }: { x: number; y: number; l?: number; r?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={-r} width={l} height={r * 2} rx={r} fill="#a3814f" stroke={T} strokeWidth={0.8} />
      <circle cx={l} cy={0} r={r - 0.4} fill="#d3b787" stroke={T} strokeWidth={0.7} />
      <circle cx={l} cy={0} r={(r - 0.4) * 0.5} fill="none" stroke="#a98e5f" strokeWidth={0.7} />
    </g>
  )
}

function Scierie({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={40} ry={13} fill="#bda67a" />
      <ellipse cx={6} cy={4} rx={22} ry={7} fill="#d8c9a2" opacity={0.7} />
      <g transform="translate(-24,2)">
        <OmbreSol rx={16} ry={4.6} dx={4} o={0.14} />
        <Rondin x={-14} y={-3} />
        <Rondin x={-12} y={-8.6} l={20} />
        <Rondin x={-9} y={-13.8} l={16} />
        {n >= 3 && <Rondin x={-7} y={-18.4} l={12} r={2.6} />}
      </g>
      <g transform="translate(8,0)">
        <path d="M-8,0 L-3,-9 L2,0 M8,0 L13,-9 L18,0" stroke="#7a5a35" strokeWidth={1.8} fill="none" />
        <Rondin x={-8} y={-10} l={26} r={2.6} />
        <path d="M4,-13 l3,-7" stroke="#9aa0a8" strokeWidth={1.6} />
        <path d="M7,-20 h4" stroke="#7a5a35" strokeWidth={2.2} />
      </g>
      <g transform="translate(30,8)">
        <circle r={4.6} fill="#a3814f" stroke={T} strokeWidth={0.9} />
        <circle r={2.2} fill="#d3b787" />
        <path d="M1,-3 l4,-7 l2.6,1.4 q-1,3 -3.4,3 Z" fill="#8f8a7c" stroke={T} strokeWidth={0.7} />
      </g>
      {n >= 2 && (
        <g transform="translate(2,-16)">
          <line x1={-16} y1={16} x2={-16} y2={-2} stroke="#7a5a35" strokeWidth={2.2} />
          <line x1={16} y1={16} x2={16} y2={-6} stroke="#7a5a35" strokeWidth={2.2} />
          <path d="M-20,-2 L20,-7 L20,-1.6 L-20,3.4 Z" fill="url(#p-chaume)" stroke={T} strokeWidth={1} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={-12 + i} y={10 - i * 2.6} width={24} height={2.4} fill={i % 2 ? '#c9a875' : '#b8935c'} stroke={T} strokeWidth={0.6} />
          ))}
        </g>
      )}
      {n >= 3 && <Charrette x={-38} y={16} />}
      {n >= 4 && (
        <g transform="translate(26,-18)">
          <line x1={-10} y1={22} x2={0} y2={-8} stroke="#7a5a35" strokeWidth={2.6} />
          <line x1={10} y1={22} x2={0} y2={-8} stroke="#7a5a35" strokeWidth={2.6} />
          <line x1={0} y1={-8} x2={16} y2={-2} stroke="#7a5a35" strokeWidth={2} />
          <line x1={16} y1={-2} x2={16} y2={12} stroke="#5d4a33" strokeWidth={1} />
          <Rondin x={9} y={13} l={14} r={2.4} />
          <circle cx={16} cy={-2} r={1.6} fill="#8f8a7c" stroke={T} strokeWidth={0.7} />
        </g>
      )}
    </g>
  )
}

// ── CARRIÈRE ─────────────────────────────────────────────────────────────────
function Bloc({ x, y, w = 10, h = 7 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-w / 2} y={-h} width={w} height={h} fill="#c2bcae" stroke={T} strokeWidth={0.9} />
      <rect x={-w / 2} y={-h - 2.4} width={w} height={2.4} fill="#d8d2c4" stroke={T} strokeWidth={0.8} />
    </g>
  )
}

function Carriere({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={44} ry={13} fill="#b3ab90" />
      <g>
        <path d="M-42,6 L-38,-12 L-14,-20 L10,-14 L18,6 Z" fill="#9a9488" stroke={T} strokeWidth={1.1} />
        <path d="M-38,-12 L-14,-20 L10,-14 L6,-8 L-16,-13 L-34,-6 Z" fill="#aaa494" stroke="#7c766a" strokeWidth={0.8} />
        <path d="M-36,-2 L14,0" stroke="#7c766a" strokeWidth={1} opacity={0.8} />
        <path d="M-30,-8 L-16,-11 M-8,-11 L6,-7" stroke="#7c766a" strokeWidth={0.9} opacity={0.7} />
        <path d="M-12,4 L-10,-10 L4,-8 L4,4 Z" fill="#cfc8ba" stroke="#8c8577" strokeWidth={0.9} />
        <path d="M-8,-6 h9 M-8,-2 h9" stroke="#a89f8c" strokeWidth={0.8} />
      </g>
      <g transform="translate(14,2)">
        <line x1={0} y1={0} x2={7} y2={-9} stroke="#7a5a35" strokeWidth={1.6} />
        <path d="M5.6,-10.6 q3,-1.6 5,0.6 q-2.4,1.8 -4.4,1" fill="#8f8a7c" stroke={T} strokeWidth={0.7} />
      </g>
      <Bloc x={26} y={8} />
      {n >= 2 && (
        <g>
          <line x1={-30} y1={6} x2={-30} y2={-16} stroke="#7a5a35" strokeWidth={2} />
          <line x1={-12} y1={6} x2={-12} y2={-19} stroke="#7a5a35" strokeWidth={2} />
          <line x1={-33} y1={-10} x2={-9} y2={-14} stroke="#8a6a40" strokeWidth={2.2} />
          <g stroke="#8a6a40" strokeWidth={1.1}>
            <line x1={2} y1={5} x2={8} y2={-12} />
            <line x1={7} y1={5} x2={13} y2={-12} />
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={3.5 + i * 1.4} y1={1 - i * 4} x2={8.5 + i * 1.4} y2={0 - i * 4} />
            ))}
          </g>
          <Bloc x={34} y={2} w={9} h={6} />
        </g>
      )}
      {n >= 3 && (
        <g>
          <path d="M18,14 L48,20" stroke="#c4ab80" strokeWidth={4} opacity={0.7} />
          <g transform="translate(34,16)">
            <rect x={-10} y={-3} width={20} height={3} fill="#93714a" stroke={T} strokeWidth={0.8} />
            <Bloc x={0} y={-3} w={13} h={9} />
            <circle cx={-7} cy={1} r={1.8} fill="#7a5a35" />
            <circle cx={0} cy={1} r={1.8} fill="#7a5a35" />
            <circle cx={7} cy={1} r={1.8} fill="#7a5a35" />
          </g>
        </g>
      )}
      {n >= 4 && (
        <g>
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${-30 + i * 15},${18 + i * 3})`}>
              <ellipse cx={0} cy={-7} rx={5.5} ry={2} fill="#d8d2c4" stroke={T} strokeWidth={0.8} />
              <path d="M-5.5,-7 L-5.5,0 A5.5,2 0 0 0 5.5,0 L5.5,-7" fill="#c2bcae" stroke={T} strokeWidth={0.8} />
            </g>
          ))}
          <g transform="translate(6,22) rotate(-8)">
            <rect x={-16} y={-5} width={32} height={7} rx={2} fill="#cfc8ba" stroke={T} strokeWidth={1} />
          </g>
        </g>
      )}
    </g>
  )
}

// ── FORGE ────────────────────────────────────────────────────────────────────
function Forge({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={36} ry={12} fill="#bda67a" />
      {n >= 3 && (
        <g transform="translate(2,-4)">
          <OmbreSol rx={20} ry={6} dx={6} />
          <Batisse w={40} h={15} g={9} mur="url(#p-pierre)" enfants={<Porte w={9} h={12} x={8} />} />
          <rect x={-14} y={-30} width={5} height={9} fill="#8c8577" stroke={T} strokeWidth={0.8} />
          <Fumee x={-11.5} y={-31} />
        </g>
      )}
      {n === 2 && (
        <g transform="translate(2,-6)">
          <line x1={-18} y1={10} x2={-18} y2={-8} stroke="#7a5a35" strokeWidth={2.2} />
          <line x1={18} y1={10} x2={18} y2={-8} stroke="#7a5a35" strokeWidth={2.2} />
          <line x1={-14} y1={10} x2={-14} y2={-7} stroke="#7a5a35" strokeWidth={1.6} opacity={0.7} />
          <path d="M-22,-8 L22,-12 L22,-6.4 L-22,-2.4 Z" fill="url(#p-tuiles)" stroke={T} strokeWidth={1} />
        </g>
      )}
      <g transform="translate(-14,2)">
        <OmbreSol rx={9} ry={3.4} dx={3.5} o={0.15} />
        <path d="M-7,0 L-5.4,-13 L5.4,-13 L7,0 Z" fill="#a3673f" stroke={T} strokeWidth={1} />
        <path d="M-6,-4 h12 M-5.4,-8 h11" stroke="#7d4e2f" strokeWidth={0.9} />
        <path d="M-3,0 A3,3.4 0 0 1 3,0 Z" fill="#f2b04a" />
        <circle cx={0} cy={-1} r={1.6} fill="#f5d06c">
          <animate attributeName="opacity" values="1;0.5;1" dur="1.1s" repeatCount="indefinite" />
        </circle>
        {n < 3 && <Fumee x={0} y={-15} />}
      </g>
      <g transform="translate(4,3)">
        <circle r={3.6} fill="#a3814f" stroke={T} strokeWidth={0.9} />
        <path d="M-4,-3.4 L4,-3.4 L3,-5.8 L5.4,-5.8 L5.4,-7.6 L-4,-7.6 Z" fill="#4a4642" stroke={T} strokeWidth={0.8} />
        <line x1={6} y1={-9} x2={9} y2={-12} stroke="#7a5a35" strokeWidth={1.4} />
        <rect x={8} y={-14} width={3.4} height={2.6} rx={0.8} fill="#8f8a7c" stroke={T} strokeWidth={0.6} />
      </g>
      <g transform="translate(17,4)">
        <path d="M-3.6,0 L-3.6,-5 A3.6,1.4 0 0 1 3.6,-5 L3.6,0 Z" fill="#7a5a35" stroke={T} strokeWidth={0.8} />
        <ellipse cx={0} cy={-5} rx={3.6} ry={1.4} fill="#5f88a8" stroke={T} strokeWidth={0.7} />
      </g>
      {n >= 2 && (
        <g transform="translate(-28,-1)">
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${-4 + (i % 2) * 2},${-i * 2.8} l8,0 l-1.6,-2.4 l-4.8,0 Z`} fill="#d9b25a" stroke="#a3822e" strokeWidth={0.7} />
          ))}
        </g>
      )}
      {n >= 3 && <Ratelier x={26} y={-6} />}
      {n >= 4 && (
        <g>
          <g transform="translate(-30,10)">
            <path d="M-6,0 L-4.6,-11 L4.6,-11 L6,0 Z" fill="#a3673f" stroke={T} strokeWidth={1} />
            <path d="M-2.6,0 A2.6,3 0 0 1 2.6,0 Z" fill="#f2b04a" />
          </g>
          <g transform="translate(36,4)">
            <line x1={0} y1={0} x2={0} y2={-12} stroke="#7a5a35" strokeWidth={1.6} />
            <path d="M-4,-12 Q0,-15 4,-12 L3.4,-5.4 Q0,-3.4 -3.4,-5.4 Z" fill="#d9b25a" stroke="#8c6b3f" strokeWidth={0.9} />
          </g>
          <circle cx={-8} cy={-9} r={0.9} fill="#f5d06c">
            <animate attributeName="cy" values="-9;-18" dur="1.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0" dur="1.3s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </g>
  )
}

// ── CASERNE ──────────────────────────────────────────────────────────────────
function Mannequin({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={-11} stroke="#7a5a35" strokeWidth={2.2} />
      <line x1={-6} y1={-7.5} x2={6} y2={-7.5} stroke="#7a5a35" strokeWidth={1.8} />
      <circle cx={0} cy={-13.4} r={2.6} fill="#c9b696" stroke={T} strokeWidth={0.8} />
      <path d="M-2.6,-13.8 A2.6,2.6 0 0 1 2.6,-13.8" fill="#8f8a7c" />
      <circle cx={-6} cy={-7.5} r={2.8} fill="#8c6b3f" stroke="#5d4a33" strokeWidth={0.8} />
    </g>
  )
}

function Cible({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={-3.5} y1={0} x2={0} y2={-4} stroke="#7a5a35" strokeWidth={1.3} />
      <line x1={3.5} y1={0} x2={0} y2={-4} stroke="#7a5a35" strokeWidth={1.3} />
      <circle cx={0} cy={-9} r={5} fill="#ece5d2" stroke={T} strokeWidth={0.8} />
      <circle cx={0} cy={-9} r={3} fill="#c0563f" />
      <circle cx={0} cy={-9} r={1.2} fill="#ece5d2" />
      <line x1={1} y1={-9.6} x2={5} y2={-13} stroke="#5d4a33" strokeWidth={0.9} />
    </g>
  )
}

function Caserne({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={44} ry={14} fill="#c2a76f" />
      <ellipse cx={-12} cy={4} rx={24} ry={8.5} fill="#cdb27c" opacity={0.8} />
      <Mannequin x={-28} y={0} />
      <Mannequin x={-16} y={6} />
      <Ratelier x={-2} y={2} />
      {n === 1 && <Tente x={22} y={-2} w={26} h={16} c="#a8b090" />}
      {n === 2 && (
        <g transform="translate(24,-2)">
          <OmbreSol rx={16} ry={5.2} dx={5} />
          <Batisse w={30} h={13} g={8} mur="url(#p-bois)" toit="chaume" enfants={<Porte w={6.5} h={9.5} />} />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(24,-4)">
          <OmbreSol rx={18} ry={5.6} dx={5} />
          <Batisse
            w={34}
            h={16}
            g={9}
            mur="url(#p-pierre)"
            enfants={
              <>
                <Porte w={7} h={11} />
                <Fenetre x={-9} y={-4} w={4} h={4.6} />
                <Fenetre x={9} y={-4} w={4} h={4.6} />
              </>
            }
          />
          <g transform="translate(21,2)">
            <line x1={0} y1={0} x2={0} y2={-30} stroke="#5d4a33" strokeWidth={1.8} />
            <path d="M0,-30 L11,-26 L0,-22 Z" fill="#b3543f" stroke={T} strokeWidth={0.7} />
          </g>
        </g>
      )}
      {n >= 2 && <Cible x={-38} y={12} />}
      {n >= 2 && (
        <g transform="translate(8,14)">
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={i * 6} cy={0} r={3.2} fill="#8c6b3f" stroke="#5d4a33" strokeWidth={0.9} />
          ))}
        </g>
      )}
      {n >= 4 && (
        <g transform="translate(46,-14)">
          <OmbreSol rx={9} ry={3.4} dx={3.5} />
          <Tourelle w={15} h={24} mur="url(#p-pierre)" creneaux />
          <Banniere x={0} y={-36} c="#c9a441" />
        </g>
      )}
      {n >= 4 && <Feu x={-6} y={16} r={2.4} />}
    </g>
  )
}

// ── PORT ─────────────────────────────────────────────────────────────────────
function Barque({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-11,0 Q0,5.5 13,0 L9,-3.4 L-8,-3.4 Z" fill="#8a6231" stroke={T} strokeWidth={0.9} />
      <line x1={-6} y1={-3.4} x2={-6} y2={-1} stroke="#5d4a33" strokeWidth={0.9} />
      <line x1={2} y1={-3.4} x2={2} y2={-1} stroke="#5d4a33" strokeWidth={0.9} />
    </g>
  )
}

function Voilier({ x = 0, y = 0, s = 1, voileRouge }: { x?: number; y?: number; s?: number; voileRouge?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-16,0 Q0,7 19,0 L13,-4.6 L-12,-4.6 Z" fill="#93714a" stroke={T} strokeWidth={1} />
      <circle cx={-9.5} cy={-2.2} r={1.3} fill="#ece5d2" stroke={T} strokeWidth={0.5} />
      <line x1={1} y1={-4.6} x2={1} y2={-22} stroke="#5d4a33" strokeWidth={1.8} />
      <line x1={-8} y1={-19} x2={10} y2={-19} stroke="#5d4a33" strokeWidth={1.1} />
      <path d="M-7.4,-18.4 Q1,-13 9.4,-18.4 L9.4,-6.5 Q1,-9.5 -7.4,-6.5 Z" fill={voileRouge ? '#c96a52' : '#efe9db'} stroke={T} strokeWidth={0.8} />
      {voileRouge && <path d="M-5,-13 h10" stroke="#8a3f30" strokeWidth={1} />}
    </g>
  )
}

function Trireme({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-26,0 Q0,8 28,0 L30,-3 L22,-6 L-20,-6 L-28,-2.6 Z" fill="#8a6231" stroke={T} strokeWidth={1} />
      <path d="M-28,-2.6 L-33,-4.6 L-28,-5.4" fill="#75583a" stroke={T} strokeWidth={0.9} />
      <circle cx={-22} cy={-4} r={1.7} fill="#ece5d2" stroke={T} strokeWidth={0.6} />
      <circle cx={-22} cy={-4} r={0.7} fill="#1d3348" />
      {[-14, -7, 0, 7, 14].map((ox) => (
        <circle key={ox} cx={ox} cy={-5.4} r={2.2} fill={ox % 2 ? '#c9a441' : '#8c6b3f'} stroke="#5d4a33" strokeWidth={0.7} />
      ))}
      {[-16, -9, -2, 5, 12].map((ox) => (
        <line key={ox} x1={ox} y1={0} x2={ox - 3} y2={4.6} stroke="#5d4a33" strokeWidth={1} />
      ))}
      <line x1={2} y1={-6} x2={2} y2={-24} stroke="#5d4a33" strokeWidth={1.8} />
      <path d="M-6,-21 Q2,-16.6 10,-21 L10,-9.5 Q2,-12 -6,-9.5 Z" fill="#c96a52" stroke={T} strokeWidth={0.8} />
    </g>
  )
}

function Port({ n }: { n: number }) {
  return (
    <g>
      <ellipse cx={14} cy={-4} rx={34} ry={11} fill="#d3bd8c" opacity={0.75} />
      {n < 2 ? (
        <g transform="rotate(19)">
          <rect x={-38} y={-4} width={44} height={7} rx={1.4} fill="url(#p-bois)" stroke={T} strokeWidth={1} />
          {[-32, -20, -8].map((px) => (
            <g key={px}>
              <line x1={px} y1={3} x2={px} y2={8} stroke="#5d4a33" strokeWidth={2.2} />
              <circle cx={px} cy={2.4} r={1.4} fill="#75583a" stroke={T} strokeWidth={0.6} />
            </g>
          ))}
        </g>
      ) : (
        <g transform="rotate(17)">
          <rect x={-44} y={-6} width={52} height={9} fill="url(#p-pierre)" stroke={T} strokeWidth={1.1} />
          <rect x={-44} y={3} width={52} height={3} fill="#a89f8c" stroke={T} strokeWidth={0.8} />
          {[-38, -24, -10].map((px) => (
            <rect key={px} x={px} y={-9.4} width={3.4} height={4} rx={1} fill="#75583a" stroke={T} strokeWidth={0.7} />
          ))}
        </g>
      )}
      <g transform="translate(30,-12)">
        <line x1={-8} y1={8} x2={-8} y2={-4} stroke="#7a5a35" strokeWidth={1.4} />
        <line x1={6} y1={8} x2={6} y2={-4} stroke="#7a5a35" strokeWidth={1.4} />
        <path d="M-8,-3 Q-1,0 6,-3 L6,4 Q-1,7 -8,4 Z" fill="none" stroke="#8c8270" strokeWidth={0.7} />
        <path d="M-8,0 Q-1,3 6,0 M-5,-3.6 L-5,4.6 M-1,-2.6 L-1,5.6 M3,-3.2 L3,5" stroke="#8c8270" strokeWidth={0.6} fill="none" />
      </g>
      {n === 1 && <Barque x={-34} y={24} />}
      {n === 2 && <Voilier x={-36} y={26} s={0.95} />}
      {n === 3 && <Voilier x={-38} y={28} voileRouge />}
      {n >= 4 && <Trireme x={-40} y={30} />}
      {n >= 3 && <Barque x={-12} y={34} s={0.8} />}
      <Caisse x={12} y={-2} />
      <Amphore x={19} y={-1} s={0.9} />
      <Amphore x={23} y={1} c="#8c552f" s={0.8} />
      {n >= 2 && <Sac x={7} y={2} />}
      {n >= 2 && (
        <g transform="translate(38,2)">
          <circle r={3.2} fill="none" stroke="#a3894a" strokeWidth={2.2} />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(30,-24)">
          <OmbreSol rx={15} ry={5} dx={4.5} />
          <Batisse w={28} h={13} g={7.5} mur="url(#p-torchis)" enfants={<rect x={-5} y={-9} width={10} height={9} fill="#5d4426" stroke={T} strokeWidth={0.8} />} />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(54,-6)">
          <OmbreSol rx={7} ry={2.8} dx={3} />
          <Tourelle w={11} h={n >= 4 ? 30 : 22} mur="url(#p-pierre)" />
          <Feu x={0} y={n >= 4 ? -40 : -32} r={2.6} />
        </g>
      )}
      {n >= 4 && (
        <g>
          <Caisse x={4} y={8} s={1.1} />
          <Caisse x={12} y={10} s={0.9} />
          <Amphore x={30} y={6} />
          <Banniere x={62} y={-2} c="#4fa3a5" />
        </g>
      )}
    </g>
  )
}

// ── Sélecteur ────────────────────────────────────────────────────────────────
export function BatimentArt({ id, level }: { id: BuildingId; level: number }) {
  switch (id) {
    case 'agora':
      return <Agora n={level} />
    case 'temple':
      return <Temple n={level} />
    case 'maisons':
      return <Maisons n={level} />
    case 'ferme':
      return <Ferme n={level} />
    case 'scierie':
      return <Scierie n={level} />
    case 'carriere':
      return <Carriere n={level} />
    case 'forge':
      return <Forge n={level} />
    case 'caserne':
      return <Caserne n={level} />
    case 'port':
      return <Port n={level} />
    case 'remparts':
      return null // dessinés par <Murailles/>
  }
}

/** échafaudage affiché pendant un chantier */
export function Chantier() {
  return (
    <g opacity={0.95}>
      <line x1={-16} y1={4} x2={-16} y2={-22} stroke="#7a5a35" strokeWidth={2} />
      <line x1={16} y1={4} x2={16} y2={-22} stroke="#7a5a35" strokeWidth={2} />
      <line x1={-18} y1={-20} x2={18} y2={-20} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-18} y1={-8} x2={18} y2={-8} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-16} y1={-20} x2={16} y2={-8} stroke="#8a6a40" strokeWidth={1} />
      <rect x={-8} y={-2} width={12} height={5} fill="#b5af9f" stroke="#6e675c" strokeWidth={0.7} />
      <Caisse x={-12} y={3} s={0.9} />
      <Bloc x={12} y={4} w={8} h={5} />
    </g>
  )
}

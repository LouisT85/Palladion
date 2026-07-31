import { MAP } from '../../game/data'

/** teintes de tunique, précalculées : [base, flanc éclairé NW, revers ombré] */
const TUNIQUES: ReadonlyArray<readonly [string, string, string]> = [
  ['#c9b696', '#d5c4a4', '#a5906e'],
  ['#b3906b', '#c4a37d', '#8c6c4c'],
  ['#8c9a7a', '#a3ad88', '#6b7659'],
  ['#b0846a', '#c1977a', '#88614a'],
  ['#9a8ca8', '#ab9eb4', '#746881'],
]

/** villageois qui vaquent dans l'enceinte — plus nombreux quand l'ambiance est bonne */
export function Villageois({ pop, morale, now, enBataille }: { pop: number; morale: number; now: number; enBataille: boolean }) {
  if (enBataille) return null
  const n = Math.min(8, Math.max(1, Math.floor(pop / 4)))
  const visibles = morale < 15 ? 0 : morale < 40 ? Math.max(1, Math.ceil(n / 2)) : n
  const t = now / 1000
  const figs = []
  for (let i = 0; i < visibles; i++) {
    const x = MAP.mur.cx + Math.sin(t * 0.10 + i * 2.13) * (110 + (i % 3) * 45)
    const y = MAP.mur.cy + 15 + Math.sin(t * 0.067 + i * 4.71) * (60 + (i % 2) * 32)
    const [robe, robeLit, robeOmbre] = TUNIQUES[i % TUNIQUES.length]
    figs.push(
      <g
        key={i}
        style={{ transform: `translate(${x}px,${y}px)`, transition: 'transform 0.5s linear' }}
      >
        {/* ombre au sol adoucie */}
        <ellipse cx={0.5} cy={1} rx={4.4} ry={1.55} fill="#241a08" opacity={0.09} />
        <ellipse cx={0.3} cy={0.9} rx={3} ry={1.1} fill="#241a08" opacity={0.14} />
        {/* robe : flanc ouest au soleil, revers ombré, ceinture */}
        <path d="M-2.5,0 L-1.6,-7 L1.6,-7 L2.5,0 Z" fill={robe} />
        <path d="M-2.5,0 L-1.6,-7 L-0.4,-7 L-0.8,0 Z" fill={robeLit} />
        <path d="M1.6,-7 L2.5,0 L1.7,0 L1.2,-7 Z" fill={robeOmbre} opacity={0.85} />
        <path d="M-2.15,-4.4 L2.15,-4.4 L2.2,-5.2 L-2.2,-5.2 Z" fill="#5d4230" opacity={0.9} />
        {/* tête : joue est ombrée, cheveux avec reflet NW */}
        <circle cx={0} cy={-9} r={2.4} fill="#d9a97c" />
        <path d="M0.8,-11.25 A2.4,2.4 0 0 1 0.8,-6.75 A3.4,3.4 0 0 0 0.8,-11.25 Z" fill="#bd8a5c" />
        <path d="M-2.4,-9.5 A2.4,2.4 0 0 1 2.4,-9.5" fill={i % 2 ? '#5f4630' : '#4a3626'} />
        <path d="M-1.85,-10.25 A2.2,2.2 0 0 1 -0.3,-11.35" stroke="#8a6a4a" strokeWidth={0.8} fill="none" strokeLinecap="round" />
      </g>,
    )
  }
  return <g pointerEvents="none">{figs}</g>
}

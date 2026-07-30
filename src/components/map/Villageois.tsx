import { MAP } from '../../game/data'

const TUNIQUES = ['#c9b696', '#b3906b', '#8c9a7a', '#b0846a', '#9a8ca8']

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
    figs.push(
      <g
        key={i}
        style={{ transform: `translate(${x}px,${y}px)`, transition: 'transform 0.5s linear' }}
      >
        <ellipse cx={0} cy={1} rx={4} ry={1.4} fill="#000" opacity={0.15} />
        <path d="M-2.5,0 L-1.6,-7 L1.6,-7 L2.5,0 Z" fill={TUNIQUES[i % TUNIQUES.length]} />
        <circle cx={0} cy={-9} r={2.4} fill="#d9a97c" />
      </g>,
    )
  }
  return <g pointerEvents="none">{figs}</g>
}

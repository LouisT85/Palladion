import { useEffect } from 'react'
import { alea } from '../map/art'
import { useGame } from '../../game/store'

/*
 * La salve de victoire. Elle se joue PAR-DESSUS la scène et le rapport, sans
 * jamais intercepter un clic (`pointer-events: none`) : c'est une fanfare, pas
 * une fenêtre de plus à fermer. Trois secondes, puis elle s'efface d'elle-même.
 */

const DUREE_MS = 3000

/** paillettes d'or, tirées une fois pour toutes — déterministe, donc stable */
const PAILLETTES = (() => {
  const rnd = alea(1789)
  return Array.from({ length: 26 }, () => ({
    x: rnd() * 100,
    d: 1.6 + rnd() * 1.6,
    r: 2 + rnd() * 4,
    t: rnd() * 0.9,
    derive: (rnd() - 0.5) * 60,
  }))
})()

/** une branche de laurier : sept feuilles alternées le long d'une tige courbe */
function Laurier({ flip }: { flip?: boolean }) {
  return (
    <g transform={flip ? 'scale(-1,1)' : undefined}>
      <path d="M-4,42 Q-34,20 -30,-24" stroke="#4f7a3c" strokeWidth={3} fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const t = i / 6
        const x = -4 + (-26 * t) - 4 * Math.sin(t * 3)
        const y = 42 - 66 * t
        const rot = -62 + t * 26 + (i % 2 ? 26 : -12)
        return (
          <g key={i} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(0)})`}>
            <ellipse rx={11} ry={4.4} fill="#63955049" />
            <ellipse cx={-0.8} cy={-0.7} rx={9.4} ry={3.4} fill="#7fae5f" />
            <ellipse cx={-2.4} cy={-1.2} rx={5.2} ry={1.9} fill="#a6cd82" />
          </g>
        )
      })}
    </g>
  )
}

export function AnimationVictoire() {
  const v = useGame((s) => s.victoire)
  const fermer = useGame((s) => s.fermerVictoire)

  useEffect(() => {
    if (!v) return
    const id = window.setTimeout(fermer, DUREE_MS)
    return () => clearTimeout(id)
  }, [v, fermer])

  if (!v) return null

  return (
    <div className="victoire" key={v.at}>
      {/* rayons dorés, lents, qui balayent tout l'écran */}
      <svg className="victoire-rayons" viewBox="-200 -200 400 400" aria-hidden="true">
        <defs>
          <radialGradient id="vic-halo">
            <stop offset="0%" stopColor="#ffe9a8" stopOpacity={0.42} />
            <stop offset="55%" stopColor="#e8c04a" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#e8c04a" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle r={200} fill="url(#vic-halo)" />
        <g className="victoire-tourne">
          {Array.from({ length: 18 }, (_, i) => (
            <path
              key={i}
              d="M0,0 L-9,-260 L9,-260 Z"
              fill="#ffe9a8"
              opacity={i % 2 ? 0.06 : 0.11}
              transform={`rotate(${(i * 360) / 18})`}
            />
          ))}
        </g>
      </svg>

      <div className="victoire-coeur">
        <svg className="victoire-couronne" viewBox="-90 -70 180 130" aria-hidden="true">
          <Laurier />
          <Laurier flip />
          {/* le nœud de ruban qui ferme la couronne */}
          <path d="M-7,44 Q0,38 7,44 Q0,50 -7,44 Z" fill="#c9a441" />
          <path d="M-6,45 L-13,56 M6,45 L13,56" stroke="#c9a441" strokeWidth={2.6} strokeLinecap="round" />
          <text x={0} y={16} textAnchor="middle" fontSize={44} className="victoire-etoiles">
            {'★'.repeat(v.etoiles)}
          </text>
        </svg>
        <div className="victoire-mot">VICTOIRE</div>
        <div className="victoire-detail">{v.detail}</div>
      </div>

      {/* paillettes d'or qui retombent sur la scène */}
      <div className="victoire-paillettes" aria-hidden="true">
        {PAILLETTES.map((p, i) => (
          <span
            key={i}
            style={{
              left: `${p.x}%`,
              width: p.r,
              height: p.r,
              animationDuration: `${p.d}s`,
              animationDelay: `${p.t}s`,
              ['--derive' as string]: `${p.derive}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

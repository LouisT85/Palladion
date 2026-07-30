import { MAP } from '../../game/data'

/** demi-ouverture de la porte, en radians (angle 0 = est) */
const PORTE = 0.1

export interface GeoMur {
  cx: number
  cy: number
  rx: number
  ry: number
}

function pt(geo: GeoMur, a: number): { x: number; y: number } {
  return { x: geo.cx + geo.rx * Math.cos(a), y: geo.cy + geo.ry * Math.sin(a) }
}

function chemin(geo: GeoMur, a0: number, a1: number, dy = 0, n = 46): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(geo, a)
    d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${(p.y + dy).toFixed(1)}`
  }
  return d
}

function echantillons(geo: GeoMur, a0: number, a1: number, pas: number): { x: number; y: number; a: number }[] {
  const pts: { x: number; y: number; a: number }[] = []
  for (let a = a0; a <= a1 + 1e-6; a += pas) pts.push({ ...pt(geo, a), a })
  return pts
}

function Tour({ x, y, flamme }: { x: number; y: number; flamme?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-11} y={-42} width={22} height={44} fill="#c5bda9" stroke="#6e675c" strokeWidth={1.5} />
      <line x1={-11} y1={-28} x2={11} y2={-28} stroke="#6e675c" strokeWidth={0.8} opacity={0.5} />
      <line x1={-11} y1={-14} x2={11} y2={-14} stroke="#6e675c" strokeWidth={0.8} opacity={0.5} />
      {[-10, -3, 4].map((cx) => (
        <rect key={cx} x={cx} y={-48} width={6} height={7} fill="#c5bda9" stroke="#6e675c" strokeWidth={1} />
      ))}
      <line x1={0} y1={-48} x2={0} y2={-66} stroke="#5d4a33" strokeWidth={2} />
      <path d="M0,-66 L14,-61 L0,-56 Z" fill="#b3543f" />
      {flamme && (
        <circle cx={0} cy={-50} r={3} fill="#f2b04a">
          <animate attributeName="r" values="3;4;3" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  )
}

function Porte({ geo, niveau, breche }: { geo: GeoMur; niveau: number; breche: boolean }) {
  const { x, y } = pt(geo, 0)
  if (niveau <= 0) return null
  if (breche) {
    return (
      <g transform={`translate(${x},${y})`}>
        {/* décombres et vantaux brisés */}
        <ellipse cx={0} cy={6} rx={20} ry={7} fill="#8f887a" />
        <circle cx={-8} cy={3} r={5} fill="#a49c8c" />
        <circle cx={6} cy={5} r={6} fill="#978f80" />
        <circle cx={0} cy={-2} r={4} fill="#b0a89a" />
        <rect x={-16} y={-14} width={6} height={20} fill="#6f5233" transform="rotate(-35 -13 -4)" />
        <rect x={10} y={-12} width={6} height={18} fill="#6f5233" transform="rotate(28 13 -3)" />
      </g>
    )
  }
  return (
    <g transform={`translate(${x},${y})`}>
      {niveau === 1 && (
        <>
          <rect x={-13} y={-20} width={5} height={24} fill="#7a5a35" />
          <rect x={8} y={-20} width={5} height={24} fill="#7a5a35" />
          <rect x={-8} y={-14} width={16} height={18} fill="#8a6231" />
          <line x1={-3} y1={-14} x2={-3} y2={4} stroke="#6f4f28" strokeWidth={1} />
          <line x1={3} y1={-14} x2={3} y2={4} stroke="#6f4f28" strokeWidth={1} />
        </>
      )}
      {niveau === 2 && (
        <>
          <rect x={-16} y={-22} width={7} height={26} fill="#a09a8c" stroke="#6f695e" strokeWidth={1} />
          <rect x={9} y={-22} width={7} height={26} fill="#a09a8c" stroke="#6f695e" strokeWidth={1} />
          <rect x={-9} y={-16} width={18} height={20} fill="#8a6231" />
          <line x1={0} y1={-16} x2={0} y2={4} stroke="#6f4f28" strokeWidth={1.2} />
        </>
      )}
      {niveau === 3 && (
        <>
          <path d="M-15,5 L-15,-18 Q0,-32 15,-18 L15,5" fill="#b0a99b" stroke="#6e675c" strokeWidth={1.5} />
          <path d="M-9,5 L-9,-14 Q0,-24 9,-14 L9,5" fill="#7a5a35" />
          <line x1={0} y1={-20} x2={0} y2={4} stroke="#5d4426" strokeWidth={1.2} />
          <circle cx={-4} cy={-8} r={1.2} fill="#c9a441" />
          <circle cx={4} cy={-8} r={1.2} fill="#c9a441" />
          <circle cx={-4} cy={-2} r={1.2} fill="#c9a441" />
          <circle cx={4} cy={-2} r={1.2} fill="#c9a441" />
          <Tour x={-24} y={-4} />
          <Tour x={24} y={-4} />
        </>
      )}
      {niveau >= 4 && (
        <>
          <rect x={-20} y={-34} width={8} height={40} fill="#cfc7b5" stroke="#6e675c" strokeWidth={1.5} />
          <rect x={12} y={-34} width={8} height={40} fill="#cfc7b5" stroke="#6e675c" strokeWidth={1.5} />
          <rect x={-22} y={-40} width={44} height={9} fill="#d8d1c0" stroke="#6e675c" strokeWidth={1.5} />
          {/* écho de la porte des Lionnes */}
          <path d="M-8,-38 L-2,-33 L-8,-33 Z" fill="#8c8474" />
          <path d="M8,-38 L2,-33 L8,-33 Z" fill="#8c8474" />
          <path d="M-12,5 L-12,-24 Q0,-36 12,-24 L12,5" fill="#8c6b3f" stroke="#5d4a33" strokeWidth={1.5} />
          <line x1={0} y1={-28} x2={0} y2={4} stroke="#5d4426" strokeWidth={1.4} />
          {[-6, 6].map((cx) =>
            [-18, -10, -2].map((cy) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={1.3} fill="#d9b25a" />),
          )}
          <Tour x={-30} y={-4} flamme />
          <Tour x={30} y={-4} flamme />
        </>
      )}
    </g>
  )
}

interface Props {
  niveau: number
  hp: number
  max: number
  breche: boolean
  layer: 'back' | 'front'
  /** géométrie de l'enceinte — par défaut celle du village du joueur */
  geo?: GeoMur
  /** fraction d'arc dessinée (chantier en cours) — 1 = enceinte complète */
  span?: number
}

export function Murailles({ niveau, hp, max, breche, layer, geo = MAP.mur, span = 1 }: Props) {
  const a0 = layer === 'back' ? Math.PI : PORTE
  const a1Complet = layer === 'back' ? 2 * Math.PI - PORTE : Math.PI
  const a1 = a0 + (a1Complet - a0) * span

  // niveau 0 : bornes de fondation, pour situer la future enceinte
  if (niveau <= 0) {
    return (
      <g opacity={0.5}>
        {echantillons(geo, a0, a1, 0.32).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill="#8f887a" />
        ))}
      </g>
    )
  }

  const ratio = max > 0 ? hp / max : 1
  const fissures =
    ratio < 0.65
      ? [0.55, 2.6, 1.25, 3.7, 5.1, 1.9].slice(0, Math.min(6, Math.floor((1 - ratio) * 8))).filter((a) => {
          const enAvant = a > PORTE && a < Math.PI
          return layer === 'front' ? enAvant : !enAvant
        })
      : []

  return (
    <g>
      {niveau === 1 && (
        <g>
          <path d={chemin(geo, a0, a1)} stroke="#4d3a22" strokeWidth={3} fill="none" opacity={0.4} />
          {echantillons(geo, a0, a1, 0.052).map((p, i) => {
            const h = 11 + Math.sin(p.a * 13) * 2.5
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y + 3}
                x2={p.x}
                y2={p.y - h}
                stroke={i % 2 ? '#7a5a35' : '#8a6a40'}
                strokeWidth={3.4}
                strokeLinecap="round"
              />
            )
          })}
        </g>
      )}

      {niveau === 2 && (
        <g>
          <path d={chemin(geo, a0, a1)} stroke="#6f695e" strokeWidth={11} fill="none" strokeLinecap="round" />
          <path d={chemin(geo, a0, a1)} stroke="#a09a8c" strokeWidth={8} fill="none" strokeLinecap="round" />
          <path d={chemin(geo, a0, a1, -3.5)} stroke="#c2bcae" strokeWidth={1.6} fill="none" opacity={0.8} />
          <path
            d={chemin(geo, a0, a1, 1)}
            stroke="#7c766a"
            strokeWidth={1}
            fill="none"
            strokeDasharray="6 9"
            opacity={0.7}
          />
          {echantillons(geo, a0 + 0.04, a1 - 0.04, 0.11).map((p, i) => (
            <line
              key={i}
              x1={p.x}
              y1={p.y - 3}
              x2={p.x}
              y2={p.y - 11}
              stroke="#7a5a35"
              strokeWidth={2.6}
              strokeLinecap="round"
            />
          ))}
        </g>
      )}

      {niveau === 3 && (
        <g>
          <path d={chemin(geo, a0, a1)} stroke="#6e675c" strokeWidth={14} fill="none" strokeLinecap="round" />
          <path d={chemin(geo, a0, a1)} stroke="#b0a99b" strokeWidth={11} fill="none" strokeLinecap="round" />
          <path d={chemin(geo, a0, a1, -4.5)} stroke="#cfc8ba" strokeWidth={2} fill="none" opacity={0.85} />
          <path
            d={chemin(geo, a0, a1, 1.5)}
            stroke="#847d70"
            strokeWidth={1.2}
            fill="none"
            strokeDasharray="8 10"
            opacity={0.7}
          />
          {echantillons(geo, a0 + 0.03, a1 - 0.03, 0.055).map((p, i) => (
            <rect key={i} x={p.x - 2.6} y={p.y - 14} width={5.2} height={5.5} fill="#b0a99b" stroke="#6e675c" strokeWidth={0.8} />
          ))}
        </g>
      )}

      {niveau >= 4 && (
        <g>
          <path d={chemin(geo, a0, a1)} stroke="#6e675c" strokeWidth={20} fill="none" strokeLinecap="round" />
          <path d={chemin(geo, a0, a1)} stroke="#cfc7b5" strokeWidth={16} fill="none" strokeLinecap="round" />
          <path d={chemin(geo, a0, a1, -6.5)} stroke="#e2dbc9" strokeWidth={2.4} fill="none" opacity={0.9} />
          <path
            d={chemin(geo, a0, a1, 2)}
            stroke="#918a7b"
            strokeWidth={1.4}
            fill="none"
            strokeDasharray="10 12"
            opacity={0.7}
          />
          <path
            d={chemin(geo, a0, a1, 6)}
            stroke="#918a7b"
            strokeWidth={1.2}
            fill="none"
            strokeDasharray="12 10"
            opacity={0.55}
          />
          {echantillons(geo, a0 + 0.025, a1 - 0.025, 0.045).map((p, i) => (
            <rect key={i} x={p.x - 3} y={p.y - 17} width={6} height={6.5} fill="#cfc7b5" stroke="#6e675c" strokeWidth={0.8} />
          ))}
          {(layer === 'front' ? [0.85, 2.29] : [3.99, 5.43])
            .filter((a) => a <= a1)
            .map((a) => {
              const p = pt(geo, a)
              return <Tour key={a} x={p.x} y={p.y} flamme />
            })}
        </g>
      )}

      {/* fissures selon l'état des remparts */}
      {fissures.map((a, i) => {
        const p = pt(geo, a)
        return (
          <path
            key={i}
            d={`M${p.x},${p.y - 10} l2.5,4 l-3.5,3 l2.5,4 l-1.5,3`}
            stroke="#4a4238"
            strokeWidth={1.6}
            fill="none"
          />
        )
      })}
      {ratio < 0.3 && layer === 'front' && (
        <g fill="#8f887a" opacity={0.9}>
          <circle cx={pt(geo, 0.7).x + 6} cy={pt(geo, 0.7).y + 8} r={4} />
          <circle cx={pt(geo, 2.4).x - 4} cy={pt(geo, 2.4).y + 9} r={3} />
        </g>
      )}

      {layer === 'front' && span >= 1 && <Porte geo={geo} niveau={niveau} breche={breche} />}
    </g>
  )
}

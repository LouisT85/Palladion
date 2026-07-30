import type { BattleState, Fighter } from '../../game/types'

// ── Figurines (Bonhomme est réutilisé par la garnison en temps de paix) ──────
export function Bonhomme({
  tunique,
  arme,
  taille = 1,
  crete,
}: {
  tunique: string
  arme: 'lance' | 'arc' | 'dague' | 'bouclier-lourd'
  taille?: number
  crete?: boolean
}) {
  return (
    <g transform={`scale(${taille})`}>
      <ellipse cx={0} cy={1} rx={5} ry={1.8} fill="#000" opacity={0.18} />
      {/* jambes */}
      <line x1={-1.6} y1={0} x2={-1.6} y2={-4} stroke="#d9a97c" strokeWidth={1.6} />
      <line x1={1.6} y1={0} x2={1.6} y2={-4} stroke="#c99a6e" strokeWidth={1.6} />
      {/* tunique */}
      <path d="M-3,-4 L-2.2,-11 L2.2,-11 L3,-4 Z" fill={tunique} />
      {/* tête + casque */}
      <circle cx={0} cy={-13} r={2.7} fill="#d9a97c" />
      <path d="M-2.7,-13.5 A2.7,2.7 0 0 1 2.7,-13.5" fill="#8f8a7c" />
      {crete && <path d="M-2.5,-16 Q0,-19.5 2.5,-16" stroke="#b3543f" strokeWidth={2} fill="none" />}
      {/* arme (à droite) */}
      {arme === 'lance' && <line x1={4} y1={2} x2={7} y2={-18} stroke="#7a5a35" strokeWidth={1.2} />}
      {arme === 'lance' && <path d="M7,-18 l0.9,-3 l1.3,2.6 Z" fill="#c9a441" />}
      {arme === 'dague' && <line x1={4} y1={-8} x2={7.5} y2={-11} stroke="#9aa0a8" strokeWidth={1.4} />}
      {arme === 'arc' && <path d="M4.5,-15 Q9,-9.5 4.5,-4" stroke="#7a5a35" strokeWidth={1.3} fill="none" />}
      {arme === 'arc' && <line x1={4.5} y1={-15} x2={4.5} y2={-4} stroke="#e0d9c8" strokeWidth={0.5} />}
      {/* bouclier (à gauche) */}
      {arme === 'lance' && <circle cx={-4} cy={-8} r={3.2} fill="#8c6b3f" stroke="#5d4a33" strokeWidth={0.7} />}
      {arme === 'bouclier-lourd' && (
        <circle cx={-4} cy={-8} r={4.5} fill="#c9a441" stroke="#8c6b3f" strokeWidth={1} />
      )}
    </g>
  )
}

function Belier() {
  return (
    <g>
      <ellipse cx={0} cy={2} rx={16} ry={3} fill="#000" opacity={0.18} />
      {/* charpente */}
      <line x1={-12} y1={0} x2={-9} y2={-14} stroke="#7a5a35" strokeWidth={2.4} />
      <line x1={12} y1={0} x2={9} y2={-14} stroke="#7a5a35" strokeWidth={2.4} />
      <path d="M-13,-13 L0,-18 L13,-13 Z" fill="#8c6f4e" stroke="#5d4a33" strokeWidth={1} />
      {/* tronc suspendu */}
      <rect x={-15} y={-10} width={30} height={5} rx={2.5} fill="#8a6231" stroke="#5d4a33" strokeWidth={1}>
        <animateTransform attributeName="transform" type="translate" values="0,0;-4,0;0,0" dur="1s" repeatCount="indefinite" />
      </rect>
      <circle cx={-15} cy={-7.5} r={3} fill="#9aa0a8" />
      {/* porteurs */}
      <line x1={-8} y1={0} x2={-8} y2={-5} stroke="#7d3b32" strokeWidth={2.2} />
      <line x1={0} y1={0} x2={0} y2={-5} stroke="#7d3b32" strokeWidth={2.2} />
      <line x1={8} y1={0} x2={8} y2={-5} stroke="#7d3b32" strokeWidth={2.2} />
    </g>
  )
}

interface Look {
  tunique: string
  arme: 'lance' | 'arc' | 'dague' | 'bouclier-lourd'
  taille: number
  crete?: boolean
}

/** allure par type — la couleur de tunique dépend du camp du joueur */
function lookDe(f: Fighter, estJoueur: boolean): Look | 'belier' {
  switch (f.type) {
    case 'belier':
      return 'belier'
    case 'pillard':
      return { tunique: '#7d5a44', arme: 'dague', taille: 0.95 }
    case 'guerrier':
      return { tunique: '#7d3b32', arme: 'lance', taille: 1.05 }
    case 'mercenaire':
      return { tunique: '#5a3140', arme: 'bouclier-lourd', taille: 1.2, crete: true }
    case 'lancier':
      return { tunique: estJoueur ? '#3e5a7a' : '#8a4636', arme: 'lance', taille: 1 }
    case 'archer':
      return { tunique: estJoueur ? '#4a6a5a' : '#7d5a44', arme: 'arc', taille: 0.95 }
    case 'hoplite':
      return { tunique: estJoueur ? '#31506e' : '#6e3348', arme: 'bouclier-lourd', taille: 1.15, crete: true }
  }
}

/** dépouille : la figurine couchée, qui s'efface doucement */
function Depouille({ f, campJoueur, now }: { f: Fighter; campJoueur: 'attaque' | 'defense'; now: number }) {
  const t = (now - (f.mortAt ?? now)) / 3800
  const look = lookDe(f, f.camp === campJoueur)
  const contenu = look === 'belier' ? <Belier /> : <Bonhomme {...look} />
  return (
    <g transform={`translate(${f.x},${f.y})`} opacity={Math.max(0, 0.75 * (1 - t))}>
      <g transform={`rotate(${f.camp === 'attaque' ? 78 : -78})`}>{contenu}</g>
    </g>
  )
}

function FigurineCombattant({ f, campJoueur }: { f: Fighter; campJoueur: 'attaque' | 'defense' }) {
  const estJoueur = f.camp === campJoueur
  const look = lookDe(f, estJoueur)
  const versLaGauche = f.camp === 'attaque'
  const contenu = look === 'belier' ? <Belier /> : <Bonhomme {...look} />
  const blesse = f.hp < f.maxHp && f.hp > 0
  return (
    <g style={{ transform: `translate(${f.x}px,${f.y}px)`, transition: 'transform 0.28s linear' }}>
      <g transform={versLaGauche ? 'scale(-1,1)' : undefined}>{contenu}</g>
      {blesse && (
        <g transform="translate(0,-22)">
          <rect x={-7} y={0} width={14} height={2.4} rx={1.2} fill="#2b2b2b" opacity={0.7} />
          <rect
            x={-7}
            y={0}
            width={Math.max(1, 14 * (f.hp / f.maxHp))}
            height={2.4}
            rx={1.2}
            fill={estJoueur ? '#3f9d63' : '#c0563f'}
          />
        </g>
      )}
    </g>
  )
}

// ── Couche bataille ──────────────────────────────────────────────────────────
export function BatailleLayer({
  battle,
  now,
  wallHp,
  wallMax,
}: {
  battle: BattleState
  now: number
  wallHp: number
  wallMax: number
}) {
  const vivants = battle.fighters.filter((f) => f.etat !== 'mort')
  const tries = [...vivants].sort((a, b) => a.y - b.y)
  const depouilles = battle.fighters.filter(
    (f) => f.etat === 'mort' && f.hp <= 0 && f.mortAt !== undefined && now - f.mortAt < 3800,
  )
  const porte = battle.geo.porte

  return (
    <g>
      {depouilles.map((f) => (
        <Depouille key={f.id} f={f} campJoueur={battle.campJoueur} now={now} />
      ))}
      {tries.map((f) => (
        <FigurineCombattant key={f.id} f={f} campJoueur={battle.campJoueur} />
      ))}

      {/* flèches */}
      {battle.projectiles.map((p) => (
        <g key={p.id}>
          <g>
            <animateMotion dur={`${p.dur}ms`} path={`M${p.x0},${p.y0} L${p.x1},${p.y1}`} fill="freeze" rotate="auto" />
            <line x1={-4} y1={0} x2={4} y2={0} stroke="#5d4a33" strokeWidth={1.4} />
            <path d="M4,0 l-2,-1.3 M4,0 l-2,1.3" stroke="#5d4a33" strokeWidth={1} />
          </g>
        </g>
      ))}

      {/* effets divins et brèches */}
      {battle.effects.map((e) => {
        if (e.type === 'foudre') {
          return (
            <g key={e.id} opacity={Math.max(0, (e.until - now) / 900)}>
              <path
                d={`M${e.x + 4},${e.y - 120} L${e.x - 5},${e.y - 62} L${e.x + 3},${e.y - 58} L${e.x - 2},${e.y}`}
                stroke="#f5d06c"
                strokeWidth={3}
                fill="none"
              />
              <circle cx={e.x} cy={e.y} r={9} fill="#f5d06c" opacity={0.5} />
            </g>
          )
        }
        if (e.type === 'benediction') {
          return (
            <circle key={e.id} cx={e.x} cy={e.y} r={20} fill="none" stroke="#4fa3a5" strokeWidth={3} opacity={Math.max(0, (e.until - now) / 2000)}>
              <animate attributeName="r" values="8;42" dur="2s" fill="freeze" />
            </circle>
          )
        }
        if (e.type === 'impact') {
          const t = Math.max(0, (e.until - now) / 260)
          return (
            <g key={e.id} transform={`translate(${e.x},${e.y}) scale(${1.4 - t * 0.5})`} opacity={t}>
              <path d="M0,-4.5 L1.1,-1.1 L4.5,0 L1.1,1.1 L0,4.5 L-1.1,1.1 L-4.5,0 L-1.1,-1.1 Z" fill="#ffe9a8" stroke="#e8913c" strokeWidth={0.6} />
            </g>
          )
        }
        if (e.type === 'poussiere') {
          const t = Math.max(0, (e.until - now) / 650)
          return (
            <g key={e.id} opacity={t * 0.7} fill="#c9bfa4">
              <circle cx={e.x - 3} cy={e.y} r={4 + (1 - t) * 5} />
              <circle cx={e.x + 4} cy={e.y - 3} r={3 + (1 - t) * 4} opacity={0.8} />
            </g>
          )
        }
        // brèche : nuage de poussière
        return (
          <g key={e.id} opacity={Math.max(0, (e.until - now) / 4000)} fill="#b5ab93">
            <circle cx={e.x - 8} cy={e.y - 6} r={8} opacity={0.7}>
              <animate attributeName="r" values="6;14" dur="2.5s" fill="freeze" />
            </circle>
            <circle cx={e.x + 7} cy={e.y - 10} r={6} opacity={0.6}>
              <animate attributeName="r" values="5;12" dur="2.5s" fill="freeze" />
            </circle>
          </g>
        )
      })}

      {/* jauge des remparts pendant l'assaut */}
      {wallMax > 0 && (
        <g transform={`translate(${porte.x - 30},${porte.y - 60})`}>
          <rect x={0} y={0} width={60} height={7} rx={3.5} fill="#1d1d1d" opacity={0.75} />
          <rect x={1} y={1} width={Math.max(2, 58 * (wallHp / wallMax))} height={5} rx={2.5} fill={wallHp / wallMax > 0.4 ? '#8f9d5a' : '#c0563f'} />
          <text x={30} y={-4} textAnchor="middle" fontSize={10} fill="#f0e8d8" fontWeight={700} style={{ paintOrder: 'stroke' }} stroke="#00000088" strokeWidth={2}>
            🧱 {Math.ceil(wallHp)}
          </text>
        </g>
      )}
    </g>
  )
}

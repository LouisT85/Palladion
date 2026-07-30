import { BUILDINGS, BUILDING_IDS, DAY_MS, MAP, WALL_HP } from '../../game/data'
import { useGame } from '../../game/store'
import type { BuildingId } from '../../game/types'
import { BatimentArt, Chantier, DefsBatiments } from './Batiments'
import { Ouvriers, Porteurs } from './Ouvriers'
import { BatailleLayer } from './BatailleLayer'
import { Murailles } from './Murailles'
import { Terrain, Vignette, VoileJourNuit, phaseJour } from './Terrain'
import { Villageois } from './Villageois'

function Emplacement({ id, now, paisible }: { id: BuildingId; now: number; paisible?: boolean }) {
  const def = BUILDINGS[id]
  const b = useGame((s) => s.buildings[id])
  const selected = useGame((s) => s.selected)
  const select = useGame((s) => s.select)
  if (id === 'remparts') return null

  const enChantier = b.targetLevel !== undefined && b.busyUntil !== undefined
  let progress = 0
  if (enChantier && b.targetLevel !== undefined && b.busyUntil !== undefined) {
    const dur = def.times[b.targetLevel - 1] * 1000
    progress = Math.max(0, Math.min(1, 1 - (b.busyUntil - now) / dur))
  }

  return (
    <g
      transform={`translate(${def.pos.x},${def.pos.y})`}
      onClick={(e) => {
        e.stopPropagation()
        select(id)
      }}
      style={{ cursor: 'pointer' }}
    >
      <title>{`${def.nom} — niveau ${b.level}`}</title>
      {selected === id && (
        <ellipse cx={0} cy={4} rx={46} ry={16} fill="none" stroke="#e8c04a" strokeWidth={2} strokeDasharray="6 5" opacity={0.9} />
      )}
      {b.level === 0 && !enChantier ? (
        <g opacity={0.7}>
          <ellipse cx={0} cy={2} rx={34} ry={12} fill="#00000018" stroke="#5f584a" strokeWidth={1.4} strokeDasharray="5 5" />
          <text x={0} y={2} textAnchor="middle" fontSize={19}>
            {def.emoji}
          </text>
          <text x={0} y={17} textAnchor="middle" fontSize={9.5} fill="#3d3a30" fontWeight={700} letterSpacing={0.5}>
            ＋ CONSTRUIRE
          </text>
        </g>
      ) : (
        <g>
          {b.level > 0 && (
            <g transform="scale(1.18)" filter="url(#ombre-batiment)">
              <BatimentArt id={id} level={b.level} />
              {paisible && <Ouvriers id={id} level={b.level} />}
            </g>
          )}
          {enChantier && (
            <g>
              {b.level === 0 && <ellipse cx={0} cy={2} rx={26} ry={9} fill="#c2a76f" opacity={0.8} />}
              <Chantier />
              <g transform="translate(0,-36)">
                <rect x={-22} y={0} width={44} height={6} rx={3} fill="#1d1d1d" opacity={0.7} />
                <rect x={-21} y={1} width={Math.max(2, 42 * progress)} height={4} rx={2} fill="#e8c04a" />
              </g>
            </g>
          )}
        </g>
      )}
      {/* zone cliquable généreuse */}
      <ellipse cx={0} cy={-4} rx={44} ry={26} fill="transparent" />
    </g>
  )
}

export function VillageMap() {
  const battle = useGame((s) => s.battle)
  const warned = useGame((s) => s.warned)
  const wallLevel = useGame((s) => s.buildings.remparts.level)
  const rempartsChantier = useGame((s) => s.buildings.remparts.targetLevel !== undefined)
  const wallHp = useGame((s) => s.wallHp)
  const pop = useGame((s) => s.pop)
  const morale = useGame((s) => s.morale)
  const createdAt = useGame((s) => s.createdAt)
  const lastSeen = useGame((s) => s.lastSeen)
  const select = useGame((s) => s.select)
  const selected = useGame((s) => s.selected)

  const scierieLvl = useGame((s) => s.buildings.scierie.level)
  const fermeLvl = useGame((s) => s.buildings.ferme.level)
  const carriereLvl = useGame((s) => s.buildings.carriere.level)

  const now = lastSeen // rafraîchi par le tick
  const phase = phaseJour(now, createdAt, DAY_MS)
  const wallMax = WALL_HP[wallLevel]
  const paisible = battle === null && !warned

  // ordre du peintre : nord (hors les murs) → mur arrière → intérieur → mur avant → sud
  const dedans = BUILDING_IDS.filter((b) => b !== 'remparts' && BUILDINGS[b].interieur).sort(
    (a, b) => BUILDINGS[a].pos.y - BUILDINGS[b].pos.y,
  )

  return (
    <svg
      viewBox={`0 0 ${MAP.w} ${MAP.h}`}
      className="carte"
      onClick={() => select(null)}
      role="img"
      aria-label="Carte du village"
    >
      <defs>
        <clipPath id="cadre-carte">
          <rect x={0} y={0} width={MAP.w} height={MAP.h} rx={16} />
        </clipPath>
        <filter id="ombre-batiment" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx={0} dy={1.6} stdDeviation={1.4} floodColor="#1d1508" floodOpacity={0.3} />
        </filter>
        <DefsBatiments />
      </defs>

      <g clipPath="url(#cadre-carte)">
        <Terrain phase={phase} paisible={paisible} />

        <Porteurs scierie={scierieLvl > 0} ferme={fermeLvl > 0} carriere={carriereLvl > 0} actif={paisible} />

        <Emplacement id="carriere" now={now} paisible={paisible} />
        <Emplacement id="scierie" now={now} paisible={paisible} />

        <Murailles niveau={wallLevel} hp={wallHp} max={wallMax} breche={battle?.breche ?? false} layer="back" />

        {dedans.map((b) => (
          <Emplacement key={b} id={b} now={now} paisible={paisible} />
        ))}

        <Villageois pop={pop} morale={morale} now={now} enBataille={battle !== null} />

        <Murailles niveau={wallLevel} hp={wallHp} max={wallMax} breche={battle?.breche ?? false} layer="front" />

        {/* zone cliquable des remparts (sur la porte) */}
        <g
          transform={`translate(${MAP.porte.x},${MAP.porte.y})`}
          onClick={(e) => {
            e.stopPropagation()
            select('remparts')
          }}
          style={{ cursor: 'pointer' }}
        >
          <title>{`Remparts — niveau ${wallLevel}`}</title>
          {selected === 'remparts' && (
            <ellipse cx={0} cy={-6} rx={50} ry={30} fill="none" stroke="#e8c04a" strokeWidth={2} strokeDasharray="6 5" />
          )}
          {wallLevel === 0 && !rempartsChantier && !battle && (
            <g opacity={0.8}>
              <text x={0} y={-8} textAnchor="middle" fontSize={19}>
                🧱
              </text>
              <text x={0} y={8} textAnchor="middle" fontSize={9.5} fill="#3d3a30" fontWeight={700}>
                ＋ REMPARTS
              </text>
            </g>
          )}
          <ellipse cx={0} cy={-6} rx={48} ry={30} fill="transparent" />
        </g>

        <Emplacement id="ferme" now={now} paisible={paisible} />
        <Emplacement id="port" now={now} paisible={paisible} />

        {battle && <BatailleLayer battle={battle} now={now} wallHp={wallHp} wallMax={wallMax} />}

        <Vignette />
        <VoileJourNuit phase={phase} />
      </g>

      {/* cadre doré */}
      <rect x={2.5} y={2.5} width={MAP.w - 5} height={MAP.h - 5} rx={15} fill="none" stroke="#8c6f2e" strokeWidth={4} />
      <rect x={9} y={9} width={MAP.w - 18} height={MAP.h - 18} rx={10} fill="none" stroke="#e0bc5c" strokeWidth={1.4} opacity={0.65} />
      {[
        [16, 16],
        [MAP.w - 16, 16],
        [16, MAP.h - 16],
        [MAP.w - 16, MAP.h - 16],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <rect x={-5} y={-5} width={10} height={10} fill="none" stroke="#e0bc5c" strokeWidth={1.4} opacity={0.8} transform="rotate(45)" />
          <circle r={1.6} fill="#e0bc5c" opacity={0.8} />
        </g>
      ))}
    </svg>
  )
}

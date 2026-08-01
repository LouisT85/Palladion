import { useRef, useState } from 'react'
import { BUILDINGS, BUILDING_IDS, DAY_MS, MAP, TOUR_ANGLES, TOUR_PORTEE, WALL_HP, pointMur } from '../../game/data'
import { useGame } from '../../game/store'
import type { BuildingId } from '../../game/types'
import { DefsArt } from './art'
import { BatimentArt, Chantier, DefsBatiments } from './Batiments'
import { Batisseur, Ouvriers, Porteurs } from './Ouvriers'
import { BatailleLayer, useCameraBataille, type VueScene } from './BatailleLayer'
import { Meteo, VoileSaison } from './Ciel'
import { Garnison } from './Garnison'
import { Murailles } from './Murailles'
import { Terrain, Vignette, VoileJourNuit, phaseJour } from './Terrain'
import { Villageois } from './Villageois'

/** stade d'un chantier : 0 = fondations, puis paliers à 25 / 50 / 75 % de la durée */
function stadeChantier(progress: number): number {
  return progress < 0.25 ? 0 : progress < 0.5 ? 1 : progress < 0.75 ? 2 : 3
}
/** hauteur bâtie à chaque stade (fraction de la hauteur finale) */
const STADES_H = [0, 0.4, 0.7, 1]

/** étiquette semi-transparente affichée au survol d'un bâtiment */
function Etiquette({ texte, y }: { texte: string; y: number }) {
  const w = texte.length * 6.6 + 22
  return (
    <g className="etq" transform={`translate(0,${y})`} pointerEvents="none">
      <rect x={-w / 2} y={-14} width={w} height={21} rx={9.5} fill="#0d1722" opacity={0.82} stroke="#e0bc5c" strokeOpacity={0.4} />
      <text x={0} y={1} textAnchor="middle" fontSize={11.5} fill="#f0e8d8" fontWeight={600}>
        {texte}
      </text>
    </g>
  )
}

function Emplacement({ id, now, paisible }: { id: BuildingId; now: number; paisible?: boolean }) {
  const def = BUILDINGS[id]
  const b = useGame((s) => s.buildings[id])
  const selected = useGame((s) => s.selected)
  const select = useGame((s) => s.select)
  const [hover, setHover] = useState(false)
  if (id === 'remparts') return null

  const enChantier = b.targetLevel !== undefined && b.busyUntil !== undefined
  let progress = 0
  if (enChantier && b.targetLevel !== undefined && b.busyUntil !== undefined) {
    const dur = def.times[b.targetLevel - 1] * 1000
    progress = Math.max(0, Math.min(1, 1 - (b.busyUntil - now) / dur))
  }
  const stade = stadeChantier(progress)
  const fracH = STADES_H[stade]

  const label = enChantier
    ? `${def.emoji} ${def.nom} — niv. ${b.targetLevel} en chantier (${Math.round(progress * 100)} %)`
    : b.level === 0
      ? `${def.emoji} ${def.nom} — à construire`
      : `${def.emoji} ${def.nom} — niveau ${b.level}/4`

  return (
    <g
      transform={`translate(${def.pos.x},${def.pos.y})`}
      onClick={(e) => {
        e.stopPropagation()
        select(id)
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}
    >
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
              {paisible && !enChantier && <Ouvriers id={id} level={b.level} />}
            </g>
          )}
          {enChantier && (
            <g>
              {b.level === 0 && <ellipse cx={0} cy={2} rx={26} ry={9} fill="#c2a76f" opacity={0.8} />}
              {/* le bâtiment cible s'élève du sol par paliers (25 / 50 / 75 %) */}
              {fracH > 0 && b.targetLevel !== undefined && (
                <g transform="scale(1.18)" filter="url(#ombre-batiment)">
                  <clipPath id={`chantier-${id}`}>
                    <rect x={-135} y={30 - 108 * fracH} width={270} height={108 * fracH + 4} />
                  </clipPath>
                  <g clipPath={`url(#chantier-${id})`}>
                    <BatimentArt id={id} level={b.targetLevel} />
                  </g>
                </g>
              )}
              <Chantier />
              {/* les ouvriers à l'œuvre — un second renfort dès que les murs sortent de terre */}
              <Batisseur x={-22} y={9} />
              {stade >= 1 && <Batisseur x={20} y={5} flip begin="0.7s" />}
              <g transform="translate(0,-42)">
                <rect x={-22} y={0} width={44} height={6} rx={3} fill="#1d1d1d" opacity={0.7} />
                <rect x={-21} y={1} width={Math.max(2, 42 * progress)} height={4} rx={2} fill="#e8c04a" />
              </g>
            </g>
          )}
        </g>
      )}
      {hover && <Etiquette texte={label} y={enChantier ? -60 : -52} />}
      {/* zone cliquable généreuse */}
      <ellipse cx={0} cy={-4} rx={44} ry={26} fill="transparent" />
    </g>
  )
}

/** cadrage de la carte du village : on serre jusqu'à ×2.1 sur la mêlée */
const VUE_VILLAGE: VueScene = { w: MAP.w, h: MAP.h, zMin: 1.7, zMax: 2.1 }
/** lu à chaque image par la caméra — hors du rendu React, donc jamais périmé */
const lireBatailleVillage = () => useGame.getState().battle

export function VillageMap() {
  const battle = useGame((s) => s.battle)
  const warned = useGame((s) => s.warned)
  const wallLevel = useGame((s) => s.buildings.remparts.level)
  const remparts = useGame((s) => s.buildings.remparts)
  const tours = useGame((s) => s.tours)
  const army = useGame((s) => s.army)
  const wallHp = useGame((s) => s.wallHp)
  const pop = useGame((s) => s.pop)
  const morale = useGame((s) => s.morale)
  const createdAt = useGame((s) => s.createdAt)
  const lastSeen = useGame((s) => s.lastSeen)
  const saison = useGame((s) => s.saison)
  const meteo = useGame((s) => s.meteo)
  const select = useGame((s) => s.select)
  const selected = useGame((s) => s.selected)
  const [hoverMur, setHoverMur] = useState(false)
  const scene = useRef<SVGGElement | null>(null)
  useCameraBataille(scene, VUE_VILLAGE, lireBatailleVillage)

  const scierieLvl = useGame((s) => s.buildings.scierie.level)
  const fermeLvl = useGame((s) => s.buildings.ferme.level)
  const carriereLvl = useGame((s) => s.buildings.carriere.level)

  const now = lastSeen // rafraîchi par le tick
  const phase = phaseJour(now, createdAt, DAY_MS)
  const wallMax = WALL_HP[wallLevel]
  const paisible = battle === null && !warned

  // chantier des remparts : l'enceinte cible se dresse arc par arc (25 / 50 / 75 %)
  const rempartsChantier = remparts.targetLevel !== undefined && remparts.busyUntil !== undefined
  let progMur = 0
  if (rempartsChantier && remparts.targetLevel !== undefined && remparts.busyUntil !== undefined) {
    const dur = BUILDINGS.remparts.times[remparts.targetLevel - 1] * 1000
    progMur = Math.max(0, Math.min(1, 1 - (remparts.busyUntil - now) / dur))
  }
  const spanMur = [0, 1 / 3, 2 / 3, 1][stadeChantier(progMur)]

  // chaque pan cède pour son compte : la porte ne s'arrache pas si c'est le nord qui tombe
  const secteurs = battle?.secteurs ?? []
  const brechesAngles = secteurs.filter((s) => s.breche).map((s) => s.angle)
  // la porte est à l'est (angle 0) : seul l'effondrement d'un pan de ce côté l'emporte
  const portePercee =
    secteurs.length > 0
      ? brechesAngles.some((a) => Math.cos(a) > 0 && Math.abs(Math.sin(a)) < 0.35)
      : (battle?.breche ?? false)

  const labelMur = rempartsChantier
    ? `🧱 Remparts — niv. ${remparts.targetLevel} en chantier (${Math.round(progMur * 100)} %)`
    : wallLevel === 0
      ? '🧱 Remparts — à construire'
      : `🧱 Remparts — niveau ${wallLevel}/4${tours > 0 ? ` · ${tours} tour${tours > 1 ? 's' : ''} 🏹` : ''}`

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
        <DefsArt />
        <DefsBatiments />
      </defs>

      <g clipPath="url(#cadre-carte)">
        {/* toute la scène vit dans ce groupe : la caméra s'en approche pendant l'assaut */}
        <g ref={scene}>
          <Terrain phase={phase} paisible={paisible} saison={saison} />

          <Porteurs scierie={scierieLvl > 0} ferme={fermeLvl > 0} carriere={carriereLvl > 0} actif={paisible} />

          <Emplacement id="carriere" now={now} paisible={paisible} />
          <Emplacement id="scierie" now={now} paisible={paisible} />

          <Murailles
            niveau={wallLevel}
            hp={wallHp}
            max={wallMax}
            breche={portePercee}
            layer="back"
            tours={tours}
            brechesAngles={brechesAngles}
          />
          {rempartsChantier && spanMur > 0 && remparts.targetLevel !== undefined && (
            <Murailles niveau={remparts.targetLevel} hp={1} max={1} breche={false} layer="back" span={spanMur} />
          )}

          {dedans.map((b) => (
            <Emplacement key={b} id={b} now={now} paisible={paisible} />
          ))}

          <Villageois pop={pop} morale={morale} now={now} enBataille={battle !== null} />

          <Murailles
            niveau={wallLevel}
            hp={wallHp}
            max={wallMax}
            breche={portePercee}
            layer="front"
            tours={tours}
            brechesAngles={brechesAngles}
          />
          {rempartsChantier && spanMur > 0 && remparts.targetLevel !== undefined && (
            <Murailles niveau={remparts.targetLevel} hp={1} max={1} breche={false} layer="front" span={spanMur} />
          )}

          {/* la garnison monte la garde tant qu'aucune bataille ne fait rage */}
          <Garnison army={army} wallLevel={wallLevel} visible={battle === null} />

          {/* zone cliquable des remparts (sur la porte) */}
          <g
            transform={`translate(${MAP.porte.x},${MAP.porte.y})`}
            onClick={(e) => {
              e.stopPropagation()
              select('remparts')
            }}
            onMouseEnter={() => setHoverMur(true)}
            onMouseLeave={() => setHoverMur(false)}
            style={{ cursor: 'pointer' }}
          >
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
            {rempartsChantier && !battle && (
              <g>
                <Batisseur x={-36} y={20} />
                <Batisseur x={28} y={26} flip begin="0.8s" />
                <g transform="translate(0,-56)">
                  <rect x={-22} y={0} width={44} height={6} rx={3} fill="#1d1d1d" opacity={0.7} />
                  <rect x={-21} y={1} width={Math.max(2, 42 * progMur)} height={4} rx={2} fill="#e8c04a" />
                </g>
              </g>
            )}
            {hoverMur && <Etiquette texte={labelMur} y={-68} />}
            <ellipse cx={0} cy={-6} rx={48} ry={30} fill="transparent" />
          </g>

          {/* portée des tours d'archers, visible quand les remparts sont sélectionnés */}
          {selected === 'remparts' &&
            tours > 0 &&
            TOUR_ANGLES.slice(0, tours).map((a) => {
              const p = pointMur(a)
              return (
                <circle
                  key={a}
                  cx={p.x}
                  cy={p.y - 32}
                  r={TOUR_PORTEE}
                  fill="#e8c04a"
                  fillOpacity={0.05}
                  stroke="#e8c04a"
                  strokeWidth={1.3}
                  strokeDasharray="5 7"
                  opacity={0.65}
                  pointerEvents="none"
                />
              )
            })}

          <Emplacement id="ferme" now={now} paisible={paisible} />
          <Emplacement id="port" now={now} paisible={paisible} />

          {battle && <BatailleLayer battle={battle} now={now} wallHp={wallHp} wallMax={wallMax} />}
        </g>

        {/* le ciel du jour : teinte de la saison, puis ce qui en tombe. Posé hors
            du groupe caméra — la pluie tombe sur l'écran, pas sur la carte. */}
        <VoileSaison saison={saison} w={MAP.w} h={MAP.h} />
        <Meteo meteo={meteo} w={MAP.w} h={MAP.h} />

        {/* voile et vignette restent solidaires de l'écran — et s'effacent à demi
            pendant un assaut, pour que la mêlée reste lisible même de nuit */}
        <g opacity={battle ? 0.45 : 1}>
          <Vignette />
          <VoileJourNuit phase={phase} />
        </g>
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

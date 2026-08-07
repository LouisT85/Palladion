import { BUILDINGS, BUILDING_IDS, hpAcropole, structureMax } from '../../game/data'
import { useGame } from '../../game/store'

/*
 * La santé des bâtiments, pendant un assaut seulement.
 *
 * Hors bataille, afficher dix jauges reviendrait à couvrir la carte de barres
 * pour ne rien dire — un village en paix est intact. Elles n'apparaissent donc
 * qu'une fois la brèche ouverte, au moment précis où elles décident de tout, et
 * seulement sur les édifices réellement entamés. Celle du cœur reste visible dès
 * la brèche : c'est elle qui dit combien de temps il reste.
 */

/** vert tant que ça tient, ambre quand ça craque, rouge quand ça va tomber */
function couleur(part: number): string {
  return part > 0.6 ? '#8f9d5a' : part > 0.28 ? '#d9a03a' : '#c0563f'
}

export function Jauge({
  x,
  y,
  part,
  nom,
  coeur,
  titre,
  emoji,
}: {
  x: number
  y: number
  part: number
  nom: string
  coeur?: boolean
  /* chez soi le cœur seul se nomme ; en expédition on nomme tout ce qu'on abat */
  titre?: boolean
  /* le pictogramme du cœur : le Palladion chez soi, un étendard chez l'autre */
  emoji?: string
}) {
  const w = coeur ? 84 : 56
  const h = coeur ? 8 : 6
  const nomme = coeur || titre
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <rect x={-w / 2 - 1} y={-1} width={w + 2} height={h + 2} rx={(h + 2) / 2} fill="#120d06" opacity={0.72} />
      <rect
        x={-w / 2}
        y={0}
        width={Math.max(1.5, w * part)}
        height={h}
        rx={h / 2}
        fill={couleur(part)}
      />
      {nomme && (
        <text
          x={0}
          y={-4}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#f0e8d8"
          style={{ paintOrder: 'stroke' }}
          stroke="#000000aa"
          strokeWidth={2.4}
        >
          {coeur ? `${emoji ?? '🏛️'} ` : ''}
          {nom}
        </text>
      )}
    </g>
  )
}

export function SanteBatiments() {
  const enBataille = useGame((s) => s.battle !== null && s.battle.breche)
  const buildings = useGame((s) => s.buildings)
  const acropole = useGame((s) => s.defenses?.acropole ?? 0)
  if (!enBataille) return null

  return (
    <g>
      {BUILDING_IDS.map((id) => {
        const b = buildings[id]
        if (id === 'remparts' || b.level <= 0 || b.ruine) return null
        const coeur = id === 'agora'
        /*
         * Deux ouvrages restent à l'œil même intacts : le cœur, dont la chute
         * décide de la partie, et la REDOUTE, qui TIRE tant qu'elle tient - sa
         * jauge dit s'il reste une arme dans l'enceinte. Le reste ne s'affiche
         * qu'une fois entamé, sinon la carte se couvre de barres pour rien.
         */
        const veille = coeur || id === 'redoute'
        const max = structureMax(id, b.level) + (coeur ? hpAcropole(acropole) : 0)
        if (max <= 0) return null
        const hp = b.hp ?? max
        const part = Math.max(0, Math.min(1, hp / max))
        if (part >= 0.999 && !veille) return null
        const pos = BUILDINGS[id].pos
        return (
          <Jauge
            key={id}
            x={pos.x}
            // la Redoute est haute : sa jauge se pose au-dessus des scorpions
            y={pos.y - (coeur ? 54 : id === 'redoute' ? 92 : 40)}
            part={part}
            nom={coeur ? 'Le Palladion' : BUILDINGS[id].nom}
            coeur={coeur}
            titre={id === 'redoute'}
          />
        )
      })}
    </g>
  )
}

import { MAP } from '../../game/data'
import { HEROS } from '../../game/heros'
import type { HeroId } from '../../game/types'
import { AttributPose, SilhouetteHeros, sommetHeros } from './SilhouettesHeros'

/*
 * Les héros ne vivent pas dans un panneau : ce sont des habitants. On les voit
 * donc SUR la carte, en train d'arpenter la place - plus grands que les autres,
 * aux couleurs de leur maison, avec leur nom au-dessus de la tête et l'attribut
 * par lequel la légende les reconnaît (voir SilhouettesHeros.tsx : le pilos
 * d'Ulysse, le bouclier-tour d'Ajax, Anchise sur les épaules d'Énée…).
 * Un héros blessé s'assied à l'écart, bandé, son attribut posé près de lui.
 *
 * Ils occupent des postes fixes autour de l'agora plutôt que d'errer au hasard :
 * on doit pouvoir les retrouver du regard, comme on retrouve un bâtiment.
 */

/** la carte les montre un peu plus petits que la mêlée, où ils tiennent le devant */
const ECH_CARTE = 0.9

/**
 * Places d'honneur sur le bas de la place, dans l'ordre du panthéon. Elles sont
 * largement espacées : leurs noms sont écrits au-dessus de leur tête, et deux
 * étiquettes qui se chevauchent ne se lisent plus ni l'une ni l'autre.
 */
const POSTES: { dx: number; dy: number }[] = [
  { dx: -168, dy: 104 },
  { dx: -56, dy: 126 },
  { dx: 56, dy: 126 },
  { dx: 168, dy: 104 },
  { dx: -238, dy: 62 },
  { dx: 238, dy: 62 },
  { dx: -112, dy: 152 },
  { dx: 112, dy: 152 },
]

/** silhouette d'un héros sur la place : plus haute qu'un villageois, et unique */
function FigureHeros({ h, blesse, t, i }: { h: HeroId; blesse: boolean; t: number; i: number }) {
  const c = HEROS[h].couleur
  // un léger balancement, désynchronisé : ils respirent sans marcher
  const oscillation = blesse ? 0 : Math.sin(t * 0.9 + i * 1.7) * 1.1

  if (blesse) {
    return (
      <g>
        {/* assis contre un muret, la jambe tendue : on le voit se remettre */}
        <ellipse cx={0.8} cy={1.4} rx={7.4} ry={2.5} fill="#241a08" opacity={0.1} />
        <ellipse cx={0.5} cy={1.2} rx={5} ry={1.7} fill="#241a08" opacity={0.15} />
        {/* ce qu'il a posé par terre le nomme encore : lance, arc, tour, laurier… */}
        <g opacity={0.95}>
          <AttributPose h={h} />
        </g>
        <path d="M-5.6,0 L-4.4,-5.6 L3.4,-5.6 L4.6,0 Z" fill={c} />
        <path d="M-5.6,0 L-4.4,-5.6 L-1.8,-5.6 L-2.5,0 Z" fill="#ffffff" opacity={0.16} />
        <path d="M3.4,-2.9 L9.4,-1.5 L9.5,-0.2 L3.4,-1.3 Z" fill="#d9a97c" />
        <circle cx={-0.7} cy={-8.4} r={3} fill="#d9a97c" />
        <path d="M-3.7,-8.9 A3,3 0 0 1 2.3,-8.9" fill="#5f4630" />
        {/* bandage à la tête */}
        <path d="M-3.8,-9.5 L2.4,-10.4" stroke="#efe7d6" strokeWidth={1.7} strokeLinecap="round" />
      </g>
    )
  }

  return (
    <g transform={`translate(0,${oscillation.toFixed(2)})`}>
      <SilhouetteHeros h={h} detail ech={ECH_CARTE} seed={(i * 0.37) % 1} />
    </g>
  )
}

/**
 * Les héros présents dans le village. Ils disparaissent pendant les batailles :
 * ils y sont, mais en tant que combattants (voir BatailleLayer).
 */
export function HerosVillage({
  presents,
  now,
  enBataille,
}: {
  presents: { id: HeroId; blesse: boolean }[]
  now: number
  enBataille: boolean
}) {
  if (enBataille || presents.length === 0) return null
  const t = now / 1000
  return (
    <g>
      {presents.map((h, i) => {
        const p = POSTES[i % POSTES.length]
        const def = HEROS[h.id]
        return (
          <g key={h.id} transform={`translate(${MAP.mur.cx + p.dx},${MAP.mur.cy + p.dy})`}>
            <FigureHeros h={h.id} blesse={h.blesse} t={t} i={i} />
            {/* le nom, toujours lisible : ce sont des personnages, pas du décor.
                Il se pose au-dessus du point le plus haut de SA silhouette - le
                triple cimier d'Achille et la tête d'Anchise ne montent pas à la
                même hauteur que le bonnet d'Ulysse. */}
            <text
              x={0}
              y={h.blesse ? -14 : Math.round(sommetHeros(h.id, ECH_CARTE)) - 5}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill="#f4ecd8"
              stroke="#0d1722"
              strokeWidth={2.4}
              style={{ paintOrder: 'stroke' }}
              pointerEvents="none"
            >
              {def.emoji} {def.nom}
              {h.blesse ? ' · blessé' : ''}
            </text>
          </g>
        )
      })}
    </g>
  )
}

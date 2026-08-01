import { MAP } from '../../game/data'
import { HEROS } from '../../game/heros'
import type { HeroId } from '../../game/types'

/*
 * Les héros ne vivent pas dans un panneau : ce sont des habitants. On les voit
 * donc SUR la carte, en train d'arpenter la place — plus grands que les autres,
 * aux couleurs de leur maison, avec leur nom au-dessus de la tête et leur
 * emblème sur le bouclier. Un héros blessé s'assied à l'écart, bandé.
 *
 * Ils occupent des postes fixes autour de l'agora plutôt que d'errer au hasard :
 * on doit pouvoir les retrouver du regard, comme on retrouve un bâtiment.
 */

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

/** silhouette d'un héros : plus haute qu'un villageois, cape et bouclier armorié */
function FigureHeros({ h, blesse, t, i }: { h: HeroId; blesse: boolean; t: number; i: number }) {
  const def = HEROS[h]
  const c = def.couleur
  // un léger balancement, désynchronisé : ils respirent sans marcher
  const oscillation = blesse ? 0 : Math.sin(t * 0.9 + i * 1.7) * 1.1

  return (
    <g transform={`translate(0,${oscillation.toFixed(2)})`}>
      {/* ombre au sol, un peu plus large que celle d'un villageois */}
      <ellipse cx={0.8} cy={1.4} rx={6.6} ry={2.3} fill="#241a08" opacity={0.1} />
      <ellipse cx={0.5} cy={1.2} rx={4.6} ry={1.6} fill="#241a08" opacity={0.15} />

      {blesse ? (
        // assis contre un muret, la jambe tendue : on le voit se remettre
        <g>
          <path d="M-5,0 L-4,-5 L3,-5 L4,0 Z" fill={c} />
          <path d="M-5,0 L-4,-5 L-1.6,-5 L-2.2,0 Z" fill="#ffffff" opacity={0.16} />
          <path d="M3,-2.6 L8.5,-1.4 L8.6,-0.2 L3,-1.2 Z" fill="#d9a97c" />
          <circle cx={-0.6} cy={-7.6} r={2.7} fill="#d9a97c" />
          <path d="M-3.3,-8 A2.7,2.7 0 0 1 2.1,-8" fill="#5f4630" />
          {/* bandage à la tête */}
          <path d="M-3.4,-8.6 L2.2,-9.4" stroke="#efe7d6" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {/* jambes */}
          <path d="M-1.9,-5 L-1.9,-0.4 L-0.6,-0.2" stroke="#d9a97c" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <path d="M1.9,-5 L1.9,-0.4 L3.2,-0.2" stroke="#bd8a5c" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          {/* cape aux couleurs de la maison, agitée par le vent */}
          <path d="M-3.4,-13 Q-8.4,-8 -6,-1.4 L-2.6,-3 Z" fill={c} opacity={0.85}>
            <animate
              attributeName="d"
              values="M-3.4,-13 Q-8.4,-8 -6,-1.4 L-2.6,-3 Z;M-3.4,-13 Q-9.6,-8.4 -7,-1 L-2.6,-3 Z;M-3.4,-13 Q-8.4,-8 -6,-1.4 L-2.6,-3 Z"
              dur="4.6s"
              repeatCount="indefinite"
            />
          </path>
          {/* cuirasse */}
          <path d="M-3.4,-5 L-2.6,-13 L2.6,-13 L3.4,-5 Z" fill={c} />
          <path d="M-3.4,-5 L-2.6,-13 L-0.9,-13 L-1.3,-5 Z" fill="#ffffff" opacity={0.2} />
          <path d="M2.6,-13 L3.4,-5 L2.2,-5 L1.9,-13 Z" fill="#000000" opacity={0.22} />
          <path d="M-3.1,-7.8 L3.1,-7.8 L3.2,-8.9 L-3.2,-8.9 Z" fill="#5d4230" />
          {/* tête casquée, crête aux couleurs de la maison */}
          <circle cx={0} cy={-15.4} r={3} fill="#d9a97c" />
          <path d="M1,-18.2 A3,3 0 0 1 1,-12.6 A4.2,4.2 0 0 0 1,-18.2 Z" fill="#bd8a5c" />
          <path d="M-3.1,-15.6 Q-3.1,-18.8 0,-18.8 Q3.1,-18.8 3.1,-15.6 L3.1,-14.8 L-3.1,-14.8 Z" fill="#8a7845" />
          <path d="M-2.3,-16.9 Q-1.7,-18.1 -0.5,-18.3" stroke="#f2e6b0" strokeWidth={0.8} fill="none" strokeLinecap="round" />
          <path d="M-3.4,-17 L-2.4,-21 L0,-22.2 L2.4,-21 L3.4,-17 Q0,-19.2 -3.4,-17 Z" fill={c} />
          {/* bouclier armorié : l'emblème du héros y est peint */}
          <circle cx={-5.4} cy={-9.4} r={4.4} fill="#4f3d22" />
          <circle cx={-5.4} cy={-9.4} r={3.6} fill={c} />
          <circle cx={-5.9} cy={-9.9} r={2.2} fill="#ffffff" opacity={0.22} />
          <circle cx={-5.4} cy={-9.4} r={1.2} fill="#dcc36a" />
          {/* lance plantée à côté de lui */}
          <line x1={5} y1={2} x2={6.6} y2={-20} stroke="#6b4c2a" strokeWidth={1.4} />
          <path d="M6.6,-20 L7.4,-23.4 L8.4,-20.2 Z" fill="#e4eaef" />
        </g>
      )}
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
            {/* le nom, toujours lisible : ce sont des personnages, pas du décor */}
            <text
              x={0}
              y={h.blesse ? -14 : -26}
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

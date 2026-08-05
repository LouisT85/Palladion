import { memo } from 'react'
import { postesArchers } from '../../game/data'
import type { UnitId } from '../../game/types'
import { Bonhomme, Char, lookUnite } from './BatailleLayer'

/*
 * La garnison en temps de paix : vos troupes recrutées, visibles sur la carte.
 *  - lanciers et hoplites : en formation au point de ralliement, derrière la porte
 *  - archers et frondeurs : postés sur les remparts, à leurs positions de tir
 *    (les frondeurs d'un cran en arrière : la fronde porte moins loin que l'arc)
 *  - peltastes : en grappe sur le flanc, jamais en rang - ils partent en courant
 * On montre des figurines représentatives (plafonnées) ; les effectifs exacts
 * restent lisibles dans la caserne. Pendant une bataille, BatailleLayer prend le relais.
 *
 * Les figurines sont exactement celles du champ de bataille (`lookUnite`) : le
 * joueur doit reconnaître au repos l'homme qu'il verra courir sous les flèches.
 * Un frondeur au repos fait déjà tourner sa fronde, un peltaste porte déjà son
 * croissant d'osier - c'est là, sur la carte, que le joueur apprend à les
 * distinguer, bien avant la première bataille.
 */

/*
 * Combien de figurines par unité au repos. Le bélier n'y figure pas : une machine
 * de siège ne monte pas la garde, elle attend au dépôt qu'on parte en expédition.
 */
const MONTRES: Record<UnitId, number> = {
  lancier: 6,
  archer: 4,
  hoplite: 4,
  frondeur: 4,
  peltaste: 3,
  belier: 0,
  // l'attelage tient de la place : deux suffisent à dire qu'on en a
  char: 2,
}

/** une figurine de garnison : l'allure du champ de bataille, rentrée d'un cran */
function Figurine({ type, echelle = 0.9 }: { type: UnitId; echelle?: number }) {
  const look = lookUnite(type)
  // le bélier ne monte pas la garde : la garnison ne l'appelle jamais
  if (look === 'belier') return null
  return (
    <g transform={`scale(${echelle})`}>
      {look === 'char' ? <Char /> : <Bonhomme {...look} />}
    </g>
  )
}

function Rang({
  n,
  type,
  x0,
  y0,
  parRang,
  pasX,
  pasY,
}: {
  n: number
  type: UnitId
  x0: number
  y0: number
  parRang: number
  pasX: number
  pasY: number
}) {
  const figs = []
  for (let i = 0; i < n; i++) {
    const col = i % parRang
    const rang = Math.floor(i / parRang)
    figs.push(
      <g key={i} transform={`translate(${x0 + col * pasX + rang * 4},${y0 + rang * pasY})`}>
        <Figurine type={type} />
      </g>,
    )
  }
  return <g>{figs}</g>
}

/** La garnison au repos. Mémoïsée : elle ne change qu'à l'enrôlement. */
export const Garnison = memo(function Garnison({
  army,
  wallLevel,
  visible,
}: {
  army: Record<UnitId, number>
  wallLevel: number
  visible: boolean
}) {
  if (!visible) return null
  const lanciers = Math.min(army.lancier, MONTRES.lancier)
  const hoplites = Math.min(army.hoplite, MONTRES.hoplite)
  const archers = Math.min(army.archer, MONTRES.archer)
  const frondeurs = Math.min(army.frondeur, MONTRES.frondeur)
  const peltastes = Math.min(army.peltaste, MONTRES.peltaste)
  if (lanciers + hoplites + archers + frondeurs + peltastes === 0) return null

  const postes = postesArchers(wallLevel)

  return (
    <g pointerEvents="none">
      {/* archers : sur les remparts (ou au sol s'il n'y a pas de mur) */}
      {Array.from({ length: archers }, (_, i) => {
        const p = postes[i % postes.length]
        const decale = Math.floor(i / postes.length) * 13
        return (
          <g key={`a${i}`} transform={`translate(${p.x + decale},${p.y - (wallLevel > 0 ? 8 : 0)})`}>
            <Figurine type="archer" echelle={0.88} />
          </g>
        )
      })}
      {/* frondeurs : mêmes créneaux, un cran en arrière et en retrait - ils partagent
          le chemin de ronde avec les archers, sans se marcher sur les pieds */}
      {Array.from({ length: frondeurs }, (_, i) => {
        const p = postes[(i + 1) % postes.length]
        const decale = Math.floor(i / postes.length) * 13
        return (
          <g key={`f${i}`} transform={`translate(${p.x - 11 - decale},${p.y + 4 - (wallLevel > 0 ? 8 : 0)})`}>
            <Figurine type="frondeur" echelle={0.86} />
          </g>
        )
      })}
      {/* mêlée : en formation au ralliement, tournée vers la porte */}
      <Rang n={lanciers} type="lancier" x0={790} y0={468} parRang={3} pasX={17} pasY={15} />
      <Rang n={hoplites} type="hoplite" x0={758} y0={478} parRang={2} pasX={19} pasY={16} />
      {/* peltastes : en grappe lâche sur le flanc droit, en avant du rang - ils ne
          tiennent pas la ligne, ils attendent qu'on les lâche */}
      {Array.from({ length: peltastes }, (_, i) => (
        <g key={`p${i}`} transform={`translate(${838 + (i % 2) * 15 + i * 3},${459 + Math.floor(i / 2) * 14})`}>
          <Figurine type="peltaste" echelle={0.9} />
        </g>
      ))}
    </g>
  )
})

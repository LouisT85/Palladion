import { postesArchers } from '../../game/data'
import type { UnitId } from '../../game/types'
import { Bonhomme } from './BatailleLayer'

/*
 * La garnison en temps de paix : vos troupes recrutées, visibles sur la carte.
 *  - lanciers et hoplites : en formation au point de ralliement, derrière la porte
 *  - archers : postés sur les remparts, à leurs positions de tir
 * On montre des figurines représentatives (plafonnées) ; les effectifs exacts
 * restent lisibles dans la caserne. Pendant une bataille, BatailleLayer prend le relais.
 */

const MONTRES: Record<UnitId, number> = { lancier: 6, archer: 4, hoplite: 4 }

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
  const looks: Record<UnitId, { tunique: string; arme: 'lance' | 'arc' | 'bouclier-lourd'; taille: number; crete?: boolean }> = {
    lancier: { tunique: '#3e5a7a', arme: 'lance', taille: 0.92 },
    archer: { tunique: '#4a6a5a', arme: 'arc', taille: 0.88 },
    hoplite: { tunique: '#31506e', arme: 'bouclier-lourd', taille: 1.05, crete: true },
  }
  const figs = []
  for (let i = 0; i < n; i++) {
    const col = i % parRang
    const rang = Math.floor(i / parRang)
    figs.push(
      <g key={i} transform={`translate(${x0 + col * pasX + rang * 4},${y0 + rang * pasY})`}>
        <Bonhomme {...looks[type]} />
      </g>,
    )
  }
  return <g>{figs}</g>
}

export function Garnison({
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
  if (lanciers + hoplites + archers === 0) return null

  const postes = postesArchers(wallLevel)

  return (
    <g pointerEvents="none">
      {/* archers : sur les remparts (ou au sol s'il n'y a pas de mur) */}
      {Array.from({ length: archers }, (_, i) => {
        const p = postes[i % postes.length]
        const decale = Math.floor(i / postes.length) * 13
        return (
          <g key={`a${i}`} transform={`translate(${p.x + decale},${p.y - (wallLevel > 0 ? 8 : 0)})`}>
            <Bonhomme tunique="#4a6a5a" arme="arc" taille={0.88} />
          </g>
        )
      })}
      {/* mêlée : en formation au ralliement, tournée vers la porte */}
      <Rang n={lanciers} type="lancier" x0={790} y0={468} parRang={3} pasX={17} pasY={15} />
      <Rang n={hoplites} type="hoplite" x0={758} y0={478} parRang={2} pasX={19} pasY={16} />
    </g>
  )
}

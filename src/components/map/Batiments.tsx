import type { BuildingId } from '../../game/types'
import { Caisse, Bloc } from './batiments/primitives'
import { Agora } from './batiments/Agora'
import { Temple } from './batiments/Temple'
import { Maisons } from './batiments/Maisons'
import { Ferme } from './batiments/Ferme'
import { Scierie } from './batiments/Scierie'
import { Carriere } from './batiments/Carriere'
import { Forge } from './batiments/Forge'
import { Caserne } from './batiments/Caserne'
import { Port } from './batiments/Port'

export { DefsBatiments } from './batiments/primitives'

// ── Sélecteur ────────────────────────────────────────────────────────────────
export function BatimentArt({ id, level }: { id: BuildingId; level: number }) {
  switch (id) {
    case 'agora':
      return <Agora n={level} />
    case 'temple':
      return <Temple n={level} />
    case 'maisons':
      return <Maisons n={level} />
    case 'ferme':
      return <Ferme n={level} />
    case 'scierie':
      return <Scierie n={level} />
    case 'carriere':
      return <Carriere n={level} />
    case 'forge':
      return <Forge n={level} />
    case 'caserne':
      return <Caserne n={level} />
    case 'port':
      return <Port n={level} />
    case 'remparts':
      return null // dessinés par <Murailles/>
  }
}

/** échafaudage affiché pendant un chantier */
export function Chantier() {
  return (
    <g opacity={0.95}>
      <line x1={-16} y1={4} x2={-16} y2={-22} stroke="#7a5a35" strokeWidth={2} />
      <line x1={16} y1={4} x2={16} y2={-22} stroke="#7a5a35" strokeWidth={2} />
      <line x1={-18} y1={-20} x2={18} y2={-20} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-18} y1={-8} x2={18} y2={-8} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-16} y1={-20} x2={16} y2={-8} stroke="#8a6a40" strokeWidth={1} />
      <rect x={-8} y={-2} width={12} height={5} fill="#b5af9f" stroke="#6e675c" strokeWidth={0.7} />
      <Caisse x={-12} y={3} s={0.9} />
      <Bloc x={12} y={4} w={8} h={5} />
    </g>
  )
}

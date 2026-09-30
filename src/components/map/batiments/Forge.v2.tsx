import { Forge as Origine } from './Forge'
import { CasqueSupport, Chaudrons, LueurFeu, Lumiere, Pithos, PointesLance } from './finition'
/*
 * FORGE v2 - le dessin d'origine, gardé tel quel, et enrichi :
 *  · la lueur du four qui respire sur le sol et les murs ;
 *  · niv. 1 : pithos d'eau pour la trempe ;
 *  · niv. 2 : pointes de lance fraîchement forgées sur leur natte ;
 *  · niv. 3 : casque corinthien et cnémides sur leur poteau ;
 *  · niv. 4 : casque corinthien, chaudrons de bronze (lébès) à vendre.
 * Passe de lumière NW par-dessus. Postes des forgerons (12,6) et (-22,13) intacts.
 */
export function Forge({ n }: { n: number }) {
  const xFour = n === 1 ? -11 : n === 2 ? -13 : n === 3 ? -15 : -17
  const yFour = n === 1 ? 3 : n === 2 ? 3.5 : 4
  return (
    <g>
      <Origine n={n} />
      <LueurFeu x={xFour} y={yFour + 1} r={n >= 3 ? 24 : 20} />
      {n === 1 && <Pithos x={-38} y={13} s={0.7} enterre />}
      {n === 2 && <PointesLance x={15} y={17} />}
      {n === 3 && <CasqueSupport x={-40} y={14} />}
      {n >= 4 && (
        <g>
          <CasqueSupport x={46} y={14} />
          <Chaudrons x={-46} y={16} />
        </g>
      )}
      <Lumiere rx={50} h={50} />
    </g>
  )
}

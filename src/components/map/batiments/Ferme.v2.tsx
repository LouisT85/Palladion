import { Ferme as Origine } from './Ferme'
import { AireBattage, Lumiere, MeuleBras, Pithos, Pressoir, Ruche } from './finition'
/*
 * FERME v2 - le dessin d'origine, enrichi d'objets d'époque :
 *  · niv. 1 : meule à bras (va-et-vient) et pithos enterré ;
 *  · niv. 2+ : aire de battage circulaire cernée de pierres ;
 *  · niv. 3+ : un bœuf foule le grain en tournant sur l'aire ; ruches de paille ;
 *  · niv. 4 : pressoir à olives à levier, face à l'oliveraie.
 * Passe de lumière NW par-dessus. Paysans d'Ouvriers aux mêmes places.
 */
export function Ferme({ n }: { n: number }) {
  return (
    <g>
      <Origine n={n} />
      {n === 1 && (
        <g>
          <Pithos x={-27} y={5} s={0.75} enterre />
          <MeuleBras x={-22} y={11} />
        </g>
      )}
      {n >= 2 && <AireBattage x={-45} y={12} rx={10} ry={3.6} boeuf={n >= 3} />}
      {n >= 3 && (
        <g>
          <Ruche x={-62} y={0} />
          <Ruche x={-57} y={3.4} s={0.9} d={0.8} />
        </g>
      )}
      {n >= 4 && <Pressoir x={-76} y={20} s={0.8} />}
      <g transform="translate(24,0)">
        <Lumiere rx={80} h={48} />
      </g>
    </g>
  )
}

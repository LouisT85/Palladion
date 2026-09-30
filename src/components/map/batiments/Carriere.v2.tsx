import { Carriere as Origine } from './Carriere'
import { Kouros, Lumiere, Pithos } from './finition'
/*
 * CARRIÈRE v2 - le dessin d'origine, enrichi :
 *  · niv. 1 et 2 : pithos d'eau des carriers, à l'ombre ;
 *  · niv. 3 : un kouros ébauché attend sur ses cales, maillet posé dessus ;
 *  · niv. 4 : le kouros, plus grand, prêt au départ ;
 *  · passe de lumière NW par-dessus.
 */
export function Carriere({ n }: { n: number }) {
  return (
    <g>
      <Origine n={n} />
      {n <= 2 && <Pithos x={-30} y={20} s={0.7} enterre />}
      {n === 3 && <Kouros x={32} y={30} s={0.8} />}
      {n >= 4 && <Kouros x={30} y={31} />}
      <Lumiere rx={64} h={58} />
    </g>
  )
}

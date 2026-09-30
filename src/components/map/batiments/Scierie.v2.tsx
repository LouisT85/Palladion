import { Scierie as Origine } from './Scierie'
import { Charbonniere, Lumiere } from './finition'
/*
 * SCIERIE v2 - le dessin d'origine, enrichi :
 *  · niv. 2+ : la charbonnière - meule de bois couverte de terre qui fume par
 *    ses évents ; c'est elle qui nourrit la forge en charbon ;
 *  · passe de lumière NW par-dessus, pour le volume d'ensemble.
 */
export function Scierie({ n }: { n: number }) {
  return (
    <g>
      <Origine n={n} />
      {n === 2 && <Charbonniere x={22} y={12} s={0.8} />}
      {n === 3 && <Charbonniere x={30} y={13} s={0.85} />}
      {n >= 4 && <Charbonniere x={28} y={18} s={0.85} />}
      <Lumiere rx={64} h={52} />
    </g>
  )
}

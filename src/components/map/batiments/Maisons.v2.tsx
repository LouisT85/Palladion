import { Maisons as Origine } from './Maisons'
import { AutelDomestique, FourPain, LueurFeu, Lumiere, MetierTisser, Pithos, Puits, Ruche } from './finition'
/*
 * MAISONS v2 - le dessin d'origine sur les quatre niveaux, enrichi d'objets
 * de la vie domestique grecque :
 *  · niv. 1 : métier à tisser à pesons, lueur du feu de camp, pithos enterré ;
 *  · niv. 2 : four à pain en coupole, deux ruches de paille ;
 *  · niv. 3 : four à pain, puits à margelle ;
 *  · niv. 4 : puits, autel domestique de Zeus Herkeios dans la cour, pithos.
 * Passe de lumière NW par-dessus. (L'essai en volumes du niveau 3 est gardé
 * dans Maisons.iso.tsx.)
 */
export function Maisons({ n }: { n: number }) {
  return (
    <g>
      <Origine n={n} />
      {n === 1 && (
        <g>
          <MetierTisser x={-42} y={-8} s={0.9} />
          <LueurFeu x={2} y={-6} r={14} />
          <Pithos x={40} y={10} s={0.8} enterre />
        </g>
      )}
      {n === 2 && (
        <g>
          <FourPain x={-42} y={-6} s={0.9} />
          <Ruche x={44} y={-6} />
          <Ruche x={50} y={-2} s={0.9} d={0.9} />
        </g>
      )}
      {n === 3 && <FourPain x={-52} y={-4} />}
      {n >= 3 && <Puits x={-3} y={16} s={0.9} />}
      {n >= 4 && (
        <g>
          <AutelDomestique x={9} y={15} />
          <Pithos x={58} y={14} s={0.8} enterre />
        </g>
      )}
      <Lumiere rx={n >= 3 ? 60 : 46} h={n >= 4 ? 56 : 40} />
    </g>
  )
}

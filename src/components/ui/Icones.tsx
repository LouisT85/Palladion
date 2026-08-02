import { RES } from '../../game/data'
import type { ResourceId } from '../../game/types'

/*
 * Les ressources méritaient mieux qu'un émoji : 🥉 se lisait « médaille de
 * bronze » et 🪨 « caillou », ce que ni le lingot ni le bloc de taille ne sont.
 * Ces pictogrammes sont peints à la main, dans la lumière NW de la carte :
 * grume écorcée, bloc équarri à la face supérieure éclairée, gerbe de blé,
 * lingot de bronze en forme de peau de bœuf (l'étalon de l'âge du bronze).
 */

export type IconeId = ResourceId | 'faveur' | 'prestige'

function Bois() {
  return (
    <g>
      {/* deux grumes empilées, bois de bout tourné vers nous */}
      <path d="M4,13.5 L18.5,13.5 L18.5,19 Q11.25,20.6 4,19 Z" fill="#7c5a30" />
      <ellipse cx={4} cy={16.2} rx={2.6} ry={3} fill="#c2a06a" />
      <ellipse cx={4} cy={16.2} rx={1.5} ry={1.8} fill="#a5854f" />
      <ellipse cx={4} cy={16.2} rx={0.6} ry={0.8} fill="#8a6a3e" />
      <path d="M6,13.6 L18.4,13.6 L18.4,14.7 L6,14.9 Z" fill="#a8845d" />
      <path d="M6.5,6.5 L21,6.5 L21,12 Q13.75,13.6 6.5,12 Z" fill="#8a6535" />
      <ellipse cx={6.5} cy={9.2} rx={2.7} ry={3.1} fill="#cdab73" />
      <ellipse cx={6.5} cy={9.2} rx={1.6} ry={1.9} fill="#ae8d57" />
      <ellipse cx={6.5} cy={9.2} rx={0.6} ry={0.8} fill="#8f6f43" />
      <path d="M9,6.6 L20.9,6.6 L20.9,7.8 L9,8 Z" fill="#b28f63" />
      {/* écorce et cerne */}
      <path d="M12,10.4 L20,10.2 M11,17.2 L18,17" stroke="#6b4c2a" strokeWidth={0.8} opacity={0.6} />
    </g>
  )
}

function Pierre() {
  return (
    <g>
      {/* bloc de taille en trois-quarts : dessus au soleil, face en demi-teinte,
          flanc est dans l'ombre - un cube équarri, pas un galet */}
      <path d="M3,9 L12,4.4 L21,9 L12,13.6 Z" fill="#e2dac6" />
      <path d="M3,9 L12,13.6 L12,20 L3,15.4 Z" fill="#b8ae95" />
      <path d="M21,9 L12,13.6 L12,20 L21,15.4 Z" fill="#8b8169" />
      {/* arête vive au sommet, joints de taille */}
      <path d="M3,9 L12,4.4 L21,9" stroke="#f4efe1" strokeWidth={0.9} fill="none" />
      <path d="M12,13.6 L12,20" stroke="#6f6653" strokeWidth={0.7} opacity={0.7} />
      <path d="M6.4,10.7 L9,9.4 M15,9.4 L17.6,10.7" stroke="#c4bba3" strokeWidth={0.7} opacity={0.7} />
      <path d="M5.2,12.1 L5.2,17 M8.4,13.7 L8.4,18.6" stroke="#9e9581" strokeWidth={0.6} opacity={0.6} />
      <path d="M15.6,13.7 L15.6,18.6 M18.6,12.1 L18.6,17" stroke="#756c56" strokeWidth={0.6} opacity={0.6} />
    </g>
  )
}

function Grain() {
  return (
    <g>
      {/* gerbe liée : tiges, épis à barbes, lien de paille */}
      <path d="M12,21 L12,11 M8.4,21 L10.6,11.6 M15.6,21 L13.4,11.6" stroke="#b79a4e" strokeWidth={1.5} strokeLinecap="round" />
      {[
        { x: 12, y: 3.2, c1: '#f0d47a', c2: '#c9a94c' },
        { x: 7.4, y: 5.6, c1: '#e6c86c', c2: '#bd9c42' },
        { x: 16.6, y: 5.6, c1: '#d9bb5e', c2: '#ab8c39' },
      ].map((e, i) => (
        <g key={i}>
          <path d={`M${e.x},${e.y} q3,3.4 0,7.6 q-3,-4.2 0,-7.6 Z`} fill={e.c1} />
          <path d={`M${e.x},${e.y} q-3,3.4 0,7.6 q3,-4.2 0,-7.6 Z`} fill={e.c2} />
          <path d={`M${e.x},${e.y - 0.4} L${e.x},${e.y + 7.4}`} stroke="#8f7530" strokeWidth={0.6} />
          {/* barbes */}
          <path
            d={`M${e.x - 1.4},${e.y + 2} l-1.6,-1.6 M${e.x + 1.4},${e.y + 2} l1.6,-1.6 M${e.x - 1.6},${e.y + 4.4} l-1.8,-1.4 M${e.x + 1.6},${e.y + 4.4} l1.8,-1.4`}
            stroke="#d9bb5e"
            strokeWidth={0.6}
            opacity={0.85}
          />
        </g>
      ))}
      {/* lien de paille */}
      <path d="M7.6,16.4 Q12,14.8 16.4,16.4 Q12,18 7.6,16.4 Z" fill="#a5854a" />
      <path d="M7.8,16 Q12,14.6 16.2,16" stroke="#d3b46a" strokeWidth={0.7} fill="none" />
    </g>
  )
}

function Bronze() {
  return (
    <g>
      {/* lingot « peau de bœuf » : la monnaie-métal de l'âge du bronze égéen,
          quatre coins tirés, dessus poli, tranche dans l'ombre */}
      <path
        d="M4.2,5 Q7.6,7.6 12,7.2 Q16.4,7.6 19.8,5 Q17.2,9.4 17.6,12.6 Q17.2,16.4 19.8,19.4 Q16.4,16.8 12,17.2 Q7.6,16.8 4.2,19.4 Q6.8,16.4 6.4,12.6 Q6.8,9.4 4.2,5 Z"
        fill="#a8752c"
      />
      <path
        d="M4.2,5 Q7.6,7.6 12,7.2 Q16.4,7.6 19.8,5 Q17.2,9.4 17.6,12.6 L6.4,12.6 Q6.8,9.4 4.2,5 Z"
        fill="#c9922f"
      />
      <path d="M5.6,6.6 Q8.4,8.6 12,8.4 Q15,8.5 17,7.4 Q15.4,9.6 15.2,11.4 L8.6,11.4 Q8.4,9.2 5.6,6.6 Z" fill="#e0b256" />
      {/* éclat spéculaire NW et gravure du poinçon */}
      <path d="M6.6,7.6 Q8.6,9.2 10.6,9.4" stroke="#f6dc9a" strokeWidth={1} fill="none" strokeLinecap="round" />
      <path d="M10.4,13.6 l3.2,0 M11,15 l2,0" stroke="#7a5218" strokeWidth={0.8} opacity={0.75} />
      {/* tranche sombre au sud-est, qui donne l'épaisseur */}
      <path d="M17.6,12.6 Q17.2,16.4 19.8,19.4 Q16.4,16.8 12,17.2 L12,15.8 Q15.6,15.6 17.6,12.6 Z" fill="#7d5518" opacity={0.6} />
    </g>
  )
}

function Faveur() {
  return (
    <g>
      {/* étincelle divine : quatre branches, cœur blanc, halo */}
      <circle cx={12} cy={12} r={8.6} fill="#e8c04a" opacity={0.12} />
      <path d="M12,2.6 L14,9.4 L20.8,12 L14,14.6 L12,21.4 L10,14.6 L3.2,12 L10,9.4 Z" fill="#e8c04a" />
      <path d="M12,2.6 L14,9.4 L20.8,12 L12,12 Z" fill="#f6e39b" />
      <circle cx={12} cy={12} r={2} fill="#fdf6d8" />
    </g>
  )
}

function Prestige() {
  return (
    <g>
      {/* couronne de laurier fermée sur une étoile */}
      <path d="M12,4.6 L13.6,9.6 L18.8,9.6 L14.6,12.7 L16.2,17.6 L12,14.5 L7.8,17.6 L9.4,12.7 L5.2,9.6 L10.4,9.6 Z" fill="#e8c04a" />
      <path d="M12,4.6 L13.6,9.6 L18.8,9.6 L14.6,12.7 L12,10.8 Z" fill="#f6e39b" />
      <path d="M4.4,14 Q3.4,19 7.8,21.2" stroke="#6f9a52" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <path d="M19.6,14 Q20.6,19 16.2,21.2" stroke="#587f42" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </g>
  )
}

const DESSINS: Record<IconeId, () => JSX.Element> = {
  bois: Bois,
  pierre: Pierre,
  grain: Grain,
  bronze: Bronze,
  faveur: Faveur,
  prestige: Prestige,
}

const NOMS: Record<IconeId, string> = {
  bois: 'Bois',
  pierre: 'Pierre',
  grain: 'Grain',
  bronze: 'Bronze',
  faveur: 'Faveur divine',
  prestige: 'Prestige',
}

/** pictogramme peint d'une ressource - remplace l'émoji partout où il y a la place */
export function Icone({ id, taille = 18, titre }: { id: IconeId; taille?: number; titre?: string }) {
  const Dessin = DESSINS[id]
  return (
    <svg
      className="icone-res"
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      role="img"
      aria-label={titre ?? NOMS[id]}
    >
      <title>{titre ?? NOMS[id]}</title>
      <Dessin />
    </svg>
  )
}

/**
 * « 120 [bronze] » - un montant suivi de son pictogramme. `signe` force le
 * « + » devant les gains, comme dans les récompenses de mission.
 */
export function Montant({
  n,
  id,
  taille = 15,
  signe,
}: {
  n: number
  id: IconeId
  taille?: number
  signe?: boolean
}) {
  return (
    <span className="montant">
      {signe && n > 0 ? '+' : ''}
      {n}
      <Icone id={id} taille={taille} />
    </span>
  )
}

/** nom lisible d'une ressource, pour les infobulles */
export function nomRessource(id: ResourceId): string {
  return RES[id].nom
}

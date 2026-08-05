import type { VillageCible } from './expeditions'

/*
 * ═════════════ CE QU'IL Y A À ABATTRE DERRIÈRE UN MUR ENNEMI ═════════════
 *
 * Une expédition se jouait ainsi : on percait l'enceinte, on couchait la
 * garnison, un homme touchait la place et le raid était gagné. La cité visée
 * n'était qu'un décor - joliment peint, mais sans substance. On ne pouvait rien
 * y viser, rien y démolir, et les jauges de structure n'existaient QUE dans le
 * sens défensif : on lisait la santé de ses propres bâtiments quand on se
 * faisait piller, jamais celle des bâtiments qu'on pillait soi-même.
 *
 * Chaque archétype de place forte reçoit donc ici la liste de SES ouvrages, avec
 * le nom qu'on lit sur la jauge, la position exacte de ce que le peintre a posé
 * dans `VillageEnnemi.tsx`, et la part de structure qu'ils portent. L'un d'eux
 * est le CŒUR - la tente du chef, le donjon, le temple : tant qu'il tient, la
 * place n'est pas prise.
 *
 * REPÈRE. Les positions sont celles du dessin, en coordonnées LOCALES du groupe
 * `CoeurVillage` - lequel est posé à `geo.place` et mis à l'échelle 1,28. La
 * conversion vit dans `ouvragesDe()` : un chiffre changé dans le décor doit
 * l'être ici aussi, sinon la jauge flotte à côté de son toit.
 */

/** l'échelle du groupe `CoeurVillage` - toute position locale la traverse */
export const ECHELLE_COEUR = 1.28

export interface OuvrageDef {
  id: string
  nom: string
  /** position dans le repère local du décor (avant l'échelle) */
  x: number
  y: number
  /** part de la structure totale de la place que cet ouvrage porte */
  part: number
  /** le cœur : sa chute décide du raid */
  coeur?: boolean
  /** demi-largeur du dessin, pour poser la jauge au-dessus du toit */
  haut: number
}

type Decor = VillageCible['decor']

/**
 * Structure totale d'une place, dérivée de sa puissance. Calibrée pour qu'une
 * colonne capable de coucher la garnison ait ensuite de quoi démolir - une
 * vingtaine de secondes au camp de pillards, une minute devant la forteresse -
 * sans jamais s'approcher des trois minutes du renoncement forcé.
 */
export function structureTotale(v: VillageCible): number {
  return Math.round(120 + v.puissance * 1.7)
}

const OUVRAGES: Record<Decor, OuvrageDef[]> = {
  camp: [
    { id: 'tente-chef', nom: 'Tente du chef', x: -30, y: 16, part: 0.4, coeur: true, haut: 34 },
    { id: 'tente-o', nom: 'Tente de peaux', x: -92, y: 4, part: 0.16, haut: 30 },
    { id: 'tente-e', nom: 'Tente de peaux', x: 38, y: 2, part: 0.14, haut: 27 },
    { id: 'tente-ne', nom: 'Tente de peaux', x: 96, y: 18, part: 0.16, haut: 31 },
    { id: 'butin', nom: 'Tas de butin', x: 4, y: 40, part: 0.14, haut: 16 },
  ],
  hameau: [
    { id: 'grande-hutte', nom: 'Grande hutte', x: -12, y: 20, part: 0.4, coeur: true, haut: 40 },
    { id: 'hutte-o', nom: 'Hutte de torchis', x: -86, y: 4, part: 0.2, haut: 33 },
    { id: 'hutte-e', nom: 'Hutte de torchis', x: 74, y: 2, part: 0.18, haut: 30 },
    { id: 'enclos', nom: 'Enclos à chèvres', x: 124, y: 36, part: 0.1, haut: 10 },
    { id: 'butin', nom: 'Réserve de grain', x: 30, y: 44, part: 0.12, haut: 16 },
  ],
  comptoir: [
    { id: 'entrepot', nom: 'Entrepôt', x: -52, y: 16, part: 0.42, coeur: true, haut: 46 },
    { id: 'amphores-h', nom: 'Amphores d’huile', x: 62, y: 16, part: 0.18, haut: 20 },
    { id: 'amphores-v', nom: 'Amphores de vin', x: 70, y: 34, part: 0.16, haut: 18 },
    { id: 'balance', nom: 'Balance du changeur', x: -6, y: 42, part: 0.1, haut: 24 },
    { id: 'butin', nom: 'Caisses cerclées', x: -118, y: 40, part: 0.14, haut: 16 },
  ],
  village: [
    { id: 'grande-maison', nom: 'Grande maison', x: -24, y: 22, part: 0.34, coeur: true, haut: 47 },
    { id: 'maison-o', nom: 'Maison à tuiles', x: -96, y: 2, part: 0.17, haut: 38 },
    { id: 'maison-e', nom: 'Maison à tuiles', x: 56, y: 4, part: 0.16, haut: 36 },
    { id: 'maison-ne', nom: 'Maison basse', x: 112, y: 26, part: 0.13, haut: 30 },
    { id: 'puits', nom: 'Puits de la place', x: 4, y: 46, part: 0.08, haut: 20 },
    { id: 'butin', nom: 'Réserves', x: 78, y: 46, part: 0.12, haut: 16 },
  ],
  fort: [
    { id: 'tour-guet', nom: 'Tour de guet', x: 112, y: 4, part: 0.34, coeur: true, haut: 50 },
    { id: 'baraque-o', nom: 'Baraquements', x: -70, y: 14, part: 0.26, haut: 34 },
    { id: 'baraque-e', nom: 'Baraquements', x: 48, y: 26, part: 0.22, haut: 31 },
    { id: 'ratelier', nom: 'Râtelier de boucliers', x: -8, y: 44, part: 0.1, haut: 12 },
    { id: 'feu', nom: 'Feu de camp', x: -118, y: 30, part: 0.08, haut: 12 },
  ],
  cite: [
    { id: 'temple', nom: 'Temple de la place', x: 0, y: 0, part: 0.4, coeur: true, haut: 68 },
    { id: 'maison-o', nom: 'Demeure à colonnade', x: -108, y: 26, part: 0.2, haut: 41 },
    { id: 'maison-e', nom: 'Demeure à colonnade', x: 104, y: 30, part: 0.2, haut: 41 },
    { id: 'butin', nom: 'Offrandes', x: 0, y: 50, part: 0.2, haut: 16 },
  ],
  citadelle: [
    { id: 'donjon', nom: 'Donjon', x: -14, y: 4, part: 0.46, coeur: true, haut: 74 },
    { id: 'greniers', nom: 'Greniers voûtés', x: 94, y: 26, part: 0.22, haut: 28 },
    { id: 'etendard', nom: 'Mât de l’étendard', x: -72, y: 4, part: 0.12, haut: 34 },
    { id: 'butin', nom: 'Trésor du rocher', x: 54, y: 44, part: 0.2, haut: 16 },
  ],
  forteresse: [
    { id: 'corps-garde', nom: 'Corps de garde', x: -6, y: 10, part: 0.42, coeur: true, haut: 92 },
    { id: 'tour-o', nom: 'Tour d’angle', x: -118, y: 22, part: 0.17, haut: 62 },
    { id: 'tour-e', nom: 'Tour d’angle', x: 106, y: 22, part: 0.17, haut: 62 },
    { id: 'etendard', nom: 'Étendard de guerre', x: -72, y: 0, part: 0.1, haut: 34 },
    { id: 'butin', nom: 'Magasins', x: -6, y: 50, part: 0.14, haut: 16 },
  ],
}

/** un ouvrage tel que la bataille et la scène le manipulent */
export interface Ouvrage {
  id: string
  nom: string
  /** coordonnées de la SCÈNE (900×560), jauge et coups compris */
  x: number
  y: number
  hp: number
  max: number
  /** hauteur du dessin au-dessus du sol, dans le repère de la scène */
  haut: number
  coeur?: boolean
}

/**
 * Les ouvrages d'une place, prêts à recevoir des coups : positions converties
 * dans le repère de la scène, structure répartie selon les parts déclarées.
 */
export function ouvragesDe(v: VillageCible, place: { x: number; y: number }): Ouvrage[] {
  const total = structureTotale(v)
  return OUVRAGES[v.decor].map((o) => {
    const max = Math.max(20, Math.round(total * o.part))
    return {
      id: o.id,
      nom: o.nom,
      x: place.x + o.x * ECHELLE_COEUR,
      y: place.y + o.y * ECHELLE_COEUR,
      hp: max,
      max,
      haut: o.haut * ECHELLE_COEUR,
      coeur: o.coeur,
    }
  })
}

/** part des ouvrages abattus - décide du butin arraché en plus */
export function partAbattue(ouvrages: Ouvrage[]): number {
  if (ouvrages.length === 0) return 0
  return ouvrages.filter((o) => o.hp <= 0).length / ouvrages.length
}

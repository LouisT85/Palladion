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
 * conversion vit dans `ouvragesDe()`. Ces coordonnées étaient RECOPIÉES dans
 * `VillageEnnemi.tsx`, et un chiffre changé d'un côté seulement décalait la
 * jauge de son toit sans que rien ne s'en plaigne : le décor les lit désormais
 * ici, par `posOuvrage()`, et `ouvrages.test.ts` monte les huit archétypes pour
 * vérifier qu'aucun ouvrage ne manque au dessin.
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

/*
 * ═════════════════ CALIBRAGE DE LA DÉMOLITION ═════════════════
 *
 * L'ancienne cote - `120 + puissance × 1,7` - donnait 162 points à TOUTE la
 * place du camp de pillards, dont 65 pour la tente du chef. Cinq hoplites en
 * portent 45 par seconde : la tente tombait en une seconde et demie, et le
 * joueur a dit ce qu'il voyait - « en un coup c'est écroulé ».
 *
 * ── CE DONT LA STRUCTURE DÉPEND, ET DE QUOI ELLE NE DÉPEND PAS ──────────────
 *
 * De la PLACE SEULE : sa puissance, et le matériau dont elle est faite. Jamais
 * du nombre d'hommes envoyés. C'est un choix, non un oubli :
 *
 *  · une jauge est une propriété de la chose mesurée. « Tente du chef 410/410 »
 *    doit valoir la même cote au deuxième raid qu'au premier, sinon le chiffre
 *    n'apprend rien et le joueur ne peut RIEN prévoir ;
 *  · faire épaissir les murs quand la colonne grossit annulerait exactement le
 *    seul levier que le panneau de préparation propose. Amener du monde doit
 *    payer - c'est la décision du joueur, pas une illusion à recalibrer.
 *
 * ── CE QUE LE CALIBRAGE PRÉCÉDENT AVAIT MANQUÉ ──────────────────────────────
 *
 * `1000 + puissance × 3` ne se voit pas au calcul, seulement à la sonde. Vraies
 * expéditions dans le navigateur, chaque place avec SA colonne plausible :
 *
 *   camp de pillards     860 pts · 4 lanciers ............ 39 s de démolition
 *   forteresse mysienne 2 983 pts · 20 hommes + 2 héros ... 23 s de démolition
 *
 * La plus grande place du jeu tombait plus vite que la plus petite. La raison
 * tient en une comparaison de PENTES, et non de valeurs :
 *
 *  · la cadence de démolition réellement portée est multipliée par 5 environ
 *    d'un bout à l'autre du monde (24 pts/s au camp avec quatre lanciers,
 *    117 pts/s à la forteresse avec vingt hommes et deux héros) ;
 *  · l'ancienne cote, elle, n'était multipliée que par 3,5 (860 → 2 983), parce
 *    que ses mille points de SOCLE écrasaient le terme de puissance : à la plus
 *    petite place, 1 000 des 1 075 points ne devaient rien à la place elle-même.
 *
 * Une cote doit croître au moins aussi vite que ce qu'on lui oppose. La nouvelle
 * est multipliée par 5,7 (1 024 → 5 781).
 *
 * ── POURQUOI UNE RACINE PLUTÔT QU'UNE DROITE ────────────────────────────────
 *
 * Il faut être honnête : le pli n'est pas obligatoire. `1084 + puissance × 7,85`
 * passe exactement par les deux mêmes bornes et tiendrait la fenêtre. Mais elle
 * la tiendrait avec un socle de mille points, c'est-à-dire en refaisant le défaut
 * qu'on vient de corriger un cran plus bas : entre le camp (puissance 25) et le
 * hameau thrace (puissance 55) - le double de puissance - la droite n'ajoute que
 * 18 % de structure, quand la racine en ajoute 38 %. Le socle rendrait les places
 * du début de partie indiscernables les unes des autres, et la jauge cesserait
 * d'apprendre quoi que ce soit. La racine met le poids sur le terme qui VARIE :
 * 280 points de socle seulement, soit 5 % de la cote d'une forteresse.
 *
 * ── LES CADENCES RELEVÉES ───────────────────────────────────────────────────
 *
 * Le mètre utile n'est pas `DPS_BATIMENT` (9 points/s par homme) : entre la
 * cadence de 2,1 s, la marche d'un ouvrage au suivant, la redistribution des
 * hommes quand une cible tombe et les pertes de l'assaut, personne ne porte ces
 * neuf points. On ne les calcule donc pas, on les relève (moteur rejoué à trois
 * graines, `ouvrages.test.ts` §3) :
 *
 *   camp        4 lanciers ......................  24 pts/s
 *               5 hoplites ......................  41 pts/s
 *               8 lanciers + 2 archers ..........  91 pts/s
 *   fort        8 hoplites + 2 béliers ..........  76 pts/s
 *               5 lanciers 3 archers 5 hoplites 1 bélier   93 pts/s
 *   forteresse  12 hoplites 3 béliers 5 peltastes 109 pts/s
 *               les mêmes + Hector 3 et Achille 3  138 pts/s
 *
 * ── LA COTE, ET CE QU'ELLE DONNE ────────────────────────────────────────────
 *
 * `(280 + 200 × √puissance) × solidité`. SONDE PLAYWRIGHT, VRAIES EXPÉDITIONS,
 * mêmes colonnes avant et après, la cote de comparaison étant celle dont le
 * joueur s'est plaint (`120 + puissance × 1,7`) :
 *
 *                   structure        démolition          raid       issue
 *                avant → après     avant → après   avant → après
 *   camp            163   1024      9,5 s  34-44 s   23 s  47-58 s   ★★/★★★
 *   fort            377   2729     12,8 s   49,8 s   43 s    81 s     ★★
 *   forteresse      834   5781     11,8 s   39-41 s  47 s  73-76 s    ★★
 *
 * Colonnes : 4 lanciers ; 5 lanciers 3 archers 5 hoplites 1 bélier ; 12 hoplites
 * 3 lanciers 3 archers 2 béliers avec Hector 3 et Achille 3. (La forteresse est
 * IMPRENABLE sans héros : mesuré, vingt hommes de puissance 485 n'enlèvent pas
 * un seul point de structure - la colonne rompt sous les traits du rempart.)
 *
 * LES FOURCHETTES SONT VRAIES ET IL FAUT LES LIRE. Deux passes du même raid sur
 * le camp donnent 33,7 s et 43,7 s : à quatre lanciers, qu'il en tombe UN change
 * la cadence d'un tiers. C'est pourquoi l'ordre des durées ne se garde pas sur
 * ces chiffres-là mais sur le moteur rejoué à graine fixe (`ouvrages.test.ts`
 * §3), où chaque place reçoit une colonne de même plausibilité :
 *
 *   camp   5 hoplites .......................... 25 s
 *   fort   8 hoplites + 2 béliers ............... 36 s
 *   forteresse 12 hoplites 3 béliers 5 peltastes  53 s
 *
 * Avant, les trois places tombaient dans la même dizaine de secondes et la plus
 * grande allait le plus vite. Après, l'ordre est celui du bon sens, et tout tient
 * sous les 180 s de `EXPEDITION_TIMEOUT_MS` : la marge la plus mince est la
 * forteresse abordée SANS héros, 102 s au moteur rejoué à trois graines.
 *
 * Deux prix assumés :
 *  · huit lanciers et deux archers lâchés sur un camp de pillards le rasent en
 *    douze secondes. C'est juste : un tel gâchis de bronze mérite sa promenade ;
 *  · une colonne trop mince met longtemps - quatre lanciers au camp, 34 s au
 *    navigateur et 41 s au moteur nu. C'est juste aussi : quatre hommes qui
 *    démontent un camp, cela prend le temps que cela prend.
 */

/** points de structure que porte la place la plus dérisoire */
export const STRUCTURE_BASE = 280
/**
 * Points gagnés par racine de puissance. RACINE et non puissance : voir le
 * calibrage ci-dessus - une cote proportionnelle faisait tomber la forteresse
 * plus vite que le camp.
 */
export const STRUCTURE_PAR_RACINE = 200

/**
 * Ce dont la place est FAITE. Des peaux tendues sur des perches ne se défendent
 * pas comme un appareil cyclopéen, et deux places de puissance voisine ne
 * s'écroulent pas au même rythme si l'une est de torchis et l'autre de granit.
 */
export const SOLIDITE: Record<Decor, number> = {
  camp: 0.8, // peaux, perches, cordages
  hameau: 0.85, // torchis et chaume
  comptoir: 0.92, // brique crue chaulée, toit plat
  village: 1, // pierre sèche et tuiles
  fort: 1, // rondins équarris
  cite: 1.12, // pierre de taille et marbre
  citadelle: 1.22, // roc et moellons
  forteresse: 1.32, // appareil cyclopéen
}

/**
 * Structure totale d'une place : sa puissance, et le matériau dont elle est
 * faite. Voir le calibrage ci-dessus pour le pourquoi de chaque chiffre.
 */
export function structureTotale(v: VillageCible): number {
  return Math.round((STRUCTURE_BASE + Math.sqrt(v.puissance) * STRUCTURE_PAR_RACINE) * SOLIDITE[v.decor])
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

/**
 * Position locale d'un ouvrage - LA source, pour le peintre comme pour la jauge.
 *
 * `VillageEnnemi.tsx` posait ses tentes et ses tours sur des nombres écrits à la
 * main, recopiés ici : deux vérités pour une seule chose, et un décalage qui ne
 * se voit que si l'on regarde la capture au bon moment. Le décor lit désormais
 * ces coordonnées, si bien qu'un ouvrage déplacé emmène sa jauge ET sa ruine.
 */
export function posOuvrage(decor: Decor, id: string): { x: number; y: number } {
  const o = OUVRAGES[decor].find((d) => d.id === id)
  if (!o) throw new Error(`ouvrage inconnu dans le décor « ${decor} » : ${id}`)
  return { x: o.x, y: o.y }
}

/** les identifiants d'ouvrage d'un décor, dans l'ordre où ils sont déclarés */
export function idsOuvrages(decor: Decor): string[] {
  return OUVRAGES[decor].map((o) => o.id)
}

/** l'identifiant du CŒUR de ce décor - celui dont la chute décide du raid */
export function idCoeur(decor: Decor): string {
  const o = OUVRAGES[decor].find((d) => d.coeur)
  if (!o) throw new Error(`le décor « ${decor} » n’a pas de cœur`)
  return o.id
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

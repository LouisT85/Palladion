import { VILLAGES_PAR_ID } from './expeditions'

/*
 * ═══════════════════ LES RELIQUES ═══════════════════
 *
 * On revenait d'expédition avec du bois, de la pierre et du bronze. Trois tas
 * plus gros, et rien à raconter : la Troade entière valait un multiplicateur de
 * butin. Aucune raison d'aller à Ténédos plutôt qu'à Lesbos, sinon le chiffre.
 *
 * Une relique change cela : chaque place forte cache UN objet qu'on ne trouve
 * nulle part ailleurs, et l'on y retourne pour lui. Elle n'est pas un butin de
 * plus, c'est une décision, parce que le temple n'a que des NICHES COMPTÉES.
 *
 *  · une relique en réserve ne fait RIEN. Elle est dans un coffre, elle attend ;
 *  · le temple offre 2, 3, 4 puis 6 niches selon son niveau. À douze reliques,
 *    on ne peut jamais tout montrer : on arbitre entre récolte et rempart, entre
 *    ferveur et butin - et l'arbitrage change quand la partie change ;
 *  · les effets sont MODESTES (8 à 15 %) mais permanents et cumulables. Six
 *    niches bien garnies pèsent autant qu'un bâtiment de plus, sans jamais
 *    remplacer un choix de construction.
 *
 * Les rares se cachent derrière trois étoiles : le Palladion ne se ramasse pas
 * au premier raid.
 */

export type RareteRelique = 'commune' | 'insigne' | 'sacree'

/**
 * Ce qu'une vitrine de temple garnie change au village. Mêmes noms que
 * `BonusFaveurs` là où les deux se recouvrent : le store cumule les deux de la
 * même façon.
 */
export interface EffetsReliques {
  grainPct: number
  boisPct: number
  pierrePct: number
  bronzePct: number
  faveurPct: number
  /** structure des remparts */
  murPct: number
  /** structure des bâtiments de l'intérieur */
  structurePct: number
  /** portée des tours */
  porteePct: number
  butinPct: number
  degatsPct: number
  /** temps de formation des recrues, en moins */
  recruesPct: number
  /** entretien des héros, en moins */
  entretienPct: number
}

export const RELIQUES_NEUTRES: EffetsReliques = {
  grainPct: 0,
  boisPct: 0,
  pierrePct: 0,
  bronzePct: 0,
  faveurPct: 0,
  murPct: 0,
  structurePct: 0,
  porteePct: 0,
  butinPct: 0,
  degatsPct: 0,
  recruesPct: 0,
  entretienPct: 0,
}

export interface ReliqueDef {
  id: string
  nom: string
  emoji: string
  /** ce qu'elle est, et pourquoi elle est là - deux phrases, pas plus */
  desc: string
  rarete: RareteRelique
  /** la place forte où elle dort */
  village: string
  /** étoiles déjà gagnées sur ce village pour qu'elle puisse apparaître */
  etoiles: number
  /** ce qu'elle donne, exposée au temple */
  bonus: Partial<EffetsReliques>
  /** l'effet en une ligne, pour la vitrine */
  effet: string
}

/**
 * Les douze reliques de la matière troyenne. Une par intention de jeu : qui
 * bâtit veut le Palladion, qui pille veut la planche d'Argo, qui prie veut le
 * voile. Aucune n'est bonne partout, et c'est le but des niches.
 */
export const RELIQUES: ReliqueDef[] = [
  {
    id: 'galet-scamandre',
    nom: 'Galet du Scamandre',
    emoji: '🪨',
    desc: 'Une pierre polie tirée du fleuve qui borde la plaine de Troie. Les tailleurs jurent qu’elle apprend à la carrière comment se fendre.',
    rarete: 'commune',
    village: 'camp-pillards',
    etoiles: 1,
    bonus: { pierrePct: 0.08 },
    effet: '+8 % de pierre',
  },
  {
    id: 'mors-xanthos',
    nom: 'Mors de Xanthos',
    emoji: '🐎',
    desc: 'Le mors du cheval immortel d’Achille, celui qui parla pour annoncer la mort de son maître. Les attelages tirent sans broncher.',
    rarete: 'commune',
    village: 'camp-pillards',
    etoiles: 2,
    bonus: { boisPct: 0.08 },
    effet: '+8 % de bois',
  },
  {
    id: 'cendre-ilos',
    nom: 'Cendre du tombeau d’Ilos',
    emoji: '⚱️',
    desc: 'Une pincée grise prise au tumulus du fondateur de la ville. Mêlée au mortier, elle tient ce que les hommes ont bâti.',
    rarete: 'commune',
    village: 'hameau-thrace',
    etoiles: 1,
    bonus: { structurePct: 0.08 },
    effet: '+8 % de structure aux bâtiments',
  },
  {
    id: 'corde-philoctete',
    nom: 'Corde d’arc de Philoctète',
    emoji: '🏹',
    desc: 'Un boyau tressé qui fut tendu sur l’arc d’Héraclès. Elle ne se détend ni sous la pluie ni sous la peur.',
    rarete: 'commune',
    village: 'hameau-thrace',
    etoiles: 2,
    bonus: { porteePct: 0.1 },
    effet: '+10 % de portée aux tours',
  },
  {
    id: 'planche-argo',
    nom: 'Planche de l’Argo',
    emoji: '🛶',
    desc: 'Un bordage du navire qui rapporta la Toison. Le bois se souvient du chemin du retour, et de la part qu’on y ramène.',
    rarete: 'insigne',
    village: 'comptoir-phenicien',
    etoiles: 2,
    bonus: { butinPct: 0.12 },
    effet: '+12 % de butin en expédition',
  },
  {
    id: 'sceau-priam',
    nom: 'Sceau de Priam',
    emoji: '💠',
    desc: 'Un cachet de lapis au chiffre du vieux roi. On ne le montre pas sans obtenir un meilleur prix du bronze.',
    rarete: 'insigne',
    village: 'comptoir-phenicien',
    etoiles: 3,
    bonus: { bronzePct: 0.1 },
    effet: '+10 % de bronze',
  },
  {
    id: 'coupe-nestor',
    nom: 'Coupe de Nestor',
    emoji: '🍶',
    desc: 'La coupe d’or à quatre anses du vieux roi de Pylos, qu’il tendait à ses hôtes. Ce qu’on verse dedans ne manque jamais à table.',
    rarete: 'insigne',
    village: 'village-dardanien',
    etoiles: 2,
    bonus: { grainPct: 0.12 },
    effet: '+12 % de grain',
  },
  {
    id: 'os-pelops',
    nom: 'Os d’épaule de Pélops',
    emoji: '🦴',
    desc: 'L’omoplate d’ivoire de l’ancêtre des Atrides, que les Achéens firent venir sous Troie pour vaincre. Les recrues se forment plus vite sous son regard.',
    rarete: 'insigne',
    village: 'village-dardanien',
    etoiles: 3,
    bonus: { recruesPct: 0.15 },
    effet: '−15 % sur le temps de formation',
  },
  {
    id: 'trepied-agamemnon',
    nom: 'Trépied d’Agamemnon',
    emoji: '🏺',
    desc: 'Un des sept trépieds offerts pour racheter la colère d’Achille. Les braves qui y mangent réclament moins.',
    rarete: 'insigne',
    village: 'fort-acheen',
    etoiles: 2,
    bonus: { entretienPct: 0.15 },
    effet: '−15 % sur l’entretien des héros',
  },
  {
    id: 'voile-helene',
    nom: 'Voile d’Hélène',
    emoji: '🧣',
    desc: 'Le voile de lin que la plus belle des mortelles laissa sur les remparts. Les dieux se penchent pour le regarder, et vous entendent au passage.',
    rarete: 'sacree',
    village: 'cite-lesbos',
    etoiles: 3,
    bonus: { faveurPct: 0.15 },
    effet: '+15 % de faveur produite',
  },
  {
    id: 'fragment-palladion',
    nom: 'Fragment du Palladion',
    emoji: '🗿',
    desc: 'Un éclat d’olivier de la statue tombée du ciel, celle qui rend une ville imprenable tant qu’elle y demeure. Le mur en tient debout.',
    rarete: 'sacree',
    village: 'citadelle-tenedos',
    etoiles: 3,
    bonus: { murPct: 0.1, structurePct: 0.1 },
    effet: '+10 % de structure aux remparts ET aux bâtiments',
  },
  {
    id: 'pointe-achille',
    nom: 'Pointe de lance d’Achille',
    emoji: '🗡️',
    desc: 'Le fer de la lance de frêne du Pélion, taillée par Chiron. Elle blesse et elle guérit, dit-on ; on n’a vérifié que le premier.',
    rarete: 'sacree',
    village: 'forteresse-mysienne',
    etoiles: 3,
    bonus: { degatsPct: 0.1 },
    effet: '+10 % de dégâts à toute l’armée',
  },
]

export const RELIQUE_PAR_ID: Record<string, ReliqueDef> = Object.fromEntries(RELIQUES.map((r) => [r.id, r]))

export const NOM_RARETE: Record<RareteRelique, string> = {
  commune: 'Commune',
  insigne: 'Insigne',
  sacree: 'Sacrée',
}

/** chance qu'une relique donnée sorte d'un assaut victorieux, selon sa rareté */
export const CHANCE_RARETE: Record<RareteRelique, number> = {
  commune: 0.3,
  insigne: 0.18,
  sacree: 0.09,
}

/** ordre de tirage : la rare passe la première, sinon la commune l'étoufferait */
const ORDRE_RARETE: RareteRelique[] = ['sacree', 'insigne', 'commune']

/** les reliques que cette place forte peut rendre */
export function reliquesDuVillage(villageId: string): ReliqueDef[] {
  return RELIQUES.filter((r) => r.village === villageId)
}

/**
 * Niches de la vitrine selon le niveau du temple. Sans temple, aucune : une
 * relique ne s'expose pas dans une cabane.
 *
 * Deux niches pour douze reliques, c'est le cœur du système - on choisit, et
 * l'on regrette. Six au niveau 4 récompense l'effort sans jamais permettre de
 * tout prendre.
 */
export function nichesTemple(niveau: number): number {
  return [0, 2, 3, 4, 6][Math.max(0, Math.min(4, Math.floor(niveau)))] ?? 0
}

/**
 * Ce qu'un assaut victorieux rapporte comme relique, ou `null`. `etoiles` est le
 * palmarès du joueur SUR CE VILLAGE : les reliques rares n'apparaissent qu'à qui
 * l'a vraiment soumis.
 *
 * `possedees` évite de retomber deux fois sur le même objet - une relique est
 * unique, et un tirage qui redonne la coupe de Nestor est un raid pour rien.
 */
export function butinRelique(
  villageId: string,
  etoiles: number,
  roll: number,
  possedees: string[] = [],
): string | null {
  const candidats = reliquesDuVillage(villageId)
    .filter((r) => r.etoiles <= etoiles && !possedees.includes(r.id))
    .sort((a, b) => ORDRE_RARETE.indexOf(a.rarete) - ORDRE_RARETE.indexOf(b.rarete))
  if (candidats.length === 0) return null
  const r = Math.max(0, Math.min(0.999999, roll))
  let acc = 0
  for (const c of candidats) {
    acc += CHANCE_RARETE[c.rarete]
    if (r < acc) return c.id
  }
  return null
}

/**
 * Somme des reliques EXPOSÉES. Les autres ne comptent pas : c'est toute la
 * mécanique, et la fonction ne prend donc en entrée que la vitrine. Les ids
 * inconnus (relique retirée d'une version à l'autre) sont ignorés en silence
 * plutôt que de casser une sauvegarde.
 */
export function effetsCumules(exposees: string[]): EffetsReliques {
  const out = { ...RELIQUES_NEUTRES }
  for (const id of exposees) {
    const def = RELIQUE_PAR_ID[id]
    if (!def) continue
    for (const [k, v] of Object.entries(def.bonus) as [keyof EffetsReliques, number][]) {
      out[k] += v
    }
  }
  return out
}

/**
 * La vitrine telle qu'elle compte VRAIMENT : les niches en trop sont coupées.
 * Le store doit s'en servir avant `effetsCumules` - une sauvegarde faite avec un
 * temple de niveau 4 puis rouverte sur un temple en ruine ne doit pas continuer
 * à rendre six reliques.
 */
export function vitrineEffective(exposees: string[], niveauTemple: number): string[] {
  return exposees.filter((id) => !!RELIQUE_PAR_ID[id]).slice(0, nichesTemple(niveauTemple))
}

/** reste-t-il une niche libre ? */
export function nichesLibres(exposees: string[], niveauTemple: number): number {
  return Math.max(0, nichesTemple(niveauTemple) - exposees.length)
}

export function peutExposer(id: string, exposees: string[], niveauTemple: number): boolean {
  if (!RELIQUE_PAR_ID[id]) return false
  if (exposees.includes(id)) return false
  return nichesLibres(exposees, niveauTemple) > 0
}

/** nom de la place forte où dort une relique - pour la fiche */
export function lieuDe(id: string): string {
  const def = RELIQUE_PAR_ID[id]
  if (!def) return '—'
  return VILLAGES_PAR_ID[def.village]?.nom ?? def.village
}

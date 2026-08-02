import { HEROS } from './heros'
import type { HeroId } from './types'

/*
 * ═══════════════════ LES CHAMPIONS ACHÉENS ═══════════════════
 *
 * Une vague, c'était un budget dépensé en pillards et en béliers. Toutes les
 * vagues se ressemblaient donc : plus grosses, jamais autres.
 *
 * Un champion change cela. Quand la menace est haute, un NOM prend la tête de la
 * colonne - et pas n'importe lequel : l'un des huit héros de la matière
 * troyenne, précisément ceux que le joueur peut recruter. Achille ne vient pas
 * sous vos murs par hasard : il vient parce qu'il n'est pas à votre table.
 *
 * Trois règles qui font tout l'intérêt :
 *
 *  · un héros À VOTRE SERVICE ne peut pas vous assiéger. Recruter Achille, c'est
 *    littéralement se retirer Achille de la liste des ennemis possibles - la
 *    meilleure raison du monde d'aller le chercher ;
 *  · le champion retourne SA capacité contre vous. Celle-là même que sa fiche
 *    vous promet si vous l'engagez : on sait exactement ce qu'on subit ;
 *  · il se tue. C'est un homme, il a des points de vie, et l'abattre coupe net
 *    sa capacité - plus l'honneur d'avoir versé le sang d'un héros.
 */

export interface CapaciteChampion {
  nom: string
  emoji: string
  /** ce qu'elle fait, dit au joueur avant qu'elle tombe */
  desc: string
  /** délai après le début de la bataille avant qu'il ne la lance (ms) */
  delai: number
  effet:
    | { type: 'fureur'; degats: number; duree: number }
    | { type: 'protection'; reduction: number; duree: number }
    | { type: 'renforts'; enemy: 'pillard' | 'guerrier' | 'mercenaire'; count: number }
    | { type: 'sape'; part: number }
    | { type: 'terreur'; seuil: number; duree: number }
}

export interface ChampionDef {
  id: HeroId
  /** cri de guerre, affiché quand la colonne se montre */
  titre: string
  /** ce que sa venue annonce, en une phrase */
  presage: string
  /** menace minimale pour qu'il daigne se déplacer */
  menaceMin: number
  /** poids du tirage - les plus grands noms restent rares */
  poids: number
  /** points de vie et frappe, en multiples d'un mercenaire */
  vigueur: number
  frappe: number
  capacite: CapaciteChampion
  /** ce que son cadavre rapporte */
  butin: { bronze: number; faveur: number }
}

/** un mercenaire vaut 115 pv / 19 atk : les champions se règlent là-dessus */
export const CHAMPIONS: ChampionDef[] = [
  {
    id: 'achille',
    titre: 'Achille mène l’assaut',
    presage: 'Le Pélide marche à votre porte. Aucun mur de Troade n’a jamais tenu le jour de sa colère.',
    menaceMin: 62,
    poids: 2,
    vigueur: 3.4,
    frappe: 2.6,
    capacite: {
      nom: 'Fureur du Pélide',
      emoji: '🔥',
      desc: 'Sa colère embrase toute la colonne : +55 % de dégâts pendant vingt secondes.',
      delai: 22_000,
      effet: { type: 'fureur', degats: 0.55, duree: 20_000 },
    },
    butin: { bronze: 220, faveur: 30 },
  },
  {
    id: 'ajax',
    titre: 'Ajax mène l’assaut',
    presage: 'Le Télamonien avance derrière son grand bouclier de sept peaux. Vos flèches ne le trouveront pas.',
    menaceMin: 48,
    poids: 4,
    vigueur: 4.2,
    frappe: 1.7,
    capacite: {
      nom: 'Le bouclier aux sept peaux',
      emoji: '🛡️',
      desc: 'Il couvre les siens : −40 % de dégâts subis par la colonne pendant vingt-cinq secondes.',
      delai: 16_000,
      effet: { type: 'protection', reduction: 0.4, duree: 25_000 },
    },
    butin: { bronze: 180, faveur: 24 },
  },
  {
    id: 'agamemnon',
    titre: 'Agamemnon mène l’assaut',
    presage: 'Le roi des rois est venu compter ce qui lui revient. Derrière lui, d’autres colonnes attendent son ordre.',
    menaceMin: 52,
    poids: 4,
    vigueur: 2.6,
    frappe: 1.6,
    capacite: {
      nom: 'Ordre du roi',
      emoji: '👑',
      desc: 'Il fait donner la réserve : une seconde vague de guerriers débouche en pleine bataille.',
      delai: 30_000,
      effet: { type: 'renforts', enemy: 'guerrier', count: 5 },
    },
    butin: { bronze: 300, faveur: 18 },
  },
  {
    id: 'ulysse',
    titre: 'Ulysse mène l’assaut',
    presage: 'L’homme aux mille tours est dans la plaine. Ce ne sont pas vos murs qui décideront de ce jour.',
    menaceMin: 45,
    poids: 3,
    vigueur: 2.2,
    frappe: 1.5,
    capacite: {
      nom: 'La ruse',
      emoji: '🐎',
      desc: 'Un pan de mur s’ouvre de l’intérieur : le secteur le plus entamé perd la moitié de ce qui lui reste.',
      delai: 26_000,
      effet: { type: 'sape', part: 0.5 },
    },
    butin: { bronze: 200, faveur: 26 },
  },
  {
    id: 'diomede',
    titre: 'Diomède mène l’assaut',
    presage: 'Le Tydide a blessé des dieux. Il ne s’arrêtera pas devant une palissade.',
    menaceMin: 55,
    poids: 3,
    vigueur: 3,
    frappe: 2.3,
    capacite: {
      nom: 'Aristie',
      emoji: '⚔️',
      desc: 'Il combat pour dix : +45 % de dégâts à toute la colonne pendant dix-huit secondes.',
      delai: 20_000,
      effet: { type: 'fureur', degats: 0.45, duree: 18_000 },
    },
    butin: { bronze: 190, faveur: 26 },
  },
  {
    id: 'cassandre',
    titre: 'Cassandre suit la colonne',
    presage: 'La voyante marche avec eux, et clame votre fin à qui veut l’entendre. Vos hommes, eux, l’entendent.',
    menaceMin: 40,
    poids: 3,
    vigueur: 1.4,
    frappe: 0.6,
    capacite: {
      nom: 'La prophétie',
      emoji: '🔮',
      desc: 'Elle annonce votre chute et l’on y croit : vos hommes rompent bien plus tôt, trente secondes durant.',
      delai: 14_000,
      effet: { type: 'terreur', seuil: 1.6, duree: 30_000 },
    },
    butin: { bronze: 120, faveur: 34 },
  },
  {
    id: 'hector',
    titre: 'Hector mène l’assaut',
    presage: 'Le rempart de Troie a quitté ses murs pour marcher sur les vôtres. Il sait exactement où ils sont faibles.',
    menaceMin: 58,
    poids: 2,
    vigueur: 3.8,
    frappe: 2.1,
    capacite: {
      nom: 'Il sait où frapper',
      emoji: '🏛️',
      desc: 'Un homme qui a tenu des murailles sait les abattre : le pan le plus entamé perd 40 % de ce qui lui reste.',
      delai: 24_000,
      effet: { type: 'sape', part: 0.4 },
    },
    butin: { bronze: 240, faveur: 28 },
  },
  {
    id: 'enee',
    titre: 'Énée mène l’assaut',
    presage: 'Le fils d’Anchise conduit la colonne. Ceux-là ne mourront pas jusqu’au dernier : ils savent se retirer.',
    menaceMin: 42,
    poids: 4,
    vigueur: 2.4,
    frappe: 1.5,
    capacite: {
      nom: 'Le pas d’Anchise',
      emoji: '🔥',
      desc: 'Il couvre la colonne : −30 % de dégâts subis pendant trente secondes.',
      delai: 18_000,
      effet: { type: 'protection', reduction: 0.3, duree: 30_000 },
    },
    butin: { bronze: 160, faveur: 22 },
  },
]

export const CHAMPION_PAR_ID: Record<string, ChampionDef> = Object.fromEntries(CHAMPIONS.map((c) => [c.id, c]))

/** nom, emblème et couleur - repris de la fiche du héros, il s'agit du même homme */
export function ficheChampion(id: HeroId): { nom: string; emoji: string; couleur: string } {
  const h = HEROS[id]
  return { nom: h.nom, emoji: h.emoji, couleur: h.couleur }
}

/**
 * Qui peut venir vous assiéger. On écarte ceux qui sont à votre service - c'est
 * la raison d'être du recrutement - et ceux que leur arc a tués : un mort ne
 * revient pas, même contre vous.
 */
export function championsPossibles(
  menace: number,
  indisponibles: HeroId[],
): ChampionDef[] {
  return CHAMPIONS.filter((c) => menace >= c.menaceMin && !indisponibles.includes(c.id))
}

/**
 * Tire un champion pour la vague qui vient, ou `null`. Le tirage est PONDÉRÉ :
 * Achille et Hector restent des événements, Ajax et Énée se voient plus souvent.
 * `chance` (0…1) est la probabilité qu'un champion se présente du tout.
 */
export function tirerChampion(
  menace: number,
  indisponibles: HeroId[],
  chance: number,
  alea: number,
  aleaChoix: number,
): ChampionDef | null {
  if (alea >= chance) return null
  const possibles = championsPossibles(menace, indisponibles)
  if (possibles.length === 0) return null
  const total = possibles.reduce((a, c) => a + c.poids, 0)
  let seuil = aleaChoix * total
  for (const c of possibles) {
    seuil -= c.poids
    if (seuil <= 0) return c
  }
  return possibles[possibles.length - 1]
}

/**
 * Probabilité qu'un champion mène la vague, selon la menace. Rien sous 40, puis
 * cela monte doucement : à menace maximale, un assaut sur trois porte un nom.
 */
export function chanceChampion(menace: number): number {
  if (menace < 40) return 0
  return Math.min(0.34, (menace - 40) / 175)
}

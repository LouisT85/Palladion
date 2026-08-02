import { VILLAGES_CIBLES, type VillageCible } from './expeditions'
import type { Cost } from './types'

/*
 * ═══════════════════ LA DIPLOMATIE DE LA TROADE ═══════════════════
 *
 * Les huit places fortes étaient des cibles, rien d'autre. On les pillait ou on
 * les secourait, et le monde n'en gardait qu'une seule mémoire : un compteur de
 * pillages qui grossissait leur garnison. Piller Ténédos ne changeait rien à ce
 * que pensait Lesbos, et une alliance, une fois nouée, ne pouvait plus bouger.
 *
 * Ici, chaque village tient sa propre RELATION avec vous (−100…+100), et cette
 * relation vit :
 *
 *  · ce que vous faites à l'un, les autres l'apprennent. Piller un voisin fâche
 *    toute la côte ; lever un siège vous vaut du crédit partout ;
 *  · une relation se travaille sans armée - un PRÉSENT coûte des ressources et
 *    rachète une rancune ; un PACTE s'achète quand on est déjà bien vu ;
 *  · un MARIAGE scelle ce qu'aucun présent ne scelle : on donne un habitant, on
 *    reçoit une alliance qui ne se rompt plus et un tribut doublé ;
 *  · une alliance dont la relation s'effondre se DÉNOUE d'elle-même, et un
 *    village franchement hostile grossit la menace qui pèse sur vos murs.
 *
 * Tout est donc réversible sauf le mariage - et c'est précisément ce qui rend le
 * mariage cher : il coûte un bras au village, pour toujours.
 */

/** relation de départ avec un village qu'on n'a jamais rencontré */
export const RELATION_NEUTRE = 0

/** au-delà, on peut proposer un pacte */
export const SEUIL_PACTE = 60
/** au-delà, on peut proposer un mariage */
export const SEUIL_MARIAGE = 40
/** en deçà, le village vous est franchement hostile */
export const SEUIL_HOSTILE = -40
/** en deçà, une alliance ordinaire se dénoue */
export const SEUIL_RUPTURE = 0

/** ce qu'un pillage coûte auprès de sa victime */
export const COUT_PILLAGE = -45
/** …et auprès de tous les autres, qui l'apprennent */
export const COUT_PILLAGE_VOISINS = -9
/** ce qu'un secours rapporte auprès du sauvé */
export const GAIN_SECOURS = 55
/** …et auprès des autres */
export const GAIN_SECOURS_VOISINS = 8
/** piller un allié : la trahison se paie auprès de TOUTE la côte */
export const COUT_TRAHISON_VOISINS = -30
/** les rancunes s'émoussent : ce que le temps rend chaque journée de jeu */
export const PARDON_PAR_JOUR = 1.5

export type StatutVillage = 'marie' | 'allie' | 'ami' | 'neutre' | 'hostile'

export interface FicheStatut {
  nom: string
  emoji: string
  couleur: string
  /** ce que ce statut change, en une phrase */
  desc: string
}

export const STATUTS: Record<StatutVillage, FicheStatut> = {
  marie: {
    nom: 'Lié par le sang',
    emoji: '💍',
    couleur: '#e8c04a',
    desc: 'Un mariage vous unit. Tribut doublé, renforts à chaque assaut, et rien ne dénoue cela.',
  },
  allie: {
    nom: 'Allié',
    emoji: '🤝',
    couleur: '#7fb069',
    desc: 'Tribut régulier et renforts sur vos remparts - tant que la relation tient.',
  },
  ami: {
    nom: 'Bien disposé',
    emoji: '🕊️',
    couleur: '#8fbf5a',
    desc: 'On vous accueille bien. Assez pour proposer un pacte, ou une alliance par mariage.',
  },
  neutre: {
    nom: 'Indifférent',
    emoji: '·',
    couleur: '#9aa3a8',
    desc: 'On ne vous doit rien et l’on ne vous reproche rien.',
  },
  hostile: {
    nom: 'Hostile',
    emoji: '🗡️',
    couleur: '#c0563f',
    desc: 'On arme contre vous : chaque village hostile grossit la menace qui pèse sur vos murs.',
  },
}

/** le statut d'un village, du plus fort au plus faible engagement */
export function statutVillage(relation: number, allie: boolean, marie: boolean): StatutVillage {
  if (marie) return 'marie'
  if (allie) return 'allie'
  if (relation >= SEUIL_MARIAGE) return 'ami'
  return relation <= SEUIL_HOSTILE ? 'hostile' : 'neutre'
}

/**
 * Ce qu'un présent coûte, et ce qu'il rapporte. Le prix suit la puissance du
 * village : on n'achète pas la citadelle de Ténédos avec ce qui suffit à un camp
 * de pillards. Vingt points de relation par présent - quatre présents rachètent
 * tout juste un pillage, ce qui est le bon ordre de grandeur : réparer coûte
 * plus cher que casser.
 */
export const GAIN_PRESENT = 20

export function coutPresent(v: VillageCible): Cost {
  const p = Math.max(25, v.puissance)
  return {
    grain: Math.round(40 + p * 1.1),
    bronze: Math.round(8 + p * 0.22),
  }
}

/** ce qu'un pacte négocié coûte : cher, mais moins qu'une guerre */
export function coutPacte(v: VillageCible): Cost {
  const p = Math.max(25, v.puissance)
  return {
    bronze: Math.round(40 + p * 0.9),
    grain: Math.round(80 + p * 1.6),
  }
}

/**
 * Le prix d'un mariage. On donne un habitant - c'est là le vrai coût, et il se
 * paie en bras au village - plus les présents d'usage. En échange, l'alliance ne
 * se rompt jamais et le tribut double.
 */
export function coutMariage(v: VillageCible): Cost {
  const p = Math.max(25, v.puissance)
  return {
    bronze: Math.round(30 + p * 0.6),
    grain: Math.round(120 + p * 1.2),
    bois: Math.round(60 + p * 0.5),
  }
}

/** un village marié verse deux fois plus */
export const MULT_TRIBUT_MARIAGE = 2

/**
 * Ce qu'un village hostile ajoute à la menace du règne. Cinq points chacun : à
 * huit villages fâchés, la Troade entière arme contre vous, et cela se voit dans
 * la taille des vagues.
 */
export const MENACE_PAR_HOSTILE = 5

export function menaceDiplomatique(relations: Record<string, number>): number {
  return VILLAGES_CIBLES.filter((v) => (relations[v.id] ?? RELATION_NEUTRE) <= SEUIL_HOSTILE).length * MENACE_PAR_HOSTILE
}

/** borne une relation dans ses limites */
export function borner(n: number): number {
  return Math.max(-100, Math.min(100, n))
}

/** « +45 », « −12 », « 0 » - le chiffre tel qu'on l'affiche */
export function motRelation(n: number): string {
  const v = Math.round(n)
  return v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0'
}

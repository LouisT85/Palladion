import type { BuildingId, Villageois } from './types'

/*
 * ═══════════════════ FAMILLES ET LIGNÉES ═══════════════════
 *
 * Les habitants étaient des jetons nommés : un nom, un métier tiré à la
 * naissance, et rien d'autre. Deux villages de vingt habitants se valaient
 * exactement, et perdre « Damon » ne coûtait pas plus que perdre un chiffre.
 *
 * Trois choses suffisent à faire un village vivant, et ce sont les trois qui
 * changent une décision de jeu :
 *
 *  · L'ÂGE. Un enfant mange et ne rend pas grand-chose ; un ancien rend moins
 *    qu'un homme dans la force de l'âge, et il finit par mourir. La pyramide des
 *    âges devient donc une donnée du village, au même titre que les greniers.
 *  · LE MARIAGE. Deux adultes libres de lignées différentes font un foyer. Sans
 *    foyer, pas de naissance - les nouveaux venus arrivent alors de la côte, avec
 *    le métier qui manque, ce qui est plus lent et moins choisi.
 *  · LA TRANSMISSION. Un enfant né dans un foyer apprend le métier d'un de ses
 *    parents. C'est là tout le sel : marier son forgeron, c'est se donner des
 *    forgerons ; le laisser mourir célibataire, c'est perdre la forge avec lui.
 *
 * Échelle du temps : une journée de jeu vaut DEUX ANS de vie. Un enfant né le
 * jour 10 est adulte au jour 18 et vieux au jour 38 - assez lent pour qu'on ne
 * regarde pas une horloge, assez rapide pour qu'un règne voie passer trois
 * générations.
 */

/** années de vie par journée de jeu */
export const ANS_PAR_JOUR = 2
/** on travaille pleinement à partir de cet âge */
export const AGE_ADULTE = 16
/** au-delà, on rend moins - mais on a tout appris */
export const AGE_ANCIEN = 56
/** à partir de là, chaque journée peut être la dernière */
export const AGE_FRAGILE = 64
/** probabilité de mourir dans la journée, par année au-delà de l'âge fragile */
export const RISQUE_PAR_AN = 0.012
/** personne ne passe cet âge : au-delà, la mort est certaine dans la journée */
export const AGE_LIMITE = 88

export type Saison2 = 'enfant' | 'adulte' | 'ancien'

/** âge en années d'un habitant, au jour de jeu donné */
export function ageDe(v: { neLe?: number }, jour: number): number {
  // une sauvegarde antérieure aux lignées ne porte pas de date de naissance :
  // on la traite comme celle d'un adulte accompli, jamais comme un nourrisson
  if (v.neLe === undefined) return 30
  return Math.max(0, Math.round((jour - v.neLe) * ANS_PAR_JOUR))
}

export function saisonDeVie(age: number): Saison2 {
  if (age < AGE_ADULTE) return 'enfant'
  return age < AGE_ANCIEN ? 'adulte' : 'ancien'
}

/** ce que cet âge rend au travail, en part de ce que rend un adulte */
export function rendementAge(age: number): number {
  switch (saisonDeVie(age)) {
    case 'enfant':
      // un enfant aide, il ne remplace pas : c'est ce qui rend une génération coûteuse
      return 0.45
    case 'ancien':
      return 0.75
    default:
      return 1
  }
}

/** un adulte au sens du village : capable de tenir un poste et de porter les armes */
export function estAdulte(v: Villageois, jour: number): boolean {
  return ageDe(v, jour) >= AGE_ADULTE
}

/** « 34 ans », « 8 ans (enfant) » - ce que le recensement affiche */
export function motAge(age: number): string {
  const s = saisonDeVie(age)
  return `${age} ans${s === 'enfant' ? ' - enfant' : s === 'ancien' ? ' - ancien' : ''}`
}

/**
 * Noms de lignée. Ce ne sont pas des patronymes historiques : ce sont des noms
 * de MAISON, qui doivent se retenir d'un coup d'œil au recensement et se
 * distinguer nettement des prénoms.
 */
export const LIGNEES = [
  'Nélides', 'Alcméonides', 'Bacchiades', 'Pénéides', 'Kydonides', 'Amythaonides',
  'Éacides', 'Labdacides', 'Tantalides', 'Érechthéides', 'Héraclides', 'Danaïdes',
  'Sisyphides', 'Corinthiens', 'Mélampides', 'Argonautes', 'Thestiades', 'Céphalides',
  'Iasides', 'Périthoïdes', 'Antimachides', 'Phorbantides', 'Chalcodontides', 'Lapithes',
] as const

/** une lignée encore inutilisée, sinon la moins portée */
export function ligneeLibre(prises: string[], tirage: number): string {
  const libres = LIGNEES.filter((l) => !prises.includes(l))
  if (libres.length > 0) return libres[Math.floor(tirage * libres.length) % libres.length]
  const compte = new Map<string, number>()
  for (const l of prises) compte.set(l, (compte.get(l) ?? 0) + 1)
  return [...LIGNEES].sort((a, b) => (compte.get(a) ?? 0) - (compte.get(b) ?? 0))[0]
}

/** les vivants d'une maison */
export function maisonnee(tous: Villageois[], lignee: string): Villageois[] {
  return tous.filter((v) => v.lignee === lignee)
}

/**
 * Deux adultes libres qu'on peut marier. On refuse deux choses : les mineurs, et
 * l'entre-soi d'une même maison - c'est ce qui empêche une lignée d'absorber tout
 * le village et fait circuler les métiers entre familles.
 */
export function trouverParti(tous: Villageois[], jour: number): [Villageois, Villageois] | null {
  const libres = tous.filter(
    (v) => !v.conjoint && estAdulte(v, jour) && ageDe(v, jour) < AGE_ANCIEN,
  )
  for (let i = 0; i < libres.length; i++) {
    for (let j = i + 1; j < libres.length; j++) {
      if (libres[i].lignee && libres[i].lignee === libres[j].lignee) continue
      return [libres[i], libres[j]]
    }
  }
  return null
}

/** les foyers en âge d'avoir un enfant : deux adultes mariés, pas encore vieux */
export function foyersFeconds(tous: Villageois[], jour: number): Villageois[] {
  return tous.filter((v) => {
    if (!v.conjoint) return false
    const age = ageDe(v, jour)
    if (age < AGE_ADULTE || age >= AGE_ANCIEN) return false
    // on ne compte le foyer qu'une fois : celui dont l'id est le plus petit
    return v.id < v.conjoint
  })
}

/**
 * Le métier qu'un enfant apprend. Deux fois sur trois celui d'un parent - on
 * apprend d'abord de son père et de sa mère - sinon celui qui manque le plus au
 * village, parce qu'une génération entière de forgerons affamerait la cité.
 */
export function metierTransmis(
  pere: BuildingId,
  mere: BuildingId,
  manquant: BuildingId,
  tirage: number,
): BuildingId {
  if (tirage < 0.4) return pere
  if (tirage < 0.68) return mere
  return manquant
}

/** probabilité de mourir dans la journée à cet âge (0 avant l'âge fragile) */
export function risqueDeMort(age: number): number {
  if (age >= AGE_LIMITE) return 1
  if (age < AGE_FRAGILE) return 0
  return Math.min(0.9, (age - AGE_FRAGILE) * RISQUE_PAR_AN)
}

/** répartition du village par saison de vie - la pyramide des âges, en trois cases */
export function pyramide(tous: Villageois[], jour: number): Record<Saison2, number> {
  const out: Record<Saison2, number> = { enfant: 0, adulte: 0, ancien: 0 }
  for (const v of tous) out[saisonDeVie(ageDe(v, jour))]++
  return out
}

import { ACTE_I } from './acte-i'
import { ACTE_II } from './acte-ii'
import { ACTE_III } from './acte-iii'
import { ACTE_IV } from './acte-iv'
import { ACTE_V } from './acte-v'
import type { ActeCampagne, EtatActe } from './types'

export * from './types'

/**
 * LA CHUTE — cinq actes, de l'arrivée des nefs à la nuit du cheval.
 *
 * Un acte par fichier : ce sont des textes longs, et les mélanger rendrait la
 * relecture impossible. L'ordre du tableau EST l'ordre du récit.
 */
export const ACTES_CAMPAGNE: ActeCampagne[] = [ACTE_I, ACTE_II, ACTE_III, ACTE_IV, ACTE_V]

export const NB_ACTES = ACTES_CAMPAGNE.length

export function acteParNumero(n: number): ActeCampagne | undefined {
  return ACTES_CAMPAGNE.find((a) => a.numero === n)
}

/** un objectif est franchi quand sa jauge est pleine */
export function objectifFait(a: ActeCampagne, id: string, s: EtatActe): boolean {
  const o = a.objectifs.find((x) => x.id === id)
  if (!o) return false
  const p = o.progres(s)
  return p.cur >= p.max
}

/**
 * L'acte est accompli quand tous ses objectifs OBLIGATOIRES ont été franchis.
 *
 * On raisonne sur la liste des objectifs VERROUILLÉS, et non sur l'état courant :
 * tenir tous les objectifs au même instant serait un tout autre contrat, et un
 * contrat impossible — l'assaut que l'acte I demande de repousser tue les soldats
 * que le même acte demande de lever.
 */
export function acteAccompli(a: ActeCampagne, faits: string[]): boolean {
  return a.objectifs.filter((o) => !o.facultatif).every((o) => faits.includes(o.id))
}

/** avancement global de l'acte, pour la jauge du panneau */
export function avancementActeCampagne(a: ActeCampagne, faits: string[]): { faits: number; total: number } {
  const obligatoires = a.objectifs.filter((o) => !o.facultatif)
  return { faits: obligatoires.filter((o) => faits.includes(o.id)).length, total: obligatoires.length }
}

import type { BuildingId, Cost, GodId, HeroId, ResourceId, UnitId } from '../types'
import type { MeteoId, SaisonId } from '../saisons'

/*
 * ═══════════════════════ LA CHUTE — MODE CAMPAGNE ═══════════════════════
 *
 * Le bac à sable ne raconte rien : il fait durer. La campagne, elle, a une fin —
 * cinq actes qui suivent l'Iliade, du débarquement achéen à la ruse du cheval.
 *
 * Trois principes de conception, et ils comptent plus que le contenu :
 *
 *  1. VOUS N'ÊTES PAS TROIE. Vous tenez un village de la Troade, sur la route des
 *     armées. La grande guerre passe à côté de vous et vous écrase par accident.
 *     C'est le seul point de vue qui rende la matière jouable en gestion : Troie
 *     tombe de toute façon, et le récit n'a pas à mentir là-dessus.
 *
 *  2. CHAQUE ACTE IMPOSE UN ÉTAT DE DÉPART. On ne recommence pas de zéro à chaque
 *     acte : on hérite d'une situation écrite (bâtiments debout, garnison, saison,
 *     menace) qui raconte à elle seule ce qui vient de se passer. C'est ce qui
 *     permet à l'acte IV de commencer un siège en cours.
 *
 *  3. LES OBJECTIFS SONT DES CONTRAINTES, PAS DES COURSES. « Tenir trois assauts
 *     sans perdre la porte » se joue autrement que « produire 400 pierres » : un
 *     acte doit demander une manière de jouer, pas un total à atteindre.
 */

/** ce que les objectifs d'acte savent lire de la partie — vue en lecture seule */
export interface EtatActe {
  resources: Record<ResourceId, number>
  faveur: number
  pop: number
  morale: number
  threat: number
  wallHp: number
  tours: number
  /** jour de jeu depuis le début de l'ACTE (1 = premier jour) */
  jour: number
  buildings: Record<BuildingId, { level: number }>
  army: Record<UnitId, number>
  villageois: { poste: BuildingId | null; metier: BuildingId }[]
  gods: Record<GodId, { relation: number }>
  heros: Record<HeroId, { recrute: boolean; mort: boolean; niveau: number }>
  /** compteurs remis à zéro au début de chaque acte : ils mesurent l'acte, pas le règne */
  faits: FaitsActe
  /** alliances scellées (ids de villages) */
  alliances: string[]
}

/**
 * Ce qui s'est produit PENDANT l'acte. Le règne entier a déjà ses compteurs
 * (`stats`, `exploits`) ; un acte a besoin des siens, sans quoi « repousser trois
 * assauts » serait déjà accompli au moment où l'acte commence.
 */
export interface FaitsActe {
  assautsRepousses: number
  assautsPerdus: number
  /** assauts tenus sans qu'un seul pan de mur ne s'effondre */
  assautsMurIntact: number
  /** assauts tenus sans perdre un seul soldat */
  assautsSansPerte: number
  raidsReussis: number
  secoursPortes: number
  dilemmesTranches: number
  benedictions: number
  /** habitants morts de faim ou tombés dans la mêlée */
  pertesCiviles: number
}

export function faitsVierges(): FaitsActe {
  return {
    assautsRepousses: 0,
    assautsPerdus: 0,
    assautsMurIntact: 0,
    assautsSansPerte: 0,
    raidsReussis: 0,
    secoursPortes: 0,
    dilemmesTranches: 0,
    benedictions: 0,
    pertesCiviles: 0,
  }
}

export interface ObjectifActe {
  id: string
  /** l'ordre, à l'impératif : « Dressez une palissade » */
  texte: string
  /** la raison narrative, une phrase — c'est elle qui donne envie */
  pourquoi?: string
  progres: (s: EtatActe) => { cur: number; max: number }
  /** un objectif facultatif rapporte, mais n'empêche pas de finir l'acte */
  facultatif?: boolean
}

/** état imposé au premier matin d'un acte — fusionné dans le store */
export interface DepartActe {
  resources: Record<ResourceId, number>
  pop: number
  /** niveaux imposés ; les bâtiments absents restent à zéro */
  batiments: Partial<Record<BuildingId, number>>
  army: Record<UnitId, number>
  morale: number
  faveur: number
  tours: number
  saison: SaisonId
  meteo: MeteoId
  /** part de structure des remparts encore debout (0 à 1) */
  murPart: number
  /** relations de départ avec les Olympiens */
  relations: Partial<Record<GodId, number>>
}

/**
 * Le cadre de l'acte. Il ne redessine pas la carte — le village reste le village
 * — mais il en change la LUMIÈRE et l'horizon : la grève au petit matin n'a rien
 * de la plaine sous l'orage, et une ruine fumante se lit d'un coup d'œil.
 */
export type CadreActe = 'greve' | 'plaine' | 'murailles' | 'fleuve' | 'ruines'

export interface ActeCampagne {
  id: string
  numero: number
  /** « Acte I — Les mille nefs » */
  titre: string
  /** le lieu, en une ligne : « La grève de Sigée » */
  lieu: string
  emoji: string
  /** lu avant de jouer, un paragraphe par élément */
  prologue: string[]
  /** chanté par l'aède quand l'acte est accompli */
  epilogue: string[]
  /** ce qu'on lit si l'acte est perdu — la campagne se reprend à son début */
  echec?: string[]
  depart: DepartActe
  objectifs: ObjectifActe[]
  /** héros mis gratuitement au service du joueur par le récit lui-même */
  herosScriptes: HeroId[]
  /** la pression militaire propre à l'acte */
  menace: {
    /** délai avant le premier assaut (ms) */
    premierAssautMs: number
    threat: number
    /** ajout permanent de menace : c'est lui qui grossit les vagues d'un acte à l'autre */
    threatMod: number
  }
  cadre: CadreActe
  /** conditions de défaite propres à l'acte — l'échec doit être possible */
  defaite?: {
    texte: string
    atteinte: (s: EtatActe) => boolean
  }
  recompense: { res?: Cost; faveur?: number; pop?: number }
}

// ── petits outils partagés par les cinq actes ────────────────────────────────

/** borne la progression : une jauge ne dépasse jamais 100 % */
export function seuil(cur: number, max: number): { cur: number; max: number } {
  return { cur: Math.max(0, Math.min(cur, max)), max }
}

/** objectif à plusieurs conditions : la jauge compte les jalons franchis */
export function jalons(...conditions: boolean[]): { cur: number; max: number } {
  return { cur: conditions.filter(Boolean).length, max: conditions.length }
}

/** habitants tenant un poste dans ce bâtiment */
export function auPoste(s: EtatActe, b: BuildingId): number {
  return s.villageois.filter((v) => v.poste === b).length
}

export function armee(s: EtatActe): number {
  return s.army.lancier + s.army.archer + s.army.hoplite
}

/** meilleure relation obtenue avec un Olympien */
export function ferveurMax(s: EtatActe): number {
  return Object.values(s.gods).reduce((a, g) => Math.max(a, g.relation), -100)
}

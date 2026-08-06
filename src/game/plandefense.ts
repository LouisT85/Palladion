import { EFFETS_LIGNE, EFFETS_TIR } from './combat'
import { SECTEURS, UNIT_IDS } from './data'
import type { OrdreLigne, OrdreTir, OrdresBataille, UnitId } from './types'

/*
 * ═══════════════════ LE PLAN DE DÉFENSE ═══════════════════
 *
 * Il n'y avait pas de plan. La barre d'ordres - posture de la ligne, façon de
 * tirer, et surtout le PAN de l'enceinte que tient chaque type d'unité - ne
 * s'affichait qu'une fois la bataille commencée. Le joueur découvrait donc où
 * poster ses hommes au moment où ils étaient déjà en train de mourir, et devait
 * refaire les mêmes cinq gestes à chaque assaut.
 *
 * Le plan est la même décision, prise en temps de paix et gardée. Trois choses à
 * y comprendre, et ce sont les trois raisons de la forme qu'il a :
 *
 *  1. UN PAN SE DÉSIGNE PAR SON NOM, JAMAIS PAR SON RANG. Les fronts d'un assaut
 *     sont tirés au sort (`choisirFronts`) : la porte de l'est est toujours du
 *     lot, les flancs sont mêlés. « Secteur n° 1 » désigne donc le mur du nord
 *     un soir et celui du sud le lendemain. Le plan retient `'nord'`, et c'est
 *     à l'ouverture de la bataille qu'on le traduit en rang.
 *
 *  2. UN ORDRE QUI NE PEUT PAS S'EXÉCUTER DORT, IL NE DÉRAILLE PAS. Un pan qu'on
 *     n'assaille pas ce soir-là, un type d'unité qu'on n'a pas encore levé : dans
 *     les deux cas l'ordre reste écrit dans le plan et ne commande personne. Ce
 *     qu'il ne fait JAMAIS, c'est envoyer des hommes tenir un autre mur que celui
 *     qu'on a désigné - ni les retirer de la bataille.
 *
 *  3. LE PLAN EST LU UNE FOIS, À L'OUVERTURE. Les ordres de la bataille en cours
 *     sont une COPIE : le plan n'a plus de prise sur eux. C'est ce qui interdit
 *     de s'en servir pour contourner le délai de `DELAI_ORDRE_MS` en pleine
 *     mêlée - et ce que vérifie le test « le plan ne pilote pas à distance ».
 */

/** un pan de l'enceinte, désigné par l'`id` de `SECTEURS` : 'porte' | 'sud' | 'nord' */
export type PanId = string

export interface PlanDefense {
  /** posture de la ligne de mêlée, adoptée dès le premier choc */
  ligne: OrdreLigne
  /** façon de tirer, adoptée dès le premier choc */
  tir: OrdreTir
  /** le pan que tient chaque type d'unité - par NOM de pan, jamais par rang */
  pans: Partial<Record<UnitId, PanId>>
}

/** les pans de l'enceinte, tels que le plan les nomme */
export const PANS: { id: PanId; nom: string; angle: number }[] = SECTEURS.map((s) => ({
  id: s.id,
  nom: s.nom,
  angle: s.angle,
}))

/**
 * Les troupes qu'un plan de défense peut poster. Le bélier n'y est pas, et ce
 * n'est pas un oubli : `creerBataille` ne met JAMAIS de bélier parmi les
 * défenseurs - ni dans la ligne de mêlée, ni sur les créneaux. Lui donner un pan
 * à tenir serait promettre au joueur une garnison qui n'existe pas.
 */
export const UNITES_PLAN: UnitId[] = UNIT_IDS.filter((u) => u !== 'belier')

/** le plan d'un chef qui n'a rien décidé : on tient, on tire tendu, personne n'est posté */
export function planParDefaut(): PlanDefense {
  return { ligne: 'tenir', tir: 'tendu', pans: {} }
}

/**
 * Désinfecte un plan venu d'ailleurs - une sauvegarde d'avant le plan, un fichier
 * repris à la main, une version où un pan s'appelait autrement. Rien de ce qui
 * entre ici n'est cru sur parole : un ordre illisible vaut pas d'ordre.
 */
export function planValide(brut: unknown): PlanDefense {
  const p = (brut ?? {}) as Partial<PlanDefense>
  const ligne = typeof p.ligne === 'string' && p.ligne in EFFETS_LIGNE ? (p.ligne as OrdreLigne) : 'tenir'
  const tir = typeof p.tir === 'string' && p.tir in EFFETS_TIR ? (p.tir as OrdreTir) : 'tendu'
  const pans: Partial<Record<UnitId, PanId>> = {}
  const source = (p.pans ?? {}) as Record<string, unknown>
  for (const u of UNITES_PLAN) {
    const v = source[u]
    if (typeof v === 'string' && PANS.some((x) => x.id === v)) pans[u] = v
  }
  return { ligne, tir, pans }
}

/**
 * Rang d'un pan nommé parmi les secteurs RÉELLEMENT assaillis, ou `null` si
 * l'ennemi ne vient pas par là ce soir. On reconnaît le pan par son nom, et à
 * défaut par son angle : `BattleState.secteurs` ne garde pas l'`id`.
 */
export function indexDuPan(panId: PanId, secteurs: readonly { nom: string; angle: number }[]): number | null {
  const ref = SECTEURS.find((s) => s.id === panId)
  if (!ref) return null
  const parNom = secteurs.findIndex((s) => s.nom === ref.nom)
  if (parNom >= 0) return parNom
  const parAngle = secteurs.findIndex((s) => Math.abs(s.angle - ref.angle) < 0.01)
  return parAngle >= 0 ? parAngle : null
}

/**
 * Les ordres qu'une DÉFENSE DU VILLAGE adopte à son ouverture. Les pans y sont
 * traduits en rangs ; ceux que l'ennemi n'assaille pas ce soir sont laissés de
 * côté - ces hommes-là reprennent la consigne ordinaire (courir au pan enfoncé),
 * qui est de loin la moins mauvaise quand on ne tient pas le mur visé.
 *
 * `prochainAt: 0` : le plan ne coûte pas au joueur cinq secondes de main morte au
 * premier choc. Il a décidé avant, il peut se dédire tout de suite.
 */
export function ordresDefense(
  plan: PlanDefense | null | undefined,
  secteurs: readonly { nom: string; angle: number }[],
): OrdresBataille {
  const p = planValide(plan)
  const secteursOrdres: Partial<Record<UnitId, number>> = {}
  for (const u of UNITES_PLAN) {
    const pan = p.pans[u]
    if (!pan) continue
    const i = indexDuPan(pan, secteurs)
    if (i === null) continue
    secteursOrdres[u] = i
  }
  return { ligne: p.ligne, tir: p.tir, secteurs: secteursOrdres, prochainAt: 0 }
}

/**
 * Les ordres qu'une EXPÉDITION adopte. La posture et le tir suivent le plan - ce
 * sont les mêmes hommes, et « mur de boucliers » veut dire la même chose devant
 * une place forte étrangère. Les PANS, non, et c'est délibéré :
 *
 *  · loin de chez soi il n'y a pas de pan à tenir. Une scène d'expédition n'a
 *    qu'un seul secteur - la porte de l'ENNEMI - donc le choix n'en est pas un ;
 *  · et il ne changerait rien. MESURÉ : à graine égale, poster les quatre types
 *    de mêlée et les tireurs sur ce secteur unique donne exactement les mêmes
 *    dégâts qu'un plan sans pan (0,0 % d'écart sur 5 graines × 3 postures). La
 *    raison en est géométrique : l'entrée du secteur 0 de `GEO_EXPEDITION` est à
 *    41 pas du ralliement, et tous les assaillants portent déjà `secteur = 0`.
 *
 * Un réglage sans effet est pire qu'un réglage absent : il se croit obéi. Le
 * panneau ne montre donc pas de pans quand on parle d'expédition.
 */
export function ordresExpedition(plan: PlanDefense | null | undefined): OrdresBataille {
  const p = planValide(plan)
  return { ligne: p.ligne, tir: p.tir, secteurs: {}, prochainAt: 0 }
}

/**
 * Les troupes dont l'ordre DORT ce soir : leur pan n'est pas assailli. À dire au
 * joueur, sans quoi il verrait son plan silencieusement ignoré et croirait à une
 * perte de réglage.
 */
export function pansDormants(
  plan: PlanDefense | null | undefined,
  secteurs: readonly { nom: string; angle: number }[],
): UnitId[] {
  const p = planValide(plan)
  return UNITES_PLAN.filter((u) => {
    const pan = p.pans[u]
    return !!pan && indexDuPan(pan, secteurs) === null
  })
}

/**
 * Les troupes que le plan poste sans qu'on en ait un seul homme. L'ordre est
 * gardé - on lève des archers demain, et le plan doit s'en souvenir - mais on le
 * signale, faute de quoi le joueur croit avoir garni un mur qui est nu.
 */
export function pansSansHommes(
  plan: PlanDefense | null | undefined,
  effectifs: Partial<Record<UnitId, number>>,
): UnitId[] {
  const p = planValide(plan)
  return UNITES_PLAN.filter((u) => !!p.pans[u] && (effectifs[u] ?? 0) <= 0)
}

/** poste un type d'unité sur un pan, ou le rend au plus pressé (`null`) */
export function planAvecPan(plan: PlanDefense | null | undefined, u: UnitId, pan: PanId | null): PlanDefense {
  const p = planValide(plan)
  const pans = { ...p.pans }
  if (pan === null || !PANS.some((x) => x.id === pan) || !UNITES_PLAN.includes(u)) delete pans[u]
  else pans[u] = pan
  return { ...p, pans }
}

/** change la posture de la ligne ou la façon de tirer, dans le plan */
export function planAvecOrdre(
  plan: PlanDefense | null | undefined,
  quoi: 'ligne' | 'tir',
  valeur: OrdreLigne | OrdreTir,
): PlanDefense {
  const p = planValide(plan)
  if (quoi === 'ligne') return valeur in EFFETS_LIGNE ? { ...p, ligne: valeur as OrdreLigne } : p
  return valeur in EFFETS_TIR ? { ...p, tir: valeur as OrdreTir } : p
}

/** le plan en une ligne, pour le bloc des remparts : « 🧱 Mur de boucliers · 🏹 Tir tendu · 2 pans tenus » */
export function resumePlan(plan: PlanDefense | null | undefined): string {
  const p = planValide(plan)
  const n = UNITES_PLAN.filter((u) => p.pans[u]).length
  const pans = n === 0 ? 'aucun pan assigné' : `${n} pan${n > 1 ? 's' : ''} tenu${n > 1 ? 's' : ''}`
  return `${EFFETS_LIGNE[p.ligne].emoji} ${EFFETS_LIGNE[p.ligne].nom} · ${EFFETS_TIR[p.tir].emoji} ${EFFETS_TIR[p.tir].nom} · ${pans}`
}
